import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateZoneDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 'Free (0-7km)' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  minKm!: number;

  @ApiProperty({ example: 7 })
  @IsNumber()
  @Min(0)
  maxKm!: number;

  @ApiProperty({ example: 0, description: 'Flat fee for the zone' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fee!: number;

  @ApiPropertyOptional({ example: 150, description: 'Per-km rate (overrides flat fee when set)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  perKmRate?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: 1.0, description: 'Peak-hour multiplier' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  peakMultiplier?: number;
}

export class UpdateZoneDto extends PartialType(CreateZoneDto) {}

export class DeliveryQuoteDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 31.52 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 74.36 })
  @IsLongitude()
  lng!: number;
}

export class PeakToggleDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;
}
