# [0547] Matrix Concentration Inequalities for Time-Inhomogeneous Markov Chains (arXiv:2605.24445v1)

**Citation:** Zanetti, L. (2026). *Matrix Concentration Inequalities for Time-Inhomogeneous Markov Chains*. University of Bath. arXiv:2605.24445v1 (dated 2026-08-10). URL: https://arxiv.org/abs/2605.24445v1
**Ledger completed:** 2026-09-21. **Read:** full text §§1–5 + references (PDF text extract); proof machinery (§§2–4, appendices) skimmed.
**Verdict:** ADAPT — a pure-probability paper whose §5 application is a complete theoretical analysis of **Elo under a dynamic Bradley–Terry model with evolving skills**: tracking-error decomposition, optimal step-size rule η = Θ(√Δ), and an averaged-rating concentration theorem. Directly usable for tuning GSE's online rating systems.

## 1. Research question
Concentration inequalities for Markov-dependent matrix observables exist only for *time-homogeneous* chains (spectral/Poisson-equation methods don't extend). The paper asks: can Chernoff-type bounds for λ_max of sums of Hermitian matrix observables be established for *time-inhomogeneous* chains under Ollivier–Ricci positive curvature (per-kernel Wasserstein contraction — a local-in-time, verifiable property), with optimal curvature dependence? Application: does the Elo rating system track *time-varying* true skills under a dynamic BTL model, and at what rate?

## 2. Dataset / schema
- **Theory paper — no empirical dataset.** The Elo application is fully analytic (no simulations or sports data).
- **Schema (Elo application):** n ≥ 2 players; true ratings ρ^t ∈ [−M, M]^n (M > 1 known), Σ_i ρ^t_i = 0; matchup distribution q^t over pairs; environment E^t = (ρ^t, q^t) evolves as an *independent* time-inhomogeneous Markov chain with kernels Γ_t of Wasserstein curvature ≥ ν; match outcomes Y_t ∼ Bernoulli(σ(ρ^t_{I_t} − ρ^t_{J_t})); Elo update with step η ∈ (0, 1/2): X̂^t_I ← X^{t−1}_I + ησ(X^{t−1}_J − X^{t−1}_I) (loser mirrored), then orthogonal projection onto X_M = [−M,M]^n ∩ {x ⊥ 1}.

## 3. Method / model
**Main concentration results.** Theorem 7 (compact space, diameter D, per-kernel Wasserstein contraction (1−κ_t), effective curvature κ, Lipschitz observables Lip(F_t) ≤ L): P(λ_max(Σ_{j=1}^n(F_j(X_j) − EF_j(X_j))) ≥ nε) ≤ m^{2−π/4}·exp(−nε²/(2v²)), v² = (192/π²)·L²D²/κ — sub-Gaussian with variance proxy O(L²D²κ^{−1}). Theorem 8: with oscillation bound Δ_op, improves diameter dependence to logarithmic: v̄² = (3200/π²)·Δ_op²κ^{−1}(1 + log(LD/Δ_op)). Noncompact regime (§3.2): replaces diameter with uniform operator-norm bound under L²(μ_t) → L²(μ_{t−1}) contraction (Saloff-Coste–Zúñiga merging notion).
**Proof technique:** multivariate trace inequality of Garg–Lee–Song–Srivastava (many-matrix Golden–Thompson) to reduce the matrix mgf to a trace of Markov-dependent matrix products + generalization of Lezaud's "direct method" (iterative centering) to the inhomogeneous matrix setting; key lemma: sup_x‖F̃(x)‖_op bounded by diameter × Lipschitz constant; positive curvature contracts the Lipschitz seminorm (extends to matrix-valued functions). Hermitian Hoeffding lemma (Lemma 31) as an auxiliary.
**Elo analysis.** Curvature of fixed-environment Elo (Lemma 24, from Olesker-Taylor & Zanetti 2024): W_1(K_e(x,·), K_e(x̃,·)) ≤ (1−κ)‖x−x̃‖_2 with **κ = (1/8)ηe^{−4M}λ**, where λ = min over environments of the matchup-Laplacian spectral gap λ(e) = min_{v⊥1} Σ_{i,j} q_{ij}(v_i−v_j)²/Σ_i v_i² (quantifies how fast result information propagates — standard BTL quantity). Sensitivity to environment (Lemma 25): ≤ η·d_E(e,ẽ). Joint chain curvature (Lemma 26): (1−κ) under the step-size condition **η ≤ ν/2**.

## 4. Equations & assumptions
- Theorem 7: P(λ_max(Σ(F_j(X_j)−EF_j(X_j))) ≥ nε) ≤ m^{2−π/4} exp(−nε²/(2v²)), v² = (192/π²)L²D²/κ.
- Theorem 8: same with v̄² = (3200/π²)Δ_op²κ^{−1}(1+log(LD/Δ_op)).
- Elo curvature: κ = (1/8)·η·e^{−4M}·λ.
- **Expected tracking (Lemma 27):** E‖X^t−ρ^t‖²_2 ≤ (1−κ)^{t−1}‖X^0−ρ^1‖²_2 + **Δ/κ + 2η²/κ**, where drift Δ bounds E[‖ρ^{t+1}−ρ^t‖²_2 + 4M‖ρ^{t+1}−ρ^t‖_1 | F_t] ≤ Δ.
- **High-probability tracking (Theorem 28):** after burn-in t ≥ Cκ^{−1}log(nMε^{−1}η^{−1}), P(‖X^t−ρ^t‖_2 ≥ √(Δ/κ) + (1+ε)√(2η²/κ) + CεB/√κ) ≤ 2e^{−ε²}, B = 2√2η + 2h_ρ + 4√2h_q (granularity bounds on environment jumps).
- **Averaged Elo (Theorem 29):** for T ≥ Cε^{−2}η^{−2}M²n log(n/δ), w.p. ≥ 1−δ: ‖(1/T)Σ_{k}X^k − (1/T)Σ_{k}ρ^k‖_2 ≤ √(Δ/κ) + (1+ε)√(2η²/κ). No granularity bound needed.
- **Optimal step size:** since κ ∝ η, the bound is minimized at **η = Θ(√Δ)** — small enough to minimize bias, large enough to track drift.
- **Stated assumptions:** (1) true ratings bounded in [−M,M] with known M; (2) environment evolves independently of Elo randomness (relaxable if matchup selection Q_t is Lipschitz in ratings — Remark 23); (3) uniform matchup connectivity λ > 0 across all environments; (4) drift bound Δ (ℓ_2² + 4M·ℓ_1); (5) η ≤ ν/2 (step size below environment curvature); (6) for Theorem 28, granularity bounds h_ρ, h_q on single environment jumps.

## 5. Features / target
- **Inputs:** sequential match outcomes + matchup pairs under a dynamic BTL model with drifting skills.
- **Targets:** online tracking of the latent skill vector ρ^t; theoretical bounds on tracking error.

## 6. Validation design
- Pure theory: no simulations, no data experiments. Validation is via comparison to prior results: static-Elo analysis (Olesker-Taylor & Zanetti 2024) gives ≈ η²/κ distance — the dynamic result adds a (B²+Δ²)/κ correction; Pillai & Smith (2013) scalar inhomogeneous bounds had variance proxy L²σ_∞²κ^{−2} (suboptimal κ^{−2} vs this paper's κ^{−1}); competing dynamic-BTL methods (Karlé & Tyagi 2023 sliding-window RankCentrality — not online, strong per-pair Lipschitz; Bong et al. 2020 kernel-smoothing + per-time MLE — expensive, not online) are discussed qualitatively.

## 7. Numerical results / baselines
No numerical experiments. The quantitative takeaways are the closed-form rates: tracking error √(Δ/κ) + √(η²/κ); optimal η = Θ(√Δ); burn-in Cκ^{−1}log(nMε^{−1}η^{−1}); averaging window T ≳ ε^{−2}η^{−2}M²n log(n/δ). The static-Elo baseline (≈ η²/κ, Olesker-Taylor & Zanetti 2024) is recovered as the Δ → 0 limit.

## 8. Code / data availability
Theory only; no code, no data.

## 9. Leakage & limitations
- **No empirical validation whatsoever:** the Elo tracking bounds are never tested on real sports data (not even chess, where Elo originated) — constants (C, 192/π², 3200/π²) are loose; practical guidance comes from the *rates*, not the constants.
- **Environment independence is strong:** true skills and matchup schedules evolving independently of the rating process is false in the NFL (schedules are fixed in advance — actually favorable — but "true skill" drift correlates with injuries/news the ratings also see).
- **Bounded ratings [−M,M] with known M** and the projection step are nonstandard vs sports Elo implementations; the curvature κ = (1/8)ηe^{−4M}λ decays *exponentially* in M — for realistic M the theoretical κ is tiny and the bounds vacuous in absolute terms.
- **NFL matchup connectivity λ is small:** 17-game schedules → sparse comparison graph → small λ → slow tracking; the theory says what to do (raise η) but the κ^{−1} dependence means the bound degrades fast.
- **The matrix concentration machinery (§§2–4) is far heavier than the Elo application needs** (the Elo results use the scalar corollaries); GSE should treat §§2–4 as a reference tool, not required reading.

## 10. GSE overlap
Per the existing-research map: **Elo/BTL rating systems** — the map has Elo-adjacent entries and ledger 0542/0544/0546 cover BT estimation and regularization, but **no entry analyzes online Elo tracking under drifting skills** — the existing work assumes static skills or re-fits batch estimators. The η = Θ(√Δ) step-size rule, the drift-vs-variance decomposition √(Δ/κ)+√(η²/κ), and the averaged-rating theorem are all new to the corpus. Note the natural pairing with ledger 0544 (phantom-player regularization stabilizes *estimation*) — this paper stabilizes *tracking over time*. Verdict: **extension** — the first dynamic-tracking theory for the rating systems GSE actually runs weekly.

## 11. GSE implementation spec
1. **Drift-calibrated K-factor for GSE's weekly Elo/power ratings.** Port: estimate the per-week skill drift Δ̂ from nflverse 2015–2025 (‖ρ̂^t − ρ̂^{t−1}‖²_2 using a batch BT fit per week, ℓ_2² + 4M·ℓ_1 form), then set the online update step η = c·√Δ̂ (tune c on 2021–2022, test 2023–2024) instead of a fixed K-factor. The paper's decomposition predicts this minimizes tracking error; the matchup-connectivity term λ can be computed from each season's schedule graph to adjust η upward in sparse-schedule regimes. Effort: ~3 days.
2. **Publish averaged ratings with a certified window.** Port Theorem 29: replace GSE's point-in-time weekly rating with a trailing average over T weeks, where T is chosen from the bound T ≳ ε^{−2}η^{−2}M²n log(n/δ) (plug GSE's η, M, n = 32). The theorem guarantees the averaged rating tracks averaged true skill — a defensible, citable justification for "our power rating is a 4-week average" content. Effort: ~2 days.

## 12. Reproducible test
- **Dataset:** nflverse 2015–2024 regular seasons; weekly batch-BTL skill estimates as the ρ^t proxy; Elo updates with step η.
- **Baseline:** fixed-K Elo (GSE's current or standard K = 20–32 equivalent).
- **Protocol:** for each season 2020–2024: estimate Δ̂ from the prior 3 seasons' weekly batch-BTL drift; set η = c√Δ̂ with c tuned on 2018–2019; run online Elo through the season; compare next-week SU prediction log-loss vs fixed-K Elo. Expectation from the theory: drift-calibrated η wins, with the largest gains in high-drift seasons (e.g., seasons with unusual parity/injury waves).

## 13. Acceptance / rejection gate
- **Adopt drift-calibrated η for GSE's online ratings** if it beats fixed-K Elo on next-week SU log-loss by ≥ 0.002/game averaged over 2020–2024 AND the optimal tuned c is stable across the 2018–2019 tuning window and the 2020–2024 test window (confirming η = Θ(√Δ) is a real scaling law, not a tuning artifact). **Adopt trailing-averaged publication ratings** only if the averaged rating additionally beats point-in-time on 4-week-ahead SU log-loss. **Reject otherwise.** Gates stated before running; Δ̂ estimation method and c-tuning window fixed in advance.

## 14. Improvement experiment
The paper's environment-independence assumption fails structurally in the NFL: matchup schedules are *fixed in advance* (not random), and skill drift correlates with observable events (injuries, QB changes). Exploit the fixed schedule: replace the random-matchup curvature λ (min over all environments) with the *actual* season schedule's Laplacian spectral gap λ_sched, computed exactly — this removes the worst-case min and tightens κ by the ratio λ_sched/λ_min. Then make Δ *state-dependent*: Δ_t = f(recent injury/news features) so η_t = c√Δ_t adapts within the season (raise K after a starting-QB injury, lower it in stable stretches). The paper's framework supports time-dependent bounds (Remark 30) — this turns their uniform-Δ theorem into an adaptive-K Elo that is provably tracking-optimal *and* schedule-aware, a genuine advance over both the paper and standard sports Elo.
