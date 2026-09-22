# [1670] Dynamic Bayesian regression quantile synthesis for forecasting outlook-at-risk (arXiv:2603.11474v1)

## 1. Citation and full-text verification

**Citation:** Genya Kobayashi, Shonosuke Sugasawa, Yuta Yamauchi, Dongu Han (2026). *Dynamic Bayesian regression quantile synthesis for forecasting outlook-at-risk*. arXiv:2603.11474v1. URL: https://arxiv.org/abs/2603.11474v1
**Ledger completed:** 2026-09-21. **Read:** full text via ar5iv HTML (https://ar5iv.labs.arxiv.org/html/2603.11474) — abstract, sections 1 (Introduction), 2 (Dynamic regression quantile synthesis: BPS, univariate DRQS, US inflation-at-risk), 3 (Factor DRQS for multiple time series), 4 (Forecasting global growth-at-risk: data, quantile performance, parameter estimates, predictive distributions, Figures 1–14, Table 1), 5 (Concluding remarks), references, and Supplementary Appendices S.1 (posterior computation), S.2 (agent models), S.3–S.4 (additional results). Read all ~1,597 extracted lines; skimmed only the Gibbs-sampler algebra in S.1 after verifying the sampler structure.
**Verdict:** ADAPT — BPS-based quantile synthesis with time-varying weights and a cross-series factor structure is the closest thing in this wave to a production-grade GSE combiner (it handles full predictive distributions, time-varying agent reliability, and cross-game information sharing), but the MCMC/FFBS implementation is too heavy for GSE's weekly cadence and must be reimplemented as a fast sequential filter; also proven on macro data, not sports.

## 2. Research question
How to combine multiple "agent" forecasting models' *quantile* predictions (not just means) inside the Bayesian Predictive Synthesis (BPS) framework, with weights that adapt over time — and how to extend that to many time series at once by imposing a latent factor structure on the synthesis weights so cross-sectional information is shared. Demonstrated on US inflation-at-risk and global GDP growth-at-risk.

## 3. Method / model
- **BPS setup:** J agent models each supply a predictive density h_{tj}; the synthesized predictive distribution is p(y_t|Φ_t,H_t) = ∫ α(y_t|f_t,Φ_t) ∏_j h_{tj}(f_{tj}) df_t, where f_t are latent draws from agent predictives and α is the synthesis function with time-varying parameters Φ_t (Eq. 1).
- **DRQS (univariate):** synthesis function = asymmetric Laplace AL(τ,σ) density → the model is a dynamic quantile linear model with latent predictors: y_t = F_{τ,t}'θ_{τ,t} + ε_{τ,t}, ε ~ AL(τ,σ_{τ,t}); θ_{τ,t} = θ_{τ,t−1} + w_t (random-walk synthesis weights, discount factor δ_τ); scale σ follows a gamma-beta random walk (discount β_τ). Fit per quantile τ on a grid (0.05…0.95).
- **Estimation:** AL mixture representation y_t|f_t,θ_t,σ_t,v_t ~ N(F_t'θ_t + κ_1 v_t, σ_t κ_2 v_t), v_t ~ Exp(σ_t), κ_1 = (1−2τ)/(τ(1−τ)), κ_2 = 2/(τ(1−τ)) → conditional DLM → Gibbs sampler with forward-filtering backward-sampling (FFBS) for states, GBRW updates for scales.
- **FDRQS (multivariate):** N series stacked; synthesis weight for agent j, series i, time t factorized as θ_{itj} = λ_{ij}' u_{tj} (L=5 latent factors); multiplicative gamma process (MGP) prior shrinks higher-order loadings to zero (Eq. 10); latent factors follow random walks. Cuts the weight dimension (their example: N=18, J=4 → 90 weights → factor form) and induces cross-series correlation in predictive draws.
- **Forecasting:** 1-step-ahead posterior predictive of Q_{T+1}(τ) by propagating Φ_{T+1} through state equations, drawing agent predictives f_{T+1,j}, forming F_{T+1}'θ_{T+1} per MCMC draw.

## 4. Mathematics / equations / assumptions
- AL density: α_τ(ε|σ) = τ(1−τ)/σ · exp{−ρ_τ(ε/σ)}, ρ_τ(u) = u(τ − I(u<0)) the check function; the τ-quantile of AL(τ,σ) is exactly 0, so Q_t(τ|f,θ) = F_t'θ (Eqs. 3–4).
- Scale process: σ_{τ,t} = (β_τ/γ_{τ,t}) σ_{τ,t−1}, γ ~ Beta(βn/2, (1−β)n/2) (Eq. 5). Priors: θ_{τ,0}|σ_0 ~ N(m_0, (σ_0/s_0)C_0), σ_0^{−1} ~ Ga(n_0, s_0); m_0 = (0, 1/4,…,1/4)' (equal initial agent weights), C_0 = diag(1000,1,…,1).
- Factor loadings: λ_{iℓj} ~ N(0, φ^{−1} ω^{−1}), ω_{ℓj} = ∏_{h≤ℓ} δ_{hj}, δ_{1j} ~ Ga(2.5,1), δ_{ℓj} ~ Ga(3.5,1) — prior variance shrinks monotonically in ℓ.
- Evaluation: quantile-weighted CRPS_t^{(m)} = ∫_0^1 2(I{y_t < Q̂_t^{(m)}(τ)} − τ)(Q̂_t^{(m)}(τ) − y_t) ν(τ) dτ with ν ∈ {1, τ², (1−τ)²} (none/right/left tail emphasis), trapezoidal rule over τ grid; relative cumulative score RCS_{t*}^{(m)} = Σ CRPS^{(m)} / Σ CRPS^{(benchmark)}.
- Assumptions: agent predictives available as densities (latent draws f ~ N(a,A) from agent predictive mean/variance); DLM discount-factor dynamics for weights; AL error is a *working* likelihood for the quantile (standard Bayesian quantile regression device).

## 5. Dataset / schema
- **US inflation-at-risk:** quarterly CPI inflation y_t = 400·log(Y_t/Y_{t−h})/h, h ∈ {1,4}; 1983Q1–2019Q4. J=4 agent models = dynamic quantile linear models (DQLM1–4) with predictors {lagged inflation, long-term inflation expectations LTE, unemployment gap, import-price inflation} in increasing richness. Agents fit 1983Q1–1997Q4 → forecast 1998Q1; DRQS fit 1998Q1–2013Q1 → evaluated 2014Q2–2019Q4; 19 quantiles.
- **Global growth-at-risk:** N=18 countries (Australia, Canada, Chile, India, Indonesia, Japan, Korea, Mexico, New Zealand, Norway, Peru, Philippines, Singapore, South Africa, Sweden, Switzerland, UK, US); quarterly real GDP growth, 1980Q4–2023Q3. Agents: 3 DQLMs (predictors: lagged growth, inflation, equity prices, exchange rates, short/long rates) + FQBART (factor quantile BART with stochastic volatility). Agents fit 1980Q3–1994Q4 → forecast 1995Q1; (F)DRQS fit 1995Q1–2009Q4 → evaluated 2010Q1–2023Q3; h ∈ {1,4}.
- MCMC: 3000 posterior draws after 1000 burn-in per window per τ; GNU Parallel over τ; δ = β = 0.9 (inflation), 0.85 (GDP); L = 5 factors.

## 6. Features and target
- Target: conditional quantiles (and the implied predictive distribution) of inflation / GDP growth at τ = 0.05…0.95; downstream: tail-risk probabilities ("growth-at-risk").
- Features: the agent models' predictive densities themselves (latent draws f_{tj}); the synthesis regresses the outcome on agent quantile forecasts with time-varying coefficients — no direct macro features enter the synthesis.

## 7. Validation design
- Strictly recursive expanding-window out-of-sample: agents and synthesis both refit each window; evaluation 2014Q2–2019Q4 (inflation, benchmark = DQLM1) and 2010Q1–2023Q3 (GDP, benchmark = FQBART).
- Metric: cumulative quantile-weighted CRPS relative to benchmark (RCS/RTCS < 1 = beats benchmark); three tail weightings; PIT uniformity of the implied predictive distribution (10,000 draws via the semiparametric method of Adrian et al.).
- Baselines: each individual agent (DQLM1–4, FQBART) and univariate DRQS vs FDRQS head-to-head.

## 8. Exact results and baselines with numbers
- **US inflation (RCS vs DQLM1):** DRQS smallest RCS for the "none" and "right" weightings through most of 2014–2019 at h=1; at h=4, DRQS smallest for all three weightings over the second half of the evaluation window. Posterior weights: DQLM2 and DQLM4 positive most of the period; DQLM1/DQLM3 ≈ 0 or negative (corrective). DRQS 95% intervals much wider than agents' (synthesis uncertainty honestly propagated).
- **Global GDP (RTCS vs FQBART=1.0, Table 1):** h=1: FDRQS 0.925, DRQS 1.030, DQLM1 1.034, DQLM2 1.077, DQLM3 1.034. h=4: FDRQS 0.757, DRQS 0.897, DQLM1 0.796, DQLM2 0.870, DQLM3 0.798. FDRQS wins outright at both horizons; FQBART "profoundly" underperforms at h=4.
- Country-level (h=1, RCS vs FQBART): FDRQS smallest for most countries, e.g., Indonesia 0.789, Korea 0.777, South Africa 0.897, US 0.999 (vs DRQS 1.156, DQLM1 1.230); only New Zealand (1.068) and Canada (0.990) are near/above 1.0.
- **COVID stress test:** all models' CRPS deteriorated in 2020; FDRQS kept the smallest RTCS after 2020 at both horizons while univariate DRQS and DQLMs "suddenly incurred larger RCS" — the factor structure's resilience is the paper's headline empirical finding.
- **Calibration (PIT, Fig. 14):** empirical PIT CDFs of FDRQS, DRQS, DQLM1 track the 45° line at both horizons; FQBART deviates strongly at h=4 (systematically miscalibrated).
- **Weight dynamics:** US τ=0.1: DQLM2 positive throughout (credible intervals exclude zero in 2000s–2010s), DQLM3 credibly negative (acts as a hedge); Japan τ=0.9: credible intervals widen post-2020 and FQBART's weight pivots positive to navigate the recovery. Latent-predictor posteriors deviate from priors only in crises (2009, 2020); posterior correlations among agents emerge only under extreme stress (2020Q3).

## 9. Code / data availability
- No public code for DRQS/FDRQS stated in the paper. Agent code: FQBART fit with the authors' R code at https://github.com/mpfarrho/qf-bart. Data: US CPI / macro series (public, FRED-equivalent), 18-country GDP panel compiled by cited source [27] (not redistributed).

## 10. Leakage and limitations
- No leakage: fully recursive expanding windows, agents and synthesis never see the evaluation outcome. But agents are all DQLM-family (3 of 4) — low agent diversity flatters the synthesis vs a genuinely heterogeneous pool.
- MCMC cost: 3000+1000 draws × 19 quantiles × every window — the authors needed GNU Parallel; infeasible for GSE's weekly cadence as-is.
- AL working likelihood: the posterior is a quasi-posterior; credible intervals inherit the misspecification (the paper's own Fig. 2 shows DRQS intervals "much wider" — honest but possibly over-conservative).
- Factor structure is on weights, not on outcomes; cross-series correlation in predictive draws is "mild" and "sporadic" (authors' words).
- MGP shrinkage + L=5 is fixed, not selected; discount factors (0.85/0.9) hand-tuned for "quick adaptation."
- Proven on smooth macro series; sports outcomes are noisier with harder structural breaks (injuries) — the random-walk weight dynamics may adapt too slowly without a lower discount.

## 11. GSE overlap
- Round-1 ensembles covered BPS only in the form of "Bayesian Predictive Synthesis with Outcome-Dependent Pools" (1803.01984, density synthesis for means) — nothing in the corpus does BPS for *quantiles* with time-varying weights, and nothing does the multivariate factor-on-weights extension. The existing-research map shows no BPS implementation in the GSE codebase.
- Direct GSE mapping: agents = GSE's projection models (+ market-implied distributions); series = games/teams/players in a slate; the factor structure lets one slate's weight dynamics inform another's (e.g., "model A is currently overconfident on road favorites" learned across all Sunday games). The COVID-resilience result is the analog of GSE's regime changes (key injuries, weather).

## 12. Implementation specification
- Build **GSE-QSynth**: per market (spread/total/prop), J agent quantile curves (GSE models + market-implied quantiles); DRQS-style synthesis y = F'θ with AL(τ,σ) working likelihood, θ random-walk with discount δ ≈ 0.8 (faster than the paper's 0.9 — sports break harder), per-τ fit on a 9-point grid; FDRQS factor structure across same-slate games (L=3 factors) to share "which model is hot" information.
- **Replace MCMC with a fast sequential filter:** Laplace-approximated or variational update of (θ,σ) per week (the AL mixture representation makes an EM/FFBS-lite feasible); full Gibbs only for monthly recalibration. Target: weights refresh in minutes, not hours.
- Inputs: agent predictive quantiles per game (already in the picks table lineage) + graded outcomes. Outputs: synthesized quantile curve → fair probabilities at the posted line; posterior weight paths logged for audit (which model drove each pick).
- Effort: ~3–4 weeks (filter engineering + backtest harness); the math is fully specified in the paper.

## 13. Reproducible test
- Dataset: 2023–2024 NFL regular seasons, spread market: ≥3 GSE model predictive distributions per game + market-implied quantiles (from Pinnacle-style lines), graded ATS outcomes (~540 games).
- Baseline 1: simple average of agent quantiles. Baseline 2: univariate DRQS-lite per game (no factor). Baseline 3: EWA on quantile loss.
- Candidate: FDRQS-lite with L=3 cross-game factors, δ=0.8, 9-quantile grid.
- Metric: quantile-weighted CRPS (none/right/left) relative to the best single agent, walk-forward weekly; PIT uniformity of synthesized distributions.

## 14. Numeric acceptance / rejection gate + improvement experiment
- **Gate (ADAPT accepted):** walk-forward cumulative CRPS ("none") ≥ 4% lower than the best single agent AND ≥ 2% lower than univariate DRQS-lite (proving the factor structure adds value), with left-tail CRPS no worse than the best agent (tail risk is the product); PIT Kolmogorov–Smirnov distance ≤ 0.05. Else REJECT. Hard fail: if the variational filter's weights diverge from a monthly Gibbs reference (mean |Δθ| > 0.15), reject the fast implementation and keep only the monthly version.
- **Improvement experiment:** add an *outcome-dependent pool* (the 1803.01984 idea from round 1) into the synthesis: let the AL scale σ_{τ,t} depend on a game-context vector (injury flag, weather, rest days) via a log-linear model, so the synthesis widens/narrows intervals by context, not just by time. Test whether context-dependent σ beats the paper's pure time-varying σ on left/right-tail CRPS. If it wins, GSE-QSynth v2 conditions synthesis uncertainty on game context.

**Verdict:** ADAPT
