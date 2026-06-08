import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export enum OrderTypeDto {
  DELIVERY = 'DELIVERY',
  TAKEAWAY = 'TAKEAWAY',
  DINE_IN = 'DINE_IN',
}

export enum PaymentMethodDto {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  WALLET = 'WALLET',
  CARD = 'CARD',
  JAZZCASH = 'JAZZCASH',
  EASYPAISA = 'EASYPAISA',
  STRIPE = 'STRIPE',
}

export class OrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ description: 'Selected variant id (e.g. Large)' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Selected add-on ids' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  addonIds?: string[];

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CheckoutDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty({ enum: OrderTypeDto, default: OrderTypeDto.DELIVERY })
  @IsEnum(OrderTypeDto)
  type!: OrderTypeDto;

  @ApiPropertyOptional({ description: 'Required for DELIVERY orders' })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiPropertyOptional({ example: 'WELCOME10' })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({ example: 100, description: 'Loyalty points to redeem (1 pt = Rs.1)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  loyaltyPoints?: number;
}

export class PlaceOrderDto extends CheckoutDto {
  @ApiProperty({ enum: PaymentMethodDto, default: PaymentMethodDto.CASH_ON_DELIVERY })
  @IsEnum(PaymentMethodDto)
  paymentMethod!: PaymentMethodDto;

  @ApiPropertyOptional({ description: 'ISO timestamp for scheduled orders' })
  @IsOptional()
  @IsISO8601()
  scheduledFor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialNotes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: [
      'CONFIRMED',
      'PREPARING',
      'READY',
      'ASSIGNED',
      'PICKED_UP',
      'ON_THE_WAY',
      'DELIVERED',
      'CANCELLED',
    ],
  })
  @IsString()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
