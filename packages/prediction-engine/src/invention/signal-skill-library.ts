/**
 * Lifelong signal skill library (Voyager-style) — arXiv 2305.16291v2
 * ("Voyager: An Open-Ended Embodied Agent with Large Language Models").
 *
 * ADDITIVE invention module (packages/prediction-engine/src/invention).
 * Memory substrate layered on the AI-Scientist discovery loop; LLM calls
 * stay outside the repo. Not wired into any production path.
 *
 * Paper mechanism: (1) skill library schema — vector store keyed by the
 * embedding of each verified signal's natural-language description, value
 * = executable backtest code + 2025-holdout metrics + journal entry; every
 * entry passes the discovery loop's gate before insertion, guarded by a
 * deterministic verifier (script re-runs the code, checks Delta-Brier >=
 * 0.002); (2) automatic curriculum — nightly review of library coverage
 * proposing the next discovery task of appropriate difficulty, with a
 * skill-graph of dependency edges letting the curriculum propose gap tasks
 * in lanes with no nodes; (3) iterative prompting with three feedback types
 * (backtest output, tracebacks, deterministic re-run gate), giving up
 * after 4 stuck rounds; (4) top-5 related signals injected into the idea
 * generator's prompt.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT if the with-library arm
 * discovers >=4 new gate-passing signals in 14 nights (vs <=2 no-library),
 * the verifier rejects >=95% of tasks that fail re-run, and top-5
 * retrieval is cited in >=50% of successful proposals; REJECT if
 * no-library matches within 25%, verifier precision < 90%, or the
 * curriculum proposes duplicate/covered tasks >30% of the time.
 */

export interface SkillEntry {
  readonly skillId: string;
  readonly description: string;
  readonly embedding: readonly number[];
  /** Executable backtest code (re-run by the deterministic verifier). */
  readonly code: string;
  readonly holdoutDeltaBrier: number;
  readonly journal: string;
  /** Lane: weather, special-teams, referee-crews, injuries, ... */
  readonly lane: string;
  /** Skill-graph dependency edges (skillIds this builds on). */
  readonly dependencies: ReadonlyArray<string>;
}

/** Cosine similarity between embeddings. */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

/** Top-k skill retrieval by description-embedding similarity. */
export function retrieveTopK(
  library: ReadonlyArray<SkillEntry>,
  queryEmbedding: readonly number[],
  k = 5,
): SkillEntry[] {
  return [...library]
    .map((s) => ({ s, sim: cosineSimilarity(s.embedding, queryEmbedding) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, Math.max(k, 0))
    .map((x) => x.s);
}

/**
 * Deterministic verifier: re-runs the skill's backtest code and checks
 * Delta-Brier >= 0.002. `reRun` is the harness's re-execution result.
 */
export function deterministicVerify(reRunDeltaBrier: number, gate = 0.002): boolean {
  return reRunDeltaBrier >= gate;
}

/**
 * Curriculum gap detection: lanes with zero skill nodes are proposed as
 * gap tasks (thin lanes: weather, special teams, referee crews).
 */
export function findCoverageGaps(
  library: ReadonlyArray<SkillEntry>,
  lanes: ReadonlyArray<string>,
): string[] {
  const covered = new Set(library.map((s) => s.lane));
  return lanes.filter((l) => !covered.has(l));
}

/**
 * Duplicate-task check: a proposed task duplicates coverage when its
 * embedding is within `threshold` cosine of an existing skill.
 */
export function isDuplicateTask(
  library: ReadonlyArray<SkillEntry>,
  taskEmbedding: readonly number[],
  threshold = 0.95,
): boolean {
  return library.some((s) => cosineSimilarity(s.embedding, taskEmbedding) >= threshold);
}

/** Give up after 4 stuck rounds (no progress on backtest/traceback/gate). */
export function shouldGiveUp(stuckRounds: number, maxStuck = 4): boolean {
  return stuckRounds >= maxStuck;
}

/**
 * Format the top-5 retrieved skills for injection into the idea
 * generator's prompt (description + journal lesson only — code stays in
 * the library to bound prompt size).
 */
export function formatSkillsForPrompt(skills: ReadonlyArray<SkillEntry>): string {
  return skills
    .map((s) => `[${s.skillId}] ${s.description}\nLesson: ${s.journal}`)
    .join("\n\n");
}
