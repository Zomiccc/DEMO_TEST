import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../realtime/events.gateway';
import { Prisma } from '@prisma/client';

const METHOD_MAP: Record<string, PaymentMethod> = {
  CASH: 'CASH_ON_DELIVERY',
  CARD: 'CARD',
  WALLET: 'WALLET',
};

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
  ) {}

  /** Create a dine-in / takeaway order from the POS. */
  async createPosOrder(cashierId: string, dto: {
    branchId: string; type: 'DINE_IN' | 'TAKEAWAY';
    tableNumber?: string; items: { productId: string; quantity: number; variantName?: string }[];
    paymentMethod: 'CASH' | 'CARD' | 'WALLET';
  }) {
    const subtotal = await this.computeSubtotal(dto.items);
    const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          userId: cashierId,
          branchId: dto.branchId,
          type: dto.type,
          status: 'CONFIRMED',
          orderNumber,
          subtotal: new Prisma.Decimal(subtotal),
          total: new Prisma.Decimal(subtotal),
          items: { create: dto.items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: new Prisma.Decimal(0),
            lineTotal: new Prisma.Decimal(0),
          })) },
        },
        include: { items: true },
      });
      await tx.orderStatusLog.create({ data: { orderId: o.id, status: 'CONFIRMED', note: 'POS order', changedBy: cashierId } });
      await tx.kdsQueue.create({ data: { orderId: o.id, status: 'QUEUED' } });
      await tx.payment.create({
        data: {
          orderId: o.id,
          amount: new Prisma.Decimal(subtotal),
          method: METHOD_MAP[dto.paymentMethod] ?? 'CASH_ON_DELIVERY',
          status: 'PAID',
        },
      });
      return o;
    });

    this.events.emitNewOrder(dto.branchId, { orderId: order.id, orderNumber });
    return order;
  }

  posOrders(branchId: string) {
    return this.prisma.order.findMany({
      where: { branchId, type: { in: ['DINE_IN', 'TAKEAWAY'] } },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async computeSubtotal(items: { productId: string; quantity: number }[]) {
    let sub = 0;
    for (const item of items) {
      const p = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (p) sub += Number(p.basePrice) * item.quantity;
    }
    return sub;
  }
}
