# Ledger 1805 — Dummy RAPM: Representing Low-Minute Players in Regularized Adjusted Plus-Minus

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2608.19454
- **Title:** Dummy RAPM: Representing Low-Minute Players in Regularized Adjusted Plus-Minus
- **Authors:** Kenny Watts, Jonathan Pipping-Gamón, Abraham J. Wyner (The Wharton School, University of Pennsylvania) (Wharton SABi-affiliated authors; code org `whartonsabi`)
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction, dummy-indicator method specification, weighted ridge setup, chronological validation design, results tables with RMSE/R²/CIs, discussion, and references) from the ar5iv HTML full-text rendering, saved to `/tmp/wave4b-dfs2/papers/2608.19454.html` with extracted text at `/tmp/wave4b-dfs2/txt/2608.19454.txt`. Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

Standard RAPM silently drops or mishandles low-minute players (garbage-time lineups), distorting the ratings of everyone who shares the floor with them. Can low-minute players be represented as pooled "dummy" lineup-side indicators — rather than filtered out — to improve out-of-sample prediction of stint-level scoring margin?

## 3. Method/model

- **Weighted stint-level ridge regression** (standard RAPM scaffolding): response = home-minus-away margin per 100 possessions for each stint; weights = stint possession count.
- **Innovation:** instead of dropping players below a minutes threshold, add **10 dummy indicators** to the design matrix: counts of 1–5 excluded low-minute players on the home lineup and 1–5 on the away lineup.
- Two hyperparameters: the minutes-per-appearance exclusion threshold, and the dummy/player ridge-penalty ratio (dummies get their own heavier penalty).

## 4. Mathematics, equations, assumptions

- Ridge objective: min_β ‖W^{1/2}(y − Xβ)‖² + λ_player‖β_players‖² + λ_dummy‖β_dummy‖², with λ_dummy/λ_player = 2.2 (selected).
- Assumption: low-minute players are exchangeable *within a lineup side* conditional on the count — i.e., the effect of having 2 replacement-level players on the floor is a pooled effect, not player-specific.
- Assumption: the dummy effect is additive and linear in the count of excluded players.
- The model is descriptive/predictive, not causal: no adjustment for opponent strength beyond the regression itself.

## 5. Dataset/schema

- ESPN / sportsdataverse NBA play-by-play, **16 seasons**, **19,589 games**, **496,575 stints**.
- Schema per stint: game id, home/away 5-man lineups, possessions, home-minus-away margin per 100 possessions.

## 6. Features and target

- **Features:** one-hot indicators for each qualifying player on each side (home +, away −), plus the 10 dummy count indicators.
- **Target:** stint scoring margin per 100 possessions (weighted by possessions).

## 7. Validation design

- **Strict chronological split per season:** October–December training → January–February validation (hyperparameter selection) → March–April outer test.
- Hyperparameters (threshold, penalty ratio) selected on validation; all reported numbers are outer-test.
- Baselines: standard filtered RAPM (low-minute players dropped) with the same ridge setup.

## 8. Exact results and baselines with numbers

- Selected hyperparameters: **10 minutes per appearance** threshold; **dummy/player penalty ratio 2.2**.
- Outer-test RMSE: **Dummy RAPM 12.856** vs. **Filtered RAPM 12.897** — improvement of **0.042 points (0.30%)**.
- Dummy RAPM better in **13 of 16 seasons**.
- Mean R²: **0.178 vs. 0.173**.
- 95% CI for the RMSE reduction: **0.013–0.070** (excludes zero).

## 9. Code/data availability

- Code: `https://github.com/whartonsabi/dummy-rapm`
- Data: ESPN/sportsdataverse (publicly accessible play-by-play).

## 10. Leakage and limitations

- **Key limitation:** predictions are conditioned on *realized* held-out lineups — this is lineup-conditioned margin prediction, not a true pregame forecast (no rotation/minutes projection step).
- The 0.30% gain is small in absolute terms, though statistically distinguishable from zero.
- Count-additivity of dummy effects is assumed, not tested (e.g., 3rd excluded player may differ from 1st).
- 10-minutes/appearance threshold is a selected constant; optimal threshold may vary by era/pace.

## 11. GSE overlap

- Directly overlaps GSE's NBA player-rating and injury/rotation-adjustment needs: when a rotation player is ruled out, GSE's projections must reallocate minutes — the dummy representation is a principled way to pool replacement-level production instead of dropping those players or assigning them zero.
- Complements the possession-based soccer RAPM (ledger 1812) and the lineup-composition paper (ledger 1808): all three address "who shares the floor" effects.

## 12. Implementation specification

1. **Inputs:** GSE's stint/lineup data (NBA; extendable to any 5-man-lineup sport data GSE holds), with per-player minutes per appearance.
2. **Build design matrix:** player indicators for players above the minutes threshold; for each stint side, count excluded players 1–5 → 10 dummy columns.
3. **Fit** weighted ridge with two penalties (tune λ_player by CV; set λ_dummy = 2.2 × λ_player as starting point, then re-tune).
4. **Select threshold** on a validation window (start at 10 min/appearance).
5. **Use:** player ratings feed the fantasy-points projection model as a lineup-context feature; dummy coefficients give a "replacement-level lineup drag" adjustment for injury news.

## 13. Reproducible test

- Replicate the paper's pipeline on one NBA season of GSE data with the chronological split; target: Dummy RAPM RMSE < Filtered RAPM RMSE on the outer test, with the improvement direction matching in ≥ 70% of seasons tested.
- Unit test: adding a 5th excluded player to a side must change the predicted margin only through the dummy coefficient (no player-specific leakage).

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** outer-test RMSE improvement 0.042 (95% CI 0.013–0.070), wins 13/16 seasons, R² 0.178 vs. 0.173. Accept as ADAPT.
- **Improvement experiment:** replace the fixed 10-minute threshold with a learned per-player "replacement-level" propensity (minutes share × usage), and allow the dummy penalty ratio to vary by position group. Success = outer-test RMSE reduction ≥ 0.06 with the same chronological protocol, i.e., beating the paper's 0.042 by ≥ 40%.

**Verdict:** ADAPT — Pooled dummy representation for low-minute players in RAPM; adopt the 10-indicator count design and 2.2 penalty ratio as GSE's rotation/injury adjustment baseline, with a learned replacement-propensity as the improvement path.
