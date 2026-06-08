import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Rider } from '@prisma/client';
import { GeoPoint, haversineKm } from '@app/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../realtime/events.gateway';
import { RiderLocationDto } from './dto/rider.dto';

@Injectable()
export class RidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  private async getByUser(userId: string): Promise<Rider> {
    const rider = await this.prisma.rider.findUnique({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider profile not found');
    return rider;
  }

  async me(userId: string) {
    const rider = await this.getByUser(userId);
    const [activeOrders, earnings] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { riderId: rider.id, status: { in: ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'] } },
        include: { address: true },
      }),
      this.prisma.riderEarning.aggregate({
        where: { riderId: rider.id, isPaid: false },
        _sum: { amount: true },
      }),
    ]);
    return { rider, activeOrders, pendingEarnings: earnings._sum.amount ?? 0 };
  }

  async setOnline(userId: string, online: boolean): Promise<Rider> {
    const rider = await this.getByUser(userId);
    if (rider.status !== 'APPROVED') {
      throw new BadRequestException('Rider account is not approved');
    }
    return this.prisma.rider.update({ where: { id: rider.id }, data: { isOnline: online } });
  }

  /** Records a GPS ping and broadcasts it to any active order rooms. */
  async pushLocation(userId: string, dto: RiderLocationDto) {
    const rider = await this.getByUser(userId);
    const location = await this.prisma.riderLocation.create({
      data: { riderId: rider.id, lat: dto.lat, lng: dto.lng, heading: dto.heading, speed: dto.speed },
    });

    const activeOrders = await this.prisma.order.findMany({
      where: { riderId: rider.id, status: { in: ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'] } },
      select: { id: true },
    });
    for (const order of activeOrders) {
      this.events.emitRiderLocation(order.id, {
        riderId: rider.id,
        lat: dto.lat,
        lng: dto.lng,
        heading: dto.heading,
        speed: dto.speed,
        at: location.recordedAt,
      });
    }
    return { recorded: true, broadcastTo: activeOrders.length };
  }

  // ── Admin ──────────────────────────────────────────────
  listPending(): Promise<Rider[]> {
    return this.prisma.rider.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: { user: { select: { fullName: true, phone: true, email: true } } },
    });
  }

  async approve(riderId: string, approverId: string): Promise<Rider> {
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    return this.prisma.rider.update({
      where: { id: riderId },
      data: { status: 'APPROVED', approvedById: approverId, approvedAt: new Date() },
    });
  }

  async setStatus(riderId: string, status: 'SUSPENDED' | 'REJECTED' | 'APPROVED'): Promise<Rider> {
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    return this.prisma.rider.update({ where: { id: riderId }, data: { status } });
  }

  /**
   * Auto-assignment: finds the nearest online, approved rider to the branch and
   * assigns the order. Returns null if no rider is available.
   */
  async assignNearest(orderId: string): Promise<Rider | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { branch: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId) return this.prisma.rider.findUnique({ where: { id: order.riderId } });

    const origin: GeoPoint = { lat: order.branch.lat, lng: order.branch.lng };
    const candidates = await this.prisma.rider.findMany({
      where: { status: 'APPROVED', isOnline: true },
      include: { locations: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });

    let best: { rider: Rider; distance: number } | null = null;
    for (const rider of candidates) {
      const loc = rider.locations[0];
      if (!loc) continue;
      const distance = haversineKm(origin, { lat: loc.lat, lng: loc.lng });
      if (!best || distance < best.distance) best = { rider, distance };
    }
    if (!best) return null;

    const fee = Number(order.deliveryFee);
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { riderId: best.rider.id, status: 'ASSIGNED' },
      }),
      this.prisma.orderStatusLog.create({
        data: { orderId, status: 'ASSIGNED', note: `Auto-assigned to rider ${best.rider.id}` },
      }),
      this.prisma.riderEarning.create({
        data: { riderId: best.rider.id, orderId, amount: new Prisma.Decimal(fee), type: 'DELIVERY_FEE' },
      }),
    ]);

    this.events.emitOrderStatus(orderId, { status: 'ASSIGNED', orderNumber: order.orderNumber });
    this.events.emitRiderAssignment(best.rider.id, {
      orderId,
      orderNumber: order.orderNumber,
      distanceKm: Number(best.distance.toFixed(2)),
    });
    return best.rider;
  }
}
