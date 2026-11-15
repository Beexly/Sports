/**
 * Situational family diagnostics.
 *
 * The doctrine is ingest-everything: every family is computed and enters the
 * reasoning trace, and gates govern emission only. So each family reports the
 * MEASURED deviation it saw, in its own native unit, with `emissionWeight: 0`
 * and `delta: 0`.
 *
 * Why `delta` is zero and not a number: converting a deviation into log-odds
 * requires a fitted coefficient, and none of these families has one. Writing
 * `delta: 0` while reporting the real deviation keeps the diagnostic honest and
 * keeps the posterior equal to the market prior. A hardcoded `delta: 0` with no
 * measured deviation behind it would make out-of-sample evaluation impossible,
 * because there would be nothing to fit a scale against later.
 */

import type { GameEvidenceBundle } from "./types.js";
import { isPresent } from "./types.js";

export interface FamilyDiagnostic {
  readonly family: string;
  /** The measured quantity, in `unit`. Null when the inputs were absent. */
  readonly value: number | null;
  /** What the value is compared against. */
  readonly reference: number | null;
  /** value - reference, in `unit`. Null when either side is absent. */
  readonly deviation: number | null;
  readonly unit: string;
  /** Weight in the posterior. Zero until a coefficient is fitted. */
  readonly emissionWeight: number;
  /** Log-odds contribution. Zero: no fitted coefficient exists. */
  readonly delta: number;
  /** REAL when measured, MISSING when an input was absent. */
  readonly status: "REAL" | "MISSING";
  readonly note: string;
}

function diff(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a - b;
}

export function computeFamilyDiagnostics(bundle: GameEvidenceBundle): FamilyDiagnostic[] {
  const out: FamilyDiagnostic[] = [];

  // rest — away rest days minus home rest days. Positive favours the away team.
  const restValue = isPresent(bundle.rest) ? bundle.rest.value.awayRestDays : null;
  const restRef = isPresent(bundle.rest) ? bundle.rest.value.homeRestDays : null;
  out.push({
    family: "rest",
    value: restValue,
    reference: restRef,
    deviation: diff(restValue, restRef),
    unit: "days",
    emissionWeight: 0,
    delta: 0,
    status: restValue === null || restRef === null ? "MISSING" : "REAL",
    note: "away rest days minus home rest days",
  });

  // weather — wind at the venue. No reference: wind is not a difference.
  const wind = isPresent(bundle.weather) ? bundle.weather.value.windMph : null;
  out.push({
    family: "weather",
    value: wind,
    reference: null,
    deviation: null,
    unit: "mph",
    emissionWeight: 0,
    delta: 0,
    status: wind === null ? "MISSING" : "REAL",
    note: "venue wind speed; the NWS reading carries no direction",
  });

  // formEpa — home offence vs away defence, minus away offence vs home defence.
  const homeOff = isPresent(bundle.homeForm) ? bundle.homeForm.value.offEpaPerPlay : null;
  const homeDef = isPresent(bundle.homeForm) ? bundle.homeForm.value.defEpaPerPlay : null;
  const awayOff = isPresent(bundle.awayForm) ? bundle.awayForm.value.offEpaPerPlay : null;
  const awayDef = isPresent(bundle.awayForm) ? bundle.awayForm.value.defEpaPerPlay : null;
  const homeMatchup = homeOff === null || awayDef === null ? null : homeOff - awayDef;
  const awayMatchup = awayOff === null || homeDef === null ? null : awayOff - homeDef;
  out.push({
    family: "formEpa",
    value: homeMatchup,
    reference: awayMatchup,
    deviation: diff(homeMatchup, awayMatchup),
    unit: "EPA/play",
    emissionWeight: 0,
    delta: 0,
    status: homeMatchup === null || awayMatchup === null ? "MISSING" : "REAL",
    note: "home offence-vs-away defence minus away offence-vs-home defence",
  });

  // injuries — players listed Out or Doubtful, per side.
  const injuries = isPresent(bundle.injuries) ? bundle.injuries.value : null;
  const countOut = (team: string): number | null => {
    if (injuries === null) return null;
    return injuries.filter(
      (r) => r.team === team && /^(out|doubtful)$/i.test(r.reportStatus.trim()),
    ).length;
  };
  const homeOut = countOut(bundle.identity.homeTeam);
  const awayOut = countOut(bundle.identity.awayTeam);
  out.push({
    family: "injuries",
    value: homeOut,
    reference: awayOut,
    deviation: diff(homeOut, awayOut),
    unit: "players out or doubtful",
    emissionWeight: 0,
    delta: 0,
    status: homeOut === null || awayOut === null ? "MISSING" : "REAL",
    note: "home unavailable minus away unavailable; positive favours the away team",
  });

  // coaching — fourth-down aggression difference.
  const homeAgg = isPresent(bundle.homeCoaching) ? bundle.homeCoaching.value.fourthDownAggression : null;
  const awayAgg = isPresent(bundle.awayCoaching) ? bundle.awayCoaching.value.fourthDownAggression : null;
  out.push({
    family: "coaching",
    value: homeAgg,
    reference: awayAgg,
    deviation: diff(homeAgg, awayAgg),
    unit: "go-rate",
    emissionWeight: 0,
    delta: 0,
    status: homeAgg === null || awayAgg === null ? "MISSING" : "REAL",
    note: "home fourth-down go rate minus away",
  });

  // corpusTactical — how much documented support the facets found.
  const corpusSupport = isPresent(bundle.corpus)
    ? bundle.corpus.value.reduce((s, f) => s + f.support, 0) / Math.max(1, bundle.corpus.value.length)
    : null;
  out.push({
    family: "corpusTactical",
    value: corpusSupport,
    reference: null,
    deviation: null,
    unit: "mean facet support 0..1",
    emissionWeight: 0,
    delta: 0,
    status: corpusSupport === null ? "MISSING" : "REAL",
    note: "shrink-only; support measures topical match, not agreement",
  });

  // premisesAndEquations — the bundle carries no bound equation, so this is
  // MISSING rather than a zero. 41 of 62,900 equations are candidate-bindable
  // and none has been bound to a bundle field yet.
  out.push({
    family: "premisesAndEquations",
    value: null,
    reference: null,
    deviation: null,
    unit: "log-odds",
    emissionWeight: 0,
    delta: 0,
    status: "MISSING",
    note: "no equation is bound to a bundle field; 41 of 62,900 are candidate-bindable",
  });

  // nflFarmPriors — the 36-cycle ledger is not wired into the bundle yet.
  out.push({
    family: "nflFarmPriors",
    value: null,
    reference: null,
    deviation: null,
    unit: "log-odds",
    emissionWeight: 0,
    delta: 0,
    status: "MISSING",
    note: "nfl-farm cycle ledger is not wired into the bundle",
  });

  return out;
}
