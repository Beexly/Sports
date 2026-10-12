/**
 * Real DFS slate loader — the optimizer's player pool, from measured data.
 *
 * This is the registration the DFS Process System always lacked: the page
 * (and any server caller) asks HERE for the current slate, and gets one of
 * three honest answers:
 *
 *   - "real"        — a pool built by `buildEngineSlate` from MEASURED Neon
 *                     data (`player_game_stats.fantasyPointsPpr`, injuries,
 *                     depth charts, the TSW-1 adjustment layer). Projections
 *                     are measured last-5-game means; floor/ceiling are the
 *                     observed range in the same window.
 *   - "empty"       — the build ran and produced no pool (no measured data
 *                     for the current week). The optimizer stands empty.
 *   - "unavailable" — the build could not run (data layer unreachable). The
 *                     optimizer stands empty, with the reason attached.
 *
 * The sample fixture is NEVER substituted, at any point, for any reason.
 *
 * WHAT IS STILL NOT REAL, stated rather than smoothed over:
 *   - Salaries. DraftKings salaries reach this repo only through licensed
 *     providers (SportsDataIO / FantasyData — see `./salaries`); DK's own
 *     endpoint is forbidden. Until a key is configured there are no real
 *     salaries: engine players carry `salary: 0`, the cap does not bind,
 *     and `salaryIsReal` is false. When a licensed feed IS live, its rows
 *     are returned as a separate map and applied ONLY by a caller that has
 *     already passed the entitlement gate — licensed rows must never ride
 *     this loader into an unentitled response.
 *   - Ownership. Not derivable from any repo source. The engine emits the
 *     neutral 0.5 and this loader flags `ownershipIsAssumed: true`.
 *   - Defense/special teams. Defenses are not player rows in the measured
 *     tables, so the pool can lack a true DST; `missingPositions` says which
 *     roster positions the pool cannot fill, so the UI can explain an
 *     unbuildable lineup instead of blaming the user's constraints.
 *
 * The engine build is imported dynamically: this module must load (and fail
 * closed to "unavailable") even where the DB layer cannot initialize.
 */

import { registerDfsSlateProvider } from "@/lib/integrations/dfs";
import { DFS_SLOTS, type DfsPlayer, type DfsPos } from "@/lib/fantasy/dfs-slate";
import type { EngineSlateReport } from "@/lib/fantasy/engine-slate";
import { loadDfsSalaries, type DfsSalaries } from "./salaries";

export type RealSlateKind = "real" | "empty" | "unavailable";

export interface RealDfsSlate {
  readonly kind: RealSlateKind;
  /** The measured pool. Empty unless kind is "real". Salaries NOT applied. */
  readonly players: readonly DfsPlayer[];
  readonly season: number | null;
  readonly week: number | null;
  readonly generatedAt: string;
  /** Projection window the engine measured over (games). */
  readonly window: number | null;
  /** Players the engine dropped for insufficient measured history. */
  readonly droppedCount: number;
  /** True only when a licensed salary feed is connected (see header). */
  readonly salaryFeedLive: boolean;
  /** Licensed salaries by normalized player key — apply via applySalaries,
   *  and only behind the entitlement gate. Empty when no feed is live. */
  readonly salaryByKey: ReadonlyMap<string, number>;
  /** How many pool players a licensed salary exists for. */
  readonly salaryCoverage: number;
  /** TRUE: ownership is the neutral placeholder, not a projection. */
  readonly ownershipIsAssumed: boolean;
  /** TRUE when measured adjustment magnitudes moved the projections. */
  readonly adjustmentsCalibrated: boolean;
  /** Roster positions present in the pool. */
  readonly positionsCovered: readonly DfsPos[];
  /** Roster positions (incl. DST) with NO measured player in the pool. */
  readonly missingPositions: readonly DfsPos[];
  /** Why kind is "unavailable", or null. */
  readonly reason: string | null;
}

/** Injectable seams so the loader is testable without a database. */
export interface RealSlateDeps {
  readonly latestPeriod?: () => Promise<{ season: number; week: number } | null>;
  readonly buildSlate?: (options: {
    season: number;
    week: number;
    now: string;
  }) => Promise<EngineSlateReport>;
  readonly loadSalaries?: () => Promise<DfsSalaries>;
  readonly now?: () => string;
}

const ROSTER_POSITIONS: readonly DfsPos[] = ["QB", "RB", "WR", "TE", "DST"];

/** Normalized join key for licensed salary rows ↔ engine players. */
export function salaryKey(name: string, team: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  const t = team.toLowerCase().trim();
  return `${n}|${t}`;
}

/**
 * Apply licensed salaries to a measured pool. Pure. A player with no
 * licensed row keeps `salary: 0` — the absence stays visible rather than
 * being filled with a plausible number.
 */
export function applySalaries(
  players: readonly DfsPlayer[],
  salaryByKey: ReadonlyMap<string, number>,
): { players: readonly DfsPlayer[]; covered: number } {
  let covered = 0;
  const out = players.map((p) => {
    const salary = salaryByKey.get(salaryKey(p.name, p.team));
    if (salary === undefined) return p;
    covered += 1;
    return { ...p, salary };
  });
  return { players: out, covered };
}

function positionsOf(players: readonly DfsPlayer[]): {
  covered: readonly DfsPos[];
  missing: readonly DfsPos[];
} {
  const present = new Set(players.map((p) => p.pos));
  const order = (p: DfsPos): number => DFS_SLOTS.indexOf(p);
  const covered = ROSTER_POSITIONS.filter((p) => present.has(p)).sort((a, b) => order(a) - order(b));
  const missing = ROSTER_POSITIONS.filter((p) => !present.has(p));
  return { covered, missing };
}

async function defaultLatestPeriod(): Promise<{ season: number; week: number } | null> {
  const { db } = await import("@sports/db");
  const latest = await db.playerGameStat.findFirst({
    orderBy: [{ season: "desc" }, { week: "desc" }],
    select: { season: true, week: true },
  });
  return latest ? { season: latest.season, week: latest.week } : null;
}

async function defaultBuildSlate(options: {
  season: number;
  week: number;
  now: string;
}): Promise<EngineSlateReport> {
  const { buildEngineSlate } = await import("@/lib/fantasy/engine-slate");
  return buildEngineSlate(options);
}

let cache: { readonly key: string; readonly expiresAt: number; readonly value: RealDfsSlate } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function resetRealDfsSlateCacheForTests(): void {
  cache = null;
}

function unavailable(reason: string, generatedAt: string): RealDfsSlate {
  return {
    kind: "unavailable",
    players: [],
    season: null,
    week: null,
    generatedAt,
    window: null,
    droppedCount: 0,
    salaryFeedLive: false,
    salaryByKey: new Map(),
    salaryCoverage: 0,
    ownershipIsAssumed: true,
    adjustmentsCalibrated: false,
    positionsCovered: [],
    missingPositions: ROSTER_POSITIONS,
    reason,
  };
}

/**
 * Load the current real DFS slate. Fail-closed: any failure in the data
 * layer yields kind "unavailable" with an empty pool — never a fallback to
 * the sample fixture. On success the measured pool is also registered into
 * the sync provider seam (registration alone flips nothing; the founder's
 * DFS_PROVIDER env still gates `activeDfsSlate()`, per law 3).
 */
export async function loadRealDfsSlate(deps: RealSlateDeps = {}): Promise<RealDfsSlate> {
  const now = deps.now?.() ?? new Date().toISOString();
  const latestPeriod = deps.latestPeriod ?? defaultLatestPeriod;
  const buildSlate = deps.buildSlate ?? defaultBuildSlate;
  const loadSalaries = deps.loadSalaries ?? (() => loadDfsSalaries());

  let period: { season: number; week: number } | null;
  try {
    period = await latestPeriod();
  } catch {
    return unavailable("measured data layer unreachable", now);
  }
  if (!period) return unavailable("no measured games recorded yet", now);

  const cacheKey = `${period.season}-${period.week}`;
  if (!deps.buildSlate && cache && cache.key === cacheKey && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  let report: EngineSlateReport;
  try {
    report = await buildSlate({ season: period.season, week: period.week, now });
  } catch {
    return unavailable("engine slate build failed", now);
  }

  // Licensed salaries ride separately (entitlement-gated application).
  let salaryFeedLive = false;
  const salaryByKey = new Map<string, number>();
  try {
    const salaries = await loadSalaries();
    if (salaries.status === "live" && salaries.rows.length > 0) {
      salaryFeedLive = true;
      for (const row of salaries.rows) {
        salaryByKey.set(salaryKey(row.name, row.team), row.salary);
      }
    }
  } catch {
    // A failed salary feed must not sink the measured pool; salaries stay absent.
    salaryFeedLive = false;
  }
  const { covered: salaryCoverage } = applySalaries(report.players, salaryByKey);

  const { covered, missing } = positionsOf(report.players);
  const value: RealDfsSlate = {
    kind: report.players.length > 0 ? "real" : "empty",
    players: report.players,
    season: period.season,
    week: period.week,
    generatedAt: now,
    window: report.window,
    droppedCount: report.dropped.length,
    salaryFeedLive,
    salaryByKey,
    salaryCoverage,
    ownershipIsAssumed: report.ownershipIsAssumed,
    adjustmentsCalibrated: report.adjustmentsCalibrated,
    positionsCovered: covered,
    missingPositions: missing,
    reason: null,
  };

  // Register the measured pool at the sync seam so server-side callers that
  // go through activeDfsSlate() (behind the founder env gate) serve real
  // data in this process. An empty pool registers an empty slate — the
  // honest state — never the fixture.
  try {
    registerDfsSlateProvider({
      name: `GSE engine real slate (season ${period.season} week ${period.week})`,
      live: true,
      slate: () => value.players,
    });
  } catch {
    // Registration is a convenience for same-process callers; its failure
    // must not sink the load the page is about to render from directly.
  }

  if (!deps.buildSlate) {
    cache = { key: cacheKey, expiresAt: Date.now() + CACHE_TTL_MS, value };
  }
  return value;
}
