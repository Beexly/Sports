# [0656] Predictive Modeling of Lower-Level English Club Soccer Using Crowd-Sourced Player Valuations (arXiv:2411.09085)

**Citation:** Josh Brown, Yutong Bu, Zachary Cheesman, Benjamin Orman, Iris Horng, Samuel Thomas, Amanda Harsy, Adam Schultze (2024). *Predictive Modeling of Lower-Level English Club Soccer Using Crowd-Sourced Player Valuations*. arXiv:2411.09085v1 (stat.AP). URL: https://arxiv.org/abs/2411.09085
**Ledger completed:** 2026-09-21. **Read:** full text (recovered canonical PDF: `https://arxiv.org/pdf/2411.09085`).
**Verdict:** ADAPT — the core transferable idea is a market-valuation-weighted Massey rating: final rating = least-squares rating + market-prior term (r = r̂ + r_TM). For NFL, replace Transfermarkt with salary-cap / contract data (or DFS salaries) as the market prior — a roster-value-aware rating GSE doesn't currently have. Also a valuable calibration caution: apparent predictability gaps across leagues are explained by team-disparity, not model skill — relevant when GSE evaluates itself across divisions/conferences. Fresh-search replacement for `2505.21275v1` (REJECT). Search terms: "arXiv Massey Colley sports ranking method predictive paper" / "arXiv paper rating teams pairwise comparison log-linear sports forecasting accuracy comparison".

## 1. Research question
Can classical linear-algebra ranking methods (Colley, Massey), weighted by match time and crowd-sourced Transfermarkt player valuations, predict outcomes across all four tiers of English soccer — and is Transfermarkt's predictive power really "wisdom of the crowd"?

## 2. Dataset / schema
- English Premier League, Championship, League One, League Two, 2010–2024: 204 unique teams, 47,198 games. Standings (ESPN), match data (Football-Data.co.uk), lineup market valuations (Transfermarkt).
- Extension: top 2 German + top 4 Scottish leagues. Scottish League One/Two excluded from Transfermarkt analysis (no valuations).
- Draws: 24% (PL) to 27% (League One) of matches.

## 3. Method / model
- Time-weighted Colley: W_k = exp((t_k − t_0)/(t_f − t_0)); weighted wins/totals w*_i, t*_i; (2 + t*_i) r*_i = 1 + (w*_i − l*_i)/2 + S* (Eq. 11–14). Draws discounted (no merit) — improved predictions vs awarding half-wins.
- Transfermarkt-weighted Massey: weighted least squares X^T W X r* = X^T W y (Eq. 16); home advantage as extra parameter y_k = r_i − r_j + r_h x_k (Eq. 17); then final rating r = r̂ + r_TM — equal-weighted sum of the WLS solution and Box-Cox-transformed, [0,1]-standardized average Transfermarkt value (Eq. 5–6 show Massey rating = avg point spread + avg opponent rating).
- Transfermarkt regression: ordered probit y*_ijg = (h_ig − h_jg)β_h + (TM_ig − TM_jg)β_TM + ε (Eq. 10), TM = log lineup market value.
- Baselines: Null (home-only ordered probit, Eq. 9), Betting Odds (devigged implied probabilities).

## 4. Equations & assumptions
- Massey: r_i − r_j = y_k (margin of victory); Mr = p; r_i = p_i/G_i + Σ_j (g_ij r_j)/G_i. (Eq. 4–6)
- Colley: r_i = (w_i + 1)/(t_i + 2); (2 + t_i) r_i = 1 + (w_i − l_i)/2 + S. (Eq. 1–3)
- W_k = exp((t_k − t_0)/(t_f − t_0)) (time weights). (Eq. 11, 15)
- Kendall's τ = (n_c − n_d)/(n_c + n_d) for ranking; Brier B = (p_w−w)² + (p_d−d)² + (p_l−l)² for outcomes. (Eq. 8)
- Assumptions: equal weights on r̂ and r_TM (ad hoc); home advantage universal per league; draws carry no information in Colley; market values exogenous.

## 5. Features / target
- Target: end-of-season rank (Kendall's τ) and match outcome (Brier).
- Inputs: historical margins (Massey), W/L (Colley), match dates, venue, Transfermarkt lineup values.

## 6. Validation design
- Ranking: predict season-Y standings from all data before season Y (2011-12 → 2023-24).
- Outcomes: train on first 80% of season games, predict final 20% (in-season); larger-training out-of-season variant. Pairwise t-tests by game between models.

## 7. Numerical results / baselines
- End-of-season Kendall's τ: T.M.-weighted Massey best everywhere — PL 0.5887, Championship 0.2737, League One 0.2881, League Two 0.1655 (vs unweighted Massey 0.5498/0.2118/0.2426/0.1061; Colley lower).
- In-season Brier (PL): Betting Odds 0.1842 < T.M.-weighted Massey 0.1888 = T.M. Regression 0.1888 < Massey 0.1912 < Colley 0.1945 < Null 0.2121. Same ordering in all leagues; weighted > unweighted; Massey > Colley.
- Pairwise t-tests: T.M. Massey − Massey = −0.0024 (PL, significant); Betting Odds − T.M. Reg = −0.0044 to −0.0065 (odds still best).
- Key substantive finding: the PL-vs-lower-league predictability gap DISAPPEARS after removing dominant teams (Big Six / Bayern / Old Firm) — gap is team disparity, not forecasting skill. Same pattern in Germany/Scotland.
- Wisdom-of-crowd test FAILS: Transfermarkt values with no user discussion (lower leagues, moderator-set) predict just as well relative to odds as heavily-discussed ones — predictive power comes from values tracking salaries/contracts, not crowd wisdom.

## 8. Code / data availability
Code on GitHub: Summer-ICERM-2024-Pyramid-Schemers (per reference [8]). Data: ESPN, Football-Data.co.uk, Transfermarkt (scraped).

## 9. Leakage & limitations
- Equal weighting of r̂ and r_TM is arbitrary — authors flag weight optimization as future work.
- Draws discarded in Colley (soccer-specific; irrelevant for NFL).
- Transfermarkt values are partly endogenous (reflect past performance); authors only claim prediction, not causation.
- Lower-league valuations are moderator-set, sparse; Scottish L1/L2 unusable.
- Removing dominant teams to test disparity is crude (acknowledged).

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus has Massey/Colley-style least-squares ratings and Elo, but no market-valuation-weighted rating (salary/market prior added to a least-squares rating) and no disparity-vs-skill calibration analysis for cross-division evaluation. Extension, not duplicate.

## 11. GSE implementation spec
- Build a salary-weighted Massey for NFL: (a) compute time-weighted least-squares ratings from nflverse margins (WLS with exponential recency weights, home term as in Eq. 17); (b) build the market prior r_TM from roster salary data — active-roster cap dollars or positional salary z-scores (OverTheCap / Spotrac), Box-Cox transformed and standardized per season exactly as the paper does; (c) final rating r = λ r̂ + (1−λ) r_TM with λ OPTIMIZED on walk-forward log-loss (the paper's flagged improvement — do it first, don't copy their 0.5).
- Use cases: early-season ratings (salary prior dominates when games < 4), roster-turnover teams (free-agency spending as an instant prior — compare vs the player-kernel approach in ledger 0653), and a cross-check against GSE's existing power ratings.
- Adopt the disparity audit: when comparing GSE's accuracy across divisions/conferences (or NFL vs CFB), first residualize team-strength disparity (remove or downweight games involving top-decile teams) — otherwise "the model is better at the AFC East" may just mean the AFC East has more blowouts.
- Effort: low-medium — WLS Massey is a linear solve; salary data assembly is the main cost.

## 12. Reproducible test
Dataset: nflverse 2015–2024 + OTC salary data. Test 1: walk-forward 2020–2024, train on weeks 1–8, predict weeks 9–18; compare salary-weighted Massey (λ tuned) vs plain time-weighted Massey vs GSE's current rating on ATS log-loss; gate = salary-weighted wins by ≥0.01 mean log-loss. Test 2 (early season): weeks 1–4 only; gate = the salary prior beats the no-prior rating by ≥0.03 (this is where the prior should bite). Test 3 (disparity audit): compute GSE's weekly accuracy by division with and without top-decile teams; report whether cross-division gaps survive — informational, no gate.

## 13. Acceptance / rejection gate
ADAPT if Test 1 or Test 2 passes — the salary-prior mechanism earns a role as an early-season/roster-turnover overlay. If λ optimizes to ~1 (prior adds nothing), REJECT the mechanism but keep the disparity-audit practice (Test 3) as a free calibration win. Do not copy the paper's 0.5 weight blindly.

## 14. Improvement experiment
Learn the combination: replace r = λr̂ + (1−λ)r_TM with a per-team adaptive weight λ_i = σ(a + b·(games played)_i + c·(roster turnover)_i) — the market prior should matter more for teams with few games played and high roster churn. Fit (a,b,c) on walk-forward log-loss and test whether adaptive weighting beats the global λ on the weeks-1–4 subset.
