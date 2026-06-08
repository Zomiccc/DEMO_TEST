import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { KdsService } from './kds.service';

@ApiTags('Kitchen Display System')
@ApiBearerAuth()
@Controller('kds')
export class KdsController {
  constructor(private readonly kds: KdsService) {}

  @Roles(Role.KITCHEN_STAFF, Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get('queue')
  @ApiOperation({ summary: 'Get branch kitchen queue (staff)' })
  queue(@Query('branchId', ParseUUIDPipe) branchId: string) {
    return this.kds.branchQueue(branchId);
  }

  @Roles(Role.KITCHEN_STAFF, Role.RESTAURANT_ADMIN)
  @Audit('KDS_START')
  @Post(':id/start')
  @ApiOperation({ summary: 'Start preparing an order' })
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.kds.start(id);
  }

  @Roles(Role.KITCHEN_STAFF, Role.RESTAURANT_ADMIN)
  @Audit('KDS_READY')
  @Post(':id/ready')
  @ApiOperation({ summary: 'Mark order ready for pickup/delivery' })
  ready(@Param('id', ParseUUIDPipe) id: string) {
    return this.kds.ready(id);
  }

  @Roles(Role.KITCHEN_STAFF, Role.RESTAURANT_ADMIN, Role.CASHIER)
  @Audit('KDS_SERVED')
  @Post(':id/served')
  @ApiOperation({ summary: 'Mark order as served / handed off' })
  served(@Param('id', ParseUUIDPipe) id: string) {
    return this.kds.served(id);
  }

  @Roles(Role.KITCHEN_STAFF, Role.RESTAURANT_ADMIN)
  @Audit('KDS_PRIORITY')
  @Patch(':id/priority')
  @ApiOperation({ summary: 'Set order priority' })
  priority(@Param('id', ParseUUIDPipe) id: string, @Body('priority') priority: number) {
    return this.kds.setPriority(id, priority);
  }
}
