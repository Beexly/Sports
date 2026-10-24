# nfultz, TeoCalvo, coppeliaMLA

Fetched with `gh api` on 2026-10-22. 12 distinct links.

| repo | GitHub licence | licence in the repo | stars | verdict |
|---|---|---|---:|---|
| nfultz/AWR.Athena | NONE | not stated | 24 | not copied |
| nfultz/Rip46 | NONE | not stated | 15 | not copied |
| nfultz/binomialbcp | NONE | GPL-3 in DESCRIPTION | 10 | not copied |
| nfultz/chad | NONE | not stated | 9 | not copied |
| TeoCalvo/teoSQL-V2 | NONE | CC BY-NC-SA 3.0 BR in the README | 152 | not copied |
| TeoCalvo/teoSQL | NONE | not stated | 100 | not copied |
| TeoCalvo/tmw-loyalty-t05 | NONE | not stated | 0 | not copied |
| TeoCalvo/community-dashboard | MIT | MIT | 0 | not copied |
| coppeliaMLA/td | NONE | not stated | 0 | not copied |
| coppeliaMLA/simsets | MIT | MIT | 1 | idea added, code not copied |
| coppeliaMLA/glasseye | MIT | MIT | 111 | not copied |
| coppeliaMLA/graphingPhilosophy | NONE | not stated | 23 | not copied |

## Added

`coppeliaMLA/simsets` is a MIT web API that generates a series and keeps the true factor contributions, so a model can be checked against the answer. The Flask app and its random seasonality were not copied.

The engine add is a deterministic series: `y_t = intercept + slope * t + noise_t`. `recoverPlantedSlope` returns the planted slope when the intercept and the noise are known. File: `packages/prediction-engine/src/evaluation/known-answer-series.ts`.

## Not copied, and why

`nfultz/binomialbcp` is a beta-binomial Bayesian changepoint model. GitHub reports no licence. The DESCRIPTION says GPL-3, and the copyright line is ZestFinance Inc 2015. GPL-3 code was not copied into this repo. Changepoint detection is already in the engine (`bocpdLite`, Page's CUSUM).

`TeoCalvo/teoSQL-V2` is a SQL course. The README states CC BY-NC-SA 3.0 BR and forbids commercial use of the material. It was not copied. `teoSQL` and `tmw-loyalty-t05` have no licence file.

`community-dashboard` is a Streamlit view of GitHub issue and pull-request times for ScanAPI. `glasseye` is a markdown-to-Tufte renderer. `td` is a todo.txt CLI. `AWR.Athena` is a JDBC wrapper. `Rip46` is an IP-address package. `chad` is an acceptance-test helper. `graphingPhilosophy` has no description and no licence. None of those is a sports measurement.
