# [0016] Betting Against Integrity: Identifying Match-Fixing Through In-Play Market Dynamics (arXiv:2605.30209)

**Citation:** David Winkelmann, Maya Vienken, Christian Deutscher, Roland Langrock (2026). *Betting Against Integrity: Identifying Match-Fixing Through In-Play Market Dynamics*. arXiv:2605.30209. URL: https://arxiv.org/abs/2605.30209 (funding: German Research Foundation, Grant 431536450)
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv HTML v1), all 757 lines — §1 intro, §2 literature (market efficiency, live betting, fraud detection), §3 data (Serie B live stakes, variables, Table 1), §4 model (SSM hurdle framework, baseline, covariate models, Tables 2–4), §5 conclusion, data availability, AI-usage/funding statements, references.
**Verdict:** ADAPT — the paper builds only the foundation (a state-space expected-volume model of live betting activity) and explicitly defers the actual fraud detection to future work ("In a remaining step, we will conduct outlier analysis and cluster suspicious observations"). The SSM-for-market-dynamics machinery is directly relevant to GSE's thin "market microstructure/live betting" lane, but the data are proprietary (Tipico) and the anomaly-detection application is undone.

## 1. Research question
Can high-frequency live-betting stake dynamics be modeled precisely enough that deviations between model-implied and empirical stakes flag potentially fraudulent matches? Concretely: fit a state-space model of expected per-minute betting volume for Serie B matches, as the basis for later outlier detection.

## 2. Dataset / schema
Proprietary live betting records from bookmaker Tipico: three Serie B seasons (2018/19–2020/21), 1,097 matches (4 excluded for missing data, 1 fog-interrupted), 32 teams, 1 Hz raw aggregated to 1-minute intervals; injury time after the second half excluded. Mirrored home/away → 235,882 team-minute observations; 9.8% market-closed, 9.4% zero stakes despite open market. Variables: stake_team (median 0.32, mean 1.12, max 257.03, scaled by a fixed constant), stake_avg_team, improbteam_start (mean 0.35, home 42.15% / away 28.46%), redcard_team/redcard_opponent (231 red cards), scorediff_team, xg_diff (fbref expected goals, max 4.78), Gini over three outcome probabilities, minute, halftime. Stakes right-skewed → modeled on log scale. Raw data proprietary; confidentiality scaling applied.

## 3. Method / model
Hurdle state-space model: Pr(y_t=0) = π_t (π_t=1 when market closed); log(y_t)|y_t>0 ~ N(μ_t, σ); μ_t = ν_t + s_t with linear predictor ν_t = x_t^{(1)'}β; latent market-activity s_t an ARX(1): s_t = φs_{t−1} + x_t^{(2)'}ω + σ_s ε_t, |φ|<1. Exact likelihood intractable → Kitagawa-style fine discretization of the state space (~m=100 intervals) approximates the SSM as a large HMM; likelihood evaluated via the forward algorithm, L_T(Θ) ≈ δP(y_1)ΓP(y_2)…ΓP(y_T)1; maximized in Python via BFGS. Matches × teams treated as independent time series. Covariate models: (a) baseline (no covariates); (b) covariates in the state-dependent process (μ_t with avg stakes, pre-match prob, red cards, score diff, minute quadratic, halftime; π_t via logit on Gini, Gini², minute and interactions); (c) full model adding covariates in the state process (goal surprise tiers × 1/minutes-since-goal, xg_diff, halftime).

## 4. Equations & assumptions
Pr(y_t=0)=π_t; log(y_t)|y_t>0 ~ N(μ_t,σ); μ_t = ν_t + s_t; s_t = φs_{t−1} + x_t^{(2)'}ω + σ_s ε_t; likelihood (1) integral form and (2) discretized HMM approximation; matrix-product forward form. μ_t linear predictor: β₀ + β₁avg_stakes_team + β₂improbteam_start + β₃redcard_team_t + β₄redcard_opponent_t + β₅scorediff_team_t + β₆minute_t + β₇minute_t² + β₈halftime_t + s_t. π_t = logit⁻¹(α₀ + α₁gini_t + α₂gini_t² + α₃minute_t + α₄minute_t·gini_t + α₅minute_t·gini_t²). State process: s_t = φs_{t−1} + Σ_w ω_w I_w/goal_team_t^{(w)} + ω₄xg_diff + ω₅halftime + σ_s ε_t. Surprise tiers: surprising = goal by team with pre-match win prob ≤0.25; slightly surprising 0.25–0.5; unsurprising >0.5 (Ötting et al. 2024). Assumptions: independence across matches/teams; latent AR(1) captures market excitement; stakes log-normal conditional on positivity; no draws modeled (>80% of stakes on home/away, draws "less prone to fraud").

## 5. Features / target
Inputs: pre-match (team avg stakes, implied win prob) + in-play (red cards, score diff, xG diff, Gini, minute, halftime, goal-surprise indicators). Target: expected per-minute stake volume (log stakes + zero mass) — the model predicts volume, not match outcomes.

## 6. Validation design
AIC comparison of nested models (baseline vs covariate models); 95% CIs on all parameters; descriptive alignment with Bundesliga literature (Michels et al. 2023; Ötting et al. 2024). No holdout validation, no predictive scoring on unseen matches, and — critically — no outlier-detection evaluation at all: the fraud-detection step is explicitly future work.

## 7. Numerical results / baselines
- Baseline: φ̂=0.986 [0.986;0.986], σ̂_s=0.215 [0.212;0.217], β̂₀=−0.783, σ̂=0.924 [0.921;0.928], π̂=0.094 [0.092;0.095] (matches empirical 0.094). ΔAIC = 160,747 vs hurdle model without state process — overwhelming support for latent dynamics.
- Full model (Table 4): φ̂=0.983 [0.982;0.984], σ̂_s=0.196; β̂₁(avg stakes)=0.235, β̂₂(pre-match prob)=3.493 [3.376;3.611], β̂₃(own red card)=−0.414, β̂₄(opponent red card)=1.075 [1.004;1.146], β̂₅(score diff)=0.420 [0.396;0.443], β̂₆(minute)=0.040, β̂₇(minute²)=0.025, β̂₈(halftime)=0.210 (≈23.7% elevated halftime stakes); state process: surprising goal ω̂₁=0.285 [0.257;0.313], slightly surprising ω̂₂=−0.027 [−0.043;−0.011], unsurprising ω̂₃=−0.379 [−0.408;−0.349]; xg_diff ω̂₄=0.001 [−0.001;0.002] (not significant — differs from Bundesliga); halftime ω̂₅=0.005 [0.002;0.008].
- Descriptive: stakes peak in first 10 minutes, rise at halftime and late second half; favorites attract 1.98 avg stakes vs 1.34 for underdogs; zero-stake minutes correlate with Gini (0.41) and minute (0.23).
- No detection-rate, precision/recall, or flagged-match results reported — the paper produces none.

## 8. Code / data availability
Raw data proprietary (Tipico, confidentiality agreements); only "processed and analysed datasets derived from raw data" mentioned, not released. No code released. ChatGPT-5 used for language polishing (disclosed).

## 9. Leakage & limitations
Minute-level stakes aggregated to reduce volatility (some information loss); injury time excluded; market-closed coding (open=1 iff all three outcomes bettable); draw stakes ignored; second-half stoppage excluded to avoid extreme Gini values. No held-out evaluation; no actual anomaly detection performed; Tipico-only data (single bookmaker); draws excluded on a "less prone to fraud" assumption that is asserted, not tested. The conclusion is aspirational, not demonstrated.

## 10. GSE overlap
Fills a thin lane, doesn't duplicate. The existing-research map explicitly lists "market microstructure/live betting" as thin, and "market-relative learning" as covered only at the pre-game level. This paper's expected-volume SSM is the closest existing art to a live-betting dynamics model in the corpus. GSE has no live-market model; the paper's covariate set (implied probs, surprise tiers, score diff) maps directly onto NFL live-win-probability feeds.

## 11. GSE implementation spec
ADAPT: reimplement the hurdle-ARX(1) SSM on public NFL live data (The Odds API in-game odds; public volume proxies if available — note true stake volume is the missing ingredient; odds-movement volatility can substitute as the observed process). Per-game × team time series of odds-implied probabilities/volume at 1-minute resolution; covariates: pre-game spread/total implied probs, score diff, time remaining, timeouts, key events. Use the fitted expected-volume/expected-move model as the baseline against which suspicious or exploitable deviations are measured — for GSE, the application is edge detection (steam moves, stale lines) rather than fraud. Effort: 1–2 weeks for a first NFL live-model prototype given public odds data; the BFGS/HMM-discretization recipe is fully specified.

## 12. Reproducible test
Port to NFL: fit the baseline hurdle SSM on one season of live odds-movement data; require ΔAIC ≥ 10⁴ over the no-state hurdle before proceeding (the paper's own bar is 160,747). Then the test the paper didn't run: define standardized residuals of observed vs expected activity, flag top-1% minute-game cells, and check whether flagged cells cluster before line moves that the pre-game model missed — i.e., whether the residuals have predictive value for closing-line movement. Adopt only if flagged residuals predict line moves above chance.

## 13. Acceptance / rejection gate
ADAPT conditional on §12: the modeling framework is worth porting, but only to public NFL live data and only with the residual-predictive-value gate. Do not pursue soccer replication (data proprietary, detection undone).

## 14. Improvement experiment
The paper's missing experiment is the obvious one: actually run the outlier analysis — fit the full model, compute minute-level predictive residuals, cluster them, and validate flagged periods against known fixed matches (the Ötting et al. 2018 pre-game approach did this successfully on pre-game Serie B data). For GSE, the improvement is to swap the detection target from fraud to market edge: residuals that predict line movement become a live-betting signal, which is strictly more valuable to the engine than the paper's integrity application.
