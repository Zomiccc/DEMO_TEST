import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { RidersService } from './riders.service';
import { OnlineToggleDto, RiderLocationDto } from './dto/rider.dto';

@ApiTags('Riders')
@ApiBearerAuth()
@Controller('riders')
export class RidersController {
  constructor(private readonly riders: RidersService) {}

  // ── Rider self-service ─────────────────────────────────
  @Roles(Role.RIDER)
  @Get('me')
  @ApiOperation({ summary: 'My rider dashboard (active orders + earnings)' })
  me(@CurrentUser('sub') userId: string) {
    return this.riders.me(userId);
  }

  @Roles(Role.RIDER)
  @Patch('me/online')
  @ApiOperation({ summary: 'Go online / offline' })
  setOnline(@CurrentUser('sub') userId: string, @Body() dto: OnlineToggleDto) {
    return this.riders.setOnline(userId, dto.online);
  }

  @Roles(Role.RIDER)
  @Post('me/location')
  @ApiOperation({ summary: 'Push GPS location (broadcasts to active order rooms)' })
  pushLocation(@CurrentUser('sub') userId: string, @Body() dto: RiderLocationDto) {
    return this.riders.pushLocation(userId, dto);
  }

  // ── Admin ──────────────────────────────────────────────
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get('pending')
  @ApiOperation({ summary: 'List riders awaiting approval (admin)' })
  listPending() {
    return this.riders.listPending();
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('RIDER_APPROVE')
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a rider (admin)' })
  approve(@CurrentUser('sub') approverId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.riders.approve(id, approverId);
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('RIDER_SUSPEND')
  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend a rider (admin)' })
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.riders.setStatus(id, 'SUSPENDED');
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.CASHIER)
  @Audit('ORDER_ASSIGN_RIDER')
  @Post('assign/:orderId')
  @ApiOperation({ summary: 'Auto-assign nearest online rider to an order (staff)' })
  assign(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.riders.assignNearest(orderId);
  }
}
