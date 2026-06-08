const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.restaurantTable.findMany({ take: 3 }).then(t => console.log(JSON.stringify(t, null, 2))).finally(() => p.$disconnect());
