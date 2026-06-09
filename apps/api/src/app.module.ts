import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'path';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { CatalogModule } from './catalog/catalog.module';
import { BranchesModule } from './branches/branches.module';
import { AddressesModule } from './addresses/addresses.module';
import { DeliveryModule } from './delivery/delivery.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';
import { RidersModule } from './riders/riders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReferralsModule } from './referrals/referrals.module';
import { KdsModule } from './kds/kds.module';
import { InventoryModule } from './inventory/inventory.module';
import { PosModule } from './pos/pos.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SegmentsModule } from './segments/segments.module';
import { DebugModule } from './debug/debug.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: __dirname.includes('dist')
        ? resolve(__dirname, '..', '..', '..', '..', '..', 'unified', 'dist')
        : resolve(__dirname, '..', '..', 'unified', 'dist'),
      exclude: ['/api/(.*)'],
      serveRoot: '/',
    }),
    // Public default: 100 req/min per IP. Authenticated controllers raise this
    // via @Throttle({ default: { limit: 500, ttl: 60000 } }).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: 60000,
            limit: config.get<number>('rateLimit.publicPerMin') ?? 100,
          },
        ],
        // In-memory storage: single-instance deployment, avoids hanging on
        // an unstable external Redis (Upstash free tier ECONNRESET loops).
      }),
    }),
    PrismaModule,
    RedisModule,
    AuditModule,
    UsersModule,
    AuthModule,
    HealthModule,
    CatalogModule,
    BranchesModule,
    AddressesModule,
    DeliveryModule,
    RealtimeModule,
    PaymentsModule,
    OrdersModule,
    RidersModule,
    ReviewsModule,
    NotificationsModule,
    ReferralsModule,
    KdsModule,
    InventoryModule,
    PosModule,
    AnalyticsModule,
    CampaignsModule,
    SegmentsModule,
    DebugModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
