# [1614] The Performance of Betting Lines for Predicting the Outcome of NFL Games (arXiv:1211.4000)

**Citation:** Greg Szalkowski, Michael L. Nelson (2012). *The Performance of Betting Lines for Predicting the Outcome of NFL Games*. arXiv:1211.4000. URL: https://arxiv.org/abs/1211.4000
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 7,648 words).
**Verdict:** ADAPT — the normal-approximation spread→win-probability map Pr(F>U|P=p) = Φ(p/13.588), calibrated on 2,560 NFL games, is a clean validated baseline for GSE's spread-implied probability conversion and season-simulation Monte Carlo; the home-underdog edge (claimed 53.5% ATS 2002–2011) is dated and self-reported as diminishing, so treat it as a calibration prior and bias to re-test, not as a live system.

## 1. Research question
Can the collective intelligence embedded in NFL betting lines (opening/closing spreads and their movement) predict game outcomes and division winners? Using 2,560 games from 2002–2011, the paper: (i) compares spreads to actual margins of victory via the Line Difference metric; (ii) derives a normal-approximation win-probability formula; (iii) tests whether line movement predicts anything; (iv) tests the home-underdog betting strategy against the 52.38% break-even threshold.

## 2. Dataset / schema
- **Games:** 2,560 NFL games, 2002–2011 (post-expansion, all 32 teams; abstract says regular + postseason, text says the DB holds 2,560 regular-season games = 10×256). Box scores (30+ stats/game) + opening/closing lines, mostly from The Gold Sheet, stored in MySQL.
- **Line values:** opening line, closing line, line movement = open − close; most common closing values 3, −3, 7.
- Access: public sources (NFL box scores, Gold Sheet lines); no replication dataset released.

## 3. Method / model
- Line Difference: LD = (FavoriteScore − UnderdogScore) − |ClosingLine| (Eq. 3); histogram fit vs. Gaussian (chi-squared goodness-of-fit).
- Win probability via normal CDF: Pr(F>U|P=p) = Φ(p/13.588) (Eq. 4, Stern 1991 method).
- Season simulation: per-game win probs → product over k-game sequences → Σ over C(16,k) sequences → predicted wins; 1,000 simulated seasons per year, averaged; division winners predicted (ties decided in the authors' favor — a stated upward bias).
- Line movement analysis: distribution of open→close moves; by-week movement rates; opening vs. closing MSE comparison.
- Home-team ATS records by season with z-tests vs. 0.5 and vs. 0.5238.

## 4. Equations & assumptions
- Break-even: 100·WR = 110(1−WR) ⇒ WR = 0.5238 (Eq. 1).
- MOV = WinnerScore − LoserScore (Eq. 2).
- LD = (FavoriteScore − UnderdogScore) − |ClosingLine| (Eq. 3).
- Pr(F>U|P=p) = Φ(p/13.588) (Eq. 4); σ = 13.588 from the LD distribution.
- Example: p=7 ⇒ Φ(7/13.588) = 69.6%; two-game parlay prob 0.429 for −7 and −4.
- Assumptions: LD ~ Normal(0, 13.588) (chi-squared: not statistically different); game outcomes independent across weeks (season simulation); closing line reflects final collective information; ties in predicted division winners counted as correct (explicit).

## 5. Features / target
Features: closing spread, opening spread, line movement (open−close), home/away, favorite/underdog status. Targets: straight-up winner, ATS cover, division winner, win totals. The PCA on box-score stats found the betting line had a high coefficient in almost every analysis — ranked above other box-score stats (used to argue line value as an ML feature).

## 6. Validation design
Retrospective (in-sample) throughout — the authors state the division-winner exercise "is essentially a retrospective analysis and does not in isolation lend itself to being a good predictor." No out-of-sample or walk-forward test; 1,000 season simulations are Monte Carlo over fitted probabilities, not a holdout. Historical comparison windows (1973–1979, 1981–1996) used to show bias decay.

## 7. Numerical results / baselines
- **LD distribution:** mean −0.009, sd 13.588 (n=2,560); consistent with 1981–84 (0.07, 13.86), 1980–85, 1992–2001. Chi-squared: not statistically different from Gaussian.
- **Win-prob calibration:** p=1: model 0.529 vs. actual 0.509; p=3: 0.587 vs. 0.581; p=5: 0.644 vs. 0.597; p=7: 0.697 vs. 0.689.
- **Division winners:** 7/8, 7/8, 6/8, 8/8, 6/8, 7/8, 7/8, 7/8, 6/8, 6/8 (2002–2011) — ≥75% every season (retrospective, ties counted favorably).
- **Home teams:** 57% SU (2002–2011); ATS 48.9% (2002–2011), z = −1.907 vs. 0.5, z = −5.977 vs. 0.5238; 49.9% ATS (1981–1996). Home favorites 816–888 (47.9%), z = −4.002 vs. 0.5238.
- **Home underdogs:** abstract claims 53.5% ATS 2002–2011 (above 52.38% break-even); Table 1 raw: 409–396 = 50.8%. (Discrepancy noted: the 53.5% figure matches the table's pick-em row, 15–13. Reported as stated.) Historical: 58.1% (1973–1979), 52.5% (1981–1996) — diminishing bias.
- **Line movement:** >2,000 of 2,560 games moved ≤1 point; 1,548 moved ≤0.5; only ~20% moved >1 point; ~10% ≥2 points. Opening vs. closing MSE: no statistically significant difference. Movement peaks in Week 1 (uncertainty) and Week 17 (rest/playoff motivation).
- **Favorites ATS:** 1,194 covered, 412 won SU but didn't cover, 853 lost outright, 101 pushes; favorite ATS loss rate 51.5%.

## 8. Code / data availability
None stated. Data from public box scores + The Gold Sheet lines (2011-era URLs; nflpickles.com, goldsheet.com).

## 9. Leakage & limitations
- Fully retrospective: division-winner "≥75%" uses full-season lines and counts ties favorably — not a prediction result.
- The 53.5% home-underdog claim conflicts with the paper's own Table 1 (50.8%); treat the strategy edge as unproven on the stated numbers, and the bias is documented as decaying across decades (58.1% → 52.5% → ~51%).
- 2002–2011 window is 15+ years stale; market efficiency has likely compressed any residual edge (the paper itself shows the bias shrinking).
- No vig-aware or multi-book analysis; single line source (Gold Sheet); line-shopping effects unmodeled.
- Assumes game independence; ignores correlated season outcomes and the tie-breaking rules' effect on the win-total targets.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md` (line 47), GSE already has de-vigged consensus, market-implied ratings, and line-movement/steam lanes; the map's gap list (line 143) cites this very paper (1211.4000) as one of only two existing microstructure-in-sports-betting entries — meaning the corpus knows it but hasn't *operationalized* its parameters. This is an **extension**: the σ=13.588 normal map and the LD-distribution parameters are concrete numbers GSE can drop into its simulation and calibration code, and the line-movement distribution (80% of games move ≤1 point) is a usable prior for GSE's steam detector (moves >1.5 points are the tail worth flagging).

## 11. GSE implementation spec
1. **Spread→win-prob baseline:** implement Pr(win|spread p) = Φ(p/13.588) as GSE's closed-form baseline; A/B it against GSE's current conversion on 2015–2025 data (Brier score comparison).
2. **Season simulator:** replicate the paper's Monte Carlo (per-game Φ probs → C(16,k) sequence sums → 1,000 seasons) for GSE's win-total and division-odds products; compare against market win totals as a mispricing screen.
3. **Bias re-test:** re-run the home-underdog ATS strategy on 2012–2025 data at −110; if the edge persists above 52.38%, it's a live system input, if not, retire it — the paper's decay series (58.1% → 52.5% → 50.8%) predicts it's dead.
4. **Steam prior:** use the movement distribution (P(|move| > 1) ≈ 0.20, P(|move| ≥ 2) ≈ 0.10) as the null model for GSE's steam detector — only moves beyond the 90th percentile trigger the 1612 SCI classifier.
5. **Effort:** ~2 days: implement Φ map + simulator, run bias re-test on GSE's historical DB.

## 12. Reproducible test
Dataset: GSE's 2012–2025 NFL game/line DB. Metrics: (a) Brier score of Φ(p/13.588) vs. GSE's current spread-implied probability; (b) home-underdog ATS win rate 2012–2025 vs. 52.38%; (c) empirical P(|line move| > 1) vs. the paper's 0.20. Baseline to match: LD σ ≈ 13.6 on modern data. Pass if the Φ map is within 0.002 Brier of GSE's current conversion (validating it as a cheap baseline) and the movement null still holds.

## 13. Acceptance / rejection gate
**Adapt** the Φ(p/13.588) map as GSE's canonical closed-form spread→probability baseline if its 2012–2025 Brier score is within 0.002 of GSE's existing conversion — it costs nothing to keep a validated analytic baseline. **Reject** the home-underdog strategy as a live bet unless 2012–2025 ATS ≥ 52.38% with p < 0.05; on the paper's own decay trajectory the expectation is rejection, in which case the bias series becomes a "dead edges" exhibit for GSE content, not a system.

## 14. Improvement experiment
The paper's σ=13.588 is pooled across all spreads and eras. GSE's improvement: fit σ(p, era, total) — the LD distribution's variance is known to depend on the spread level (key numbers 3/7) and the total. Estimate a heteroskedastic normal (or empirical-CDF) win-prob map on 2012–2025 data and test whether spread-dependent σ beats the pooled 13.588 by ≥0.003 Brier. If yes, GSE gets a strictly better analytic baseline than both the paper and Stern (1991) — a small, permanent upgrade to every product that converts spreads to probabilities.
