/**
 * Model selection: accuracy vs calibration (arXiv 2303.06021v4).
 *
 * Engine-honesty infrastructure: run the model bake-off with a
 * two-branch selection — the same candidate learners optimized on
 * accuracy vs on 20-bin classwise-ECE (with the 80%-nonempty-bins
 * guard). Adopt classwise-ECE as the primary selection metric for the
 * probability engine, replacing accuracy wherever it gates promotion;
 * replace full Kelly with fractional Kelly <= 1/8 in any sizing module.
 *
 * ACCEPTANCE GATE: ADOPT if, on the test window, the ECE-selected model
 * achieves >= 3 pp lower classwise-ECE than the accuracy-selected model
 * AND its season ROI beats the accuracy-selected model's ROI under both
 * fixed-stakes and 1/8-Kelly rules; REJECT if the accuracy-selected
 * model wins ROI under either rule by more than 5 pp.
 *
 * Research-only module. Not wired into any live selection path.
 */

export interface Forecast {
  prob: number; // P(home win)
  outcome: number; // 1 home win, 0 away win
}

/**
 * 20-bin classwise-ECE: bin by predicted probability, |mean prob -
 * mean outcome| weighted by bin mass. The 80%-nonempty-bins guard
 * rejects degenerate score distributions.
 */
export function classwiseEce(
  forecasts: readonly Forecast[],
  bins = 20,
): { ece: number; nonemptyFraction: number; guardPass: boolean } {
  if (forecasts.length === 0) throw new Error("classwiseEce: no forecasts");
  const counts = new Array<number>(bins).fill(0);
  const pSum = new Array<number>(bins).fill(0);
  const ySum = new Array<number>(bins).fill(0);
  for (const f of forecasts) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(f.prob * bins)));
    counts[b] = (counts[b] as number) + 1;
    pSum[b] = (pSum[b] as number) + f.prob;
    ySum[b] = (ySum[b] as number) + f.outcome;
  }
  let ece = 0;
  let nonempty = 0;
  for (let b = 0; b < bins; b++) {
    if ((counts[b] as number) === 0) continue;
    nonempty++;
    ece +=
      (counts[b] as number) *
      Math.abs((pSum[b] as number) / (counts[b] as number) - (ySum[b] as number) / (counts[b] as number));
  }
  ece /= forecasts.length;
  const nonemptyFraction = nonempty / bins;
  return { ece, nonemptyFraction, guardPass: nonemptyFraction >= 0.8 };
}

/** Accuracy of the argmax rule at the 0.5 threshold. */
export function accuracy(forecasts: readonly Forecast[]): number {
  if (forecasts.length === 0) throw new Error("accuracy: no forecasts");
  const correct = forecasts.filter((f) => (f.prob >= 0.5 ? 1 : 0) === f.outcome).length;
  return correct / forecasts.length;
}

export interface CandidateResult {
  name: string;
  forecasts: Forecast[];
}

/**
 * Two-branch bake-off: pick the best candidate by accuracy and by
 * classwise-ECE (guard must pass). Returns the gate comparison.
 */
export function bakeOff(candidates: readonly CandidateResult[]): {
  accuracyWinner: string;
  eceWinner: string;
  eceImprovementPp: number;
  accuracyOfEceWinner: number;
  accuracyOfAccuracyWinner: number;
} {
  if (candidates.length === 0) throw new Error("bakeOff: no candidates");
  const scored = candidates.map((c) => {
    const { ece, guardPass } = classwiseEce(c.forecasts);
    if (!guardPass) throw new Error(`bakeOff: ECE guard failed for ${c.name}`);
    return { name: c.name, ece, acc: accuracy(c.forecasts) };
  });
  const accWinner = scored.reduce((a, b) => (b.acc > a.acc ? b : a));
  const eceWinner = scored.reduce((a, b) => (b.ece < a.ece ? b : a));
  return {
    accuracyWinner: accWinner.name,
    eceWinner: eceWinner.name,
    eceImprovementPp: (accWinner.ece - eceWinner.ece) * 100,
    accuracyOfEceWinner: eceWinner.acc,
    accuracyOfAccuracyWinner: accWinner.acc,
  };
}

/**
 * Fractional-Kelly stake: kellyFraction * edge/odds, capped at
 * maxFraction (<= 1/8 per the paper's sizing rule).
 */
export function fractionalKellyStake(
  prob: number,
  decimalOdds: number,
  kellyFraction: number,
  maxFraction = 1 / 8,
): number {
  if (prob <= 0 || prob >= 1) throw new Error("fractionalKellyStake: prob in (0,1)");
  if (decimalOdds <= 1) throw new Error("fractionalKellyStake: odds > 1");
  if (kellyFraction <= 0 || kellyFraction > maxFraction) {
    throw new Error("fractionalKellyStake: fraction in (0, 1/8]");
  }
  const b = decimalOdds - 1;
  const kelly = (b * prob - (1 - prob)) / b;
  return Math.max(0, kelly * kellyFraction);
}

/** Gate verdict from the pre-registered comparison. */
export function selectionVerdict(
  eceImprovementPp: number,
  roiEceFixed: number,
  roiAccFixed: number,
  roiEceKelly: number,
  roiAccKelly: number,
): "adopt-ece" | "reject" | "inconclusive" {
  if (
    eceImprovementPp >= 3 &&
    roiEceFixed > roiAccFixed &&
    roiEceKelly > roiAccKelly
  ) {
    return "adopt-ece";
  }
  if (roiAccFixed - roiEceFixed > 5 || roiAccKelly - roiEceKelly > 5) return "reject";
  return "inconclusive";
}
