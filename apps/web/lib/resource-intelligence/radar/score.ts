/**
 * R&D Radar — advisory scoring.
 *
 * Eleven dimensions, each 0–5, computed deterministically from the
 * observation alone (no network, no clock, no randomness). The total is
 * ADVISORY: policy.ts caps outrank any number here, and `blockedOverride`
 * makes that explicit in the payload so no UI can honestly rank a blocked
 * item by its score.
 */

import type { RadarScore, RepoRadarObservation } from "./types";
import { isLicenseVerified } from "./policy";

const clamp = (n: number): number => Math.max(0, Math.min(5, Math.round(n)));

/** Category keywords → how directly the capability maps to GSE's planes. */
const FIT_KEYWORDS: ReadonlyArray<readonly [RegExp, number]> = [
  [/skill|agent (skills|development|memory)|methodology/i, 5],
  [/model routing|gateway|security|sandbox/i, 5],
  [/knowledge graph|codebase/i, 4],
  [/review|multi-agent|research/i, 4],
  [/design system|diagram|document generation/i, 3],
  [/voice|transcription|video|avatar|multimodal/i, 3],
  [/gui agent|computer control|browser/i, 2],
  [/runtime|language|containers/i, 1],
];

function strategicFit(o: RepoRadarObservation): number {
  for (const [re, score] of FIT_KEYWORDS) if (re.test(o.category)) return score;
  return 1;
}

function momentum(o: RepoRadarObservation): number {
  if (o.trendGain === null) return 0;
  // ln scale: 100→2, 1k→3, 8k→4, 20k+→5 (deterministic thresholds).
  if (o.trendGain >= 20000) return 5;
  if (o.trendGain >= 8000) return 4;
  if (o.trendGain >= 1000) return 3;
  if (o.trendGain >= 100) return 2;
  return 1;
}

function maturity(o: RepoRadarObservation): number {
  if (o.totalStars === null) return 0;
  if (o.totalStars >= 100000) return 5;
  if (o.totalStars >= 30000) return 4;
  if (o.totalStars >= 10000) return 3;
  if (o.totalStars >= 3000) return 2;
  return 1;
}

function security(o: RepoRadarObservation): number {
  switch (o.risk) {
    case "LOW": return 5;
    case "MEDIUM": return 3;
    case "HIGH": return 1;
    default: return 0; // CRITICAL / BLOCKED
  }
}

function licenseClarity(o: RepoRadarObservation): number {
  if (!isLicenseVerified(o.license)) return 0;
  const l = o.license!.toUpperCase();
  if (l.includes("MIT") || l.includes("APACHE")) return 5;
  if (l.includes("AGPL") || l.includes("GPL")) return 1; // verified but restrictive
  return 3;
}

function rightsPrivacyFit(o: RepoRadarObservation): number {
  const text = `${o.category} ${o.reason}`.toLowerCase();
  if (/pirac|torrent|leak|iptv|stream index/.test(text)) return 0;
  if (/biometric|voice clon|likeness|consent|scraping|unofficial access/.test(text)) return 1;
  if (/rights|copyright|footage|paywall/.test(text)) return 2;
  return 4;
}

function integrationCost(o: RepoRadarObservation): number {
  // Higher score = cheaper to adopt the PATTERN (never the dependency).
  switch (o.normalizedPosture) {
    case "ADOPT_PATTERNS": return 5;
    case "REFERENCE_ONLY": return 4;
    case "OBSERVE": return 3;
    case "PROTOTYPE": return 2;
    case "PILOT": return 2;
    default: return 0;
  }
}

function reversibility(o: RepoRadarObservation): number {
  // Pattern mining is fully reversible; runtime/infrastructure adoption is not.
  if (/runtime|containers|language/i.test(o.category)) return 1;
  if (o.normalizedPosture === "ADOPT_PATTERNS" || o.normalizedPosture === "REFERENCE_ONLY") return 5;
  if (o.normalizedPosture === "PROTOTYPE" || o.normalizedPosture === "PILOT") return 3;
  return 4;
}

function evidenceQuality(o: RepoRadarObservation): number {
  let score = 0;
  if (o.sourceKind === "GITHUB_TRENDING" || o.sourceKind === "PRIMARY_REPO") score += 2;
  if (o.totalStars !== null) score += 1;
  if (o.trendGain !== null) score += 1;
  if (isLicenseVerified(o.license)) score += 1;
  return clamp(score);
}

function novelty(o: RepoRadarObservation): number {
  // Targeted/monthly discoveries tend to be new capability classes; daily
  // trending is often commoditizing. Deterministic proxy, advisory only.
  if (o.window === "targeted") return 4;
  if (o.window === "monthly") return 4;
  if (o.window === "weekly") return 3;
  return 2;
}

function maintenance(o: RepoRadarObservation): number {
  // Without commit-history evidence, maintenance is unknown: mid unless the
  // project is huge (ecosystem-backed) or a screenshot-only concept.
  if (o.sourceKind === "OWNER_SCREENSHOT") return 0;
  if (o.totalStars !== null && o.totalStars >= 30000) return 4;
  return 2;
}

export function scoreObservation(o: RepoRadarObservation): RadarScore {
  const dims = {
    strategicFit: clamp(strategicFit(o)),
    novelty: clamp(novelty(o)),
    momentum: clamp(momentum(o)),
    maturity: clamp(maturity(o)),
    maintenance: clamp(maintenance(o)),
    security: clamp(security(o)),
    licenseClarity: clamp(licenseClarity(o)),
    rightsPrivacyFit: clamp(rightsPrivacyFit(o)),
    integrationCost: clamp(integrationCost(o)),
    reversibility: clamp(reversibility(o)),
    evidenceQuality: clamp(evidenceQuality(o)),
  };
  const total = Object.values(dims).reduce((s, v) => s + v, 0);
  return {
    ...dims,
    total,
    blockedOverride: o.risk === "BLOCKED" || o.risk === "CRITICAL",
  };
}
