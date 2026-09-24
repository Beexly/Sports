# [1712] Modeling the bounce of a gas-filled ball (arXiv:2202.03034)

**Citation:** (2022). *Modeling the bounce of a gas-filled ball*. arXiv:2202.03034. URL: https://arxiv.org/abs/2202.03034
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv source .tex, complete paper, ~33k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the two-parameter energy-conservation model of the coefficient of restitution vs internal pressure, extended through the ideal gas law to a quantitative ε(T) relationship validated over −22°C to 80°C, gives GSE the physics core for cold-weather football pressure/bounce effects (the Deflategate mechanism) and fumble/ball-handling adjustments, directly extending 1699's restitution findings.

## 1. Research question
Can a simple energy-conservation model predict how the coefficient of restitution ε of a gas-filled ball varies with internal pressure — and, via the ideal gas law, with temperature?

## 2. Dataset / schema
Home experiments: basketball dropped from 2.05 m, filmed on a phone, at **15 internal pressures** (0–13 psi gauge, 3 trials each); tennis ball at **7 temperatures** spanning 251–353 K (−22°C to 80°C), 3 trials each; punctured-ball controls; plus literature data (Bridge play balls; Georgallas & Landry basketball/soccer/volleyball at 0.75 m and 1.5 m drops).

## 3. Method / model
Energy bookkeeping: stored energy = work compressing gas minus energy released by wall-area reduction (E_stored ≈ P·ΔV − h·σ·ΔA ≈ (P/2)ΔV for small deformations); energy lost ∝ ΔV (damping force ∝ velocity, i.e., damped harmonic oscillator). Yields ε² = (P_in − P_out + λ_1)/(P_in − P_out + λ_2), with λ_1 = fictitious pressure from rubber energy storage, λ_2 = λ + λ_1. Temperature extension: P_in = kT (ideal gas law) → ε(T) with two fitted constants. χ² grid fits.

## 4. Equations & assumptions
- ε² = E_a/E_b = (h_a/h_b); ε² = (P_in − P_out + λ_1)/(P_in − P_out + λ_2).
- ε(T): same form with T_1 = P_out/k, T_2 = (P_out − λ)/k (Kelvin constants).
- Assumes small volume deformations, velocity-independent ε, temperature-independent loss coefficient λ (authors show the last is wrong for rubber, yet the fit holds — functional form is broader than its derivation).

## 5. Features / target
Inputs: gauge pressure / absolute temperature. Target: coefficient of restitution ε.

## 6. Validation design
χ² fits with measurement uncertainties: basketball χ² = 13.4 (13 dof; 90% threshold 19.8) at λ_1 = 0.80, λ_2 = 4.67; tennis-ball temperature χ² = 3.3 (90% threshold 9.2) at T_1 = 237.3 K, T_2 = 177.3 K. Cross-checked against independent Bridge and G&L datasets — comparable or better fits, notably at low pressure where G&L's model fails.

## 7. Numerical results / baselines
- Basketball ε: **0.407** (deflated) → **0.869** (13 psi gauge) — pressure dominates liveliness.
- Tennis ball ε: **0.447 at −22°C** → **0.813 at 80°C** — temperature swings move ε by ~0.37 across the tested range.
- Model beats/adjoins the ad-hoc power-law ε² = 1/(1+(P/P_0)^n) and the G&L constant-dissipative-force model; G&L's F_D has unspecified velocity dependence (incomplete as a predictive model), while this model's ε is velocity-independent by construction.
- Practical notes: "high altitude" pressurized balls correct P_in downward; pressureless balls behave differently (rubber-dominated).

## 8. Code / data availability
Tables of all measurements in-paper; short Python χ² grid notebook described but not linked; no repo.

## 9. Leakage & limitations
Test velocity ~6 m/s vs up to 65 m/s in competitive tennis (small-deformation assumption breaks at elite impact speeds); old "dead" tennis ball used; λ temperature-independence assumption known-wrong (rubber hysteresis changes with T) — fit survives anyway; deflated ball still bounces (model needs the λ_1 patch); no NFL football tested (prolate spheroid, laces, different wall).

## 10. GSE overlap
Extends **1699** (humidor): 1699 measured restitution/humidity effects on baseballs empirically; this provides the **closed-form ε(P, T) theory** via the ideal gas law. Pairs with **1711** (density altitude): 1711 covers flight through air, this covers the bounce/impact. An NFL football is a gas-filled ball — the Deflategate pressure-temperature mechanism falls straight out of ε(T).

## 11. GSE implementation spec
Add `weather/ball_physics.py`: (a) implement ε(T) for a football using the paper's functional form, calibrated so that the regulation 12.5–13.5 psi at 70°F anchors the curve (fit λ_1, λ_2 from the basketball scale as priors, flag for re-fit if football data obtained); (b) convert game-day temperature to expected ball-pressure drop (ideal gas law: ~1 psi per ~20°F... compute exactly: ΔP/P = ΔT/T) and then to Δε; (c) map Δε to kickoff/punt bounce and fumble-recovery adjustments — colder ball = deader bounce = fewer touchbacks via bounce, altered onside-kick behavior. Effort: ~2 days.

## 12. Reproducible test
Dataset: 2022–2024 NFL outdoor games with temperature + kickoff touchback rate / punt return yardage. Test: does predicted Δε(T) correlate with touchback rate residuals after controlling for kicker? Expectation: significant negative correlation (colder → deader ball → fewer touchbacks); effect size calibration is the deliverable, not just significance.

## 13. Acceptance / rejection gate
ADOPT the ε(T) adjustment in the kicking model if predicted Δε explains residual touchback variance with the correct sign at p < 0.05 on 2024 holdout. REJECT if no signal — the basketball→football extrapolation may not survive contact geometry differences; the paper's own 6 m/s limitation demands this humility. Either way, keep the ideal-gas-law pressure correction (that's just physics).

## 14. Improvement experiment
Run the full cold-weather football experiment the paper implies but never does: instrument-free estimation using broadcast data — compare fumble rates and kick-bounce outcomes in games below 32°F vs matched games above 50°F (same teams, 2020–2024), then fit the two λ parameters to the observed effect sizes. Hypothesis: the fitted curve reproduces the paper's functional form with football-scale constants, giving GSE a proprietary cold-weather ball-effects table (pressure drop → ε drop → touchback/fumble adjustments) no public model has. Success = monotonic fitted ε(T) with χ²-consistent fit; publish internally as the "Deflategate correction" module. Failure (no monotonic fit) still leaves the ideal-gas pressure correction, which is non-negotiable physics.

**Verdict:** ADAPT — the ε(P,T) restitution theory gives GSE the quantitative core for cold-weather football pressure/bounce/fumble effects, completing the weather→ball-physics chain with 1699 and 1711.
