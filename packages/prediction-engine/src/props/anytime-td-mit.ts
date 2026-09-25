// Adapted from CHZN1/nfl-anytime-td-model (MIT) — methodology re-implemented for GSE.
/**
 * W4 — Anytime-TD probability model with EV integration.
 *
 * Rolling role features (snap share, red-zone share, target share) with
 * leakage guards via V1 probes. Outputs calibrated anytime-TD probability
 * and expected value against a market price.
 *
 * COMPOSES WITH: props/conditional-td.ts (marginalization),
 * W1 calibration-gates (post-hoc calibration), V1 leakage-antipatterns.
 */

import { marginalizeConditionalTD, type ConditionalTdInputs } from "./conditional-td.js";

export interface RollingRoleFeatures {
  /** Games in the rolling window. */
  readonly windowGames: number;
  /** Mean snap share over prior weeks ONLY (0–1). Null → missing. */
  readonly snapShare: number | null;
  /** Mean red-zone touch share over prior weeks ONLY (0–1). */
  readonly redZoneShare: number | null;
  /** Mean target/rush share over prior weeks ONLY (0–1). */
  readonly usageShare: number | null;
  /** Team plays per game (prior weeks). */
  readonly teamPlaysPerGame: number | null;
  /** Opponent defensive TD rate allowed (prior weeks). */
  readonly oppTdRateAllowed: number | null;
}

export interface PlayerRoleContext {
  readonly playerId: string;
  readonly season: number;
  readonly week: number;
  readonly position: "RB" | "WR" | "TE" | "QB";
  readonly isHome: boolean;
  readonly rolling: RollingRoleFeatures;
  /** Injury designation as-of prediction time. Null → unknown, never imputed. */
  readonly injuryStatus: "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "PROBABLE" | "HEALTHY" | null;
}

export interface AnytimeTdResult {
  readonly probability: number;
  /** Market decimal odds; null → EV cannot be computed. */
  readonly ev: number | null;
  readonly fairOdds: number;
  readonly featuresUsed: readonly string[];
  readonly failClosed: boolean;
  readonly reason?: string;
}

export interface MarketPrice {
  /** Decimal odds for anytime TD. */
  readonly decimalOdds: number | null;
}

const BASE_RATES: Record<PlayerRoleContext["position"], number> = {
  RB: 0.38,
  WR: 0.22,
  TE: 0.18,
  QB: 0.12,
};

const INJURY_MULTIPLIER: Record<
  NonNullable<PlayerRoleContext["injuryStatus"]>,
  number
> = {
  HEALTHY: 1.0,
  PROBABLE: 0.97,
  QUESTIONABLE: 0.72,
  DOUBTFUL: 0.35,
  OUT: 0.0,
};

/**
 * Compute anytime-TD probability from rolling role features.
 * Fail-closed when required features are missing — never imputed.
 */
export function anytimeTdProbability(ctx: PlayerRoleContext | null | undefined): AnytimeTdResult {
  const featuresUsed = [
    "position_base_rate",
    "snapShare",
    "redZoneShare",
    "usageShare",
    "oppTdRateAllowed",
    "injuryStatus",
    "isHome",
  ];

  if (!ctx || !ctx.rolling) {
    return {
      probability: Number.NaN,
      ev: null,
      fairOdds: Number.NaN,
      featuresUsed,
      failClosed: true,
      reason: "missing player role context",
    };
  }

  const { rolling } = ctx;
  if (
    rolling.snapShare === null ||
    !Number.isFinite(rolling.snapShare) ||
    rolling.snapShare < 0 ||
    rolling.snapShare > 1
  ) {
    return {
      probability: Number.NaN,
      ev: null,
      fairOdds: Number.NaN,
      featuresUsed,
      failClosed: true,
      reason: "missing or invalid rolling snapShare",
    };
  }
  if (
    rolling.redZoneShare === null ||
    !Number.isFinite(rolling.redZoneShare) ||
    rolling.redZoneShare < 0
  ) {
    return {
      probability: Number.NaN,
      ev: null,
      fairOdds: Number.NaN,
      featuresUsed,
      failClosed: true,
      reason: "missing or invalid rolling redZoneShare",
    };
  }
  if (rolling.usageShare === null || !Number.isFinite(rolling.usageShare) || rolling.usageShare < 0) {
    return {
      probability: Number.NaN,
      ev: null,
      fairOdds: Number.NaN,
      featuresUsed,
      failClosed: true,
      reason: "missing or invalid rolling usageShare",
    };
  }

  const base = BASE_RATES[ctx.position] ?? BASE_RATES.RB;

  // Role multiplier: snap share is the strongest lever
  const snapMult = 0.55 + 0.9 * rolling.snapShare;
  // Red-zone share is concentrated scoring
  const rzMult = 1 + 1.4 * Math.min(rolling.redZoneShare, 1);
  // Usage share adjusts opportunity
  const usageMult = 0.7 + 0.6 * Math.min(rolling.usageShare * 2, 1);

  // Opponent defense: higher allowed rate → easier TD
  const oppMult =
    rolling.oppTdRateAllowed === null || !Number.isFinite(rolling.oppTdRateAllowed)
      ? 1.0
      : 0.7 + 0.6 * Math.min(Math.max(rolling.oppTdRateAllowed, 0), 2);

  const injuryMult =
    ctx.injuryStatus === null
      ? 1.0
      : (INJURY_MULTIPLIER[ctx.injuryStatus] ?? 1.0);

  const homeMult = ctx.isHome ? 1.06 : 0.95;

  let p = base * snapMult * rzMult * usageMult * oppMult * injuryMult * homeMult;
  p = Math.min(Math.max(p, 1e-4), 0.92);

  return {
    probability: Number(p.toFixed(4)),
    ev: null,
    fairOdds: Number((1 / p).toFixed(3)),
    featuresUsed,
    failClosed: false,
  };
}

/**
 * Integrate market price → EV. EV = p * decimalOdds − 1.
 * Fail-closed on missing/non-positive odds.
 */
export function integrateEv(
  result: AnytimeTdResult,
  price: MarketPrice | null | undefined,
): AnytimeTdResult {
  if (result.failClosed) return result;
  if (!price || price.decimalOdds === null || !Number.isFinite(price.decimalOdds) || price.decimalOdds <= 1) {
    return {
      ...result,
      ev: null,
      reason: "missing or invalid market decimalOdds — EV not computed",
    };
  }
  const ev = result.probability * price.decimalOdds - 1;
  return {
    ...result,
    ev: Number(ev.toFixed(4)),
  };
}

/**
 * Conditional anytime-TD given game script (first-down / TD marginalization).
 * Composes with props/conditional-td.ts.
 */
export function conditionalAnytimeTd(
  ctx: PlayerRoleContext,
  inputs: ConditionalTdInputs,
): number {
  const base = anytimeTdProbability(ctx);
  if (base.failClosed) return Number.NaN;
  const conditional = marginalizeConditionalTD(inputs);
  if (!Number.isFinite(conditional)) return Number.NaN;
  // Blend: 60% role model, 40% game-script marginalization
  return Number((0.6 * base.probability + 0.4 * conditional).toFixed(4));
}

/**
 * Rolling role features from prior-week game logs.
 * Only games strictly before `asOfWeek` are used — no future leakage.
 */
export function rollingRoleFeatures(
  logs: readonly {
    readonly week: number;
    readonly snapShare: number | null;
    readonly redZoneShare: number | null;
    readonly usageShare: number | null;
    readonly teamPlays: number | null;
  }[],
  asOfWeek: number,
  window = 4,
): RollingRoleFeatures {
  const prior = logs
    .filter((g) => g.week < asOfWeek)
    .sort((a, b) => a.week - b.week)
    .slice(-Math.max(1, window));

  const meanOf = (sel: (g: (typeof prior)[0]) => number | null): number | null => {
    const vals = prior.map(sel).filter((v): v is number => v !== null && Number.isFinite(v));
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  return {
    windowGames: prior.length,
    snapShare: meanOf((g) => g.snapShare),
    redZoneShare: meanOf((g) => g.redZoneShare),
    usageShare: meanOf((g) => g.usageShare),
    teamPlaysPerGame: meanOf((g) => g.teamPlays),
    oppTdRateAllowed: null,
  };
}
