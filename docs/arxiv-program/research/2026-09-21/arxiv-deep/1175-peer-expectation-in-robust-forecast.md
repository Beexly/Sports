# [1175] Peer Expectation in Robust Forecast Aggregation (arXiv:2402.06062v1)

**Citation:** Kong, Y. (2024). *Peer Expectation in Robust Forecast Aggregation*. arXiv:2402.06062v1 [cs.GT]. URL: https://arxiv.org/abs/2402.06062
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; all sections read including the refinement-ordered analysis, the two-expert and C.I.I.D. aggregators, and the Matlab numerical experiments).
**Verdict:** ADAPT — peer/meta-forecast elicitation as a mechanism to break the 0.0225 single-level minimax floor: GSE can adapt the "forecast of others' forecasts" idea by treating its own member models (or market consensus) as the peer panel and aggregating with the paper's weighted-expectation rules.

## 1. Research question
If, in addition to each expert's own forecast, the aggregator also elicits each expert's *expectation of other experts' forecasts* (peer expectations), how much can worst-case regret be reduced relative to aggregating forecasts alone — and can the classical level-one minimax lower bound (~0.0225) be broken? (Abstract; Sec. 1)

## 2. Dataset / schema
No real data. Synthetic numerical experiments computed in Matlab over discretized information-structure families (two conditionally independent experts; C.I.I.D. = conditionally independent identically distributed setting). Starred (*) numbers in the paper denote Matlab numerical estimates of worst-case regret, not analytically proved maxima. (Secs. 4–5)

## 3. Method / model
The aggregator receives both forecasts x_i and peer expectations p_i (expert i's prediction of the average/other experts' forecasts). Proposed aggregators: average expectation, weighted expectation, and weighted hard sigmoid rules that combine x_i and p_i. Theory: in the refinement-ordered setting (experts' signals ordered by Blackwell informativeness), peer expectations drive minimax regret from the level-one lower bound 0.0225 all the way to 0. For the two conditionally independent experts setting, the paper derives and numerically evaluates the weighted-expectation and hard-sigmoid aggregators; for C.I.I.D. it gives a dedicated aggregator and a hard-sigmoid variant. The paper also notes that iterating higher-order expectations may converge to the prior under stated assumptions, with XOR presented as an explicit counterexample where it does not. (Secs. 2–5)

## 4. Equations & assumptions
- Same binary-state, quadratic-loss, regret definition as the level-one literature (cf. ledger 1174): R(f, pi) = excess Brier loss over the Bayesian aggregator knowing pi.
- Level-one lower bound: 0.0225 (cited from prior work); refinement-ordered peer-expectation result: regret 0 achieved (theorem).
- Two conditionally independent experts — reported worst-case regrets: average expectation 0.0072*; weighted expectation 0.0040*; weighted hard sigmoid 0.00255*; lower bound 0.00144. C.I.I.D.: C.I.I.D. aggregator 0.00391*; hard sigmoid 0.00211*. (* = Matlab numerical estimates, per the paper's notation.)
- Assumptions stated: experts truthfully report both forecast and peer expectation; binary state; squared loss; conditionally independent (or C.I.I.D.) signals; refinement ordering for the zero-regret theorem. Strategic misreporting and correlated signals are out of scope.

## 5. Features / target
Inputs: per expert, a forecast x_i in [0,1] plus a peer-expectation p_i (a scalar prediction of peers' forecasts). Target: probability of the binary event. One-shot aggregation.

## 6. Validation design
No real data or train/test splits. Validation is theoretical (minimax regret bounds) plus Matlab numerical optimization over discretized structure families to estimate worst-case regrets of the proposed rules vs. lower bounds. (Secs. 4–5)

## 7. Numerical results / baselines
All numbers are the paper's Matlab numerical estimates (starred in the paper) unless noted:
- Level-one (forecasts only) lower bound: 0.0225; refinement-ordered with peer expectations: 0 (theorem, not numerical).
- Two conditionally independent experts: average expectation 0.0072*; weighted expectation 0.0040*; weighted hard sigmoid 0.00255*; information-theoretic lower bound 0.00144.
- C.I.I.D.: dedicated aggregator 0.00391*; hard sigmoid 0.00211*.
Distinguish: these are worst-case regrets inside synthetic discretized games, not forecast-accuracy gains on real panels. The paper claims peer expectations cut regret by roughly an order of magnitude vs. the 0.0225 level-one floor.

## 8. Code / data availability
Not stated in paper (Matlab experiments; no link given).

## 9. Leakage & limitations
No real data (no leakage); external-validity risks: (1) the mechanism assumes truthful peer-expectation reports — GSE's "peers" would be its own models or market lines, so incentive issues are sidestepped but the elicitation framing still needs translation; (2) all gains are proved/estimated under conditional independence — real model panels are correlated; (3) XOR counterexample shows higher-order-expectation iteration is not universally safe; (4) binary-state, squared-loss only; (5) starred numbers are numerical estimates over a discretized family, not certificates.

## 10. GSE overlap
New capability, not a duplicate. The existing-research-map has no peer-expectation / "forecast of forecasts" work: the repo's market-microstructure lane tracks market-implied ratings and CLV (1211.4000 deep read; benbbaldwin tiers) but never uses market consensus *as a peer-expectation input inside the aggregator*, and the ensemble/combination practice (gse-lab, ML brief "ensembling") aggregates point forecasts only. Garrett's CEPT lane is a causal theory, not a peer-elicitation mechanism. Natural GSE translation: each engine component's forecast + the component's "expectation" of the market/median-model forecast (computable offline, no elicitation needed) fed into the weighted hard-sigmoid rule.

## 11. GSE implementation spec
1. Build a peer-expectation feature: for each game and each engine component, compute the component's forecast and a peer proxy = the component's historical average deviation from consensus (or simply the market consensus probability as the "peer forecast" the component would predict). 2. Implement the paper's weighted hard-sigmoid aggregator over (forecast, peer-expectation) pairs. 3. Backtest walk-forward on the `picks` history (2024–2025) vs. current combiner and vs. ledger-1174's robust rule. 4. Ablation: forecasts-only vs. forecasts+peer features, to isolate the paper's claimed gain. Effort: ~2 days (features are offline-computable; no new data needed).

## 12. Reproducible test
Dataset: GSE engine `picks` history 2024–2025 + closing market consensus probabilities (already captured in repo market captures / OddsPapi lane) as the peer-expectation proxy. Metric: Brier score and log-loss, walk-forward by week. Baselines: current combiner; forecasts-only weighted average. Window: 2025 regular season, fixed in advance. Gate: adopt if forecasts+peer aggregation beats forecasts-only by ≥0.002 Brier with Diebold-Mariano p<0.05.

## 13. Acceptance / rejection gate
ADOPT the peer-feature aggregator if on the 2025 walk-forward it improves Brier by ≥0.002 over the forecasts-only combiner (DM p<0.05) and does not lose on log-loss; REJECT (keep forecasts-only) otherwise. If the gain exists but is <0.002, log as a negative result and do not ship.

## 14. Improvement experiment
Go beyond the paper: replace the static peer proxy with a *learned* peer-expectation model — train a small model predicting each component's deviation from consensus from game context (week, home/away, market move direction), then feed predicted peer expectations into the hard-sigmoid rule. This tests whether predictable disagreement structure (the paper assumes truthful static reports) carries additional aggregation signal, and directly measures the marginal value of the peer channel on real correlated model panels, relaxing the paper's conditional-independence assumption.
