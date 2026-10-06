# [1498] Modelling Athletic Ageing Relative to an Estimated Performance Envelope (arXiv:2608.06635v2)

**Citation:** Lee, D.-J. (2026). *Modelling Athletic Ageing Relative to an Estimated Performance Envelope*. arXiv:2608.06635v2 [stat.AP]. URL: https://arxiv.org/abs/2608.06635. Code: https://github.com/idaejin/race-star-code
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 18-page main text; supplementary skimmed for diagnostics).
**Verdict:** ADAPT — RACE/STAR: a two-stage framework that estimates a population performance envelope (age-conditional C95 via GAMLSS) and models each athlete as a geometric transformation (level α, timing γ, tempo δ) of that envelope inside a nonlinear mixed-effects hierarchy; the level–tempo correlation is estimated inside the random-effect covariance, not from post-hoc fits. Directly ports to GSE as NFL aging curves: per-player age curves relative to a positional ceiling, with honest identifiability diagnostics for short careers.

## 1. Research question
How should individual athletic ageing be characterized when careers are short, observations irregular, and the scientific target is proximity to peak attainable performance (a ceiling) rather than the mean trajectory? Can level, timing, and tempo of ageing be separately identified, and is the level–tempo association recoverable under sparsity?

## 2. Dataset / schema
MLB Statcast via Baseball Savant, seasons 2015–2021. Two metrics chosen to stress-test the geometry: sprint speed (continuous, ft/sec; near-linear envelope) — 1,021 athletes / 3,521 observations for Stage 1, 610 athletes (nᵢ ≥ 3) for Stage 2, median 5 seasons (IQR 3–6); bolt rate (proportion of competitive runs > 30 ft/sec, unit interval; curved envelope) — 427 / 967 for Stage 1, 141 athletes for Stage 2, median 4 seasons (IQR 3–5). Age range 20–40. Public data; reproduction code at the GitHub link.

## 3. Method / model
- **RACE (Relative Aging Curves via Envelopes), Stage 1:** estimate the population envelope f(x) = F⁻¹_{Y|x}(τ), τ = 0.95 (C95), via GAMLSS with smooth age effects on distributional parameters: Box–Cox Cole–Green (BCCGo) for sprint (GAIC 12,112 vs 12,156 for Normal; C95 coverage 95.0%), Simplex for bolt (GAIC −411,854 vs −401,441 GB1 vs −362,610 BE; weighted coverage 94.4%). Monotone-decreasing mean constraint pbm(mono="down").
- **STAR (Shape Translation And Rotation), Stage 2:** yᵢ(x) = αᵢ + f̂((x − γᵢ)/exp(δᵢ)). α = level (vertical shift vs ceiling), γ = timing (horizontal age shift), δ = tempo (log time-scale; δ > 0 slows decline). Sprint uses Gaussian errors (γ fixed at 0); bolt uses a Simplex likelihood with opportunity weights, logit link.
- Hierarchical: (αᵢ, δᵢ)ᵀ ~ MVN(μ, Σ) (or (α,γ,δ) for bolt); the level–tempo correlation ρ_αδ is a parameter of Σ. Estimation by Laplace approximation in TMB; athlete summaries are BLUPs.
- **Identifiability geometry:** Proposition 1 — under an exactly linear envelope, α and γ are confounded (only effective intercept + slope identified). Proposition 2 — under a curved envelope with ≥3 distinct ages, (α,γ,δ) are locally identifiable near δ = 0. Practical diagnostic: linear-fit RMS residual of f̂ vs Stage-2 residual scale (sprint: 0.011 ft/sec vs σ̂ = 0.42; one-year timing shift SNR ≈ 0.3 → fix γ = 0).
- Reparameterizations: deficit–slope form μᵢ(x) = Lᵢ + Sᵢ(x − x₀), Lᵢ = f̂(x₀) + αᵢ, Sᵢ = b·e^{−δᵢ}; λᵢ = e^{δᵢ} = calendar years per envelope-age year; RLIᵢ = 100·exp(δᵢ − μ̂δ) (relative longevity index, derived display only).

## 4. Equations & assumptions
- Envelope: f(x) = F⁻¹_{Y|x}(τ), τ = 0.95. (1)
- STAR: yᵢ(x) = αᵢ + f̂((x − γᵢ)/exp(δᵢ)). (2)
- Sprint: yᵢⱼ = αᵢ + f̂(xᵢⱼ/exp(δᵢ)) + εᵢⱼ, ε ~ N(0, σ²_ε). (3)
- Bolt: Yᵢⱼ ~ SIMPLEX(μᵢⱼ, σ), logit(μᵢⱼ) = αᵢ + f̂((xᵢⱼ − γᵢ)/exp(δᵢ)). (4)
- RLIᵢ = 100·exp(δᵢ − μ̂δ). (5)
- Assumptions: (1) the C95 envelope is the right reference (vs mean); (2) single-MVN random effects; (3) Stage-1 envelope treated as fixed plug-in (bootstrap sensitivity checked for sprint only); (4) selection into continued play unmodeled; (5) ρ_αδ < 0 is not interpreted as a biological trade-off.

## 5. Features / target
Features: athlete age. Targets: sprint speed / bolt rate; estimands are the STAR coordinates (α, δ[, γ]) in Functional Ageing Space and the population covariance Σ.

## 6. Validation design
Three simulation questions: (Q1) can hierarchical estimation recover ρ_αδ under sparsity (nᵢ ∈ {3,5,8})? Yes — Laplace NLME recovers it; post-hoc correlations of separate fits get the wrong sign or ~0. (Q2) geometry → identifiability: under linear truth γ collapses to fixed; under quadratic/Gompertz truth γ is recovered. (Q3) envelope misspecification: curved-truth/linear-fit attenuates ρ̂_αδ and kills timing; level stays stable. Application: sprint vs bolt contrast as the empirical test.

## 7. Numerical results / baselines
- Stage 2 (Table 4): sprint — 610 athletes, μ̂α = −0.94, μ̂δ = −0.20, ω̂α = 2.13, ω̂δ = 0.39, ρ̂_αδ = −0.80, σ̂ = 0.42, timing not identified. Bolt — 141 athletes, μ̂α = 0.60, μ̂γ = 0.23, μ̂δ = −0.46, ω̂α = 3.10, ω̂δ = 0.53, ρ̂_αδ = −0.84, timing identified (ω̂γ > 0).
- Sprint envelope slope b ≈ −0.14 ft/sec/year; effective individual decline b*ᵢ = b·e^{−δᵢ}.
- Stage 1–Stage 2 cluster bootstrap (sprint, B = 199): median ρ̂_αδ ≈ −0.70, percentile interval (−0.83, −0.11) around primary −0.80 — sign stable, interval wide.
- Cross-metric (141 athletes on both): concordance of (α,δ) moderate for level, weak for tempo — FAS coordinates are metric-specific.
- RLI top-tens for sprint and bolt share no names.

## 8. Code / data availability
Code: https://github.com/idaejin/race-star-code (envelope estimation, STAR mixed models, reproduction scripts). Data: MLB Statcast public via Baseball Savant.

## 9. Leakage & limitations
- Proposition 1 is exact-linearity, Proposition 2 local near δ = 0 — the applied near-linear/curved binary rests on the practical diagnostic + Simulation Q2, not a global theorem.
- Two-stage plug-in: f̂ treated as fixed; bolt bootstrap not done (fragile with 3 random effects on n = 141).
- Selection into continued play unmodeled; could attenuate or inflate |ρ̂_αδ|.
- Single-MVN random effects; mixture structure not explored.
- No out-of-sport validation; "transfer requires a scientifically meaningful envelope."

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's player-valuation work has no aging-curve machinery — fantasy/DFS player value is modeled cross-sectionally, and the injury lane (1491 REJECTed, replaced by 1510) covers availability, not age-related decline. No existing ledger builds per-player age curves. This is a new capability, and it fills the exact lane the 1464 REJECT vacated (athletic ageing/injury-adjacent): instead of predicting injuries from biomechanics, model performance decline relative to a positional ceiling.

## 11. GSE implementation spec
- Data: NFL player-season efficiency metrics by position (e.g., yards/route run for WRs, EPA/play for QBs, PFF-style grades) 2010–2025, ages 21–38.
- Build: (a) Stage 1: GAMLSS C95 envelope per position group (BCCGo or similar for positive-continuous metrics; monotone-down constraint); (b) Stage 2: STAR NLME in TMB or a PyMC port — (α, δ) per player, γ only if the envelope is curved (check the paper's near-linearity diagnostic first); (c) read ρ̂_αδ per position — the "do early peakers decline faster?" question answered inside Σ; (d) use BLUP (αᵢ, δᵢ) as features in fantasy/DFS valuation and dynasty trade models.
- Effort: ~2 weeks (GAMLSS via R gamlss as prototype; production port needed).

## 12. Reproducible test
Dataset: WR seasons 2015–2024, target = yards per route run. Metric: out-of-sample RMSE of age-curve predictions for age-30+ seasons (rolling origin: fit on data up to season t, predict t+1). Baseline: static positional age curve (mean curve by age) + player random intercept. Window: rolling 2018–2024.

## 13. Acceptance / rejection gate
ADOPT STAR age curves if rolling-origin RMSE on age-30+ WR seasons beats the static age-curve baseline by ≥5% AND the near-linearity diagnostic is computed and reported (no silent γ fitting). Reject if ρ̂_αδ ≈ 0 (no level–tempo structure — the hierarchy buys nothing) or if the envelope is unstable across bootstrap refits.

## 14. Improvement experiment
Fit a joint multi-metric STAR (e.g., speed metrics + production metrics) with cross-metric random-effect covariance, testing whether tempo estimated from athleticism metrics (which age early and cleanly) improves production forecasts at ages 30+ — this attacks the paper's finding that FAS coordinates don't transfer across metrics by modeling the transfer explicitly.
