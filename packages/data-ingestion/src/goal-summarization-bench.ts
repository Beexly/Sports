/**
 * GOAL: Towards Benchmarking Few-Shot Sports Game Summarization
 *
 * arXiv:2207.08635 · lane:nlp · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Use GOAL (first English sports-summarization dataset) as the English transfer validation bed:
 * port the select->rewrite->fluency-MMR-rerank pipeline and the KES knowledge-fusion recipe to
 * GOAL's English soccer data — they must beat LED's ROUGE-L 24.3 on the GOAL test set before any
 * NFL application; replicate the semi-supervised self-training setup on the 2,160 unlabeled docs
 * (analog of training on unlabeled NFL text streams with a small hand-labeled set); use the key-
 * verb probing idea as a diagnostic for sports-domain familiarity in GSE content models.
 *
 * ACCEPTANCE GATE: ACCEPTED (ADAPT): first and only English sports-summarization dataset + four benchmark settings
 * defined + public release; as a benchmark and transfer testbed it is solid ADAPT material. NFL-
 * port gate: adapted pipeline beats LED's 24.3 ROUGE-L on the GOAL test set.
 *
 * Ingest role: schemas (few-shot sports summarization benchmark adapter: schema + ROUGE-lite + factuality).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2207.08635" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ACCEPTED (ADAPT): first and only English sports-summarization dataset + four benchmark settings
 * defined + public release; as a benchmark and transfer testbed it is solid ADAPT material. NFL-
 * port gate: adapted pipeline beats LED's 24.3 ROUGE-L on the GOAL test set.`;

export const CONFIG = {
  enabled: false,
  benchmark: "GOAL",
  shots: [1, 5, 10],
  metrics: ["rouge-lite", "factuality"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface GameSummary {
  readonly gameId: string;
  readonly summary: string;
  readonly reference: string;
  readonly facts: readonly string[];
}

export function isGameSummary(x: unknown): x is GameSummary {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["gameId"] === "string" &&
    typeof o["summary"] === "string" &&
    typeof o["reference"] === "string" &&
    Array.isArray(o["facts"]) && (o["facts"] as unknown[]).every((f) => typeof f === "string")
  );
}

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** ROUGE-1-lite F1. */
export function rouge1Lite(candidate: string, reference: string): number | null {
  if (typeof candidate !== "string" || typeof reference !== "string") return null;
  const c = tokens(candidate);
  const r = tokens(reference);
  if (c.length === 0 || r.length === 0) return null;
  const rCounts = new Map<string, number>();
  for (const t of r) rCounts.set(t, (rCounts.get(t) ?? 0) + 1);
  let overlap = 0;
  for (const t of c) {
    const n = rCounts.get(t) ?? 0;
    if (n > 0) {
      overlap++;
      rCounts.set(t, n - 1);
    }
  }
  const p = overlap / c.length;
  const rec = overlap / r.length;
  if (p + rec === 0) return 0;
  return (2 * p * rec) / (p + rec);
}

/** ROUGE-2-lite F1 (bigram). */
export function rouge2Lite(candidate: string, reference: string): number | null {
  const bigrams = (s: string): string[] => {
    const t = tokens(s);
    const out: string[] = [];
    for (let i = 0; i + 1 < t.length; i++) out.push(`${t[i]} ${t[i + 1]}`);
    return out;
  };
  const c = bigrams(candidate);
  const r = bigrams(reference);
  if (c.length === 0 || r.length === 0) return null;
  const rCounts = new Map<string, number>();
  for (const b of r) rCounts.set(b, (rCounts.get(b) ?? 0) + 1);
  let overlap = 0;
  for (const b of c) {
    const n = rCounts.get(b) ?? 0;
    if (n > 0) {
      overlap++;
      rCounts.set(b, n - 1);
    }
  }
  const p = overlap / c.length;
  const rec = overlap / r.length;
  if (p + rec === 0) return 0;
  return (2 * p * rec) / (p + rec);
}

/** Factuality: share of claimed facts present in the reference. */
export function factuality(summary: unknown): number | null {
  if (!isGameSummary(summary)) return null;
  if (summary.facts.length === 0) return null;
  const ref = summary.reference.toLowerCase();
  const hit = summary.facts.filter((f) => ref.includes(f.toLowerCase())).length;
  return hit / summary.facts.length;
}
