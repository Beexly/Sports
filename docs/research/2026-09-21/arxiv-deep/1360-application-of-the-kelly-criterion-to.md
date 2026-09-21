# [1360] Application of the Kelly Criterion to Prediction Markets (arXiv:2412.14144)

**Citation:** Bernhard K. Meister (2024). *Application of the Kelly Criterion to Prediction Markets*. arXiv:2412.14144. URL: https://arxiv.org/abs/2412.14144
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — adopt the price-vs-belief gap analysis as the theoretical backbone for GSE's "prices are not probabilities" thesis, use the linear-vs-quadratic sensitivity result to prioritize calibration accuracy over sizing precision, and map the all-or-nothing Kelly formula onto fixed-odds sports bets.

## 1. Research question
The paper asks two questions: (a) in prediction markets (bounded 0–1 prices, e.g., Polymarket), how large can the gap be between observed market prices and the mean beliefs of participants, and can a modified payout structure shrink it? (b) In a finite-horizon double-or-nothing game, how do misestimation of the win probability vs. miscalculation of the Kelly fraction affect the growth rate, quantified via Kullback–Leibler divergence?

## 2. Dataset / schema
No empirical dataset. Motivating context: Polymarket during the 2024 American election campaign (several billion dollars wagered, per the paper). Analysis is theoretical with toy two-investor market-clearing examples and a biased-coin random-walk model.

## 3. Method / model
(a) Derive the Kelly-optimal fraction for an all-or-nothing prediction-market contract where the investor pays price p with subjective belief q and no borrowing: maximize U(q,p,f) = (1−q)·log(1−f) + q·log(1+f·(1−p)/p). Then model market clearing: mean belief = capital-weighted Σ C_i·q_i, positions C_i·f_i(p,q_i), clearing condition Σ C_i·f_i = 0; solve two-investor toy cases (one investor certain) to bound the price–belief gap. Propose a modified payout U_α with exponent α on the payout ratio to improve boundary liquidity.
(b) Analyze the biased N-step random walk via Chernoff bounds F(k,N,p) ≤ exp(−N·D(k/N‖p)) and compare sensitivity of the KL rate function to probability misestimation (linear) vs. fraction miscalculation around the Kelly optimum (quadratic).

## 4. Equations & assumptions
- U(q,p,f) = (1−q)·log(1−f) + q·log(1 + f·(1−p)/p); optimum f = (Q−P)/(1+Q) = (q−p)/(1−p), with P = p/(1−p), Q = q/(1−q)
- Market clearing: Σ_i C_i·f_i(p, q_i) = 0; mean belief = Σ_i C_i·q_i (normalized)
- Gap bounds (certain-investor toy): E_− ∈ [0, 1/2] for p < 1/2, [1/2, 1] for p > 1/2, = 1/2 at p = 1/2; E_+ = p
- Modified payout: U_α(q,p,f) = (1−q)·log(1−f) + q·log(1 + f·(p/(1−p))^α); f = (P̂_α − Q)/(Q+1), P̂_α = (p/(1−p))^α
- Chernoff: F(k,N,p) ≤ exp(−N·D(k/N‖p)); k_Q(f) = (Q − N·log(1−f))/(log(1+f) − log(1−f))
- Sensitivity: D(k/N‖p+ε) − D(k/N‖p) = ((p − k/N)/(p(1−p)))·ε + O(ε²) — linear in probability error
- U(p, 2p−1+ε) − U(p, 2p−1) = −ε²/(4p(1−p)) + O(ε³) — quadratic in fraction error
Assumptions: log-utility investors, no fees, no naked shorts (two linked contracts), market treated as a black box that clears, fair-odds-style normalization where used.

## 5. Features / target
Inputs: market price p, subjective belief q, capital distribution, risk-liquidity parameter α. Target: optimal fraction f, price–belief gap bounds, sensitivity of growth to estimation errors.

## 6. Validation design
Pure theory. No empirical test of the gap bounds on Polymarket data, no backtest of the modified payout, no train/test split. The Chernoff/sensitivity results are analytic.

## 7. Numerical results / baselines
No empirical numbers. Exact quoted results:
- Optimal all-or-nothing Kelly fraction: f = (q−p)/(1−p).
- Price–belief gap: can be wide even in toy cases — e.g., if all investors hold 0%/100% beliefs, "even the minutest imbalance drives the price to zero or one, but the expectation value does not need to budge much from 1/2."
- Error asymmetry: misjudging the probability costs linearly in ε; miscalculating the Kelly fraction costs quadratically in ε (i.e., probability accuracy matters more than sizing precision).

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No data, so no leakage — but the headline gap results are not tested against real Polymarket data despite the motivating example. The two-investor toy is extreme by design; real books have many participants and fees, both ignored. The modified-payout proposal is sketched, not optimized ("not a panacea... will be presented elsewhere"). The linear-vs-quadratic comparison is local (small ε); large miscalibration breaks both. Binary contracts only — no multi-outcome extension.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, Kelly sizing and calibration are core gaps with zero deep reads. This paper is the theoretical justification for GSE's entire calibration-first doctrine: market prices ≠ true probabilities (the gap can be enormous), so a calibrated model has structural edge. GSE's `apps/web/lib/staking/kelly-investigation.ts` already refuses stakes with no edge — this paper's f = (q−p)/(1−p) is the exact formula that module should be checked against for binary fixed-odds bets. Complements ledger 1214 (robust Kelly): 1214 protects against distribution uncertainty, this paper says *where* to spend estimation effort (probabilities first, fractions second). New capability, not a duplicate.

## 11. GSE implementation spec
1. Add a unit test asserting `kelly-investigation`'s binary fixed-odds fraction equals (q−p)/(1−p) exactly (up to the fractional multiplier) — certifying the module against the paper's closed form. Effort: S.
2. Build a "price-vs-belief gap" monitor: for each market, compare GSE's calibrated probability against the market-implied probability; flag markets where the gap exceeds the paper's toy-implied plausible range as potential manipulation/illiquidity (pass on betting). Effort: M.
3. Resource-allocation rule from the linear/quadratic result: sizing-precision work (beyond fractional caps) is deprioritized relative to calibration work in the research backlog — document as policy. Effort: S.

## 12. Reproducible test
Dataset: GSE 2025–2026 backtest picks with market-implied probabilities and calibrated probabilities. Metric: (a) distribution of price–belief gaps and their correlation with realized edge; (b) ablation: perturb calibrated probabilities by ±ε vs. perturb fractions by ±ε and compare realized log-growth degradation — confirm the linear-vs-quadratic asymmetry empirically. Baseline: unperturbed sizing.

## 13. Acceptance / rejection gate
ADOPT the closed-form certification test if it passes (correctness property). ADOPT the gap monitor if flagged high-gap markets show realized ROI significantly below average on held-out data (supporting the pass-on-betting rule). REJECT the monitor otherwise.

## 14. Improvement experiment
Beyond the paper: test the gap bounds empirically on real prediction-market data (Polymarket/Kalshi) — measure the actual distribution of price vs. resolved-frequency gaps by liquidity tier, and check whether GSE-style calibrated models systematically beat the market most where the paper predicts the gap can be widest (near-certain-investor regimes). Hypothesis: edge concentrates in wide-gap, low-liquidity markets.
