# [2048] Equity Strategy Backtesting: Luck or Edge? The MinervaScore as a Statistical Robustness Grade (arXiv:2608.23808)

**Citation:** M. L. Santoni, V. Jouanne, M. L. Scullin (2026) [Minerva, Minerva1.com]. *Equity Strategy Backtesting: Luck or Edge? The MinervaScore as a Statistical Robustness Grade*. arXiv:2608.23808v2. URL: https://arxiv.org/abs/2608.23808
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~18,900 words).
**Verdict:** ADOPT

*Why:* this is the multiple-testing / backtest-overfitting validation layer the sports-signal-mining program needs: DSR + PBO + SPA + MinTRL + regime-stability combined into one auditable score with a hard Seal gate. Adopt the construction almost verbatim, re-parameterized for weekly sports panels.

## 1. Research question
A strong backtest can reflect search luck (the max of 10,000 trials) rather than a persistent signal, and standard summaries (return, Sharpe, drawdown) don't record trial count, out-of-sample survival, or history sufficiency. Can four established validation quantities — Deflated Sharpe Ratio (DSR), Probability of Backtest Overfitting (PBO), Superior Predictive Ability (SPA), Minimum Track Record Length (MinTRL) — plus a regime-stability diagnostic be combined into a single auditable robustness grade (0–100) with a binary "Robustness Seal", calibrated on 359,062 production backtest records?

## 2. Dataset / schema
Calibration population: 359,062 production backtest records (proprietary platform data, Minerva). Synthetic markets with known ground truth for discrimination testing. One pre-registered test on unseen real-market data. Five strategy families represented in calibration. No public data release stated.

## 3. Method / model
**Five gates → Seal (eq. 2):** Seal = 1[DSR ≥ τ_DSR ∧ PBO ≤ τ_PBO ∧ SPA ≤ τ_SPA ∧ T ≥ MinTRL ∧ ρ ≥ τ_ρ], with τ_DSR = 0.95, τ_PBO = 0.50, τ_SPA = 0.10, τ_ρ = 0.60; MinTRL per Bailey & López de Prado.
**Regime composite (eq. 3, the paper's own 5th gate):** ρ = 0.5·p_+ + 0.3·clip_[0,1](1 − s_SR/σ_ref) + 0.2·logistic(SR_min), where p_+ = fraction of validation windows with positive Sharpe, s_SR = std of per-window Sharpes, SR_min = minimum across windows, σ_ref = 2 (fixed), weights heuristic (sensitivity analyzed in §8; authors flag this gate as the most heuristic component).
**Evidence floor:** separate flag for insufficient empirical support (too few trades/candidates/windows) — NOT a sixth gate, only qualifies interpretation.
**Signed margins (§4.2):** DSR on the pre-Φ scale: z_DSR = (u − Φ^{−1}(τ_DSR))/σ_DSR with u = (SR̂ − SR_0)/ŝe (DSR = Φ(u)); bounded gates on logit scale: z_k = (logit(τ_k) − logit(g_k))/σ_k for k ∈ {PBO, SPA}, z_ρ = (logit(ρ) − logit(τ_ρ))/σ_ρ (clamped to [ε,1−ε], ε=10⁻⁶); MinTRL via tanh: z_MinTRL = tanh((T − MinTRL)/σ_T), σ_T = max(0.2·MinTRL, 50). Dispersions σ_k from IQR on the calibration population. **Fail-closed:** if a record has DSR but not the pre-Φ statistic u, no score is produced (can't reconstruct from Φ-clamped 0.0).
**Aggregation (§4.3, eq. 7):** S = wᵀz / √(wᵀΣ_eff w), w = (0.35, 0.25, 0.20, 0.10, 0.10) (DSR first), Σ_eff = cross-sectional correlation of margins estimated once on calibration (Hartung-style dependence adjustment; Lipták/Whitlock weighting rationale). S → 0–100 display with 80+ reserved for Seal holders (display invariant).

## 4. Equations & assumptions
- Seal (eq. 2), ρ (eq. 3), z-margins (eqs. 4–6), aggregation S (eq. 7) — as above, quoted faithfully.
- DSR = Φ((SR̂ − SR_0)/ŝe), SR_0 = expected Sharpe under the null given K trials (Lo/Bailey–López de Prado deflation); implementation uses Lo's null sampling variance.
- Assumptions: the four established gates are each valid; margins are descriptive coordinates (NOT p-values — authors explicitly disclaim inferential interpretation of z_k and S); IQR-based σ_k is stable; Σ_eff estimated once transfers across strategies; ρ's heuristic weights are acceptable (flagged as weakest link); calibration population (359k records) represents future strategies.

## 5. Features / target
Inputs per strategy record: backtest return series, trial count K, per-window Sharpe series, track-record length T. Target of the score: rank statistical support (explicitly NOT the probability of future profit).

## 6. Validation design
Synthetic markets with known ground truth (signal vs. noise) at a "headline difficulty" → AUROC of MinervaScore vs. GT-Score proxy, gates-passed baseline, and DSR-alone baseline. Pre-registered test on unseen real-market data: Spearman correlation between score and forward performance. Sensitivity analyses (§8) on ρ weights and gate thresholds. No train/test split in the ML sense — it's a constructed metric, validated on synthetic + one pre-registered real test.

## 7. Numerical results / baselines
- Synthetic ground truth: MinervaScore AUROC = **0.989** at headline difficulty — near-perfect separation of true signal from lucky backtests.
- Improvement over the GT-Score proxy and the gates-passed baseline is **modest**; score "remains close to the corrected DSR-alone baseline" (authors' honest caveat — most of the value is the DSR).
- Pre-registered real-market test: **no significant forward relationship** — Spearman ρ_s = 0.013, one-sided permutation p = 0.40 — "in a population with limited surviving edge". The authors therefore position the score as "an auditable validation and reporting layer, rather than evidence of demonstrated real-market predictability."

## 8. Code / data availability
None stated (no repo URL in extracted text). Contact email @minerva1.com on the title page. The 359k-record calibration set is proprietary.

## 9. Leakage & limitations
- The pre-registered real test FAILED to show forward predictability — the score ranks statistical support, not future profit; Garrett must not read a high score as "this signal will win."
- ρ gate is admitted heuristic (weights 0.5/0.3/0.2 chosen by judgment).
- DSR-alone does most of the work — the marginal value of the full aggregation over a corrected DSR is small.
- Calibration on one platform's production records; transfer to sports betting backtests unproven.
- Fail-closed design means legacy records without pre-Φ u can't be scored — GSE must store u from day one.

## 10. GSE overlap
No backtest-validation standard exists in the research map — this fills the exact gap the lane's bridge rule demands ("deflated-Sharpe / White's-reality-check gate"). It operationalizes the acceptance gates in every other ledger of this lane (2042–2047). Highest-priority ADOPT of the wave.

## 11. GSE implementation spec
Build `gse.validation.minerva`:
1. Per mined signal, compute: DSR (deflated by the actual number of candidate formulas evaluated — log every evaluation, including pruned ones), PBO (combinatorial symmetric CV over seasons: CSCV with S=16 partitions), SPA (White/Hansen test vs. the benchmark signal set), MinTRL (Bailey–López de Prado formula with weekly Sharpe), ρ (regime composite over season-phase windows: p_+ fraction of phases with positive edge, s_SR dispersion, SR_min worst phase; σ_ref re-tuned to sports scale).
2. Seal thresholds: start at the paper's (0.95/0.50/0.10/0.60) and re-calibrate τ on GSE's own backtest population once N > 1,000 scored signals.
3. Score display 0–100 for internal ranking; Seal (≥80, all gates) required before a signal enters production models.
4. Store pre-Φ u for every scored signal (fail-closed compliance).
5. Effort: ~1–2 weeks; pure statistics, no ML training.

## 12. Reproducible test
Take the last 3 seasons of GSE backtest signals (or the mined zoo from ledgers 2043–2047): score each with the sports-parameterized MinervaScore; check (a) synthetic sanity: inject known-null signals (permuted labels) and verify AUROC ≈ 1 separation; (b) the Seal pass-rate on historically profitable vs. unprofitable signals.

## 13. Acceptance / rejection gate
ADOPT if on permuted-label nulls the sports MinervaScore achieves AUROC ≥ 0.95 separating null from historically-profitable signals AND the Seal's pass rate on null signals is ≤ 5% (false-seal control). REJECT (fall back to plain deflated-Sharpe + PBO without the aggregation) if the aggregation adds no discrimination over DSR-alone on GSE data — the paper itself admits the margin is modest.

## 14. Improvement experiment
Beyond the paper: add a **market-efficiency gate** — require the signal's edge to survive residualization against closing-line movement (a signal that only "works" because it rediscovers the line is statistically robust but economically empty; DSR/PBO/SPA can't see this). This sixth gate is sports-specific and addresses exactly what the paper's framework misses: statistical robustness ≠ economic edge. Second: replace the heuristic ρ weights with weights learned (logistic regression) to maximize synthetic AUROC on sports-calibrated null/alternative simulations.
