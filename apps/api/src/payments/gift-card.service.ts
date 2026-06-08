import { BadRequestException, Injectable } from '@nestjs/common';
import { GiftCard, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';

@Injectable()
export class GiftCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  private generateCode(): string {
    return `GC-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async issue(initialValue: number, ownerId?: string): Promise<GiftCard> {
    return this.prisma.giftCard.create({
      data: {
        code: this.generateCode(),
        initialValue: new Prisma.Decimal(initialValue),
        balance: new Prisma.Decimal(initialValue),
        ownerId,
      },
    });
  }

  /** Redeems the full gift-card balance into the user's wallet. */
  async redeem(userId: string, code: string): Promise<{ creditedAmount: number }> {
    const card = await this.prisma.giftCard.findUnique({ where: { code } });
    if (!card || !card.isActive) throw new BadRequestException('Invalid gift card');
    if (card.expiresAt && card.expiresAt < new Date()) {
      throw new BadRequestException('Gift card expired');
    }
    const balance = Number(card.balance);
    if (balance <= 0) throw new BadRequestException('Gift card already redeemed');

    await this.prisma.$transaction(async (tx) => {
      await tx.giftCard.update({
        where: { id: card.id },
        data: { balance: new Prisma.Decimal(0), isActive: false },
      });
    });
    await this.wallet.credit(userId, balance, 'TOPUP', `Gift card ${code}`, code);
    return { creditedAmount: balance };
  }
}
