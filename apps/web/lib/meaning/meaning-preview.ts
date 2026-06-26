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
  type ClaimObject,
  type ObjectType,
  type Lens,
} from "@sports/decision-field-runtime";

/** The instrument views — each groups one or more ObjectTypes (plus a dedicated lenses view). */
export const MEANING_VIEWS = [
  { value: "stats", label: "Stats", types: ["DERIVED_STAT", "MATCH_STAT"] as ObjectType[] },
  { value: "trends", label: "Trends", types: ["TREND"] as ObjectType[] },
  { value: "predictions", label: "Predictions", types: ["PREDICTION"] as ObjectType[] },
  { value: "markets", label: "Markets", types: ["MARKET_STATE", "ODDS_PRICE"] as ObjectType[] },
  { value: "bonuses", label: "Bonuses", types: ["BONUS", "BOOKMAKER_RATING"] as ObjectType[] },
  { value: "sources", label: "Sources", types: ["API_PROVIDER", "SOURCE_LINEAGE", "WEB_EVIDENCE"] as ObjectType[] },
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

export interface MeaningPreview {
  readonly corpus: readonly ClaimObject[];
  readonly view: MeaningView;
  readonly claims: readonly ClaimObject[]; // claims for the active view
  readonly lenses: readonly Lens[];
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
    counts: {
      total: corpus.length,
      infoOnly: corpus.filter((c) => c.publicExpression === "INFO_ONLY").length,
      refused: corpus.filter((c) => c.lifecycle === "DO_NOT_USE").length,
      types: typeSet.size,
    },
  };
}
