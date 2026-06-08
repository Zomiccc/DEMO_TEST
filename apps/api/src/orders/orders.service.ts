import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  Prisma,
  PromoCode,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { Role } from '@app/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from '../delivery/delivery.service';
import { PaymentsService } from '../payments/payments.service';
import { EventsGateway } from '../realtime/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { RidersService } from '../riders/riders.service';
import { CheckoutDto, PlaceOrderDto } from './dto/order.dto';

interface ComputedItem {
  productId: string;
  productName: string;
  variantName: string | null;
  addons: { name: string; price: number }[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  instructions?: string;
}

export interface Pricing {
  items: ComputedItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  loyaltyRedeemed: number;
  tax: number;
  total: number;
  distanceKm: number | null;
  promoCodeId: string | null;
}

const LOYALTY_POINT_VALUE = 1; // 1 point = Rs.1

const STATUS_MESSAGES: Record<string, string> = {
  CONFIRMED: 'Your order has been confirmed.',
  PREPARING: 'The kitchen is preparing your order.',
  READY: 'Your order is ready.',
  ASSIGNED: 'A rider has been assigned to your order.',
  PICKED_UP: 'Your order has been picked up.',
  ON_THE_WAY: 'Your order is on the way!',
  DELIVERED: 'Your order has been delivered. Enjoy!',
  CANCELLED: 'Your order has been cancelled.',
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: DeliveryService,
    private readonly payments: PaymentsService,
    private readonly events: EventsGateway,
    private readonly notifications: NotificationsService,
    private readonly riders: RidersService,
  ) {}

  // ── Pricing ────────────────────────────────────────────
  private async computePricing(userId: string, dto: CheckoutDto): Promise<Pricing> {
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true, addons: true },
    });

    const items: ComputedItem[] = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
      if (!product.isAvailable) throw new BadRequestException(`${product.name} is unavailable`);

      let unitPrice = Number(product.basePrice);
      let variantName: string | null = null;
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) throw new BadRequestException('Invalid variant');
        unitPrice += Number(variant.priceDelta);
        variantName = variant.name;
      }

      const addons = (item.addonIds ?? []).map((addonId) => {
        const addon = product.addons.find((a) => a.id === addonId && a.isActive);
        if (!addon) throw new BadRequestException('Invalid add-on');
        return { name: addon.name, price: Number(addon.price) };
      });
      const addonsTotal = addons.reduce((s, a) => s + a.price, 0);

      const lineTotal = (unitPrice + addonsTotal) * item.quantity;
      return {
        productId: product.id,
        productName: product.name,
        variantName,
        addons,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        instructions: item.instructions,
      };
    });

    const subtotal = round(items.reduce((s, i) => s + i.lineTotal, 0));

    // Delivery fee + geofencing
    let deliveryFee = 0;
    let distanceKm: number | null = null;
    if (dto.type === 'DELIVERY') {
      if (!dto.addressId) throw new BadRequestException('Delivery address required');
      const address = await this.prisma.address.findUnique({ where: { id: dto.addressId } });
      if (!address || address.userId !== userId) {
        throw new BadRequestException('Invalid delivery address');
      }
      const quote = await this.delivery.quote(dto.branchId, {
        lat: address.lat,
        lng: address.lng,
      });
      if (!quote.deliverable) throw new BadRequestException(quote.reason ?? 'Outside delivery area');
      deliveryFee = quote.fee;
      distanceKm = quote.distanceKm;
    }

    // Promo code
    let discount = 0;
    let promoCodeId: string | null = null;
    if (dto.promoCode) {
      const promo = await this.validatePromo(dto.promoCode, subtotal);
      promoCodeId = promo.id;
      discount = this.applyPromo(promo, subtotal, deliveryFee);
    }

    // Loyalty redemption (clamped to available points + remaining payable)
    let loyaltyRedeemed = 0;
    if (dto.loyaltyPoints && dto.loyaltyPoints > 0) {
      const loyalty = await this.prisma.loyaltyPoint.findUnique({ where: { userId } });
      const available = loyalty?.points ?? 0;
      const usablePoints = Math.min(dto.loyaltyPoints, available);
      const maxRedeemable = Math.max(0, subtotal - discount);
      loyaltyRedeemed = Math.min(usablePoints * LOYALTY_POINT_VALUE, maxRedeemable);
    }

    const tax = 0;
    const total = round(Math.max(0, subtotal + deliveryFee + tax - discount - loyaltyRedeemed));

    return { items, subtotal, deliveryFee, discount, loyaltyRedeemed, tax, total, distanceKm, promoCodeId };
  }

  private async validatePromo(code: string, subtotal: number): Promise<PromoCode> {
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!promo || !promo.isActive) throw new BadRequestException('Invalid promo code');
    const now = new Date();
    if (promo.startsAt && promo.startsAt > now) throw new BadRequestException('Promo not active yet');
    if (promo.expiresAt && promo.expiresAt < now) throw new BadRequestException('Promo expired');
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException('Promo usage limit reached');
    }
    if (promo.minOrder && subtotal < Number(promo.minOrder)) {
      throw new BadRequestException(`Minimum order Rs.${promo.minOrder} required`);
    }
    return promo;
  }

  private applyPromo(promo: PromoCode, subtotal: number, deliveryFee: number): number {
    let discount = 0;
    if (promo.type === 'PERCENTAGE') discount = (subtotal * Number(promo.value)) / 100;
    else if (promo.type === 'FIXED') discount = Number(promo.value);
    else if (promo.type === 'FREE_DELIVERY') discount = deliveryFee;
    if (promo.maxDiscount) discount = Math.min(discount, Number(promo.maxDiscount));
    return round(Math.min(discount, subtotal + deliveryFee));
  }

  // ── Public API ─────────────────────────────────────────
  checkout(userId: string, dto: CheckoutDto): Promise<Pricing> {
    return this.computePricing(userId, dto);
  }

  async place(userId: string, dto: PlaceOrderDto): Promise<Order> {
    const pricing = await this.computePricing(userId, dto);
    const orderNumber = `ORD-${randomBytes(4).toString('hex').toUpperCase()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          branchId: dto.branchId,
          addressId: dto.addressId,
          type: dto.type,
          status: 'PENDING',
          subtotal: new Prisma.Decimal(pricing.subtotal),
          deliveryFee: new Prisma.Decimal(pricing.deliveryFee),
          discount: new Prisma.Decimal(pricing.discount),
          tax: new Prisma.Decimal(pricing.tax),
          total: new Prisma.Decimal(pricing.total),
          distanceKm: pricing.distanceKm,
          promoCodeId: pricing.promoCodeId,
          loyaltyRedeemed: pricing.loyaltyRedeemed,
          scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
          specialNotes: dto.specialNotes,
          items: {
            create: pricing.items.map((i) => ({
              productId: i.productId,
              variantName: i.variantName,
              addons: i.addons as unknown as Prisma.InputJsonValue,
              quantity: i.quantity,
              unitPrice: new Prisma.Decimal(i.unitPrice),
              lineTotal: new Prisma.Decimal(i.lineTotal),
              instructions: i.instructions,
            })),
          },
          statusLogs: { create: { status: 'PENDING', note: 'Order placed' } },
          kdsQueue: { create: { station: 'MAIN', status: 'QUEUED' } },
        },
      });

      // Consume loyalty points + record promo usage atomically.
      if (pricing.loyaltyRedeemed > 0) {
        await tx.loyaltyPoint.update({
          where: { userId },
          data: { points: { decrement: pricing.loyaltyRedeemed / LOYALTY_POINT_VALUE } },
        });
      }
      if (pricing.promoCodeId) {
        await tx.promoCode.update({
          where: { id: pricing.promoCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }
      return created;
    });

    // Payment (wallet debits immediately; others pending).
    await this.payments.createForOrder(
      order.id,
      userId,
      dto.paymentMethod as PaymentMethod,
      pricing.total,
    );

    // Real-time: notify branch kitchen + order room.
    this.events.emitNewOrder(dto.branchId, { orderId: order.id, orderNumber });
    this.events.emitOrderStatus(order.id, { status: 'PENDING', orderNumber });

    // Customer confirmation notification.
    await this.notifications.dispatch({
      userId,
      title: 'Order placed',
      body: `Your order ${orderNumber} has been received. Total Rs.${pricing.total}.`,
      data: { type: 'ORDER', orderId: order.id, orderNumber },
    });

    return order;
  }

  findForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, roles: Role[], id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true, statusLogs: true, rider: true, address: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const isStaff = roles.some((r) =>
      [Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.CASHIER, Role.KITCHEN_STAFF].includes(r),
    );
    if (order.userId !== userId && !isStaff) throw new ForbiddenException('Not your order');
    return order;
  }

  async updateStatus(id: string, status: string, note?: string, changedBy?: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const next = status as OrderStatus;
    const updated = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: {
          status: next,
          ...(next === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        },
      });
      await tx.orderStatusLog.create({
        data: { orderId: id, status: next, note, changedBy },
      });
      return o;
    });

    this.events.emitOrderStatus(id, { status: next, note, orderNumber: order.orderNumber });

    // Notify the customer of the status change.
    await this.notifications.dispatch({
      userId: order.userId,
      title: `Order ${order.orderNumber}`,
      body: STATUS_MESSAGES[next] ?? `Status updated to ${next}.`,
      data: { type: 'ORDER', orderId: id, status: next },
    });

    // When the kitchen marks a delivery order READY, auto-assign the nearest rider.
    if (next === 'READY' && order.type === 'DELIVERY' && !order.riderId) {
      await this.riders.assignNearest(id).catch(() => null);
    }

    return updated;
  }

  /** Re-create a previous order's items as a fresh checkout payload preview. */
  async reorder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.userId !== userId) throw new NotFoundException('Order not found');
    return {
      branchId: order.branchId,
      type: order.type,
      addressId: order.addressId,
      items: order.items.map((i) => ({
        productId: i.productId,
        variantName: i.variantName,
        quantity: i.quantity,
        instructions: i.instructions,
      })),
    };
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
