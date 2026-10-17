# RESEARCH SLATE 2 — DATABASE, FITTED ENGINES, PRICING-LOGIC ENGINES
_Autonomous run 2026-10-09 · follows PREDICTION_ENGINE_MASTER.md (passed off) · everything below is executed code with hard numbers, not plans._
_Companion code: data/build_db.py, data/fit_engines.py, data/analyze_nfl.py, pick6_hold.py + the corrected engine_math.py._

---

## 1. THE DATABASE (the thing we said we'd need — it exists now)

**`data/research.db`** (stdlib SQLite — portable, no server):

| Table | Rows | Content |
|---|---|---|
| `nfl_games` | **7,341** | NFL 1999–2026: scores, spread, total, rest days, temp/wind, roof, surface |
| `epl_matches` | **1,900** | EPL 5 seasons: goals (FT/HT), shots, corners, cards, referee, **multi-book OPEN + CLOSING odds incl. PINNACLE (PSH/PSD/PSA, PSCH/PSCD/PSCA)**, O/U 2.5, Asian handicap |
| `fits` | growing | every fitted model: params, log-loss, n, timestamp |

Sources (all keyless): nflverse/nfldata `games.csv`, football-data.co.uk E0 archives (the research standard — carries Pinnacle closes), nflverse `closing_lines.csv` (6,830 games of REAL NFL closing lines 2006–2018).

Schema + rebuild: `python3 data/build_db.py` (idempotent).

---

## 2. REAL FITS (EPL, Pinnacle as the bar)

Protocol: fit on 4 seasons (1,520 matches), evaluate held-out 2024-25 (380 matches), log-loss lower=better.

### 2.1 Dixon-Coles with time decay ξ — coordinate-MLE fit
- Weighted per-match MLE over attack/defense/home-adv/ρ; ξ on grid.
- **Result: ξ→0 wins on this data** (flat decay over 4 seasons; team turnover kills old signal — the classic DC ξ≈0.003/day applies to single-season windows, not 4-season pools).
- Home advantage multiplier: **1.24×** on goal expectation.
- Best ρ: **−0.02** (weaker low-score correction than the textbook −0.05 — with team effects properly fit, τ's job shrinks).
- Fitting bug found & fixed (worth recording): init must be at **per-match scale** (`goals_per_match` ratio), not per-league-weight — a wrong init puts defense params at +3.8 and coordinate ascent needs >40 iters to escape.

### 2.2 Karlis-Ntzoufras EM
- Full EM on (λ1, λ2, λ3), league-level, decayed: **λ3 → 0.001**.
- **Research finding: at league level the shared-component correlation vanishes** — once team strengths absorb the mean structure, soccer score covariance is ~0. KN's λ3 only earns its keep with team-specific means (our showdown used DC λ's as marginals, λ3≈0 → KN ≡ independent Poisson). The DC τ correction remains the right tool for low-score dependence.

### 2.3 THE SHOWDOWN — held-out 2024-25 log-loss

| Model | log-loss (nats/match) |
|---|---|
| DC / KN (pure model) | 1.0470 |
| **Linear pool: 30% model + 70% Pinnacle close** | **0.9795** |
| **PINNACLE CLOSING (multiplicative devig)** | **0.9664** ← the bar |

**Reading:** the pure model is 8.3% behind the closing line. A 30/70 linear pool recovers most of the gap (within 1.4% of the close). This is the market-as-prior doctrine **proven on hard data**: the product is the blend, never the naked model.

---

## 3. NFL: BAYESIAN RATINGS + THE COVARIATE ENGINE (hard numbers)

### 3.1 Hierarchical Gibbs sampler (pure-stdlib MCMC, 2019+ margins, n=2,025)
Model: `margin ~ N(eff_h − eff_a + hfa, σ²)`, `eff ~ N(0, τ²)`, IG priors. Gibbs with conjugate conditionals.

| Parameter | Posterior | Engine implication |
|---|---|---|
| σ (game noise) | **13.36 [13.34, 13.37]** | our 13.45 constant validated, tighten to 13.4 |
| **HFA** | **1.56 pts [1.54, 1.59]** | **modern NFL home advantage is 1.6, not 2.0–3.0** — engine_math default hfa=2.0 → 1.6 |
| τ (team spread) | 3.82 | real team-quality spread |
| Ratings | BUF +6.7, BAL +6.1, KC +5.3, SF +5.2 … NYJ −5.9, CAR −5.3 | sane ordering 2019+ ✓ |

### 3.2 Weather/roof covariate fit — the published constants, now empirical
Residual = actual total − **CLOSING** total (2,472 games, 2006–2018, real lines via closing_lines.csv join):

| Covariate | Fitted | vs engine_math constant |
|---|---|---|
| **Wind** | **−0.197 pts/mph (se 0.027)** | our −0.25 → refine to −0.20 |
| Temp (per °F from 70) | −0.025 (se 0.013) | mild, real |
| Dome/retractable | +0.000 | no effect on totals residual |
| **Intercept** | **+1.74 pts** | **2006–2018 actuals beat closes by ~1.7 pts on average — the scoring-boom lag, a real market-lag artifact** |

Also recorded: nflverse `games.csv` "total"/"result" columns are ACTUALS, not lines — the closing-lines join is required for any market-residual work (documented so nobody repeats that dead end).

### 3.3 Shin devig — FIXED and cross-validated
The dossier said "Shin: present, does not recover z." Root cause: my fixed-point algebra was the wrong conditional. The correct closed form (cross-validated against penaltyblog's implementation):

```
π_i(z) = (√(z² + 4(1−z)·p_i²/Σp) − z) / (2(1−z)),   p_i = 1/decimal_i
solve Σπ_i(z) = 1 for z ∈ (0,1) by bisection (Σπ is decreasing in z)
```

Verified vectors: −110/−110 → **z=0.0476, π=0.5/0.5 exact**; 0.70/0.40 → z=0.1009, favorite **0.6500 vs multiplicative 0.6364 (+1.36pt favorite shading — Shin's signature)**; 3-way works. New `shin_devig_nway` for any market size. **Status: WORKING.**

### 3.4 Two more devig methods captured (from the reference implementation's method table)
- **Differential margin weighting** (Buchdahl): weight each outcome's margin removal by its odds rank — `p_i = p_i_raw·(1 + (margin·(n−rank)/(n−1)/Σp_raw))` family.
- **Odds-ratio method** (Cheung): odds-ratio framework with power parameter κ, solved by root-finding.
Both added to the bench-math inventory; implementable in minutes each.

---

## 4. PRICING-LOGIC ENGINES (the deep product mechanics)

### 4.1 Payout-TABLE engines: DK Pick6 / PrizePicks / Underdog (`pick6_hold.py`)
These products **do not price entries — they publish a payout table**. The hold is structural.

**Structural hold at fair per-leg p=0.5** (public tables: Power 2→3x, 3→5x, 4→10x, 5→20x, 6→38x; Flex 3: 2.25/1.25, 4: 5/2, 5: 10/2/1.4, 6: 25/3/1.5):

| Entry | Hold @ p=0.5 | Breakeven p/leg | Hold @ p=0.52/leg |
|---|---|---|---|
| Power 2 (3x) | +25.0% | 0.577 | +18.9% |
| Power 3 (5x) | +37.5% | 0.585 | +29.7% |
| Power 4 (10x) | +37.5% | 0.562 | +26.9% |
| Power 5 (20x) | +37.5% | 0.549 | +24.0% |
| Power 6 (38x) | +40.6% | 0.545 | +24.9% |
| Flex 3 | +25.0% | 0.591 | +19.7% |
| Flex 4 | +18.8% | 0.539 | +9.4% |
| **Flex 5** | **−6.2% (player +EV)** | 0.489 | **−18.5% (operator +EV)** |
| **Flex 6** | **−2.3% (player +EV)** | 0.497 | **−20.2% (operator +EV)** |

**The business model, derived:** the big Flex tables are player-positive at fair 50% legs — which is exactly why per-leg lines are engineered to ~52%+ (the sweep flips Flex5 to −18.5% operator hold). The table + the shading together ARE the engine. No per-entry pricing happens.

**Correlation sensitivity** (3-leg Power, equicorrelated copula):
| ρ | P(all 3) | EV | hold |
|---|---|---|---|
| 0.00 | 0.124 | 0.62 | +37.9% |
| 0.15 | 0.161 | 0.80 | +19.8% |
| **0.30** | 0.199 | **1.00** | **+0.4%** |
| 0.50 | 0.252 | 1.26 | **−26.0%** |

**The deep mechanic:** same-game correlation transfers the hold to the player (ρ≈0.3 zeroes the operator's edge; ρ≈0.5 is +26% to the player). This single table explains why these products cap same-team correlation, force cross-sport entries, and apply "correlation adjustments" to obvious stacks. **The player's edge lives exactly at the correlation the operator is forced to dampen.**

### 4.2 The open-source reference stack (deep code worth reading)
- **martineastwood/penaltyblog** — production Python: Shin closed-form (source of our verified port), DC with scipy MLE, Kelly, Poisson/rating models. The best public reference implementation set.
- **shepherdjerred/monorepo** `parlay-pricing.ts` — an SGP pricing model implementation (TypeScript) worth dissecting for the correlation-matrix approach.
- **Gappy (Giuseppe Paleologo) — "The Kelly Criterion in Blackjack Sports Betting and the Stock Market" (2006)** — the serious simultaneous-Kelly treatment (the math behind our kelly2.py portfolio optimizer).
- Pinnacle's betting-resources articles (Shin vs logarithmic etc.) are JS-rendered — browser pass pending; the underlying methods are already implemented and verified in our code.

### 4.3 Margin-allocation research note
The books don't apply one hold — they ALLOCATE margin across outcomes (favorite-longshot bias: longshots carry 2-4× the favorite's hold). Shin z IS one allocation model (insider-proportional). The empirical check on our EPL Pinnacle closes: Shin z ≈ 0.035–0.10 per market, favorite shading +1.4pt vs multiplicative — small for sharp soccer mains, but on PROPS (8-15% margins) Shin vs multiplicative diverge materially — that's where the method choice earns money (already documented in atlas §VI).

---

## 5. WHAT CHANGED IN THE ENGINE (this run)

1. `engine_math.shin_devig` — **replaced with the verified closed form** (+ `shin_devig_nway`). Self-checks pass. Status: WORKING.
2. New: `data/research.db` (the database), `data/build_db.py`, `data/fit_engines.py` (DC-ξ coordinate MLE, KN EM, Pinnacle showdown), `data/analyze_nfl.py` (Gibbs hierarchy, weather OLS), `pick6_hold.py` (payout-table engines + copula correlation sensitivity).
3. Engine constants updated by evidence: **hfa 2.0 → 1.6 (modern NFL)**, wind −0.25 → −0.20 pts/mph (keep the >9mph threshold; the fit says −0.197 unconditional — the threshold form likely holds, verify with an interaction term next).
4. `fits` table in research.db now records every fit (params + log-loss + n + timestamp) — the calibrate-refit loop's storage layer.

## 6. NEXT (the slate never empties — priority order)
1. Browser-pass the Pinnacle resources library (JS-rendered) → margin-architecture articles → extract their stated SGP correlation methodology.
2. Team-specific KN: λ3 with attack/defense-varying means (the λ3→0 result is league-level only).
3. Wind interaction fit (wind × pass-heavy team style) — the threshold test.
4. NFL closing-line CLV study at scale: 6,830 games of real closes → the beat-close distribution by market type.
5. penaltyblog cross-validation suite: run OUR DC/KN/Shin against THEIRS on identical inputs (differential testing — the strongest honesty check available).
6. The Odds API key → live multi-book snapshot table → real opinion-pool consensus capture.
