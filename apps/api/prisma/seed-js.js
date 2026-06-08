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

  console.log('Seed complete: superadmin@rms.local / SuperAdmin@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
