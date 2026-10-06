# [1551] Bayesian Predictive Synthesis with Outcome-Dependent Pools (arXiv:1803.01984)

**Citation:** Johnson, M. C. and West, M. (2023). *Bayesian Predictive Synthesis with Outcome-Dependent Pools*. arXiv:1803.01984v3 [stat.ME]. (Johnson: Amazon; West: Duke University.) URL: https://arxiv.org/abs/1803.01984
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 28 pages; §§1–6, Table 1, Figures 1–8, appendices A–B skimmed for sampler structure).
**Verdict:** ADAPT — the foundational supra-Bayesian framework for density forecast combination gives GSE a principled blueprint: outcome-dependent weights, cross-model dependence, time-varying synthesis via discount factors, and a mandatory baseline "safe haven" for model-set incompleteness.

## 1. Research question
How should a Bayesian decision maker D combine predictive densities h1(y),…,hJ(y) from multiple models/experts with a generative, foundational justification — going beyond the linear opinion pool and Bayesian model averaging (BMA) to handle (i) model-specific biases and miscalibration, (ii) dependencies across models (herding/consensus), (iii) weights that depend on the forecast outcome itself, and (iv) model-set incompleteness (M-open: all models are wrong)? The paper reviews Bayesian Predictive Synthesis (BPS) and develops dynamic mixture-BPS for time series.

## 2. Dataset / schema
Illustrative empirical study: daily EUR/USD log price, 7/1/2016–12/30/2016, 130 trading days (includes the US presidential election FX shock). Target: 5-day-ahead forecast distributions, produced daily. Model set: J=3 dynamic linear models — M1 TVAR(2), M2 TVAR(5), M3 linear-growth DLM — plus baseline M0 TVAR(1) as the "safe haven." Data source not public-linked (standard FX series, replicable from public FX data). The paper is primarily methodological; the FX study is a demonstration, not a benchmark.

## 3. Method / model
Supra-Bayesian framework: D updates prior p(y) to posterior p(y|H) = ∫ α(y|x) h(x) dx (1), where h(x) = Πj hj(xj), x are latent model states, and α(y|x) is the synthesis function (a conditional density), via Jeffrey's rule (not Bayes' theorem). Consistency with D's prior: p(y) = ∫ α(y|x) m(x) dx (2).
Mixture BPS specifications for α(y|x):
- Constant-weight: α(y|x) = ω0 h0(y) + Σj ωj δxj(y) → p(y|H) = ω0 h0(y) + Σj ωj hj(y) — nests linear pools and BMA as special cases. Bias-adjusted variant: α = ω0 h0(y) + Σj ωj δxj−βj(y) → p(y|H) = ω0 h0(y) + Σj ωj hj(y + βj).
- Outcome-dependent (model-specific): α(y|x) = ω0(x)h0(y) + Σj ωj(xj)δxj(y) (5); yields recalibrated densities h'j(y) = ωj(y)hj(y)/cj with cj = ∫ωj(y)hj(y)dy. Gaussian-weight example: ωj(xj) = qj exp(−(xj−μj)²/(2σj²)) — model j trusted most near μj; Gaussian-well variant down-weights a model in regions it favors.
- Cross-model (dependence-aware): ωj depends on full x (6); effective weight wj(y) = ∫ ω̃j(x−j,y) Πi≠j hi(xi) dxi (7). Consensus weighting: ωj(x) = qj exp(−ej²/(2νj)) with ej = xj − E[xj|x−j] under m(x) = N(μ,Σ) — down-weights forecasts far from the conditional consensus (8). Herding weighting: ωj(x) = qj(1 − d·exp(−ej²/(2νj))) — discounts agreement when models are expected to agree, rewards diversity (9). Softmax example: ω2(x) ∝ exp(x2−x1) favors higher forecasts.
- Dynamic BPS: time-varying βt (biases), Σt (cross-model dependence), qt (base weights); NIW prior on (βt,Σt), Dirichlet on qt; evolution via discount factors (increased uncertainty each step); sequential forecast → filter (Gibbs sampler with latent mixture indicator z, Appendix A) → evolve; variational-Bayes projection of MCMC posterior back to NIW/Dirichlet (Appendix B).
The baseline h0 (diffuse "safe haven") is theoretically required to address model-set incompleteness — BPS does not degenerate to a single wrong model as data accrue, unlike BMA.

## 4. Equations & assumptions
- BPS posterior: p(y|H) = ∫ α(y|x) h(x) dx, h(x) = Πj hj(xj). (1)
- Prior consistency: p(y) = ∫ α(y|x) m(x) dx, m(x) = E[h(x)]. (2)
- Generalized linear pool: p(y|H) = Σj wj(y) hj(y), wj outcome-dependent. (3)
- Mixture synthesis: α(y|x) = ω0 h0(y) + Σj ωj δxj(y); α(y|x) = ω0(x)h0(y) + Σj ωj(xj)δxj(y) (5); α(y|x) = ω0(x)h0(y) + Σj ωj(x)δxj(y) (6).
- Recalibrated densities: h'j(y) = wj(y)hj(y)/cj, wj from (7).
- Consensus weight: ωj(x) = qj exp(−ej²/(2νj)), ej = xj − E[xj|x−j]. (8)
- Herding weight: ωj(x) = qj(1 − d exp(−ej²/(2νj))). (9)
- Dynamic synthesis: α(yt|xt) = ω0t(xt)h0t(yt) + Σj ωjt(xt) δxjt−βjt(yt). (10)
- Linear-regression synthesis example: α(y|x,θ,υ) = N(θ0 + θ′x, υ) — intercept corrects bias, θ weights correct dependence, υ residual uncertainty.
- Gaussian-weight worked example: h(y) = N(f,s), ω(y) = q exp(−(y−μ)²/(2σ²)) → h'(y) = N(a1μ + a2f, a1a2(σ²+s)), a1 = s/(σ²+s), a2 = σ²/(σ²+s); mixture weight q√(σ²/(σ²+s)) exp(−(f−μ)²/(2(σ²+s))).
Assumptions: D's implicit prior over (y,H) exists and is partially specified via m(x), α(y|x); posterior-consistency of experts not required (BPS handles bias); product form of h(x) reflects conditional independence of latent states given H, not independence of models (dependencies live in α and m).

## 5. Features / target
Inputs: J predictive densities hj(·) per time t (in the example: 5-day-ahead DLMs for FX). Target: D's synthesized predictive density p(yt|Ht) for the scalar outcome; point forecasts taken as predictive means. No exogenous features — combination operates on the forecast densities themselves; optional covariates can enter ωj (noted, not implemented).

## 6. Validation design
Sequential demonstration, not a formal benchmark: daily rolling 5-day-ahead synthesis over 130 trading days; models are adaptive DLMs. Comparators: individual models M0–M3, BMA, BMAx (BMA + baseline added ad hoc), POOL (equal-weight linear pool), POOLx (equal-weight + baseline). Metrics: RMSE of point forecasts and mean log predictive score, each normalized to BPS = 1.00/1.000, averaged over the 6 months. Learning diagnostics: filtered trajectories of cross-model correlations in Σt, bias vector βt, base weights qt, and MCMC model-sampling frequencies.

## 7. Numerical results / baselines
Table 1 (normalized; RMSE ↓, log score ↑; paper's numbers, BPS = reference):
- BPS: RMSE 1.00, log score 1.000.
- BMA: 1.09 / 0.956. BMAx: 1.08 / 0.956. POOL: 1.05 / 0.965. POOLx: 1.06 / 0.963.
- M0 TVAR(1): 1.09 / 0.946. M1 TVAR(2): 1.10 / 0.946. M2 TVAR(5): 1.11 / 0.945. M3 DLM: 1.15 / 0.886.
So BPS beats every comparator on both metrics (e.g., ~9% RMSE improvement over BMA, ~4.4 points of log score over BMA's 0.956). Paper's interpretation: BMA scores 1-step-ahead accuracy in its weight updates and degenerates toward one model; BPS synthesizes genuine 5-day-ahead densities and never collapses. Dependence learning: 1-day-ahead-focused repeat analysis gives cross-model correlations 0.3–0.5 (strong herding — models nearly identical short-term); 5-day-ahead analysis learns near-zero/weak positive correlations that break down around the election shock and partially recover. Bias trajectories (Fig. 5b) show time-varying βt corrections; effective MCMC weights (Fig. 6b) differ markedly from Dirichlet base weights (Fig. 6a) — the difference is wholly due to outcome-dependent weighting. No significance tests reported; single 130-day sample.

## 8. Code / data availability
None stated. No repository; FX data not linked (publicly replicable series). Sampler details in appendices A–C.

## 9. Leakage & limitations
- Demonstration, not benchmark: one 130-day FX sample, no out-of-sample protocol beyond sequential filtering, no statistical significance — the 9% RMSE edge over BMA is suggestive, not established.
- All models are DLMs from one family (TVAR variants + growth DLM) — the herding/dependence machinery is exercised on near-duplicate models; behavior on genuinely diverse expert sets (GSE's case: engine, market, Elo) is untested here.
- BMA comparison is slightly stacked: BMA inherently scores 1-step-ahead while BPS is built for the 5-step target; the paper is transparent about this but it flatters BPS.
- Computation is heavyweight: Gibbs + rejection sampling + VB projection per time step — overkill for weekly NFL cadence unless simplified.
- The "safe haven" baseline h0 choice is subjective and influential (falls back to it when models disagree with expectations); no guidance on calibrating its diffuseness beyond "rather diffuse."
- My adversarial note: outcome-dependent weights wj(y) depending on the *unobserved* outcome is philosophically coherent in BPS (weights are functions evaluated at y) but operationally it means the combination rule is y-contingent — in deployment you sample from the mixture, which is fine, but interpreting "which model won" post hoc is murkier than with constant weights.

## 10. GSE overlap
Foundational extension, no duplication. Nothing in the existing-research-map implements supra-Bayesian synthesis, outcome-dependent weights, or cross-model dependence modeling. CEPT (Garrett's lane) is about testing causal skill, not combining densities — complementary: CEPT could score whether BPS's synthesized expert has real skill. The 2026-09-18 ML brief's open "ensembling" topic is the direct slot. GSE's practical analogue of "model set incompleteness" is real: engine + market + Elo are all wrong in different ways, and a diffuse baseline (e.g., a wide historical margin distribution) as safe haven is a concrete, unbuilt safeguard.

## 11. GSE implementation spec
Build "GSE-BPS" as the seasonal combination layer:
1. Models (J=3–4): engine v5.2.7 margin density, de-vigged market margin density, Elo margin density; baseline h0 = diffuse historical NFL margin distribution (safe haven).
2. Static start: constant-weight mixture with bias terms βj (location shifts per model) fit by maximizing log score on 2023–2024; then add outcome-dependent Gaussian weights ωj(y) = qj exp(−(y−μj)²/(2σj²)) so each model is trusted most where it historically wins (e.g., engine in close games, market in blowouts).
3. Dependence: estimate Σ over latent model states from aligned historical forecast quantiles; apply consensus down-weighting (8) when engine and market herd.
4. Dynamic: weekly discount-factor evolution of (βt, Σt, qt) across the season (simple exponential forgetting as a first cut before full Gibbs+VB).
Effort: ~2 weeks for static + outcome-dependent Python prototype (scipy optimization of log score); dynamic layer +1–2 weeks.

## 12. Reproducible test
Dataset: 2023–2025 NFL regular seasons; per-game margin predictive densities from engine, market (de-vigged), Elo; baseline = empirical margin distribution 2015–2022. Protocol: fit weights/biases on 2023–2024 (maximize mean log score), evaluate on 2025 (all 272 games). Metric: mean log predictive score + CRPS + 80% interval coverage. Baselines: equal-weight pool, BMA-style log-score weights, best single model, market alone.

## 13. Acceptance / rejection gate
ADOPT outcome-dependent BPS if 2025 mean log score beats the equal-weight pool by ≥0.02 nats AND beats BMA-style weighting, with 80% interval coverage in [0.75, 0.85]; REJECT (fall back to constant-weight pool + baseline) if log-score gain < 0.01 nats or if the outcome-dependent weights collapse to near-constant (max_j std(wj(y)) < 0.05, indicating no outcome-specific expertise). Dynamic discount layer accepted separately if it beats static BPS on second-half-of-season log score.

## 14. Improvement experiment
Condition the outcome-dependent weights on game state, not just the outcome: ωj(y, s) with s = (spread bucket, divisional game flag, weather flag). Hypothesis: model expertise is regime-specific (engine better in divisional games, market better in extreme weather) — a hypothesis the paper's framework explicitly allows ("weights could be functions of additional covariates") but never tests. Fit via gradient-boosted weight functions maximizing log score; expect the largest gains in high-total and double-digit-spread games where expert disagreement is largest.
