import { Injectable, NotFoundException } from '@nestjs/common';
import { KdsStatus, KdsQueue, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../realtime/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class KdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  /** Get the KDS queue for a branch — QUEUED and PREPARING items, ordered by priority. */
  branchQueue(branchId: string) {
    return this.prisma.kdsQueue.findMany({
      where: {
        status: { in: ['QUEUED', 'PREPARING'] },
        order: { branchId },
      },
      include: { order: { include: { items: true, user: { select: { fullName: true } } } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /** Kitchen staff starts preparing an order. */
  async start(id: string): Promise<KdsQueue> {
    const item = await this.getItem(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      const k = await tx.kdsQueue.update({
        where: { id },
        data: { status: 'PREPARING', startedAt: new Date() },
      });
      await tx.order.update({ where: { id: item.orderId }, data: { status: 'PREPARING' } });
      await tx.orderStatusLog.create({
        data: { orderId: item.orderId, status: 'PREPARING', note: 'Kitchen started preparing' },
      });
      return k;
    });
    this.broadcast(item.order.branchId, item.orderId, 'PREPARING');
    return updated;
  }

  /** Kitchen marks an order ready for pickup / delivery. */
  async ready(id: string): Promise<KdsQueue> {
    const item = await this.getItem(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      const k = await tx.kdsQueue.update({
        where: { id },
        data: { status: 'READY', readyAt: new Date() },
      });
      await tx.order.update({ where: { id: item.orderId }, data: { status: 'READY' } });
      await tx.orderStatusLog.create({
        data: { orderId: item.orderId, status: 'READY', note: 'Kitchen marked ready' },
      });
      return k;
    });
    this.broadcast(item.order.branchId, item.orderId, 'READY');

    // Notify customer
    const order = await this.prisma.order.findUnique({ where: { id: item.orderId }, select: { userId: true, orderNumber: true } });
    if (order) {
      await this.notifications.dispatch({
        userId: order.userId,
        title: 'Order ready',
        body: `Your order ${order.orderNumber} is ready for ${item.order.type === 'DELIVERY' ? 'delivery' : 'pickup'}!`,
      });
    }
    return updated;
  }

  /** Mark an order as served / handed off. */
  async served(id: string): Promise<KdsQueue> {
    const item = await this.getItem(id);
    return this.prisma.kdsQueue.update({
      where: { id },
      data: { status: 'SERVED' },
    });
  }

  async setPriority(id: string, priority: number): Promise<KdsQueue> {
    const item = await this.prisma.kdsQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('KDS item not found');
    return this.prisma.kdsQueue.update({ where: { id }, data: { priority } });
  }

  private async getItem(id: string) {
    const item = await this.prisma.kdsQueue.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!item) throw new NotFoundException('KDS item not found');
    return item;
  }

  private broadcast(branchId: string, orderId: string, status: KdsStatus) {
    this.events.emitKdsUpdate(branchId, { orderId, status });
  }
}
