import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const url = config.get<string>('redis.url');
    const commonOptions = {
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
      retryStrategy: (times: number) => Math.min(times * 200, 2000),
      lazyConnect: false,
    };

    if (url) {
      this.client = new Redis(url, {
        ...commonOptions,
        tls: url.startsWith('rediss://') ? {} : undefined,
      });
    } else {
      this.client = new Redis({
        ...commonOptions,
        host: config.get<string>('redis.host'),
        port: config.get<number>('redis.port'),
        password: config.get<string>('redis.password'),
        tls: config.get<boolean>('redis.tls') ? {} : undefined,
      });
    }

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  /** Store a value with TTL (seconds). */
  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** Atomic counter used for rate limiting / OTP attempt tracking. */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, ttlSeconds);
    return count;
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
