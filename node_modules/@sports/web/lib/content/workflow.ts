/**
 * Content Engine — draft workflow policy.
 *
 * Defines the types of content the platform produces (always as drafts) and
 * the required source-coverage gates each kind must clear before an operator
 * can mark it APPROVED. There is no auto-publish anywhere in this module.
 */

import type { SourceCategory } from "@/lib/source-intelligence";

export type ContentKind =
  | "DAILY_BRIEF_DRAFT"
  | "WEEKLY_RECAP"
  | "MATCHUP_PREVIEW"
  | "METHODOLOGY_EDUCATION"
  | "PROMOTION_ROUNDUP"
  | "PERFORMANCE_TRANSPARENCY"
  | "RESPONSIBLE_BETTING_EDUCATION"
  | "MODEL_CHANGE_NOTE";

export type ContentChannel = "BLOG" | "NEWSLETTER" | "SOCIAL_LONGFORM";

export interface ContentDraftPolicy {
  readonly kind: ContentKind;
  readonly description: string;
  readonly requiredCategories: readonly SourceCategory[];
  readonly requiresPerformanceGate: boolean;
  readonly requiresPromotionDisclosure: boolean;
  readonly requiresRgNote: boolean;
}

export const CONTENT_POLICIES: Readonly<Record<ContentKind, ContentDraftPolicy>> = {
  DAILY_BRIEF_DRAFT: {
    kind: "DAILY_BRIEF_DRAFT",
    description:
      "Draft companion to the public /brief page. Cites the day's slate and the watch list.",
    requiredCategories: ["ODDS", "TEAM_SCHEDULE"],
    requiresPerformanceGate: false,
    requiresPromotionDisclosure: false,
    requiresRgNote: true,
  },
  WEEKLY_RECAP: {
    kind: "WEEKLY_RECAP",
    description:
      "Weekly recap of settled outcomes. Only renders publicly when the performance gate is on.",
    requiredCategories: ["PERFORMANCE_SUMMARY", "MODEL_SNAPSHOT"],
    requiresPerformanceGate: true,
    requiresPromotionDisclosure: false,
    requiresRgNote: true,
  },
  MATCHUP_PREVIEW: {
    kind: "MATCHUP_PREVIEW",
    description:
      "Single-game preview. Requires fresh odds, schedule, and team stats.",
    requiredCategories: ["ODDS", "TEAM_SCHEDULE", "TEAM_STATS"],
    requiresPerformanceGate: false,
    requiresPromotionDisclosure: false,
    requiresRgNote: true,
  },
  METHODOLOGY_EDUCATION: {
    kind: "METHODOLOGY_EDUCATION",
    description:
      "Evergreen explainer of how the model works. No game-specific claims, no performance claims.",
    requiredCategories: ["PLATFORM_POLICY"],
    requiresPerformanceGate: false,
    requiresPromotionDisclosure: false,
    requiresRgNote: false,
  },
  PROMOTION_ROUNDUP: {
    kind: "PROMOTION_ROUNDUP",
    description:
      "Roundup of sportsbook promotions. Must reference compliance-approved promotions only.",
    requiredCategories: ["BOOK_PROMO_TERMS", "PLATFORM_POLICY"],
    requiresPerformanceGate: false,
    requiresPromotionDisclosure: true,
    requiresRgNote: true,
  },
  PERFORMANCE_TRANSPARENCY: {
    kind: "PERFORMANCE_TRANSPARENCY",
    description:
      "Transparency post detailing how we report performance. Only publishes once the performance gate is on.",
    requiredCategories: ["PERFORMANCE_SUMMARY"],
    requiresPerformanceGate: true,
    requiresPromotionDisclosure: false,
    requiresRgNote: true,
  },
  RESPONSIBLE_BETTING_EDUCATION: {
    kind: "RESPONSIBLE_BETTING_EDUCATION",
    description:
      "Education content on responsible-gambling. No promotion-specific claims.",
    requiredCategories: ["PLATFORM_POLICY"],
    requiresPerformanceGate: false,
    requiresPromotionDisclosure: false,
    requiresRgNote: true,
  },
  MODEL_CHANGE_NOTE: {
    kind: "MODEL_CHANGE_NOTE",
    description:
      "Internal-facing first, then a public note when a model version is bumped. Cites the new MODEL_VERSION.",
    requiredCategories: ["MODEL_SNAPSHOT", "PLATFORM_POLICY"],
    requiresPerformanceGate: false,
    requiresPromotionDisclosure: false,
    requiresRgNote: false,
  },
};

export interface DraftPolicyVerdict {
  readonly canApprove: boolean;
  readonly blockers: readonly string[];
}

/**
 * Evaluate whether a draft is allowed to move to APPROVED.
 *
 * Does NOT publish — APPROVED still requires a human reviewer to flip the
 * status via the cockpit transition service.
 */
export function evaluateDraftReadiness(input: {
  readonly kind: ContentKind;
  readonly coveredCategories: readonly SourceCategory[];
  readonly performanceGateOn: boolean;
  readonly contentBody: string;
  readonly includesPromotion: boolean;
  readonly includesRgNote: boolean;
}): DraftPolicyVerdict {
  const policy = CONTENT_POLICIES[input.kind];
  const blockers: string[] = [];

  for (const required of policy.requiredCategories) {
    if (!input.coveredCategories.includes(required)) {
      blockers.push(`Missing required source category: ${required}.`);
    }
  }

  if (policy.requiresPerformanceGate && !input.performanceGateOn) {
    blockers.push(
      "Performance gate is off. Content kind requires PERFORMANCE_STATS_ENABLED=true before publication."
    );
  }

  if (policy.requiresPromotionDisclosure && !input.includesPromotion) {
    blockers.push(
      "Content kind requires a referenced compliance-approved promotion and an affiliate disclosure block."
    );
  }

  if (policy.requiresRgNote && !input.includesRgNote) {
    blockers.push(
      "Content kind requires a responsible-gambling note in the draft body."
    );
  }

  // Body must not be empty.
  if (input.contentBody.trim().length === 0) {
    blockers.push("Draft body is empty.");
  }

  return {
    canApprove: blockers.length === 0,
    blockers: Object.freeze(blockers),
  };
}

export function listContentKinds(): readonly ContentKind[] {
  return Object.keys(CONTENT_POLICIES) as ContentKind[];
}
