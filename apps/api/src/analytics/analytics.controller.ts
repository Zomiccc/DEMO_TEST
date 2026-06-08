import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get('overview')
  @ApiOperation({ summary: 'Dashboard overview stats' })
  overview() {
    return this.analytics.overview();
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get('sales-by-day')
  @ApiOperation({ summary: 'Sales grouped by day' })
  salesByDay(@Query('days') days?: string) {
    return this.analytics.salesByDay(days ? Number(days) : 7);
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get('top-products')
  @ApiOperation({ summary: 'Top selling products' })
  topProducts(@Query('limit') limit?: string) {
    return this.analytics.topProducts(limit ? Number(limit) : 10);
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get('customer-segments')
  @ApiOperation({ summary: 'Customer RFM-style segments' })
  customerSegments() {
    return this.analytics.customerSegments();
  }
}
