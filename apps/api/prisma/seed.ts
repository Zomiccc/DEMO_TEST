import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const branch = await prisma.branch.upsert({
    where: { code: 'HQ-001' },
    update: {},
    create: {
      name: 'Main Branch',
      code: 'HQ-001',
      address: 'Gulberg III, Lahore',
      lat: 31.5204,
      lng: 74.3587,
      phone: '+924200000000',
      openingTime: '10:00',
      closingTime: '23:59',
    },
  });

  const passwordHash = await bcrypt.hash('SuperAdmin@123', 12);
  await prisma.user.upsert({
    where: { email: 'superadmin@rms.local' },
    update: {},
    create: {
      email: 'superadmin@rms.local',
      fullName: 'Platform Owner',
      passwordHash,
      roles: [Role.SUPER_ADMIN],
      isEmailVerified: true,
      branchId: branch.id,
    },
  });

  // Default delivery zones implementing the tiered pricing rules.
  await prisma.deliveryZone.createMany({
    data: [
      { branchId: branch.id, name: 'Free (0-7km)', minKm: 0, maxKm: 7, fee: 0, isEnabled: true },
      { branchId: branch.id, name: 'Standard (7-10km)', minKm: 7, maxKm: 10, fee: 200, isEnabled: true },
      { branchId: branch.id, name: 'Extended (10km+)', minKm: 10, maxKm: 999, fee: 0, perKmRate: 150, isEnabled: false },
    ],
    skipDuplicates: true,
  });

  // ── Sample catalog (categories, products, variants, add-ons) ──
  const burgers = await prisma.category.upsert({
    where: { slug: 'burgers' },
    update: {},
    create: { name: 'Burgers', slug: 'burgers', isFeatured: true, sortOrder: 1 },
  });
  const pizzas = await prisma.category.upsert({
    where: { slug: 'pizzas' },
    update: {},
    create: { name: 'Pizzas', slug: 'pizzas', isFeatured: true, sortOrder: 2 },
  });

  const beefBurger = await prisma.product.upsert({
    where: { slug: 'classic-beef-burger' },
    update: {},
    create: {
      name: 'Classic Beef Burger',
      slug: 'classic-beef-burger',
      description: 'Juicy beef patty, cheese, lettuce and house sauce.',
      categoryId: burgers.id,
      branchId: branch.id,
      basePrice: 899.99,
      costPrice: 420,
      isFeatured: true,
      prepTimeMin: 12,
      variants: {
        create: [
          { name: 'Single', priceDelta: 0, isDefault: true },
          { name: 'Double', priceDelta: 350 },
        ],
      },
      addons: {
        create: [
          { name: 'Extra Cheese', price: 100 },
          { name: 'Bacon', price: 150 },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: { slug: 'margherita-pizza' },
    update: {},
    create: {
      name: 'Margherita Pizza',
      slug: 'margherita-pizza',
      description: 'Tomato, mozzarella and fresh basil.',
      categoryId: pizzas.id,
      branchId: branch.id,
      basePrice: 1199,
      costPrice: 500,
      prepTimeMin: 18,
      variants: {
        create: [
          { name: 'Small', priceDelta: 0, isDefault: true },
          { name: 'Medium', priceDelta: 400 },
          { name: 'Large', priceDelta: 800 },
        ],
      },
    },
  });

  console.log(`Seeded catalog (featured product: ${beefBurger.name}).`);
  console.log('Seed complete. Super admin: superadmin@rms.local / SuperAdmin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
