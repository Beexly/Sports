import { db } from "@sports/db";
import { checkClearance } from "@/lib/scraping/clearance-engine";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks } from "./qb-consensus";

/**
 * Rushing contact — PFR advanced charting (nflverse pfr_advstats variant 'rush'):
 * yards AFTER contact per attempt (the back's own elusiveness/power,
 * independent of blocking), yards BEFORE contact per attempt (the line/scheme
 * term), and broken tackles. This is a SECOND, independent estimator of rushing
 * talent to triangulate against Next Gen RYOE/att — when both agree, confidence
 * rises; when they diverge, the read widens. Read-only, historical, honest
 * source-error; canPublishProjections false.
 *
 * C-355: this loader no longer fetches a direct URL. The ONLY write path is
 * apps/web/lib/ingestion/pfr-adv-stats.ts (ingestPfrAdvStats), which the
 * refresh-player-stats cron runs as a satellite and which persists REG rows
 * into `pfr_adv_stats` (statType=rush). This module reads those rows.
 *
 * Rights citation — source-rights-registry.ts `pfr-advstats-via-nflverse`
 * (status: permission_required, automation_allowed: false; verdict 2026-07-16,
 * reports/rights/pfr-advstats-verdict-2026-07-16.md). The nflverse pfr_advstats
 * RELEASE is the route; PFR direct stays `forbidden` in
 * packages/data-ingestion/src/source-registry.ts (`pro-football-reference`,
 * `sports-reference`). Until written confirmation from Sports Reference LLC
 * lands, the ingester returns clearance-denied and this board shows an empty
 * state instead of unlicensed charting.
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
  /** Citation only — this module never fetches. The ingester owns the write. */
  readonly sourceUrl: string;
  readonly error: string | null;
}

const MIN_ATT = 40;
const TOP_N = 30;

// Citation of the release the ingester consumes (not a fetch URL).
const NFLVERSE_PFR_ADVSTATS_TAG = "https://github.com/nflverse/nflverse-data/releases/tag/pfr_advstats";

function round(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/** Weekly REG rows the pfr-adv-stats ingester wrote into `pfr_adv_stats`. */
export interface PfrRushDbRow {
  readonly pfrPlayerId: string;
  readonly playerName: string;
  readonly team: string | null;
  readonly carries: number | null;
  readonly rushingYardsAfterContact: number | null;
  readonly rushingYardsBeforeContact: number | null;
  readonly rushingBrokenTackles: number | null;
}

interface Agg {
  name: string;
  team: string;
  att: number;
  yac: number;
  ybc: number;
  brk: number;
}

/**
 * Aggregate persisted PfrAdvStat rush rows into contact profiles. Pure.
 * Sums weekly REG carries / yards / broken tackles per PFR player id.
 */
export function buildRushingContactFromDb(rows: readonly PfrRushDbRow[]): RushingContactRow[] {
  const byPlayer = new Map<string, Agg>();
  for (const r of rows) {
    const id = r.pfrPlayerId;
    if (!id) continue;
    const a = byPlayer.get(id) ?? { name: r.playerName || "UNKNOWN", team: r.team ?? "", att: 0, yac: 0, ybc: 0, brk: 0 };
    a.att += r.carries ?? 0;
    a.yac += r.rushingYardsAfterContact ?? 0;
    a.ybc += r.rushingYardsBeforeContact ?? 0;
    a.brk += r.rushingBrokenTackles ?? 0;
    a.team = r.team || a.team;
    byPlayer.set(id, a);
  }
  const qualified = [...byPlayer.entries()].filter(([, a]) => a.att >= MIN_ATT);
  if (qualified.length === 0) return [];

  const yacPcts = percentileRanks(qualified.map(([, a]) => (a.att ? a.yac / a.att : 0)));
  const contactRows = qualified.map(([id, a], i): RushingContactRow => ({
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
  return contactRows.sort((x, y) => y.yacPerAtt - x.yacPerAtt).slice(0, TOP_N);
}

export async function loadRushingContact({
  season = latestNflverseInspectionSeason(),
}: { season?: number } = {}): Promise<RushingContact> {
  // PFR-specific clearance: pfr_advstats is a separate rights entry
  // (`pfr-advstats-via-nflverse`, permission_required, automation_allowed=false)
  // — NOT the generic nflverse CC-BY-4.0 envelope. A denial means the board
  // shows an empty state instead of unlicensed charting.
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
      sourceUrl: NFLVERSE_PFR_ADVSTATS_TAG,
      error: clearance.blocks.map((b) => b.code).join(", "),
    };
  }
  try {
    // Read what the ingester already stored. Try the requested season, then
    // one back (the latest season can lag in the offseason).
    for (const candidate of [season, season - 1]) {
      const rows = await db.pfrAdvStat.findMany({
        where: { season: candidate, statType: "rush", seasonType: "REG" },
        select: {
          pfrPlayerId: true,
          playerName: true,
          team: true,
          carries: true,
          rushingYardsAfterContact: true,
          rushingYardsBeforeContact: true,
          rushingBrokenTackles: true,
        },
      });
      const list = Array.isArray(rows) ? (rows as PfrRushDbRow[]) : [];
      const contactRows = buildRushingContactFromDb(list);
      if (contactRows.length > 0) {
        return {
          generatedAt: new Date().toISOString(),
          status: "live",
          season: candidate,
          sourceRows: list.length,
          rows: contactRows,
          canPublishProjections: false,
          note: "PFR advanced rushing: yards after contact per carry (the back's own talent, blocking-independent) vs yards before contact (the line). An independent estimator to triangulate against Next Gen RYOE. Context, not a pick.",
          sourceUrl: NFLVERSE_PFR_ADVSTATS_TAG,
          error: null,
        };
      }
    }
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      sourceRows: 0,
      rows: [],
      canPublishProjections: false,
      note:
        "No persisted PFR advanced rush rows for this season. The refresh-player-stats " +
        "cron writes them via ingestPfrAdvStats once the release is cleared and published.",
      sourceUrl: NFLVERSE_PFR_ADVSTATS_TAG,
      error: `no stored pfr_adv_stats rush rows for ${season} or ${season - 1}`,
    };
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      sourceRows: 0,
      rows: [],
      canPublishProjections: false,
      note: "PFR rushing charting could not load from the ingester's store. The board shows an empty state instead of fabricated contact data.",
      sourceUrl: NFLVERSE_PFR_ADVSTATS_TAG,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
