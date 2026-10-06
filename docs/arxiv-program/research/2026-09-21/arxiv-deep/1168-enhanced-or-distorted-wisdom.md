# 1168 Enhanced or Distorted Wisdom of Crowds? (arXiv:2008.10423)

**Citation:** Pavlin Mavrodiev, Frank Schweitzer (2020). *Enhanced or distorted wisdom of crowds? An agent-based model of opinion formation under social influence*. arXiv:2008.10423v1. URL: https://arxiv.org/abs/2008.10423
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v1, 18 pp, via arxiv.org/pdf).
**Verdict:** ADAPT

Adapt the paper's asymmetric market-blending rule for GSE: pull-to-market-consensus helps only when the market sits between the model-pool mean and the truth (large initial error, correctable side); when the pool and market nearly agree, extra market blending risks distorting a good consensus. Implement per-game market weight as a function of model–market disagreement magnitude and direction, not a fixed blend.

## 1. Research question
Under what conditions does social influence (agents revising opinions after seeing others') enhance vs distort the wisdom of crowds? An agent-based Brownian-agent model pits individual conviction β against social influence α in two information regimes: full-information (see every agent's opinion) vs aggregated-information (see only the mean opinion).

## 2. Dataset / schema
No dataset — simulation study replicating the empirical setup of Lorenz et al. (the Swiss-Italian border question, true answer 734 km). Initial opinions sampled from two log-normal distributions: μ_ln x = −2.9 and −3.0, σ²_ln x = 0.72. Three true values: ln T = −2.00, −2.90, −3.12. N = 100 agents; parameter sweep over α ∈ [0,1], β ∈ [1,2]. Numerics: 4th-order Runge-Kutta (full-information) and Euler (aggregated), Δt = 0.01, t = 3000, noise A = 10⁻³. Schema: per (α,β,initial-condition) run → long-term collective error E_LT, group diversity D_LT, WoC indicator W_LT.

## 3. Method / model
- Micro dynamics (eq. 1): dx_i/dt = −βx_i(t) + (1/N)Σ_j F_ij(t) + S_i(t), with S_i(t) = βx_i(0) + Aξ_i(t) (eq. 2), ξ_i Gaussian white noise.
- No-information regime (eq. 3): dx_i/dt = β[x_i(0) − x_i(t)] + Aξ_i(t) — Ornstein-Uhlenbeck; long-run mean = x_i(0).
- Social coupling (eq. 4): F_ij(t) = w_ij[x_j(t) − x_i(t)]; w_ij = [1/(1+exp(|x_j−x_i|/α))]/N_i, N_i = Σ_k 1/(1+exp(|x_k−x_i|/α)) (eq. 5). For 0.2 ≤ α ≤ 0.8, w_ij ∝ α.
- Full-information dynamics (eq. 6): dx_i/dt = (1/N)Σ_j [w_ij/(1+exp(|x_j−x_i|/α))]·[x_j(t)−x_i(t)] + β[x_i(0)−x_i(t)] + Aξ_i(t).
- Aggregated-information regime (eq. 7): (1/N)ΣF_ij = α[⟨x(t)⟩ − x_i(t)]; dynamics (eq. 8): dx_i/dt = α[⟨x(t)⟩−x_i(t)] + β[x_i(0)−x_i(t)] + Aξ_i(t) — a bounded-confidence-like mean-field model.
- Macroscopic measures (log scale, since opinions are log-normal): E_LT = [ln T − ⟨ln x_LT⟩]² (eq. 10); D_LT = Var[ln x_LT] (eq. 11); WoC indicator W = max{i | x̄_i ≤ T ≤ x̄_{N−i+1}} (truth-centrality within ordered opinions), max [N/2] = 50 for N=100.

## 4. Equations & assumptions
- Eqs. (1)–(8) above; E_LT (10), D_LT (11), W indicator definition.
- Analytic anchor: in the aggregated regime d⟨ln x(t)⟩/dt > 0 — the mean opinion can only drift upward over time.
- Assumptions: continuous positive opinions; log-normal initial opinions; coupling strength grows with opinion distance (empirically justified); all agents share α, β, A; long-term values at t=3000 approximate equilibrium.

## 5. Features / target
Inputs: (α, β) parameters; three initial conditions (a) E(0)=0.80, ⟨ln x(0)⟩=−2.9, ln T=−2.00; (b) E(0)=0.02, ⟨ln x(0)⟩=−3.0, ln T=−3.12; (c) E(0)=0.01, ⟨ln x(0)⟩=−3.0, ln T=−2.90. Targets: E_LT, D_LT, W_LT heat maps.

## 6. Validation design
Parameter-sweep simulation study; full-information vs aggregated-information comparison; three initial conditions as the "initial error × correctable side" treatment. Reference case (aggregated regime) has analytic solutions in companion papers. No out-of-sample data — validation is internal consistency across regimes and conditions.

## 7. Numerical results / baselines
- Condition (a) — initial mean far from truth, correctable side: increasing α considerably decreases E_LT (social influence HELPS); effect much stronger in full-information regime; β has little impact.
- Condition (b) — initial mean slightly above truth (⟨ln x(0)⟩=−3.0 > ln T=−3.12): increasing α increases E_LT — agents converge to the objectively WRONG opinion ("most dangerous case"); stronger in full-information; weak-α region in aggregated regime still tolerable.
- Condition (c) — small error, correctable side: non-monotonic — low α converges collective opinion to truth (deep blue region), high α deteriorates; the favorable parameter range is small, and much smaller in full-information.
- Diversity: D_LT drastically reduced by α in full-information regime; independent of initial conditions (depends only on α, β, initial variance); low-diversity + high-error regions are exactly the "confident but wrong" regime.
- W indicator: initial W(0)=43 (cond. a), 46 (cond. b); increasing α mostly decreases W_LT (stronger full-info); increasing β mitigates the deterioration; non-monotonic recovery at low α in cond. (b).
- Overall conclusion: social influence enhances WoC only in rare cases; most often the crowd converges to a collective opinion farther from the truth; conviction β counterbalances but plays a lesser role in full-information.
- Final mechanism (read to EOF): the wisdom of crowds works with respect to the average opinion ONLY under a large number of independent opinions; once agents observe others' opinions, revisions respond to generated social influence rather than being independent — so even small social influence can distort the aggregate (confirmed in both experiments and the authors' simulations). The full-information regime distorts more partly because agents see both the opinion differences AND how many others deviate, which is hidden under aggregated information.

## 8. Code / data availability
No code or data stated; method fully specified (RK4/Euler, parameters above) and replicable from the equations.

## 9. Leakage & limitations
- Pure simulation; the correctable-side asymmetry is partly analytic (monotone drift in the aggregated regime) and may not transfer quantitatively to GSE's discrete weekly aggregation.
- All agents share (α, β); no heterogeneity, no adversarial agents, no entry/exit.
- The mapping "market = social influence" is analogical: GSE's market-blend is a one-step pull, not iterative opinion dynamics.
- d⟨ln x⟩/dt > 0 is specific to the model's coupling; GSE's models don't literally drift.

## 10. GSE overlap
Extends the social-influence thread (1164/1165/1167): 1164 gave the network-topology result, 1167 the pristine-vs-filtered rule, 1166 the magnitude argument. This paper contributes the correctable-side asymmetry — the only one of the set giving a directional rule for WHEN to trust the pull-to-consensus. GSE currently blends models toward the market with fixed weights; no paper so far prescribes a disagreement-dependent blend.

## 11. GSE implementation spec
Per-game adaptive market blending (~1 day):
1. For each game, compute disagreement d = |logit(mean model prob) − logit(market prob)| and direction (which side of the market the pool sits on).
2. Market weight schedule: if d is in the top tercile of historical disagreements (paper's condition (a) — large initial error), use heavy market blend w_m ≈ 0.5; if d is in the bottom tercile (conditions (b)/(c) — good initial consensus), use light blend w_m ≈ 0.1–0.15 to avoid distortion; middle tercile → 0.25–0.3.
3. Per-model conviction term (β analog): each model's shrinkage toward its own pre-market estimate proportional to its trailing-8-week skill (models with higher historical skill keep higher β, i.e., resist the market pull).
4. Effort: half day; uses picks table + market odds already ingested.

## 12. Reproducible test
Dataset: 2024–2025 NFL seasons, component-model probabilities + closing/opening market odds per game. (a) Historical direction test (paper's asymmetry): for each past game, classify whether the market price lay between the pool mean and the realized outcome (correctable) or the pool mean lay between market and outcome (distortion risk); compare realized Brier of blended vs unblended forecasts in the two classes. Expectation: blending helps in the correctable class, hurts in the distortion-risk class. (b) Compare full-season Brier of the disagreement-scheduled blend vs fixed 0.25 blend vs no market blend. Time-ordered: schedule thresholds from trailing seasons only.

## 13. Acceptance / rejection gate
ADOPT the disagreement-scheduled blend if, on 2025 data, it beats the fixed blend on full-season Brier AND the direction test confirms the asymmetry (blending helps in correctable games, hurts in distortion-risk games). REJECT fixed uniform market blending if the distortion-risk class shows statistically significant Brier deterioration under blending (paired t-test, p<0.05) — that is the paper's condition-(b) failure mode realized in GSE data.

## 14. Improvement experiment
Beyond the paper: the paper's W indicator (truth-centrality within the opinion distribution) suggests a calibration diagnostic GSE lacks — for each game, compute the W-analog: where the realized outcome falls within the ordered set of component-model probabilities (a discrete PIT rank). Aggregate the rank histogram over a season; a uniform histogram = well-spread ensemble, U-shape = overconfident (low diversity, paper's dangerous regime), hump = underconfident. Combine with the adaptive blend: in weeks where the trailing rank histogram is U-shaped (overconfident pool), increase β (conviction/shrinkage to own estimates) and reduce α (market pull) — a feedback controller on the ensemble's opinion dynamics the paper simulates but doesn't close the loop on.
