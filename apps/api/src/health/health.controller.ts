import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness/readiness probe (DB + Redis)' })
  async check() {
    const result: Record<string, { status: string }> = {};

    try {
      await this.prisma.user.findFirst({ select: { id: true } });
      result.database = { status: 'up' };
    } catch {
      result.database = { status: 'down' };
    }

    try {
      const pong = await this.redis.client.ping();
      result.redis = { status: pong === 'PONG' ? 'up' : 'down' };
    } catch {
      result.redis = { status: 'down' };
    }

    return {
      status: result.database?.status === 'up' ? 'ok' : 'error',
      info: result,
    };
  }
}
