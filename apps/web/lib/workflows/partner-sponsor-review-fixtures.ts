import { scanMediaClaimText, type ClaimSafetyResult } from "@/lib/media-revenue/claim-safety";
import {
  buildOfferCopyDraft,
  evaluateOfferEligibility,
  REVENUE_SPONSOR_CANNOT_CONTROL,
  scanCommercialCopy,
  scorePartnerRisk,
  type CommercialCopyScan,
  type OfferCopyDraft,
  type OfferEligibilityDecision,
  type PartnerRiskResult,
  type RevenueOffer,
  type RevenuePartner,
  type RevenueSurface,
} from "@/lib/revenue";

import {
  createDraftFenceReviewPacket,
  renderDraftFenceReviewPacketMarkdown,
  runDraftFenceWorkflow,
  type DraftFenceReviewPacket,
  type DraftFenceWorkflowStatus,
} from "./draft-fence-workflow";

export type PartnerSponsorReviewStatus = "READY_FOR_MANUAL_REVIEW" | "BLOCKED";

export type PartnerSponsorReviewFixtureDefinition = {
  readonly fixtureId: string;
  readonly title: string;
  readonly partner: RevenuePartner;
  readonly offer: RevenueOffer;
  readonly surface: RevenueSurface;
  readonly text: string;
  readonly userState?: string;
  readonly expectedWorkflowStatus: DraftFenceWorkflowStatus;
  readonly expectedReviewStatus: PartnerSponsorReviewStatus;
  readonly sponsorControlRequests?: readonly string[];
};

export type SponsorIndependenceReview = {
  readonly ok: boolean;
  readonly protectedSurfaces: readonly string[];
  readonly blockedRequests: readonly string[];
  readonly reasons: readonly string[];
};

export type PartnerSponsorReviewFixturePacket = {
  readonly fixtureId: string;
  readonly title: string;
  readonly reviewStatus: PartnerSponsorReviewStatus;
  readonly statusMatchesExpectation: boolean;
  readonly workflowStatusMatchesExpectation: boolean;
  readonly packet: DraftFenceReviewPacket;
  readonly markdown: string;
  readonly eligibility: OfferEligibilityDecision;
  readonly partnerRisk: PartnerRiskResult;
  readonly offerCopy: OfferCopyDraft;
  readonly commercialCopy: CommercialCopyScan;
  readonly claimSafety: ClaimSafetyResult;
  readonly sponsorIndependence: SponsorIndependenceReview;
  readonly liveActionLocks: {
    readonly publishAllowed: false;
    readonly routeExposureAllowed: false;
    readonly externalSendAllowed: false;
    readonly liveIntegrationAllowed: false;
    readonly affiliateActivationAllowed: false;
    readonly sponsorApprovalAutomatic: false;
  };
};

export type PartnerSponsorReviewFixtureReportEntry = {
  readonly fixtureId: string;
  readonly title: string;
  readonly packetId: string;
  readonly reviewStatus: PartnerSponsorReviewStatus;
  readonly workflowStatus: DraftFenceWorkflowStatus;
  readonly eligibilityOk: boolean;
  readonly riskTier: PartnerRiskResult["tier"];
  readonly sponsorIndependenceOk: boolean;
  readonly blockedReasons: readonly string[];
};

export type PartnerSponsorReviewFixtureReport = {
  readonly generatedAt: string;
  readonly totalFixtures: number;
  readonly blockedFixtures: number;
  readonly readyForManualReview: number;
  readonly highRiskFixtures: number;
  readonly statusMismatchCount: number;
  readonly allLiveActionLocksClosed: boolean;
  readonly entries: readonly PartnerSponsorReviewFixtureReportEntry[];
  readonly liveActionLocks: PartnerSponsorReviewFixturePacket["liveActionLocks"];
};

const NOW = "2026-07-05T22:15:00.000Z";
const LOW_RISK_EXPIRY = "2026-12-31T23:59:59.000Z";

const creatorToolPartner: RevenuePartner = {
  allowedSurfaces: ["newsletter", "youtube", "partners_page"],
  approvalStatus: "approved",
  approvedAt: "2026-07-05T00:00:00.000Z",
  category: "creator_tool",
  disclosureRequired: true,
  displayName: "Builder Tool Co",
  expiresAt: LOW_RISK_EXPIRY,
  id: "fixture_builder_tool_co",
};

const creatorToolOffer: RevenueOffer = {
  allowedSurfaces: ["newsletter", "youtube"],
  approvalStatus: "approved",
  approvedAt: "2026-07-05T00:00:00.000Z",
  category: "creator_tool",
  disclosureText: "Affiliate disclosure: GSE may earn a commission from this partner.",
  expiresAt: LOW_RISK_EXPIRY,
  id: "fixture_builder_tool_offer",
  partnerId: creatorToolPartner.id,
  publicName: "Workflow Review",
  riskClass: "low",
};

const localSponsorPartner: RevenuePartner = {
  allowedSurfaces: ["newsletter", "podcast", "media_kit"],
  approvalStatus: "approved",
  approvedAt: "2026-07-05T00:00:00.000Z",
  category: "general_sponsor",
  disclosureRequired: true,
  displayName: "Local Signal Sponsor",
  expiresAt: LOW_RISK_EXPIRY,
  id: "fixture_local_signal_sponsor",
};

const localSponsorOffer: RevenueOffer = {
  allowedSurfaces: ["newsletter", "podcast"],
  approvalStatus: "approved",
  approvedAt: "2026-07-05T00:00:00.000Z",
  category: "general_sponsor",
  disclosureText: "Sponsored disclosure: GSE may receive compensation from this sponsor.",
  expiresAt: LOW_RISK_EXPIRY,
  id: "fixture_local_signal_sponsor_slot",
  partnerId: localSponsorPartner.id,
  publicName: "Board Meeting Sponsor Slot",
  riskClass: "low",
};

const regulatedPartner: RevenuePartner = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  approvedAt: "2026-07-05T00:00:00.000Z",
  category: "sportsbook",
  disclosureRequired: true,
  displayName: "Regulated Example Book",
  expiresAt: LOW_RISK_EXPIRY,
  id: "fixture_regulated_example_book",
};

const regulatedOffer: RevenueOffer = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  approvedAt: "2026-07-05T00:00:00.000Z",
  category: "sportsbook",
  containsDepositLanguage: true,
  disclosureText: "Sponsored disclosure: GSE may receive compensation from this partner.",
  eligibleStates: ["NJ", "NY"],
  expiresAt: LOW_RISK_EXPIRY,
  id: "fixture_regulated_book_review",
  minimumAge: 21,
  partnerId: regulatedPartner.id,
  publicName: "Regulated Offer Review",
  responsibleGamingText: "Must be 21+. If gambling is a problem, seek help through local support resources.",
  restrictedStates: ["WA"],
  riskClass: "high",
  termsUrl: "https://example.invalid/terms",
};

export const PARTNER_SPONSOR_REVIEW_FIXTURE_DEFINITIONS: readonly PartnerSponsorReviewFixtureDefinition[] = [
  {
    expectedReviewStatus: "READY_FOR_MANUAL_REVIEW",
    expectedWorkflowStatus: "NEEDS_MANUAL_REVIEW",
    fixtureId: "creator_tool_affiliate_manual_review",
    offer: creatorToolOffer,
    partner: creatorToolPartner,
    surface: "newsletter",
    text:
      "Affiliate disclosure: GSE may earn a commission from Builder Tool Co. Partner mention is educational and manual-reviewed.",
    title: "Creator tool affiliate review",
  },
  {
    expectedReviewStatus: "READY_FOR_MANUAL_REVIEW",
    expectedWorkflowStatus: "NEEDS_MANUAL_REVIEW",
    fixtureId: "board_meeting_sponsor_independence",
    offer: localSponsorOffer,
    partner: localSponsorPartner,
    surface: "newsletter",
    text:
      "Sponsored disclosure: GSE may receive compensation from Local Signal Sponsor. Sponsor cannot control picks, model outputs, no-bet decisions, loss autopsies, calibration claims, or editorial conclusions.",
    title: "Board Meeting sponsor independence review",
  },
  {
    expectedReviewStatus: "BLOCKED",
    expectedWorkflowStatus: "NEEDS_MANUAL_REVIEW",
    fixtureId: "sponsor_control_attempt_blocked",
    offer: localSponsorOffer,
    partner: localSponsorPartner,
    sponsorControlRequests: ["picks", "model outputs"],
    surface: "newsletter",
    text: "Sponsored disclosure: GSE may receive compensation from Local Signal Sponsor. Sponsor asks to approve picks.",
    title: "Sponsor control attempt",
  },
  {
    expectedReviewStatus: "BLOCKED",
    expectedWorkflowStatus: "BLOCKED",
    fixtureId: "regulated_unknown_state_blocked",
    offer: regulatedOffer,
    partner: regulatedPartner,
    surface: "newsletter",
    text:
      "Sponsored disclosure: GSE may receive compensation from this sportsbook partner. Must be 21+. Terms apply through the reviewed terms URL.",
    title: "Regulated offer without user state",
  },
  {
    expectedReviewStatus: "BLOCKED",
    expectedWorkflowStatus: "NEEDS_MANUAL_REVIEW",
    fixtureId: "expired_offer_blocked",
    offer: { ...creatorToolOffer, expiresAt: "2026-01-01T00:00:00.000Z", id: "fixture_expired_builder_offer" },
    partner: creatorToolPartner,
    surface: "newsletter",
    text:
      "Affiliate disclosure: GSE may earn a commission from Builder Tool Co. Partner mention is educational and manual-reviewed.",
    title: "Expired offer review",
  },
  {
    expectedReviewStatus: "BLOCKED",
    expectedWorkflowStatus: "BLOCKED",
    fixtureId: "unsafe_claim_copy_blocked",
    offer: creatorToolOffer,
    partner: creatorToolPartner,
    surface: "newsletter",
    text: "Affiliate disclosure: GSE may earn a commission from Builder Tool Co. This workflow has proven ROI.",
    title: "Unsafe partner claim copy",
  },
] as const;

export function reviewSponsorIndependence(input: {
  readonly text: string;
  readonly sponsorControlRequests?: readonly string[];
}): SponsorIndependenceReview {
  const explicitRequests = input.sponsorControlRequests ?? [];
  const protectedSurfaces = [...REVENUE_SPONSOR_CANNOT_CONTROL];
  const normalized = input.text.toLowerCase();
  const textControlAttempt =
    /\bsponsor\s+(asks?|requests?|can|may|will)\s+(to\s+)?(approve|control|alter|change|edit)\b/.test(normalized) &&
    protectedSurfaces.some((surface) => normalized.includes(surface));
  const blockedRequests = [
    ...new Set([
      ...explicitRequests.filter((request) =>
        protectedSurfaces.some((surface) => request.toLowerCase().includes(surface.toLowerCase())),
      ),
      ...(textControlAttempt ? ["sponsor text attempts control over protected editorial or model surfaces"] : []),
    ]),
  ];
  const reasons =
    blockedRequests.length === 0
      ? []
      : blockedRequests.map((request) => `Sponsor cannot control ${request}.`);

  return {
    blockedRequests,
    ok: blockedRequests.length === 0,
    protectedSurfaces,
    reasons,
  };
}

function blockedReasonsFor(input: {
  readonly workflowPacket: DraftFenceReviewPacket;
  readonly eligibility: OfferEligibilityDecision;
  readonly offerCopy: OfferCopyDraft;
  readonly commercialCopy: CommercialCopyScan;
  readonly sponsorIndependence: SponsorIndependenceReview;
}): readonly string[] {
  return [
    ...input.workflowPacket.blockers,
    ...input.eligibility.blockers.map((blocker) => `${blocker.code}: ${blocker.message}`),
    ...input.sponsorIndependence.reasons,
    ...input.commercialCopy.blockedTerms.map((term) => `commercial-copy blocked term: ${term}`),
    ...input.commercialCopy.evidenceRequiredTerms.map((term) => `commercial-copy evidence required: ${term}`),
  ];
}

function reviewStatusFor(input: {
  readonly workflowPacket: DraftFenceReviewPacket;
  readonly eligibility: OfferEligibilityDecision;
  readonly offerCopy: OfferCopyDraft;
  readonly commercialCopy: CommercialCopyScan;
  readonly sponsorIndependence: SponsorIndependenceReview;
}): PartnerSponsorReviewStatus {
  if (blockedReasonsFor(input).length > 0) return "BLOCKED";
  return "READY_FOR_MANUAL_REVIEW";
}

export async function buildPartnerSponsorReviewFixturePackets(
  definitions: readonly PartnerSponsorReviewFixtureDefinition[] = PARTNER_SPONSOR_REVIEW_FIXTURE_DEFINITIONS,
): Promise<readonly PartnerSponsorReviewFixturePacket[]> {
  const packets: PartnerSponsorReviewFixturePacket[] = [];
  for (const definition of definitions) {
    const workflow = await runDraftFenceWorkflow({
      kind: "content",
      metadata: {
        disclosureText: definition.offer.disclosureText,
        offer: definition.offer,
        partner: definition.partner,
        sourceIds: ["nflverse"],
        surface: definition.surface,
        userState: definition.userState,
      },
      now: NOW,
      text: definition.text,
      workflowRunId: `partner_sponsor_fixture_${definition.fixtureId}`,
    });
    const packet = createDraftFenceReviewPacket({ workflow });
    const eligibility = evaluateOfferEligibility({
      now: new Date(NOW),
      offer: definition.offer,
      partner: definition.partner,
      surface: definition.surface,
      userState: definition.userState,
    });
    const offerCopy = buildOfferCopyDraft(definition.partner, definition.offer);
    const commercialCopy = scanCommercialCopy(definition.text);
    const sponsorIndependence = reviewSponsorIndependence({
      sponsorControlRequests: definition.sponsorControlRequests,
      text: definition.text,
    });
    const reviewStatus = reviewStatusFor({
      commercialCopy,
      eligibility,
      offerCopy,
      sponsorIndependence,
      workflowPacket: packet,
    });

    packets.push({
      claimSafety: scanMediaClaimText(definition.text),
      commercialCopy,
      eligibility,
      fixtureId: definition.fixtureId,
      liveActionLocks: {
        ...packet.liveActionLocks,
        affiliateActivationAllowed: false,
        sponsorApprovalAutomatic: false,
      },
      markdown: renderDraftFenceReviewPacketMarkdown(packet),
      offerCopy,
      packet,
      partnerRisk: scorePartnerRisk(definition.partner, [definition.offer]),
      reviewStatus,
      sponsorIndependence,
      statusMatchesExpectation: reviewStatus === definition.expectedReviewStatus,
      title: definition.title,
      workflowStatusMatchesExpectation: packet.status === definition.expectedWorkflowStatus,
    });
  }
  return packets;
}

export function buildPartnerSponsorReviewFixtureReport(input: {
  readonly packets: readonly PartnerSponsorReviewFixturePacket[];
  readonly generatedAt?: string;
}): PartnerSponsorReviewFixtureReport {
  const entries = input.packets.map((packet) => ({
    blockedReasons: blockedReasonsFor({
      commercialCopy: packet.commercialCopy,
      eligibility: packet.eligibility,
      offerCopy: packet.offerCopy,
      sponsorIndependence: packet.sponsorIndependence,
      workflowPacket: packet.packet,
    }),
    eligibilityOk: packet.eligibility.ok,
    fixtureId: packet.fixtureId,
    packetId: packet.packet.packetId,
    reviewStatus: packet.reviewStatus,
    riskTier: packet.partnerRisk.tier,
    sponsorIndependenceOk: packet.sponsorIndependence.ok,
    title: packet.title,
    workflowStatus: packet.packet.status,
  }));
  const allLiveActionLocksClosed = input.packets.every(
    (packet) =>
      !packet.liveActionLocks.publishAllowed &&
      !packet.liveActionLocks.routeExposureAllowed &&
      !packet.liveActionLocks.externalSendAllowed &&
      !packet.liveActionLocks.liveIntegrationAllowed &&
      !packet.liveActionLocks.affiliateActivationAllowed &&
      !packet.liveActionLocks.sponsorApprovalAutomatic,
  );

  return {
    allLiveActionLocksClosed,
    blockedFixtures: entries.filter((entry) => entry.reviewStatus === "BLOCKED").length,
    entries,
    generatedAt: input.generatedAt ?? new Date(0).toISOString(),
    highRiskFixtures: input.packets.filter((packet) => packet.partnerRisk.tier === "HIGH").length,
    liveActionLocks: {
      affiliateActivationAllowed: false,
      externalSendAllowed: false,
      liveIntegrationAllowed: false,
      publishAllowed: false,
      routeExposureAllowed: false,
      sponsorApprovalAutomatic: false,
    },
    readyForManualReview: entries.filter((entry) => entry.reviewStatus === "READY_FOR_MANUAL_REVIEW").length,
    statusMismatchCount: input.packets.filter(
      (packet) => !packet.statusMatchesExpectation || !packet.workflowStatusMatchesExpectation,
    ).length,
    totalFixtures: entries.length,
  };
}
