/**
 * SLOT `brier-murphy` — Brier score with its Murphy (calibration/refinement)
 * decomposition, binned by predicted probability.
 *
 * WHAT THE DECOMPOSITION IS
 * Partition the forecasts into B uniform bins on [0, 1]. For bin b let n_b be
 * its count, p̄_b the mean forecast inside it, ō_b the observed frequency inside
 * it, and ō the overall base rate. Then
 *
 *     reliability = (1/n) Σ_b n_b (p̄_b − ō_b)²      [calibration error, lower better]
 *     resolution  = (1/n) Σ_b n_b (ō_b − ō)²        [discrimination,    higher better]
 *     uncertainty = ō (1 − ō)                        [base-rate variance, forecast-free]
 *
 * WHICH BRIER `brier` IS — read this before using the number
 * The Murphy identity
 *
 *     brier = reliability − resolution + uncertainty
 *
 * is an ALGEBRAIC identity for a forecaster that emits finitely many distinct
 * probabilities, one per bin. It is therefore exact for the BINNED Brier score —
 * the score obtained after each forecast p_i is replaced by its own bin mean
 * p̄_{b(i)} — and only approximately true for the raw Brier score. The exact
 * relation between the two is
 *
 *     rawBrier = binnedBrier + withinBinVariance − 2 · withinBinCovariance
 *     withinBinVariance   = (1/n) Σ_b Σ_{i∈b} (p_i − p̄_b)²        ≥ 0
 *     withinBinCovariance = (1/n) Σ_b Σ_{i∈b} (p_i − p̄_b)(y_i − ō_b)
 *
 * so the binned score is NOT a bound on the raw one in either direction: the
 * covariance term is the within-bin discrimination that binning discards, and
 * where a forecaster genuinely resolves inside a bin the raw score beats the
 * binned one. Both residual terms vanish when every distinct forecast owns its
 * own bin, at which point the two scores coincide.
 *
 * The field `brier` returned by this slot is the **BINNED Brier score**:
 *
 *     brier = (1/n) Σ_i (p̄_{b(i)} − y_i)²
 *
 * chosen so that the three returned components reconcile with the returned
 * headline EXACTLY (to floating-point rounding, ~1e-15 in practice), rather than
 * "up to a discretisation residual the caller cannot see". Returning the raw
 * mean Brier here would make the advertised identity silently false, which is
 * precisely the kind of quiet inconsistency this kernel exists to prevent. It
 * follows that `brier` is bin-count dependent: with `bins` large enough that
 * every distinct forecast owns its own bin it converges to the raw mean Brier.
 *
 * Callers who want the raw, unbinned headline number should use `meanBrier`
 * from `../../certificate/proper-scoring.js` directly — that is the same
 * function this slot uses internally, applied to the binned forecasts, so the
 * two numbers are produced by identical scoring semantics and differ only in
 * whether the forecast was discretised first.
 *
 * REUSE
 * `meanBrier` (repo-existing, `../../certificate/proper-scoring.js`) supplies
 * the scoring semantics for the headline, per the contract. Its internal
 * `clamp01` guard can never fire here: every forecast is validated to be a
 * finite probability before it is passed in, so no silent coercion occurs.
 *
 * Purity: no I/O, no clock, no randomness. Inputs are never mutated.
 */

import {
  KernelError,
  assertFinite,
  assertNonEmpty,
  assertProbability,
  assertSameLength,
  type BrierDecomposition,
  type BrierMurphyFn,
} from "../contract.js";
import { meanBrier } from "../../../certificate/proper-scoring.js";

/** Contract-specified default bin count. */
const DEFAULT_BINS = 10;

interface Bin {
  n: number;
  sumP: number;
  sumY: number;
}

/**
 * Brier score plus Murphy decomposition over `bins` uniform bins on [0, 1].
 *
 * Binning: bin b covers [b/B, (b+1)/B); a forecast of exactly 1 falls in the
 * last bin, so the bins partition the closed interval [0, 1]. Empty bins
 * contribute nothing (n_b = 0 zeroes both their reliability and resolution
 * terms), so the result never depends on how many bins happened to be unused.
 *
 * Domain / failure modes:
 *  - `predicted` and `outcomes` must align            → MISMATCHED_LENGTH
 *  - both must be non-empty                            → EMPTY
 *  - every forecast must be finite and in [0, 1]       → NOT_FINITE / DOMAIN
 *  - every outcome must be exactly 0 or 1              → DOMAIN
 *  - `bins` must be finite                             → NOT_FINITE
 *  - `bins` must be an integer >= 2                    → DOMAIN
 *
 * Note the check order: length mismatch is reported before emptiness, so
 * `([], [])` is EMPTY while `([0.5], [])` is MISMATCHED_LENGTH.
 *
 * No clamping is applied to any returned quantity. All four numbers are exact
 * arithmetic consequences of the validated inputs and are finite by
 * construction (n >= 1, every term a bounded square).
 */
export const brierMurphy: BrierMurphyFn = (
  predicted,
  outcomes,
  bins = DEFAULT_BINS,
): BrierDecomposition => {
  assertSameLength(predicted, outcomes, "predicted", "outcomes");
  assertNonEmpty(predicted, "predicted");

  assertFinite(bins, "bins");
  if (!Number.isInteger(bins) || bins < 2) {
    throw new KernelError("DOMAIN", `bins must be an integer >= 2, received ${bins}`);
  }

  const n = predicted.length;
  const buckets: Bin[] = Array.from({ length: bins }, () => ({ n: 0, sumP: 0, sumY: 0 }));

  // Index of each observation's bin, retained so the binned forecasts can be
  // rebuilt in input order for the headline score.
  const binOf = new Array<number>(n);
  let totalY = 0;

  for (let i = 0; i < n; i += 1) {
    const p = predicted[i]!;
    assertProbability(p, `predicted[${i}]`);

    const y = outcomes[i]!;
    assertFinite(y, `outcomes[${i}]`);
    if (y !== 0 && y !== 1) {
      throw new KernelError("DOMAIN", `outcomes[${i}] must be 0 or 1, received ${y}`);
    }

    // floor(p · B) is the half-open bin; p === 1 folds into the last bin so the
    // bins cover [0, 1] rather than [0, 1).
    let index = Math.floor(p * bins);
    if (index >= bins) index = bins - 1;
    if (index < 0) index = 0;

    const bucket = buckets[index]!;
    bucket.n += 1;
    bucket.sumP += p;
    bucket.sumY += y;

    binOf[i] = index;
    totalY += y;
  }

  const baseRate = totalY / n;

  let reliability = 0;
  let resolution = 0;
  for (let b = 0; b < bins; b += 1) {
    const bucket = buckets[b]!;
    if (bucket.n === 0) continue;
    const meanP = bucket.sumP / bucket.n;
    const meanY = bucket.sumY / bucket.n;
    const calibrationGap = meanP - meanY;
    const discriminationGap = meanY - baseRate;
    reliability += bucket.n * calibrationGap * calibrationGap;
    resolution += bucket.n * discriminationGap * discriminationGap;
  }
  reliability /= n;
  resolution /= n;

  const uncertainty = baseRate * (1 - baseRate);

  // Headline: the BINNED Brier, scored with `meanBrier` semantics on the
  // bin-mean forecasts (see the file header for why this and not the raw score).
  const binnedRows = new Array<{ p: number; y: 0 | 1 }>(n);
  for (let i = 0; i < n; i += 1) {
    const bucket = buckets[binOf[i]!]!;
    binnedRows[i] = { p: bucket.sumP / bucket.n, y: outcomes[i]! };
  }
  const brier = meanBrier(binnedRows);

  assertFinite(brier, "brier");
  assertFinite(reliability, "reliability");
  assertFinite(resolution, "resolution");
  assertFinite(uncertainty, "uncertainty");

  return { brier, reliability, resolution, uncertainty };
};
