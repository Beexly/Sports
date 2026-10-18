#!/usr/bin/env node
/**
 * Verify depth chart schema and current data state
 */
import { db } from "@sports/db";

async function main() {
  try {
    // Get row count and range
    const stats = await db.depthChartEntry.aggregate({
      _count: true,
      _min: { season: true, week: true, depthRank: true },
      _max: { season: true, week: true, depthRank: true },
    });

    console.log("=== DEPTH CHART STATS ===");
    console.log(`Total rows: ${stats._count}`);
    console.log(`Season range: ${stats._min.season} - ${stats._max.season}`);
    console.log(`Week range: ${stats._min.week} - ${stats._max.week}`);
    console.log(`Depth rank range: ${stats._min.depthRank} - ${stats._max.depthRank}`);

    // Get current week for latest season
    const latestSeason = stats._max.season || 2026;
    const latestWeek = await db.depthChartEntry.findFirst({
      where: { season: latestSeason },
      orderBy: { week: "desc" },
      select: { week: true },
    });

    const currentWeek = latestWeek?.week || 0;
    console.log(
      `\nLatest ingested: Season ${latestSeason}, Week ${currentWeek}`,
    );

    // Count starters (depth_rank = 1) by team for current week
    const startersByTeam = await db.depthChartEntry.groupBy({
      by: ["team"],
      where: { season: latestSeason, week: currentWeek, depthRank: 1 },
      _count: true,
    });

    console.log(
      `\nTeams with starters in Season ${latestSeason} Week ${currentWeek}: ${startersByTeam.length}`,
    );

    // Show sample of actual starter rows
    const sampleStarters = await db.depthChartEntry.findMany({
      where: { season: latestSeason, week: currentWeek, depthRank: 1 },
      select: {
        team: true,
        position: true,
        playerName: true,
        depthRank: true,
      },
      orderBy: [{ team: "asc" }, { position: "asc" }],
      take: 20,
    });

    console.log("\n=== SAMPLE STARTERS (20) ===");
    for (const s of sampleStarters) {
      console.log(
        `  ${s.team} ${s.position}: ${s.playerName} (rank ${s.depthRank})`,
      );
    }

    // Check position distribution
    const positions = await db.depthChartEntry.groupBy({
      by: ["position"],
      where: { season: latestSeason, week: currentWeek, depthRank: 1 },
      _count: true,
    });

    console.log("\n=== POSITION DISTRIBUTION (STARTERS) ===");
    for (const p of positions.sort((a, b) => (b._count - a._count))) {
      console.log(`  ${p.position}: ${p._count}`);
    }

    // Show how many depth charts we have per team
    const depthPerTeam = await db.depthChartEntry.groupBy({
      by: ["team"],
      where: { season: latestSeason, week: currentWeek },
      _count: true,
    });

    console.log(
      `\n=== DEPTH ROSTER SIZES (Season ${latestSeason} Week ${currentWeek}) ===`,
    );
    for (const d of depthPerTeam.sort((a, b) => (b._count - a._count))) {
      console.log(`  ${d.team}: ${d._count} total depth entries`);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
