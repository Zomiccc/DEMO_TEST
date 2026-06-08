import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { REDIS_KEYS } from '@app/shared';
import { RedisService } from '../../redis/redis.service';

const OTP_TTL_SECONDS = 300; // 5 minutes
const MAX_ATTEMPTS = 5;

/**
 * One-Time-Password generation/verification. Codes are stored in Redis with a
 * short TTL. Delivery uses Twilio SMS when credentials are configured; otherwise
 * the code is logged (dev only) so flows remain testable without a Twilio account.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async sendOtp(channel: string): Promise<void> {
    const code = randomInt(100000, 999999).toString();
    await this.redis.setEx(REDIS_KEYS.otp(channel), code, OTP_TTL_SECONDS);
    await this.deliver(channel, code);
  }

  async verifyOtp(channel: string, code: string): Promise<void> {
    const attemptsKey = `${REDIS_KEYS.otp(channel)}:attempts`;
    const attempts = await this.redis.incrWithTtl(attemptsKey, OTP_TTL_SECONDS);
    if (attempts > MAX_ATTEMPTS) {
      throw new BadRequestException('Too many OTP attempts. Request a new code.');
    }

    const stored = await this.redis.get(REDIS_KEYS.otp(channel));
    if (!stored || stored !== code) {
      throw new BadRequestException('Invalid or expired OTP.');
    }
    await this.redis.del(REDIS_KEYS.otp(channel));
    await this.redis.del(attemptsKey);
  }

  private async deliver(channel: string, code: string): Promise<void> {
    const sid = this.config.get<string>('twilio.accountSid');
    const token = this.config.get<string>('twilio.authToken');
    const from = this.config.get<string>('twilio.fromNumber');

    if (!sid || !token || !from) {
      this.logger.warn(`[DEV OTP] ${channel} -> ${code} (Twilio not configured)`);
      return;
    }

    // Lazy-load Twilio so the dependency is optional in local/dev environments.
    const twilio = await import('twilio').catch(() => null);
    if (!twilio) {
      this.logger.warn(`[DEV OTP] ${channel} -> ${code} (twilio package missing)`);
      return;
    }
    const client = twilio.default(sid, token);
    await client.messages.create({
      to: channel,
      from,
      body: `Your verification code is ${code}. It expires in 5 minutes.`,
    });
    this.logger.log(`OTP dispatched to ${channel} via Twilio`);
  }
}
