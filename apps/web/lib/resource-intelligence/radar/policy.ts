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

/**
 * Positive allowlist of accepted license identifiers (SPDX-ish, uppercased).
 * Codex P2 on #76: a negative-list would let non-evidence values like
 * "NOASSERTION", "TBD", or "Proprietary" count as verified. Anything not on
 * this list — including "VERIFY", "CUSTOM", null — is unverified until the
 * importer of a future snapshot carries a confirmed identifier.
 */
const VERIFIED_LICENSES: ReadonlySet<string> = new Set([
  "MIT",
  "APACHE-2.0",
  "BSD-2-CLAUSE",
  "BSD-3-CLAUSE",
  "ISC",
  "MPL-2.0",
  "GPL-2.0",
  "GPL-3.0",
  "LGPL-2.1",
  "LGPL-3.0",
  "AGPL-3.0",
  "AGPL-3.0-OR-COMMERCIAL",
  "CC0",
  "CC0-1.0",
  "UNLICENSE",
]);

/** True only for identifiers on the positive allowlist. */
export function isLicenseVerified(license: string | null): boolean {
  if (license === null) return false;
  return VERIFIED_LICENSES.has(license.trim().toUpperCase());
}

const KNOWN_RISKS: readonly RadarRisk[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "BLOCKED"];
const KNOWN_POSTURES: readonly RadarPosture[] = [
  "OBSERVE", "REFERENCE_ONLY", "ADOPT_PATTERNS", "PROTOTYPE",
  "PILOT", "OWNER_REVIEW", "QUARANTINE", "REJECT",
];

/**
 * The one function every consumer must go through. Applies the caps in
 * order; the result is what the rest of the system treats as truth.
 * FAIL-CLOSED on unknown risk AND posture labels (G-3): a value outside the
 * closed sets (e.g. a hand-edited fixture's "BLOCKED_RIGHTS") quarantines
 * rather than slipping past the string-exact caps — an unknown posture would
 * otherwise index POSTURE_TO_DISPOSITION to undefined and fall through open.
 */
export function effectiveDisposition(
  posture: RadarPosture,
  risk: RadarRisk,
  license: string | null
): ResourceDisposition {
  if (!KNOWN_RISKS.includes(risk)) return "quarantine";
  if (!KNOWN_POSTURES.includes(posture)) return "quarantine";
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

/** Unknown labels rank MOST restrictive (fail-closed): they win the merge and
 *  then quarantine at effectiveDisposition's closed-set guard. */
function postureRank(p: RadarPosture): number {
  return POSTURE_RESTRICTIVENESS[p] ?? Number.POSITIVE_INFINITY;
}

export function mostRestrictivePosture(postures: readonly RadarPosture[]): RadarPosture {
  return postures.reduce((worst, p) => (postureRank(p) > postureRank(worst) ? p : worst));
}

const RISK_ORDER: Readonly<Record<RadarRisk, number>> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
  BLOCKED: 4,
};

function riskRank(r: RadarRisk): number {
  return RISK_ORDER[r] ?? Number.POSITIVE_INFINITY; // unknown = worst (fail-closed)
}

export function highestRisk(risks: readonly RadarRisk[]): RadarRisk {
  return risks.reduce((worst, r) => (riskRank(r) > riskRank(worst) ? r : worst));
}

/** Days after which a snapshot observation is stale (recommendations expire). */
export const RADAR_FRESHNESS_DAYS = 45;
