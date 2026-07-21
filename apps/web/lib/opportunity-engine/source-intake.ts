import intakeData from "../../../../../data/nova/user-supplied-source-intake.json";

export type UserSourceIntakeKind = "instagram" | "hubspot_tracking_redirect";

export interface UserSourceReviewItem {
  readonly id: string;
  readonly sourceLine: number;
  readonly kind: UserSourceIntakeKind;
  readonly locator: string;
  readonly evidenceTier: "DISCOVERY_ONLY";
  readonly disposition: "OWNER_REVIEW";
  readonly claimsExtracted: 0;
  readonly externalActionsAllowed: false;
  readonly nextAction: string;
}

export interface UserSourceIntakeSummary {
  readonly total: number;
  readonly instagram: number;
  readonly hubspotTrackingRedirects: number;
  readonly ownerReviewRequired: number;
  readonly verifiedClaims: number;
  readonly rawTrackingUrlsRetained: boolean;
}

const SHA256_HEX = /^[a-f0-9]{64}$/;

export function validateUserSuppliedSourceIntake(): readonly string[] {
  const errors: string[] = [];
  const seenLines = new Set<number>();
  const seenHashes = new Set<string>();

  if (intakeData.schemaVersion !== 1) errors.push("Unsupported source-intake schema version.");
  if (intakeData.policy.disposition !== "OWNER_REVIEW") {
    errors.push("User-supplied discovery must default to OWNER_REVIEW.");
  }
  if (intakeData.policy.evidenceTier !== "DISCOVERY_ONLY") {
    errors.push("User-supplied discovery must remain DISCOVERY_ONLY.");
  }
  if (intakeData.policy.claimsExtracted !== 0 || intakeData.summary.verifiedClaims !== 0) {
    errors.push("Unreviewed links must not create verified claims.");
  }

  for (const item of intakeData.instagram) {
    if (seenLines.has(item.line)) errors.push(`Duplicate source line ${item.line}.`);
    seenLines.add(item.line);
    if (!SHA256_HEX.test(item.sha256)) errors.push(`Invalid SHA-256 for Instagram line ${item.line}.`);
    if (seenHashes.has(item.sha256)) errors.push(`Duplicate source hash at line ${item.line}.`);
    seenHashes.add(item.sha256);

    const url = new URL(item.canonicalUrl);
    if (url.protocol !== "https:" || url.hostname !== "www.instagram.com") {
      errors.push(`Instagram line ${item.line} is not a canonical HTTPS Instagram URL.`);
    }
    if (url.search || url.hash) {
      errors.push(`Instagram line ${item.line} retains a tracking query or fragment.`);
    }
  }

  for (const item of intakeData.hubspotTrackingRedirects.items) {
    if (seenLines.has(item.line)) errors.push(`Duplicate source line ${item.line}.`);
    seenLines.add(item.line);
    if (!SHA256_HEX.test(item.sha256)) errors.push(`Invalid SHA-256 for redirect line ${item.line}.`);
    if (seenHashes.has(item.sha256)) errors.push(`Duplicate source hash at line ${item.line}.`);
    seenHashes.add(item.sha256);
    if (!Number.isInteger(item.length) || item.length <= 0) {
      errors.push(`Redirect line ${item.line} has an invalid captured length.`);
    }
  }

  const observedTotal = intakeData.instagram.length + intakeData.hubspotTrackingRedirects.items.length;
  if (observedTotal !== intakeData.source.itemCount) {
    errors.push(`Expected ${intakeData.source.itemCount} items, observed ${observedTotal}.`);
  }
  if (intakeData.summary.ownerReviewRequired !== observedTotal) {
    errors.push("Every unverified user-supplied source must require owner review.");
  }
  if (intakeData.hubspotTrackingRedirects.rawUrlsRetained !== false) {
    errors.push("Recipient-specific tracking URLs must not be retained in the repository.");
  }

  return errors;
}

export function summarizeUserSuppliedSourceIntake(): UserSourceIntakeSummary {
  return {
    total: intakeData.source.itemCount,
    instagram: intakeData.instagram.length,
    hubspotTrackingRedirects: intakeData.hubspotTrackingRedirects.items.length,
    ownerReviewRequired: intakeData.summary.ownerReviewRequired,
    verifiedClaims: intakeData.summary.verifiedClaims,
    rawTrackingUrlsRetained: intakeData.hubspotTrackingRedirects.rawUrlsRetained,
  };
}

export function buildUserSourceReviewQueue(): readonly UserSourceReviewItem[] {
  const instagram: UserSourceReviewItem[] = intakeData.instagram.map((item) => ({
    id: `instagram:${item.locator}`,
    sourceLine: item.line,
    kind: "instagram",
    locator: item.canonicalUrl,
    evidenceTier: "DISCOVERY_ONLY",
    disposition: "OWNER_REVIEW",
    claimsExtracted: 0,
    externalActionsAllowed: false,
    nextAction: "Resolve the topic and creator, then locate primary evidence for every material claim.",
  }));

  const redirects: UserSourceReviewItem[] = intakeData.hubspotTrackingRedirects.items.map((item) => ({
    id: `hubspot:${item.sha256.slice(0, 12)}`,
    sourceLine: item.line,
    kind: "hubspot_tracking_redirect",
    locator: `${intakeData.hubspotTrackingRedirects.domain}#sha256:${item.sha256}`,
    evidenceTier: "DISCOVERY_ONLY",
    disposition: "OWNER_REVIEW",
    claimsExtracted: 0,
    externalActionsAllowed: false,
    nextAction: "Resolve privately without credentials, discard the tracking token, and record only the canonical destination.",
  }));

  return [...instagram, ...redirects].sort((left, right) => left.sourceLine - right.sourceLine);
}
