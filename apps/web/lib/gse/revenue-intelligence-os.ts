/**
 * GSE Revenue Intelligence OS — think for the business without betraying trust.
 *
 * Revenue is tied to trust here by construction: no fake urgency, no fake social
 * proof, no promised outcomes, no exploitative gambling copy, clear affiliate
 * disclosures, prices from the single source of truth
 * (`apps/web/lib/pricing/pricing-phases.ts`). Free proves trust; paid unlocks
 * deeper decision intelligence. The Revenue Readiness score hard-caps any
 * surface whose copy trips the claim-safety gate — you cannot buy conversion
 * with banned language.
 *
 * Companion doc: docs/research/GSE_2026_REVENUE_INTELLIGENCE_OS.md
 */

import { type GseScore, makeScore, weightedAverage } from "./gse-scoring-systems";
import { scorePublicClaimSafety } from "./claim-safety";

// ─────────────────────────────────────────────────────────────────────────────
// Funnel + entities
// ─────────────────────────────────────────────────────────────────────────────

export type FunnelStageId =
  | "visit"
  | "free_signup"
  | "onboarding_complete"
  | "activation"
  | "upgrade_intent"
  | "subscription_start"
  | "retention"
  | "expansion"
  | "churn_risk"
  | "win_back";

export interface FunnelStage {
  readonly id: FunnelStageId;
  readonly label: string;
  readonly userIntent: string;
  /** The trust signal that must be true to advance honestly. */
  readonly trustSignal: string;
}

export const FUNNEL_STAGES: readonly FunnelStage[] = [
  { id: "visit", label: "Visit", userIntent: "Is this credible?", trustSignal: "Methodology + track-record posture visible, no hype." },
  { id: "free_signup", label: "Free signup", userIntent: "Is the free value real?", trustSignal: "Free tier delivers a genuine, usable decision." },
  { id: "onboarding_complete", label: "Onboarding complete", userIntent: "Do I get it?", trustSignal: "User reaches a first understood recommendation." },
  { id: "activation", label: "Activation", userIntent: "Did this help me decide?", trustSignal: "User completes a real decision with the product." },
  { id: "upgrade_intent", label: "Upgrade intent", userIntent: "Is paid worth it?", trustSignal: "Value gap is honest and earned, not gated spite." },
  { id: "subscription_start", label: "Subscription start", userIntent: "Am I safe to pay?", trustSignal: "Clear price, refund window, cancel-anytime." },
  { id: "retention", label: "Retention", userIntent: "Is this still useful?", trustSignal: "Recurring decision value + honest calibration." },
  { id: "expansion", label: "Expansion", userIntent: "Do I want more?", trustSignal: "Upsell maps to real added decision intelligence." },
  { id: "churn_risk", label: "Churn risk", userIntent: "Should I leave?", trustSignal: "Easy cancel; no dark-pattern retention." },
  { id: "win_back", label: "Win-back", userIntent: "Worth returning?", trustSignal: "Honest 'what changed since you left'." },
] as const;

export interface RevenueEvent {
  readonly eventId: string;
  readonly type: "signup" | "activation" | "upgrade" | "renewal" | "cancellation" | "refund";
  readonly at: string;
  readonly segment: string;
  readonly amountCents?: number;
}

export interface UserSegment {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface ProductGate {
  readonly id: string;
  readonly feature: string;
  readonly tier: "free" | "pro" | "elite";
  /** Why this gate is honest (real added value), not spite. */
  readonly valueRationale: string;
}

export interface UpgradeTrigger {
  readonly id: string;
  readonly whenUserExperiences: string;
  readonly offeredValue: string;
  /** Trigger must be need-driven, never fear-driven. */
  readonly honest: boolean;
}

export interface PricingPlan {
  readonly tier: "free" | "pro" | "elite";
  readonly sourceOfTruth: "apps/web/lib/pricing/pricing-phases.ts";
}

export interface Disclosure {
  readonly id: string;
  readonly context: "affiliate" | "sponsor" | "modeled_data" | "risk";
  readonly text: string;
}

export interface ChurnRisk {
  readonly segment: string;
  readonly score: GseScore;
  readonly topReason: string;
}

export interface RetentionAction {
  readonly id: string;
  readonly action: string;
  /** Must not be a dark pattern. */
  readonly trustSafe: boolean;
}

export interface RevenueExperiment {
  readonly id: string;
  readonly hypothesis: string;
  readonly metric: string;
  readonly trustGuard: string;
}

export interface RevenueAutopsy {
  readonly experimentId: string;
  readonly outcome: string;
  readonly trustImpact: "improved" | "neutral" | "eroded";
  readonly lesson: string;
}

/**
 * Trust-safe copy library — sample headlines/CTAs that pass the banned-phrase
 * rules. These are illustrative templates, not live marketing claims.
 */
export const TRUST_SAFE_COPY: readonly string[] = [
  "See the evidence behind every pick.",
  "One free pick a day — no card required.",
  "We show our calibration, not just our wins.",
  "Confidence scores unlock once they're calibrated.",
  "Cancel any time from your dashboard.",
  "Pro adds the full factor trail and line-movement context.",
  "Read the counter-case before you decide.",
  "No-play is a valid call — we'll tell you when.",
  "Every claim ships with a source and a timestamp.",
  "Track record is published the moment the sample is honest.",
  "Founding rates are grandfathered for life.",
  "Upgrade when the added value is obvious — not before.",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Revenue Readiness score
// ─────────────────────────────────────────────────────────────────────────────

export interface RevenueReadinessInput {
  readonly surface: string;
  /** 0..1 clarity of the value proposition. */
  readonly valueClarity: number;
  readonly disclosuresComplete: boolean;
  /** The exact public copy that would render. */
  readonly copy: string;
  readonly priceFromSourceOfTruth: boolean;
  readonly refundClarity: boolean;
  /** Dark-pattern flags — any true should pull the score down hard. */
  readonly usesCountdownUrgency: boolean;
  readonly usesUnverifiedSocialProof: boolean;
}

/**
 * Score whether a monetization surface is trustworthy enough to ship (0..100,
 * higher is better). Banned language in the copy hard-caps the score via the
 * claim-safety gate; fake urgency and unverified social proof each carve a deep
 * penalty. Trust is a guard rail, not a slider you can trade for conversion.
 */
export function scoreRevenueReadiness(inp: RevenueReadinessInput): GseScore {
  const flags: string[] = [];
  const safety = scorePublicClaimSafety({
    text: inp.copy,
    hasSource: true, // revenue copy is product copy; sourcing handled by trust-claims registry
    demoLiveClear: true,
  });
  if (!safety.safe) flags.push(`copy failed claim-safety: ${safety.bannedHits.join(", ") || "cautions"}`);
  if (inp.usesCountdownUrgency) flags.push("countdown urgency — remove unless time genuinely matters");
  if (inp.usesUnverifiedSocialProof) flags.push("unverified social proof — remove");
  if (!inp.priceFromSourceOfTruth) flags.push("price not sourced from pricing-phases.ts");
  if (!inp.disclosuresComplete) flags.push("disclosures incomplete");
  if (!inp.refundClarity) flags.push("refund terms unclear");

  let score = weightedAverage([
    { value: Math.max(0, Math.min(1, inp.valueClarity)) * 100, weight: 2.0 },
    { value: inp.disclosuresComplete ? 100 : 30, weight: 1.5 },
    { value: inp.priceFromSourceOfTruth ? 100 : 20, weight: 1.5 },
    { value: inp.refundClarity ? 100 : 40, weight: 1.0 },
    { value: safety.score.score, weight: 2.0 },
  ]);

  if (inp.usesCountdownUrgency) score -= 25;
  if (inp.usesUnverifiedSocialProof) score -= 25;
  if (!safety.safe) score = Math.min(score, 20); // banned language → not shippable

  return makeScore("revenue_readiness", score, {
    confidence: "supported",
    rationale: [
      `value clarity ${(inp.valueClarity * 100).toFixed(0)}%`,
      `claim safety ${safety.score.score}`,
      inp.priceFromSourceOfTruth ? "price sourced" : "price not sourced",
    ],
    flags,
  });
}
