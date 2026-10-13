# THE PREDICTION ENGINE — COMPLETE BUILD DOSSIER
_Everything built: research, math, code, data, verification. Sports + beyond._
_Compiled 2026-10-09 · botd v4.14 · all code in /var/minis/workspace · pure stdlib Python (runs anywhere)_

---

## 0. THE MISSION

> "I want to be the strongest prediction predictability company in the world."

The honest thesis, learned from the atlas and the market itself:

1. **The closing line is the best forecaster alive.** Beating it requires either faster information (data latency), better variance modeling (distribution shape), or exploiting internal market inconsistencies (stale lines, cross-book divergence).
2. **The moat is NOT the math.** BT/Elo/DC/Kelly are public knowledge. The moat is: data latency, consensus speed, variance quality, and covariate engines (weather/injury/situational) executed without emotion at scale.
3. **Honesty infrastructure is the differentiator.** CLV ledgers, calibration X-rays (Brier/PIT/ECE), deflated Sharpe, conformal guarantees — these are what separate a real engine from a tout with a spreadsheet.

Class ladder (honest): `data → devig sketch → BT/Elo sketch → DC grid / normal-margin ladder → calibration sketch (PAV+) → market stack sketch → Kelly sketch`. Production scoring lives elsewhere; this folder is the research engine and does not publish picks.

---

## 1. SYSTEM ARCHITECTURE

```
DATA LAYER          MODEL LAYER              CALIBRATION          SIZING              HONESTY
─────────────       ────────────────         ─────────────        ─────────────       ────────────
ESPN public API  →  engine_math.py       →   calibration2.py  →   kelly2.py       →   clv.py
(odds/scores,       (devig, DC grid,        (Platt, temp,         (simultaneous       (closing line
 keyless)           normal margin,          beta, conformal)      Kelly w/ cov)       value ledger)
Pinnacle guest      Skellam, Kalman,                          props_optimizer.py  backtest.py
api (sharp)         teaser MC, live √τ,   →  ratings2.py       →  (SGP joint,         (expanding-
Sleeper API         weather/injury/sit      (Colley→TrueSkill)    DFS, corr-Kelly)    window, PIT)
(nfl state)                                                   props_deep.py       divergence.py
                    ratings2.py          →  verification          (negbin, biv-Pois,  (hold %, line
                    (8 systems,            science: Brier,       copula, Bayes       movement)
                    verified)              CRPS, PIT, dSharpe    shrinkage)
```

**Design constraints:** pure stdlib Python (no numpy on iSH/musl), every engine self-tested with `self_check()`, verified against published test vectors where they exist, Monte-Carlo seeded for reproducibility.

---

## 2. THE ENGINE LIBRARY — FILE BY FILE

### 2.1 `engine_math.py` — the probability core (45 functions)

**Spread convention (the correction packet — applies to ALL files):**
```
listed_spread = the book's HOME number (favorite negative, e.g. −3.5)
mu_margin    = −listed_spread          (fair −3.5 → home margin ~ N(+3.5, 13.45))
cover of line L: home_margin + L > 0    (pushes ignored)
```

**Devig family** — `fair(p1, p2, method)`:
- multiplicative: `p_i/Σp` (the default; correct on 2-way)
- additive: `p_i − (Σp−1)/2` (equal-margin; wrong tail behavior, keep for comparison)
- power: solve `p1^k + p2^k = 1` by bisection (logarithmic method)
- **Shin (1993)**: insider-trading model `π_i = (1−z)p_i + z·p_i²/S`, fixed-point on S, bisection on z so Σπ=1. **STATUS: present but does NOT recover z on sub-1/edge books — falls back to multiplicative. Working devigs are mult/add/power only. Do not trust Shin output z.**

**Bradley-Terry / Elo equivalence:** `P = 1/(1+10^((rb−ra)/400))` — the 400-point scale IS the logistic. `bt_fit` = MM-algorithm MLE: `π_t ← W_t / Σ_o 1/(π_t+π_o)`.

**Dixon-Coles:** low-score dependence correction τ:
```
τ(0,0)=1−λμρ   τ(0,1)=1+λρ   τ(1,0)=1+μρ   τ(1,1)=1−ρ
```
`dc_grid(λ,μ,ρ)` → full score matrix → margin & total distributions. Verified: λ=1.9, μ=1.1, ρ=−0.05 → 55.5/23.3/21.2 (home/draw/away). **Time-decay ξ fitting: described in atlas, NOT in code (bench).**

**Normal-margin model:** margin ~ N(mu, 13.45) for NFL. `alt_ladder` prices the alt-spread ladder pre-tax: cover of line L = `1 − Φ((−L−mu)/sd)`.

**Skellam:** margin of two independent Poissons via modified Bessel `I_|k|(2√(λμ))`.

**Kalman ratings:** strengths as hidden state, each game a noisy observation `margin = (s_a−s_b+hfa)+ε`. Scalar state-space update, process noise q = "form". Returns (rating, rd) per team.

**Prop pricing:** `prop_price(proj, sd, line, book)` → P(over) from the player's distribution, quantile ladder P10–P90, and **edge_vs_book_p** (model prob minus book-implied prob — NOT a fake "hold").

**Teaser MC:** 2-leg teaser with cross-GAME correlation via shared market factor: `margin_i = μ_i + σ(√ρ·f + √(1−ρ)·ε_i)`. KEY RESULT (measured): 6pt 2-leg fair −155 at ρ=0 → −127 at ρ=0.35 — a 28-point correlation swing that flat parlays never see. Push rule: one-leg push reduces to other leg; both-push removed from denominator.

**Live repricing:** conditional final margin ~ `N(lead + base_mu·τ, sd·√τ)` — the √τ law is why live spreads/totals breathe with the clock. Plus `wp_in_game` (nfl4th-structure logistic), `weather_adj` (wind −0.25pt/mph over 9, rain −1.5, snow −2.5), `injury_adj` (QB 5.5, LT 2.0, WR1/CB1 1.5…), `situational_adj` (rest ±0.25/day, tz −0.4, altitude +0.3). **All published magnitudes or empirical constants — not fits on our data.**

**Verification science:**
- `crps_gaussian` (Gneiting 2005 closed form): `sd·[z(2Φ(z)−1) + 2φ(z) − 1/√π]`. Verified `crps(0,1,0) = (√2−1)/√π ≈ 0.2337` — NOT 1/√π (the correction packet caught this).
- `pit_histogram` — rank histogram; U-shape = overconfident, hump = underconfident, uniform = calibrated.
- `deflated_sharpe` (Bailey & López de Prado) — P(your backtest Sharpe is real after `trials` attempts). The anti-self-deception engine.
- `brier_decompose` — Murphy decomposition BS = rel − res + unc, **reliability computed against the bin MEAN forecast (not bin midpoint)** per the correction packet.
- `isotonic` (PAV) — the nonparametric calibration layer.
- `market_strengths` — **ridge least squares via normal equations** (the original non-square Gaussian elimination was a real bug), recovers team strengths from closing margins; finds where the market's own implied strengths are internally inconsistent.
- `stack_with_market` — log-odds pooling `σ(w·logit(model) + (1−w)·logit(market))`. Market term non-negotiable.
- `hmm2_fit` — 2-state regime HMM (cold/hot form), full Baum-Welch EM with scaled forward-backward.

### 2.2 `ratings2.py` — 8 rating systems, all verified (25 functions)

| System | Mechanism | Key gotcha (learned the hard way) |
|---|---|---|
| **Colley** | Solve `C·r = b`; `C_ii = 2+n_i`, `C_ij = −n_ij`, `b_i = 1+(w−l)/2` | Pure algebra, no margins. Identical records → identical ratings (correct, but test schedules must account for it) |
| **Massey** | LSQ on point margins: `M·r = p` | Margins matter; needs ridge for identifiability |
| **SRS** | `rating_i = avg_margin_i + avg(opp rating)`, damped fixed-point | Damping 0.7 stabilizes; normalize mean 0 |
| **PageRank** | Beat-graph, edges loser→winner, weight `1+|margin|/10` | Mass flows loser→winner; iterate `s = Aᵀ·s` |
| **Keener** | Skew matrix `S(y) = (1+y)^x/((1+y)^x+(1+1/y)^x)`, power iteration | **MUST column-normalize** (Σ_i a_ij = 1). Row-normalization converges to uniform — a trap nobody documents |
| **Glicko-2** | Period-parallel Bayesian update + volatility via Illinois algorithm | **PERIOD-PARALLEL, not sequential** — sequential per-game updates compound volatility and poison ratings. **Verified vs Glickman's canonical worked example: (1464.06, 151.52, 0.05999) — EXACT** via `rating0_map`/`rd0_map` |
| **TrueSkill** | Pairwise factor-graph closed form: `c=√(2β²+σw²+σl²)`, v/w update functions | Draw handling skipped (ties) in the pairwise shortcut |
| **Plackett-Luce** | MM iteration, `π_t = wins_t / Σ 1/(π_t+π_o)` | **Numerator = WINS, not total games** (was a real bug) |

Plus `ensemble_margin()` — averages Colley/Massey/SRS/Keener implied margins for a matchup, reports the spread-of-views (disagreement = information).

### 2.3 `calibration2.py` — the calibration layer (16 functions)

- **Platt scaling** (1999): `p_cal = σ(A·logit(p_raw)+B)`, gradient descent on NLL.
- **Temperature scaling** (Guo 2017): `p_cal = σ(logit(p_raw)/T)`, bisection on NLL. The modern NN standard.
- **Beta calibration** (Kull/Filho/Flach 2017): 3-param monotone map `m(p) = 1/(1+1/((p^a(1−p)^b)/c))`. Identity = (1,1,1).
- **Split conformal** (Vovk/Papadopoulos): interval `ŷ ± q̂` where `q̂` = ⌈(n+1)(1−α)⌉-th smallest calibration residual. **Distribution-free coverage ≥ 1−α under exchangeability. LIVE VERIFIED: 0.908 empirical coverage on 0.90 target.**
- **Conformal prop intervals** — asymmetric (separate over/under residual quantiles) for prop pricing.
- **ECE + reliability table** — expected calibration error with per-bin conf-vs-acc.
- `recalibrate_report` — fits all three, reports Brier before/after. Demo: deliberately overconfident model Brier 0.2588 → 0.2381 (Platt), T=2.50.

### 2.4 `kelly2.py` — portfolio Kelly + survival math (9 functions)

- **Simultaneous Kelly**: maximize `E[log(1+Σf_i·X_i)]` over a correlated slate. MC gradient ascent **with backtracking line search** (plain ascent oscillates on this objective — another hard-won lesson).
- **Correlated Bernoulli slate**: Cholesky decomposition + Gaussian copula (`rho` = latent/rank correlation). Win_i = (Φ(z_i) < p_i).
- **KEY RESULT**: at ρ=0.55, the optimizer prices the correlated leg to fraction **0** — it discovers the SGP correlation tax on its own. Correlated ρ=0.55 slate: growth 0.0115/round vs 0.0167 at ρ=0 — correlation destroys growth and the correct response is concentration, not more bets.
- **Risk of ruin MC**: P(hit floor), median/p5/p95 final bankroll over N rounds.
- **Drawdown curve**: median max-DD 72–87% at full Kelly fractions — the survival side of growth-optimal sizing.
- **Feller classical bound** for even-money reference points.

### 2.5 `props_deep.py` — distributional prop models (17 functions)

- **Negative binomial** for overdispersed counts (receptions/targets where Poisson underestimates variance). Method-of-moments fit: `r = m²/(v−m), p = m/v`. Demo: mean 6 rec, var 6→12 moves P(over 5.5) from 55.4%→50.0% — overdispersion IS the pricing edge on count props.
- **Karlis-Ntzoufras bivariate Poisson**: X=W1+W3, Y=W2+W3, shared component λ₃ = the correlation. `P(X=x,Y=y) = e^{−Σλ}·Σ_k λ1^{x−k}/(x−k)!·λ2^{y−k}/(y−k)!·λ3^k/k!`. **Verified vs brute-force enumeration: 0.1231 exact.** (Fitting λ₃ from data: bench.)
- **Truncated normal** for bounded props (completion %, FG %): P(over) within hard [lo,hi] bounds.
- **Gaussian copula joint**: P(both over) via MC with copula link — at ρ=0.5, P(both)=0.439 vs 0.36 independent. Any SGP/parlay builder that multiplies marginals is leaving this on the table.
- **Bayes hierarchical shrinkage** on projections: `proj = w·player_avg + (1−w)·league_avg`, `w = n/(n + σ²_obs/σ²_prior)`. Demo: n=2 → weight 0.47 on data; n=16 → 0.88. Early-season stats shrink HARD — this is the empirical-Bayes cure for small-sample hero worship.
- **Correlated-Kelly portfolio** with correlation penalty per leg.
- **CVaR framing** (Rockafellar-Uryasev) for tail-aware budget allocation.
- **Team-total split**: `(game_total ± mu_margin)/2` — with the corrected spread convention (the original `(T+spread)/2` made the favorite score LESS — a real sign error caught by the packet).

### 2.6 `clv.py` — the honesty ledger (9 functions)

Closing Line Value: `CLV% = p(bet_price)/p(close_price) − 1`. Long-run profit ≈ long-run CLV; without this ledger, "I'm up" is survivorship noise.

Ops: `add` (bet placed) → `close` (market closed → CLV computed) → `settle` (w/l/p) → `report` (avg CLV, beat-close rate, t-stat vs 0, settled P&L). Persistent JSON state.

**Demo lesson baked in**: 8 seeded bets show **+1.19u P&L on −2.70% avg CLV** — profitable-but-negative-CLV = luck, and the t-stat (−1.93, n=8) says "not yet significant" instead of lying.

### 2.7 `backtest.py` — leakage-free verification on real data (6 functions)

Protocol (the part everyone gets wrong):
1. **Expanding window** — to predict week W, only games BEFORE week W are used
2. SRS fit per window → margin prediction → P(home win)
3. **Brier** (ML), **CRPS** (margin), **PIT histogram** (calibration shape)
4. **Temperature refit** reported before/after

Data: ESPN public scoreboard API (keyless), cached to `data/espn_scores_<season>.json`.

**LIVE RESULT — 2025 NFL weeks 1–6:**
```
93 real games loaded → 77 leakage-free predictions
Brier: 0.2868  →  0.2464 after temperature refit (T = 7.51)
Pick accuracy: 55.8% (SRS-only, no market input)
PIT: max deviation 0.082 from uniform = GOOD
```
**Reading: T=7.5 means early-season SRS probabilities are wildly overconfident** (few games → ratings spread too wide) — and the refit quantifies exactly how much. This is the calibration loop running end-to-end on real data.
### 2.8 `props_optimizer.py` — joint props + SGP + DFS (11 functions)

**The pairing principle** (the file's own thesis): the probability engine outputs JOINT distributions (shared-game-environment correlation); the optimizers are just mathematics eating those distributions — `Kelly = argmax E[log wealth]`, `DFS = argmax Σproj s.t. cap+slots`.

- **SGP pricing** `sgp_price(legs, ρ_shared)`: legs correlated through a shared game-environment factor (pace/script/weather): `x_i = μ_i + σ_i(√ρ·f + √(1−ρ)·ε_i)`. Joint P(all hit) by MC vs the independent product `Πp_i` — **the gap is what the book charges for correlation without modeling it correctly** (labeled a GAP, not a fake "tax" constant).
- **Team props**: `home ≈ N((T+S)/2, σ_team=11.5)`, `away ≈ N((T−S)/2, σ_team)` — with σ_team < σ_margin/√2 encoding score correlation. To-score-first from the drive-level Poisson race: `P(home first) = λh/(λh+λa)` + possession edge (~+4%).
- **Game props + OT discretization**: continuous normal never ties — the tie mass `φ(0)` is blended with the **empirical NFL OT rate (~5.8%)**. First-half markets come free from the **√τ half-split law: `H1 margin ~ N(S/2, 13.45·√½)`**.
- **Correlated-Kelly contraction** (discovered, in code): with correlation ρ, optimal fractions contract below the sum of single-bet Kellys — **diversification emerges from the optimizer, no rule-of-thumb programmed**.
- **DFS optimizer**: knapsack with position slots (greedy-by-value + swap refinement, honest docstring: NOT exact ILP). **Cap shadow price: `dOptimalProj/dCap` = the points-per-$ market price** — the marginal cost of salary space is itself a tradeable number. Over-cap flagged.
- Team-total split uses the corrected convention (the original `(T+spread)/2` made the favorite score LESS — a real sign error caught by the correction packet).

### 2.9 `divergence.py` — the market X-ray (4 functions)

Live probe of ESPN core odds API (`sports.core.api.espn.com/.../events/{id}/competitions/{id}/odds`) → per-market devig:
- **Measured DK holds (live):** moneyline 4.2–4.5%, spread 4.6–4.8%, total 4.8%
- Open-vs-current price movement (drift detection)
- Pinnacle price endpoint slot ready (still auth-gated at probe time)

**Why it matters:** hold is the tax you pay per trade; knowing the exact hold per market type = the true breakeven CLV threshold.

### 2.10 `predict.py` + `sportsbook.py` — market plumbing

- `american→implied→devig` (3 methods, live-tested: −150/+170 → fair 61.83/38.17)
- Live Pinnacle guest API probe (sharp book, open access), ESPN odds/scores feeds, Sleeper state API
- `/books lines|diff` — line snapshot + movement diff (the real edge detector)

---

## 3. THE TAXONOMY — RATING_ATLAS.md (60+ systems)

Full document: `RATING_ATLAS.md` (13.6KB). Nine parts:
1. **Head-to-head ratings** — BT, Elo, Glicko/2, TrueSkill, Thurstone, PL, Colley, Massey, SRS, RPI, Pi, PageRank, Keener
2. **Score models** — Poisson, Dixon-Coles, Karlis-Ntzoufras, NegBin, Skellam, Normal-margin, Pythagorean family, MC/copulas
3. **Efficiency metrics** — EPA/SP+/KenPom/DVOA/FPI/xG-xT/RAPM-EPM (data models — need pbp feeds)
4. **Bayesian** — hierarchical shrinkage, empirical Bayes, beta-binomial, Kalman state-space, market-as-prior
5. **Calibration** — Brier+Murphy, log-loss, ECE, isotonic PAV, Platt, temperature, beta-cal, conformal, CLV, t-test
6. **Market math** — devig family incl. SHIN 1993, opinion pools, steam/RLM, margin architecture, Wong teasers, middles/arbs
7. **Sizing** — Kelly family, simultaneous, risk-of-ruin, DFS portfolio
8. **ML** — logistic/GBM/NN, quantile props, ensembling, feature canon + leakage rules
9. **Proprietary-layer verdict** — the moat is data latency, limits, consensus speed, variance quality, covariate engine — NOT the math

**Coverage rule:** every atlas system is either (a) implemented + verified (§2, §8 ⚙️) or (b) has its full math written down in **Appendix A** (A1–A22) with fitting procedure and data source. No taxonomy item exists without either code or math.

**Code status legend:** ⚙️ implemented + verified · sketch = implemented, honest-simplification · ○ taxonomy only

---

## 4. DATA LAYER — LIVE SOURCES (all keyless, all probed)

| Source | Status | What it gives |
|---|---|---|
| ESPN site API (scoreboard) | ✅ WORKING | Historical + live scores, any season/week → backtest fuel |
| ESPN core odds API | ✅ WORKING | ML/spread/total prices + open vs current → hold + movement |
| Pinnacle guest API | ✅ OPEN | Sharp book matchups (498 NFL games probed); prices endpoint auth-gated |
| Sleeper API | ✅ OPEN | League state, 14.6MB players DB |
| DraftKings content API | ⚠️ 403 | Needs browser headers |
| FanDuel sbapi | ⚠️ region-gated | Needs region routing |
| The Odds API | 🔑 key slot ready | Multi-book comparison — 500 free/mo unlocks true divergence |
| nflverse pbp (EPA) | ○ bench | Real play-by-play exists but file size > iSH RAM; needs selective download or PC |
| Weather (open-meteo archive) | ○ bench | Historical weather per stadium, keyless |

---

## 5. LIVE RESULTS & DISCOVERIES

1. **Teaser correlation swing (28 points):** 6pt 2-leg fair −155 at ρ=0 → −127 at ρ=0.35. Flat-parlay pricing is systematically wrong in the same direction — the market factor model quantifies it.
2. **The SGP correlation tax, discovered by the optimizer:** at ρ=0.55 the simultaneous-Kelly optimizer prices the correlated leg to fraction ZERO. It refuses to pay full price for a correlated duplicate. This behavior EMERGED from the math — it was not programmed.
3. **Correlation destroys portfolio growth:** ρ=0 → 0.0167 log-growth/round; ρ=0.55 → 0.0115. The correct response is concentration + higher selectivity, not more correlated bets.
4. **Overdispersion IS prop pricing edge:** mean-6 receptions at var 6 vs 12 moves P(over 5.5) from 55.4% → 50.0%. Books that price counts as Poisson are exploitable on high-variance players.
5. **Copula gap on every parlay:** at ρ=0.5, P(both over) = 0.439 vs 0.36 independent. Any multiply-the-marginals parlay builder misprices by 8+ points.
6. **Early-season ratings are overconfident:** temperature T=7.5 on weeks 1–6 SRS. The fix (refit) improved Brier 14% — and the machinery to do this continuously now exists.
7. **Hold measured live:** ML 4.2–4.5%, spread 4.6–4.8%, total 4.8% (DK via ESPN feed) — the true per-trade tax.
8. **CLV vs P&L divergence:** +1.19u P&L on −2.70% avg CLV (n=8, t=−1.93) — profit without edge is noise until the t-stat says otherwise.
9. **Bivariate Poisson verified to brute force** (0.1231 exact) — the λ₃ shared component is the correct way to model correlated team/player counts.
10. **Shin devig honest failure mode:** on sub-1 books and edge cases it falls back to multiplicative — documented, not hidden.

---

## 6. iSH / ALPINE ENGINEERING LESSONS (transferable)

1. **Keener needs column-normalization** — row-stochastic power iteration starting at uniform STAYS at uniform. Nobody writes this down.
2. **Glicko-2 must be period-parallel** — sequential per-game updates compound the volatility estimate (vol → 2.0+) and poison ratings. Collect all games per player FIRST, then one update.
3. **Gradient ascent on log-growth oscillates** — needs backtracking line search (monotone improvement guarantee).
4. **Plackett-Luce MM numerator = WINS**, not total game appearances.
5. **inv_norm bisection in MC inner loops = timeout on iSH** — use `random.gauss` directly when the model is already Gaussian.
6. **Brier reliability = bin MEAN forecast** (Murphy), not bin midpoint — the packet caught this.
7. **Pure-stdlib Cholesky is fine for n≤10** — no numpy needed for slate-level correlation.
8. **onnxruntime has no musllinux wheels** — NudeNet/NN-classifier route on iSH goes through HF Spaces (FastAPI), not local pip.
9. **ESPN scoreboard API**: `site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=YYYY&seasontype=2&week=N` — keyless, ~0.4s/game with cache.
10. **Cache everything** — `data/espn_scores_2025.json` makes the backtest re-runnable without re-hitting the API.

---

## 7. BOT COMMAND DECK (prediction layer) — botd v4.14

| Command | Engine | Output |
|---|---|---|
| `/predict devig <odds>` | engine_math | fair probs, 3 methods |
| `/predict shin\|teaser\|props\|kalman\|live` | engine_math | per-mode analysis |
| `/predict methodology` | — | the 7-rung class doc |
| `/predict sharp` | sportsbook | live Pinnacle probe |
| `/atlas` | RATING_ATLAS.md | full taxonomy as document |
| `/books map\|lines\|diff` | sportsbook | live odds, movement |
| `/xray` | divergence | per-market hold X-ray |
| `/props sgp\|team\|game\|kelly\|dfs` | props_optimizer | joint pricing + sizing |
| `/props deep` | props_deep | distributional prop models |
| `/ratings` | ratings2 | 8 systems on demo slate |
| `/calib` | calibration2 | conformal proof + refit demo |
| `/kelly2` | kelly2 | simultaneous Kelly + ruin |
| `/clv` | clv | ledger demo/report |
| `/backtest [season] [weeks]` | backtest | leakage-free real-data backtest |

All commands battery-tested, 0 handler errors. Daemon: `botd.py`, owner-locked, 30-min heartbeat.

---

## 8. HONEST STATUS LEDGER

**⚙️ Implemented + verified:**
BT/Elo (bt_fit MM), DC grid + τ, devig (mult/add/power), alt-ladder (corrected convention), Skellam, Brier decomposition (bin-mean), isotonic PAV, Kelly binary + growth MC, Kalman ratings, prop quantile pricing, teaser MC (market-factor correlation), live √τ repricing, CRPS Gaussian (0.2337 ✓), PIT, deflated Sharpe, market-strength ridge inversion, log-odds stack, 2-state HMM (Baum-Welch), Colley, Massey, SRS, PageRank, Keener, **Glicko-2 (canonical vector EXACT)**, TrueSkill pairwise, Plackett-Luce, Platt, temperature, beta calibration, split conformal (0.908/0.90 ✓), ECE, negbin (MoM), bivariate Poisson (brute-force ✓), truncated normal, Gaussian copula joints, Bayes shrinkage, simultaneous Kelly (line-search), Cholesky copula slate, risk-of-ruin MC, drawdown stats, Feller bound, CLV ledger, team-total split (corrected), expanding-window backtest on real ESPN data, SGP joint, DFS (honest docstring).

**Shin:** present, falls back to multiplicative on sub-1 books — **NOT marked working**.

**○ Taxonomy only (bench):**
EPA/SP+/KenPom/DVOA/FPI/xG/RAPM as fitted data models (need pbp), Karlis-Ntzoufras FITTING (have pmf only), full hierarchical Bayes, conformal for margins (have for props), opinion pools beyond log-odds, steam/RLM detector (have movement data, need public-betting-% source), DC time-decay ξ MLE, logistic/GBM/NN stack, cross-book divergence monitor (needs The Odds API key or Pinnacle prices unlock).

**Not claimed anywhere:** no CLV proof, no +EV product copy, no Millennium-style claims. Injury/weather/OT numbers are published magnitudes, not fits.

---

## 9. NEXT BENCH (priority order, with the data source + math each needs)

1. **EPA from nflverse pbp** — biggest model upgrade available. Data: `nflverse/nflfastR-data` play-by-play CSVs (per season, gzip). Math: expected-points surface over (down, distance, yardline) → EPA = ΔEP per play; team EPA/play becomes the modern rating feature. **Constraint on iSH: file size > RAM — needs selective download or a PC pass.**
2. **Karlis-Ntzoufras fitting** — MLE on (λ1, λ2, λ3) from real score data; log-likelihood of the bivariate pmf (§2.5), λ3 ≥ 0 constraint, Newton or EM. Data: any league's historical scores (ESPN cache already working).
3. **Temperature/conformal loop on the LIVE engine** — store every prediction, refit weekly, watch Brier/PIT drift. Machinery exists (calibration2.py + clv.py); needs a persistence cron.
4. **Cross-book divergence** — The Odds API key (`ODDS_API_KEY` slot ready, 500 free/mo) → multi-book holds, consensus capture (log-opinion pool), steam detection. Pinnacle guest prices endpoint may unlock first — probe periodically.
5. **DC time-decay ξ** — weighted MLE: maximize `Σ_i e^{−ξ(t_now−t_i)}·log L_i` over (λ, μ, ρ, ξ); data = ESPN cache.
6. **Opinion pools** — linear `P = Σ w_i p_i` + logarithmic `P ∝ Π p_i^{w_i}` across books; weights by validation log-loss.
7. **Quantile regression props** — pinball loss `ρ_τ(u) = u(τ − 1[u<0])` per player-stat; replaces the Gaussian shape assumption in prop_price.
8. **Steam/RLM detector** — velocity `Δprice/Δt` + divergence from public bet-% (needs a public-betting-% source; covers.com scrape candidate). Movement data already flowing via /books diff.
9. **Hierarchical full Bayes** — replace the closed-form shrinkage (§2.5) with a sampled posterior (team effects ~ N(league, τ²), τ itself learned); MCMC on iSH is feasible for n≈32 teams with conjugate structure.
10. **Conformal for margins** — same split-conformal machinery, residuals = |margin − pred| from the backtest cache; gives guaranteed-width margin intervals.

**Data sources inventory (all keyless unless noted):** ESPN site API (scores/odds, ✅ wired), ESPN core odds API (✅ wired), Pinnacle guest (✅ open, prices gated), Sleeper (✅ open), nflverse GitHub releases (pbp — bulk), collegefootballdata.com (free key, CFB), open-meteo archive (historical weather per stadium), The Odds API (🔑 slot ready).

---

## 10. FILE INVENTORY (prediction layer)

```
engine_math.py      20.1KB  45 fn  probability core + verification science
ratings2.py         15.2KB  25 fn  8 rating systems, canonical-verified
calibration2.py      8.4KB  16 fn  conformal + Platt/temp/beta + ECE
kelly2.py            8.6KB   9 fn  simultaneous Kelly + ruin/drawdown
props_deep.py       11.9KB  17 fn  distributional prop models
props_optimizer.py   9.3KB  11 fn  SGP/team/game/DFS
clv.py               4.8KB   9 fn  CLV ledger
backtest.py          6.7KB   6 fn  real-data leakage-free backtest
divergence.py        3.5KB   4 fn  market X-ray (holds, movement)
sportsbook.py        3.8KB   2 fn  odds plumbing
predict.py           3.9KB   6 fn  devig + class doc
botd.py             34.6KB      bot daemon v4.14 (all commands wired)
RATING_ATLAS.md     13.6KB      60+ system taxonomy
MASTER.md            8.1KB      prior consolidated doc
data/espn_scores_2025.json     cached real results (93 games)
```

---

## 11. THE ONE-PARAGRAPH STATE OF THE ENGINE

We have a complete, verified, pure-stdlib probability stack: market inversion (devig + strengths), 8 rating systems (one canonically verified), score models (DC + bivariate Poisson + negbin + copulas), a calibration layer with distribution-free guarantees, portfolio sizing that discovers correlation taxes on its own, an honesty ledger (CLV) and a leakage-free backtest harness running on real NFL data with temperature refit. The gap between this and the sharps is not math — it's data velocity (pbp/EPA feeds), multi-book price access, and the discipline loop (store → calibrate → refit) running continuously. Both are now engineering problems, not research problems.



---

## APPENDIX A — BENCH MATH: the equation for every system not yet coded
_The taxonomy is not allowed to exist without its math. Each entry: the equation, the fitting procedure, and what it buys you. These are research-complete; code is an afternoon each._

**A1. Thurstone-Mosteller** (BT's Gaussian twin)
`P(i beats j) = Φ((s_i − s_j)/√(2σ²))` — fit s_i by MLE on win/loss (probit regression on paired dummies). Choose logistic (BT) when tails matter, normal when they don't; empirically near-identical.

**A2. RPI** (know it to avoid it)
`RPI = ¼·WP + ½·OppWP + ¼·OppOppWP`. Selection heuristic, weak predictor — no fitting, just aggregation.

**A3. Pi-Ratings** (cheap online alternative)
`r' = r + α(observed − expected)` with symmetric attack/defense split and exponential decay of α over a season. Two parameters, online, no matrix solve.

**A4. Pythagorean expectation + Pythagenpat**
`Win% = RS^e/(RS^e + RA^e)`. Exponents: MLB 1.83, NFL 2.37, NBA ~14. **Pythagenpat**: `e = 1.5·log₁₀(RS+RA)`. Use: true-strength vs luck separator; residuals = schedule/luck flags.

**A5. EPA (Expected Points Added)** — the modern football rating core
Build an expected-points surface `EP(down, distance, yardline)` from historical play values (next-score ownership). Then `EPA_play = EP_end − EP_start` (adjusting for score change). Team EPA/play = rating feature; opponent-adjusted via schedule normalization. **Data: nflverse/nflfastR pbp** (bulk download; iSH needs selective fetch).

**A6. SP+** (Connelly)
`SP+ = f(rating)·(AdjOff + AdjDef)/2` — tempo-free adjusted points-per-play, split offense/defense, opponent-adjusted via iterative normalization, capped for situational garbage time. Template: KenPom-style iteration below, on football play data.

**A7. KenPom-style adjusted efficiency**
`AdjO_i = (RawO_i / Σ_j sched_j)·Σopp` — iterate `AdjEM = AdjO − AdjD` to fixed point (the same damped iteration as SRS, on efficiency rates instead of margins).

**A8. DVOA**
Success-rate-weighted value per play vs league baseline, by down/distance, opponent-adjusted: `DVOA = (Σ w_play·VAP)/Σ w_play − 1` with success = fraction of yards needed on down.

**A9. FPI**
EPA efficiencies + situational covariates (rest, travel, altitude) + market calibration in a regression: `margin ~ Σeff + Σcontext`. The hybrid pattern books copy.

**A10. xG / xT (soccer)**
`xG = logistic(shot features)` fit on historical conversion; `xT = possession-value grid` — value of having the ball at (x,y) = max over actions of ΔP(score soon). Anchor for soccer totals.

**A11. RAPM / EPM (basketball)**
`margin_stint ~ Σ_players (on_i − off_i)·r_i + ε`, ridge-regularized (λ by CV). Separates player from lineup context; EPM adds box-score priors via a second stage.

**A12. Empirical Bayes beta-binomial** (rates: FG%, 3P%, conversion%)
Prior α, β from the league by method of moments on observed rate variance; posterior mean `(α + hits)/(α + β + attempts)`. The principled version of bayes_shrink (§2.5) for binomials.

**A13. Log loss** (the strictly proper score)
`LL = −mean(o·ln p + (1−o)·ln(1−p))`. Minimizing it = honest probabilities. The score books implicitly price; pair with Brier everywhere.

**A14. Opinion pools** (multi-book consensus)
Linear: `P = Σ w_i·p_i`. **Logarithmic: `P ∝ Π p_i^{w_i}`** (geometric mean of implied probs) — log-pool preserves "no disagreement → sharp consensus" and penalizes outlier books exponentially. Weights by validation log-loss.

**A15. Steam & RLM detection**
`velocity = Δprice/Δt` (per minute); `RLM = sign(Δline) = −sign(Δ public bet%)` — the line moves AGAINST the money = sharp fingerprint. Thresholds: steam ≥ 1.5pt/10min on main markets.

**A16. Wong teasers** (the key-number math)
6-point teaser equity comes from crossing both key numbers (3, 7 in football). With margin ~ N(μ, 13.45): `P(cover | teaser leg) = P(margin + adj > 0)`, and the push-mass at ±(3,4,6,7) is what teasers convert to wins. Rule: both legs cross ≥ 2 keys each; historical price ≤ −110 makes it +EV. teaser_mc (§2.1) prices any instance.

**A17. Middles & arbs**
Middle EV = `gap·P(both sides cover) − hold paid`. Arb: `Σ(1/decimal_odds) < 1` across books → guaranteed profit, then account limits (why it's a latency game).

**A18. Dixon-Coles time-decay ξ fitting**
Weighted MLE: maximize `Σ_i e^{−ξ(t_now − t_i)}·log P(score_i | λ, μ, ρ)` — 4-parameter joint optimization (λ, μ, ρ, ξ), ξ typically 0.001–0.003/day in soccer. Grid + Newton on the profile likelihood.

**A19. Karlis-Ntzoufras fitting**
Log-likelihood of the bivariate pmf (§2.5) over match data; constraint λ3 ≥ 0 (shared component = covariance); fit by EM treating W3 (shared goals) as latent, or constrained Newton. Start λ3 ≈ 0.2·min(λ1, λ2).

**A20. Quantile regression** (props without the Gaussian assumption)
Minimize `Σ ρ_τ(y − ŷ)` with pinball loss `ρ_τ(u) = u(τ − 1[u<0])` — fit at τ ∈ {0.10…0.90} → full predictive distribution per player-stat. P(stat > line) read directly off the quantiles. This is the Underdog/prize-pick pricing core.

**A21. ML layer** (logistic / GBM / NN)
Logistic: `P = σ(β·x)` — coefficients ARE readable ratings; the industry baseline everything must beat. GBM: tabular king, watch leakage. NN: pays off where state sequences matter (in-game WP, pbp). **Feature canon with leakage discipline: rest/travel/tz, weather (wind), injury REPLACEMENT quality (not name), referee tendencies, altitude, situational spots — pregame-available information ONLY (the #1 silent killer of backtests).**

**A22. Hierarchical full Bayes**
`team_effect_i ~ N(league_mean, τ²)`, `margin_ij ~ N(effect_i − effect_j + hfa, σ²)`, `τ, σ` learned (posterior sampled). The sampled posterior replaces the closed-form shrinkage weight with full uncertainty propagation; conjugate structure keeps MCMC cheap at n≈32 teams.

---

## APPENDIX B — VERSION LOG (prediction track)

| Ver | What shipped |
|---|---|
| v4.6 | /books map·lines·diff — live sportsbook intel (ESPN keyless, Pinnacle guest) |
| v4.9 | RATING_ATLAS.md — the 60+ system taxonomy; engine_math Part 2 (Shin sketch, Kalman, props, teaser MC) |
| v4.9.1 | /atlas command; DC verified; Kelly growth MC |
| v4.10 | Shin inversion corrected; /predict shin·teaser·props·kalman·live; /xray market X-ray (measured holds) |
| v4.11 | props_optimizer.py (SGP/team/game/kelly/dfs) wired |
| v4.12 | props_deep.py (negbin, biv-Poisson, copula, Bayes shrink) — /props deep |
| v4.13 | engine_math corrected per atlas packet (spread convention, Brier bin-mean, LSQ strengths, CRPS constant); ratings2.py (8 systems, Glicko-2 canonical); calibration2.py (conformal 0.908 ✓); kelly2.py (correlation tax discovered); clv.py; backtest.py (real data, T=7.5 refit) |
| v4.14 | /ratings /calib /kelly2 /clv /backtest wired; /dossier handler in code (activates next daemon restart) |

## APPENDIX C — REFERENCES (the papers behind the engines)

- Shin, H.S. (1993) — Measuring the incidence of insider trading in bookmaker markets (the Shin devig)
- Dixon, M. & Coles, S. (1997) — Modelling Association Football Scores (τ correction, time decay)
- Karlis, D. & Ntzoufras, I. (2003) — Bivariate Poisson models (shared-λ correlation)
- Glickman, M. (2012) — The Glicko-2 system (Illinois volatility algorithm; canonical example reproduced exactly)
- Herbrich, R. et al. (2006) — TrueSkill (Microsoft)
- Kelly, J.L. (1956) — A New Interpretation of Information Rate
- Murphy, A. (1973) — Brier decomposition (reliability/resolution/uncertainty)
- Gneiting, T. et al. (2005) — CRPS closed forms
- Platt, J. (1999) — Probabilistic outputs for SVMs
- Guo, C. et al. (2017) — On Calibration of Modern Neural Networks (temperature)
- Kull, M. et al. (2017) — Beta calibration
- Vovk, V. et al. (2005); Papadopoulos et al. (2002) — Conformal prediction
- Bailey, D. & López de Prado, M. (2014) — Deflated Sharpe Ratio
- Keener, J. (1993) — Perron vector ranking
- Colley, W. (2002) — Colley matrix method; Massey, K. (1997) — Statistical models for ratings
- Rockafellar & Uryasev (2000) — CVaR optimization
- Feller, W. — An Introduction to Probability Theory (gambler's ruin)

## APPENDIX D — COMPANION DOCUMENTS (this workspace)

| File | Scope |
|---|---|
| `RATING_ATLAS.md` | The full 60+ system taxonomy (Parts I–IX), system-by-system |
| `MASTER.md` | The security/OSINT/recon track: command deck, lessons, labs, key slots |
| `LEARNING_PATH.md` | The ethical-hacking curriculum (stages 0–5) |
| Correction packets (2026-10-09, user-authored) | Spread convention, Shin status, LSQ market strengths, Brier bin-mean, CRPS constant — **all merged into §2.1 and verified** |
