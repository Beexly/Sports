require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  try {
    console.log("STEP 10: INGESTION RUN VERIFICATION - RECENT SUCCESSFUL ODDS WRITES\n");
    
    // Get the last 20 ingestion runs for NCAAF and NFL
    const runs = await db.ingestionRun.findMany({
      where: {
        sport: { in: ['americanfootball_ncaaf', 'americanfootball_nfl'] },
        status: 'SUCCESS'
      },
      orderBy: { completedAt: 'desc' },
      take: 20
    });
    
    console.log("Recent successful ingestion runs (NCAAF/NFL):\n");
    console.log("Sport           | Odds Written | Games Upserted | Completed | Age (min)");
    console.log("----            | ---------    | ------         | --------  | ---------");
    
    runs.forEach(run => {
      const minsAgo = Math.round((new Date() - new Date(run.completedAt)) / 60000);
      const sport = run.sport.padEnd(15);
      const odds = (run.oddsInserted || 0).toString().padEnd(12);
      const games = (run.gamesUpserted || 0).toString().padEnd(14);
      const time = run.completedAt.toISOString().split('T')[1].substring(0, 5);
      console.log(sport + "| " + odds + "| " + games + "| " + time + "  | " + minsAgo);
    });
    
    // Get NCAAF recent odds in the last 1 hour
    console.log("\n\nSTEP 11: RECENT ODDS IN LAST 60 MINUTES\n");
    
    const oneHourAgo = new Date(new Date() - 60*60*1000);
    
    const recentOdds = await db.odds.findMany({
      where: {
        fetchedAt: { gte: oneHourAgo },
        game: {
          sport: { key: { in: ['americanfootball_ncaaf', 'americanfootball_nfl'] } }
        }
      },
      select: {
        game: { select: { sport: { select: { key: true } }, homeTeamName: true, awayTeamName: true } },
        bookmaker: true,
        market: true,
        spread: true,
        total: true,
        fetchedAt: true
      },
      take: 50
    });
    
    if (recentOdds.length === 0) {
      console.log("NO odds records fetched in the last 60 minutes.");
    } else {
      console.log("Found " + recentOdds.length + " odds records in last 60 minutes:\n");
      
      const byGame = {};
      recentOdds.forEach(o => {
        const gameKey = o.game.homeTeamName + ' vs ' + o.game.awayTeamName;
        if (!byGame[gameKey]) byGame[gameKey] = [];
        byGame[gameKey].push(o);
      });
      
      Object.entries(byGame).slice(0, 5).forEach(([game, odds]) => {
        console.log("  " + game);
        const spreads = odds.filter(o => o.spread !== null);
        const totals = odds.filter(o => o.total !== null);
        console.log("    Spreads: " + spreads.length + " records from " + new Set(spreads.map(o => o.bookmaker)).size + " bookmakers");
        console.log("    Totals: " + totals.length + " records from " + new Set(totals.map(o => o.bookmaker)).size + " bookmakers");
      });
    }
    
    // Query the actual freshness directly from odds table
    console.log("\n\nSTEP 12: ODDS TABLE AGGREGATE STATS\n");
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24*60*60*1000);
    
    const oddsStats = await db.odds.groupBy({
      by: ['market'],
      where: {
        game: {
          sport: { key: { in: ['americanfootball_ncaaf', 'americanfootball_nfl'] } },
          commenceTime: { gte: today, lt: tomorrow }
        }
      },
      _count: true,
      _max: { fetchedAt: true },
      _min: { fetchedAt: true }
    });
    
    if (oddsStats.length === 0) {
      console.log("NO odds for today's games in the database.");
    } else {
      console.log("Odds coverage for today's scheduled games:\n");
      oddsStats.forEach(stat => {
        const maxMinsAgo = Math.round((new Date() - new Date(stat._max.fetchedAt)) / 60000);
        const minMinsAgo = Math.round((new Date() - new Date(stat._min.fetchedAt)) / 60000);
        console.log("  " + stat.market + ":");
        console.log("    Total records: " + stat._count);
        console.log("    Newest: " + maxMinsAgo + " min ago");
        console.log("    Oldest: " + minMinsAgo + " min ago");
      });
    }
    
    // Check if the cron is actually running TODAY
    console.log("\n\nSTEP 13: TODAY'S INGESTION RUNS\n");
    
    const todaysRuns = await db.ingestionRun.findMany({
      where: {
        completedAt: { gte: today, lt: tomorrow }
      },
      orderBy: { completedAt: 'desc' }
    });
    
    if (todaysRuns.length === 0) {
      console.log("NO ingestion runs completed today (after " + today.toISOString() + ")");
    } else {
      console.log(todaysRuns.length + " ingestion runs today:\n");
      todaysRuns.forEach(run => {
        console.log("  " + run.sport + " | " + run.status + " | odds=" + run.oddsInserted + ", games=" + run.gamesUpserted + " | " + run.completedAt.toISOString());
      });
    }
    
  } catch (err) {
    console.error("Error:", err.message);
    console.error(err.stack);
  } finally {
    await db.$disconnect();
  }
}

main();
