# [1931] Offline Deep Reinforcement Learning for Dynamic Pricing of Consumer Credit (arXiv:2203.03003)

**Citation:** Raad Khraishi, Ramin Okhrati (2022). *Offline Deep Reinforcement Learning for Dynamic Pricing of Consumer Credit*. arXiv:2203.03003. URL: https://arxiv.org/abs/2203.03003
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Can an effective personalized pricing policy be learned purely from a static dataset of past pricing decisions and outcomes — with no online price experimentation (which would incur financial/reputational cost) and no assumed functional form of demand? The paper formulates consumer-credit pricing as offline RL and tests CQL on real auto-loan data and synthetic data.

## 2. Dataset / schema
(a) Real: ~200,000 approved US auto-loan applications from an online lender (Center for Pricing and Revenue Management, Columbia: gsb.columbia.edu/cprm/research/datasets); columns: interest rate charged, term, approved amount, FICO score, accept/reject outcome. (b) Synthetic loan data (demand simulated under known forms, to test robustness). Evaluation of the learned policy uses a logistic-regression price-response model p(Accept|s,a) fitted on the test set to estimate expected reward — i.e., a model-based off-policy evaluator. Train/val/test splits and hyperparameters in the appendix.

## 3. Method / model
**Offline CQL for pricing.** State s_t = [Term, Amount, FICO, PD, PreviousRate, CompetitionRate, PrimeRate, Tier, LoanType, CarType, PartnerBin, State, Months, DayOfWeek, MonthOfYear, DaysSinceApp] (partially observable — e.g., job loss unobserved; adverse selection discussed). Action a_t ∈ ℝ⁺ = quoted APR. Reward r(s,a) = expected profit per Phillips et al. 2015 (interest income − capital costs − credit risk; Net Income/Net Interest Income variants noted). Algorithm: CQL (continuous-action actor-critic variant) to regularize Q against OOD prices. Baselines: historical policy π_β; profit-based optimization π_Opt (logistic price-response fitted on train, then per-application argmax of expected reward, prices clipped to [2.5%, 12.5%]).

## 4. Equations & assumptions
- Reward: r(s_t,a_t) = p(Accept_t | s_t,a_t) · (expected profit if accepted per Phillips et al. 2015), accounting for interest income, capital costs, credit risk.
- CQL objective: standard CQL(ℋ)-style conservative actor-critic (paper references Kumar et al. 2020; penalty term "estimated using samples from the current policy").
- π_Opt: a*_t = argmax_{a∈[2.5%,12.5%]} p̂(Accept|s_t,a)·profit(s_t,a) with p̂ from training-set logistic regression.
- Assumptions: static dataset, no unobserved confounding beyond the stated partial observability; off-policy evaluation via the logistic response model is unbiased enough to rank policies (authors acknowledge pseudo-R² is low); reward uses a simplified profit measure.

## 5. Features / target
Input: 16 application/market features listed above. Target: Q(s, APR) and the actor's APR; reward = expected profit in currency units. Horizon: single-step pricing per application (myopic; sequential aspect is across the application stream, not within a loan).

## 6. Validation design
Train/val/test splits on the 200k applications (appendix details); 3 seeds. Baselines: historical policy, parametric profit-optimization. Metrics: expected profit on test (via the response model), mean absolute percentage deviation (MAPD) of prices from historical policy. Sensitivity: π_Opt re-evaluated under alternative parametric and non-parametric price-response models with comparable classification accuracy.

## 7. Numerical results / baselines
- CQL policy π_CQL: "+21% in expected profit" over the historical policy π_β "while maintaining a less than 15% mean absolute percentage deviation in prices from the existing policy" (3-seed average); average price pushed down 6.8% → 5.9%, consistent with documented historical over-pricing (Phillips et al. 2015).
- π_Opt (parametric): "+34% increase in expected profit" with 24% MAPD — but fragile: under alternative response models with similar fit, estimated gain ranges from "a −7% decrease to a 34% increase ... with an average estimate of 12.6%," with "strong evidence of overfitting."
- Baseline logistic regression achieves only a low pseudo-R² ("limited explainability of the feature set") — the regime where model-free offline RL's advantage is largest.
- Synthetic experiments (section 4.2): CQL recovers near-optimal pricing under misspecified demand (exact numbers in figures; direction favors CQL robustness).

## 8. Code / data availability
Data: Columbia CPRM auto-loan dataset (public via link above). No code URL stated in the paper.

## 9. Leakage & limitations
- Off-policy evaluation is model-based (logistic response); the +21% is an *estimated* profit, not realized — same-model evaluation/optimization circularity partially addressed by the sensitivity analysis, but the evaluator's low pseudo-R² caps credibility.
- Single-step (myopic) formulation: no sequential credit-risk dynamics; GSE's problem is genuinely sequential (bankroll evolution), so this transfers as a per-decision module, not the full loop.
- Partial observability/adverse selection acknowledged but not solved.
- Fairness constraints on pricing features noted but not implemented.

## 10. GSE overlap
Closest applied analog in the lane: logged historical decisions + outcomes → offline CQL → better prices, with the same "no live experimentation" constraint GSE faces (can't A/B test stakes with real money recklessly). Repo has no pricing/staking paper (Kelly mentioned, never read; gap #1). The paper's core lesson transfers directly: parametric stake rules (Kelly with plug-in probabilities) are the analog of π_Opt — fragile to the assumed edge→probability mapping — while model-free CQL learns the mapping from data.

## 11. GSE implementation spec
1. Mirror the paper's MDP: state = per-bet feature vector (engine edge, de-vigged fair odds, market odds, CLV history, book, day-of-week, slate size, bankroll fraction), action = stake ∈ {0, 0.25u, 0.5u, 1u, 2u}, reward = settled profit (units).
2. Train offline CQL on 2021–2023 logged picks; evaluate on 2024 with a model-based off-policy evaluator (fit a bet-outcome model on 2024 market data, analogous to their logistic response model) AND with realized settlement (which the paper lacked — GSE can do better).
3. Constrain: MAPD of stakes vs the historical fractional-Kelly rule ≤ 25% (their <15% price-deviation idea as a trust region for Garrett's approval).
4. Report: expected-profit lift, price/stake deviation, and the sensitivity analysis — re-evaluate the learned policy under 3 different outcome models to check the π_Opt-style fragility.
5. Effort: ~2 weeks (their recipe, GSE data).

## 12. Reproducible test
Dataset: GSE logged picks + odds 2021–2024. Train 2021–2023, test 2024. Baselines: historical fractional-Kelly, parametric "Kelly-Opt" (plug engine win-prob into Kelly formula, argmax per bet). Metrics: realized 2024 ROI (not just model-estimated — stronger than the paper), max drawdown, stake MAPD vs baseline. Sensitivity: re-score under alternative outcome models.

## 13. Acceptance / rejection gate
ADOPT iff on realized 2024 settlement the CQL staking policy beats fractional-Kelly ROI by ≥2pp with stake MAPD ≤ 25% AND the sensitivity re-scoring keeps the sign of the lift under all 3 outcome models; if the lift vanishes under alternative evaluators (the π_Opt disease), REJECT.

## 14. Improvement experiment
Add the paper's missing piece — multi-step bankroll dynamics: extend the MDP so the state includes current bankroll and the reward is log-bankroll-growth (true Kelly objective), making the pricing decision sequential rather than myopic. Tests whether sequential CQL discovers stake-smoothing (betting less after losses beyond what myopic CQL does) — the behavior the paper's formulation cannot express.
