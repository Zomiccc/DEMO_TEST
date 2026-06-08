import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Wallet, WalletTransaction, WalletTxnType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string): Promise<Wallet> {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async getWithTransactions(userId: string) {
    const wallet = await this.getOrCreate(userId);
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ...wallet, transactions };
  }

  /** Credit the wallet (top-up, refund, bonus). Atomic with a ledger entry. */
  async credit(
    userId: string,
    amount: number,
    type: WalletTxnType,
    description?: string,
    reference?: string,
  ): Promise<WalletTransaction> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getOrCreate(userId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount: new Prisma.Decimal(amount),
          balanceAfter: updated.balance,
          description,
          reference,
        },
      });
    });
  }

  /** Debit the wallet (order payment, withdrawal). Fails if insufficient funds. */
  async debit(
    userId: string,
    amount: number,
    type: WalletTxnType,
    description?: string,
    reference?: string,
  ): Promise<WalletTransaction> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getOrCreate(userId);
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount: new Prisma.Decimal(amount),
          balanceAfter: updated.balance,
          description,
          reference,
        },
      });
    });
  }
}
