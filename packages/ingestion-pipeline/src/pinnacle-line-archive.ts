/**
 * pinnacle-line-archive.ts — the Pinnacle closing-line leg of the forward line
 * archive (see line-archive.ts).
 *
 * WHY: line-archive.ts today only persists what the US-region ingestion already
 * fetches (packages/data-ingestion/src/config.ts: ODDS_REGION="us",
 * PRIORITY_BOOKMAKERS has no Pinnacle). The Pinnacle closing line — served by
 * The Odds API under the EU region — is the program's PRIMARY CLV benchmark and
 * is otherwise never captured. This module adds that one extra leg.
 *
 * DOUBLE-GATED, non-negotiable: this leg runs ONLY when BOTH
 * LINE_ARCHIVE_ENABLED==="true" AND LINE_ARCHIVE_EU_PINNACLE==="true". With
 * either flag absent/false (the default everywhere today), `fetchOdds` is never
 * invoked — zero new API calls, zero DB calls, zero new log noise. This is the
 * same hard-gate shape as `captureLineSnapshotsIfEnabled` in line-archive.ts,
 * just checking a second flag on top.
 *
 * CREDIT-AWARE: exactly one extra Odds API request per call (i.e. per sport per
 * refresh run) — regions=eu, bookmakers=pinnacle, the same sport/markets the
 * run already processes. The request itself is made through the caller's own
 * OddsApiClient instance (packages/data-ingestion/src/odds-api-client.ts),
 * injected here as `fetchOdds` — this module does not construct an HTTP client
 * or read THE_ODDS_API_KEY itself; see process-sport.ts for the wiring.
 *
 * FAILURE-ISOLATED: never throws. A fetch/normalize error, or a rejecting db
 * write, is caught and returned as `{ error }` — same pattern as
 * `captureLineSnapshotsIfEnabled` / `captureLineSnapshots` in line-archive.ts.
 *
 * STORAGE: reuses `captureLineSnapshots` from line-archive.ts — same
 * OddsLineSnapshot model/write path, no schema changes. Rows carry
 * `book: "pinnacle"` (from the bookmaker key The Odds API returns when
 * `bookmakers=pinnacle` is requested) and `source: PINNACLE_SOURCE` — the row
 * shape has no separate region column, so `book` + `source` together are the
 * accurate region/book provenance it does support: `book` identifies the exact
 * book, `source` distinguishes "fetched via the eu-region/pinnacle-only call"
 * from the default US-region capture (DEFAULT_SOURCE="the-odds-api" in
 * line-archive.ts), which otherwise share the same OddsLineSnapshot table.
 */

import type { NormalizedOdds } from "@sports/types";
import { captureLineSnapshots, isLineArchiveEnabled, toLineSnapshotRows } from "./line-archive.js";

/** True iff LINE_ARCHIVE_EU_PINNACLE === "true". Default OFF. Combined with
 *  `isLineArchiveEnabled` (line-archive.ts) via AND — see module doc comment. */
export function isLineArchiveEuPinnacleEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["LINE_ARCHIVE_EU_PINNACLE"] === "true";
}

export const PINNACLE_BOOKMAKER = "pinnacle";
const EU_REGION = "eu";
const PINNACLE_SOURCE = "the-odds-api-eu";

/** The slice of OddsApiClient#getOdds this module needs — matches its real
 *  signature so `client.getOdds.bind(client)` satisfies this directly. */
export type FetchEuOddsFn = (
  sportKey: string,
  markets: readonly string[],
  options: { regions: string; bookmakers: readonly string[] }
) => Promise<{ data: readonly unknown[] }>;

/** The slice of DataNormalizer#normalizeOdds this module needs. */
export type NormalizeOddsFn = (events: readonly unknown[], fetchedAt: Date) => NormalizedOdds[];

export interface CapturePinnacleLineSnapshotsArgs {
  /** Prisma-like db handle — forwarded as-is to `captureLineSnapshots`. */
  db: unknown;
  sport: string;
  markets: readonly string[];
  /** externalId -> upserted db game record, exactly what process-sport.ts
   *  already builds this cycle (`gameRecords`). */
  gameRecords: Readonly<Record<string, { id: string }>>;
  capturedAt: Date;
  /** Injected fetch — the caller's own OddsApiClient#getOdds, so this leg
   *  reuses the existing HTTP client/retry/timeout/API-key handling instead of
   *  hand-rolling a new one. */
  fetchOdds: FetchEuOddsFn;
  /** Injected normalizer — the caller's own DataNormalizer#normalizeOdds. */
  normalizeOdds: NormalizeOddsFn;
}

export interface CapturePinnacleLineSnapshotsResult {
  enabled: boolean;
  /** Total OddsLineSnapshot rows persisted across all games this call. */
  persisted: number;
  /** Number of distinct games that got at least one row persisted. */
  gamesArchived: number;
  error?: string;
}

/**
 * HARD GATE — the only entry point production ingestion code should call for
 * the Pinnacle leg. No-ops (fetchOdds is never invoked, db is never touched)
 * unless BOTH LINE_ARCHIVE_ENABLED=true AND LINE_ARCHIVE_EU_PINNACLE=true.
 * Makes at most one `fetchOdds` call total (one Odds API request). Never
 * throws.
 */
export async function capturePinnacleLineSnapshotsIfEnabled(
  args: CapturePinnacleLineSnapshotsArgs
): Promise<CapturePinnacleLineSnapshotsResult> {
  if (!isLineArchiveEnabled() || !isLineArchiveEuPinnacleEnabled()) {
    return { enabled: false, persisted: 0, gamesArchived: 0 };
  }

  try {
    const { data: events } = await args.fetchOdds(args.sport, args.markets, {
      regions: EU_REGION,
      bookmakers: [PINNACLE_BOOKMAKER],
    });

    // Defensive filter: keep only rows the upstream actually tagged as
    // Pinnacle, even though we requested bookmakers=pinnacle exclusively — a
    // stored bookmaker "pinnacle" must always be genuinely Pinnacle-sourced.
    const pinnacleOdds = args
      .normalizeOdds(events, args.capturedAt)
      .filter((o) => o.bookmaker === PINNACLE_BOOKMAKER);

    let persisted = 0;
    let gamesArchived = 0;
    for (const [externalId, gameRecord] of Object.entries(args.gameRecords)) {
      const gameOdds = pinnacleOdds.filter((o) => o.gameExternalId === externalId);
      if (gameOdds.length === 0) continue;

      const rows = toLineSnapshotRows(gameOdds);
      if (rows.length === 0) continue;

      // captureLineSnapshots is itself failure-isolated (catches DB errors and
      // returns { error }, never throws) — no try/catch needed here.
      const result = await captureLineSnapshots({
        db: args.db,
        gameId: gameRecord.id,
        capturedAt: args.capturedAt,
        rows,
        source: PINNACLE_SOURCE,
      });
      persisted += result.persisted;
      if (result.persisted > 0) gamesArchived++;
    }

    return { enabled: true, persisted, gamesArchived };
  } catch (err) {
    // fetchOdds/normalizeOdds threw (network error, timeout, malformed
    // payload, ...) — swallow it exactly like captureLineSnapshotsIfEnabled
    // swallows a DB rejection. The caller logs one warning from `error` and
    // continues; this leg must never block or fail the main refresh path.
    return {
      enabled: true,
      persisted: 0,
      gamesArchived: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
