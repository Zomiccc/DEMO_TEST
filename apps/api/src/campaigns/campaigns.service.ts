import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, CampaignStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  list() {
    return this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(data: {
    name: string; channel: NotificationChannel; template: string;
    segmentId?: string; trigger?: string; scheduledAt?: Date;
  }) {
    return this.prisma.campaign.create({
      data: {
        name: data.name,
        channel: data.channel,
        template: data.template,
        segmentId: data.segmentId,
        trigger: data.trigger,
        scheduledAt: data.scheduledAt,
        status: 'DRAFT',
      },
    });
  }

  async launch(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, include: { segment: { include: { members: { select: { userId: true } } } } } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const userIds = campaign.segment?.members.map(m => m.userId) ?? [];
    if (userIds.length === 0) {
      const allUsers = await this.prisma.user.findMany({ where: { roles: { has: 'CUSTOMER' } }, select: { id: true } });
      userIds.push(...allUsers.map(u => u.id));
    }

    for (const userId of userIds) {
      await this.notifications.dispatch({
        userId,
        title: campaign.name,
        body: campaign.template,
        data: { type: 'CAMPAIGN', campaignId: campaign.id },
      });
    }

    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'COMPLETED', sentCount: userIds.length },
    });
  }
}
