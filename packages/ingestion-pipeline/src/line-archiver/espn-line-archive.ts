/**
 * espn-line-archive.ts — the ESPN/DraftKings leg of the forward line archive:
 * a standalone hourly archiver that CREATES OddsLineSnapshot rows for upcoming
 * NFL games. See README.md in this folder for the operator runbook.
 *
 * WHY THIS EXISTS: the original archive (../line-archive.ts) only persists
 * what the paid Odds API refresh cycle already fetched, and only while
 * LINE_ARCHIVE_ENABLED=true. The flag was never flipped in production and the
 * paid refresh is once-daily, so the L-14 label census (2026-08-20) found
 * `odds_line_snapshots` EMPTY — zero rows ever — and every line-movement /
 * CLV signal downstream of it starved. This module is the missing producer:
 *
 *   - Source: the keyless ESPN public scoreboard's inline DraftKings block,
 *     via `fetchEspnOddsForSport` (packages/data-ingestion) — no API key, no
 *     credits. (Pinnacle's guest API is US-IP blocked and is NOT used here;
 *     the Pinnacle leg in ../pinnacle-line-archive.ts rides The Odds API.)
 *   - Cadence: one run per hour. Window: every NFL game kicking off in the
 *     next 7 days (T-7d through kickoff). A game already kicked off is never
 *     captured here — its last pre-kickoff row is re-tagged CLOSE at settle
 *     time by ../line-archive.ts `markClosingSnapshots`.
 *   - Writes: APPEND-ONLY. Rows are never updated or deleted by this module.
 *     Each row is exactly the object line-archive.ts hands to
 *     `oddsLineSnapshot.createMany` — { gameId, capturedAt, phase, book,
 *     market, side, price, line, source } — matching
 *     packages/db/prisma/schema.prisma `OddsLineSnapshot` field-for-field.
 *   - Phase: stamped at write time, per (gameId, market): "OPEN" for the
 *     first snapshot ever persisted for that game+market, "INTERIM" after —
 *     the same classification captureLineSnapshots applies. "CLOSE" is never
 *     stamped here.
 *   - Provenance: `book` is whatever the normalized row carries — the ESPN
 *     client keys its book `espn_public` (codebase law: the key labels
 *     DraftKings lines as an ESPN-routed public feed, see
 *     packages/data-ingestion/src/espn-odds-client.ts). `source` is
 *     ESPN_LINE_ARCHIVE_SOURCE ("espn-public-dk"), distinguishing this leg
 *     from the US refresh ("the-odds-api") and the EU Pinnacle leg
 *     ("the-odds-api-eu") in the same table.
 *
 * GATING: the production (DB) entry point, `runEspnLineArchiverIfEnabled`,
 * hard-gates on LINE_ARCHIVE_ENABLED=true — flag off ⇒ zero fetches, zero DB
 * calls, same inert-by-default doctrine as the rest of the archive. The
 * un-gated `runEspnLineArchiver` is for the operator CLI's explicit
 * `--dry-run` mode, which writes only a local JSONL file through the JSONL
 * store below and never touches a database.
 *
 * FAILURE ISOLATION: a run never throws for upstream or store failures. Each
 * game's failure is caught, recorded in `errors`, and the run continues —
 * one bad game or one bad write must not starve the rest of the slate.
 *
 * GAME RESOLUTION is injected (`resolveGameId`): OddsLineSnapshot.gameId is
 * a FK to Game.id, while ESPN events carry their own ids, so the production
 * wiring (run-line-archiver.ts) resolves events to canonical Game rows via
 * ../game-identity.ts. An event that resolves to null is NOT archived and
 * NOT silently dropped — it is counted and listed in `unresolvedEventIds`.
 * This module never creates Game rows; seeding is seed-games-from-espn.ts.
 */

import type { NormalizedOdds, OddsApiEvent } from "@sports/types";
import {
  isLineArchiveEnabled,
  toLineSnapshotRows,
} from "../line-archive.js";

/** The only sport this archiver covers (Odds-API style sport key). */
export const LINE_ARCHIVER_SPORT_KEY = "americanfootball_nfl";

/** `source` stamped on every row this leg persists. */
export const ESPN_LINE_ARCHIVE_SOURCE = "espn-public-dk";

/** Capture window: kickoff within the next 7 days (T-7d through kickoff). */
export const LINE_ARCHIVER_WINDOW_DAYS = 7;

/** ESPN board fan-out cap — a full NFL week is 16 games; 40 is the client max. */
export const LINE_ARCHIVER_MAX_EVENTS = 40;

export type LineArchivePhase = "OPEN" | "INTERIM";

/**
 * One append-only snapshot row — field-for-field the object
 * `captureLineSnapshots` (../line-archive.ts) hands to
 * `oddsLineSnapshot.createMany`, and the shape the dry-run JSONL emits.
 * `id` and `createdAt` are absent by design: the DB assigns both.
 */
export interface LineArchiveInsertRow {
  readonly gameId: string;
  /** When WE captured the row (run clock), UTC. */
  readonly capturedAt: Date;
  readonly phase: LineArchivePhase;
  /** Book key as normalized — "espn_public" for this leg. */
  readonly book: string;
  /** "SPREAD" | "MONEYLINE" | "TOTAL" for featured rows. */
  readonly market: string;
  /** "home" | "away" | "over" | "under" (see toLineSnapshotRows). */
  readonly side: string;
  /** American odds (the platform requests American format end to end). */
  readonly price: number;
  /** Points line for SPREAD/TOTAL; null for MONEYLINE. */
  readonly line: number | null;
  readonly source: string;
}

/**
 * Storage seam. The DB store and the dry-run JSONL store implement the same
 * two operations the phase classification needs, so both paths classify
 * OPEN vs INTERIM identically.
 */
export interface LineArchiveStore {
  /** Markets that already have at least one snapshot for `gameId`. */
  existingMarkets(
    gameId: string,
    markets: readonly string[],
  ): Promise<ReadonlySet<string>>;
  /** Append rows; returns how many were persisted. */
  append(rows: readonly LineArchiveInsertRow[]): Promise<number>;
}

/** Minimal Prisma-delegate surface the DB store depends on (not the
 *  generated client type — same rationale as LineArchiveDb in
 *  ../line-archive.ts). */
export interface LineArchiveStoreDb {
  oddsLineSnapshot: {
    findMany(args: {
      where: { gameId: string; market: { in: readonly string[] } };
      select: { market: true };
    }): Promise<{ market: string }[]>;
    createMany(args: {
      data: LineArchiveInsertRow[];
    }): Promise<{ count: number }>;
  };
}

/** DB-backed store: the production path. One batched existence check per
 *  game (never a count() per market — the N+1 ../line-archive.ts warns
 *  about), one createMany per game. */
export function createDbLineArchiveStore(db: unknown): LineArchiveStore {
  const store = db as LineArchiveStoreDb;
  return {
    async existingMarkets(gameId, markets) {
      if (markets.length === 0) return new Set();
      const existing = await store.oddsLineSnapshot.findMany({
        // `{ in: markets }`, NOT a bare array — OddsLineSnapshot.market is a
        // scalar String column; a bare array is a Prisma validation error.
        // (The exact bug that silently zeroed the original archive in 2026.)
        where: { gameId, market: { in: markets } },
        select: { market: true },
      });
      return new Set(existing.map((r) => r.market));
    },
    async append(rows) {
      if (rows.length === 0) return 0;
      const created = await store.oddsLineSnapshot.createMany({
        data: [...rows],
      });
      return created.count ?? rows.length;
    },
  };
}

/** Filesystem seam for the JSONL store — injectable so tests never touch
 *  a real disk. */
export interface JsonlFileSystem {
  readFile(path: string): Promise<string>;
  appendFile(path: string, text: string): Promise<void>;
}

async function defaultJsonlFileSystem(): Promise<JsonlFileSystem> {
  const fs = await import("node:fs/promises");
  return {
    readFile: async (path) => {
      try {
        return await fs.readFile(path, "utf8");
      } catch (err) {
        // A missing ledger is an empty ledger — the first dry run creates it.
        if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return "";
        throw err;
      }
    },
    appendFile: async (path, text) => {
      await fs.appendFile(path, text, "utf8");
    },
  };
}

/** Serializes one row to its JSONL line: the createMany shape, with
 *  capturedAt as an ISO-8601 UTC string. Key order is stable (schema order)
 *  so dry-run files diff cleanly run over run. */
export function serializeLineArchiveRow(row: LineArchiveInsertRow): string {
  return JSON.stringify({
    gameId: row.gameId,
    capturedAt: row.capturedAt.toISOString(),
    phase: row.phase,
    book: row.book,
    market: row.market,
    side: row.side,
    price: row.price,
    line: row.line,
    source: row.source,
  });
}

/**
 * Dry-run store: appends rows as JSONL to a local file. The file doubles as
 * the existence ledger — `existingMarkets` scans it, so a second dry run
 * against the same file classifies phases exactly as the DB path would
 * (OPEN first, INTERIM after). In dry-run the caller resolves gameId to the
 * ESPN event id (`espn:americanfootball_nfl:<id>`), which is also the
 * externalId the ESPN seed writes to Game — so dry-run rows join to real
 * Game rows on that key with no translation.
 */
export function createJsonlLineArchiveStore(
  path: string,
  fileSystem?: JsonlFileSystem,
): LineArchiveStore {
  let fsPromise: Promise<JsonlFileSystem> | null = null;
  const fs = () => (fsPromise ??= fileSystem ? Promise.resolve(fileSystem) : defaultJsonlFileSystem());

  async function readRows(): Promise<{ gameId: string; market: string }[]> {
    const text = await (await fs()).readFile(path);
    const out: { gameId: string; market: string }[] = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as { gameId?: unknown; market?: unknown };
        if (typeof parsed.gameId === "string" && typeof parsed.market === "string") {
          out.push({ gameId: parsed.gameId, market: parsed.market });
        }
      } catch {
        // Torn final line (killed mid-append) — skip it; append-only means
        // every complete line before it is still valid.
      }
    }
    return out;
  }

  return {
    async existingMarkets(gameId, markets) {
      const wanted = new Set(markets);
      const found = new Set<string>();
      for (const row of await readRows()) {
        if (row.gameId === gameId && wanted.has(row.market)) found.add(row.market);
      }
      return found;
    },
    async append(rows) {
      if (rows.length === 0) return 0;
      const text = rows.map(serializeLineArchiveRow).join("\n") + "\n";
      await (await fs()).appendFile(path, text);
      return rows.length;
    },
  };
}

/** Per-(game, market) phase: OPEN iff no snapshot exists yet for that
 *  game+market — the classification captureLineSnapshots applies. */
export function classifyLineArchivePhase(
  existingMarkets: ReadonlySet<string>,
  market: string,
): LineArchivePhase {
  return existingMarkets.has(market) ? "INTERIM" : "OPEN";
}

export interface WindowSelection {
  readonly selected: readonly OddsApiEvent[];
  /** Kickoff already reached (or unparseable commence_time). */
  readonly skippedStartedOrInvalid: number;
  /** Kickoff beyond the capture window. */
  readonly skippedBeyondWindow: number;
}

/**
 * The capture window, pure: kickoff strictly after `now` (a kicked-off game
 * belongs to settle-time CLOSE tagging, never to this archiver) and at or
 * before now + windowDays. An unparseable commence_time is skipped as
 * started/invalid — a row with no trustworthy kickoff cannot be stamped
 * honestly.
 */
export function selectEventsInWindow(
  events: readonly OddsApiEvent[],
  now: Date,
  windowDays: number = LINE_ARCHIVER_WINDOW_DAYS,
): WindowSelection {
  const nowMs = now.getTime();
  const horizonMs = nowMs + windowDays * 24 * 60 * 60 * 1000;
  const selected: OddsApiEvent[] = [];
  let skippedStartedOrInvalid = 0;
  let skippedBeyondWindow = 0;
  for (const event of events) {
    const kickoffMs = Date.parse(event.commence_time);
    if (!Number.isFinite(kickoffMs) || kickoffMs <= nowMs) {
      skippedStartedOrInvalid++;
    } else if (kickoffMs > horizonMs) {
      skippedBeyondWindow++;
    } else {
      selected.push(event);
    }
  }
  return { selected, skippedStartedOrInvalid, skippedBeyondWindow };
}

export interface EspnLineArchiverDeps {
  /** Keyless ESPN fetch — production: fetchEspnOddsForSport bound to the
   *  archiver's sport/window options (see run-line-archiver.ts). */
  fetchEvents: (
    sportKey: string,
    options: { horizonDays: number; maxEvents: number },
  ) => Promise<{ events: readonly OddsApiEvent[]; error?: string }>;
  /** Odds-API shape → NormalizedOdds — production: DataNormalizer. */
  normalizeOdds: (
    events: readonly OddsApiEvent[],
    fetchedAt: Date,
  ) => readonly NormalizedOdds[];
  /** ESPN event → canonical Game.id, or null when the game is not tracked. */
  resolveGameId: (event: OddsApiEvent) => Promise<string | null>;
  store: LineArchiveStore;
  now?: () => Date;
  windowDays?: number;
  logPrefix?: string;
}

export interface EspnLineArchiverResult {
  /** ISO-8601 UTC — the single capture timestamp shared by every row. */
  readonly capturedAt: string;
  readonly fetchedEvents: number;
  readonly windowEvents: number;
  readonly skippedStartedOrInvalid: number;
  readonly skippedBeyondWindow: number;
  /** Games with at least one row appended. */
  readonly gamesArchived: number;
  /** Games in-window whose events carried no usable odds rows. */
  readonly gamesWithoutRows: number;
  readonly rowsPersisted: number;
  /** In-window events that resolved to no tracked Game — never archived,
   *  never silent. */
  readonly unresolvedEventIds: readonly string[];
  readonly errors: readonly string[];
}

/** The all-zeroes result (flag-off no-op, fetch failure) for a run stamped
 *  at `capturedAt`. Exported so wiring layers can report the gated no-op
 *  without constructing any deps. */
export function zeroEspnLineArchiverResult(capturedAt: Date): EspnLineArchiverResult {
  return {
    capturedAt: capturedAt.toISOString(),
    fetchedEvents: 0,
    windowEvents: 0,
    skippedStartedOrInvalid: 0,
    skippedBeyondWindow: 0,
    gamesArchived: 0,
    gamesWithoutRows: 0,
    rowsPersisted: 0,
    unresolvedEventIds: [],
    errors: [],
  };
}

/**
 * One archiver run. Un-gated — the caller owns the gate (production goes
 * through runEspnLineArchiverIfEnabled; the CLI's --dry-run is an explicit
 * operator action against a local file). Never throws for upstream/store
 * failures; see the module doc.
 */
export async function runEspnLineArchiver(
  deps: EspnLineArchiverDeps,
): Promise<EspnLineArchiverResult> {
  const now = deps.now ?? (() => new Date());
  const windowDays = deps.windowDays ?? LINE_ARCHIVER_WINDOW_DAYS;
  const logPrefix = deps.logPrefix ?? "[line-archiver]";
  const capturedAt = now();
  const errors: string[] = [];

  let fetched: { events: readonly OddsApiEvent[]; error?: string };
  try {
    fetched = await deps.fetchEvents(LINE_ARCHIVER_SPORT_KEY, {
      horizonDays: windowDays,
      maxEvents: LINE_ARCHIVER_MAX_EVENTS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ...zeroEspnLineArchiverResult(capturedAt), errors: [`fetch failed: ${message}`] };
  }
  if (fetched.error) errors.push(fetched.error);

  const events = fetched.events;
  const window = selectEventsInWindow(events, capturedAt, windowDays);

  // Normalize the whole window at once, then group by event — the same
  // batch shape process-sport.ts feeds captureLineSnapshots.
  let oddsByEvent = new Map<string, NormalizedOdds[]>();
  if (window.selected.length > 0) {
    try {
      const normalized = deps.normalizeOdds(window.selected, capturedAt);
      for (const odds of normalized) {
        const list = oddsByEvent.get(odds.gameExternalId) ?? [];
        list.push(odds);
        oddsByEvent.set(odds.gameExternalId, list);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ...zeroEspnLineArchiverResult(capturedAt),
        fetchedEvents: events.length,
        windowEvents: window.selected.length,
        skippedStartedOrInvalid: window.skippedStartedOrInvalid,
        skippedBeyondWindow: window.skippedBeyondWindow,
        errors: [...errors, `normalize failed: ${message}`],
      };
    }
  }

  let gamesArchived = 0;
  let gamesWithoutRows = 0;
  let rowsPersisted = 0;
  const unresolvedEventIds: string[] = [];

  for (const event of window.selected) {
    try {
      const gameId = await deps.resolveGameId(event);
      if (!gameId) {
        unresolvedEventIds.push(event.id);
        continue;
      }
      const rows = toLineSnapshotRows(oddsByEvent.get(event.id) ?? []);
      if (rows.length === 0) {
        gamesWithoutRows++;
        continue;
      }
      const markets = Array.from(new Set(rows.map((r) => r.market)));
      const existing = await deps.store.existingMarkets(gameId, markets);
      const insertRows: LineArchiveInsertRow[] = rows.map((row) => ({
        gameId,
        capturedAt,
        phase: classifyLineArchivePhase(existing, row.market),
        book: row.book,
        market: row.market,
        side: row.side,
        price: row.price,
        line: row.line ?? null,
        source: ESPN_LINE_ARCHIVE_SOURCE,
      }));
      const appended = await deps.store.append(insertRows);
      rowsPersisted += appended;
      if (appended > 0) gamesArchived++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`event ${event.id}: ${message}`);
    }
  }

  const result: EspnLineArchiverResult = {
    capturedAt: capturedAt.toISOString(),
    fetchedEvents: events.length,
    windowEvents: window.selected.length,
    skippedStartedOrInvalid: window.skippedStartedOrInvalid,
    skippedBeyondWindow: window.skippedBeyondWindow,
    gamesArchived,
    gamesWithoutRows,
    rowsPersisted,
    unresolvedEventIds,
    errors,
  };
  console.log(
    `${logPrefix} espn-dk run capturedAt=${result.capturedAt} fetched=${result.fetchedEvents} ` +
      `window=${result.windowEvents} games=${result.gamesArchived} rows=${result.rowsPersisted} ` +
      `unresolved=${result.unresolvedEventIds.length} errors=${result.errors.length}`,
  );
  return result;
}

export interface EspnLineArchiverIfEnabledResult extends EspnLineArchiverResult {
  readonly enabled: boolean;
}

/**
 * HARD GATE — the only entry point production code should call. Unless
 * LINE_ARCHIVE_ENABLED=true this returns `{ enabled: false }` having made
 * ZERO fetch calls and ZERO store calls (the deps are never invoked).
 */
export async function runEspnLineArchiverIfEnabled(
  deps: EspnLineArchiverDeps,
  env: NodeJS.ProcessEnv = process.env,
): Promise<EspnLineArchiverIfEnabledResult> {
  if (!isLineArchiveEnabled(env)) {
    return { enabled: false, ...zeroEspnLineArchiverResult((deps.now ?? (() => new Date()))()) };
  }
  const result = await runEspnLineArchiver(deps);
  return { enabled: true, ...result };
}
