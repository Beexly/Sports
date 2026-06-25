/**
 * GENESIS LAYER — Law-Making Constitution (Invention 57).
 *
 * If GSE invents concepts, it needs rules for when a concept is allowed to become real. A proposed
 * concept must pass NINE gates: novelty, compression, decision leverage, falsifiability, replay
 * survival, cross-surface support, ghost defense, governance, and simplicity. Passing all nine earns
 * HYPOTHESIS status; LAW requires additional out-of-sample windows. This is "new concept → trial →
 * prosecutor → replay → promotion or burial", not "we made up a cool name." Pure + deterministic.
 */

export interface ConstitutionEvidence {
  readonly novelty: number;             // 0..1
  readonly compression: number;         // 0..1
  readonly decisionLeverage: number;    // 0..1
  readonly falsifiable: boolean;
  readonly replaySurvived: boolean;
  readonly crossSurfaceSupport: number; // 0..1
  readonly ghostDefense: number;        // 0..1 (1 = clearly different from any ghost)
  readonly governanceSafe: boolean;
  readonly simplicity: number;          // 0..1 (1 = simple)
  /** Independent out-of-sample windows survived (LAW requires ≥ minLawWindows). */
  readonly oosWindowsSurvived: number;
}

export interface ConstitutionCheck {
  readonly gate: string;
  readonly passed: boolean;
  readonly reason: string;
}

export type ConstitutionVerdict = "GRADUATE_LAW" | "GRADUATE_HYPOTHESIS" | "REJECTED";

export interface ConstitutionResult {
  readonly checks: readonly ConstitutionCheck[];
  readonly passedCount: number;
  readonly verdict: ConstitutionVerdict;
  readonly note: string;
}

export interface ConstitutionThresholds {
  readonly minNovelty?: number;
  readonly minCompression?: number;
  readonly minDecisionLeverage?: number;
  readonly minCrossSurface?: number;
  readonly minGhostDefense?: number;
  readonly minSimplicity?: number;
  readonly minLawWindows?: number;
}

/** Evaluate a proposed concept against the constitution. All nine gates must pass to graduate. */
export function evaluateConstitution(e: ConstitutionEvidence, t: ConstitutionThresholds = {}): ConstitutionResult {
  const minNovelty = t.minNovelty ?? 0.3;
  const minCompression = t.minCompression ?? 0.1;
  const minLeverage = t.minDecisionLeverage ?? 0.05;
  const minCross = t.minCrossSurface ?? 0.3;
  const minGhostDefense = t.minGhostDefense ?? 0.5;
  const minSimplicity = t.minSimplicity ?? 0.3;
  const minLawWindows = t.minLawWindows ?? 2;

  const checks: ConstitutionCheck[] = [
    { gate: "novelty", passed: e.novelty >= minNovelty, reason: `novelty ${e.novelty.toFixed(2)} vs ${minNovelty}` },
    { gate: "compression", passed: e.compression >= minCompression, reason: `compression ${e.compression.toFixed(2)} vs ${minCompression}` },
    { gate: "decision_leverage", passed: e.decisionLeverage >= minLeverage, reason: `leverage ${e.decisionLeverage.toFixed(2)} vs ${minLeverage}` },
    { gate: "falsifiability", passed: e.falsifiable, reason: e.falsifiable ? "has a falsifier" : "no falsifier defined" },
    { gate: "replay_survival", passed: e.replaySurvived, reason: e.replaySurvived ? "survived point-in-time replay" : "failed replay" },
    { gate: "cross_surface_support", passed: e.crossSurfaceSupport >= minCross, reason: `cross-surface ${e.crossSurfaceSupport.toFixed(2)} vs ${minCross}` },
    { gate: "ghost_defense", passed: e.ghostDefense >= minGhostDefense, reason: `ghost defense ${e.ghostDefense.toFixed(2)} vs ${minGhostDefense}` },
    { gate: "governance", passed: e.governanceSafe, reason: e.governanceSafe ? "safe to express" : "governance risk" },
    { gate: "simplicity", passed: e.simplicity >= minSimplicity, reason: `simplicity ${e.simplicity.toFixed(2)} vs ${minSimplicity}` },
  ];
  const passedCount = checks.filter((c) => c.passed).length;
  const allPass = passedCount === checks.length;

  let verdict: ConstitutionVerdict;
  if (!allPass) verdict = "REJECTED";
  else if (e.oosWindowsSurvived >= minLawWindows) verdict = "GRADUATE_LAW";
  else verdict = "GRADUATE_HYPOTHESIS";

  return {
    checks,
    passedCount,
    verdict,
    note: verdict === "REJECTED"
      ? `Failed ${checks.length - passedCount} gate(s): ${checks.filter((c) => !c.passed).map((c) => c.gate).join(", ")}.`
      : verdict === "GRADUATE_LAW"
        ? `All gates pass and ${e.oosWindowsSurvived} OOS windows survived — graduates to LAW.`
        : `All gates pass but only ${e.oosWindowsSurvived}/${minLawWindows} OOS windows — graduates to HYPOTHESIS, not LAW.`,
  };
}
