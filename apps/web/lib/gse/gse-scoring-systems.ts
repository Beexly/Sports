/**
 * GSE Scoring Systems — the shared scoring primitive + the registry of all 20
 * decision-intelligence scores.
 *
 * Doctrine: "Most sites display data. GSE must judge data." Every judgement the
 * product makes — about a data point, a source, an argument, a recommendation, a
 * page, an agent, a product idea, a public claim — is expressed as a typed,
 * auditable score with a band, a confidence level, a rationale, and risk flags.
 *
 * This module deliberately has NO dependency on the domain contract files so it
 * can be imported everywhere without a cycle. The domain modules
 * (`data-excellence.ts`, `evidence-engine.ts`, …) import the {@link GseScore}
 * primitive and {@link makeScore} from here; the {@link GSE_SCORING_SYSTEMS}
 * registry below is pure metadata describing each score for the cockpit and the
 * red-team audit — it never imports the live scoring functions.
 *
 * A score is never a fabricated track-record percentage. It is a structured,
 * inspectable judgement that always travels with the reasons behind it.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared scoring primitive
// ─────────────────────────────────────────────────────────────────────────────

/** Magnitude band for a 0–100 score. Orientation-neutral by design — whether a
 *  high number is good or risky is declared per-system in {@link ScoringSystemSpec.orientation}. */
export type ScoreBand = "very_low" | "low" | "moderate" | "high" | "very_high";

/** How much the score itself can be trusted, given input quality/coverage. */
export type ScoreConfidence = "speculative" | "tentative" | "supported" | "well_supported";

export interface GseScore {
  /** The scoring system that produced this (matches a {@link ScoringSystemSpec.id}). */
  readonly id: string;
  /** Always clamped to 0..100. */
  readonly score: number;
  readonly band: ScoreBand;
  /** Confidence in the score, not in the underlying recommendation. */
  readonly confidence: ScoreConfidence;
  /** Plain-language reasons that produced the number. Never empty for a real score. */
  readonly rationale: readonly string[];
  /** Cautions, missing inputs, or risk flags that a reviewer must see. */
  readonly flags: readonly string[];
}

/** Clamp any number into the 0..100 score range. */
export function clampScore(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

/** Map a 0..100 score to its magnitude band. */
export function toBand(score: number): ScoreBand {
  const s = clampScore(score);
  if (s < 20) return "very_low";
  if (s < 40) return "low";
  if (s < 60) return "moderate";
  if (s < 80) return "high";
  return "very_high";
}

/**
 * Construct a {@link GseScore}, clamping the number and deriving the band.
 * Centralising construction guarantees every score in the system carries a
 * rationale and flags array (even if empty) so consumers never read undefined.
 */
export function makeScore(
  id: string,
  rawScore: number,
  opts: {
    confidence: ScoreConfidence;
    rationale: readonly string[];
    flags?: readonly string[];
  },
): GseScore {
  const score = clampScore(rawScore);
  return {
    id,
    score,
    band: toBand(score),
    confidence: opts.confidence,
    rationale: opts.rationale,
    flags: opts.flags ?? [],
  };
}

/**
 * Average a set of weighted 0..100 sub-scores. Weights need not sum to 1; they
 * are normalised. Returns 0 for an empty/zero-weight input rather than NaN.
 */
export function weightedAverage(
  parts: ReadonlyArray<{ value: number; weight: number }>,
): number {
  let weighted = 0;
  let totalWeight = 0;
  for (const p of parts) {
    const w = p.weight > 0 ? p.weight : 0;
    weighted += clampScore(p.value) * w;
    totalWeight += w;
  }
  if (totalWeight <= 0) return 0;
  return weighted / totalWeight;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry of the 20 scoring systems (pure metadata)
// ─────────────────────────────────────────────────────────────────────────────

export type ScoreOrientation = "higher_is_better" | "higher_is_riskier";

export type ScoreSurface = "internal" | "user_visible" | "mixed";

export interface ScoringSystemSpec {
  /** Stable id used in {@link GseScore.id} and in cockpit links. */
  readonly id: string;
  readonly name: string;
  readonly purpose: string;
  /** The signals that feed the score. */
  readonly inputs: readonly string[];
  readonly orientation: ScoreOrientation;
  readonly outputScale: string;
  readonly surface: ScoreSurface;
  /** How this score could be MISused (over-trusted, gamed, weaponised). */
  readonly misuseRisk: string;
  /** Where the V1 implementation lives / what it does. */
  readonly v1: string;
  /** The canonical function name that computes it (or "—" if descriptive only). */
  readonly fn: string;
}

export const GSE_SCORING_SYSTEMS: readonly ScoringSystemSpec[] = [
  {
    id: "data_quality",
    name: "Data Quality Score",
    purpose: "Judge whether a single data item is fit to drive a decision.",
    inputs: ["completeness", "freshness", "consistency", "source reliability", "confirmation count", "contradiction count", "lineage depth", "rights safety"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "mixed",
    misuseRisk: "Treating a high score as truth. It measures fitness, not correctness.",
    v1: "scoreDataQuality() in data-excellence.ts — pure function over a DataQualitySignals input.",
    fn: "scoreDataQuality",
  },
  {
    id: "source_integrity",
    name: "Source Integrity Score",
    purpose: "Judge how much a SOURCE (not an item) deserves trust over time.",
    inputs: ["historical accuracy", "reliability", "rights posture", "freshness adherence", "dependency risk", "fallback availability"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Anchoring on a brand name; a trusted source can still be stale or wrong on an item.",
    v1: "scoreSourceIntegrity() in data-excellence.ts.",
    fn: "scoreSourceIntegrity",
  },
  {
    id: "evidence_strength",
    name: "Evidence Strength Score",
    purpose: "Judge the supporting case behind a claim.",
    inputs: ["evidence count", "evidence strength", "source reliability", "freshness", "model agreement", "independence"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "mixed",
    misuseRisk: "Counting correlated evidence as if independent (echo chamber inflation).",
    v1: "scoreEvidenceStrength() in evidence-engine.ts over a Claim's evidence set.",
    fn: "scoreEvidenceStrength",
  },
  {
    id: "counter_evidence_severity",
    name: "Counter-Evidence Severity Score",
    purpose: "Judge how damaging the strongest counter-case is.",
    inputs: ["counter-evidence severity", "counter-evidence freshness", "source reliability", "count"],
    orientation: "higher_is_riskier",
    outputScale: "0–100",
    surface: "mixed",
    misuseRisk: "Suppressing it to make a recommendation look cleaner than it is.",
    v1: "scoreCounterEvidenceSeverity() in evidence-engine.ts.",
    fn: "scoreCounterEvidenceSeverity",
  },
  {
    id: "falsifier_risk",
    name: "Falsifier Risk Score",
    purpose: "Judge the chance a known falsifier flips the recommendation before action.",
    inputs: ["falsifier likelihood", "time to action", "monitoring coverage", "impact if triggered"],
    orientation: "higher_is_riskier",
    outputScale: "0–100",
    surface: "mixed",
    misuseRisk: "Ignoring an unmonitored falsifier because it is inconvenient.",
    v1: "scoreFalsifierRisk() in evidence-engine.ts.",
    fn: "scoreFalsifierRisk",
  },
  {
    id: "recommendation_confidence",
    name: "Recommendation Confidence Score",
    purpose: "The net, calibrated confidence in a recommendation after the full case.",
    inputs: ["evidence strength", "counter-evidence severity", "falsifier risk", "data quality", "model agreement", "calibration history"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "mixed",
    misuseRisk: "Presenting it as a win probability. It is process confidence, not a guarantee of outcome.",
    v1: "scoreRecommendationConfidence() in evidence-engine.ts — composes the four sub-scores.",
    fn: "scoreRecommendationConfidence",
  },
  {
    id: "decision_fragility",
    name: "Decision Fragility Score",
    purpose: "How easily one shock breaks the decision — the opposite of robustness.",
    inputs: ["falsifier risk", "counter-evidence severity", "data freshness", "evidence independence", "time to action"],
    orientation: "higher_is_riskier",
    outputScale: "0–100",
    surface: "mixed",
    misuseRisk: "Confusing fragility with low confidence — a confident pick can still be fragile.",
    v1: "scoreDecisionFragility() in evidence-engine.ts.",
    fn: "scoreDecisionFragility",
  },
  {
    id: "user_bias_risk",
    name: "User Bias Risk Score",
    purpose: "Detect when a user's decision pattern shows a known cognitive bias — without shaming.",
    inputs: ["recency chasing", "loss chasing", "favourite-team skew", "overtrading", "ignoring counter-evidence", "narrative chasing"],
    orientation: "higher_is_riskier",
    outputScale: "0–100",
    surface: "user_visible",
    misuseRisk: "Weaponising it to nag or shame; it must inform, never moralize.",
    v1: "scoreUserBiasRisk() in cognitive-operating-model.ts over decision-history signals.",
    fn: "scoreUserBiasRisk",
  },
  {
    id: "cognitive_load",
    name: "Cognitive Load Score",
    purpose: "Estimate the mental burden a surface places on the user.",
    inputs: ["primary actions", "competing CTAs", "data density", "unexplained jargon", "decisions required", "novelty"],
    orientation: "higher_is_riskier",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Optimising load down by hiding tradeoffs — that is manipulation, not clarity.",
    v1: "scoreCognitiveLoad() in cognitive-operating-model.ts.",
    fn: "scoreCognitiveLoad",
  },
  {
    id: "page_intelligence",
    name: "Page Intelligence Score",
    purpose: "How well a page turns data into a supported decision (the 'thinking website' metric).",
    inputs: ["primary decision named", "evidence layer", "counter-evidence layer", "freshness shown", "source shown", "no-play path", "autopsy path"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Scoring presence of fields rather than genuine decision support.",
    v1: "scorePageIntelligence() in thinking-page-contracts.ts over a PageContract.",
    fn: "scorePageIntelligence",
  },
  {
    id: "jarvis_readiness",
    name: "Jarvis Readiness Score",
    purpose: "Whether a Jarvis mode is safe and complete enough to expose.",
    inputs: ["forbidden claims defined", "source protocol", "confidence protocol", "fallback behavior", "audit logging", "data availability"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Shipping a mode that sounds certain without a source/confidence protocol.",
    v1: "scoreJarvisReadiness() in jarvis-decision-copilot.ts over a JarvisModeContract.",
    fn: "scoreJarvisReadiness",
  },
  {
    id: "agent_trust",
    name: "Agent Trust Score",
    purpose: "How much autonomy a constrained agent has earned.",
    inputs: ["input/output constraints defined", "escalation triggers", "owner-gated actions", "calibration history", "failure-mode coverage"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Granting an agent owner-gated actions before it has earned trust.",
    v1: "scoreAgentTrust() in agent-orchestration.ts over an AgentRoleContract.",
    fn: "scoreAgentTrust",
  },
  {
    id: "product_opportunity",
    name: "Product Opportunity Score",
    purpose: "Rank product ideas by leverage, trust-safety, and feasibility.",
    inputs: ["user pain", "uniqueness", "trust impact", "revenue impact", "retention impact", "data availability", "rights safety", "build complexity", "maintenance burden", "ecosystem fit", "first-of-kind"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Optimising for revenue at the expense of trust; trust is a guard, not a slider.",
    v1: "scoreProductOpportunity() in product-operating-system.ts.",
    fn: "scoreProductOpportunity",
  },
  {
    id: "revenue_readiness",
    name: "Revenue Readiness Score",
    purpose: "Whether a monetisation surface is trustworthy and complete enough to ship.",
    inputs: ["value clarity", "disclosure completeness", "no fake urgency", "no fake social proof", "price source-of-truth", "refund clarity"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Trading trust for short-term conversion; banned-language hits hard-cap the score.",
    v1: "scoreRevenueReadiness() in revenue-intelligence-os.ts.",
    fn: "scoreRevenueReadiness",
  },
  {
    id: "launch_readiness",
    name: "Launch Readiness Score",
    purpose: "Go/no-go across the ten launch gates for any feature.",
    inputs: ["data", "trust", "UX", "mobile", "performance", "accessibility", "legal/source", "revenue", "support", "rollback"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Averaging away a single blocking gate (e.g. legal) that should hard-stop launch.",
    v1: "scoreLaunchReadiness() in product-operating-system.ts — blocking gates can hard-cap.",
    fn: "scoreLaunchReadiness",
  },
  {
    id: "public_claim_safety",
    name: "Public Claim Safety Score",
    purpose: "Whether a public-facing string is safe to render.",
    inputs: ["banned-phrase hits", "source present", "demo/live clarity", "causal overreach", "certainty language"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Passing the scanner but still implying certainty via tone; humans must still review.",
    v1: "scorePublicClaimSafety() in claim-safety.ts — reuses trust-claims scanForBannedPhrases.",
    fn: "scorePublicClaimSafety",
  },
  {
    id: "moat",
    name: "First-of-Kind Moat Score",
    purpose: "How defensible/unique a capability is versus competitors and tools.",
    inputs: ["uniqueness", "data advantage", "trust advantage", "compounding memory", "switching cost", "replicability"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Over-claiming a moat that is really a head start; revisit as competitors copy.",
    v1: "scoreMoat() in product-operating-system.ts.",
    fn: "scoreMoat",
  },
  {
    id: "calibration_health",
    name: "Calibration Health Score",
    purpose: "Whether stated confidence matches realised outcomes (are we honest?).",
    inputs: ["sample size", "Brier/calibration error", "drift since last check", "coverage of confidence bins"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "mixed",
    misuseRisk: "Publishing calibration before the sample is large enough to be meaningful.",
    v1: "scoreCalibrationHealth() in data-excellence.ts — pairs with apps/web/lib/calibration.",
    fn: "scoreCalibrationHealth",
  },
  {
    id: "memory_usefulness",
    name: "Memory Usefulness Score",
    purpose: "Whether a stored memory should still influence recommendations.",
    inputs: ["recency", "confirmation", "outcome relevance", "decay", "consent state", "source ref present"],
    orientation: "higher_is_better",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Letting stale or unconsented memory steer decisions; decay + consent are hard gates.",
    v1: "scoreMemoryUsefulness() in memory-policy.ts.",
    fn: "scoreMemoryUsefulness",
  },
  {
    id: "source_rights_risk",
    name: "Source-Rights Risk Score",
    purpose: "Legal/contractual risk of using a source the way we intend to.",
    inputs: ["rights status", "automation allowed", "commercial display allowed", "storage allowed", "intended use vs allowed use"],
    orientation: "higher_is_riskier",
    outputScale: "0–100",
    surface: "internal",
    misuseRisk: "Proceeding on a 'permission_required' or 'excluded' source; these hard-stop the job.",
    v1: "scoreSourceRightsRisk() in claim-safety.ts — maps the scraping registry status to a risk band.",
    fn: "scoreSourceRightsRisk",
  },
] as const;

/** Look up a scoring system spec by id. */
export function getScoringSystem(id: string): ScoringSystemSpec | undefined {
  return GSE_SCORING_SYSTEMS.find((s) => s.id === id);
}

/** All scoring systems whose output may be shown to end users. */
export function getUserVisibleScores(): readonly ScoringSystemSpec[] {
  return GSE_SCORING_SYSTEMS.filter((s) => s.surface !== "internal");
}

/** Risk-oriented scores (higher = worse) — the watchlist set. */
export function getRiskScores(): readonly ScoringSystemSpec[] {
  return GSE_SCORING_SYSTEMS.filter((s) => s.orientation === "higher_is_riskier");
}
