import { PrismaClient } from "./packages/db/node_modules/@prisma/client/index.js";
const prisma = new PrismaClient();
const r = await prisma.$queryRaw`SELECT 1 as ok, current_user as u`;
console.log(JSON.stringify(r));
const c = await prisma.$queryRaw`SELECT count(*)::int as c FROM "Pick"`;
console.log(JSON.stringify(c));
await prisma.$disconnect();
