# 1800 Stochastic Differential Theory of Cricket: Closed-Form In-Play Win Probability via Brownian and Ornstein–Uhlenbeck Models (arXiv:1908.07372v1)

**Citation:** Santosh Kumar Radha (2019). *Stochastic differential theory of cricket*. arXiv:1908.07372v1. URL: https://arxiv.org/abs/1908.07372v1
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).

## 1. Research question

Can cricket's score progression be modeled as a stochastic differential equation whose parameters have physical meaning (drift = team edge, volatility = unpredictability), yielding a *closed-form* win probability as a function of ball-by-ball game state — in contrast to black-box rating cumulants?

## 2. Dataset / schema

- ODI ball-by-ball data 2005–2017 (England, India, Pakistan, Sri Lanka games).
- State variable: X(t) = NR(t) − RR(t), net run rate per ball minus required run rate per ball, t ∈ [0,T] (T = 300 balls for ODI); typically in ±3.
- Illustrative game: India vs Sri Lanka, 2011 World Cup final (Mumbai).

## 3. Method / model

**Model 1 (Brownian):** dX_t = μdt + σdW_t → X(t) = μt + σW_t ≈ N(μt, σ²t). **Model 2 (wicket shocks):** μ(t) = μ − |μ̄|f(w̄, w_t), where f is the Poisson survival function 1 − Σᵢ₌₀ˣ e^{−λ}λⁱ/i! (λ = w̄ average wickets lost, w_t wickets remaining) — a Poisson perturbation of drift after each wicket. **Model 3 (mean-reverting OU-type):** dX_t = (x₀x₁ − x₀X_t)dt + σdW_t, capturing teams playing harder when ahead (morale effect); solution, mean, variance, and P(win) all closed-form.

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- Model 1: dX_t = μdt + σdW_t; P(X(1)>0 | X(t₁)=α) = ½[1 + erf((1 − μ(1−t₁) − α)/(σ√(2(1−t₁))))]. (Note: the paper's eq 4 for P₁ = P(X(1)>0) = ½[1+erf((1−μ)/(σ√2))] appears to have a sign/normalization slip versus the standard Φ(μ/σ) — flag before reusing; eq 6's conditional form is the usable one.)
- Model 2: dX_t = μ(t)dt + σ(t)dW_t; μ(t) = μ − |μ̄|f(w̄, w_t); f(x,λ) = 1 − Σᵢ₌₀ˣ e^{−λ}λⁱ/i!.
- Model 3: dX_t = x₀x₁ − x₀X_t dt + σdW_t; E[X_t] = X_{t−1}e^{−x₀t} + x₁(1 − e^{−x₀t}); Var[X_t] = σ²/(2x₀)·(1 − e^{−2x₀t}); P(win) closed-form via eq 15 (erf of a mean-reverting term).
- Long-run: lim_{t→1} E[X_t] = x₁, lim Var = σ²/(2x₀) — x₁ is the equilibrium edge, σ²/(2x₀) the equilibrium uncertainty.

Assumptions stated: X(t) as the fundamental stochastic variable; wickets fall as a Poisson process; mean-reversion (morale) dynamics; only usable after first innings (needs RR); drift/volatility fit per team-pair from historical games.

## 5. Features / target

Features: ball-by-ball run-rate differential, wickets remaining. Target: P(X(1) > 0) — chasing-team win probability at each ball. No spread/total analogue (cricket chase is binary outcome).

## 6. Validation design

Fits shown for England (2005–2017 ODIs: μ = −0.2, σ = 1.12 — authors note this is a pooled fit and pair-relative fits are the right use; England vs Pakistan: μ = 0.17), India (Model 3: x₀ = 1.18, x₁ = 0.06), India wicket distribution (mean 7.4, variance 2.11). Demonstration on one game (2011 final). **No out-of-sample predictive validation, no Brier/log-loss, no baseline comparison** — the paper's central methodological weakness.

## 7. Numerical results / baselines

- England ODI 2005–2017 pooled: μ = −0.2, σ = 1.12 (fit to final-ball X₁ distribution).
- England vs Pakistan pair fit: μ = 0.17 (England advantage).
- India Model 3 OU fit: x₀ = 1.18, x₁ = 0.06 (mean/variance-vs-balls fit, Fig. 8 — visually the best of the three models).
- India wickets 2005–2017: mean 7.4 lost/game, variance 2.11.
- 2011 final demonstration: Model 1 P(t) tracks X(t) shape; Model 2 adds sharp probability drops at each wicket with relaxation; Model 3 shows India's true win probability near 0.5 throughout despite negative X(t) — the headline illustration that naive state-reading misleads and the model corrects it.
- No baselines, no accuracy/probability-quality numbers anywhere in the paper.

## 8. Code / data availability

None provided; standard SDE fitting, reproducible from equations.

## 9. Leakage & limitations

- **Zero predictive validation:** one illustrative game, fitted (not predicted) parameters, no proper scoring, no comparison to any baseline (not even Stern 1994, which it cites). This is a formalism paper, not an empirical one.
- **Cricket-specific state variable:** X(t) = NR − RR exists only for chase-format games; the NFL analogue must be constructed (score differential vs. required pace — not trivial).
- **Possible sign error in eq 4** (P₁ formula); verify against the conditional eq 6 before implementing.
- **Stationarity assumption:** μ, σ, x₀, x₁ fit per team-pair from 12 years of pooled data — no time-varying form, no opponent adjustment within the fit.
- **Model 2's "Born–Oppenheimer approximation"** is hand-waved; the wicket-perturbation scheme is heuristic.
- Derivative of Stern (1994) Brownian score model and Polson & Stern (2015) implied volatility — both cited; check corpus coverage before claiming novelty.

## 10. GSE overlap

The corpus's in-game work (1799's per-minute MOBA models, 2207.05114's Bayesian in-game NBA probabilities) is machine-learning based. **No ledger derives in-play win probability from a continuous-time stochastic process with closed-form solutions.** The OU mean-reversion primitive (teams press harder when ahead — the momentum/morale effect) and the Poisson-shock perturbation of drift (Model 2) are both new structural ideas to the corpus, and both map to NFL in-game modeling: score-differential process with time-varying drift, plus discrete shocks (turnovers, injuries, weather shifts) modeled as drift perturbations. Derivative of Stern/Polson-Stern lineage, but the OU extension + shock-perturbation recipe is the transferable part.

## 11. GSE implementation spec

1. **NFL in-play SDE:** define X(t) = (current score differential) − (required pace differential); fit team-pair OU parameters (x₀, x₁, σ) from 2010–2024 play-by-play; closed-form P(win|t) from eq 15 becomes a physics-based alternative/complement to GSE's ML in-play model.
2. **Discrete-shock layer:** port Model 2's Poisson perturbation — turnovers and in-game injuries perturb μ(t) downward/upward with relaxation (the paper's wicket-drop probability dip is exactly the "pick-six shock" shape GSE's live product needs).
3. **Volatility as a feature:** σ per team-pair is an "implied volatility of the game" (Polson–Stern sense) — usable for totals modeling: high-σ matchups widen the total distribution.
4. Cost: ~1 week (play-by-play fitting + validation the paper never did).

## 12. Reproducible test

Dataset: NFL 2015–2024 play-by-play (nflverse). Fit OU parameters per team-pair on 2015–2022; predict in-play win probabilities on 2023–2024; score with Brier/log-loss vs GSE's current in-play model and vs a naive score+time baseline. Success gate below.

## 13. Acceptance / rejection gate

**Adopt the SDE in-play model if** its 2023–2024 in-play Brier beats the naive score-and-time baseline by ≥0.005 *and* matches or beats GSE's current ML in-play model on log-loss; **adopt only the shock-perturbation layer if** the full model ties but the turnover-shock response improves probability calibration in the 5 minutes after turnovers. **Reject** if it can't beat the naive baseline — the paper's lack of any validation means the formalism may not survive contact with NFL data, and GSE must not ship unvalidated physics.

## 14. Improvement experiment

**Score-and-clock OU with possession-valued drift:** the paper's X(t) ignores *who has the ball*. Extend Model 3 with a possession-dependent drift term μ_poss(t) (offensive efficiency of the possessing team × time remaining) so the mean-reversion target x₁ becomes clock- and possession-aware. Hypothesis: this fixes the paper's weakest assumption (constant drift) and is where the NFL version can beat the cricket original. Test: possession-aware OU vs plain OU on 2023–2024 in-play Brier; success = ≥0.003 gain. Also fit σ as a function of matchup (pass-heavy vs run-heavy) and test whether implied σ predicts total-market residuals — a direct totals-modeling application the paper never attempts.

**Verdict:** ADAPT
