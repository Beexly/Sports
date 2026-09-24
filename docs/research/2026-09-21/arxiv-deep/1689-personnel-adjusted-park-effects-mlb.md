# 1689 Personnel-adjustment for home run park effects in Major League Baseball (arXiv:2506.22350)

**Citation:** Jason A. Osborne, Richard A. Levine (2025). *Personnel-adjustment for home run park effects in Major League Baseball*. arXiv:2506.22350. URL: https://arxiv.org/abs/2506.22350
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections through division effects + references).
**Verdict:** ADAPT — the "elsewhere" leave-one-park-out personnel covariate is a clean, portable trick for separating venue effects from personnel quality; directly applicable to NFL stadium/weather adjustments in GSE's totals and kicking models.

## 1. Research question

How HR-friendly is each MLB ballpark once you adjust for *who* played there? Raw park HR rankings confound park geometry with personnel quality (rich teams sign sluggers; handedness-matchup frequencies vary by park — e.g., 51.4% of Cleveland PAs are by LHB vs 41.9% league-wide). The paper builds personnel-adjusted park factors via a Poisson GLMM with "elsewhere" (leave-one-park-out) measures of batter/pitcher HR propensity.

## 2. Method / model

- **Unit:** game × handedness-matchup (LL, LR, RL, RR) — N = 123,886 observations over 2,451,105 PAs, 2010–2023 (excl. 2020).
- **Model:** Poisson GLMM, log link: log λi = β0 + β^B·Zi^B + β^P·Zi^P + Σ_s Ss·Xi,s^S + Σ_p (βp^LL·Xi^LHB·Xi^LHP + βp^LR·Xi^LHB·Xi^RHP + βp^RL·Xi^RHB·Xi^LHP + βp^RR·Xi^RHB·Xi^RHP)·Xi^p. 120 park-by-matchup parameters of interest; season random effects Ss ~ N(0, σS²); two personnel covariates.
- **"Elsewhere" personnel covariates:** for each PA, batter quality q^B = HR rate in all *other* parks (e.g., Trevor Story: 25/562 = 0.044 vs LHP away from Coors); pitcher quality q^P likewise (e.g., Kershaw: 150/7105 = 0.021 vs RHB away from Coors); aggregated per game-matchup as Zi^B = Σq^B, Zi^P = Σq^P. This breaks the circularity of measuring player quality with the same data used to rate parks.
- **Fit check:** fitted λ̂ rounded to 0.2 bins vs Poisson distribution of observed HR counts (e.g., N=3,132 obs with λ̂≈1.4).
- **Variance decomposition:** residual variance s² and AIC across nested models (full / park-only / personnel-only / batter-only / pitcher-only).

## 3. Mathematics / equations / assumptions

- Yi ~ Poisson(λi), i = 1…123,886; log λi as above.
- Elsewhere measures: q^B = HR/other-park PAs (matchup-specific); Zi^B = Σ_{PA∈i} q^B.
- Adjusted park means: E[HR | park p, matchup m, Zi^B = z̄^B, Zi^P = z̄^P] — evaluated at average personnel.
- Assumptions: Poisson counts (validated by binning); season effects additive and normal; elsewhere measures are valid proxies (acknowledged imperfect — still influenced by player's home park); matchup frequencies treated as given.

## 4. Dataset / schema

- **Source:** Retrosheet play-by-play, MLB 2010–2023 excluding 2020 (13 seasons); Marlins' Joe Robbie Stadium 2010–11 excluded; 87% of games have all four matchups.
- **Matchup PA shares:** LHB 41.9% (LHP 7.9%, RHP 34.0%); RHB 58.1%. HR/PA ≈ 0.029 overall (LL 0.022, LR 0.029, RL 0.031, RR 0.029).
- **Schema per row:** game id, park, matchup (bh×ph), hrsum, zB, zP, pa count, season.
- **Access:** public (Retrosheet).

## 5. Features / target

- **Features:** park × matchup indicators (120), elsewhere batter/pitcher HR propensities (Zi^B, Zi^P), season random effect.
- **Target:** HR count per game-matchup.

## 6. Validation design

- **Fit validation:** binned Poisson goodness-of-fit on fitted values.
- **Model comparison:** nested GLMMs by residual variance s² and AIC.
- **Result validation:** rank-stability of adjusted vs unadjusted park rankings; variance-explained decomposition.

## 7. Exact results and baselines (numbers)

- **Adjusted rankings differ substantially from raw:** Cleveland Progressive Field LR: observed 1.025 HR/g (rank 1) → adjusted 0.657 (rank 15, median); Minnesota Target Field LR: observed 0.771 (rank 11) → adjusted rank 24; White Sox Rate Field LR: 0.722 (rank 18) → 0.767 (rank 7). Toronto Rogers Centre RR: 1.179 (rank 1) → 0.776 (rank 12). Phillies/Milwaukee/Cincinnati RL move from ranks 20/15/21 to 5/3/2 after adjustment.
- **LL matchup:** least affected — biggest rank change is just Kansas City ↔ Detroit swapping (PNC Park 0.092 HR/g least friendly; Globe Life 0.233 most).
- **Variance:** full model s² = 2.42 (AIC 220,189); park-only s² = 2.50; personnel-only s² = 2.58; batter-only 2.60; pitcher-only 4.07 — batter personnel matters more than pitcher; park effects add modestly beyond personnel.
- **League context:** HR intensity ranged 1.72 HR/g (2014) to 2.78 HR/g (2019), +62%.

## 8. Code / data availability

Data: Retrosheet (public). Code: **none stated**.

## 9. Leakage and limitations

- **Elsewhere measures still contaminated:** a player's "elsewhere" rate is dominated by his home park (e.g., Kershaw's q^P reflects Dodger Stadium) — acknowledged but uncorrected.
- **Poisson assumption** for aggregated game-matchup counts; overdispersion not modeled (negative binomial not tried).
- **Matchup frequencies treated as exogenous** — but lineup construction responds to park (e.g., teams stack LHB in Yankee Stadium), creating a subtle selection effect.
- **No uncertainty on ranks:** adjusted means reported without CIs; rank changes of a few places may be noise.
- **2020 excluded, 2023 balanced schedule** changes division-personnel confounding (Section 3.4, truncated in read).

## 10. GSE overlap

GSE's totals model uses weather and stadium dummies, but likely without the elsewhere-style personnel separation — raw stadium scoring averages confound venue with *who plays there* (e.g., dome teams built for turf speed; Denver's altitude with its roster construction). No existing GSE doc implements leave-one-venue-out personnel covariates.

## 11. GSE implementation spec

- **Target:** personnel-adjusted NFL stadium effects for totals and kicking — separate "Denver altitude" from "the Broncos' roster."
- **Data:** nflverse pbp 2010–2024; unit = game × (dome/outdoor × turf/grass × altitude band).
- **Model:** Poisson/negative-binomial GLMM on points (or FG makes) per game: elsewhere QB/offense quality (points/drive in other stadiums) + elsewhere defensive quality + stadium × surface effects + season random effects.
- **Serving:** adjusted stadium factors feed GSE's totals model and kicker props (FG distance adjustments by true venue effect).
- **Effort:** 1–2 weeks.

## 12. Reproducible test

- **Dataset:** nflverse pbp 2015–2024; game-level points scored, stadium, surface, weather.
- **Metric:** out-of-sample (2023–2024) log-likelihood / RMSE of game totals for (a) raw stadium averages vs (b) elsewhere-adjusted stadium effects.
- **Baseline to beat:** the raw venue mean; the adjusted model passes if it reduces OOS RMSE on totals by ≥ 0.3 points vs raw venue means AND the top-5 most-adjusted stadiums (largest |raw − adjusted|) show rank changes ≥ 5 places (demonstrating the adjustment bites where it matters).
- **Window:** train 2015–2022, test 2023–2024.

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT the elsewhere-covariate method if OOS totals RMSE improves ≥ 0.3 points over raw venue means and ≥ 3 stadiums move ≥ 5 rank places between raw and adjusted scoring-friendliness. REJECT if no OOS gain (personnel separation adds nothing in football, e.g., because schedule rotation already balances personnel across venues).
- **Improvement experiment:** the paper's elsewhere measure is home-park-contaminated — fix with an **iterative backfitting**: alternately estimate park effects and personnel quality until convergence (like a two-way fixed-effects decomposition), which purges the home-park contamination the authors acknowledge. Second: extend to **kicker-specific venue effects** (wind/altitude × kicker leg strength interaction) for FG props — a matchup-specific analogue of the paper's 120 park-by-matchup parameters.

**Verdict:** ADAPT — the leave-one-venue-out "elsewhere" personnel covariate is a portable, implementable upgrade to GSE's stadium/weather adjustments.
