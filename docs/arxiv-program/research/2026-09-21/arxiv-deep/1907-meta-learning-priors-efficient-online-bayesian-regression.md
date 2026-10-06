# [1907] Meta-Learning Priors for Efficient Online Bayesian Regression (arXiv:1807.08912v2)

**Citation:** Harrison, J., Sharma, A., Pavone, M. (2018). *Meta-Learning Priors for Efficient Online Bayesian Regression*. arXiv:1807.08912v2. URL: https://arxiv.org/abs/1807.08912v2
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, latest version v2 verified via arXiv API).
**Verdict:** ADAPT

**Why:** analytic Bayesian online adaptation (recursive least-squares on a meta-learned last layer) replaces gradient-step adaptation; after each new game a team's posterior over model weights updates in closed form with no refit, no gradient tuning.

## 1. Research question
Kernel GP regression is the standard Bayesian tool but is cubic in data and encodes prior knowledge only through unintuitive kernel hyperparameters. Can we learn, from a dataset of sampled functions, (a) a finite-dimensional neural feature encoding φ(x;w) and (b) a prior over last-layer weights (matrix-normal prior p(K)=MN(K̄₀, Λ₀⁻¹, Σ_ε)), such that online Bayesian linear regression in that feature space yields accurate posterior predictive densities with linear-in-data inference cost — and can the prior/bases be meta-learned jointly (not in two phases) so the network is explicitly trained to be useful for *any* amount of online context data?

## 2. Dataset / schema
Five testbeds, each a family of functions/params θ sampled from a prior; offline meta-training on many sampled datasets:
- Sinusoid family (amplitude U[0.1,5.0], phase U[0,π]; from Finn et al. MAML testbed), x ∈ [−5,5].
- Discrete-switching step function (3 switching points U[−2.5,2.5], y∈{−1,1}).
- Pendulum transition model (mass, length U[0.5,1.5], OpenAI Gym), state (angle, angular velocity).
- Hopper 12D transition model (foot friction U[1.7,2.0], torso size U[0.02,0.08]), data from a PPO policy with dynamics randomization.
- Human lane-change driving (19 participant pairs, 1105 episodes @10Hz, 33-timestep cut): predict next position/velocity of both vehicles — effectively predicting human decisions under uncertainty.
Baselines: kernel GP (zero-mean, SE kernel), MAML (MSE, since MAML gives point predictions), ALPaCA-without-meta-training, ALPaCA-without-online-updating (equivalent to "dynamics randomization" robustness).
Code: https://github.com/StanfordASL/ALPaCA (stated).

## 3. Method / model
**ALPaCA (Adaptive Learning for Probabilistic Connectionist Architectures).** Model: ŷ_t = Kᵀφ(x_t;w) + ε, ε∼N(0,Σ_ε). Offline: meta-learn (K̄₀, Λ₀, w) minimizing expected KL between true posterior predictive and the surrogate's — equivalent to minimizing NLL ℓ̂(K̄₀,Λ₀,w) = (1/J)Σ_j [n_y log(1+φᵀΛ⁻¹φ) + (y−K̄ᵀφ)ᵀΣ⁻¹(y−K̄ᵀφ)] over J sampled datasets with random horizons t_j (Eqs. 10–12). Online: recursive Bayesian linear regression on the last layer only (φ frozen): **Λ_t⁻¹ = Λ_{t−1}⁻¹ − (1+φ_tᵀΛ_{t−1}⁻¹φ_t)⁻¹(Λ_{t−1}⁻¹φ_t)(Λ_{t−1}⁻¹φ_t)ᵀ** (Woodbury, Eq. 13), **Q_t = φ_t y_tᵀ + Q_{t−1}** (Eq. 14), **K̄_t = Λ_t⁻¹Q_t**, predictive mean **K_tᵀφ_{t+1}**, variance **Σ_{t+1} = (1+φ_{t+1}ᵀΛ_t⁻¹φ_{t+1})Σ_ε**. Complexity O(n_φ²) per online update; inference O(n+m) total vs O(n³) for kernel GPs. tanh activations chosen so variance far from data saturates to a prior value like a GP (Appendix A.1). Appendix: time-varying θ handled by exponential forgetting with no other changes (A.3); can be convex-combined with kernel GPs via GP closure under addition (A.4).

## 4. Equations & assumptions
- Observation model (Eq. 1): p(y|x,θ)=N(f(x;θ), Σ_ε), Σ_ε assumed known (multivariate-t relaxation in Appendix A.5 noted as numerically tricky).
- Objective: minimize conditional KL (Eq. 3): min_ξ D_KL(p(y|x_{t+1},D*_t) ∥ q_ξ(y|x_{t+1},D*_t)), in expectation over t, x, D*, θ*.
- Prior: p(K)∼MN(K̄₀, Λ₀⁻¹, Σ_ε); posterior (Eqs. 5–6): Λ_τ = ΦᵀΦ + Λ₀, K̄_τ = Λ_τ⁻¹(ΦᵀY + Λ₀K̄₀); predictive (Eqs. 7–8): N(K̄_τᵀφ(x), (1+φᵀΛ_τ⁻¹φ)Σ_ε).
- Loss (Eqs. 10–12): expected KL ≡ expected negative log-likelihood of the analytic posterior.
Assumptions: (i) Gaussian noise with known covariance; (ii) delta prior on basis-function weights w (not updated online) — lower capacity than MAML but near-monotonic improvement; (iii) iid θ sampling for the offline meta-dataset; (iv) fully-observed state in the dynamical-systems HMM treatment (Appendix A.2); (v) tanh activations for bounded far-from-data variance.

## 5. Features / target
Features: arbitrary input x (state/action pairs in dynamics tasks). Target: scalar or vector regression y. Horizon: next-step prediction (dynamical systems) / arbitrary regression.

## 6. Validation design
Offline meta-train on datasets sampled from the prior family; online test on held-out sampled functions with varying context sizes (0–25). Compared vs kernel GPR, MAML, and two ablations on **negative log likelihood** (posterior quality) and **MSE** (mean). Confidence intervals 95% throughout.

## 7. Numerical results / baselines
Numbers quoted exactly:
- **Sinusoid**: ALPaCA outperforms MAML on MSE **for all context-data sizes**, "especially acute for a small number of context datapoints"; MAML "performs poorly with a single sample." One sample gives ALPaCA "a good estimate of the sinusoid nearly everywhere," and **within five samples the estimated variance has dropped to nearly zero**. ALPaCA-without-meta-training also reduces variance but "its predictions are incorrect," isolating the meta-learning contribution. Appendix Figure 7: ALPaCA's NLL/MSE curves dominate GPR and the no-meta-training ablation across 0–10 samples.
- **Step function**: ALPaCA captures discrete switches "as well as or better than GP methods," without GPR's "large overcorrection below the function"; predicted confidence intervals "appear to be well-calibrated" (Figure 3, 5–25 context samples).
- **Pendulum/hopper**: "rapid performance improvement within the first few samples"; MAML shows little gain at low context and overfits with more gradient steps — ALPaCA's recursive least squares "avoids this ambiguity in the number of gradient steps." GPR is "prohibitively slow for high dimensional dynamical systems" (Figure 11 timing curves); 12D hopper handled with 32 basis functions, performance "did not noticeably change with a larger number of basis functions."
- **Lane change (real human data)**: ALPaCA "consistently reduces uncertainty and improves the quality of its predictions as more data is observed"; in many cases MAML "fails to adapt, and furthermore, gives no indication of its uncertainty" (Figure 15). Improvement was near-linear (vs early-rapid on synthetic tasks) — attributed to bimodal transition data.
*My inference:* the qualitative headline is strong but tables of exact NLL/MSE numbers are relegated to figure curves; exact scalar deltas are not printed. What IS exact: 1-sample global structure capture, 5-sample near-zero variance, MAML-worse-at-all-context-sizes on MSE.

## 8. Code / data availability
Code: https://github.com/StanfordASL/ALPaCA (stated). Data: Gym environments, public lane-change dataset (schmerling2017multimodal), synthetic function families.

## 9. Leakage & limitations
- Gaussian noise assumption with known Σ_ε; t-distribution relaxation is analytically available (Normal-Inverse-Wishart posterior) but backprop through it is numerically unstable — GSE's heavy-tailed scoring margins would need this addressed.
- Delta prior on w: adaptation happens only in the last layer, so out-of-prior structural shifts (rule changes) can't be absorbed online; only via offline retrain.
- Meta-overfitting and data-requirements characterization explicitly not addressed ("have largely not been addressed in this paper, or in the meta-learning literature broadly").
- No exact scalar NLL/MSE tables — claims are curve-based; GSE will need its own numbers.
- Lane-change experiment suggests near-linear (not early-rapid) improvement on genuinely bimodal human behavior — expectations should be calibrated per domain.

## 10. GSE overlap
Nothing in Garrett's map does analytic Bayesian online adaptation; GSE recalibrates weekly but not via closed-form posterior updates. Overlaps conceptually with GP ledgers (1902–1904) but replaces kernel GPs with weight-space meta-learned bases + recursive least squares. **New capability**: after each Sunday game, the league-wide engine posterior over team-strength latent parameters updates in closed form in O(n_φ²) — no refit, no step-count tuning, calibrated predictive variance shrinking through the season. The Appendix A.3 forgetting extension maps directly onto regime drift (new HC/rookie aging into a different θ).

## 11. GSE implementation spec
1. Offline meta-training: datasets = historical seasons sliced as function families; θ = team-season latent parameters; x = game features (tabular), y = margin.
2. Basis network φ: 2×128 tanh MLP, 16–32 basis functions (paper's stable range); meta-loss = NLL of analytic posterior over random horizons t (weeks 1–16).
3. Online weekly update: after each game, recursive Λ⁻¹/Q updates (Eqs. 13–14) — microseconds per team; predictive mean/variance feed the pick engine and Kelly sizing.
4. Known-Σ_ε: estimate league score-noise covariance empirically (paper estimated Σ_ε from validation MSE — follow that); long-term: implement the Normal-Inverse-Wishart t-posterior variant.
5. Regime drift: add exponential forgetting (Appendix A.3) with a tuned decay for new-regime teams (rookie QB/HC) vs veterans.
Effort: ~2–3 engineering weeks; PyTorch meta-loop plus a small recursive-update service.

## 12. Reproducible test
nflverse weekly data 2018–2024; meta-train offline on seasons ≤2022 (train over random cut weeks t); online-simulate 2023–2024: start from the meta-prior, ingest games week by week with recursive updates, predict next week's margin distribution. Baselines: (a) MAML-style gradient adaptation on the same support, (b) per-week refit, (c) static league prior. Metrics: NLL of margin (primary — posterior quality), Brier on win, RMSE; report learning curves over weeks 1–8 to test "few-sample" efficiency. Secondary test: bimodal sub-task (cover vs not) to check the lane-change caveat.

## 13. Acceptance / rejection gate
ADOPT iff ALPaCA's week-1-to-8 NLL on margin beats BOTH MAML-style adaptation and the static prior by **≥0.05 nats/game** averaged over 2023–2024, with near-monotonic improvement (no MAML-style early overfit dips). Reject if the recursive updates show no advantage over plain refit at week ≤4 — then the closed-form posterior isn't buying GSE anything over existing recalibration.

## 14. Improvement experiment
**Heteroscedastic ALPaCA**: combine with ledger 1902's flow-conditioned GP — replace the fixed Gaussian predictive variance Σ_{t+1}=(1+φᵀΛ⁻¹φ)Σ_ε with a normalizing-flow density over the last-layer outputs, keeping the analytic recursive mean update but allowing non-Gaussian predictive densities. Rationale: ALPaCA gives GSE the *online mechanics*; 1902 gives it the *noise shape*. Test: same weekly simulation; primary metric NLL improvement on heavy-tail weeks (weather/division games). Separately, prototype the Normal-Inverse-Wishart t-posterior (Appendix A.5) as the simpler alternative and pick the winner on NLL.
