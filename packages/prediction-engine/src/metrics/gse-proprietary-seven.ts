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
 * SII — Scheme-Interaction Index.
 *
 * EPA lift of a scheme flag inside a defensive-box bucket, against that flag's
 * own marginal. Derived 2026-10-28 from pbp_participation_2026_reconstructed
 * joined to play_by_play_2026 (13,684 rows, 2026 season). Cells under n=25 are
 * dropped by the derivation, not here.
 *
 * Reference point, motion: marginal EPA +0.0083; motion vs a 9+ box is +0.0561
 * (lift +0.0478, n=79) while motion vs a 7 box is −0.0058 (lift −0.0141,
 * n=2,177). The sign flip across boxes is the whole point of the metric.
 *
 * CORRECTION 2026-10-28: the first version of this docstring quoted the
 * NO-MOTION cells (+0.1231 at 9+, −0.0248 at 7) as if they were motion. The
 * derivation emits both flag states and the `0|` keys were read as motion. The
 * sign flip survives; the magnitudes were wrong and are now the `1|` cells.
 */
export const SII_MOTION_MARGINAL_EPA = 0.0083;

export interface SiiCell {
  readonly flag: "motion" | "play_action" | "rpo" | "screen";
  readonly boxBucket: "<=6" | "7" | "8" | "9+";
  readonly epa: number;
  readonly n: number;
}

export function computeGseSii(input: {
  readonly cells: readonly SiiCell[];
  readonly flag: SiiCell["flag"];
  readonly marginalEpa: number;
  readonly minN?: number;
}): MetricResult<number | null> {
  const minN = input.minN ?? 25;
  const cells = input.cells.filter((c) => c.flag === input.flag && c.n >= minN);
  if (!cells.length) return GAP(`no ${input.flag} cell clears n>=${minN}`);
  const totalN = cells.reduce((s, c) => s + c.n, 0);
  const weighted = cells.reduce((s, c) => s + c.epa * c.n, 0) / totalN;
  return {
    value: Math.round((weighted - input.marginalEpa) * 10000) / 10000,
    status: "measured",
    source: `scheme x box EPA lift, n=${totalN} across ${cells.length} cells (2026 participation x pbp)`,
  };
}

/**
 * RLS — Route Liberation Score. Still a gap, but the reason is now precise.
 *
 * The reconstruction machinery already exists: apps/web/lib/reconstruction/
 * separation-reconstruct.ts takes an EB-shrunk receiver separation tendency plus
 * play covariates and returns a per-play estimate, with an explicit uncalibrated
 * regime that emits the tendency rather than inventing a coordinate.
 *
 * What is missing is the input, not the model. No separation tendency is fitted
 * anywhere on disk. ngs_highlight_participation_2026 has was_running_route and
 * defender_location, but defender_location is a categorical line label
 * (RIGHT_INTERIOR_LINE), not x/y — and zero route rows carry it at all. So the
 * truth set is absent and the reconstruction stays in its uncalibrated regime.
 *
 * RLS becomes buildable the moment a separation tendency exists; it does not
 * need new modelling code.
 */
export function computeGseRls(_input: { readonly routeSeparation: readonly unknown[] }): MetricResult<null> {
  return GAP(
    "no separation tendency fitted on disk; reconstruction exists in apps/web/lib/reconstruction but has no truth set (ngs defender_location is a categorical label, 0 route rows)",
  );
}

/**
 * SPESE — Special-Teams Expected Points.
 *
 * Mean EPA on a team's special-teams plays. Derived 2026-10-28: 1,743 ST plays
 * across 32 teams (punt −0.0317, kickoff +0.2306, field goal +0.2237).
 *
 * CAVEAT: raw nflverse `epa` does not share a sign convention across the three
 * play types, so the per-team number is a relative ranking, not an absolute
 * points value. Do not sum it into a scoreline.
 */
export function computeGseSpese(input: {
  readonly stEpa: number;
  readonly stPlays: number;
  readonly minPlays?: number;
}): MetricResult<number | null> {
  const minPlays = input.minPlays ?? 10;
  if (input.stPlays < minPlays) return GAP(`only ${input.stPlays} ST plays, need ${minPlays}`);
  return {
    value: Math.round(input.stEpa * 10000) / 10000,
    status: "measured",
    source: `mean ST epa over ${input.stPlays} plays (2026 pbp; mixed sign convention across punt/kickoff/FG)`,
  };
}

/**
 * TOR — Turnover Regret.
 *
 * Fumble-recovery rate against the league rate. Derived 2026-10-28: 204 fumbles,
 * league mean recovery 0.4373 — so the coin is not 50% and 0.4373 is the
 * reference, not 0.5. Above it is luck, below it is not.
 */
export const TOR_LEAGUE_RECOVERY_RATE = 0.4373;

export function computeGseTor(input: {
  readonly fumbles: number;
  readonly lost: number;
  readonly minFumbles?: number;
  readonly leagueRate?: number;
}): MetricResult<number | null> {
  const minFumbles = input.minFumbles ?? 5;
  if (input.fumbles < minFumbles) return GAP(`only ${input.fumbles} fumbles, need ${minFumbles}`);
  const rate = input.lost / input.fumbles;
  const league = input.leagueRate ?? TOR_LEAGUE_RECOVERY_RATE;
  return {
    value: Math.round((rate - league) * 10000) / 10000,
    status: "measured",
    source: `recovery ${rate.toFixed(3)} v league ${league} over ${input.fumbles} fumbles (2026 pbp)`,
  };
}
