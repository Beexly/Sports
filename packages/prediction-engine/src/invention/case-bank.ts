/**
 * DS-Agent case bank for the discovery loop — arXiv 2402.17453v5
 * ("DS-Agent: Automated Data Science by Empowering Large Language Models
 * with Case-Based Reasoning").
 *
 * ADDITIVE invention module (packages/prediction-engine/src/invention).
 * Memory substrate for the discovery loop; LLM calls stay outside the
 * repo. Not wired into any production path.
 *
 * Paper mechanism: case schema (SQLite) — (case_id, hypothesis_text,
 * feature_code, backtest_spec, feedback_log (Reflexion reflections),
 * dev_score (2025-holdout DeltaBrier), stage3_score (locked-season),
 * retained_flag, embedding); seed with the 5 hand-verified baseline
 * signals + every future discovery-loop attempt including failures.
 * Development stage (nightly): idea generator retrieves top-k cases by
 * embedding similarity to the new hypothesis; ReviseRank re-ranks cases
 * conditioned on the last night's feedback; planner reuses the top case's
 * experiment plan; executor runs; retain iff it passes the Stage-2 gate.
 * Deployment stage (weekly, cheap): retrieve the current best
 * production-pipeline case and regenerate the weekly model-fit code with
 * minor adaptation. Counter-case retrieval: for each retrieved success
 * case, also retrieve the most similar FAILED case and inject its feedback
 * into the planner prompt.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT if CBR arm passes >=6/10
 * hypotheses within budget vs <=3/10 cold-start; ReviseRank demotes at
 * least one misleading case per night on average; deployment regeneration
 * succeeds one-pass >=80% of weeks over 8 weeks; REJECT if cold-start
 * matches within 1 hypothesis, retained cases show score decay on re-run
 * (bank poisoning), or ReviseRank rankings are uncorrelated with
 * next-iteration outcomes.
 */

export interface DiscoveryCase {
  readonly caseId: string;
  readonly hypothesisText: string;
  readonly featureCode: string;
  readonly backtestSpec: string;
  readonly feedbackLog: string;
  /** 2025-holdout DeltaBrier. */
  readonly devScore: number;
  /** Locked-season score (null until stage 3). */
  readonly stage3Score: number | null;
  readonly retainedFlag: boolean;
  readonly embedding: readonly number[];
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

/** Top-k case retrieval by embedding similarity to the hypothesis. */
export function retrieveTopK(
  bank: ReadonlyArray<DiscoveryCase>,
  queryEmbedding: readonly number[],
  k: number,
): DiscoveryCase[] {
  return [...bank]
    .map((c) => ({ c, sim: cosineSimilarity(c.embedding, queryEmbedding) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, Math.max(k, 0))
    .map((x) => x.c);
}

/**
 * ReviseRank: re-rank retrieved cases conditioned on the last night's
 * feedback. Deterministic proxy: cases whose feedback log mentions any of
 * the failure keywords are demoted below the rest (stable otherwise, by
 * devScore desc). Returns the re-ranked list.
 */
export function reviseRank(
  cases: ReadonlyArray<DiscoveryCase>,
  failureKeywords: ReadonlyArray<string>,
): DiscoveryCase[] {
  const lowered = failureKeywords.map((k) => k.toLowerCase());
  const penalized = (c: DiscoveryCase) =>
    lowered.some((k) => c.feedbackLog.toLowerCase().includes(k)) ? 1 : 0;
  return [...cases].sort(
    (a, b) => penalized(a) - penalized(b) || b.devScore - a.devScore,
  );
}

/**
 * Counter-case retrieval: the most similar FAILED case (retainedFlag false
 * or negative devScore) to a retrieved success case — its feedback is
 * injected into the planner prompt alongside the success case.
 */
export function retrieveCounterCase(
  bank: ReadonlyArray<DiscoveryCase>,
  successCase: DiscoveryCase,
): DiscoveryCase | null {
  let best: DiscoveryCase | null = null;
  let bestSim = -Infinity;
  for (const c of bank) {
    if (c.caseId === successCase.caseId) continue;
    if (c.retainedFlag && c.devScore >= 0) continue; // not a failure
    const sim = cosineSimilarity(c.embedding, successCase.embedding);
    if (sim > bestSim) {
      bestSim = sim;
      best = c;
    }
  }
  return best;
}

/** Stage-2 retain gate: 2025-holdout DeltaBrier >= 0.002. */
export function retainGate(devScore: number, gate = 0.002): boolean {
  return devScore >= gate;
}

/**
 * Deployment stage: the current best production-pipeline case (retained,
 * max devScore) whose code is regenerated weekly with minor adaptation.
 */
export function selectBestProductionCase(
  bank: ReadonlyArray<DiscoveryCase>,
): DiscoveryCase | null {
  let best: DiscoveryCase | null = null;
  for (const c of bank) {
    if (!c.retainedFlag) continue;
    if (!best || c.devScore > best.devScore) best = c;
  }
  return best;
}
