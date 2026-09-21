# [0319] Leicester's Tale: Another Perspective on the EPL 2015/16 Through Expected Goals (xG) Modelling (arXiv:2602.15673v1)

**Citation:** Sheikh Badar Ud Din Tahir, Leonardo Egidi, Nicola Torelli (2026). *Leicester's Tale: Another Perspective on the EPL 2015/16 Through Expected Goals (xG) Modelling*. arXiv:2602.15673v1. URL: https://arxiv.org/abs/2602.15673v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1164 lines).
**Verdict:** ADAPT — the soccer xG metric does not transfer to the NFL, but the pipeline pattern (underlying-performance metric → team scoring intensities → Poisson season simulation → rank/outcome-probability inference, used ex ante as an early-warning diagnostic of ranking uncertainty) ports directly to NFL EPA/play-based "deserved record" and rest-of-season playoff-probability inference.

## 1. Research question
How accurately can expected-goals (xG)-based probabilistic models simulate full-season league standings, and what do they reveal about ranking uncertainty and rare football outcomes? The authors formalize "ranking uncertainty" — a team's final league position being inconsistent with its underlying xG-derived performance — and test whether xG works as an ex-ante early-warning diagnostic rather than a deterministic predictor, using the famously anomalous 2015/16 EPL season (Leicester City, 5000-1 preseason) as the case study.

## 2. Dataset / schema
EPL 2015/16 season, all 380 matches, 20 teams over 38 rounds; 975 total goals (172 home wins, 93 draws, 115 away wins); 760 team-level (team × match) observations. Two components: (a) match-level data — home/away team names, final scores, match date, betting odds; (b) event-level shot data. Source: Secărean (2024) "Football Events" Kaggle dataset (public: https://www.kaggle.com/datasets/secareanualin/football-events). Schema (Table 1): `id odsp` (match ID join key, categorical), `event team`, `side` (home=1/away=2), `is goal` (binary), `location` (coded pitch zone 1–19, categorical), `shot place` (bottom left, top right, ...), `bodypart` (foot/head), `situation` (open play, corner, free kick), `assist method` (pass, cross, ...), `fast break` (binary), `ht, at` (team names), `fthg, ftag` (full-time goals). Filtered to shot events (event type == 1), complete cases only. Betting odds present in data but unused in the model.

## 3. Method / model
Three shot-level logistic regression xG models (GLM, binomial family, logit link, MLE via `glm()`), differing in spatial feature resolution: (1) Base — coarse engineered distance zones; (2) Interaction — base + distance zone × bodypart interaction; (3) Granular spatial zones — finer pitch zones (centre/side of box, penalty spot, very close range). Model selection by AIC, residual deviance, and predictor count. Shot-level xG summed to match-level team xG; teams' first-half xG aggregated to attack (`xGfor`) and defense (`xGagainst`) totals, normalized to per-match rates divided by league means. Poisson match simulation: opponent-adjusted scoring rates λ_home, λ_away, goals drawn as independent Poissons; points and goals assigned per match; league tiebreakers applied. Two evaluation modes: (a) **ex ante** — only first-half xG, 1,000 simulations of second-half fixtures, first-half realized points carried forward; reports E[Points], E[Rank], P(Title), P(Top4), P(Releg); (b) **ex post full-season benchmark** — conditions on full-season xG as an upper-bound reference. Convergence check: average ranks stabilize after ~500 simulations (mid-table by 750–1,000).

## 4. Equations & assumptions
Paper's stated equations, copied faithfully:

(1) xG_{team, match} = Σ_{i=1}^{N} p_i, where N = shots by the team in the match, p_i = P(shot i is a goal).

(2) logit(p) = log(p/(1−p)) = β_0 + Σ_{j=1}^{k} β_j X_j.

(3) Base model: logit(p) = β_0 + β_1·distance zone + β_2·shot place + β_3·bodypart + β_4·situation + β_5·assist method + β_6·fast break.

(4) Interaction model: same as (3) + β_7·(distance zone × bodypart).

(5) Granular model: logit(p) = β_0 + β_1·distance zone granular + β_2·shot place + β_3·bodypart + β_4·situation + β_5·assist method + β_6·fast break.

(6) p̂_i = 1 / (1 + exp(−η_i)); (7) η_i = β̂_0 + Σ_{j=1}^{k} β̂_j X_{ij}.

Poisson simulation: G^h_m ∼ Poisson(λ^h_m), G^a_m ∼ Poisson(λ^a_m) (home/away goals in match m drawn as independent Poissons of opponent-adjusted xG-derived intensities).

Distance-zone mapping (Table 2): Close Range: location codes 10, 12, 13, 14; Medium Range: 3, 9, 11; Outside Box: 15, 16; Long Range: 17, 18; Other: remaining codes.

Stated assumptions: (a) shots are independent events (ignores temporal/tactical sequences — acknowledged limitation); (b) same xG regardless of individual player finishing ability; (c) home/away goals conditionally independent Poissons given λ; (d) first-half xG per-match rates are stable team-strength proxies for the second half; (e) league-mean normalization is a valid strength reference; (f) 1,000 simulations suffice for rank-distribution convergence (verified empirically).

## 5. Features / target
Shot-level inputs (exact list from §3.2): `distance zone` (engineered: close/medium/outside-box/long/other from location codes 1–19), `shot place` (intended target, e.g. bottom left, top right), `bodypart` (right foot, left foot, head), `situation` (open play, set piece, corner, free kick, penalty), `assist method` (pass, cross, through ball, rebound, header), `fast break` (counterattack yes/no), plus `distance zone × bodypart` interaction in Model 2 and `distance zone granular` (centre/side of box, penalty spot, very close range) in Model 3. Target: `is goal` (binary, 1 = shot resulted in goal). Downstream team-level targets from simulation: match goals/points, final league points and ranks, P(title), P(top-4), P(relegation).

## 6. Validation design
No conventional train/test split for the logistic xG model (fitted on all 2015/16 shots; model selection via AIC/deviance, not holdout — a genuine gap). Season-level validation is simulation-based: (a) **ex ante** temporal split at the 19-match mid-season point — team strengths estimated on first-half xG only, second-half fixtures simulated 1,000×, realized first-half points carried forward; predicted vs realized second-half points, average ranks, and outcome probabilities compared; (b) **ex post** full-season benchmark reported as an acknowledged upper bound. Diagnostics: monotonic first-half-xG-quartile → second-half-points relationship (also residualized on mid-season points, Figure 3); 95% simulation CIs per team; rank-distribution convergence by simulation count (Appendix B); Table 6 correlation/error metrics for the full-season fit.

## 7. Numerical results / baselines
All numbers quoted from the paper (paper's claims, not my interpretation):

xG model comparison (Table 4): Base (distance zone) — AIC 5354.47, residual deviance 5334.47, 10 predictors; With Interaction — AIC 5357.31, deviance 5329.31, 14 predictors; Granular Zones — AIC 5261.82, deviance 5239.82, 11 predictors. Granular wins (ΔAIC ≥ 90).

Mid-season ex-ante simulation (1,000 sims, §4.5 / Fig 9): title probabilities — Arsenal 49.0%, Manchester City 26.6%, Tottenham 5.4%, **Leicester City 16.7%** (average simulated rank 3.12, top-four probability >80%); relegation probabilities — Aston Villa >90%, Sunderland >50%, Newcastle >50% (all three subsequently relegated). Leicester's realized second-half points fall in the upper tail (not outside) of their simulated distribution; they are the largest positive outlier vs predicted mean; Chelsea and Manchester United notably underperformed xG expectations.

Ex-post full-season benchmark (Table 6, Appendix A): Spearman's ρ — 0.837 (points) / 0.824 (ranks); Pearson's r — 0.871 / 0.862; R² — 0.758 / 0.744; RMSE — 7.624 points / 2.922 ranks; MAE — 6.102 / 2.220.

Qualitative claims: simulated point totals typically within 2–3 match outcomes of realized totals; average ranking error ≈ 3 league positions; Leicester ranked 4th in mid-season xG despite leading the table on points.

## 8. Code / data availability
Code: none stated. Data: Kaggle dataset https://www.kaggle.com/datasets/secareanualin/football-events (Secărean 2025 cited); StatsBomb Open Data GitHub (https://github.com/statsbomb/open-data); StatsBomb Resource Centre; Hudl StatsBomb Platform. Funding: MIUR PRIN "SMARTsports" grant 2022R74PLE.

## 9. Leakage & limitations
- **In-sample xG fitting with no holdout**: the logistic models are selected on AIC/deviance over the same 2015/16 shots they are fit on — selection optimism is real, though the authors note xG is an intermediate input, not the outcome target.
- **Full-season benchmark is retrospective** (acknowledged by authors): conditions on information unavailable at mid-season; upper bound only.
- **Lookahead-free for ex-ante mode**: correctly uses first-half xG only; clean temporal split.
- **Shot independence** is false in reality (sustained pressure, rebound sequences correlate) — standard but understated in effect on tail probabilities.
- **No player finishing ability**: same xG for all shooters; Leicester's exceptional conversion is treated as variance, but a finishing-skill component could shrink the "anomaly."
- **No defensive pressure, goalkeeper positioning, or team shape** features (data constraint).
- **Poisson independence and variance**: paper itself notes small-sample Poisson exaggerates extremes (xG≈1 occasionally scoring 4–5), understating favorites and overstating longshots — directly biases the 16.7% Leicester title number upward.
- **Single season, n=20 teams**: external validity thin; the 2015/16 season was deliberately chosen as the most anomalous possible case (selection bias toward the phenomenon).
- **Unused data**: betting odds and 5000-1 preseason priors sit unused — no market-comparison benchmark.
- NFL external validity: soccer's shot-volume structure (hundreds of low-p shots) has no NFL analog; the "underlying vs realized" logic transfers, not the sport-specific features.

## 10. GSE overlap
Existing map coverage: xG player/position-adjusted soccer paper (2301.13052) already read; Poisson/Dixon-Coles/Skellam goal-distribution family inventoried in the 26-metric catalog; soccer in-game WP (1906.05029) read. None of Garrett's existing work does **ex-ante rest-of-season simulation from an underlying-performance metric to quantify ranking/outcome uncertainty** — the repo's NFL analogs are point-estimate metrics (EPA/play, success rate, DVOA, Elo-type ratings), not Monte Carlo season-simulation inference. The NFL "deserved wins" / Pythagorean concept exists in the repo only informally. **Verdict: new capability** — the pattern is not a duplicate; it fills a method gap (probabilistic rest-of-season inference from underlying performance) while the soccer features themselves do not transfer.

## 11. GSE implementation spec
Build an NFL "Underlying-Performance Season Simulator" in the Sports repo (docs/research pipeline; computation in the existing gse-lab style, 4-script pattern):
- **Inputs**: nflverse play-by-play 2020–2025 (already the corpus standard); per-game team metrics EPA/play, dropback/rush EPA, success rate (definitions per gse-lab conventions).
- **Strength estimation**: for each team, attack/defense per-game EPA rates through week N (mirroring first-half xG split), normalized to league mean; shrinkage toward preseason prior (market-implied ratings from benbbaldwin tiers or Elo, as in the DVOA 83%/98% blend logic).
- **Match model**: replace Poisson goals with a bivariate normal (or Skellam) point-differential model parameterized by net EPA rates — the NFL analog of λ_home/λ_away; or reuse the repo's existing Elo/point-spread machinery as the score generator.
- **Simulation**: 10,000 rest-of-season sims (paper's 1,000 sufficed for soccer; NFL season is shorter, more sims cheap) → P(playoffs), P(division), P(#1 seed), P(Super Bowl) — the NFL analog of P(title)/P(top-4)/P(releg).
- **Diagnostic layer**: rank-gap diagnostic (Figure 5 analog: underlying-metric rank vs actual record rank) as an early-warning signal for regression candidates — directly product-relevant for GSE weekly content ("teams whose record outruns their underlying performance").
- **Effort**: 2–3 engineer-days; pure nflverse, no new data licenses. Validate calibration against realized outcomes 2020–2025 (not one hand-picked season).

## 12. Reproducible test
Dataset: nflverse play-by-play, regular seasons 2020–2025, weeks 1–8 as the "first half" (8 games ≈ half-season analog at the bye-cluster point). Metric: Brier score of P(playoff) from the simulator vs a naive baseline (preseason Elo carried flat) computed on realized 2020–2025 playoff fields; plus mean absolute rank-gap error. Baseline to beat: the existing repo Elo/nfelo playoff probabilities (or flat-preseason-Elo if nfelo isn't wired). Window: 6 seasons × 32 teams. Must run on weeks 1–8 only, no post-week-8 data in strength estimates (mirrors the paper's ex-ante discipline).

## 13. Acceptance / rejection gate
**Adopt** if, on 2020–2025 weeks-1–8 inputs, the underlying-performance simulator's P(playoff) Brier score beats the flat-preseason-Elo baseline by ≥ 5% relative improvement in at least 4 of 6 seasons, with no season worse than baseline (guards against the paper's single-season selection-bias problem). **Reject** if it fails that bar or if calibration (reliability curve of P(playoff) bins) shows systematic over/under-confidence > 10pp in any decile — the Poisson variance-exaggeration critique applies to any simulator, so calibration gates the whole lane.

## 14. Improvement experiment
Beyond the paper: replace the paper's league-mean normalization + fixed Poisson intensities with a **hierarchical Bayesian strength model** (partial pooling across teams, time-varying via a random walk — the repo already has nested-AR(1)/state-space precedent from 1701.05976) and swap Poisson for a **negative-binomial (overdispersed) score model**, directly addressing the paper's own limitation that Poisson exaggerates extremes. Then add the unused betting-odds data stream the paper ignored: calibrate simulator P(outcome) against de-vigged market-implied probabilities (already in repo via the market-microstructure lane) and report where simulator-vs-market disagreement is systematic — the actionable GSE edge, not the Leicester narrative.
