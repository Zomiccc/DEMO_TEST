import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory & Warehouse')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.KITCHEN_STAFF)
  @Get()
  @ApiOperation({ summary: 'List inventory items for a branch' })
  list(@Query('branchId', ParseUUIDPipe) branchId: string) {
    return this.inventory.list(branchId);
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.KITCHEN_STAFF)
  @Get('low-stock')
  @ApiOperation({ summary: 'Items at or below reorder level' })
  lowStock(@Query('branchId', ParseUUIDPipe) branchId: string) {
    return this.inventory.lowStock(branchId);
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('INVENTORY_CREATE_ITEM')
  @Post()
  @ApiOperation({ summary: 'Create inventory item' })
  createItem(
    @Query('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: { name: string; sku?: string; unit?: string; quantity?: number; reorderLevel?: number; costPerUnit?: number; supplierId?: string },
  ) {
    return this.inventory.createItem(branchId, dto);
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.KITCHEN_STAFF)
  @Audit('INVENTORY_STOCK_CHANGE')
  @Post('stock-change')
  @ApiOperation({ summary: 'Receive / consume / waste / adjust stock' })
  changeStock(
    @CurrentUser('sub') userId: string,
    @Body() dto: { itemId: string; change: number; reason: 'RECEIVE' | 'CONSUME' | 'WASTE' | 'ADJUST'; reference?: string },
  ) {
    return this.inventory.changeStock({ ...dto, changedBy: userId });
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.KITCHEN_STAFF)
  @Get('stock-history/:itemId')
  @ApiOperation({ summary: 'Stock history for an item' })
  stockHistory(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.inventory.stockHistory(itemId);
  }

  // ── Suppliers ─────────────────────────────────────────
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get('suppliers')
  @ApiOperation({ summary: 'List suppliers' })
  listSuppliers() {
    return this.inventory.listSuppliers();
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('SUPPLIER_CREATE')
  @Post('suppliers')
  @ApiOperation({ summary: 'Create supplier' })
  createSupplier(@Body() dto: { name: string; contact?: string; email?: string; phone?: string; address?: string }) {
    return this.inventory.createSupplier(dto);
  }

  // ── Purchase Orders ────────────────────────────────────
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get('purchase-orders')
  @ApiOperation({ summary: 'List purchase orders' })
  listPOs() {
    return this.inventory.listPurchaseOrders();
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('PO_CREATE')
  @Post('purchase-orders')
  @ApiOperation({ summary: 'Create purchase order' })
  createPO(@CurrentUser('sub') userId: string, @Body() dto: { supplierId: string; items: { itemId: string; qty: number; unitPrice: number }[] }) {
    return this.inventory.createPurchaseOrder({ ...dto, createdBy: userId });
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.KITCHEN_STAFF)
  @Audit('PO_RECEIVE')
  @Post('purchase-orders/:id/receive')
  @ApiOperation({ summary: 'Receive purchase order (adds to stock)' })
  receivePO(@CurrentUser('sub') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.receivePurchaseOrder(id, userId);
  }
}
