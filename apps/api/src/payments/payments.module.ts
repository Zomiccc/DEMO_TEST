import { Global, Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WalletService } from './wallet.service';
import { GiftCardService } from './gift-card.service';

@Global()
@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, WalletService, GiftCardService],
  exports: [PaymentsService, WalletService, GiftCardService],
})
export class PaymentsModule {}
