#!/usr/bin/env node
/**
 * Partner-offer compliance guardrail.
 *
 * Runs local fixtures through the same fail-closed policy expected from the
 * revenue library: partner approval and offer approval are separate, high-risk
 * sportsbook/DFS offers require terms/disclosure/responsible-gaming/age/state
 * metadata, and expired or unapproved records cannot pass.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const FIXTURE_PATH = resolve(ROOT, "scripts/guardrails/fixtures/partner-offer-compliance.json");
const HIGH_RISK_CATEGORIES = new Set(["sportsbook", "dfs"]);
const VALID_SURFACES = new Set([
  "media_kit",
  "partners_page",
  "newsletter",
  "youtube",
  "short_form",
  "podcast",
  "blog",
  "api_docs",
  "internal_only",
]);

function hasExpired(expiresAt, now) {
  if (typeof expiresAt !== "string" || expiresAt.trim().length === 0) return false;
  const timestamp = Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= now.getTime();
}

function isHighRiskOffer(offer) {
  return (
    offer.riskClass === "high" ||
    HIGH_RISK_CATEGORIES.has(offer.category) ||
    offer.containsDepositLanguage === true ||
    offer.containsContestOrPrizeLanguage === true
  );
}

function hasDisclosure(text) {
  if (typeof text !== "string") return false;
  const normalized = text.toLowerCase();
  return (
    normalized.includes("sponsor") ||
    normalized.includes("affiliate") ||
    normalized.includes("commission") ||
    normalized.includes("paid")
  );
}

function normalizeState(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : null;
}

function evaluate({ partner, offer, surface, userState, now }) {
  const blockers = [];
  const highRisk = isHighRiskOffer(offer);

  if (partner.id !== offer.partnerId) blockers.push("PARTNER_MISMATCH");
  if (partner.approvalStatus !== "approved") blockers.push("PARTNER_NOT_APPROVED");
  if (hasExpired(partner.expiresAt, now)) blockers.push("PARTNER_EXPIRED");
  if (offer.approvalStatus !== "approved") blockers.push("OFFER_NOT_APPROVED");
  if (hasExpired(offer.expiresAt, now)) blockers.push("OFFER_EXPIRED");
  if (!VALID_SURFACES.has(surface) || !partner.allowedSurfaces?.includes(surface) || !offer.allowedSurfaces?.includes(surface)) {
    blockers.push("SURFACE_NOT_ALLOWED");
  }
  if ((partner.disclosureRequired || offer !== null) && !hasDisclosure(offer.disclosureText)) {
    blockers.push("MISSING_DISCLOSURE");
  }
  if (highRisk && typeof offer.termsUrl !== "string") blockers.push("MISSING_TERMS_URL");
  if (highRisk && (typeof offer.responsibleGamingText !== "string" || offer.responsibleGamingText.trim().length < 12)) {
    blockers.push("MISSING_RESPONSIBLE_GAMING");
  }
  if (highRisk && (!Number.isFinite(offer.minimumAge) || offer.minimumAge < 21)) {
    blockers.push("MISSING_AGE_POLICY");
  }

  if (highRisk) {
    const state = normalizeState(userState);
    if (state === null) {
      blockers.push("UNKNOWN_STATE");
    } else if (offer.restrictedStates?.includes(state)) {
      blockers.push("STATE_RESTRICTED");
    } else if (!Array.isArray(offer.eligibleStates) || offer.eligibleStates.length === 0) {
      blockers.push("STATE_NOT_ELIGIBLE");
    } else if (!offer.eligibleStates.includes(state)) {
      blockers.push("STATE_NOT_ELIGIBLE");
    }
  }

  return { blockers: [...new Set(blockers)], ok: blockers.length === 0 };
}

function formatCase(result) {
  const blockers = result.blockers.length > 0 ? result.blockers.join(",") : "none";
  return `${result.id}: expected=${result.expectedOk ? "PASS" : "BLOCK"} actual=${result.ok ? "PASS" : "BLOCK"} blockers=${blockers}`;
}

function containsAll(actual, expected) {
  return expected.every((blocker) => actual.includes(blocker));
}

async function main() {
  const fixture = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  const now = new Date(fixture.now);
  const partners = new Map(fixture.partners.map((partner) => [partner.id, partner]));
  const offers = new Map(fixture.offers.map((offer) => [offer.id, offer]));
  const failures = [];
  const results = [];

  for (const testCase of fixture.cases) {
    const partner = partners.get(testCase.partnerId);
    const offer = offers.get(testCase.offerId);
    if (partner === undefined || offer === undefined) {
      failures.push(`${testCase.id}: missing partner or offer fixture`);
      continue;
    }
    const decision = evaluate({
      now,
      offer,
      partner,
      surface: testCase.surface,
      userState: testCase.userState,
    });
    const result = { ...decision, expectedOk: testCase.expectedOk, id: testCase.id };
    results.push(result);

    if (decision.ok !== testCase.expectedOk) failures.push(formatCase(result));
    if (!containsAll(decision.blockers, testCase.expectedBlockers ?? [])) {
      failures.push(`${testCase.id}: missing expected blockers ${(testCase.expectedBlockers ?? []).join(",")}; actual=${decision.blockers.join(",")}`);
    }
  }

  if (failures.length > 0) {
    console.error(`[partner-offer-compliance-scan] FAIL - ${failures.length} fixture failure(s):`);
    failures.forEach((failure) => console.error(`  ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log(`[partner-offer-compliance-scan] OK - ${results.length} fixture case(s) passed; high-risk offers fail closed.`);
}

main().catch((error) => {
  console.error("[partner-offer-compliance-scan] unexpected error:", error);
  process.exit(2);
});
