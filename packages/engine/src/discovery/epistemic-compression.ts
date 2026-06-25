/**
 * DISCOVERY LAYER — Epistemic Compression Engine (Invention 24).
 *
 * The first true invention layer: stop collecting features, start discovering CONCEPTS. A theory
 * earns its place by explaining the most market behavior with the LEAST complexity — and
 * complexity must pay rent. A 50-variable model that barely beats a 4-variable invariant should
 * lose. A simple law that survives five seasons, three market families, and two books should win.
 *
 *   TheoryValue = predictive_gain + causal_explanation_gain + compression_gain + tradability_gain
 *               − complexity_penalty − data_rights_risk − instability_penalty − leakage_risk
 *
 * Every theory resolves to LAW (stable enough to guide action), HYPOTHESIS (promising, unproven),
 * or GHOST (attractive pattern killed by evidence). GSE stores the ghosts — that is how it learns.
 * Pure + deterministic.
 */

export interface TheoryEvidence {
  readonly predictiveGain: number;
  readonly causalExplanationGain: number;
  readonly compressionGain: number;
  readonly tradabilityGain: number;
  readonly complexityPenalty: number;
  readonly dataRightsRisk: number;
  readonly instabilityPenalty: number;
  readonly leakageRisk: number;
  /** Survival evidence for LAW status. */
  readonly seasonsSurvived: number;
  readonly marketFamiliesSurvived: number;
  readonly booksSurvived: number;
  readonly outOfSampleSurvived: boolean;
}

export type TheoryStatus = "LAW" | "HYPOTHESIS" | "GHOST";

export interface TheoryValueResult {
  readonly theoryValue: number;
  readonly status: TheoryStatus;
  readonly reasons: readonly string[];
}

export interface CompressionOptions {
  /** Minimum seasons to qualify as a LAW. Default 3. */
  readonly minSeasons?: number;
  readonly minFamilies?: number;
  readonly minBooks?: number;
  /** TheoryValue below this with no leakage is a HYPOTHESIS; ≤0 or leakage is a GHOST. */
  readonly lawValueThreshold?: number;
}

/** Score a theory's value and classify it as LAW / HYPOTHESIS / GHOST. */
export function scoreTheoryValue(e: TheoryEvidence, options: CompressionOptions = {}): TheoryValueResult {
  const minSeasons = options.minSeasons ?? 3;
  const minFamilies = options.minFamilies ?? 2;
  const minBooks = options.minBooks ?? 2;
  const lawThreshold = options.lawValueThreshold ?? 0.5;

  const theoryValue =
    e.predictiveGain + e.causalExplanationGain + e.compressionGain + e.tradabilityGain -
    e.complexityPenalty - e.dataRightsRisk - e.instabilityPenalty - e.leakageRisk;

  const reasons: string[] = [];

  // GHOST first: any fatal flaw or non-positive value kills it.
  if (e.leakageRisk >= 0.5) {
    reasons.push("Leakage risk too high — buried as a GHOST (correctness, not performance).");
    return { theoryValue, status: "GHOST", reasons };
  }
  if (theoryValue <= 0 || !e.outOfSampleSurvived) {
    reasons.push(theoryValue <= 0 ? "Non-positive theory value after penalties." : "Failed out-of-sample survival.");
    return { theoryValue, status: "GHOST", reasons };
  }

  // LAW requires value AND breadth of survival.
  const breadthOk = e.seasonsSurvived >= minSeasons && e.marketFamiliesSurvived >= minFamilies && e.booksSurvived >= minBooks;
  if (theoryValue >= lawThreshold && breadthOk) {
    reasons.push(`LAW: value ${theoryValue.toFixed(2)} ≥ ${lawThreshold}, survived ${e.seasonsSurvived} seasons / ${e.marketFamiliesSurvived} families / ${e.booksSurvived} books, OOS.`);
    return { theoryValue, status: "LAW", reasons };
  }

  reasons.push(
    !breadthOk
      ? `HYPOTHESIS: positive value but insufficient breadth (seasons ${e.seasonsSurvived}/${minSeasons}, families ${e.marketFamiliesSurvived}/${minFamilies}, books ${e.booksSurvived}/${minBooks}).`
      : `HYPOTHESIS: value ${theoryValue.toFixed(2)} below LAW threshold ${lawThreshold}.`,
  );
  return { theoryValue, status: "HYPOTHESIS", reasons };
}

/** Compression preference: of two theories explaining the same data, the simpler wins (Occam rent). */
export function preferSimpler(a: TheoryEvidence, b: TheoryEvidence): "a" | "b" | "tie" {
  const va = scoreTheoryValue(a).theoryValue;
  const vb = scoreTheoryValue(b).theoryValue;
  if (Math.abs(va - vb) < 1e-9) return a.complexityPenalty < b.complexityPenalty ? "a" : b.complexityPenalty < a.complexityPenalty ? "b" : "tie";
  return va > vb ? "a" : "b";
}
