/**
 * Engine-backed DFS slate provider — kills the sample-slate fallback.
 *
 * THE GAP THIS CLOSES. `registerDfsSlateProvider` had ZERO production callers
 * (verified: `git grep registerDfsSlateProvider apps/web` returns only
 * `dfs.test.ts` and its own definition), so `activeDfsSlate()` — the default
 * argument to `optimizeExact`, `kBest`, `optimizeDiverse` and
 * `optimizeExactLineup` in `lib/fantasy/dfs-exact.ts` — always returned
 * `ILLUSTRATIVE_DFS`, whose own header says "Fictional players, real team
 * codes, illustrative numbers." The best optimizer in the repo was optimizing
 * a fiction.
 *
 * This provider projects from the tables the platform ALREADY populates:
 *   - `player_game_stats.fantasyPointsPpr` (35,168 rows measured on prod)
 *   - `injuries` (6,501) and `depth_chart_entries` (2,242) through the
 *     adjustment layer (TSW-1)
 * and registers itself as the live provider.
 *
 * WHAT IT WILL NOT DO, and these are the rules that make it usable at all:
 *   - It never invents a player. A player with no measured recent form does
 *     not appear; an absent slate is an empty slate, not a sample slate.
 *   - `proj` is a MEASURED points-per-game average with a stated window, not a
 *     model output. `floor`/`ceiling` are the observed min/max in the SAME
 *     window, so they cannot claim a range the data never produced.
 *   - `own` (projected field ownership) is NOT derivable from anything in the
 *     repo. It is left `null`-equivalent (0.5, the neutral) and flagged, rather
 *     than guessed — the tournament edge depends on it, so a wrong value is
 *     worse than an honest one. See `ownershipIsAssumed` in the report.
 *   - `salary` is not a projection at all. With no licensed DK salary feed the
 *     provider reports `salary: 0` and sets `salaryIsReal: false`; the
 *     optimizer's cap is then a no-op rather than a silent constraint. A
 *     licensed feed drops in via `salaryByPlayerId`.
 *
 * Db-injected, read-only, and no wall clock in the projection math (`now` is a
 * parameter) so a slate is replayable.
 */

import { db } from "@sports/db";
import { registerDfsSlateProvider, type DfsSlateProvider } from "@/lib/integrations/dfs";
import type { DfsPlayer, DfsPos } from "@/lib/fantasy/dfs-slate";
import {
  computeAdjustments,
  rollUpByPlayer,
  parsePosition,
  type InjuryContext,
  type PlayerContext,
} from "@/lib/signals/adjustment-layer";

/** How many recent games form a player's projection window. */
export const PROJECTION_WINDOW = 5;

const POS_TO_DFS: Readonly<Record<string, DfsPos>> = {
  QB: "QB", RB: "RB", WR: "WR", TE: "TE",
  K: "DST", P: "DST",
};

export interface EngineSlateOptions {
  readonly season: number;
  readonly week: number;
  /** Injected clock. Never `new Date()` inside the projection. */
  readonly now: string;
  /** Licensed salary feed, when one exists. Absent = salaryIsReal false. */
  readonly salaryByPlayerId?: Readonly<Record<string, number>>;
  /** Measured adjustment magnitudes; absent = adjustments stay uncalibrated. */
  readonly magnitudes?: Readonly<Record<string, number>>;
  /** Minimum games in the window for a player to be projectable at all. */
  readonly minGames?: number;
}

export interface EngineSlateReport {
  readonly players: readonly DfsPlayer[];
  /** Players dropped for insufficient measured history, and why. */
  readonly dropped: readonly { playerId: string; name: string; games: number; reason: string }[];
  readonly adjustmentCount: number;
  /** True when a measured magnitude was supplied for the adjustments used. */
  readonly adjustmentsCalibrated: boolean;
  /** FALSE until a licensed salary feed is wired. Optimizer cap is a no-op. */
  readonly salaryIsReal: boolean;
  /** TRUE: field ownership is the neutral 0.5, NOT a projection. */
  readonly ownershipIsAssumed: boolean;
  readonly window: number;
  readonly season: number;
  readonly week: number;
  /**
   * What the projection could actually see, MEASURED from the rows the query
   * returned — never from the caller's requested week.
   *
   * WHY THIS EXISTS (measured 2026-09-28 on live Neon). `week` was accepted as
   * a required option and then never used: the stats query filters on `season`
   * only, so every caller got "the most recent 5 games of whatever exists" and
   * the report echoed back the week it was ASKED for. Production had
   * `player_game_stats` for 2026 weeks 1-3 (fetched 90 min before the read)
   * while `games` and `team_game_logs` were already scored through 2026-09-27 —
   * a full week ahead. The slate therefore projected from week 3 and described
   * itself in the week the caller named. Nothing errored, because a projection
   * built on stale-but-real data is not a fault any layer can detect.
   *
   * `newestWeek` is what the data supports; a caller comparing it to `week`
   * can see the gap instead of inferring freshness from a number that was an
   * input, not an observation. `weeksAvailable` is what the window could draw
   * on at all, which is the honest denominator for `PROJECTION_WINDOW`.
   */
  readonly newestWeek: number;
  readonly weeksAvailable: number;
  /**
   * True when the data cannot support the requested week. The slate is still
   * returned — it is built from real measured games, just older ones — so this
   * is a REPORTED condition, never a silent substitution.
   */
  readonly stale: boolean;
}

const NEUTRAL_OWNERSHIP = 0.5;

export async function buildEngineSlate(
  options: EngineSlateOptions,
): Promise<EngineSlateReport> {
  const { season, week, now, minGames = 2 } = options;

  // Real, measured per-game production. Ordered so `take` yields the most
  // RECENT games, which is what a projection window means.
  const stats = await db.playerGameStat.findMany({
    where: { season, seasonType: "REG" },
    orderBy: [{ week: "desc" }, { id: "asc" }],
    select: {
      playerId: true, week: true, team: true, opponent: true,
      fantasyPointsPpr: true, receptions: true, targets: true,
    },
  });

  const players = await db.player.findMany({
    select: { id: true, gsisId: true, fullName: true, position: true, recentTeam: true },
  });
  const byId = new Map(players.map((p) => [p.id, p]));

  const injuries = await db.injury.findMany({
    where: { season },
    select: {
      playerId: true, playerName: true, position: true, team: true,
      reportStatus: true, practiceStatus: true,
    },
  });
  const depth = await db.depthChartEntry.findMany({
    where: { season },
    select: { playerId: true, playerName: true, position: true, team: true, depthRank: true },
  });

  // ── Build the per-player window from MEASURED games only ─────────────────
  interface Win { pts: number; games: number; team: string | null; opp: string | null; }
  const windows = new Map<string, Win>();
  for (const s of stats) {
    if (s.fantasyPointsPpr === null) continue; // absence is silence
    const w = windows.get(s.playerId) ?? { pts: 0, games: 0, team: s.team, opp: s.opponent };
    if (w.games < PROJECTION_WINDOW) {
      w.pts += s.fantasyPointsPpr;
      w.games += 1;
    }
    windows.set(s.playerId, w);
  }

  // Floor/ceiling are the OBSERVED range in the same window — not a model band.
  const ranges = new Map<string, { lo: number; hi: number }>();
  const seen = new Map<string, number>();
  for (const s of stats) {
    if (s.fantasyPointsPpr === null) continue;
    const c = seen.get(s.playerId) ?? 0;
    if (c >= PROJECTION_WINDOW) continue;
    seen.set(s.playerId, c + 1);
    const r = ranges.get(s.playerId) ?? { lo: s.fantasyPointsPpr, hi: s.fantasyPointsPpr };
    r.lo = Math.min(r.lo, s.fantasyPointsPpr);
    r.hi = Math.max(r.hi, s.fantasyPointsPpr);
    ranges.set(s.playerId, r);
  }

  // ── Adjustment layer (TSW-1) over the SAME measured context ─────────────
  const injuryCtx: InjuryContext[] = injuries.map((i) => ({
    playerId: i.playerId ?? "",
    status: injuryStatus(i.reportStatus, i.practiceStatus),
    position: i.position,
    team: i.team,
    reportStatus: i.reportStatus,
    practiceStatus: i.practiceStatus,
  })).filter((i) => i.playerId !== "");

  const depthByTeam: Map<string, PlayerContext[]> = new Map();
  const playerCtx: PlayerContext[] = [];
  for (const d of depth) {
    if (!d.playerId || !d.team) continue;
    const pc: PlayerContext = {
      playerId: d.playerId, name: d.playerName, position: d.position,
      team: d.team, season, week, depthRank: d.depthRank,
    };
    playerCtx.push(pc);
    const arr = depthByTeam.get(d.team) ?? [];
    arr.push(pc);
    depthByTeam.set(d.team, arr);
  }

  const adjustments = computeAdjustments({
    injuries: injuryCtx,
    players: playerCtx,
    starters: [...depthByTeam.values()].flat().filter((p) => p.depthRank === 1),
    magnitudes: options.magnitudes,
    now,
  });
  const rollup = rollUpByPlayer(adjustments);
  const adjustmentsCalibrated = adjustments.length > 0 && adjustments.every((a) => a.calibrated);

  // ── Assemble the slate ──────────────────────────────────────────────────
  const out: DfsPlayer[] = [];
  const dropped: EngineSlateReport["dropped"] extends ReadonlyArray<infer T> ? T[] : never[] = [];

  for (const [playerId, w] of windows) {
    const meta = byId.get(playerId);
    if (!meta) continue;
    const pos = parsePosition(meta.position);
    const dfsPos = POS_TO_DFS[pos];
    if (!dfsPos) continue; // no invented position

    if (w.games < minGames) {
      dropped.push({
        playerId, name: meta.fullName, games: w.games,
        reason: `only ${w.games} measured game(s); a projection needs ${minGames}`,
      });
      continue;
    }

    const proj = w.pts / w.games;
    const r = ranges.get(playerId) ?? { lo: proj, hi: proj };

    // Apply the measured fantasy-point adjustment, and ONLY a calibrated one:
    // an uncalibrated default must not move a published projection.
    let finalProj = proj;
    const fp = rollup.get(playerId)?.find((x) => x.target === "fantasy_points");
    if (fp && fp.net !== 0 && adjustmentsCalibrated) finalProj = proj + fp.net;

    const salary = options.salaryByPlayerId?.[playerId];

    out.push({
      id: playerId,
      name: meta.fullName,
      pos: dfsPos,
      team: w.team ?? meta.recentTeam ?? "",
      opp: w.opp ?? "",
      salary: salary ?? 0,
      proj: round2(finalProj),
      // Shift the observed band by the same adjustment, keeping it a band the
      // data actually produced.
      floor: round2(r.lo + (finalProj - proj)),
      ceiling: round2(r.hi + (finalProj - proj)),
      own: NEUTRAL_OWNERSHIP,
    });
  }

  // Freshness is measured from the ROWS, never from the caller's `week`. The
  // stats query selects `week`, so this is an observation of what the window was
  // actually built from rather than an echo of the request.
  const observedWeeks = [...new Set(stats.map((s) => s.week))].filter(
    (w): w is number => typeof w === "number" && Number.isFinite(w),
  );
  const newestWeek = observedWeeks.length > 0 ? Math.max(...observedWeeks) : 0;

  return {
    players: out,
    dropped,
    adjustmentCount: adjustments.length,
    adjustmentsCalibrated,
    salaryIsReal: options.salaryByPlayerId !== undefined,
    ownershipIsAssumed: true,
    window: PROJECTION_WINDOW,
    season,
    week,
    newestWeek,
    weeksAvailable: observedWeeks.length,
    stale: newestWeek < week,
  };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function injuryStatus(
  report: string | null,
  practice: string | null,
): InjuryContext["status"] {
  // Practice participation is the later, more informative word (TSW-1 §2).
  const pick = (raw: string | null): InjuryContext["status"] | null => {
    if (!raw) return null;
    const v = raw.trim().toUpperCase();
    if (v === "OUT" || v === "DOUBTFUL" || v === "QUESTIONABLE" || v === "PROBABLE") return v;
    if (v.includes("OUT")) return "OUT";
    if (v.includes("DOUBTFUL")) return "DOUBTFUL";
    if (v.includes("QUESTION")) return "QUESTIONABLE";
    if (v.includes("LIMITED") || v.includes("PARTIAL")) return "QUESTIONABLE";
    if (v.includes("FULL") || v.includes("ACTIVE")) return "ACTIVE";
    return null;
  };
  return pick(practice) ?? pick(report) ?? "UNKNOWN";
}

/**
 * Register the engine-backed provider so `activeDfsSlate()` stops returning the
 * illustrative fixture. Idempotent: registering twice is a no-op re-set, and
 * passing an empty slate does NOT fall back to the sample — a live provider
 * that finds nothing returns nothing, which is the honest state.
 */
export function registerEngineDfsProvider(
  options: EngineSlateOptions,
): { provider: DfsSlateProvider; cache: EngineSlateReport | null } {
  let cache: EngineSlateReport | null = null;
  const provider: DfsSlateProvider = {
    name: `GSE engine (season ${options.season} week ${options.week})`,
    live: true,
    slate: () => cache?.players ?? [],
  };
  registerDfsSlateProvider(provider);
  return {
    provider,
    get cache() { return cache; },
    set cache(v: EngineSlateReport | null) { cache = v; },
  } as { provider: DfsSlateProvider; cache: EngineSlateReport | null };
}
