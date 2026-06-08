import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReferralsService } from './referrals.service';

class RedeemReferralDto {
  @ApiProperty({ example: 'REF-AB12CD' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

@ApiTags('Referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('my-code')
  @ApiOperation({ summary: 'Get my shareable referral code' })
  myCode(@CurrentUser('sub') userId: string) {
    return this.referrals.myCode(userId);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a friend’s referral code' })
  redeem(@CurrentUser('sub') userId: string, @Body() dto: RedeemReferralDto) {
    return this.referrals.redeem(userId, dto.code);
  }
}
