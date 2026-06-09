import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { AuthTokens, JwtPayload, Role, REDIS_KEYS } from '@app/shared';
import { RedisService } from '../../redis/redis.service';

interface IssueParams {
  userId: string;
  email: string | null;
  phone: string | null;
  roles: Role[];
}

/**
 * Issues short-lived access tokens (15m) and rotating refresh tokens (7d).
 * Each refresh token's jti is whitelisted in Redis; rotation revokes the old jti
 * and issues a new one, preventing replay of stolen refresh tokens.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async issueTokens(params: IssueParams): Promise<AuthTokens> {
    const jti = randomUUID();
    const basePayload: JwtPayload = {
      sub: params.userId,
      email: params.email,
      phone: params.phone,
      roles: params.roles,
    };

    const accessToken = await this.jwt.signAsync(basePayload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessTtl'),
    });

    const refreshToken = await this.jwt.signAsync(
      { ...basePayload, jti },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshTtl'),
      },
    );

    await this.whitelistRefresh(params.userId, jti);
    return { accessToken, refreshToken, expiresIn: 900 };
  }

  /** Validates a refresh token's jti is still active, then rotates it. */
  async rotate(payload: JwtPayload): Promise<AuthTokens> {
    if (!payload.jti) throw new UnauthorizedException('Malformed refresh token');
    const key = REDIS_KEYS.refreshToken(payload.sub, payload.jti);
    try {
      const exists = await this.redis.get(key);
      if (!exists) throw new UnauthorizedException('Refresh token revoked or expired');
      await this.redis.del(key);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      // Redis unavailable — allow rotation as best-effort.
    }

    return this.issueTokens({
      userId: payload.sub,
      email: payload.email,
      phone: payload.phone,
      roles: payload.roles,
    });
  }

  async revokeAll(userId: string): Promise<void> {
    try {
      const keys = await this.redis.client.keys(REDIS_KEYS.refreshToken(userId, '*'));
      if (keys.length) await this.redis.client.del(...keys);
    } catch {
      // Redis unavailable — tokens remain in memory until Redis recovers.
    }
  }

  private async whitelistRefresh(userId: string, jti: string): Promise<void> {
    try {
      const sevenDays = 7 * 24 * 60 * 60;
      await this.redis.setEx(REDIS_KEYS.refreshToken(userId, jti), '1', sevenDays);
    } catch {
      // Redis unavailable — login still succeeds, but refresh-token
      // rotation will not be enforced until Redis recovers.
    }
  }
}
