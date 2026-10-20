require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24*60*60*1000);
    
    console.log("STEP 7: UNPRICED GAMES (COVERAGE GAPS)\n");
    
    // NCAAF games WITHOUT a spread
    const ncaafNoSpread = await db.game.findMany({
      where: {
        sport: { key: 'americanfootball_ncaaf' },
        commenceTime: { gte: today, lt: tomorrow },
        openingSpread: null
      },
      select: {
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true,
        externalId: true,
        bookmakerCoverageMax: true
      }
    });
    
    console.log("NCAAF - Games with NO spread (" + ncaafNoSpread.length + "):");
    ncaafNoSpread.forEach((game, i) => {
      console.log((i+1) + ". " + game.homeTeamName + " vs " + game.awayTeamName + " @ " + game.commenceTime.toISOString() + " | Coverage: " + game.bookmakerCoverageMax);
    });
    
    // NCAAF games WITHOUT a total
    const ncaafNoTotal = await db.game.findMany({
      where: {
        sport: { key: 'americanfootball_ncaaf' },
        commenceTime: { gte: today, lt: tomorrow },
        openingTotal: null
      },
      select: {
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true,
        externalId: true,
        bookmakerCoverageMax: true
      }
    });
    
    console.log("\n\nNCAAF - Games with NO total (" + ncaafNoTotal.length + "):");
    ncaafNoTotal.forEach((game, i) => {
      console.log((i+1) + ". " + game.homeTeamName + " vs " + game.awayTeamName + " @ " + game.commenceTime.toISOString() + " | Coverage: " + game.bookmakerCoverageMax);
    });
    
    // NFL games
    const nflNoSpread = await db.game.findMany({
      where: {
        sport: { key: 'americanfootball_nfl' },
        commenceTime: { gte: today, lt: tomorrow },
        openingSpread: null
      },
      select: {
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true
      }
    });
    
    console.log("\n\nNFL - Games with NO spread (" + nflNoSpread.length + "):");
    nflNoSpread.forEach((game, i) => {
      console.log((i+1) + ". " + game.homeTeamName + " vs " + game.awayTeamName);
    });
    
    // Freshness details
    console.log("\n\nSTEP 8: ODDS FRESHNESS (ODDS TABLE DIRECTLY)\n");
    
    // Get the most recent odds for NCAAF
    const ncaafOddsStatus = await db.odds.groupBy({
      by: ['market', 'bookmaker'],
      where: {
        game: {
          sport: { key: 'americanfootball_ncaaf' },
          commenceTime: { gte: today, lt: tomorrow }
        }
      },
      _max: { fetchedAt: true },
      _count: true
    });
    
    console.log("NCAAF - Odds freshness by market and bookmaker:");
    const ncaafOddsByTime = {};
    ncaafOddsStatus.forEach(row => {
      const minsAgo = Math.round((new Date() - new Date(row._max.fetchedAt)) / 60000);
      if (!ncaafOddsByTime[minsAgo]) ncaafOddsByTime[minsAgo] = 0;
      ncaafOddsByTime[minsAgo]++;
    });
    
    Object.keys(ncaafOddsByTime).sort((a, b) => a - b).forEach(mins => {
      console.log("  " + mins + " min ago: " + ncaafOddsByTime[mins] + " records");
    });
    
    // Max timestamp per market per bookmaker
    console.log("\n  Breakdown by market:");
    const byMarket = {};
    ncaafOddsStatus.forEach(row => {
      if (!byMarket[row.market]) byMarket[row.market] = { bookmakers: [], maxTime: row._max.fetchedAt };
      byMarket[row.market].bookmakers.push(row.bookmaker);
    });
    
    Object.entries(byMarket).forEach(([market, data]) => {
      const minsAgo = Math.round((new Date() - new Date(data.maxTime)) / 60000);
      console.log("    " + market + ": " + data.bookmakers.length + " bookmakers, latest " + minsAgo + " min ago");
    });
    
    // Check a few sample games in detail
    console.log("\n\nSTEP 9: SAMPLE GAME DEEP DIVE (FIRST 3 NCAAF)\n");
    
    const samples = await db.game.findMany({
      where: {
        sport: { key: 'americanfootball_ncaaf' },
        commenceTime: { gte: today, lt: tomorrow }
      },
      include: {
        odds: {
          select: {
            bookmaker: true,
            market: true,
            spread: true,
            total: true,
            fetchedAt: true
          }
        }
      },
      take: 3
    });
    
    samples.forEach(game => {
      console.log("Game: " + game.homeTeamName + " vs " + game.awayTeamName);
      console.log("  Opening: Spread=" + game.openingSpread + ", Total=" + game.openingTotal);
      console.log("  Odds records: " + game.odds.length);
      
      const spreadOdds = game.odds.filter(o => o.spread !== null);
      const totalOdds = game.odds.filter(o => o.total !== null);
      
      console.log("  Spread odds: " + spreadOdds.length);
      spreadOdds.slice(0, 5).forEach(o => {
        const minsAgo = Math.round((new Date() - new Date(o.fetchedAt)) / 60000);
        console.log("    " + o.bookmaker + " (" + o.market + "): " + o.spread + " @ " + minsAgo + " min ago");
      });
      
      console.log("  Total odds: " + totalOdds.length);
      totalOdds.slice(0, 5).forEach(o => {
        const minsAgo = Math.round((new Date() - new Date(o.fetchedAt)) / 60000);
        console.log("    " + o.bookmaker + " (" + o.market + "): " + o.total + " @ " + minsAgo + " min ago");
      });
      console.log("");
    });
    
  } catch (err) {
    console.error("Error:", err.message);
    console.error(err.stack);
  } finally {
    await db.$disconnect();
  }
}

main();
