# [1819] Uncertainty Quantification in the Bradley-Terry-Luce Model (arXiv:2110.03874)

**Citation:** Chao Gao, Yandi Shen, Anderson Y. Zhang (2021). *Uncertainty Quantification in the Bradley-Terry-Luce Model*. arXiv:2110.03874. Published version: Gao, Shen, Zhang (2023), *Information and Inference: A Journal of the IMA*, 12(2):1073–1140. DOI: 10.1093/imaiai/iaac032. URL: https://arxiv.org/abs/2110.03874
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, complete paper including appendices).
**Verdict:** ADAPT — the paper's per-team standard-error and rank-confidence-interval machinery for Bradley-Terry ratings ports directly into GSE's calibration/abstention lane; it is theory, not an adoptable NFL system.

## 1. Research question
Prior work on the Bradley-Terry-Luce (BTL) paired-comparison model had established only rate-optimal ℓ₂ and ℓ∞ estimation bounds for the maximum likelihood estimator (MLE) and the spectral (rank centrality) estimator — first-order asymptotics with no distributional theory. The paper asks: can we obtain sharp, uniform, non-asymptotic expansions for both estimators in the sparsest possible comparison-graph regime, and thereby derive (i) finite-dimensional central limit theorems, (ii) confidence intervals for individual merits and for team ranks with data-driven lengths, and (iii) the exact optimal constant of ℓ₂ estimation — and which estimator (MLE vs spectral) attains it?

## 2. Dataset / schema
No real dataset is used anywhere in the paper. All empirical content is Monte Carlo simulation:
- Comparison graph: Erdős–Rényi G(n, p) adjacency A = {A_ij}, i.i.d. Bernoulli(p).
- Merit parameters: θ*_i i.i.d. from Unif([0,2]) (dynamic range κ = 2), fixed L = 1 comparison per connected pair.
- Outcomes: y_ij1 ~ Bernoulli(ψ(θ*_i − θ*_j)) with ψ(t) = e^t/(1+e^t).
- CLT validation (Figure 1): n ∈ {100, 200, 500, 1000, 2000}, p = (log n)^3/n, 1000 replications per n; QQ-plots of normalized θ̂_1 and θ̃_1 against N(0,1) quantiles.
- Risk validation (Figure 2): n ∈ {1000, 2000, 3000, 4000, 5000}, p = (log n)^{3.5}/n; empirical squared ℓ₂ risk vs theoretical prediction for both estimators.
Schema of simulated data: n×n binary adjacency matrix A; win/loss outcomes {y_ijℓ} for A_ij = 1. Not stated in paper: any real sports, crowdsourcing, or preference dataset — sports analytics appears only as a motivating example ("construct a confidence interval for the rank of her team of interest" after a tournament, §4.2).

## 3. Method / model
- **Model:** BTL on a random comparison graph. n individuals with latent merits θ* ∈ ℝⁿ. Graph A is Erdős–Rényi with edge probability p. Each connected pair (i,j) is compared L times; y_ijℓ = 1 with probability ψ(θ*_i − θ*_j) = e^{θ*_i}/(e^{θ*_i}+e^{θ*_j}), independently.
- **MLE:** θ̂ ∈ argmin_{θ: 1_nᵀθ=0} ℓ_n(θ) with normalized negative log-likelihood ℓ_n(θ) = Σ_{i<j} A_ij [ȳ_ij log(1/ψ(θ_i−θ_j)) + ȳ_ji log(1/ψ(θ_j−θ_i))], where ȳ_ij = (1/L)Σ_ℓ y_ijℓ. Computed by convex optimization (likelihood strongly convex w.h.p. on {θ: ‖θ−θ*‖∞ ≤ 5}; exists and is unique with probability 1−O(n^{−10})).
- **Spectral estimator (rank centrality, Negahban–Oh–Shah):** build Markov chain P with P_ij = A_ij ȳ_ji/d for i≠j (d = 2np), P_ii = 1 − (1/d)Σ_{k≠i} A_ik ȳ_ki; take stationary distribution π̂ (π̂ᵀP = π̂ᵀ); set θ̃_i = log π̂_i − (1/n)Σ_k log π̂_k. Population stationary measure is π*_i = e^{θ*_i}/Σ_k e^{θ*_k}.
- **Proof technique (novel):** a self-consistent equation for the second-order remainder vector δ (avoiding direct inverse-Hessian approximation, which is the bottleneck when p → 0) plus a novel leave-two-out analysis to obtain sharp ℓ∞ control of the remainder. This is the technical core of the paper.

## 4. Equations & assumptions
- Win probability: P(y_ijℓ = 1) = ψ(θ*_i − θ*_j), ψ(t) ≡ e^t/(1+e^t).
- Parameter space: Θ(κ) ≡ {θ* ∈ ℝⁿ : max_i θ*_i − min_i θ*_i ≤ κ, 1_nᵀθ* = 0} (eq. 2.1). Identifiability only up to global shift; centering imposed.
- Operating regime (eq. 2.2): κ = O(1), np ≫ (log n)^α for some α ≥ 1. The authors note np ≥ (1+ε)log n is the connectivity threshold, so this is the sparsest possible identifiable regime up to polylog factors.
- **Theorem 2.2 (MLE expansion, α = 3/2):** for every i, θ̂_i − θ*_i = (1+ε_{1,i}) b_i/d_i + ε_{2,i}, with ‖ε_1‖∞ = o(1), ‖ε_2‖∞ = o(1/√(npL)) w.p. 1−O(n^{−10}), where b_i = Σ_{j≠i} A_ij(ȳ_ij − ψ(θ*_i−θ*_j)) and d_i = Σ_{j≠i} A_ij ψ′(θ*_i−θ*_j). Main term b_i/d_i ≍ 1/√(npL).
- **Theorem 2.5 (spectral expansion):** same form with b̃_i = Σ_{j≠i} A_ij(π*_i+π*_j)(ȳ_ij − ψ(θ*_i−θ*_j)), d̃_i = π*_i · Σ_{j≠i} A_ij ψ(θ*_j−θ*_i).
- **Proposition 2.1 (existing rate bounds, quoted):** ‖θ̂−θ*‖² ≤ C/(pL), ‖θ̂−θ*‖∞² ≤ C log n/(npL) (same for spectral), C = C(κ).
- **Proposition 4.1 (finite-dim CLT, MLE):** (ρ_1(θ̄)(θ̂_1−θ*_1), …, ρ_k(θ̄)(θ̂_k−θ*_k)) ⇝ N_k(0, I_k) for fixed k, with ρ_i(θ) = √(L·Σ_{j≠i} A_ij ψ′(θ_i−θ_j)) (data-driven sample version) or √(pL·Σ_{j≠i} ψ′(θ_i−θ_j)) (population version), for θ̄ ∈ {θ̂, θ*}. Analogous CLT for the spectral estimator (Prop. 4.2).
- **Proposition 4.3 (rank CI):** C_1 = [θ̂_1 − ρ_1(θ̂)z_{1−α/2}, θ̂_1 + ρ_1(θ̂)z_{1−α/2}]; for i ≥ 2, C_i = [θ̂_i − τ_i, θ̂_i + τ_i] with τ_i = (1+c_0)√(2 log n · ρ_i^{−2}(θ̂)); rank CI [n_1+1, n−n_2] (n_1 = #{i: C_1 ≤ C_i}, n_2 = #{i: C_i ≤ C_1}) covers r(1) with asymptotic probability ≥ 1−α. Key property: ρ_i^{−2} is smaller for teams with more comparisons → data-driven lengths.
- **Proposition 4.4 (MLE ℓ₂, exact constant):** ‖θ̂−θ*‖² = (1+o(1))/(pL) · Σ_{i=1}^n (Σ_{k≠i} ψ′(θ*_i−θ*_k))^{−1} w.p. 1−O(n^{−10}).
- **Proposition 4.5 (spectral ℓ₂):** ‖θ̃−θ*‖² = (1+o(1))/(pL) · Σ_i [Σ_{j≠i}(e^{θ*_i}+e^{θ*_j})²ψ′(θ*_i−θ*_j)] / (Σ_{j≠i}(e^{θ*_i}+e^{θ*_j})ψ′(θ*_i−θ*_j))² — strictly larger constant than MLE.
- **Theorem 4.7 (local minimax lower bound, via van Trees):** inf_θ̂ sup_{θ ∈ B(θ*,ε_n)∩Θ(κ)} E_θ‖θ̂−θ‖² ≥ (1+o(1))·(1/(pL))Σ_i(Σ_{j≠i}ψ′(θ*_i−θ*_j))^{−1} for ε_n ≫ (npL)^{−1/2}. Matches Prop. 4.4 ⇒ **MLE is asymptotically locally minimax optimal; spectral is not.**
- **Assumptions stated:** κ = O(1) (bounded dynamic range; keeps ψ bounded away from 0/1 and Hessian well-conditioned); ER graph with np ≫ (log n)^α; independent Bernoulli comparisons; L comparisons per edge (heterogeneity generalization in Remark 2.4: p_ij, L_ij allowed with min p_ij ≫ (log n)^α/n and bounded ratio max/min).
- No equations invented: the above are all from the paper.

## 5. Features / target
Not applicable as stated — this is an inferential-statistics theory paper, not a predictive ML paper. Observable inputs: the comparison graph A (n×n adjacency) and binary comparison outcomes {y_ijℓ}. Inferential targets: the merit vector θ* ∈ ℝⁿ, its rank vector r, and the exact constants of the estimators' ℓ₂ risk. There is no feature engineering, no covariate, and no prediction horizon.

## 6. Validation design
Simulation-only validation (Section 4.4):
- CLT check: QQ-plots of the CLT-normalized first coordinates of MLE and spectral estimator vs N(0,1), n ∈ {100, 200, 500, 1000, 2000}, 1000 replications each, θ* i.i.d. Unif([0,2]), L = 1, p = (log n)^3/n.
- Risk check: empirical vs theoretical squared ℓ₂ risk curves, n ∈ {1000,…,5000}, p = (log n)^{3.5}/n.
- Baseline compared: MLE vs spectral estimator head-to-head on ℓ₂ risk.
- No train/validation/test splits (no data to split), no time ordering, no cross-validation, no real-data experiment, no comparison against Elo/Glicko or any sports model. Coverage of the rank CI is a theorem (Prop. 4.3), not an empirical measurement.

## 7. Numerical results / baselines
- QQ-plots: "starting from n = 500, both QQ-plots align very well with the diagonal line, validating both CLTs" (Fig. 1).
- Risk plot: "the theoretical predictions in Propositions 4.4 and 4.5 are very accurate, and also that the MLE indeed achieves a smaller risk than the spectral estimator" (Fig. 2; red/theory-vs-dashed/empirical, MLE curve below spectral).
- The exact-constant results are analytic, not numeric: MLE ℓ₂² constant = (1+o(1))/(pL)·Σ_i(Σ_k ψ′(θ*_i−θ*_k))^{−1}, matching the local minimax lower bound — i.e., MLE is optimal and spectral is suboptimal by an explicit constant gap (Prop. 4.5 numerator/denominator form).
- No scalar metric values (no accuracy %, no log-loss, no CI coverage percentages) are reported anywhere; the "results" are curve agreement and theorems. Paper's claim vs my read: the authors claim these are the first sharp non-asymptotic expansions and exact constants for BTL in the sparse regime; the simulation evidence is visual, not tabular.

## 8. Code / data availability
None stated in the paper. No GitHub link, no package, no dataset URL. The simulations are described in enough detail to reimplement (Section 4.4 parameters above), but no code is provided.

## 9. Leakage & limitations
- **Graph model mismatch:** the NFL schedule is not Erdős–Rényi — it is a fixed, highly structured, unbalanced schedule (divisional double round-robin, rotation). The paper's uniformity and concentration arguments lean on ER randomness; applying ρ_i(θ̂) SEs to NFL data is an extrapolation, though Remark 2.4's heterogeneity extension (pair-specific p_ij, L_ij with bounded ratio) partially covers unbalanced schedules.
- **Static strengths:** θ* is fixed; NFL team strength drifts within a season (injuries, QB changes). The theory has no time dynamics.
- **Binary outcomes only:** no margin of victory — GSE's spread/total lanes need MOV, which this model discards.
- **κ = O(1):** bounded dynamic range rules out the true NFL tails (a historically bad team vs a great one); in practice ψ saturates and the well-conditioning argument weakens.
- **No home-field advantage, no ties, no covariates** (rest, weather, injuries).
- **Rank CI coverage is asymptotic** and the τ_i construction carries an arbitrary slack constant c_0; finite-sample coverage for n = 32 NFL teams is untested in the paper (simulations start at n = 100).
- **No real-data validation** of any kind — the sports example is motivational prose, not an experiment.
- Be adversarial about the win-prob use: the CLT is for θ̂_i marginally; propagating to ψ(θ̂_i−θ̂_j) needs the delta method plus the asymptotic-independence structure the finite-dimensional CLT provides — valid in the paper's regime, untested on real schedules.

## 10. GSE overlap
- GSE's standing benchmark lane tracks Elo/Glicko/TrueSkill-style team ratings (memory: benchmark lane mines @sfdata9ers, @tejfbanalytics, etc.; corpus rule: all sports material in Beexly/Sports docs/research). This paper is not a rating algorithm competitor — it is uncertainty quantification *for* the BT-family MLE that underpins such ratings.
- Checked: 2110.03874 appears in none of the program's trackers, dedup lists, citing ledgers, or the existing-research map — no duplication.
- GSE's engine posts public picks with no uncertainty bars, while the program's stated goal is the *most calibrated* prediction company. The paper supplies the missing per-team standard error: SE_i ≈ 1/ρ_i(θ̂), ρ_i(θ) = √(L·Σ_{j≠i} A_ij ψ′(θ_i−θ_j)), plus a principled rank-CI construction with data-driven lengths — directly usable for (a) power-ranking CIs, (b) win-probability CIs via the delta method, (c) abstention ("don't post the pick when the 95% win-prob CI covers 0.5"), which maps to the program's abstention lane.
- Extension, not duplicate: no existing corpus entry gives exact per-team SEs or rank CIs for BT ratings; most program entries do point estimation.

## 11. GSE implementation spec
Concrete build, post-processing only on top of GSE's existing BT/Elo-style ratings:
1. **Data:** nflverse schedules + scores (reg-season, 2015–2025). Build game graph A (A_ij = 1 if teams i,j met in window), outcomes y_ij ∈ {0,1} (home/away orientation fixed; add explicit HFA term h — the paper has none, so estimate h jointly by augmenting θ with one global parameter, or fold HFA into features before BT fit).
2. **Fit:** BT-MLE with centering constraint 1ᵀθ = 0 via convex optimization (LBFGS on ℓ_n(θ), eq. 2.3; n = 32 so trivial compute). Rolling window (e.g., last 3 seasons, exponential recency weights — the paper assumes static θ*, so windowing is our stationarity hack).
3. **SEs:** for each team compute d_i = Σ_{j≠i} A_ij ψ′(θ̂_i−θ̂_j), ψ′(t) = ψ(t)(1−ψ(t)); ρ_i(θ̂) = √(Σ_{j≠i} A_ij ψ′(θ̂_i−θ̂_j)) (L = 1); SE_i = 1/ρ_i(θ̂).
4. **Win-prob CI:** for matchup (i,j), p̂ = ψ(θ̂_i−θ̂_j+h·home); by Prop. 4.1 finite-dim CLT, Var(θ̂_i−θ̂_j) ≈ ρ_i^{−2}+ρ_j^{−2} (off-diagonals vanish); delta method: SE_p̂ = ψ′(θ̂_i−θ̂_j)·√(ρ_i^{−2}+ρ_j^{−2}); 90% CI p̂ ± 1.645·SE_p̂.
5. **Rank CI:** implement §4.2 construction for weekly power rankings: C_1 exact-normal for team of interest, τ_i = (1+c_0)√(2 log n·ρ_i^{−2}(θ̂)) for others, rank interval [n_1+1, n−n_2].
6. **Serving:** compute once per week after ratings refresh; store SE_i and CI bounds alongside each pick in the predictions DB; abstention rule consults the CI.
7. **Effort:** 1–2 engineer-days (pure NumPy/SciPy post-processing; no new data infra).

## 12. Reproducible test
- **Dataset:** nflverse play-by-play/schedules, NFL regular seasons 2020–2025 (~272 games/season; test window 2024–2025, ~544 games).
- **Protocol:** rolling 3-season window BT-MLE refit weekly (recompute θ̂, ρ_i each week using only games already played — strictly no lookahead). For each test game, emit p̂ and 90% CI.
- **Metrics:** (a) Brier score and log-loss vs two baselines: plain BT-MLE point estimates, and market-implied probabilities (closing moneyline via The Odds API); (b) empirical coverage of the 90% win-prob CIs overall and per predicted-probability decile (calibration check); (c) Brier of the abstention policy (skip games whose 90% CI covers 0.5) vs always-bet.
- **Runnable:** yes — single script, nflverse + scipy, no GPU.

## 13. Acceptance / rejection gate
- **ADOPT the SE/CI machinery if, on the 2024–2025 test window:** (i) empirical coverage of the 90% win-probability CIs falls in [87%, 93%] overall AND within ±4pp of 90% in at least 8 of 10 predicted-probability deciles (calibration holds despite the ER-graph assumption violation); and (ii) the abstention policy (skip CI-covers-0.5 games) achieves Brier ≥ 0.005 better than the always-bet BT baseline on the games it does bet.
- **REJECT otherwise** — in particular if coverage is systematically off (e.g., <85%), which would indicate the sparse-ER variance formula does not transfer to the structured NFL schedule.
- Gate is stated before any test is run.

## 14. Improvement experiment
The paper's weakest assumption for GSE is static θ*. **Experiment:** time-varying BT — replace the rolling window with exponentially decayed pseudo-counts inside the likelihood itself (weight game (i,j) at lag t by λ^t in ℓ_n(θ), λ ∈ {0.90, 0.95, 0.98} per week) and derive the corresponding weighted ρ_i^{(λ)} = √(Σ A_ij w_ij ψ′(θ̂_i−θ̂_j)) for the SEs. Hypothesis: decay-weighted MLE tracks in-season strength changes (injuries, QB swaps) faster than the windowed static fit, so its CIs stay calibrated late-season when the static model's coverage degrades. Test: same protocol as §12, compare log-loss and CI coverage in weeks 10–18 only; expect the decayed variant to win late-season log-loss by ≥0.01 while holding coverage in [87%, 93%]. A second follow-up: incorporate margin of victory via a Rao–Kupper/Thurstone–Mosteller generalization and check whether MOV-weighted SEs tighten further without breaking calibration.

**Verdict:** ADAPT
