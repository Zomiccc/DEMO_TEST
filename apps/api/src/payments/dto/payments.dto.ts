import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsNotEmpty, Min } from 'class-validator';

export class TopUpDto {
  @ApiProperty({ example: 1000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ example: 'JAZZCASH', description: 'Funding source reference' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class IssueGiftCardDto {
  @ApiProperty({ example: 2000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  initialValue!: number;
}

export class RedeemGiftCardDto {
  @ApiProperty({ example: 'GC-AB12CD34' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
