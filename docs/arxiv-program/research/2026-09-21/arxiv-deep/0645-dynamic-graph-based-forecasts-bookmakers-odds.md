# [0645] Dynamic Graph-Based Forecasts of Bookmakers' Odds in Professional Tennis (arXiv:2508.15956)

**Citation:** Matthew J. Penn, Jed Michael, Samir Bhatt (2025). *Dynamic Graph-Based Forecasts of Bookmakers' Odds in Professional Tennis*. arXiv:2508.15956v1. URL: https://arxiv.org/abs/2508.15956
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/2508.15956.txt`).
**Verdict:** ADAPT — the odds-imitation framework (weighted graph of log-transformed historical odds → Elo-style ratings via convex least squares) ports directly to NFL: forecast bookmaker spreads/totals for any matchup before lines are released. Adapt with NFL margin-of-victory rating equations instead of the Elo win-probability equation.

## 1. Research question
Bookmaker odds are the gold-standard predictor but are released only shortly before matches. Can a model learn the bookmakers' implicit player ratings from historical odds and forecast bookmaker odds for ANY future match on any surface — effectively distilling the bookmakers' models into a pre-tournament forecasting tool?

## 2. Dataset / schema
- Historical tennis results + bookmaker odds from http://www.tennis-data.co.uk/alldata.php (open source). Training on historical majors; evaluation on 7 Grand Slams 2024–2025: Australian Open, French Open, Wimbledon, US Open (2025 US Open not yet played at writing time) → 1,684 total matches.
- Coverage gaps: 25 Wimbledon 2025 main-draw players had no prior matches in data (assigned worst-known-player ability); on average 13 matches/tournament discarded where model assigned identical ratings to both players.
- Comparison benchmarks from literature: gradient boosting incl. odds [16] (3,996 matches, 2013–2019); random forest [2] (7,620, 2010–2024); Bradley-Terry [3] (3,439, 2019–2020); logistic regression [1] (501, 2013); Elo [7] (2,395, 2014); points-based [7] (2,395, 2014).

## 3. Method / model
Two-stage odds-distillation model:
- (1) Impute bookmaker probabilities p = d/||d||₁ from average odds d (Eq. 3).
- (2) Assume odds follow an approximate Elo form P(a beats b) = 1/(1+10^{r_b − r_a}) (Eq. 4); log-transformed odds x_{ab} = log((1−p_{ab})/p_{ab}) = r_a − r_b, which is additive: x_{ab} = x_{ac} + x_{cb} (Eqs. 5–6).
- (3) Five-set matches: fit per-set win probability ξ by solving P(Bin(N_s, ξ) > N_s/2) = p_{ab} (Eq. 7) under set independence, to impute three-set-equivalent probabilities.
- (4) Build directed weighted complete graph: nodes = players, edge E_{ab} = weighted mean of historical log-odds x_{ab}(M) with weight w_{ab}(M) = ρ^{t_M} τ_s (Eq. 9: geometric temporal decay ρ^{t_M}, surface weight τ_s). Recursive updates: W'_{ab} = ρ^t W_{ab} + w_{ab}(M); E'_{ab} = (W_{ab}ρ^t E_{ab} + w_{ab}(M)x_{ab}(M))/W'_{ab} (Eqs. 12–13) — Markovian, no full history needed.
- (5) Fit ratings r minimizing weighted least squares f(r) = Σ_{a,b} W_{ab}((r_a − r_b) − E_{ab})² (Eq. 14); Hessian PSD by Gershgorin (Eq. 17) → convex; L-BFGS-B via scipy. Degree of freedom: ratings defined up to additive constant; disconnected subgraphs need a prior (noted as limitation).
- Surface weights τ_s fit by grid search on historical tournaments (~5 min/eval; "relatively insensitive"); training one tournament ~5 min on quad-core i7/32GB. Appendix proves geometric decay is the necessary weight function for the Markovian update property (Theorem 1).

## 4. Equations & assumptions
- p = d/||d||₁. (Eq. 3)
- P(a beats b) = 1/(1+10^{r_b − r_a}). (Eq. 4)
- x_{ab} = log((1−p_{ab})/p_{ab}) = r_a − r_b; x_{ab} = x_{ac} + x_{cb}. (Eqs. 5–6)
- P(Bin(N_s, ξ) > N_s/2) = p_{ab}. (Eq. 7)
- w_{ab}(M) = ρ^{t_M} τ_s; W_{ab} = Σ_M w_{ab}(M); E_{ab} = Σ_M w_{ab}(M)x_{ab}(M)/W_{ab}. (Eqs. 9–11)
- f(r) = Σ_{a,b} W_{ab}((r_a − r_b) − E_{ab})²; ∂f/∂r_a∂r_b = −2(W_{ab}+W_{ba}); ∂²f/∂r_a² = 2Σ_{b≠a}(W_{ab}+W_{ba}); Σ_{b≠a}|H_{ab}| = H_{aa} → PSD via Gershgorin. (Eqs. 14–17)
- Theorem 1: Markovian update ⇒ weight function w(t) = Aρ^t (proved via differentiability + Cauchy-style argument).
- Assumptions: bookmakers' odds approximately follow an Elo-style rating model (authors explicitly do NOT claim bookmakers use Elo — only that odds are consistent with dynamic ratings); set independence; multiplicative vig normalization; no home advantage; no injury/news information; unknown players ≈ worst known player.

## 5. Features / target
- Target: forecast bookmaker odds (probabilities) for arbitrary future matches, plus surface-specific player ratings.
- Inputs: historical bookmaker odds only (single feature: log-transformed odds per historical match, with match age and surface as weights).

## 6. Validation design
Prospective evaluation on 7 Grand Slams 2024–2025 (post-cutoff relative to training data per tournament). Metrics: accuracy (% correct) vs official rankings and vs bookmakers; two-sided hypothesis test of accuracy differences; correlation of model vs bookmaker probabilities (≈0.88 on matches with full data, best-fit y = 0.88x + 0.08 ≈ 1:1). Literature comparison via Ratio = 100×(ModelAcc/BookAcc − 1) and Difference = 100×(ModelAcc − BookAcc) metrics — acknowledged as imperfect since tournaments differ in predictability. No log-loss/Brier reported (accuracy only — a limitation).

## 7. Numerical results / baselines
- Wimbledon 2025: model predicted 182/252 vs official rankings 171/252 vs bookmakers 176/252 (not significant, small sample).
- 7 majors, 1,684 matches: bookmakers 1,249 (74.1%); model 1,237 (73.5%); rankings 1,173 (69.7%). Model vs bookmakers: not significant (p = 0.40); model vs rankings: significant (p = 0.0006).
- Model beat rankings in all 7 tournaments; beat bookmakers in 4 of 7.
- Literature comparison (Ratio, Difference): gradient boosting incl. odds +0.14/+0.10 (best); random forest −0.11/−0.14; Bradley-Terry −0.47/−0.32; this paper −0.96/−0.71; logistic regression −1.03/−0.80; Elo −2.78/−2.00; points-based −6.94/−5.00. "Performs averagely well" among surveyed models.
- Anomaly detection cases: model-vs-bookmaker outliers flagged British-player commercial hedging (Martinez v Loffhagen, Darderi v Fery, Quinn v Searle) and an injury (Thompson v Bonzi — Thompson withdrew injured from HSBC Championships <2 weeks before Wimbledon); remaining outliers from low data volume (e.g., Zhang/Collignon 4 matches since 2025 start, Royer/Juvan 1, vs Sabalenka 51).

## 8. Code / data availability
Code: https://github.com/mpenn114/rss-wimbledon-2025 (Python 3.11, scipy L-BFGS-B). Data: http://www.tennis-data.co.uk/alldata.php. Both stated in paper.

## 9. Leakage & limitations
- Training target IS the bookmakers' odds — the model can never systematically beat the bookmaker (authors state this explicitly); it's a distillation, not an edge generator. No actual match outcomes used in training ([16] shows combining odds + outcomes improves).
- Accuracy metric only; no probabilistic scoring (Brier/log-loss) — calibration untested.
- Tennis-specific Elo equation; NFL needs margin-based equations (the authors themselves suggest a Double Poisson analogue for football, ref [24]).
- No home advantage, no injuries/news; unknown/low-data players handled crudely (worst-known-player imputation caused the extreme-probability outliers).
- Disconnected-subgraph problem for sparse data; surface weights only grid-searched coarsely.
- Evaluation tournaments differ in predictability → cross-model comparison (Table 1) is approximate by the authors' own admission.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus has Elo/Bradley-Terry and odds-modeling coverage, but no odds-distillation / market-implied rating framework that forecasts bookmaker lines before release from historical line data. GSE's engine generates its own predictions; a distilled "what will the market say" model is a distinct, complementary capability (e.g., predicting opening lines, detecting when the book deviates from its own historical pricing). Extension, not duplicate.

## 11. GSE implementation spec
- Data: historical NFL point spreads and totals from the Odds API (existing account) or a historical odds archive (e.g., sportsbookreview/spreads database). Target: forecast opening/closing spread+total for any matchup.
- Adaptation: replace the Elo win-probability equation with an NFL margin model. Natural choice: spread s_{ab} ≈ r_a − r_b (+ home advantage h) and total t_{ab} ≈ o_a + o_b — i.e., offensive/defensive ratings like Massey/Pomeroy, fit as weighted least squares on historical LOG-transformed or raw spreads with geometric time decay and opponent adjustments. Keep the paper's graph + convex least-squares machinery (Eqs. 9–14) and Markovian recursive updates (Eqs. 12–13).
- Use cases: (a) predict opening lines before release → early position when GSE's number differs from predicted market; (b) anomaly detection à la §2.1.2: when actual lines deviate sharply from the distilled model, flag injury/news/hedging (the Thompson case); (c) pre-schedule simulations: full-season simulations with market-consistent lines for CLV studies.
- Effort: low-medium — the code repo is public and the math is convex least squares; main work is the NFL equation swap + historical odds ETL.

## 12. Reproducible test
Dataset: 2022–2024 NFL seasons, historical closing spreads/totals (Odds API archive or equivalent), GSE's own game predictions as the "outcome" side. Test 1 (distillation fidelity): fit the adapted model on seasons 2022–2023, forecast 2024 spreads; metric = MAE vs actual lines, baseline = previous-season-average spread model and a naive carry-forward line model; gate = adapted model MAE within 0.5 points of the market's own internal consistency (or beats baselines by ≥1.0 point MAE). Test 2 (anomaly value): count flagged line anomalies in 2024 that corresponded to verifiable news (injuries) within 24h — precision target ≥50%.

## 13. Acceptance / rejection gate
ADAPT if on 2024 holdout: (a) the NFL-adapted graph model forecasts closing spreads with MAE ≤ 3.0 points AND beats a carry-forward baseline by ≥0.75 points MAE, or (b) the anomaly detector flags ≥10 verifiable news-driven line moves in 2024 with precision ≥50%. REJECT if neither holds. This is a market-modeling tool, not an outcome edge — judge it on line-forecast accuracy, not ATS hit rate.

## 14. Improvement experiment
Combine the distilled market ratings with actual outcomes, as Wilkens [16] did for tennis: fit a joint model minimizing weighted loss on both historical odds-implied ratings AND realized margins, with a learnable mixing weight. Test whether the hybrid beats pure odds-distillation on line forecasting and whether the residual (hybrid minus market) has any ATS signal — i.e., whether the bookmaker's commercial shading (the British-player phenomenon) is detectable and exploitable in NFL lines.
