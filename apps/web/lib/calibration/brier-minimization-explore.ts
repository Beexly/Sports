/**
 * Brier score minimization — technique catalog + Murphy math helpers.
 *
 * Exact Brier: BS = E[(P − Y)²]
 * Murphy (binned diagnostic): BS ≈ REL − RES + UNC
 *
 * With live UNC≈0.25, REL small (~0.004–0.02), the only path to BS≤0.22 is
 * RES ≳ 0.03–0.05 (raise ranking), not maps (cut REL only).
 *
 * Under perfect calibration: BS = UNC − Var[P]. So raising conditional
 * forecast variance while staying calibrated is the RES program.
 *
 * Law: no stretch, no invent PROVEN, maps apply OFF until RES moves.
 */

export type BrierLever = {
  readonly lever: string;
  readonly targets: "RES" | "REL" | "UNC" | "sample" | "ensemble";
  readonly effect: string;
  readonly autonomous: boolean;
  readonly unlocksProven: boolean;
  /** Technique family for ops docs. */
  readonly family:
    | "ranking"
    | "selective"
    | "calibration_map"
    | "ensemble"
    | "forbidden";
};

/**
 * Ranked levers — RES first, then ensemble diversity, then REL maps (gated).
 */
export const BRIER_MINIMIZATION_LEVERS: readonly BrierLever[] = [
  {
    lever: "Independent modelProb (trueProb / sport models) instead of confidence/100",
    targets: "RES",
    effect:
      "Injects non-market signal so E[Y|P] separates; primary path to Var[P] and RES",
    autonomous: true,
    unlocksProven: true,
    family: "ranking",
  },
  {
    lever: "Selective publish |p−0.5|≥δ with integrity (BS_paused ≈ UNC)",
    targets: "RES",
    effect:
      "Raises Var[P|A_δ] and conditional RES; integrity stops discarding skill or hiding toxic middle",
    autonomous: true,
    unlocksProven: true,
    family: "selective",
  },
  {
    lever: "Pause dead sport|market groups (Res≈0 ∪ significance-dead)",
    targets: "RES",
    effect: "Removes groups with no ranking power from published conditional metrics",
    autonomous: true,
    unlocksProven: true,
    family: "selective",
  },
  {
    lever: "Market-anchored blend + fixed evidence shrink (α) — not fitted map",
    targets: "REL",
    effect:
      "Cuts overconfident independent noise vs books; REL↓ without claiming RES from stretch",
    autonomous: true,
    unlocksProven: false,
    family: "ranking",
  },
  {
    lever: "Brier-OGD / online convex ensemble of diverse member probs",
    targets: "ensemble",
    effect:
      "Regret-bounded weights maximize skill vs best fixed convex combo; RES only if members diversify",
    autonomous: true,
    unlocksProven: true,
    family: "ensemble",
  },
  {
    lever: "Market-relative edge filter when lines exist",
    targets: "RES",
    effect: "Aligns publish set with CLV story; filters market-echo noise",
    autonomous: true,
    unlocksProven: true,
    family: "selective",
  },
  {
    lever: "Platt / Temp / Isotonic(PAVA/CIR) / Beta maps",
    targets: "REL",
    effect:
      "Lower reliability + log-loss; cannot invent RES (Var[g(P)] ≤ Var[P]). Apply OFF until RES moves",
    autonomous: false,
    unlocksProven: false,
    family: "calibration_map",
  },
  {
    lever: "Probability stretch p' = 0.5 + k(p−0.5), k>1",
    targets: "sample",
    effect: "FORBIDDEN — fake Var[P]; REL explodes; Murphy shows BS can worsen",
    autonomous: false,
    unlocksProven: false,
    family: "forbidden",
  },
  {
    lever: "Lower floors or invent metrics / cherry-pick after settle",
    targets: "sample",
    effect: "FORBIDDEN — theater, not skill",
    autonomous: false,
    unlocksProven: false,
    family: "forbidden",
  },
];

/**
 * Technique playbook (math → ops) for agents/founders.
 */
export const BRIER_OPTIMIZATION_TECHNIQUES = [
  {
    id: "murphy_target",
    title: "Target RES − REL ≥ UNC − floor",
    math: "BS ≈ REL − RES + UNC → RES − REL ≥ UNC − 0.22",
    gse: "With UNC≈0.25 need RES−REL ≳ 0.03; maps only shrink REL",
  },
  {
    id: "var_p",
    title: "Conditional forecast variance",
    math: "Calibrated: BS = UNC − Var[P]; need Var[P|A_δ] ≳ 0.03",
    gse: "segmented-murphy.varP / varPNeededForFloor",
  },
  {
    id: "integrity_delta",
    title: "Integrity-guarded δ",
    math: "min δ s.t. BS_δ≤0.22 ∧ BS_paused≈UNC (±ε); BS_paused≪0.25 discards skill",
    gse: "integrityGuardedDeltaSweep + selectivePublishSweep dual-objective",
  },
  {
    id: "independent_signal",
    title: "Independent feature streams",
    math: "RES = Var[E[Y|P]]; P must use non-echo features",
    gse: "trueProb backfill · MLB standings · nflverse EPA · ESPN FPI · Elo · Dixon–Coles",
  },
  {
    id: "ensemble_diversity",
    title: "Convex ensemble + Brier OGD",
    math: "w ← Π_Δ(w − η 2(p−y)p_vec); regret vs best fixed w",
    gse: "packages/prediction-engine/src/brier-ogd-ensemble.ts (shadow)",
  },
  {
    id: "beta_platt_temp",
    title: "Parametric recalibration (REL only)",
    math: "Beta/Platt/Temp minimize NLL or Brier on map; Fisher-consistent under Beta scores",
    gse: "calibration-map-bakeoff · apply OFF while eligibility RED",
  },
  {
    id: "isotonic_cir",
    title: "Isotonic PAVA vs CIR",
    math: "PAVA plateaus collapse ranking; CIR centers preserve strict increase",
    gse: "isotonic-debug · prefer parametric when plateauCollapseRate high",
  },
  {
    id: "anti_stretch",
    title: "No probability stretch",
    math: "Linear stretch multiplies residuals → REL↑ faster than RES helps",
    gse: "detectProbabilityStretch · forbidden lever",
  },
] as const;

/**
 * Back-of-envelope: if REL residual fixed and UNC fixed, need RES for Brier floor.
 * brier ≈ rel − res + unc  →  res ≈ rel + unc − brierFloor
 */
export function resNeededForBrierFloor(
  uncertainty: number,
  brierFloor = 0.22,
  residualRel = 0.02,
): number {
  return Math.max(0, residualRel + uncertainty - brierFloor);
}

/** Calibrated identity inverse: Var[P] needed for floor. */
export function varPNeededForBrierFloorExplore(
  uncertainty: number,
  brierFloor = 0.22,
  residualRel = 0,
): number {
  return Math.max(0, residualRel + uncertainty - brierFloor);
}

export function explainLiveMurphy(terms: {
  readonly brier: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
}): string {
  const need = resNeededForBrierFloor(terms.uncertainty);
  const skillGap = terms.resolution - terms.reliability;
  const needSkill = terms.uncertainty - 0.22;
  return (
    `Brier ${terms.brier.toFixed(4)} ≈ REL ${terms.reliability.toFixed(4)} − RES ${terms.resolution.toFixed(4)} + UNC ${terms.uncertainty.toFixed(4)}. ` +
    `Skill (RES−REL)=${skillGap.toFixed(4)}; need ≳ ${needSkill.toFixed(3)} for floor 0.22. ` +
    `To reach Brier≤0.22 with residual REL~0.02, need Murphy RES ≳ ${need.toFixed(3)} (live ${terms.resolution.toFixed(4)}). ` +
    `Maps shrink REL; only ranking + integrity-guarded selective raise RES. Never stretch p.`
  );
}

export function summarizeBrierProgram(terms: {
  readonly brier: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
  readonly consecutiveGreen?: number;
}): {
  readonly status: "RED" | "NEAR" | "GREEN_METRICS";
  readonly primaryLever: string;
  readonly resGap: number;
  readonly explain: string;
} {
  const need = resNeededForBrierFloor(terms.uncertainty, 0.22, Math.max(0.005, terms.reliability));
  const resGap = Math.max(0, need - terms.resolution);
  const status =
    terms.brier <= 0.22
      ? "GREEN_METRICS"
      : terms.brier <= 0.235
        ? "NEAR"
        : "RED";
  const primaryLever =
    terms.resolution < 0.015
      ? "independent ranking + pause dead groups + selective δ (integrity)"
      : terms.reliability > 0.03
        ? "after RES moves: maps (Temp/Beta) for REL only"
        : "accumulate independent-priced settles under selective discipline";
  return {
    status,
    primaryLever,
    resGap,
    explain: explainLiveMurphy(terms),
  };
}
