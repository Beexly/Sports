# [1009] Fast Rates for Online Prediction with Abstention (arXiv:2001.10623)

## Citation / full-text source

- arXiv:2001.10623 — full text: https://arxiv.org/pdf/2001.10623
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Gergely Neu, Nikita Zhivotovskiy (2020; v2). *Fast Rates for Online Prediction with Abstention*. arXiv:2001.10623v2. URL: https://arxiv.org/abs/2001.10623
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/2001.10623.txt` (arXiv conversion; read in full — abstract, §§1–4, Theorem 1 + Corollary 2 proofs, Propositions 5–7, appendices; pure theory, no experiments). Note: the assignment's title string for this ID ("Learning With Noisy Labels via Sparse Regularization") does not match the actual paper at this ID; the ledger follows the actual full text read.
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — the theorem that a no-bet option at cost c<1/2 turns √T regret into log N (horizon-independent) is the theoretical backbone for GSE's selective-publishing layer, with an explicit randomized abstention rule (abstain ∝ expert disagreement).

## 1. Research question
In online binary prediction with N experts (adversarial sequences), if the learner may abstain at cost c < 1/2 (marginally below coin-flip, e.g. 0.49), can it achieve regret independent of the horizon T — and what is the exact dependence on c and N?

## 2. Dataset / schema
Pure theory; no datasets or experiments. Setting: sequential prediction of individual {0,1}-sequences with N expert predictions per round, binary loss, expected regret R_T = max_i E[Σ_t (ℓ̂_t − ℓ_{t,i})].

## 3. Method / model
Exponentially-weighted forecaster over N experts with a randomized abstention rule: predict the weighted-majority class k*_t with confidence p*_t, abstain with probability α_t = 2(1−p*_t) (so E[ℓ̂_t] = α_t·c + (1−α_t)·1{k*_t ≠ y_t}). Analysis via the mix loss ℓ̃_t = −(1/η) log Σ_i q_{t,i} e^{−ηℓ_{t,i}}: Lemma 4 shows E[ℓ̂_t] ≤ ℓ̃_t whenever η ≤ 2(1−2c), giving Theorem 1: R_T ≤ log N / η = log N / (2(1−2c)) — independent of T. Corollary 2: tuning η gives R_T ≤ (log N)/(2(1−2c)) ∧ √(T log N / 2) (best of both regimes). Matching lower bound of order log N/(1−2c) — tight. Extensions: time-varying costs c_t ≤ 1/2 (Proposition 5) with a Tsybakov-type margin condition on the density of c_t near 1/2 (Definition 6), yielding interpolated rates R_T = O((log N)^{1/(2−α)} T^{(1−α)/(2−α)}) (Corollary 7).

## 4. Equations & assumptions
- R_T ≤ log N / η (Theorem 1), η = 2(1−2c); abstention probability α_t = 2(1−p*_t).
- E[ℓ̂_t] = r_t − (1−2c)(r_t ∧ (1−r_t)), where r_t = Σ_i q_{t,i} 1{y_{t,i} ≠ y_t} (Lemma 4 proof).
- Tsybakov condition for costs: (1/T)Σ_t 1{1/2 − c_t < x} ≤ β x^{α/(1−α)}.
- Assumptions: c < 1/2 (strictly, or handled adaptively); adversarial environment; randomized learner.

## 5. Features / target
Features: N expert {0,1} predictions per round. Target: binary outcome y_t. Abstention is a third action with fixed cost c.

## 6. Validation design
N/A (theory paper). The matching lower bound is the validation.

## 7. Numerical results / baselines
No experiments. The quantitative results ARE the bounds: fast rate log N/(1−2c) vs slow rate √(T log N) — e.g., with N=10 experts, c=0.49: regret ≤ log 10 / 0.04 ≈ 57.6 total, forever, vs ~√(T·2.3) growing with T.

## 8. Code / data availability
None (theory). No code needed — the algorithm is a few lines.

## 9. Leakage
N/A.

## Limitations
- Abstention cost c is exogenous and fixed (or exogenously varying); in betting the "cost of a skip" is opportunity cost, not a parameter you set.
- Experts are black boxes; the bound is on regret vs the best expert, not on absolute profit.
- Adversarial-sequence framing is stronger than needed for sports (outcomes are stochastic, not adversarial) — bounds are conservative.
- No guidance on choosing c; the interesting regime (c close to 1/2) gives weak constants.

## 10. GSE overlap
Direct theoretical support for gap #4 (selective publishing). GSE's ensemble (model variants, signal features) = the N experts; weekly games = rounds; no-bet = abstention. The paper's message: when the expert consensus is near 1/2, abstaining at "cost" just below a forced bet converts a regret that grows with the season into one that doesn't. The randomized rule (abstain with probability 2(1−p*)) is a concrete, implementable no-bet dial. The time-varying-costs section maps to weeks where the skip budget is tighter (short slates). First-principles justification for the whole abstention lane.

## 11. GSE implementation spec
**Expert-disagreement no-bet rule**: for each game, compute the exponentially-weighted (by recent Brier) consensus p* over engine model variants + signal experts. No-bet with probability α = 2(1−p*) (or deterministically when α > τ); equivalently, publish only when p* ≥ (1−τ/2). Calibrate τ on 2024 to a target no-bet rate. This is a one-line addition to the aggregation code. Effort: <1 day.

## 12. Reproducible test
2024 season, time-ordered: compare (i) publish-all weighted-majority, (ii) the α-rule no-bet, (iii) best single expert ex post. Metrics: cumulative regret vs best expert, published-set hit rate, no-bet rate. Verify cumulative regret flattens (fast-rate signature) rather than growing √T.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if the α-rule's cumulative regret vs the best expert over 2024 is ≤ 50% of the publish-all rule's AND the no-bet rate is ≤ 40%; otherwise REJECT. The single decisive number: **cumulative regret ≤ 50% of publish-all at no-bet rate ≤ 0.40**.

## 14. Improvement experiment
Learn c_t per week (Tsybakov section): set the abstention "cost" from the week's opportunity set — skip more aggressively on thin slates (fewer games → each publish slot more valuable) and less on full slates. Fit the α→τ mapping per slate-size bucket and test whether slate-adaptive costs beat a fixed c.
