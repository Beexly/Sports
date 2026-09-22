# 1797 Wisdom of the Crowds Forecasting the 2018 FIFA Men's World Cup (arXiv:2008.13005v2)

**Citation:** Marco Inácio, Rafael Izbicki, Danilo Lopes, Luis Ernesto Salasar, João Poloniato, Marcio Alves Diniz (2020). *Wisdom of the Crowds Forecasting the 2018 FIFA Men's World Cup*. arXiv:2008.13005v2. URL: https://arxiv.org/abs/2008.13005v2
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).

## 1. Research question

In a real online probability-forecasting contest on the 64 matches of the 2018 FIFA World Cup (fifaexperts.com, 511 registrants), which aggregation ("wisdom of crowds") strategies — local/global averages, top-n, Budescu–Chen contribution weighting, exponential-weights individual sequence prediction (ISP) — beat individual human forecasters and statistical models (Poisson, random forest, FiveThirtyEight), and how much of any ranking is luck vs skill, tested by 100,000-tournament simulations?

## 2. Dataset / schema

- **Contest:** 511 registered participants; 57 submitted forecasts for all 64 matches. Forecasts are vectors P = (P₁,P₂,P₃) on the 2-simplex (team-1 win, team-2 win, draw), enforced to sum to 1. Opening match (Russia–Saudi Arabia) drew 363 forecasts; the third-place playoff drew 101 — attrition after the group stage.
- **Scoring:** linear transform of the Brier score to 0–100 per match (100 = probability 1 on the observed outcome); total over 64 matches.
- **Statistical-model entrants:** Esportes em números (Maher 1982 Poisson), Groll et al. 2018 (random forest), Chance de Gol (bivariate Poisson), Previsão Esportiva (Poisson + expert info), FiveThirtyEight.
- **Access:** contest site defunct; no data/code links in the paper.

## 3. Method / model

Aggregation strategies evaluated as pseudo-participants: Top-n (n = 1,5,10,20; average of best-scoring-so-far), Local wisdom (mean of all website forecasts), Global wisdom (mean of top-3 bookmaker-odds-implied forecasts from 18 sites), Budescu–Chen (leave-one-out contribution weights), ISP-η (exponential weights on regret, η ∈ {0.001, 0.01, 0.1, 1}). Baselines: Monkey (Dirichlet(1,1,1)), Edges, Vertices, Maxi-min (1/3,1/3,1/3). Robustness: 100,000 simulated tournaments with outcomes drawn from a participant's own probabilities; bootstrap-like extension to n = 1…1,024 matches.

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- ISP-η: p̂_t = (Σⱼw_{j,t}f_{j,t})/(Σⱼw_{j,t}), w_{j,t} ∝ exp(ηR_{j,t−1}); regret R_{j,t−1} = Σ_{t₀<t}[l(p̂_{t₀},y_{t₀}) − l(f_{j,t₀},y_{t₀})].
- Budescu–Chen: contribution Cⱼ = Σᵢ₌₁ᴺ(Sᵢ − Sᵢ^{−j})/N (Sᵢ = local-wisdom score on match i, Sᵢ^{−j} = score without forecaster j); aggregate = weighted average over forecasters with Cⱼ > 0.
- Assertiveness: (3/2)Σᵢ₌₁³(Pᵢ − 1/3)² ∈ [0,1]; 0 = maxi-min, 1 = vertex.

Assumptions stated: Brier score is proper (truth-telling optimal); simulated tournaments treat a participant's forecasts as true data-generating probabilities; bootstrap match resampling treats matches as exchangeable.

## 5. Features / target

No features — pure forecast panel. Target: match outcome (3 classes); scored on probability quality (Brier), not accuracy.

## 6. Validation design

Single 64-match contest as the test set (all methods scored identically); simulation study as the "validation": 100k tournaments per truth-scenario; win-probability-vs-tournament-length curves (n = 1…1,024, 10k–30k sims each). No leakage: aggregation strategies use only forecasts available before each match (top-n uses trailing scores).

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly (Table 2, total score / avg per match / rank):

| Forecaster | Total | Avg | Rank |
|---|---|---|---|
| Esportes em números (Maher Poisson) | 4650 | 72.7 | 1 |
| Groll et al. (random forest) | 4644 | 72.6 | 2 |
| Global wisdom (bookmaker avg) | 4634 | 72.4 | 3.5 |
| FiveThirtyEight | 4634 | 72.4 | 3.5 |
| Chance de Gol (biv. Poisson) | 4611 | 72.0 | 5 |
| **Budescu and Chen** | 4601 | 71.9 | 6 |
| ISP-0.01 | 4569 | 71.4 | 11 |
| Local wisdom | 4567 | 71.4 | 12.5 |
| Top-20 | 4553 | 71.1 | 17 |
| Top-5 | 4525 | 70.7 | 23 |
| ISP-0.1 | 4492 | 70.2 | 31 |
| Top-1 | 4438 | 69.3 | 40 |
| Maxi-min | 4267 | 66.7 | 59 |
| Monkey | 3733 | 58.3 | 69 |

- **Luck dominates at 64 matches:** the actual winner, simulating under her own probabilities, wins only **28.2%** of 100,000 tournaments (avg position 4.7 ± 4.8). She needs ≈**576 matches** for a 95% win probability; Global wisdom needs ≈**1,024**.
- **Budescu–Chen is the best website-only aggregator** and improves fastest with tournament length (learns whom to weight); Local wisdom is the most conservative (avg simulated position 10.1 ± 3.9); Top-5 is riskier (15.2 ± 7.7). "Follow the leader" (Top-1) ranks 40th — chasing recent form fails.
- **Assertiveness finding:** best forecasters were *less* assertive; top users' assertiveness declined toward (1/3,1/3,1/3) as the tournament progressed (correctly — late-stage teams are evenly matched); worst users stayed overconfident. Brier scoring punishes over-assertiveness.
- Third group-stage round was the hardest to predict (dead rubbers, strategic draws) — a structural calendar effect.

## 8. Code / data availability

None linked. All aggregation rules implementable from the equations above.

## 9. Leakage & limitations

- **Single 64-match sample:** the headline ranking is mostly noise by the paper's own simulation — method comparisons at this n are suggestive, not conclusive.
- **Attrition bias:** forecast counts fell from 363 to 101 per match; late-tournament aggregates are computed on a self-selected survivor pool.
- **Global wisdom is unusable in production** as defined (needs all bookmaker odds — fine for GSE actually, but it's just "the market").
- **Draw-heavy sport:** the 3-outcome simplex and draw dynamics don't transfer to the NFL; the aggregation *principles* do.
- **ISP tuning fragility:** η = 0.01 ranks 11th, η = 1 ranks 39th — exponential-weights needs its temperature tuned, unlike Budescu–Chen (parameter-free).

## 10. GSE overlap

Pairs with 1793 (1206.6814): both study forecast aggregation on football, but this paper adds what 1793 lacks — (a) the Budescu–Chen leave-one-out contribution weight (a parameter-free alternative to the EM variance weighting), (b) the assertiveness–calibration finding (Brier-optimal forecasters shade toward uniform; directly relevant to GSE's published probabilities), (c) the devastating sample-size quantification: **even a forecaster who knows the true probabilities wins a 64-game contest only 28% of the time**, needing ~576 games for 95% identification. GSE publishes ~270 NFL games/season — this paper says season-long "best model" claims at that n are mostly luck, which disciplines how GSE evaluates its own engine versions and markets win-rate claims. Not a duplicate; the evaluation-honesty contribution is unique in the corpus.

## 11. GSE implementation spec

1. **Budescu–Chen aggregation arm:** add to the ensemble aggregator (from 1793's spec): Cⱼ = mean leave-one-out gain over trailing 2 seasons; aggregate sources with Cⱼ > 0 weighted by Cⱼ. Compare against Variance-EM and simple average on 2024–2025.
2. **Assertiveness audit:** compute (3/2)Σ(p−1/3)²-style assertiveness (adapted to binary: 2(p−1/2)²… actually 4(p−1/2)² scaled to [0,1]) for the engine's published probabilities vs their Brier scores; if the engine is systematically over-assertive relative to its Brier-optimal point, apply a global shrinkage-toward-0.5 recalibration.
3. **Evaluation-honesty rule:** no "model A beats model B" claim on < ~500 game samples without a simulation like §3.3 showing the win-rate isn't luck; publish the truth-knower benchmark (simulate seasons under each model's own probabilities, measure how often it "wins").
4. Cost: ~2 days.

## 12. Reproducible test

Dataset: 2022–2025 NFL games; sources: engine, market-implied, crowd proxy (as in 1793's spec). Baselines: simple average, Variance-EM (1793), best single source. Metrics: Brier score 2024–2025; plus the paper's simulation protocol — 10k simulated seasons under each aggregator's own probabilities, measuring P(aggregator ranks first). Success gate below.

## 13. Acceptance / rejection gate

**Adopt Budescu–Chen as an aggregation arm if** it beats simple averaging on 2024–2025 Brier by ≥0.002 (same bar as 1793) OR wins the truth-knower simulation more often than Variance-EM; **adopt the evaluation-honesty rule regardless** (it's free and the paper's strongest point); **reject the assertiveness recalibration** if the engine's assertiveness already sits at its Brier-optimal point (audit shows no systematic overconfidence).

## 14. Improvement experiment

**Assertiveness-adaptive Budescu–Chen:** the paper's two findings interact — Budescu–Chen weights by marginal contribution, but contribution under Brier conflates calibration with assertiveness. Pre-shrink each source's probabilities toward 0.5 by its *own* trailing assertiveness-optimal factor (estimated per source: the λ minimizing trailing Brier of λp + (1−λ)·0.5), then run Budescu–Chen on the de-asserted panel. Hypothesis: separating the calibration step (per-source shrinkage) from the weighting step (marginal contribution) beats either alone, because B–C currently down-weights good-but-overconfident sources instead of fixing them. Test: 2024–2025 Brier vs plain B–C and vs Variance-EM; success = ≥0.002 improvement over the better of the two. If it works, the engine gets a two-stage "calibrate, then weight" aggregation doctrine.

**Verdict:** ADAPT
