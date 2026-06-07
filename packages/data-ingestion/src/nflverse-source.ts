/**
 * nflverse ingestion — the free, comprehensive NFL data source.
 *
 * nflverse (github.com/nflverse, MIT) publishes the entire modern NFL analytics
 * stack as release assets on `nflverse-data`: play-by-play with EPA/WPA, Next
 * Gen Stats (separation, time-to-throw, air yards), snap counts, depth charts,
 * injuries, PFR advanced stats, FTN charting, rosters (with age), draft/combine/
 * contracts, and weekly player stats. It is the same source the R (nflreadr)
 * and Python (nflreadpy / nfl_data_py) packages read — we read it directly from
 * Node, no R, no licence, ~$0.
 *
 * This adapter is the typed access layer: a catalog of the high-value datasets
 * (each knowing its release tag, grain, season range, and the prediction value
 * it unlocks), a quote-aware CSV parser (pure, tested), and a fetch that
 * transparently gunzips `.gz` assets. It performs no writes and is not yet wired
 * into the live pipeline — wiring a dataset into scoring is a founder-gated
 * MODEL_VERSION step. See docs/nflverse-data-catalog.md and
 * docs/data-analytics-strategy.md.
 */

import { gunzipSync } from "node:zlib";

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
    key: "ngs", tag: "nextgen_stats", grain: "player-week", since: 2016, seasonal: true,
    description: "Next Gen Stats (variant: passing | receiving | rushing): separation, cushion, time-to-throw, air yards, speed.",
    unlocks: "Tracking-derived talent signals not in any box score (e.g. receiver separation).",
    file: (s, v = "receiving") => `ngs_${s}_${v}.csv.gz`,
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

/**
 * Quote-aware CSV parse (RFC-4180-ish: doubled quotes, embedded commas/newlines).
 * Pure and deterministic — the unit-tested core of the adapter.
 */
export function parseCsv(text: string): CsvTable {
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
 * Decode a fetched dataset response body to text, transparently gunzipping when
 * the body is gzip. nflverse release assets are raw-gzip with NO Content-Encoding
 * header, so fetch() won't auto-decompress them — calling `.text()` directly would
 * yield gzip binary that parses to garbage. We detect gzip by its magic bytes
 * (0x1f 0x8b) rather than the URL, so a plain-CSV body (an uncompressed asset, a
 * mirror that pre-decompresses, or a test mock) still works unchanged. Node-only
 * (Buffer / node:zlib); use on the Node.js runtime.
 */
export async function decodeDatasetText(response: Response): Promise<string> {
  const buf = Buffer.from(await response.arrayBuffer());
  const isGzip = buf.length > 1 && buf[0] === 0x1f && buf[1] === 0x8b;
  return isGzip ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
}

/** Fetch a dataset asset as text, transparently gunzipping `.gz` assets. */
export async function fetchNflverseText(key: NflverseDatasetKey, season: number, variant?: string): Promise<string> {
  const url = nflverseUrl(key, season, variant);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`nflverse fetch failed (${res.status}) for ${url}`);
  return decodeDatasetText(res);
}

/** Fetch + parse a dataset asset into row records. */
export async function fetchNflverse(key: NflverseDatasetKey, season: number, variant?: string): Promise<CsvTable> {
  return parseCsv(await fetchNflverseText(key, season, variant));
}
