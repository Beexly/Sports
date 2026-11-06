/**
 * forward-team-only-append — LLM-free append of frozen q_t for the forward MLB
 * totals window (Path B / T04).
 *
 * Reads ONLY the existing team-only model (qOverFromPast in
 * packages/prediction-engine/src/research/mve-team-only-js.ts) and SELECT-only
 * data from Neon via the hermes_ro role. No other model is consulted. No HTTP
 * to any LLM provider. No residual-info. No e-process capital path.
 *
 * `grade=false` is hardcoded tonight: FIRE stays NO. This script only APPENDS
 * q_t rows for eligible forward games. The e-process (mve-eprocess.ts) and
 * capital bookkeeping are NOT invoked here — they are gated behind FOUNDER_YES.
 *
 * Dry-run is the default. `--dry-run` exits 0 on an empty forward set.
 *
 * Usage:
 *   npx tsx scripts/ops/forward-team-only-append.ts             # dry-run (default)
 *   npx tsx scripts/ops/forward-team-only-append.ts --dry-run   # explicit dry-run
 *   npx tsx scripts/ops/forward-team-only-append.ts --run       # SELECT-only append (no writes to Neon)
 *
 * Output: handoff/path-b-forward/forward-log.jsonl
 *   { gameId, line, qOver, mOver, commenceTime }  (no `y` until grade path exists)
 */

import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client as PgClient } from "pg";
import { shinDevig } from "../../packages/prediction-engine/src/shin-devig.js";
import { qOverFromPast } from "../../packages/prediction-engine/src/research/mve-team-only-js.js";

// ── Constants (mirrors TASK-02/PREREG, frozen) ──────────────────────────
const FORWARD_SINCE = new Date("2026-08-20T21:36:35.000Z"); // commit ddb94bd2 SHA time
const WINDOW_LO_MS = 6 * 60 * 60 * 1000;                   // 6h pre-game
const WINDOW_HI_MS = 3 * 60 * 60 * 1000;                   // 3h pre-game
const QUOTE_AGE_MS = 15 * 60 * 1000;                       // 15 min quote freshness
const ESPN_PUBLIC = "espn_public";
const MIN_BOOKS = 3;
const GRADE = false; // FIRE=no — NEVER flip without founder FOUNDER_YES

// ── Types ─────────────────────────────────────────────────────────────────
type OddsRow = {
  gameId: string;
  bookmaker: string;
  fetchedAt: Date;
  total: number | null;
  overPrice: number | null;
  underPrice: number | null;
};

type GameRow = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  commenceTime: Date;
  homeScore: number | null;
  awayScore: number | null;
};

type PastGame = {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
};

// ── Helpers (mirrored from run-mve.ts, frozen entry protocol) ────────────
function americanToDecimal(american: number): number | null {
  if (!Number.isFinite(american) || Math.abs(american) < 100) return null;
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Entry protocol: 6–3h pre-game window, quote age <= 15min, >= 3 books,
 * Shin de-vig. Returns the entry line + market over-probability (mOver).
 * Replicates entryForGame from run-mve.ts — frozen, unmodified.
 */
function entryForGame(game: GameRow, odds: readonly OddsRow[]): { mOver: number; line: number } | null {
  const lo = new Date(game.commenceTime.getTime() - WINDOW_LO_MS);
  const hi = new Date(game.commenceTime.getTime() - WINDOW_HI_MS);
  const inWindow = odds.filter(
    (o) =>
      o.gameId === game.id &&
      o.bookmaker !== ESPN_PUBLIC &&
      o.fetchedAt >= lo &&
      o.fetchedAt <= hi &&
      o.total != null &&
      o.overPrice != null &&
      o.underPrice != null,
  );
  if (inWindow.length === 0) return null;
  let latest = inWindow[0]!.fetchedAt.getTime();
  for (const o of inWindow) {
    const t = o.fetchedAt.getTime();
    if (t > latest) latest = t;
  }
  const fresh = inWindow.filter((o) => latest - o.fetchedAt.getTime() <= QUOTE_AGE_MS);
  const byBook = new Map<string, OddsRow>();
  for (const o of fresh) {
    const prev = byBook.get(o.bookmaker);
    if (!prev || o.fetchedAt > prev.fetchedAt) byBook.set(o.bookmaker, o);
  }
  if (byBook.size < MIN_BOOKS) return null;
  const pOvers: number[] = [];
  const lines: number[] = [];
  for (const row of Array.from(byBook.values())) {
    const dOver = americanToDecimal(row.overPrice!);
    const dUnder = americanToDecimal(row.underPrice!);
    if (dOver == null || dUnder == null) continue;
    const shin = shinDevig([1 / dOver, 1 / dUnder]);
    const pOver = shin.probabilities[0];
    if (pOver == null || !Number.isFinite(pOver)) continue;
    pOvers.push(pOver);
    lines.push(row.total!);
  }
  const mOver = median(pOvers);
  const line = median(lines);
  if (mOver == null || line == null || pOvers.length < MIN_BOOKS) return null;
  return { mOver, line };
}

// ── DB access (SELECT-only neonctl hermes_ro) ────────────────────────────
async function getConnStr(): Promise<string> {
  try {
    const { execSync } = await import("node:child_process");
    return execSync(
      "neon connection-string --project-id summer-brook-99380762 --role-name hermes_ro main 2>/dev/null",
      { encoding: "utf-8" },
    ).trim();
  } catch (err) {
    throw new Error(
      `forward-append: cannot obtain Neon connection string: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ── Forward game query ──────────────────────────────────────────────────
// Forward games: MLB, commenceTime strictly after the prereg commit SHA time.
// We do NOT require homeScore/awayScore — forward games may not be FINAL yet.
const FORWARD_GAMES_SQL = `
  SELECT DISTINCT
    g.id,
    g."homeTeamName" AS "homeTeamName",
    g."awayTeamName" AS "awayTeamName",
    g."commenceTime" AS "commenceTime",
    g."homeScore" AS "homeScore",
    g."awayScore" AS "awayScore"
  FROM "games" g
  JOIN "sports" s ON s.id = g."sportId"
  WHERE s.key = $1
    AND g."commenceTime" > $2::timestamptz
  ORDER BY g."commenceTime" ASC
`;

// Past finalized games for a set of team names (both as home AND away).
// y = homeScore + awayScore for each FINALized game before the forward game's
// commenceTime. Only games with both scores populated are usable.
const PAST_GAMES_SQL = `
  SELECT g."homeTeamName" AS "homeTeamName",
         g."awayTeamName" AS "awayTeamName",
         g."homeScore" AS "homeScore",
         g."awayScore" AS "awayScore"
  FROM "games" g
  JOIN "sports" s ON s.id = g."sportId"
  WHERE s.key = $1
    AND g."status"::text = 'FINAL'
    AND g."homeScore" IS NOT NULL
    AND g."awayScore" IS NOT NULL
    AND g."commenceTime" < $2::timestamptz
    AND (g."homeTeamName" = ANY($3::text[]) OR g."awayTeamName" = ANY($3::text[]))
  ORDER BY g."commenceTime" ASC
`;

// Entry odds: TOTALS market for the forward game.
const ODDS_FOR_GAME_SQL = `
  SELECT "gameId", "bookmaker", "fetchedAt", "total", "overPrice", "underPrice"
  FROM "odds"
  WHERE "gameId" = $1
    AND "market" = 'TOTALS'::"OddsMarket"
    AND "total" IS NOT NULL
    AND "overPrice" IS NOT NULL
    AND "underPrice" IS NOT NULL
  ORDER BY "fetchedAt" ASC
`;

// ── Core: compute q_t for one forward game ───────────────────────────────
function computeQOver(
  game: GameRow,
  pastGames: PastGame[],
  odds: OddsRow[],
): { gameId: string; line: number; qOver: number; mOver: number; commenceTime: string } | null {
  const entry = entryForGame(game, odds);
  if (!entry) return null;

  // qOverFromPast takes {homeId, awayId, line, past} where past is game-level
  // {homeId, awayId, y}. Team names serve as stable team IDs (the join key).
  // qOverFromPast never reads a future y — past games are strictly before the
  // forward game's commenceTime (enforced by PAST_GAMES_SQL).
  const past: { homeId: string; awayId: string; y: number }[] = pastGames.map((pg) => ({
    homeId: pg.homeTeamName,
    awayId: pg.awayTeamName,
    y: pg.homeScore + pg.awayScore,
  }));

  const qOver = qOverFromPast({
    homeId: game.homeTeamName,
    awayId: game.awayTeamName,
    line: entry.line,
    past,
  });

  return {
    gameId: game.id,
    line: entry.line,
    qOver,
    mOver: entry.mOver,
    commenceTime: game.commenceTime.toISOString(),
  };
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--run"); // dry-run is the default

  const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../handoff/path-b-forward");
  mkdirSync(outDir, { recursive: true });
  const logPath = resolve(outDir, "forward-log.jsonl");

  if (dryRun) {
    console.log("forward-append: dry-run mode (no DB queries, no writes)");
    // Confirm the qOverFromPast function loads — a no-DB smoke check.
    const smoke = qOverFromPast({
      homeId: "H",
      awayId: "A",
      line: 8.5,
      past: [],
    });
    if (!Number.isFinite(smoke) || smoke <= 0 || smoke >= 1) {
      console.error(`forward-append: FATAL — qOverFromPast sanity check failed (${smoke})`);
      return 1;
    }
    console.log(`forward-append: dry-run OK. qOverFromPast loads. GRADE=${GRADE}. FIRE=no.`);
    // If the log file doesn't exist yet, the forward set is empty.
    if (!existsSync(logPath)) {
      console.log("forward-append: no forward-log.jsonl yet — empty forward set, exit 0.");
      return 0;
    }
    const existing = readFileSync(logPath, "utf8").trim();
    if (!existing) {
      console.log("forward-append: forward-log.jsonl empty — empty forward set, exit 0.");
      return 0;
    }
    const lines = existing.split("\n");
    console.log(`forward-append: dry-run — ${lines.length} existing forward q_t row(s) in log.`);
    return 0;
  }

  // ── Non-dry-run: SELECT-only Neon access ─────────────────────────────
  // FIRE is still NO. We append q_t rows but DO NOT run the e-process or
  // touch capital. grade=false hardcoded.
  if (GRADE !== false) {
    console.error("forward-append: FATAL — GRADE must be false (FIRE=no). Refusing to run.");
    return 1;
  }

  const connStr = await getConnStr();
  const pgClient = new PgClient({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pgClient.connect();
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const redacted = raw.replace(/\S+:\/\/\S+/g, "[redacted-url]");
    console.error(`forward-append: Postgres unreachable: ${redacted}`);
    return 2;
  }

  try {
    console.log(
      `forward-append: SELECT-only hermes_ro. Forward window: commenceTime > ${FORWARD_SINCE.toISOString()}`,
    );
    console.log(`forward-append: GRADE=${GRADE} (FIRE=no) — q_t append only, no capital path.`);

    // 1. Load forward games.
    const gamesRaw: GameRow[] = (
      await pgClient.query(FORWARD_GAMES_SQL, ["baseball_mlb", FORWARD_SINCE])
    ).rows as GameRow[];
    const games: GameRow[] = gamesRaw.map((g) => ({
      ...g,
      commenceTime: new Date(g.commenceTime),
      homeScore: g.homeScore,
      awayScore: g.awayScore,
    }));

    console.log(`forward-append: ${games.length} candidate forward MLB game(s) after SHA time.`);

    let appended = 0;
    for (const game of games) {
      // Gather all odds rows for this game (entryForGame filters by window).
      const oddsRaw = (await pgClient.query(ODDS_FOR_GAME_SQL, [game.id])).rows as OddsRow[];
      const odds: OddsRow[] = oddsRaw.map((o) => ({
        ...o,
        fetchedAt: o.fetchedAt instanceof Date ? o.fetchedAt : new Date(o.fetchedAt),
      }));

      // Past games involving either team, FINALized, before this game's commenceTime.
      const teamNames = [game.homeTeamName, game.awayTeamName];
      const pastRaw = (
        await pgClient.query(PAST_GAMES_SQL, ["baseball_mlb", game.commenceTime.toISOString(), teamNames])
      ).rows as PastGame[];
      const pastGames: PastGame[] = pastRaw.map((p) => ({
        homeTeamName: String(p.homeTeamName),
        awayTeamName: String(p.awayTeamName),
        homeScore: p.homeScore,
        awayScore: p.awayScore,
      }));

      const row = computeQOver(game, pastGames, odds);
      if (!row) {
        console.log(
          `forward-append: skip ${game.id} ${game.homeTeamName}@${game.awayTeamName} @ ${game.commenceTime.toISOString()} — no entry.`,
        );
        continue;
      }

      // APPEND (file write only — NOT a DB write, NOT an e-process update).
      const jsonl = JSON.stringify({
        gameId: row.gameId,
        line: row.line,
        qOver: row.qOver,
        mOver: row.mOver,
        commenceTime: row.commenceTime,
      });
      appendFileSync(logPath, jsonl + "\n", "utf8");
      appended++;
      console.log(
        `forward-append: appended ${row.gameId} line=${row.line} qOver=${row.qOver.toFixed(6)} mOver=${row.mOver.toFixed(6)}`,
      );
    }

    console.log(`forward-append: appended ${appended} of ${games.length} forward q_t row(s) to ${logPath}`);
    return 0;
  } finally {
    await pgClient.end();
  }
}

main().catch((err) => {
  console.error(`forward-append: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
