import { db } from "../packages/db/src/index.ts";
async function main() {
  const total = await db.pick.count();
  const settled = await db.pick.count({
    where: { result: { in: ['WIN', 'LOSS', 'PUSH', 'VOID'] } }
  });
  const published = await db.pick.count({
    where: { isPublished: true, result: { in: ['WIN', 'LOSS', 'PUSH', 'VOID'] } }
  });
  console.log('Total picks:', total);
  console.log('Settled picks:', settled);
  console.log('Published settled picks:', published);
}
main().catch(console.error).finally(() => db.$disconnect());
