/**
 * Player Intelligence model — the canonical, data-driven player layer.
 *
 * One comprehensive profile per skill player, mined from the full nflverse
 * player_stats_week advanced field set, not a single cherry-picked metric:
 *   • Efficiency (EPA family): combined EPA/play, DAKOTA, PACR, RACR.
 *   • Opportunity: WOPR, target share, air-yards share, touches.
 *   • Production: PPR points + per game.
 * Each anchor is converted to a WITHIN-POSITION percentile (a QB's EPA is judged
 * vs QBs, a WR's WOPR vs WRs), then combined into a position-aware composite
 * PROCESS GRADE (0–100). We then compare process to production and surface the
 * gap — buy-low (process ≫ production → it's coming) / sell-high (production ≫
 * process → it's leaving) — the same disagreement-surfaced doctrine, now as one
 * grade that can DRIVE the waiver tool, optimizer, draft board, and projections.
 *
 * Defensive parsing: any missing column simply drops out of the composite, so a
 * thin season degrades gracefully instead of fabricating. Real nflverse data,
 * multi-host failover; canPublishProjections false (it's a process grade, not a
 * point projection).
 */

import { assertIngestible, decodeDatasetText, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks } from "./qb-consensus";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ModelPosition = "QB" | "RB" | "WR" | "TE";
export type ProcessSignal = "buy-low" | "sell-high" | "in-line";

export interface PlayerProfile {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: ModelPosition;
  readonly games: number;
  readonly plays: number;
  readonly fantasyPpr: number;
  readonly fppg: number;
  readonly epaPerPlay: number;
  readonly touches: number;
  readonly wopr: number | null;
  readonly targetShare: number | null;
  readonly dakota: number | null;
  readonly pacr: number | null;
  /** Position-aware composite of the predictive anchors, 0-100. */
  readonly processGrade: number;
  readonly productionPct: number;
  readonly signal: ProcessSignal;
  readonly note: string;
}

export interface PlayerModel {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly throughWeek: number | null;
  readonly sourceRows: number;
  readonly metricsPerPlayer: number;
  readonly profiles: readonly PlayerProfile[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

const POSITIONS: readonly ModelPosition[] = ["QB", "RB", "WR", "TE"];
const DIVERGENCE = 18;
const TOP_PER_POS = 24;

// Predictive anchors that feed the composite process grade, by position.
const ANCHORS: Record<ModelPosition, readonly (keyof Pick<PlayerProfile, "epaPerPlay" | "touches" | "wopr" | "targetShare" | "dakota" | "pacr">)[]> = {
  QB: ["epaPerPlay", "dakota", "pacr"],
  RB: ["touches", "epaPerPlay"],
  WR: ["wopr", "targetShare", "epaPerPlay"],
  TE: ["wopr", "targetShare", "epaPerPlay"],
};

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function finite(v: string | undefined): number | null {
  const n = Number(v ?? "");
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : null;
}
function round(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

interface Agg {
  name: string; team: string; position: ModelPosition; games: number;
  plays: number; touches: number; fantasyPpr: number;
  epaSum: number; epaN: number;
  woprSum: number; woprN: number; tsSum: number; tsN: number;
  dakotaSum: number; dakotaN: number; pacrSum: number; pacrN: number;
}

/**
 * Build comprehensive per-player profiles with position-aware composite grades. Pure.
 * `topPerPos` caps each position for a scannable display board (default 24); pass a
 * large value (e.g. Infinity) for statistical uses like the predictiveness backtest,
 * where capping to the leaders would bias the sample.
 */
export function buildPlayerModel(records: readonly CsvRecord[], activeSeason: number, options: { topPerPos?: number } = {}): { profiles: PlayerProfile[]; throughWeek: number | null } {
  const topPerPos = options.topPerPos ?? TOP_PER_POS;
  const rows = records.filter((r) => r["season"] === String(activeSeason) && r["season_type"] === "REG");
  if (rows.length === 0) return { profiles: [], throughWeek: null };
  const throughWeek = rows.reduce((m, r) => Math.max(m, num(r["week"])), 0) || null;

  const byPlayer = new Map<string, Agg>();
  for (const r of rows) {
    const pos = (r["position"] ?? "").toUpperCase();
    if (!POSITIONS.includes(pos as ModelPosition)) continue;
    const id = r["player_id"] || r["player_display_name"] || "";
    if (!id) continue;
    const a = byPlayer.get(id) ?? { name: r["player_display_name"] ?? id, team: r["recent_team"] ?? "", position: pos as ModelPosition, games: 0, plays: 0, touches: 0, fantasyPpr: 0, epaSum: 0, epaN: 0, woprSum: 0, woprN: 0, tsSum: 0, tsN: 0, dakotaSum: 0, dakotaN: 0, pacrSum: 0, pacrN: 0 };

    a.games += 1;
    const plays = num(r["attempts"]) + num(r["carries"]) + num(r["targets"]);
    a.plays += plays;
    a.touches += num(r["carries"]) + num(r["targets"]);
    a.fantasyPpr += num(r["fantasy_points_ppr"]);
    const epa = num(r["passing_epa"]) + num(r["rushing_epa"]) + num(r["receiving_epa"]);
    if (plays > 0) { a.epaSum += epa; a.epaN += plays; }
    const wopr = finite(r["wopr"]); if (wopr != null) { a.woprSum += wopr; a.woprN += 1; }
    const ts = finite(r["target_share"]); if (ts != null) { a.tsSum += ts; a.tsN += 1; }
    const dak = finite(r["dakota"]); if (dak != null) { a.dakotaSum += dak; a.dakotaN += 1; }
    const pacr = finite(r["pacr"]); if (pacr != null) { a.pacrSum += pacr; a.pacrN += 1; }
    a.team = r["recent_team"] || a.team;
    byPlayer.set(id, a);
  }

  // Minimum involvement so percentiles are meaningful (position-appropriate).
  const minPlays: Record<ModelPosition, number> = { QB: 80, RB: 40, WR: 25, TE: 20 };
  const base = [...byPlayer.entries()]
    .filter(([, a]) => a.plays >= minPlays[a.position])
    .map(([id, a]) => ({
      id,
      a,
      epaPerPlay: a.epaN ? a.epaSum / a.epaN : 0,
      wopr: a.woprN ? a.woprSum / a.woprN : null,
      targetShare: a.tsN ? a.tsSum / a.tsN : null,
      dakota: a.dakotaN ? a.dakotaSum / a.dakotaN : null,
      pacr: a.pacrN ? a.pacrSum / a.pacrN : null,
    }));

  const profiles: PlayerProfile[] = [];
  for (const pos of POSITIONS) {
    const group = base.filter((p) => p.a.position === pos);
    if (group.length === 0) continue;

    // Within-position percentiles for every anchor + production.
    const pcts: Record<string, number[]> = {};
    const fieldValues = (key: string): number[] =>
      group.map((p) => {
        if (key === "epaPerPlay") return p.epaPerPlay;
        if (key === "touches") return p.a.touches;
        if (key === "wopr") return p.wopr ?? 0;
        if (key === "targetShare") return p.targetShare ?? 0;
        if (key === "dakota") return p.dakota ?? 0;
        if (key === "pacr") return p.pacr ?? 0;
        return 0;
      });
    for (const key of ANCHORS[pos]) pcts[key] = percentileRanks(fieldValues(key));
    const prodPcts = percentileRanks(group.map((p) => p.a.fantasyPpr));

    group.forEach((p, i) => {
      const anchorPcts = ANCHORS[pos].map((key) => pcts[key]![i]!);
      const processGrade = Math.round(anchorPcts.reduce((s, v) => s + v, 0) / anchorPcts.length);
      const productionPct = Math.round(prodPcts[i] ?? 0);
      const gap = processGrade - productionPct;
      const signal: ProcessSignal = gap >= DIVERGENCE ? "buy-low" : gap <= -DIVERGENCE ? "sell-high" : "in-line";
      const note =
        signal === "buy-low"
          ? "Process grade outruns the box score. The underlying inputs say the production is coming. Acquire before the market reprices."
          : signal === "sell-high"
            ? "Production outruns the process grade. It's running hotter than the inputs support. Sell into the value."
            : "Process and production are aligned. The output is earned by the inputs.";

      profiles.push({
        playerId: p.id,
        name: p.a.name,
        team: p.a.team,
        position: pos,
        games: p.a.games,
        plays: p.a.plays,
        fantasyPpr: round(p.a.fantasyPpr, 1),
        fppg: round(p.a.games ? p.a.fantasyPpr / p.a.games : 0, 1),
        epaPerPlay: round(p.epaPerPlay, 3),
        touches: p.a.touches,
        wopr: p.wopr == null ? null : round(p.wopr, 3),
        targetShare: p.targetShare == null ? null : round(p.targetShare, 3),
        dakota: p.dakota == null ? null : round(p.dakota, 3),
        pacr: p.pacr == null ? null : round(p.pacr, 2),
        processGrade,
        productionPct,
        signal,
        note,
      });
    });
  }

  // Highest process grade first, capped per position for a scannable board.
  const perPos = new Map<ModelPosition, number>();
  const ranked = profiles.sort((a, b) => b.processGrade - a.processGrade).filter((p) => {
    const n = (perPos.get(p.position) ?? 0) + 1;
    perPos.set(p.position, n);
    return n <= topPerPos;
  });
  return { profiles: ranked, throughWeek };
}

/**
 * Short in-process TTL cache for the LIVE (default-fetcher) path only. The
 * source asset is multi-MB and refreshes weekly, so 10 minutes is far inside
 * epistemic safety — this exists because two sibling premium routes
 * (roster-advice + waiver-war-room) each load the model per request, and an
 * uncached multi-MB fetch behind a per-minute rate limiter is a
 * cost-amplification vector (red-team finding, DEC-028). Mirrors the
 * module-cache pattern adp-source.ts and the Sleeper player map already use.
 * Injected fetchers (tests) BYPASS the cache entirely so every existing test
 * keeps its exact behavior; failures are never cached (stay retryable).
 */
const PLAYER_MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const playerModelCache = new Map<number, { readonly expiresAt: number; readonly value: PlayerModel }>();

export function resetPlayerModelCacheForTests(): void {
  playerModelCache.clear();
}

export async function loadPlayerModel({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<PlayerModel> {
  assertIngestible("nflverse");
  const useCache = fetcher === fetch;
  if (useCache) {
    const hit = playerModelCache.get(season);
    if (hit && hit.expiresAt > Date.now() && hit.value.status === "live") return hit.value;
  }
  const url = nflverseUrl("player_stats_week", season);
  try {
    // cache:no-store — these assets are multi-MB and refresh weekly; they must
    // never enter Next's data cache (>2MB items error and aren't cached anyway).
    const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs, init: { cache: "no-store" } });
    const { records } = parseCsv(await decodeDatasetText(response));
    if (records.length === 0) throw new Error("empty player_stats_week");
    const hasSeason = records.some((r) => r["season"] === String(season) && r["season_type"] === "REG");
    const activeSeason = hasSeason ? season : records.reduce((m, r) => Math.max(m, num(r["season"])), 0);
    const { profiles, throughWeek } = buildPlayerModel(records, activeSeason);
    const value: PlayerModel = {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: activeSeason,
      throughWeek,
      sourceRows: records.length,
      metricsPerPlayer: 10,
      profiles,
      canPublishProjections: false,
      note: "One canonical advanced profile per player: EPA efficiency, opportunity, and volume combined into a position-aware process grade, with the process-vs-production gap surfaced (buy-low / sell-high). The data layer that drives the tools. Context, not a point projection.",
      sourceUrl: url,
      error: null,
    };
    // Live results only — a failure is never cached (stays retryable). Keyed
    // by the REQUESTED season so a fallback-resolved season still caches under
    // the key the next identical call will look up.
    if (useCache) playerModelCache.set(season, { expiresAt: Date.now() + PLAYER_MODEL_CACHE_TTL_MS, value });
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      throughWeek: null,
      sourceRows: 0,
      metricsPerPlayer: 0,
      profiles: [],
      canPublishProjections: false,
      note: "The player model could not load from nflverse. The board shows an empty state instead of fabricated grades.",
      sourceUrl: url,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
