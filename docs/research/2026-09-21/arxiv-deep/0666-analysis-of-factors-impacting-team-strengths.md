# [0666] An analysis of factors impacting team strengths in the Australian Football League using time-variant Bradley-Terry models (arXiv:2405.12588v1)

**Citation:** Carlos Rafael González Soffner, Manuele Leonelli (2024). *An analysis of factors impacting team strengths in the Australian Football League using time-variant Bradley-Terry models*. arXiv:2405.12588v1. URL: https://arxiv.org/abs/2405.12588v1
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/2405.12588.txt`; all 6 sections + appendices A–E including result Tables 1–26).
**Verdict:** ADAPT — the time-variant Bradley-Terry formulation with match-difficulty effects (home/interstate) and differential cumulative features is directly portable to NFL team ratings, but the paper's test accuracy (~60–68%, max 71.5%) is modest and it is evaluated on classification accuracy only, with no proper-scoring-rule or betting-market baseline comparison.

## 1. Research question
Can flexible Bradley-Terry (BT) models, fitted only on pre-game information, estimate AFL team strengths in an interpretable way and predict AFL game outcomes, and which pre-game factors (form, cumulative performance-indicator differentials, match difficulty) drive those strengths? The paper progresses from a standard BT model (strengths from win/loss counts only) to a contest-specific BT (home-team order effect) to a team-specific time-variant BT where team strength λ_ir is a linear function of team-specific features plus Gaussian team errors, and finally tests four round-by-round re-training prediction strategies (Addition, Substitution, Incremental, Majority Voting).

## 2. Dataset / schema
- Source: official AFL data via the fitzRoy R package (AFL Tables, AFL official website, FootyWire, Squiggle); ladder results partly retrieved manually from the AFL website.
- Scope: 1,826 games from AFL seasons 2015–2023 (207 games/season except 2015 with 206, one cancelled; 2020 with 162, Covid-shortened; 2023 with 216, extra round). 14 draws excluded.
- Schema: per-game per-team rows with WIN (0/1 target), form features (wins last 4, cumulative wins, ladder position differentials, points for/against differentials), ~60 performance-indicator differentials encoded two ways (cumulative over the season; cumulative over the last 4 games), and match-difficulty binaries (AT_HOME, HOMEGROUND, INTERSTATE). Full glossary in paper Appendix B; no missing values.
- Access: public (fitzRoy package + AFL Tables/AFL website). Replicable in principle.

## 3. Method / model
- **Experiment 1 (standard BT):** binomial win counts per team pair; strengths λ_i are log-strength coefficients estimated via the BradleyTerry2 R package; reference team chosen as the average (half wins/half losses) team per window. Fitted on windows of 1, 2, 3, 4 seasons and all data (2015–2023).
- **Experiment 2 (contest-specific):** adds an order-effect term δZ for the home-team designation (Z = 1 if designated home, −1 otherwise), estimated separately from team strengths.
- **Experiment 3 (team-specific, time-variant):** λ_ir = Σ_k β_k X_ik + ε_i with ε_i ~ N(0, σ²); features are differentials of form and cumulative PIs; per-feature significance screening at 5%, then a final model with backward elimination to p < 0.05.
- **Experiment 4 (round-by-round prediction):** Addition (retrain adding each new round), Substitution (drop the same round of the prior season), Incremental (predict rounds 1–3 with prior-season model, then refit on current-season rounds), Majority Voting over the three strategies plus Experiments 2–3 models. Predict win if P > 0.5.
- Prediction protocol: train on season(s) t, predict all games of season t+1 (forward-walk, time-ordered).

## 4. Equations & assumptions
- Outcome encoding: Y_ijr = 1 if team i beats team j at round r, else 0; i,j = 1…18, i ≠ j.
- BT win probability: P(Y_ijr = 1) = π_ir / (π_ir + π_jr), with π_ir = exp(λ_ir).
- Standard BT: logit(P(Y_ijr = 1)) = λ_i − λ_j.
- Contest-specific: logit(P(Y_ijr = 1)) = λ_i − λ_j + δZ (Z = ±1 home/away indicator).
- Team-specific time-variant: λ_ir = Σ_{k=1..p} β_k X_ik + ε_i, ε_i ~ N(0, σ²) i.i.d. Gaussian team errors.
- Stated assumptions: games independent given strengths; strengths constant within a window in Experiments 1–2; draw exclusion (14 games); reference-level identifiability via the average team; significance-based feature selection at the 5% level. No equations stated for the feature-selection/backward-elimination procedure or the voting strategy beyond the prose description.

## 5. Features / target
- Target: WIN (team won game = 1 / lost = 0); draws excluded.
- Features (all pre-game, all differential-encoded except binaries): Match difficulty — AT_HOME, HOMEGROUND, INTERSTATE; Form — consecutive wins/losses, wins last 4 (L4G_WINS), ladder-position differential at game time, previous-season final ladder differential, LG_WON (won previous game), percentage/points-for/points-against differentials, cumulative-wins differential; ~50 PI differentials (entries into Forward 50, marks inside 50, goal shots, score launches, contested possessions, metres gained, intercepts, tackles inside 50, clearances, contested losses, rebound inside 50s, kick-to-handball ratio, etc.), each encoded both as last-4-games cumulative and season cumulative.
- Final multivariate models typically retained: AT_HOME, INTERSTATE (or HOMEGROUND), previous-season ladder differential, points for/against differentials, plus a handful of PI differentials (Forward-50 activity, goal shots, score launches, intercepts, groundball contests).

## 6. Validation design
- Train on season window (1–4 seasons or all 2015–2023), predict every game of the next season; strictly time-ordered (no shuffling). Classification accuracy with a 0.5 threshold. AIC reported for fit comparison. No proper scoring rules (no log-loss/Brier), no calibration assessment, no comparison against bookmaker odds or a naive home-favorite baseline.

## 7. Numerical results / baselines
- Standard BT (Exp. 1): test accuracy ~60% (single-season windows: 57.46%–63.83%; all-data model 60.98% train); accuracy degrades as training windows lengthen (Table 2, Table 15). Train accuracy up to 78.38% (2016).
- Contest-specific BT (Exp. 2): AT_HOME significant and positive on all data (coefficient 0.29; single seasons 0.08–0.63); test accuracy improves over most seasons, max 67.37% (2022→2023); AIC slightly lower (Table 4, Table 20).
- Team-specific time-variant (Exp. 3): max test accuracy 69.38% (season-cumulative, train 2019 → test 2020); all-data fit reaches 68.54% (Table 6, Table 24).
- Round-by-round (Exp. 4): best single-season result 71.5% (Incremental, season-cumulative, train 2015 → test 2016, Table 7); Majority Voting gives stable 60%+ accuracy, up to 67.96% (2021→2022). Finals-series prediction is weak (3–7 of 9 games, Table 25).
- Author-reported headline: "predicting up to 71.5% of outcomes." My read: the 71.5% is a single best-season result; the typical range is ~60–66%, a ~3–8 pp lift over the plain BT baseline.

## 8. Code / data availability
Code: https://github.com/charlieceratops/AFL_BradleyTerry (stated in paper Sec. 3.1). Data: public via fitzRoy R package. No package/DOI beyond the GitHub repo.

## 9. Leakage & limitations
- No obvious lookahead: all features are differentials of games already played (season-to-date or last-4 cumulative); the prediction protocol is forward-walk. Caveat: early-season rounds have near-zero differentials, handled via the Incremental strategy rather than excluded.
- No betting-market or naive-baseline comparison, so the economic value of the 60–68% accuracy is unproven (AFL home-favorite rates are typically ~60%; the paper never shows it beats a market-implied pick).
- Accuracy-only evaluation with a 0.5 threshold — no probability quality (calibration/log-loss), which is what GSE needs.
- Finals series (9 games) modeled with the same data though the authors admit it is unrepresentative; models struggle there.
- Coefficient instability: cumulative-wins differential flips sign (negative in some models), likely driven by early-season near-zero differentials and finals-series selection effects — the authors acknowledge this.
- Strengths are league-relative with an arbitrary reference team; coefficients for average teams sit near 0 and significance varies by season/window.
- AFL-specific (draws excluded, oval zones, 18 teams, 23-round seasons) — PI features do not map directly to NFL.

## 10. GSE overlap
- Existing-research map: Bradley-Terry is inventoried as a known method (Sections 1, dedup guide) and Elo/nfelo + market-implied ratings are inventoried; no BT-based production rating with time-variant differential features is implemented in GSE. Garrett's own lanes (CEPT, MOVE-37, ML brief) do not include BT strength models. The map flags "market microstructure" and "in-play" as gaps — this paper is adjacent but not duplicative.
- The BT + Gaussian team-error + home-effect formulation is a clean, interpretable alternative to GSE's current ratings for opponent adjustment (e.g., for EPA/SR residualization and for strength-of-schedule decomposition).

## 11. GSE implementation spec
1. Data: nflverse play-by-play 2009–2025 (regular season); derive team-game-level differential features (off/def EPA differential last-4 and season-cumulative, success-rate differential, pressure-rate differential, turnover-margin differential, plus rest/travel days). Target: ATS cover or straight-up win for calibration-free tests; logistic scale for later probability use.
2. Model: logistic/Bradley-Terry with team random intercepts (ε_i ~ N(0, σ²)) fit via lme4/glmmTMB or PyMC; match-difficulty terms: home-field (split by stadium-sharing? not needed for NFL — true home venues), rest differential, altitude/travel. Regularize the PI differential coefficients (the paper's univariate screening + backward elimination is fragile; use ridge).
3. Serving: weekly refit on a rolling 3-season window (the paper's "medium-term drift" finding); output team strengths λ_ir for downstream EPA opponent-adjustment and a calibrated win probability (add a Platt/calibration layer — the paper lacks one).
4. Effort: 2–3 days engineering, 1 day fitting/validation.

## 12. Reproducible test
Dataset: nflverse regular-season games 2015–2025. Protocol: rolling forward-walk — fit the ridge-regularized team-error BT each season on the prior 3 seasons, predict next season's straight-up outcomes from pre-game differentials. Metrics: Brier score + log-loss + classification accuracy vs two baselines: (a) plain Elo (nfelo-style), (b) the closing spread implied probability. Time window: 2018–2025 predictions.

## 13. Acceptance / rejection gate
ADOPT if the BT time-variant model beats baseline (a) Elo on Brier score by ≥ 0.003 on the 2018–2025 test window AND matches or beats the closing-spread implied probability on log-loss; REJECT if it fails to beat Elo on Brier or trails the market by > 0.005 log-loss (the paper's accuracy-only gains do not justify a new component without probability-quality wins).

## 14. Improvement experiment
Replace the paper's univariate-significance feature screen with grouped elastic-net over the PI-differential blocks (EPA/SR/pressure/turnover blocks), add opponent-adjusted feature variants (features themselves opponent-adjusted via the first-stage λ's, iterated like EM), and model the spread margin with a team-effect linear model instead of win/loss — testing whether opponent-adjusted margin residuals improve GSE's ATS pricing over the current ratings stack.
