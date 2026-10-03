/**
 * Evidence assessment for opportunity candidates.
 *
 * S3 split unit of the frozen #146 reference branch (fbc3cfe), extracted
 * verbatim per the NOVA convergence freeze (§4 S3). `assessEvidence()`
 * satisfies the S1 `EvidenceAssessor` injection contract declared in
 * `pipeline.ts` exactly — S1 deliberately shipped the pipeline with evidence
 * assessment injected so this module could land without touching S1 logic.
 *
 * Evidence here is graded, never fabricated: a candidate with no attached
 * receipts scores zero and accumulates missing-claim findings; it is never
 * promoted by implication.
 */
import type {
  EvidenceAssessment,
  EvidenceTier,
  OpportunityCandidate,
  OpportunityEvidence,
} from "./types";

const TIER_WEIGHT: Readonly<Record<EvidenceTier, number>> = {
  official_primary: 1,
  regulator_or_standards_body: 0.95,
  official_repository_release: 0.9,
  vendor_terms_or_program_rules: 0.9,
  independent_secondary: 0.65,
  community_signal: 0.35,
  unverified_claim: 0.1,
};

const PRIMARY_TIERS: ReadonlySet<EvidenceTier> = new Set([
  "official_primary",
  "regulator_or_standards_body",
  "official_repository_release",
  "vendor_terms_or_program_rules",
]);

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMoneyBearing(candidate: OpportunityCandidate): boolean {
  return (
    candidate.economics.moneyState !== "not_applicable" ||
    candidate.revenueLanes.some((lane) => lane !== "none") ||
    candidate.economics.potentialRevenue != null ||
    candidate.economics.potentialSavings != null ||
    candidate.economics.scenarioAvailableCreditsUsd != null
  );
}

function isMoneyEvidence(evidence: OpportunityEvidence): boolean {
  const claims = [...evidence.supports, ...(evidence.contradicts ?? [])].join(" ").toLowerCase();
  return /\b(price|pricing|fee|commission|credit|grant|revenue|payout|discount|cost|saving|eligib|award|marketplace)\b/.test(
    claims,
  );
}

export function assessEvidence(
  candidate: OpportunityCandidate,
  now: Date = new Date(),
): EvidenceAssessment {
  const primary = candidate.evidence.filter((item) => PRIMARY_TIERS.has(item.tier));
  const independent = candidate.evidence.filter((item) => item.tier === "independent_secondary");
  const hasContradiction = candidate.evidence.some((item) => (item.contradicts?.length ?? 0) > 0);
  const hasMoneyClaimEvidence = candidate.evidence.some(
    (item) => PRIMARY_TIERS.has(item.tier) && isMoneyEvidence(item),
  );

  const freshnessValues = candidate.evidence
    .map((item) => parseTime(item.observedAt))
    .filter((value): value is number => value !== null);
  const newestObservation = freshnessValues.length > 0 ? Math.max(...freshnessValues) : null;
  const stale = newestObservation === null || now.getTime() - newestObservation > 45 * 24 * 60 * 60 * 1000;

  const uniqueSources = new Set(candidate.evidence.map((item) => item.sourceId));
  const rawWeight = candidate.evidence.reduce((sum, item) => sum + TIER_WEIGHT[item.tier], 0);
  const sourceDiversityBonus = Math.min(0.15, Math.max(0, uniqueSources.size - 1) * 0.05);
  const directBonus = candidate.evidence.some((item) => item.directEvidence) ? 0.1 : 0;
  const contradictionPenalty = hasContradiction ? 0.15 : 0;
  const stalePenalty = stale ? 0.15 : 0;
  const normalizedBase = candidate.evidence.length === 0 ? 0 : Math.min(1, rawWeight / 2);
  const evidenceScore = Math.round(
    Math.max(0, Math.min(1, normalizedBase + sourceDiversityBonus + directBonus - contradictionPenalty - stalePenalty)) *
      100,
  );

  const missingClaims: string[] = [];
  if (candidate.evidence.length === 0) missingClaims.push("No evidence attached.");
  if (primary.length === 0) missingClaims.push("No primary or official evidence attached.");
  if (isMoneyBearing(candidate) && !hasMoneyClaimEvidence) {
    missingClaims.push("Money, credit, pricing, or payout assumptions lack primary evidence.");
  }
  if (candidate.involvesDataSharing && candidate.rightsStatus !== "cleared") {
    missingClaims.push("Data-sharing rights are not cleared.");
  }
  if (candidate.involvesModelTraining && candidate.rightsStatus !== "cleared") {
    missingClaims.push("Model-training rights are not cleared.");
  }

  return {
    evidenceScore,
    primaryEvidenceCount: primary.length,
    independentEvidenceCount: independent.length,
    hasMoneyClaimEvidence,
    hasContradiction,
    stale,
    missingClaims,
  };
}
