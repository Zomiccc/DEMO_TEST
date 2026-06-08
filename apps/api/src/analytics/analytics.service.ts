import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [orders, revenue, riders, customers, todayOrders] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({ _sum: { total: true } }),
      this.prisma.rider.count({ where: { status: 'APPROVED' } }),
      this.prisma.user.count({ where: { roles: { has: 'CUSTOMER' } } }),
      this.prisma.order.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    ]);
    return {
      orders,
      revenue: Number(revenue._sum.total ?? 0),
      riders,
      customers,
      todayOrders,
    };
  }

  async salesByDay(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const rows = await this.prisma.$queryRaw<{ day: string; total: number }[]>`
      SELECT DATE("createdAt") as day, SUM("total")::float as total
      FROM "Order" WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt") ORDER BY day ASC
    `;
    return rows;
  }

  topProducts(limit = 10) {
    return this.prisma.$queryRaw<{ productName: string; totalQty: number; revenue: number }[]>`
      SELECT p.name as "productName", SUM(oi.quantity)::int as "totalQty",
        SUM(oi."lineTotal")::float as "revenue"
      FROM "OrderItem" oi
      JOIN "Product" p ON oi."productId" = p.id
      GROUP BY p.name ORDER BY "revenue" DESC LIMIT ${limit}
    `;
  }

  customerSegments() {
    return this.prisma.$queryRaw<{ segment: string; count: number }[]>`
      SELECT CASE
        WHEN total >= 20000 THEN 'VIP'
        WHEN total >= 10000 THEN 'Loyal'
        WHEN total >= 3000 THEN 'Regular'
        ELSE 'New'
      END as segment, COUNT(*)::int as count
      FROM (
        SELECT "userId", SUM("total")::float as total
        FROM "Order" GROUP BY "userId"
      ) t GROUP BY segment
    `;
  }
}
