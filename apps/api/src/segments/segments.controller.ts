import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { SegmentsService } from './segments.service';

@ApiTags('Customer Segments')
@ApiBearerAuth()
@Controller('segments')
export class SegmentsController {
  constructor(private readonly segments: SegmentsService) {}

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'List customer segments' })
  list() {
    return this.segments.list();
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('SEGMENT_CREATE')
  @Post()
  @ApiOperation({ summary: 'Create customer segment' })
  create(@Body() dto: { name: string; description?: string; rules: Record<string, any>; isVip?: boolean }) {
    return this.segments.create(dto);
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('SEGMENT_BUILD')
  @Post(':id/build')
  @ApiOperation({ summary: 'Build segment membership from rules' })
  build(@Param('id', ParseUUIDPipe) id: string) {
    return this.segments.buildSegment(id);
  }
}
