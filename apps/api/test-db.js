const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$connect()
  .then(() => console.log('DB OK'))
  .catch((e) => console.log('DB ERR:', e.code, e.message))
  .finally(() => p.$disconnect());
