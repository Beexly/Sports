/**
 * Event Genome preview — the pure, DB-free assembly behind /matches/preview/*.
 *
 * GSE's rights-safe answer to a Scores24 match page: every fixture is run through the SAME canonical
 * engine the package tests pin (`@sports/decision-field-runtime`) — no parallel system, no DB, no
 * network, no clock. A match becomes a genome + derived stats + trend passports + prediction trials +
 * market lifecycles + ONE authority flight record. On fixture data the meet caps everything at
 * INFO_ONLY, so nothing here can ever read as a live betting call. Deterministic; safe to import from a
 * server component or a unit test.
 */

import {
  EVENT_GENOME_FIXTURES,
  type UniversalEventGenome,
  matchDerivedStats,
  type MatchDerivedStat,
  buildAllTrendPassports,
  type TrendPassport,
  buildAllPredictionTrials,
  type PredictionTrial,
  buildAllMarketBloomRecords,
  type MarketBloomRecord,
  buildFlightRecord,
  type AuthorityFlightRecord,
  FIXTURE_AUTHORITY,
  type MaxPermittedStrength,
} from "@sports/decision-field-runtime";

/** The three proof fixtures, addressed by their public URL slug. */
export const FIXTURE_BY_SLUG = {
  "ecuador-germany": "soccer",
  "rays-royals": "baseball",
  "roughriders-argonauts": "football",
} as const;

export type PreviewSlug = keyof typeof FIXTURE_BY_SLUG;
export type FixtureKey = (typeof FIXTURE_BY_SLUG)[PreviewSlug];

export const PREVIEW_SLUGS = Object.keys(FIXTURE_BY_SLUG) as PreviewSlug[];

export function isPreviewSlug(s: string): s is PreviewSlug {
  return s in FIXTURE_BY_SLUG;
}

/** The nine inner views — value drives the `?view=` query param (URL-shareable, server-rendered). */
export const GENOME_VIEWS = [
  { value: "overview", label: "Overview" },
  { value: "worldline", label: "Worldline" },
  { value: "trial", label: "Prediction Trial" },
  { value: "genome", label: "Match Genome" },
  { value: "market", label: "Market Lifecycle" },
  { value: "passports", label: "Passports" },
  { value: "odds", label: "Odds" },
  { value: "proof", label: "Proof" },
  { value: "autopsy", label: "Autopsy" },
] as const;

export type GenomeView = (typeof GENOME_VIEWS)[number]["value"];
export const DEFAULT_VIEW: GenomeView = "overview";

export function resolveView(raw: string | undefined): GenomeView {
  return GENOME_VIEWS.some((v) => v.value === raw) ? (raw as GenomeView) : DEFAULT_VIEW;
}

export interface EventGenomePreview {
  readonly slug: PreviewSlug;
  readonly genome: UniversalEventGenome;
  readonly derivedStats: readonly MatchDerivedStat[];
  readonly trends: readonly TrendPassport[];
  readonly trials: readonly PredictionTrial[];
  readonly markets: readonly MarketBloomRecord[];
  readonly flightRecord: AuthorityFlightRecord;
  /** The meet across every authority layer — INFO_ONLY for fixtures, by construction. */
  readonly authorityCeiling: MaxPermittedStrength;
}

/**
 * Build the full preview for one fixture, entirely from the canonical engine. The flight record is a
 * thin presenter over `composeAuthority(FIXTURE_AUTHORITY)`, so the page's "what we're allowed to say"
 * is computed, not asserted by hand.
 */
export function buildEventGenomePreview(slug: PreviewSlug): EventGenomePreview {
  const key = FIXTURE_BY_SLUG[slug];
  const genome = EVENT_GENOME_FIXTURES[key];
  const id = genome.eventId;

  const flightRecord = buildFlightRecord({
    subject: `${genome.participants[0].name} vs ${genome.participants[1].name}`,
    requested: "PUBLIC_ACTION", // ask for the strongest claim, on purpose — so the cap is visible
    authority: FIXTURE_AUTHORITY,
    receiptRefs: [`event-genome:${id}`],
  });

  return {
    slug,
    genome,
    derivedStats: matchDerivedStats(genome),
    trends: buildAllTrendPassports().filter((t) => t.eventId === id),
    trials: buildAllPredictionTrials().filter((t) => t.matchId === id),
    markets: buildAllMarketBloomRecords().filter((m) => m.eventId === id),
    flightRecord,
    authorityCeiling: flightRecord.permittedExpression,
  };
}
