import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { CampaignsService } from './campaigns.service';

@ApiTags('Campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'List campaigns' })
  list() {
    return this.campaigns.list();
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('CAMPAIGN_CREATE')
  @Post()
  @ApiOperation({ summary: 'Create campaign' })
  create(@Body() dto: { name: string; channel: any; template: string; segmentId?: string; trigger?: string; scheduledAt?: string }) {
    return this.campaigns.create({ ...dto, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined });
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('CAMPAIGN_LAUNCH')
  @Post(':id/launch')
  @ApiOperation({ summary: 'Launch campaign to customers' })
  launch(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.launch(id);
  }
}
