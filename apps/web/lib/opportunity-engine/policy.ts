import type {
  CouncilReviewer,
  EvidenceAssessment,
  OpportunityCandidate,
  OpportunityDisposition,
  OpportunityPolicyDecision,
  OpportunityScore,
} from "./types";

const MONEY_STATES_THAT_REQUIRE_PROOF: ReadonlySet<OpportunityCandidate["economics"]["moneyState"]> =
  new Set([
    "eligible",
    "applied",
    "approved",
    "activated",
    "earned",
    "invoiced",
    "paid",
  ]);

function uniqueReviewers(reviewers: readonly CouncilReviewer[]): readonly CouncilReviewer[] {
  return [...new Set(reviewers)];
}

export function findHardBlockers(
  candidate: OpportunityCandidate,
  evidence: EvidenceAssessment,
  now: Date,
): readonly string[] {
  const blocked: string[] = [];

  if (candidate.rightsStatus === "blocked") {
    blocked.push("Source or data rights are explicitly blocked.");
  }
  if (candidate.securityPosture === "blocked") {
    blocked.push("Security posture is explicitly blocked.");
  }
  if (
    (candidate.involvesDataSharing || candidate.involvesModelTraining) &&
    candidate.rightsStatus !== "cleared"
  ) {
    blocked.push("Data sharing or model training cannot proceed until rights are explicitly cleared.");
  }
  if (MONEY_STATES_THAT_REQUIRE_PROOF.has(candidate.economics.moneyState) && !evidence.hasMoneyClaimEvidence) {
    blocked.push(`Money state ${candidate.economics.moneyState} lacks primary program, billing, or payout evidence.`);
  }
  if (candidate.economics.moneyState === "paid" && candidate.economics.potentialRevenue != null) {
    blocked.push("Paid money must be represented by measured receipts, not a potential-revenue range.");
  }
  if (candidate.economics.requiredCashUsd < 0 || candidate.economics.requiredOwnerHours < 0) {
    blocked.push("Required cash and owner time must be non-negative.");
  }
  if (candidate.evidence.length === 0) {
    blocked.push("No evidence is attached.");
  }
  if (candidate.expiresAt) {
    const expiry = Date.parse(candidate.expiresAt);
    if (!Number.isFinite(expiry)) {
      // Fail closed on ambiguity, matching isCreditGrantSnapshotExpired in
      // credit-snapshot.ts: a present-but-unparsable expiry reads as expired,
      // never as "no expiry".
      blocked.push("Opportunity expiry timestamp is unparsable; treated as expired.");
    } else if (expiry < now.getTime()) {
      blocked.push("Opportunity has expired.");
    }
  }
  return blocked;
}

export function requiredReviewsFor(candidate: OpportunityCandidate): readonly CouncilReviewer[] {
  const reviewers: CouncilReviewer[] = ["NOVA", "JARVIS"];

  const hasEconomicLane =
    candidate.revenueLanes.some((lane) => lane !== "none") ||
    candidate.economics.moneyState !== "not_applicable" ||
    candidate.economics.requiredCashUsd > 0;
  if (hasEconomicLane) reviewers.push("BOBBY", "METER");

  if (
    candidate.opportunityClass === "api_or_data_feed" ||
    candidate.opportunityClass === "developer_tool" ||
    candidate.opportunityClass === "platform_update" ||
    candidate.opportunityClass === "ai_model_release" ||
    candidate.opportunityClass === "workflow_arbitrage" ||
    candidate.requiresCredentials
  ) {
    reviewers.push("TAL");
  }

  if (
    candidate.involvesDataSharing ||
    candidate.involvesModelTraining ||
    candidate.jurisdictionSensitive ||
    candidate.rightsStatus !== "cleared" ||
    candidate.risks.legalRisk >= 3 ||
    candidate.risks.dataRightsRisk >= 3
  ) {
    reviewers.push("AUDIT");
  }

  if (candidate.securityPosture !== "trusted_read_only" || candidate.risks.securityRisk >= 3) {
    reviewers.push("TAL", "AUDIT");
  }

  if (
    candidate.opportunityClass === "app_product" ||
    candidate.opportunityClass === "marketplace_channel" ||
    candidate.opportunityClass === "affiliate_program" ||
    candidate.opportunityClass === "partnership"
  ) {
    reviewers.push("GAUGE");
  }

  if (candidate.requiresExternalAction || candidate.economics.requiredCashUsd > 0) {
    reviewers.push("Owner");
  }

  return uniqueReviewers(reviewers);
}

function chooseDisposition(
  candidate: OpportunityCandidate,
  evidence: EvidenceAssessment,
  score: OpportunityScore,
  blockers: readonly string[],
): OpportunityDisposition {
  if (candidate.rightsStatus === "blocked" || candidate.securityPosture === "blocked") return "QUARANTINE";
  if (blockers.some((reason) => reason.includes("expired"))) return "REJECT";
  if (blockers.length > 0) return "RESEARCH_MORE";

  if (
    candidate.requiresExternalAction ||
    candidate.economics.requiredCashUsd > 0 ||
    candidate.involvesDataSharing ||
    candidate.involvesModelTraining ||
    candidate.jurisdictionSensitive ||
    candidate.rightsStatus === "permission_required" ||
    candidate.rightsStatus === "terms_review_required"
  ) {
    return "OWNER_REVIEW";
  }

  if (evidence.evidenceScore < 45 || score.confidence === "LOW") return "RESEARCH_MORE";
  if (score.netScore < 40) return "REJECT";
  if (score.netScore < 55) return "WATCH";

  const reversibleNoCashInternal =
    candidate.economics.requiredCashUsd === 0 &&
    !candidate.requiresExternalAction &&
    !candidate.requiresCredentials &&
    candidate.securityPosture === "trusted_read_only" &&
    candidate.rightsStatus === "cleared" &&
    candidate.signals.reversibility >= 4;

  if (score.netScore >= 78 && reversibleNoCashInternal) return "IMPLEMENT_INTERNAL";
  return "PROTOTYPE_SANDBOX";
}

export function decidePolicy(
  candidate: OpportunityCandidate,
  evidence: EvidenceAssessment,
  score: OpportunityScore,
  now: Date,
): OpportunityPolicyDecision {
  const blockedReasons = findHardBlockers(candidate, evidence, now);
  return {
    disposition: chooseDisposition(candidate, evidence, score, blockedReasons),
    blockedReasons,
    requiredReviews: requiredReviewsFor(candidate),
    externalActionsAllowed: false,
    automaticInstallAllowed: false,
    automaticSpendAllowed: false,
    automaticPublishAllowed: false,
  };
}
