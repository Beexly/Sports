/**
 * Promotions — Compliance Guards
 *
 * Single source of truth for "is this promotion safe to render publicly?"
 *
 * Every check returns a structured result so callers can:
 *   - show the right honest empty-state on the public surface
 *   - feed cockpit review tasks the exact missing piece
 *   - assert in tests that we never paper over a missing requirement
 *
 * Non-negotiables (matches CLAUDE.md and the Phase-4 prompt):
 *   - no public render without `disclosureText`
 *   - no public render without `termsUrl`
 *   - no public render of a promotion past `expiresAt`
 *   - no public render of a promotion with status BLOCKED/PAUSED/EXPIRED/ARCHIVED
 *   - no public render unless complianceStatus === APPROVED
 *   - no "available in your state" without explicit eligibleStates evidence
 *   - banned hype language must not appear in headline/offerSummary
 */

import type {
  Promotion,
  PromotionStatus,
  PromotionComplianceStatus,
} from "@prisma/client";
import {
  assertPromoPublishAllowed,
  OperatorRegistryError,
  summarizeRegistry,
} from "@/lib/cockpit/operator-registry";
import { scanForBannedPhrases } from "../trust-claims";

export type PromotionBlockerCode =
  | "MISSING_DISCLOSURE"
  | "MISSING_RG_TEXT"
  | "MISSING_TERMS_URL"
  | "SUSPICIOUS_TERMS_URL"
  | "EXPIRED"
  | "STATUS_NOT_ACTIVE"
  | "COMPLIANCE_NOT_APPROVED"
  | "BANNED_HYPE_LANGUAGE"
  | "NO_ELIGIBLE_STATES"
  | "RESTRICTED_IN_STATE"
  | "OPERATOR_NOT_APPROVED";

/**
 * A terms URL is suspicious when it is not a real, public https(s) link:
 * a non-web scheme (javascript:/data:/file:), an unparseable value, or a
 * placeholder/test host (example.com, localhost, *.test/.invalid/.example).
 * These must never reach a public affiliate surface.
 */
const SUSPICIOUS_HOSTS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
]);
const SUSPICIOUS_TLDS = [".test", ".invalid", ".example", ".localhost", ".local"];

export function isSuspiciousUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false; // emptiness is handled by MISSING_TERMS_URL
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return true; // unparseable → suspicious
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  const host = url.hostname.toLowerCase();
  if (SUSPICIOUS_HOSTS.has(host)) return true;
  if (host === "localhost" || SUSPICIOUS_TLDS.some((tld) => host.endsWith(tld))) return true;
  return false;
}

export interface PromotionBlocker {
  readonly code: PromotionBlockerCode;
  readonly message: string;
  /** True when an operator review can resolve this; false for hard regulatory failures. */
  readonly reviewable: boolean;
}

export interface PromotionPublishVerdict {
  readonly publishable: boolean;
  readonly blockers: readonly PromotionBlocker[];
}

/**
 * Parse `eligibleStates` / `restrictedStates` (Json column) into a typed array.
 * Returns [] if the value is missing or malformed — we never default to
 * "available everywhere" silently.
 */
export function parseStateList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && /^[A-Z]{2}$/.test(item)) {
      out.push(item);
    }
  }
  return out;
}

/**
 * Compliance gate for showing a promotion on a public surface.
 * Pass the optional `state` (US state code) for state-specific filtering.
 */
export function evaluatePromotionForPublish(
  promo: Promotion,
  options: { now?: Date; state?: string | null } = {}
): PromotionPublishVerdict {
  const blockers: PromotionBlocker[] = [];
  const now = options.now ?? new Date();

  if (!promo.disclosureText || promo.disclosureText.trim().length === 0) {
    blockers.push({
      code: "MISSING_DISCLOSURE",
      message:
        "Promotion is missing affiliate disclosure copy. Public rendering requires explicit disclosure.",
      reviewable: true,
    });
  }

  if (
    !promo.responsibleGamingText ||
    promo.responsibleGamingText.trim().length === 0
  ) {
    blockers.push({
      code: "MISSING_RG_TEXT",
      message:
        "Promotion is missing responsible-gaming text. Public rendering requires a responsible-gaming note.",
      reviewable: true,
    });
  }

  if (!promo.termsUrl || promo.termsUrl.trim().length === 0) {
    blockers.push({
      code: "MISSING_TERMS_URL",
      message: "Promotion is missing the operator's terms-and-conditions URL.",
      reviewable: true,
    });
  } else if (isSuspiciousUrl(promo.termsUrl)) {
    blockers.push({
      code: "SUSPICIOUS_TERMS_URL",
      message:
        "Promotion terms URL is not a valid public https link (placeholder/test host or non-web scheme). It must point at the operator's real terms page.",
      reviewable: true,
    });
  }

  if (promo.expiresAt && promo.expiresAt.getTime() <= now.getTime()) {
    blockers.push({
      code: "EXPIRED",
      message: `Promotion expired at ${promo.expiresAt.toISOString()}.`,
      reviewable: false,
    });
  }

  if (promo.status !== ("ACTIVE" satisfies PromotionStatus)) {
    blockers.push({
      code: "STATUS_NOT_ACTIVE",
      message: `Promotion status is ${promo.status}; only ACTIVE promotions render publicly.`,
      reviewable: promo.status !== "BLOCKED",
    });
  }

  if (
    promo.complianceStatus !== ("APPROVED" satisfies PromotionComplianceStatus)
  ) {
    blockers.push({
      code: "COMPLIANCE_NOT_APPROVED",
      message: `Compliance status is ${promo.complianceStatus}; only APPROVED promotions render publicly.`,
      reviewable: promo.complianceStatus !== "BLOCKED",
    });
  }

  // Scan headline + summary for banned hype language using the trust-claim registry.
  const combinedCopy = `${promo.headline}\n${promo.offerSummary}`;
  const hypeHits = scanForBannedPhrases(combinedCopy);
  if (hypeHits.length > 0) {
    blockers.push({
      code: "BANNED_HYPE_LANGUAGE",
      message: `Promotion copy contains banned hype phrases: ${hypeHits
        .map((h) => h.claimId)
        .join(", ")}.`,
      reviewable: true,
    });
  }

  const eligible = parseStateList(promo.eligibleStates);
  const restricted = parseStateList(promo.restrictedStates);

  if (eligible.length === 0) {
    blockers.push({
      code: "NO_ELIGIBLE_STATES",
      message:
        "Promotion has no eligible-states allow-list. State availability must be explicit before public render.",
      reviewable: true,
    });
  }

  if (options.state) {
    const normalized = options.state.toUpperCase();
    if (restricted.includes(normalized)) {
      blockers.push({
        code: "RESTRICTED_IN_STATE",
        message: `Promotion is restricted in ${normalized}.`,
        reviewable: false,
      });
    }
    // If eligibleStates is non-empty, the requested state must be in it.
    if (eligible.length > 0 && !eligible.includes(normalized)) {
      blockers.push({
        code: "RESTRICTED_IN_STATE",
        message: `Promotion is not approved for display in ${normalized}.`,
        reviewable: false,
      });
    }
  }

  try {
    assertPromoPublishAllowed(promo.sportsbookKey);
    const summary = summarizeRegistry();
    if (summary.publishablePartners === 0) {
      blockers.push({
        code: "OPERATOR_NOT_APPROVED",
        message:
          "Operator registry has no approved publishing partners. Public promo rendering stays disabled until an APPROVED_PARTNER row is added by code review.",
        reviewable: false,
      });
    }
  } catch (err) {
    if (err instanceof OperatorRegistryError) {
      blockers.push({
        code: "OPERATOR_NOT_APPROVED",
        message: err.message,
        reviewable: true,
      });
    } else {
      throw err;
    }
  }

  return {
    publishable: blockers.length === 0,
    blockers: Object.freeze(blockers),
  };
}

/** True when the promo is safe to render on the public marketplace. */
export function isPromotionPublishable(
  promo: Promotion,
  options: { now?: Date; state?: string | null } = {}
): boolean {
  return evaluatePromotionForPublish(promo, options).publishable;
}
