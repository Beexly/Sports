# [1542] Bayesian estimation of in-game home team win probability for college basketball (arXiv:2204.11777)

**Citation:** Jason T. Maddox, Ryan Sides, Jane L. Harvill (2022). *Bayesian estimation of in-game home team win probability for college basketball*. arXiv:2204.11777. URL: https://arxiv.org/abs/2204.11777
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — a dynamic beta prior whose strength shrinks with elapsed time (preserving early-game comeback probability) plus a time-weighted pre-game win-probability anchor is a clean, portable template for GSE's live NFL win probability: the 11% Brier improvement (0.1450 → 0.1284) comes almost entirely from anchoring in-game estimates to a pre-game rating instead of letting early scores overreact.

## 1. Research question
How to estimate in-game home-team win probability p_{t,ℓ} as a function of elapsed time t and lead ℓ? Two new Bayesian methods: (1) a beta prior whose parameters adjust with lead differential and time elapsed ("dynamic prior"); (2) that estimator blended with a time-weighted pre-game win probability. Compared against MLE, Stern (1994) probit, and a fixed-prior Bayes estimator on 41,642 NCAA D1 games.

## 2. Dataset / schema
ESPN play-by-play scraped in R (rvest), NCAA D1 men's basketball 2012–13 through 2019–20. Estimation: 30,789 games (2012–13 to 2017–18). Prediction: 10,853 games (2018–19, 2019–20, COVID-shortened). Analysis grid: t = 0..2399 seconds × |ℓ| = 0..104 points, with windows [t−3,t+3] × [ℓ−2,ℓ+2]. Pre-game win probabilities from daily team ratings (teamrankings.com-style). Access: scrape code described, not linked; no repo.

## 3. Method / model
Five estimators: (1) MLE p̄_{t,ℓ} = n_{t,ℓ}/N_{t,ℓ} (binomial per cell). (2) Stern (1994) Brownian-motion-with-drift probit: p̃ = Φ((ℓ + (1−t*)μ)/√((1−t*)σ²)) (1), μ ≈ 5–6 points home edge, σ set so μ/σ ∈ [0.12, 0.39]. (3) Bayes with fixed beta prior (pseudo-wins/pseudo-losses). (4) Dynamic Bayes: beta prior scale parameters vary with (t, ℓ) — strong priors (up to beta(19,1)/beta(1,19)) only in extreme differential cells, weak near the middle; early in the game even a large differential leaves substantial comeback mass, which shrinks as time elapses. Empty cells imputed with the most extreme posterior in the direction of the differential. (5) Adjusted dynamic Bayes: linear combination of (4) with a time-weighted pre-game win probability p̂_p (weight on pre-game decays as the game progresses).

## 4. Equations & assumptions
- p̃_{t*,ℓ} = Φ((ℓ + (1−t*)μ)/√((1−t*)σ²)) (1) [Stern probit].
- Brier: B = (1/Q) Σ_t Σ_ℓ Σ_j (p̃_{t,ℓ} − y_j)²; misclassification MR = (FP + FN)/Q.
Assumptions: beta–binomial conjugacy per (t, ℓ) window; win probability "relatively constant" within a 6-second × ±2-point window; pre-game ratings unbiased; no overtime modeling detail (regulation focus); neutral-site "home" designation handled by the pre-game anchor (UNC was designated home at NRG Stadium).

## 5. Features / target
Inputs: elapsed game time, home-team lead, pre-game win probability from daily ratings. Target: binary home-team regulation win Y_i. Horizon: in-game, continuous t.

## 6. Validation design
Temporal split: fit on 2012–13 to 2017–18 (estimation surfaces in Figures 2a–2d), predict 2018–19 and 2019–20 seasons (Q ≈ 26M cell-observations each). Metrics: Brier score and misclassification rate. Benchmarks: MLE, Stern probit, fixed-prior Bayes, dynamic Bayes, adjusted dynamic Bayes — each other. Case study: 2016 NCAA championship game (UNC vs Villanova, p̂_p = 0.49).

## 7. Numerical results / baselines
Paper's reported numbers (quoted), Table 4. 2018–19 Brier: MLE 0.1453, probit 0.1452, Bayes 0.1451, dynamic Bayes 0.1450, adjusted dynamic Bayes 0.1284 (11.4% relative improvement over dynamic Bayes). MR: 0.2183 / 0.2180 / 0.2182 / 0.2182 / 0.1870. 2019–20 Brier: 0.1397 / 0.1398 / 0.1396 / 0.1396 / 0.1261; MR: 0.2084 / 0.2086 / 0.2081 / 0.2081 / 0.1827. Dynamic prior alone barely beats fixed-prior Bayes; essentially all the gain comes from the pre-game anchor. Estimation surfaces: MLE shows pathological cells (Drexel's 34-point comeback produced p̄ = 1 cells); Bayesian versions smooth rare events via pseudo-counts.

## 8. Code / data availability
Scraping described (R/rvest on ESPN); no repository or data link given.

## 9. Leakage & limitations
Adversarial notes: (1) The headline gain is from the pre-game anchor, not the Bayesian machinery — the dynamic prior adds ~0.0001 Brier over the fixed prior. (2) Pre-game probabilities come from a third-party rating site; its quality drives the result and is not evaluated. (3) No calibration analysis (reliability curves) — Brier/MR only. (4) 6-second × ±2-point windows are asserted, not tuned ("of interest" per the authors). (5) Regulation-only framing; college basketball specifics (no shot clock nuance, fouling dynamics) limit direct transfer.

## 10. GSE overlap
Existing map: in-game win probability models are inventoried in the corpus (including market-based ones), but the specific device of a time-varying beta prior that preserves early comeback mass + explicit time-decayed blending with a pre-game (market-implied) win probability is not documented as a GSE implementation pattern. Complements rather than duplicates.

## 11. GSE implementation spec
1. Adapt to NFL live win probability: pre-game anchor = market-implied win prob (moneyline → no-vig); in-game likelihood from (time remaining, score differential, possession, down/distance, timeouts) cells or a gradient-boosted model; blend with weight w(t) on the pre-game anchor decaying from ~1 at kickoff to ~0 in the final minutes.
2. Dynamic-prior analogue: regularize early-game cells toward the anchor (strong prior early, weak late) so a 14–0 first-quarter lead doesn't produce the MLE-style overreaction the paper documents.
3. Effort: ~1 week on nflverse play-by-play 2009–2025; the blending-weight schedule is the one tuned parameter.

## 12. Reproducible test
Dataset: nflverse 2009–2023 fit, 2024–2025 held-out. Metric: Brier score and calibration (reliability curve slope) vs (a) pure market-implied WP, (b) unanchored empirical WP, (c) anchored WP with the paper's decaying blend. Gate: anchored blend must beat both baselines on held-out Brier AND show calibration slope within [0.9, 1.1].

## 13. Acceptance / rejection gate
ADOPT the time-decayed pre-game anchor + early-game regularization if it beats market-implied WP on 2024–2025 held-out Brier; REJECT the paper's literal beta-prior cell machinery (the fixed-window grid is basketball-specific) — implement the principle (shrinkage toward pre-game that decays with time) inside GSE's existing WP model instead; REJECT any claim that the dynamic prior itself drove the gains (evidence: 0.1451 → 0.1450).

## 14. Improvement experiment
Beyond the paper: learn the blend-weight schedule w(t, game state) by minimizing held-out Brier rather than asserting it; add possession/down/distance/timeout state to the grid (the paper uses only time + lead); use market-implied pre-game prob (sharper than teamrankings.com ratings); and report full reliability curves by game segment — the calibration analysis the paper omits.
