import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { ProductsService } from './products.service';
import {
  CreateAddonDto,
  CreateProductDto,
  CreateVariantDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

@ApiTags('Catalog · Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse products with search/filter/pagination (public)' })
  findMany(@Query() query: ProductQueryDto) {
    return this.products.findMany(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Product detail with variants & add-ons (public)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('PRODUCT_CREATE')
  @Post()
  @ApiOperation({ summary: 'Create product (admin)' })
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('PRODUCT_UPDATE')
  @Patch(':id')
  @ApiOperation({ summary: 'Update product (admin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('PRODUCT_DELETE')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete product (admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(id);
  }

  // ── Variants ───────────────────────────────────────────
  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('PRODUCT_VARIANT_ADD')
  @Post(':id/variants')
  @ApiOperation({ summary: 'Add a variant to a product (admin)' })
  addVariant(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateVariantDto) {
    return this.products.addVariant(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('PRODUCT_VARIANT_REMOVE')
  @Delete('variants/:variantId')
  @ApiOperation({ summary: 'Remove a variant (admin)' })
  removeVariant(@Param('variantId', ParseUUIDPipe) variantId: string) {
    return this.products.removeVariant(variantId);
  }

  // ── Add-ons ────────────────────────────────────────────
  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('PRODUCT_ADDON_ADD')
  @Post(':id/addons')
  @ApiOperation({ summary: 'Add an add-on to a product (admin)' })
  addAddon(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateAddonDto) {
    return this.products.addAddon(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('PRODUCT_ADDON_REMOVE')
  @Delete('addons/:addonId')
  @ApiOperation({ summary: 'Remove an add-on (admin)' })
  removeAddon(@Param('addonId', ParseUUIDPipe) addonId: string) {
    return this.products.removeAddon(addonId);
  }
}
