/**
 * GSE Trust Loop — the reference pipeline the whole competitive field leaves
 * open: de-vig the market → blend model ⊕ market → marshal evidence → return a
 * verdict → FREEZE an auditable receipt before the result → grade CLV after.
 *
 * Across DFS/betting/fantasy/pick-sites, almost no one closes this loop: Outlier
 * has EV/devig but no tracking/CLV; Betstamp has CLV but no outcome calibration;
 * DRatings has calibration but weak UX. GSE already owns the pieces — this module
 * composes them end to end as a pure, illustrative reference implementation the
 * next agent wires to live data.
 *
 * Pure functions only. No DB, no I/O. Receipts are deterministic and verifiable.
 *
 * Companion doc: docs/research/GSE_2026_TRUST_LOOP_AND_MODELS.md
 */

import {
  type Evidence,
  type CounterEvidence,
  type Falsifier,
  type Verdict,
  type VerdictAction,
  scoreEvidenceStrength,
  scoreCounterEvidenceSeverity,
  scoreFalsifierRisk,
  scoreRecommendationConfidence,
  scoreDecisionFragility,
  buildVerdict,
} from "./evidence-engine";
import {
  americanToImpliedProb,
  removeVigProportional,
  blackLittermanBlend,
  type BlendResult,
} from "./projection-models";
import type { GseScore } from "./gse-scoring-systems";

// ─────────────────────────────────────────────────────────────────────────────
// Closing-line value
// ─────────────────────────────────────────────────────────────────────────────

export interface ClvGrade {
  readonly entryProb: number;
  readonly closeProb: number;
  /** Percentage points by which the close implied prob exceeds the entry's. */
  readonly clvPoints: number;
  /** True when you secured a better price than the close (a process win). */
  readonly beatClose: boolean;
}

/**
 * Grade closing-line value from the American odds you took vs the closing American
 * odds. If the closing line implies a HIGHER probability than your entry price,
 * you bought low — you beat the close. CLV is a process signal, never a guarantee
 * the bet won.
 */
export function gradeClv(entryAmerican: number, closeAmerican: number): ClvGrade {
  const entryProb = americanToImpliedProb(entryAmerican);
  const closeProb = americanToImpliedProb(closeAmerican);
  const clvPoints = (closeProb - entryProb) * 100;
  return { entryProb, closeProb, clvPoints, beatClose: clvPoints > 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Trust receipt — frozen, verifiable claim state (pre-result)
// ─────────────────────────────────────────────────────────────────────────────

export interface TrustReceipt {
  readonly claim: string;
  readonly action: VerdictAction;
  readonly confidence: number;
  readonly fragility: number;
  readonly asOf: string;
  readonly whatWouldChange: string;
  /** Deterministic content hash — recomputing it verifies the receipt is intact. */
  readonly hash: string;
}

/** FNV-1a 32-bit hash → 8-hex string. Deterministic, dependency-free. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function receiptPayload(r: Omit<TrustReceipt, "hash">): string {
  return [r.claim, r.action, r.confidence.toFixed(2), r.fragility.toFixed(2), r.asOf, r.whatWouldChange].join("|");
}

/** Freeze a recommendation into an immutable, hashable receipt. */
export function freezeReceipt(input: Omit<TrustReceipt, "hash">): TrustReceipt {
  return { ...input, hash: fnv1a(receiptPayload(input)) };
}

/** Verify a receipt's hash matches its content (tamper check). */
export function verifyReceipt(receipt: TrustReceipt): boolean {
  const { hash, ...rest } = receipt;
  return fnv1a(receiptPayload(rest)) === hash;
}

// ─────────────────────────────────────────────────────────────────────────────
// The end-to-end loop
// ─────────────────────────────────────────────────────────────────────────────

export interface TrustLoopInput {
  /** Two-way market in American odds: [side, otherSide]. */
  readonly marketOdds: readonly [number, number];
  /** Model probability for `side`. */
  readonly modelProb: number;
  /** Precision of the market prior (any scale; only the ratio to model matters). */
  readonly marketConfidence: number;
  readonly modelConfidence: number;
  readonly evidence: readonly Evidence[];
  readonly counterEvidence: readonly CounterEvidence[];
  readonly falsifiers: readonly Falsifier[];
  /** 0..100 data-quality of the decisive inputs. */
  readonly dataQuality: number;
  /** 0..1 model agreement. */
  readonly modelAgreement: number;
  readonly primaryAction: Exclude<VerdictAction, "no_play" | "watchlist" | "wait">;
  readonly inputFreshness: number; // 0..1
  readonly timeToActionMins: number;
  readonly claim: string;
  readonly asOf: string;
}

export interface TrustLoopResult {
  /** Market fair probability for `side` after de-vig. */
  readonly marketFairProb: number;
  readonly blend: BlendResult;
  /** Posterior edge vs the de-vigged market (positive = model sees value). */
  readonly edge: number;
  readonly evidenceStrength: GseScore;
  readonly counterSeverity: GseScore;
  readonly falsifierRisk: GseScore;
  readonly confidence: GseScore;
  readonly fragility: GseScore;
  readonly verdict: Verdict;
  readonly receipt: TrustReceipt;
}

/**
 * Run the full trust loop on one decision. Composes de-vig → Black-Litterman
 * blend → evidence engine → verdict → frozen receipt. Returns every intermediate
 * so the cockpit (and, later, the public Signal Courtroom) can show the work.
 * Illustrative until wired to live inputs.
 */
export function runTrustLoop(input: TrustLoopInput): TrustLoopResult {
  // 1. De-vig the two-way market to a fair probability for `side`.
  const implied = input.marketOdds.map(americanToImpliedProb);
  const fair = removeVigProportional(implied);
  const marketFairProb = fair[0] ?? 0.5;

  // 2. Blend the model view with the market prior, precision-weighted.
  const blend = blackLittermanBlend(marketFairProb, input.modelProb, input.marketConfidence, input.modelConfidence);
  const edge = blend.probability - marketFairProb;

  // 3. Marshal the evidence case.
  const evidenceStrength = scoreEvidenceStrength(input.evidence);
  const counterSeverity = scoreCounterEvidenceSeverity(input.counterEvidence);
  const falsifierRisk = scoreFalsifierRisk(input.falsifiers);
  const confidence = scoreRecommendationConfidence({
    evidenceStrength,
    counterSeverity,
    falsifierRisk,
    dataQuality: input.dataQuality,
    modelAgreement: input.modelAgreement,
  });
  const independentShare =
    input.evidence.length === 0 ? 0 : input.evidence.filter((e) => e.independent).length / input.evidence.length;
  const fragility = scoreDecisionFragility({
    falsifierRisk,
    counterSeverity,
    inputFreshness: input.inputFreshness,
    evidenceIndependence: independentShare,
    timeToActionMins: input.timeToActionMins,
  });

  // 4. Verdict (honest no-play/watchlist downgrades happen inside buildVerdict).
  const whatWouldChange =
    input.falsifiers.length > 0 ? (input.falsifiers[0]!.condition) : "A material change in the decisive input.";
  const verdict = buildVerdict(input.primaryAction, confidence, fragility, {
    whatWouldChange,
    nextMonitoringStep: input.falsifiers.find((f) => f.monitored)?.monitoringSource ?? "Re-check inputs before action.",
    alternative: "No-play / watchlist until the case strengthens.",
  });

  // 5. Freeze the receipt before the result.
  const receipt = freezeReceipt({
    claim: input.claim,
    action: verdict.action,
    confidence: confidence.score,
    fragility: fragility.score,
    asOf: input.asOf,
    whatWouldChange,
  });

  return { marketFairProb, blend, edge, evidenceStrength, counterSeverity, falsifierRisk, confidence, fragility, verdict, receipt };
}
