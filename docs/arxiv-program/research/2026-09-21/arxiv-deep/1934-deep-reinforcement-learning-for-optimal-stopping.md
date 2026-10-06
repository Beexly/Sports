# [1934] Deep Reinforcement Learning for Optimal Stopping with Application in Financial Engineering (arXiv:2105.08877)

**Citation:** Abderrahim Fathan, Erick Delage (HEC Montréal). *Deep Reinforcement Learning for Optimal Stopping with Application in Financial Engineering*. arXiv:2105.08877 (updated August 7, 2026). URL: https://arxiv.org/abs/2105.08877
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADOPT

## 1. Research question
Can deep RL (DDQN, C51, IQN) learn optimal stopping policies — when to exercise a Bermudan put — that (a) recover near-optimal prices in a Black-Scholes world with known dynamics, and (b) beat classical benchmarks on real S&P 500 price paths where dynamics are unknown? First comprehensive empirical comparison of the three algorithms on optimal stopping.

## 2. Dataset / schema
(a) Synthetic: GBM risk-neutral paths S_t=S_{t−1}exp((r−σ²/2)Δt+σ√Δt·ε) for an at-the-money Bermudan put with daily exercise (American-option proxy); ground truth from binomial tree. (b) Real: 111 S&P 500 stocks, random dates 2014-03-27 → 2019-12-10; Training = 60 stocks × 2014-03-27→2016-03-29 (733 trading days); Valid_HP = same stocks × 2016-03-29→2017-11-10 (183 days); Valid_Model = 51 other stocks × 2014-03-27→2017-11-10; Test = all 111 stocks × 2017-11-11→2019-12-10 (522 days, strictly future). Objective: Expected Relative Option Payout (EROP) for ATM put, horizon T=38 days; also Expected Option Return (EOR, ROI assuming GBM-calibrated price). Data/code: "all our data, implementations, and experiments" at the authors' site (link in paper).

## 3. Method / model
Optimal stopping as RL: state = price history/time-to-maturity, actions = {exercise, wait}, reward = payout at exercise. Three algorithms: DDQN, C51 (categorical distributional), IQN. Hyperparameters tuned on Valid_HP, model selection on Valid_Model, final test once — a three-stage protocol for statistical-significance claims. Benchmarks: Rand (uniform exercise day), First (τ=0), Last (τ=T), binomial tree model (B.M.) calibrated on true dynamics (synthetic) or historical prices (real). Note: prioritized replay/dueling "degraded the results for IQN and C51 during tests and hence their use was omitted"; a custom epsilon-annealing schedule (fast early, decelerating) "proven to be more efficient."

## 4. Equations & assumptions
- Risk-neutral GBM discretization: S_t = S_{t−1} e^{(r−σ²/2)Δt + σ√Δt ε}, ε∼N(0,1).
- EROP: g_t(s_{t:T}) := (1/S_0)·(relative payout definition; ATM put over T=38 days).
- EOR: expected return on investment vs GBM risk-neutral price calibrated on recent history.
- Stopping policy: π(s_t,t) ∈ {stop, continue}; value = expected payout under the policy.
- Assumptions: Bermudan (discrete exercise dates) approximates American; no transaction costs; real-data experiment assumes historical paths are representative of future paths (test is strictly out-of-sample in time).

## 5. Features / target
Input: price path history + time-to-maturity (normalized so stocks with different starting prices are treated similarly). Target: stop/continue action values (DDQN) or return distributions (C51/IQN). Horizon: T=38 days, finite-horizon optimal stopping.

## 6. Validation design
Exemplary: three disjoint stages — Valid_HP (hyperparameters), Valid_Model (unbiased algorithm selection), Test (single final evaluation, strictly future period, different stocks partially). Baselines: Rand, First, Last, binomial tree. Metrics: expected reward, EROP, EOR. Time-ordered throughout; no lookahead (test period strictly after all training/validation).

## 7. Numerical results / baselines
- Black-Scholes pricing: "IQN successfully identifies nearly optimal prices" (vs binomial-tree ground truth).
- S&P 500 exercise, Valid sets: "both C51 and IQN outperform DDQN in the Valid_HP set ... confirmed in the Valid_Model set which points to C51 as the best model."
- Test set (Table 2): best IQN achieves "on average a 2.91% relative option payout compared to exercising on the last day which achieves 2.17%, and the binomial tree model approach that achieves 2.53%."
- EOR: "C51 achieves a 22.0% return on average which is 8% higher than any of the competing classical benchmark."
- Summary: "(1) deep RL adapts to high-volatility stochastic environments; (2) C51 and IQN outperform DDQN at higher compute cost; (3) C51 slightly outperforms IQN on real stock data."

## 8. Code / data availability
"Interested readers can find all our data, implementations, and experiments at" the authors' site (link in paper §1). S&P 500 price data is public via standard vendors.

## 9. Leakage & limitations
- No transaction costs or market impact — exercise is assumed frictionless; real bet placement has vig/slippage.
- Real-data test is one 522-day window (2017–2019, mostly bull market); regime robustness untested.
- EOR's 8% edge assumes the option can be bought at the GBM-calibrated price — the edge is vs classical *exercise* benchmarks, not vs the market price of the option itself.
- Distributional methods cost more compute than DDQN.
- Single put-option setting; calls/other payoffs not tested.

## 10. GSE overlap
New capability: nothing in the repo addresses *timing* — when during the week to place a bet as lines move, or when to cash out a live position. The engine currently produces picks; placement timing is heuristic. Optimal stopping is the formal answer, and the paper's three-stage validation (HP/Model/Test) is a protocol upgrade for all GSE backtests. Bridges to the market-microstructure gap (#3: steam-move predictability) — the stopping policy can condition on line-movement features.

## 11. GSE implementation spec
1. Formulate bet-timing as optimal stopping: state = (current edge vs market, hours to kickoff, line-movement velocity, book spread, bankroll), actions = {bet now at current line, wait}, terminal action forced at kickoff; reward = CLV captured (or realized profit) relative to acting immediately.
2. Train C51 stopping agent on 2021–2023 line-movement histories (odds API snapshots); validate with the paper's three-stage protocol: Valid_HP (2022 hyperparams), Valid_Model (2023 H1 algorithm selection), Test (2023 H2–2024, strictly future).
3. Benchmarks mirroring the paper: "First" (bet at open), "Last" (bet at close), "Rand" (random timing), and a heuristic (bet when edge > threshold).
4. Second use case: live cash-out — same formulation with in-play win probability as the underlying.
5. Effort: ~3 weeks (line-movement dataset assembly is the bulk; the RL is the paper's recipe).

## 12. Reproducible test
Dataset: GSE picks + hourly odds snapshots 2021–2024. Train/Valid_HP/Valid_Model/Test split exactly as the paper (time-ordered, test strictly future). Baselines: First/Last/Rand/threshold-heuristic. Metrics: mean CLV captured per bet (the EROP analog) and realized ROI (the EOR analog) on the test window.

## 13. Acceptance / rejection gate
ADOPT iff on the strictly-future test window the C51 stopping policy beats the best timing benchmark by ≥1.5pp of CLV per bet with realized ROI no worse than the "bet at open" baseline; otherwise REJECT (timing alpha doesn't survive transaction reality).

## 14. Improvement experiment
Distributional stopping with a *regret* objective: train the stopping agent on the distribution of CLV regret (best achievable line minus taken line) and stop to minimize CVaR of regret rather than maximize expected payout. Tests whether tail-aware timing (never missing the best line by much) beats expectation-maximizing timing — the paper optimizes expectations only, and in betting, one badly-timed key number can erase a week's edge.
