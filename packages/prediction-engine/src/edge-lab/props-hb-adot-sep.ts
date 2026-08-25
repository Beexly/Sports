/**
 * Catch rate by aDOT × NGS separation, not aDOT alone.
 *
 * A 12-yard go-route with 3 yards of separation is not the same catch process
 * as a 12-yard go with 1 yard of separation. aDOT buckets (#534) already split
 * depth. This is the second axis: nflverse NGS avg_separation, already on disk,
 * CC-BY. Not a second model and not a PFF dump — same Beta-Binomial as catch|
 * targets, finer cells. Empty / no-dispersion cells are dropped (honest).
 *
 * Independent p. priced:false. Pure, no I/O. Do not ingest a new Odds market.
 */

import {
  ADOT_CATCH_METHOD_TAG,
  SHORT_ADOT_MAX,
  INTERMEDIATE_ADOT_MAX,
  adotOf,
  bucketAdot,
  type AdotBucket,
  type AdotCatchSample,
} from "./props-hb-adot-catch.js";
import { fitCatchPrior, posteriorCatch, type BetaPosterior, type BetaPrior } from "./props-hb-catch.js";

export const ADOT_SEP_METHOD_TAG = "props_hb_adot_sep_v1" as const;

/** Tight coverage: NGS avg_separation below this (yards). */
export const TIGHT_SEP_MAX = 2;

export type SepBucket = "tight" | "open";
export type AdotSepCell = `${AdotBucket}_${SepBucket}`;

export type AdotSepCatchSample = AdotCatchSample & {
  readonly avgSeparation: number;
};

export type AdotSepFit = {
  readonly cell: AdotSepCell;
  readonly adot: AdotBucket;
  readonly sep: SepBucket;
  readonly prior: BetaPrior;
  readonly targetShare: number;
};

function assertSample(s: AdotSepCatchSample): void {
  if (!Number.isFinite(s.avgSeparation) || s.avgSeparation < 0) {
    throw new RangeError(`adot-sep avgSeparation must be finite and ≥ 0 (got ${s.avgSeparation})`);
  }
}

export function bucketSep(sep: number): SepBucket {
  if (!Number.isFinite(sep) || sep < 0) {
    throw new RangeError(`bucketSep: separation must be finite and ≥ 0 (got ${sep})`);
  }
  return sep < TIGHT_SEP_MAX ? "tight" : "open";
}

export function adotSepCell(adot: AdotBucket, sep: SepBucket): AdotSepCell {
  return `${adot}_${sep}`;
}

const CELLS: readonly AdotSepCell[] = [
  "short_tight",
  "short_open",
  "intermediate_tight",
  "intermediate_open",
  "deep_tight",
  "deep_open",
];

function cellOf(s: AdotSepCatchSample): AdotSepCell {
  return adotSepCell(bucketAdot(adotOf(s)), bucketSep(s.avgSeparation));
}

/**
 * Per-cell Beta priors. Cells with no extra-binomial φ are omitted.
 * Shares are target-weighted. Does not invent a prior for an empty cell.
 */
export function fitAdotSepCatchPriors(samples: readonly AdotSepCatchSample[]): AdotSepFit[] {
  if (samples.length === 0) return [];
  const buckets: Record<AdotSepCell, AdotSepCatchSample[]> = {
    short_tight: [],
    short_open: [],
    intermediate_tight: [],
    intermediate_open: [],
    deep_tight: [],
    deep_open: [],
  };
  let totalTargets = 0;
  for (const s of samples) {
    assertSample(s);
    buckets[cellOf(s)].push(s);
    totalTargets += s.targets;
  }
  if (!(totalTargets > 0)) return [];

  const out: AdotSepFit[] = [];
  for (const cell of CELLS) {
    const rows = buckets[cell];
    if (rows.length === 0) continue;
    const prior = fitCatchPrior(rows);
    if (!prior) continue;
    const [adot, sep] = cell.split("_") as [AdotBucket, SepBucket];
    out.push({
      cell,
      adot,
      sep,
      prior,
      targetShare: rows.reduce((a, s) => a + s.targets, 0) / totalTargets,
    });
  }
  return out;
}

export function posteriorAdotSepCatch(
  fits: readonly AdotSepFit[],
  samples: readonly AdotSepCatchSample[],
): Array<{ cell: AdotSepCell; post: BetaPosterior; targetShare: number }> {
  const byCell: Record<AdotSepCell, AdotSepCatchSample[]> = {
    short_tight: [],
    short_open: [],
    intermediate_tight: [],
    intermediate_open: [],
    deep_tight: [],
    deep_open: [],
  };
  for (const s of samples) {
    assertSample(s);
    byCell[cellOf(s)].push(s);
  }
  return fits.map((f) => {
    const rows = byCell[f.cell];
    const rec = rows.reduce((a, s) => a + s.receptions, 0);
    const tgt = rows.reduce((a, s) => a + s.targets, 0);
    return { cell: f.cell, post: posteriorCatch(f.prior, rec, tgt), targetShare: f.targetShare };
  });
}

export { ADOT_CATCH_METHOD_TAG, SHORT_ADOT_MAX, INTERMEDIATE_ADOT_MAX };
