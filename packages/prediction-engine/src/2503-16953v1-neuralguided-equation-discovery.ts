/**
 * arXiv:2503.16953v1 — Neural-Guided Equation Discovery
 *
 * Grammar-constrained neural-guided proposals with best-aggregation for symbolic metric discovery:
 * candidate equations must parse under the sports grammar; dataset embeddings warm-start new tasks from
 * similar tables (transfer across the metric portfolio).
 *
 * Improvement: Adopt grammar-constrained neural-guided proposals with best-aggregation for GSE's symbolic-regression metric discovery, and learn dataset embeddings (Bi-LSTM trained contrastively on nflverse-table-slice → equation-skeleton pairs) to warm-start new discovery tasks from similar tables — transfer learning across GSE's metric portfolio (e.g., punt-return value warm-starts from kick-return value).
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT grammar-constrained proposals + best-aggregation if GSE-SR valid-program rate rises ≥10pp with no OOD-NMSE regression on the 2024–2025 holdout; REJECT if constraints reduce the diversity of discovered forms (count distinct skeletons — must not drop >20%).
 */

/** Allowed operators in the sports equation grammar. */
export const GRAMMAR_OPS = ["+", "-", "*", "/", "log", "exp", "sqrt", "sigmoid"] as const;

/** A candidate equation program as a token list (prefix notation). */
export type Program = readonly string[];

/** Check that every token is a known op, variable, or numeric literal. */
export function grammarValid(prog: Program, variables: readonly string[]): boolean {
  if (prog.length === 0) return false;
  return prog.every((tok) => {
    if ((GRAMMAR_OPS as readonly string[]).includes(tok)) return true;
    if (variables.includes(tok)) return true;
    return !Number.isNaN(Number(tok));
  });
}

/**
 * Best-aggregation: keep the best-scoring valid program per skeleton class.
 * skeleton = program with variables/literals masked (the diversity unit).
 */
export function skeletonOf(prog: Program, variables: readonly string[]): string {
  return prog
    .map((tok) =>
      (GRAMMAR_OPS as readonly string[]).includes(tok) ? tok : variables.includes(tok) ? "V" : "C",
    )
    .join(" ");
}

export function bestAggregation(
  candidates: readonly { prog: Program; score: number }[],
  variables: readonly string[],
): Map<string, { prog: Program; score: number }> {
  const best = new Map<string, { prog: Program; score: number }>();
  for (const c of candidates) {
    if (!grammarValid(c.prog, variables)) continue;
    const sk = skeletonOf(c.prog, variables);
    const cur = best.get(sk);
    if (!cur || c.score > cur.score) best.set(sk, c);
  }
  return best;
}

/** Cosine similarity between dataset embeddings (transfer warm-start). */
export function embeddingSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) throw new Error("embeddingSimilarity: length mismatch");
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return na < 1e-12 || nb < 1e-12 ? 0 : dot / (na * nb);
}
