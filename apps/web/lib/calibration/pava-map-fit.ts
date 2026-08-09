/**
 * PAVA → versioned PavaMap with blocks + optional Wilson block intervals.
 * Internal uncertainty only — never public ROI/claims.
 */

import type {
  BlockInterval,
  CalibPair,
  PavaBlock,
  PavaFitResult,
  PavaMap,
} from "@/lib/calibration/calib-types";
import { pava } from "@/lib/calibration/isotonic-pava";

function clampP(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

/** Wilson score interval for binomial proportion. */
export function wilsonInterval(
  wins: number,
  n: number,
  z = 1.96,
): { lower: number; upper: number } {
  if (n <= 0) return { lower: 0, upper: 1 };
  const phat = wins / n;
  const z2 = z * z;
  const den = 1 + z2 / n;
  const center = phat + z2 / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * n)) / n);
  return {
    lower: clampP((center - margin) / den),
    upper: clampP((center + margin) / den),
  };
}

export function fitPavaMap(
  pairs: readonly CalibPair[],
  options?: {
    readonly scoreSpace?: "probability" | "logit";
    readonly dateRange?: { from: string; to: string };
    readonly modelVersion?: string;
  },
): PavaFitResult {
  const scoreSpace = options?.scoreSpace ?? "probability";
  if (pairs.length === 0) {
    const map: PavaMap = {
      method: "isotonic_pava",
      blocks: [{ scoreMin: 0, scoreMax: 1, mean: 0.5, n: 0, wins: 0 }],
      scoreSpace,
      nTrain: 0,
      dateRange: options?.dateRange ?? { from: "", to: "" },
      modelVersion: options?.modelVersion ?? "",
    };
    return { map, fitted: [] };
  }

  const ordered = pairs
    .map((p) => ({
      score: p.score,
      outcome: p.outcome,
      weight: p.weight ?? 1,
    }))
    .sort((a, b) => a.score - b.score);

  const y = ordered.map((r) => r.outcome);
  const w = ordered.map((r) => r.weight);
  const fittedRaw = pava(y, w).map(clampP);
  const fitted = fittedRaw.slice();

  // Collapse contiguous equal-mean blocks
  const blocks: PavaBlock[] = [];
  let i = 0;
  while (i < ordered.length) {
    let j = i;
    const m = fitted[i]!;
    let wins = 0;
    let n = 0;
    while (j < ordered.length && Math.abs(fitted[j]! - m) < 1e-12) {
      wins += ordered[j]!.outcome * ordered[j]!.weight;
      n += ordered[j]!.weight;
      j++;
    }
    blocks.push({
      scoreMin: ordered[i]!.score,
      scoreMax: ordered[j - 1]!.score,
      mean: m,
      n,
      wins,
    });
    i = j;
  }

  const map: PavaMap = {
    method: "isotonic_pava",
    blocks,
    scoreSpace,
    nTrain: pairs.length,
    dateRange: options?.dateRange ?? { from: "", to: "" },
    modelVersion: options?.modelVersion ?? "",
  };
  return { map, fitted };
}

export function pavaMapPredict(score: number, map: PavaMap): number {
  if (map.blocks.length === 0) return 0.5;
  if (score <= map.blocks[0]!.scoreMin) return map.blocks[0]!.mean;
  if (score >= map.blocks[map.blocks.length - 1]!.scoreMax) {
    return map.blocks[map.blocks.length - 1]!.mean;
  }
  for (const b of map.blocks) {
    if (score >= b.scoreMin && score <= b.scoreMax) return b.mean;
  }
  // between blocks: nearest
  for (let i = 0; i < map.blocks.length - 1; i++) {
    if (score > map.blocks[i]!.scoreMax && score < map.blocks[i + 1]!.scoreMin) {
      return map.blocks[i]!.mean;
    }
  }
  return map.blocks[map.blocks.length - 1]!.mean;
}

export function blockWilsonIntervals(map: PavaMap): readonly BlockInterval[] {
  return map.blocks.map((b) => {
    const w = wilsonInterval(b.wins, b.n);
    return {
      scoreMin: b.scoreMin,
      scoreMax: b.scoreMax,
      mean: b.mean,
      lower: w.lower,
      upper: w.upper,
      n: b.n,
    };
  });
}
