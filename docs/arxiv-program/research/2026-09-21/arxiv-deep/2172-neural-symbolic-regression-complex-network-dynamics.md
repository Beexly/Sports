# [2172] Neural Symbolic Regression of Complex Network Dynamics (arXiv:2410.11185)

**Citation:** Haiquan Qiu, Shuzhi Liu, Quanming Yao (2024). *Neural Symbolic Regression of Complex Network Dynamics*. arXiv:2410.11185. URL: https://arxiv.org/abs/2410.11185
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — discovers symbolic equations for network dynamics by splitting them into node dynamics F and edge dynamics G, denoising multi-trajectory observations with a physics-aligned graph neural ODE, and evolving F/G with a *coordinated* genetic search that prevents one from overfitting while the other underfits. The NFL is a 32-node network; this is the blueprint for discovering symbolic team-dynamics and matchup-interaction equations.

## 1. Research question
Complex network dynamics (epidemics, neural firing, oscillators) need symbolic expressions, but existing SR either handles single trajectories, needs noisy numerical time derivatives, or is confined to a fixed function library (SINDy). Can we learn symbolic network dynamics from noisy, sparsely sampled multi-trajectory observations — without derivative estimation and without a fixed library — by (a) denoising/interpolating with a physics-aligned neural dynamics model, and (b) coordinating the joint search over node- and edge-dynamics expressions?

## 2. Dataset / schema
Synthetic: 4 dynamics × 2 graph types (Erdős–Rényi, Barabási–Albert, 200 nodes) — SIS epidemics (F=−δx_i, G=(1−x_i)x_j), Lotka–Volterra (F=x_i(α−θx_i), G=−x_i x_j), Wilson–Cowan (F=−x_i, G=(1+exp(−τ(x_j−μ)))⁻¹), Kuramoto (F=ω, G=sin(x_i−x_j)) (Table 2). Real: influenza A (H1N1) spread — nodes = countries/regions, states = daily new cases, edges = global aviation routes. Implemented in PyTorch + PyTorch Geometric + gplearn (RTX 4090).

## 3. Method / model
**PI-NDSR** = PIND + coordinated genetic search. **PIND** (Physically Inspired Neural Dynamics): encode-process-decode with graph neural ODE; latent derivative ḣ_v = φⁿ(h_v,t) + Σ_{u∈N_v} φᵉ(h_v,h_u,t) (Eq. 2) where MLPs φⁿ, φᵉ align with F, G; decoded and integrated via ODESolver (Eq. 3). Trained on raw noisy observations → outputs denoised/interpolated trajectories X̂(t) plus neural references F̂, Ĝ (Eq. 4). **Coordinated genetic search** (Algorithm 1): two populations ℱ (node dynamics), 𝒢 (edge dynamics); each iteration evolves the population farther from its neural reference (d(ℱ)=Σ‖F−F̂‖² vs d(𝒢), Eq. 5) — the closer population is frozen, preventing overfit/underfit imbalance. Fitness = error between ∫(F + ΣG)dt and the interpolated trajectory, BigK-averaged over partner population (Eqs. 6–7). No derivative estimation, no fixed library.

## 4. Equations & assumptions
- Network dynamics: ẋ_v(t) = F(x_v(t)) + Σ_{u∈N_v} a_vu G(x_v(t), x_u(t)) (Eq. 1).
- PIND: ẋ°_v = Dec(ḣ_v), ḣ_v = φⁿ(h_v,t) + Σ φᵉ(h_v,h_u,t) (Eq. 2); f_θ(G,X(t₀),t)_v = ODESolver(ẋ°_v, X(t₀), t₀, t) (Eq. 3).
- References: F̂(x_v) = Dec(φⁿ(Enc(x_v),t)), Ĝ = Dec(φᵉ(Enc(X),t)) (Eq. 4).
- Coordination: d(ℱ) = Σ‖F−F̂‖², d(𝒢) = Σ‖G−Ĝ‖² (Eq. 5); fitness f_F, f_G (Eqs. 6–7).
- H1N1 result: ẋ_v = a·x_v + Σ_{u∈N_v} [b/(1+exp(−(m·x_v+c)))]·x_u, a=0.0740, b=0.0015, m=−0.0041, c=9.9643 (Eq. 8) vs TP-SINDy's non-physical Eq. 9.
- Assumptions: edge dynamics G shared across edges (universality); observations regularly sampled for baselines (not for PI-NDSR); binary edge weights in synthetic tests.

## 5. Features / target
Inputs: node-state trajectories {X(t) | t ∈ 𝒯} (noisy, possibly large Δt). Targets: symbolic expressions F (node dynamics) and G (edge dynamics). PIND supervision: raw trajectories; GP supervision: interpolated trajectories + neural references.

## 6. Validation design
Synthetic: 8 settings (4 dynamics × 2 graphs), metrics = recovery probability (correct skeleton) + MSE of simulated trajectories (only for correct skeletons, measuring constant accuracy). Baselines: SymDL, SINDy, TP-SINDy. Real: H1N1, PI-NDSR vs TP-SINDy expressions + MSE. Robustness: noise sweep (SNR 70→25 dB) and interval sweep (Δt) on Kuramoto. Ablations: without interpolation, without coordination (Table 4).

## 7. Numerical results / baselines
- **Recovery probability: PI-NDSR = 1.00 in all 8 settings** (Table 3). TP-SINDy: 0.15–1.0, fails Wilson–Cowan entirely (0.0 — parametric edge dynamics outside any fixed library); SINDy: 0–0.87; SymDL: 0.15–0.87.
- **MSE (×10⁻², correct skeletons only):** PI-NDSR lowest everywhere, e.g. BA-SIS 0.312 vs TP 0.434 vs SINDy 0.484 vs SymDL 0.979; BA-LV 0.136 vs 0.875/1.170/2.075.
- **H1N1:** PI-NDSR's equation is physically sensible (zero growth at zero cases; sigmoid-modulated neighbor influence capturing travel-aversion); TP-SINDy's predicts non-zero spread with zero cases. MSE 0.8261 vs 0.9028.
- **Robustness:** 100% recovery from SNR 70 dB down to 25 dB (TP-SINDy → 0% at 30 dB); 100% recovery at all Δt (TP-SINDy fails at large intervals).
- **Ablations (Table 4):** removing interpolation drops recovery 1.0 → 0.81/0.86; removing coordination drops it to 0.31/0.47 — coordination is the bigger contributor.

## 8. Code / data availability
Implemented in PyTorch/PyTorch Geometric/gplearn; no repo URL in text. H1N1 data per Gao & Yan 2022 preprocessing. Synthetic dynamics fully specified (Table 2).

## 9. Leakage & limitations
Adversarial notes: (a) No public code found in text — reimplementation needed. (b) PIND training is the heavy lift (graph neural ODE on 200 nodes); quality of F̂/Ĝ references bounds the search — no reference-quality gate. (c) Fitness requires numerical integration of every candidate (F,G) pair each generation — expensive; BigK subsampling mitigates but isn't profiled. (d) Synthetic graphs are static with binary weights; the NFL "network" has weighted, time-varying edges (matchups change weekly). (e) H1N1 win is partly a skeleton the GP library happens to contain (sigmoid) — the library-freedom claim is relative. (f) Evaluation uses regularly sampled data for baseline fairness; real sports weeks are regular, so this limitation doesn't bite GSE.

## 10. GSE overlap
GSE models teams and games as independent rows — there is no network-dynamics view of the league. PI-NDSR's decomposition maps exactly: **F = intrinsic team dynamics** (form/momentum decay, rest recovery, injury drag — how a team's latent strength evolves by itself) and **G = matchup interaction dynamics** (how opponent strength modulates your effective output — the symbolic form of "styles make fights"). Discovering F and G separately with coordinated search solves the exact failure GSE would hit with naive joint SR: the interaction terms would overfit while intrinsic dynamics underfit, or vice versa. No GSE work decomposes discovered equations into intrinsic vs interaction components.

## 11. GSE implementation spec
1. Build the league network: 32 nodes; node state x_v(t) = weekly latent team strength (from existing engine ratings); edges = games played, weights = 1 (or score-differential-scaled).
2. Train PIND-style denoiser: encoder MLP + graph-ODE with φⁿ (intrinsic) and φᵉ (matchup) MLPs on 2015–2024 weekly data → denoised team-strength trajectories + neural references F̂, Ĝ.
3. Coordinated GP (gplearn, two populations): evolve F-population or G-population per the distance-to-reference rule (Eq. 5); fitness = integral error vs denoised trajectories (Eqs. 6–7 adapted to weekly steps).
4. Read out: symbolic F (e.g. ṡ = −λs + ρ·rest) and symbolic G (e.g. interaction = α·(opp_strength − s)·home) — publishable "equations of NFL team dynamics."
Effort: ~3–4 weeks (graph neural ODE + two-population GP; no public code). Needs existing engine ratings as node states.

## 12. Reproducible test
Two-stage: (a) synthetic — simulate a 32-node league with known F/G (mean-reverting form + logistic matchup interaction), verify coordinated GP recovers skeletons at ≥ 80% over 10 seeds vs ≤ 50% for naive joint GP; (b) real — 2015–2024 NFL, test = 2025: compare next-week spread MAE of F+G symbolic model vs engine baseline and vs F-only / G-only ablations.

## 13. Acceptance / rejection gate
**ADAPT if:** on synthetic league data, coordinated search recovers both F and G skeletons in ≥ 8/10 seeds (vs ≤ 5/10 for joint search — replicating the paper's ablation gap) AND on real 2025 data the F+G model matches the engine's spread MAE within 0.3 points. **REJECT if:** synthetic recovery < 6/10 (coordination doesn't transfer to the sports regime), or PIND denoising collapses (denoised trajectories correlate < 0.9 with raw — the denoiser adds nothing over weekly smoothing), or real-data F+G trails the engine by > 1.0 spread-MAE points. Gate pre-registered.

## 14. Improvement experiment
Beyond the paper: **time-varying edges and transfer learning across seasons**. The paper uses static graphs; NFL edges (matchups) rewire every week and team identities persist across seasons. Extend PIND with edge features (rest differential, travel distance, weather) in φᵉ and train across all seasons 2015–2024 jointly with season-specific initial node states. Then test *transfer*: freeze the discovered symbolic F/G from 2015–2023 and evaluate 2024–2025 without refitting constants — if the equations transfer with < 5% MAE degradation, GSE has discovered genuinely universal laws of team dynamics rather than season-specific fits, which is the strongest possible validation of the symbolic approach and a first in sports analytics.
