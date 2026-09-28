/**
 * nflverse ingestion — the free, comprehensive NFL data source.
 *
 * nflverse (github.com/nflverse) publishes the entire modern NFL analytics
 * stack as release assets on `nflverse-data`: play-by-play with EPA/WPA, Next
 * Gen Stats (separation, time-to-throw, air yards), snap counts, depth charts,
 * injuries, PFR advanced stats, FTN charting, rosters (with age), draft/combine/
 * contracts, and weekly player stats. It is the same source the R (nflreadr)
 * and Python (nflreadpy / nfl_data_py) packages read — we read it directly from
 * Node, no R, ~$0. Licensing: the tooling is MIT; the DATA is CC-BY-4.0
 * (attribution required, no share-alike) — except FTN charting/participation,
 * which is CC-BY-SA-4.0 and is not ingested.
 *
 * This adapter is the typed access layer: a catalog of the high-value datasets
 * (each knowing its release tag, grain, season range, and the prediction value
 * it unlocks), a quote-aware CSV parser (pure, tested), and a fetch that
 * transparently gunzips `.gz` assets. It performs no writes and is not yet wired
 * into the live pipeline — wiring a dataset into scoring is a founder-gated
 * MODEL_VERSION step. See docs/nflverse-data-catalog.md and
 * docs/data-analytics-strategy.md.
 */

import { createGunzip, gunzipSync } from "node:zlib";
import { once } from "node:events";
import { noStoreFetch } from "./no-store-fetch.js";

export const NFLVERSE_BASE = "https://github.com/nflverse/nflverse-data/releases/download";

export type NflverseGrain =
  | "play"
  | "player-week"
  | "player-season"
  | "team-week"
  | "player"
  | "game"
  | "snapshot";

export type NflverseDataset = {
  /** Our stable key. */
  readonly key: string;
  /** The nflverse-data release tag the asset lives under. */
  readonly tag: string;
  readonly grain: NflverseGrain;
  /** Earliest season available (0 for non-seasonal master tables). */
  readonly since: number;
  /** True when one asset exists per season; false for a single master file. */
  readonly seasonal: boolean;
  readonly description: string;
  /** What this dataset unlocks for prediction/analytics. */
  readonly unlocks: string;
  /** Build the asset filename for a season (+ optional variant, e.g. ngs type). */
  readonly file: (season: number, variant?: string) => string;
};

function ds(d: NflverseDataset): NflverseDataset {
  return d;
}

/**
 * High-value subset of the 25 nflverse-data families. Filenames follow the
 * release conventions; `.gz` assets are gunzipped on fetch.
 */
export const NFLVERSE_CATALOG = {
  pbp: ds({
    key: "pbp", tag: "pbp", grain: "play", since: 1999, seasonal: true,
    description: "Play-by-play with EPA, WPA, air yards, success rate, win prob.",
    unlocks: "Per-play efficiency — the foundation for team/player true-talent models.",
    file: (s) => `play_by_play_${s}.csv`,
  }),
  pbp_participation: ds({
    key: "pbp_participation", tag: "pbp_participation", grain: "play", since: 2016, seasonal: true,
    description: "Personnel & participation per play: who was on the field, defenders in box.",
    unlocks: "Scheme/personnel context — formation tendencies, box counts, coverage proxies.",
    file: (s) => `pbp_participation_${s}.csv`,
  }),
  player_stats_week: ds({
    key: "player_stats_week", tag: "player_stats", grain: "player-week", since: 1999, seasonal: false,
    description: "Merged weekly offensive player stats: targets, receptions, air yards, EPA, attempts.",
    unlocks: "Usage & target share by player-week — the QB-age/RB-target-share class of trend.",
    file: () => "player_stats.csv.gz",
  }),
  snap_counts: ds({
    key: "snap_counts", tag: "snap_counts", grain: "player-week", since: 2012, seasonal: true,
    description: "Offense/defense/ST snap counts and snap share per player-game.",
    unlocks: "True workload (snap share) — the cleanest usage signal there is.",
    file: (s) => `snap_counts_${s}.csv`,
  }),
  ngs: ds({
    key: "ngs", tag: "nextgen_stats", grain: "player-week", since: 2016, seasonal: false,
    description: "Next Gen Stats (variant: passing | receiving | rushing): separation, cushion, time-to-throw, air yards, speed.",
    unlocks: "Tracking-derived talent signals not in any box score (e.g. receiver separation).",
    // Combined all-seasons asset. The per-season `ngs_<season>_<variant>.csv.gz` 404s for the current
    // season (verified live 2026-06: ngs_2025_* missing), but the combined `ngs_<variant>.csv.gz`
    // includes it (2016->2025). Consumers filter by season via resolveActiveSeason, so this keeps NGS
    // current without per-season 404s.
    file: (_s, v = "receiving") => `ngs_${v}.csv.gz`,
  }),
  pfr_advstats: ds({
    key: "pfr_advstats", tag: "pfr_advstats", grain: "player-week", since: 2018, seasonal: true,
    description: "PFR advanced (variant: pass | rush | rec | def): pressures, YAC, broken tackles, ADOT.",
    unlocks: "Charting-grade efficiency — pressure, separation-of-effort, missed-tackle rates.",
    file: (s, v = "rec") => `advstats_week_${v}_${s}.csv`,
  }),
  ftn_charting: ds({
    key: "ftn_charting", tag: "ftn_charting", grain: "play", since: 2022, seasonal: true,
    description: "FTN manual charting: play action, RPO, screen, motion, defenders in box.",
    unlocks: "Play-design context the public market rarely prices.",
    file: (s) => `ftn_charting_${s}.csv`,
  }),
  depth_charts: ds({
    key: "depth_charts", tag: "depth_charts", grain: "player-week", since: 2001, seasonal: true,
    description: "Weekly depth-chart position per player.",
    unlocks: "Role/starter status — context for usage and injury cascades.",
    file: (s) => `depth_charts_${s}.csv`,
  }),
  injuries: ds({
    key: "injuries", tag: "injuries", grain: "player-week", since: 2009, seasonal: true,
    description: "Official weekly injury reports (status, designation, body part).",
    unlocks: "Availability signal — the highest-value non-market factor for game outcomes.",
    file: (s) => `injuries_${s}.csv`,
  }),
  rosters: ds({
    key: "rosters", tag: "rosters", grain: "player", since: 1920, seasonal: true,
    description: "Season rosters: name, position, team, birth_date, gsis_id, draft, college.",
    unlocks: "Player master + age — the join key (gsis_id) for every other dataset.",
    file: (s) => `roster_${s}.csv`,
  }),
  espn_qbr_week: ds({
    key: "espn_qbr_week", tag: "espn_data", grain: "player-week", since: 2006, seasonal: false,
    description: "ESPN Total QBR, weekly level.",
    unlocks: "A second, independent QB quality estimate to triangulate against.",
    file: () => `qbr_week_level.csv`,
  }),
  players: ds({
    key: "players", tag: "players", grain: "player", since: 0, seasonal: false,
    description: "All-time player master table.",
    unlocks: "Stable cross-season player identity + bio.",
    file: () => `players.csv`,
  }),
  schedules: ds({
    key: "schedules", tag: "schedules", grain: "game", since: 1999, seasonal: false,
    description: "Game schedule + results, rest, roof, surface, spread/total (Lee Sharpe's nfldata).",
    unlocks: "Authoritative game master with rest/venue context for joins.",
    file: () => `games.csv`,
  }),
  draft_picks: ds({
    key: "draft_picks", tag: "draft_picks", grain: "player", since: 0, seasonal: false,
    description: "All draft picks (round, pick, team, player).",
    unlocks: "Draft capital — a prior on talent/role for younger players.",
    file: () => `draft_picks.csv`,
  }),
  combine: ds({
    key: "combine", tag: "combine", grain: "player", since: 0, seasonal: false,
    description: "Combine results (40, vert, etc.).",
    unlocks: "Athletic testing priors.",
    file: () => `combine.csv`,
  }),
  // ── Coverage-completeness additions (verified live against nflverse-data,
  //    all standard CC-BY-4.0 — NOT the FTN/participation CC-BY-SA exception).
  //    Schemas confirmed from the live release headers on 2026-06-15.
  officials: ds({
    key: "officials", tag: "officials", grain: "game", since: 2015, seasonal: false,
    description: "Officiating crew per game (referee/umpire/etc.) keyed by game_id.",
    unlocks: "Referee-crew tendencies — penalty/total/pace lean the market rarely prices.",
    file: () => `officials.csv`,
  }),
  trades: ds({
    key: "trades", tag: "trades", grain: "snapshot", since: 2002, seasonal: false,
    description: "Recorded trades: players/picks gave & received, with trade dates.",
    unlocks: "Roster-movement events — mid-season role shifts and draft-capital flow.",
    file: () => `trades.csv`,
  }),
  contracts: ds({
    key: "contracts", tag: "contracts", grain: "player", since: 0, seasonal: false,
    description: "OverTheCap historical player contracts: value, APY, guarantees, years.",
    unlocks: "Contract-year / holdout / cap context — a soft motivation+availability signal.",
    file: () => `historical_contracts.csv.gz`,
  }),
  weekly_rosters: ds({
    key: "weekly_rosters", tag: "weekly_rosters", grain: "player-week", since: 2002, seasonal: true,
    description: "Weekly roster status per player (active/inactive/IR) with gsis_id + bio.",
    unlocks: "Weekly availability + in-season team/role changes — who actually dressed.",
    file: (s) => `roster_weekly_${s}.csv`,
  }),
  stats_team_week: ds({
    key: "stats_team_week", tag: "stats_team", grain: "team-week", since: 1999, seasonal: true,
    description: "Team-week aggregated stats: pass/rush yards, EPA, CPOE, first downs, TDs.",
    unlocks: "Team efficiency aggregates (EPA/CPOE) without re-deriving from play-by-play.",
    file: (s) => `stats_team_week_${s}.csv`,
  }),
} satisfies Record<string, NflverseDataset>;

export type NflverseDatasetKey = keyof typeof NFLVERSE_CATALOG;

/** Full download URL for a dataset asset. */
export function nflverseUrl(key: NflverseDatasetKey, season: number, variant?: string): string {
  const d = NFLVERSE_CATALOG[key];
  return `${NFLVERSE_BASE}/${d.tag}/${d.file(season, variant)}`;
}

export type CsvTable = {
  readonly header: readonly string[];
  /** Row objects keyed by header. */
  readonly records: ReadonlyArray<Readonly<Record<string, string>>>;
};

/** Options for {@link parseCsv}. */
export type ParseCsvOptions = {
  /**
   * Column projection allowlist. When provided, each emitted record keeps ONLY
   * these columns (the intersection of `columns` and the actual header). This is
   * the OOM defense for very wide files (e.g. nflverse play-by-play is ~372
   * columns over ~50k rows): projecting to the handful of columns a consumer
   * reads cuts the retained record heap ~30x. Columns not present in the header
   * are silently ignored; unknown column requests do not error. Omitting the
   * option (or passing `undefined`) preserves the full-record behavior exactly.
   *
   * Memory note: when projecting, the parser NEVER materializes the full token
   * matrix (the ~50k x ~372 intermediate `string[][]` that itself OOMs a 1GB
   * heap). It streams row by row, appending only allowlisted field values
   * straight onto the record and discarding every dropped field's characters as
   * it goes — so peak heap is the 40MB text plus the small projected records, not
   * the full per-cell string explosion.
   */
  readonly columns?: readonly string[];
  /**
   * Row predicate, evaluated DURING the streaming scan against the projected
   * values. A row that returns false is never materialized as an object, so its
   * cells are discarded as the scanner passes them.
   *
   * This is the second half of the OOM defense for the `player_stats_week` cron.
   * Column projection alone was not enough: the combined nflverse asset spans
   * every season since 1999 in ONE 33,447,747-byte file, so even a 18-column
   * projection retains ~26 seasons of records when the contract is exactly ONE
   * season per invocation. Measured 2026-09-27 on
   * dpl_DU9K91tetxKe8oa5YdLvKBaBRJd7: `/api/cron/refresh-player-stats` still
   * returned "instance was killed because it ran out of available memory" AFTER
   * the #929 streaming-decode fix, because the season filter ran only AFTER a
   * full table had been built. Filtering during the scan means peak heap is the
   * text plus ONE season of projected records.
   *
   * Only honored on the projecting path; the full-record path ignores it, so a
   * caller that forgets `columns` gets no silent partial filtering.
   */
  readonly rowFilter?: (row: Readonly<Record<string, string>>) => boolean;
  /**
   * Observer called for EVERY row during the scan, before {@link rowFilter},
   * and retaining nothing. This is how a caller learns a whole-file fact (a
   * coverage watermark, a row count) without paying to keep the rows it is
   * about to reject — the season-scoped fetch needs `max(season)` to decide
   * whether to backfill per-season files, and a filtered table alone would
   * report the TARGET season and hide the fact that the asset stops short of it.
   *
   * Projecting path only, for the same reason as {@link rowFilter}.
   */
  readonly onRow?: (row: Readonly<Record<string, string>>) => void;
};

/**
 * Quote-aware CSV parse (RFC-4180-ish: doubled quotes, embedded commas/newlines).
 * Pure and deterministic — the unit-tested core of the adapter.
 *
 * Pass `{ columns }` to project to an allowlist of columns (see
 * {@link ParseCsvOptions.columns}); the default keeps every column. The default
 * (full-record) path is unchanged; the projecting path uses a separate streaming
 * scan that avoids the intermediate token matrix entirely.
 */
export function parseCsv(text: string, options: ParseCsvOptions = {}): CsvTable {
  if (options.columns !== undefined) {
    return parseCsvProjected(text, options.columns, options.rowFilter, options.onRow);
  }

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
    else if (c === "\r") { /* ignore */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  const header = rows.shift() ?? [];
  const records = rows
    .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""))
    .map((r) => {
      const rec: Record<string, string> = {};
      for (let j = 0; j < header.length; j++) rec[header[j]!] = r[j] ?? "";
      return rec;
    });
  return { header, records };
}

/**
 * Projecting variant of {@link parseCsv}: same quote-aware tokenizer, but it
 * keeps ONLY allowlisted columns and — critically — never builds the full
 * `string[][]` token matrix. It scans the text once, and at each field boundary
 * keeps the field's characters only if the current column index is allowlisted
 * (otherwise the in-progress field string is dropped immediately). At each row
 * boundary it emits a compact record and resets. This is what keeps the wide
 * nflverse pbp asset (~372 cols x ~50k rows) inside a 1GB serverless heap.
 *
 * Behavior matches the full parser on the projected subset: same blank-line
 * skip, same missing-trailing-column fill (allowlisted columns absent from a
 * short row default to ""), full `header` returned intact, columns absent from
 * the header silently ignored.
 */
function parseCsvProjected(
  text: string,
  columns: readonly string[],
  rowFilter?: (row: Readonly<Record<string, string>>) => boolean,
  onRow?: (row: Readonly<Record<string, string>>) => void,
): CsvTable {
  // First pass: read just the header line (quote-aware) to learn column order.
  const header: string[] = [];
  let i = 0;
  {
    let field = "";
    let inQuotes = false;
    for (; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { header.push(field); field = ""; }
      else if (c === "\n") { header.push(field); i++; break; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
    // Header line with no trailing newline (empty body).
    if (i >= text.length && (field.length > 0 || header.length > 0)) header.push(field);
  }

  const allowSet = new Set(columns);
  // Which header indices to keep, and the key each maps to (header order).
  const keepKeyByIdx = new Map<number, string>();
  for (let j = 0; j < header.length; j++) {
    const key = header[j]!;
    if (allowSet.has(key)) keepKeyByIdx.set(j, key);
  }

  const records: Array<Record<string, string>> = [];
  // Per-row streaming state. `rec` is built incrementally; `field` only retains
  // characters while the current column is allowlisted. `col` tracks the column
  // index, `cells` the number of fields seen (to detect blank lines).
  let rec: Record<string, string> = {};
  let field = "";
  let col = 0;
  let cells = 0;
  let keepingField = keepKeyByIdx.has(0);
  let inQuotes = false;
  let rowHasContent = false;

  const endField = (): void => {
    if (keepingField) {
      const key = keepKeyByIdx.get(col);
      if (key !== undefined) rec[key] = field;
    }
    cells++;
    col++;
    field = "";
    keepingField = keepKeyByIdx.has(col);
  };
  const endRow = (): void => {
    endField();
    // Mirror the full parser's blank-line skip: a single empty cell is dropped.
    if (rowHasContent || cells > 1) {
      // The observer sees EVERY row (it is how a caller measures coverage of a
      // file it is filtering down), then the predicate decides retention. A
      // rejected row's cells are eligible for GC immediately rather than after
      // a whole multi-season table has been accumulated.
      if (onRow !== undefined) onRow(rec);
      if (rowFilter === undefined || rowFilter(rec)) records.push(rec);
    }
    rec = {};
    col = 0;
    cells = 0;
    field = "";
    keepingField = keepKeyByIdx.has(0);
    rowHasContent = false;
  };

  for (; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { if (keepingField) field += '"'; i++; rowHasContent = true; }
        else inQuotes = false;
      } else { if (keepingField) field += c; rowHasContent = true; }
    } else if (c === '"') { inQuotes = true; rowHasContent = true; }
    else if (c === ",") endField();
    else if (c === "\n") endRow();
    else if (c === "\r") { /* ignore */ }
    else { if (keepingField) field += c; rowHasContent = true; }
  }
  // Final row if the text didn't end with a newline.
  if (field.length > 0 || col > 0 || rowHasContent) endRow();

  return { header, records };
}

/**
 * Decode a fetched dataset response body to text, transparently gunzipping when
 * the body is gzip. nflverse release assets are raw-gzip with NO Content-Encoding
 * header, so fetch() won't auto-decompress them — calling `.text()` directly would
 * yield gzip binary that parses to garbage. We detect gzip by its magic bytes
 * (0x1f 0x8b) rather than the URL, so a plain-CSV body (an uncompressed asset, a
 * mirror that pre-decompresses, or a test mock) still works unchanged. Node-only
 * (Buffer / node:zlib); use on the Node.js runtime.
 */
export async function decodeDatasetText(response: Response): Promise<string> {
  // MEMORY. This decodes one asset at a time but the whole body is resident:
  // the compressed buffer AND the decompressed string AND the parsed row objects.
  // `player_stats.csv` measures 33,447,747 bytes uncompressed (Content-Length
  // from the nflverse release), so `gunzipSync` over it briefly holds the gz
  // buffer, the full decompressed Buffer, AND its utf8 string at once, and the
  // caller then builds a row object per record on top of that. Measured
  // consequence in production on dpl_5w9WsXUHtYq3KbMiX58gTZzKZjZR:
  // `/api/cron/refresh-player-stats` returned 500 sixteen times at 21:30-21:33
  // UTC with "instance was killed because it ran out of available memory" —
  // and NOT in the 10:00 satellite window, so the PRIMARY path alone is over the
  // ceiling. The same path also succeeded at 2026-09-28T02:00:03Z
  // (`player_game_stats` max fetchedAt), so this is a MARGIN problem, not a
  // hard limit: it fits sometimes and dies sometimes.
  //
  // The fix is to stop holding the compressed copy. Decoding the RESPONSE BODY
  // STREAM with an incremental TextDecoder means the gz bytes are consumed and
  // released chunk by chunk and never sit in memory alongside the output. The
  // returned string is byte-identical, the gzip magic-byte detection is
  // unchanged, and no row is dropped or sampled — this reduces peak memory
  // without changing a single record.
  if (response.body) {
    const reader = response.body.getReader();
    // Peek the first TWO bytes to detect gzip by MAGIC rather than by URL, so
    // an uncompressed asset or a test mock still works exactly as before. Two
    // separate reads are required: a stream may hand back a single byte, and
    // testing magic on one byte would misread every gzipped asset as plain and
    // emit raw binary — which is exactly what this test caught.
    const decoder = new TextDecoder("utf-8");
    const r1 = await reader.read();
    if (r1.done) return "";
    const b0 = new Uint8Array(r1.value);
    let head: Uint8Array;
    let isGzip: boolean;
    if (b0.length >= 2) {
      head = b0;
      isGzip = b0[0] === 0x1f && b0[1] === 0x8b;
    } else {
      const r2 = await reader.read();
      if (r2.done) {
        // A one-byte body: no magic number is possible, so it is plain text.
        return decoder.decode(b0);
      }
      const b1 = new Uint8Array(r2.value);
      head = new Uint8Array(b0.length + b1.length);
      head.set(b0, 0);
      head.set(b1, b0.length);
      isGzip = head.length > 1 && head[0] === 0x1f && head[1] === 0x8b;
    }

    if (!isGzip) {
      let out = decoder.decode(head, { stream: true });
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        out += decoder.decode(next.value, { stream: true });
      }
      out += decoder.decode();
      return out;
    }

    // Gzip: pipe each chunk into an ASYNC gunzip AS IT ARRIVES, so the
    // compressed bytes are released chunk by chunk and never sit in memory
    // alongside the output. Buffering the chunks into an array first (the
    // obvious way to write this) would save nothing at all — that is exactly
    // the residency the original `gunzipSync` had.
    const gunzip = createGunzip();
    const done = new Promise<void>((resolvePromise, rejectPromise) => {
      gunzip.on("end", resolvePromise);
      gunzip.on("finish", resolvePromise);
      gunzip.on("error", rejectPromise);
    });
    let out = "";
    // Consume the gunzip output while chunks are still being written.
    const pump = (async () => {
      for await (const piece of gunzip) {
        out += decoder.decode(piece as Uint8Array, { stream: true });
      }
    })();

    gunzip.write(Buffer.from(head));
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      if (!gunzip.write(Buffer.from(next.value))) {
        // Respect backpressure so a slow decompressor cannot balloon the queue.
        await once(gunzip, "drain");
      }
    }
    gunzip.end();
    await done;
    await pump;
    out += decoder.decode();
    return out;
  }

  // No streaming body (a mock, or a runtime without ReadableStream): the
  // original buffered path, unchanged.
  const buf = Buffer.from(await response.arrayBuffer());
  const isGzip = buf.length > 1 && buf[0] === 0x1f && buf[1] === 0x8b;
  return isGzip ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
}

/** Fetch a dataset asset as text, transparently gunzipping `.gz` assets. */
export async function fetchNflverseText(key: NflverseDatasetKey, season: number, variant?: string): Promise<string> {
  const url = nflverseUrl(key, season, variant);
  const res = await noStoreFetch(url);
  if (!res.ok) throw new Error(`nflverse fetch failed (${res.status}) for ${url}`);
  return decodeDatasetText(res);
}

// The legacy combined `player_stats/player_stats.csv.gz` lags the newest season(s): nflverse ships
// the latest weekly offensive stats only as per-season `stats_player/stats_player_week_<season>.csv`
// after the 2024 rename. To stay current through the requested season we merge those per-season files
// in (offensive REG/POST rows only, matching the combined file's scope). Best-effort by design: a
// per-season file that is missing/unreachable is skipped, so the result is never worse than the
// combined asset alone.
const PLAYER_STATS_OFFENSE_POSITIONS = new Set(["QB", "RB", "WR", "TE", "FB"]);

function maxSeasonIn(table: CsvTable): number {
  let max = 0;
  for (const row of table.records) {
    const value = Number(row["season"]);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return max;
}

function perSeasonPlayerStatsWeekUrl(season: number): string {
  return `${NFLVERSE_BASE}/stats_player/stats_player_week_${season}.csv`;
}

/**
 * Fetch + filter one per-season `stats_player_week_<season>.csv` file (offense
 * REG/POST rows only), through an injectable `fetchText` callback so callers
 * can share this filtering logic across different fetch pipelines (plain
 * noStoreFetch for {@link fetchNflverse}; failover + size caps + column
 * projection for the cached artifact layer in `nflverse-cache.ts`). Best
 * effort by design: any `fetchText` rejection is swallowed and yields `null`,
 * matching the "never worse than the combined asset alone" contract.
 */
async function fetchPerSeasonPlayerStatsWeekWith(
  season: number,
  fetchText: (url: string) => Promise<string>,
  options: ParseCsvOptions,
): Promise<CsvTable | null> {
  const url = perSeasonPlayerStatsWeekUrl(season);
  try {
    const table = parseCsv(await fetchText(url), options);
    const records = table.records.filter((row) => {
      const position = (row["position"] ?? "").toUpperCase();
      const seasonType = (row["season_type"] ?? "REG").toUpperCase();
      return PLAYER_STATS_OFFENSE_POSITIONS.has(position) && (seasonType === "REG" || seasonType.startsWith("POST"));
    });
    return { header: table.header, records };
  } catch {
    return null;
  }
}

/**
 * Shared merge core: given an already-parsed `player_stats_week` table and a
 * target season, backfills any season(s) the combined asset lags behind by
 * fetching per-season files through the injected `fetchText`. Used by both
 * {@link fetchNflverse} (plain noStoreFetch, full-record parse) and the cached
 * artifact layer in `nflverse-cache.ts` (failover + size caps + column
 * projection), so the merge semantics — offense positions only, REG/POST
 * season types only, best-effort skip on a missing/failed per-season file, and
 * the `covered === 0` untrusted-table bail-out — stay byte-identical between
 * the two callers.
 */
export async function mergePlayerStatsWeekCurrency(
  table: CsvTable,
  season: number,
  fetchText: (url: string) => Promise<string>,
  options: ParseCsvOptions = {},
): Promise<CsvTable> {
  const covered = maxSeasonIn(table);
  // maxSeasonIn floors at 0, so covered===0 means NO row had a parseable `season`
  // (e.g. an nflverse column rename — the same drift class this adapter documents).
  // Such a table is untrustworthy: trusting covered=0 would run the backfill loop
  // from year 1 to the target season, firing thousands of sequential fetches (a
  // self-inflicted rate-limit/timeout). Return the combined asset as-is instead —
  // never worse than the combined asset alone, matching this section's contract.
  if (!Number.isFinite(covered) || covered === 0) return table;
  if (season <= covered) return table;

  const records = [...table.records];
  for (let extraSeason = covered + 1; extraSeason <= season; extraSeason++) {
    const perSeason = await fetchPerSeasonPlayerStatsWeekWith(extraSeason, fetchText, options);
    if (perSeason && perSeason.records.length > 0) records.push(...perSeason.records);
  }
  return { header: table.header, records };
}

/** Fetch + parse a dataset asset into row records. */
export async function fetchNflverse(key: NflverseDatasetKey, season: number, variant?: string): Promise<CsvTable> {
  const table = parseCsv(await fetchNflverseText(key, season, variant));
  if (key !== "player_stats_week" || !Number.isFinite(season)) return table;

  return mergePlayerStatsWeekCurrency(table, season, async (url) => {
    const res = await noStoreFetch(url);
    if (!res.ok) throw new Error(`nflverse fetch failed (${res.status}) for ${url}`);
    return decodeDatasetText(res);
  });
}

/**
 * The 18 `player_stats_week` columns `ingestPlayerWeeklyStats` actually reads.
 * Named from that caller's field access, not from the full nflverse header —
 * a column absent from the asset is silently ignored by the projection, so
 * this list cannot drift into an error, only into a narrower record.
 */
const PLAYER_STATS_WEEK_COLUMNS = [
  "player_id",
  "player_display_name",
  "player_name",
  "headshot_url",
  "position",
  "recent_team",
  // 2025+ spelling of `recent_team`. BOTH are listed because nflverse renamed
  // the column after2024 and the rename is not uniform across the assets this
  // function merges: a combined table and a per-season file can disagree.
  //
  // WHY THIS MATTERS (measured 2026-09-28 on live Neon): `player_game_stats.team`
  // was NULL on all 1,068 rows of 2026 and every row of 2025, while seasons
  // 2020-2024 were fully populated. `opponent_team` survived the rename, which
  // is the tell that one field lost its source and its sibling did not.
  //
  // This list is a PROJECTION — a column absent from it is dropped before
  // `ingestPlayerWeeklyStats` can read it, silently. So adding `team` here is
  // the load-bearing half of that fix; the ingest's multi-name reader is the
  // other half. Omitting it means the ingest asks for a column this projection
  // has already thrown away, and the nulls persist while everything reports
  // success. Keep the two in step.
  //
  // Cost is one field on a record that already carries 17: this projection is
  // what keeps the primary cron inside its heap on a 33MB asset spanning every
  // season since 1999, and one column does not move that.
  "team",
  "opponent_team",
  // 2025+ spelling of `opponent_team`; same reasoning as `team` above.
  "opponent",
  "season",
  "week",
  "season_type",
  "attempts",
  "carries",
  "receptions",
  "targets",
  "target_share",
  "receiving_yards",
  "rushing_yards",
  "fantasy_points_ppr",
] as const;

/**
 * `fetchNflverse` for the weekly player-stats asset, scoped to ONE season and
 * projected to the columns the ingest reads.
 *
 * WHY THIS EXISTS. `fetchNflverse` builds the WHOLE combined asset into memory
 * before the caller's season filter runs. `player_stats_week` is a single
 * 33,447,747-byte file spanning every season since 1999, so the primary cron
 * held ~26 seasons of full row objects on a 1GB serverless heap and was killed
 * for memory — measured repeatedly, and STILL on
 * dpl_DU9K91tetxKe8oa5YdLvKBaBRJd7 after the #929 streaming-decode fix, because
 * that fix removed the retained gz bytes and left the retained records.
 *
 * Filtering DURING the scan means peak heap is the decoded text plus one season
 * of 18-column records. Nothing is sampled or dropped: the rows returned are
 * exactly the rows a post-hoc `filter(r => r.season === season)` would have
 * kept, which is what the caller already did. The currency merge still runs, so
 * a season newer than the combined asset is backfilled exactly as before.
 */
export async function fetchNflversePlayerStatsWeek(
  key: NflverseDatasetKey,
  season: number,
  variant?: string,
): Promise<CsvTable> {
  // Coverage is measured over EVERY row via `onRow`, never inferred from the
  // filtered result. `mergePlayerStatsWeekCurrency` decides whether to backfill
  // per-season files from `maxSeasonIn(table)`; if it read a table already
  // filtered to the target season it would always see `season <= covered`,
  // decide no backfill was needed, and silently stop advancing the current
  // season — the exact failure the merge exists to prevent. So we hand the
  // merge a coverage number we measured, and keep the filter for retention only.
  let covered = 0;
  const options: ParseCsvOptions = Number.isFinite(season)
    ? {
        columns: PLAYER_STATS_WEEK_COLUMNS,
        rowFilter: (row) => row["season"] === String(season),
        onRow: (row) => {
          const value = Number(row["season"]);
          if (Number.isFinite(value) && value > covered) covered = value;
        },
      }
    : { columns: PLAYER_STATS_WEEK_COLUMNS };
  const table = parseCsv(await fetchNflverseText(key, season, variant), options);
  if (key !== "player_stats_week" || !Number.isFinite(season)) return table;

  // Re-derive the merge decision from the MEASURED watermark instead of from
  // the filtered table, preserving the documented bail-outs: covered===0 means
  // no row had a parseable season (untrustworthy table, skip the backfill), and
  // season <= covered means the combined asset already carries the season.
  if (!Number.isFinite(covered) || covered === 0 || season <= covered) return table;
  const records = [...table.records];
  for (let extraSeason = covered + 1; extraSeason <= season; extraSeason++) {
    const perSeason = await fetchPerSeasonPlayerStatsWeekWith(
      extraSeason,
      async (url) => {
        const res = await noStoreFetch(url);
        if (!res.ok) throw new Error(`nflverse fetch failed (${res.status}) for ${url}`);
        return decodeDatasetText(res);
      },
      // Same projection, and NO season filter: a per-season file is already
      // scoped to its own season, and the existing REG/POST + offense-position
      // filter in that helper is part of the merge's documented semantics.
      { columns: PLAYER_STATS_WEEK_COLUMNS },
    );
    if (perSeason && perSeason.records.length > 0) records.push(...perSeason.records);
  }
  return { header: table.header, records };
}
