/**
 * GSE Self-Learning & Autonomy — the loop that lets the system improve itself
 * without ever removing the human from the decisions that matter.
 *
 * Self-learning here means: capture outcomes → settle → recalibrate → detect
 * drift → propose a candidate model → evaluate it in the shadow against the
 * champion → promote only through a gate → deploy → monitor → roll back. None of
 * those steps publish content, place a bet, or change a price on their own —
 * owner-gated actions stay owner-gated. Autonomy is a ladder (L0–L5) and every
 * capability is pinned to the highest level its guardrails actually permit.
 *
 * Builds on existing systems (calibration, calibration-drift, synthetic
 * monitoring, agents OS) and the GSE layer (data-excellence calibration health,
 * agent-orchestration trust). It does not duplicate them.
 *
 * Companion doc: docs/research/GSE_2026_AUTONOMY_AND_SELF_LEARNING.md
 */

import { type GseScore, makeScore, weightedAverage, clampScore } from "./gse-scoring-systems";

// ─────────────────────────────────────────────────────────────────────────────
// Autonomy ladder (L0–L5, modeled on the SAE driving-automation levels)
// ─────────────────────────────────────────────────────────────────────────────

export type AutonomyLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export interface AutonomyRung {
  readonly level: AutonomyLevel;
  readonly name: string;
  readonly description: string;
  /** What the human is responsible for at this level. */
  readonly humanRole: string;
}

export const AUTONOMY_LADDER: readonly AutonomyRung[] = [
  { level: "L0", name: "Manual", description: "Human does everything; system only displays.", humanRole: "Decides and acts." },
  { level: "L1", name: "Assisted", description: "System suggests; human approves every action.", humanRole: "Approves each action." },
  { level: "L2", name: "Partial", description: "System drafts/queues; human reviews batches.", humanRole: "Reviews batches before release." },
  { level: "L3", name: "Conditional", description: "System acts within tight bounds; human handles exceptions + can roll back.", humanRole: "Handles escalations; owns rollback." },
  { level: "L4", name: "High", description: "System self-operates a bounded domain; human audits after the fact.", humanRole: "Audits; sets bounds." },
  { level: "L5", name: "Full", description: "Reserved — NOT used for any user-facing or money/trust action.", humanRole: "n/a — not granted." },
] as const;

/** The guardrails a capability has in place. Each unlocks a higher safe ceiling. */
export interface AutonomyGuards {
  readonly monitored: boolean; // live monitoring + alerting exists
  readonly hasRollback: boolean; // a tested rollback path exists
  readonly shadowEvaluated: boolean; // changes run in shadow before going live
  readonly calibrationGated: boolean; // gated on calibration/quality thresholds
  readonly ownerApprovalForExternal: boolean; // publish/bet/price changes need owner sign-off
}

/**
 * The highest autonomy level a capability may safely run at, given its guards.
 * This is a CEILING, not a recommendation — a capability never exceeds it, and
 * any action that touches the outside world (publish, bet, price) is capped at
 * L3 because it must remain owner-gated. There is no path to L5 here by design.
 */
export function maxAutonomyAllowed(guards: AutonomyGuards): AutonomyLevel {
  if (!guards.monitored) return "L1"; // unmonitored ⇒ never beyond suggest-and-approve
  if (!guards.hasRollback) return "L2";
  if (!guards.calibrationGated) return "L2";
  if (!guards.shadowEvaluated) return "L3";
  // Fully guarded internal capability can reach L4; external actions are capped below.
  return guards.ownerApprovalForExternal ? "L3" : "L4";
}

export interface CapabilityAutonomy {
  readonly capability: string;
  readonly current: AutonomyLevel;
  readonly target: AutonomyLevel;
  readonly guardrail: string;
  /** True if any external/owner-gated action is involved (publish/bet/price). */
  readonly externalAction: boolean;
}

export const CAPABILITY_AUTONOMY: readonly CapabilityAutonomy[] = [
  { capability: "Odds/data refresh", current: "L3", target: "L4", guardrail: "Freshness + data-quality gates; rollback to last good snapshot.", externalAction: false },
  { capability: "Projection generation", current: "L2", target: "L4", guardrail: "Shadow eval + calibration gate before champion swap.", externalAction: false },
  { capability: "Signal/pick generation", current: "L2", target: "L3", guardrail: "Evidence-engine verdict + calibration gate; no auto-publish.", externalAction: false },
  { capability: "Content drafting (GSN/Ava)", current: "L2", target: "L2", guardrail: "Draft-only; claim-safety gate; publishing owner-gated.", externalAction: true },
  { capability: "Public claim rendering", current: "L1", target: "L2", guardrail: "Claim-safety gate + human review before public.", externalAction: true },
  { capability: "Pricing experiments", current: "L1", target: "L1", guardrail: "Owner approval required for any price change.", externalAction: true },
  { capability: "Model promotion", current: "L2", target: "L3", guardrail: "Promotion gate: sample + no calibration regression + shadow period.", externalAction: false },
  { capability: "Data backfill/repair", current: "L3", target: "L4", guardrail: "Idempotent + audited + rollback.", externalAction: false },
  { capability: "Synthetic monitoring/alerting", current: "L4", target: "L4", guardrail: "Read-only probes; pages a human on anomaly.", externalAction: false },
  { capability: "Memory promotion (candidate→confirmed)", current: "L2", target: "L2", guardrail: "Owner confirms; candidates never treated as facts.", externalAction: false },
  { capability: "Bet placement", current: "L0", target: "L0", guardrail: "Never automated. Out of scope by policy.", externalAction: true },
  { capability: "Source onboarding (rights)", current: "L1", target: "L2", guardrail: "Clearance engine + owner approval for vendor/permission sources.", externalAction: true },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Drift detection (Population Stability Index — transferred from credit risk)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Population Stability Index between an expected and an actual distribution.
 * Inputs are per-bin masses (counts or proportions — both are normalised here).
 * PSI = Σ (a_i − e_i) · ln(a_i / e_i). Zeros are floored with epsilon so the log
 * stays finite. Conventional reading: <0.1 stable, 0.1–0.25 moderate shift, >0.25
 * significant shift.
 */
export function populationStabilityIndex(expected: readonly number[], actual: readonly number[]): number {
  const n = Math.min(expected.length, actual.length);
  if (n === 0) return 0;
  const eps = 1e-6;
  const eSum = expected.slice(0, n).reduce((s, v) => s + Math.max(0, v), 0) || 1;
  const aSum = actual.slice(0, n).reduce((s, v) => s + Math.max(0, v), 0) || 1;
  let psi = 0;
  for (let i = 0; i < n; i++) {
    const e = Math.max(eps, expected[i]! / eSum);
    const a = Math.max(eps, actual[i]! / aSum);
    psi += (a - e) * Math.log(a / e);
  }
  return psi;
}

/** Score drift risk from a PSI value (0..100, higher is RISKIER). */
export function scoreDriftRisk(psi: number): GseScore {
  const flags: string[] = [];
  // Map the conventional PSI bands onto 0..100.
  let score: number;
  if (psi < 0.1) score = (psi / 0.1) * 30; // 0..30 = stable band
  else if (psi < 0.25) score = 30 + ((psi - 0.1) / 0.15) * 40; // 30..70 = moderate
  else score = Math.min(100, 70 + ((psi - 0.25) / 0.25) * 30); // 70..100 = significant
  if (psi >= 0.25) flags.push("significant distribution shift — investigate inputs before trusting outputs");
  else if (psi >= 0.1) flags.push("moderate drift — monitor");
  return makeScore("drift_risk", score, {
    confidence: "supported",
    rationale: [`PSI ${psi.toFixed(3)}`],
    flags,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Champion / challenger model promotion
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelPromotionInput {
  readonly settledSampleSize: number;
  readonly minSample: number;
  /** Lower Brier is better. */
  readonly challengerBrier: number;
  readonly championBrier: number;
  readonly shadowDays: number;
  readonly requiredShadowDays: number;
  /** PSI of the challenger's inputs vs training distribution. */
  readonly inputDriftPsi: number;
}

/**
 * Score whether a challenger model is ready to replace the champion (0..100,
 * higher is readier). Hard gates: insufficient settled sample, a calibration
 * REGRESSION (challenger Brier worse than champion), or an unfinished shadow
 * period each cap the score below the promotion threshold. Significant input
 * drift flags but does not alone block — it raises the bar for the human reviewer.
 */
export function scoreModelPromotionReadiness(inp: ModelPromotionInput): GseScore {
  const flags: string[] = [];
  const improvement = inp.championBrier - inp.challengerBrier; // >0 means challenger better
  const sampleOk = inp.settledSampleSize >= inp.minSample;
  const shadowOk = inp.shadowDays >= inp.requiredShadowDays;
  const regression = improvement < 0;

  if (!sampleOk) flags.push(`settled sample ${inp.settledSampleSize} < required ${inp.minSample}`);
  if (regression) flags.push("calibration regression — challenger Brier is worse than champion");
  if (!shadowOk) flags.push(`shadow period ${inp.shadowDays}d < required ${inp.requiredShadowDays}d`);
  if (inp.inputDriftPsi >= 0.25) flags.push("significant input drift — promote only with explicit human review");

  // Base reward scales with relative Brier improvement (capped) + completeness.
  const relImprove = inp.championBrier > 0 ? Math.max(-1, Math.min(1, improvement / inp.championBrier)) : 0;
  let score = weightedAverage([
    { value: (relImprove > 0 ? relImprove : 0) * 100, weight: 2.5 },
    { value: sampleOk ? 100 : (inp.settledSampleSize / Math.max(1, inp.minSample)) * 100, weight: 1.5 },
    { value: shadowOk ? 100 : (inp.shadowDays / Math.max(1, inp.requiredShadowDays)) * 100, weight: 1.5 },
    { value: inp.inputDriftPsi < 0.1 ? 100 : inp.inputDriftPsi < 0.25 ? 60 : 25, weight: 1.0 },
  ]);

  // Hard gates cap below the promotion threshold (60).
  if (regression) score = Math.min(score, 25);
  if (!sampleOk) score = Math.min(score, 49);
  if (!shadowOk) score = Math.min(score, 49);

  return makeScore("model_promotion", score, {
    confidence: sampleOk ? "supported" : "tentative",
    rationale: [
      `Brier ${inp.challengerBrier.toFixed(3)} vs champion ${inp.championBrier.toFixed(3)}`,
      `sample ${inp.settledSampleSize}/${inp.minSample}`,
      `shadow ${inp.shadowDays}/${inp.requiredShadowDays}d`,
    ],
    flags,
  });
}

/** True only when no hard gate is violated and the readiness clears 60. */
export function canPromoteModel(inp: ModelPromotionInput): boolean {
  return scoreModelPromotionReadiness(inp).score >= 60;
}

// ─────────────────────────────────────────────────────────────────────────────
// Active learning — where to spend the next unit of attention/labeling
// ─────────────────────────────────────────────────────────────────────────────

export interface ActiveLearningInput {
  /** 0..1 predictive uncertainty on the item (entropy / interval width). */
  readonly predictiveUncertainty: number;
  /** 0..1 how much a correct call here matters (stakes, exposure, audience). */
  readonly decisionImpact: number;
  /** 0..1 how stale our data on it is. */
  readonly dataStaleness: number;
  /** 0..1 how poorly the current model covers this slice (coverage gap). */
  readonly coverageGap: number;
}

/**
 * Score how worth it is to spend the next unit of attention/labeling on an item
 * (0..100, higher = attend first). Uncertainty alone is not enough — impact and
 * coverage gaps decide where learning actually moves the product.
 */
export function scoreActiveLearningPriority(inp: ActiveLearningInput): GseScore {
  const score = weightedAverage([
    { value: clampScore(inp.predictiveUncertainty * 100), weight: 2.0 },
    { value: clampScore(inp.decisionImpact * 100), weight: 2.5 },
    { value: clampScore(inp.dataStaleness * 100), weight: 1.0 },
    { value: clampScore(inp.coverageGap * 100), weight: 1.5 },
  ]);
  const flags: string[] = [];
  if (inp.decisionImpact >= 0.7 && inp.predictiveUncertainty >= 0.6) {
    flags.push("high-impact + high-uncertainty — prioritize for review/labeling");
  }
  return makeScore("active_learning", score, {
    confidence: "supported",
    rationale: [
      `uncertainty ${(inp.predictiveUncertainty * 100).toFixed(0)}%`,
      `impact ${(inp.decisionImpact * 100).toFixed(0)}%`,
      `coverage gap ${(inp.coverageGap * 100).toFixed(0)}%`,
    ],
    flags,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// The self-learning loop
// ─────────────────────────────────────────────────────────────────────────────

export type LoopStep =
  | "capture_outcome"
  | "settle"
  | "recalibrate"
  | "detect_drift"
  | "propose_candidate"
  | "shadow_evaluate"
  | "promotion_gate"
  | "deploy"
  | "monitor"
  | "rollback";

export const SELF_LEARNING_LOOP: readonly LoopStep[] = [
  "capture_outcome",
  "settle",
  "recalibrate",
  "detect_drift",
  "propose_candidate",
  "shadow_evaluate",
  "promotion_gate",
  "deploy",
  "monitor",
  "rollback",
];

/** True when steps appear in (non-strict) loop order — a malformed pipeline that
 *  deploys before its promotion gate, say, returns false. */
export function isValidLoopOrder(steps: readonly LoopStep[]): boolean {
  let last = -1;
  for (const s of steps) {
    const idx = SELF_LEARNING_LOOP.indexOf(s);
    if (idx < last) return false;
    last = idx;
  }
  return true;
}
