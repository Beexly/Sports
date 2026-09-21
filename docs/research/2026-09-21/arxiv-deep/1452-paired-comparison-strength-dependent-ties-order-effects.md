# [1452] Paired comparison models with strength-dependent ties and order effects (arXiv:2505.24783)

**Citation:** Mark E. Glickman (2025). *Paired comparison models with strength-dependent ties and order effects*. arXiv:2505.24783v1 [stat.ME]. URL: https://arxiv.org/abs/2505.24783
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 27 pages incl. appendix figure pages 25–27 — read via pdftotext).
**Verdict:** ADAPT — (a) adopt strength-dependent tie probabilities for GSE's soccer/NHL/boxing/push lanes: Davidson-style tie parameter ν is not constant; the paper's β₁ > 0 formulation lets draw probability rise with the *average strength* of the pair, which fit chess data decisively better (DIC) than constant-tie models; (b) adopt strength-dependent order (home-field) effects — α₁ > 0 means stronger teams exploit home advantage more effectively, and GSE's ATS engine should model HFA as an interaction with team quality, not a flat +2.5 points; (c) adopt the empirical diagnostic used in Section 2 (GAM logit of draw on average rating, controlling for rating difference) as GSE's "does our sport need strength-dependent ties?" pre-test before adding model complexity.

## Research question
Do the probability of a tie and the size of an order effect (e.g., home-field advantage) vary with the *average strength* of the two competitors — and does modeling that variation improve fit? Motivated by chess: draws are more common between stronger players, and white's advantage is better exploited by stronger players.

## Method
Extension of David's (1988) BT-with-ties-and-order-effects model. For outcome Yᵢⱼ ∈ {win, loss, draw} with xᵢⱼ = ±1 encoding the order/white advantage:
- P(win) ∝ exp(θᵢ + xᵢⱼ[α₀ + α₁(θᵢ+θⱼ)/2]/4), P(loss) ∝ exp(θⱼ − xᵢⱼ[α₀ + α₁(θᵢ+θⱼ)/2]/4) — Eq. 6–7
- P(draw) ∝ exp(β₀ + (1+β₁)(θᵢ+θⱼ)/2)
- When α₁ = β₁ = 0 the model collapses exactly to David (1988). IIA preserved: P(win)/P(loss) odds are unaffected by the tie parameters.
- Estimation: alternating conditional maximization (Newton–Raphson multinomial logit on strengths given γ, then on γ = (α₀,α₁,β₀,β₁) given strengths), or fully Bayesian via JAGS/R2Jags Gibbs sampling with N(μₖ, σₖ²) priors — the Bayesian form handles perfect-score players (no finite MLE) and lets GSE seed pre-season priors from power ratings.

## Equations
- Davidson–Beaver order effect: logit P(win) = θᵢ − θⱼ + (α/2)xᵢⱼ (Eq. 2)
- David (1988) tie+order model (Eq. 4): tie term ν·exp((θᵢ+θⱼ)/2), win/loss terms shifted by αxᵢⱼ/4
- Proposed (Eq. 6–7): order effect α₀ + α₁(θᵢ+θⱼ)/2; tie term exp(β₀ + (1+β₁)(θᵢ+θⱼ)/2)
- Strength–Elo link: Rᵢ = 1500 + (400/log 10)·θ̂ᵢ (Section 2)
- Multinomial log-likelihood (Eq. 8); priors (Eq. 9–11); Elo-scale prior conversion μᵢ = (Rᵢ − 1500)/(400/log 10) (Eq. 10)

## Datasets
- Motivation: 19,453 FIDE games (1995–2007), rating difference ≤ 200; GAM analysis (logit of draw on within-pair *average* rating controlling for difference) — Figure 1 shows draw log-odds rising steeply with average rating.
- Fit: US Chess Open 2006–2019, 24,888 games, 6,005 rated + 70 unrated players (treated as distinct player-years), 14 tournaments (Table 1). Six model variants (Table 2) × two priors = 12 fits, JAGS 3 chains × 20,000 iterations (10,000 burn-in, thinned to 6,000), all R̂ < 1.01.

## Exact results / baselines
- **Table 3 (DIC, lower = better):** full model with informative prior (pre-tournament ratings) = **43,821** — substantially better than every alternative (Model 2: 43,956; Model 6/David 1988: 44,658; Model 4, constant tie prob: 44,553). All informative-prior models beat all noninformative-prior models (best: 53,686). Differences >> 2–3 DIC guideline.
- **Table 4 (posterior means, 95% central intervals):** α₀ = 0.363 (0.289, 0.434) — white win-to-loss odds exp(0.363/2) ≈ 1.20 for average players (0.545 vs 0.455 decisive); α₁ = 0.037 (0.000, 0.074) — white advantage grows slightly with strength (evenly matched strong players θᵢ=θⱼ=2: odds 1.244, P(white win) 0.554); β₀ = −0.471 (−0.505, −0.437); β₁ = **0.120** (0.103, 0.138) — decisive positive evidence for strength-dependent ties: draw probability for evenly matched average players = 0.238 vs **0.489** for evenly matched strong players (θᵢ=θⱼ=2). Unrated players much weaker: μ_miss = −3.399.
- Model 4 (β₁ = 0) losing to Model 1 confirms the tie-strength interaction carries real signal beyond the order-effect interaction (Model 3 vs 1: 44,086 vs 43,821).

## Leakage assessment
Clean. Historical tournament games with no forward-looking structure — the paper claims descriptive fit, not prediction. Treat each player-year as distinct (conservative against time continuity). No leakage; GSE must still validate out-of-sample (the DIC advantage is in-sample).

## GSE overlap / corpus position
- Directly extends [1451]'s covariate-BT message: not only do *covariates* matter, but the *size of the home/white effect itself* varies with team quality (α₁ > 0). For GSE's NFL spread model: a flat HFA is misspecified if elite teams cover home spreads at a different rate than bad teams — test via an HFA × strength interaction term in the CBTM of [1451].
- Ties: GSE's NFL push probability and soccer/NHL draw lanes currently use Davidson-style constant-ν. This paper says draw probability should rise with *combined team quality* — in soccer, two strong teams draw more than two weak teams at the same rating difference. Testable on GSE's market data: fit draw rate vs average implied strength.
- The Elo–BT link Rᵢ = 1500 + (400/log 10)θ̂ᵢ connects to [1445]–[1450]'s rating machinery and GSE's own Elo scales.

## Implementation plan (GSE)
1. Pre-test on GSE's soccer/EPL data: replicate the paper's Figure 1 diagnostic — GAM of draw indicator on within-pair average implied strength, controlling for strength difference. If significant (expect yes), proceed.
2. Add β₁-style strength-dependent tie mass to GSE's 3-way outcome model: P(draw) ∝ exp(β₀ + β₁·(sᵢ+sⱼ)/2) where s = team strength; add α₁-style HFA × strength interaction to the spread/ATS model.
3. NFL: test HFA × team-quality interaction on ATS covers; if positive (stronger teams get more home value), incorporate into GSE's home-adjustment module.
4. Use the paper's Bayesian JAGS structure as the template for GSE's pre-season prior seeding (normal priors from prior-season strengths; unrated/new teams get a diffuse lower-mean prior — μ_miss analogue for expansion/QB-change regime shifts).

## Reproducible test
On EPL 2015–2024: fit (i) constant-ν Davidson, (ii) strength-dependent-tie model; compare out-of-sample log-loss on the 3-way match outcome for 2022–2024. On NFL 2010–2023: fit ATS cover model with and without HFA × quality interaction; compare out-of-sample log-loss.

## Numeric gate
Strength-dependent tie model must beat constant-ν Davidson by ≥ 0.005 out-of-sample 3-way log-loss on EPL 2022–2024 AND the β₁ coefficient must be positive with 95% CI excluding 0. NFL HFA × quality interaction: include only if it improves ATS log-loss by ≥ 0.003 on 2018–2023 holdout; otherwise keep flat HFA (parsimony over the paper's α₁, whose chess CI barely excluded 0).

## Improvement experiment
The paper uses a *linear* dependence on average strength (author admits this as a limitation, suggesting monotone splines). GSE experiment: replace linear β₁·(θᵢ+θⱼ)/2 with a monotone spline in average strength and test whether the nonlinearity (e.g., draws spiking only among the elite) improves holdout log-loss — directly implements the author's stated future work and is the highest-expected-value extension.
