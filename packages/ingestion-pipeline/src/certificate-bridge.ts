/**
 * Certificate bridge — wires display-substantiation guards and the
 * No-Bet / Fire decision certificates into the live publish surface.
 *
 * This is the "can we say this out loud" layer: every public claim must be
 * substantiated, and every decision carries a hashable certificate (No-Bet
 * with reason codes, or Fire with a multiprob interval and a real price).
 *
 * Fail-closed on missing inputs. Never fabricates a price or a claim.
 */

import {
  isDisplaySubstantiated,
  displayIfSubstantiated,
  wilsonLowerBound,
  type DisplayClaim,
  type SubstantiationEvidence,
} from "@sports/prediction-engine";
import {
  noBetCertificate,
  fireCertificate,
  parseDecisionCertificate,
  canonicalizeForHash,
  mapExclusionToReasons,
  humanSummaryForReasons,
  type DecisionCertificate,
  type MultiprobInterval,
} from "@sports/prediction-engine";
import {
  kellyFromLowerEndpoint,
  type KellyInput,
  type KellyResult,
} from "@sports/prediction-engine";

export type CertEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── Display substantiation ─────────────────────────────────────────────────

/**
 * Can this claim be shown publicly? Fail-closed when the claim is missing
 * evidence — unsubstantiated claims are never displayed.
 */
export function evalDisplaySubstantiation(claim: DisplayClaim): CertEval<boolean> {
  if (!claim) {
    return { ok: false, reason: "claim required" };
  }
  try {
    return { ok: true, data: isDisplaySubstantiated(claim) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Display a numeric claim only when it is substantiated. Returns null when
 * it is not — that null is a refusal, not a zero.
 */
export function evalDisplayIfSubstantiated(claim: DisplayClaim): CertEval<number | null> {
  if (!claim) {
    return { ok: false, reason: "claim required" };
  }
  try {
    return { ok: true, data: displayIfSubstantiated(claim) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Wilson lower bound on a proportion — the honest floor for a public claim.
 */
export function evalWilsonLowerBound(input: {
  readonly successes: number;
  readonly trials: number;
  readonly z?: number;
}): CertEval<number> {
  const { successes, trials, z } = input;
  if (!Number.isFinite(successes) || !Number.isFinite(trials) || trials <= 0) {
    return { ok: false, reason: "successes finite and trials > 0 required" };
  }
  if (successes < 0 || successes > trials) {
    return { ok: false, reason: "successes must be in [0, trials] — not imputed" };
  }
  try {
    const lb = wilsonLowerBound(successes, trials, z);
    return { ok: true, data: Number(lb.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Decision certificates ──────────────────────────────────────────────────

/**
 * Mint a No-Bet certificate. Every exclusion becomes a reason code with a
 * human summary. The certificate is hashable via canonicalizeForHash.
 */
export function evalNoBetCertificate(input: {
  readonly stratumKey: string;
  readonly modelVersion: string;
  readonly eventId: string;
  readonly market: string;
  readonly exclusions: readonly string[];
  readonly interval?: MultiprobInterval;
  readonly oddsFetchedAt?: string;
  readonly stratumN?: number;
}): CertEval<DecisionCertificate> {
  const { stratumKey, modelVersion, eventId, market, exclusions } = input;
  if (!stratumKey || !modelVersion || !eventId || !market) {
    return {
      ok: false,
      reason: "stratumKey/modelVersion/eventId/market required",
    };
  }
  if (!Array.isArray(exclusions) || exclusions.length === 0) {
    return { ok: false, reason: "exclusions must be non-empty for a No-Bet" };
  }
  try {
    const reasons = mapExclusionToReasons(exclusions as string[]);
    const summary = humanSummaryForReasons(reasons);
    const cert = noBetCertificate({
      stratumKey,
      modelVersion,
      eventId,
      market,
      reasons,
      summary,
      interval: input.interval,
      oddsFetchedAt: input.oddsFetchedAt,
      stratumN: input.stratumN,
    });
    return { ok: true, data: cert };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Mint a Fire certificate. Requires a real multiprob interval and a real
 * price — never a fabricated or assumed one.
 */
export function evalFireCertificate(input: {
  readonly stratumKey: string;
  readonly modelVersion: string;
  readonly eventId: string;
  readonly market: string;
  readonly summary: string;
  readonly interval: MultiprobInterval | null;
  readonly priceDecimal: number | null;
  readonly oddsFetchedAt?: string;
  readonly stratumN?: number;
}): CertEval<DecisionCertificate> {
  const { stratumKey, modelVersion, eventId, market, summary, interval, priceDecimal } = input;
  if (!stratumKey || !modelVersion || !eventId || !market || !summary) {
    return {
      ok: false,
      reason: "stratumKey/modelVersion/eventId/market/summary required",
    };
  }
  if (!interval) {
    return { ok: false, reason: "multiprob interval required — not imputed" };
  }
  if (priceDecimal == null || !Number.isFinite(priceDecimal) || priceDecimal <= 1) {
    return {
      ok: false,
      reason: "priceDecimal must be decimal odds > 1 — never fabricated",
    };
  }
  try {
    const cert = fireCertificate({
      stratumKey,
      modelVersion,
      eventId,
      market,
      summary,
      interval,
      priceDecimal,
      oddsFetchedAt: input.oddsFetchedAt,
      stratumN: input.stratumN,
    });
    return { ok: true, data: cert };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Parse an untrusted certificate payload. Fail-closed on malformed input.
 */
export function evalParseCertificate(input: unknown): CertEval<DecisionCertificate> {
  try {
    const parsed = parseDecisionCertificate(input);
    if (!parsed || !parsed.ok) {
      return {
        ok: false,
        reason: parsed && "reason" in parsed ? String(parsed.reason) : "malformed certificate",
      };
    }
    return { ok: true, data: parsed.certificate as DecisionCertificate };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Canonical hash payload for a certificate — the receipt chain input.
 */
export function evalCertificateHash(cert: DecisionCertificate): CertEval<string> {
  if (!cert) return { ok: false, reason: "certificate required" };
  try {
    return { ok: true, data: canonicalizeForHash(cert) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Kelly from lower endpoint ──────────────────────────────────────────────

/**
 * Kelly stake from the LOWER endpoint of a multiprob interval — the
 * conservative sizing that respects interval uncertainty.
 */
export function evalKellyLowerEndpoint(input: KellyInput): CertEval<KellyResult> {
  if (!input || !Number.isFinite(input.decimalOdds) || input.decimalOdds <= 1) {
    return { ok: false, reason: "decimalOdds must be decimal odds > 1" };
  }
  if (!Number.isFinite(input.pLo) || input.pLo <= 0 || input.pLo >= 1) {
    return { ok: false, reason: "pLo must be finite in (0,1)" };
  }
  try {
    const r = kellyFromLowerEndpoint(input);
    return { ok: true, data: r };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  isDisplaySubstantiated,
  displayIfSubstantiated,
  wilsonLowerBound,
  noBetCertificate,
  fireCertificate,
  parseDecisionCertificate,
  canonicalizeForHash,
  mapExclusionToReasons,
  humanSummaryForReasons,
  kellyFromLowerEndpoint,
};
export type {
  DisplayClaim,
  SubstantiationEvidence,
  DecisionCertificate,
  MultiprobInterval,
  KellyInput,
  KellyResult,
};
