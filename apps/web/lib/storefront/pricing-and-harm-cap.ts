/**
 * Storefront Pricing, Behavioral Economics, Responsible-Gaming Harm-Cap &
 * Zero-Trust Capability Token Engine (INDEX-BATCH-3 + GAP-HUNT + AM Sweep).
 *
 * Implements:
 *   - Branded TypeScript invariants (`ConfidenceBadge = `${number}/100``, `DeViggedProb`, `SignedCapabilityToken`)
 *   - Snowberg & Wolfers (2010, NBER w15923) Favorite-Longshot Misperception Guard (blocks SGP legs < 18% true prob)
 *   - Schmitt, Skiera & Van den Bulte (2011, J. Marketing) Referral LTV & Retention Hazard Differential
 *   - Syvertsen et al. (2022) & Heirene (2021) EMA Exposure & Responsible-Gaming Harm-Cap Gate
 *   - Good-Better-Best SaaS Tier Architecture ($9.99 Flash / $29 Pro / $79 Sovereign / $399 Annual)
 *   - SAPPER v2 (AM-09) & AgentShield (AM-04) Zero-Trust Short-Lived Capability Token Verification
 */

declare const __deViggedBrand: unique symbol;
export type DeViggedProb = number & { readonly [__deViggedBrand]: "DeViggedProb" };

declare const __capTokenBrand: unique symbol;
export type SignedCapabilityToken = string & { readonly [__capTokenBrand]: "SignedCapabilityToken" };

/** AGENTS.md Hard Rule: NEVER render confidence as `%`; always `${number}/100`. */
export type ConfidenceBadge = `${number}/100`;

export function toDeViggedProb(rawProb: number): DeViggedProb {
  if (!Number.isFinite(rawProb) || rawProb <= 0 || rawProb >= 1) {
    throw new Error(`Invalid DeViggedProb: ${rawProb}; must lie strictly in (0, 1).`);
  }
  return Number(rawProb.toFixed(6)) as DeViggedProb;
}

export function formatConfidenceBadge(score0To100: number): ConfidenceBadge {
  const clamped = Math.max(0, Math.min(100, Math.round(score0To100)));
  return `${clamped}/100`;
}

export interface SnowbergWolfersLongshotAudit {
  legId: string;
  trueProb: DeViggedProb;
  marketImpliedProb: number;
  misperceptionRatio: number;
  blockedByLongshotGuard: boolean;
  reason: string | null;
}

/**
 * Snowberg & Wolfers (2010, JPE / NBER w15923):
 * Bettors systematically overweight low-probability longshot tails (Prelec probability weighting),
 * allowing sportsbooks to embed 20-35% holds in longshot parlay/SGP legs.
 * Hard GSE guard: blocks any SGP leg with trueProb < 0.18 unless de-vigged EV > +4.5%.
 */
export function evaluateSnowbergWolfersLongshotGuard(
  legId: string,
  trueProb: DeViggedProb,
  marketImpliedProb: number,
  minTrueProbFloor = 0.18,
): SnowbergWolfersLongshotAudit {
  const gamma = 0.68; // Prelec / Kahneman-Tversky probability distortion parameter
  const perceivedProb = Math.exp(-Math.pow(-Math.log(Math.max(1e-6, trueProb)), gamma));
  const misperceptionRatio = Number((perceivedProb / trueProb).toFixed(4));
  const edge = trueProb - marketImpliedProb;

  const blocked = trueProb < minTrueProbFloor && edge < 0.045;
  return {
    legId,
    trueProb,
    marketImpliedProb: Number(marketImpliedProb.toFixed(4)),
    misperceptionRatio,
    blockedByLongshotGuard: blocked,
    reason: blocked
      ? `Snowberg-Wolfers longshot guard: trueProb ${trueProb} < ${minTrueProbFloor} with perception inflation ${misperceptionRatio}x`
      : null,
  };
}

export interface SchmittReferralLtvInput {
  monthlyContributionMarginUsd: number;
  organicMonthlyChurnHazard: number; // e.g., 0.085
  referredHazardMultiplier: number; // Schmitt et al. (2011): referred customers churn ~18% less (0.82x)
  monthlyDiscountRate: number;
  referralAcquisitionBountyUsd: number;
  organicCacUsd: number;
}

export interface SchmittReferralLtvResult {
  referredCustomerLtvUsd: number;
  organicCustomerLtvUsd: number;
  netReferralValueDifferentialUsd: number;
  referralLtvLiftPct: number;
}

/**
 * Schmitt, Skiera & Van den Bulte (2011, Journal of Marketing):
 * Referred customers exhibit higher contribution margin, higher retention survival,
 * and lower acquisition cost than non-referred customers, yielding a +16% to +25% LTV premium.
 */
export function computeSchmittReferralLtvDifferential(
  input: SchmittReferralLtvInput,
): SchmittReferralLtvResult {
  const hOrg = Math.max(0.01, Math.min(0.5, input.organicMonthlyChurnHazard));
  const hRef = Math.max(0.008, hOrg * Math.max(0.5, Math.min(1.0, input.referredHazardMultiplier)));
  const d = Math.max(0.001, input.monthlyDiscountRate);

  const organicCustomerLtvUsd = Number(
    (input.monthlyContributionMarginUsd / (hOrg + d) - input.organicCacUsd).toFixed(2),
  );
  const referredCustomerLtvUsd = Number(
    (
      (input.monthlyContributionMarginUsd * 1.04) / (hRef + d) -
      input.referralAcquisitionBountyUsd
    ).toFixed(2),
  );

  const netReferralValueDifferentialUsd = Number(
    (referredCustomerLtvUsd - organicCustomerLtvUsd).toFixed(2),
  );
  const referralLtvLiftPct = Number(
    ((netReferralValueDifferentialUsd / Math.max(1, organicCustomerLtvUsd)) * 100).toFixed(2),
  );

  return {
    referredCustomerLtvUsd,
    organicCustomerLtvUsd,
    netReferralValueDifferentialUsd,
    referralLtvLiftPct,
  };
}

export interface HarmCapSessionTelemetry {
  sessionDepositAttemptsLast24h: number;
  rapidReloadAfterLossCount: number;
  stakeEscalationRatioVsBaseline: number;
  lateNightChasingSessionFlag: boolean;
}

export interface HarmCapEvaluationResult {
  emaHarmRiskScore: number;
  suppressAggressiveUpsells: boolean;
  enforceCooldownBanner: boolean;
  maxAllowedKellyMultiplier: number;
}

/**
 * Syvertsen et al. (2022) Ecological Momentary Assessment + Heirene et al. (2021) +
 * Auer & Griffiths Behavioral Harm-Cap Gate:
 * Detects loss-chasing and rapid-reload velocity and automatically suppresses urgency
 * upsells while capping Kelly sizing.
 */
export function evaluateResponsibleGamingHarmCap(
  telemetry: HarmCapSessionTelemetry,
): HarmCapEvaluationResult {
  const reloadScore = Math.min(0.45, telemetry.rapidReloadAfterLossCount * 0.18);
  const depositScore = Math.min(0.25, Math.max(0, telemetry.sessionDepositAttemptsLast24h - 1) * 0.1);
  const escalationScore = Math.min(
    0.3,
    Math.max(0, telemetry.stakeEscalationRatioVsBaseline - 1.25) * 0.25,
  );
  const lateNightBonus = telemetry.lateNightChasingSessionFlag ? 0.15 : 0;

  const emaHarmRiskScore = Number(
    Math.min(1.0, reloadScore + depositScore + escalationScore + lateNightBonus).toFixed(4),
  );

  const suppressAggressiveUpsells = emaHarmRiskScore >= 0.35;
  const enforceCooldownBanner = emaHarmRiskScore >= 0.55;
  const maxAllowedKellyMultiplier = enforceCooldownBanner
    ? 0.0
    : suppressAggressiveUpsells
      ? 0.25
      : 0.5;

  return {
    emaHarmRiskScore,
    suppressAggressiveUpsells,
    enforceCooldownBanner,
    maxAllowedKellyMultiplier,
  };
}

/**
 * SAPPER v2 (AM-09) & AgentShield (AM-04) Zero-Trust Capability Token Minter/Validator.
 * Binds agent/session identity, allowed tool scope, and strict expiration window.
 */
export function mintZeroTrustCapabilityToken(payload: {
  subjectId: string;
  allowedScopes: readonly string[];
  expiresAtEpochSec: number;
  secretSalt: string;
}): SignedCapabilityToken {
  const scopeStr = [...payload.allowedScopes].sort().join(",");
  const raw = `${payload.subjectId}|${scopeStr}|${payload.expiresAtEpochSec}`;
  let hash = 2166136261;
  const combined = `${raw}|${payload.secretSalt}`;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const sig = (hash >>> 0).toString(16).padStart(8, "0");
  return `gse_cap_v1.${Buffer.from(raw, "utf8").toString("base64url")}.${sig}` as SignedCapabilityToken;
}

export function verifyZeroTrustCapabilityToken(
  token: string,
  requiredScope: string,
  nowEpochSec: number,
  secretSalt: string,
): { valid: boolean; subjectId: string | null; reason: string | null } {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "gse_cap_v1") {
    return { valid: false, subjectId: null, reason: "Malformed capability token prefix" };
  }
  const decoded = Buffer.from(parts[1]!, "base64url").toString("utf8");
  const [subjectId, scopeStr, expStr] = decoded.split("|");
  if (!subjectId || scopeStr === undefined || !expStr) {
    return { valid: false, subjectId: null, reason: "Malformed capability payload" };
  }
  const expiresAtEpochSec = Number(expStr);
  if (!Number.isFinite(expiresAtEpochSec) || nowEpochSec > expiresAtEpochSec) {
    return { valid: false, subjectId, reason: "Capability token expired" };
  }
  const scopes = scopeStr.split(",").filter(Boolean);
  const expected = mintZeroTrustCapabilityToken({
    subjectId,
    allowedScopes: scopes,
    expiresAtEpochSec,
    secretSalt,
  });
  if (expected !== token) {
    return { valid: false, subjectId, reason: "Invalid capability signature" };
  }
  if (!scopes.includes(requiredScope)) {
    return { valid: false, subjectId, reason: `Missing required scope: ${requiredScope}` };
  }
  return { valid: true, subjectId, reason: null };
}
