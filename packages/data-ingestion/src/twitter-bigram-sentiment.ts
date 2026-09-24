/**
 * Using Twitter to predict football outcomes
 *
 * arXiv:1411.1243v1 · lane:nlp · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Add an X/Twitter fan-sentiment feature family for predicting football outcomes: collect team-
 * mention tweets in the 72h pre-game window, extract top-k chi-square-selected bigrams per team
 * plus aggregate sentiment scores (with modern embeddings as a second representation), feed them
 * as auxiliary features into the GSE game-outcome model, then ablate LLM-extracted
 * injury/lineup/weather mentions to isolate whether the gain is sentiment or news leakage.
 *
 * ACCEPTANCE GATE: ADOPT as an auxiliary feature family if the combined model beats stats-only kappa by >=0.03 on
 * the time-ordered 2024 test; REJECT if sentiment features add nothing once market lines are
 * included (the real baseline -- the paper never tested against odds).
 *
 * Ingest role: connector interface + parser (X fan-sentiment feature family; no network here).
 * Live data: YES when wired (behind CONFIG.enabled=false default). This module is the pure offline-capable core: schemas, validation, normalization, feature math.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1411.1243v1" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT as an auxiliary feature family if the combined model beats stats-only kappa by >=0.03 on
 * the time-ordered 2024 test; REJECT if sentiment features add nothing once market lines are
 * included (the real baseline -- the paper never tested against odds).`;

export const CONFIG = {
  enabled: false,
  source: "x_api",
  windowHours: 72,
  topK: 500,
  kappaGainThreshold: 0.03,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TweetRow {
  readonly text: string;
  readonly team: string;
  readonly gameId: string;
  readonly createdAt: string;
  readonly label: 0 | 1;
}

export function isTweetRow(x: unknown): x is TweetRow {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["text"] === "string" &&
    typeof o["team"] === "string" &&
    typeof o["gameId"] === "string" &&
    typeof o["createdAt"] === "string" &&
    (o["label"] === 0 || o["label"] === 1)
  );
}

/** Keep rows inside the pre-game window (fail-closed: bad timestamps dropped). */
export function inPregameWindow(rows: readonly unknown[], kickoffMs: number, windowHours: number): TweetRow[] {
  const out: TweetRow[] = [];
  if (!isFiniteNumber(kickoffMs) || !isFiniteNumber(windowHours) || windowHours <= 0) return out;
  for (const r of rows) {
    if (!isTweetRow(r)) continue;
    const t = Date.parse(r.createdAt);
    if (!Number.isFinite(t)) continue;
    if (t <= kickoffMs && t >= kickoffMs - windowHours * 3600_000) out.push(r);
  }
  return out;
}

/** Lowercased alphanumeric bigrams from raw text. */
export function tokenizeBigrams(text: string): string[] {
  const toks = text.toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i + 1 < toks.length; i++) out.push(`${toks[i]}_${toks[i + 1]}`);
  return out;
}

/** Chi-square statistic for a 2x2 table [[a,b],[c,d]]. Null on degenerate. */
export function chiSquare(a: number, b: number, c: number, d: number): number | null {
  const cells = [a, b, c, d];
  if (!cells.every(isFiniteNumber) || cells.some((v) => v < 0)) return null;
  const n = a + b + c + d;
  if (n === 0) return null;
  const num = n * Math.pow(a * d - b * c, 2);
  const den = (a + b) * (c + d) * (a + c) * (b + d);
  if (den === 0) return null;
  return num / den;
}

/** Top-k chi-square bigrams per team (the paper's feature selection). */
export function selectTopKBigrams(rows: readonly TweetRow[], team: string, k: number): string[] {
  if (!isFiniteNumber(k) || k <= 0) return [];
  const counts = new Map<string, { a: number; b: number; c: number; d: number }>();
  for (const r of rows) {
    const isTeam = r.team === team;
    const grams = new Set(tokenizeBigrams(r.text));
    const seen = new Set<string>();
    for (const g of grams) {
      if (seen.has(g)) continue;
      seen.add(g);
      let e = counts.get(g);
      if (!e) {
        e = { a: 0, b: 0, c: 0, d: 0 };
        counts.set(g, e);
      }
      if (isTeam && r.label === 1) e.a++;
      else if (isTeam) e.b++;
      else if (r.label === 1) e.c++;
      else e.d++;
    }
  }
  const scored: Array<{ g: string; s: number }> = [];
  for (const [g, e] of counts) {
    const s = chiSquare(e.a, e.b, e.c, e.d);
    if (s !== null) scored.push({ g, s });
  }
  scored.sort((x, y) => y.s - x.s);
  return scored.slice(0, k).map((x) => x.g);
}

/** Aggregate sentiment score for a team window: (pos-neg)/(pos+neg+neu). */
export function aggregateSentiment(pos: number, neg: number, neu: number): number | null {
  if (![pos, neg, neu].every(isFiniteNumber) || pos < 0 || neg < 0 || neu < 0) return null;
  const n = pos + neg + neu;
  if (n === 0) return null;
  return (pos - neg) / n;
}
