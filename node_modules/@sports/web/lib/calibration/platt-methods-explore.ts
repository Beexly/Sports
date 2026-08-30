/**
 * Platt scaling methods — GSE exploration matrix (apply OFF).
 *
 * Already implemented in-tree:
 *  - platt-scaling.ts / platt-map.ts: MAP & MLE Newton–IRLS, Laplace,
 *    hierarchical EB-τ group intercepts
 *  - temperature-map.ts, isotonic-pava, beta (bake-off)
 *
 * This module does NOT re-fit production maps. It classifies methods by
 * what they move (REL vs RES), when apply is allowed, and how they
 * interact with live GSE floors.
 *
 * Innovation: explicit applyGate tied to Murphy RES pathViable, so the
 * website never silently swaps calibrated p while ranking is dead.
 */

import {
  applyPlatt,
  fitPlattIrls,
  fitPlattMapHierarchical,
  type PlattMapFitResult,
  type ProbOutcome,
} from "@/lib/calibration/platt-map";
import { fitPlattFromProbs } from "@/lib/calibration/platt-scaling";

export type PlattMethodId =
  | "identity"
  | "mle_irls"
  | "map_irls"
  | "map_laplace_predictive"
  | "hierarchical_eb_tau";

export type PlattMethodCard = {
  readonly id: PlattMethodId;
  readonly name: string;
  readonly targets: "REL" | "none";
  readonly raisesRes: false;
  readonly implemented: true;
  readonly module: string;
  readonly applyAllowed: boolean;
  readonly summary: string;
};

export type PlattExploreArtifact = {
  readonly generatedAt: string;
  readonly liveRes: number;
  readonly resFloorForMaps: number;
  readonly applyGateOpen: boolean;
  readonly methods: readonly PlattMethodCard[];
  readonly holdout?: {
    readonly nTrain: number;
    readonly nTest: number;
    readonly brierByMethod: Readonly<Record<string, number>>;
    readonly bestByBrier: string;
  };
  readonly note: string;
};

const RES_FLOOR_FOR_MAPS = 0.02;

export function plattMethodCatalog(applyGateOpen: boolean): readonly PlattMethodCard[] {
  return [
    {
      id: "identity",
      name: "Identity (no map)",
      targets: "none",
      raisesRes: false,
      implemented: true,
      module: "shown p as-is",
      applyAllowed: true, // always valid
      summary: "Baseline. Eligibility scores shown probabilities only.",
    },
    {
      id: "mle_irls",
      name: "MLE Platt IRLS",
      targets: "REL",
      raisesRes: false,
      implemented: true,
      module: "apps/web/lib/calibration/platt-map.ts fitPlattIrls({map:false})",
      applyAllowed: applyGateOpen,
      summary: "No prior — overfits small holdouts. Prefer MAP for GSE.",
    },
    {
      id: "map_irls",
      name: "MAP Platt IRLS A~N(1,1) B~N(0,1)",
      targets: "REL",
      raisesRes: false,
      implemented: true,
      module: "platt-map.ts + platt-scaling.ts",
      applyAllowed: applyGateOpen,
      summary: "Default GSE parametric map when ranking has recovered.",
    },
    {
      id: "map_laplace_predictive",
      name: "MAP + Laplace predictive mean",
      targets: "REL",
      raisesRes: false,
      implemented: true,
      module: "platt-map.ts plattPredictiveMean",
      applyAllowed: applyGateOpen,
      summary: "Internal uncertainty only — not public ROI intervals.",
    },
    {
      id: "hierarchical_eb_tau",
      name: "Hierarchical MAP + EB τ ug",
      targets: "REL",
      raisesRes: false,
      implemented: true,
      module: "platt-map.ts fitPlattMapHierarchical",
      applyAllowed: applyGateOpen,
      summary: "sport|market intercepts; τ clamped [0.05,2]. Offline until gate open.",
    },
  ] as const;
}

function brierOf(pairs: readonly { p: number; y: 0 | 1 }[]): number {
  if (pairs.length === 0) return NaN;
  let s = 0;
  for (const r of pairs) {
    const p = Math.min(1 - 1e-15, Math.max(1e-15, r.p));
    s += (p - r.y) ** 2;
  }
  return s / pairs.length;
}

/**
 * Offline compare Platt variants on a time-ordered train/test split.
 * Returns Brier on test only. applyGateOpen is false unless liveRes clears floor.
 */
export function explorePlattMethods(input: {
  readonly train: readonly ProbOutcome[];
  readonly test: readonly ProbOutcome[];
  readonly liveRes: number;
  readonly groups?: readonly (ProbOutcome & { readonly groupKey: string })[];
}): PlattExploreArtifact {
  const applyGateOpen = input.liveRes >= RES_FLOOR_FOR_MAPS;
  const methods = plattMethodCatalog(applyGateOpen);

  const brierByMethod: Record<string, number> = {
    identity: brierOf(input.test),
  };

  if (input.train.length >= 20 && input.test.length >= 10) {
    const mle = fitPlattIrls(input.train, { map: false });
    const map = fitPlattIrls(input.train, { map: true });
    brierByMethod.mle_irls = brierOf(
      input.test.map((t) => ({ p: applyPlatt(t.p, mle.params), y: t.y })),
    );
    brierByMethod.map_irls = brierOf(
      input.test.map((t) => ({ p: applyPlatt(t.p, map.params), y: t.y })),
    );

    // hierarchical only if group keys provided
    if (input.groups && input.groups.length >= 40) {
      const h = fitPlattMapHierarchical(input.groups);
      brierByMethod.hierarchical_eb_tau = brierOf(
        input.test.map((t) => {
          // test rows without group → global only
          return { p: applyPlatt(t.p, h.global), y: t.y };
        }),
      );
    }
  }

  let bestByBrier = "identity";
  let best = Infinity;
  for (const [k, v] of Object.entries(brierByMethod)) {
    if (Number.isFinite(v) && v < best) {
      best = v;
      bestByBrier = k;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    liveRes: input.liveRes,
    resFloorForMaps: RES_FLOOR_FOR_MAPS,
    applyGateOpen,
    methods,
    holdout: {
      nTrain: input.train.length,
      nTest: input.test.length,
      brierByMethod,
      bestByBrier,
    },
    note: applyGateOpen
      ? "RES gate open for offline map selection only — still requires founder CALIBRATION_ADJUSTMENTS / publish path."
      : `RES ${input.liveRes.toFixed(4)} < ${RES_FLOOR_FOR_MAPS}: Platt/Temp/isotonic stay apply OFF. Ranking first.`,
  };
}

/** Smoke: ensure MAP fit is finite on synthetic overconfident data. */
export function smokePlattMap(samples: readonly ProbOutcome[]): PlattMapFitResult {
  return fitPlattIrls(samples, { map: true });
}

export function smokePlattFromProbs(
  samples: readonly { p: number; y: 0 | 1 }[],
): { A: number; B: number } {
  return fitPlattFromProbs(samples);
}
