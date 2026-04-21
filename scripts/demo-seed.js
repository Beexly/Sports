/**
 * Demo seed — creates realistic game + pick data using the real scoring engine.
 * Used when THE_ODDS_API_KEY is not configured; produces picks that accurately
 * reflect algorithm output for real teams with plausible odds.
 *
 * Run: node scripts/demo-seed.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { scoreGames } = require("../packages/prediction-engine/dist/scoring.js");
const { buildPickSignalSnapshot } = require("../packages/prediction-engine/dist/signal-snapshot.js");

const db = new PrismaClient();

// ── Today's date anchor ────────────────────────────────────────────────────
const TODAY = new Date("2026-04-21T00:00:00Z");

function gameTime(hour, minute = 0) {
  const d = new Date(TODAY);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

// ── Realistic bookmaker consensus builder ──────────────────────────────────
// Generates 6 bookmakers with slight variance to produce high consensus scores.
function buildBookmakerOdds(spread, total, mlHome, mlAway) {
  const books = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbet", "betrivers"];
  const odds = [];

  for (const book of books) {
    const spreadVar = (Math.random() - 0.5) * 0.4; // ±0.2 variance
    const totalVar = (Math.random() - 0.5) * 0.5;  // ±0.25 variance

    odds.push({
      bookmaker: book,
      market: "SPREADS",
      spread: spread + spreadVar,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    });

    odds.push({
      bookmaker: book,
      market: "TOTALS",
      total: total + totalVar,
      overPrice: -110,
      underPrice: -110,
    });

    odds.push({
      bookmaker: book,
      market: "H2H",
      homePrice: mlHome,
      awayPrice: mlAway,
    });
  }

  return odds;
}

// ── Game definitions: real teams, plausible April 2026 matchups ────────────
//    NBA Playoffs Round 1, MLB Week 3, NHL Playoffs Round 1
const GAMES = [
  // ── NBA Playoffs ──────────────────────────────────────────────────────
  {
    externalId: "demo_nba_bos_ind_20260421",
    sport: "basketball_nba",
    home: "Boston Celtics",
    away: "Indiana Pacers",
    time: gameTime(23, 30),
    spread: -7.5,       // Celtics favored at home
    total: 224.5,
    mlHome: -310,
    mlAway: 250,
    openingSpread: -6.5, // line moved toward Celtics — sharp action
    restDaysHome: 2,
    restDaysAway: 2,
  },
  {
    externalId: "demo_nba_okc_dal_20260421",
    sport: "basketball_nba",
    home: "Oklahoma City Thunder",
    away: "Dallas Mavericks",
    time: gameTime(1, 0),
    spread: -5.5,
    total: 218.5,
    mlHome: -220,
    mlAway: 185,
    openingSpread: -5.0,
    restDaysHome: 2,
    restDaysAway: 1,
    isAwayBackToBack: true,
  },
  {
    externalId: "demo_nba_den_lal_20260421",
    sport: "basketball_nba",
    home: "Denver Nuggets",
    away: "Los Angeles Lakers",
    time: gameTime(3, 0),
    spread: -8.5,
    total: 213.5,
    mlHome: -350,
    mlAway: 285,
    openingSpread: -7.5,
    restDaysHome: 3,
    restDaysAway: 2,
  },
  // ── MLB ────────────────────────────────────────────────────────────────
  {
    externalId: "demo_mlb_nyy_hou_20260421",
    sport: "baseball_mlb",
    home: "New York Yankees",
    away: "Houston Astros",
    time: gameTime(23, 5),
    spread: -1.5,        // run line
    total: 8.5,
    mlHome: -145,
    mlAway: 125,
    openingSpread: -1.5,
    restDaysHome: 1,
    restDaysAway: 1,
  },
  {
    externalId: "demo_mlb_lad_sdp_20260421",
    sport: "baseball_mlb",
    home: "Los Angeles Dodgers",
    away: "San Diego Padres",
    time: gameTime(2, 10),
    spread: -1.5,
    total: 7.5,
    mlHome: -165,
    mlAway: 140,
    openingSpread: -1.5,
    restDaysHome: 0,
    restDaysAway: 1,
    isHomeBackToBack: true,
  },
  {
    externalId: "demo_mlb_atl_phi_20260421",
    sport: "baseball_mlb",
    home: "Atlanta Braves",
    away: "Philadelphia Phillies",
    time: gameTime(22, 20),
    spread: -1.5,
    total: 9.0,
    mlHome: -130,
    mlAway: 110,
    openingSpread: -1.5,
    restDaysHome: 1,
    restDaysAway: 1,
  },
  // ── NHL Playoffs ──────────────────────────────────────────────────────
  {
    externalId: "demo_nhl_col_stl_20260421",
    sport: "icehockey_nhl",
    home: "Colorado Avalanche",
    away: "St. Louis Blues",
    time: gameTime(1, 30),
    spread: -1.5,        // puck line
    total: 5.5,
    mlHome: -175,
    mlAway: 148,
    openingSpread: -1.5,
    restDaysHome: 2,
    restDaysAway: 2,
  },
  {
    externalId: "demo_nhl_edm_van_20260421",
    sport: "icehockey_nhl",
    home: "Edmonton Oilers",
    away: "Vancouver Canucks",
    time: gameTime(3, 0),
    spread: -1.5,
    total: 6.0,
    mlHome: -135,
    mlAway: 115,
    openingSpread: -1.5,
    restDaysHome: 2,
    restDaysAway: 2,
  },
];

const SPORT_CONFIGS = {
  basketball_nba: { name: "NBA", displayName: "National Basketball Association" },
  baseball_mlb:   { name: "MLB", displayName: "Major League Baseball" },
  icehockey_nhl:  { name: "NHL", displayName: "National Hockey League" },
};

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║       Demo Data Seed — Sports Platform     ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const fetchedAt = new Date();

  // ── Step 1: Upsert sports ──────────────────────────────────────────────
  const sportRecords = {};
  for (const [key, cfg] of Object.entries(SPORT_CONFIGS)) {
    const record = await db.sport.upsert({
      where: { key },
      create: { key, name: cfg.name, displayName: cfg.displayName },
      update: {},
    });
    sportRecords[key] = record;
    console.log(`✓ Sport: ${cfg.name}`);
  }

  // ── Step 2: Create ingestion run ───────────────────────────────────────
  const run = await db.ingestionRun.create({
    data: { sport: "demo_all", status: "RUNNING" },
  });

  // ── Step 3: Upsert games ───────────────────────────────────────────────
  const gameRecords = {};
  for (const g of GAMES) {
    const sportRecord = sportRecords[g.sport];
    if (!sportRecord) continue;

    const record = await db.game.upsert({
      where: { externalId: g.externalId },
      create: {
        externalId: g.externalId,
        sportId: sportRecord.id,
        homeTeamName: g.home,
        awayTeamName: g.away,
        commenceTime: g.time,
        openingSpread: g.openingSpread,
        restDaysHome: g.restDaysHome ?? null,
        restDaysAway: g.restDaysAway ?? null,
        isBackToBackHome: g.isHomeBackToBack ?? false,
        isBackToBackAway: g.isAwayBackToBack ?? false,
        bookmakerCoverageMax: 6,
        dataQualityScore: 85,
      },
      update: {
        homeTeamName: g.home,
        awayTeamName: g.away,
        commenceTime: g.time,
        openingSpread: g.openingSpread,
        restDaysHome: g.restDaysHome ?? null,
        restDaysAway: g.restDaysAway ?? null,
        isBackToBackHome: g.isHomeBackToBack ?? false,
        isBackToBackAway: g.isAwayBackToBack ?? false,
        bookmakerCoverageMax: 6,
        dataQualityScore: 85,
      },
    });
    gameRecords[g.externalId] = record;
    console.log(`✓ Game: ${g.away} @ ${g.home}`);
  }

  // ── Step 4: Build OddsInput and run through scoring engine ────────────
  const oddsInputs = GAMES.map((g) => {
    const gameRecord = gameRecords[g.externalId];
    const bookmakerOdds = buildBookmakerOdds(g.spread, g.total, g.mlHome, g.mlAway);
    const lineMovementSpread = g.spread - g.openingSpread; // e.g. -1.0 = moved toward home

    const context = {
      openingSpread: g.openingSpread,
      currentSpread: g.spread,
      openingTotal: g.total,
      currentTotal: g.total,
      restDaysHome: g.restDaysHome ?? null,
      restDaysAway: g.restDaysAway ?? null,
      isBackToBackHome: g.isHomeBackToBack ?? false,
      isBackToBackAway: g.isAwayBackToBack ?? false,
      scheduleDensityHome: null,
      scheduleDensityAway: null,
      homeAtsForm: null,
      awayAtsForm: null,
      homeAtsFormAtHome: null,
      awayAtsFormAway: null,
      headToHeadForm: null,
      playoffContext: null,
      bookmakerCoverageMax: 6,
      dataFreshnessMinutes: 2,
      hasSpreadMarket: true,
      hasTotalMarket: true,
      hasH2HMarket: true,
      mlFairProbHome: null,
    };

    return {
      gameId: gameRecord.id,
      homeTeam: g.home,
      awayTeam: g.away,
      commenceTime: g.time,
      sport: SPORT_CONFIGS[g.sport].name,
      bookmakerOdds,
      context,
    };
  });

  console.log(`\n⚡ Running ${oddsInputs.length} games through scoring engine...`);
  const scoredPicks = scoreGames(oddsInputs, fetchedAt);
  console.log(`✓ Scored ${scoredPicks.length} picks\n`);

  // ── Step 5: Write picks to DB ──────────────────────────────────────────
  let picksWritten = 0;
  for (const pick of scoredPicks) {
    const isFeatured =
      pick.pickGrade === "ELITE_PLAY" ||
      (pick.pickGrade === "STRONG_PLAY" && pick.confidence >= 80);

    const pickUpdateData = {
      selection: pick.selection,
      line: pick.line,
      confidence: pick.confidence,
      edgeScore: pick.edgeScore,
      consensusPct: pick.consensusPct,
      bookmakerCount: pick.bookmakerCount,
      tier: pick.tier,
      pickGrade: pick.pickGrade,
      riskLevel: pick.riskLevel,
      reasoning: pick.reasoning,
      reasoningShort: pick.reasoningShort,
      factorBreakdown: JSON.parse(JSON.stringify(pick.factorBreakdown)),
      modelVersion: pick.modelVersion,
      dataFreshnessAt: pick.dataFreshnessAt,
      isPublished: true,
    };

    const upserted = await db.pick.upsert({
      where: { gameId_pickType: { gameId: pick.gameId, pickType: pick.pickType } },
      create: {
        gameId: pick.gameId,
        pickType: pick.pickType,
        ingestionRunId: run.id,
        isBootstrap: false,
        isFeatured,
        ...pickUpdateData,
      },
      update: {
        ...pickUpdateData,
        isFeatured,
      },
    });

    // Capture PickSignalSnapshot
    try {
      const oddsInput = oddsInputs.find((o) => o.gameId === pick.gameId);
      const snapshotData = buildPickSignalSnapshot(
        upserted.id,
        pick,
        oddsInput?.context,
        false,
        false,
      );
      await db.pickSignalSnapshot.upsert({
        where: { pickId: upserted.id },
        create: snapshotData,
        update: {},
      });
    } catch (e) {
      console.warn(`  ⚠ Snapshot failed for pick ${upserted.id}: ${e.message}`);
    }

    const game = GAMES.find((g) => gameRecords[g.externalId]?.id === pick.gameId);
    const gameLabel = game ? `${game.away} @ ${game.home}` : pick.gameId;
    console.log(`  ✓ Pick: ${gameLabel} — ${pick.pickType} ${pick.selection} (${pick.confidence}/100, ${pick.pickGrade})`);
    picksWritten++;
  }

  // ── Step 6: Close ingestion run ────────────────────────────────────────
  await db.ingestionRun.update({
    where: { id: run.id },
    data: { status: "SUCCESS", completedAt: new Date() },
  });

  console.log(`\n✅ Seed complete — ${picksWritten} picks written across ${GAMES.length} games`);
  console.log("   All picks: isBootstrap=false, isPublished=true");
  console.log("   Ready for /api/picks\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
