/**
 * Explore Murphy Brier decomposition components (binned).
 *
 * Exact raw Brier = mean (p−y)²
 * Binned identity (approx when p varies inside bins):
 *   Brier ≈ REL − RES + UNC
 *
 * REL  reliability  — mean forecast vs observed rate in bin (↓ better) → maps target this
 * RES  resolution   — bin observed rate vs overall base rate (↑ better) → ranking / features
 * UNC  uncertainty  — baseRate·(1−baseRate) fixed by data
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import { brierDecomposition } from "@sports/prediction-engine";

export type MurphyComponentExplainer = {
  readonly brier: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
  readonly baseRate: number;
  readonly sampleSize: number;
  /** REL − RES + UNC (binned reconstruction; may ≠ raw brier) */
  readonly binnedReconstruction: number;
  readonly withinBinGap: number;
  readonly components: readonly {
    readonly key: "REL" | "RES" | "UNC";
    readonly value: number;
    readonly role: string;
    readonly action: string;
  }[];
  readonly liveContext: string;
  readonly provenImplication: string;
};

export function exploreMurphyComponents(
  samples: readonly CalibrationSample[],
  bins = 10,
): MurphyComponentExplainer {
  const d = brierDecomposition(samples, bins);
  const binnedReconstruction = d.reliability - d.resolution + d.uncertainty;
  const withinBinGap = d.brier - binnedReconstruction;

  return {
    brier: d.brier,
    reliability: d.reliability,
    resolution: d.resolution,
    uncertainty: d.uncertainty,
    baseRate: d.baseRate,
    sampleSize: d.sampleSize,
    binnedReconstruction,
    withinBinGap,
    components: [
      {
        key: "REL",
        value: d.reliability,
        role: "Calibration error: forecasts don’t match observed rates in bins.",
        action: "Platt / Temp / Isotonic reduce REL. Floor target ≤ ~0.05 related to ECE story.",
      },
      {
        key: "RES",
        value: d.resolution,
        role: "Ranking power: bins’ hit rates differ from base rate.",
        action: "Raise with features, selective publish, sport models. Maps do NOT invent RES.",
      },
      {
        key: "UNC",
        value: d.uncertainty,
        role: "Irreducible given base rate (harder games → higher UNC).",
        action: "Context only — not a lever for PROVEN.",
      },
    ],
    liveContext:
      "Production (~map n=760): Brier≈0.275, REL≈0.026, RES≈0.002, UNC≈0.25 → almost no ranking.",
    provenImplication:
      "Eligibility RED is correct. Path: raise RES first → then maps for REL → GREEN×K → AUTO_PUBLISH.",
  };
}

/** Human check: identity gap should shrink as forecasts are more bin-constant. */
export function murphyIdentityGap(samples: readonly CalibrationSample[], bins = 10): number {
  const e = exploreMurphyComponents(samples, bins);
  return e.withinBinGap;
}
