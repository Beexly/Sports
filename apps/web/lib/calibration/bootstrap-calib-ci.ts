/**
 * Bootstrap percentile bands for calibration maps — internal only.
 * Not for public ROI / verified claims.
 *
 * for b = 1..B: resample train, refit, evaluate on score grid;
 * CI(s) = percentile 2.5% .. 97.5%.
 */

import type { BootstrapBand, CalibPair } from "@/lib/calibration/calib-types";
import { fitPavaMap, pavaMapPredict } from "@/lib/calibration/pava-map-fit";
import { fitPlattIrlS, plattPredict } from "@/lib/calibration/platt-map-artifact";
import { fitTemperature, temperatureMapPredict } from "@/lib/calibration/temperature-map";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function logit(p: number): number {
  const x = Math.min(1 - 1e-6, Math.max(1e-6, p));
  return Math.log(x / (1 - x));
}

export function bootstrapCalibrationBand(
  train: readonly CalibPair[],
  options?: {
    readonly method?: "isotonic_pava" | "platt_map_irls" | "temperature";
    readonly B?: number;
    readonly seed?: number;
    readonly grid?: readonly number[];
  },
): BootstrapBand {
  const method = options?.method ?? "isotonic_pava";
  const B = options?.B ?? 50;
  const rand = mulberry32(options?.seed ?? 42);
  const grid =
    options?.grid ??
    Array.from({ length: 21 }, (_, i) => 0.05 + (0.9 * i) / 20);

  const curves: number[][] = grid.map(() => []);

  for (let b = 0; b < B; b++) {
    const sample: CalibPair[] = [];
    for (let i = 0; i < train.length; i++) {
      const idx = Math.floor(rand() * train.length);
      sample.push(train[idx]!);
    }
    let predict: (s: number) => number;
    if (method === "platt_map_irls") {
      const map = fitPlattIrlS(
        sample.map((r) => ({
          score: r.score > 0 && r.score < 1 ? logit(r.score) : r.score,
          outcome: r.outcome,
        })),
      );
      predict = (s) => plattPredict(s > 0 && s < 1 ? logit(s) : s, map);
    } else if (method === "temperature") {
      const map = fitTemperature(
        sample.map((r) => ({
          logit: r.score > 0 && r.score < 1 ? logit(r.score) : r.score,
          outcome: r.outcome,
        })),
      );
      predict = (s) =>
        temperatureMapPredict(s > 0 && s < 1 ? logit(s) : s, map);
    } else {
      const { map } = fitPavaMap(sample, { scoreSpace: "probability" });
      predict = (s) => pavaMapPredict(s, map);
    }
    for (let g = 0; g < grid.length; g++) {
      curves[g]!.push(predict(grid[g]!));
    }
  }

  const lower: number[] = [];
  const upper: number[] = [];
  for (const col of curves) {
    const sorted = [...col].sort((a, b) => a - b);
    const lo = sorted[Math.floor(0.025 * (sorted.length - 1))] ?? 0;
    const hi = sorted[Math.ceil(0.975 * (sorted.length - 1))] ?? 1;
    lower.push(lo);
    upper.push(hi);
  }

  return {
    scoreGrid: grid,
    lower,
    upper,
    nBootstrap: B,
    note: "Internal bootstrap band only — not for public claims or ROI.",
  };
}
