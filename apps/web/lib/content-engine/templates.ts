/**
 * Content Engine — safe draft templates.
 *
 * Each template defines *only what the engine is allowed to emit*. No
 * template fabricates live news, injuries, or external sources. The
 * template fields constrain what the build helpers (build-draft.ts) put
 * into a `ContentDraft` body.
 *
 * Each template is a single declarative record. The build helpers read
 * the template, gather the data the platform actually has (today's slate,
 * published picks, approved promotions, calibration status, etc.) and
 * produce a draft body that:
 *   - cites every assertion to a `ContentSource`
 *   - includes the disclosures the template demands
 *   - refuses to fabricate fields it can't source
 */

import type {
  ContentDraftType,
  ContentDraftVisibility,
  ContentSourceType,
} from "./types";

export interface ContentTemplate {
  readonly key: string;
  readonly contentType: ContentDraftType;
  readonly title: string;
  readonly description: string;
  readonly requiredSources: readonly ContentSourceType[];
  readonly allowedData: readonly string[];
  /**
   * Banned claim IDs from the Trust Claim Registry (apps/web/lib/trust-claims.ts).
   * Templates intentionally reference IDs — not the literal banned strings — so
   * the public-copy scanner can include this file without false positives.
   */
  readonly prohibitedClaimIds: readonly string[];
  readonly requiresAffiliateDisclosure: boolean;
  readonly requiresResponsibleGaming: boolean;
  readonly requiresPerformanceGate: boolean;
  readonly defaultVisibility: ContentDraftVisibility;
  readonly reviewOwner: "AVA" | "BOBBY" | "SARAH" | "JARVIS" | "TAL";
}

export const CONTENT_TEMPLATES: Readonly<Record<string, ContentTemplate>> = {
  DAILY_SLATE_BRIEF: {
    key: "DAILY_SLATE_BRIEF",
    contentType: "DAILY_BRIEF",
    title: "Daily slate brief",
    description:
      "Today's slate, published picks, freshness warnings, and a responsible-gaming line.",
    requiredSources: ["ODDS", "DAILY_BRIEF"],
    allowedData: [
      "today.gameCount",
      "today.publishedPickCount",
      "today.dataQualityWarnings",
      "today.lineMovementNotes",
    ],
    prohibitedClaimIds: [
      "banned.guaranteed-outcome",
      "banned.sure-thing",
    ],
    requiresAffiliateDisclosure: false,
    requiresResponsibleGaming: true,
    requiresPerformanceGate: false,
    defaultVisibility: "PUBLIC",
    reviewOwner: "AVA",
  },

  APPROVED_PROMOTIONS_ROUNDUP: {
    key: "APPROVED_PROMOTIONS_ROUNDUP",
    contentType: "PROMOTION_ROUNDUP",
    title: "Approved sportsbook promotions roundup",
    description:
      "Compliance-approved promotions only. Terms URL, disclosure, and RG language required.",
    requiredSources: ["PROMOTION_TERMS", "RESPONSIBLE_GAMING"],
    allowedData: [
      "promotion.operatorName",
      "promotion.offerSummary",
      "promotion.termsUrl",
      "promotion.eligibleStates",
      "promotion.expiresAt",
    ],
    prohibitedClaimIds: [
      "banned.guaranteed-outcome",
      "banned.risk-free",
      "banned.easy-money",
      "banned.guaranteed-profit",
    ],
    requiresAffiliateDisclosure: true,
    requiresResponsibleGaming: true,
    requiresPerformanceGate: false,
    defaultVisibility: "PUBLIC",
    reviewOwner: "BOBBY",
  },

  WHY_DATA_FRESHNESS_MATTERS: {
    key: "WHY_DATA_FRESHNESS_MATTERS",
    contentType: "METHODOLOGY_EDUCATION",
    title: "Why data freshness matters",
    description:
      "Evergreen explainer about freshness budgets, stale-line risk, and how the platform handles aging evidence.",
    requiredSources: ["METHODOLOGY"],
    allowedData: ["platform.freshnessBudgets", "platform.staleSourceBehavior"],
    prohibitedClaimIds: ["banned.easy-money"],
    requiresAffiliateDisclosure: false,
    requiresResponsibleGaming: false,
    requiresPerformanceGate: false,
    defaultVisibility: "PUBLIC",
    reviewOwner: "AVA",
  },

  HOW_CONFIDENCE_LABELS_WORK: {
    key: "HOW_CONFIDENCE_LABELS_WORK",
    contentType: "METHODOLOGY_EDUCATION",
    title: "How confidence labels work",
    description:
      "Explains the difference between labels and calibrated scores, and the platform's display mode.",
    requiredSources: ["METHODOLOGY"],
    allowedData: ["platform.confidenceDisplayMode", "engine.modelVersion"],
    prohibitedClaimIds: ["banned.lock", "banned.sure-thing", "banned.cant-lose"],
    requiresAffiliateDisclosure: false,
    requiresResponsibleGaming: false,
    requiresPerformanceGate: false,
    defaultVisibility: "PUBLIC",
    reviewOwner: "AVA",
  },

  RESPONSIBLE_BETTING_REMINDER: {
    key: "RESPONSIBLE_BETTING_REMINDER",
    contentType: "RESPONSIBLE_BETTING_EDUCATION",
    title: "Responsible betting reminder",
    description:
      "Short, evergreen reminder. Helpline number, no promo-specific language.",
    requiredSources: ["RESPONSIBLE_GAMING", "METHODOLOGY"],
    allowedData: ["platform.helplineNumber"],
    prohibitedClaimIds: ["banned.risk-free", "banned.guaranteed-outcome", "banned.easy-money"],
    requiresAffiliateDisclosure: false,
    requiresResponsibleGaming: true,
    requiresPerformanceGate: false,
    defaultVisibility: "PUBLIC",
    reviewOwner: "SARAH",
  },

  WEEKLY_PICK_TRANSPARENCY_RECAP: {
    key: "WEEKLY_PICK_TRANSPARENCY_RECAP",
    contentType: "WEEKLY_RECAP",
    title: "Weekly pick transparency recap",
    description:
      "Settled-pick recap. Only publishes when the performance gate is on and bootstrap picks are excluded.",
    requiredSources: ["PERFORMANCE", "PICK"],
    allowedData: [
      "performance.settledCount",
      "performance.winLossRecord",
      "performance.bootstrapExcluded",
    ],
    prohibitedClaimIds: ["banned.verified-track-record", "banned.guaranteed-profit"],
    requiresAffiliateDisclosure: false,
    requiresResponsibleGaming: true,
    requiresPerformanceGate: true,
    defaultVisibility: "PUBLIC",
    reviewOwner: "AVA",
  },

  LINE_MOVEMENT_WATCH: {
    key: "LINE_MOVEMENT_WATCH",
    contentType: "LINE_MOVEMENT_WATCH",
    title: "Line movement watch",
    description:
      "Internal note on observed line movement. Internal-only by default — never auto-promoted to public.",
    requiredSources: ["ODDS"],
    allowedData: ["odds.openingLine", "odds.currentLine", "odds.bookmakerCount"],
    prohibitedClaimIds: ["banned.guaranteed-outcome"],
    requiresAffiliateDisclosure: false,
    requiresResponsibleGaming: true,
    requiresPerformanceGate: false,
    defaultVisibility: "INTERNAL",
    reviewOwner: "JARVIS",
  },

  MODEL_ACCOUNTABILITY_NOTE: {
    key: "MODEL_ACCOUNTABILITY_NOTE",
    contentType: "MODEL_ACCOUNTABILITY_NOTE",
    title: "Model accountability note",
    description:
      "Internal-only summary of an open calibration proposal. Public-safe variants require a deliberate operator decision.",
    requiredSources: ["CALIBRATION", "METHODOLOGY"],
    allowedData: [
      "calibration.proposalKind",
      "calibration.modelVersion",
      "calibration.status",
    ],
    prohibitedClaimIds: [],
    requiresAffiliateDisclosure: false,
    requiresResponsibleGaming: false,
    requiresPerformanceGate: false,
    defaultVisibility: "INTERNAL",
    reviewOwner: "TAL",
  },

  METHODOLOGY_EXPLAINER: {
    key: "METHODOLOGY_EXPLAINER",
    contentType: "METHODOLOGY_EDUCATION",
    title: "Methodology explainer",
    description:
      "Full how-it-works explainer. Cites the Trust Claim Registry. No game-specific claims.",
    requiredSources: ["METHODOLOGY"],
    allowedData: ["platform.trustClaims", "engine.modelVersion"],
    prohibitedClaimIds: ["banned.guaranteed-outcome"],
    requiresAffiliateDisclosure: false,
    requiresResponsibleGaming: false,
    requiresPerformanceGate: false,
    defaultVisibility: "PUBLIC",
    reviewOwner: "AVA",
  },

  WHAT_CHANGED_SINCE_REFRESH: {
    key: "WHAT_CHANGED_SINCE_REFRESH",
    contentType: "DAILY_BRIEF",
    title: "What changed since last refresh",
    description:
      "Daily-brief companion piece. Internal-first; public release requires explicit review.",
    requiredSources: ["DAILY_BRIEF", "ODDS"],
    allowedData: [
      "today.lineMovementNotes",
      "today.staleSourceWarnings",
      "today.newPickCount",
    ],
    prohibitedClaimIds: ["banned.lock", "banned.guaranteed-outcome"],
    requiresAffiliateDisclosure: false,
    requiresResponsibleGaming: true,
    requiresPerformanceGate: false,
    defaultVisibility: "INTERNAL",
    reviewOwner: "AVA",
  },,

  WHY_BOARD_QUIET: {
    key: "WHY_BOARD_QUIET",
    contentType: "METHODOLOGY_EDUCATION",
    title: "Why the board is quiet",
    description:
      "Honest explainer when quiet board / selective empty / stale odds dark the surface. Uses only gate reasons and ops truth — never fabricates slate.",
    requiredSources: ["DAILY_BRIEF"],
    allowedData: [
      "board.darkReason",
      "board.surface",
      "odds.insertAgeMinutes",
      "settlement.health",
    ],
    prohibitedClaimIds: [
      "banned.guaranteed-outcome",
      "banned.sure-thing",
      "banned.verified-roi",
    ],
    requiresAffiliateDisclosure: false,
    requiresResponsibleGaming: true,
    requiresPerformanceGate: false,
    defaultVisibility: "PUBLIC",
    reviewOwner: "AVA",
  }

};

export function listTemplates(): readonly ContentTemplate[] {
  return Object.values(CONTENT_TEMPLATES);
}

export function getTemplate(key: string): ContentTemplate | undefined {
  return CONTENT_TEMPLATES[key];
}
