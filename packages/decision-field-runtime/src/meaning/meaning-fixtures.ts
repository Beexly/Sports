/**
 * COMPILED FIXTURE CORPUS — every proof object, run through its adapter + the compiler, once.
 *
 * The single call the /meaning/preview route, the lenses, and the offline observatory all consume:
 * the three proof matches (Ecuador–Germany, Rays–Royals, Roughriders–Argonauts) plus bonuses, a
 * provider, an alert set, and a web-evidence example — all lifted into ClaimObjects. Cross-domain proof
 * that ONE grammar governs every kind of sports meaning. Pure, deterministic, fixture-only.
 */

import { compileClaimObject, type ClaimObject } from "./meaning-compiler.js";
import {
  matchStatToClaimObject,
  trendToClaimObject,
  predictionTrialToClaimObject,
  oddsPriceToClaimObject,
  marketBloomToClaimObject,
  bonusPassportToClaimObject,
  sourceGenomeToClaimObject,
  alertToClaimObject,
  webEvidenceToClaimObject,
} from "./morphology-adapters.js";
import type { RightsEnvelope } from "./claim-object.js";
import { EVENT_GENOME_FIXTURES } from "../event-genome-fixtures.js";
import { matchDerivedStats } from "../match-derived-stats.js";
import { buildAllTrendPassports } from "../trend-passport.js";
import { buildAllPredictionTrials } from "../prediction-court.js";
import { buildAllMarketBloomRecords } from "../market-bloom.js";
import { buildFixtureAlerts } from "../watchlist-alerts.js";
import { buildAllBonusPassports, GENOME_ODDS_API } from "@sports/data-intelligence";
import type { ObjectType } from "./claim-object.js";

const WEB_EVIDENCE_RIGHTS: RightsEnvelope = {
  status: "permission_required", legalVerdict: "RIGHTS_REVIEW", commercialDisplayAllowed: false, publicDisplayAllowed: false,
  storageAllowed: false, derivedUseAllowed: false, modelTrainingAllowed: false, redistributionAllowed: false,
  attributionRequired: true, attributionText: null, ownerApprovalRequired: true, reviewStatus: "UNKNOWN", reviewedAtLabel: null,
};

/** Compile the entire proof corpus into ClaimObjects (deterministic order). */
export function compileAllFixtures(): readonly ClaimObject[] {
  const out: ClaimObject[] = [];
  const genomes = [EVENT_GENOME_FIXTURES.soccer, EVENT_GENOME_FIXTURES.baseball, EVENT_GENOME_FIXTURES.football] as const;

  // Per-match: derived stats (soccer), odds prices, market lifecycles.
  for (const g of genomes) {
    for (const s of matchDerivedStats(g)) out.push(compileClaimObject(matchStatToClaimObject(s, g.eventId, g.sport)));
    for (const o of g.odds) out.push(compileClaimObject(oddsPriceToClaimObject(o, g.eventId, g.sport)));
  }
  for (const m of buildAllMarketBloomRecords()) out.push(compileClaimObject(marketBloomToClaimObject(m)));

  // Cross-match passports.
  for (const t of buildAllTrendPassports()) out.push(compileClaimObject(trendToClaimObject(t)));
  for (const p of buildAllPredictionTrials()) out.push(compileClaimObject(predictionTrialToClaimObject(p)));
  for (const a of buildFixtureAlerts()) out.push(compileClaimObject(alertToClaimObject(a)));

  // Money + provider + web evidence.
  for (const b of buildAllBonusPassports()) out.push(compileClaimObject(bonusPassportToClaimObject(b)));
  out.push(compileClaimObject(sourceGenomeToClaimObject(GENOME_ODDS_API)));
  out.push(
    compileClaimObject(
      webEvidenceToClaimObject({
        subject: "an external match note",
        url: "https://example.org/fixture-note",
        summary: "an unverified external observation about the fixture",
        rights: WEB_EVIDENCE_RIGHTS,
        knownAtLabel: "unknown",
      }),
    ),
  );

  return out;
}

/** Group the corpus by objectType (stable insertion order within each group). */
export function compiledFixturesByType(): Readonly<Record<ObjectType, readonly ClaimObject[]>> {
  const groups = {} as Record<ObjectType, ClaimObject[]>;
  for (const c of compileAllFixtures()) {
    (groups[c.objectType] ??= []).push(c);
  }
  return groups;
}
