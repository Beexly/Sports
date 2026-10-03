# [0043] Predicting Formula 1 Race Outcomes: Decomposing the Roles of Drivers and Constructors through Linear Modeling (arXiv:2508.00200)

**Citation:** Rane, S. (2025). *Predicting Formula 1 Race Outcomes: Decomposing the Roles of Drivers and Constructors through Linear Modeling*. arXiv:2508.00200 [stat.AP]. URL: https://arxiv.org/abs/2508.00200
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — the time-decayed RAPM + LOESS-smoothing decomposition is a transferable rating technique worth piloting on NFL player/team effect decomposition, even though the paper itself is F1-only.

## 1. Research question
Can the individual contributions of F1 drivers and constructors be separated and tracked over time at race-level granularity? The paper extends Regularized Adjusted Plus-Minus (RAPM, Sill 2010, from NBA/NHL analytics) to F1: a time-decayed ridge regression on driver/constructor indicators predicts race finishing rank, producing per-race driver and constructor ratings; partial Kendall's Tau then decomposes how much of outcome variance each component explains across the 2014–2024 Hybrid Engine Era.

## 2. Dataset / schema
- All F1 race results via the **Ergast API** and **Jolpica-F1** through the **f1dataR** R package; hybrid era 2014–2024 as the analysis window, with 2012–2013 results as a warm start.
- Primary model **excludes non-finishers (DNF)** to avoid noise (author's discretion); two variants tested: (a) DNFs included wholly; (b) DNFs partially attributed — Collision/Accident/Spun-Off → driver fault, all other causes → constructor fault.
- "Parent constructor" mapping merges renamed entities (e.g., Toro Rosso / Alpha Tauri / RB treated as one constructor; Appendix A4).
- Access: public APIs (Ergast, Jolpica); ratings + tabular data downloadable from the companion app https://saurabhr.com/f1-rapm/ (Appendix A1).

## 3. Method / model
1. **Response variable:** rank finish of each driver-constructor pair per race, with position weights (Eq. 1): ranks 1–10 weighted equally; positions beyond 10 linearly decayed to last place.
2. **Features:** sparse binary indicators for parent constructor and driver at the race level (no weather — "unpredictable before a race weekend"; circuit type considered but excluded "for simplicity").
3. **Model:** ridge (L2) regression — chosen over L1 so low-sample drivers/constructors keep shrunk coefficients rather than being dropped. Refit iteratively per race: e.g., to predict 2016 Monaco GP (round 6), train on all races 2012 → 2016 Spanish GP (round 5).
4. **Time decay:** exponential weights from season- and round-level decay, constants optimized against MAE via grid search: season decay factor **0.75**, round decay **0.075** (Appendix A2; Kendall Tau and nDCG used as guardrails). Total weight = rank-position weight × time-decay weight (Eq. 4).
5. **Coefficient smoothing:** blended average of the model-derived coefficient and a LOESS-predicted coefficient for the next race (LOESS per Jacoby 2000), with the LOESS weight a capped function of sample count (cap 0.7), parameterized separately for drivers and constructors (Eq. 5 — exact formula garbled in PDF extraction; the cap at 0.7 and the n^0.3/40 form are readable).
6. **Uncertainty:** bootstrap R = 50 per ridge fit; 95% CI assuming normal coefficient distribution across replicates — with an explicit caveat that penalized coefficients can be non-normal (Croiseau 2009) and variance is understated for shrunk low-sample coefficients.
7. **Testing:** wholly predictive out-of-sample — model fit through race r predicts race r+1; Kendall's Tau at race level averaged across races. Partial Kendall's Tau for constructors and drivers (Eq. 7), then proportional variance shares (Eq. 8). Secondary: ridge **logistic** models for binary sportsbook benchmarks — Top 3, Top 6, Top 10 (points) — evaluated with **McFadden's pseudo-R²** (Eq. 9) and variance shares (Eq. 10); extended to Top-N for N = 3..18.

## 4. Equations & assumptions
- Eq. (1): rank-finish position weights — ranks ≤ 10 weighted equally; ranks > 10 linearly decayed. (Exact functional form partially garbled in PDF extraction; stated qualitatively in §2.)
- Eq. (2): ridge regression Xβ = y with sparse driver/constructor indicator matrix X, coefficient vector β, response y = rank finish.
- Eq. (3): exponential time-decay weights from season decay (0.75) and round decay (0.075). (Exact form garbled in extraction; stated as weight = decay^(seasons ago) × decay^(rounds ago)-type product.)
- Eq. (4): weight_overall = weight_rank-finish × weight_time-decay.
- Eq. (5): blended coefficient = w × raw_model_coeff + (1 − w) × LOESS_coeff, with LOESS weight min(n^0.3/40, 0.7), parameterized separately for drivers/constructors. (**Flag:** exact subscripting garbled in PDF extraction; formula should be verified against the source PDF before implementation.)
- Eq. (6): Kendall's Tau = (Concordant pairs − Discordant pairs) / C(n_drivers, 2), averaged across races.
- Eq. (7): partial Kendall's Tau for constructors (and analogously drivers) — standard partial-correlation form adjusting τ(y, constructor-only preds) for τ(constructor-only, driver-only preds).
- Eq. (8): proportional variance share = partial-τ_component / Σ partial-τ.
- Eq. (9): McFadden's R² = 1 − LL(full)/LL(null); partial pseudo-R² variants for constructors-only and drivers-only.
- Eq. (10): variance share from pseudo-R² ratios.
- Assumptions (stated): weather excluded as unpredictable; circuit type excluded for simplicity; DNFs excluded in the primary model (noise); parent-constructor identity across name changes; driver and constructor coefficients independent when combining CIs; LOESS smoothing reduces noise without biasing point-in-time ratings.

## 5. Features / target
- **Features:** binary one-hot indicators for parent constructor and driver (race-level).
- **Target (linear model):** weighted rank finish. **Targets (logistic):** binary Top-3 / Top-6 / Top-10 finishes (sportsbook benchmarks).
- **Prediction horizon:** the immediate next race (fully out-of-sample, forward-facing).

## 6. Validation design
- Out-of-sample, forward-facing: model through race r predicts race r+1; 2014–2024 test window, 2012–2013 warm start. **Time-ordered splits — no lookahead.**
- Metrics: Kendall's Tau (primary, chosen over Spearman for outlier robustness), MAE (hyperparameter selection), McFadden's pseudo-R² (logistic), nDCG (guardrail).
- Variants compared: DNF-excluded vs DNF-inclusive vs partial-attribution; position-weighting on/off (Table 3: "no significant performance difference").
- Literature benchmarks: Kesteren (2023) 88% constructor variance (2014–2021, Bayesian season-level); Bell (2016) 86% (1979–2014, DNF-inclusive multilevel).

## 7. Numerical results / baselines
Quoted exactly as in the paper:
- DNF-excluded model: constructors explain **64.0%** of variance in race outcomes in the Hybrid Era; overall Kendall's coefficient **0.625** (§5.1).
- Same-model 2014–2021 cohort: implied constructor influence **70.1%** (vs Kesteren's 88% — "only a small portion of the difference is explained through a difference in model data"; attributed mainly to race- vs season-level granularity).
- DNF-inclusive model: **76.1%** constructor variance (vs Bell's 86% over 1979–2014; difference attributed to Bell's longer window capturing reliability rather than pace).
- Qualifying model: constructor importance **47.0%** (drivers relatively more important in qualifying).
- Logistic Top-N: constructor influence rises with N; McFadden's R² **dips below 0.0 for all N greater than 10**; model performance peaks at **N = 5**; no significant decline in partial R² for N < 7.
- Case studies: Verstappen's 2017–2020 driver coefficient exceeds Bottas's and matches Hamilton's despite fewer points ("Bottas' performance was inflated by the strength of the Mercedes"); the author notes Bottas's "steep drop off after leaving Mercedes for Sauber seems unlikely. The model may not be fully separating constructor and driver performance."
- Driver-seasons after team switches are less predictable than same-team seasons (Appendix A3); new drivers paradoxically show lower error (attributed to backmarker/midfield feeder-team assignment).

## 8. Code / data availability
- Ratings + tabular data: https://saurabhr.com/f1-rapm/ (Appendix A1). No code repository stated (data source: f1dataR R package, public Ergast/Jolpica APIs).

## 9. Leakage & limitations
- Forward-facing design is clean (no lookahead), but the LOESS smoothing blends *future-predicted* coefficients into ratings used for interpretation — fine for ratings, and predictions use only past data.
- Driver/constructor separation is only identified by teammate comparisons and team switches; the author admits incomplete separation (Bottas-Sauber case).
- Bootstrap CIs understate uncertainty for shrunk coefficients (author's own caveat).
- DNF attribution (Collision → driver, mechanical → constructor) is "based on the author's discretion."
- Weather and circuit type omitted; new 2026 regulations will likely degrade the model (author notes classification-percentage drop at regulation changes).
- F1-specific; no NFL content. McFadden R² < 0 for N > 10 signals the logistic formulation breaks down for wide cohorts.

## 10. GSE overlap
- **GSE map status:** rating systems inventoried include Elo, Glicko, TrueSkill, Bradley-Terry, Plackett-Luce, Dixon-Coles, Massey/Sagarin/Colley, nfelo — but **RAPM-style regularized decomposition of composite effects is not in the map**, and the 15-area ML brief's "hierarchical pooling" area is still results-pending. The partial-Tau variance-decomposition (driver vs car) is also novel to the corpus.
- Overlap assessment: **extension.** The natural GSE analogue: decompose team-level EPA into coach/scheme vs personnel components, or decompose QB EPA into QB vs supporting-cast (OL/WR) effects using the same time-decayed ridge + LOESS pattern — an idea adjacent to GSE's unit-matchup work (gse-lab) but not currently implemented.

## 11. GSE implementation spec
- Data: nflverse play-by-play 2020–2025 (public), QB/OL/WR snap-level indicators as sparse features, EPA/play or success as response.
- Model: ridge regression of EPA/play on team/coach-unit/player indicators with exponential time decay (tune season/game decay by MAE on held-out games, same as paper's Appendix A2), then LOESS-smooth coefficient paths for ratings; partial-Tau decomposition of variance into scheme vs personnel shares.
- Validation: forward-facing week-by-week refit, predict next week's EPA/play; compare vs GSE engine baseline.
- Effort: ~1–2 engineer-days for a pilot on one season of nflverse data; serving = weekly batch ratings. Low cost, moderate upside.

## 12. Reproducible test
Dataset: nflverse pbp 2022–2024. Response: dropback EPA/play. Features: one-hot QB + one-hot offensive line unit + one-hot play-caller. Ridge with game-level exponential decay (tune 0.85–0.99 by MAE), forward-week validation. Baseline to beat: naive team-average EPA carry-forward on MAE for next-week EPA/play; gate = beat baseline by ≥ 5% MAE reduction on 2024 holdout.

## 13. Acceptance / rejection gate
Adopt the decomposition technique if the ridge+LOESS pilot beats the team-average carry-forward baseline by ≥5% MAE on 2024 holdout weeks AND the variance-share decomposition is stable across two seasons (constructor-analogue share within ±10 pp). Otherwise reject as F1-specific machinery.

## 14. Improvement experiment
Replace ridge with a hierarchical Bayesian partial-pooling model (QB nested in scheme nested in team) — directly answering the paper's acknowledged incomplete separation problem — and test whether posterior shrinkage gives more stable inter-unit player comparisons than ridge + LOESS. This connects to the ML brief's commissioned hierarchical-pooling area.

**Flags:** Eq. (1), (3), (5) exact functional forms partially garbled in PDF text extraction — verify against the source PDF before implementing; all headline numbers (64.0%, 70.1%, 76.1%, 47.0%, τ = 0.625) are stated unambiguously in text.
