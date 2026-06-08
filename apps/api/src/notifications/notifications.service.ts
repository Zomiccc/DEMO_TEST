import { Injectable, Logger } from '@nestjs/common';
import { Notification, NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../realtime/events.gateway';

export interface DispatchInput {
  userId: string;
  title: string;
  body: string;
  channels?: NotificationChannel[];
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  /**
   * Persists a notification per channel and delivers it. PUSH is delivered
   * in-app via WebSocket immediately; SMS/EMAIL/WHATSAPP are handed to their
   * provider adapters (logged here; wire FCM/Twilio/SES in production).
   */
  async dispatch(input: DispatchInput): Promise<Notification[]> {
    const channels = input.channels ?? ['PUSH'];
    const created: Notification[] = [];

    for (const channel of channels) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          channel,
          title: input.title,
          body: input.body,
          data: (input.data ?? {}) as Prisma.InputJsonValue,
          sentAt: new Date(),
        },
      });
      created.push(notification);
      this.deliver(channel, notification);
    }
    return created;
  }

  private deliver(channel: NotificationChannel, n: Notification): void {
    if (channel === 'PUSH') {
      this.events.emitNotification(n.userId!, {
        id: n.id,
        title: n.title,
        body: n.body,
        data: n.data,
      });
    } else {
      // Provider adapters (FCM/Twilio/SES/WhatsApp Cloud API) plug in here.
      this.logger.log(`[${channel}] → user ${n.userId}: ${n.title}`);
    }
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { read: true };
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: res.count };
  }
}
