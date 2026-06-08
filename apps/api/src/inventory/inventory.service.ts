import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryItem, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface StockChangeInput {
  itemId: string;
  change: number; // positive = receive, negative = consume/waste
  reason: 'RECEIVE' | 'CONSUME' | 'WASTE' | 'ADJUST';
  reference?: string;
  changedBy?: string;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Inventory Items ────────────────────────────────────
  list(branchId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { branchId },
      include: { supplier: true },
      orderBy: { name: 'asc' },
    });
  }

  async lowStock(branchId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { branchId },
      include: { supplier: true },
    });
    return items.filter((i) => Number(i.quantity) <= Number(i.reorderLevel));
  }

  async createItem(branchId: string, data: {
    name: string; sku?: string; unit?: string; quantity?: number;
    reorderLevel?: number; costPerUnit?: number; supplierId?: string;
  }): Promise<InventoryItem> {
    return this.prisma.inventoryItem.create({
      data: {
        branchId,
        name: data.name,
        sku: data.sku,
        unit: data.unit ?? 'unit',
        quantity: new Prisma.Decimal(data.quantity ?? 0),
        reorderLevel: new Prisma.Decimal(data.reorderLevel ?? 0),
        costPerUnit: data.costPerUnit ? new Prisma.Decimal(data.costPerUnit) : null,
        supplierId: data.supplierId,
      },
    });
  }

  // ── Stock Operations ─────────────────────────────────
  async changeStock(input: StockChangeInput): Promise<{ log: unknown; item: InventoryItem }> {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const currentQty = Number(item.quantity);
    const newQty = Math.max(0, currentQty + input.change);
    const balanceAfter = new Prisma.Decimal(newQty);

    const [updated, log] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: input.itemId },
        data: { quantity: balanceAfter },
      }),
      this.prisma.stockLog.create({
        data: {
          itemId: input.itemId,
          change: new Prisma.Decimal(input.change),
          reason: input.reason,
          balanceAfter,
          reference: input.reference,
          createdBy: input.changedBy,
        },
      }),
    ]);

    // Low-stock alert
    if (newQty <= Number(item.reorderLevel)) {
      const branchAdmins = await this.prisma.user.findMany({
        where: { branchId: item.branchId, roles: { hasSome: ['RESTAURANT_ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true },
      });
      for (const admin of branchAdmins) {
        await this.notifications.dispatch({
          userId: admin.id,
          title: 'Low stock alert',
          body: `${item.name} is running low (${newQty} ${item.unit} left).`,
        });
      }
    }

    return { log, item: updated };
  }

  stockHistory(itemId: string) {
    return this.prisma.stockLog.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Suppliers ─────────────────────────────────────────
  listSuppliers() {
    return this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  }

  createSupplier(data: { name: string; contact?: string; email?: string; phone?: string; address?: string }) {
    return this.prisma.supplier.create({ data });
  }

  // ── Purchase Orders ────────────────────────────────────
  listPurchaseOrders() {
    return this.prisma.purchaseOrder.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createPurchaseOrder(data: { supplierId: string; items: { itemId: string; qty: number; unitPrice: number }[]; createdBy?: string }) {
    const total = data.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    return this.prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        poNumber: `PO-${Date.now()}`,
        total: new Prisma.Decimal(total),
        items: data.items as unknown as Prisma.InputJsonValue,
        createdBy: data.createdBy,
      },
    });
  }

  async receivePurchaseOrder(poId: string, changedBy?: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) throw new NotFoundException('Purchase order not found');

    const items = po.items as Array<{ itemId: string; qty: number }>;
    for (const entry of items) {
      await this.changeStock({
        itemId: entry.itemId,
        change: entry.qty,
        reason: 'RECEIVE',
        reference: `PO ${po.poNumber}`,
        changedBy,
      });
    }
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: 'RECEIVED', receivedAt: new Date() },
    });
  }
}
