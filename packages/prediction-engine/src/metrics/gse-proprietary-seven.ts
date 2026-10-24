/**
 * GSE proprietary seven — the named metric kernels.
 *
 * HONESTY CONTRACT (per the Phase 2 brief): only QPTSR and DWP have pinned
 * derivations in this repo (pressure-timing.ts conversion table and
 * fourth-down-aggression.ts win-probability deltas). The other five return
 * status "gap" with the named missing input until their sources exist. No
 * formula is published on a public surface, and nothing public imports this
 * file.
 *
 * Every result carries `source` naming the exact constant or the gap.
 */
import {
  CONVERSION_BY_BUCKET,
  PRESSURE_WEIGHT,
  pressureBucket,
  type PressureBucket,
} from "../nfl/pressure-timing.js";
import { WP_DELTA, type FourthDownDecision } from "../nfl/fourth-down-aggression.js";

export interface MetricResult<T = number> {
  readonly value: T | null;
  readonly status: "measured" | "gap";
  readonly source: string;
}

const GAP = (missing: string): MetricResult<null> => ({
  value: null,
  status: "gap",
  source: "missing input: " + missing,
});

/**
 * QPTSR — Quick-Pressure To Sack Rate.
 *
 * Sack probability of a pressure, weighted by the measured arrival-time
 * distribution (sub-2s pressures convert 15.8% vs 10.1% at 2.5-2.9s). Moves
 * whenever the share of quick pressures moves — that sensitivity is pinned by
 * test.
 */
export function computeGseQptsr(input: {
  readonly pressuresByBucket: Readonly<Record<PressureBucket, number>>;
}): MetricResult<number | null> {
  const buckets = input.pressuresByBucket;
  let total = 0;
  for (const k of Object.keys(buckets)) total += buckets[k as PressureBucket] || 0;
  if (total <= 0) return GAP("pressuresByBucket is empty");
  let sack = 0;
  for (const k of Object.keys(buckets)) {
    const count = buckets[k as PressureBucket] || 0;
    const rate = CONVERSION_BY_BUCKET[k as PressureBucket];
    const weight = PRESSURE_WEIGHT[k as PressureBucket] ?? 1;
    sack += count * rate * weight;
  }
  return {
    value: Math.round((sack / total) * 1000) / 1000,
    status: "measured",
    source: "pressure-timing.ts CONVERSION_BY_BUCKET + PRESSURE_WEIGHT (15.8% sub-2s v 10.1% mid, n=3,644)",
  };
}

/** Convenience: bucket a raw list of pressure arrival times, then QPTSR. */
export function computeGseQptsrFromTimes(timesToPressure: readonly number[]): MetricResult<number | null> {
  const buckets: Record<PressureBucket, number> = {
    immediate: 0, fast: 0, mid: 0, late: 0,
  };
  for (const t of timesToPressure) buckets[pressureBucket(t)] += 1;
  return computeGseQptsr({ pressuresByBucket: buckets });
}

/**
 * DWP — Decision Win Probability delta for a fourth-down choice.
 *
 * The pinned measured deltas: GO +0.1113, FG −0.0837, punt as filed. Returns the
 * decision's win-probability delta; the caller owns the choice.
 */
export function computeGseDwp(decision: FourthDownDecision): MetricResult<number | null> {
  const delta = WP_DELTA[decision];
  if (typeof delta !== "number") return GAP("no WP delta filed for decision " + decision);
  return {
    value: delta,
    status: "measured",
    source: "fourth-down-aggression.ts WP_DELTA (GO +0.1113 v FG -0.0837, n=1,001)",
  };
}

/**
 * SII — Scheme-Interaction Index. Requires a pairwise shell table
 * (coverage family x route concept EPA matrix). Not present in the repo.
 */
export function computeGseSii(_input: {
  readonly shellTable: ReadonlyArray<unknown>;
}): MetricResult<null> {
  return GAP("pairwise shell table (coverage x route EPA matrix) does not exist in the repo");
}

/** RLS — Route Liberation Score. Requires route-level separation data (2026 participation is unpublished). */
export function computeGseRls(_input: { readonly routeSeparation: readonly unknown[] }): MetricResult<null> {
  return GAP("route-level separation data requires the 2026 participation file (unpublished upstream)");
}

/** SPESE — Special-Teams Expected Points. Requires a pinned ST drive model. */
export function computeGseSpese(_input: { readonly stPlays: readonly unknown[] }): MetricResult<null> {
  return GAP("special-teams expected-points model is not built in this repo");
}

/** TOR — Turnover Regret. Requires fumble-recovery luck regression (no pinned rate). */
export function computeGseTor(_input: { readonly fumbles: readonly unknown[] }): MetricResult<null> {
  return GAP("fumble-recovery luck regression has no pinned rate in this repo");
}
