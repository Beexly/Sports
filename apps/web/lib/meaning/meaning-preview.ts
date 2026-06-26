/**
 * Meaning Compiler preview — the pure, DB-free assembly behind /meaning/preview.
 *
 * Mirrors the proven N6 pattern (buildEventGenomePreview): import only the canonical engine, run
 * compileAllFixtures(), group the corpus into instrument-grade views, and expose a ?view= param. No DB,
 * no network, no clock — safe under the Prisma ENVIRONMENT_BLOCK. On fixture data every claim is capped
 * at INFO_ONLY, so the preview can never read as a live call.
 */

import {
  compileAllFixtures,
  allLenses,
  computeChronosLags,
  CHRONOS_FIXTURE,
  buildAllHighlightPassports,
  buildAllPublicObserverRecords,
  googleVisibilityIndex,
  knowledgeGraphCoverage,
  serpSportsConfidence,
  type ClaimObject,
  type ObjectType,
  type Lens,
  type ChronosRecord,
  type PublicConsensusLagReport,
  type HighlightPassport,
} from "@sports/decision-field-runtime";
import {
  extractKgEntities,
  createEntityCandidateFromGoogleSports,
  linkProviderEntityToGseEntity,
  crossVerifyEntity,
  SERPAPI_FIXTURE_SOCCER_LIVE,
  type EntityPassport,
} from "@sports/data-intelligence";

/** The instrument views — each groups one or more ObjectTypes (plus dedicated lenses + observer views). */
export const MEANING_VIEWS = [
  { value: "stats", label: "Stats", types: ["DERIVED_STAT", "MATCH_STAT"] as ObjectType[] },
  { value: "trends", label: "Trends", types: ["TREND"] as ObjectType[] },
  { value: "predictions", label: "Predictions", types: ["PREDICTION"] as ObjectType[] },
  { value: "markets", label: "Markets", types: ["MARKET_STATE", "ODDS_PRICE"] as ObjectType[] },
  { value: "bonuses", label: "Bonuses", types: ["BONUS", "BOOKMAKER_RATING"] as ObjectType[] },
  { value: "sources", label: "Sources", types: ["API_PROVIDER", "SOURCE_LINEAGE", "WEB_EVIDENCE"] as ObjectType[] },
  { value: "observers", label: "Public Observers", types: ["PUBLIC_OBSERVER_RESULT"] as ObjectType[] },
  { value: "alerts", label: "Alerts", types: ["ALERT"] as ObjectType[] },
  { value: "lenses", label: "Lenses", types: [] as ObjectType[] },
] as const;

export type MeaningView = (typeof MEANING_VIEWS)[number]["value"];
export const DEFAULT_MEANING_VIEW: MeaningView = "stats";

export function resolveMeaningView(raw: string | undefined): MeaningView {
  return MEANING_VIEWS.some((v) => v.value === raw) ? (raw as MeaningView) : DEFAULT_MEANING_VIEW;
}

/** The seven organs, for the anatomy panel (static — Da Vinci's law made visible). */
export const ORGANS: ReadonlyArray<{ organ: string; role: string; engine: string }> = [
  { organ: "Skeleton", role: "identity — what am I", engine: "claimObjectId · objectType" },
  { organ: "Blood", role: "source — where from", engine: "SourceLineage ← SourceGenome" },
  { organ: "Nervous system", role: "time — when knowable", engine: "TimeEnvelope ← knowableAt" },
  { organ: "Spine", role: "authority — how loud", engine: "composeAuthority (8 layers)" },
  { organ: "Muscle", role: "decision — what changes", engine: "DecisionEnvelope ← DecisionState" },
  { organ: "Skin", role: "meaning — public copy", engine: "SemanticEnvelope ← FactType" },
  { organ: "Immune system", role: "rights + risk", engine: "RightsEnvelope · RiskEnvelope" },
  { organ: "Memory", role: "autopsy — after the result", engine: "autopsyHook → five-ledgers" },
];

export const PIPELINE: ReadonlyArray<{ n: string; stage: string; out: string }> = [
  { n: "1", stage: "Observation", out: "raw" },
  { n: "2", stage: "Source passport", out: "lineage" },
  { n: "3", stage: "Rights envelope", out: "permission" },
  { n: "4", stage: "Time envelope", out: "knowability" },
  { n: "5", stage: "Semantic meaning", out: "what it says" },
  { n: "6", stage: "Decision effect", out: "what it changes" },
  { n: "7", stage: "Authority ceiling", out: "the meet" },
  { n: "8", stage: "Public expression", out: "INFO_ONLY" },
  { n: "9", stage: "Autopsy hook", out: "how it settles" },
  { n: "10", stage: "Memory update", out: "the ledger" },
];

// ── The Public Observer Arena (Addendum III): what dominant discovery systems SHOW the public ──
//
// SerpApi / Google Sports is one observer in the arena — never official truth. The arena makes its
// three sub-instruments visible: the Chronos clock chain (how late the public scoreboard is), the
// Entity Passport ladder (a kgmid anchors identity, not current truth), and rights-gated Highlights
// (discovery is never ownership). All deterministic, fixture-only.

/** One stop on the Chronos clock chain — event → official source → market → public observer → GSE. */
export interface ChronosStop {
  readonly key: keyof Omit<ChronosRecord, "eventId">;
  readonly label: string;
  readonly clockSec: number | null;
}

export interface ObserverStat {
  readonly observerId: string;
  readonly subject: string;
  readonly resultType: string;
  readonly visibility: number; // Google Visibility Index 0..1
  readonly kgCoverage: number; // Knowledge Graph Coverage 0..1
  readonly confidence: number; // SERP Sports Confidence 0..1
  readonly canSettle: false;
  readonly authorityCeiling: string;
}

export interface ObserverArena {
  readonly lag: PublicConsensusLagReport;
  readonly clockChain: readonly ChronosStop[];
  readonly stats: readonly ObserverStat[];
  readonly entities: readonly EntityPassport[];
  readonly highlights: readonly HighlightPassport[];
}

const CHRONOS_STOPS: ReadonlyArray<{ key: ChronosStop["key"]; label: string }> = [
  { key: "eventClockSec", label: "event happened" },
  { key: "sourceClockSec", label: "official source" },
  { key: "marketClockSec", label: "market moved" },
  { key: "publicObserverClockSec", label: "public observer (Google) shown" },
  { key: "gseClockSec", label: "GSE compiled" },
];

/**
 * Assemble the Observer Arena. The entity ladder is demonstrated end to end — a kgmid creates a
 * DISCOVERED candidate, a provider id advances it to ALIAS_ONLY, and only cross-verification reaches
 * CANONICAL — so the preview SHOWS that identity discovery is not current-truth verification.
 */
export function buildObserverArena(): ObserverArena {
  const lag = computeChronosLags(CHRONOS_FIXTURE);
  const clockChain: ChronosStop[] = CHRONOS_STOPS.map((s) => ({ ...s, clockSec: CHRONOS_FIXTURE[s.key] }));

  const stats: ObserverStat[] = buildAllPublicObserverRecords().map((r) => ({
    observerId: r.observerId,
    subject: r.subject,
    resultType: r.resultType,
    visibility: googleVisibilityIndex(r),
    kgCoverage: knowledgeGraphCoverage(r),
    confidence: serpSportsConfidence(r),
    canSettle: false,
    authorityCeiling: r.authorityCeiling,
  }));

  // Entity ladder from the soccer fixture's kgmids — discovered, then linked, then cross-verified.
  const kg = extractKgEntities(SERPAPI_FIXTURE_SOCCER_LIVE);
  const ctx = { sport: "soccer", league: "FIFA World Cup" } as const;
  const candidates = kg.map((e) => createEntityCandidateFromGoogleSports(e, ctx));
  const entities: EntityPassport[] = candidates.map((p, i) => {
    if (i === 0) return crossVerifyEntity(linkProviderEntityToGseEntity(p, "the-odds-api", "GER", `${p.canonicalName} NT`), { officialName: p.canonicalName, lastVerifiedAt: "fixture" });
    if (i === 1) return linkProviderEntityToGseEntity(p, "the-odds-api", "ECU", `${p.canonicalName} NT`);
    return p; // remaining stay DISCOVERED — a kgmid alone is identity, not current truth
  });

  return { lag, clockChain, stats, entities, highlights: buildAllHighlightPassports() };
}

export interface MeaningPreview {
  readonly corpus: readonly ClaimObject[];
  readonly view: MeaningView;
  readonly claims: readonly ClaimObject[]; // claims for the active view
  readonly lenses: readonly Lens[];
  readonly observer: ObserverArena;
  readonly counts: { readonly total: number; readonly infoOnly: number; readonly refused: number; readonly types: number };
}

export function buildMeaningPreview(view: MeaningView): MeaningPreview {
  const corpus = compileAllFixtures();
  const def = MEANING_VIEWS.find((v) => v.value === view) ?? MEANING_VIEWS[0];
  const claims = view === "lenses" ? [] : corpus.filter((c) => def.types.includes(c.objectType));
  const typeSet = new Set(corpus.map((c) => c.objectType));
  return {
    corpus,
    view,
    claims,
    lenses: allLenses(corpus),
    observer: buildObserverArena(),
    counts: {
      total: corpus.length,
      infoOnly: corpus.filter((c) => c.publicExpression === "INFO_ONLY").length,
      refused: corpus.filter((c) => c.lifecycle === "DO_NOT_USE").length,
      types: typeSet.size,
    },
  };
}
