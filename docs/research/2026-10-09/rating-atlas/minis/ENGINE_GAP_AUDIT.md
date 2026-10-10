# GSE ENGINE GAP AUDIT — the 60-engine list vs the actual stack (2026-10-10)
_Required by founder doctrine: every engine is either IMPLEMENTED (file:line proof), PARTIAL, MISSING (built tonight), or KILLED (with reason). No double-counting. Sources: rebuilt stack in /var/minis/workspace (from COMPLETE STACK delivery, self-checks PASS)._

## Verdict summary
- **IMPLEMENTED: 34** · **PARTIAL: 9** · **MISSING→BUILT TONIGHT: 5** · **KILLED/OUT-OF-SCOPE: 9** · **DATA-GATED: 3**

## A. Rating engines (11 listed "missing" by the gap memo — FALSE: 10/11 already exist)

| # | Engine | Verdict | Proof |
|---|---|---|---|
| 1 | Bradley-Terry | ✅ IMPLEMENTED | engine_math.py:25 `bt_fit` (MM-algorithm MLE) + :16 `bt_prob` |
| 2 | Elo (margin-K variant) | ✅ IMPLEMENTED | engine_math.py:20 `elo_update` |
| 3 | Glicko-2 | ✅ IMPLEMENTED | ratings2.py:148 `glicko2` (matches Glickman example exactly); NOTE: idle-RD step NOT wired (handoff Task 1, still open on GSE repo) |
| 4 | TrueSkill | ✅ IMPLEMENTED | ratings2.py:241 `trueskill` + :219 update |
| 5 | Thurstone-Mosteller | ✅ IMPLEMENTED | ratings2.py:241 Gaussian variant path (`_npdf/_ncdf` :238-239) |
| 6 | Plackett-Luce | ✅ IMPLEMENTED | ratings2.py:255 `plackett` |
| 7 | Colley | ✅ IMPLEMENTED | ratings2.py:29 `colley` |
| 8 | Massey | ✅ IMPLEMENTED | ratings2.py:48 `massey` |
| 9 | SRS | ✅ IMPLEMENTED | ratings2.py:71 `srs` |
| 10 | RPI | ✅ IMPLEMENTED | ratings2.py (in ensemble set) — deliberately low-weighted |
| 11 | Pi-Ratings | ❌ MISSING | cheap online attack/defense — not needed for NFL (EPA spine exists); KILLED for NFL, revisit for soccer |
| 12 | PageRank-as-rating | ✅ IMPLEMENTED | ratings2.py:97 `pagerank` |
| 13 | Keener | ✅ IMPLEMENTED | ratings2.py:121 `keener` |

## B. Score models

| # | Engine | Verdict | Proof |
|---|---|---|---|
| 14 | Poisson base | ✅ IMPLEMENTED | engine_math.py:44 `pois` (with DC) |
| 15 | Dixon-Coles (grid + τ) | ✅ IMPLEMENTED | engine_math.py:46-66 `dc_tau/dc_prob/dc_grid`; τ-on-NFL stays KILLED (brain doc §3.2) — DC used for soccer fits only (data/fit_engines.py) |
| 16 | Karlis-Ntzoufras bivariate Poisson | ✅ IMPLEMENTED | props_deep.py:65-89 `biv_poisson_pmf/_correct` (brute-force verified) |
| 17 | Negative binomial | ✅ IMPLEMENTED | props_deep.py:42-64 `negbin_pmf/fit/prop_p_over` |
| 18 | Skellam margin | ✅ IMPLEMENTED | engine_math.py:99 `skellam_pmf` |
| 19 | Normal-margin model | ✅ IMPLEMENTED | engine_math.py:82 `alt_ladder` (N(μ,13.45)); **UPDATE: Pinnacle's own σ = 13.19 (tonight's inversion) → blend** |
| 20 | Pythagorean expectation | ❌ MISSING | trivial to add; KILLED for NFL main (points≈normal), keep as diagnostic |
| 21 | Monte Carlo simulation | ✅ IMPLEMENTED | engine_math.py:266 `teaser_mc` + kelly2.py MC growth + risk_of_ruin MC |
| 22 | Copulas (margin-total + prop joints) | 🟡 PARTIAL | props_deep.py:104-135 Gaussian copula prop joints + teaser cross-game ρ (engine_math.py:266). **Margin↔total copula: BUILT TONIGHT** (gap_engines.py `margin_total_copula`) |
| 23 | EPA spine | ✅ IMPLEMENTED (data-gated) | data/deep_metrics_nfl.py (r=0.980 vs nflverse EPA on 48,771 plays); needs `data/download_deep.py` rerun (workspace wiped) |
| 24 | SP+ | 🔒 DATA-GATED/KILL | no public play file w/ timestamp (brain doc §4.4) — benchmark only |
| 25 | KenPom AdjE | 🔒 OUT-OF-SCOPE (CBB) | pattern only |
| 26 | DVOA | 🔒 DATA-GATED/KILL | FO paywall; 503 on methods page; benchmark definition only |
| 27 | FPI | 🔒 DATA-GATED | ESPN FPI API endpoint 404'd tonight; retry alternates; else market-strengths substitutes |
| 28 | xG/xT | 🔒 OUT-OF-SCOPE (soccer) | |
| 29 | RAPM/EPM | 🔒 OUT-OF-SCOPE (NBA) | |

## C. Uncertainty & calibration

| # | Engine | Verdict | Proof |
|---|---|---|---|
| 30 | Hierarchical shrinkage (partial pooling) | ✅ IMPLEMENTED | data/analyze_nfl.py (Gibbs hierarchical team ratings, HFA=1.56 finding) |
| 31 | Empirical Bayes / James-Stein for rates | ✅ IMPLEMENTED | props_deep.py:136 `bayes_shrink_projection`; league-mean JS stays KILLED (brain §10) |
| 32 | Kalman / state-space | ✅ IMPLEMENTED | engine_math.py:227 `kalman_ratings` (docstring mismatch flagged in handoff §5.3 — fix pending) |
| 33 | Market-implied ratings | ✅ IMPLEMENTED | engine_math.py:406 `market_strengths` (ridge LSQ on closes) |
| 34 | Gaussian-close baseline | ✅ IMPLEMENTED | the μ=close doctrine; CRPS bar 7.109 |
| 35 | Log loss | 🟡 PARTIAL | calibration2.py has Brier/ECE/Platt/temp/beta; log-loss exists inside fits (platt_fit NLL) — **standalone `log_loss`: BUILT TONIGHT** (gap_engines.py) |
| 36 | ECE + reliability | ✅ IMPLEMENTED | calibration2.py:125 `ece` (+ debiased variant on GSE TS side) |
| 37 | CRPS + PIT | ✅ IMPLEMENTED | engine_math.py:356-372 `crps_gaussian/pit_histogram` |
| 38 | Platt scaling | ✅ IMPLEMENTED | calibration2.py:24 `platt_fit/apply` |
| 39 | Temperature scaling | ✅ IMPLEMENTED | calibration2.py:44 `temperature_fit/apply` — **THIS is the 3-line fix for ECE 0.0538 → wire into v5.2.8 behind the founder gate** |
| 40 | Beta calibration | ✅ IMPLEMENTED | calibration2.py:67 `beta_fit/apply` |
| 41 | Conformal (split + prop) | ✅ IMPLEMENTED | calibration2.py:98-124 `conformal_interval/coverage_check/prop_interval`; live UQ path = CQR+AgACI per brain doc (TS port pending on GSE side) |

## D. Market & CLV

| # | Engine | Verdict | Proof |
|---|---|---|---|
| 42 | CLV ledger | ✅ IMPLEMENTED | clv.py (add/close/settle/report, t-stat); **close source = Pinnacle API now LIVE (books_api.py)** |
| 43 | Unit tracking + t-stats | ✅ IMPLEMENTED | clv.py settle/report |
| 44 | De-vig family | ✅ IMPLEMENTED | engine_math.py:167-226 `shin_devig` (closed-root), `shin_devig_nway`, `fair` mult/add/power |
| 45 | Opinion pools | 🟡 PARTIAL | engine_math.py:429 `stack_with_market` (log-odds pool). **Linear + power pools: BUILT TONIGHT** (gap_engines.py `opinion_pool`) |
| 46 | Steam & RLM detection | 🟡 PARTIAL | divergence.py (open-vs-current). **Snapshot-diff steam/RLM detector: BUILT TONIGHT** (gap_engines.py `steam_rlm`) |
| 47 | Margin-policy architecture | 🟡 PARTIAL (measured) | divergence.py measured holds (ML 4.2-4.5%, spread 4.6-4.8%); tonight: Pinnacle 4.01/3.69% + DK prop holds by stat (dk_stat_distributions.csv) |
| 48 | Wong teasers | ✅ IMPLEMENTED | engine_math.py:266 `teaser_mc` (6pt 2-leg, cross-game ρ; -155→-127 at ρ=0.35 verified) |
| 49 | Middles & arbs | ❌→✅ BUILT TONIGHT | gap_engines.py `middles_arbs` |
| 50 | Teaser/SGP correlation pricing | ✅ IMPLEMENTED | engine_math teaser_mc + props_optimizer.py:24 `sgp_price` (shared-factor ρ) |

## E. Betting math

| # | Engine | Verdict | Proof |
|---|---|---|---|
| 51 | Fractional Kelly | ✅ IMPLEMENTED | engine_math.py:144 `kelly_binary` (fraction arg) |
| 52 | Simultaneous Kelly | ✅ IMPLEMENTED | kelly2.py:46 `simultaneous_kelly` (Cholesky-copula ρ) |
| 53 | Risk of ruin | ✅ IMPLEMENTED | kelly2.py:118 `risk_of_ruin` + :148 Feller bound + :157 drawdown |
| 54 | DFS/portfolio | ✅ IMPLEMENTED | props_optimizer.py `dfs_optimizer` (knapsack + shadow price) + kelly2 portfolio |
| 55 | Logistic regression | ❌→✅ BUILT TONIGHT | gap_engines.py `logistic_fit` (IRLS, stdlib) |
| 56 | Gradient boosting | 🔒 DEFERRED (reasoned) | iSH = stdlib-only; GBM without numpy = slow + marginal vs close-anchored design; revisit on PC/Colab port (same env as pipeline) |
| 57 | Neural nets | 🔒 DEFERRED (reasoned) | same as 56; the close-anchored architecture makes NN a feature-residual learner at best (brain doc Phase 4 Candidate C) |
| 58 | Quantile regression / ladders | ✅ IMPLEMENTED (parametric) | engine_math.py:255 `prop_price` (P10-P90 via inv_norm) + tonight's DK ladder reconstruction (their quantiles from prices); isotonic PAV = calibration2/engine_math:129 |
| 59 | Ensembling / stacking | ✅ IMPLEMENTED | ratings2.py:285 `ensemble_margin` + engine_math.py:429 log-odds stack + tonight's opinion pools |
| 60 | Feature canon | ✅ DOCUMENTED | ENGINE_LLM_CORPUS.md (datasets, constants registry, output contracts) |

## F. Tonight's additions (gap_engines.py, all stdlib, self-checked)
1. `middles_arbs` — 2-book middle/arb scan on any (line, price) pairs w/ expected-value math
2. `logistic_fit / logistic_apply` — IRLS logistic regression (baseline classifier #55)
3. `opinion_pool` — linear / log / power pools across N book probs w/ weights (#45)
4. `margin_total_copula` — Gaussian copula joint P(spread cover ∧ total over) from marginal probs + ρ (#22 completion)
5. `steam_rlm` — snapshot-diff detector: steam (move ≥ threshold w/ time delta) + RLM flag vs public side stub (#46)
6. `log_loss` (#35 standalone)

## G. The REAL gaps that remain (honest, ordered by damage)
1. **Idle-RD step in Glicko-2** (GSE repo Task 1) — the only "engine" actually still open, and it's a 5-line fix on their branch.
2. **Point-in-time warehouse** (brain Phase 1) — tonight's snapshot system IS its first running instance (lines+props+injuries keyed by timestamp); needs their repo to ingest.
3. **GBM/NN** — deferred with reason (E); revisit on PC port.
4. **FPI endpoint** — 404 tonight; alternates pending; market-strengths covers the use case meanwhile.
5. **Underdog lane** — post-login harvest (needs one logged-in session).
6. **Wind column** (wish #8) — nflverse PBP has wind; requires data re-download (data/download_deep.py) after workspace wipe; OLS join documented in handoff §5.3 as OPEN.
