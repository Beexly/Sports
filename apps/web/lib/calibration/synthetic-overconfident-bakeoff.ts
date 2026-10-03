/**
 * Deterministic synthetic population for bake-off stress tests.
 * Mirrors poorly calibrated, low-resolution forecasts (live: Murphy resolution ≈ 0.002).
 * Not production data. Used only to test whether recalibration alone can clear floors.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import { runOfflineBakeoff, type BakeoffReport } from "@/lib/calibration/offline-bakeoff";

/** Floors mirrored from eligibility (do not change product floors here). */
export const ELIGIBILITY_FLOORS = {
  brier: 0.22,
  ece: 0.05,
  murphyReliability: 0.05,
  n: 100,
} as const;

/**
 * Generate overconfident samples: forecast p clustered at 0.6–0.8 while true rate ~0.5.
 * Low resolution: p barely ranks outcomes.
 */
export function synthesizeLowResolutionOverconfident(
  n: number,
  seed = 42,
): { samples: CalibrationSample[]; groupKeys: string[] } {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const groups = ["nfl|spread", "nba|total", "mlb|ml", "nhl|ml"];
  const samples: CalibrationSample[] = [];
  const groupKeys: string[] = [];
  for (let i = 0; i < n; i++) {
    // Mild signal only
    const latent = rand();
    const trueP = 0.48 + 0.04 * Math.sin(i / 17);
    const y = (rand() < trueP ? 1 : 0) as 0 | 1;
    // Model overconfident and poorly ordered
    const p = Math.min(0.85, Math.max(0.55, 0.62 + 0.12 * (latent - 0.5) + 0.05 * Math.sin(i)));
    samples.push({ p, y });
    groupKeys.push(groups[i % groups.length]!);
  }
  return { samples, groupKeys };
}

export function methodWouldPassFloors(m: {
  brier: number;
  ece: number;
  murphyReliability: number;
  nTest: number;
}): boolean {
  return (
    m.nTest >= ELIGIBILITY_FLOORS.n &&
    m.brier <= ELIGIBILITY_FLOORS.brier &&
    m.ece <= ELIGIBILITY_FLOORS.ece &&
    m.murphyReliability <= ELIGIBILITY_FLOORS.murphyReliability
  );
}

export function runSyntheticFloorStressBakeoff(n = 760): BakeoffReport & {
  readonly anyMethodPassesFloors: boolean;
  readonly conclusion: string;
} {
  const { samples, groupKeys } = synthesizeLowResolutionOverconfident(n);
  const report = runOfflineBakeoff(samples, 0.7, groupKeys);
  const any = report.methods.some((m) => methodWouldPassFloors(m));
  const conclusion = any
    ? "At least one recalibration method clears floors on this synthetic low-resolution set — candidate for offline bake-off on live canonical only; do not enable adjustments without founder YES."
    : "Engine resolution insufficient on this low-resolution synthetic set: recalibration alone does not unlock PROVEN floors. Live Murphy resolution≈0.002 supports the same diagnosis — improve ranking/signal, not only maps.";
  return { ...report, anyMethodPassesFloors: any, conclusion };
}
