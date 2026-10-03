# [0280] Forecasting Soccer Matches through Distributions (arXiv:2501.05873v1)

**Citation:** Mendes-Neves, T., Baghoussi, Y., Meireles, L., Soares, C., & Mendes-Moreira, J. (2025). *Forecasting Soccer Matches through Distributions*. arXiv:2501.05873v1. URL: https://arxiv.org/abs/2501.05873v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1001 lines).
**Verdict:** ADAPT — the "forecast latent event distributions, then simulate outcomes" pipeline is a clean, cheap generative alternative to closed-form scoreline models; port the architecture to NFL play-count and EPA distributions rather than the soccer specifics.

## 1. Research question
Within the data-sparse constraints of the 2023 Springer Soccer Prediction Challenge (results-only data allowed), can match outcomes be forecast by modeling the distributions of shot quantity and shot quality per team (from ELO ratings) and then Monte Carlo-simulating games, rather than forecasting win probabilities or goal counts directly — and can such a model beat bookmaker odds profitably?

## 2. Dataset / schema
- football-data.co.uk European league matches (results + shots data; challenge dataset itself lacked shots).
- Schema: match date, teams, goals, shot counts, ELO-derived inputs. Last 300 games used as validation set. Test set = football-data.co.uk matches for profitability evaluation. Exact date ranges and row counts not stated.
- Challenge constraint: only basic result statistics usable for the competition entry; shot data used for model development.

## 3. Method / model
- Step 1: compute ELO ratings for all teams (K=32, a=400, initial rating 500).
- Step 2: train two regressors from (ELO_home, ELO_away) → mean of shot quantity (total shots) and mean of shot quality (goals per shot = goals/shots). Then train second-stage models on the first model's training-set residuals to predict the standard deviation (uncertainty), assuming normal distributions for both quantity and quality.
- Algorithms tested: Linear Regression, KNN, Decision Tree, Random Forest. Competition submission used Linear Regression (time constraints); Random Forest performed best in development.
- Step 3: simulate. Draw team ELO from last-10-games mean/std distribution; fill (n_simulations × 50) matrix sampling shot quality; per-row sample shot count from quantity distribution (zero out beyond shot count); per shot draw X ~ U(0,1), goal if X < shot-quality sample; sum goals per team per simulation; outcome/scoreline probabilities from simulation frequencies.
- Correct-score predictions: mean-rounded, median, or mode of simulated scores (authors chose mode on MAE grounds).

## 4. Equations & assumptions
Quantity distribution (Eq. 1): Quant_H = N(μ_quant, σ_quant²), where μ_quant, σ_quant = f(ELO_H, ELO_A).
Quality distribution (Eq. 2): Qual_H = N(μ_qual, σ_qual²), same inputs.
Simulation (Eq. 3): hs = [S_1..S_N], S ~ Qual_H, N ~ Quant_H.
Goal conversion (Eq. 4): Home Goals = Σ_{i=1..N} I(hs_i > X_i), X_i ~ U(0,1).
ELO update (Eqs. 5–6): ELO_{i(t+1)} = ELO_{it} + K(O_{ijt} − P_{ijt}); P_{ijt} = 1/(1 + 10^{−(ELO_{it}−ELO_{jt})/a}), K=32, a=400, O ∈ {1, 0.5, 0}.
Stated assumptions: shot quantity and quality follow normal distributions; quality samples are i.i.d. across shots; team ELO uncertainty captured by last-10-game mean/std; non-negative integer shot counts enforced post-hoc. Not stated: dependence between quantity and quality (treated independent).

## 5. Features / target
- Features: home ELO, away ELO only (deliberate minimalism; authors note rest days, match importance, league intensity as omitted but valuable).
- Targets modeled: total shots per match per team; goals-per-shot per team.
- Downstream derived outputs: three-way match outcome probabilities, correct-score probabilities, total-goals and win-margin distributions — all from simulation frequencies.

## 6. Validation design
- Validation: last 300 games of the dataset; metrics RPS, RMSE, MAE; baselines: 1-1 draw for every game (RMSE 1.68, MAE 1.73 on validation), plus bookmaker baseline on test (margin ≈ −5.6%, bookmaker RPS ≈ 0.198).
- Test: football-data.co.uk test set, 50-run averages. Betting evaluation with two flat strategies: Strategy 1 = bet 1 unit whenever bookmaker odds > model estimate; Strategy 2 = bet 1/(forecasted odds) units when bookmaker odds > model estimate. No backtest-window date discipline discussion; time ordering of the 300-game validation split implied but not verified.
- Competition results (marked * in Table 2): Linear Regression submission RPS 0.216, RMSE 1.70.

## 7. Numerical results / baselines
- Validation set (Table 2): RPS — LR 0.215, KNN 0.213, DT 0.215, RF 0.213; RMSE (median variant) — LR 1.76, KNN 1.73, DT 1.77, RF 1.74; MAE — LR 1.87, KNN 1.79, DT 1.83, RF 1.80. Competition submission: RPS 0.216, RMSE 1.70.
- Test set (Table 3, averages of 50 runs): RPS 0.201 vs bookmaker 0.198 (slightly worse than bookmakers). RMSE 1.58 (median) / 1.64 (mode); MAE 1.65 / 1.66.
- Betting rentability (Table 3): Strategy 1: −0.8% (i.e., +4.8% over the −5.6% bookmaker-margin baseline); Strategy 2: +1.1% absolute (+6.7% over baseline). Claims positive return with Strategy 2.
- Bias analysis (Figure 4): systematically underestimates draws — boosting draw likelihood by 27% improves RPS marginally.
- Challenge finish: within 5% of top entries.

## 8. Code / data availability
- Code: https://github.com/nvsclub/SpringerSoccerChallengeCode. Data: football-data.co.uk + challenge site (public). All stated in paper.

## 9. Leakage & limitations
- Profitability claim rests on a vague profitability test: no date discipline, no significance testing, no stated number of test-set games, and the margin over baseline (+4.8%/+6.7%) may be noise — Strategy 1 is actually −0.8% absolute. No commission/limits realism.
- RPS 0.201 vs bookmaker 0.198: the model does not beat bookmaker probabilities; the betting edge, if real, comes from selective subset exploitation, not superior calibration.
- Normal-distribution assumption for shot counts is mis-specified (counts, small, skewed); negative binomial would be more appropriate — the paper truncates rather than modeling counts.
- Quantity/quality independence is assumed, not tested; shot quality likely correlates with quantity (team dominance).
- Linear models are knowingly underfit; RF won in development but LR was submitted — published numbers mix the two.
- Validation-split leakage: "last 300 games" cut across teams/leagues with ELOs fit on earlier data — likely fine, but not audited; paper notes only that gray-area steps use training data.
- External validity to NFL: direct soccer→NFL transfer is weak; the transferable asset is the pipeline pattern, not the model.

## 10. GSE overlap
Per existing-research-map: GSE's corpus covers ELO/Bradley–Terry, Dixon–Coles, Poisson, Skellam, market-implied ratings, and simulation-based approaches (Monte Carlo appears in the DFS packet work). The "forecast latent process distributions, then simulate games" structure is a standard generative pipeline — architecturally a duplicate pattern. The novel-to-GSE element is small: the two-stage mean+residual variance estimator (mean model on labels, then model on |errors| to get σ) as a cheap uncertainty estimator without Bayesian machinery — extension, not new capability. Betting-strategy evaluation overlaps with the prediction-market triage docs and oracle3/Kelly material. Nothing here supersedes existing in-repo work.

## 11. GSE implementation spec
- Port the architecture: predict per-team distributions for (a) number of offensive plays and (b) EPA-per-play, from team strength features (GSE ratings, rest, dome, injuries); simulate 10k games per matchup; derive moneyline/spread/total probabilities from empirical frequencies.
- Mean models: gradient boosting on nflverse features; variance model: train on absolute residuals of the mean model (paper's trick) — cheaper than full quantile regression and gives per-game σ.
- Sanity-correct the distributions: negative binomial for play counts, normal/Student-t for EPA-per-play.
- Feed simulation outputs into GSE's existing calibration stack (temperature scaling, Venn-Abers per repo) before comparing to de-vigged market.
- Effort: 2–4 days prototype; simulation harness ~1 day; fits within existing weekly batch.

## 12. Reproducible test
- Dataset: nflverse 2021–2024 seasons; walk-forward: fit through week W−1, simulate week W.
- Metric: RPS on moneyline three-way (home/away, no draws → two-way Brier) vs (a) bookmaker consensus probabilities, (b) GSE current engine probabilities.
- Betting test: paper's Strategy 2 analogue (stake = 1/forecasted odds when edge over de-vigged line), flat log of CLV; window: 2024 season.
- Pass requires beating BOTH probability baselines (see §13), not just a profitable-looking betting run on one window.

## 13. Acceptance / rejection gate
Adopt the simulation-pipeline variant if, on walk-forward 2024 weeks 1–18, its moneyline Brier score beats the bookmaker-consensus-implied Brier by ≥0.002 AND beats GSE's current engine Brier by ≥0.002. Reject if it trails the bookmaker baseline (like the paper's RPS 0.201 vs 0.198 does) — a generative pipeline that can't out-calibrate the market adds complexity without edge. The paper's positive betting return on an unaudited window does not clear the bar alone.

## 14. Improvement experiment
Correlated quantity/quality with joint sampling: the paper samples shot count and per-shot quality independently. In the NFL analogue, model plays-per-game and EPA-per-play as a joint distribution via a copula or a conditional model (EPA-per-play | pace decile), since fast, high-play games systematically tilt efficiency. Test whether joint simulation closes the paper's draw-underestimation analogue — in NFL terms, miscalibration of extreme tails (blowouts) — versus independent marginals. This is the experiment the paper's independence assumption leaves on the table.
