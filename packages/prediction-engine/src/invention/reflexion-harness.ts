/**
 * Reflexion harness: Actor-Evaluator-Self-Reflection triad — arXiv 2303.11366v4
 * ("Reflexion: Language Agents with Verbal Reinforcement Learning").
 *
 * ADDITIVE invention module (packages/prediction-engine/src/invention).
 * Memory substrate for the AI-Scientist discovery loop; the LLM calls
 * themselves stay outside the repo. Not wired into any production path.
 *
 * Paper mechanism: Actor = code-writing agent editing the backtest
 * template; Evaluator = deterministic backtest returning binary/scalar
 * signal plus structured diagnostics (which season folds failed, sample
 * sizes, calibration slope); Self-Reflection = 3-5 sentence lessons into a
 * bounded memory (Omega=3) retrieved by embedding similarity, with
 * reflection consolidation every 5 trials distilling stored reflections
 * into one durable doctrine entry while raw reflections expire. The
 * permutation-based evaluator-reliability check flips the feature's sign /
 * permutes the target: if the "signal" persists, the backtest is leaky.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT if reflection arm resolves
 * >=6/10 ideas within 12 trials vs <=3/10 retry-only, mean trials-to-pass
 * lower, and the permutation check flags >=80% of deliberately injected
 * leaky backtests; REJECT if retry-only matches within 1 idea, the
 * Table-3 pathology appears, or reflections duplicate (cosine > 0.9).
 */

export interface Reflection {
  readonly ideaId: string;
  readonly trial: number;
  readonly lesson: string;
  /** Embedding of the lesson text (supplied by the embedder). */
  readonly embedding: readonly number[];
  /** Structured evaluator diagnostics at this trial. */
  readonly diagnostics: string;
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

/**
 * Retrieve the top-k reflections by embedding similarity to the query
 * (the idea generator's prompt context).
 */
export function retrieveSimilar(
  memory: ReadonlyArray<Reflection>,
  queryEmbedding: readonly number[],
  k: number,
): Reflection[] {
  return [...memory]
    .map((r) => ({ r, s: cosineSimilarity(r.embedding, queryEmbedding) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, Math.max(k, 0))
    .map((x) => x.r);
}

/**
 * Bounded memory insert (Omega): keep at most `omega` reflections per
 * ideaId (most recent trials); older raw reflections expire.
 */
export function boundedInsert(
  memory: ReadonlyArray<Reflection>,
  reflection: Reflection,
  omega = 3,
): Reflection[] {
  const same = memory.filter((r) => r.ideaId === reflection.ideaId);
  const other = memory.filter((r) => r.ideaId !== reflection.ideaId);
  const kept = [...same, reflection]
    .sort((a, b) => b.trial - a.trial)
    .slice(0, omega)
    .sort((a, b) => a.trial - b.trial);
  return [...other, ...kept];
}

/**
 * Consolidation (every 5 trials): distill stored reflections into one
 * durable doctrine entry; returns the doctrine text and the expired
 * raw reflections. Duplicate lessons (cosine > 0.9) are merged — the
 * Table-3 pathology check.
 */
export function consolidateReflections(
  reflections: ReadonlyArray<Reflection>,
): { readonly doctrine: string; readonly expired: Reflection[]; readonly duplicatesMerged: number } {
  const unique: Reflection[] = [];
  let duplicatesMerged = 0;
  for (const r of reflections) {
    const dup = unique.some(
      (u) => cosineSimilarity(u.embedding, r.embedding) > 0.9,
    );
    if (dup) duplicatesMerged++;
    else unique.push(r);
  }
  const doctrine = unique.map((r) => `- ${r.lesson}`).join("\n");
  return { doctrine, expired: [...reflections], duplicatesMerged };
}

/**
 * Permutation-based evaluator-reliability check: re-run the evaluator
 * with the feature sign flipped / target permuted. If the signal persists
 * (>=80% of the original magnitude), flag the backtest as leaky.
 */
export function permutationLeakCheck(
  originalSignal: number,
  permutedSignal: number,
  persistenceThreshold = 0.8,
): { readonly leaky: boolean; readonly persistence: number } {
  const persistence =
    Math.abs(originalSignal) < 1e-12
      ? 0
      : Math.abs(permutedSignal) / Math.abs(originalSignal);
  return { leaky: persistence >= persistenceThreshold, persistence };
}

/** Trial budget: stop after maxTrials (default 12 per the gate). */
export function trialsExhausted(trial: number, maxTrials = 12): boolean {
  return trial >= maxTrials;
}
