import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Catalog · Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse active category tree (public)' })
  tree() {
    return this.categories.findTree();
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Featured categories (public)' })
  featured() {
    return this.categories.findFeatured();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Category detail (public)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get('admin/all')
  @ApiOperation({ summary: 'List all categories incl. inactive (admin)' })
  all() {
    return this.categories.findAll();
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('CATEGORY_CREATE')
  @Post()
  @ApiOperation({ summary: 'Create category (admin)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('CATEGORY_UPDATE')
  @Patch(':id')
  @ApiOperation({ summary: 'Update category (admin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('CATEGORY_DELETE')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete category (admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }
}
