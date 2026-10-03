import { assertIngestible, decodeDatasetText, fetchWithFailover, parseCsv, withMirrors } from "@sports/data-ingestion";
import { checkClearance } from "@/lib/scraping/clearance-engine";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks } from "./qb-consensus";

/**
 * Rushing contact — PFR advanced charting (nflverse pfr_advstats variant 'rush',
 * CC-BY-4.0): yards AFTER contact per attempt (the back's own elusiveness/power,
 * independent of blocking), yards BEFORE contact per attempt (the line/scheme
 * term), and broken tackles. This is a SECOND, independent estimator of rushing
 * talent to triangulate against Next Gen RYOE/att — when both agree, confidence
 * rises; when they diverge, the read widens. Read-only, historical, honest
 * source-error; canPublishProjections false.
 */

export interface RushingContactRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly attempts: number;
  readonly yacPerAtt: number; // yards after contact / attempt — the talent term
  readonly ybcPerAtt: number; // yards before contact / attempt — the blocking term
  readonly brokenTackles: number;
  readonly brokenPerAtt: number;
  readonly yacPct: number; // YAC/att percentile in the pool
}

export interface RushingContact {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly sourceRows: number;
  readonly rows: readonly RushingContactRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const MIN_ATT = 40;
const TOP_N = 30;

// PFR advanced rushing ships as a single combined, all-seasons SEASON file (one
// row per player-season, plain CSV) — not the per-season weekly variant the
// generic nflverseUrl helper builds. Columns: season, player, pfr_id, tm, att,
// ybc, yac, brk_tkl, ...
const PFR_RUSH_SEASON_URL = "https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_season_rush.csv";

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function round(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

interface Agg { name: string; team: string; att: number; yac: number; ybc: number; brk: number }

/**
 * Aggregate PFR season rush rows into contact profiles for one season. Pure.
 *
 * The combined season file uses `pfr_id` / `player` / `tm` and carries one row
 * per player-season; we tolerate the weekly column aliases (`pfr_player_id` /
 * `pfr_player_name` / `team`) so synthetic/weekly inputs still parse. Rows are
 * filtered to `activeSeason` when a `season` column is present.
 */
export function buildRushingContact(records: readonly CsvRecord[], activeSeason: number): RushingContactRow[] {
  const byPlayer = new Map<string, Agg>();
  for (const r of records) {
    if (r["season"] !== undefined && num(r["season"]) !== activeSeason) continue;
    if (r["game_type"] !== undefined && r["game_type"] !== "REG") continue; // weekly files carry game_type; season files don't
    const id = r["pfr_id"] || r["pfr_player_id"];
    if (!id) continue;
    const a = byPlayer.get(id) ?? { name: r["player"] ?? r["pfr_player_name"] ?? "UNKNOWN", team: r["tm"] ?? r["team"] ?? "", att: 0, yac: 0, ybc: 0, brk: 0 };
    a.att += num(r["att"]);
    a.yac += num(r["yac"]);
    a.ybc += num(r["ybc"]);
    a.brk += num(r["brk_tkl"]);
    a.team = r["tm"] || r["team"] || a.team;
    byPlayer.set(id, a);
  }
  const qualified = [...byPlayer.entries()].filter(([, a]) => a.att >= MIN_ATT);
  if (qualified.length === 0) return [];

  const yacPcts = percentileRanks(qualified.map(([, a]) => (a.att ? a.yac / a.att : 0)));
  const rows = qualified.map(([id, a], i): RushingContactRow => ({
    playerId: id,
    name: a.name,
    team: a.team,
    attempts: a.att,
    yacPerAtt: round(a.att ? a.yac / a.att : 0),
    ybcPerAtt: round(a.att ? a.ybc / a.att : 0),
    brokenTackles: a.brk,
    brokenPerAtt: round(a.att ? a.brk / a.att : 0, 3),
    yacPct: Math.round(yacPcts[i] ?? 0),
  }));
  return rows.sort((x, y) => y.yacPerAtt - x.yacPerAtt).slice(0, TOP_N);
}

export async function loadRushingContact({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<RushingContact> {
  // PFR-specific clearance: pfr_advstats is a separate rights entry
  // (`pfr-advstats-via-nflverse`, permission_required, automation_allowed=false)
  // — NOT the generic nflverse CC-BY-4.0 envelope. A denial blocks before any fetch.
  const clearance = checkClearance({
    source_id: "pfr-advstats-via-nflverse",
    mode: "open_dataset_ingest",
    tool_id: "fetch-native",
    intents: ["derived_analytics"],
  });
  if (!clearance.allowed) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      sourceRows: 0,
      rows: [],
      canPublishProjections: false,
      note:
        "PFR advanced rushing charting is gated: pfr-advstats-via-nflverse requires " +
        "permission and is not cleared for automated extraction. The board shows an " +
        "empty state instead of unlicensed charting.",
      sourceUrl: PFR_RUSH_SEASON_URL,
      error: clearance.blocks.map((b) => b.code).join(", "),
    };
  }
  assertIngestible("nflverse");
  try {
    // One combined all-seasons file; decodeDatasetText passes plain CSV through.
    const { response } = await fetchWithFailover(withMirrors(PFR_RUSH_SEASON_URL), fetcher, { timeoutMs, init: { cache: "no-store" } });
    const { records } = parseCsv(await decodeDatasetText(response));
    if (records.length === 0) throw new Error("empty pfr advstats");
    // Try the requested season, then one back (the latest season can lag in the offseason).
    for (const candidate of [season, season - 1]) {
      const rows = buildRushingContact(records, candidate);
      if (rows.length > 0) {
        return {
          generatedAt: new Date().toISOString(),
          status: "live",
          season: candidate,
          sourceRows: records.length,
          rows,
          canPublishProjections: false,
          note: "PFR advanced rushing: yards after contact per carry (the back's own talent, blocking-independent) vs yards before contact (the line). An independent estimator to triangulate against Next Gen RYOE. Context, not a pick.",
          sourceUrl: PFR_RUSH_SEASON_URL,
          error: null,
        };
      }
    }
    throw new Error(`no qualified rush rows for ${season} or ${season - 1}`);
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      sourceRows: 0,
      rows: [],
      canPublishProjections: false,
      note: "PFR rushing charting could not load from nflverse. The board shows an empty state instead of fabricated contact data.",
      sourceUrl: PFR_RUSH_SEASON_URL,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
