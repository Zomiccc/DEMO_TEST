import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { WalletService } from './wallet.service';
import { GiftCardService } from './gift-card.service';
import { PaymentsService } from './payments.service';
import { IssueGiftCardDto, RedeemGiftCardDto, TopUpDto } from './dto/payments.dto';

@ApiTags('Payments & Wallet')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly wallet: WalletService,
    private readonly giftCards: GiftCardService,
    private readonly payments: PaymentsService,
  ) {}

  @ApiBearerAuth()
  @Get('wallet')
  @ApiOperation({ summary: 'Get my wallet balance + recent transactions' })
  myWallet(@CurrentUser('sub') userId: string) {
    return this.wallet.getWithTransactions(userId);
  }

  @ApiBearerAuth()
  @Post('wallet/topup')
  @ApiOperation({ summary: 'Top up my wallet' })
  topup(@CurrentUser('sub') userId: string, @Body() dto: TopUpDto) {
    return this.wallet.credit(userId, dto.amount, 'TOPUP', 'Wallet top-up', dto.reference);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('GIFT_CARD_ISSUE')
  @Post('gift-cards/issue')
  @ApiOperation({ summary: 'Issue a gift card (admin)' })
  issueGiftCard(@Body() dto: IssueGiftCardDto) {
    return this.giftCards.issue(dto.initialValue);
  }

  @ApiBearerAuth()
  @Post('gift-cards/redeem')
  @ApiOperation({ summary: 'Redeem a gift card into my wallet' })
  redeemGiftCard(@CurrentUser('sub') userId: string, @Body() dto: RedeemGiftCardDto) {
    return this.giftCards.redeem(userId, dto.code);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Payment gateway webhook (idempotent)' })
  webhook(@Body() body: { idempotencyKey: string; transactionRef: string; success: boolean; payload?: Record<string, unknown> }) {
    return this.payments.handleWebhook(
      body.idempotencyKey,
      body.transactionRef,
      body.success,
      body.payload ?? {},
    );
  }
}
