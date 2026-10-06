# [0235] Introducing Grid WAR: Rethinking WAR for Starting Pitchers (arXiv:2209.07274v5)

**Citation:** Brill, R. S. & Wyner, A. J. *Introducing Grid WAR: Rethinking WAR for Starting Pitchers*. arXiv:2209.07274v5. URL: https://arxiv.org/abs/2209.07274
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 9,207 lines including appendices A–E).
**Verdict:** ADAPT — port the per-game convex aggregation principle (compute value per game, then sum — never average-then-convert) and the Empirical Bayes shrinkage talent estimator into GSE's QB/team valuation; the baseball grid itself doesn't transfer, but the Poisson/Skellam context-neutral win-probability machinery is directly reusable for NFL per-game WPA.

## 1. Research question
Is season-averaged WAR for MLB starting pitchers mathematically valid, and does a per-game convex alternative (Grid WAR) better measure historical value and predict future performance?

## 2. Dataset / schema
- Retrosheet play-by-play, every plate appearance 2010–2019 featuring a starting pitcher (scraped 1990–2020; box link: upenn.app.box.com/v/retrosheet-pa-1990-2000); Statcast data since 2008 for the Shiny app (auto-scraped each morning at gridwar.xyz).
- FanGraphs RA/9 WAR and FIP WAR scraped via the R `baseballr` package (Petti & Gilani 2021) for comparison.
- Code: github.com/snoopryan123/grid_war.

## 3. Method / model
- Grid WAR (GWAR): context-neutral win probability added above replacement at the point the starter exits, computed per game and summed over the season.
- Grid function f(I,R): P(win | R runs allowed through I complete innings), league-average offenses, estimated via Empirical Bayes Poisson model with positive-normal prior on team strength and ballpark adjustment.
- Mid-inning exits: expected GWAR over the rest-of-inning runs distribution g(r|S,O) (empirical, binned by base-state S and outs O).
- Replacement level: w_rep = 0.428, calibrated so Σ GWAR (2010–2019) = Σ FanGraphs RA/9 WAR.
- Park effects α: ridge regression on half-inning runs (fixed effects for park, team-offense-season, team-defense-season; 3-year windows), validated by two simulation studies + out-of-sample tests vs ESPN/FanGraphs/BRef park factors.
- Pitcher talent: parametric Empirical Bayes shrinkage estimators μ̂_p (Brown 2008 style), shrunk toward the overall mean by games pitched; mapped to ranks for fair cross-metric comparison.

## 4. Equations & assumptions
- WAR(R) convex in runs allowed; Jensen: WAR(E[R]) ≤ E[WAR(R)] (Eq. 1.1) — the paper's central mathematical claim: averaging-then-converting undervalues WAR.
- Base: GWAR = f(I,R) − w_rep (Eq. 2.1); mid-inning: Σ_{r≥0} g(r|S,O) f(I, r+R) − w_rep (Eq. 2.2).
- Inning runs model: X_i ~ i.i.d. Poisson(λ_X), Y_i ~ i.i.d. Poisson(λ_Y) (Eq. 2.3).
- f(I,R|λ_X,λ_Y) = P(Σ_1^9 X_i > R + Σ_{I+1}^9 Y_i) + ½·P(Σ_1^9 X_i = R + Σ_{I+1}^9 Y_i) (Eq. 2.4); I=9 reduces to Poisson(9λ_X) (Eq. 2.5); I<9 to Skellam(9λ_X, (9−I−1)λ_Y) (Eq. 2.6).
- Prior: λ_X, λ_Y ~ N_+(λ, k·σ²_λ) (Eq. 2.7), k = 0.28 chosen to minimize log-loss; posterior-mean grid via Monte Carlo with B = 100 samples (Eq. 2.8).
- Ballpark adjustment: λ → λ + α.
- Rating cost model (Approach 2 of the cricket paper is separate; here): FIP-style base metrics rejected because pitchers control sequencing (Snell 2023 example: highest walk rate since 2000 yet 2.33 ERA).
- f is monotonic decreasing in R, increasing in I, convex in R for large R, smooth.
Stated assumptions: runs per inning i.i.d. Poisson given team strength (acknowledged false — lineup turnover, reliever quality — but "justified by working"); both teams' offenses "randomly drawn" from dataset rather than truly league-average; win probability in extra innings = ½; overtime/extra-inning handling simplified.

## 5. Features / target
- Inputs per game: innings completed I, runs allowed R, mid-inning outs O, base-state S, league, season, ballpark.
- Output: per-game GWAR; seasonal GWAR = Σ games.
- Prediction target: next season's cumulative GWAR (rank RMSE).

## 6. Validation design
- Descriptive: GWAR vs FWAR scatter (2010–2019), regression y = 0.47 + 0.85x (slope < 1 → FWAR undervalues worse pitchers, overvalues better).
- Predictive: 2010–2018 → predict 2019 GWAR ranks via Empirical Bayes shrinkage; metric = RMSE of predicted vs observed ranks. Also restricted to 5 most under/overvalued pitchers.
- Park effects: two simulation studies + out-of-sample predictive performance vs existing park factors.
- Grid model choice: empirical grid overfits (non-monotonic); XGBoost with monotonic constraints overfits tails; parametric Poisson chosen.

## 7. Numerical results / baselines
- Predictive RMSE (Table 2, 2019 GWAR ranks): GWAR-based 10.2 vs FWAR(RA/9)-based 12.4 vs FWAR(FIP)-based 13.1 — GWAR wins.
- Extreme pitchers: undervalued-vs-FWAR(RA/9): 7.2 vs 15.7 (Table 3); undervalued-vs-FIP: 5.1 vs 15.0 (Table 4); overvalued-vs-FWAR(RA/9): 10.7 vs 14.0 (Table 5); overvalued-vs-FIP: 10.2 vs 18.0 (Table 6).
- Scherzer 2014 6-game stretch: standard WAR drops 2 → ½ after one blow-up; "real" WAR ≈ 1.5 (max single-game damage −0.40).
- Koufax 1966: 11.54 GWAR (best season ever; 41 games) vs 20th by FanGraphs WAR (three blow-up games overweighted).
- Whitey Ford: 78 career GWAR (19th since 1952) vs 53 FWAR (49th); Catfish Hunter: 52 GWAR (32nd) vs 37 FWAR (107th).
- Structure finding: all pitchers have great games; great pitchers have few terrible games — averaging dilutes mediocre pitchers' good games ("undervaluing mediocrity").
- Season-to-season stability: FWAR(FIP) most stable; GWAR ≈ FWAR(RA/9) noisier — but stability ≠ predictiveness of future GWAR.

## 8. Code / data availability
Code: github.com/snoopryan123/grid_war (R). Data: Retrosheet box link + Statcast auto-scrape; Shiny app at gridwar.xyz (every starter game/season/career since 1952, updated daily). No raw credential issues.

## 9. Leakage & limitations
- w_rep = 0.428 is calibrated to match FanGraphs' scale — GWAR is not an independent estimator of absolute value, only of relative value; the "sum equality" constraint means FWAR and GWAR can't both be wrong in the same direction on totals.
- Predictive test is one holdout season (2019) — single-season validation; the extreme-5-pitcher tables are n=5.
- The Poisson i.i.d. innings assumption is acknowledged false; grid quality rests on "looks like a smoothed empirical grid" — no formal goodness-of-fit for f.
- Runs allowed as base metric is confounded with fielding (authors argue the effect is "smaller than ballpark, which itself is small" — asserted, not proven in main text).
- Mid-inning g(r|S,O) uses 2010–2019 empirical bins pooled across innings — assumes inning-invariance.
- Selection-bias asymmetry acknowledged (bad-but-occasionally-brilliant pitchers don't last) but not corrected.

## 10. GSE overlap
Per existing-research-map.md: GSE has extensive EPA, win-probability, and QB-valuation work, plus hierarchical Bayesian shrinkage in places, but the *Jensen/convexity aggregation principle* (never average-then-convert a convex value function) is not formalized as a GSE design rule, and a *context-neutral per-game WPA* built from a parametric scoring grid (Poisson/Skellam) is not in the corpus — GSE's WP work is in-game and team-offense-dependent. This is an **extension**: (a) per-game convex aggregation as a design rule for all GSE player-valuation metrics; (b) a context-neutral per-game QB WPA grid for NFL using drive-level Poisson scoring; (c) Empirical Bayes shrinkage talent estimator for small-sample QB/team ratings.

## 11. GSE implementation spec
- Design rule: any GSE metric mapping performance → wins/value must be computed per game and summed, never computed from season averages, when the mapping is convex (win probability in points allowed/scored is convex — "you can only lose once" applies to NFL too: allowing 40 vs 30 points differs less than 20 vs 10).
- Build an NFL context-neutral per-game WPA: model team points per drive as Poisson(λ), derive f(drives_remaining, point_differential)-style grid, compute QB per-game WPA above replacement, sum over season — replaces season-average EPA→wins conversions for QB valuation (MVP/award models, DFS salary analysis).
- Implement the Empirical Bayes shrinkage talent estimator (Brown 2008 style) for QB/team ratings with <1 season of data (rookies, small samples) — shrink per-game WPA means toward positional prior.
- Effort: 2–3 engineer-weeks (grid estimation on nflverse drive data + shrinkage module).

## 12. Reproducible test
Dataset: nflverse 2018–2024. Compute per-game convex-aggregated QB value (sum of per-game context-neutral WPA) vs season-average EPA→wins conversion. Test 1 (descriptive): replicate the paper's Figure 7 — regress per-game-aggregated value on average-converted value; check slope < 1 (average-conversion overvalues consistent QBs, undervalues volatile ones). Test 2 (predictive): 2018–2023 → predict 2024 QB value ranks via Empirical Bayes shrinkage on each metric; metric = RMSE of predicted vs observed ranks, mirroring Table 2. Baseline: per-game aggregation must beat average-conversion by ≥1 RMSE point.

## 13. Acceptance / rejection gate
Accept the design rule if Test 1 replicates (slope significantly < 1) on NFL QB data — i.e., the convexity effect is real in football scoring. Accept the Empirical Bayes talent estimator if it beats raw per-game means on 2024 rank RMSE. Reject the NFL WPA grid if the Poisson drive model fails goodness-of-fit (drives are not independent — punt/turnover dynamics) to the point that the grid disagrees with the empirical win-probability grid by >2pp in any (drives, differential) cell; fall back to the empirical grid with monotonic smoothing (the paper's rejected XGBoost path may work better on NFL-sized data).

## 14. Improvement experiment
Beyond the paper: (a) the paper's grid is static per league-season — for NFL, make the grid *opponent-adjusted* (defensive strength of the specific opponent) rather than league-average, since NFL has only 17 games and opponent heterogeneity dominates; (b) extend convexity analysis to DFS: the paper shows volatile pitchers are undervalued by averages — test whether volatile QBs are systematically mispriced in DFS salaries (which are set from median projections), creating a GPP leverage angle on high-variance QBs; (c) replace the paper's single 2019 holdout with rolling-origin validation across all seasons — the paper's predictive claim rests on n=1 season and needs the stronger test before GSE bets on it.
