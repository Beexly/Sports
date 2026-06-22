/**
 * GSE Memory & Personalization Policy.
 *
 * Memory should improve decisions without becoming creepy or manipulative. This
 * module encodes WHAT may be stored, what must not, what requires consent, what
 * stays local, what is user-visible, what can be deleted, what feeds
 * recommendations, and how stale memory decays — plus the Memory Usefulness
 * score that gates whether a memory still earns influence.
 *
 * It aligns to the existing memory subsystems (`apps/web/lib/memory/*`,
 * `apps/web/lib/jarvis/memory/*`) and the cockpit memory review queue, where
 * only CONFIRMED memories are recalled and candidates are never treated as
 * facts. That doctrine is enforced here: an unconfirmed memory cannot reach the
 * "high" usefulness band.
 *
 * Companion doc: docs/research/GSE_2026_MEMORY_AND_PERSONALIZATION.md
 */

import { type GseScore, makeScore } from "./gse-scoring-systems";

export type MemoryType =
  | "user_preference"
  | "decision_history"
  | "league_memory"
  | "model_memory"
  | "business_memory"
  | "agent_memory";

export type StorageLocation = "local" | "server" | "both";

export type MemoryVisibility = "private" | "user_visible" | "internal";

export interface MemoryPolicy {
  readonly type: MemoryType;
  readonly label: string;
  readonly canStore: readonly string[];
  readonly mustNotStore: readonly string[];
  readonly requiresConsent: boolean;
  readonly storage: StorageLocation;
  readonly visibility: MemoryVisibility;
  readonly userDeletable: boolean;
  readonly userExportable: boolean;
  readonly feedsRecommendations: boolean;
  /** Half-life in days after which influence halves. 0 = never decays (rare). */
  readonly decayHalfLifeDays: number;
  readonly auditRequirement: string;
}

export const MEMORY_POLICIES: readonly MemoryPolicy[] = [
  {
    type: "user_preference",
    label: "User preference memory",
    canStore: ["favorite formats", "risk tolerance", "sports/leagues followed", "preferred explanation depth", "DFS contest types"],
    mustNotStore: ["payment card data", "government IDs", "precise location", "inferred protected attributes"],
    requiresConsent: true,
    storage: "both",
    visibility: "user_visible",
    userDeletable: true,
    userExportable: true,
    feedsRecommendations: true,
    decayHalfLifeDays: 180,
    auditRequirement: "Log preference changes; surface them in the user's memory view.",
  },
  {
    type: "decision_history",
    label: "Decision history memory",
    canStore: ["picks viewed", "decisions made", "lineups generated", "no-play decisions", "outcomes"],
    mustNotStore: ["money amounts wagered off-platform", "third-party account credentials"],
    requiresConsent: true,
    storage: "server",
    visibility: "user_visible",
    userDeletable: true,
    userExportable: true,
    feedsRecommendations: true,
    decayHalfLifeDays: 365,
    auditRequirement: "Decision history feeds bias detection; user can purge it.",
  },
  {
    type: "league_memory",
    label: "League memory",
    canStore: ["prior draft history (user-provided)", "league settings", "manager tendencies (aggregate)", "historical outcomes"],
    mustNotStore: ["other managers' PII beyond display name", "private league chat"],
    requiresConsent: true,
    storage: "server",
    visibility: "user_visible",
    userDeletable: true,
    userExportable: true,
    feedsRecommendations: true,
    decayHalfLifeDays: 730,
    auditRequirement: "League memory is user-provided; provenance recorded per item.",
  },
  {
    type: "model_memory",
    label: "Model memory",
    canStore: ["predictions made", "outcomes", "calibration results", "source-accuracy updates"],
    mustNotStore: ["user PII tied to model internals"],
    requiresConsent: false,
    storage: "server",
    visibility: "internal",
    userDeletable: false,
    userExportable: false,
    feedsRecommendations: true,
    decayHalfLifeDays: 365,
    auditRequirement: "Versioned + auditable; never silently overwritten (truth maintenance).",
  },
  {
    type: "business_memory",
    label: "Business memory",
    canStore: ["user segment", "onboarding state", "subscription state", "product usage (aggregate)", "churn-risk signals"],
    mustNotStore: ["sensitive inferred attributes used to discriminate", "dark-pattern targeting data"],
    requiresConsent: false,
    storage: "server",
    visibility: "internal",
    userDeletable: false,
    userExportable: false,
    feedsRecommendations: false,
    decayHalfLifeDays: 120,
    auditRequirement: "Used for product/retention only; never to manufacture urgency.",
  },
  {
    type: "agent_memory",
    label: "Agent memory",
    canStore: ["prior conclusions", "unresolved research", "stale assumptions", "open blockers"],
    mustNotStore: ["unverified claims promoted to facts"],
    requiresConsent: false,
    storage: "server",
    visibility: "internal",
    userDeletable: false,
    userExportable: false,
    feedsRecommendations: true,
    decayHalfLifeDays: 90,
    auditRequirement: "Agent conclusions carry confidence; stale ones decay out.",
  },
] as const;

/** Look up a memory policy by type. */
export function getMemoryPolicy(type: MemoryType): MemoryPolicy | undefined {
  return MEMORY_POLICIES.find((p) => p.type === type);
}

/** Memory types that may be shown to or controlled by the end user. */
export function getUserControllableMemory(): readonly MemoryPolicy[] {
  return MEMORY_POLICIES.filter((p) => p.userDeletable || p.userExportable);
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Usefulness score
// ─────────────────────────────────────────────────────────────────────────────

export interface MemoryUsefulnessSignals {
  readonly type: MemoryType;
  /** Days since the memory was last confirmed/used. */
  readonly ageDays: number;
  /** Confirmed (true) vs candidate (false). Candidates are never facts. */
  readonly confirmed: boolean;
  /** 0..1 relevance of this memory to the current decision. */
  readonly outcomeRelevance: number;
  /** Consent state for the memory type. */
  readonly consentGranted: boolean;
  /** Does the memory carry a source/provenance ref? */
  readonly hasSourceRef: boolean;
}

/**
 * Score whether a stored memory should still influence recommendations (0..100,
 * higher is more useful). Two hard gates: without consent (where required) the
 * score is 0, and an unconfirmed memory is capped into the low band so a mere
 * candidate can never act like a fact. Otherwise influence decays on the
 * policy's half-life.
 */
export function scoreMemoryUsefulness(s: MemoryUsefulnessSignals): GseScore {
  const policy = getMemoryPolicy(s.type);
  const flags: string[] = [];

  if (policy?.requiresConsent && !s.consentGranted) {
    return makeScore("memory_usefulness", 0, {
      confidence: "well_supported",
      rationale: ["consent required but not granted — memory must not influence decisions"],
      flags: ["consent gate: not granted"],
    });
  }

  const halfLife = policy?.decayHalfLifeDays ?? 180;
  const decay = halfLife <= 0 ? 1 : Math.pow(0.5, s.ageDays / halfLife);
  if (decay < 0.34) flags.push("memory is well past its half-life — low residual influence");
  if (!s.hasSourceRef) flags.push("no source/provenance ref");

  let score = decay * 100 * (0.5 + 0.5 * Math.max(0, Math.min(1, s.outcomeRelevance)));

  if (!s.confirmed) {
    score = Math.min(score, 35); // candidate, not a fact
    flags.push("unconfirmed candidate — capped; never treated as a fact");
  }

  return makeScore("memory_usefulness", score, {
    confidence: s.confirmed ? "supported" : "tentative",
    rationale: [
      `age ${s.ageDays}d on a ${halfLife}d half-life`,
      `relevance ${(s.outcomeRelevance * 100).toFixed(0)}%`,
      s.confirmed ? "confirmed" : "candidate",
    ],
    flags,
  });
}
