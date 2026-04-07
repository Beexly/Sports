/**
 * Database seed — creates sports and leagues records
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SPORTS = [
  {
    key: "americanfootball_nfl",
    name: "NFL",
    displayName: "National Football League",
    leagues: [{ key: "nfl", name: "NFL", displayName: "National Football League" }],
  },
  {
    key: "americanfootball_ncaaf",
    name: "NCAAF",
    displayName: "College Football",
    leagues: [{ key: "ncaaf", name: "NCAAF", displayName: "College Football" }],
  },
  {
    key: "basketball_nba",
    name: "NBA",
    displayName: "National Basketball Association",
    leagues: [{ key: "nba", name: "NBA", displayName: "National Basketball Association" }],
  },
  {
    key: "basketball_ncaab",
    name: "NCAAB",
    displayName: "College Basketball",
    leagues: [{ key: "ncaab", name: "NCAAB", displayName: "College Basketball" }],
  },
  {
    key: "baseball_mlb",
    name: "MLB",
    displayName: "Major League Baseball",
    leagues: [{ key: "mlb", name: "MLB", displayName: "Major League Baseball" }],
  },
  {
    key: "icehockey_nhl",
    name: "NHL",
    displayName: "National Hockey League",
    leagues: [{ key: "nhl", name: "NHL", displayName: "National Hockey League" }],
  },
  {
    key: "soccer_usa_mls",
    name: "MLS",
    displayName: "Major League Soccer",
    leagues: [{ key: "mls", name: "MLS", displayName: "Major League Soccer", country: "US" }],
  },
];

async function main() {
  console.log("Seeding database...");

  for (const sport of SPORTS) {
    const sportRecord = await db.sport.upsert({
      where: { key: sport.key },
      create: {
        key: sport.key,
        name: sport.name,
        displayName: sport.displayName,
      },
      update: {
        name: sport.name,
        displayName: sport.displayName,
      },
    });

    console.log(`✓ Sport: ${sport.name} (${sportRecord.id})`);

    for (const league of sport.leagues) {
      await db.league.upsert({
        where: { key: league.key },
        create: {
          key: league.key,
          sportId: sportRecord.id,
          name: league.name,
          displayName: league.displayName,
          country: "country" in league ? (league as { country?: string }).country : undefined,
        },
        update: {
          name: league.name,
          displayName: league.displayName,
        },
      });

      console.log(`  ✓ League: ${league.name}`);
    }
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
