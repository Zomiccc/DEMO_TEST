const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
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

  const hash = await bcrypt.hash('SuperAdmin@123', 12);
  await prisma.user.upsert({
    where: { email: 'superadmin@rms.local' },
    update: {},
    create: {
      email: 'superadmin@rms.local',
      fullName: 'Platform Owner',
      passwordHash: hash,
      roles: [Role.SUPER_ADMIN],
      isEmailVerified: true,
      branchId: branch.id,
    },
  });

  const custHash = await bcrypt.hash('Customer@123', 12);
  await prisma.user.upsert({
    where: { email: 'customer@rms.local' },
    update: {},
    create: {
      email: 'customer@rms.local',
      fullName: 'Demo Customer',
      passwordHash: custHash,
      roles: [Role.CUSTOMER],
      isEmailVerified: true,
      branchId: branch.id,
    },
  });

  const riderHash = await bcrypt.hash('Rider@123', 12);
  const riderUser = await prisma.user.upsert({
    where: { email: 'rider@rms.local' },
    update: {},
    create: {
      email: 'rider@rms.local',
      fullName: 'Demo Rider',
      passwordHash: riderHash,
      roles: [Role.RIDER],
      isEmailVerified: true,
      branchId: branch.id,
    },
  });

  await prisma.rider.upsert({
    where: { userId: riderUser.id },
    update: {},
    create: {
      userId: riderUser.id,
      cnic: '35201-1234567-1',
      vehicleType: 'Bike',
      vehiclePlate: 'LHR-1234',
      status: 'APPROVED',
      isOnline: false,
    },
  });

  const cashHash = await bcrypt.hash('Cashier@123', 12);
  await prisma.user.upsert({
    where: { email: 'cashier@rms.local' },
    update: {},
    create: {
      email: 'cashier@rms.local',
      fullName: 'Demo Cashier',
      passwordHash: cashHash,
      roles: [Role.CASHIER],
      isEmailVerified: true,
      branchId: branch.id,
    },
  });

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
  const drinks = await prisma.category.upsert({
    where: { slug: 'drinks' },
    update: {},
    create: { name: 'Drinks', slug: 'drinks', isFeatured: true, sortOrder: 3 },
  });

  await prisma.product.upsert({
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
      isFeatured: true,
      prepTimeMin: 18,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'cola-500ml' },
    update: {},
    create: {
      name: 'Cola 500ml',
      slug: 'cola-500ml',
      description: 'Chilled soft drink.',
      categoryId: drinks.id,
      branchId: branch.id,
      basePrice: 99,
      costPrice: 50,
      isFeatured: false,
      prepTimeMin: 1,
    },
  });

  await prisma.deliveryZone.createMany({
    data: [
      { branchId: branch.id, name: 'Free (0-7km)', minKm: 0, maxKm: 7, fee: 0, isEnabled: true },
      { branchId: branch.id, name: 'Standard (7-10km)', minKm: 7, maxKm: 10, fee: 200, isEnabled: true },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete.');
  console.log('superadmin@rms.local / SuperAdmin@123');
  console.log('customer@rms.local / Customer@123');
  console.log('rider@rms.local / Rider@123');
  console.log('cashier@rms.local / Cashier@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
