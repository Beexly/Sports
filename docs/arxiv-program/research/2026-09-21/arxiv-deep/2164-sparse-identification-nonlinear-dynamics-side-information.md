# [2164] Sparse Identification of Nonlinear Dynamics with Side Information (SINDy-SI) (arXiv:2310.04227v2)

**Citation:** Gabriel F. Machado, Morgan Jones (2023). *Sparse Identification of Nonlinear Dynamics with Side Information (SINDy-SI)*. arXiv:2310.04227v2. URL: https://arxiv.org/abs/2310.04227
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — injects domain knowledge as hard Sum-of-Squares constraints into sparse equation discovery, so GSE can force discovered sports dynamics to obey non-negotiable laws (win prob in [0,1], momentum equilibria, monotonicity).

## 1. Research question
SINDy discovers sparse dynamics from data, but with scarce/noisy data (more basis functions than timestamps) it overfits and produces models that violate basic physical laws — while the pure SOS-constrained approach (Ahmadi & Khadir) ignores Occam's razor and overfits too. Can side information (equilibria, monotonicity, symmetries, invariant sets) be enforced as hard constraints inside an iterative sparse-identification loop, yielding models that are simultaneously sparse, accurate, and law-abiding?

## 2. Dataset / schema
Simulated trajectories, deliberately scarce and noisy (h > r regime):
- **Lorenz system** (Eq. 17, standard params σ=10, ρ=28, β=8/3): m=100 trajectories × r=40 timestamps in [0,10], three noise scenarios (σ_S, σ_Y) = (1e-4, 1e-2), (1e-3, 1e-1), (1e-2, 1); fitted degree-5 polynomial with h=56 monomials (h > r = 40).
- **Single-Machine Infinite-Bus (SMIB)** power system (Eq. 18, non-polynomial sin dynamics, α=0.0106, p_m=1, e′=1.21, v=1, χ=0.28, β=0.03): m=100 × r=20 in [0,1], noise (1e-5, 1e-3); fitted degree-7 polynomial, h=36 monomials (h > r = 20).
Noise injected on both states and vector-field outputs (Eq. 14). Synthetic — fully reproducible; no external data access needed.

## 3. Method / model
**SINDy-SI (Algorithm 3):** iterates two steps: (1) solve the side-information-constrained regression (SI) — min_W ‖Y−ΦW‖²_F subject to f̂(x)=W^⊤φ(x) ∈ P_d ∩ {S_i} — lifted to a convex SDP via Schur complement (Eqs. 10–11) with SOS constraints (Putinar's Positivstellensatz over a bounding ball g(x)=R²−‖x−c₀‖²); (2) threshold small coefficients (Algorithm 1, threshold λ), pin them to zero, re-solve with an added ℓ₁-relaxation γ (−γ ≤ ξ₂w_ij ≤ γ) as Eq. 13. Side-information types demonstrated: equilibrium at a point (S₁), coordinate directional monotonicity {−∂f_i/∂x_i ≥ 0} (S₂), sign constraints on components. Regressor columns ℓ₂-normalized before thresholding. Iteration budget N ≤ hn (Theorem 2.1, Zhang & Schaeffer 2019) but advised smaller in practice. Implemented in SOSTOOLS (MATLAB) + MOSEK SDP solver.

## 4. Equations & assumptions
- IVP ẋ=f(x), x(0)=x₀ (Eq. 1); vector-field targets from finite differences f(s(t_i)) ≈ (s(t_i)−s(t_{i−1}))/(t_i−t_{i−1}) (Eq. 2); supervised objective min_f̂ Σ‖f(s)−f̂(s)‖²₂ (Eq. 3).
- Parameterization f̂(x)=W^⊤φ(x) (Eq. 4); OLS closed form W*=(Φ^⊤Φ)⁻¹Φ^⊤Y (Eq. 7); sparse SINDy min ‖Y−ΦW‖²_F + ξ‖W‖₀ (Eq. 8); thresholded refit (Eq. 9).
- SI problem (SI); Schur-complement SDP lift with tr[M] objective (Eqs. 10–11); regularized SINDy-SI min tr[M]+γ (Eq. 13).
- CV cost J_k = Σ_{i,j≠k} ‖f(s(t_i,x_j))−f̂(s(t_i,x_j))‖₂ / ((m−1)r) — leave-one-trajectory-out (Eq. 15).
- SOS monotonicity encoding: {−∂f̂_i/∂x_i(x) − z_i(x)g(x)} ∈ Σ with SOS multipliers z_i and ball g(x)=75²−‖x−[0 0 25]^⊤‖² (Lorenz).
- Assumptions: compact domain so SOS relaxation is exact (Putinar); polynomial model class; side information must be expressible as polynomial (in)equalities.

## 5. Features / target
Inputs: trajectory snapshots s(t_i, x_j); targets: vector-field outputs f(s(t_i, x_j)) (finite-differenced, noise-injected). Library: monomial bases (degree 5 for Lorenz, degree 7 for SMIB). Target of the discovery: the vector field itself (ẋ = f(x)).

## 6. Validation design
Leave-one-trajectory-out cross-validation (train on 1 of 100 trajectories, test on remaining 99) — extreme scarce-data regime. Compared OLS, SINDy, SI-only, SINDy-SI at three noise levels. Threshold λ fixed (0.1 Lorenz, 1e-2 SMIB) rather than tuned per method (authors note tuned thresholds could differ).

## 7. Numerical results / baselines
- **Lorenz, average J_k (Table I):** low noise — OLS 5.63×10⁴, SINDy 3.19×10⁶, SI 822.42, **SINDy-SI 2.0432**; medium noise — OLS 5.59×10⁵, SINDy 1.28×10⁶, SI 1.89×10⁴, **SINDy-SI 1.66×10³**; high noise — OLS 5.13×10⁶, SINDy 1.49×10⁷, SI 2.16×10⁵, **SINDy-SI 1.15×10⁵**. Side information alone (SI) beats sparse-only (SINDy) by ~2 orders of magnitude; the combination wins everywhere, and the gap widens with noise (Figure 1).
- **SMIB (non-polynomial target):** SINDy-SI recovered f̂₁(x)=0.9999x₂ and f̂₂(x)=0.1790x₁⁷−1.944x₁⁵+34.09x₁³−203.8538x₁−1.415x₂+47.171 — emergently approximating the 7th-order Taylor expansion of the true sin dynamics (0.0404x₁⁷−1.6987x₁⁵+33.97x₁³−203.841x₁−1.415x₂+47.1698) without being told the expansion existed.

## 8. Code / data availability
None stated for the paper's own code; relies on SOSTOOLS (MATLAB, https://github.com/oxfordcontrol/SOSTOOLS) + commercial MOSEK SDP solver. Data simulated in MATLAB (ODE45). Reimplementation needed in Python (cvxpy + an SDP solver) — no public repo given.

## 9. Leakage & limitations
Adversarial notes: (a) MATLAB + SOSTOOLS + MOSEK stack — commercial solver dependency; no Python/open-source path demonstrated. (b) SOS/SDP scales badly with state dimension and polynomial degree — game-state vectors with 10+ variables at degree 5 would produce huge SDPs; the paper stays at n=2,3. (c) Side information must be polynomial-expressible — sports invariants like "win prob ∈ [0,1]" or "momentum mean-reverts" need careful SOS encoding on a compact ball, which the paper hand-crafts per example. (d) Threshold λ was handpicked, not tuned; comparisons may flatter SINDy-SI vs a tuned SINDy. (e) The extreme 1-of-100 CV regime is artificial; still, the h>r regime is exactly where GSE's short-season sports data lives.

## 10. GSE overlap
GSE has no constrained-discovery machinery — the engine's neural models can (and do) emit physically absurd edge cases (win prob > 1 after calibration transforms, momentum features diverging in blowouts). Wave-5a's DSR/PySR lanes do unconstrained fitting; nothing in GSE enforces side information. This is new: hard constraints as SDP feasibility, not soft loss penalties — a discovered equation *cannot* violate the encoded law, unlike a PINN-style penalty term. Directly extends ledger 2163's SINDy plan: 2163 tells us when SINDy breaks; this tells us how to bolt on non-negotiable sports laws.

## 11. GSE implementation spec
1. Reimplement SINDy-SI's core in Python: cvxpy + SCS/Clarabel (open SDP) or MOSEK academic license; monomial library via PySINDy; SOS constraints via a small Putinar helper (ball g(x)=R²−‖x−c‖² over normalized game-state space).
2. Sports side information to encode: (a) **boundedness** — win-prob dynamics confined to [0,1]: 0 ≤ f̂ ≤ 1 on the state ball; (b) **equilibrium** — tied game at t=0 ⟹ f̂=0 (drift zero at neutral state); (c) **monotonicity** — ∂(win-prob)/∂(score_diff) ≥ 0; ∂/∂(opponent_timeouts) ≤ 0; (d) **time-decay symmetry** — mean reversion of momentum latent variable.
3. Discover dynamics on 2022–2024 nflverse game-state trajectories (same pipeline as 2163), with constraints active; threshold λ tuned by the paper's leave-one-*season*-out CV analog (train 2022, test 2023–2024, etc.).
4. Ship the constrained equation as GSE's "laws of the game" artifact — a guaranteed-sane dynamics model that can veto engine outputs violating the encoded side information.
Effort: ~5–8 engineer-days (SOS helper + cvxpy wiring is the bulk). SDP cost manageable: n ≤ 6 states, degree ≤ 4.

## 12. Reproducible test
Dataset: 2022–2024 nflverse game-state trajectories; validation = leave-one-season-out CV exactly mirroring the paper (train one season, test others). Metrics: paper's J_k on vector-field fit + BFR on open-loop win-prob simulation. Baselines: unconstrained SINDy (same library), SI-only polynomial regression, OLS.

## 13. Acceptance / rejection gate
**ADOPT if:** SINDy-SI beats unconstrained SINDy on J_k by ≥ 1 order of magnitude on the leave-one-season-out CV AND the learned model satisfies all encoded side information exactly (verified by SOS certificate, not sampling) AND BFR ≥ 60% on open-loop 2025 holdout. **REJECT if:** SDP solve time exceeds 30 min per fit at n=6/degree-4 (scalability fail), or constraints reduce fit quality below the unconstrained baseline by > 20%, or J_k gap < 1 order of magnitude. Gate pre-registered.

## 14. Improvement experiment
Beyond the paper: **data-driven side-information mining** — instead of hand-crafting sports invariants, first fit an unconstrained SINDy ensemble across 2015–2024 seasons and mine *stable qualitative properties* (sign patterns of coefficients that never flip, monotonicity that holds in 10/10 seasons); promote only the 10/10-stable properties to SOS hard constraints and re-fit. This turns SINDy-SI from "expert priors in" into a self-bootstrapping loop: discover candidate laws → promote stable ones to hard constraints → re-discover. Test whether the bootstrapped constraints improve 2025-holdout BFR over hand-crafted ones.
