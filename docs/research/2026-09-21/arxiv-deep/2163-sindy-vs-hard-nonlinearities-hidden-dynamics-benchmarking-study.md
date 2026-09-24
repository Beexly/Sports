# [2163] SINDy vs Hard Nonlinearities and Hidden Dynamics: a Benchmarking Study (arXiv:2403.00578v1)

**Citation:** Aurelio Raffa Ugolini, Valentina Breschi, Andrea Manzoni, Mara Tanelli (2024). *SINDy vs Hard Nonlinearities and Hidden Dynamics: a Benchmarking Study*. arXiv:2403.00578v1. URL: https://arxiv.org/abs/2403.00578
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — a brutally honest field manual for when sparse equation discovery works on real data (and when it lies), directly applicable to discovering sparse governing equations of NFL game-state dynamics.

## 1. Research question
When SINDy (Sparse Identification of Nonlinear Dynamics) is tested on real-world nonlinear-identification benchmarks — rather than clean synthetic systems — how well does it cope with the two features ubiquitous in practice: unobserved states and hard (non-smooth) nonlinearities? And what hands-on strategies can practitioners use to recover good sparse models anyway?

## 2. Dataset / schema
Three public benchmark datasets, all with train/validation/test splits provided by the benchmark suites:
- **Pick-and-place machine** (Juloski et al. 2004): 15 s of input/output at 400 Hz from a mounting head placing an electronic component. Input: motor voltage u(t) [V]; output: head position y(t). Four operating modes: upper saturation, free, impact, lower saturation. Split: 3840 train / 960 validation / 1200 test samples.
- **Bouc–Wen hysteretic oscillator** (Noël & Schoukens 2020): simulated nonlinear oscillator with dynamic memory; output y(t) [m], input force u(t) [N]; the nonlinearity depends on an unmeasured internal state z(t) with no finite Taylor expansion.
- **Cascaded tanks** (Schoukens et al. 2020): two open-top tanks in cascade; input = pump voltage u(t) [V], output = lower-tank level y(t) [V]; soft sqrt nonlinearities (Bernoulli) + hard saturations/overflows; upper-tank level unmeasured; short data record. Split: 768 train / 256 validation samples.
All datasets are public (references above); code at https://github.com/aurelio-raffa/benchmarking_sindy.

## 3. Method / model
**SINDy (with control, Brunton et al. 2016b)** via PySINDy (Kaptanoglu et al. 2022); hyperparameters via Bayesian optimization (Hyperopt); derivative estimates via a tunable regularization optimized jointly with other hyperparameters. Three hands-on strategies (the paper's core contribution):
1. **Derivative-coordinate augmentation (pick-and-place):** add z(t)=ẏ(t) as a constructed state, modeling z̈(t)=φ^pick(y,z,u)^⊤Θ_z with a 2nd-order polynomial library — handles saturations through higher model order.
2. **Iterative hidden-state reconstruction (Bouc–Wen):** guess linear parameters (m_L, c_L, k_L), reconstruct z(t)=u−c_L ẏ−k_L y−m_L ÿ, fit ż(t)=φ^z(z, ẏ, |ẏ|, |z|)^⊤θ_z (library includes absolute values since (9b) admits no finite Taylor expansion), iterate guesses minimizing validation RMSE.
3. **Structured hidden dynamics with initial-condition estimation (cascaded tanks):** assume the hidden upper-tank structure ẋ₁=−k₁√x₁+k₂u; simulate x̂₁(t) per guess of (k₁, k₂); fit ẏ=φ^tanks(y, x̂₁, u)^⊤θ; estimate x₁(0) via grid search minimizing (ẏ(0)−φ^tanks(y(0),x₁,u(0))^⊤θ)² (Eq. 17).
Baselines: PWA models (Ferrari-Trecate 2003), jump models (Bemporad 2018), plain ARX, NN-ARX.

## 4. Equations & assumptions
- Continuous-time system ẋ(t)=f(x(t),u(t)) (Eq. 1); SINDy approximation ẋ(t)≈Θ^⊤φ(x,u) (Eq. 2); sparse problem min_Θ ‖Ẋ−Φ(X,U)Θ‖²₂ + λ²Σᵢ‖Θᵢ‖₀ (Eq. 3); STLS iteration (Eqs. 4a–4b); STLS converges in ≤ n_φ steps to a *local* minimizer — no guarantee of true structure even with correct bases in the library.
- Metrics (Eq. 5): BFR = max(1−Σ(y_k−ŷ)²/Σ(y_k−ȳ)², 0) [%], RMSE — computed on open-loop simulation (not one-step-ahead) over the test set.
- Bouc–Wen true model (Eq. 9): m_L ÿ = u − c_L ẏ − k_L y − z; ż = αẏ − β(γ|ẏ|z + δẏ|z|).
- Cascaded tanks (Eq. 14): ẋ₁ = −k₁√x₁ + k₂u; ẋ₂ = k₃√x₁ − k₄√x₂; y = x₂.
- Assumptions stated: full state observability (violated in 2 of 3 benchmarks); library must contain the true bases (or close); smooth dynamics preferred.

## 5. Features / target
Input features = library basis functions evaluated on measured state/input (and constructed/hidden states): 2nd-order polynomials; sqrt terms; absolute-value terms (|ẏ|, |z|); cross terms yu, u². Target = state derivatives (Ẋ) estimated from data; final evaluation on open-loop simulated output trajectories.

## 6. Validation design
Separate train/validation/test sets per benchmark (test sets from the benchmark suites, untouched during hyperparameter search). Bayesian optimization for hyperparameters on validation. Metrics: BFR (pick-and-place, cascaded tanks), RMSE (Bouc–Wen: ×10⁻⁴ [m] on low-frequency, multi-sine, sine-sweep tests). Competitor baselines from the nonlinear-identification literature. Open-loop simulation quality is the acceptance criterion (harsher than one-step prediction).

## 7. Numerical results / baselines
- **Pick-and-place (Table 1, BFR %):** SINDy (2nd-order, derivative-coordinate strategy) **76 (94)** — the parenthetical 94 is with a better threshold setting; PWA (Ferrari-Trecate) 75; Jump models (Bemporad) 83. Naïve 1st-order SINDy (Eq. 8: ẏ=−111.16y+133.73u−3.48yu) produced slower, non-oscillatory, plateau-free output; the 2nd-order model captured oscillations and saturation behavior and beat both competitors.
- **Bouc–Wen (Table 2, RMSE ×10⁻⁴ [m]):** Naïve SINDy: 10.99 / 2.75 / 3.32 (low-freq / multi-sine / sine-sweep). Hidden SINDy, HPO: 11.26 / 1.83 / 1.72. Hidden SINDy, Ideal (true params): 8.87 / 2.52 / 3.03 — the structurally *correct* model scored worse on the test metrics than the structurally wrong HPO model (recovered ż=αẏ−βz|ẏ|+γ|z|ẏ−δ|z||ẏ|, α=68815.219, β=570.725, γ=700.135, δ=0.815; ÿ=−0.213ẏ−27685.724y−0.379z+0.379u). Only the Ideal variant reproduced the hysteresis cycle shape (Figure 3).
- **Cascaded tanks (Table 3, BFR % / RMSE):** SINDy Poly. 73.16 / 1.09; SINDy Sqrt. 53.09 / 1.44; SINDy 2nd-order (I/O only) 0 / 2.12; Hidden SINDy Poly. **93.24 / 0.55**; Hidden SINDy Sqrt. 92.82 / 0.56; NN-ARX **95.10 / 0.47** (slightly better, less interpretable, more hyperparameter-sensitive); ARX 86.55 / 0.77. Linear ARX beat the naïve nonlinear SINDy models — a stated cautionary result.
- Core finding: test-metric-optimal ≠ structurally correct; stronger priors (structured hidden states) were required for accuracy in all three benchmarks.

## 8. Code / data availability
Code: https://github.com/aurelio-raffa/benchmarking_sindy. Benchmark datasets public via Juloski et al. 2004, Noël & Schoukens 2020 (10.4121/12967592), Schoukens et al. 2020 (10.4121/12960104.V1). PySINDy open source (Kaptanoglu et al. 2022).

## 9. Leakage & limitations
Adversarial notes: (a) Derivative fitting + noise is the Achilles' heel — regularized derivative estimation was needed even at moderate noise; weak/integral formulations (Weak-SINDy, Russo & Laiu 2022) give guarantees only for scalar systems with polynomial/harmonic libraries. (b) The three benchmarks use real but small datasets (15 s at 400 Hz; 1024 samples) — sample-size concerns for overfitting the library. (c) The "best" models by metric were structurally wrong (Bouc–Wen HPO adds a spurious |z||ẋ| term; cascaded-tanks validation RMSE preferred the polynomial model 0.356 over the physics-informed sqrt 0.383 — qualitatively wrong) — metric-driven model selection can actively reject domain knowledge. (d) The hands-on strategies are "excessively reliant on partial knowledge of the dynamics" (authors' own words) — guessing hidden-state structure is trial-and-error. (e) Hyperparameters Bayesian-optimized per benchmark — snooping risk across benchmarks is limited by held-out test sets, but library selection itself was hand-crafted per case.

## 10. GSE overlap
GSE's engine v5.2.7 predicts outcomes but has no sparse governing-equation layer — no closed-form law for how game-state variables (score differential, time, field position, momentum proxies) *evolve* into each other. Wave-5a covered DSR/PySR-style regression but not SINDy (dynamics from time series), and nothing covered hidden-state equation discovery. NFL games are dynamical systems with partially observed states (momentum, fatigue, play-calling intent are all hidden) — exactly the failure mode this paper maps. This is new capability, not duplication: it tells us precisely where naive SINDy breaks in sports (hidden states + hard discontinuities like turnovers) and how to fix it (derivative-coordinate augmentation, structured hidden states).

## 11. GSE implementation spec
1. Build game-state trajectories from nflverse `pbp`: state = [score_diff, time_remaining, yardline, down, distance, EPA_rolling, timeouts] per game (sampled per play, ~60–160 steps); observed output = win probability (from engine) or points scored.
2. PySINDy with control: inputs = game-context controls (home, rest, spread); library = 2nd-order polynomials + abs terms (|score_diff| for garbage-time nonlinearities) + indicator terms for turnovers/red zone (hard nonlinearities per the paper's pick-and-place lesson).
3. Derivative-coordinate trick: add d(score_diff)/d(play) and d(time)/d(play) as constructed states (2nd-order formulation, Eq. 6–7 analog).
4. Hidden-state strategy for "momentum": posit a latent variable h (momentum) with assumed linear restoring structure, reconstruct h per game from residual dynamics, fit ḣ with a SINDy library — the Bouc–Wen iterative recipe applied to sports.
5. Evaluate on open-loop simulation of 2025 games: predict full-game win-prob trajectory from kickoff state.
Effort: ~3–5 engineer-days (PySINDy + nflverse pipeline + hyperopt). No new data cost.

## 12. Reproducible test
Dataset: 2022–2024 nflverse play-by-play, game-state trajectories; test = 2025 season Weeks 1–8. Metric: BFR (Eq. 5a) of open-loop simulated win-probability trajectories; baseline: (a) a 2nd-order polynomial SINDy without hidden states, (b) a naive linear ARX on the same trajectories. The hidden-state SINDy must beat both.

## 13. Acceptance / rejection gate
**ADOPT if:** hidden-state SINDy achieves BFR ≥ 70% on the held-out 2025 Weeks 1–8 window AND beats both baselines by ≥ 10 BFR points AND the recovered equation contains ≤ 8 nonzero terms. **REJECT if:** BFR < 50%, or metric-optimal model is structurally nonsensical on human review (e.g. win prob increasing as time expires while trailing), or baselines win. Gate pre-registered.

## 14. Improvement experiment
Beyond the paper: **Weak-form SINDy for NFL** — replace derivative fitting (the paper's identified failure point under noise and collinearity) with the integral/weak formulation (Messenger & Bortz 2021; Russo & Laiu 2022) applied to the game-state trajectories. Sports data is noisy (play-level outcomes are high-variance); weak-form integration should denoise the library matrix without the tunable-derivative-regularization hack. Test whether weak-form SINDy recovers sparser, more stable equations (term-count and coefficient variance across bootstrap resamples of games) than STLS on the same 2022–2024 trajectories.
