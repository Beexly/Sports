# [1902] Non-Gaussian Gaussian Processes for Few-Shot Regression (arXiv:2110.13561v1)

**Citation:** Sendera, M., Tabor, J., Nowak, A., Bedychaj, A., Patacchiola, M., Trzciński, T., Spurek, P., Zieba, M. (2021). *Non-Gaussian Gaussian Processes for Few-Shot Regression*. arXiv:2110.13561v1. URL: https://arxiv.org/abs/2110.13561v1
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

**Why:** GP-based few-shot regression with a per-observation flow that fixes the two failures GPs have in sports: Gaussian-only noise and the "all tasks look alike" assumption.

## 1. Research question
Standard Gaussian Processes give closed-form few-shot posteriors but fail when (a) target noise is heteroscedastic/skewed/multi-modal, or (b) evaluation tasks are structurally dissimilar from meta-training tasks (e.g. periodicity assumed but violated). Can a per-marginal invertible flow, conditioned on input features, make the GP posterior locally non-Gaussian and adapt to dissimilar few-shot regression tasks while keeping the closed-form GP conditioning?

## 2. Dataset / schema
- **Sines** (synthetic, Finn-style): amplitude ∈ [0.1,5.0], phase ∈ [0,π], N(0,0.1) noise; inputs uniform in [-5,5]; 5 support + 5 query at train, 5 support + 200 query at test. Out-of-range variant extends inference range to [-5,10]. Plus a **mixed-noise** variant: targets A·sin(x+φ) + |x+φ|·ε (input-dependent noise).
- **QMUL head-pose trajectory** (Gong et al. 1996): 37 people (32 train, 5 test), 133 grayscale images each over yaw ±90°, tilt ±30°; task = predict tilt along sampled trajectories; in-range = full manifold, out-of-range = train on leftmost 10 angles only.
- **Pascal3D object pose** (Yin et al. 2019): 50 train objects, 15 test objects; 30 128×128 renders each, 15 support / 15 query; target = orientation vs canonical pose.
- **Power** (UCI Individual Household Electric Power Consumption, sub_metering_3): each day = one task (1440 values); train on first 50 days, validate on next 50; 10 points sampled per task.
- **NASDAQ100** and **EEG** real time series; exact construction described only in Supplementary Materials A.
- All public except code: https://github.com/gmum/non-gaussian-gaussian-processes (open source, stated).

## 3. Method / model
**NGGP**: feature extractor h_φ(·) → NN Linear deep kernel k_θ(h_φ(x),h_φ(x′)) (also tested RBF, Spectral Mixture kernels) → GP marginal likelihood on a latent z, then an invertible 1-D Continuous Normalizing Flow (FFJORD dynamics g_β, shared parameters across components) applied independently per observation, **conditioned on h_φ(x_d)** so each datapoint's warping knows its input context. Meta-training: sample task, maximize the flow-augmented marginal log-likelihood (Eq. 13), gradient updates on θ, φ, β. Inference: compute GP closed-form posterior on the inverse-mapped support/query targets, push through the forward flow (Eq. 14). Deep Kernel Transfer (DKT) paradigm from Patacchiola et al. 2020, but the flow replaces the pure-Gaussian likelihood.

## 4. Equations & assumptions
Core equations (copied faithfully):
- GP regression posterior: **μ\* = K(X\*,X)(K(X,X)+σ²I)⁻¹y**, **K\* = K(X\*,X\*)+σ²I − K(X\*,X)(K(X,X)+σ²I)⁻¹K(X,X\*)** (Eq. 4).
- CNF log-probability: **log p(y) = log p(f_β⁻¹(y)) − ∫ Tr(∂g_β/∂z(t)) dt** (Eq. 8).
- Flow-conditioned marginal likelihood: **log p(y|X,φ,θ,β) = log p(zʰ|X,φ,θ) − Σ_d ∫ ∂g_β/∂z_d(t) dt** (Eq. 13), with **zʰ = f_β⁻¹(y, h_φ(X))**.
- Per-datapoint forward map: **y_d = f_β(z_d, h_φ(x_d)) = z_d + ∫ g_β(z_d(t), t, h_φ(x_d)) dt** (Eq. 11); inverse **f_β⁻¹(y_d) = y_d − ∫ g_β(z_d(t), t, h_φ(x_d)) dt** (Eq. 12).
- Predictive log-probability (Eq. 14): **log p(y\*|X\*,y,X,φ,θ,β) = log p(z\*ʰ|X,zʰ,X,φ,θ) − Σ_d ∫ ∂g_β/∂z_d(t) dt**.
Assumptions: (i) the GP captures cross-observation dependence while the flow handles only marginal shapes — conditional independence of the flow across datapoints; (ii) flow dynamics g_β shared across all components; (iii) conditioning on h_φ(x) suffices to capture context-dependent noise; (iv) FFJORD ODE integration is tractable per component (1-D Jacobian = scalar derivative). Not stated: no calibration analysis, no statement on hyperparameter schedules (α, η, γ values deferred to supplements).

## 5. Features / target
Features: task-dependent — scalar x (sines), CNN-embedded face images (head-pose), rendered object images (Pascal3D), time index (power/NASDAQ/EEG). Target: scalar regression target per task (sine value, tilt angle, orientation angle, consumption/price/EEG voltage). Horizon: one-step-ahead / point-level prediction, not multi-step.

## 6. Validation design
Meta-train tasks vs. held-out meta-test tasks (disjoint persons/objects/days); support/query split at test time. Metrics: MSE and NLL. Baselines: DKT with RBF/Spectral/NN-Linear kernels, Feature Transfer (1/100), MAML (1 step), MR-MAML, CNP, MR-CNP, BbB, weight decay, plain fine-tuning. Out-of-range (domain-shift) ablations on sines, head-pose, NASDAQ. Splits are by entity (person/object/day), not time-ordered except the power-dataset day split.

## 7. Numerical results / baselines
Key numbers quoted exactly (mean ± std; lower is better):
- **Sines in-range MSE**: DKT+Spectral 0.02 ± 0.01, NGGP+Spectral 0.02 ± 0.01 (tie); **out-of-range MSE**: DKT+Spectral 0.04 ± 0.03 vs NGGP+Spectral 0.03 ± 0.02 (NGGP wins).
- **Mixed-noise sines in-range NLL**: DKT+Spectral 0.37 ± 0.16 vs NGGP+NN Linear **0.17 ± 0.15** (NGGP best; models heteroscedastic noise); **out-of-range NLL**: DKT+Spectral 1.58 ± 0.40 vs NGGP+Spectral 1.35 ± 0.38.
- **Head-pose out-of-range NLL**: DKT+Spectral 0.00 ± 0.09 vs NGGP+Spectral **−0.62 ± 0.24** (substantial calibration win under domain shift); in-range NLL: DKT+Spectral 0.03 ± 0.13 vs NGGP+Spectral −0.68 ± 0.23.
- **Object pose MSE**: MAML 5.39 ± 1.31, MR-MAML 2.26 ± 0.09, DKT+Spectral 1.79 ± 0.15, NGGP+Spectral 2.34 ± 0.28 (MSE slightly worse), but **NLL**: DKT+Spectral 1.30 ± 0.06 vs NGGP+Spectral **0.86 ± 0.45** — GP methods resist the memorization problem that plagues MAML/CNP.
- **NASDAQ100 out-of-range**: NLL DKT+RBF 1.049 ± 2.028 vs NGGP+RBF **−2.978 ± 0.571**; MSE×100: DKT+RBF 0.181 ± 0.089 vs NGGP+RBF 0.016 ± 0.034.
- **EEG in-range NLL**: DKT+RBF −1.640 ± 0.237 vs NGGP+RBF **−1.715 ± 0.282**.
Pattern: NGGP's wins concentrate in NLL (probabilistic calibration) and out-of-range robustness, not raw MSE. *My inference:* this is exactly the "well-calibrated probability beats point estimate" property GSE needs.

## 8. Code / data availability
Code: https://github.com/gmum/non-gaussian-gaussian-processes (stated open source). Data: QMUL face dataset (public), Pascal3D (public), UCI Power (public), NASDAQ100 and EEG datasets referenced (links in supplements; I did not verify the URLs).

## 9. Leakage & limitations
- Memorization concern: with few meta-training tasks the kernel could memorize task identities; authors show GP-based methods resist this better than MAML/CNP on Pascal3D, but no leave-one-season-style temporal validation — sports regime shifts (rule changes, roster churn) are harsher than these ablations.
- O(n³) GP cost; flow (FFJORD) adds ODE-solve cost per training step — authors state NGGP is harder to train than DKT and only worthwhile when data is genuinely non-Gaussian.
- No calibration diagnostics (reliability diagrams, grouping loss); NLL wins imply better calibration but are not shown to be *well*-calibrated.
- Conditioning the flow on h_φ(x) can leak task identity through the features on tiny support sets — a form of overfitting the context; sports support sets (2–4 games) are exactly where this bites.
- External validity: all benchmarks are vision/physics/time-series; no discrete-event or tabular sports data tested.
- Assumption (i) (flow acts only on marginals) means joint dependence structure stays Gaussian — correlated prediction errors across games (e.g. market-driven) are not modeled.

## 10. GSE overlap
No meta-learning / few-shot / GP-prior entry in Garrett's existing-research map (checked ~/workspace/arxiv-sweep/existing-research-map.md: GPs mentioned only in an ML-brief context; no prior deep reads). GSE's engine is XGBoost-family and state-space (per corpus), none of which gives closed-form few-shot posteriors. This is a **new capability**, not duplication: a meta-learned prior over team/strength models that adapts with 2–4 games of data on a new regime (rookie QB, new head coach, post-bye scheme change). Closest relative in-repo: the calibration stack (grouping loss, CQR) which NGGP's NLL objective complements.

## 11. GSE implementation spec
1. Data: nflverse play-by-play 2015–2025; build per-team-season "tasks" (each = 17 games of team-level EPA/pace/success-rate features); hold out 2024–2025 as meta-test regimes.
2. Features h_φ: team context vector (roster continuity %, QB identity embedding, coaching tenure, Vegas-implied strength). Target: next-game EPA margin or win probability logit.
3. Model: NN Linear deep kernel + GP + FFJORD per-observation flow (use authors' repo as starting point, port from their code).
4. Meta-train on 2015–2022 team-seasons; meta-test: new-regime tasks (rookie QB starts, new HC first 4 games, 2023–2025).
5. Serving: precompute flow-conditioned GP posterior per team weekly; posterior predictive mean → win prob, NLL-calibrated intervals feed the pick-confidence layer.
Effort: ~2–3 engineering weeks (data task-building is the bulk; model code exists).

## 12. Reproducible test
Dataset: nflverse team-game EPA margin 2015–2025. Protocol: leave-one-season-out meta-split; tasks = team-seasons; support = first K∈{2,4} games of each meta-test team-season; query = remaining games. Baselines: league-average prior, DKT-style deep kernel GP without flow (ablation = Eq. 13 minus flow term), XGBoost trained on meta-train only. Metrics: Brier on win prob + NLL of margin. Must be runnable from a single script using the authors' repo + nflverse.

## 13. Acceptance / rejection gate
ADOPT into the engine's new-regime module iff few-shot adapted NGGP beats the league-average prior by **≥0.01 Brier** on the new-regime teams' first 4 games, averaged over the 2023–2025 leave-one-season-out meta-tests, AND beats the no-flow DKT ablation on NLL. Reject if the flow gives no NLL gain over DKT (flow is the costliest component). Gate set before running.

## 14. Improvement experiment
Replace the shared flow parameters β with a *task-conditioned hypernetwork* β = H(context) where context = QB/coach embedding — a NGGP × conditional-flow hybrid. Hypothesis: rookie QBs and veteran QBs have different noise geometries (rookie = heavy-tailed bust weeks), and a single shared flow underfits that difference. Test: same meta-protocol; expect the conditional variant to cut out-of-range NLL further on rookie-HC/QB regimes. If the hypernetwork overfits on 2-game support sets, fall back to sharing β across QB archetype clusters (rookie/bridge/veteran). The paper cites DKT (patacchiola2020bayesian), ALPaCA (harrison2018meta), PACOH (rothfuss2021pacoh), MetaKernel (du2021metakernel) — all candidate follow-up reads in this lane.
