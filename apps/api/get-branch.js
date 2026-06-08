const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.branch.findFirst().then(b => console.log(b.id)).finally(() => p.$disconnect());
