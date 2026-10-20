require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24*60*60*1000);
    
    console.log("STEP 4: GAME-BY-GAME ODDS COVERAGE\n");
    
    // Get NCAAF games with their odds (first 10)
    const ncaafGames = await db.game.findMany({
      where: {
        sport: { key: 'americanfootball_ncaaf' },
        commenceTime: { gte: today, lt: tomorrow }
      },
      include: {
        odds: true,
        picks: { select: { bookmakerCount: true, line: true, pickType: true, confidence: true } }
      },
      orderBy: { commenceTime: 'asc' },
      take: 10
    });
    
    console.log("NCAAF - First 10 games:\n");
    ncaafGames.forEach((game, i) => {
      const spreadOdds = game.odds.filter(o => o.spread !== null);
      const totalOdds = game.odds.filter(o => o.total !== null);
      const spreadVal = spreadOdds.length > 0 ? spreadOdds[0].spread.toFixed(1) : "NULL";
      const totalVal = totalOdds.length > 0 ? totalOdds[0].total.toFixed(1) : "NULL";
      const bookmakerCount = spreadOdds.length;
      const pickCount = game.picks.length;
      
      const latestOdds = game.odds.length > 0 
        ? new Date(Math.max(...game.odds.map(o => new Date(o.fetchedAt).getTime()))) 
        : null;
      const minutesAgo = latestOdds ? Math.round((new Date() - latestOdds) / 60000) : 'none';
      
      const gameLabel = game.homeTeamName + ' vs ' + game.awayTeamName;
      console.log((i+1).toString().padEnd(2) + '. ' + gameLabel.substring(0, 28).padEnd(28) + ' | Spread: ' + spreadVal.padEnd(5) + ' | Total: ' + totalVal.padEnd(5) + ' | Books: ' + bookmakerCount.toString().padEnd(2) + ' | Picks: ' + pickCount + ' | ' + minutesAgo + ' min');
    });
    
    // Get NFL games
    const nflGames = await db.game.findMany({
      where: {
        sport: { key: 'americanfootball_nfl' },
        commenceTime: { gte: today, lt: tomorrow }
      },
      include: {
        odds: true,
        picks: { select: { bookmakerCount: true, line: true, pickType: true, confidence: true } }
      },
      orderBy: { commenceTime: 'asc' },
      take: 10
    });
    
    console.log("\n\nNFL - First 10 games:\n");
    nflGames.forEach((game, i) => {
      const spreadOdds = game.odds.filter(o => o.spread !== null);
      const totalOdds = game.odds.filter(o => o.total !== null);
      const spreadVal = spreadOdds.length > 0 ? spreadOdds[0].spread.toFixed(1) : "NULL";
      const totalVal = totalOdds.length > 0 ? totalOdds[0].total.toFixed(1) : "NULL";
      const bookmakerCount = spreadOdds.length;
      const pickCount = game.picks.length;
      
      const latestOdds = game.odds.length > 0 
        ? new Date(Math.max(...game.odds.map(o => new Date(o.fetchedAt).getTime()))) 
        : null;
      const minutesAgo = latestOdds ? Math.round((new Date() - latestOdds) / 60000) : 'none';
      
      const gameLabel = game.homeTeamName + ' vs ' + game.awayTeamName;
      console.log((i+1).toString().padEnd(2) + '. ' + gameLabel.substring(0, 28).padEnd(28) + ' | Spread: ' + spreadVal.padEnd(5) + ' | Total: ' + totalVal.padEnd(5) + ' | Books: ' + bookmakerCount.toString().padEnd(2) + ' | Picks: ' + pickCount + ' | ' + minutesAgo + ' min');
    });
    
    // Aggregate stats
    console.log("\n\nSTEP 5: ODDS COVERAGE STATISTICS\n");
    
    const ncaafWithSpread = await db.game.count({
      where: {
        sport: { key: 'americanfootball_ncaaf' },
        commenceTime: { gte: today, lt: tomorrow },
        openingSpread: { not: null }
      }
    });
    
    const ncaafWithTotal = await db.game.count({
      where: {
        sport: { key: 'americanfootball_ncaaf' },
        commenceTime: { gte: today, lt: tomorrow },
        openingTotal: { not: null }
      }
    });
    
    const ncaafWithBoth = await db.game.count({
      where: {
        sport: { key: 'americanfootball_ncaaf' },
        commenceTime: { gte: today, lt: tomorrow },
        openingSpread: { not: null },
        openingTotal: { not: null }
      }
    });
    
    const ncaafTotal = await db.game.count({
      where: {
        sport: { key: 'americanfootball_ncaaf' },
        commenceTime: { gte: today, lt: tomorrow }
      }
    });
    
    console.log("NCAAF:");
    console.log("  Total games: " + ncaafTotal);
    console.log("  With spread: " + ncaafWithSpread);
    console.log("  With total: " + ncaafWithTotal);
    console.log("  With both: " + ncaafWithBoth);
    
    const nflWithSpread = await db.game.count({
      where: {
        sport: { key: 'americanfootball_nfl' },
        commenceTime: { gte: today, lt: tomorrow },
        openingSpread: { not: null }
      }
    });
    
    const nflWithTotal = await db.game.count({
      where: {
        sport: { key: 'americanfootball_nfl' },
        commenceTime: { gte: today, lt: tomorrow },
        openingTotal: { not: null }
      }
    });
    
    const nflWithBoth = await db.game.count({
      where: {
        sport: { key: 'americanfootball_nfl' },
        commenceTime: { gte: today, lt: tomorrow },
        openingSpread: { not: null },
        openingTotal: { not: null }
      }
    });
    
    const nflTotal = await db.game.count({
      where: {
        sport: { key: 'americanfootball_nfl' },
        commenceTime: { gte: today, lt: tomorrow }
      }
    });
    
    console.log("\nNFL:");
    console.log("  Total games: " + nflTotal);
    console.log("  With spread: " + nflWithSpread);
    console.log("  With total: " + nflWithTotal);
    console.log("  With both: " + nflWithBoth);
    
    // Bookmaker count distribution
    console.log("\n\nSTEP 6: BOOKMAKER COVERAGE DISTRIBUTION\n");
    
    const ncaafBookmakerDistribution = await db.game.groupBy({
      by: ['bookmakerCoverageMax'],
      where: {
        sport: { key: 'americanfootball_ncaaf' },
        commenceTime: { gte: today, lt: tomorrow }
      },
      _count: true
    });
    
    console.log("NCAAF - Bookmaker count distribution:");
    ncaafBookmakerDistribution.sort((a, b) => a.bookmakerCoverageMax - b.bookmakerCoverageMax).forEach(row => {
      console.log("  " + row.bookmakerCoverageMax + " books: " + row._count + " games");
    });
    
    const nflBookmakerDistribution = await db.game.groupBy({
      by: ['bookmakerCoverageMax'],
      where: {
        sport: { key: 'americanfootball_nfl' },
        commenceTime: { gte: today, lt: tomorrow }
      },
      _count: true
    });
    
    console.log("\nNFL - Bookmaker count distribution:");
    nflBookmakerDistribution.sort((a, b) => a.bookmakerCoverageMax - b.bookmakerCoverageMax).forEach(row => {
      console.log("  " + row.bookmakerCoverageMax + " books: " + row._count + " games");
    });
    
  } catch (err) {
    console.error("Error:", err.message);
    console.error(err.stack);
  } finally {
    await db.$disconnect();
  }
}

main();
