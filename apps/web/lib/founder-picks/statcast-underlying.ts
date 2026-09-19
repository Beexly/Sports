/**
 * Statcast → founder-picks "underlying" factor adapter.
 *
 * `factors.ts` (the founder-picks factor engine) is deliberately pure: it
 * never fetches and never fabricates a missing factor (see its file header).
 * This module is the fetch-side glue that sits in front of it: it loads real
 * MLB Statcast data from apps/web/lib/statcast, matches it to a named
 * player, and — only when the data genuinely supports it — produces the
 * exact `underlying` shape `FounderPickContext` expects
 * (`FounderUnderlyingFactor`, re-exported from ./factors).
 *
 * Doctrine (absence is absence, not a stand-in):
 *   - Source unreachable (bad HTTP, timeout, empty CSV)         -> no factor.
 *   - Player not found, or the name is ambiguous                -> no factor.
 *   - Sample too small to trust (below the PA/BF floor below)   -> no factor.
 * None of these ever falls back to a league-average, a zero, or any other
 * neutral stand-in for the player's own number — a stand-in dressed as a
 * real read is exactly the fabrication AGENTS.md rule 8 / law 8 forbids on
 * a founder's own published pick.
 *
 * Rights: this module adds NO gate of its own. `loadStatcastBatters` /
 * `loadStatcastPitchers` already call `assertIngestible("baseball-savant")`
 * before every fetch (apps/web/lib/statcast/index.ts) and return
 * `{status:"source-error"}` — never a throw, never a partial result — the
 * moment that source stops being ingestible. Re-checking the registry here
 * would be a second gate spelling the same rule a second way (the exact
 * anti-pattern AGENTS.md's adverse-edge-suppression section warns about:
 * two gates drift, and the drift direction that matters is "published
 * anyway"). So this module treats a "source-error" result from the loader
 * as ordinary unreachability and folds it into `status: "source-unreachable"`
 * below — nothing here decides ingestibility a second time.
 *
 * Never attaches model confidence to a founder pick: this module returns a
 * data point and a league comparison, nothing more. It has no opinion on a
 * pick's confidence, weight, or ranking — that number stays the founder's.
 */

import {
  findBatter,
  findPitcher,
  loadStatcastBatters,
  loadStatcastPitchers,
  type StatcastBatterLine,
  type StatcastPitcherLine,
} from "@/lib/statcast";
import type { FounderUnderlyingFactor } from "./factors";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type StatcastRole = "batter" | "pitcher";

/**
 * Minimum in-season sample before a Statcast rate stat is trusted as
 * supporting evidence for a founder pick. These are deliberately below full
 * batting-title qualification (~502 PA / season) — Baseball Savant's own
 * leaderboard endpoint already applies a prorated `min=q` qualification
 * filter, so most noise is filtered before it ever reaches this module.
 * These floors are a second, explicit, testable line so a very-early-season
 * or September-callup read (still technically "qualified" under a prorated
 * threshold) does not read as a settled process number. Chosen, not derived
 * from a formal study — stated here so the number can be argued with rather
 * than assumed.
 */
export const MIN_BATTER_SAMPLE_PA = 50;
export const MIN_PITCHER_SAMPLE_BF = 40;

export type BatterMetricKey = "hardHitPct" | "barrelPct" | "xwoba" | "ev" | "sprintSpeed";
export type PitcherMetricKey = "hardHitPct" | "barrelPct" | "xwoba" | "ev";

interface MetricDef<T> {
  readonly label: string;
  readonly higherIsBetter: boolean;
  readonly extract: (row: T) => number;
}

// Percentage-scale metrics (0-100) render cleanly through factors.ts's
// `.toFixed(1)` note formatting; decimal-scale ones (xwoba, ~0.200-0.500)
// render lossy at one decimal place there. factors.ts is shared across every
// sport this app has, so its formatting is not this module's call to change
// — callers who want xwOBA get it (typed and correct), with that rendering
// caveat documented rather than silently accepted.
const BATTER_METRICS: Readonly<Record<BatterMetricKey, MetricDef<StatcastBatterLine>>> = {
  hardHitPct: { label: "Hard-Hit % (Statcast)", higherIsBetter: true, extract: (r) => r.hardHitPct },
  barrelPct: { label: "Barrel % (Statcast)", higherIsBetter: true, extract: (r) => r.barrelPct },
  xwoba: { label: "xwOBA (Statcast)", higherIsBetter: true, extract: (r) => r.xwoba },
  ev: { label: "Avg Exit Velocity (Statcast)", higherIsBetter: true, extract: (r) => r.ev },
  sprintSpeed: { label: "Sprint Speed (Statcast)", higherIsBetter: true, extract: (r) => r.sprintSpeed },
};

// Pitcher metrics read the same underlying columns as ALLOWED to a pitcher,
// so lower is the better outcome for every one of them.
const PITCHER_METRICS: Readonly<Record<PitcherMetricKey, MetricDef<StatcastPitcherLine>>> = {
  hardHitPct: { label: "Hard-Hit % Allowed (Statcast)", higherIsBetter: false, extract: (r) => r.hardHitPct },
  barrelPct: { label: "Barrel % Allowed (Statcast)", higherIsBetter: false, extract: (r) => r.barrelPct },
  xwoba: { label: "xwOBA Allowed (Statcast)", higherIsBetter: false, extract: (r) => r.xwoba },
  ev: { label: "Avg Exit Velocity Allowed (Statcast)", higherIsBetter: false, extract: (r) => r.ev },
};

const DEFAULT_BATTER_METRIC: BatterMetricKey = "hardHitPct";
const DEFAULT_PITCHER_METRIC: PitcherMetricKey = "hardHitPct";

export interface StatcastUnderlyingRequest {
  readonly role: StatcastRole;
  /** Exact match tried first, then a last-name match — only if it is unique.
   *  Same rule as findBatter/findPitcher in apps/web/lib/statcast: an
   *  ambiguous last name (2+ players) resolves to "not found", never a
   *  guess. */
  readonly playerName: string;
  readonly season: number;
  readonly metric?: BatterMetricKey | PitcherMetricKey;
}

export type StatcastUnderlyingResult =
  | {
      readonly status: "ok";
      readonly factor: FounderUnderlyingFactor;
      readonly sampleSize: number;
      readonly poolSize: number;
    }
  | { readonly status: "not-found"; readonly reason: string }
  | { readonly status: "source-unreachable"; readonly reason: string }
  | {
      readonly status: "small-sample";
      readonly reason: string;
      readonly sampleSize: number;
      readonly minimumRequired: number;
    };

function poolAverage(values: readonly number[]): number | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((a, b) => a + b, 0) / finite.length;
}

/**
 * Load the Statcast "underlying" factor for one player, at pick-creation
 * time. Never throws — every failure mode returns a typed, explained status
 * instead. Use `statcastUnderlyingFactorOrNull` to collapse the result into
 * the `FounderPickContext["underlying"] | null` shape the factor engine
 * consumes directly.
 */
export async function loadStatcastUnderlyingFactor(
  request: StatcastUnderlyingRequest,
  fetcher: FetchLike = fetch,
): Promise<StatcastUnderlyingResult> {
  if (request.role === "batter") {
    const metricKey = request.metric ?? DEFAULT_BATTER_METRIC;
    const metric = BATTER_METRICS[metricKey as BatterMetricKey];
    const loaded = await loadStatcastBatters(request.season, fetcher).catch((e: unknown) => ({
      status: "source-error" as const,
      season: request.season,
      sourceRows: 0,
      rows: [] as readonly StatcastBatterLine[],
      error: e instanceof Error ? e.message : String(e),
    }));
    if (loaded.status !== "live") {
      return {
        status: "source-unreachable",
        reason: loaded.error ?? "Statcast batter leaderboard unavailable.",
      };
    }
    if (loaded.rows.length === 0) {
      return { status: "source-unreachable", reason: "Statcast batter leaderboard returned no rows." };
    }
    const player = findBatter(loaded.rows, request.playerName);
    if (!player) {
      return {
        status: "not-found",
        reason: `No unique Statcast batter match for "${request.playerName}" in ${request.season}.`,
      };
    }
    if (!Number.isFinite(player.pa) || player.pa < MIN_BATTER_SAMPLE_PA) {
      const sampleSize = Number.isFinite(player.pa) ? player.pa : 0;
      return {
        status: "small-sample",
        sampleSize,
        minimumRequired: MIN_BATTER_SAMPLE_PA,
        reason: `${request.playerName} has ${sampleSize} plate appearance(s) in ${request.season}, below the ${MIN_BATTER_SAMPLE_PA}-PA floor for a trustworthy underlying read.`,
      };
    }
    const value = metric.extract(player);
    if (!Number.isFinite(value)) {
      return {
        status: "not-found",
        reason: `${request.playerName}'s Statcast row has no usable ${metric.label} value.`,
      };
    }
    const leagueAvg = poolAverage(loaded.rows.map(metric.extract));
    if (leagueAvg == null) {
      return {
        status: "source-unreachable",
        reason: `Statcast leaderboard has no usable ${metric.label} values to compare against.`,
      };
    }
    return {
      status: "ok",
      sampleSize: player.pa,
      poolSize: loaded.rows.length,
      factor: { label: metric.label, value, leagueAvg, higherIsBetter: metric.higherIsBetter },
    };
  }

  // ── pitcher ────────────────────────────────────────────────────────────
  const metricKey = request.metric ?? DEFAULT_PITCHER_METRIC;
  const metric = PITCHER_METRICS[metricKey as PitcherMetricKey];
  const loaded = await loadStatcastPitchers(request.season, fetcher).catch((e: unknown) => ({
    status: "source-error" as const,
    season: request.season,
    sourceRows: 0,
    rows: [] as readonly StatcastPitcherLine[],
    error: e instanceof Error ? e.message : String(e),
  }));
  if (loaded.status !== "live") {
    return {
      status: "source-unreachable",
      reason: loaded.error ?? "Statcast pitcher leaderboard unavailable.",
    };
  }
  if (loaded.rows.length === 0) {
    return { status: "source-unreachable", reason: "Statcast pitcher leaderboard returned no rows." };
  }
  const player = findPitcher(loaded.rows, request.playerName);
  if (!player) {
    return {
      status: "not-found",
      reason: `No unique Statcast pitcher match for "${request.playerName}" in ${request.season}.`,
    };
  }
  if (!Number.isFinite(player.bf) || player.bf < MIN_PITCHER_SAMPLE_BF) {
    const sampleSize = Number.isFinite(player.bf) ? player.bf : 0;
    return {
      status: "small-sample",
      sampleSize,
      minimumRequired: MIN_PITCHER_SAMPLE_BF,
      reason: `${request.playerName} has faced ${sampleSize} batter(s) in ${request.season}, below the ${MIN_PITCHER_SAMPLE_BF}-BF floor for a trustworthy underlying read.`,
    };
  }
  const value = metric.extract(player);
  if (!Number.isFinite(value)) {
    return {
      status: "not-found",
      reason: `${request.playerName}'s Statcast row has no usable ${metric.label} value.`,
    };
  }
  const leagueAvg = poolAverage(loaded.rows.map(metric.extract));
  if (leagueAvg == null) {
    return {
      status: "source-unreachable",
      reason: `Statcast leaderboard has no usable ${metric.label} values to compare against.`,
    };
  }
  return {
    status: "ok",
    sampleSize: player.bf,
    poolSize: loaded.rows.length,
    factor: { label: metric.label, value, leagueAvg, higherIsBetter: metric.higherIsBetter },
  };
}

/**
 * Collapse a StatcastUnderlyingResult into the exact `underlying` shape
 * FounderPickContext takes — `null` on every non-"ok" status. This is the
 * one-line wiring point: `underlying: statcastUnderlyingFactorOrNull(result)`.
 */
export function statcastUnderlyingFactorOrNull(
  result: StatcastUnderlyingResult,
): FounderUnderlyingFactor | null {
  return result.status === "ok" ? result.factor : null;
}
