import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active branches (public)' })
  list() {
    return this.branches.findAll(true);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Branch detail (public)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.branches.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN)
  @Audit('BRANCH_CREATE')
  @Post()
  @ApiOperation({ summary: 'Create branch (super admin)' })
  create(@Body() dto: CreateBranchDto) {
    return this.branches.create(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_ADMIN)
  @Audit('BRANCH_UPDATE')
  @Patch(':id')
  @ApiOperation({ summary: 'Update branch' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBranchDto) {
    return this.branches.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN)
  @Audit('BRANCH_DEACTIVATE')
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate branch (super admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.branches.remove(id);
  }
}
