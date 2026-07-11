/**
 * MLB Stats API ingestion — pitcher season lines for the glass-box fantasy
 * engine (@sports/fantasy-engine RVS reliever pool + BURR team bullpen
 * categories).
 *
 * Source posture (source-rights registry: "mlb-statsapi"): official league
 * API, public logged-off, no key. MLBAM's notice permits only individual,
 * non-commercial, non-bulk use of raw Materials, so this adapter is
 * compute-and-discard: bounded season-aggregate reads, raw payloads never
 * persisted, every fetch REQUIRES a SourceClearanceProof from the app-side
 * gate (apps/web/lib/ingestion/fantasy-mlb-gate.ts). Derived engine scores
 * are our own work product (Feist; C.B.C. v. MLBAM, 505 F.3d 818 (8th Cir.
 * 2007)).
 *
 * Schema verified LIVE 2026-07-11 against
 *   /api/v1/stats?stats=season&group=pitching&season=YYYY&sportIds=1&playerPool=all
 * - era / whip / groundOutsToAirouts arrive as DECIMAL STRINGS ("3.47");
 *   counting stats (saves, holds, strikeOuts, battersFaced, …) are numbers.
 * - inningsPitched is a string in BASEBALL NOTATION: the fractional digit is
 *   thirds of an inning ("609.1" = 609⅓), NOT a decimal.
 * - inheritedRunners / inheritedRunnersScored are present at player grain.
 * - totalSplits on the first stats group drives pagination.
 *
 * The mapping mirrors the reference engine's data prep verbatim (reliever =
 * pure relief appearances: gamesStarted 0, gamesPitched ≥ 1; league FIP
 * constant from the reliever pool; LOB% from components; IP-weighted GO/AO),
 * so adapter output feeds computeRvs/computeBurr on the same conventions the
 * golden fixtures were generated under.
 */

import type { RelieverSeason, TeamBullpenCategories } from "@sports/fantasy-engine";
import type { TeamStatcastAllowed } from "./baseball-savant-source.js";
import { noStoreFetch } from "./no-store-fetch.js";
import { assertCleared, type SourceClearanceProof } from "./source-clearance.js";

export const MLB_STATSAPI_SOURCE_ID = "mlb-statsapi";
export const MLB_STATSAPI_BASE = "https://statsapi.mlb.com/api/v1";

export class MlbStatsApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "MlbStatsApiError";
  }
}

// ── Parsing primitives ────────────────────────────────────────────────────────

/**
 * Innings pitched in baseball notation → real innings: the fractional digit
 * counts THIRDS ("10.1" = 10⅓, "10.2" = 10⅔). Anything else is malformed →
 * NaN (never silently misread ".1" as a tenth).
 */
export function ipToInnings(ip: string): number {
  const m = /^(\d+)(?:\.([012]))?$/.exec(ip.trim());
  if (!m) return Number.NaN;
  return Number(m[1]) + (m[2] === undefined ? 0 : Number(m[2]) / 3);
}

function int(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function numOr(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}

// ── Season line ───────────────────────────────────────────────────────────────

/** One player-season pitching split as served (one row per player-stint). */
export interface MlbPitcherSeasonLine {
  readonly playerId: number;
  readonly playerName: string;
  /** Split's team; null on combined multi-team totals rows. */
  readonly teamName: string | null;
  readonly gamesPitched: number;
  readonly gamesStarted: number;
  /** Real innings (thirds resolved). */
  readonly inningsPitched: number;
  readonly saves: number;
  readonly holds: number;
  readonly blownSaves: number;
  readonly saveOpportunities: number;
  readonly earnedRuns: number;
  readonly runs: number;
  readonly hits: number;
  readonly baseOnBalls: number;
  readonly hitByPitch: number;
  readonly strikeOuts: number;
  readonly homeRuns: number;
  readonly battersFaced: number;
  readonly inheritedRunners: number;
  readonly inheritedRunnersScored: number;
  /** GO/AO as served; reference-engine default 1.0 (neutral) when absent. */
  readonly goAo: number;
}

/** Defensive parse of the stats response. Pure; unknown shapes → []. */
export function parseMlbPitchingStats(json: unknown): {
  readonly lines: MlbPitcherSeasonLine[];
  readonly totalSplits: number;
} {
  const root = json as { stats?: ReadonlyArray<{ totalSplits?: number; splits?: readonly unknown[] }> };
  const group = root?.stats?.[0];
  const splits = Array.isArray(group?.splits) ? group.splits : [];
  const lines: MlbPitcherSeasonLine[] = [];
  for (const raw of splits) {
    const sp = raw as {
      stat?: Record<string, unknown>;
      player?: { id?: unknown; fullName?: unknown };
      team?: { name?: unknown };
    };
    const st = sp.stat;
    const playerId = int(sp.player?.id);
    if (!st || playerId === 0) continue;
    lines.push({
      playerId,
      playerName: typeof sp.player?.fullName === "string" ? sp.player.fullName : String(playerId),
      teamName: typeof sp.team?.name === "string" ? sp.team.name : null,
      gamesPitched: int(st["gamesPitched"]),
      gamesStarted: int(st["gamesStarted"]),
      inningsPitched: numOr(
        typeof st["inningsPitched"] === "string" ? ipToInnings(st["inningsPitched"]) : Number.NaN,
        0,
      ),
      saves: int(st["saves"]),
      holds: int(st["holds"]),
      blownSaves: int(st["blownSaves"]),
      saveOpportunities: int(st["saveOpportunities"]),
      earnedRuns: int(st["earnedRuns"]),
      runs: int(st["runs"]),
      hits: int(st["hits"]),
      baseOnBalls: int(st["baseOnBalls"]),
      hitByPitch: int(st["hitByPitch"]),
      strikeOuts: int(st["strikeOuts"]),
      homeRuns: int(st["homeRuns"]),
      battersFaced: int(st["battersFaced"]),
      inheritedRunners: int(st["inheritedRunners"]),
      inheritedRunnersScored: int(st["inheritedRunnersScored"]),
      goAo: numOr(st["groundOutsToAirouts"], 1.0),
    });
  }
  return { lines, totalSplits: int(group?.totalSplits) };
}

// ── Reliever pool ─────────────────────────────────────────────────────────────

/** A per-player consolidated line (multi-team stints summed). */
export interface ConsolidatedPitcherLine extends Omit<MlbPitcherSeasonLine, "teamName" | "goAo"> {
  /** Team of the largest stint (display key); null when no stint had a team. */
  readonly teamName: string | null;
  /** IP-weighted GO/AO across the summed stints. */
  readonly goAo: number;
}

/**
 * Consolidate stint rows per player. If a player has any team-attributed
 * rows, ONLY those are summed (a no-team combined-totals row would double
 * count them); a no-team row is used only when it is the player's sole row.
 * Robust to either response layout without guessing which one statsapi picks.
 */
export function consolidateByPlayer(
  lines: readonly MlbPitcherSeasonLine[],
): ConsolidatedPitcherLine[] {
  const byPlayer = new Map<number, MlbPitcherSeasonLine[]>();
  for (const line of lines) {
    const list = byPlayer.get(line.playerId) ?? [];
    list.push(line);
    byPlayer.set(line.playerId, list);
  }
  const out: ConsolidatedPitcherLine[] = [];
  for (const rows of byPlayer.values()) {
    const teamRows = rows.filter((r) => r.teamName !== null);
    const use = teamRows.length > 0 ? teamRows : rows;
    const first = use[0]!;
    const sum = (read: (r: MlbPitcherSeasonLine) => number) =>
      use.reduce((s, r) => s + read(r), 0);
    const ip = sum((r) => r.inningsPitched);
    const largest = use.reduce((a, b) => (b.inningsPitched > a.inningsPitched ? b : a), first);
    out.push({
      playerId: first.playerId,
      playerName: first.playerName,
      teamName: largest.teamName,
      gamesPitched: sum((r) => r.gamesPitched),
      gamesStarted: sum((r) => r.gamesStarted),
      inningsPitched: ip,
      saves: sum((r) => r.saves),
      holds: sum((r) => r.holds),
      blownSaves: sum((r) => r.blownSaves),
      saveOpportunities: sum((r) => r.saveOpportunities),
      earnedRuns: sum((r) => r.earnedRuns),
      runs: sum((r) => r.runs),
      hits: sum((r) => r.hits),
      baseOnBalls: sum((r) => r.baseOnBalls),
      hitByPitch: sum((r) => r.hitByPitch),
      strikeOuts: sum((r) => r.strikeOuts),
      homeRuns: sum((r) => r.homeRuns),
      battersFaced: sum((r) => r.battersFaced),
      inheritedRunners: sum((r) => r.inheritedRunners),
      inheritedRunnersScored: sum((r) => r.inheritedRunnersScored),
      goAo: ip > 0 ? sum((r) => r.goAo * r.inningsPitched) / ip : 1.0,
    });
  }
  return out;
}

/** Reference-engine reliever definition: pure relief appearances. */
export function isReliever(line: { gamesStarted: number; gamesPitched: number }): boolean {
  return line.gamesStarted === 0 && line.gamesPitched >= 1;
}

/**
 * League FIP constant from the reliever pool (reference convention — computed
 * over ALL relievers, before any innings floor): C = lgERA − FIP components.
 */
export function relieverFipConstant(pool: readonly ConsolidatedPitcherLine[]): number {
  let hr = 0, bb = 0, hbp = 0, k = 0, ip = 0, er = 0;
  for (const r of pool) {
    hr += r.homeRuns;
    bb += r.baseOnBalls;
    hbp += r.hitByPitch;
    k += r.strikeOuts;
    ip += r.inningsPitched;
    er += r.earnedRuns;
  }
  if (ip <= 0) return Number.NaN;
  const lgEra = (9 * er) / ip;
  return lgEra - (13 * hr + 3 * (bb + hbp) - 2 * k) / ip;
}

function fipFor(line: ConsolidatedPitcherLine, fipConstant: number): number {
  const ip = Math.max(line.inningsPitched, 1);
  return (
    (13 * line.homeRuns + 3 * (line.baseOnBalls + line.hitByPitch) - 2 * line.strikeOuts) / ip +
    fipConstant
  );
}

/** RelieverSeason for computeRvs, paired with display identity. */
export interface AdapterRelieverRow {
  readonly playerId: number;
  readonly playerName: string;
  readonly teamName: string | null;
  readonly season: RelieverSeason;
}

/**
 * Build the RVS population from consolidated lines. Pool = relievers with
 * ≥ minInnings IP (reference floor 5); kMinusBb and FIP computed on the
 * reference formulas (BF and IP clipped to ≥1 so empty lines stay finite).
 */
export function buildRelieverSeasons(
  consolidated: readonly ConsolidatedPitcherLine[],
  opts: { readonly minInnings?: number } = {},
): { readonly relievers: AdapterRelieverRow[]; readonly fipConstant: number } {
  const pool = consolidated.filter(isReliever);
  const fipConstant = relieverFipConstant(pool);
  const minInnings = opts.minInnings ?? 5;
  const relievers = pool
    .filter((r) => r.inningsPitched >= minInnings)
    .map((r) => {
      const bf = Math.max(r.battersFaced, 1);
      return {
        playerId: r.playerId,
        playerName: r.playerName,
        teamName: r.teamName,
        season: {
          id: String(r.playerId),
          gamesPitched: r.gamesPitched,
          saves: r.saves,
          holds: r.holds,
          blownSaves: r.blownSaves,
          saveOpportunities: r.saveOpportunities,
          kMinusBb: r.strikeOuts / bf - r.baseOnBalls / bf,
          fip: fipFor(r, fipConstant),
        },
      };
    });
  return { relievers, fipConstant };
}

// ── Team bullpen categories (BURR input) ──────────────────────────────────────

/**
 * Aggregate team-attributed reliever stint rows → TeamBullpenCategories,
 * on the reference formulas exactly:
 *   ERA 9·ER/IP · FIP from summed components + pool constant · K%/BB% per BF ·
 *   HR/9 · WHIP (H+BB)/IP · LOB% (H+BB+HBP−R)/(H+BB+HBP−1.4·HR) ·
 *   strand 1−IRS/IR (null when IR=0) · SV/(SV+BS) (null when no chances) ·
 *   IP-weighted GO/AO. Statcast-allowed columns come from the Savant
 *   PA-weighted map; a team missing there gets NaN, which computeBurr treats
 *   as neutral (1.0) rather than fabricating a value.
 *
 * Pass the SAME consolidated pool used for buildRelieverSeasons via
 * `fipConstant` so both surfaces share one league constant.
 */
export function buildTeamBullpenCategories(
  stintLines: readonly MlbPitcherSeasonLine[],
  fipConstant: number,
  teamStatcast: ReadonlyMap<string, TeamStatcastAllowed>,
): TeamBullpenCategories[] {
  const byTeam = new Map<string, MlbPitcherSeasonLine[]>();
  for (const line of stintLines) {
    if (line.teamName === null || !isReliever(line)) continue;
    const list = byTeam.get(line.teamName) ?? [];
    list.push(line);
    byTeam.set(line.teamName, list);
  }

  const out: TeamBullpenCategories[] = [];
  for (const [team, rows] of byTeam) {
    const sum = (read: (r: MlbPitcherSeasonLine) => number) =>
      rows.reduce((s, r) => s + read(r), 0);
    const ip = sum((r) => r.inningsPitched);
    const bf = Math.max(sum((r) => r.battersFaced), 1);
    if (ip <= 0) continue;
    const h = sum((r) => r.hits);
    const bb = sum((r) => r.baseOnBalls);
    const hbp = sum((r) => r.hitByPitch);
    const k = sum((r) => r.strikeOuts);
    const hr = sum((r) => r.homeRuns);
    const runs = sum((r) => r.runs);
    const er = sum((r) => r.earnedRuns);
    const ir = sum((r) => r.inheritedRunners);
    const irs = sum((r) => r.inheritedRunnersScored);
    const sv = sum((r) => r.saves);
    const bs = sum((r) => r.blownSaves);
    const kPct = k / bf;
    const bbPct = bb / bf;
    const statcast = teamStatcast.get(team);
    out.push({
      team,
      era: (9 * er) / ip,
      fip: (13 * hr + 3 * (bb + hbp) - 2 * k) / ip + fipConstant,
      kPct,
      bbPct,
      kMinusBb: kPct - bbPct,
      hrPer9: (9 * hr) / ip,
      whip: (h + bb) / ip,
      lob: (h + bb + hbp - runs) / Math.max(h + bb + hbp - 1.4 * hr, 1e-9),
      inheritedStrandRate: ir > 0 ? 1 - irs / ir : null,
      saveConversion: sv + bs > 0 ? sv / (sv + bs) : null,
      goAo: sum((r) => r.goAo * r.inningsPitched) / ip,
      xwobaAllowed: statcast?.xwobaAllowed ?? Number.NaN,
      barrelAllowed: statcast?.barrelAllowed ?? Number.NaN,
      hardHitAllowed: statcast?.hardHitAllowed ?? Number.NaN,
    });
  }
  return out.sort((a, b) => a.team.localeCompare(b.team));
}

/** playerId → teamName map for the Savant join (reliever stints only). */
export function relieverPidToTeam(
  consolidated: readonly ConsolidatedPitcherLine[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const r of consolidated) {
    if (isReliever(r) && r.teamName !== null) map.set(r.playerId, r.teamName);
  }
  return map;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 500;
/** Hard page ceiling: ~900 MLB pitcher-seasons exist; 10 pages = 5000 splits. */
const MAX_PAGES = 10;

/**
 * Fetch every player pitching season split for one season (paginated on
 * totalSplits). REQUIRES a granted clearance proof for "mlb-statsapi" — no
 * ungated overload exists. One bounded season-aggregate read; non-bulk.
 */
export async function fetchMlbPitcherSeasons(
  season: number,
  proof: SourceClearanceProof,
  fetchImpl: typeof globalThis.fetch = noStoreFetch,
): Promise<MlbPitcherSeasonLine[]> {
  assertCleared(proof, MLB_STATSAPI_SOURCE_ID);
  const all: MlbPitcherSeasonLine[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      stats: "season",
      group: "pitching",
      season: String(season),
      sportIds: "1",
      playerPool: "all",
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const url = `${MLB_STATSAPI_BASE}/stats?${params.toString()}`;
    const res = await fetchImpl(url, {
      headers: { accept: "application/json", "x-source-id": MLB_STATSAPI_SOURCE_ID },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      throw new MlbStatsApiError(`MLB Stats API fetch failed: HTTP ${res.status}`, res.status);
    }
    const { lines, totalSplits } = parseMlbPitchingStats(await res.json());
    all.push(...lines);
    offset += PAGE_SIZE;
    if (lines.length === 0 || offset >= totalSplits) break;
  }
  return all;
}
