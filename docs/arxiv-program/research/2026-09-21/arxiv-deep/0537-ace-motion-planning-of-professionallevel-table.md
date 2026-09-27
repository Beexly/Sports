# [0537] Ace! Motion Planning of Professional-Level Table Tennis Serves with a Robot Arm (arXiv:2607.06989v2)

**Citation:** Guillem Torrente, Guilherme Jorge Maeda, Divij Grover, Megumu Tsukamoto, Hamdi Sahloul, Peter Dürr (Sony AI, 2026). *Ace! Motion Planning of Professional-Level Table Tennis Serves with a Robot Arm*. arXiv:2607.06989v2. URL: https://arxiv.org/abs/2607.06989v2
**Ledger completed:** 2026-09-21. **Read:** full text (36,000+ char extract; entire paper: §I–§V incl. methodology, Tables I–III, references).
**Verdict:** REJECT — robotics motion-planning paper (MPC + Bayesian optimization for robot table-tennis serves); no predictive model, no sports data usable by GSE, no transferable statistical method. The HEBO optimizer is generic hyperparameter-tuning tooling that adds nothing over existing BO libraries for the engine's own tuning.

## 1. Research question
Can a robot arm generate ITTF-rule-compliant, elite-level table tennis serves — the only fully controllable action in a point, requiring high spin/velocity generation from a spinless free-falling ball — by combining motion primitives, a parametrized optimization-based motion planner (MPC), and HEBO Bayesian optimization over planner parameters?

## 2. Dataset / schema
Hardware: position-controlled 8-DoF robot (2-axis gantry + 6-revolute arm), racket with ball cup; ball triangulation (±3 mm) from overhead RGB cameras. Serve motion library built in simulation, filtered offline/on-robot, selected online by a spin-dissimilarity heuristic. Evaluation: umpire-officiated tournaments vs elite/professional Japanese-league players (Apr 2025–Apr 2026), including Paris 2024 Olympic silver medalist Miu Hirano; 1,243 professional-player serves as comparison data (Apr 2025–Apr 2026). Baseline stat from literature: elite points-won-while-serving ≈ 52.78% (men) / 53.28% (women) (Gómez et al. 2017).

## 3. Method / model
Three-stage pipeline: (1) ball toss from human-demonstration motion primitives, retargeted via optimization, with t_lift estimated from averaged toss trajectories (Savitzky-Golay filtered; ±1 cm uncertainty 0.7 s after lift, N=15 tosses); (2) parametrized strike planner: minimum-jerk optimization over n_l=32 cubic-polynomial segments (piecewise-constant jerk), joint constraints as affine set ℙ, softened EE position/orientation/velocity tolerances at contact time τ, solved with KNITRO (~10–20 ms), a-posteriori tolerance check + Coal-based collision check; (3) HEBO (Heteroscedastic and Evolutionary Bayesian Optimization, Cowen-Rivers et al. 2022) over ≤10 normalized decision variables (hit timing τ, racket velocity v_τ ∈ ±[10,5,5] m/s, orientation n_τ ∈ 2 Euler angles, rest duration τ_f, optional position offset δp ∈ ±0.07 m), with sequential legality checks (non-racket contact −5, double contact −4, <2 bounces −3, wrong-side first bounce −2.5, net −2, wrong-side second bounce −1.5, edge −0.5, clearance −0.3, rest failure −0.1) and infeasible-motion penalty P_MPC=−10; reward F = r_pos + r_vel + r_top/back + r_side + r_height + s_leg. Serve library: online spin-dissimilarity selection (cluster by spin, pick least-used from a different cluster than previous serve); statistical pruning of serves that concede rally points.

## 4. Equations & assumptions
- Parameter vector (Eq. 1): ξ_s ≐ (u_0, u̇_0, ü_0, X_0, τ, p_τ, n_τ, v_τ, τ_f, u_{τ_f}).
- Minimum-jerk program (Eq. 2): min_z ½ ü⃛ᵀü⃛ + λ̂_p ε_p + λ̂_n ε_n + λ̂_v ε_v s.t. (z, q_τ, q̇_τ) ∈ ℙ(…), ‖p(q_τ)−p_τ‖₂ ≤ Δp_τ+ε_p, −n_τᵀn(q_τ) ≤ −cos(Δφ_τ)+ε_n, ‖J_v(q_τ)q̇_τ − v_τ‖₂ ≤ max{Δv_a,τ, Δv_r,τ‖v_τ‖₂}+ε_v; tolerances: Δp_τ=5 mm, Δφ_τ=0.5°, Δv=0.01 m/s / 0.01 relative; slack weights λ̂_p=2 m⁻¹, λ̂_n=1, λ̂_v=0.2 (m/s)⁻¹.
- Serve reward (Eq. 3): F = r_pos + r_vel + r_top/back + r_side + r_height + s_leg.
- Spin decomposition: velocity-aligned frame (e_x‖v_2, e_y horizontal ⊥, e_z up); ω_tb = ω_2·e_y (top/back), ω_ss = ω_2·e_z (side), clamped to [−ω̄, ω̄] and normalized; r_back = g_back max(0,−ω̂_tb), r_top = g_top max(0,ω̂_tb), r_side = g_side φ(ω̂_ss), φ(z)=max(0,d·z).
- Assumptions: joints independently modeled (2nd-order state-space f_D); toss stochasticity handled by training on sampled toss trajectories (reward averaged; genome legal if fraction p>0 passes); HEBO minimizes y=−F to bias toward toss-robust parameters; sim-to-real gap accepted (zero-shot transfer subset only).

## 5. Features / target
Target: ITTF-legal serve maximizing user-defined profile (aim point / topspin+velocity / backspin / sidespin / low height). Optimization genome ≤10 dims; training: 25 serves × 4 tasks (population 20, 100 iterations, ~1.5 min/serve on i9-12900KF). Evaluation metrics: aim error (mm), ball velocity (m/s), spin components (rad/s), point-win probability while serving (Binomial 95% Wilson CI), ace rate.

## 6. Validation design
Umpire-officiated tournaments against elite/professional humans (Apr 2025–Apr 2026), iterative pipeline improvements between sessions (toss-distribution training Nov 2025; two-sided serves; HEBO replacing genetic algorithm Dec 2025; derivative-limit expansion Feb 2026; serve pruning Mar–Apr 2026). Task-specific generation: 4 tasks × 25 serves, sim + real-hardware measurement. No train/test splits — robotics systems paper.

## 7. Numerical results / baselines
- Robot serve point-win 95% WCI rose from [40.8–55.3]% (Apr 2025 baseline) to [51.5–58.7]% (Apr 2026, vs Miu Hirano) — comparable to elite human 52.78%/53.28% serve-point baselines.
- Ace rate: 11% (Apr 2025) → 21% (Mar 2026) → 20% (Apr 2026).
- Spin/velocity: up to 550 rad/s spin, 6.7 m/s ball speed; from Feb 2026 robot serve spin exceeded professional players' (Figure 4).
- Task-specific generation (Table III, real hardware): Topspin+velocity task — 263.4±70.0 rad/s topspin, 4.4±1.1 m/s; Backspin — −131.8±176.9 rad/s; Aiming — 299±313 mm error real (166±285 sim); Sidespin — high variance ±255 rad/s (both directions).
- Sim-to-real gap: 25 trained → 12–15 valid on hardware per task.
- This system was a key component in the first robot wins in fair Best-of-3 matches vs professional table tennis players (Dürr et al., Nature 652, 2026).

## 8. Code / data availability
No code or data repository stated in the extract.

## 9. Leakage & limitations
Author-stated: sim-to-real gap persists (only 48–60% of trained serves transfer zero-shot); future work = better contact/toss/vibration physics + hardware fine-tuning. Unstated: tiny evaluation sample (40 robot serves in Apr 2026 tournament); iterative improvements confounded with opponent-strength changes (later sessions vs professionals); serve selection/pruning introduces selection bias into the "competition library" metrics; Wilson CIs on point-win probability ignore within-match correlation. Transfer limits: zero GSE-relevant data (no betting, no NFL, no predictive modeling); the only conceivably relevant component — HEBO Bayesian optimization — is a general-purpose tuner, not research to adopt.

## 10. GSE overlap
None. No sports-prediction content, no statistical method novel to GSE's stack. Garrett's corpus has no robotics, control, or motion-planning work and needs none. The one fact of mild corpus interest — elite table-tennis serve-point win rates (52.78% men / 53.28% women) — is a sport-specific base rate with no NFL application. HEBO as an optimizer duplicates capabilities of standard BO tooling (GPyOpt/Ax/Optuna) already available for any engine hyperparameter tuning.

## 11. GSE implementation spec
None — no implementation recommended.

## 12. Reproducible test
Not applicable — REJECT verdict, no GSE test specified.

## 13. Acceptance / rejection gate
REJECT. The paper is a robotics systems achievement (first robot to beat professional table tennis players in fair matches) with no path to GSE prediction improvement: no dataset schema for games, no estimator, no market application, no calibration or ranking advance. Its optimization component (HEBO) is interchangeable generic tooling. File under "impressive, irrelevant."

## 14. Improvement experiment
None for GSE. For the paper: close the sim-to-real gap with hardware-in-the-loop HEBO fine-tuning (their own stated future work) — currently 40–52% of trained serves fail on transfer, which is the binding constraint on library diversity.
