# [0593] Simplified Kalman Filter for Online Rating: One-Fits-All Approach (arXiv:2104.14012v1)

**Citation:** Szczecinski, L. & Tihon, R. (2021). *Simplified Kalman Filter for Online Rating: One-Fits-All Approach*. arXiv:2104.14012v1. URL: https://arxiv.org/abs/2104.14012v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 8,795 lines).
**Verdict:** ADAPT — adopt the one-fits-all Bayesian online-rating template (any skills-outcome model + per-team uncertainty vector) as a principled replacement for plain Elo in GSE's team-strength module; the paper's own empirical result (simple Elo matches vSKF on noisy NFL data) means the justification must be uncertainty tracking and convergence speed in short seasons, not raw log-score gains.

## 1. Research question
Can online sports-rating algorithms be derived systematically for *any* skills-outcome model and any team-size setup from a single approximate-Kalman-filter principle, and under what conditions do the Bayesian simplifications actually beat the simplest stochastic-gradient (Elo-type) solutions? As a corollary: can Elo, Glicko, and TrueSkill all be shown to be instances of one generic framework?

## 2. Dataset / schema
Empirical: NHL 2005/06–2014/15 (minus shortened 2012/13; M=30 teams, T=1230 games/season), EPL 2009/10–2018/19 (M=20, T=380), NFL 2009/10–2018/19 (M=32, T=256). NHL treated as binary (final result) with Bradley-Terry and as ternary (regulation-time results, ties before OT/SO) with Davidson; EPL and NFL ternary via Davidson (NFL κ ≈ 0 since draws are negligible). Synthetic: M=20, J=M/2=10 games/day, D=100 days, T=1000; skills drawn N(0,1) then evolved by Gaussian random walk with β̂=0.998, ε̂=1−β̂²; outcomes from Thurston model with observation noise σ; a "switch" at day 40 replaces 5 players with new ones (tests adaptation to abrupt change).

## 3. Method / model
Bayesian online rating as approximate Gaussian Kalman filtering. Skills-outcome model: Pr{y_t|θ_t} = L(z_t/s; y_t), z_t = x_t^T θ_t = (home skills sum) − (away skills sum) with scheduling vectors x_t,h, x_t,a. Skills dynamics: θ_t = β_t θ_{t−1} + u_t ε_t (damped Gaussian random walk; β_t=1 standard; ε_t may scale with elapsed days τ(t)−τ(t−1)). The recursion f(θ_t|y̲_t) ∝ Pr{y_t|θ_t} ∫ f(θ_t|θ_{t−1}) f(θ_{t−1}|y̲_{t−1}) dθ_{t−1} is made tractable by a Gaussian projection P[·] minimizing KL distance (Proposition 1), with three covariance models: full matrix (KF), diagonal/vector (vSKF), shared scalar (sSKF), plus fixed-variance fSKF and pure stochastic gradient SG. Mode-finding via second-order Taylor of the log-likelihood ℓ(z;y) around θ_o = β_t μ_{t−1} with g(z;y) = dℓ/dz, h(z;y) = −d²ℓ/dz², and the matrix-inversion lemma for rank-1 updates.

## 4. Equations & assumptions
vSKF (vector-covariance) updates: v̄_t ← β_t² v_{t−1} + ε_t 1; ω_t ← Σ_{m∈{I_t,J_t}} v̄_{t,m}; g_t ← g(β_t x_t^T μ_{t−1}/s; y_t); h_t ← h(β_t x_t^T μ_{t−1}/s; y_t); μ_t ← β_t μ_{t−1} + (v̄_t ⊙ x_t) · s g_t/(s² + h_t ω_t); v_t ← v̄_t ⊙ (1 − v̄_t ⊙ |x_t| · h_t/(s² + h_t ω_t)).
sSKF: replace v_t with scalar v_t 1; ω_t ← 2F v̄_t; v_t ← v̄_t(1 − (ω_t/M)·h_t/(s² + h_t ω_t)).
fSKF (fixed variance v̄): μ_t ← β_t μ_{t−1} + v̄ x_t · s g_t/(s² + h_t 2F v̄).
SG (ignoring h_t): μ_t ← μ_{t−1} + (v̄/s) x_t g_t = μ_{t−1} + K s x_t g_t, with v̄ = K s².
Skills-outcome models (g, h): Thurston — g = V(z)1[y=1] − V(−z)1[y=0], h = W(z)1[y=1] + W(−z)1[y=0], V(z) = N̄(z)/Φ(z), W(z) = V(z)(z + V(z)); Bradley-Terry — g = ln10 (y_t − F_L(z)), h = (ln10)² F_L(z) F_L(−z), F_L(z) = 1/(1 + 10^{−z}); Davidson — g = 2 ln10 (ŷ_t − G_D(z)), h = (ln10)²(κ10^z + 4 + κ10^{−z})/(10^z + κ + 10^{−z})², F_D(z) = 10^z/(10^{−z} + κ + 10^z), G_D(z) = (10^z + κ/2)/(10^{−z} + κ + 10^z), ŷ_t = y_t/2.
Unification results: Elo (95) = SG update under Bradley-Terry; TrueSkill (80–86) = Thurston-vSKF variant with inflated scale σ̃_t = σ√(1 + ω_t/σ²) and denominators not reduced by h_t (its posterior variance shrinks slower); Glicko (87–93) = Bradley-Terry-vSKF variant with per-player scale factor r(ω_t − v̄_{t,m}) = √(1 + (ω_t − v̄_{t,m})a/σ²), a = 3 ln²10/π² ≈ 1.6, using v̄_{t,m} instead of ω_t in denominators (larger steps than vSKF). Original Thurston-form Elo (97) is *not* an SG update — note for completeness.
Proposition 2 (scale invariance): the scale s is non-identifiable; results with s=1 and (v_0, ε) translate to scale s via μ_t(s, s²v_0, s²ε) = s·μ_t(1, v_0, ε), V_t = s²·V_t(1,…).
HFA handled by an additive boost η inside L(z/s + η; y), estimated from outcome frequencies: binary η = log_10(f_1/f_0); ternary η = ½log_10(f_2/f_0), κ = f_1/√(f_0 f_2).
Assumptions: log-likelihood ℓ(z;y) concave in z (L″L ≤ (L′)²); Gaussian projection of posterior; independent skills a posteriori (vector-covariance); random-walk dynamics with shared ε; outcome noise Gaussian/logistic per the chosen model.

## 5. Features / target
Features: pre-game skill means μ_{t−1} and uncertainties v_{t−1} per team, scheduling vectors (home/away indicators), HFA boost η, draw parameter κ. Targets: binary outcome (Thurston/BT) or ternary outcome (Davidson); evaluation target is the predictive distribution of y_t, scored by log-score LS_t = −Σ_y 1[y_t=y] ℓ(x_t^T μ_{t−1}/s; y) (synthetic additionally uses KL divergence D_t between true and estimated outcome distributions, computable only because data are simulated).

## 6. Validation design
Synthetic: 5000 simulation runs, mean KL divergence per day, with a mid-run player "switch" to test adaptation; compares KF/vSKF/sSKF/fSKF/SG, TrueSkill, Glicko, matched and mismatched outcome models, and noise levels σ. Empirical: log-scores averaged over all seasons, split into initialization (first t_init = 4M games, ~8 games/team) and converged (second half of season) windows; baselines are the entropy H = −Σ f_y log f_y of outcome frequencies and the other algorithms in the same family. Parameters (v_0, ε, K, η, κ) chosen by scanning admissible values on the same data (in-sample tuning).

## 7. Numerical results / baselines
Synthetic: KF best; vSKF quasi-identical to KF (posterior correlations irrelevant even at M=20); sSKF good at init but slow after the day-40 switch; fSKF/SG show speed-vs-convergence tradeoff; model mismatch (BT model on Thurston data) costs nothing predictively; at high observation noise σ, vSKF ≈ SG (temporal model buys nothing); TrueSkill loses slightly post-convergence vs vSKF (mean effect small vs median-vs-mean spread); Glicko ≈ vSKF indistinguishable. Optimal synthetic params: Thurston ε=0.004, v_0=1; BT ε=0.002, v_0=0.5; SG K=0.15σ.
Empirical (Table I, log-scores; lower is better):
- NHL binary (BT): vSKF 0.688 init / 0.678 final; SG 0.688/0.678; entropy H=0.688 — barely better than base rates.
- NHL ternary (Davidson): vSKF 1.063/1.064; SG 1.063/1.064; H=1.071.
- EPL (Davidson): vSKF 1.055/0.974; SG 1.052/0.976; H=1.061. Fitted params (v_0, ε) = (0.04, 10^{−7}), SG K=0.015; η=0.10, κ=0.67.
- NFL (Davidson): vSKF 0.679/0.640; SG 0.678/0.641; H=0.700. Fitted params (v_0, ε) = (0.02, 10^{−4}), SG K=0.015; η=0.06, κ=5.5×10^{−3}.
KF = vSKF on all empirical data. The one qualitative win for vSKF: in EPL 2009/10 (Fig. 5), vSKF means converge to final values in ~50 days vs ~200 days for SG — much faster for extreme (very strong/weak) teams. NHL outcomes are too noisy for any skill-tracking gain.

## 8. Code / data availability
No code or data link stated in the paper. Results data are standard league results (NHL/EPL/NFL seasons as listed). All update equations are fully specified in the text (44–64, 80–97), so reimplementation is direct.

## 9. Leakage & limitations
- Tuning parameters (v_0, ε, K) were scanned on the same seasons used for reporting — in-sample, optimistic.
- NFL sample is small per team (16 games/season); initialization window of 4M=128 games is most of half a season.
- The headline caution is the paper's own: on noisy league data (NHL, and NFL substantially), Bayesian machinery adds nothing over plain Elo — the "advantage" only materializes with reliable outcomes and when per-player uncertainty or fast convergence matters.
- Gaussian projection and diagonal-covariance approximations are untested for the group-sports (eSports) case beyond theory.
- No comparison against non-rating baselines (market odds, EPA-based models); entropy is the only external reference.
- HFA/draw parameters estimated from the same data as the ratings.

## 10. GSE overlap
Overlap with extension. Per the existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, §1 master metrics list), Elo-style and Bayesian team-strength ratings are already in the repo's team_ratings lane (2026-09-17+ sweeps), but the repo has nothing deriving Elo/Glicko/TrueSkill from one approximate-KF template, nothing with the scale-invariance proposition (Proposition 2), and nothing with the fitted NFL vSKF hyperparameters (v_0=0.02, ε=10^{−4}, SG K=0.015 at s=1) or the Davidson κ=5.5×10^{−3} NFL draw frequency. The per-team uncertainty vector v_t and the fast-convergence result (50 vs 200 days in EPL) are the actionable extensions for GSE's short-season NFL context.

## 11. GSE implementation spec
Replace/augment GSE's static Elo update with the vSKF recursions (44–49) under the Bradley-Terry model (or Davidson if modeling ties), initialized at the paper's NFL fit: s=1, v_0=0.02, ε=10^{−4}, β=1, η=0.06 (frequency-estimated HFA, recompute on 2015–2025 nflverse). Keep the per-team uncertainty v_{t,m}: use it (a) to widen/shrink confidence on published picks, (b) to accelerate rating of new information — e.g., reset v for a team after a QB change to force fast re-convergence (the paper's day-40 "switch" protocol), and (c) as a feature in the pick-confidence model. The update cost is O(1) per game beyond the existing Elo step. Effort: ~1 engineer-week.

## 12. Reproducible test
Dataset: nflverse 2018–2025 regular season, chronological. Fit vSKF (paper NFL params), fSKF/SG Elo with K=0.015, and the current GSE Elo. Metric: log-score on win/loss (equivalent to the paper's LS_t) plus Brier, evaluated separately in the first 8 games/team (initialization) and the second half of each season (convergence), per the paper's protocol. Report also the convergence-speed statistic: games needed for each team's rating to reach 90% of its end-of-season value.

## 13. Acceptance / rejection gate
Adopt if vSKF beats SG-Elo log-score by ≥0.3% in the converged window OR reaches 90%-of-final ratings ≥2 games faster on average (the paper's Fig. 5 effect) — the value proposition is convergence speed and per-team uncertainty, not raw accuracy, since the paper shows NFL log-score gains are ~nil. Reject if neither holds on 2018–2025 data: then plain Elo remains the GSE default and the uncertainty vector is not worth the complexity.

## 14. Improvement experiment
Extend the vSKF template beyond binary outcomes, which the paper's "any skills-outcome model" claim explicitly permits but never tests: plug a margin-of-victory likelihood (Skellam or discretized-normal on point differential) into the same (g, h, vSKF) machinery, replacing the binary Elo signal with a per-game information-rich update. If the margin-based vSKF beats binary vSKF log-loss, GSE gets an Elo upgrade that learns from blowouts vs close wins — a test the paper's framework enables but its experiments never run.
