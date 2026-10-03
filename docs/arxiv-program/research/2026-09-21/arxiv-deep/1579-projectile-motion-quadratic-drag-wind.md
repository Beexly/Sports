# [1579] Projectile motion in a medium with quadratic drag at constant horizontal wind (arXiv:2206.02397)

**Citation:** Chudinov, P. (2022). *Projectile motion in a medium with quadratic drag at constant horizontal wind*. arXiv:2206.02397v4. URL: https://arxiv.org/abs/2206.02397
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 10 pages, Sections 1–5 + references + Table 1 + 6 figures).
**Verdict:** ADAPT
ADAPT — one sentence: closed-form elementary-function formulas for wind-perturbed projectile range give GSE a fast analytic wind adjustment for punts/field goals, but the constant-horizontal-wind assumption and no-Magnus simplification make it a first-order correction rather than a full trajectory model.

## 1. Research question
Can the classic projectile-with-quadratic-drag problem, extended to a constant horizontal wind, be solved with simple analytical approximations using only elementary functions (no numerical integration), accurate enough to be useful?

## 2. Dataset / schema
No empirical dataset. Validation is against the author's own numerical integration (4th-order Runge-Kutta of system (5)). Example parameter sets (Table 1): badminton shuttlecock V_term=6.7 m/s, k=0.022 s²/m², V0=60; tennis V_term=22, k=0.002, V0=50; golf V_term=32.09, k=0.000971, V0=40 and 60. Wind speeds tested: w = ±10 m/s (golf), −20/−30 m/s (golf), ±3 m/s (shuttle), +10/−19.75 m/s (tennis).

## 3. Method / model
Analytical approximation: (1) work in the wind-relative frame u⃗ = V⃗ − w⃗, which reduces the wind problem to the known no-wind form; (2) use the velocity hodograph u(φ) (Eq. 7) — an exact closed form; (3) approximate the transcendental f(φ) with a quadratic-in-tanφ fit f_a(φ) = α1 tanφ ± α2 tan²φ, matched in value and first derivative at φ0 (Eq. 9); (4) split the trajectory into three φ-intervals (ascent, descent to φ1, steep descent) and integrate in elementary functions (arctan, arcsin, ln) — final formulas (10). All intermediate calculations omitted in paper; only final forms given.

## 4. Equations & assumptions
- Drag model: R = mgkV², k = 1/V_term² (drag constant from terminal velocity).
- No-wind: dV/dt = −g sinθ − gkV²; dθ/dt = −g cosθ/V; dx/dt = V cosθ; dy/dt = V sinθ (Eq. 1).
- Hodograph: V(θ) = V0 cosθ0 / [cosθ · sqrt(1 + kV0²cos²θ0 (f(θ0) − f(θ)))], f(θ) = sinθ/cos²θ + ln tan(θ/2 + π/4) (Eq. 2).
- Quadratures: x = x0 − (1/g)∫V²dθ; y = y0 − (1/g)∫V²tanθ dθ; t = t0 − (1/g)∫V/(cosθ) dθ (Eq. 3).
- Wind: drag acts on relative velocity, R⃗ = −c|V⃗−w⃗|(V⃗−w⃗) (Eq. 4), c = gk; motion equations (5); in u-frame (6) identical in form to no-wind.
- φ = arctan(uy/ux) = arctan(V sinθ/(V cosθ − w)); u0 = sqrt(V0² − 2V0 w cosθ0 + w²); hodograph u(φ) (Eq. 7).
- Wind quadratures (8): x includes explicit −(w/g)∫u/cosφ dφ wind-drift term.
- f_a(φ) approximation coefficients: α1 = 2cotφ0 ln tan(φ0/2 + π/4); α2 = 1/sinφ0 − (α1/2)cotφ0 (Eq. 9 consequences).
- Final trajectory formulas x_i(φ), y_i(φ), t_i(φ) for intervals i=1,2,3 — combinations of arctan/arcsin/ln with constants b1, b2, β0–β2, d0, d1, d, Δ1–Δ4 (Eq. 10).
- Assumptions: constant horizontal wind w; quadratic drag valid for 1×10³ < Re < 2×10⁵; Magnus forces NOT included; projectile launches and lands at same elevation (y=0 impact); k = 0 forbidden (division by zero), but k=10⁻¹² recovers parabolic theory.

## 5. Features / target
Features: V0, θ0, k (or V_term), wind speed w. Target: trajectory coordinates x(φ), y(φ), time t(φ); derived: apex (xa, H, ta), range L, impact angle θd.

## 6. Validation design
Physics paper, no ML splits. Analytical formulas (10) compared pointwise against author's RK4 numerical integration of (5) across three sports projectiles with k spanning a 22× range (0.000971 → 0.022) and wind −30 to +10 m/s. Metric: relative max deviation at any trajectory point.

## 7. Numerical results / baselines
- "The relative maximum deviation of the analytical value (10) from the numerical value (RK4) at any point of the trajectory does not exceed 1%."
- Wind examples: golf V0=40 m/s, θ0=30°, w=+10 tailwind extends range vs w=−10 headwind shortens (Fig. 2); tennis w=+10 vs −19.75 m/s: at −19.75 the ball returns to the throw point (Fig. 6); shuttlecock (k=0.022, highest drag) shows the greatest trajectory asymmetry and approaches a vertical asymptote.
- Baseline: none besides the RK4 reference; paper's contribution is replacing numerical integration with elementary functions.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Constant, purely horizontal wind is a strong idealization: real stadium wind gusts, swirls, and has vertical components; bowl shielding ignored.
- No Magnus/lift — footballs in flight spin and generate lift; punts especially. Paper 1578's C_L machinery would be needed for completeness.
- Quadratic drag assumed over whole flight; a tumbling football's drag regime differs and Re range isn't checked for NFL kicks.
- Flat-earth, same-elevation impact; FG crossbar is elevated (~3.05 m) — minor, adjustable.
- k = 1/V_term² needs a football V_term estimate; paper gives none.
- Educational/methodological aim (undergraduate audience) rather than empirical sports science; no measured data anywhere.

## 10. GSE overlap
Extension, not duplicate. Same gap as 1578 (existing-research-map.md gap #8: "Weather physics for totals — barometric-pressure benchmark exists; no papers on wind physics × stadium geometry × passing efficiency"). Where 1578 supplies air-density physics, this supplies the wind-drift term in closed form. GSE's current wind handling is a catalog metric, not a trajectory correction; this gives an analytic range/headwind-tailwind adjustment for kicks and punts without running an ODE per kick.

## 11. GSE implementation spec
- Implement formulas (10) in `weather/wind_adjust.py`: inputs per kick — launch speed/angle (estimated from charting or fixed archetypes), football k = 1/V_term² (estimate V_term ≈ 28–30 m/s for a kicked football from literature, then calibrate), wind vector w from stadium weather feed decomposed along kick direction.
- Compute wind-perturbed range vs no-wind range → expected-distance delta in yards; use as a feature in FG-make logistic model and punt-distance model.
- Because it's elementary functions, it runs in microseconds — suitable for live/in-game recomputation as wind updates arrive.
- Effort: ~1 day to implement + calibrate V_term against nflverse punt data in calm conditions.

## 12. Reproducible test
Dataset: nflverse 2019–2025 punts (gross yards, hang time where available) + kickoff weather wind speed/direction + stadium orientation. Baseline: mean punt distance per punter. Test: wind-adjusted predicted distance from (10) (holding k fixed, fitted on 2019–2021 calm-wind punts). Metric: RMSE on 2022–2025 windy games (wind ≥ 12 mph). Gate below.

## 13. Acceptance / rejection gate
ADOPT if the wind-adjusted model reduces RMSE by ≥ 1.5 yards vs the punter-mean baseline on the windy-game holdout AND the fitted V_term lands in a physically sane range (20–40 m/s). REJECT if RMSE gain < 1.5 yards or V_term is unphysical (indicating the constant-wind model is mis-specified for stadium conditions).

## 14. Improvement experiment
Replace constant w with a two-layer wind model: free-stream wind above the bowl + reduced in-bowl wind scaled by a per-stadium shielding factor, fitted from the punt residuals themselves. This turns each NFL stadium into a wind-transfer-function estimate — a durable, proprietary GSE asset (stadium geometry × wind physics, exactly the gap the map names).
