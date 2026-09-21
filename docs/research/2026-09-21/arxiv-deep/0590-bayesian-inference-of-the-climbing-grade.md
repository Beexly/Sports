# [0590] Bayesian inference of the climbing grade scale (arXiv:2111.08140v1)

**Citation:** Drummond, A. & Popinga, A. (2021). *Bayesian inference of the climbing grade scale*. arXiv:2111.08140v1. URL: https://arxiv.org/abs/2111.08140v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 884 lines).
**Verdict:** ADAPT — adapt the Wiener-process dynamic ability model (Coulom "whole-history rating" in Stan) and the data-driven rating-scale calibration to GSE team strengths; the climbing domain itself has no NFL transfer.

## 1. Research question
What does one increment of a climbing grade actually mean, quantitatively? Building on the first statistically rigorous whole-history ascent method (Scarff 2020), the authors implement full Bayesian MCMC inference of a dynamic Bradley–Terry model — treating each climb as a "game" between a time-varying climber and a route — to estimate (a) each climber's grade trajectory over time and (b) the model's fundamental scale parameter m, which defines the proportional increase in difficulty per grade increment, across four grade systems (Ewbank, French, UIAA, Vermin) and three climbing styles.

## 2. Dataset / schema
20 datasets from thecrag.com (public online climbing logbook) across New Zealand, Australia, and Germany. Schema: 𝒟 = {(c_i, r_i, t_i, y_i)} — climber, route, date, binary outcome (y=1 clean success/"send", y=0 failed attempt including hangdog/attempt/retreat/working). Two highlighted analyses: Australia-Sport (n=100 climbers of differing abilities, whole-history self-reports, N=48,679 ascents, August 2016–July 2021, 60 monthly windows); New Zealand-Sport (n=89 climbers, same selection criteria). Climbers filtered to ≥30 attempts with ≥1 explicit failure. A second complementary analysis uses whole-community successful-ascent counts by grade (NZ + Australia, sport + bouldering, downloaded 20 July 2021, tick types redpoint/flash/onsight for sport, send/flash/onsight for bouldering). Selection criteria detailed in Supplementary Material. Data access: via theCrag API (programmatic); acknowledged access from thecrag.com operators.

## 3. Method / model
Dynamic Bradley–Terry ("whole-history rating", after Coulom 2008), recasting sport climbing as games between climbers and routes. Success probability: p_send = e^{mC(t)}/(e^{mC(t)} + e^{mR}) — a logistic function of the grade difference, i.e., logistic regression with one independent variable (climber grade minus route grade). Climber grade C(t) is defined as the grade at which the climber would have 50% probability of flashing a route of that grade (need not be whole; e.g., "29.4" on the numerical Ewbank scale). Time-varying ability via a Wiener process: C(t+1) ~ N(C(t), w²). Two data conventions: per-attempt games and per-session games ("session grade" — only the best result per climber per route per day retained; a session grade exceeds the flash grade because multiple attempts are allowed). Full Bayesian MCMC in Stan (code public at https://github.com/alexeid/climbing-grades), co-estimating m and every climber's monthly grade. Also fitted: per-climber log-linear regressions (no ability drift) as a crude comparator; and O'Neill-style log-linear fits of community ascent counts vs. grade.

## 4. Equations & assumptions
Success model (Eq. 1): Pr(y=1) = p_send = e^{mC(t)}/(e^{mC(t)} + e^{mR}), with C(t) climber grade, R route grade, m slope parameter.
Logistic form (Eqs. 2–3): p_send = 1/(e^{m(R−C(t))}+1) = logit^{−1}(mC(t) − mR), logit^{−1}(x) = 1/(1+e^{−x}). So log-odds of success is linear in the grade difference.
Wiener-process ability dynamics (Eq. 4): C(t+1) ~ N(C(t), w²).
Expected failures before redpoint (Eq. 5): E[a] = (1 − p_send)/p_send — the odds-ratio of failure; e.g., 9 fails per send implies p_send = 1/(E[a]+1) = 0.1.
Session-grade convention: outcome of a day's attempts = best result; the game is redefined from per-tie-in to per-day.
Assumptions stated: route grades are taken as known/correct (not co-estimated); per-attempt success probability is constant across attempts (no learning — the authors flag this as "the most questionable detail", since practice genuinely raises per-attempt probability, so the BT probability is only an "effective" average over practice levels); selection bias argued to shift intercept (climber grade overestimated by up to ~1 grade) but not the slope, with a worst-case slope flattening factor (k−1)/k ≈ 10% (interquartile range of grade span k = 8–10); selective under-logging of failures is the more serious bias (embarrassment on easy routes), inflating the slope estimate — corroborated by climbers known to log every attempt showing slopes slightly below 2.

## 5. Features / target
Features: grade difference C(t) − R (the single independent variable), plus the attempt/session timestamps feeding the Wiener drift. Targets: binary attempt outcome y ∈ {0,1} (per-attempt analysis) or per-day best outcome (session analysis); inferred latent targets are each climber's grade trajectory C(t) and the global slope parameter m (equivalently d = e^m, the proportional difficulty increase per grade).

## 6. Validation design
No train/test split or holdout prediction evaluation. Validation is convergent-estimation: (i) MCMC posterior for m vs. crude per-climber log-linear regression estimates; (ii) Australia vs. New Zealand datasets; (iii) per-attempt vs. session-aggregated data; (iv) whole-history Bayesian analysis vs. independent community-wide ascent-count log-linear fits; (v) comparison against known complete loggers (data not shown) as a bias check. All use in-sample fitting; "validation" is cross-dataset consistency of m̂.

## 7. Numerical results / baselines
- Australia-Sport (Ewbank, n=100, N=48,679): m̂ = 0.85 [0.83, 0.86], i.e., d = e^m = 2.33 [2.29, 2.37] times more failed attempts per success per grade increment. Per-climber no-drift log-linear mean: 0.65. Median explicit fails per climber: 126 (range 18–642), 29.9% of ascents (IQR 4.7%–72.0%). MCMC runtime: 1 hr 8 min on an iMac 3.6 GHz 8-core i9.
- New Zealand-Sport (n=89): m̂ = 0.80 [0.76, 0.84], i.e., 2.22 [2.13, 2.31]× per grade. No-drift log-linear mean: 0.52.
- Abstract-level summary estimates (logistic model of success probability vs. grade): one grade increment = 2.1× (Ewbank), 2.09× (French), 2.13× (UIAA), and 3.17× (Vermin bouldering scale) increase in difficulty. (These differ from the 2.33/2.22 headline estimates — they correspond to different parametrizations/analyses in the paper; quoted separately here as the paper presents them.)
- Community ascent-count log-linear slopes: 0.7–0.79 across countries and styles, "conforming remarkably well" with the Bayesian analysis.
- Bias direction: selective failure-logging overestimates the slope; known complete loggers show slopes slightly below 2.
- No predictive-accuracy metrics (log-loss, Brier) reported.

## 8. Code / data availability
Stan model code in the public domain at https://github.com/alexeid/climbing-grades (full model in Supplementary Information). Data via theCrag API (https://www.thecrag.com/en/article/api); no static snapshot archived by the authors.

## 9. Leakage & limitations
- All inference is in-sample; no held-out prediction test, so no evidence the model generalizes to unseen climber-route pairs.
- The constant-per-attempt success assumption (no learning) is self-admitted as poor — real climbers improve within a session/route, so p_send is an "effective" average; for NFL purposes this is analogous to assuming team strength is static within a measurement window.
- Self-reporting biases: selective failure logging (inflates m), route-selection bias (climbers choose easier/suitable routes, overestimates C(t) by up to ~1 grade), unknown per-climber logging conventions; the authors' bias corrections are argumentative, not modeled.
- Route grades treated as known truth — no measurement error on R, which propagates into m̂ (grade inflation/deflation at crags biases the scale).
- External validity to NFL: direct domain transfer is nil (no climbers, no attempts-before-success in football). The transferable pieces are the method (Wiener-drift dynamic ratings in Stan) and the bias-analysis discipline, not the subject matter.
- Only two datasets analyzed in depth; the other 18 datasets are shown as slope-point estimates in a figure without per-dataset detail in the main text.

## 10. GSE overlap
Extension. The repo master list (existing-research-map.md) covers static and state-space team strength (nested AR(1), dynamic Elo, Kalman filters) but not: (a) the Coulom-style whole-history rating with Wiener-process drift fitted jointly with a scale parameter in Stan, (b) data-driven calibration of the rating scale (the "Elo 400-point" question — GSE currently has no estimated mapping from rating gap to win probability), or (c) the paper's self-reporting/selection-bias audit framework, which maps directly onto auditing GSE's data inputs (e.g., survivorship of tipster-reported records, selective logging in public pick datasets). Duplicate: nothing in the climbing domain is GSE-relevant.

## 11. GSE implementation spec
Adapt two things to GSE's NFL team-strength lane. (1) Dynamic whole-history rating: fit a BT logistic model on nflverse play-by-play-derived game results (2015–2025), with weekly team strengths following a Wiener process in Stan (reuse the authors' github.com/alexeid/climbing-grades Stan skeleton, replacing climbers/routes with team-seasons and attempts with games; route grade R → opponent strength + home-field term). (2) Rating-scale calibration: co-estimate the slope m rather than fixing an Elo-style divisor — the inferred m̂ directly gives "a 100-point rating gap means X win probability," recalibrated each season; report d = e^m per grade-unit. Data: nflverse schedules/scores (public), home-field indicator, era dummies for rule changes. Serving: weekly Stan re-fit or online approximation (e.g., Laplace/ADVI for speed, exact MCMC monthly). Effort: ~2 engineer-weeks to port the Stan model and validate against GSE's current ratings.

## 12. Reproducible test
Dataset: nflverse regular-season games 2018–2025, time-ordered: fit through week w−1, predict week w (2024–2025 as the scored window). Metric: multiclass/Brier log-loss on win/loss outcomes. Baselines: (a) fixed-scale Elo (400-point divisor) ratings, (b) engine v5.2.7's current team ratings. Test both the Wiener-drift BT and the learned-slope m̂ against baselines; separately, ablate the learned slope (fix m to Elo-equivalent) to isolate the calibration gain.

## 13. Acceptance / rejection gate
Adopt if the Wiener-drift + learned-slope model beats fixed-scale Elo log-loss by ≥1.0% on the 2024–2025 rolling window AND the learned slope m̂ is stable across seasons (season-to-season coefficient of variation ≤ 10%). Reject if the gain is below threshold or m̂ is unstable — keep the simpler dynamic-Elo lane already in the repo.

## 14. Improvement experiment
Extend the model to co-estimate route-grade-style "opponent difficulty uncertainty": a hierarchical error term on the opponent's strength (the paper fixes route grades as known; in NFL, opponent strength is estimated). Add a per-game "conditions" covariate (wind/weather, rest) to the linear predictor, mirroring the paper's proposed style-correction factors, and test whether including it changes the estimated slope m̂ — if the scale is robust to conditions, it confirms the rating gap is a genuine strength signal; if m̂ shifts, conditions were being absorbed into the rating scale.
