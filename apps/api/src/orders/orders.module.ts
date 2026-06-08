import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DeliveryModule } from '../delivery/delivery.module';
import { RidersModule } from '../riders/riders.module';

@Module({
  imports: [DeliveryModule, RidersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
