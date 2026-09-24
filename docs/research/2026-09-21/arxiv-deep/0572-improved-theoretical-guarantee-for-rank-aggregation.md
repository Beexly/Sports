# [0572] Improved theoretical guarantee for rank aggregation via spectral method (arXiv:2309.03808v2)

**Citation:** Ziliang Samuel Zhong, Shuyang Ling (2023). *Improved theoretical guarantee for rank aggregation via spectral method*. arXiv:2309.03808v2. URL: https://arxiv.org/abs/2309.03808v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 17509 lines; main sections §1–4 and Appendices A–C read in full, including all proof bodies).
**Verdict:** ADAPT — the spectral algorithm itself (top-eigenvector-of-skew-symmetric-matrix ranking, Algorithms 1–2) is directly implementable as a robust score-based team ranker for GSE's college/NFL strength tables; the paper's theoretical contribution (Ω(n log n) sample complexity via leave-one-out) informs minimum-data requirements but the ERO outlier model assumptions do not describe real sports data.

## 1. Research question
Given noisy, partially observed pairwise comparisons of n items, how well do spectral ranking algorithms (top eigenvector of the unnormalized or degree-normalized pairwise-difference matrix) recover the true underlying scores? The paper sharpens the entry-wise (ℓ∞) eigenvector perturbation bound via the leave-one-out technique, reducing the sample complexity for accurate ranking under the Erdös–Rényi Outliers (ERO) model from Ω(n^{4/3} log^{3/2} n) to Ω(n log n), and derives per-item maximum-displacement error bounds.

## 2. Dataset / schema
- No real data. All experiments are synthetic: score vectors r generated as (a) uniform r_k = k (k=1..n), (b) sorted Gamma(a=1,b=1) samples; pairwise measurement matrices H sampled from the ERO(η,p,n) model (see §4).
- Settings: n ∈ [200, 1000]; triplets (η, n, p) varied to sweep SNR; each configuration averaged over 25 random instances.
- Figures 2–6 report relative ℓ∞ error R(x, x̄) and maximum/average displacement errors ρ∞ and ρ̄ as heatmaps/curves over (SNR, p, η).

## 3. Method / model
- **Algorithm 1 (unnormalized spectral ranking):** compute top eigenvector φ_1 of iH (H anti-symmetric ⇒ iH Hermitian, real eigenvalues); resolve the complex phase ambiguity via the rotation θ̂ in (2.6) (choose θ so Re⟨e^{iθ}φ_1, 1_n⟩ = 0 and Im⟨e^{iθ}φ_1, 1_n⟩ ≥ 0); rank by entries of x = Re(e^{iθ̂}φ_1).
- **Algorithm 2 (normalized spectral ranking):** degree matrix D = diag(|H|1_n); compute top eigenvector ψ_1 of iD^{−1}H; phase-resolve via (2.10); rank by entries of Dx, x = Re(e^{iθ̂}ψ_1).
- **Proof technique:** surrogate one-step power approximation φ̃_1 = iHφ̄/σ plus leave-one-out auxiliary matrices H^{(k)} (zeroing row/column k of the noise Δ) to decouple statistical dependence between Δ and (φ_1 − βφ̄_1), then matrix Bernstein concentration.

## 4. Equations & assumptions
- ERO model (2.1): for i<j, H_{ij} = r_i − r_j with prob. ηp; Z_{ij} ~ i.i.d. U[−M,M] with prob. (1−η)p; 0 with prob. 1−p; H_{ij} = −H_{ji}. Unified form: H_{ij} = X_{ij}(Y_{ij}(r_i − r_j) + (1−Y_{ij})Z_{ij}), X~Bernoulli(p), Y~Bernoulli(η).
- Data matrix decomposition (2.2–2.4): H = H̄ + Δ, H̄ = E[H] = ηp(r1_n^T − 1_n r^T) (rank-2 signal); Δ = noise.
- Population SVD (2.5): H̄ = σ̄(ū_1 ū_2^T − ū_2 ū_1^T), σ̄ = ηp√n·‖r − α1_n‖, ū_1 = −1_n/√n, ū_2 = (r − α1_n)/‖r − α1_n‖, α = r^T 1_n / n. Top eigenpair of iH̄: φ̄_1 = (ū_2 + iū_1)/√2 with eigenvalue σ̄ (real part ∝ centered scores).
- **Assumption 3.1 (SNR):** SNR(η,p,n,r,M) := √(η²pn/log n) · ‖r − α1_n‖/(√n·M) ≳ 1.
- **Theorem 3.2 (ℓ∞ perturbation, Algorithm 1):** min_{|β|=1} ‖φ_1 − βφ̄_1‖_∞ ≲ SNR^{−1}‖φ̄_1‖_∞; and R(x, x̄) ≲ SNR^{−1}, where R(x,y) := min_{s∈{±1}} ‖x/‖x‖ − s·y/‖y‖‖_∞ / (‖y‖_∞/‖y‖).
- Normalized setting: λ(η,p,n,r,M) := (1/pnM)·min_i D̄_{ii} = (1/n)(η·min_i‖r_i 1_n − r‖_1/M + (1−η)(n−1)/2) (3.5); Assumption 3.3: SNR ≳ λ^{−3}.
- **Theorem 3.4 (Algorithm 2):** min_{|β|=1} ‖ψ_1 − βψ̄_1‖_∞ ≲ λ^{−3} SNR^{−1}‖ψ̄_1‖_∞; R(Dx, D̄x̄) ≲ λ^{−8} SNR^{−1}.
- **Corollaries 3.5–3.6 (maximum displacement):** ρ∞(π, π̂) ≲ (‖r−α1_n‖ / (n·min_{i≠j}|r_i − r_j|))·SNR^{−1}·(‖x̄‖_∞/‖x̄‖) (Alg 1); for r_k=k this simplifies to ρ∞(id, π̂) ≲ SNR^{−1} (and ≲ λ^{−8}SNR^{−1} for Alg 2).
- Displacement metric (3.9): ρ_i(π_1,π_2) = (1/(n−1))·(# order violations involving item i); ρ∞ = max_i ρ_i (3.10), ρ̄ = mean_i ρ_i (3.11).
- Assumptions: scores bounded r_i ∈ [−M,M]; true scores distinct (for ranking); ERO generative model with independent Bernoulli sampling and uniform outliers.

## 5. Features / target
- Input: the pairwise measurement matrix H (cardinal comparisons r_i − r_j with outliers and missingness).
- Target: the global ranking π induced by the true score vector r.
- No feature engineering — the algorithm is purely spectral on H.

## 6. Validation design
- Synthetic validation only: uniform and Gamma-distributed ground-truth scores, n = 200–1000, 25 random ERO instances per (η,p,n) configuration; SNR swept 0.26–1.7.
- Compared: Algorithm 1 vs Algorithm 2; uniform vs skewed (Gamma) r; also benchmarked against the ℓ2/ℓ∞ bounds of d'Aspremont et al. [15] (SVD-RS / SVD-NRS, which Algorithms 1–2 are equivalent to).
- Metrics: relative ℓ∞ eigenvector error R(·,·) and max/average displacement ρ∞, ρ̄.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- Figure 2: "if the SNR is greater than 0.5, the relative error is roughly below 0.3; moreover, as the SNR increases, the relative error decreases." On the curves: SNR=0.5 → relative error ≈ 0.8; SNR=0.8 → ≈ 0.5; SNR=1.7 → ≈ 0.2 — "This confirms the relative error decays at the rate of SNR^{−1}."
- Figure 3 (maximum displacement, uniform r): SNR=0.5 → ≈ 0.4; SNR=0.8 → ≈ 0.3; SNR=1.7 → ≈ 0.15 — "This justifies the RHS of the error bound in Corollary 3.5."
- Algorithm 1 vs 2 (Figure 4, Gamma r, n=1000): "the main performance difference between two algorithms occurs when p < 0.2. In this case, the measurement graph is not highly connected... mitigated by normalizing the data matrix via the degree." Maximum displacement (Figure 5): "both algorithms perform similarly."
- Skewed-vs-uniform insight: "ρ∞(π, π̂) is much larger for the skewed distributed r" at the same SNR, and "ρ̄(π, π̂) is much smaller than ρ∞(π, π̂)" — because Corollaries 3.5–3.6 make maximum displacement proportional to the inverse minimum score separation, which is tiny for Gamma-distributed scores.
- Core claim: sample complexity reduced "from Ω(n^{4/3} log^{3/2} n) to Ω(n log n)" pairwise measurements for ℓ∞ error O(n^{−1/2}) under r_k=k.

## 8. Code / data availability
None stated. No GitHub link, no dataset (synthetic-only experiments).

## 9. Leakage & limitations
- No real data anywhere — every "experiment" is the paper's own assumed ERO generative model, so the numerics confirm the theory under the theory's own assumptions (circular validation; zero external validity evidence).
- ERO outlier model (uniform U[−M,M] corruption, independent Bernoulli observation) does not resemble sports: real upsets are skill-correlated, not uniform noise; observation graphs (schedules) are structured, not Erdös–Rényi; score differences have heavy-tailed margins, not the bounded uniform noise.
- The λ^{−8} factor in Theorem 3.4 / Corollary 3.6 makes the normalized-algorithm bound nearly vacuous for skewed degree distributions (λ≈1/4 ⇒ λ^{−8} ≈ 65,536) — the bound holds but is not informative.
- Maximum-displacement bound explodes when true scores are close (inverse minimum-separation dependence) — precisely the regime that matters in sports ranking (many near-equal teams).
- No comparison against non-spectral baselines (MLE/BTL, least squares, Elo) — only against the earlier spectral bounds it improves upon.
- NFL transfer: n=32 teams, dense schedule — the Ω(n log n) regime is trivially satisfied; the theory's asymptotic value is nil for n=32. The algorithmic value is a robust ranker from score differentials with missing/outlier games (CFB transfer portal chaos, preseason).

## 10. GSE overlap
Extension, not duplicate. Per existing-research-map.md: Bradley-Terry, Plackett-Luce, and Elo are inventoried in the 26-metric catalog; learning-to-rank is an ML-brief area; state-space team strength is covered (Lopez/Baumer 1701.05976 read in depth). But NO repo work uses spectral/eigenvector ranking on the skew-symmetric score-difference matrix, and no work addresses outlier-robust score-based ranking with per-item displacement guarantees. This is a new capability for the team-ratings lane (especially college, where schedules are sparse and score margins noisy).

## 11. GSE implementation spec
- Build spectral ranker: construct H from game score differentials (margin, optionally MOV-capped at ~28 to blunt garbage-time tails), run Algorithm 1 (unnormalized) and Algorithm 2 (degree-normalized) to produce team rankings; use on CFB (n≈134, sparse cross-conference graph — the paper's exact regime) and NFL (n=32).
- Pair with existing metrics: compare spectral ranking vs Massey/Colley/Elo on the same schedule; use the ρ∞-style displacement diagnostic (per-team order-violation count) as a stability metric for published power ratings.
- Training protocol: none needed (closed-form eigenvector) — the "training" is choosing the MOV cap and optional per-game weights; tune by rank-correlation with end-of-season SRS on 2015–2025.
- Serving: recompute weekly; O(n³) eigendecomposition is trivial at n=134. Effort: ~2 days.

## 12. Reproducible test
- Dataset: CFB 2015–2025 via CFBD (or nflverse for NFL): all FBS games, score differentials.
- Metric: Kendall's τ between the spectral ranking (week 12) and end-of-season SRS ranking, plus mean displacement ρ̄.
- Baseline: Colley/Massey-style least-squares ranking on the same games (the standard score-differential ranker the spectral method should displace).

## 13. Acceptance / rejection gate
- ADOPT spectral ranking as a GSE power-rating input if on CFB 2015–2025 it beats the least-squares baseline on Kendall's τ vs end-of-season SRS in ≥6 of 10 seasons with mean Δτ ≥ +0.02, AND its week-to-week rank displacement is ≤ baseline (stability check).
- ADAPT as a diagnostic only (displacement-stability metric for existing ratings) if the ranking itself doesn't win but the per-item ρ_i diagnostic proves useful.
- REJECT if it loses on both accuracy and stability.

## 14. Improvement experiment
- Weight the pairwise-difference matrix by game recency and leverage (playoff-implication weight): H_{ij} = w_t·clip(margin, 28), w_t decaying by weeks-since-game, and re-derive the ranking — the paper's theory assumes exchangeable observations; a weighted-H variant breaks the ERO assumptions but matches sports reality. Test whether the weighted spectral ranker beats both the unweighted spectral ranker and the least-squares baseline on the §13 gate, which would show the spectral form's value is in the algorithm, not the theory.
