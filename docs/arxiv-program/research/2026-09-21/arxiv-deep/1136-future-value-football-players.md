# [1136] What Should Clubs Monitor to Predict Future Value of Football Players (arXiv:2212.11041)

**Citation:** Baouan, A., Bismuth, E., Bohbot, A., Coustou, S., Lacome, M., & Rosenbaum, M. (2022). *What should clubs monitor to predict future value of football players*. arXiv:2212.11041v1. URL: https://arxiv.org/abs/2212.11041
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, §§1–6 + annex tables; annex feature lists partially extracted).
**Verdict:** ADAPT — the per-position Lasso/RF recipe with log-value targets, per-unit-time normalization, and a league-average-value anchor (20% of explained variance) is a clean, portable template for GSE's own future-value projections (dynasty fantasy, award futures, contract-value models); the soccer specifics don't transfer, the methodology does.

## 1. Research question
Which performance statistics and player characteristics predict a footballer's TransferMarkt market value two years ahead, separately by position — and can the resulting model rank young talent (Golden Boy 2022 nominees) better than current market value does?

## 2. Dataset / schema
- Wyscout: 111 in-game statistics; 2,646,549 player-games; 36,882 players; 45 leagues (first divisions of 37 countries + lower divisions); 2015–March 2022.
- TransferMarkt: 415,890 recorded values for 33,439 players (2000–2022); second dataset with 21,898 players × 26 identity features.
- Intersection: 12,133 players. Prediction window: performance aggregated over [1460, 730] days before the value date → predict value at the value date (2-year horizon). Young-player application: 951 players with under-21 data, 1-year horizon, first-division games only.
- Wyscout/TransferMarkt are commercial/scraped — not freely replicable.

## 3. Method / model
- Per-position models (8 positions: GK, FB, CD, CDM, MD, AM, WG, FWD; sample sizes 1,227–4,112 per Table 1b).
- Lasso regression (λ set 0.004–0.01 to retain 10–15 features; λ chosen by 5-fold CV then raised for sparsity) and Random Forest (100 trees, max depth 6, grid-searched).
- Target: log market value (values span orders of magnitude; log target lies in [0,20]).
- Feature engineering: stats summed over the window and divided by total minutes (per-unit-time); ratio features (successful/attempted); squares of age, height, goals/min, assists/min, shots/min; league average value (log, demeaned); top-20-youth-academy boolean.
- Two regressions per position: with and without league-average-value as a feature.

## 4. Equations & assumptions
- Lasso: standard L1-penalized least squares, (α̂,β̂) = argmin Σ(yᵢ − α − Σβⱼxᵢⱼ)² + λΣ|βⱼ| (Lagrangian form stated).
- RF prediction: ŷ_RF = (1/n_trees) Σ ŷ_tree_k (Eq. 1); CART split by variance-impurity minimization (Algorithm 1); node importance = w_n·V_n − Σ w_child·V_child; feature importance aggregated over trees.
- CV R² = 1 − MSE_cv / VAR(y).
- Normalization: x_ij = (x_ij − x̄_j)/max(x_j).
- Assumptions: TransferMarkt value ≈ in-game quality (popularity treated as noise); log-normal value distribution; position-specific models justified by differing value scales (Table 1a: avg value GK $1.67M … AM $4.06M).

## 5. Features / target
Inputs: 111 per-unit-time Wyscout stats + engineered ratios/squares + age, height, minutes, league avg value, top-20 academy flag, position (one-hot in the young-player model). Target: log TransferMarkt value 2 years after the performance window (1 year for the young-player model).

## 6. Validation design
- 5-fold CV per position; metrics MSE and CV-R². Not time-ordered splits (a limitation — see §9), but the [1460,730]-day window design prevents direct label leakage.
- Young-player model validated by ranking 60 Golden Boy 2022 nominees vs the jury's top 10.

## 7. Numerical results / baselines
- With league-average-value feature — Lasso CV-R²: GK 48.5%, FB 55.4%, CD 57.7%, CDM 60.0%, CM 61.5%, AM 55.9%, WG 57.4%, FWD 58.0%. RF CV-R²: 53.8%, 54.1%, 58.1%, 61.2%, 61.5%, 52.8%, 54.3%, 57.4%. (Lasso and RF perform similarly — the paper's honest headline.)
- Without league-average-value: R² drops to ~35–44% for both methods (Table 3) — league anchor contributes roughly 20 points of R².
- Top features everywhere: league_avg_value, total_minutes_on_field, age (age_sq negative); is_top20 academy flag helps modestly. Position-specific notables: long-pass volume has *negative* coefficient for CBs/DMs (modern build-up preference); goals scored not selected for forwards (collinear with touches-in-box/linkup features).
- Golden Boy: predicted top-13 included 9 of the jury's top-10 (Pedri predicted #2 but ineligible as prior winner); Kendall correlation predicted-vs-jury 0.38 vs present-value-vs-jury 0.24 — the model beats the current market at matching expert judgment.

## 8. Code / data availability
None stated (Wyscout commercial, TransferMarkt scraped).

## 9. Leakage & limitations
- CV folds are not time-ordered; players from the same era/club can sit on both sides. The window design ([1460,730] days before value) prevents direct leakage but not era effects.
- λ was deliberately raised to force 10–15 features ("arbitrarily set") — the sparsity is aesthetic, and feature selection by CV-then-manual-λ is a form of researcher degrees of freedom.
- TransferMarkt values are crowd-influenced; treating popularity as noise is an assumption, and the jury-correlation result partly validates it — but only for young players.
- Age effect: with large λ only age_sq survives (monotone decline); the bell-shaped prime curve needs small λ (Figure 6) — the headline models may misprice veterans' aging curves.
- Soccer-specific features; the 2-year horizon is long for betting/fantasy use.

## 10. GSE overlap
Methodology extension. The existing-research map's market-value work is thin (this paper's family is the gap the map's "market microstructure" section notes for non-NFL sports); GSE's repo has no future-value projection models (dynasty fantasy, award futures like MVP/OROY). The per-position modeling discipline, log targets, and league-anchor feature map directly onto NFL: per-position models (QB/RB/WR/TE), log salary/value targets, team-quality anchor.

## 11. GSE implementation spec
- Build NFL future-value models: per-position Lasso + RF predicting log(DK salary or projected fantasy points) N weeks ahead from per-snap/per-route normalized nflverse + FTN charting stats, with team-strength anchor (e.g., log team implied total or PFF unit grade) as the league_avg_value analogue.
- Validation: rolling-origin time splits (fixing the paper's non-temporal CV), 5-fold within each origin.
- Application: dynasty trade value charts, season-long award futures (OROY odds vs model), "buy-low" flags where model value ≫ market salary.
- Effort: 1 week for the per-position pipeline on one horizon (rest-of-season value).

## 12. Reproducible test
Dataset: nflverse 2021–2025 + DK salaries. Metric: out-of-sample R² of log rest-of-season fantasy value per position, rolling-origin. Baselines: (a) current-salary naive (value = today's salary), (b) pooled (non-position) model. Gate: per-position models must beat the pooled model by ≥3 points of R² on ≥3 of 4 skill positions AND beat the naive baseline — otherwise keep it simple.

## 13. Acceptance / rejection gate
ADAPT the recipe if: per-position log-value models beat pooled + naive baselines on the §12 gate with time-ordered validation. REJECT any claim that TransferMarkt-style crowd values are the right target for GSE — use realized fantasy points/salaries, not crowd valuations.

## 14. Improvement experiment
Add the aging curve properly: fit age as a spline (not just age + age²) within each position model and test whether the spline beats the paper's quadratic on veteran (age 29+) out-of-sample R². Hypothesis: the spline captures the late-career cliff the quadratic smooths over, improving value projections for older players — the segment where fantasy markets misprice most.
