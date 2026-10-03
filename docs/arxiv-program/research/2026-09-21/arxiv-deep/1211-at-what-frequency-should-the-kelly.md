# [1211] At What Frequency Should the Kelly Bettor Bet? (arXiv:1801.06737)

**Citation:** Chung-Han Hsieh, B. Ross Barmish, John A. Gubner (2018). *At What Frequency Should the Kelly Bettor Bet?*. arXiv:1801.06737. URL: https://arxiv.org/abs/1801.06737
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — use the frequency-dependent Kelly machinery and the sufficient-attractiveness test to set bet-update cadence and to test whether "letting a position ride" adds value; sports bets settle discretely, so the n-step compounding model must be adapted to GSE's re-bet (not let-it-ride) setting.

## 1. Research question
The paper asks how often a Kelly bettor should rebalance: given an n-step waiting period between bet updates (n = 1 is high-frequency, large n is buy-and-hold), what is the optimal per-period Kelly fraction K_n*, how does optimal expected log growth g_n* depend on n, and under what conditions does higher-frequency betting add nothing? It also studies the effect of a per-bet transaction cost ε on the optimal waiting period.

## 2. Dataset / schema
No empirical dataset. Theory plus numerical examples on:
- Even-money Bernoulli gamble with win probability p (closed-form analysis).
- Transaction-cost numerical study: ε = 0.1, p ∈ {0.6, 0.7, 0.8, 0.9}.

## 3. Method / model
Define the n-step total return X_n = ∏_{k=0}^{n-1}(1 + X(k)) − 1 and the per-period objective g_n(K) = (1/n)·E[log(1 + K·X_n)]. For each waiting period n, solve for K_n* maximizing g_n. Analyze g_n* as a function of n (conjectured non-increasing without costs), add transaction cost ε per bet, and derive the "sufficient attractiveness" condition under which frequency is irrelevant.

## 4. Equations & assumptions
- X_n = ∏_{k=0}^{n-1}(1 + X(k)) − 1
- g_n(K) = (1/n)·E[log(1 + K·X_n)]
- Even-money Bernoulli: K_n* = (2^n·p^n − 1)/(2^n − 1); classical n = 1 gives K_1* = 2p − 1
- Sufficient attractiveness: E[1/(1 + X(0))] ≤ 1 ⇒ theorem: g_n* = g_1* for all n (higher frequency gives no benefit)
- Conjecture (their wording): without transaction costs, g_n* is non-increasing in the waiting period n
Assumptions: i.i.d. returns X(k), known distribution, log utility; the "let it ride" compounding between updates is the key structural assumption.

## 5. Features / target
Not a prediction paper. Inputs: gamble return distribution, waiting period n, transaction cost ε. Target: optimal per-period fraction K_n* and optimal per-period growth g_n*.

## 6. Validation design
Closed-form proof for the Bernoulli case; numerical plots for the transaction-cost case. No train/test split, no out-of-sample validation. The conjecture is stated as unproven.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- Even-money Bernoulli: K_n* = (2^n·p^n − 1)/(2^n − 1).
- With transaction cost ε = 0.1 and p ∈ {0.6, 0.7, 0.8, 0.9}, the plotted optimal waiting period is n* = 2 (i.e., with costs, betting less often beats every-period betting).
- Sufficient-attractiveness theorem: if E[1/(1 + X(0))] ≤ 1, then g_n* = g_1* for all n.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No data, so no leakage — but the conjecture (g_n* non-increasing in n) is explicitly unproven. The let-it-ride compounding model does not match sports betting, where a bet settles and the stake returns to cash; GSE re-bets from bankroll each slate rather than compounding one position. Transaction cost ε = 0.1 is illustrative, not calibrated to vig. Nonstationary edges (the norm in sports) violate i.i.d.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, Kelly sizing is a product gap with zero deep reads. GSE's current code (`apps/web/lib/staking/kelly-investigation.ts`) sizes individual bets with a fixed default fraction (0.25) and has no notion of update cadence — when to re-run sizing, whether to re-stake intraday as lines move, or when a small edge is not worth the vig. This paper is a new capability (frequency policy), not a duplicate.

## 11. GSE implementation spec
1. Implement the sufficient-attractiveness test E[1/(1+X)] ≤ 1 on GSE's per-pick edge distribution as a "stale-edge" screen: when it holds, do not chase more frequent re-staking — sizing is already frequency-optimal.
2. Build a bet-cadence optimizer: given GSE edge estimates, vig (effective ε), and line-move volatility, choose re-stake cadence n by maximizing g_n net of costs — discretely-settling adaptation of the paper's model (bankroll resets to cash each slate; no let-it-ride). Effort: M.
3. Surface a "not worth betting yet" state in the staking UI when transaction-cost-adjusted growth is negative at all cadences. Effort: S.

## 12. Reproducible test
Dataset: GSE engine picks with timestamped lines (open → close) for 2025–2026 NFL, plus realized outcomes. Metric: realized log-bankroll growth net of vig under (a) current re-stake-on-every-update policy vs. (b) cadence-optimized policy. Baseline: policy (a). Window: one full season, fixed in advance.

## 13. Acceptance / rejection gate
ADOPT the cadence optimizer if it beats baseline realized net log growth by ≥ 3% on the held-out season with no increase in realized max drawdown. REJECT otherwise.

## 14. Improvement experiment
Beyond the paper: replace i.i.d. with a regime-switching edge process estimated from GSE's line-move data, and solve the optimal cadence as a function of detected regime (stable vs. volatile lines). Hypothesis: dynamic cadence beats any fixed n* when edges are nonstationary.
