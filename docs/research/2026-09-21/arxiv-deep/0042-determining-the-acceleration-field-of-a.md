# [0042] Determining the acceleration field of a rigid body using three accelerometers and one gyroscope, with applications in mild traumatic brain injury (arXiv:2508.07464)

**Citation:** Wan, Y., Grossman-Ponemon, B. E., Kesari, H. (2025). *Determining the acceleration field of a rigid body using three accelerometers and one gyroscope, with applications in mild traumatic brain injury*. arXiv:2508.07464 [physics.app-ph]. URL: https://arxiv.org/abs/2508.07464
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** REJECT — a rigorous sensor-fusion kinematics algorithm, but it operates on wearable inertial-sensor hardware GSE does not have and produces no predictive model relevant to picks, props, DFS, or market work.

## 1. Research question
Can the complete acceleration field of a rigid body (here, a human head in contact-sport impacts) be reconstructed from only three tri-axial accelerometers plus one tri-axial gyroscope — avoiding both the noise amplification of numerically differentiating gyro data and the restrictive sensor placement / nonlinear optimization of gyroscope-free methods? The paper proposes the "A3G1" algorithm, which solves a linear system derived from rigid-body kinematics, and validates it on controlled soccer-heading experiments by predicting acceleration at an unsensed head location.

## 2. Dataset / schema
- **Custom experimental data, not public:** five controlled soccer-heading trials. Subject = the first author (head circumference 59 cm, height 170 cm, weight 70 kg). He throws a soccer ball and heads it while wearing a 3D-printed PLA (Prusa i3 MK3) rigid sensor holder with four Vicon IMUs (each: tri-axial accelerometer + tri-axial gyroscope).
- Sensor positions (reference configuration, meters): ¹X = (0.077, 0.016, −0.042); ²X = (−0.001, −0.008, 0.015); ³X = (−0.077, 0.016, −0.042); ⁴X = (0.001, 0.076, −0.078). Measurement-axis direction vectors for each IMU given in Figure 3 caption.
- Analysis used accelerometers #1, #3, #4 and gyroscope #1; predicted the acceleration at accelerometer #2's location and compared against its measured values.
- Access: not stated; experimental data from the authors' own lab. No public URL.

## 3. Method / model
The A3G1 algorithm (Algorithm 1 in the paper):
1. From gyroscope data, compute body-frame (pseudo) angular velocity w̄(τ) via Eq. (3.2): w̄(τ) = Eᵀ Σⱼ ᵍωⱼ(τ) ᵍEⱼ.
2. Form skew-symmetric angular-velocity matrix W(τ) via the inverse map ˚ (Eq. 2.7).
3. From each accelerometer ℓ, compute body-frame (pseudo) acceleration ᵏA(τ) via Eq. (3.1): ᵏA(τ) = Eᵀ Σⱼ ᵏαⱼ(τ) ᵏEⱼ.
4. Build vector M(τ) ∈ M⁹ˣ¹(ℝ) from ᵏA(τ) − W(τ)W(τ)ᵏX for ℓ = 1, 2, 3 (Eq. 3.5).
5. Build fixed matrix D ∈ M⁹ˣ⁶(ℝ) from sensor positions: rows [(∘(ᵏX))ᵀ, I₃ₓ₃] for ℓ = 1, 2, 3 (Eq. 3.6).
6. Least-squares solve for S(τ) = [w̄'(τ); q(τ)] ∈ M⁶ˣ¹(ℝ): Ŝ(τ) = (DᵀD)⁻¹ Dᵀ M(τ) (Eq. 3.10).
7. Evaluate the pseudoacceleration field at any material point X: A(τ,X) = W(τ)W(τ)X + (∘(X))ᵀ w̄'(τ) + q(τ) (from Eqs. 2.11–2.13, 3.4).
- Key structural point: because w̄(τ) comes directly from the gyro, angular acceleration w̄'(τ) and translational acceleration q(τ) are recovered *linearly* — no numerical differentiation of noisy data, no nonlinear fitting. The only placement constraint is that the three accelerometers not be collinear (equivalently, D has full column rank). Gyroscope may sit anywhere on the body.

## 4. Equations & assumptions
- Eq. (2.1): x(τ,X) = Q(τ)X + c(τ). (Rigid-body motion; Q rotation, c translation.)
- Eq. (2.2): Qᵀ(τ)Q(τ) = Q(τ)Qᵀ(τ) = I₃ₓ₃. (Proper rotation.)
- Eq. (2.4): W(τ) = Q'(τ)Qᵀ(τ). (Body-frame angular-velocity matrix, skew-symmetric.)
- Eq. (2.5): W(τ)x = w(τ) × x. (Axial vector relation.)
- Eq. (2.6): ‹(p)› = (p₃₂, p₁₃, p₂₁) for skew-symmetric p; (2.7): ˚ its inverse, ˚(a₁,a₂,a₃) = [[0,−a₃,a₂],[a₃,0,−a₁],[−a₂,a₁,0]]; (2.8): Ax = (˚(x))ᵀ‹(A)›.
- Eq. (2.9): A(τ,X) := Q''(τ)X + c''(τ). (Material acceleration.)
- Eqs. (2.10)–(2.11): pseudoacceleration A̅(τ,X) := Qᵀ(τ)A(τ,X) = P(τ)X + q(τ).
- Eq. (2.12): P(τ) = Qᵀ(τ)Q''(τ); (2.13): P(τ) = W(τ)W(τ) + W'(τ), with w̄(τ) = ‹(W(τ))› the pseudo-angular velocity.
- Eq. (2.14): w̄(τ) = Q(τ)w(τ). (Pseudo-angular velocity from gyro measurement.)
- Eq. (3.1): ᵏA(τ) = Eᵀ Σ_{j=1}^{3} ᵏαⱼ(τ) ᵏEⱼ. (Body-frame accel at accelerometer ℓ from its readings.)
- Eq. (3.2): w̄(τ) = Eᵀ Σ_{j=1}^{3} ᵍωⱼ(τ) ᵍEⱼ. (Body-frame angular velocity from gyro readings.)
- Eq. (3.3): ᵏA(τ) = W(τ)W(τ)ᵏX + W'(τ)ᵏX + q(τ).
- Eq. (3.4): ᵏA(τ) = W(τ)W(τ)ᵏX + (∘(ᵏX))ᵀ w̄'(τ) + q(τ).
- Eqs. (3.5)–(3.7): M(τ), D, S(τ) = [w̄'(τ); q(τ)] as above.
- Eq. (3.8): DS(τ) = M(τ); (3.9): Ŝ = argmin_Y ‖DY − M(τ)‖₂; (3.10): Ŝ(τ) = (DᵀD)⁻¹DᵀM(τ).
- Eq. (4.1): error = ‖²Ã(·) − ²A(·)‖_{L²[0,T]} / ‖²A(·)‖_{L²[0,T]}; (4.2): ‖·‖_{L²[0,T]} := (∫₀ᵀ ‖²A(τ)‖² dτ)^{1/2}.
- Assumptions (stated): rigid body; sensors rigidly attached; sensor reference positions/orientations known (from 3D-print design parameters); gyroscope anywhere on the body; accelerometers non-collinear (D full column rank); nondimensionalized formulation.

## 5. Features / target
- **Inputs:** raw tri-axial accelerometer time series from 3 accelerometers + raw tri-axial gyroscope angular-velocity time series; known sensor positions/orientations.
- **Target:** the full pseudoacceleration field A̅(τ,X) evaluated at any material point X (demonstrated at accelerometer #2's location), i.e., body-frame acceleration including both rotational and translational components.
- **Prediction horizon:** instantaneous reconstruction at each time sample (no forecasting horizon).

## 6. Validation design
- 5 repeated soccer-header trials by a single subject; representative trial = Test #3.
- Hold-out validation: sensors 1, 3, 4 + gyro 1 used as input; predicted acceleration at sensor 2's location compared against sensor 2's actual measurements (a true unsensed-location test).
- Metric: relative L²[0,T] error (Eq. 4.1). No train/test split in the ML sense (deterministic algorithm, no learned parameters). No baselines re-run in this paper (compares conceptually to prior gyroscope-based [31] and gyroscope-free [30, 34–40] algorithms).

## 7. Numerical results / baselines
Quoted exactly as in the paper (Table 1, §4.3):
- Test #3 error: **0.062 (or 6.2%)**.
- All five tests: Test #1 **6.4%**, Test #2 **10.5%**, Test #3 **6.2%**, Test #4 **5.8%**, Test #5 **11.2%**.
- (My interpretation: 4 of 5 trials under 10.5% relative L² error; Test #5 worst at 11.2%.) No confidence intervals stated.

## 8. Code / data availability
None stated in the paper (no code or data availability section found).

## 9. Leakage & limitations
- Single subject (the first author), n = 5 trials of one motion type (soccer headers) — minimal external validity to NFL impacts (tackles, collisions involve far higher energies and multi-body contact).
- The head is modeled as a rigid body; brain deformation is not measured, only head kinematics — the link to actual mTBI requires a separate brain-injury criterion / FE model (acknowledged in §1).
- Sensor positions are assumed known exactly from 3D-print design parameters; real wearable placement error would degrade the least-squares solution (D depends on ᵏX).
- Requires sensors rigidly attached to the skull (headband/holder); GSE has no wearable-sensor data pipeline and no prospect of obtaining per-player head kinematics.
- Error metric normalizes by signal norm; on low-energy trials the same absolute error would look worse.

## 10. GSE overlap
- **GSE map status:** gap #9 ("Causal injury impact — player-level causal injury effect estimation is thin") is adjacent but this paper does not fill it: it reconstructs kinematics, it does not estimate injury effects or predict injuries. No Sports repo work covers wearable sensor fusion or head-impact measurement.
- Overlap assessment: **new capability, but product-irrelevant.** Nothing in the GSE stack consumes per-player inertial-sensor data; the engine's inputs are nflverse play-by-play, tracking (NGS), odds, and charting. The A3G1 algorithm is a biomechanics-instrumentation method, not a prediction method. Not duplicate — just out of scope.

## 11. GSE implementation spec
Not recommended (REJECT). A hypothetical implementation would need instrumented mouthguards/headbands on NFL players (data GSE cannot access; NFL's own instrumented-mouthguard program data is proprietary), a rigid-body calibration per player, and a downstream brain-injury criterion. No betting/DFS/content product consumes this. Effort: not applicable — do not build.

## 12. Reproducible test
N/A (rejected). A replication test would require the authors' sensor data (unavailable) or a new instrumented experiment — beyond GSE's lab capacity.

## 13. Acceptance / rejection gate
Reject: no path from head-acceleration-field reconstruction to any GSE product metric. Gate closed — do not run.

## 14. Improvement experiment
If this lane were pursued (it shouldn't be): pair the A3G1 reconstruction with a learned brain-strain surrogate (e.g., the CNN strain estimators cited in [24]) to map per-impact head kinematics → predicted brain-tissue strain, then correlate with concussion diagnoses — turning a kinematics instrument into an injury-prediction instrument. GSE still lacks the input data, so this stays a research note, not a build plan.

**Flags:** none on equations/numbers — the relative-L² errors are stated plainly (6.2% for the representative trial, full table given). Note the PDF text extraction garbles some math symbols; equations above are reconstructed from the paper's LaTeX semantics, verified against the equation numbers.
