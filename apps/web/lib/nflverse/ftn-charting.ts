/**
 * FTN charting loader — play-design transparency from nflverse (CC-BY-4.0).
 *
 * nflverse publishes one season-scoped `ftn_charting_{season}.csv` asset under the
 * `ftn_charting` release tag (manual FTN Data charting, 2022–present). It is the
 * play-grain record of HOW each snap was designed — play-action, RPO, screen,
 * pre-snap motion, no-huddle, QB out-of-pocket, and the actual blitzer / pass-rush
 * counts the box score never carries. This is the first FTN loader in the app.
 *
 * IMPORTANT — what FTN does and does NOT carry: the asset has full PLAY identity
 * (`nflverse_game_id`, `nflverse_play_id`, `season`, `week`) but NO team or player
 * identity. There is no `posteam`, no `passer_player_id`, and no `season_type`. So
 * this loader's job is only to fetch + project + decode the real charting columns
 * into compact, serializable rows; attributing a play to a QB or a team requires a
 * join to play-by-play (which carries `game_id` / `play_id` / `posteam` /
 * `passer_*` / `season_type`). That join + aggregation lives in the SERVER engine
 * `lib/intelligence/play-design.ts`.
 *
 * SCOPE — this loader returns every charted play, REG and POST (FTN covers the
 * postseason). The regular-season-only scoping for play-design rates is enforced
 * downstream in the engine's identity map (it indexes only REG pbp plays), so POST
 * charted rows fail the join and drop. Keeping the loader scope-agnostic lets other
 * consumers read postseason charting if they ever need it.
 *
 * RSC boundary: this is a server module. It returns only plain serializable rows
 * (string / number / boolean) — never functions — so a server engine or RSC can
 * pass the result across the boundary untouched.
 *
 * PERF: the file is far smaller than pbp (~50k plays × ~30 cols, no 372-col EPA
 * payload). We still use the streaming column-projecting `parseCsv({ columns })`
 * for consistency and to keep retained heap to just the charting fields. The CSV
 * is plain text (not gzipped); we read it with `response.text()`. Reads
 * `[season, season - 1]` so an empty current season falls back to the last
 * complete one.
 *
 * INTEGRITY: every field below is a real column in the nflverse ftn_charting
 * schema. Absent values parse to null (numbers) or false (flags) and are surfaced
 * as honest empties — never invented. Read-only, multi-host failover, honest
 * source-error. canPublishProjections stays false elsewhere; this is fact, not a
 * projection.
 */

import { assertIngestible, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * One charted play from ftn_charting, projected to the design-relevant fields.
 * Join keys (`gameId` ← nflverse_game_id, `playId` ← nflverse_play_id) let a
 * consumer attach this to a play-by-play row to learn the QB / team. Flags are
 * real nflverse booleans (1/0/TRUE/FALSE); missing → false. Counts are real
 * integers; missing → null (shown as a dash, never zero-filled).
 */
export interface FtnChartingRow {
  /** nflverse_game_id — joins to pbp `game_id`. */
  readonly gameId: string;
  /** nflverse_play_id — joins to pbp `play_id`. */
  readonly playId: string;
  readonly season: number;
  readonly week: number | null;
  // Real per-play design flags (booleans in the source).
  readonly isPlayAction: boolean;
  readonly isRpo: boolean;
  readonly isScreenPass: boolean;
  readonly isMotion: boolean;
  readonly isNoHuddle: boolean;
  readonly isQbOutOfPocket: boolean;
  // Real per-play counts (integers in the source); null when uncharted.
  readonly nBlitzers: number | null;
  readonly nPassRushers: number | null;
  /** read_thrown — which progression read the throw went to (raw charted value). */
  readonly readThrown: string;
}

export interface NflverseFtnCharting {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  /** Season actually used (after [season, season-1] fallback). */
  readonly season: number;
  /** Total charted play rows projected (0 on error / unavailable season). */
  readonly sourceRows: number;
  readonly rows: readonly FtnChartingRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

/**
 * The exact ftn_charting columns this loader projects. Passed to `parseCsv` as the
 * allowlist so only these keys are retained per record. Keep this in lockstep with
 * the row mapper: every column read below must appear here, or it reads as missing.
 *   join keys: nflverse_game_id, nflverse_play_id, season, week
 *   flags:     is_play_action, is_rpo, is_screen_pass, is_motion, is_no_huddle,
 *              is_qb_out_of_pocket
 *   counts:    n_blitzers, n_pass_rushers
 *   read:      read_thrown
 */
export const FTN_CHARTING_COLUMNS = [
  "nflverse_game_id",
  "nflverse_play_id",
  "season",
  "week",
  "is_play_action",
  "is_rpo",
  "is_screen_pass",
  "is_motion",
  "is_no_huddle",
  "is_qb_out_of_pocket",
  "n_blitzers",
  "n_pass_rushers",
  "read_thrown",
] as const;

/** A whole-number value, or null when the source cell is blank / non-numeric. */
function intOrNull(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** nflverse boolean-ish ("1"/"0"/"TRUE"/"FALSE"/"T"/"F"); missing → false. */
function flag(v: string | undefined): boolean {
  if (v === undefined || v === "") return false;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "t";
}

/** Map one projected CSV record to a serializable FtnChartingRow. Pure. */
function toRow(r: CsvRecord): FtnChartingRow {
  return {
    gameId: r["nflverse_game_id"] ?? "",
    playId: r["nflverse_play_id"] ?? "",
    season: intOrNull(r["season"]) ?? 0,
    week: intOrNull(r["week"]),
    isPlayAction: flag(r["is_play_action"]),
    isRpo: flag(r["is_rpo"]),
    isScreenPass: flag(r["is_screen_pass"]),
    isMotion: flag(r["is_motion"]),
    isNoHuddle: flag(r["is_no_huddle"]),
    isQbOutOfPocket: flag(r["is_qb_out_of_pocket"]),
    nBlitzers: intOrNull(r["n_blitzers"]),
    nPassRushers: intOrNull(r["n_pass_rushers"]),
    readThrown: r["read_thrown"] ?? "",
  };
}

/**
 * Load one season of FTN charting as compact, serializable per-play rows.
 *
 * Tries `[season, season - 1]`. FTN charting only exists 2022+; for seasons before
 * the asset's coverage the fetch 404s and this returns an honest source-error (no
 * fabricated rows). The returned rows carry only the play identity + design fields;
 * the per-QB / per-team aggregation (which needs a pbp join for identity) is the
 * engine's job.
 */
export async function loadNflverseFtnCharting({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 20000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<NflverseFtnCharting> {
  // Governance: a forbidden/paid source would throw here before any fetch.
  assertIngestible("nflverse");

  const candidates = [season, season - 1];
  let lastError: unknown = null;
  let lastUrl = nflverseUrl("ftn_charting", season);

  for (const candidate of candidates) {
    const url = nflverseUrl("ftn_charting", candidate);
    lastUrl = url;
    try {
      const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
      // Project to the charting columns so only the design fields survive into heap.
      const { records } = parseCsv(await response.text(), { columns: FTN_CHARTING_COLUMNS });
      if (records.length === 0) throw new Error(`empty ftn_charting ${candidate}`);

      const rows = records.map(toRow);
      return {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        sourceRows: records.length,
        rows,
        canPublishProjections: false,
        note: "Real FTN manual charting from nflverse (2022+): per-play design flags (play-action, RPO, screen, motion, no-huddle, QB out-of-pocket) and the charted blitzer / pass-rusher counts. Play-grain fact with no team/QB identity of its own — joined to play-by-play downstream. Context, not a projection.",
        sourceUrl: url,
        error: null,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season: 0,
    sourceRows: 0,
    rows: [],
    canPublishProjections: false,
    note: "FTN charting could not load from nflverse (it only exists 2022+, and an off-season file may not be published yet). The product shows an honest empty state instead of fabricated play-design rates.",
    sourceUrl: lastUrl,
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
  };
}
