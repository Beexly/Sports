# [1101] Projection Angles of Projectiles in Sports: Qualitative Assessment of the Effects of Aerodynamic Forces or Run-Up (arXiv:2609.08249v1)

**Citation:** Tsuboi, K. (2026). *Projection Angles of Projectiles in Sports: Qualitative Assessment of the Effects of Aerodynamic Forces or Run-Up*. arXiv:2609.08249v1 [physics.class-ph]. URL: https://arxiv.org/abs/2609.08249
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — elegant classical-mechanics analysis of shot-put/long-jump release angles, but a qualitative theory paper on track-and-field throwing events with no data, no ML, and no mechanism connecting to fantasy sports or game prediction.

## 1. Research question
What determines the optimum projection angle of sports projectiles? Two factors are analyzed: (a) aerodynamic drag and spin-lift effects, via perturbation solutions of linearized equations of motion; (b) run-up effects, via an extended model where initial speed depends on projection angle.

## 2. Dataset / schema
No dataset. Numerical validation is against the author's own Runge–Kutta integrations of the ODEs (Δt=10⁻³), not experimental data. Cited experimental anchors: baseball batting launch angles ~25–30°, golf drives ~10°, shot put ~30–40° (Linthorne 2001), long jump takeoff ~20–30° (Linthorne et al. 2005).

## 3. Method / model
(a) Linearize quadratic-drag/lift EOMs by freezing speed at its initial value (α=εD·q≈εD, β=εL·q≈εL); derive 2nd-order perturbation expansions for flight time T and range L in α, β with r=β/α; stationary condition dL/dθ=0 gives θopt (Eq. 13). Exact solution for lift-only case (Eq. 16). (b) Extended projection model: projectile launched at angle ψ from a platform moving at speed V; initial speed `q_i(θ) = V·cosθ + √(w²−V²sin²θ)` decreases in θ; cubic equation (19) for optimal ψ, closed form (20)–(21).

## 4. Equations & assumptions
- EOM: `m·du/dt = −kqu − lqv`, `m·dv/dt = −kqv + lqu − mg`; `k=½ρACD`, `l=½ρACL`; `εD=k·q_i²/(mg)`, `εL=l·q_i²/(mg)`.
- θopt perturbation (13): `θopt = π/4 − α(√2/6 + (√2/4)r) + α²(1/9 + (1/6)r − (1/8)r²)`.
- Lift-only exact: `cos θopt = (β + √(β²+8))/4`.
- Run-up: `q_i(θ) = V cosθ + √(w² − V²sin²θ)`; cubic `2γcos³ψ + (γ²+2−2ζ)cos²ψ + 2ζ − 1 = 0`, γ=V/w.
- Assumptions: point mass, 2-D motion, constant drag/lift coefficients, ζ=0 for perturbation derivations, run-up modeled as constant platform speed.

## 5. Features / target
Not applicable — analytical mechanics, no features. Target concept: optimum projection angle θopt.

## 6. Validation design
Internal consistency: perturbation solutions vs RK4 numerical solutions of the linearized and full quadratic EOMs. Perturbation accurate for εD, εL ≲ 0.5. No experimental validation performed in this paper. Predicted optima (shot put 30–35°, long jump 20–25° at γ≈0.4–0.8 and 1.4–1.8, ζ=−0.3) match cited literature values.

## 7. Numerical results / baselines
- Drag-only: θopt → ~35° at α≈1.0 (linearized) vs ~41° under quadratic drag law; linearized model overestimates drag effect ~2.6× in initial slope.
- Lift-only exact: θopt → 0° at β=1.0; lift's first-order effect ~1.5× drag's (linearized), ~3.9× under quadratic law.
- Run-up: ψopt rises and θopt falls rapidly over 0.1 ≤ γ ≤ 10, asymptoting to 90°/0°; predicts 30–35° (shot put) and 20–25° (long jump), matching experiments.
- Author's note: ChatGPT assisted translation/English refinement.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No data, so no leakage. Limitations: purely qualitative — the linearization is acknowledged to quantitatively overestimate drag; no new experiments; track-and-field throwing/jumping events only. For GSE: no connection to prediction markets, fantasy scoring, or game outcomes. A stretch application (punt/kickoff trajectory optimization) isn't supported — football punts involve tumbling aerodynamics outside this point-mass model.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. GSE's lanes are NFL/NCAA prediction, fantasy, calibration, tracking — none involve throwing-event biomechanics. No overlap.

## 11. GSE implementation spec
Not applicable — REJECT.

## 12. Reproducible test
Not applicable — REJECT.

## 13. Acceptance / rejection gate
REJECT: correct and elegant within its domain, but the domain (track-and-field projectile mechanics) has no GSE application. Replaced by ledger 1309 (provisional number pending coordinator confirmation — replacement paper 2603.21163 fully read, ADAPT).

## 14. Improvement experiment
Not applicable — see replacement ledger 1309 (provisional number) for the same-lane (sports/MLB analytics) substitute.
