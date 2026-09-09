/**
 * Deployed-version calibration-map hold-out projection (C-297, 2026-09-09).
 *
 * WHAT THIS ANSWERS. The eligibility gate scores the market-anchored
 * probability of settled moneyline picks. Measured on production 2026-09-09,
 * the POOLED sample (n 487) is calibrated to within sampling noise while the
 * DEPLOYED version v5.2.7 is not on its own 274 rows (Murphy reliability
 * 0.0189 against a binomial null of about 0.004 to 0.008). C-292 lands a
 * deployed-version floor, so after that deploys the gate reads RED on the
 * deployed version's own rows. The only honest lever left is a calibration
 * MAP on the displayed probability — and nobody has measured whether such a
 * map would actually clear the floor when it is validated properly.
 *
 * This module is that measurement and nothing else:
 *
 *   - Rows of ONE model version, ordered by settled time.
 *   - Split with the existing `timeHoldoutSplit` (never random: a random
 *     shuffle leaks the future into the fit and every map then looks good).
 *     Two splits are reported, train = first two thirds and train = first
 *     half, because a map that only passes at one cut point is a cut-point
 *     artifact, not a result.
 *   - Maps are fitted on TRAIN ONLY and scored on TEST ONLY. Identity (no map
 *     at all) is scored the same way as the rest, so the comparison says
 *     whether the map earned anything.
 *   - Each method reports the debiased ECE (C-292's per-bin variance
 *     correction, the value the gate's ECE floor reads), the raw ECE and its
 *     noise expectation beside it, Brier, and the Murphy terms.
 *
 * WHAT THIS IS NOT. It is a PROJECTION on held-out rows, not a published
 * claim, and not a decision. It never touches the eligibility input: the
 * result is written to the metrics artifact and exposed on the truth surface
 * for an operator to read, and `evaluateCalibrationEligibility` is not given
 * it. No floor, bin, sample definition, streak or pBasis changes here. A
 * green projection is a reason to consider fitting a map under
 * CALIBRATION_ADJUSTMENTS_ENABLED, which is a separate, founder-gated
 * decision; it is not itself evidence that the deployed model is calibrated,
 * because the deployed model still displays the UNMAPPED probability.
 *
 * @see docs/ops/CALIBRATION_ECE_ESTIMATOR_2026-09-09.md
 */

import {
  brierDecomposition,
  centeredIsotonicCalibration,
  timeHoldoutSplit,
  type CalibrationSample,
  type TimestampedCalibrationSample,
} from "@sports/prediction-engine";
import { debiasedExpectedCalibrationError } from "@/lib/calibration/ece-debiased";
import { applyPlattToProb, fitPlattFromProbs } from "@/lib/calibration/platt-scaling";
import { fitTemperature, temperaturePredict } from "@/lib/calibration/temperature-map";
import type { MarketAnchoredSample } from "@/lib/calibration/live-calibration-p";
import { DEFAULT_CALIBRATION_FLOORS } from "@/lib/ops/calibration-eligibility";

/**
 * Below this the split is not worth reporting: a two-thirds cut of 60 rows
 * leaves 20 test rows, where a ten-bin ECE puts two picks in a bin and both
 * the magnitude and the sign are sampling noise. Returning null says "not
 * measured", which is the honest answer; it never says "did not pass".
 */
export const MIN_ROWS_FOR_MAP_HOLDOUT = 60;

/** Centered isotonic is unconstrained; below this it memorises the train slice. */
export const MIN_TRAIN_FOR_ISOTONIC = 150;

export type MapHoldoutMethod = "identity" | "temperature" | "platt" | "centered_isotonic";

export interface MapHoldoutMethodResult {
  readonly method: MapHoldoutMethod;
  /** Fitted parameters, for the record. Identity has none. */
  readonly params: Readonly<Record<string, number>> | null;
  readonly nTest: number;
  /** Plain binned ECE on the test slice. */
  readonly ece: number;
  /** Expected ECE of a perfectly calibrated forecaster on these test forecasts. */
  readonly eceNoise: number;
  /** Per-bin variance-corrected ECE — the value the gate's ECE floor reads. */
  readonly eceDebiased: number;
  readonly brier: number;
  readonly murphyReliability: number;
  readonly murphyResolution: number;
  /** Debiased test ECE at or below the gate's ECE floor. */
  readonly clearsEceFloor: boolean;
  /** The test slice alone reaches the gate's n floor. */
  readonly clearsNFloor: boolean;
}

export interface MapHoldoutSplitResult {
  readonly trainFraction: number;
  readonly nTrain: number;
  readonly nTest: number;
  readonly trainSettledFrom: string | null;
  readonly trainSettledTo: string | null;
  readonly testSettledFrom: string | null;
  readonly testSettledTo: string | null;
  readonly methods: readonly MapHoldoutMethodResult[];
  /** Lowest debiased test ECE; null when no method could be scored. */
  readonly bestByEceDebiased: MapHoldoutMethod | null;
  /** A map (not identity) clears the ECE floor on test AND test reaches the n floor. */
  readonly aMapClearsBothFloors: boolean;
  /** Identity — the probability actually displayed today — clears both floors on test. */
  readonly identityClearsBothFloors: boolean;
}

export interface DeployedVersionMapHoldout {
  readonly generatedAt: string;
  readonly modelVersion: string;
  /** Rows of this version carrying a settled timestamp, the ones measured. */
  readonly n: number;
  /** Rows of this version dropped for having no settled timestamp to order by. */
  readonly droppedNoSettledAt: number;
  readonly bins: number;
  readonly eceFloor: number;
  readonly nFloor: number;
  readonly splits: readonly MapHoldoutSplitResult[];
  /** True only when a map clears both floors on TEST at BOTH split points. */
  readonly aMapClearsBothFloorsAtEverySplit: boolean;
  readonly operatorHint: string;
}

export interface DeployedMapHoldoutOptions {
  /** Bins for the ECE and Murphy terms; the gate's own default is 10. */
  readonly bins?: number;
  /** ECE floor to compare against. Defaults to the gate's floor; never widened here. */
  readonly eceFloor?: number;
  /** n floor the TEST slice is measured against. Defaults to the gate's floor. */
  readonly nFloor?: number;
  /** Fixed for reproducibility; exposed so a test can run a cheap replication count. */
  readonly replications?: number;
  readonly now?: Date;
}

const SPLIT_FRACTIONS = [2 / 3, 0.5] as const;

function logitOf(p: number): number {
  const x = Math.min(1 - 1e-6, Math.max(1e-6, p));
  return Math.log(x / (1 - x));
}

function isoDate(t: number | undefined): string | null {
  return t == null || !Number.isFinite(t) ? null : new Date(t).toISOString();
}

function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

/**
 * Score one mapped test slice. `mapped` must be built from TEST rows only —
 * the caller is responsible for that and `deployedVersionMapHoldout` asserts
 * the train/test slices are disjoint before any map is fitted.
 */
function scoreMethod(
  method: MapHoldoutMethod,
  params: Readonly<Record<string, number>> | null,
  mapped: readonly CalibrationSample[],
  bins: number,
  eceFloor: number,
  nFloor: number,
  replications: number | undefined,
): MapHoldoutMethodResult {
  const corrected =
    replications == null
      ? debiasedExpectedCalibrationError(mapped, bins)
      : debiasedExpectedCalibrationError(mapped, bins, replications);
  const decomp = brierDecomposition(mapped, bins);
  return {
    method,
    params,
    nTest: mapped.length,
    ece: corrected.raw,
    eceNoise: corrected.noise,
    eceDebiased: corrected.debiased,
    brier: round6(decomp.brier),
    murphyReliability: round6(decomp.reliability),
    murphyResolution: round6(decomp.resolution),
    clearsEceFloor: corrected.debiased <= eceFloor,
    clearsNFloor: mapped.length >= nFloor,
  };
}

function runSplit(
  rows: readonly TimestampedCalibrationSample[],
  trainFraction: number,
  bins: number,
  eceFloor: number,
  nFloor: number,
  replications: number | undefined,
): MapHoldoutSplitResult {
  const { train, test } = timeHoldoutSplit(rows, trainFraction);

  // (e) A map fitted on test rows scoring those same rows is the failure mode
  // this whole module exists to avoid, so it is an invariant, not a comment.
  // timeHoldoutSplit slices one sorted array at a single cut, so the two
  // slices are disjoint by construction — this catches a future change to it.
  const trainSeen = new Set<TimestampedCalibrationSample>(train);
  for (const row of test) {
    if (trainSeen.has(row)) {
      throw new Error(
        "deployedVersionMapHoldout: train and test overlap — a map would be scored on its own fit rows",
      );
    }
  }

  const trainSamples: CalibrationSample[] = train.map((r) => ({ p: r.p, y: r.y }));
  const testSamples: CalibrationSample[] = test.map((r) => ({ p: r.p, y: r.y }));

  const methods: MapHoldoutMethodResult[] = [
    scoreMethod("identity", null, testSamples, bins, eceFloor, nFloor, replications),
  ];

  if (trainSamples.length > 0 && testSamples.length > 0) {
    const temp = fitTemperature(
      trainSamples.map((s) => ({ logit: logitOf(s.p), outcome: s.y })),
      { modelVersion: "" },
    );
    methods.push(
      scoreMethod(
        "temperature",
        { T: round6(temp.T), nTrain: trainSamples.length },
        testSamples.map((s) => ({ p: temperaturePredict(logitOf(s.p), temp.T), y: s.y })),
        bins,
        eceFloor,
        nFloor,
        replications,
      ),
    );

    const platt = fitPlattFromProbs(trainSamples);
    methods.push(
      scoreMethod(
        "platt",
        { A: round6(platt.A), B: round6(platt.B), nTrain: trainSamples.length },
        testSamples.map((s) => ({ p: applyPlattToProb(s.p, platt.A, platt.B), y: s.y })),
        bins,
        eceFloor,
        nFloor,
        replications,
      ),
    );

    if (trainSamples.length >= MIN_TRAIN_FOR_ISOTONIC) {
      const iso = centeredIsotonicCalibration(trainSamples);
      methods.push(
        scoreMethod(
          "centered_isotonic",
          { nTrain: trainSamples.length, breakpoints: iso.points.length },
          testSamples.map((s) => ({ p: iso.predict(s.p), y: s.y })),
          bins,
          eceFloor,
          nFloor,
          replications,
        ),
      );
    }
  }

  const scored = methods.filter((m) => m.nTest > 0);
  const best = scored.reduce<MapHoldoutMethodResult | null>(
    (acc, m) => (acc == null || m.eceDebiased < acc.eceDebiased ? m : acc),
    null,
  );
  const identity = methods.find((m) => m.method === "identity") ?? null;

  return {
    trainFraction: round6(trainFraction),
    nTrain: train.length,
    nTest: test.length,
    trainSettledFrom: isoDate(train[0]?.t),
    trainSettledTo: isoDate(train[train.length - 1]?.t),
    testSettledFrom: isoDate(test[0]?.t),
    testSettledTo: isoDate(test[test.length - 1]?.t),
    methods,
    bestByEceDebiased: best?.method ?? null,
    aMapClearsBothFloors: scored.some(
      (m) => m.method !== "identity" && m.clearsEceFloor && m.clearsNFloor,
    ),
    identityClearsBothFloors: Boolean(identity && identity.clearsEceFloor && identity.clearsNFloor),
  };
}

function operatorHintFor(
  modelVersion: string,
  splits: readonly MapHoldoutSplitResult[],
  everySplit: boolean,
): string {
  const shape = splits
    .map(
      (s) =>
        `train ${Math.round(s.trainFraction * 100)}% (nTest ${s.nTest}): best ${s.bestByEceDebiased ?? "none"}, map clears both floors ${s.aMapClearsBothFloors}, identity clears both floors ${s.identityClearsBothFloors}`,
    )
    .join("; ");
  return (
    `PROJECTION ONLY — the eligibility gate does NOT read this key and nothing here changes what it decides. ` +
    `It asks one question: if the displayed probability of the deployed model version ${modelVersion} were passed through a ` +
    `calibration map fitted on that version's OWN earlier settled rows, would the LATER rows it never saw clear the ECE floor? ` +
    `Maps are fitted on the train slice only and scored on the held-out test slice only, split by settled time, never shuffled. ` +
    `${shape}. ` +
    `A map clearing both floors at every split point is ${everySplit}. ` +
    `Read it as a projection on held-out rows, not as a published claim and not as a measurement of what the product currently shows: ` +
    `the deployed model displays the UNMAPPED probability, so the identity row is the honest reading of today's surface, and any map ` +
    `row is a hypothetical that becomes real only if a map is actually fitted and enabled under CALIBRATION_ADJUSTMENTS_ENABLED — ` +
    `a separate, founder-gated decision this measurement does not make. A single passing split is a cut-point artifact, not a result.`
  );
}

/**
 * Projected calibration of one model version's own rows under three maps,
 * validated out of sample. Returns null — "not measured" — when the version
 * has fewer than MIN_ROWS_FOR_MAP_HOLDOUT time-ordered rows.
 */
export function deployedVersionMapHoldout(
  taggedSamples: readonly MarketAnchoredSample[],
  modelVersion: string,
  opts: DeployedMapHoldoutOptions = {},
): DeployedVersionMapHoldout | null {
  const bins = opts.bins ?? 10;
  const eceFloor = opts.eceFloor ?? DEFAULT_CALIBRATION_FLOORS.ece;
  const nFloor = opts.nFloor ?? DEFAULT_CALIBRATION_FLOORS.n;

  const ofVersion = taggedSamples.filter((s) => s.modelVersion === modelVersion);
  const rows: TimestampedCalibrationSample[] = [];
  let droppedNoSettledAt = 0;
  for (const s of ofVersion) {
    // Ordering is the whole point of a time hold-out: a row with no settled
    // timestamp cannot be placed, and guessing its position would manufacture
    // the very look-ahead the split exists to prevent.
    if (s.settledAtMs == null || !Number.isFinite(s.settledAtMs)) {
      droppedNoSettledAt += 1;
      continue;
    }
    rows.push({ p: s.p, y: s.y, t: s.settledAtMs });
  }

  if (rows.length < MIN_ROWS_FOR_MAP_HOLDOUT) return null;

  const splits = SPLIT_FRACTIONS.map((frac) =>
    runSplit(rows, frac, bins, eceFloor, nFloor, opts.replications),
  );
  const aMapClearsBothFloorsAtEverySplit =
    splits.length > 0 && splits.every((s) => s.aMapClearsBothFloors);

  return {
    generatedAt: (opts.now ?? new Date()).toISOString(),
    modelVersion,
    n: rows.length,
    droppedNoSettledAt,
    bins,
    eceFloor,
    nFloor,
    splits,
    aMapClearsBothFloorsAtEverySplit,
    operatorHint: operatorHintFor(modelVersion, splits, aMapClearsBothFloorsAtEverySplit),
  };
}
