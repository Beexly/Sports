# [0817] Maximum drawdown, recovery, and momentum (arXiv:1403.8125)

**Citation:** Jaehyung Choi (2014, v4). *Maximum drawdown, recovery, and momentum*. arXiv:1403.8125. URL: https://arxiv.org/abs/1403.8125 (Goldman Sachs disclosure: author's personal views, not investment advice).
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache; 81KB; read §§1–6 in full including Tables 1–3, 8–9).
**Verdict:** ADAPT — the path-decomposition C = PP − MDD + R and the empirical finding that "same cumulative return, smaller drawdown / stronger recovery" predicts better forward performance transfer to GSE as a team-form feature (path-dependent ratings) and as a bankroll-regime signal; equity-momentum results themselves don't transfer, but the construction is clean and fully reproducible.

## 1. Research question
Do maximum drawdown (MDD) and its consecutive recovery (R) — or composites built from them — beat cumulative past return as ranking criteria for momentum (monthly) and contrarian (weekly) equity portfolios? Hypothesis: two assets with identical cumulative returns have different forward prospects if one got there smoothly and the other via a deep drawdown plus recovery; drawdown encodes downside-momentum information and recovery encodes short-term reversion support.

## 2. Dataset / schema
Three universes: (a) KOSPI 200, South Korea, Jan 2003–Dec 2012, prices + component-change list from Korea Exchange; (b) SPDR US sector ETFs (XLB, XLE, XLF, XLI, XLK, XLP, XLU, XLV, XLY), Jan 1999–Dec 2012, Bloomberg; (c) S&P 500, Jan 1993–Dec 2012, prices + historical component changes, Bloomberg. Estimation: 6 months (momentum) / 6 weeks (contrarian); 10 decile baskets (KOSPI, S&P 500), 3 baskets (ETFs); equally weighted; dollar-neutral long-short (winner long / loser short for momentum; loser long / winner short for contrarian); overlapping 1/6 rebuilt monthly (weekly). Risk model: ARMA(1,1)-GARCH(1,1) with classical tempered stable (CTS) innovations for VaR/CVaR/Sharpe.

## 3. Method / model
MDD = max_{τ}(max_{t<τ}(P(t) − P(τ))) on log-prices; recovery R = R(t*,T), log-return from the end of the MDD formation t* to period end. Path decomposition: C = R_I + R_II + R_III = PP − MDD + R (pre-peak, drawdown, recovery). Seven ranking rules (Table 1): C cumulative (weights 1,1,1 — benchmark); M MDD (0,1,0); R recovery (0,0,1); RM = R−MDD (0,1,1); CM = C−MDD (1,2,1); CR = C+R (1,1,2); CMR (1,2,2). MDD ranked descending (prefer small drawdown); others ascending. Carhart four-factor regression (MKT, SMB, HML, MOM from Ken French's library) on S&P 500 portfolios.

## 4. Equations & assumptions
MDD = max_{τ∈(0,T)}(max_{t∈(0,τ)}(P(t) − P(τ))); equivalently MDD = −min_{τ}min_{t<τ} R(t,τ). R = R(t*,T). Decomposition: C = PP − MDD + R. CTS characteristic function (given in §3.3, 6 parameters m, α, C±, λ±). Carhart: r_p = α + β_MKT f_MKT + β_SMB f_SMB + β_HML f_HML + β_MOM f_MOM + ε_p.
Assumptions (stated/latent): ranking on realized path statistics is stationary enough to persist; overlapping portfolios approximate implementable returns (no transaction costs modeled — noted weakness); decile sorts assume sufficient cross-section; CTS-GARCH risk model correctly captures tails.

## 5. Features / target
Features: PP, MDD, R path components and their weighted composites. Target: next-period (6-month / 6-week holding) long-short portfolio return; secondarily Carhart alpha. Horizon: monthly momentum, weekly contrarian.

## 6. Validation design
In-sample ranking + out-of-sample holding across 3 universes; no walk-forward refit (rules are fixed formulas); Carhart regression as risk adjustment on S&P 500. No transaction costs, no explicit train/test split (standard momentum-literature design — a limitation). Significance stars on alphas.

## 7. Numerical results / baselines
KOSPI 200 weekly 6/6 contrarian (Table 2): benchmark C L−W weekly 0.0731% (σ 2.8417%); R (recovery) L−W 0.1455% (σ 1.7567%) — ~2× return at ~40% lower vol; CR 0.0857%, CMR 0.0779%; MDD-based rules (M, CM, RM) underperform benchmark. R portfolio daily VaR₉₅ 1.149%, CVaR₉₅ 1.391% (lowest of all), MDD of strategy 30.09% vs benchmark 33.66%.
KOSPI 200 monthly 6/6 momentum (Table 3): benchmark C W−L 1.3305%/mo (σ 6.8258%); CM 1.4330%/mo (σ 7.0357%, lowest kurtosis); RM 1.2803%, CMR 1.3106%; R rule worst at monthly scale (0.3740%). MDD-based rules dominate at monthly scale; recovery rules dominate at weekly scale — consistent with "drawdown = trend information, recovery = reversion information".
S&P 500 Carhart (Tables 8–9): weekly contrarian — only statistically significant alpha is R L−W: α = 0.1373%/wk (5%); benchmark α = −0.0071 (insignificant). Monthly momentum — M W−L α = 0.8273%/mo (5%, largest); benchmark α = 0.2169 (insignificant). Author's claim "robustly work" is fair for R-weekly and M/CM-monthly, not for all seven rules.

## 8. Code / data availability
No code. Data: Korea Exchange (KOSPI), Bloomberg (ETFs, S&P 500), Ken French data library (factors) — commercial/licensed sources, not redistributable.

## 9. Leakage & limitations
- No transaction costs on weekly-rebalanced, 10-basket overlapping portfolios — real implementability overstated, especially the weekly contrarian (high turnover).
- Multiple-comparison concern: 7 rules × 3 universes × 2 horizons; headline winners selected ex post. Carhart significance on S&P 500 mitigates but doesn't eliminate.
- MDD/recovery are backward-looking path statistics with lookahead-free construction, but the estimation window choice (6m/6w) is inherited from Jegadeesh-Titman convention, not optimized.
- Equities only; momentum/contrarian effects are market-microstructure phenomena — the numbers do not transfer to sports. What transfers is the construction.
- 2003–2012 / 1993–2012 sample; no post-2012 validation.

## 10. GSE overlap
Existing-research map: momentum covered 6× (incl. WP 1410.7586 factor-momentum ML, 1403.4892 sports momentum betting). Drawdown appears in the map via WP 0807.1667 (Kelly-drawdown) but never as a *feature construction*. Nothing decomposes team form into peak/drawdown/recovery phases — that is the novel, adaptable piece. Connects to tracking lane (form features) and sizing lane (bankroll drawdown monitoring).

## 11. GSE implementation spec
Adaptation: "path-dependent form features" for team ratings. For each team, over a rolling N-game window, compute on a per-game performance series (e.g., game EPA margin or spread-cover margin): PP/MDD/R decomposition — cumulative margin C, worst peak-to-trough slide MDD (the "slump"), and recovery R since the slump's end. Add as features to the GSE model: teams with identical W-L but small-MDD/strong-R paths should rate differently from big-MDD/no-recovery paths. Second use: bankroll-regime signal — track MDD of the engine's own cumulative pick P&L; when the engine is in drawdown, recovery-phase detection (R turning positive) gates stake ramp-up (ties to the sizing lane). Effort: ~2–3 days (feature engineering + ablation).

## 12. Reproducible test
Dataset: nflverse play-by-play 2020–2025 → per-team game EPA margins; GSE picks DB for the bankroll-regime test. Protocol: add (MDD, R, PP) form features over 6-game windows to the existing GSE model; ablation: model with vs without, evaluated on 2024→2025 walk-forward (log-loss on game outcomes, ROI on picks). Baseline: current form features (raw W-L / EPA averages). Bankroll test: simulate stake multiplier = f(engine P&L drawdown phase) vs flat Kelly.

## 13. Acceptance / rejection gate
ADAPT if adding path-decomposition form features improves 2025-holdout log-loss or pick ROI over the no-path baseline with statistical significance (paired test, p<0.05), OR the bankroll-regime gate improves risk-adjusted return (Calmar) — else the construction is noted as tested-and-failed and stays out of the model.

## 14. Improvement experiment
Two extensions: (1) Composite rules à la Table 1 for teams: rank upcoming opponents' vulnerability by RM-style score (recovery minus drawdown of the *opponent's* recent form) — a "buy the slump-ending team, fade the peak-reverting team" signal; test as a standalone binary feature. (2) Cross-sport transfer: the weekly-contrarian result (R dominates at short horizons) suggests recovery features matter most for short-horizon props/DFS; test R-features specifically on player-prop lines (week-to-week player form slumps and recoveries) rather than game outcomes.
