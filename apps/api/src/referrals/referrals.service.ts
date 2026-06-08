import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const REFERRER_REWARD = 100; // loyalty points
const REFERRED_REWARD = 50;

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Returns the user's active (unredeemed) referral code, creating one if needed. */
  async myCode(userId: string) {
    const existing = await this.prisma.referral.findFirst({
      where: { referrerId: userId, referredId: null, isRedeemed: false },
    });
    if (existing) return { code: existing.code, rewardPoints: REFERRED_REWARD };

    const code = `REF-${randomBytes(3).toString('hex').toUpperCase()}`;
    const created = await this.prisma.referral.create({
      data: { referrerId: userId, code, rewardPoints: REFERRER_REWARD },
    });
    return { code: created.code, rewardPoints: REFERRED_REWARD };
  }

  /** A newly-registered user redeems a friend's referral code. */
  async redeem(newUserId: string, code: string) {
    const referral = await this.prisma.referral.findUnique({ where: { code } });
    if (!referral || referral.isRedeemed) throw new BadRequestException('Invalid referral code');
    if (referral.referrerId === newUserId) throw new BadRequestException('Cannot use your own code');

    const already = await this.prisma.referral.findUnique({ where: { referredId: newUserId } });
    if (already) throw new BadRequestException('You have already used a referral code');

    await this.prisma.$transaction([
      this.prisma.referral.update({
        where: { id: referral.id },
        data: { referredId: newUserId, isRedeemed: true },
      }),
      this.creditLoyalty(referral.referrerId, REFERRER_REWARD),
      this.creditLoyalty(newUserId, REFERRED_REWARD),
    ]);

    await this.notifications.dispatch({
      userId: referral.referrerId,
      title: 'Referral reward earned!',
      body: `You earned ${REFERRER_REWARD} loyalty points for inviting a friend.`,
      data: { type: 'REFERRAL', points: REFERRER_REWARD },
    });

    return { redeemed: true, pointsAwarded: REFERRED_REWARD };
  }

  private creditLoyalty(userId: string, points: number) {
    return this.prisma.loyaltyPoint.upsert({
      where: { userId },
      update: { points: { increment: points }, lifetime: { increment: points } },
      create: { userId, points, lifetime: points },
    });
  }
}
