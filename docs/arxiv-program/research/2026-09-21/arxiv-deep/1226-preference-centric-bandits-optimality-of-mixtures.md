# Deep-Research Ledger 1226 — arXiv:2504.20877v2 (stat.ML, 30 Apr 2025)

**Title:** Preference-centric Bandits: Optimality of Mixtures and Regret-efficient Algorithms
**Authors:** Meltem Tatlı, Arpan Mukherjee, Prashanth L.A., Karthikeyan Shanmugam, Ali Tajer
**Version read:** v2 (30 Apr 2025). Full read verified on 2026-09-21: abstract, Sections 1–8 (including Theorems 1–8, Tables 1–3, Algorithm 1/2/3 pseudocode, Sec 5 CIRT anytime algorithm, Sec 6 experiments, Sec 7 risk-sensitive-bandit application, Sec 8 conclusion), plus key appendix excerpts (Hölder-constant lemmas 10–11, supplementary-material roadmap A–L). Text source: `2504.20877v2.pdf` → `pdftotext -layout` (37,452 words).

## 1. Question asked

Can stochastic bandits be redesigned around a *preference metric* (PM) — a signed Choquet integral (distortion functional) of an arm's full CDF — instead of mean reward, and can the learner efficiently learn the optimal *mixture* of arms (not just the best single arm) under that PM?

## 2. Dataset / schema

No real-world dataset. All experiments are synthetic bandits:
- **Bernoulli bandits** (Sec 6.1): K-arm Bernoulli models with mean vector p ∈ [0,1]^K; two-arm case used for GD (Gini deviation, h(u)=u(1−u)) and WRTD (Wang's right-tail deviation, h(u)=√u−u); closed-form mixture PM V(α,F)=⟨α,p⟩(1−⟨α,p⟩) for GD.
- **Gaussian bandits** (Sec 6.1): 3-arm Gaussian, variance 1, means 1, 3, 5; mean PM (convex case) and GD (concave case) evaluated.
- **Anytime CIRT experiment** (Sec 6.2): 2-arm Bernoulli, horizon T = 3·10⁶, discretization ε ∈ {0.03, 0.06, 0.12}, discretization number A = 4, error probability δ = 0.05.
- All runs averaged over **100 independent trials**.

## 3. Method

Four algorithms, all sharing a CDF-estimation core plus a *tracking* rule that steers per-arm sampling fractions τ_t(i)/t toward estimated mixture coefficients:

1. **PM-ETC-M (Algorithm 1)**: explores to build empirical CDFs F̂_{i,t}, then *commits* to the best discrete mixing coefficient a^(1) on the discretized simplex Δε^{K−1} (discretization (15)), and samples arms so fractions track a^(1). Requires instance-dependent exploration horizon N(ε) via the sub-optimality gap δ₁₂(ε) between the best and second-best discrete mixtures (Eq. 17).
2. **PM-UCB-M (Algorithm 2)**: no gap knowledge. Builds 1-Wasserstein confidence balls around empirical CDFs (Eq. 20), computes optimistic mixing coefficients a_t^U via joint maximization over mixtures and confidence distributions (Eq. 21), then selects the most *under-sampled* arm: A_{t+1} = argmax_i (t·a_t^U(i) − τ_t^U(i)) (Eq. 22). Anti-chattering: sticks with a_{t−1}^U if it still maximizes (21) so tracking converges to one optimum (mixture optima need not be unique).
3. **CE-UCB-M (Algorithm 3)**: replaces the expensive extremization (21) with a Hölder-based index UCB_t(a) = U_h(Σ a(i)F^C_{i,t}) + L·Σ a(i)·(16√((2e log T+32)/τ_t^U(i)))^q (Eq. 23–24); same tracking block.
4. **CIRT (Sec 5)**: anytime, horizon-free. *Interval refinement*: starts with coarse discretization Δ_{1/A}^{K−1}, stops phase ℓ at stopping time τ^(ℓ) (Eq. 48, when LCB of the leader exceeds all others' UCBs), keeps only the interval containing the leader, refines by 1/A (Eq. 51), L = ⌈log_A(1/ε)⌉ phases; then a *tracking* phase. Per-step optimization is O(A^{1/K}), independent of horizon.

## 4. Equations / assumptions

- **Preference metric** (signed Choquet integral of CDF F): U_h(F) = ∫ h∘F dλ (Eq. 1); mixture utility V(α,F) = U_h(Σ_i α_i F_i).
- **Oracle:** α⋆ ∈ argmax_{α∈Δ^{K−1}} U_h(Σ α_i F_i) (Eq. 7). Average regret R_π^ν(T) = V(α⋆,F) − E[V(τ_T^π/T, F)] (Eq. 8) = estimation regret δ₀₁(ε) + arm-selection regret R̄ (Eqs. 26–28).
- **Lemma 1 (Gini motivation):** two-arm Bernoulli, arms Bern(p), Bern(1−p), h(u)=u(1−u): U_h(½F₁+½F₂) > max(U_h(F₁), U_h(F₂)) (Eq. 3).
- **Theorem 2 (convex distortion):** if h convex, a *solitary* arm maximizes U_h (Eq. 25). (Matches classical risk-averse mean–variance/entropic-risk behavior.)
- **Theorem 3 (strictly concave distortion):** for *every* strictly concave h there exists a bandit instance whose optimum is a *strict* mixture. Table 2 (paper) lists Bernoulli-bandit examples: mean–median deviation, inter-ES range, Wang's right-tail deviation, Gini deviation.
- **Hölder continuity:** |U_h(F)−U_h(G)| ≤ L‖F−G‖_W^q with exponent q (e.g., Lemma 10: Category-1 PMs, sub-Gaussian, q=1; bounded supports, q=m<1; Lemma 11: Category-2 PMs, q=1).
- **Assumptions:** rewards sub-Gaussian (needed for exponential CDF concentration in 1-Wasserstein); h Hölder-continuous; bounded-distortion variants require bounded supports. Heavy tails explicitly out of scope (future work, Sec 8).

## 5. Features / target

Feature = the arm's full empirical CDF (distribution estimation), not moments. Target = the mixture coefficient vector α ∈ Δε^{K−1} maximizing the PM of the mixed CDF. Regret decomposes into mixture-identification error (discretization/estimation) plus tracking error (realized sampling fractions vs. chosen mixture).

## 6. Validation

- Regret-vs-horizon for GD and WRTD on 2-arm Bernoulli (Fig. 3): PM-ETC-M and PM-UCB-M beat uniform sampling (T ∈ {20k,40k,60k}, regret scale ~10⁻³–10⁻²); PM-ETC-M has higher variance (commits to one mixture).
- Gaussian 3-arm (Fig. 4, T up to 5k): sublinear regret for mean and GD; for GD PM-ETC-M incurs less regret, for mean CE-UCB-M does.
- β̄ convergence check (Fig. 5): log δ₁₃(ε)/log ε converges to tabulated β̄ values as ε→0 for all PMs in Table 3.
- Discretization ablation (Fig. 6): coarser ε worsens the regret upper bounds as predicted.
- CIRT anytime (Fig. 7): after tracking starts, regret ≈ δ(ε) constants — 9.06·10⁻⁸ (ε=0.03), 9.76·10⁻⁷ (ε=0.06), 1.52·10⁻⁵ (ε=0.12); larger ε → earlier tracking start but larger constant regret.
- CIRT vs fixed-discretization anytime baseline (Fig. 8): reaches the same regret threshold with strictly less average computation time.

## 7. Exact results

- **Theorem 5 (PM-ETC-M, ε-independent):** R^E_ν(T) ≤ O(K^{c_E}·(log T / T^γ)^{q·2β/(2β+q)}), γ = 2β/(2β+q), c_E = 2(1+β+1/q). For Gini deviation arm-selection regret (ignoring polylogs): PM-ETC-M achieves O(K√T), PM-UCB-M achieves O(√(KT)); after optimizing ε, order-wise improvement (Table 1).
- **Table 1 (paper):** per-PM ε-independent regret — Mean/Dual Power (s≥2)/Quadratic (s∈[0,1])/Gini: UCB-type O(ϖ^{2κ}(T)), ETC-type O(T^{1/β}ϖ(T^γ)); PHT (s=½)/Wang's Right-Tail: UCB-type O(ϖ^κ(T)), ETC-type O(ϖ^{1/β}(T^γ)); with ϖ(T)=log T/T, κ=(2β/q+2)^{-1}. Neither family uniformly dominates.
- **Table 2 (paper), K-arm Bernoulli:** e.g., Mean/CVaR: O(T^{1/6}ϖ(T)) via δ₁₃, O(ϖ²(T)) via δ₁₂; PHT: O(T^{1/40}ϖ^{1/4}(T)) via δ₁₃, O(ϖ(T)) via δ₁₂; Gini: O((log T)^{1/20}ϖ^{1/5}(T)). In shaded rows mixtures are optimal; unshaded rows use ε=1 (solitary).
- **Sec 7 (risk-sensitive specialization, solitary, ε=1):** CVaR — PM-ETC-M achieves O(√(log T/T)), matching best known [17], generalized from bounded supports to sub-Gaussian. DRMs — PM-ETC-M achieves O((log T/T)^q) vs. prior O(T^{-q/2}(log T)^{q/2}) in [19]: strictly better for the risk-seeking objective.
- No code link anywhere in the paper; supplementary material is proofs only (Appendices A–L).

## 8. Code / data availability

None. The paper contains no code URL and no data release. Algorithms are fully specified as pseudocode (Algorithms 1–3) plus closed-form experimental PMs (V(α,F)=⟨α,p⟩(1−⟨α,p⟩) for Bernoulli GD), so reproduction from the paper is feasible but everything must be re-implemented.

## 9. Leakage / limitations

- All experiments synthetic (Bernoulli/Gaussian); no real-world or sports-betting validation.
- Sub-Gaussian rewards assumed; heavy-tailed rewards explicitly unsupported (listed as future work).
- PM-ETC-M needs instance-dependent gap information (N(ε) via δ₁₂(ε)) — acknowledged as a "crucial drawback" the authors only partly fix (β-known tuning still assumes gap-rate knowledge).
- Horizon-dependent algorithms solve an O(ε^{-1/K}) discrete optimization per step — exponential in K; CIRT reduces this to O(A^{1/K}) but A is user-chosen and coarse.
- UCB confidence balls use 1-Wasserstein concentration; the constants (16√((2e log T+32)/τ)) are loose for practical T.
- Experiments fix N(ε) heuristically (N(ε)=½KεT when N(ε)>T/2), so the regret-plot regime is not the theoretically analyzed one.
- No minimax lower bounds for mixture-optimal PMs (open problem, Sec 8).

## 10. GSE overlap

Directly relevant to GSE's Kelly/sizing lane (flagged in the existing-research map as a top gap: fractional Kelly, estimation error, multi-bet sizing, pick selection/abstention). Concrete overlaps:

- `docs/research/2026-09-21/arxiv-deep/0171-optimal-sports-betting-strategies-in-practice.md` — 10 staking strategies incl. fractional/drawdown-constrained Kelly; this paper's mixture-vs-solitary theorem formalizes *why* risk-sensitive criteria (CVaR on the bet portfolio) can prefer spreading stake across several picks rather than all-in on the best single pick.
- `docs/research/2026-09-21/arxiv-deep/0276-kellybench-a-benchmark-for-longhorizon-sequential.md` — Kelly log-wealth reward and walk-forward testing; the PM framework generalizes log-wealth to arbitrary distortion PMs and its tracking rule is a disciplined way to realize target stake fractions over a slate.
- Sizing-lane wave-3 neighbors: 2607.09505 (entropy growth-gap identities), 2112.14451 (growth-vs-VaR/ES control), 2508.18868 (Kelly under estimation risk).

## 11. Implementation spec (GSE)

**Pick-portfolio mixture selector (CVaR-PM).** For a slate of N candidate GSE engine picks with historical backtest return samples per pick (per-unit PnL):
1. Build empirical CDF F̂_i of each pick's per-unit PnL from walk-forward backtests (or the 3,411-pick Neon `picks` table with realized results).
2. Choose a strictly concave distortion encoding downside preference, e.g. CVaR at level c or quadratic risk measure (Table 4 / Appendix F gives Hölder constants).
3. Discretize the simplex with granularity ε (start ε=0.05; N≤12 arms keeps Δε manageable; for larger slates use the CIRT refinement idea: coarse pass with A=4 then refine surviving intervals).
4. Compute U_h(Σ a(i)F̂_i) over the grid; take the maximizing mixture a⋆ (Theorem 2 check: if chosen PM is convex, skip — solitary best pick is provably optimal).
5. Allocate bankroll across picks proportional to a⋆, scaled by the existing quarter-Kelly stake rule in `apps/web/__tests__/calibration-map-kelly.test.ts`.
6. Track: weekly, re-estimate CDFs and re-optimize; use the under-sampling rule (22) analogue only for online pick-count balancing if needed.

## 12. Reproducible test

Replicate Fig. 3(a): 2-arm Bernoulli bandit, GD distortion h(u)=u(1−u), mixture PM V(α,p)=⟨α,p⟩(1−⟨α,p⟩), implement PM-UCB-M (Alg. 2, Eqs. 20–22) with the paper's ε choice for β=2, horizons T∈{20k,40k,60k}, 100 trials; compare average regret against uniform sampling. Pass criterion in §14.

## 13. Numeric gate

At T=60k under GD on the paper's 2-arm Bernoulli setup, PM-UCB-M's average regret must be ≤ 50% of uniform sampling's average regret, with regret decreasing monotonically across T∈{20k,40k,60k} (matching Fig. 3b's qualitative gap: PM-UCB-M regret ≈ 0.004–0.008 vs uniform ≈ 0.010–0.020).

## 14. Improvement experiment

Apply §11's CVaR-PM mixture selector to GSE's own pick history (Neon `picks` table, model v5.2.7, SPREAD/MONEYLINE/TOTAL): walk-forward, compare realized log-wealth and max drawdown of (a) PM mixture allocation vs (b) quarter-Kelly on the single highest-edge pick. Expectation from Theorem 3: if the chosen PM is strictly concave and pick outcomes are heterogeneous, the mixture should achieve a strictly better PM value (lower drawdown at similar growth) than any solitary pick.

**Verdict:** ADAPT
