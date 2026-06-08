import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class OnlineToggleDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  online!: boolean;
}

export class RiderLocationDto {
  @ApiProperty({ example: 31.52 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 74.36 })
  @IsLongitude()
  lng!: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  speed?: number;
}
