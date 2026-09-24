# [2045] Chain-of-Alpha: Unleashing the Power of Large Language Models for Alpha Mining in Quantitative Trading (arXiv:2508.06312)

**Citation:** Lang Cao, Zekun Xi, Long Liao, Ziwei Yang, Zheng Cao (2025). *Chain-of-Alpha: Unleashing the Power of Large Language Models for Alpha Mining in Quantitative Trading*. arXiv:2508.06312v2. URL: https://arxiv.org/abs/2508.06312
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~9,700 words).
**Verdict:** ADAPT

*Why:* the dual-chain (generation + backtest-feedback optimization) LLM mining loop with a 4-dimensional factor scorecard (Strength/Consistency/Efficiency/Diversity) is directly adaptable to GSE; the LLM proposes sports formulas, a backtest engine scores them, no human in the loop.

## 1. Research question
Can a fully automated LLM framework — with no human intervention and using only market data — mine formulaic alphas better than classic factor libraries (Alpha 101/158/360), traditional miners (GP, DSO, AlphaGen, AlphaForge), and other LLM reasoning schemes (CoT, ToT, MCTS)? The proposal: a dual-chain architecture where a Factor Generation Chain proposes diverse seed factors and a Factor Optimization Chain iteratively refines each seed using backtest feedback and optimization history.

## 2. Dataset / schema
China A-share: CSI 500 (mid-cap) and CSI 1000 (small-cap) constituent panels, 2010-01-01–2025-06-30. Splits: train 2010–2019, validation 2020–2021, test 2022-01-01–2025-06-30. Alpha mining uses train+validation for generation/optimization; the integration model trains on train, validates on validation, tests on test. Raw features per stock-day: open, high, low, close, volume + other market features (tensor X ∈ R^{T×n×m}). Prediction horizon h = 10 trading days; factor computed from history up to t, target = forward return t→t+10. Benchmarks excess over the market index.

## 3. Method / model
**Formal setup:** alpha factor f maps history to signal v_t = f(X_{t−τ+1:t}) ∈ R^n; K factors F={f_1…f_K} aggregated by combination model g into composite signal z_t = g({v_{k,t}}; θ_g) ∈ R^n; composite matrix Z(F,θ_g) scored vs realized returns Y. Bilevel: inner fits θ*_g for given F; outer searches F* — simplified to finding high-IC, diverse factors under a fixed pipeline.
**Factor scorecard (evaluated per factor, immediately on generation):** Score = Evaluate(f) = [S, C, E, D]:
- S (Strength) = cross-sectional RankIC vs. future returns.
- C (Consistency) = RankICIR = mean(RankIC)/std(RankIC) over time.
- E (Efficiency) = turnover rate of implied positions (lower = cheaper).
- D (Diversity) = min_{f_k ∈ F^e} (1 − Corr(f, f_k)) over the effective pool.
Check(f, S) → binary effective indicator; effective → candidate pool F^e; failures → deprecated pool F^d (negative reference for the LLM).
**Generation Chain:** f^seed = LLM(F^e, F^d | P_generation) with chain-of-thought; prompt includes data-field descriptions, operator list, task instructions; output parsed to executable code. Self-evolving chain: f^seed_{k+1} = Chain_generation(f^seed_1…f^seed_k). Diversity is the priority here.
**Optimization Chain:** for each seed, LLM generates variants {f_k^{(1)}…f_k^{(m)}} guided by backtest results B and optimization history H_k: low IC → boost signal strength; low RankICIR → improve stability. Effectiveness is the priority here.
**Integration:** selected factors filtered, then fed to predictive models (decision trees / neural nets) producing trading signals.

## 4. Equations & assumptions
- v_t = f(X_{t−τ+1:t}); z_t = g({v_{k,t}}_{k=1}^K; θ_g); Z(F,θ_g) ∈ R^{T×n}.
- Score = Evaluate(f) = [S, C, E, D] (eq. 1); E = Check(f, S) ∈ {0,1} (eq. 2).
- f^seed = LLM(F^e, F^d | P_generation) (eq. 3); f^seed_{k+1} = Chain_generation(f^seed_1,…,f^seed_k) (eq. 4).
- D(f) = min_{f_k∈F^e} (1 − Corr(f, f_k)).
- Assumptions: LLM-generated formulas are syntactically valid after parsing (a parser + fallback is implied); backtest feedback is honest (no leakage); the four scorecard dimensions with fixed thresholds adequately define "effective"; top-100-by-RankIC selection from a 1,000-candidate budget is a fair cross-method comparison; LLM priors about markets transfer to formula quality.

## 5. Features / target
Inputs: OHLCV + market features per stock-day; operators list given in prompt (per appendix). Target: 10-day forward return. Selection thresholds on S/C/E/D (appendix). Integration models: decision trees / neural networks trained on selected factor values.

## 6. Validation design
Fixed search budget: every method generates ≤1,000 candidates; top 100 selected by RankIC; then identical integration pipeline (train/val/test as above). Baselines: classic (Alpha 101 with inapplicable formulas removed, Alpha 158, Alpha 360), traditional miners (GP, DSO, AlphaGen, AlphaForge), LLM schemes (LLM+CoT, LLM+ToT, LLM+MCTS with UCT). Metrics: IC, RankIC, ICIR, RankICIR, annualized return (AR), IR — all benchmarked as excess over index. Demo prompts + configs in appendix.

## 7. Numerical results / baselines
Table 1 (best per column bolded; Chain-of-Alpha best in 10 of 12 metrics):
- CSI 500 — IC/RankIC/ICIR/RankICIR/AR/IR: Alpha 101: 0.0345/0.0617/0.2170/0.4239/0.0568/0.7311; AlphaGen: 0.0460/0.0769/0.2786/0.4711/0.1150/1.2751; AlphaForge: 0.0463/0.0638/0.3291/0.4630/0.0989/1.1918; LLM+CoT: 0.0404/0.0711/0.2558/0.4870/0.0759/0.9659; **Chain-of-Alpha: 0.0485/0.0771/0.3047/0.5013/0.1324/1.4178** (best AR and IR).
- CSI 1000 — **Chain-of-Alpha: 0.0672/0.0902/0.4630/0.6228/0.1471/1.4043**, best in 5 of 6 (ICIR best 0.4630).
- The AR/IR edge (the metrics that matter for real trading) is the largest margin: e.g., CSI500 AR 0.1324 vs next-best AlphaGen 0.1150.

## 8. Code / data availability
None stated in the main text (demo prompts/configs in appendix; no repo URL found in the extracted text).

## 9. Leakage & limitations
- Mining uses train+validation for generation/optimization while the integration model validates on the same validation set — the selected factors are thus validation-tuned, inflating the "test" comparison vs. methods that didn't see validation (a subtle but real selection bias; the 1,000-candidate budget controls compute, not information).
- Top-100-by-RankIC selection is itself a multiple-testing machine: with 1,000 candidates, the best RankICs are optimistic; no deflated-Sharpe/White correction is applied before integration.
- LLM priors may regurgitate known factors (Alpha 101-style) — "novelty" is only enforced via the D term against the pool, not against the literature.
- No transaction-cost modeling in E beyond turnover rate; A-share market frictions unaddressed.
- Which LLM was used (model, size, temperature) is in the appendix — not verified in my read; results may be model-specific.

## 10. GSE overlap
New capability; no LLM-driven signal miner in the research map. This is the most GSE-compatible miner in the lane because it replaces the RL/GP search with an LLM + backtest loop — cheap to prototype (no GPU training), and the 4-D scorecard (Strength/Consistency/Efficiency/Diversity) ports almost verbatim to sports. Distinct from 2043/2044 (DL/RL miners) in search mechanism; the scorecard idea should be borrowed regardless of miner choice.

## 11. GSE implementation spec
1. **Generation chain:** LLM (any strong model) prompted with: data dictionary (nflverse team-game features + line-movement features), operator list (from 2042), task ("propose a formula predicting ATS cover residual"), plus current effective pool F^e and deprecated pool F^d. Parse to Python via a safe expression evaluator.
2. **Backtest engine:** Evaluate(f) → [S=RankIC vs cover residual, C=RankICIR across weeks, E=signal turnover (week-to-week sign flips), D=min 1−Corr vs F^e]; thresholds e.g. S>0.02, C>0.3, E<0.5, D>0.3.
3. **Optimization chain:** feed failures back ("RankICIR 0.12 — too unstable; propose a variant using longer lookbacks or smoothing") with history H_k; cap at m=5 variants per seed.
4. **Integration:** top factors by S into the calibrated spread model; weekly re-score.
5. Effort: ~1–2 weeks; mostly prompt + evaluator engineering. Guardrail: hard multiple-testing correction (Benjamini–Hochberg or deflated Sharpe) before any factor enters F^e.

## 12. Reproducible test
nflverse team-game panel 2009–2025. Mining on 2009–2019 (train) + 2020–2021 (validation-equivalent); integration trained 2009–2019, tested 2022–2025. Baselines: GP miner and random-search miner with the same 1,000-candidate budget and identical integration. Metric: test RankIC vs. cover residual + Brier lift on 2022–2025.

## 13. Acceptance / rejection gate
ADAPT→build if the LLM chain's selected factor set beats the GP baseline's set by ≥ 0.002 Brier on 2022–2025 AND at least 5 factors survive Benjamini–Hochberg (q<0.10) on the test block. REJECT if LLM factors ≈ regurgitated known signals (D vs. literature check fails) or if validation-tuned selection doesn't survive the honest test window.

## 14. Improvement experiment
Beyond the paper: add a **causal-invariance** dimension to the scorecard — require the factor's IC to hold within officiating-crew / weather / rest-bucket subsamples (sports analogues of "market regimes"), i.e., Score=[S,C,E,D,I] with I = min-subsample IC. The paper's C (RankICIR) measures temporal stability but not conditional stability; a factor that only works in dome games is a trap. Second: make the deprecated pool semantic — cluster failed formulas by structure so the LLM avoids whole families, not just near-duplicates.
