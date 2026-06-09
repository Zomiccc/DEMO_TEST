import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Controller('debug')
export class DebugController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Get()
  async diagnose() {
    const results: Record<string, any> = {};

    // 1. Prisma raw query
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      results.prisma_raw = 'ok';
    } catch (e: any) {
      results.prisma_raw = { error: e.message };
    }

    // 2. Prisma find user
    try {
      const user = await this.prisma.user.findFirst();
      results.prisma_user = user ? { found: true, email: user.email } : { found: false };
    } catch (e: any) {
      results.prisma_user = { error: e.message };
    }

    // 3. Redis ping
    try {
      const pong = await this.redis.client.ping();
      results.redis_ping = pong;
    } catch (e: any) {
      results.redis_ping = { error: e.message };
    }

    // 4. Redis setEx
    try {
      await this.redis.setEx('debug_test', '1', 10);
      results.redis_set = 'ok';
    } catch (e: any) {
      results.redis_set = { error: e.message };
    }

    // 5. JWT sign
    try {
      const token = await this.jwt.signAsync({ sub: 'test' }, { secret: 'test-secret-min-32-characters-long', expiresIn: '1m' });
      results.jwt_sign = token ? 'ok' : 'empty';
    } catch (e: any) {
      results.jwt_sign = { error: e.message };
    }

    // 6. bcrypt compare
    try {
      const hash = await bcrypt.hash('test', 10);
      const ok = await bcrypt.compare('test', hash);
      results.bcrypt = ok ? 'ok' : 'mismatch';
    } catch (e: any) {
      results.bcrypt = { error: e.message };
    }

    return results;
  }
}
