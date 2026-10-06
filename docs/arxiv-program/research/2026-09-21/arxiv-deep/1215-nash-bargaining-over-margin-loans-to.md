# [1215] Nash Bargaining Over Margin Loans to Kelly Gamblers (arXiv:1904.06628)

**Citation:** Alex Garivaltis (2019). *Nash Bargaining Over Margin Loans to Kelly Gamblers*. arXiv:1904.06628. URL: https://arxiv.org/abs/1904.06628
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — the paper's contribution is broker-vs-gambler Nash bargaining over margin-loan interest rates, with no sports data, no prediction or calibration content, and no deployable sizing beyond the standard continuous-time Kelly fraction; it has no GSE value and must be replaced.

## 1. Research question
The paper asks: when a broker lends to a Kelly gambler on margin, what interest rate emerges from Nash bargaining between the broker (who wants a wide net interest margin) and the gambler (who wants cheap leverage), and how does the negotiated rate affect the gambler's optimal leverage and growth rate? It is a game-theoretic finance paper, not a prediction or sizing paper.

## 2. Dataset / schema
No dataset. A single illustrative numerical example with assumed parameters: volatility σ = 15%, risk-free/broker cost of funds r = 3%, expected arithmetic return ν = 9%. No empirical data of any kind.

## 3. Method / model
Continuous-time Kelly gambler with borrowing: optimal leverage b*(r_L) = (μ − r_L)/σ² given loan rate r_L. Nash bargaining (symmetric, transferable-utility style split) between broker and gambler over the loan rate, yielding a closed-form negotiated rate and the gambler's resulting growth rate and the broker's profit rate.

## 4. Equations & assumptions
- Continuous-time Kelly fraction with borrowing: b*(r_L) = (μ − r_L)/σ²
- Nash-bargained outcome: gambler sizes as if borrowing at the broker's call rate, b* = (μ − r)/σ²
- Total non-cooperation rule: r_L* = (3/4)·r + (1/4)·(ν − σ²/2)
Assumptions: continuous-time GBM market, symmetric Nash bargaining, broker funds at r, no credit constraints beyond the bargained rate, no transaction costs.

## 5. Features / target
No features or prediction target. Inputs are market parameters (μ/ν, σ, r); outputs are the negotiated loan rate and optimal leverage.

## 6. Validation design
None. Pure theory with one illustrative parameter set. No backtest, no baselines, no empirical validation.

## 7. Numerical results / baselines
Quoted exactly from the paper's example (σ = 15%, r = 3%, ν = 9%):
- Optimal leverage b* = 3.17
- Negotiated loan rate r_L* = 4.2%
- Net interest margin 1.2%
- Gambler growth 12%/year
- Broker profit 2.6% of client equity/year
These are outputs of the assumed parameters, not measured results.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No data, so no leakage — but also nothing to validate. The result is inapplicable to GSE: GSE users do not borrow on margin from a broker to place sports bets, and GSE does not set loan rates. The only sizing content, b* = (μ − r)/σ², is the standard Merton/continuous-time Kelly fraction already textbook and already discussed in ledgers 1210/1220. The bargaining apparatus contributes nothing to prediction accuracy, calibration, fantasy, or deployable sports stake sizing.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, the valuable Kelly gaps are bet sizing under uncertainty, fractional Kelly, estimation error, and portfolio-of-bets sizing. This paper addresses none of them; it is about broker margin pricing. GSE has no margin-lending product and no broker-negotiation surface. No overlap — and no plausible adaptation: sportsbooks do not offer negotiable margin loans, and encouraging leveraged sports betting would contradict GSE's responsible-play stance.

## 11. GSE implementation spec
Not applicable — REJECT. No build recommended.

## 12. Reproducible test
Not applicable — REJECT. There is no sports-prediction or sizing hypothesis to test.

## 13. Acceptance / rejection gate
REJECT: the paper fails the GSE-value gate (no prediction, calibration, fantasy, or deployable sports-sizing content). It does not count toward the 750-valuable target and is replaced per the standing replace-on-reject rule (see replacement ledger 1360).

## 14. Improvement experiment
Not applicable — REJECT. (If the bargaining framing were ever relevant, it would be to a hypothetical future GSE brokerage product, which does not exist.)
