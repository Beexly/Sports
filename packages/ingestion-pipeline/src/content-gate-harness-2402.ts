/**
 * LLM content gate: SportQA eval harness schema + accuracy aggregation
 *
 * Research port: arXiv:2402.15862
 * Normalized lane: nlp | Doctrine: SITUATIONAL
 *
 * Eval harness for the GSE LLM content gate: SportQA question schema (American-football L2/L3 subsets + all-sports scenario L3 for generalization), candidate-model answer records, and accuracy aggregation per level. Content-QC only; a failing model never touches published content.
 *
 * ACCEPTANCE GATE: ADAPT only if (a) the SportQA repo is downloadable and >=1,000 L2 + >=200 L3 football questions parse cleanly, AND (b) at least one candidate model clears the pre-registered accuracy bar. Live-data gate -> GSE_CONTENT_GATE_ENABLED flag (default false).
 */

export type SportQaLevel = "L1" | "L2" | "L3";

export interface SportQaQuestion {
  id: string;
  sport: string;
  level: SportQaLevel;
  scenario: boolean;
  prompt: string;
  answer: string;
}

export interface ModelAnswer {
  questionId: string;
  model: string;
  answer: string;
  correct: boolean;
}

export const MIN_L2_FOOTBALL = 1000;
export const MIN_L3_FOOTBALL = 200;

/** Validate the extracted SportQA subsets meet the parse gate. */
export function parseGate(questions: SportQaQuestion[]): { ok: boolean; l2Football: number; l3Football: number } {
  const l2 = questions.filter((q) => q.sport === "american_football" && q.level === "L2").length;
  const l3 = questions.filter((q) => q.sport === "american_football" && q.level === "L3").length;
  return { ok: l2 >= MIN_L2_FOOTBALL && l3 >= MIN_L3_FOOTBALL, l2Football: l2, l3Football: l3 };
}

/** Per-level accuracy for one candidate model. */
export function accuracyByLevel(
  questions: SportQaQuestion[],
  answers: ModelAnswer[],
  model: string,
): Record<SportQaLevel, number> {
  const byQ = new Map(questions.map((q) => [q.id, q]));
  const buckets: Record<SportQaLevel, { hit: number; n: number }> = {
    L1: { hit: 0, n: 0 }, L2: { hit: 0, n: 0 }, L3: { hit: 0, n: 0 },
  };
  for (const a of answers) {
    if (a.model !== model) continue;
    const q = byQ.get(a.questionId);
    if (!q) continue;
    buckets[q.level].n++;
    if (a.correct) buckets[q.level].hit++;
  }
  return {
    L1: buckets.L1.n === 0 ? 0 : buckets.L1.hit / buckets.L1.n,
    L2: buckets.L2.n === 0 ? 0 : buckets.L2.hit / buckets.L2.n,
    L3: buckets.L3.n === 0 ? 0 : buckets.L3.hit / buckets.L3.n,
  };
}

/** Live-data gate: parse counts + a model clearing the accuracy bar. */
export const GSE_CONTENT_GATE_ENABLED = false;

