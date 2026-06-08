const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  // ── Branch ──
  const branch = await prisma.branch.upsert({
    where: { code: 'HQ-001' },
    update: {},
    create: {
      name: 'Main Branch Gulberg',
      code: 'HQ-001',
      address: 'Gulberg III, Lahore',
      lat: 31.5204,
      lng: 74.3587,
      phone: '+924200000000',
      openingTime: '10:00',
      closingTime: '23:59',
    },
  });

  // ── Users ──
  const users = [
    { email: 'superadmin@rms.local', name: 'Platform Owner', pass: 'SuperAdmin@123', roles: [Role.SUPER_ADMIN] },
    { email: 'customer@rms.local', name: 'Ahmad Khan', pass: 'Customer@123', roles: [Role.CUSTOMER] },
    { email: 'rider@rms.local', name: 'Ali Hassan', pass: 'Rider@123', roles: [Role.RIDER] },
    { email: 'cashier@rms.local', name: 'Fatima Bibi', pass: 'Cashier@123', roles: [Role.CASHIER] },
    { email: 'kitchen@rms.local', name: 'Chef Bilal', pass: 'Kitchen@123', roles: [Role.KITCHEN_STAFF] },
  ];
  const createdUsers = {};
  for (const u of users) {
    createdUsers[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        fullName: u.name,
        passwordHash: await bcrypt.hash(u.pass, 12),
        roles: u.roles,
        isEmailVerified: true,
        branchId: branch.id,
      },
    });
  }

  // ── Rider profile ──
  await prisma.rider.upsert({
    where: { userId: createdUsers['rider@rms.local'].id },
    update: {},
    create: {
      userId: createdUsers['rider@rms.local'].id,
      cnic: '35201-1234567-1',
      vehicleType: 'Honda CD70',
      vehiclePlate: 'LHR-1234',
      status: 'APPROVED',
      isOnline: false,
    },
  });

  // ── Employee records ──
  await prisma.employee.upsert({
    where: { userId: createdUsers['cashier@rms.local'].id },
    update: {},
    create: { userId: createdUsers['cashier@rms.local'].id, branchId: branch.id, position: 'Cashier', salary: 45000 },
  });
  await prisma.employee.upsert({
    where: { userId: createdUsers['kitchen@rms.local'].id },
    update: {},
    create: { userId: createdUsers['kitchen@rms.local'].id, branchId: branch.id, position: 'Line Cook', salary: 38000 },
  });

  // ── Categories ──
  const catData = [
    { name: 'Deals & Combos', slug: 'deals', isFeatured: true, sortOrder: 0 },
    { name: 'Burgers', slug: 'burgers', isFeatured: true, sortOrder: 1 },
    { name: 'Pizzas', slug: 'pizzas', isFeatured: true, sortOrder: 2 },
    { name: 'Appetizers', slug: 'appetizers', isFeatured: false, sortOrder: 3 },
    { name: 'Pasta', slug: 'pasta', isFeatured: false, sortOrder: 4 },
    { name: 'Drinks', slug: 'drinks', isFeatured: true, sortOrder: 5 },
    { name: 'Desserts', slug: 'desserts', isFeatured: false, sortOrder: 6 },
  ];
  const cats = [];
  for (const c of catData) {
    cats.push(await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...c } }));
  }
  const [deals, burgers, pizzas, appetizers, pasta, drinks, desserts] = cats;

  // ── Products ──
  const products = [
    { name: 'Family Feast Deal', slug: 'family-feast', cat: deals.id, price: 2499, cost: 1200, prep: 25, feat: true, desc: '2 large pizzas, 6 wings, 2 drinks & lava cake. Perfect for 4 people.' },
    { name: 'Burger Combo', slug: 'burger-combo', cat: deals.id, price: 1299, cost: 600, prep: 15, feat: true, desc: 'Any burger + fries + drink. Best value meal.' },
    { name: 'Classic Beef Burger', slug: 'classic-beef-burger', cat: burgers.id, price: 899.99, cost: 420, prep: 12, feat: true, desc: 'Juicy beef patty, melted cheddar, lettuce, tomato & house sauce on brioche.' },
    { name: 'Crispy Chicken Burger', slug: 'crispy-chicken-burger', cat: burgers.id, price: 749.99, cost: 350, prep: 10, feat: true, desc: 'Crispy fried chicken breast with mayo, coleslaw & pickles.' },
    { name: 'Mushroom Swiss Burger', slug: 'mushroom-swiss-burger', cat: burgers.id, price: 949.99, cost: 450, prep: 14, feat: false, desc: 'Sauteed mushrooms, Swiss cheese, caramelized onions & garlic aioli.' },
    { name: 'Zinger Tower', slug: 'zinger-tower', cat: burgers.id, price: 799.99, cost: 380, prep: 11, feat: true, desc: 'Double-decker crispy chicken with hashbrown, cheese & spicy mayo.' },
    { name: 'Spicy Inferno Burger', slug: 'spicy-inferno', cat: burgers.id, price: 849.99, cost: 400, prep: 12, feat: false, desc: 'Ghost pepper sauce, jalapenos, pepper jack cheese & fried onions.' },
    { name: 'Margherita Pizza', slug: 'margherita-pizza', cat: pizzas.id, price: 1199, cost: 500, prep: 18, feat: true, desc: 'San Marzano tomato, fresh mozzarella, basil & extra virgin olive oil.' },
    { name: 'Pepperoni Feast', slug: 'pepperoni-feast', cat: pizzas.id, price: 1399, cost: 600, prep: 20, feat: true, desc: 'Generous pepperoni, mozzarella blend & Italian herbs.' },
    { name: 'BBQ Chicken Pizza', slug: 'bbq-chicken-pizza', cat: pizzas.id, price: 1499, cost: 650, prep: 20, feat: false, desc: 'Grilled chicken, BBQ sauce, red onions, cilantro & mozzarella.' },
    { name: 'Fajita Supreme', slug: 'fajita-supreme', cat: pizzas.id, price: 1449, cost: 620, prep: 20, feat: true, desc: 'Chicken fajita strips, bell peppers, onions & chipotle ranch drizzle.' },
    { name: 'Loaded Fries', slug: 'loaded-fries', cat: appetizers.id, price: 449.99, cost: 180, prep: 8, feat: true, desc: 'Crispy fries topped with cheddar, jalapenos, ranch & bacon bits.' },
    { name: 'Chicken Wings', slug: 'chicken-wings', cat: appetizers.id, price: 649.99, cost: 300, prep: 15, feat: true, desc: 'Crispy wings in Buffalo, BBQ or Garlic Parmesan sauce.' },
    { name: 'Onion Rings', slug: 'onion-rings', cat: appetizers.id, price: 349.99, cost: 140, prep: 8, feat: false, desc: 'Beer-battered onion rings with chipotle mayo.' },
    { name: 'Mozzarella Sticks', slug: 'mozzarella-sticks', cat: appetizers.id, price: 499.99, cost: 200, prep: 10, feat: false, desc: 'Golden fried mozzarella with marinara dip.' },
    { name: 'Creamy Alfredo Pasta', slug: 'alfredo-pasta', cat: pasta.id, price: 899.99, cost: 380, prep: 16, feat: false, desc: 'Fettuccine in rich parmesan cream sauce with grilled chicken.' },
    { name: 'Arrabbiata Penne', slug: 'arrabbiata-penne', cat: pasta.id, price: 799.99, cost: 340, prep: 15, feat: false, desc: 'Spicy tomato sauce, garlic, chili flakes & fresh basil.' },
    { name: 'Cola 500ml', slug: 'cola-500ml', cat: drinks.id, price: 99, cost: 50, prep: 1, feat: false, desc: 'Ice-cold cola served chilled.' },
    { name: 'Mango Lassi', slug: 'mango-lassi', cat: drinks.id, price: 199, cost: 80, prep: 3, feat: true, desc: 'Refreshing yogurt drink blended with ripe mangoes.' },
    { name: 'Mint Lemonade', slug: 'mint-lemonade', cat: drinks.id, price: 149, cost: 60, prep: 3, feat: false, desc: 'Freshly squeezed lemons with mint & honey.' },
    { name: 'Oreo Milkshake', slug: 'oreo-milkshake', cat: drinks.id, price: 349.99, cost: 140, prep: 5, feat: true, desc: 'Creamy milkshake blended with Oreo cookies & whipped cream.' },
    { name: 'Chocolate Lava Cake', slug: 'lava-cake', cat: desserts.id, price: 449.99, cost: 180, prep: 12, feat: true, desc: 'Warm molten chocolate center with vanilla ice cream.' },
    { name: 'Gulab Jamun', slug: 'gulab-jamun', cat: desserts.id, price: 199, cost: 80, prep: 5, feat: false, desc: 'Traditional milk-solid dumplings in cardamom sugar syrup.' },
    { name: 'New York Cheesecake', slug: 'cheesecake', cat: desserts.id, price: 549.99, cost: 220, prep: 10, feat: true, desc: 'Classic creamy cheesecake with strawberry compote.' },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        description: p.desc,
        categoryId: p.cat,
        branchId: branch.id,
        basePrice: p.price,
        costPrice: p.cost,
        isFeatured: p.feat,
        prepTimeMin: p.prep,
      },
    });
  }

  // ── Variants ──
  const beef = await prisma.product.findUnique({ where: { slug: 'classic-beef-burger' } });
  if (beef && (await prisma.productVariant.count({ where: { productId: beef.id } })) === 0) {
    await prisma.productVariant.createMany({ data: [{ productId: beef.id, name: 'Single', priceDelta: 0, isDefault: true }, { productId: beef.id, name: 'Double', priceDelta: 350 }] });
  }
  const chick = await prisma.product.findUnique({ where: { slug: 'crispy-chicken-burger' } });
  if (chick && (await prisma.productVariant.count({ where: { productId: chick.id } })) === 0) {
    await prisma.productVariant.createMany({ data: [{ productId: chick.id, name: 'Regular', priceDelta: 0, isDefault: true }, { productId: chick.id, name: 'Spicy', priceDelta: 0 }] });
  }
  const margh = await prisma.product.findUnique({ where: { slug: 'margherita-pizza' } });
  if (margh && (await prisma.productVariant.count({ where: { productId: margh.id } })) === 0) {
    await prisma.productVariant.createMany({ data: [{ productId: margh.id, name: 'Small 9"', priceDelta: 0, isDefault: true }, { productId: margh.id, name: 'Medium 12"', priceDelta: 400 }, { productId: margh.id, name: 'Large 14"', priceDelta: 800 }] });
  }
  const pepp = await prisma.product.findUnique({ where: { slug: 'pepperoni-feast' } });
  if (pepp && (await prisma.productVariant.count({ where: { productId: pepp.id } })) === 0) {
    await prisma.productVariant.createMany({ data: [{ productId: pepp.id, name: 'Small 9"', priceDelta: 0, isDefault: true }, { productId: pepp.id, name: 'Medium 12"', priceDelta: 500 }, { productId: pepp.id, name: 'Large 14"', priceDelta: 1000 }] });
  }
  const wings = await prisma.product.findUnique({ where: { slug: 'chicken-wings' } });
  if (wings && (await prisma.productVariant.count({ where: { productId: wings.id } })) === 0) {
    await prisma.productVariant.createMany({ data: [{ productId: wings.id, name: '6pc', priceDelta: 0, isDefault: true }, { productId: wings.id, name: '12pc', priceDelta: 550 }] });
  }
  const fries = await prisma.product.findUnique({ where: { slug: 'loaded-fries' } });
  if (fries && (await prisma.productVariant.count({ where: { productId: fries.id } })) === 0) {
    await prisma.productVariant.createMany({ data: [{ productId: fries.id, name: 'Regular', priceDelta: 0, isDefault: true }, { productId: fries.id, name: 'Large', priceDelta: 150 }] });
  }

  // ── Add-ons ──
  if (beef && (await prisma.productAddon.count({ where: { productId: beef.id } })) === 0) {
    await prisma.productAddon.createMany({ data: [{ productId: beef.id, name: 'Extra Cheese', price: 100 }, { productId: beef.id, name: 'Bacon', price: 150 }, { productId: beef.id, name: 'Fried Egg', price: 80 }] });
  }

  // ── Delivery Zones ──
  await prisma.deliveryZone.createMany({
    data: [
      { branchId: branch.id, name: 'Free Zone (0-5km)', minKm: 0, maxKm: 5, fee: 0, isEnabled: true },
      { branchId: branch.id, name: 'Near (5-8km)', minKm: 5, maxKm: 8, fee: 100, isEnabled: true },
      { branchId: branch.id, name: 'Standard (8-12km)', minKm: 8, maxKm: 12, fee: 200, isEnabled: true },
      { branchId: branch.id, name: 'Far (12-20km)', minKm: 12, maxKm: 20, fee: 350, isEnabled: true },
    ],
    skipDuplicates: true,
  });

  // ── Restaurant Tables ──
  for (let i = 1; i <= 12; i++) {
    const name = `Table ${i}`;
    if (!(await prisma.restaurantTable.findFirst({ where: { branchId: branch.id, name } }))) {
      await prisma.restaurantTable.create({ data: { branchId: branch.id, name, capacity: i <= 4 ? 4 : i <= 8 ? 6 : 8, status: 'AVAILABLE' } });
    }
  }

  // ── Address ──
  if (!(await prisma.address.findFirst({ where: { userId: createdUsers['customer@rms.local'].id } }))) {
    await prisma.address.create({
      data: {
        userId: createdUsers['customer@rms.local'].id,
        label: 'Home',
        line1: 'House 42-B, Block C',
        line2: 'Gulberg III',
        city: 'Lahore',
        area: 'Gulberg',
        lat: 31.5104,
        lng: 74.3487,
        isDefault: true,
      },
    });
  }

  // ── Promo Code ──
  if (!(await prisma.promoCode.findFirst({ where: { code: 'WELCOME20' } }))) {
    await prisma.promoCode.create({
      data: {
        code: 'WELCOME20',
        type: 'PERCENTAGE',
        value: 20,
        minOrder: 500,
        maxDiscount: 300,
        isActive: true,
        startsAt: new Date('2025-01-01'),
        expiresAt: new Date('2026-12-31'),
        usageLimit: 1000,
      },
    });
  }

  console.log('=== Seed complete ===');
  for (const u of users) console.log(`  ${u.email} / ${u.pass}`);
  console.log(`Products: ${products.length}`);
  console.log('Tables: 12');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
