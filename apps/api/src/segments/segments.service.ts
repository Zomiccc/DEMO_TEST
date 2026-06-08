import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.customerSegment.findMany({ include: { _count: { select: { members: true } } } });
  }

  create(data: { name: string; description?: string; rules: Record<string, any>; isVip?: boolean }) {
    return this.prisma.customerSegment.create({ data: { name: data.name, description: data.description, rules: data.rules, isVip: data.isVip ?? false } });
  }

  async buildSegment(segmentId: string) {
    const segment = await this.prisma.customerSegment.findUnique({ where: { id: segmentId } });
    if (!segment) return null;
    const rules = segment.rules as { minOrders?: number; minSpend?: number; lastOrderDaysAgo?: number };

    const userIds = await this.prisma.$queryRaw<{ userId: string }[]>`
      SELECT "userId" FROM "Order"
      GROUP BY "userId"
      HAVING COUNT(*) >= ${rules.minOrders ?? 0}
         AND SUM("total")::float >= ${rules.minSpend ?? 0}
      ${rules.lastOrderDaysAgo ? `AND MAX("createdAt") >= NOW() - INTERVAL '${rules.lastOrderDaysAgo} days'` : ''}
    `;

    await this.prisma.customerSegmentLink.deleteMany({ where: { segmentId } });
    if (userIds.length > 0) {
      await this.prisma.customerSegmentLink.createMany({
        data: userIds.map(u => ({ segmentId, userId: u.userId })),
        skipDuplicates: true,
      });
    }
    return { added: userIds.length };
  }
}
