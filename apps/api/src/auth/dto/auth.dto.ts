import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

const STRONG_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

export class RegisterCustomerDto {
  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ example: 'StrongP@ss1', description: 'Min 8 chars, upper, lower, number, symbol' })
  @Matches(STRONG_PASSWORD, {
    message: 'Password must be 8+ chars with upper, lower, number and symbol.',
  })
  password!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;
}

export class LoginDto {
  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'StrongP@ss1' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ example: '123456', description: 'TOTP code (required for admins with 2FA)' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  totp?: string;
}

export class RequestOtpDto {
  @ApiProperty({ example: '+923001234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+923001234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class RefreshDto {
  @ApiPropertyOptional({ description: 'Optional when refresh_token cookie is present' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: '+923001234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '+923001234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'NewStrongP@ss1' })
  @Matches(STRONG_PASSWORD, {
    message: 'Password must be 8+ chars with upper, lower, number and symbol.',
  })
  newPassword!: string;
}

export class RegisterRiderDto {
  @ApiProperty({ example: '+923001234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'Ali Khan' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: 'StrongP@ss1' })
  @Matches(STRONG_PASSWORD)
  password!: string;

  @ApiProperty({ example: '35202-1234567-1' })
  @IsString()
  @IsNotEmpty()
  cnic!: string;

  @ApiProperty({ example: 'https://s3.../cnic.jpg', description: 'Uploaded CNIC image URL' })
  @IsString()
  @IsNotEmpty()
  cnicImageUrl!: string;

  @ApiPropertyOptional({ example: 'Motorbike' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'ABC-123' })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;
}

export class Enable2faVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  totp!: string;
}
