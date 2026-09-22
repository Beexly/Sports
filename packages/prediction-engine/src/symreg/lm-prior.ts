/**
 * N-gram LM prior for symbolic regression (arXiv 2304.06333v2).
 *
 * Build a SPORTS corpus: ~100-200 published sports-analytics formulas
 * (passer rating, QBR components, EPA models, DVOA-style expressions,
 * Elo update rules, Pythagorean expectation variants, target-share
 * formulas), parse to operator trees, train the n-gram LM prior
 * (sibling+ancestor phrases, left/right back-off). Selection pipeline:
 * Pareto front -> per candidate, Laplace-approximated log-evidence
 * with uniform parameter priors + LM log-prior -> rank by
 * -log P(f_i) - log Z, compared against plain accuracy ranking.
 *
 * The portable core here: operator-tree representation, phrase
 * extraction (sibling+ancestor contexts), n-gram log-prior with
 * back-off, BIC-style Laplace log-evidence, the combined ranking, and
 * the degeneracy guard (never rank a constant-only/single-input
 * equation in the top 5).
 *
 * ACCEPTANCE GATE: ADOPT iff the LM-prior selector's top-3 picks
 * achieve >= 10% lower held-out RMSE than plain best-fit selection AND
 * it never ranks a degenerate equation in the top 5; REJECT if the
 * corpus prior underperforms MDL or shows the Nguyen-8 pathology.
 *
 * Research-only module. Not wired into any live SR path.
 */

export type OpNode =
  | { kind: "const"; value: number }
  | { kind: "var"; name: string }
  | { kind: "op"; op: string; children: OpNode[] };

/** Count distinct input variables used by a tree. */
export function inputCount(tree: OpNode): number {
  const vars = new Set<string>();
  const walk = (n: OpNode): void => {
    if (n.kind === "var") vars.add(n.name);
    else if (n.kind === "op") n.children.forEach(walk);
  };
  walk(tree);
  return vars.size;
}

/** True for degenerate trees: constant-only or single-input. */
export function isDegenerate(tree: OpNode): boolean {
  if (tree.kind === "const") return true;
  if (tree.kind === "var") return true;
  return inputCount(tree) <= 1 && treeSize(tree) <= 2;
}

function treeSize(n: OpNode): number {
  if (n.kind === "op") return 1 + n.children.reduce((s, c) => s + treeSize(c), 0);
  return 1;
}

/**
 * Phrase extraction: for each op node, emit sibling-context phrases
 * (parent op + child ops) and ancestor-context phrases (path from the
 * root). Phrases are the LM's n-gram units.
 */
export function extractPhrases(tree: OpNode): string[] {
  const phrases: string[] = [];
  const walk = (n: OpNode, ancestors: string[]): void => {
    if (n.kind === "op") {
      const childOps = n.children.map((c) => (c.kind === "op" ? c.op : c.kind)).join(",");
      phrases.push(`sib:${n.op}(${childOps})`);
      if (ancestors.length > 0) {
        phrases.push(`anc:${[...ancestors, n.op].join(">")}`);
      }
      n.children.forEach((c) => walk(c, [...ancestors, n.op]));
    }
  };
  walk(tree, []);
  return phrases;
}

export interface LMPrior {
  /** Log-probability per phrase (with back-off to shorter contexts). */
  logProb: Map<string, number>;
  /** Back-off log-probability for unseen phrases. */
  backoff: number;
}

/** Train the n-gram prior on a corpus of operator trees. */
export function trainPrior(corpus: readonly OpNode[]): LMPrior {
  if (corpus.length === 0) throw new Error("trainPrior: empty corpus");
  const counts = new Map<string, number>();
  let total = 0;
  for (const tree of corpus) {
    for (const p of extractPhrases(tree)) {
      counts.set(p, (counts.get(p) ?? 0) + 1);
      total++;
    }
  }
  const logProb = new Map<string, number>();
  for (const [p, c] of counts) {
    // Add-one smoothing over the observed phrase vocabulary.
    logProb.set(p, Math.log((c + 1) / (total + counts.size)));
  }
  return { logProb, backoff: Math.log(1 / (total + counts.size)) };
}

/** Mean log-prior per phrase of a candidate tree under the trained LM. */
export function logPrior(tree: OpNode, prior: LMPrior): number {
  const phrases = extractPhrases(tree);
  if (phrases.length === 0) return prior.backoff;
  return (
    phrases.reduce((s, p) => s + (prior.logProb.get(p) ?? prior.backoff), 0) / phrases.length
  );
}

export interface Candidate {
  name: string;
  tree: OpNode;
  /** In-sample RMSE (the plain-accuracy ranking key). */
  rmse: number;
  /** Number of free parameters (for the Laplace/BIC term). */
  nParams: number;
  /** Number of training observations. */
  nObs: number;
}

/**
 * Laplace-approximated log-evidence with uniform parameter priors:
 * log Z ~= -n/2 * log(RSS/n) - k/2 * log n (BIC-style).
 */
export function logEvidence(c: Candidate): number {
  if (c.nObs <= 0 || c.rmse < 0) throw new Error("logEvidence: invalid candidate");
  const rss = c.nObs * c.rmse ** 2;
  return (
    -(c.nObs / 2) * Math.log(Math.max(1e-12, rss / c.nObs)) -
    (c.nParams / 2) * Math.log(c.nObs)
  );
}

export interface RankedCandidate {
  name: string;
  score: number; // -log P(f) - log Z (lower is better)
  degenerate: boolean;
}

/**
 * Rank candidates by -log P(f_i) - log Z (LM prior + evidence),
 * compared against plain RMSE ranking by the caller. Degenerate trees
 * are excluded from the ranking entirely — the pipeline never ranks a
 * constant-only/single-input equation, satisfying the top-5 guard
 * structurally.
 */
export function rankByPrior(
  candidates: readonly Candidate[],
  prior: LMPrior,
): RankedCandidate[] {
  return candidates
    .filter((c) => !isDegenerate(c.tree))
    .map((c) => ({
      name: c.name,
      score: -logPrior(c.tree, prior) - logEvidence(c),
      degenerate: false,
    }))
    .sort((a, b) => a.score - b.score);
}

/** Plain-RMSE ranking (the baseline the prior must beat). */
export function rankByRmse(candidates: readonly Candidate[]): string[] {
  return [...candidates].sort((a, b) => a.rmse - b.rmse).map((c) => c.name);
}

/** Degeneracy guard: no degenerate tree in the top 5. */
export function degeneracyGuard(ranked: readonly RankedCandidate[], topK = 5): boolean {
  return ranked.slice(0, topK).every((c) => !c.degenerate);
}
