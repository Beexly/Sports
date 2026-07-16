/**
 * Expected Fantasy Points (xFP) — the opportunity backbone.
 *
 * nflverse's ff_opportunity release models the fantasy points a player's usage
 * SHOULD have produced — expected points from the carries, targets, air yards,
 * and field position he actually saw — independent of whether the ball bounced
 * his way. Expected points are the single cleanest, most stable buy/sell lens in
 * fantasy: they persist far better than actual points (which swing on TD luck).
 *
 * How we USE it: compare each player's EXPECTED-points percentile to his ACTUAL
 * percentile (within position) and surface the gap — expected ≫ actual = buy-low
 * (the production is coming), actual ≫ expected = sell-high (running hot on
 * conversion luck). This is the master opportunity input behind the waiver tool
 * and the graded projections provider.
 *
 * LICENSE (corrected 2026-07-16): this dataset is ffverse ffopportunity, whose
 * README licenses the models AND the expected-points DATA as CC-BY-SA-4.0
 * (share-alike) — NOT the plain CC-BY-4.0 of the core nflverse releases this
 * header previously claimed. Share-alike is the license class the platform
 * excludes for published derivatives (same grounds as FTN), so while that
 * question is open nothing derived from ff_opportunity may be published to
 * customers as a value basis: the PUBLISHED graded pool excludes the xFP basis
 * by default (see lib/integrations/graded-pool.ts); internal/owner surfaces may
 * still compute it. Clearance is routed through the `ffverse-ffopportunity`
 * entry in the Source Rights Registry (commercial_display_allowed=false), and
 * this loader requests internal intents only — never commercial_display.
 * Multi-host failover, honest source-error. canPublishProjections false — it's
 * an opportunity read, not a point projection.
 */

import { decodeDatasetText, fetchWithFailover, parseCsv, withMirrors } from "@sports/data-ingestion";
import { checkClearance, wrapExtractedRecord, type ExtractedRecord } from "@/lib/scraping/clearance-engine";
import { getSourceRightsEntry } from "@/lib/scraping/source-rights-registry";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks } from "./qb-consensus";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type XfpSignal = "buy-low" | "sell-high" | "in-line";

export interface ExpectedPointsRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly games: number;
  readonly xfpTotal: number; // expected PPR points
  readonly xfpPerGame: number;
  readonly actualTotal: number; // expected + diff
  readonly diff: number; // actual − expected (luck/efficiency)
  readonly xfpPct: number; // expected-points percentile within position
  readonly prodPct: number; // actual-points percentile within position
  readonly signal: XfpSignal;
  readonly note: string;
}

export interface ExpectedPoints {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  /**
   * True when the payload was withheld at a CUSTOMER-DISPLAY boundary by the
   * Scraping Clearance Engine (commercial display of the CC-BY-SA ff_opportunity
   * data is not cleared) — a deliberate rights gate, not a fetch failure. See
   * lib/intelligence/expected-points-display.ts.
   */
  readonly rightsGated?: boolean;
  readonly season: number;
  readonly throughWeek: number | null;
  readonly sourceRows: number;
  readonly rows: readonly ExpectedPointsRow[];
  /** Rights envelope (RightsSnapshot inside) captured at extraction time; null on source-error. */
  readonly record: ExtractedRecord | null;
  readonly canPublishProjections: false;
  /** Registry attribution — must propagate to every derived output. */
  readonly attribution: string;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

/**
 * Attribution from the `ffverse-ffopportunity` rights entry. The registry
 * requires this line to propagate to ALL derived outputs (internal/owner
 * surfaces included). The literal fallback matches the registry entry and only
 * covers the impossible-in-practice case of the entry being removed.
 */
export const FF_OPPORTUNITY_ATTRIBUTION: string =
  getSourceRightsEntry("ffverse-ffopportunity")?.attribution_text ??
  "Expected points data from ffverse/ffopportunity (CC-BY-SA-4.0)";

// ffverse ships ff_opportunity as per-season plain-CSV release assets on the
// ffopportunity repo (tag `latest-data`, asset `ep_weekly_{season}.csv`), NOT a
// single combined gzip on nflverse-data. We try the active inspection season,
// then fall back one season so the board is never empty in the offseason gap.
const FF_OPP_BASE = "https://github.com/ffverse/ffopportunity/releases/download/latest-data";
function ffOppUrl(season: number): string {
  return `${FF_OPP_BASE}/ep_weekly_${season}.csv`;
}
const POSITIONS = ["QB", "RB", "WR", "TE"];
const MIN_GAMES = 2;
const MIN_XFP = 15;
const TOP_PER_POS = 30;
const DIVERGENCE = 18;

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function finite(v: string | undefined): number | null {
  const n = Number(v ?? "");
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : null;
}
function round(v: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/** Expected (and actual = expected + diff) PPR points for one weekly row, defensive across schema variants. */
function weekExpected(r: CsvRecord): { exp: number; diff: number } {
  const exp = finite(r["total_fantasy_points_exp"]) ?? num(r["rush_fantasy_points_exp"]) + num(r["rec_fantasy_points_exp"]);
  const diff = finite(r["total_fantasy_points_diff"]) ?? num(r["rush_fantasy_points_diff"]) + num(r["rec_fantasy_points_diff"]);
  return { exp, diff };
}

interface Agg { name: string; team: string; position: string; games: number; xfp: number; diff: number }

/** Build expected-points rows with within-position buy/sell signals. Pure. */
export function buildExpectedPoints(records: readonly CsvRecord[], activeSeason: number): { rows: ExpectedPointsRow[]; throughWeek: number | null } {
  const rows = records.filter((r) => num(r["season"]) === activeSeason && (r["season_type"] ? r["season_type"] === "REG" : true));
  if (rows.length === 0) return { rows: [], throughWeek: null };
  const throughWeek = rows.reduce((m, r) => Math.max(m, num(r["week"])), 0) || null;

  const byPlayer = new Map<string, Agg>();
  for (const r of rows) {
    const pos = (r["position"] ?? "").toUpperCase();
    if (!POSITIONS.includes(pos)) continue;
    const id = r["player_id"] || r["full_name"] || r["player_display_name"] || "";
    if (!id) continue;
    const { exp, diff } = weekExpected(r);
    const a = byPlayer.get(id) ?? { name: r["full_name"] ?? r["player_display_name"] ?? r["player_name"] ?? id, team: r["posteam"] ?? r["recent_team"] ?? "", position: pos, games: 0, xfp: 0, diff: 0 };
    a.games += 1;
    a.xfp += exp;
    a.diff += diff;
    a.team = r["posteam"] || r["recent_team"] || a.team;
    byPlayer.set(id, a);
  }

  const qualified = [...byPlayer.entries()].filter(([, a]) => a.games >= MIN_GAMES && a.xfp >= MIN_XFP);
  if (qualified.length === 0) return { rows: [], throughWeek };

  const out: ExpectedPointsRow[] = [];
  for (const pos of POSITIONS) {
    const group = qualified.filter(([, a]) => a.position === pos);
    if (group.length === 0) continue;
    const xfpPcts = percentileRanks(group.map(([, a]) => a.xfp));
    const prodPcts = percentileRanks(group.map(([, a]) => a.xfp + a.diff));
    group.forEach(([id, a], i) => {
      const xfpPct = Math.round(xfpPcts[i] ?? 0);
      const prodPct = Math.round(prodPcts[i] ?? 0);
      const gap = xfpPct - prodPct;
      const signal: XfpSignal = gap >= DIVERGENCE ? "buy-low" : gap <= -DIVERGENCE ? "sell-high" : "in-line";
      out.push({
        playerId: id,
        name: a.name,
        team: a.team,
        position: pos,
        games: a.games,
        xfpTotal: round(a.xfp),
        xfpPerGame: round(a.games ? a.xfp / a.games : 0),
        actualTotal: round(a.xfp + a.diff),
        diff: round(a.diff),
        xfpPct,
        prodPct,
        signal,
        note:
          signal === "buy-low"
            ? "Expected points outrun actual. The usage says the production is coming. Buy-low before it corrects."
            : signal === "sell-high"
              ? "Actual points outrun expected. Running hot on conversion luck. Sell-high before it regresses."
              : "Actual tracks expected. The points are earned by the opportunity.",
      });
    });
  }

  const perPos = new Map<string, number>();
  const ranked = out.sort((a, b) => b.xfpPerGame - a.xfpPerGame).filter((r) => {
    const n = (perPos.get(r.position) ?? 0) + 1;
    perPos.set(r.position, n);
    return n <= TOP_PER_POS;
  });
  return { rows: ranked, throughWeek };
}

export async function loadExpectedPoints({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<ExpectedPoints> {
  // Rights gate: ffverse-ffopportunity (CC-BY-SA-4.0). Internal intents only —
  // commercial_display is deliberately NOT requested (the registry blocks it while
  // the share-alike question is open). A block stops the job before any fetch.
  const clearance = checkClearance({
    source_id: "ffverse-ffopportunity",
    mode: "open_dataset_ingest",
    tool_id: "fetch-native",
    intents: ["internal_analysis", "storage", "derived_analytics"],
  });
  if (!clearance.allowed) {
    throw new Error(
      `ff_opportunity ingestion blocked by the Scraping Clearance Engine: ` +
      clearance.blocks.map((b) => b.code).join(", "),
    );
  }
  // ff_opportunity is one plain-CSV asset PER season. Try the requested season,
  // then fall back one season so the offseason gap (no current-season weeks yet)
  // still renders the most recent completed season instead of an empty state.
  const candidates = [season, season - 1];
  let lastError = "no candidate seasons";
  let lastUrl = ffOppUrl(season);
  for (const candidate of candidates) {
    const url = ffOppUrl(candidate);
    lastUrl = url;
    try {
      // cache:no-store — multi-MB weekly asset; keep it out of Next's data cache.
      const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs, init: { cache: "no-store" } });
      const { records } = parseCsv(await decodeDatasetText(response));
      if (records.length === 0) { lastError = `empty ff_opportunity ${candidate}`; continue; }
      const { rows, throughWeek } = buildExpectedPoints(records, candidate);
      if (rows.length === 0) { lastError = `no qualified rows for ${candidate}`; continue; }
      // Envelope: every extracted record carries the RightsSnapshot captured at
      // extraction time (mirrors adp-source.ts; throws if clearance were absent).
      const record = wrapExtractedRecord(clearance, url, {
        season: candidate,
        throughWeek,
        sourceRows: records.length,
        rows,
      });
      return {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        throughWeek,
        sourceRows: records.length,
        rows,
        record,
        canPublishProjections: false,
        attribution: FF_OPPORTUNITY_ATTRIBUTION,
        note: "Expected fantasy points from ffverse ff_opportunity: what a player's real usage should have produced. We surface expected-vs-actual as buy-low / sell-high. The opportunity backbone, not a point projection.",
        sourceUrl: url,
        error: null,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "UNKNOWN";
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season: 0,
    throughWeek: null,
    sourceRows: 0,
    rows: [],
    record: null,
    canPublishProjections: false,
    attribution: FF_OPPORTUNITY_ATTRIBUTION,
    note: "Expected points could not load from ffverse ff_opportunity. The board shows an empty state instead of fabricated expectations.",
    sourceUrl: lastUrl,
    error: lastError,
  };
}
