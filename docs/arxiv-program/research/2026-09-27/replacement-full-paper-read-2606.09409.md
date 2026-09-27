# Ledger: 2606.09409 — "Correct Looks Better: Pairwise Comparisons Reveal Accuracy Rankings"

**VERDICT: ADAPT** — BT-with-covariates source ranking for GSE's reliability layer. Pairwise Bradley-Terry ranking recovers ground-truth accuracy rankings (Spearman ρ > 0.9, Kendall τ > 0.8) across five benchmarks, beats direct absolute judging when the judge is weak (rank distance 20% vs 38.2%), and the bias-corrected BT extension is the exact mathematical form of the PlusDC covariates in 2601.14727 — making this paper the estimator that completes the BT lane. Replaces 2609.23158 (REJECT, skin radar) in the program count.

| Field | Value |
|---|---|
| arXiv ID | 2606.09409 |
| Title | Correct Looks Better: Pairwise Comparisons Reveal Accuracy Rankings |
| Authors | Mina Remeli, Moritz Hardt |
| Affiliation | Max Planck Institute for Intelligent Systems, Tübingen; Tübingen AI Center |
| Category | cs.LG / stat.ML (evaluation methodology) |
| Date read | 2026-09-27 (full text, arXiv HTML, main body + references; appendices skimmed for the BT-vs-Elo/TrueSkill comparison claim) |
| Code | Public: https://github.com/socialfoundations/correct-looks-better |
| Program status | NEW — verified absent from all program state files (`ledger-tracker-750.jsonl`, `ledger-tracker.jsonl`, `master.jsonl`, `manifest-500.jsonl`, `reserve-100.jsonl`, `fetch-queue.jsonl`, `done-ids.txt`). Replaces 2609.23158. Program count: 586/750. |
| Lane | team_ratings (BT/Elo methodology — same lane as 2601.14727 and 2606.13221) |

---

## 1. Research question

When ground truth *is* available, do pairwise-preference rankings (Elo/Bradley-Terry over LLM or human judgments) actually reflect accuracy rankings? The literature worried they reward style and judge bias ("correct looks better" as a critique); this paper tests the critique in the one setting where it can be adjudicated — benchmarks with known ground truth converted to free-form generative evaluation.

## 2. Dataset/schema

- **Benchmarks (5):** MMLU Pro (492 questions, 12 models), GPQA Diamond (126, 10), SimpleQA (500, 11), GSM8K (1,318, 27), BBH multitask (4,583, 13). Multiple-choice benchmarks converted to freeform by removing answer options (using Chandak et al. 2025's freeform versions; odd-one-out-style questions filtered).
- **Pairwise comparisons collected:** 30k (MMLU Pro), 5k (GPQA), 10k (SimpleQA), 100k (GSM8K), 115k (BBH) — full pair set on three benchmarks, ~20–30% fractions on GSM8K/BBH with no degradation.
- **Judges:** gpt-oss-20b, gpt-oss-120b, o3 (OpenAI), plus phi-4 (Microsoft) and gemma-3-27b-it (Google) for cross-developer generality.
- **Ground truth:** each benchmark's own grading (exact match or LLM-assisted grading with ground truth); accuracy ranking is the "golden standard."

## 3. Method/model

Three steps per benchmark: (1) collect free-form answers from each evaluated model; (2) collect pairwise preferences from a judge LLM with the prompt "which answer are you more confident in that it answers the question correctly? 1 or 2?" — **no ground truth given to the judge**; (3) aggregate with Bradley-Terry (chosen over Elo/WinRate/TrueSkill: BT is the MLE over the full comparison set, Elo is its online approximation; Appendix C reports BT achieves the highest mean rank correlation).

**Bias-corrected BT:** extends the model with context features — style (answer length, headers, bold elements, lists; after Li et al. 2024a) and self-preference (same model family as judge) — as linear covariates on the logit:
`p_ij = 1/(1 + e^{θ_j − θ_i − wᵀx})`, with θ and w jointly fit by BCE minimization.

**Direct-judge baseline:** prompt the same LLM to classify each answer correct/incorrect/not_attempted directly (nm calls vs 2–5×nm for pairwise — only a constant factor more).

## 4. Equations & assumptions

- BT preference: `p_ij = 1/(1 + e^{θ_j − θ_i})`; strengths via `θ̂ = argmin_θ Σ BCE(1/(1+e^{θ_j−θ_i}), 1)`.
- Bias-corrected: `p_ij = 1/(1 + e^{θ_j − θ_i − wᵀx})`.
- Rank metrics: Kendall's τ = (C−D)/(C+D); Kendall's distance K_D = (1−τ)/2 (fraction of pairs to swap); Spearman ρ; Pearson R.
- Assumptions: evaluated-model filtering (>90% parse rate, above-baseline accuracy, ≥1% accuracy gaps between pairs — ablation shows limited impact); exchangeability of comparisons; the freeform↔MCQ ranking comparison is conservative (format mismatch can only attenuate correlation).

## 5. Features/target

- Target: per-model accuracy on each benchmark (ground-truth ranking).
- Metric: rank alignment (τ, ρ, K_D) and score alignment (Pearson R) between BT ranking and accuracy ranking.

## 6. Validation design

No train/test split (not a fitted predictive model — a measurement study). Claims rest on: correlation metrics across 5 benchmarks × 5 judges; bootstrap 95% CIs (100 samples); a controlled causal intervention for the echo finding (500 BBH pairs, echo appended to one answer, contrast with CI); ablations on filtering, comparison fraction, and bias correction in appendices.

## 7. Numerical results/baselines (quoted as stated)

- **Alignment:** Spearman ρ > 0.9, Kendall τ > 0.8, Pearson R > 0.87 (BT score vs accuracy). Four of five benchmarks: only 6–8.9% of model pairs need swapping (K_D) to recover the accuracy ranking.
- **BT vs direct judge (average):** comparable with strong judges (gpt-oss-120b: τ 0.82 vs 0.83; o3: 0.81 vs 0.85). **Weak judge (gpt-oss-20b, 4.9% accuracy on SimpleQA — the worst model): BT K_D = 20% vs direct judge 38.2%** — pairwise BT nearly halves the rank distance when evaluator quality is uncertain. Pattern holds in 3 of 4 weak-judge cases (exception: gemma-3-27b-it, where the direct judge's errors happened to correlate with the accuracy ranking).
- **Bias correction:** modest improvements only (e.g., small gain on MMLU Pro for gpt-oss-20b). Style and self-preference biases barely move rankings — despite **58% of pairs being non-discriminative** (both answers correct or both incorrect), where the judge *must* fall back on appearance cues.
- **Non-discriminative pairs alone:** τ drops 0.8 → 0.68 (K_D = 16%) — still far above chance. **Discriminative pairs alone (26–37% of pairs):** strongest signal — GSM8K K_D 7.4% → 3.4%, BBH 7.7% → 3.8%.
- **Echo (causal):** adding echo (repetition after the final answer) to answer A drops P(A preferred) from 0.65 to 0.29 — contrast −0.52, 95% CI [−0.57, −0.46]; adding to B raises it to 0.81. **Effect vanishes on discriminative pairs** (−0.07, CI [−0.21, +0.06]): when one answer is objectively correct, the judge uses correctness, not echo. Echo detected in 65% of BBH answers; Spearman ρ ≈ −0.50 between echo and correctness.
- **Cost:** even ~20–30% of the full pair set gives competitive results; pairwise costs only a constant factor over direct judging.

## 8. Code/data availability

Code public at github.com/socialfoundations/correct-looks-better. Benchmarks are public; the collected comparison sets' release status is stated via the repo.

## 9. Leakage & limitations (adversarial)

1. **Discriminative tasks only.** All five benchmarks have ground-truth answers; whether pairwise rankings track correctness in open-ended settings (no ground truth) is explicitly open. GSE's transfer is to *source* ranking where outcomes (game results) are the ground truth — discriminative, so in-scope — but any extension to ranking qualitative reasoning traces would exceed the evidence.
2. **Rankings are relative, not absolute.** "It does not detect collective incompetence" — if all sources are bad, BT still ranks them. For GSE this means BT source ranking must sit *alongside* absolute calibration (the ladder), never replace it.
3. **No adversarial robustness.** A source optimized to win pairwise comparisons rather than to be accurate is unstudied. If source ranking ever drives compensation or prominence, Goodhart pressure applies — keep it as an internal diagnostic.
4. **The weak-judge win has a boundary.** BT beat direct judging in 3/4 weak-judge cases; the gemma exception (correlated errors) is a reminder that pairwise aggregation inherits the judge's error *structure*, not just its error rate.
5. **Echo is LLM-evaluation-specific.** The causal echo finding doesn't transfer to sports; what's transferable is the *method* (controlled intervention to identify what drives a judge's preference) — applicable to auditing any of GSE's own judge-like components.
6. **MCQ→freeform conversion** means the reported correlations are conservative underestimates *if* formats reorder models — but if the conversion itself introduced noise correlated with BT's strengths, the direction could flip. The ablations suggest robustness, but it's the softest methodological joint.

## 10. GSE overlap

This paper lands in the **BT lane** alongside 2601.14727 (BT survey → team ratings) and 2606.13221 (conformal Elo → rating uncertainty, phase-1 ADAPT). It is the missing estimator piece:

- **Source ranking for `source-reliability.ts` (post-ledger):** today the stub plans "hitRate over settled records" — raw absolute scoring. This paper's result says: when per-source outcome samples are thin (the weak-judge regime — exactly GSE's situation for new sources), **pairwise BT over sources** (which source's probability was closer to the outcome / which won the head-to-head per event) recovers the true accuracy ranking far better than direct absolute scoring. The stub's future implementation should offer BT-ranked reliability, not just hit-rate rollups.
- **Covariate BT = PlusDC:** the bias-corrected form `p_ij = 1/(1+e^{θ_j−θ_i−wᵀx})` is algebraically identical to the BT survey's PlusDC extension. One estimator serves both team ratings (covariates: home field, rest) and source ranking (covariates: source type, market vs model). Build it once.
- **Diversity evidence for the deliberative protocol (2609.22497):** that paper's clone-groups-add-nothing result gets a second empirical leg here — BT over genuinely distinct sources recovers truth; BT over near-duplicates has nothing to aggregate.
- **No overlap with existing engine code:** nothing in the engine does pairwise source comparison today. This is new capability, not a delta.

## 11. GSE implementation spec

**Build `bt-source-rank.ts`** (new, small, pure — no I/O; sits beside the future `source-reliability.ts` fill-in):

**Inputs:** per settled event, per source: `(eventId, sourceId, family, p_forecast, outcome)`. Plus optional covariates per comparison (source-type indicators, days-since-source-launch).

**Method:**
1. Per event, form pairwise source comparisons: source *i* beats *j* if `|p_i − outcome| < |p_j − outcome|` (Brier-distance head-to-head; ties → half-win each). This converts absolute probabilities into pairwise outcomes without any judge LLM — the "judge" is the realized outcome, which is *stronger* than the paper's setting (their judge never saw ground truth; ours is ground truth itself, so expect *better* alignment than the paper's ρ > 0.9).
2. Fit covariate-BT by BCE minimization (batch gradient descent; dozens of sources, trivial compute): `p_ij = σ(θ_i − θ_j + wᵀx_ij)`.
3. Output: per-source strength `θ_s` (the reliability rank), standard errors from the Hessian, and covariate weights `w` (e.g., "market sources get +x" — the bias audit for free).

**Output shape:**
```ts
interface BtSourceRank {
  asOfEventId: string;
  sources: Array<{ sourceId: string; family: string; theta: number; se: number; rank: number }>;
  covariateWeights: Array<{ name: string; w: number }>;
  nComparisons: number;
}
```

**Wiring:** feeds `source-reliability.ts` post-ledger (BT rank as the reliability score alongside/instead of raw hit-rate); feeds the deliberative protocol's reliability weights (Paper 6) and LEAP's reliability shrinkage (Paper 4). Until the ledger lands, runnable offline on any historical per-source forecast log.

## 12. Reproducible test

On GSE's historical per-source NFL forecasts + outcomes:
1. Compute BT source ranking and direct-Brier source ranking on the same events.
2. **Assert:** with the full history as ground truth for "true" source order, BT fitted on a *thin* slice (e.g., one season) recovers the full-history order with higher Kendall τ than direct Brier on the same thin slice — the paper's weak-judge result replicated in GSE's data (expect the gap because one season of Brier is the noisy evaluator).
3. **Assert (sanity):** on a fat slice (≥5 seasons), BT order and Brier order agree with τ > 0.8 (they must converge — if not, the head-to-head construction is buggy).
4. **Assert (covariates):** adding source-type covariates doesn't invert the ranking (paper: bias correction moves rankings only modestly); report `w` as the bias audit.

## 13. Acceptance/rejection gate

**ADOPT into the reliability path iff** on ≥3 seasons of per-source history: thin-slice BT ranking beats thin-slice direct-Brier ranking on Kendall τ against the full-history order by ≥0.1 with bootstrap p < 0.05, AND the fat-slice sanity check (τ > 0.8 agreement) passes. If BT shows no thin-sample advantage, **REJECT** — keep direct Brier (simpler, and the paper's result didn't transfer). If the covariate fit inverts rankings vs. plain BT, drop the covariates and keep plain BT.

## 14. Improvement experiment (GSE-specific extensions)

1. **Outcome-weighted head-to-heads:** weight comparisons by event edge/CLV rather than uniformly — sources should be ranked by performance where money is at stake, not on coin-flip games.
2. **Time-decayed BT:** exponential decay on comparison age so source strengths track current form (the BT survey's dynamic extensions meet this paper's estimator).
3. **BT as the diversity metric:** mean pairwise |θ_i − θ_j| within an ensemble's source set as the *quantitative* diversity gate for the deliberative protocol — replacing the categorical family tag with a measured distance.
4. **Cross-market BT:** rank sources separately per market type (spreads/totals/props) — the paper's "expert identity isn't knowable ex ante" becomes per-market BT leaderboards.

---

**VERDICT: ADAPT** — The paper is a clean methodological win with a direct, cheap, no-LLM transfer: pairwise BT source ranking beats absolute Brier scoring exactly when GSE's per-source samples are thinnest. It completes the BT lane (14727's architecture + 13221's uncertainty + 09409's estimator) and supplies the reliability score the deliberative protocol and LEAP aggregation are waiting on. Counted: 586/750.
