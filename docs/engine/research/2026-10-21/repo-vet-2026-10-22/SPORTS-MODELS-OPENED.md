# Sports model repos, source opened

Fetched with `gh api` on 2026-10-22. 10 distinct links.

| repo | licence | stars | verdict |
|---|---|---:|---|
| jdeast/EXOZIPPy | BSD-3-Clause | 17 | not vendored |
| renenunezg/mlbmodel | NONE | 0 | Kelly already in the engine |
| djlove2442/mlb-strikeout-repository | NONE | 0 | posterior mean and Marcel weights added |
| rplain1/just4Kicks | NONE | 0 | formula recorded, not copied |
| rayyanmaan/bayesian-sports-attendance-predictions | MIT | 0 | limitation recorded |
| pedrohgp02/modeling-sports-attendance | NONE | 0 | not copied |
| hfepbook1/bayesian-sports-analytics | NONE | 2 | series probability added |
| jacksongrantland/NFL-Prediction-App | NONE | 0 | not copied |
| ryanpmcintire/nfl_py3 | MIT | 16 | key-number mass added |
| Noahtheking2004/NFL_Game_Predictor | NONE | 0 | not copied |

## Opened

`nfl_py3` `src/nfl_ats` is a large ATS tree: key numbers, score lattice, mass-preserving lattice, half-life-8 overlay, weather overlays, purged CV, CLV, calibration. Opened `key_numbers.py`. Default keys are 1, 2, 3, 4, 6, 7, 10, 14. Mass for k is the share of rounded margins equal to k or -k.

`mlb-strikeout-repository` `04a_empirical_bayes.py` states `(K + alpha) / (BF + alpha + beta)` and Marcel weights 1, 0.8, 0.6. The script was not copied.

`hfepbook1` `app.py` is a Streamlit Bradley-Terry fit. Series win uses `p = 1 / (1 + exp(rB - rA))` and a binomial best-of-7 draw. The exact probability replaced the simulation. Bradley-Terry for a single game is already in the engine.

`just4Kicks` `just4kicks.qmd` states `logit(p) = alpha + theta_player + spline(distance)`. Field-goal make probability is already in `nfl/ngs-adjacent-metrics.ts`. The spline notebook was not copied. No licence file.

`mlbmodel` backend includes `kelly.py`. Full Kelly and quarter-Kelly are already in the engine. The rest of that tree was not copied. No licence file.

`NFL-Prediction-App` `src/nfl_prediction/models/games.py` fits `LogisticRegression(C=1)` and Ridge. Pushed the day it was pasted, no licence. Not copied.

`NFL_Game_Predictor` `SRC/Py/Model.py` is a random forest, 500 trees, depth 6. No licence. Not copied.

`bayesian-sports-attendance-predictions` is MIT. The README says the fitted model uses two factors only: no opponent quality, kickoff time, weather, stadium capacity, or league. Partial pooling is already in the engine. The notebook was not pasted.

`modeling-sports-attendance` has no licence. A notebook, a CSV, and a PDF. Not copied.

`EXOZIPPy` is BSD-3-Clause and 502 MB. It is an exoplanet PyMC wrapper, not a sports model. Not vendored.

## Added

- `keyNumberMass` in `packages/prediction-engine/src/nfl/key-number-mass.ts`
- `betaBinomialPosteriorMean` and `marcelWeightedRate` in `packages/prediction-engine/src/mlb/strikeout-shrinkage.ts`
- `seriesWinProbability` in `packages/prediction-engine/src/models/series-win.ts`
