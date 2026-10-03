// ============================================================
// Human deferral and research-budget protocols (DECIDE bucket, additive)
//
// Pure functions adapted from arXiv ledgers. Not wired into any
// publish path; activation is a later human call. Backtest-dependent
// gates are documented, not claimed.
// ============================================================

/** One (model pick, human edit, graded outcome) triple (1711.06664). */
export interface EditTriple {
  /** Game subgroup, e.g. "primetime-favorite". */
  subgroup: string;
  /** Units won on the model's original pick. */
  modelUnits: number;
  /** Units won after the human's edit. */
  editedUnits: number;
}

/**
 * Human competence-map audit (1711.06664, "Predict Responsibly:
 * Improving Fairness and Accuracy by Learning to Defer").
 *
 * Design principle for the GSE router: the downstream decision
 * maker is concrete (the founder's final card edits). Log the
 * triple (model pick, human edit, graded outcome) so the router
 * learns the competence map: which game types the human improves,
 * which he hurts. The paper's biased-DM lesson becomes an audit:
 * if the human systematically degrades certain spots (e.g.
 * primetime favorites), the router defers less there (routes around
 * the bias). The inconsistent-DM lesson: measure the flip rate; if
 * high-noise on some subgroup, the system keeps those picks itself.
 *
 * ACCEPTANCE GATE: accepted as framing + audit protocol if the
 * competence-map analysis finds any stable subgroup where the
 * human's edits systematically help or hurt (|Delta units|
 * significant over a season) - that alone justifies the router.
 */
export function competenceMapAudit(triples: EditTriple[]): {
  subgroupLift: Record<string, number>;
  deferLess: string[];
  keepInHouse: string[];
} {
  const byGroup = new Map<string, { lift: number; flips: number; n: number }>();
  for (const t of triples) {
    const g = byGroup.get(t.subgroup) ?? { lift: 0, flips: 0, n: 0 };
    g.lift += t.editedUnits - t.modelUnits;
    if (Math.abs(t.editedUnits - t.modelUnits) > 1e-9) g.flips++;
    g.n++;
    byGroup.set(t.subgroup, g);
  }
  const subgroupLift: Record<string, number> = {};
  const deferLess: string[] = [];
  const keepInHouse: string[] = [];
  for (const [subgroup, g] of byGroup) {
    subgroupLift[subgroup] = g.n > 0 ? g.lift / g.n : 0;
    // Systematically degrades: route around the bias (defer less there).
    if (g.n >= 10 && g.lift / g.n < -0.1) deferLess.push(subgroup);
    // High-noise flips: keep those picks in-house.
    if (g.n >= 10 && g.flips / g.n > 0.6) keepInHouse.push(subgroup);
  }
  return { subgroupLift, deferLess, keepInHouse };
}

/**
 * Deferral-budget abstention rule (2112.06751, "Role of Human-AI
 * Interaction in Selective Prediction").
 *
 * Chooses score thresholds solving max historical accuracy subject
 * to deferral rate <= r (r = the daily-card budget, an explicit
 * auditable parameter); grid-search the accuracy-deferral curve on
 * backtested engine scores.
 *
 * Note on messaging: the paper's SPM experiment gives an
 * evidence-backed messaging rule for human review (blind DO-style
 * review: status only, no engine lean, to avoid the anchoring
 * penalty the BM-style arm shows). Anchoring magnitudes come from
 * lay image-labelers; the internal replication decides standing
 * doctrine (documented, not implemented).
 */
export function deferralBudgetThreshold(
  scores: number[],
  correct: boolean[],
  maxDeferralRate: number,
): { threshold: number; deferred: boolean[]; accuracy: number } {
  const n = Math.min(scores.length, correct.length);
  if (n === 0) return { threshold: Infinity, deferred: [], accuracy: 0 };
  const order = scores
    .slice(0, n)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s - b.s); // defer the lowest scores first
  const maxDefer = Math.floor(n * maxDeferralRate);
  const deferred = new Array(n).fill(false);
  let threshold = -Infinity;
  for (let d = 0; d < maxDefer && d < n; d++) {
    deferred[order[d]!.i] = true;
    threshold = order[d]!.s;
  }
  const kept = correct.filter((_, i) => !deferred[i]);
  const accuracy = kept.length > 0 ? kept.filter(Boolean).length / kept.length : 0;
  return { threshold, deferred, accuracy };
}

/** One game's ASPEST-loop state (2304.03870). */
export interface AspestGame {
  /** Ensemble margin (uncertainty): lower = more uncertain. */
  margin: number;
  /** True when the market line disagrees with the model. */
  marketDisagrees: boolean;
}

/**
 * Weekly ASPEST loop (2304.03870, "ASPEST: Bridging the Gap Between
 * Active Learning and Selective Prediction").
 *
 * (a) Checkpoint ensemble of the pick model (shared snapshot
 * infrastructure - offline). (b) Each week rank the slate by
 * ensemble margin (uncertainty). (c) Spend the label budget
 * (analyst deep-review time, e.g. 5 games/week) on the most
 * uncertain games, with market-aware acquisition: prioritize games
 * where ensemble uncertainty is high AND the market line disagrees
 * with the model (the market is a free second labeler). (d/e)
 * Fine-tuning and gate re-estimation are offline; this function
 * returns the ranked acquisition list for the week's budget.
 *
 * ACCEPTANCE GATE (needs backtest): accepted if the ASPEST loop
 * beats the static baseline by >= 3 AUACC points on shifted
 * deployment windows AND analyst-review hours stay within the
 * 5-game budget.
 */
export function aspestAcquisition(
  games: AspestGame[],
  budget: number,
): number[] {
  const ranked = games
    .map((g, i) => ({
      i,
      // Market-aware acquisition: uncertainty first, disagreement boosts.
      key: g.margin - (g.marketDisagrees ? 1 : 0),
    }))
    .sort((a, b) => a.key - b.key);
  return ranked.slice(0, Math.max(0, budget)).map((r) => r.i);
}

/** One research question in the weekly queue (1906.02179v2). */
export interface ResearchQuestion {
  /** Label uncertainty for the question. */
  uncertainty: number;
  /** Estimated no-answer probability r-tilde. */
  rTilde: number;
  /** True once answered (for r-tilde updates). */
  answered?: boolean;
}

/**
 * Research-budget allocator (1906.02179v2, "Bayesian Active Learning
 * with Abstention Feedbacks").
 *
 * Greedy scorer over the weekly (slate games x research questions)
 * queue: prioritizes high label-uncertainty questions with low
 * estimated no-answer probability r-tilde, updating r-tilde from
 * outcomes instead of burning hours on dead-end beat writers.
 *
 * ACCEPTANCE GATE (needs 18-week backtest): ADOPT if the greedy
 * rule raises the answered-question rate by >= 15pp over the
 * human-ordered baseline (paired t-test, p < 0.05) AND the r-tilde
 * estimates correlate with realized no-answer rates (Spearman rho
 * >= 0.4).
 */
export function researchBudgetAllocate(
  questions: ResearchQuestion[],
  budget: number,
): number[] {
  const ranked = questions
    .map((q, i) => ({ i, score: q.uncertainty * (1 - q.rTilde) }))
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, Math.max(0, budget)).map((r) => r.i);
}

/**
 * Update r-tilde from an observed outcome (answered or not).
 */
export function updateRTilde(
  rTilde: number,
  answered: boolean,
  learningRate = 0.1,
): number {
  const target = answered ? 0 : 1;
  return Math.min(Math.max(rTilde + learningRate * (target - rTilde), 0), 1);
}

/**
 * Abstention copy formatter (2508.07617, "Selective Prediction
 * Reduces the Negative Effects of Automation Bias Overall but
 * Increases False Negatives").
 *
 * Frames every abstention as a +EV pass, never a bare "no play":
 * "No edge today on [game] - model sees it as a coin flip, not a
 * fade." Supports an A/B variant for silent vs announced
 * abstention on low-stakes slates for follower trust.
 *
 * ACCEPTANCE GATE: ADAPT iff the paper's core mechanism
 * (announced abstention read as a negative signal) transfers to a
 * betting audience by the availability-bias argument; REJECT any
 * claim about effect magnitude from the paper.
 */
export function formatAbstentionCopy(
  gameLabel: string,
  variant: "announced" | "silent" = "announced",
): string {
  if (variant === "silent") return "";
  return (
    `No edge today on ${gameLabel} - model sees it as a coin flip, not a fade. ` +
    `We only post when the numbers clear our bar.`
  );
}
