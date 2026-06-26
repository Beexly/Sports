/**
 * SLIP MRI — accumulators / bet-builder as RISK INTELLIGENCE, not a parlay push.
 *
 * Scores24 sells accumulators. GSE refuses to push reckless multi-leg betting. Slip MRI diagnoses a
 * slip's hidden risks: correlation between legs (so they are not independent), duplicated assumptions,
 * the weakest leg, risk concentration, combined fragility, and the authority ceiling — and its strongest
 * possible verdict is "proceed with caution," never "best bet." No profit framing. Fixture-only.
 *
 * Pure + deterministic. Spec: docs/product/SLIP_MRI.md.
 */

import { type MaxPermittedStrength, rankOf, strengthMin } from "./decision-state-stat-contract.js";

export interface SlipLeg {
  readonly legId: string;
  readonly sport: string;
  readonly eventId: string;
  readonly team?: string | null;
  readonly market: string;
  readonly selection: string;
  readonly impliedProb: number; // 0..1 from the price (raw)
  readonly authorityCeiling: MaxPermittedStrength;
  readonly supported: boolean; // is there evidence behind this leg?
}

export type SlipVerdict = "PASS" | "WARN" | "PROCEED_WITH_CAUTION";

export interface SlipMRI {
  readonly legCount: number;
  readonly sports: readonly string[];
  readonly correlatedPairs: ReadonlyArray<{ a: string; b: string; reason: string }>;
  readonly duplicatedAssumptions: readonly string[];
  readonly weakestLegId: string | null;
  readonly riskConcentration: "LOW" | "MEDIUM" | "HIGH";
  readonly combinedImpliedProb: number; // product of legs
  readonly estimatedFragility: number; // 1 − combined (more legs / lower prob → higher)
  readonly authorityCeiling: MaxPermittedStrength; // meet across legs
  readonly whatWouldBreakSlip: string;
  readonly verdict: SlipVerdict;
  readonly responsibleWarning: string;
  readonly publicSafe: boolean;
  readonly fixtureWatermarked: true;
}

const RESPONSIBLE = "Multi-leg bets are high-variance: every leg must hit. This is a risk diagnosis, not advice. Only ever stake what you can afford to lose.";

export function analyzeSlip(legs: readonly SlipLeg[]): SlipMRI {
  const sports = [...new Set(legs.map((l) => l.sport))];

  // correlation: legs on the same event, or same team, are not independent
  const correlatedPairs: { a: string; b: string; reason: string }[] = [];
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const A = legs[i]!, B = legs[j]!;
      if (A.eventId === B.eventId) correlatedPairs.push({ a: A.legId, b: B.legId, reason: "same event — outcomes are correlated, not independent" });
      else if (A.team && B.team && A.team === B.team) correlatedPairs.push({ a: A.legId, b: B.legId, reason: "same team across events — shared dependence" });
    }
  }

  const duplicatedAssumptions = legs
    .filter((l, idx) => legs.findIndex((x) => x.eventId === l.eventId && x.market === l.market) !== idx)
    .map((l) => `${l.legId}: repeats the ${l.market} assumption on ${l.eventId}`);

  const combinedImpliedProb = legs.reduce((p, l) => p * Math.max(0, Math.min(1, l.impliedProb)), 1);
  const estimatedFragility = Math.round((1 - combinedImpliedProb) * 1000) / 1000;

  const weakestLeg = legs.length ? legs.reduce((w, l) => (l.impliedProb < w.impliedProb ? l : w)) : null;
  const authorityCeiling = legs.reduce<MaxPermittedStrength>((acc, l) => strengthMin(acc, l.authorityCeiling), "PUBLIC_ACTION");
  const anyUnsupported = legs.some((l) => !l.supported);

  const independentEvents = new Set(legs.map((l) => l.eventId)).size;
  const concentration: SlipMRI["riskConcentration"] =
    correlatedPairs.length > 0 && independentEvents < legs.length ? "HIGH" : legs.length >= 4 ? "MEDIUM" : "LOW";

  // Verdict: the strongest possible is PROCEED_WITH_CAUTION. Never "best bet".
  const verdict: SlipVerdict =
    anyUnsupported || correlatedPairs.length > 0 || duplicatedAssumptions.length > 0 || rankOf(authorityCeiling) <= rankOf("INFO_ONLY")
      ? "PASS"
      : estimatedFragility > 0.8 || concentration === "HIGH"
        ? "WARN"
        : "PROCEED_WITH_CAUTION";

  return {
    legCount: legs.length,
    sports,
    correlatedPairs,
    duplicatedAssumptions,
    weakestLegId: weakestLeg?.legId ?? null,
    riskConcentration: concentration,
    combinedImpliedProb: Math.round(combinedImpliedProb * 1000) / 1000,
    estimatedFragility,
    authorityCeiling,
    whatWouldBreakSlip:
      (weakestLeg ? `The weakest leg (${weakestLeg.legId}, ~${Math.round(weakestLeg.impliedProb * 100)}% implied) breaks it most easily. ` : "") +
      (correlatedPairs.length ? "Correlated legs mean a single event can sink multiple legs at once. " : "") +
      (anyUnsupported ? "At least one leg has no evidence behind it. " : ""),
    verdict,
    responsibleWarning: RESPONSIBLE,
    publicSafe: true,
    fixtureWatermarked: true,
  };
}

// ───────────────────────── Fixture slip (illustrative) ─────────────────────────
export const SLIP_FIXTURE: readonly SlipLeg[] = [
  { legId: "leg1", sport: "soccer", eventId: "fixture-soccer-ecu-ger-2026", team: "Germany", market: "Match result", selection: "Germany", impliedProb: 0.62, authorityCeiling: "INFO_ONLY", supported: true },
  { legId: "leg2", sport: "soccer", eventId: "fixture-soccer-ecu-ger-2026", team: "Germany", market: "Team total", selection: "Germany Over 1.5", impliedProb: 0.55, authorityCeiling: "INFO_ONLY", supported: true },
  { legId: "leg3", sport: "baseball", eventId: "fixture-mlb-tb-kc-2026", team: "Tampa Bay Rays", market: "Moneyline", selection: "Rays", impliedProb: 0.64, authorityCeiling: "INFO_ONLY", supported: true },
];

export function analyzeFixtureSlip(): SlipMRI {
  return analyzeSlip(SLIP_FIXTURE);
}
