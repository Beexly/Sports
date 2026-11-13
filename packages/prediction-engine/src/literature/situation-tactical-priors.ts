/**
 * @file situation-tactical-priors.ts
 * Bounded situational/tactical log-odds priors from the literature corpus.
 *
 * Reads the football situation triples (lit.situation, domains offense /
 * defense / special_teams / situational / personnel) and the sports-tagged
 * book statements (lit.corpus_statement) that match a game's situation —
 * down, distance, field zone, personnel, script — and turns them into a
 * SMALL, bounded log-odds prior meant to be applied PRE-FWL (before the
 * engine's Frisch-Waugh-Lovell residualisation), never after.
 *
 * LAWS
 * ----
 * 1. BOUNDED. Every prior lies in [-PRIOR_BOUND, +PRIOR_BOUND] =
 *    [-0.025, +0.025] log-odds. The bound is structural (tanh), not a clamp
 *    after the fact: no evidence volume can push a prior past it.
 * 2. NO EVIDENCE, ZERO PRIOR. An empty or failed lookup yields exactly 0.
 *    There is no default prior, no "typical" adjustment, no invention.
 * 3. EVERY prior carries its evidence: each contributing row keeps a
 *    verbatim evidence_quote of at least MIN_EVIDENCE_QUOTE_CHARS (20)
 *    characters from the source row. Rows without a long enough quote are
 *    dropped, not truncated into fake evidence.
 * 4. LAYER_TRUST weights the layers: situation 0.85 (model-extracted triples
 *    with verbatim quotes), statement 0.65 (verbatim book text), chunk 0.55
 *    (raw passages matched by vector). These are the PRIOR trust weights —
 *    distinct from corpus-grounding's evidence-weight trust.
 * 5. SHRINK. The prior is multiplied by shrink(support) = 0.65 + 0.35*support
 *    where support in [0,1] grows with the evidence count (full support at
 *    SUPPORT_TARGET rows). Few rows => the prior shrinks toward its floor;
 *    zero rows => the prior is zero regardless.
 * 6. READ-ONLY. No writes, no probability published here. Direction comes
 *    from a fixed lexical cue list over the source text — deterministic and
 *    auditable, never a model guess.
 */
import type { SqlClient } from "./literature-retrieval.js";
import {
  contentTerms,
  isRelevant,
  isSyntheticSelfLabel,
  normaliseSimilarity,
  SYNTHETIC_DOWNWEIGHT,
  termCoverage,
  type EvidenceLayer,
} from "./corpus-grounding.js";

/** Hard bound on any single prior, in log-odds. */
export const PRIOR_BOUND = 0.025;

/** Trust per layer for PRIORS (see law 4). */
export const LAYER_TRUST: Readonly<Record<EvidenceLayer, number>> = {
  situation: 0.85,
  statement: 0.65,
  chunk: 0.55,
};

/** Shrink floor: even fully-supported evidence keeps only a bounded voice. */
export const SHRINK_FLOOR = 0.65;

/** Evidence rows needed for full support (support = count / target, capped 1). */
export const SUPPORT_TARGET = 5;

/** Minimum verbatim quote length for a row to count as evidence. */
export const MIN_EVIDENCE_QUOTE_CHARS = 20;

/** Default rows fetched per layer. */
export const DEFAULT_PRIOR_PER_LAYER_K = 8;

/** The football domains in lit.situation (1547 triples at time of writing). */
export const FOOTBALL_SITUATION_DOMAINS = [
  "offense",
  "defense",
  "special_teams",
  "situational",
  "personnel",
] as const;

export type TacticalFieldZone =
  | "red_zone"
  | "goal_to_go"
  | "plus"
  | "midfield"
  | "backed_up"
  | "neutral";

export type TacticalScript =
  | "leading"
  | "trailing"
  | "tied"
  | "two_minute"
  | "short_week"
  | "comeback";

/** The observable game situation a prior is asked about. All fields optional. */
export interface TacticalSituation {
  /** Down: 1..4. */
  readonly down?: number | null;
  /** Yards to go. */
  readonly distance?: number | null;
  /** Field position 0..100, 100 = opponent goal line (offense perspective). */
  readonly yardLine?: number | null;
  /** Explicit zone; derived from yardLine when absent. */
  readonly fieldZone?: TacticalFieldZone | null;
  /** Personnel grouping, e.g. "11", "12", "21". */
  readonly personnel?: string | null;
  /** Game script. */
  readonly script?: TacticalScript | null;
  /** Any extra situation words the caller knows matter. */
  readonly extraTerms?: readonly string[];
}

export interface PriorEvidence {
  readonly layer: EvidenceLayer;
  readonly citation: string;
  /** Verbatim source quote, >= MIN_EVIDENCE_QUOTE_CHARS characters. */
  readonly evidence_quote: string;
  /** Lexical direction cue: +1 helps the offense, -1 hurts, 0 no cue. */
  readonly direction: -1 | 0 | 1;
  /** Term coverage of the situation query against the source text, [0,1]. */
  readonly relevance: number;
  readonly trust: number;
  /** trust * relevance * direction — this row's addend to the raw prior. */
  readonly contribution: number;
}

export interface TacticalPrior {
  readonly situationKey: string;
  readonly query: string;
  /** The bounded prior, in [-PRIOR_BOUND, +PRIOR_BOUND]. 0 when no evidence. */
  readonly logOddsPrior: number;
  /** Pre-bound, pre-shrink sum of contributions (audit only). */
  readonly rawLogOdds: number;
  /** Evidence-count support in [0,1]. */
  readonly support: number;
  readonly evidenceCount: number;
  readonly shrink: number;
  readonly evidence: readonly PriorEvidence[];
}

export interface TacticalPriorResult {
  readonly prior: TacticalPrior;
  readonly layerErrors: readonly string[];
  readonly latencyMs: number;
}

/** Optional chunk evidence (e.g. from groundFacet) folded in at chunk trust. */
export interface ChunkEvidenceInput {
  readonly corpus_key: string;
  readonly chunk_index: number;
  readonly title?: string | null;
  readonly chunk_text: string;
  readonly similarity: number;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/** support = evidence count, normalised to [0,1] (full at SUPPORT_TARGET). */
export function supportFromCount(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return clamp01(count / SUPPORT_TARGET);
}

/** shrink(support) = 0.65 + 0.35 * support, support in [0,1]. */
export function shrinkFactor(support: number): number {
  return SHRINK_FLOOR + (1 - SHRINK_FLOOR) * clamp01(support);
}

/** Structural bound: tanh keeps |result| < PRIOR_BOUND for any finite raw. */
export function boundPrior(raw: number): number {
  if (!Number.isFinite(raw) || raw === 0) return 0;
  return PRIOR_BOUND * Math.tanh(raw);
}

const POSITIVE_CUES = [
  "increase", "increases", "increased", "improve", "improves", "improved",
  "gain", "gains", "advantage", "favors", "favorable", "success", "successful",
  "effective", "efficient", "higher", "boost", "convert", "converts", "converted",
  "score", "scores", "scoring", "win", "wins", "exploit", "exploits",
  "create", "creates", "generates", "maximize", "better",
];
const NEGATIVE_CUES = [
  "decrease", "decreases", "decreased", "reduce", "reduces", "reduced",
  "hurt", "hurts", "fail", "fails", "failed", "failure", "turnover", "turnovers",
  "penalty", "penalties", "avoid", "avoids", "lower", "worse", "risk", "risky",
  "stuffed", "sack", "sacks", "sacked", "incomplete", "punt", "punts",
  "stop", "stops", "stopped", "negative", "lose", "loses", "conservative",
];
const POS_RE = new RegExp(`\\b(?:${POSITIVE_CUES.join("|")})\\b`, "gi");
const NEG_RE = new RegExp(`\\b(?:${NEGATIVE_CUES.join("|")})\\b`, "gi");

/**
 * Deterministic direction cue from source text: +1 when positive outcome
 * words outnumber negative ones, -1 for the reverse, 0 for a tie or silence.
 * This is a lexical heuristic over the corpus's own words — auditable, and
 * bounded by construction regardless of its accuracy.
 */
export function directionOf(text: string): -1 | 0 | 1 {
  const pos = (text.match(POS_RE) ?? []).length;
  const neg = (text.match(NEG_RE) ?? []).length;
  if (pos > neg) return 1;
  if (neg > pos) return -1;
  return 0;
}

/** Stable canonical key for a situation (same fields => same key). */
export function tacticalSituationKey(s: TacticalSituation): string {
  const zone = s.fieldZone ?? zoneFromYardLine(s.yardLine ?? null);
  return [
    `d${s.down ?? "-"}`,
    `dist${s.distance ?? "-"}`,
    `yl${s.yardLine ?? "-"}`,
    `z${zone ?? "-"}`,
    `p${(s.personnel ?? "-").toString().trim() || "-"}`,
    `s${s.script ?? "-"}`,
    `x${[...(s.extraTerms ?? [])].map((t) => t.toLowerCase().trim()).filter(Boolean).sort().join(",")}`,
  ].join("|");
}

function zoneFromYardLine(yardLine: number | null): TacticalFieldZone | null {
  if (yardLine === null || !Number.isFinite(yardLine)) return null;
  if (yardLine >= 80) return "red_zone";
  if (yardLine <= 20) return "backed_up";
  if (yardLine >= 40 && yardLine <= 60) return "midfield";
  return "neutral";
}

const DOWN_TERMS: Record<number, readonly string[]> = {
  1: ["first", "down"],
  2: ["second", "down"],
  3: ["third", "down"],
  4: ["fourth", "4th", "down"],
};
const ZONE_TERMS: Record<TacticalFieldZone, readonly string[]> = {
  red_zone: ["red", "zone"],
  goal_to_go: ["goal", "line"],
  plus: ["plus", "territory"],
  midfield: ["midfield"],
  backed_up: ["backed", "deep", "own"],
  neutral: [],
};
const SCRIPT_TERMS: Record<TacticalScript, readonly string[]> = {
  leading: ["leading", "protecting", "lead", "clock"],
  trailing: ["trailing", "behind", "comeback"],
  tied: ["tied", "close", "tie"],
  two_minute: ["two-minute", "hurry", "late", "clock"],
  short_week: ["short", "week", "rest", "fatigue"],
  comeback: ["comeback", "trailing", "late"],
};

/** The content words a situation asks the corpus about. Empty => no lookup. */
export function situationQueryTerms(s: TacticalSituation): string[] {
  const terms: string[] = [];
  if (s.down != null && DOWN_TERMS[s.down]) terms.push(...DOWN_TERMS[s.down]!);
  if (s.distance != null && Number.isFinite(s.distance)) {
    terms.push(...(s.distance <= 2 ? ["short", "yardage"] : s.distance >= 7 ? ["long", "yardage"] : ["medium", "yardage"]));
    terms.push("yards");
  }
  const zone = s.fieldZone ?? zoneFromYardLine(s.yardLine ?? null);
  if (zone) terms.push(...ZONE_TERMS[zone]);
  const personnel = s.personnel != null ? String(s.personnel).trim() : "";
  if (personnel) terms.push("personnel", personnel);
  if (s.script != null && SCRIPT_TERMS[s.script]) terms.push(...SCRIPT_TERMS[s.script]!);
  if (s.extraTerms?.length) terms.push(...s.extraTerms);
  const out = contentTerms(terms.join(" "));
  // Personnel groupings ("11", "12", "21") are 2 chars and would be dropped by
  // the content-word filter, but they are the point of a personnel query.
  if (/^\d{1,2}$/.test(personnel) && !out.includes(personnel)) out.push(personnel);
  return out;
}

const PRIOR_SITUATION_SQL = `
  SELECT corpus_key, chunk_index, domain, situation, decision, lesson, evidence_quote,
         ts_rank_cd(to_tsvector('english', situation || ' ' || decision || ' ' || lesson),
                    websearch_to_tsquery('english', $1)) AS rank
    FROM lit.situation
   WHERE domain IN ('offense','defense','special_teams','situational','personnel')
     AND to_tsvector('english', situation || ' ' || decision || ' ' || lesson)
         @@ websearch_to_tsquery('english', $1)
     AND evidence_quote IS NOT NULL
     AND length(trim(evidence_quote)) >= ${MIN_EVIDENCE_QUOTE_CHARS}
   ORDER BY rank DESC
   LIMIT $2`;

const PRIOR_STATEMENT_SQL = `
  SELECT book, page, md5, statement, situation, domain_tags,
         ts_rank_cd(to_tsvector('english', statement || ' ' || coalesce(situation, '')),
                    websearch_to_tsquery('english', $1)) AS rank
    FROM lit.corpus_statement
   WHERE domain_tags && ARRAY['sports']::text[]
     AND to_tsvector('english', statement || ' ' || coalesce(situation, ''))
         @@ websearch_to_tsquery('english', $1)
     AND statement IS NOT NULL
     AND length(trim(statement)) >= ${MIN_EVIDENCE_QUOTE_CHARS}
   ORDER BY rank DESC
   LIMIT $2`;

interface PriorSituationRow {
  corpus_key: string;
  chunk_index: number;
  domain: string | null;
  situation: string;
  decision: string;
  lesson: string;
  evidence_quote: string;
  rank: number;
}

interface PriorStatementRow {
  book: string | null;
  page: number | null;
  md5: string | null;
  statement: string;
  situation: string | null;
  domain_tags: string[] | null;
  rank: number;
}

/** A quote must be verbatim and long enough; otherwise the row is not evidence. */
function usableQuote(raw: string | null | undefined): string | null {
  const q = (raw ?? "").replace(/\s+/g, " ").trim();
  return q.length >= MIN_EVIDENCE_QUOTE_CHARS ? q : null;
}

function makeEvidence(
  layer: EvidenceLayer,
  citation: string,
  quote: string,
  directionText: string,
  relevance: number,
): PriorEvidence {
  const trust = LAYER_TRUST[layer];
  const direction = directionOf(directionText);
  const rel = clamp01(relevance);
  return {
    layer,
    citation,
    evidence_quote: quote,
    direction,
    relevance: rel,
    trust,
    contribution: Number((trust * rel * direction).toFixed(6)),
  };
}

/**
 * Pure prior computation over already-gathered evidence. Exported so the
 * bounds/shrink/trust contract can be tested without a database.
 */
export function computeTacticalPrior(
  situationKey: string,
  query: string,
  evidence: readonly PriorEvidence[],
): TacticalPrior {
  // Defence in depth: a row without a real quote never reaches the prior.
  const rows = evidence.filter((e) => e.evidence_quote.trim().length >= MIN_EVIDENCE_QUOTE_CHARS);
  const evidenceCount = rows.length;
  const support = supportFromCount(evidenceCount);
  const shrink = shrinkFactor(support);
  const raw = rows.reduce((s, e) => s + e.contribution, 0);
  const logOddsPrior = evidenceCount === 0 ? 0 : Number((boundPrior(raw) * shrink).toFixed(6));
  return {
    situationKey,
    query,
    logOddsPrior,
    rawLogOdds: Number(raw.toFixed(6)),
    support,
    evidenceCount,
    shrink: Number(shrink.toFixed(6)),
    evidence: rows,
  };
}

/**
 * Read the corpus for one game situation and produce its bounded prior.
 * No evidence (or a total lookup failure) => logOddsPrior exactly 0.
 */
export async function situationTacticalPriors(
  db: SqlClient,
  situation: TacticalSituation,
  opts?: {
    readonly perLayerK?: number;
    readonly chunkEvidence?: readonly ChunkEvidenceInput[];
  },
): Promise<TacticalPriorResult> {
  const started = Date.now();
  const situationKey = tacticalSituationKey(situation);
  const terms = situationQueryTerms(situation);
  const query = terms.join(" ");
  const layerErrors: string[] = [];
  const evidence: PriorEvidence[] = [];

  if (!query) {
    // Nothing was asked; nothing is claimed. Zero prior, no DB call.
    return {
      prior: computeTacticalPrior(situationKey, "", []),
      layerErrors,
      latencyMs: Date.now() - started,
    };
  }

  const k = opts?.perLayerK ?? DEFAULT_PRIOR_PER_LAYER_K;
  // Build the websearch OR query from the terms directly (toOrQuery would
  // re-filter and drop 2-char personnel codes like "11").
  const orQuery = terms.join(" or ");
  const [sitRes, stmtRes] = await Promise.allSettled([
    db.query(PRIOR_SITUATION_SQL, [orQuery, k]),
    db.query(PRIOR_STATEMENT_SQL, [orQuery, k]),
  ]);

  try {
    if (sitRes.status === "rejected") throw sitRes.reason;
    for (const r of sitRes.value.rows as PriorSituationRow[]) {
      const quote = usableQuote(r.evidence_quote);
      if (!quote) continue;
      const sitText = `${r.situation} ${r.decision} ${r.lesson}`;
      if (!isRelevant(query, sitText)) continue;
      const relevance = Math.max(0.4, termCoverage(query, sitText));
      evidence.push(
        makeEvidence(
          "situation",
          `lit.situation:${r.corpus_key.slice(0, 12)}#${r.chunk_index}`,
          quote,
          `${r.decision} ${r.lesson}`,
          relevance,
        ),
      );
    }
  } catch (e) {
    layerErrors.push(`situation: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    if (stmtRes.status === "rejected") throw stmtRes.reason;
    for (const r of stmtRes.value.rows as PriorStatementRow[]) {
      const quote = usableQuote(r.statement);
      if (!quote) continue;
      const stmtText = `${r.statement} ${r.situation ?? ""}`;
      if (!isRelevant(query, stmtText)) continue;
      const relevance = Math.max(0.4, termCoverage(query, stmtText));
      evidence.push(
        makeEvidence(
          "statement",
          `lit.corpus_statement:${(r.md5 ?? "?").slice(0, 12)}p${r.page ?? "?"}`,
          quote,
          stmtText,
          relevance,
        ),
      );
    }
  } catch (e) {
    layerErrors.push(`statement: ${e instanceof Error ? e.message : String(e)}`);
  }

  for (const c of opts?.chunkEvidence ?? []) {
    const quote = usableQuote(c.chunk_text);
    if (!quote) continue;
    const relevance = normaliseSimilarity(Number(c.similarity));
    if (relevance <= 0) continue;
    const text = `${c.title ?? ""} ${c.chunk_text}`;
    if (!isRelevant(query, text)) continue;
    const e = makeEvidence(
      "chunk",
      `lit.corpus_chunk:${c.corpus_key.slice(0, 12)}#${c.chunk_index}`,
      quote,
      text,
      relevance,
    );
    // Same law as corpus grounding: synthetic/prototype scaffolding is 0.25x.
    evidence.push(
      isSyntheticSelfLabel(c.title, c.chunk_text)
        ? { ...e, contribution: Number((e.contribution * SYNTHETIC_DOWNWEIGHT).toFixed(6)) }
        : e,
    );
  }

  return {
    prior: computeTacticalPrior(situationKey, query, evidence),
    layerErrors,
    latencyMs: Date.now() - started,
  };
}

/**
 * Apply priors PRE-FWL: add their bounded sum to the base log-odds BEFORE
 * residualisation. The combined adjustment is itself bounded to
 * [-PRIOR_BOUND, +PRIOR_BOUND] so stacking situations cannot amplify the
 * literature's voice past a single prior's ceiling.
 */
export function applyPriorsPreFwl(baseLogOdds: number, priors: readonly TacticalPrior[]): number {
  const sum = priors.reduce((s, p) => s + p.logOddsPrior, 0);
  const bounded = Math.max(-PRIOR_BOUND, Math.min(PRIOR_BOUND, sum));
  return baseLogOdds + bounded;
}