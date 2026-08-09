/**
 * Canonical Murphy RES (resolution) definition for GSE ops truth + eligibility.
 *
 * Machine-readable contract so agents never confuse RES with win rate, ECE,
 * or conformal coverage.
 */

import {
  explainLiveMurphy,
  resNeededForBrierFloor,
} from "@/lib/calibration/brier-minimization-explore";

export const MURPHY_RES_DEFINITION = {
  name: "Murphy resolution (binned)",
  symbol: "RES",
  higherIsBetter: true,
  formulaPlain:
    "For equal-width bins on forecast p: RES = Σ (n_k/n) · (ō_k − ȳ)² where ō_k is the observed win rate in bin k and ȳ is the overall base rate.",
  identityPlain:
    "Brier ≈ REL − RES + UNC (exact only when p is constant inside bins; otherwise ≈ with a small within-bin variance gap).",
  components: {
    REL: {
      name: "reliability",
      higherIsBetter: false,
      meaning:
        "Mass-weighted (mean forecast − observed rate)² per bin — calibration error",
    },
    RES: {
      name: "resolution",
      higherIsBetter: true,
      meaning:
        "Mass-weighted (observed rate − base rate)² per bin — how much outcome rates differ across p-bins (ranking power)",
    },
    UNC: {
      name: "uncertainty",
      higherIsBetter: false,
      meaning: "ȳ(1−ȳ) — irreducible base-rate noise; not a free product lever",
    },
  },
  notTheSameAs: [
    "Win rate / ROI / streak",
    "ECE (L1 |f−o| calibration gap)",
    "Conformal coverage (set validity, not ranking)",
    "Separation alone (mean p|win − mean p|loss) — related diagnostic, not RES",
    "Commenced pick count",
  ],
  howToRaise: [
    "Independent modelProb / edge ranking (not confidence/100 market echo)",
    "Selective |p−0.5|≥δ + pause Res≈0 sport|market groups",
    "Market-relative features when odds exist",
    "Sport-specific models when global score is flat",
  ],
  howNotToRaise: [
    "Platt / temperature / isotonic / beta maps (cut REL only)",
    "Lowering floors or inventing sample",
    "Conformal abstain flags",
    "Demo or seed picks",
  ],
  binsDefault: 10,
  floorsContext: {
    brierFloor: 0.22,
    resNeededApprox: "residualRel + UNC − brierFloor",
  },
} as const;

export type MurphyResLiveSnapshot = {
  readonly definition: typeof MURPHY_RES_DEFINITION;
  readonly live: {
    readonly brier: number;
    readonly reliability: number;
    readonly resolution: number;
    readonly uncertainty: number;
    readonly resNeededForBrierFloor: number;
    readonly resGap: number;
    readonly separationHint: string;
  };
  readonly explain: string;
};

/**
 * Build structured RES snapshot for ops truth — zero founder interpretation required.
 */
export function buildMurphyResSnapshot(terms: {
  readonly brier: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
}): MurphyResLiveSnapshot {
  const need = resNeededForBrierFloor(terms.uncertainty);
  const gap = Math.max(0, need - terms.resolution);
  return {
    definition: MURPHY_RES_DEFINITION,
    live: {
      brier: terms.brier,
      reliability: terms.reliability,
      resolution: terms.resolution,
      uncertainty: terms.uncertainty,
      resNeededForBrierFloor: need,
      resGap: gap,
      separationHint:
        terms.resolution < 0.01
          ? "RES near 0 ⇒ bins finish near base rate — scores barely rank outcomes"
          : "RES material — bins differ in observed rates; maps may polish REL next",
    },
    explain: explainLiveMurphy(terms),
  };
}
