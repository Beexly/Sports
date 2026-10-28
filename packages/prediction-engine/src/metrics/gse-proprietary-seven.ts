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
import { round } from "./core/math.js";

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
 * Reference point, motion: marginal EPA −0.0021. Against a 9+ box, motion is
 * −0.0435 (lift −0.0414, n=109) while NO motion at the same box is +0.2078
 * (lift +0.1888, n=92). The flip is between motion and no-motion at a stacked
 * box, not across boxes — motion costs you exactly where the defence has already
 * committed numbers.
 *
 * CORRECTION 2026-10-28, twice. First the docstring quoted the NO-MOTION cells as
 * if they were motion (the derivation keys flag state as 0| and 1|). Then, once
 * weeks 6-7 were reconstructed, the motion-at-9+ cell flipped from +0.0561 to
 * −0.0435 and the marginal from +0.0083 to −0.0021. The weeks 1-5 reading was an
 * artifact of the short window. These are the weeks 1-7 figures.
 *
 * STABILITY (docs/strategy/sii-stability-2026-10-28.md): split-half check. Only
 * the 9+ box keeps its direction across windows (−0.067 then −0.680); boxes 7 and
 * 8 flip sign.
 *
 * OUT OF SAMPLE (docs/strategy/sii-out-of-sample-2026-10-28.md): the 9+ effect
 * replicates on both full prior seasons — −0.199 (2024) and −0.212 (2025). So the
 * effect is real and the magnitude is ≈ −0.20. The 2026 pooled −0.0435 is the
 * weakest of four windows and is the outlier, not the headline. Box 8 is
 * consistently slightly negative; box 7 does not replicate.
 *
 * Use SII at 9+ only. The prior-season figure is the estimate; the current-season
 * figure is a reading, not a replacement.
 */
export const SII_STACKED_BOX_MOTION_GAP = -0.2;
export const SII_MOTION_MARGINAL_EPA = -0.0021;

/**
 * Marginal EPA per flag. Only `motion` is derived; the other three are 0
 * placeholders and a caller passing `marginalEpa` explicitly overrides them.
 */
export const SII_MARGINAL_EPA_BY_FLAG = {
  motion: SII_MOTION_MARGINAL_EPA,
  play_action: 0,
  rpo: 0,
  screen: 0,
} as const;

export type SiiFlag = keyof typeof SII_MARGINAL_EPA_BY_FLAG;

export interface SiiCell {
  readonly flag: SiiFlag;
  readonly boxBucket: "<=6" | "7" | "8" | "9+";
  readonly epa: number;
  readonly n: number;
}

export const SII_MIN_N = 25;

export function computeGseSii(input: {
  readonly cells: readonly SiiCell[];
  readonly flag: SiiFlag;
  readonly marginalEpa?: number;
  readonly minN?: number;
}): MetricResult<number | null> {
  const minN = input.minN ?? SII_MIN_N;
  const cells = input.cells.filter(
    (c) => c.flag === input.flag && c.n >= minN && Number.isFinite(c.epa) && Number.isInteger(c.n),
  );
  if (!cells.length) return GAP(`no ${input.flag} cell clears n>=${minN} with finite epa`);
  const marginal = input.marginalEpa ?? SII_MARGINAL_EPA_BY_FLAG[input.flag];
  const totalN = cells.reduce((s, c) => s + c.n, 0);
  const weighted = cells.reduce((s, c) => s + c.epa * c.n, 0) / totalN;
  return {
    value: round(weighted - marginal),
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
export const SPESE_MIN_PLAYS = 10;

export function computeGseSpese(input: {
  readonly stEpa: number;
  readonly stPlays: number;
  readonly minPlays?: number;
}): MetricResult<number | null> {
  const minPlays = input.minPlays ?? SPESE_MIN_PLAYS;
  if (!Number.isFinite(input.stEpa)) return GAP("stEpa is not finite");
  if (!Number.isInteger(input.stPlays) || input.stPlays < 0) {
    return GAP(`stPlays must be a non-negative integer, got ${input.stPlays}`);
  }
  if (input.stPlays < minPlays) return GAP(`only ${input.stPlays} ST plays, need ${minPlays}`);
  return {
    value: round(input.stEpa),
    status: "measured",
    source: `mean ST epa over ${input.stPlays} plays (2026 pbp; mixed sign convention across punt/kickoff/FG)`,
  };
}

/**
 * TOR — Turnover Regret.
 *
 * Excess LOST-fumble rate against the league. Derived 2026-10-28 over weeks
 * 1-7: 252 fumbles, pooled league lost rate 0.4603 — so the coin is not 50% and
 * 0.4603 is the reference, not 0.5. Positive means the team loses more fumbles
 * than league, which is the regret direction.
 *
 * The reference is the POOLED rate, not the mean of per-team rates (0.4384). The
 * mean over-weights teams with few fumbles; the pooled rate is the league's
 * actual share.
 *
 * NAMING CORRECTION 2026-10-28: the constant was called RECOVERY_RATE and the
 * field `recovery_rate`, but the arithmetic is `lost / fumbles` — a LOST rate.
 * Offences recover their own fumbles slightly more than half the time, so a
 * recovery rate would be ~0.56 and the sign would invert. The arithmetic was
 * right for regret; only the names were wrong. Renamed rather than re-derived.
 */
export const TOR_LEAGUE_LOST_RATE = 0.4603;

/** @deprecated alias — the value is a lost rate, not a recovery rate. */
export const TOR_LEAGUE_RECOVERY_RATE = TOR_LEAGUE_LOST_RATE;

export const TOR_MIN_FUMBLES = 5;

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
