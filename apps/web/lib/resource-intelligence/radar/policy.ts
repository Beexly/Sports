/**
 * R&D Radar — adoption policy: the rules that outrank every score.
 *
 * Maps radar postures onto the EXISTING resource-intelligence dispositions
 * (no parallel risk vocabulary) and applies hard caps:
 *
 *   1. BLOCKED risk        → quarantine. Terminal. No score can undo it.
 *   2. CRITICAL risk       → owner_review at best.
 *   3. Unverified license  → never implementable (prototype requires a
 *      verified license; reading/reference does not).
 *   4. Nothing the radar emits is ever `approved_direct`: the radar cannot
 *      approve installation — only the owner can, via an adoption dossier.
 */

import type { ResourceDisposition } from "../types";
import { IMPLEMENTABLE_DISPOSITIONS } from "../types";
import type { RadarPosture, RadarRisk } from "./types";

/** Feature flag — default OFF. Server-side only; auth is still required. */
export function isRadarEnabled(): boolean {
  return process.env["RESOURCE_RADAR_V2_ENABLED"] === "true";
}

/** Base mapping: posture → existing disposition (before caps). */
const POSTURE_TO_DISPOSITION: Readonly<Record<RadarPosture, ResourceDisposition>> = {
  OBSERVE: "roadmap",
  REFERENCE_ONLY: "approved_internal_reference",
  ADOPT_PATTERNS: "approved_internal_reference",
  PROTOTYPE: "prototype",
  PILOT: "prototype",
  OWNER_REVIEW: "owner_review",
  QUARANTINE: "quarantine",
  REJECT: "rejected_noise",
};

/** License strings that count as verified. "VERIFY"/null/"N/A" do not. */
export function isLicenseVerified(license: string | null): boolean {
  if (license === null) return false;
  const l = license.trim().toUpperCase();
  return l !== "" && l !== "VERIFY" && l !== "N/A" && l !== "UNKNOWN" && l !== "CUSTOM";
}

/**
 * The one function every consumer must go through. Applies the caps in
 * order; the result is what the rest of the system treats as truth.
 */
export function effectiveDisposition(
  posture: RadarPosture,
  risk: RadarRisk,
  license: string | null
): ResourceDisposition {
  if (risk === "BLOCKED") return "quarantine";
  const base = POSTURE_TO_DISPOSITION[posture];
  if (base === "quarantine" || base === "rejected_noise") return base;
  if (risk === "CRITICAL") return "owner_review";
  if (!isLicenseVerified(license) && (IMPLEMENTABLE_DISPOSITIONS as readonly string[]).includes(base)) {
    return "owner_review";
  }
  return base;
}

/** Reasons a dossier is not ready today — always at least one entry. */
export function whyNotReady(
  posture: RadarPosture,
  risk: RadarRisk,
  license: string | null,
  sourceKind: string
): string[] {
  const reasons: string[] = [];
  if (risk === "BLOCKED") reasons.push("Hard-blocked: security/rights/terms condition with no adoption path.");
  if (risk === "CRITICAL") reasons.push("Critical risk: owner review required before any use.");
  if (!isLicenseVerified(license)) reasons.push("License unverified: confirm from the primary source before any adoption step.");
  if (sourceKind === "OWNER_SCREENSHOT") reasons.push("Provenance unverified: identified from a screenshot, not a primary source.");
  if (posture === "OBSERVE") reasons.push("Watch-only: momentum signal, no current fit gap.");
  if (posture === "REFERENCE_ONLY" || posture === "ADOPT_PATTERNS") {
    reasons.push("Patterns only: mine the design; the project itself is not a dependency candidate.");
  }
  if (posture === "PROTOTYPE" || posture === "PILOT") {
    reasons.push("Requires an approved adoption dossier, scan, and sandboxed experiment before any dependency decision (owner gate).");
  }
  if (reasons.length === 0) reasons.push("No adoption decision exists: the radar observes; the owner decides.");
  return reasons;
}

/** Posture restrictiveness for cross-window merging (higher = wins). */
const POSTURE_RESTRICTIVENESS: Readonly<Record<RadarPosture, number>> = {
  QUARANTINE: 7,
  REJECT: 6,
  OWNER_REVIEW: 5,
  OBSERVE: 4,
  REFERENCE_ONLY: 3,
  ADOPT_PATTERNS: 2,
  PILOT: 1,
  PROTOTYPE: 0,
};

export function mostRestrictivePosture(postures: readonly RadarPosture[]): RadarPosture {
  return postures.reduce((worst, p) =>
    POSTURE_RESTRICTIVENESS[p] > POSTURE_RESTRICTIVENESS[worst] ? p : worst
  );
}

const RISK_ORDER: Readonly<Record<RadarRisk, number>> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
  BLOCKED: 4,
};

export function highestRisk(risks: readonly RadarRisk[]): RadarRisk {
  return risks.reduce((worst, r) => (RISK_ORDER[r] > RISK_ORDER[worst] ? r : worst));
}

/** Days after which a snapshot observation is stale (recommendations expire). */
export const RADAR_FRESHNESS_DAYS = 45;
