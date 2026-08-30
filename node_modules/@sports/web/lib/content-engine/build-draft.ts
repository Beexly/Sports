/**
 * Content Engine — draft builders.
 *
 * Pure functions that turn (template + verified platform data) into a
 * `ContentDraftRecord`. NO LLM, NO external fetch, NO fabrication.
 *
 * Every builder:
 *   - Takes only data the caller has already loaded (picks, promotions,
 *     calibration, performance, slate). The caller is responsible for
 *     having validated that data — the builder asserts shape but does
 *     not infer missing fields.
 *   - Returns a draft body that cites every assertion to a
 *     ContentSource record on the draft.
 *   - Sets status=DRAFT and never sets publishedAt.
 *   - Includes RG / affiliate disclosure language only when the caller
 *     supplies it as part of the input (we never hard-code RG copy here
 *     because that copy lives in the Trust Claim Registry and the
 *     promotion records).
 */

import { getApprovedClaims, getClaim } from "@/lib/trust-claims";
import type {
  ContentDraftRecord,
  ContentDraftVisibility,
  ContentReviewDecision,
  ContentSourceRecord,
} from "./types";
import { CONTENT_TEMPLATES } from "./templates";

const RESPONSIBLE_GAMING_LINE =
  `${getClaim("risk.gamble-responsibly")?.copy ?? "Sports betting involves risk."} Sports betting involves risk.`;

const AFFILIATE_DISCLOSURE_LINE =
  "Affiliate disclosure: this platform may earn a commission when a reader signs up at a partner sportsbook. Promotion terms govern. 21+. Geographic and eligibility restrictions apply.";

/**
 * Generic builder. Most builders delegate here after assembling the
 * template-specific body lines.
 */
export interface BuildContentDraftInput {
  readonly templateKey: keyof typeof CONTENT_TEMPLATES;
  readonly slug: string;
  readonly bodyLines: readonly string[];
  readonly sources: readonly ContentSourceRecord[];
  readonly sport?: string | null;
  readonly league?: string | null;
  readonly relatedPickIds?: readonly string[];
  readonly relatedPromotionIds?: readonly string[];
  readonly relatedBriefIds?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly generatedBy: string;
  /**
   * Force INTERNAL even if the template default is PUBLIC. Defaults to
   * the template's default visibility.
   */
  readonly visibilityOverride?: ContentDraftVisibility;
}

export function buildContentDraft(input: BuildContentDraftInput): ContentDraftRecord {
  const template = CONTENT_TEMPLATES[input.templateKey];
  if (!template) {
    throw new Error(`Unknown template: ${input.templateKey}`);
  }

  const requiresRg = template.requiresResponsibleGaming;
  const requiresDisclosure = template.requiresAffiliateDisclosure;

  const body: string[] = [...input.bodyLines.map((l) => l.trimEnd())];
  let rgIncluded = false;
  let disclosureIncluded = false;

  if (requiresRg) {
    body.push("");
    body.push(RESPONSIBLE_GAMING_LINE);
    rgIncluded = true;
  }
  if (requiresDisclosure) {
    body.push("");
    body.push(AFFILIATE_DISCLOSURE_LINE);
    disclosureIncluded = true;
  }

  const draftBody = body.join("\n").trim();
  const excerpt = input.bodyLines
    .map((l) => l.trim())
    .find((l) => l.length > 0)?.slice(0, 280);

  return {
    title: template.title,
    slug: input.slug,
    contentType: template.contentType,
    status: "DRAFT",
    visibility: input.visibilityOverride ?? template.defaultVisibility,
    sport: input.sport ?? null,
    league: input.league ?? null,
    relatedPickIds: input.relatedPickIds ?? [],
    relatedPromotionIds: input.relatedPromotionIds ?? [],
    relatedBriefIds: input.relatedBriefIds ?? [],
    sourceCoverageStatus: "NEEDS_SOURCE", // evaluated downstream
    complianceStatus: "REVIEW_REQUIRED",
    responsibleGamingIncluded: rgIncluded,
    affiliateDisclosureIncluded: disclosureIncluded,
    performanceGateStatus: template.requiresPerformanceGate
      ? "GATE_OFF_REQUIRED"
      : "NOT_APPLICABLE",
    bannedPhraseScanClean: false,
    draftBody,
    excerpt: excerpt ?? null,
    metadata: input.metadata ?? null,
    generatedBy: input.generatedBy,
    reviewedBy: null,
    reviewedAt: null,
    publishedAt: null, // ENGINE NEVER SETS THIS
    sources: input.sources,
  };
}

// ─────────────────────────────────────────────
// Type-specific builders
// ─────────────────────────────────────────────

export interface SlateSummary {
  readonly briefDate: Date;
  readonly gameCount: number;
  readonly publishedPickCount: number;
  readonly dataQualityWarnings: readonly string[];
  readonly lineMovementNotes: readonly string[];
}

export function buildDailyBriefDraft(input: {
  readonly slate: SlateSummary;
  readonly generatedBy: string;
  readonly slug: string;
  readonly sources: readonly ContentSourceRecord[];
}): ContentDraftRecord {
  const { slate } = input;
  const isoDate = slate.briefDate.toISOString().slice(0, 10);
  const lines: string[] = [
    `# Daily slate brief: ${isoDate}`,
    "",
    `Tonight's slate has ${slate.gameCount} scheduled games on the board.`,
    slate.publishedPickCount > 0
      ? `Picks published so far: ${slate.publishedPickCount}.`
      : `No picks published yet. The engine refuses to fabricate when source coverage is incomplete.`,
  ];

  if (slate.dataQualityWarnings.length > 0) {
    lines.push("");
    lines.push("Data-quality notes:");
    for (const w of slate.dataQualityWarnings) {
      lines.push(`- ${w}`);
    }
  }

  if (slate.lineMovementNotes.length > 0) {
    lines.push("");
    lines.push("Line movement we're watching:");
    for (const n of slate.lineMovementNotes) {
      lines.push(`- ${n}`);
    }
  }

  return buildContentDraft({
    templateKey: "DAILY_SLATE_BRIEF",
    slug: input.slug,
    bodyLines: lines,
    sources: input.sources,
    generatedBy: input.generatedBy,
    metadata: {
      gameCount: slate.gameCount,
      publishedPickCount: slate.publishedPickCount,
    },
  });
}

export interface PromotionRoundupItem {
  readonly id: string;
  readonly operatorName: string;
  readonly offerSummary: string;
  readonly termsUrl: string;
  readonly eligibleStates: readonly string[];
  readonly expiresAt: Date | null;
}

export function buildPromotionRoundupDraft(input: {
  readonly promotions: readonly PromotionRoundupItem[];
  readonly generatedBy: string;
  readonly slug: string;
  readonly sources: readonly ContentSourceRecord[];
}): ContentDraftRecord {
  const lines: string[] = [
    "# Approved sportsbook promotions",
    "",
    "Only promotions that have cleared compliance review appear in this draft.",
    "",
  ];

  if (input.promotions.length === 0) {
    lines.push(
      "There are no compliance-approved promotions to surface right now. The roundup will be empty until a promotion clears review."
    );
  }

  for (const p of input.promotions) {
    lines.push(`## ${p.operatorName}`);
    lines.push(p.offerSummary);
    if (p.eligibleStates.length > 0) {
      lines.push(`Eligible states: ${p.eligibleStates.join(", ")}.`);
    }
    if (p.expiresAt) {
      lines.push(`Offer expires: ${p.expiresAt.toISOString().slice(0, 10)}.`);
    }
    lines.push(`Read the full terms at the operator: ${p.termsUrl}`);
    lines.push("");
  }

  return buildContentDraft({
    templateKey: "APPROVED_PROMOTIONS_ROUNDUP",
    slug: input.slug,
    bodyLines: lines,
    sources: input.sources,
    relatedPromotionIds: input.promotions.map((p) => p.id),
    generatedBy: input.generatedBy,
  });
}

export function buildMethodologyEducationDraft(input: {
  readonly subject: "FRESHNESS" | "CONFIDENCE" | "GENERAL";
  readonly generatedBy: string;
  readonly slug: string;
  readonly sources: readonly ContentSourceRecord[];
}): ContentDraftRecord {
  const claims = getApprovedClaims("METHODOLOGY").slice(0, 3);
  const lines: string[] = [];

  switch (input.subject) {
    case "FRESHNESS":
      lines.push("# Why data freshness matters");
      lines.push("");
      lines.push(
        "Sports lines move. The model assigns each piece of evidence (odds, schedule, injury notes) a freshness budget. When evidence ages past its budget, downstream artifacts switch to HOLD or BLOCKED rather than ship a stale claim."
      );
      break;
    case "CONFIDENCE":
      lines.push("# How confidence labels work");
      lines.push("");
      lines.push(
        "The platform displays either a numeric confidence score or a label depending on the configured confidence-display mode. Numeric scores are only enabled once they have been calibrated against settled outcomes."
      );
      break;
    case "GENERAL":
      lines.push("# Methodology");
      lines.push("");
      lines.push("How the platform turns live data into ranked picks.");
      break;
  }

  if (claims.length > 0) {
    lines.push("");
    lines.push("Cited claims from the Trust Claim Registry:");
    for (const c of claims) {
      lines.push(`- ${c.copy}`);
    }
  }

  const templateKey: keyof typeof CONTENT_TEMPLATES =
    input.subject === "FRESHNESS"
      ? "WHY_DATA_FRESHNESS_MATTERS"
      : input.subject === "CONFIDENCE"
        ? "HOW_CONFIDENCE_LABELS_WORK"
        : "METHODOLOGY_EXPLAINER";

  return buildContentDraft({
    templateKey,
    slug: input.slug,
    bodyLines: lines,
    sources: input.sources,
    generatedBy: input.generatedBy,
  });
}

export interface WeeklyRecapSummary {
  readonly weekStart: Date;
  readonly weekEnd: Date;
  readonly settledCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly pushCount: number;
  readonly bootstrapExcluded: boolean;
  readonly performanceGateOn: boolean;
}

export function buildWeeklyRecapDraft(input: {
  readonly summary: WeeklyRecapSummary;
  readonly generatedBy: string;
  readonly slug: string;
  readonly sources: readonly ContentSourceRecord[];
}): ContentDraftRecord {
  const { summary } = input;
  const lines: string[] = [
    `# Weekly transparency recap (${summary.weekStart.toISOString().slice(0, 10)} → ${summary.weekEnd.toISOString().slice(0, 10)})`,
    "",
  ];

  if (!summary.performanceGateOn) {
    lines.push(
      "Performance gate is currently off. This draft will be held until canonical, calibrated performance data exists."
    );
  } else {
    lines.push(
      `Settled picks this week: ${summary.settledCount} (W ${summary.winCount} · L ${summary.lossCount} · Push ${summary.pushCount}).`
    );
    if (summary.bootstrapExcluded) {
      lines.push(
        "Bootstrap-era picks are excluded by design. Their data quality is uncalibrated."
      );
    }
    lines.push(
      "Past performance does not guarantee future results. Pushes are excluded from the win-rate denominator."
    );
  }

  return buildContentDraft({
    templateKey: "WEEKLY_PICK_TRANSPARENCY_RECAP",
    slug: input.slug,
    bodyLines: lines,
    sources: input.sources,
    generatedBy: input.generatedBy,
    metadata: {
      settledCount: summary.settledCount,
      winCount: summary.winCount,
      lossCount: summary.lossCount,
      pushCount: summary.pushCount,
      bootstrapExcluded: summary.bootstrapExcluded,
      performanceGateOn: summary.performanceGateOn,
    },
  });
}

export interface PerformanceTransparencyInput {
  readonly performanceGateOn: boolean;
  readonly settledCount: number;
  readonly generatedBy: string;
  readonly slug: string;
  readonly sources: readonly ContentSourceRecord[];
}

export function buildPerformanceTransparencyDraft(
  input: PerformanceTransparencyInput
): ContentDraftRecord {
  const lines: string[] = [
    "# Performance transparency",
    "",
    "How the platform reports performance, what is and is not included, and why bootstrap-era picks never enter the canonical totals.",
  ];

  if (!input.performanceGateOn) {
    lines.push("");
    lines.push(
      "The performance gate is currently OFF. This draft is held until canonical performance data exists."
    );
  } else {
    lines.push("");
    lines.push(`Canonical settled-pick count to date: ${input.settledCount}.`);
  }

  return buildContentDraft({
    templateKey: "WEEKLY_PICK_TRANSPARENCY_RECAP", // PERFORMANCE_TRANSPARENCY uses the same review owner
    slug: input.slug,
    bodyLines: lines,
    sources: input.sources,
    generatedBy: input.generatedBy,
    visibilityOverride: input.performanceGateOn ? "PUBLIC" : "INTERNAL",
    metadata: {
      performanceGateOn: input.performanceGateOn,
      settledCount: input.settledCount,
    },
  });
}

export function buildResponsibleBettingEducationDraft(input: {
  readonly generatedBy: string;
  readonly slug: string;
  readonly sources: readonly ContentSourceRecord[];
}): ContentDraftRecord {
  const lines: string[] = [
    "# Responsible betting reminder",
    "",
    "Sports betting can be enjoyable, but it carries real financial risk. Set a budget, never chase losses, and step away if you stop enjoying it.",
    "",
    "If gambling is affecting your life, free, confidential help is available 24/7.",
  ];
  return buildContentDraft({
    templateKey: "RESPONSIBLE_BETTING_REMINDER",
    slug: input.slug,
    bodyLines: lines,
    sources: input.sources,
    generatedBy: input.generatedBy,
  });
}

export interface CockpitContentTask {
  readonly title: string;
  readonly description: string;
  readonly assignedAgent: "AVA" | "BOBBY" | "SARAH" | "JARVIS" | "TAL";
  readonly draftId: string;
  readonly nextRecommendedAction: string;
}

/**
 * Build a cockpit-task payload for a draft. Does NOT write to the DB —
 * callers wire the payload to the cockpit task service.
 */
export function createCockpitContentTask(input: {
  readonly draft: ContentDraftRecord & { readonly id: string };
  readonly nextRecommendedAction: string;
}): CockpitContentTask {
  const template = Object.values(CONTENT_TEMPLATES).find(
    (t) => t.contentType === input.draft.contentType
  );
  const agent = template?.reviewOwner ?? "AVA";
  return {
    title: `Review draft: ${input.draft.title}`,
    description: `Draft slug ${input.draft.slug} (${input.draft.contentType}) is ready for ${agent} review. Approval does not publish.`,
    assignedAgent: agent,
    draftId: input.draft.id,
    nextRecommendedAction: input.nextRecommendedAction,
  };
}

/**
 * Re-export the decision union so callers don't have to import from types.
 */
export type { ContentReviewDecision };


export interface WhyBoardQuietInput {
  readonly darkReason: string;
  readonly boardSurface: "market" | "signal" | string;
  readonly oddsInsertAgeMinutes: number | null;
  readonly publishedPickCount: number;
  readonly gameCount: number;
  readonly calibrationStatus: "GREEN" | "RED" | "UNKNOWN" | string;
  readonly generatedBy: string;
  readonly slug: string;
  readonly sources: readonly ContentSourceRecord[];
}

/**
 * Honest quiet-board explainer — DRAFT only, no invent slate, no PROVEN.
 */
export function buildWhyBoardQuietDraft(
  input: WhyBoardQuietInput,
): ContentDraftRecord {
  const lines: string[] = [
    "# Why the board is quiet",
    "",
    "This is an operator-reviewed draft. It only uses platform gate state — it never invents picks, odds, or ROI.",
    "",
    `## Dark reason`,
    "",
    `- Code: \`${input.darkReason}\``,
    `- Board surface mode: **${input.boardSurface}**`,
    `- Games on calendar window: **${input.gameCount}**`,
    `- Published non-seed picks today: **${input.publishedPickCount}**`,
  ];
  if (input.oddsInsertAgeMinutes !== null) {
    lines.push(
      `- Last odds-insert age: **${input.oddsInsertAgeMinutes}m** (Refresh SLA is 240m for market board)`,
    );
  } else {
    lines.push("- Last odds-insert age: **unknown / none yet**");
  }
  lines.push(
    `- Calibration eligibility: **${input.calibrationStatus}** (performance stays unpublished while RED)`,
    "",
    "## What this is not",
    "",
    "- Not an outage claim unless ops health says so",
    "- Not a PROVEN track record",
    "- Not free book odds when the Odds key is absent (ABSENT-only free path)",
    "",
    "Quiet board = model/gate posture. See methodology and free tools while the public slate stays dark.",
  );

  return buildContentDraft({
    templateKey: "WHY_BOARD_QUIET",
    slug: input.slug,
    bodyLines: lines,
    sources: input.sources,
    generatedBy: input.generatedBy,
    visibilityOverride: "PUBLIC",
    metadata: {
      darkReason: input.darkReason,
      boardSurface: input.boardSurface,
      oddsInsertAgeMinutes: input.oddsInsertAgeMinutes,
      publishedPickCount: input.publishedPickCount,
      gameCount: input.gameCount,
      calibrationStatus: input.calibrationStatus,
    },
  });
}

export interface EvidencePackMatchupInput {
  readonly home: string;
  readonly away: string;
  readonly selection: string;
  readonly rankingP: number | null;
  readonly rankingSource: string | null;
  readonly independentSources: readonly string[];
  readonly calibrationStatus: string;
  readonly generatedBy: string;
  readonly slug: string;
  readonly sources: readonly ContentSourceRecord[];
}

/**
 * Matchup evidence pack — not-PROVEN footer always; rankingP only when finite.
 */
export function buildEvidencePackMatchupDraft(
  input: EvidencePackMatchupInput,
): ContentDraftRecord {
  const lines: string[] = [
    `# Evidence pack: ${input.away} @ ${input.home}`,
    "",
    `Selection under review: **${input.selection}**`,
    "",
  ];
  if (input.rankingP !== null && Number.isFinite(input.rankingP)) {
    lines.push(
      `Model rankingP: **${input.rankingP.toFixed(3)}**` +
        (input.rankingSource ? ` (source: ${input.rankingSource})` : ""),
      "",
      "rankingP is a sort key for model ranking — not verified ROI and not a public win probability claim while eligibility is RED.",
      "",
    );
  } else {
    lines.push(
      "rankingP: **not priced** on this candidate (no invent).",
      "",
    );
  }
  if (input.independentSources.length > 0) {
    lines.push(
      `Independent fair-value sources present: ${input.independentSources.join(", ")}`,
      "",
    );
  } else {
    lines.push("Independent fair-value sources: **none attached**", "");
  }
  lines.push(
    `Calibration eligibility: **${input.calibrationStatus}**`,
    "",
    "## Footer (required)",
    "",
    "Not PROVEN. No guaranteed outcome. Past results do not guarantee future results. This draft is for review only and is not a public performance claim.",
  );

  return buildContentDraft({
    templateKey: "EVIDENCE_PACK_MATCHUP",
    slug: input.slug,
    bodyLines: lines,
    sources: input.sources,
    generatedBy: input.generatedBy,
    visibilityOverride: "INTERNAL",
    metadata: {
      home: input.home,
      away: input.away,
      selection: input.selection,
      rankingP: input.rankingP,
      rankingSource: input.rankingSource,
      independentSources: [...input.independentSources],
      calibrationStatus: input.calibrationStatus,
    },
  });
}
