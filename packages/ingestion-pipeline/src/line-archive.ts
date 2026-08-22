/**
 * line-archive.ts — Forward line archive for the Glass Ledger (handoff §2 P0):
 * timestamped OPENING / INTERIM / CLOSING odds snapshots.
 *
 * Persists odds rows the existing refresh cycle already fetched from The Odds
 * API — see packages/data-ingestion/src/config.ts (free tier = 500
 * credits/month). This module makes ZERO upstream calls of its own; it only
 * writes what process-sport.ts already has in hand after a refresh.
 *
 * INERT BY DEFAULT. `captureLineSnapshotsIfEnabled` is the only entry point
 * production ingestion code should call. It no-ops (zero DB interaction)
 * unless LINE_ARCHIVE_ENABLED=true — the founder flips that on when ready
 * (handoff Process rules). Every exported function here is failure-isolated:
 * a DB error is caught and returned as `{ error }`, never thrown, so the
 * archive can never block or fail the mint/refresh path it's wired into.
 *
 * `db` is accepted as `unknown` at every public boundary and cast internally
 * to `LineArchiveDb`, a small hand-written surface — not the generated
 * PrismaClient type — because the `OddsLineSnapshot` model
 * (packages/db/prisma/schema.prisma, migration
 * 20260716120000_add_odds_line_snapshots) is founder-applied; its Prisma
 * Client delegate doesn't exist until `prisma generate` runs after that
 * migration lands, so today's generated client type structurally lacks
 * `oddsLineSnapshot`. The `unknown` boundary lets this module (and its
 * caller, process-sport.ts) compile against that pre-codegen client without
 * a `Prisma.*` import; the cast is honest because the underlying delegate
 * genuinely doesn't exist until the founder runs `prisma generate` post-
 * migration — at which point the real client satisfies `LineArchiveDb`
 * exactly. Any object with this shape works: the real db client once codegen
 * catches up, or a test double today.
 */

import type { NormalizedOdds } from "@sports/types";

export type LineArchivePhase = "OPEN" | "INTERIM" | "CLOSE";
/** Featured markets. Player props use a string `player_*|<slug>` (see prop-line-rows). */
export type LineArchiveMarket = "SPREAD" | "MONEYLINE" | "TOTAL";

/** One book's price (+ optional line) for one side of one market — exactly
 *  what the refresh cycle already fetched, no derived/invented values.
 *  `market` is a string so player props can persist without a schema change:
 *  `player_receptions|justin_jefferson`. Featured rows still use LineArchiveMarket. */
export interface LineSnapshotRow {
  readonly book: string;
  readonly market: string;
  readonly side: string;
  /** Price at capture, in the source's native odds format (this platform
   *  requests American odds — see data-ingestion ODDS_FORMAT). */
  readonly price: number;
  readonly line?: number | null;
}

interface StoredSnapshot {
  id: string;
  market: string;
  book: string;
  side: string;
  phase: string;
  capturedAt: Date;
}

/** Minimal Prisma-delegate-shaped surface this module depends on. */
export interface LineArchiveDb {
  oddsLineSnapshot: {
    /** Batch existence check — replaces N per-market `count()` calls.
     *  Returns one row per distinct market that already has snapshots for
     *  `gameId`, so callers can classify OPEN vs INTERIM without a round-trip
     *  per market (the N+1 that would melt Neon on a 16-game Sunday slate). */
    findMany(args: {
      where: {
        gameId: string;
        market?: readonly string[];
        capturedAt?: { lte: Date };
      };
      select?: { market?: boolean };
    }): Promise<StoredSnapshot[]>;
    createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>;
    update(args: { where: { id: string }; data: { phase: LineArchivePhase } }): Promise<unknown>;
  };
}

export interface CaptureLineSnapshotsArgs {
  /** Prisma-like db handle — see the module doc comment for why this is
   *  `unknown` rather than `LineArchiveDb` at the public boundary. */
  db: unknown;
  gameId: string;
  capturedAt: Date;
  rows: readonly LineSnapshotRow[];
  /** Defaults to "the-odds-api" — the only upstream this pipeline reads. */
  source?: string;
}

export interface CaptureLineSnapshotsResult {
  persisted: number;
  error?: string;
}

const DEFAULT_SOURCE = "the-odds-api";

/**
 * Persists `rows` as line snapshots for `gameId`. Phase is classified PER
 * MARKET: "OPEN" if this is the first snapshot ever persisted for
 * (gameId, market) — checked with a count query — else "INTERIM". "CLOSE" is
 * never stamped here; see `markClosingSnapshots`.
 *
 * Never throws: any DB error is caught and returned as `{ error }` so a
 * failure here can never block or fail the caller's mint/refresh path.
 */
export async function captureLineSnapshots(
  args: CaptureLineSnapshotsArgs,
): Promise<CaptureLineSnapshotsResult> {
  const { gameId, capturedAt, rows } = args;
  const db = args.db as LineArchiveDb;
  const source = args.source ?? DEFAULT_SOURCE;

  if (rows.length === 0) {
    return { persisted: 0 };
  }

  try {
    // Phase is per (gameId, market) — a single capture call can span multiple
    // markets (spread + moneyline + total rows together), so classify once
    // per distinct market rather than once per row. BATCH the existence check
    // into a single findMany over the distinct markets — NOT one count() per
    // market. On a 16-game Sunday slate with player props (one market per
    // player-slug), the N+1 count() pattern would melt Neon.
    const markets = Array.from(new Set(rows.map((row) => row.market)));
    const phaseByMarket = new Map<string, LineArchivePhase>();
    // Batch: one findMany returning any existing snapshots for these markets
    // — replaces N count() calls (the N+1 that melts Neon on a dense slate).
    const existing = await db.oddsLineSnapshot.findMany({
      where: { gameId, market: markets },
      select: { market: true },
    });
    const seenMarkets = new Set(existing.map((r) => r.market));
    for (const market of markets) {
      phaseByMarket.set(market, seenMarkets.has(market) ? "INTERIM" : "OPEN");
    }

    const data = rows.map((row) => ({
      gameId,
      capturedAt,
      phase: phaseByMarket.get(row.market) ?? "INTERIM",
      book: row.book,
      market: row.market,
      side: row.side,
      price: row.price,
      line: row.line ?? null,
      source,
    }));

    const created = await db.oddsLineSnapshot.createMany({ data });
    return { persisted: created.count ?? data.length };
  } catch (err) {
    return { persisted: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface CaptureLineSnapshotsIfEnabledResult extends CaptureLineSnapshotsResult {
  enabled: boolean;
}

/** True iff LINE_ARCHIVE_ENABLED === "true". Default OFF — founder flips it. */
export function isLineArchiveEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["LINE_ARCHIVE_ENABLED"] === "true";
}

/**
 * HARD GATE — the only entry point production ingestion code should call.
 * No-ops (zero DB interaction, `db` is never touched) unless
 * LINE_ARCHIVE_ENABLED=true. Delegates to `captureLineSnapshots`, which is
 * itself failure-isolated, so this also never throws.
 */
export async function captureLineSnapshotsIfEnabled(
  args: CaptureLineSnapshotsArgs,
): Promise<CaptureLineSnapshotsIfEnabledResult> {
  if (!isLineArchiveEnabled()) {
    return { enabled: false, persisted: 0 };
  }
  const result = await captureLineSnapshots(args);
  return { enabled: true, ...result };
}

export interface MarkClosingSnapshotsIfEnabledResult extends MarkClosingSnapshotsResult {
  enabled: boolean;
}

/**
 * HARD GATE for the settle-time CLOSE tag. No-ops (zero DB interaction)
 * unless LINE_ARCHIVE_ENABLED=true. Never throws — archive failures must
 * not fail settlement.
 */
export async function markClosingSnapshotsIfEnabled(
  dbArg: unknown,
  gameId: string,
  asOf: Date,
): Promise<MarkClosingSnapshotsIfEnabledResult> {
  if (!isLineArchiveEnabled()) {
    return { enabled: false, updated: 0 };
  }
  try {
    const result = await markClosingSnapshots(dbArg, gameId, asOf);
    return { enabled: true, ...result };
  } catch (err) {
    return {
      enabled: true,
      updated: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface MarkClosingSnapshotsResult {
  updated: number;
  error?: string;
}

/**
 * Settle-time pass: re-tags the LAST pre-kickoff snapshot per
 * (market, book, side) as "CLOSE". Idempotent — rows already tagged CLOSE
 * are skipped.
 *
 * NOTE: this is exported but NOT wired into any caller yet. Wiring it into
 * settle-sport.ts (so it fires when a game settles) is a follow-up; this
 * function exists so that work can land later without touching this module
 * again. Never throws — any DB error is caught and returned as `{ error }`.
 */
export async function markClosingSnapshots(
  dbArg: unknown,
  gameId: string,
  asOf: Date,
): Promise<MarkClosingSnapshotsResult> {
  const db = dbArg as LineArchiveDb;
  try {
    const rows = await db.oddsLineSnapshot.findMany({
      where: { gameId, capturedAt: { lte: asOf } },
    });

    // Latest pre-kickoff row per (market, book, side): sort ascending by
    // capturedAt so the last write into the map for a given key is the
    // newest row.
    const sorted = [...rows].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
    const latestByKey = new Map<string, StoredSnapshot>();
    for (const row of sorted) {
      latestByKey.set(`${row.market}::${row.book}::${row.side}`, row);
    }

    let updated = 0;
    for (const row of latestByKey.values()) {
      if (row.phase === "CLOSE") continue; // idempotent — already tagged
      await db.oddsLineSnapshot.update({ where: { id: row.id }, data: { phase: "CLOSE" } });
      updated++;
    }

    return { updated };
  } catch (err) {
    return { updated: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Adapts the odds rows process-sport.ts already has in hand after a refresh
 * (NormalizedOdds — one row per bookmaker+market, both sides together) into
 * the flat per-side rows this archive persists. Pure and side-effect-free;
 * invents no values — `spread`/`total` are the single book-level point The
 * Odds API returned, shared by both sides as published.
 */
export function toLineSnapshotRows(gameOdds: readonly NormalizedOdds[]): LineSnapshotRow[] {
  const rows: LineSnapshotRow[] = [];
  for (const odds of gameOdds) {
    if (odds.market === "H2H") {
      if (odds.homePrice !== undefined) {
        rows.push({ book: odds.bookmaker, market: "MONEYLINE", side: "home", price: odds.homePrice, line: null });
      }
      if (odds.awayPrice !== undefined) {
        rows.push({ book: odds.bookmaker, market: "MONEYLINE", side: "away", price: odds.awayPrice, line: null });
      }
      if (odds.drawPrice !== undefined) {
        rows.push({ book: odds.bookmaker, market: "MONEYLINE", side: "draw", price: odds.drawPrice, line: null });
      }
    } else if (odds.market === "SPREADS") {
      if (odds.homeSpreadPrice !== undefined) {
        rows.push({
          book: odds.bookmaker,
          market: "SPREAD",
          side: "home",
          price: odds.homeSpreadPrice,
          line: odds.spread ?? null,
        });
      }
      if (odds.awaySpreadPrice !== undefined) {
        rows.push({
          book: odds.bookmaker,
          market: "SPREAD",
          side: "away",
          price: odds.awaySpreadPrice,
          // NormalizedOdds.spread is the HOME outcome's point. The away side's
          // handicap is its negation (home -3.5 ⇒ away +3.5); storing the home
          // point on the away row would grade away selections against the
          // opposite handicap. `+ 0` normalizes -0 to 0.
          line: odds.spread !== undefined && odds.spread !== null ? -odds.spread + 0 : null,
        });
      }
    } else if (odds.market === "TOTALS") {
      if (odds.overPrice !== undefined) {
        rows.push({
          book: odds.bookmaker,
          market: "TOTAL",
          side: "over",
          price: odds.overPrice,
          line: odds.total ?? null,
        });
      }
      if (odds.underPrice !== undefined) {
        rows.push({
          book: odds.bookmaker,
          market: "TOTAL",
          side: "under",
          price: odds.underPrice,
          line: odds.total ?? null,
        });
      }
    }
  }
  return rows;
}
