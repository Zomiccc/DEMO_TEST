import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Downtown Branch' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'DT-002' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'MM Alam Road, Lahore' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 31.5204 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 74.3587 })
  @IsLongitude()
  lng!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional()
  @IsString()
  openingTime?: string;

  @ApiPropertyOptional({ example: '23:59' })
  @IsOptional()
  @IsString()
  closingTime?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {}
