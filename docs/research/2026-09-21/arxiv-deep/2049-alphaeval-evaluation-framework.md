# [2049] AlphaEval: A Comprehensive and Efficient Evaluation Framework for Formula Alpha Mining (arXiv:2508.13174)

**Citation:** Berkin Chen et al. (2025). *AlphaEval: A Comprehensive and Efficient Evaluation Framework for Formula Alpha Mining*. arXiv:2508.13174v2. URL: https://arxiv.org/abs/2508.13174
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~8,700 words).
**Verdict:** ADAPT

*Why:* a backtest-free, parallelizable 5-dimension scorecard (predictive power, temporal stability, perturbation robustness, LLM-rated financial logic, diversity entropy) for screening mined signals; open-sourced. Adapt as the fast pre-filter before the MinervaScore gate.

## 1. Research question
Alpha-mining algorithms are evaluated inconsistently: backtesting is sequential, expensive, and strategy-sensitive; IC/RankIC capture only predictive power. Can a unified, parallelizable, backtest-free framework score a miner's whole alpha set along five complementary dimensions — and does it agree with full backtesting while being faster and better at selecting superior alphas than single-metric (IC) screening?

## 2. Dataset / schema
Public Qlib platform: A-share and U.S. stock datasets (Qlib benchmarks). Miners evaluated: GP, AutoAlpha, AlphaEvolve, AlphaGen, AlphaQCM, AlphaForge, FAMA, AlphaAgent (+ random reference). PPS β=0.5; PFS noise σ = average daily volatility of the market index; t-distribution df=3 rescaled to same σ. Code open: https://github.com/BerkinChen/AlphaEval.

## 3. Method / model
Five dimensions, each on the miner's produced alpha set:
1. **Predictive Power Score (PPS):** PPS = β·IC + (1−β)·RankIC, IC = (1/T)Σ_t IC_t (Pearson, eq. 5–6), RankIC = average Spearman (eq. 7–9).
2. **Temporal Stability — Relative Rank Entropy (RRE):** RRE = 1/(T−1) Σ_{t=2}^T 1/(1+KL(S_t‖S_{t−1})), with rank vectors converted to discrete distributions p(S_{t,i}) = R[S_{t,i}]/Σ_j R[S_{t,j}] (eq. 11–13). Higher = more consistent rankings, lower turnover.
3. **Robustness — Perturbation Fidelity Score (PFS):** PFS_D = Corr(S, S′) where S′ = α(X+ε), Spearman between original and perturbed rankings (eq. 14); PFS = min{PFS_N(0,σ²), PFS_t(ν)} over Gaussian and heavy-tailed t noise (eq. 15).
4. **Financial Logic Score:** LLM rates each alpha's symbolic expression/description for logical coherence, economic intuition, interpretability; parsed to a number, averaged over the set.
5. **Diversity — Diversity Entropy (DH):** flatten m alpha signals over (t,n), covariance C ∈ R^{m×m}, eigenvalues λ_i → p_i = λ_i/Σλ_j; DH = (−Σ p_i log p_i)/log m (eq. 16–17). Higher = variance spread across complementary signals.
Integrated AlphaEval score used to rank/select alphas; Fig. 2 shows cumulative returns of portfolios built from top alphas selected by each dimension vs. the integrated score.

## 4. Equations & assumptions
- PPS = β·IC + (1−β)·RankIC, β=0.5 (eq. 10).
- RRE = 1/(T−1)Σ 1/(1+KL(S_t‖S_{t−1})) (eq. 11); p(S_{t,i}) = R[S_{t,i}]/ΣR[S_{t,j}] (eq. 12).
- PFS_D = Corr(S, α(X+ε)) (eq. 14); PFS = min over the two noise families (eq. 15).
- DH = (−Σ p_i log p_i)/log m, p_i = λ_i/Σλ_j (eqs. 16–17).
- Assumptions: IC/RankIC are adequate predictive proxies; KL-on-rank-distributions measures economically meaningful stability; input-noise perturbations proxy real market shocks; an LLM's logic rating correlates with true economic validity; eigenvalue entropy captures useful diversity; Qlib A-share/US panels generalize.

## 5. Features / target
Inputs: the alpha set produced by each miner (symbolic expressions + their signal tensors on Qlib data). No new market features; the "target" is the miner ranking itself. Perturbation scales tied to market index volatility.

## 6. Validation design
Q1 miner comparison across 5 dimensions (Table 2, A-share); Q2 complementarity of dimensions; Q3 alignment with real behaviors (turnover, drawdown); Q4 speedup vs. backtesting. Baselines for selection: single-metric screening (IC alone) vs. integrated AlphaEval score — portfolio cumulative returns compared (Fig. 2). Consistency claim: AlphaEval rankings "highly consistent with precision backtesting outcomes."

## 7. Numerical results / baselines
- Table 2 (A-share; Predictive↑/Stability↑/Robustness↑/Diversity↑/Logic↑): GP 0.017/0.724/0.983/0.693/63.5; AutoAlpha 0.027/0.774/0.971/0.946/64.0; AlphaEvolve 0.028/0.975/0.688/0.897/63.0; AlphaGen 0.034/0.978/0.997/0.650/59.0; AlphaQCM 0.029/0.975/0.996/0.477/62.0; AlphaForge 0.040/0.977/0.677/0.743/62.5; FAMA 0.031/0.868/0.992/0.831/69.0; AlphaAgent 0.041/0.779/0.415/0.812/70.0; Random 0.009/0.844/0.846/0.981/60.0.
- Reading: GA-based = most robust/stable; RL-based = stable + robust but low logic; LLM-based = best predictive + logic, weaker robustness.
- Fig. 2: portfolios from integrated-AlphaEval-selected alphas beat any single-dimension selection on cumulative returns.
- Speedup vs. backtesting claimed "significant" (exact factor in appendix; backtest-free + parallelizable by construction).

## 8. Code / data availability
Fully open-sourced: https://github.com/BerkinChen/AlphaEval (stated). Data: public Qlib.

## 9. Leakage & limitations
- LLM Logic Score is subjective and model-dependent; no inter-rater reliability reported.
- "Consistency with backtesting" is asserted without a reported rank-correlation number in the extracted text.
- PFS perturbations are synthetic input noise — may not reflect real regime breaks.
- DH rewards eigenvalue spread, which a set of mutually anti-correlated junk signals could also maximize; diversity ≠ quality.
- No multiple-testing correction anywhere in the framework — AlphaEval scores selection quality, not statistical significance (complement, not substitute, for MinervaScore).

## 10. GSE overlap
New capability; pairs with 2048 (MinervaScore): AlphaEval = fast parallel pre-filter during mining (which candidates deserve full evaluation), MinervaScore = rigorous post-selection gate. No overlap in the research map. The paper's Table 1 is also a useful miner inventory for this lane.

## 11. GSE implementation spec
Port `alphaeval` to sports (`gse.validation.alphaeval`):
1. PPS: IC + RankIC of signal vs. ATS-cover residual on team-game panel.
2. RRE: week-to-week rank stability of teams by signal value (high RRE = stable, low-churn signals — desirable for weekly betting).
3. PFS: perturb input features with Gaussian noise (σ = feature's weekly std) and heavy-tailed t(3); sports analogue of "structural shock" = randomly drop a week's data or shuffle a team's bye-week alignment; PFS = min Spearman.
4. Logic: LLM rates the formula's sports plausibility ("does this express a real football concept?") — catches overfit nonsense early.
5. DH: eigenvalue entropy of the zoo's signal covariance.
Use as the mining loop's fitness (weighted sum) so miners optimize all five, not just IC.

## 12. Reproducible test
nflverse team-game panel 2009–2025; compute all five dimensions for a fixed candidate set (e.g., 200 random + GP-mined formulas) on 2009–2019; verify (a) integrated score selects a set whose 2020–2025 Brier beats IC-only selection by the paper's claimed margin direction; (b) RRE correlates negatively with realized signal turnover; (c) runtime vs. a full walk-forward backtest of the same set.

## 13. Acceptance / rejection gate
ADAPT→build if integrated-score selection beats IC-only selection by ≥ 0.002 Brier on 2022–2025 AND evaluation runs ≥ 10× faster than the equivalent walk-forward backtest. REJECT if dimensions are mutually redundant on sports data (pairwise |corr| > 0.8) or the integrated score doesn't beat IC-alone.

## 14. Improvement experiment
Beyond the paper: add a sixth dimension, **Market Orthogonality** — 1 − |Corr(signal, closing-line-implied edge)|. The paper's five dimensions never ask whether the alpha is already in the price; in sports this is the difference between a real edge and a rediscovered market. Also replace the subjective LLM logic score with a two-LLM debate protocol (proposer + skeptic) to reduce single-model rating bias, and calibrate the debate score against human expert ratings on a labeled formula set.
