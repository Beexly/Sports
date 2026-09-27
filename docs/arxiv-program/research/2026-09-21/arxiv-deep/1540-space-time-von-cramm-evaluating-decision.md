# [1540] Space-Time VON CRAMM: Evaluating Decision-Making in Tennis with Variational generatiON of Complete Resolution Arcs via Mixture Modeling (arXiv:2005.12853)

**Citation:** Stephanie Kovalchik, Martin Ingram, Kokum Weeratunga (2020). *Space-Time VON CRAMM: Evaluating Decision-Making in Tennis with Variational generatiON of Complete Resolution Arcs via Mixture Modeling*. arXiv:2005.12853. URL: https://arxiv.org/abs/2005.12853
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — a Bayesian generative trajectory model (infinite DP-GMM with variational inference) + continuous-time Expected Shot Value + attribution metrics that separate execution (VAST), decision quality (Shot IQ), and coverage/defense (VACC) is directly portable to GSE's NGS tracking work: the same recipe yields Expected Play Value decompositions separating QB decision quality from arm execution and receiver/defender effects.

## 1. Research question
How to attribute value to individual actions in tennis from tracking data? The paper builds a functional-data Bayesian framework for Expected Shot Value (ESV) in continuous time — a three-step recipe: (1) generative model of full-resolution ball/player trajectories via an infinite Bayesian Gaussian mixture model, (2) conditioning the GMM on observed positions, (3) outcome prediction given the functional encoding — then derives VAST (shot execution), Shot IQ (shot selection), and VACC (court coverage) metrics, applied to the 2019 US Open.

## 2. Dataset / schema
Ball and player tracking data from the 2019 US Open (Tennis Australia / tournament tracking feed). Shot events encoded functionally: each arc of ball flight as cubic polynomials per 3D dimension (f_x(t) = θ_0 + θ_1 t + θ_2 t² + θ_3 t³); a 1-bounce shot = 2 arcs = 24 features; no-bounce = 12 features; player movement as 2D line segments (+8 features). Outcome labels from point-by-point feeds: clean winners or forced-error-inducing shots = 1; errors assigned value 0 via bounce location. Access: proprietary tournament tracking data; no public link stated.

## 3. Method / model
(1) Generative: infinite Bayesian GMM on the functional encodings — A(ω)|z ~ MVN(μ_z, Σ_z) with stick-breaking Dirichlet process prior (v_i|α ~ Beta(1,α); π_i(v) = v_i Π_{j<i}(1−v_j)), fit by variational inference (Blei et al. 2006), so the number of components is inferred. (2) Conditional generation: since an observed position f_x(t_0) = C·A(ω) is a linear combination of the MVN parameters, the conditional A(ω)|C·A(ω) = f_x(t_0) is MVN in closed form (Eq. 5); mixture weights updated by Bayes' rule P(z|X_t) ∝ P(X_t|z)P(z) (Eq. 6). (3) Outcome prediction: generalized additive models (GAMs) on speed/height/bounce-location features to get P(W(ω)|A(ω)) for shot-level ESV via Eq. (2). Metrics: VAST = ESV marginalized over receiver variables (Eq. 7); Shot IQ = ESV with only positional configuration fixed, execution integrated out; VACC = VAST − P(W|S,R) (Eq. 8), crediting the receiver's court coverage.

## 4. Equations & assumptions
- ESV_t = E[W(ω)|X_t], t ≥ 0 (1); ESV_t = ∫_ψ P(W(ω)|A(ω)=A(ψ)) · P(A(ω)=A(ψ)|X_t) dψ (2).
- f_x(t) = θ_0 + θ_1·t + θ_2·t² + θ_3·t³ (3); C = (1, t, t², t³).
- (A(ω); C·A(ω)) jointly MVN (4); A(ω)|C·A(ω)=f_x(t) ~ MVN(μ + ΣC′(CΣC′)^{−1}(f_x(t)−Cμ), Σ − ΣC′(CΣC′)^{−1}CΣ) (5).
- P(z|X_t = x_t) = P(X_t=x_t|z)P(z) / Σ_z P(X_t=x_t|z)P(z) (6).
- VAST = ∫ P(W|S,R) P(R) dR (7); VACC = VAST − P(W(ω)|S,R) (8).
Assumptions: trajectory smoothness (cubic arcs adequate); player movement between shots is point-to-point (line segments, "minimal loss"); DP-GMM captures the shot-event manifold; GAM outcome model well-specified; forced vs unforced error labeling from the data provider is trusted.

## 5. Features / target
Inputs: ball/player trajectories (functional polynomial coefficients), shot speed/height/bounce location, opponent position at contact. Target: binary point-won indicator W(ω) (winner or forced error). Horizon: continuous within-shot time t ≥ 0; ESV evaluated at any point during the shot.

## 6. Validation design
Outcome-model validation: decile calibration of predicted vs observed winning-shot percentage (within ~4 percentage points); log-loss reported separately for serves (0.44) vs rally shots (0.19), with lower serve recall attributed to forced/unforced labeling ambiguity in the feed. Benchmarks: none formal (dominance features tested as an ablation — no meaningful gain). Player-metric validation is face-validity on 2019 US Open (round-of-16+ players).

## 7. Numerical results / baselines
Paper's reported numbers (quoted): outcome-model log-loss 0.44 (serves) / 0.19 (rally); ESV >50% serves within 1m of wide line 11% vs 8% within 1m of center line (wide-serve edge). Medvedev's 121 mph down-the-T serve vs Nadal: VAST 75% (95% of marginalized outcomes >50% win chance) but actual conditional win chance 1 in 10 given Nadal's positioning. Shot IQ among men's round-of-16: −10 to +10 pp on first serve vs event average (−5 to +5 on second); Federer/Wawrinka top first-serve Shot IQ; Djokovic/Schwartzman top second-serve. Serena Williams: VAST ≥50% on >1/3 of first serves; >1/5 of second-serve returns at VAST >50% (with Andreescu). Nadal elite VACC neutralizing serves.

## 8. Code / data availability
None stated — no code repository; tracking data proprietary.

## 9. Leakage & limitations
Adversarial notes: (1) No formal baseline comparison for the outcome model; log-loss 0.44 on serves is weak in absolute terms. (2) Forced/unforced error labeling comes from the feed provider and drives the target definition — label noise acknowledged. (3) Variational inference for the DP-GMM gives approximate posteriors; no convergence/diagnostic reporting. (4) VAST/Shot IQ/VACC validated only by narrative, not by predictive or stability tests (e.g., split-half reliability across tournaments). (5) Tennis-specific trajectory smoothness assumptions need re-derivation for football's 22-player interactions.

## 10. GSE overlap
Existing map: NGS tracking deep-dives and expected-points frameworks are inventoried; nothing in the corpus builds a Bayesian generative trajectory model or decomposes play value into decision vs execution vs coverage components. GSE's engine attributes EPA to units coarsely; this paper's attribution machinery (marginalize over opponent/receiver variables) is novel to the corpus and directly applicable to NGS data.

## 11. GSE implementation spec
1. Adapt to NFL NGS tracking: functional encoding of route trajectories (polynomial or spline coefficients per route) + QB/receiver/defender positions; DP-GMM (or variational autoencoder with Bayesian framing) as the generative model of play developments.
2. Define Expected Play Value EPV_t = E[positive EPA | tracking state X_t] via the same three-step recipe: generative trajectory model → condition on observed positions → outcome model (GAM or gradient boosting) mapping encodings to EPA/success.
3. Derive NFL analogues: Decision IQ (QB: marginalize over throw execution/outcome, keep pre-throw configuration — separates read/decision quality from arm); Execution+ (receiver: catch-point value vs average); Coverage VACC (defender: value denied vs average coverage).
4. Effort: ~3–4 weeks in the gse-lab; needs NGS tracking access (already inventoried).

## 12. Reproducible test
Dataset: NGS 2023–2025 tracking (weekly). Metric: outcome-model log-loss/AUC on held-out 2025 plays vs a non-generative baseline (features-only GAM); stability: split-half correlation of player Decision-IQ across season halves ≥ 0.35. Gate: generative + conditioning pipeline must beat the features-only outcome model on held-out log-loss before any metric is trusted.

## 13. Acceptance / rejection gate
ADOPT the three-step recipe (generative trajectory model → MVN conditioning → outcome model) and the marginalization-based attribution metrics if the outcome model beats a features-only baseline on 2025 held-out log-loss AND player metrics are split-half stable (r ≥ 0.35); REJECT any single metric (VAST/Shot-IQ/VACC analogues) that fails the stability gate — the paper provides no stability evidence, so the burden is on our replication.

## 14. Improvement experiment
Beyond the paper: replace the DP-GMM with a deep generative model (conditional VAE/diffusion) over trajectory encodings to handle football's multi-agent interactions; add defender-behavior conditioning (coverage shell as a context variable in the generative model); and validate the attribution metrics by testing whether Decision-IQ predicts future EPA/play beyond raw EPA (incremental R² test) — the predictive-validity check the paper never runs.
