import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { DeliveryService } from './delivery.service';
import { CreateZoneDto, DeliveryQuoteDto, PeakToggleDto, UpdateZoneDto } from './dto/delivery.dto';

@ApiTags('Delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Public()
  @Post('quote')
  @ApiOperation({ summary: 'Delivery availability + fee quote for a destination (public)' })
  quote(@Body() dto: DeliveryQuoteDto) {
    return this.delivery.quote(dto.branchId, { lat: dto.lat, lng: dto.lng });
  }

  @Public()
  @Get('zones')
  @ApiOperation({ summary: 'List delivery zones for a branch (public)' })
  listZones(@Query('branchId', ParseUUIDPipe) branchId: string) {
    return this.delivery.listZones(branchId);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('DELIVERY_ZONE_CREATE')
  @Post('zones')
  @ApiOperation({ summary: 'Create a delivery zone (admin)' })
  createZone(@Body() dto: CreateZoneDto) {
    return this.delivery.createZone(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('DELIVERY_ZONE_UPDATE')
  @Patch('zones/:id')
  @ApiOperation({ summary: 'Update a delivery zone (admin)' })
  updateZone(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZoneDto) {
    return this.delivery.updateZone(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('DELIVERY_ZONE_DELETE')
  @Delete('zones/:id')
  @ApiOperation({ summary: 'Delete a delivery zone (admin)' })
  removeZone(@Param('id', ParseUUIDPipe) id: string) {
    return this.delivery.removeZone(id);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('DELIVERY_PEAK_TOGGLE')
  @Post('peak')
  @ApiOperation({ summary: 'Toggle peak-hour pricing (admin)' })
  setPeak(@Body() dto: PeakToggleDto) {
    return this.delivery.setPeak(dto.enabled);
  }
}
