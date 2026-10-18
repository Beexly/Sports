/**
 * Real-DB proof for the public picks injuryEvidence wiring.
 *
 * Loads published NFL picks on the current slate, runs the SAME bundle loader
 * the public route uses, builds the evidence object with the SAME function, and
 * then re-reads every named player straight from `injuries` with a parameterised
 * SQL query so the printed names are independently cross-checked.
 *
 * Run:
 *   export DATABASE_URL="$(neonctl connection-string ... --role-name hermes_ro ...)"
 *   export FORCE_REAL_PRISMA=true
 *   export TSX_TSCONFIG_PATH=apps/web/tsconfig.json
 *   node node_modules/tsx/dist/cli.mjs scripts/ops/verify-nfl-injury-evidence.ts
 *
 * Read-only: SELECTs only. Never prints the connection string.
 */
import { Client } from "pg";
import { db } from "@sports/db";
import { loadBundleSurfaces } from "@/lib/intelligence-core/db-loaders";
import { buildNflInjuryEvidence } from "@/lib/picks/nfl-injury-evidence";

const PICK_LIMIT = Number(process.env.PICK_LIMIT ?? 3);

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const now = new Date();
  const picks = await db.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false,
      game: {
        sport: { key: "americanfootball_nfl" },
        commenceTime: {
          gte: new Date(now.getTime() - 6 * 3600 * 1000),
          lte: new Date(now.getTime() + 72 * 3600 * 1000),
        },
      },
    },
    include: { game: { include: { sport: { select: { name: true, key: true } } } } },
    orderBy: [{ generatedAt: "desc" }],
    take: 60,
  });

  // One pick per game, so each sample exercises a different pair of clubs.
  const seenGames = new Set<string>();
  const samples = picks.filter((p) => {
    if (seenGames.has(p.gameId)) return false;
    seenGames.add(p.gameId);
    return true;
  }).slice(0, PICK_LIMIT);

  if (samples.length === 0) {
    console.error("No published NFL picks in the current slate window; nothing to prove.");
    process.exit(2);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  const results: Array<Record<string, unknown>> = [];
  for (const pick of samples) {
    const surfaces = await loadBundleSurfaces({
      gameId: pick.gameId,
      homeTeamName: pick.game.homeTeamName,
      awayTeamName: pick.game.awayTeamName,
      commenceTime: new Date(pick.game.commenceTime),
      asOf: now,
    });

    const evidence = buildNflInjuryEvidence({
      sportKey: pick.game.sport.key,
      homeTeamName: pick.game.homeTeamName,
      awayTeamName: pick.game.awayTeamName,
      season: surfaces.resolution.season,
      week: surfaces.resolution.asOfWeek,
      homeInjuries: surfaces.homeInjuries,
      awayInjuries: surfaces.awayInjuries,
      now,
    });

    // Independent SQL cross-check of every named player printed below.
    const named = (evidence?.teams ?? []).flatMap((t) =>
      t.players.map((p) => ({ team: t.team, ...p })),
    );
    const verified: Array<Record<string, unknown>> = [];
    for (const p of named) {
      const r = await client.query(
        `select "playerName", team, position, "reportStatus", "practiceStatus",
                "primaryInjury", season, week, "sourceId", "fetchedAt"
           from injuries
          where season = $1 and week = $2 and team = $3 and "playerName" = $4
          limit 1`,
        [surfaces.resolution.season, surfaces.resolution.asOfWeek, p.team, p.playerName],
      );
      verified.push({
        team: p.team,
        playerName: p.playerName,
        sqlRow: r.rows[0] ?? null,
      });
    }

    results.push({
      pick: {
        id: pick.id,
        pickType: pick.pickType,
        selection: pick.selection,
        game: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
        commenceTime: pick.game.commenceTime,
      },
      resolution: {
        season: surfaces.resolution.season,
        asOfWeek: surfaces.resolution.asOfWeek,
        homeAbbr: surfaces.resolution.homeAbbr,
        awayAbbr: surfaces.resolution.awayAbbr,
        rowCounts: { home: surfaces.homeInjuries.length, away: surfaces.awayInjuries.length },
        notes: surfaces.resolution.notes,
      },
      injuryEvidence: evidence,
      sqlVerifiedPlayers: verified,
    });
  }

  await client.end();
  await db.$disconnect();
  console.log(JSON.stringify(results, null, 2));
}

main().catch(async (e) => {
  console.error("FAILED:", e instanceof Error ? e.message : String(e));
  await db.$disconnect().catch(() => undefined);
  process.exit(1);
});
