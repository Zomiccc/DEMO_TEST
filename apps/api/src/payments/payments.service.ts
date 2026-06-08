import { Injectable, Logger } from '@nestjs/common';
import { Payment, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  /**
   * Records the payment intent for an order.
   * - WALLET: debits immediately and marks PAID.
   * - CASH_ON_DELIVERY: PENDING until delivery.
   * - External gateways (Stripe/JazzCash/EasyPaisa): PENDING until webhook confirms.
   */
  async createForOrder(
    orderId: string,
    userId: string,
    method: PaymentMethod,
    amount: number,
  ): Promise<Payment> {
    let status: PaymentStatus = 'PENDING';
    let paidAt: Date | null = null;

    if (method === 'WALLET') {
      await this.wallet.debit(userId, amount, 'DEBIT', `Order ${orderId}`, orderId);
      status = 'PAID';
      paidAt = new Date();
    }

    return this.prisma.payment.create({
      data: {
        orderId,
        method,
        status,
        amount: new Prisma.Decimal(amount),
        paidAt,
      },
    });
  }

  /**
   * Idempotent gateway webhook handler. The idempotencyKey (gateway event id)
   * is unique-constrained, so duplicate deliveries are no-ops.
   */
  async handleWebhook(
    idempotencyKey: string,
    transactionRef: string,
    success: boolean,
    payload: Record<string, unknown>,
  ): Promise<{ processed: boolean; duplicate?: boolean }> {
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      this.logger.warn(`Duplicate webhook ignored: ${idempotencyKey}`);
      return { processed: true, duplicate: true };
    }

    const payment = await this.prisma.payment.findUnique({ where: { transactionRef } });
    if (!payment) {
      // Persist the idempotency key even for unmatched events to block replays.
      await this.prisma.payment.updateMany({
        where: { transactionRef },
        data: { idempotencyKey },
      });
      return { processed: false };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        idempotencyKey,
        status: success ? 'PAID' : 'FAILED',
        paidAt: success ? new Date() : null,
        gatewayPayload: payload as Prisma.InputJsonValue,
      },
    });
    return { processed: true };
  }

  async refund(orderId: string, userId: string, amount: number): Promise<Payment> {
    const payment = await this.prisma.payment.update({
      where: { orderId },
      data: { status: 'REFUNDED' },
    });
    // Refunds are returned to the customer wallet.
    await this.wallet.credit(userId, amount, 'REFUND', `Refund order ${orderId}`, orderId);
    return payment;
  }
}
