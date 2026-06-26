/**
 * GALILEO LENSES — instruments, not dashboards.
 *
 * Each lens is a pure, read-only projection over a set of compiled ClaimObjects that reveals one
 * invisible structure: which source saw it first, where each market is in its life, how fragile a trend
 * is, whether a prediction's process was sound, whether a bonus is compliant, whether web evidence is
 * promotable, what GSE was allowed to say, and what each claim becomes after the result. The strongest
 * product claim is not "better predictions" — it is "GSE shows what the data is allowed to mean."
 *
 * Pure + deterministic. Lenses never mutate, never recompute the compiler — they read the ClaimObject.
 */

import { rankOf } from "../decision-state-stat-contract.js";
import type { ClaimObject } from "./claim-object.js";

export interface LensRow {
  readonly subject: string;
  readonly headline: string;
  readonly detail: string;
  readonly emphasis: "NEUTRAL" | "CAUTION" | "BLOCK";
}

export interface Lens {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly rows: readonly LensRow[];
}

const byType = (claims: readonly ClaimObject[], t: ClaimObject["objectType"]) => claims.filter((c) => c.objectType === t);

/** SOURCE RACE — which source saw it first, and how independent the lineage is. */
export function sourceRaceLens(claims: readonly ClaimObject[]): Lens {
  const rows = [...claims]
    .sort((a, b) => b.sourceLineage.independentOriginCount - a.sourceLineage.independentOriginCount || b.sourceLineage.sourceConfidence - a.sourceLineage.sourceConfidence)
    .slice(0, 12)
    .map<LensRow>((c) => ({
      subject: c.subject,
      headline: `${c.sourceLineage.providerName ?? c.sourceLineage.sourceKind} · ${c.sourceLineage.independentOriginCount} origin(s)`,
      detail: `confidence ${c.sourceLineage.sourceConfidence} · ${c.sourceLineage.originRefs.length === 0 ? "NO lineage" : c.sourceLineage.originRefs.join(", ")}`,
      emphasis: c.sourceLineage.originRefs.length === 0 ? "BLOCK" : c.sourceLineage.independentOriginCount < 2 ? "CAUTION" : "NEUTRAL",
    }));
  return { key: "source-race", title: "Source Race", description: "Who saw it first, and how independent the lineage is.", rows };
}

/** MARKET LIFECYCLE — where each market is in its life; stale/caught-up suppress action. */
export function marketLifecycleLens(claims: readonly ClaimObject[]): Lens {
  const rows = byType(claims, "MARKET_STATE").map<LensRow>((c) => ({
    subject: c.subject,
    headline: c.semantic.plainText,
    detail: c.decision.decisionUse,
    emphasis: c.decision.suppressesAction ? "BLOCK" : "NEUTRAL",
  }));
  return { key: "market-lifecycle", title: "Market Lifecycle", description: "Every market has a life; birth alone is never an action.", rows };
}

/** TREND FRAGILITY — small samples and correlated trends are not independent evidence. */
export function trendFragilityLens(claims: readonly ClaimObject[]): Lens {
  const rows = byType(claims, "TREND")
    .sort((a, b) => (b.semantic.sampleFragility ?? 0) - (a.semantic.sampleFragility ?? 0))
    .map<LensRow>((c) => ({
      subject: c.subject,
      headline: `fragility ${c.semantic.sampleFragility ?? "—"}`,
      detail: c.risk.riskFlags.join(" · ") || c.risk.weakness,
      emphasis: c.risk.riskFlags.some((f) => /correlated/.test(f)) ? "CAUTION" : "NEUTRAL",
    }));
  return { key: "trend-fragility", title: "Trend Fragility", description: "How fragile a pattern is, and whether it is double-counting.", rows };
}

/** PREDICTION TRIAL — process graded apart from outcome; an over-strong claim is flagged. */
export function predictionTrialLens(claims: readonly ClaimObject[]): Lens {
  const rows = byType(claims, "PREDICTION").map<LensRow>((c) => ({
    subject: c.subject,
    headline: c.risk.riskFlags.find((f) => /process/.test(f)) ?? "on trial",
    detail: c.explain.weaknesses,
    emphasis: c.risk.riskFlags.some((f) => /authority too strong/.test(f)) ? "BLOCK" : "NEUTRAL",
  }));
  return { key: "prediction-trial", title: "Prediction Trial", description: "Was the call sound, regardless of whether it won?", rows };
}

/** BONUS INTEGRITY — compliance-gated; a blocked offer never displays. */
export function bonusIntegrityLens(claims: readonly ClaimObject[]): Lens {
  const rows = [...byType(claims, "BONUS"), ...byType(claims, "BOOKMAKER_RATING")].map<LensRow>((c) => ({
    subject: c.subject,
    headline: c.lifecycle === "DO_NOT_USE" ? "blocked" : "compliance-gated",
    detail: c.risk.weakness,
    emphasis: c.lifecycle === "DO_NOT_USE" ? "BLOCK" : "CAUTION",
  }));
  return { key: "bonus-integrity", title: "Bonus Integrity", description: "No offer is current/legal/best without verification; GSE never operates betting.", rows };
}

/** WEB EVIDENCE — external observations awaiting rights promotion; never production truth. */
export function webEvidenceLens(claims: readonly ClaimObject[]): Lens {
  const rows = byType(claims, "WEB_EVIDENCE").map<LensRow>((c) => ({
    subject: c.subject,
    headline: `rights: ${c.rights.status}`,
    detail: c.explain.allowedToMean,
    emphasis: "BLOCK",
  }));
  return { key: "web-evidence", title: "Web Evidence", description: "Evidence awaiting permission — never a fact by default.", rows };
}

/** AUTHORITY FLIGHT RECORDER — every claim's binding layer and permitted expression. */
export function authorityFlightRecorderLens(claims: readonly ClaimObject[]): Lens {
  const rows = [...claims]
    .sort((a, b) => rankOf(b.publicExpression) - rankOf(a.publicExpression))
    .slice(0, 14)
    .map<LensRow>((c) => ({
      subject: c.subject,
      headline: `${c.publicExpression} · binds at ${c.authority.composition.bindingLayers.join(", ") || "—"}`,
      detail: c.explain.authorityStory,
      emphasis: c.lifecycle === "DO_NOT_USE" ? "BLOCK" : c.publicExpression === "INFO_ONLY" ? "CAUTION" : "NEUTRAL",
    }));
  return { key: "authority-flight-recorder", title: "Authority Flight Recorder", description: "Exactly what GSE was allowed to say, and which layer bound it.", rows };
}

/** AUTOPSY MEMORY — what settles each claim and where the result writes. */
export function autopsyMemoryLens(claims: readonly ClaimObject[]): Lens {
  const rows = claims
    .filter((c) => c.autopsyHook.hasTrial)
    .map<LensRow>((c) => ({
      subject: c.subject,
      headline: `${c.autopsyHook.settlesWhen} → ${c.memoryWrite.ledger} ledger`,
      detail: c.autopsyHook.gradingProtocol,
      emphasis: "NEUTRAL",
    }));
  return { key: "autopsy-memory", title: "Autopsy Memory", description: "Every prediction and trend has a settle-and-grade path into memory.", rows };
}

/** All eight instruments over one corpus. */
export function allLenses(claims: readonly ClaimObject[]): readonly Lens[] {
  return [
    sourceRaceLens(claims),
    marketLifecycleLens(claims),
    trendFragilityLens(claims),
    predictionTrialLens(claims),
    bonusIntegrityLens(claims),
    webEvidenceLens(claims),
    authorityFlightRecorderLens(claims),
    autopsyMemoryLens(claims),
  ];
}
