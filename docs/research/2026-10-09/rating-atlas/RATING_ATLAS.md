# 📐 THE RATING & PREDICTION ATLAS
_Every engine behind the books — what it means, the equation, where it's used, how to compute._
_Companion code: engine_math.py (implemented ones marked ⚙️). This file = the full taxonomy._

---

## PART I — HEAD-TO-HEAD RATINGS (who beats whom)

**1. Bradley-Terry (1952)** ⚙️ — the atom everything below is made of.
P(i beats j) = π_i/(π_i+π_j). Fit by MLE (MM algorithm): iterate π_t = W_t / Σ_o 1/(π_t+π_o).
Used: offline ratings, matchup pricing. Gotcha: no margins, no time dimension.

**2. Elo** ⚙️ — BT run online. R' = R + K(S−E), E = 1/(1+10^((Rb−Ra)/400)).
The 400-point scale IS the logistic curve. Variants that matter:
margin multiplier K·(1+f(margin)) — FiveThirtyEight NFL; home-field addend; regression-to-mean between seasons; drift for new players.

**3. Glicko** — Elo + uncertainty: each rating carries RD (rating deviation).
RD shrinks per game played, grows with idle time. Update integrates over opponent's RD.
Use when activity is irregular. Glicko-2 adds per-player **volatility σ** — separates consistently wild from stable performers.

**4. TrueSkill (Microsoft)** — Bayesian factor graph: skill ~ N(μ,σ²), performance ~ N(skill,β²).
Message passing updates both mean AND uncertainty exactly; handles teams, draws, partial play.
The mathematically correct Elo replacement — heavy but principled.

**5. Thurstone-Mosteller** — BT's Gaussian twin: P = Φ((s_i−s_j)/√(2σ²)).
Choose logistic (BT) when tails matter; normal (Thurstone) when they don't. Empirically near-identical.

**6. Plackett-Luce** — BT for full rankings (finish ORDER, not just winner): P(order) = Π π_first/Σ_remaining.
Use: races, fantasy finish positions, prop leaderboards.

**7. Colley** — linear algebra, closed form: (C+I)·r = b, C_ij = −n_ij (games played), b_i = 1 + ½(w−l).
Solve by matrix inversion. Fast, margin-free, transparent. Weakness: ignores point diffs entirely.

**8. Massey** — least squares on point differentials: Mr = p with M_ij = −n_ij, diagonal = games.
Decomposes into offense/defense ratings automatically. The margin-aware Colley.

**9. SRS** — Simple Rating System: team = own margin avg + opponent-strength adjustment, iterated to convergence.
The "schedule strength done right" baseline every football model inherits.

**10. RPI** — ¼·WP + ½·opponents' WP + ¼·opponents' opponents' WP. Selection heuristic, weak predictor — know it to avoid it.

**11. Pi-Ratings** — additive update with learning rate: r' = r + α(observed − expected), decayed.
Cheap online alternative to Elo with symmetric attack/defense tracking.

**12. PageRank-as-rating** — random surfer on the "who beat whom" graph; win magnitude as edge weight.
Surprisingly strong on schedules with irregular connectivity.

**13. Keener's method** — the general matrix framework BT lives inside: A·r = λr eigenvector on skew-symmetric pairing matrix.

---

## PART II — SCORE & POINT MODELS (what the scoreboard reads)

**14. Poisson** — P(k;λ) = e^−λ λ^k/k!. Goals/low-score sports. λ from attack·defense/league mean.

**15. Dixon-Coles (1997)** ⚙️ — Poisson + τ low-score correction + exponential time decay (weight = e^−ξ·days).
τ: 0-0 → 1−λμρ, 1-0 → 1+μρ, 0-1 → 1+λρ, 1-1 → 1−ρ (ρ≈−0.05).
The grandparent of every serious soccer total/handicap model. Full grid → margin + total ladders.

**16. Karlis-Ntzoufras bivariate Poisson** — shared covariance component: X = X1+X3, Y = X2+X3.
Captures score correlation DC's τ approximates — cleaner, harder to fit.

**17. Negative binomial** — Poisson with gamma-mixed λ: variance > mean. Points sports are overdispersed; NB fixes Poisson's under-spread.

**18. Skellam** ⚙️ — P(diff of two Poissons) = e^−(λ+μ)(λ/μ)^{k/2} I_|k|(2√(λμ)).
The EXACT spread/handicap distribution for Poisson sports. No simulation needed.

**19. Normal-margin model** ⚙️ — margin ~ N(spread, σ=13.45 NFL empirical), total ~ N(μ, σ=20).
Φ(spread/13.45) = win prob. THE alt-line engine: books slide μ for each alternate and add a margin tax.
Key numbers (football): 3, 6, 7 — push probabilities cluster there; teasers live on them.

**20. Pythagorean expectation** — Win% = RS²/(RS²+RA²). Exponents: MLB 1.83, NFL 2.37, NBA ~14 (i.e., near-linear).
**Pythagenpat**: exponent = 1.5·log₁₀(RS+RA)/avg. The "true strength vs luck" separator in any sport.

**21. Monte Carlo simulation** — sample the game 10k-1M× from component distributions, count outcomes.
Where correlation enters (see Part VIII) and where in-game state transitions live.

**22. Copulas** — bind margin & total distributions with correlation ρ: Gaussian copula C(u,v)=Φ_ρ(Φ⁻¹u,Φ⁻¹v).
Independent sampling misprices EVERY correlated market (teasers, SGP, alt-total+spread combos).

---

## PART III — EFFICIENCY & MODERN TEAM METRICS

**23. EPA (Expected Points Added)** — football: play value from down/distance/field-position models; team EPA/play = modern rating core. Open: nflfastR/nfl_data_py.

**24. SP+ (Bill Connelly)** — tempo-free adjusted efficiencies (points per play), split offense/defense, opponent-adjusted, situational caps. The public closest to a CFB power-rating engine.

**25. KenPom-style AdjE** — AdjO/AdjD via iterative schedule normalization → AdjEM = AdjO−AdjD. The template for "adjusted efficiency" everywhere.

**26. DVOA** — success-rate-weighted value over average, down-by-down, opponent adjusted. Football Outsiders' engine.

**27. FPI (ESPN)** — EPA efficiencies + situational covariates (rest, travel, altitude) + market calibration. The hybrid "ratings + context regression" pattern books copy.

**28. xG / xT (soccer)** — chance quality from shot features (logistic on location/body/assist); xT = possession-value grids. Book soccer models anchor on xG aggregates.

**29. RAPM / EPM (basketball)** — Regularized Adjusted Plus-Minus: ridge regression on lineup stints vs point margin. Separates player from lineup context; the modern NBA front-office base.

---

## PART IV — BAYESIAN MACHINERY (the deep layer)

**30. Hierarchical shrinkage** — ratings ~ N(league mean, τ²): partial pooling = principled regression to mean. Small-sample teams pulled to center automatically.

**31. Empirical Bayes** — estimate the PRIOR from the data (e.g., league-wide distribution of 3P%), then update each team. Beta-binomial for rates: posterior mean = (α+hits)/(α+β+attempts).

**32. Kalman filter / state-space ratings** ⚙️ — rating = hidden state: R_t = R_{t−1} + w_t (process noise = form drift), observed through game results with noise. Gives you rating AND uncertainty AND "form" — formally. The engine under dynamic DC and in-play models.

**33. Market-as-prior** — the closing line is the single best probability estimate in existence. Bayesian blend: P = w·P_model + (1−w)·P_close. Any model that can't beat this blend isn't earning its keep.

---

## PART V — CALIBRATION & EVALUATION (the honesty layer)

**34. Brier score** ⚙️ — mean (p−o)². Murphy decomposition: BS = RELIABILITY − RESOLUTION + UNCERTAINTY.
Reliability = do your 60s win 60%? Resolution = do you separate outcomes at all? UNC = base-rate variance floor.

**35. Log loss** — −mean(o·ln p + (1−o)·ln(1−p)). The strictly proper score = exactly what books implicitly price. Minimizing log loss = honest probabilities, not just right picks.

**36. ECE + reliability diagrams** — bin predictions, plot observed vs claimed frequency. The picture every engine must earn.

**37. Isotonic regression (PAV)** ⚙️ — nonparametric recalibration, monotonic; pool-adjacent-violators. The final layer on production engines.

**38. Platt scaling** — logistic fit on model logits: a = σ′(A·logit + B). Two parameters, robust with little data.

**39. Temperature scaling** — divide logits by T. The single-knob calibration for neural nets.

**40. Beta calibration (Kull)** — 3-parameter family that unifies Platt + isotonic behavior; theoretically optimal for calibrating classifiers that output probabilities.

**41. Conformal prediction** — distribution-free prediction INTERVALS with coverage guarantees (1−α). The modern answer to "how sure is the model, honestly" — no distributional assumptions.

**42. CLV (Closing Line Value)** — (your price − closing price) in fair-probability terms. The ONLY long-run skill metric in betting. Positive CLV → profit follows; negative → you're the fish with extra steps.

**43. Unit tracking + t-test** — record in units, test against break-even: t = (profit/σ_units)·√n. Know your sample size before believing your hot streak.

---

## PART VI — MARKET MATH

**44. Devig methods** ⚙️ (multiplicative/additive/power/Shin done):
- **Shin's method (1993)** — the elite one: models insider trading in the book; solves for z (informed-money proportion) from Σ of implied probs. recovers true probabilities books actually use: π_i from iterative z·(π_i²/Σπ²) system.
- **Logit/power devig** — power method done in engine_math.
- When margins are small, all agree; in props (15%+ margins), Shin vs multiplicative DIFFER MATERIALLY.

**45. Opinion pools** — combining books: linear pool = Σw·p_i; **logarithmic pool** = Π p_i^{w_i} (geometric mean of implied probs) — log-pool preserves "no true disagreement → sharp consensus" and is the standard for market consensus capture.

**46. Steam & RLM detection** — line velocity (Δ price/minute) + divergence from public bet-% (RLM = line moves AGAINST the public % = sharp fingerprint). Mechanical, watchable, wired into our /books diff.

**47. Margin policy architecture** — differential hold: main lines ~4%, alternates +1-2% per step, props 8-15%, parlays compounding. MEASURED live via our feeds, not asserted.

**48. Wong teasers** — cross the key numbers (3 & 7 in football): teaser equity = Σ push-adjusted cover probs from the Normal-margin model; 6-point teasers through both keys historically beat their price.

**49. Middles & arbs** — middle: two lines both covering (gap × P(gap)); arb: Σ(1/decimal) < 1 across books → guaranteed profit, then account limits. Know why it exists.

---

## PART VII — SIZING & RISK

**50. Kelly criterion** ⚙️ — f* = (bp−q)/b; derivation: maximize E[ln(1+fX)].
Full Kelly maximizes growth AND drawdown pain. The growth curve is concave — overbetting INVERTS profit (proven in our MC demo: 2× Kelly = negative growth).

**51. Fractional Kelly** — ½ Kelly ≈ efficient frontier point: 75% of growth, ~50% of variance. The professional default.

**52. Simultaneous Kelly** — independent bets: f_i ∝ edge_i/variance; correlated (same game): joint numerical optimization over the covariance matrix. Most bettors' silent killer = overlapping correlated Kelly positions.

**53. Risk of ruin** — repeated bets at edge e, even-money: P(ruin) ≈ ((1−e)/(1+e))^(B/U) for bank B, unit U. Know the number before the streak starts.

**54. Contest portfolio theory (DFS)** — cash games = minimize variance (floor projections); GPP = maximize ceiling × leverage (ownership-adjusted): EV ∝ f(ceiling)·g(1/ownership%). Correlation structures (stacking) = copulas again.

---

## PART VIII — THE ML LAYER

**55. Logistic regression** — the workhorse: coefficients ARE readable ratings; industry baseline everything must beat.
**56. Gradient boosting (XGBoost/LightGBM)** — tabular king: features → nonlinearity without feature engineering; watch leakage.
**57. Neural nets** — pay off where state sequences matter (in-game win probability, play-by-play).
**58. Quantile regression** ⚙️ — props done right: full distribution per player-stat, P(stat > line) not a point guess. Underdog/prize-pick pricing = this + a margin.
**59. Ensembling/stacking** — combine ratings + market + ML via a meta-learner; the market prior (Part IV #33) is one of the ensemble members, always.
**60. Feature canon** — rest/travel/timezone, weather (wind>total impact), injury replacement quality (not name), referee tendencies, altitude, situational spots (schedule spots, letdowns) — with LEAKAGE discipline (only information pregame-available; the #1 silent killer of backtests).

---

## PART IX — WHAT'S ACTUALLY PROPRIETARY (the honest reverse-engineering verdict)

The EQUATIONS are public — every one above is textbook/published. The moats are:
1. **Data latency** — scout/tracking feeds beat public data by seconds (Sportradar/Genius/IMG Arena).
2. **Limit structures** — who gets to win (sharp accounts at Pinnacle, promos for the rest).
3. **Consensus capture speed** — aggregating rival prices faster than competitors.
4. **Projection distribution quality** (DFS) — the point estimate is easy; the VARIANCE and tails are the product.
5. **The covariate engine** — which situational features actually carry signal after shrinkage (FPI-style): buildable, testable, and exactly what our class ladder produces.

**The class ladder (final form):**
data (public APIs, wired) → devig baseline (⚙️) → BT/Elo ratings (⚙️) → Dixon-Coles/Normal-margin ladders (⚙️) → ML + covariates → calibration (⚙️ PAV done) → market comparison (CLV) → Kelly sizing (⚙️).

**Implementation status (verified 2026-10-08):** ⚙️ = running in engine_math.py: BT fit, Elo, DC grid+τ, alt-line ladder, Skellam, Brier decomposition, isotonic PAV, Kelly + growth MC, Shin devig, Kalman ratings, quantile props, teaser MC, CRPS, deflated Sharpe, market inversion, HMM regimes, PIT histogram. Two bugs fixed 2026-10-08 (missing math imports in Part 4, non-square solver in market_strengths). Next builds: copula teasers (teaser_mc uses market-factor correlation, not copulas), live in-game engine wiring, hierarchical shrinkage.
