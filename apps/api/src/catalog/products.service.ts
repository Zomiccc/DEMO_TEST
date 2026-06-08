import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product, ProductAddon, ProductVariant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAddonDto,
  CreateProductDto,
  CreateVariantDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public browse with search, category/branch filter, featured + pagination. */
  async findMany(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ProductWhereInput = {
      isAvailable: true,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.featured ? { isFeatured: true } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { variants: true, addons: { where: { isActive: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true, addons: true, category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const exists = await this.prisma.product.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Product slug already exists');
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category not found');
    return this.prisma.product.create({ data: dto });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<{ deleted: true }> {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Variants ───────────────────────────────────────────
  async addVariant(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
    await this.findOne(productId);
    return this.prisma.productVariant.create({ data: { ...dto, productId } });
  }

  async removeVariant(variantId: string): Promise<{ deleted: true }> {
    await this.prisma.productVariant.delete({ where: { id: variantId } });
    return { deleted: true };
  }

  // ── Add-ons ────────────────────────────────────────────
  async addAddon(productId: string, dto: CreateAddonDto): Promise<ProductAddon> {
    await this.findOne(productId);
    return this.prisma.productAddon.create({ data: { ...dto, productId } });
  }

  async removeAddon(addonId: string): Promise<{ deleted: true }> {
    await this.prisma.productAddon.delete({ where: { id: addonId } });
    return { deleted: true };
  }
}
