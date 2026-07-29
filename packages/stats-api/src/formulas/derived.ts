/**
 * Pure derived formulas on cleared bases (nflverse CC-BY etc.).
 * Density without inventing accuracy / win-rate claims.
 * Every formula returns value + cohort key for honesty.
 */

export interface FormulaResult<T = number> {
  value: T;
  formulaId: string;
  cohort: string;
  n: number;
  licenseSpdx: string;
  attributionRequired: boolean;
  attributionText?: string;
  ok: boolean;
  refuseCode?: string;
}

export function restDays(
  lastGameMs: number,
  asOfMs: number,
  opts: { n?: number; cohort?: string } = {},
): FormulaResult {
  if (!Number.isFinite(lastGameMs) || !Number.isFinite(asOfMs) || asOfMs < lastGameMs) {
    return {
      value: NaN,
      formulaId: "derived.rest_days",
      cohort: opts.cohort ?? "schedule.asof",
      n: 0,
      licenseSpdx: "CC-BY-4.0",
      attributionRequired: true,
      ok: false,
      refuseCode: "invalid_schedule_window",
    };
  }
  const days = Math.max(0, (asOfMs - lastGameMs) / 86_400_000);
  const n = opts.n ?? 1;
  return {
    value: Math.round(days * 100) / 100,
    formulaId: "derived.rest_days",
    cohort: opts.cohort ?? "schedule.asof",
    n,
    licenseSpdx: "CC-BY-4.0",
    attributionRequired: true,
    attributionText: "Derived from nflverse schedules (CC-BY-4.0).",
    ok: n >= 1 && Number.isFinite(days),
    refuseCode: n < 1 ? "empty_schedule" : undefined,
  };
}

/** Rolling mean with min-n refuse-default */
export function rollingMean(
  values: readonly number[],
  window: number,
  opts: { cohort?: string; nMin?: number; formulaId?: string } = {},
): FormulaResult {
  const nMin = opts.nMin ?? 8;
  const w = Math.max(1, window);
  const slice = values.slice(-w).filter((v) => Number.isFinite(v));
  const n = slice.length;
  if (n < nMin) {
    return {
      value: NaN,
      formulaId: opts.formulaId ?? `derived.roll_mean.w${w}`,
      cohort: opts.cohort ?? `roll.w${w}`,
      n,
      licenseSpdx: "CC-BY-4.0",
      attributionRequired: true,
      ok: false,
      refuseCode: "n_below_floor",
    };
  }
  const mean = slice.reduce((a, b) => a + b, 0) / n;
  return {
    value: Math.round(mean * 1e6) / 1e6,
    formulaId: opts.formulaId ?? `derived.roll_mean.w${w}`,
    cohort: opts.cohort ?? `roll.w${w}`,
    n,
    licenseSpdx: "CC-BY-4.0",
    attributionRequired: true,
    attributionText: "Rolling formula on cleared play-by-play base.",
    ok: true,
  };
}

export function successRateRoll(
  successes: readonly number[],
  attempts: readonly number[],
  window: number,
): FormulaResult {
  const w = Math.max(1, window);
  const s = successes.slice(-w);
  const a = attempts.slice(-w);
  const n = Math.min(s.length, a.length);
  let succ = 0;
  let att = 0;
  for (let i = 0; i < n; i++) {
    const si = s[i];
    const ai = a[i];
    if (si !== undefined && ai !== undefined && Number.isFinite(si) && Number.isFinite(ai) && ai > 0) {
      succ += si;
      att += ai;
    }
  }
  if (att < 20) {
    return {
      value: NaN,
      formulaId: `derived.success_rate.w${w}`,
      cohort: `success.w${w}`,
      n: att,
      licenseSpdx: "CC-BY-4.0",
      attributionRequired: true,
      ok: false,
      refuseCode: "n_below_floor",
    };
  }
  return {
    value: Math.round((succ / att) * 1e6) / 1e6,
    formulaId: `derived.success_rate.w${w}`,
    cohort: `success.w${w}`,
    n: att,
    licenseSpdx: "CC-BY-4.0",
    attributionRequired: true,
    attributionText: "Success rate on cleared base; not a win-rate claim.",
    ok: true,
  };
}

/**
 * Self-CLV from owned closing archive only (not Odds API spine).
 * clvBps = 10000 * ln(close/open) on decimal odds — refuse if missing/invalid.
 */
export function selfClvFromArchive(
  openDecimal: number,
  closeDecimal: number,
  opts: { cohort?: string } = {},
): FormulaResult {
  if (
    !Number.isFinite(openDecimal) ||
    !Number.isFinite(closeDecimal) ||
    openDecimal <= 1 ||
    closeDecimal <= 1
  ) {
    return {
      value: NaN,
      formulaId: "derived.self_clv_bps",
      cohort: opts.cohort ?? "own_close_archive",
      n: 0,
      licenseSpdx: "Proprietary-GSE",
      attributionRequired: false,
      ok: false,
      refuseCode: "invalid_odds",
    };
  }
  const bps = Math.round(10_000 * Math.log(closeDecimal / openDecimal) * 100) / 100;
  return {
    value: bps,
    formulaId: "derived.self_clv_bps",
    cohort: opts.cohort ?? "own_close_archive",
    n: 1,
    licenseSpdx: "Proprietary-GSE",
    attributionRequired: false,
    attributionText: "Computed on GSE first-party closing archive only.",
    ok: true,
  };
}

/** Rolling sum with min-n refuse-default */
export function rollingSum(
  values: readonly number[],
  window: number,
  opts: { cohort?: string; nMin?: number; formulaId?: string } = {},
): FormulaResult {
  const nMin = opts.nMin ?? 8;
  const w = Math.max(1, window);
  const slice = values.slice(-w).filter((v) => Number.isFinite(v));
  const n = slice.length;
  if (n < nMin) {
    return {
      value: NaN,
      formulaId: opts.formulaId ?? `derived.roll_sum.w${w}`,
      cohort: opts.cohort ?? `roll_sum.w${w}`,
      n,
      licenseSpdx: "CC-BY-4.0",
      attributionRequired: true,
      ok: false,
      refuseCode: "n_below_floor",
    };
  }
  const sum = slice.reduce((a, b) => a + b, 0);
  return {
    value: Math.round(sum * 1e6) / 1e6,
    formulaId: opts.formulaId ?? `derived.roll_sum.w${w}`,
    cohort: opts.cohort ?? `roll_sum.w${w}`,
    n,
    licenseSpdx: "CC-BY-4.0",
    attributionRequired: true,
    attributionText: "Rolling sum on cleared base.",
    ok: true,
  };
}

/** CPOE / residual rolling mean — same shape as rollingMean, named for catalog */
export function cpoeRoll(
  residuals: readonly number[],
  window: number,
  opts: { nMin?: number } = {},
): FormulaResult {
  return rollingMean(residuals, window, {
    nMin: opts.nMin ?? 20,
    formulaId: `derived.cpoe_roll.w${Math.max(1, window)}`,
    cohort: `cpoe.w${Math.max(1, window)}`,
  });
}

/** Yards per play = sum(yards)/sum(plays) over window with n floor */
export function yardsPerPlay(
  yards: readonly number[],
  plays: readonly number[],
  window: number,
): FormulaResult {
  const w = Math.max(1, window);
  const y = yards.slice(-w);
  const p = plays.slice(-w);
  const n = Math.min(y.length, p.length);
  let ySum = 0;
  let pSum = 0;
  for (let i = 0; i < n; i++) {
    const yi = y[i];
    const pi = p[i];
    if (
      yi !== undefined &&
      pi !== undefined &&
      Number.isFinite(yi) &&
      Number.isFinite(pi) &&
      pi > 0
    ) {
      ySum += yi;
      pSum += pi;
    }
  }
  if (pSum < 40) {
    return {
      value: NaN,
      formulaId: `derived.ypp.w${w}`,
      cohort: `ypp.w${w}`,
      n: pSum,
      licenseSpdx: "CC-BY-4.0",
      attributionRequired: true,
      ok: false,
      refuseCode: "n_below_floor",
    };
  }
  return {
    value: Math.round((ySum / pSum) * 1e6) / 1e6,
    formulaId: `derived.ypp.w${w}`,
    cohort: `ypp.w${w}`,
    n: pSum,
    licenseSpdx: "CC-BY-4.0",
    attributionRequired: true,
    attributionText: "Yards per play on cleared base; not a win-rate claim.",
    ok: true,
  };
}

/** Share of team = player / team totals with refuse on tiny team totals */
export function shareOfTeam(
  player: number,
  team: number,
  opts: { cohort?: string; formulaId?: string; nMin?: number } = {},
): FormulaResult {
  const nMin = opts.nMin ?? 1;
  if (!Number.isFinite(player) || !Number.isFinite(team) || team < nMin) {
    return {
      value: NaN,
      formulaId: opts.formulaId ?? "derived.share_of_team",
      cohort: opts.cohort ?? "share",
      n: Number.isFinite(team) ? team : 0,
      licenseSpdx: "CC-BY-4.0",
      attributionRequired: true,
      ok: false,
      refuseCode: "n_below_floor",
    };
  }
  return {
    value: Math.round((player / team) * 1e6) / 1e6,
    formulaId: opts.formulaId ?? "derived.share_of_team",
    cohort: opts.cohort ?? "share",
    n: team,
    licenseSpdx: "CC-BY-4.0",
    attributionRequired: true,
    attributionText: "Share formula on cleared aggregates.",
    ok: true,
  };
}
