import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Review } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    if (!dto.orderId && !dto.productId) {
      throw new BadRequestException('Provide orderId or productId');
    }

    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
      if (!order || order.userId !== userId) throw new ForbiddenException('Not your order');
      if (order.status !== 'DELIVERED') {
        throw new BadRequestException('You can only review delivered orders');
      }
      const existing = await this.prisma.review.findUnique({ where: { orderId: dto.orderId } });
      if (existing) throw new BadRequestException('Order already reviewed');
    }

    return this.prisma.review.create({
      data: {
        userId,
        rating: dto.rating,
        comment: dto.comment,
        orderId: dto.orderId,
        productId: dto.productId,
      },
    });
  }

  async forProduct(productId: string) {
    const [reviews, agg] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { productId },
        include: { user: { select: { fullName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    return {
      reviews,
      averageRating: Number((agg._avg.rating ?? 0).toFixed(2)),
      total: agg._count._all,
    };
  }
}
