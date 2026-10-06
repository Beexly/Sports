# [1447] An Empirical Study of Least Squares Ratings for USA Ultimate Frisbee (arXiv:2201.05249)

**Citation:** Alexander N. Sietsema (2022). *An Empirical Study of Least Squares Ratings for USA Ultimate Frisbee*. arXiv:2201.05249v1 [stat.AP]. URL: https://arxiv.org/abs/2201.05249
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 18 pages incl. references; sections 1–4, figure 1, tables 1–2, acknowledgements, supplementary-material note — all read via pdftotext).
**Verdict:** ADAPT — (a) adopt the least-squares rating `r̂ = (AᵀA)⁻¹Aᵀb` as GSE's transparent, interpretable point-differential baseline rating: rating ≈ expected points by which a team beats an average team, rating difference ≈ expected score differential — the exact quantity a spread model needs; (b) steal the score-cap normalization trick (multiplicatively rescale score differentials to a common cap, predict, then rescale back) for any capped/mixed-format data in GSE's pipeline; (c) adopt the ranking-violation rate (fraction of games where the lower-rated team wins) as a standing diagnostic alongside log-loss/MAE when comparing GSE rating systems; (d) treat the paper's "arbitrary-formula" teardown of USAU's sine-based game-rating formula as a design rule for GSE: every rating-system constant must be data-estimated or removed, never hand-picked.

## Research question
Can the plain least-squares rating system — no ad hoc formulas, no tuning constants — beat USA Ultimate's custom iterative power-rating system (a sine-based game-rating formula with hand-picked date/score weights and game-eligibility restrictions) at rating teams and predicting score differentials?

## Method
Two systems compared on the same regular-season data:

**USAU method (current):** each game earns a game rating from the opponent's rating via
Gr = Tr ± 125 + [475/sin(0.4π)]·sin(min(1, 2(1 − l/(w−1)))·0.4π),
with w/l the winning/losing scores and the sign ± for win/loss. Design properties: each extra goal worth more when the game is close; every one-point game gets the same differential 125; the MOV term is capped at 600; the cap is reached iff the winning score is more than twice the losing score. Game ratings are aggregated by weighted averaging: date weight dw = 2^(t/n) − 1 (game in week t of an n-week season, up-weights late games), score weight sw = min(1, (w + max(l, b(w−1)/2c))/19) (down-weights games with tiny goal caps / combined scores under 19). Iterate from all-1000 to convergence. Eligibility restrictions: teams need ≥10 games; games vs ineligible rosters dropped; if a team rated >600 points above its opponent wins by more than twice the losing score plus one, the game is ignored (provided the winner has ≥5 other non-ignored results) — a "blowouts-don't-count" rule the author shows is unnecessary.

**Least squares:** each game is one linear equation r_A − r_B = b (score differential); the m×n schedule matrix A (rows: +1 winner, −1 loser) and differential vector b give r̂ = (AᵀA)⁻¹Aᵀb (Eq. 5), the minimizer of ‖Ar − b‖₂² (Eq. 6), plus a sum-to-zero equation to fix the constant shift. To handle varying goal caps, a preprocessing step multiplicatively normalizes all differentials to a cap of 15 (e.g., a 12−8 game becomes 15−10, differential 5), and predictions are rescaled back to the original cap — the key modeling trick, since ultimate's cap makes running up the score impossible and differential the purest strength signal.

## Equations
- USAU game rating: Gr = Tr ± 125 + (475/sin 0.4π)·sin(min(1, 2(1−l/(w−1)))·0.4π) (Eq. 1)
- Date/score weights: dw = 2^(t/n) − 1 (Eq. 2); sw = min(1, (w + max(l, b(w−1)/2c))/19) (Eq. 3)
- LS system: Ar = b with A (m×n schedule matrix); r̂ = (AᵀA)⁻¹Aᵀb (Eqs. 4–6)

## Datasets
Scraped USAU website + archived ranking pages, 2014–2019 seasons, Club Men's / Mixed / Women's divisions; games with missing scores/teams dropped, international teams removed. Scale example (2019 Mixed: 339 teams, 54 regular-season tournaments, 2,209 regular-season games; 2019 Men's: 260 teams, 1,581 games). 2020–2021 excluded (COVID schedule irregularity). Because USAU's eligibility restrictions rate fewer teams/games than least squares, each method is scored on all predictions it makes (not only the intersection).

## Exact results / baselines
Retrodictive comparison (ratings fit on the regular season, scored against the same regular-season games), Figure 1 and text:
- **MSE and MAD:** least squares strictly better than USAU in every season (2014–2019) and every division.
- **MAD:** least squares is consistently ~0.25 points closer to the true differential per game than USAU ("not insignificant across a season").
- **Ranking violations:** comparable overall, both within ~2 percentage points — except 2014 Men's, where USAU's rankings got "nearly a quarter of all games" wrong.
- **Top-25 ordering (2019 Men's):** remarkably similar; all teams within 3 places between methods; Seattle Sockeye #1 under both (went on to win nationals).
- **Interpretability win:** LS ratings are expected point differentials vs an average team (top teams rated >15, i.e., expected to beat average teams by a full 15-point cap game); USAU's point scale has no such meaning.
- Context baselines cited: Gill & Keating (2009) survey; Barrow et al. (2013) found least squares significantly better than other methods on college-football data.

## Leakage assessment
Evaluation is **retrodictive**: ratings are computed on the full regular season and then "predict" those same games. This favors no method in particular (both evaluated identically) and measures fit quality rather than true forecasting skill. For GSE purposes this is a limitation to correct — the honest adaptation test is a walk-forward/leave-later-games-out forecast comparison.

## GSE overlap / corpus position
- Pairs with [1449] (least squares for cardinal paired comparisons, 2401.07018): that paper is the theory companion — Gauss-Markov justification, Var(μ̂) = σ²N⁺, connectivity diagnostics; this paper is the applied companion showing plain LS beats a production ad hoc system. Read them as one unit.
- Contrasts with [1446] (ordinal models): differential-based ratings vs points-based ordinal ratings; both are ADAPT but for different GSE heads (spread heads want differentials; win-probability heads want ordinal).
- Complements [1448] (G-Elo, 2010.11187): LS is the batch, interpretable baseline; G-Elo is the online, probabilistic alternative. GSE should run both.

## Implementation plan (GSE)
1. Add an `ls_ratings` module: build schedule matrix A (sparse), solve via `scipy.sparse.linalg.lsqr` (never dense `(AᵀA)⁻¹` at scale), anchor mean rating at 0 each week.
2. Feed LS rating differentials as a feature into GSE's spread head alongside the existing Elo; LS's rating is already in "expected point differential" units, so the spread head's link function simplifies.
3. Add ranking-violation rate to GSE's weekly rating-system diagnostics dashboard.
4. Implement the cap-normalization trick wherever GSE consumes capped-format data (e.g., preseason games with running clocks, mercy-rule formats): normalize to common cap, rate, rescale.

## Reproducible test
Replicate on NFL 2019–2023: build weekly LS ratings on point differentials (no cap normalization needed), produce spread predictions = rating differential + home adjustment; compare against GSE's current Elo spread predictions on MAE and ranking-violation rate, walk-forward (ratings from weeks < t predict week t).

## Numeric gate
LS spread-MAE must be ≤ GSE Elo spread-MAE + 0.1 points, and LS ranking-violation rate must be ≤ Elo's violation rate, on the 2019–2023 NFL walk-forward test. If it fails, keep LS only as a diagnostic baseline, not a spread-head feature.

## Improvement experiment
The paper's own future-work pointer is the right one: Gauss-Markov says OLS is optimal only under homoskedastic, uncorrelated games — false in sports. Extend to **weighted/generalized least squares**: estimate per-game variance as a function of (days rest, travel, rating uncertainty, week of season) and re-solve with WLS; test whether WLS spread-MAE beats OLS by ≥0.05 points on the same NFL backtest. Secondary experiment: L1 (least-absolute-deviation) ratings for robustness to garbage-time blowouts.
