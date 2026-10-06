/**
 * arXiv:2504.08747v1 — GridMind: A Multi-Agent NLP Framework for Unified, Cross-Modal NFL Data Insights
 *
 * GridMind conversational data layer: agent decomposition (planner, retriever, NL-to-SQL, synthesizer) with
 * parallel execution, query-result caching, deterministic executed-query eval, and a wordalisation head. No
 * code/data shipped by the paper — reference design only, disabled.
 *
 * Improvement: Build GSE's conversational data layer on the GridMind architecture (agent decomposition + RAG + NL-to-SQL + synthesis) as the reference design, closing its two admitted gaps with parallel agent execution plus query-result caching and a deterministic executed-query eval, and add the wordalisation synthesis head on top for the full ask-and-explain loop.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the architecture (agent decomposition + RAG + NL-to-SQL + synthesis) as GSE's conversational-layer reference design. Do not adopt GridMind itself — no code/data, vendor-locked metrics, 58% accuracy. Kill the fan-facing variant if the eval in §12 doesn't clear 85% accuracy.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** A decomposed sub-task in the agent plan. */
export interface SubTask {
  id: string;
  agent: "planner" | "retriever" | "nl2sql" | "synthesizer";
  dependsOn: readonly string[];
  query?: string;
}

/**
 * Topological execution order for parallel agent execution. Throws on cycles.
 * Independent sub-tasks share a level and may run in parallel.
 */
export function planLevels(tasks: readonly SubTask[]): string[][] {
  const done = new Set<string>();
  const remaining = new Map(tasks.map((t) => [t.id, t]));
  const levels: string[][] = [];
  while (remaining.size > 0) {
    const level: string[] = [];
    for (const [id, t] of remaining) {
      if (t.dependsOn.every((d) => done.has(d))) level.push(id);
    }
    if (level.length === 0) throw new Error("planLevels: dependency cycle");
    level.forEach((id) => { done.add(id); remaining.delete(id); });
    levels.push(level);
  }
  return levels;
}

/** Deterministic executed-query eval: exact row-set match after normalization. */
export function executedQueryScore(
  got: readonly (string | number)[][],
  want: readonly (string | number)[][],
): number {
  const norm = (rows: readonly (string | number)[][]) =>
    rows.map((r) => JSON.stringify(r)).sort().join("|");
  return norm(got) === norm(want) ? 1 : 0;
}

/** Cache key for a (question, sql) pair — enables the query-result cache. */
export function cacheKey(question: string, sql: string): string {
  const q = question.trim().toLowerCase().replace(/\s+/g, " ");
  return `${q}::${sql.trim().toLowerCase()}`;
}
