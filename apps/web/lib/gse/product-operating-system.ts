/**
 * GSE Product Operating System — help one owner think, prioritize, and ship.
 *
 * The owner is a single person. This module turns product judgement into typed,
 * rankable scores: Product Opportunity (with trust-safety and rights as hard
 * gates, never sliders), Launch Readiness (with blocking gates that can hard-cap
 * a go decision), and a First-of-Kind Moat score. It also classifies work into
 * roadmap buckets and rolls everything into an owner daily-brief summary.
 *
 * Companion doc: docs/research/GSE_2026_PRODUCT_OPERATING_SYSTEM.md
 */

import { type GseScore, makeScore, weightedAverage } from "./gse-scoring-systems";

// ─────────────────────────────────────────────────────────────────────────────
// Product Opportunity
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductIdea {
  readonly id: string;
  readonly name: string;
  /** 0..1 intensity of the user pain solved. */
  readonly userPain: number;
  /** 0..1 how unique vs competitors/tools. */
  readonly uniqueness: number;
  /** -1..1 effect on trust (negative erodes it — a hard gate, not a tradeoff). */
  readonly trustImpact: number;
  readonly revenueImpact: number; // 0..1
  readonly retentionImpact: number; // 0..1
  readonly dataAvailability: number; // 0..1
  /** Whether the data this needs is within source rights. */
  readonly rightsSafe: boolean;
  readonly buildComplexity: number; // 0..1 (higher is worse)
  readonly maintenanceBurden: number; // 0..1 (higher is worse)
  readonly ecosystemFit: number; // 0..1
  readonly firstOfKind: number; // 0..1
}

/**
 * Score a product idea by leverage, trust-safety, and feasibility (0..100,
 * higher is better). Two HARD gates protect the product's soul: an idea that is
 * not rights-safe, or that erodes trust, is capped into the low band no matter
 * how lucrative — trust and rights are guards, not dials.
 */
export function scoreProductOpportunity(idea: ProductIdea): GseScore {
  const flags: string[] = [];

  const base = weightedAverage([
    { value: idea.userPain * 100, weight: 2.5 },
    { value: idea.uniqueness * 100, weight: 1.5 },
    { value: idea.revenueImpact * 100, weight: 1.5 },
    { value: idea.retentionImpact * 100, weight: 1.5 },
    { value: idea.dataAvailability * 100, weight: 1.0 },
    { value: idea.ecosystemFit * 100, weight: 1.0 },
    { value: idea.firstOfKind * 100, weight: 1.0 },
    { value: Math.max(0, idea.trustImpact) * 100, weight: 1.5 },
  ]);

  let score = base - idea.buildComplexity * 20 - idea.maintenanceBurden * 15;

  if (!idea.rightsSafe) {
    score = Math.min(score, 15);
    flags.push("rights gate: not source-rights-safe — cannot build as specified");
  }
  if (idea.trustImpact < 0) {
    score = Math.min(score, 25);
    flags.push("trust gate: erodes trust — not pursued regardless of revenue");
  }
  if (idea.buildComplexity >= 0.7) flags.push("high build complexity");
  if (idea.maintenanceBurden >= 0.7) flags.push("high maintenance burden");

  return makeScore("product_opportunity", score, {
    confidence: "supported",
    rationale: [
      `pain ${(idea.userPain * 100).toFixed(0)}%`,
      `unique ${(idea.uniqueness * 100).toFixed(0)}%`,
      `trust impact ${idea.trustImpact >= 0 ? "+" : ""}${(idea.trustImpact * 100).toFixed(0)}%`,
      `complexity ${(idea.buildComplexity * 100).toFixed(0)}%`,
    ],
    flags,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Launch Readiness
// ─────────────────────────────────────────────────────────────────────────────

export type LaunchGateId =
  | "data"
  | "trust"
  | "ux"
  | "mobile"
  | "performance"
  | "accessibility"
  | "legal_source"
  | "revenue"
  | "support"
  | "rollback";

export const LAUNCH_GATES: readonly LaunchGateId[] = [
  "data",
  "trust",
  "ux",
  "mobile",
  "performance",
  "accessibility",
  "legal_source",
  "revenue",
  "support",
  "rollback",
];

/** Gates that, if unmet, hard-stop a launch regardless of the others. */
export const BLOCKING_GATES: readonly LaunchGateId[] = ["data", "trust", "legal_source"];

export type LaunchReadinessInput = Readonly<Record<LaunchGateId, boolean>>;

/**
 * Score go/no-go across the ten launch gates (0..100, higher is more ready).
 * A blocking gate (data, trust, legal/source) that is unmet caps the score below
 * the go threshold — you cannot average your way past a missing legal sign-off.
 */
export function scoreLaunchReadiness(gates: LaunchReadinessInput): GseScore {
  const flags: string[] = [];
  let metCount = 0;
  for (const g of LAUNCH_GATES) {
    if (gates[g]) metCount += 1;
    else flags.push(`gate not met: ${g}`);
  }

  let score = (metCount / LAUNCH_GATES.length) * 100;

  const unmetBlocking = BLOCKING_GATES.filter((g) => !gates[g]);
  if (unmetBlocking.length > 0) {
    score = Math.min(score, 39); // below the go threshold
    flags.push(`BLOCKING gate(s) unmet: ${unmetBlocking.join(", ")}`);
  }

  return makeScore("launch_readiness", score, {
    confidence: "well_supported",
    rationale: [`${metCount}/${LAUNCH_GATES.length} gates met`, `blocking unmet: ${unmetBlocking.length}`],
    flags,
  });
}

/** True only when every gate (blocking and non-blocking) is met. */
export function isLaunchReady(gates: LaunchReadinessInput): boolean {
  return LAUNCH_GATES.every((g) => gates[g]);
}

// ─────────────────────────────────────────────────────────────────────────────
// First-of-Kind Moat
// ─────────────────────────────────────────────────────────────────────────────

export interface MoatSignals {
  readonly uniqueness: number; // 0..1
  readonly dataAdvantage: number; // 0..1
  readonly trustAdvantage: number; // 0..1
  readonly compoundingMemory: number; // 0..1 (does it get better with use?)
  readonly switchingCost: number; // 0..1
  readonly replicability: number; // 0..1 (higher = easier to copy = worse)
}

/**
 * Score how defensible a capability is (0..100, higher is more defensible).
 * Replicability is inverted — a thing anyone can copy tomorrow is a head start,
 * not a moat, so the score is honest about that distinction.
 */
export function scoreMoat(s: MoatSignals): GseScore {
  const flags: string[] = [];
  if (s.replicability >= 0.7) flags.push("highly replicable — treat as a head start, not a moat");
  if (s.compoundingMemory < 0.3) flags.push("does not compound with use — weak durability");

  const score = weightedAverage([
    { value: s.uniqueness * 100, weight: 1.5 },
    { value: s.dataAdvantage * 100, weight: 2.0 },
    { value: s.trustAdvantage * 100, weight: 2.0 },
    { value: s.compoundingMemory * 100, weight: 2.0 },
    { value: s.switchingCost * 100, weight: 1.0 },
    { value: (1 - Math.max(0, Math.min(1, s.replicability))) * 100, weight: 1.5 },
  ]);

  return makeScore("moat", score, {
    confidence: "tentative",
    rationale: [
      `data advantage ${(s.dataAdvantage * 100).toFixed(0)}%`,
      `trust advantage ${(s.trustAdvantage * 100).toFixed(0)}%`,
      `compounding ${(s.compoundingMemory * 100).toFixed(0)}%`,
    ],
    flags,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap Brain + Owner Daily Brief
// ─────────────────────────────────────────────────────────────────────────────

export type RoadmapBucket =
  | "now"
  | "next"
  | "later"
  | "research_only"
  | "blocked_by_data"
  | "blocked_by_rights"
  | "blocked_by_design"
  | "blocked_by_payment"
  | "blocked_by_owner_decision";

export interface RoadmapBlockers {
  readonly dataMissing?: boolean;
  readonly rightsUnclear?: boolean;
  readonly designUnready?: boolean;
  readonly paymentUnready?: boolean;
  readonly needsOwnerDecision?: boolean;
  readonly researchOnly?: boolean;
}

/**
 * Classify an idea into a roadmap bucket. Blockers win over priority — a
 * high-opportunity idea blocked by rights goes to `blocked_by_rights`, not
 * `now`, so the roadmap never hides a dependency behind enthusiasm.
 */
export function classifyRoadmap(opportunity: GseScore, blockers: RoadmapBlockers): RoadmapBucket {
  if (blockers.rightsUnclear) return "blocked_by_rights";
  if (blockers.dataMissing) return "blocked_by_data";
  if (blockers.paymentUnready) return "blocked_by_payment";
  if (blockers.needsOwnerDecision) return "blocked_by_owner_decision";
  if (blockers.designUnready) return "blocked_by_design";
  if (blockers.researchOnly) return "research_only";
  if (opportunity.score >= 75) return "now";
  if (opportunity.score >= 55) return "next";
  return "later";
}

export interface ScoredIdea {
  readonly idea: ProductIdea;
  readonly opportunity: GseScore;
  readonly bucket: RoadmapBucket;
}

export interface ProductOSPriorities {
  readonly shipNow: readonly ScoredIdea[];
  readonly upNext: readonly ScoredIdea[];
  readonly blocked: readonly ScoredIdea[];
  readonly topOpportunity: ScoredIdea | null;
}

/**
 * Rank ideas for the owner daily brief: score each, classify it, and split into
 * ship-now / up-next / blocked. Pure over its input. `blockersById` lets the
 * caller attach known blockers without mutating the ideas.
 */
export function summarizeProductOSPriorities(
  ideas: readonly ProductIdea[],
  blockersById: Readonly<Record<string, RoadmapBlockers>> = {},
): ProductOSPriorities {
  const scored: ScoredIdea[] = ideas.map((idea) => {
    const opportunity = scoreProductOpportunity(idea);
    const bucket = classifyRoadmap(opportunity, blockersById[idea.id] ?? {});
    return { idea, opportunity, bucket };
  });

  scored.sort((a, b) => b.opportunity.score - a.opportunity.score);

  const shipNow = scored.filter((s) => s.bucket === "now");
  const upNext = scored.filter((s) => s.bucket === "next");
  const blocked = scored.filter((s) => s.bucket.startsWith("blocked_"));

  return {
    shipNow,
    upNext,
    blocked,
    topOpportunity: scored.length > 0 ? (scored[0] ?? null) : null,
  };
}
