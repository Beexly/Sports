# [1569] Experimental Modeling of Cyclists Fatigue and Recovery Dynamics Enabling Optimal Pacing in a Time Trial (arXiv:2007.05507)

**Citation:** Faraz Ashtiani, Vijay Sarthy M Sreedhara, Ardalan Vahidi, Randolph Hutchison, Gregory Mocko (2020). *Experimental Modeling of Cyclists Fatigue and Recovery Dynamics Enabling Optimal Pacing in a Time Trial*. arXiv:2007.05507. URL: https://arxiv.org/abs/2007.05507
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

experimentally fitted Critical Power / Anaerobic Work Capacity (CP/AWC) two-tank fatigue model with an asymmetric recovery law (recovery slower than expenditure, power-level-dependent) and a quadratic max-power-vs-remaining-energy curve; gives GSE the canonical quantitative fatigue/recovery dynamics for a player work-capacity state, validated by a 3-minute pacing improvement on a 10.3 km time trial.

## 1. Research question
Can experimentally derived muscle fatigue and recovery models — built on the Critical Power (CP) / Anaerobic Work Capacity (AWC) concepts — be used to compute an optimal pacing strategy for a cycling time trial, and does the optimal strategy beat a trained subject's own pacing on a simulated 10.3 km course?

## 2. Dataset / schema
Human-subject lab experiments (Clemson/Furman Universities), 9 subjects recruited from local cycling communities; full models presented for "Sub 9". Protocol per subject: 13 lab visits — VO₂ ramp test (gas exchange threshold power P_GET), 3-min all-out test ×2 (CP = mean power of last 30 s; AWC = area above CP), and 9 interval tests (3 recovery power levels × 3 durations: 2/6/15 min) where subjects burn half their AWC at CP4 (the 4-min sustainable power = AWC/240 s) then recover, then a final 3-min all-out to measure recovered energy. CompuTrainer ergometer (power control), Moxy NIRS sensor for muscle oxygenation SmO₂. Sub 9: CP = 234 W, AWC = 9758 J. Test course: 10.3 km Caesars Head State Park route (two long uphills), simulated on CompuTrainer via PerfPro.

## 3. Method / model
Two-tank energy model. State W = remaining AWC energy. Switching dynamics: dW/dt = −(P−CP) when P > CP (expenditure); dW/dt = −(P_adj−CP) when P < CP (recovery), with adjusted recovery power P_adj = aP + b fitted per subject from interval tests (Eq. 4) — because recovered energy < naive area, recovery is slower than expenditure and depends on recovery power level (SmO₂ data show recovery plateaus at a power-dependent level regardless of duration, so a duration-based model would be non-causal). Max power generation capacity: P_max(t) = a₁W²(t) + a₂W(t) + CP (quadratic in remaining energy, fitted from 3-min all-out data; replaces the constant-800 W assumption of prior work). Optimal control: min ∫dt = ∫dx/v(x) subject to bicycle dynamics P(t) = (m_t dv/dt + m_t g(sin θ + μ cos θ) + 0.5 C_d ρA v²)·v (Eqs. 6–7), states z = [v, W], control P_rider, constraints 0 ≤ P_rider ≤ P_max(W), 0 ≤ W ≤ AWC, 0 ≤ v ≤ v_max, and P_rider = P_req feasibility. Solved by dynamic programming with distance as the independent variable (dt → 2ΔX/(v_i+v_{i+1})), grid 32 velocity × 100 energy nodes × 100 m intervals. Software-in-the-loop real-time controller planned: backward-DP matrices as lookup tables, forward pass with CompuTrainer feedback.

## 4. Equations & assumptions
- AWC = (P − CP)·Δt (Eq. 1); 3-min all-out: CP = last-30-s mean power, AWC = area above CP.
- dW/dt = −(P−CP), P > CP; dW/dt = −(P_adj−CP), P < CP (Eq. 3).
- P_adj = CP − W_rec/T_rec (Eq. 2); P_adj = aP + b (Eq. 4, fitted, Fig. 5).
- P_max(t) = a₁W²(t) + a₂W(t) + CP (Eq. 5, Fig. 6b).
- Bicycle dynamics: F(t) = m_t dv/dt + m_t g(sin θ + μ cos θ) + 0.5C_dρAv² (Eq. 6); P(t) = F(t)v(t) (Eq. 7).
- Objective min J = ∫₀^{tf} dt = ∫₀^{xf} dx/v (Eq. 8); constraints Eq. 9; discrete DP Eqs. 10–12.
- Assumptions: 100% drivetrain efficiency; constant air density; cadence fixed 80 rpm in tests; recovery capped so P_adj can't imply recovery while P > CP (added constraint); drag term removed for lab (no air resistance on CompuTrainer); models fitted on one subject (Sub 9) — generalizability across subjects untested.

## 5. Features / target
Features: rider power P(t), course elevation θ(x), lab-fitted constants (CP, AWC, a, b, a₁, a₂). Target: optimal pacing policy (power per distance interval) minimizing time; intermediate target: remaining energy W(x) and max-power envelope P_max(W). Experimental target: recovered energy W_rec per interval test.

## 6. Validation design
Two validations: (i) experimental — interval-test protocol directly measures recovered energy vs power level/duration, yielding the fitted P_adj law; quadratic P_max(W) fitted to 3-min all-out traces. (ii) interventional — Sub 9 rode the simulated 10.3 km course twice in effect: once with own strategy (baseline 41:17, verbally encouraged, familiar course), once following the DP-optimal policy (38:15). DP grid resolution study implicit in the <1-min runtime on a desktop i5-4460/12 GB. Single-subject — no cross-subject validation.

## 7. Numerical results / baselines
Baseline (own strategy): 41 min 17 s. DP-optimal: 38 min 15 s — 3 min 2 s (≈7.3%) improvement. Mechanism: optimal policy inserts low-power recovery intervals that regenerate W, enabling higher sustained power late (especially final km); the subject's own strategy never recovered at very low power. Sub 9 parameters: CP 234 W, AWC 9758 J. Logistic/linear fits: P_adj linear in P (Fig. 5); SmO₂ recovery level depends on recovery power, not duration (Fig. 4). DP cost: 32×100 grid, 100 m steps, <60 s runtime.

## 8. Code / data availability
No public code or data stated. Methods fully specified (equations + grid sizes + protocol), reproducible in principle; raw subject data not shared.

## 9. Leakage & limitations
Single-subject models (9 recruited, Sub 9 reported) — the fitted a, b, a₁, a₂ are individual, not population; GSE would need per-athlete calibration. Lab ergometer ≠ field (no drag, no tactics, no competitors). The baseline is one ride by the same subject (motivation/familiarity confounds; still, 3 min is a large margin). Recovery model is linear in P over the tested range — extrapolation beyond tested power levels unjustified. No injury outcome; W is a performance reservoir, not an injury predictor. Cycling-specific (power meter–based); translating "power above CP" to football requires an NGS-derived exertion proxy.

## 10. GSE overlap
Complements 1568 (trail-running fatigue ODE) with the other canonical fatigue formalism: CP/AWC two-tank model with *asymmetric, experimentally measured* recovery — 1568's dQ/dt had no recovery term at all. Together they give GSE both candidate dynamics for a player work-capacity state. The quadratic P_max(W) (max output degrades with depleted reserves) is the direct analogue of "player explosiveness declines with accumulated load" — usable for snap-count/load-management features. No existing corpus work uses CP/AWC.

## 11. GSE implementation spec
Build `gse_work_capacity.py`: per-player anaerobic-reserve state W updated per play: dW = −(P−CP) when exertion proxy P > CP, dW = −(P_adj−CP) when P < CP, with P = NGS-derived exertion (e.g., normalized high-speed distance + accelerations per play), CP = position-group aerobic threshold (calibrated from practice data), P_adj = aP + b with a, b fitted per position group from observed performance decay/recovery (mirroring the interval-test protocol: hard-effort bouts followed by low-load periods). Cap: P_max(W) = a₁W² + a₂W + CP gives a per-game "explosiveness ceiling" feature. Serve W and P_max(W) into the availability/injury-risk model and the DFS value model (players with depleted W project below market). Calibrate on 2023–2024 NGS + injury data.

## 12. Reproducible test
Backtest 2024 season: fit CP, a, b, a₁, a₂ per position group on 2023 (W-trajectories vs soft-tissue injuries and 4th-quarter performance declines), freeze, evaluate 2024. Pass gate: injury-risk model with (W, P_max(W)) features beats rolling-average-load baseline by ≥2 AUC points on soft-tissue injuries AND the fitted recovery asymmetry holds (recovery rate < expenditure rate, a < 1 in P_adj = aP + b terms) — if recovery fits as fast as expenditure, the model is misspecified for football exertion patterns. Secondary: P_max(W) must show the concave-degrading shape (a₁ < 0); a convex fit fails the gate.

## 13. Acceptance / rejection gate
Accepted: experimentally grounded (13-visit protocol, direct measurement of recovered energy), quantified improvement (7.3% time reduction vs own-strategy baseline), asymmetric recovery law with a causality argument (SmO₂ plateau ⇒ power-level, not duration, drives recovery), and direct portability to a player work-capacity state — the missing piece in 1568's fatigue ODE.

## 14. Improvement experiment
Replace the paper's single-subject lab calibration with hierarchical partial pooling across NFL position groups (group-level a, b, CP with player random effects), estimated from NGS exertion + injury data rather than ergometer tests — the population version the authors never built. Second: add the stochastic injury-hazard layer λ(t) = λ₀·exp(γ·(AWC−W(t))) linking depleted reserves to soft-tissue injury risk, and test it head-to-head against the 1568-proposed hazard λ(t) = λ₀·exp(γ·Q(t)) to select the better fatigue dynamics for GSE's injury model.
