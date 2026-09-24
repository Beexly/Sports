# 1793 An Empirical Comparison of Algorithms for Aggregating Expert Predictions (arXiv:1206.6814v1)

**Citation:** Varsha Dani, Omid Madani, David Pennock, Sumit Sanghai, Brian Galebach (2006). *An Empirical Comparison of Algorithms for Aggregating Expert Predictions*. arXiv:1206.6814v1. URL: https://arxiv.org/abs/1206.6814v1
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).

## 1. Research question

Given a panel of "experts" submitting probability forecasts on NFL game outcomes (ProbabilitySports contest, 1,319 games over 2000–2004), which aggregation algorithm best converts many noisy probability elicitations into a single calibrated forecast — simple averaging, multiplicative-weights experts algorithms, an EM variance-estimation algorithm, exponentiated gradient, or a simulated prediction market — measured on both zero-one accuracy and quadratic loss (probability quality)?

## 2. Dataset / schema

- **Source:** ProbabilitySports.com NFL contests, 2000–2004: 1,319 games (~250+/season). No team/record features — only expert probabilities per game.
- **Experts:** 625 → 786 → 1,257 → 1,969 → 2,231 participants across the five seasons. Expert quality distribution is brutal: median final season scores −485, −649, −684.2, −437, −275 (2000–2004); mean scores −1301, −1547, −1792, −1221, −944. Most experts are badly miscalibrated.
- **Scoring rule:** quadratic, 100 − 400(p − y)² per game, summed over the season — incentive-compatible (truth-telling is optimal), so elicitations approximate true beliefs.
- **Also:** NCAA basketball playoff data (~60 games/season, 2001–2003) as a second domain.
- **Access:** authors planned UCI-repository release; site is defunct — reproduce via any modern crowd-probability panel instead (e.g., Kalshi/polymarket-free forecasts, or a contest GSE runs itself).

## 3. Method / model

Five aggregation families tested in online (train-on-past, predict-next-game) and cross-validation settings, with missing predictions handled by 0.5-imputation or participation-only updates:

1. **Average:** simple mean of expert probabilities per game (no parameters).
2. **Average(k):** mean of the top-k scoring experts so far (k = 30 / 20).
3. **Experts algorithm** (Cesa-Bianchi et al.): weighted average with multiplicative updates w ← w·U_β(q); variants: prediction function (Vovk's, piecewise-linear, identity) × update function (e^{q ln β}, e^{−βq}, 1−(1−β)q); best config β = 0.75, update e^{−βq}, Vovk prediction, missing-data-aware variant "Expert MD" (weights frozen for non-participants).
4. **Variance algorithm (novel, EM):** model each expert's prediction as Gaussian centered at the true event probability with per-expert variance σᵢ²; alternate between estimating true probabilities as inverse-variance-weighted means and estimating variances from residuals. No parameters.
5. **Exp Gradient:** batch exponentiated-gradient minimization of quadratic loss, wᵢ ← wᵢ·exp(2.0·xᵢ·δ·lr), lr = 0.1, 3 passes, chronological order.
6. **Market simulation:** log-utility agents with priors = expert predictions trade a $1 Arrow-Debreu security; equilibrium price (wealth-weighted average) is the aggregate forecast; posteriors = average of prior and price.

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- EM aggregation (1): p̂_t = (Σ_i w_i p_{it})/(Σ_i w_i), with w_i = 1/σᵢ².
- Variance update (2): σᵢ = √(Σ_t (p_t − p_{it})²/T).
- Experts-algorithm regret bound: loss(A) ≤ [ln(2)·N + L·ln(1/β)] / ln(2/(1+β)), where L = best expert's loss in hindsight, N = expert count.
- Prediction-function validity bounds: 1 + ln((1−r)^β + r)/(2 ln(2/(1+β))) ≤ F_β(r) ≤ −ln(1−r+r^β)/(2 ln(2/(1+β))).
- Scoring rule: score = 100 − 400(p − y)².

Assumptions stated: expert predictions are independent Gaussians centered on the true probability with time-constant per-expert variance (Variance algorithm); missing predictions treated as 0.5 minimize average loss over both outcomes; quadratic loss is the right probability-quality metric (zero-one loss cannot be improved — see §7).

## 5. Features / target

Features: one probability per expert per game (thousands of sparse forecast columns). Target: binary home-team-win outcome y_t ∈ {0,1}. No contextual features at all — the entire signal is the expert panel.

## 6. Validation design

Online evaluation: at each game, predict using only prior games; parameters for adaptive methods tuned on 2000–2003, evaluated on all five seasons; plus cross-validation and multi-year (2000–3, 2001–3, 2002–3, restricted to experts active all years, ~100 experts) experiments; significance via sign tests per game. No leakage: experts' future predictions never used.

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly. Quadratic scores (higher = better; ~250 games/season):

| Year | Top Expert | Average | Avg(30) | Variance | Var(20) | Experts | Expert MD | ExpGrad | MarketSim |
|------|-----------|---------|---------|----------|---------|---------|-----------|---------|-----------|
| 2000 | 3185 | 2561 | 2864 | 2979 | **3187** | 2801 | 2875 | 2827 | 3090 |
| 2001 | 3445 | 2574 | 2589 | 2660 | 2662 | 2541 | 2644 | 2563 | 2482 |
| 2002 | 3339 | 2562 | 2529 | 2627 | 2611 | 2406 | 2505 | 2616 | 2381 |
| 2003 | 4218 | 3298 | 3731 | 3498 | 3881 | 3343 | 3442 | 3371 | 3397 |
| 2004 | 3747 | 3371 | 2986 | 3456 | 3344 | 3099 | 3346 | 3137 | 3203 |

Key findings (paper's, quoted/paraphrased): (a) **zero-one accuracy is a dead end** — no algorithm consistently beats simple averaging on 0/1 error (SVM/trees/boosting all fail too; even the top expert doesn't clearly beat Average on 0/1, Fig 2a: Average 0/1 errors 0.3552/0.3436/0.3708/0.3109 vs Top Expert 0.3514/0.3127/0.3521/0.3221); (b) **quadratic loss is where aggregation wins** — Variance beats Average in 9 of 11 experiments (5 NFL seasons + 3 NCAA + 3 multi-year), sign-test significant (p ≤ 0.1) in 2003 and 2004; (c) multi-year 2000–3 scores: Top Expert 9,910 vs Average 11,169 vs Variance 11,512; (d) even averaging only experts with *negative* final scores yields positive scores (1,763–2,717/season) — averaging smooths miscalibration; (e) prediction markets (TradeSports/NewsFutures, 2003) scored 3,389/3,359 — Variance (3,498) was competitive with real-money markets.

## 8. Code / data availability

Planned UCI release; no code linked. Algorithms are all implementable from the paper (full pseudocode in §3). Modern replication needs a crowd-probability panel — no longer downloadable from ProbabilitySports.

## 9. Leakage & limitations

- **Stale contest, small-ish game counts:** ~250 games/season; multi-year tests shrink the expert pool to ~100; significance is thin (sign test p ≤ 0.1, not 0.05).
- **No features:** pure opinion aggregation — says nothing about combining model-based signals, which is GSE's actual ensemble problem.
- **Independence assumption violated:** experts read the same news; correlated errors break the Gaussian-independence EM story (works anyway, but the theory is decorative).
- **Variance(20) overfits the cutoff:** top-20-by-variance looks great in 2000 (3,187) but the dynamic cutoff is another tuned knob; plain Variance (no cutoff) is the honest result.
- **Experts algorithm never consistently beats Average** despite worst-case guarantees — a cautionary tale for importing online-learning theory wholesale.

## 10. GSE overlap

The existing-research map covers ensembles/stacking in the abstract, but no ledger implements a *probability-aggregation* operator for combining GSE's own forecast sources (engine model, market-implied probabilities, crowd/consensus feeds, analyst adjustments) into one calibrated number. This paper is the closest empirical study of exactly that operator on NFL games. It is also the strongest evidence in the corpus for a calibration-lane maxim: **optimize quadratic/log loss, not accuracy** — directly relevant to GSE's stated calibration goal ("most accurate and calibrated"). Not a duplicate; fills the forecast-aggregation gap.

## 11. GSE implementation spec

1. **Ensemble aggregation layer:** collect per-game win probabilities from GSE's sources (engine v-current, market-implied from odds, any crowd feed, analyst overrides) into a panel {p_it}; implement the Variance EM algorithm (equations 1–2 above) as the aggregation operator producing the published probability.
2. **Track per-source σᵢ² over time** — this is a free source-reliability dashboard: sources whose estimated variance inflates are degrading; use it to down-weight or flag them automatically.
3. **Calibrate before aggregating:** the paper shows uncalibrated experts still aggregate well, but pre-calibrating each source (Platt/isotonic on trailing 2 seasons) should lift the EM input quality; test both.
4. Cost: ~2 days (panel plumbing exists in the engine; EM loop is ~50 lines).

## 12. Reproducible test

Dataset: 2022–2025 NFL games; sources: engine probabilities (archived), Pinnacle closing-line implied probabilities, and a free crowd proxy (e.g., public contest consensus). Baselines: simple average, median, best single source, logistic stacking. Metrics: log-loss and Brier score on 2024–2025 (train 2022–2023), plus calibration curves. Success gate below.

## 13. Acceptance / rejection gate

**Adopt Variance-EM aggregation if** it beats simple averaging on Brier score over 2024–2025 by ≥0.002 with no calibration-curve degradation (ECE within 0.005 of the best baseline); **reject** if it ties or loses (paper's own lesson: Average is brutally hard to beat). Note the zero-one corollary: do not evaluate this change on pick accuracy — the paper proves accuracy is the wrong metric for aggregation quality.

## 14. Improvement experiment

**Bias + recency + correlation-aware EM:** extend the paper's algorithm in three ways the authors list as future work: (a) estimate per-source *bias* as well as variance (shift p_it by b_i before weighting); (b) exponential recency weighting on the variance estimates (sources regime-shift; 2023 σ² shouldn't equal 2025 σ²); (c) block-structure the EM by source *type* (models vs markets vs humans) to absorb within-block correlation, then inverse-variance-weight the block means. Hypothesis: each extension attacks one violated assumption of the original; test ablations on 2024–2025. If the full extension beats plain Variance-EM by ≥0.002 Brier, it becomes the production aggregator and the per-source bias/variance dashboard becomes a standing model-health monitor.

**Verdict:** ADAPT
