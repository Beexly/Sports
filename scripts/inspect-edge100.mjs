import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  try {
    const picks = await db.pick.findMany({
      where: {
        selection: {
          in: ['UTSA -6.5', 'Western Michigan -7', 'Duke -3', 'New Mexico -14']
        }
      },
      select: {
        id: true,
        selection: true,
        confidence: true,
        edgeScore: true,
        bookmakerCount: true,
        factorBreakdown: true,
        line: true,
        pickType: true
      }
    });
    console.log("Found picks count:", picks.length);
    console.log(JSON.stringify(picks, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await db.$disconnect();
  }
}

main();
