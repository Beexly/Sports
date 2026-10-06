# [0643] Bettors' Reaction to Match Dynamics — Evidence from In-Game Betting (arXiv:2202.10085)

**Citation:** Rouven Michels, Marius Ötting, Roland Langrock (2022). *Bettors' Reaction to Match Dynamics — Evidence from In-Game Betting*. arXiv:2202.10085v2. URL: https://arxiv.org/abs/2202.10085
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/2202.10085.txt`).
**Verdict:** ADAPT — the beta-inflated state-space model with P-spline time-varying coefficients is a transferable framework for modeling NFL in-play handle/line dynamics and bettor overreaction; adapt with NFL-specific event features.

## 1. Research question
Do in-play bettors update their prior beliefs about team strength in response to in-match dynamics (analogous to "technical analysis" in finance), or do they only trade on pre-game strength ("fundamental analysis")? And does the pricing of live odds reflect bettor behavior, or is there an exploitable gap?

## 2. Dataset / schema
- Betting data: in-play stakes on all 306 matches of the 2017/18 German Bundesliga season, provided by a large European bookmaker, at 1 Hz resolution, aggregated to 1-minute intervals. Covers match-outcome bets (home win/away win; draws excluded). Processed into relative stakes on the home team per minute: N = 306 time series × up to 85 minutes = 26,010 observations. Truncated at minute 85 (injury-time stakes sparse). Proprietary bookmaker data — not public.
- Event data: WyScout 1 Hz event data for all 306 matches (shots, passes, duels, set pieces with x/y coordinates), public via Pappalardo et al. 2019 (Scientific Data). VAEP values computed with gradient-boosted trees trained on five seasons + one World Cup + one European Championship.
- Covariates: relativestake (mean 0.493, sd 0.313, min 0, max 1); prewindiff (mean 0.139, sd 0.317, range −0.740–0.851); vaepdiff (mean 0.004, sd 0.161, range −1.091–1.167).

## 3. Method / model
Beta-inflated state-space model (SSM) for relative stakes y_t ∈ [0,1] per match, with latent AR(1) market-sentiment state g_t:
- Observation: y_t ~ BEINF(μ_t, σ, p, q) — beta-inflated distribution (Rigby et al. 2019 parametrisation via mean μ_t and sd σ) to handle y_t = 0 or 1 exactly (all stakes on one team in a minute).
- Baseline mean: μ_t = logit⁻¹(α_0 + α·prewindiff + g_t). (Eq. 1)
- State: g_t = φ g_{t−1} + β·vaepdiff_{t−1} + ω η_t, η_t iid N(0,1), φ ∈ (−1,1). (Eq. 2) — VAEP enters with a lag and persists through φ (accumulates positive spells, "momentum memory").
- Extended model (Eq. 5): μ_t = logit⁻¹(α_0 + Σ_k ν_k^α B_k(t)·prewindiff + ζ_1·scorediff_t + ζ_2·winprobteam_t + g_t), with time-varying coefficients α_t, β_t modeled as P-splines (K=10 cubic B-splines, roughness penalty on second differences of coefficients, λ_α, λ_β chosen by AIC over a 7×7 grid {0.05,0.25,1,5,25,100,500}²).
- Likelihood: non-Gaussian, non-linear SSM evaluated by fine state discretization (Kitagawa 1987) → reformulated as m-state HMM, forward algorithm O(m²T); matches assumed independent.
- Application: one-step-ahead forecasts of relative stakes; simple threshold betting strategy on home team when vaepdiff > threshold for matches tied at halftime.

## 4. Equations & assumptions
- BEINF density: f(y_t) = p if y_t=0; (1−p−q)h(y_t) if 0<y_t<1; q if y_t=1; h beta density; a = μ_t(1−σ²)/σ², b = (1−μ_t)(1−σ²)/σ².
- Markov/factorization assumptions: f(g_t|g_{1: t−1}) = f(g_t|g_{t−1}); f(y_t|g_{1:t}, y_{1:t−1}) = f(y_t|g_t).
- Penalized log-likelihood: ℓ_p = log(ℒ_approx) − λ_α/2 Σ_{k=3}^K (Δ²ν_k^α)² − λ_β/2 Σ_{k=3}^K (Δ²ν_k^β)²; AIC = −2ℓ + 2·df̂, df̂ via trace of Fisher-information product (Gray 1992).
- HMM-approximate likelihood: ℒ_approx = δ P(y_1) Γ⁽¹⁾ P(y_2) … Γ⁽ᵀ⁻¹⁾ P(y_T) 1, cost O(m²T). (Eqs. 6–8)
- VAEP: action value via gradient-boosted trees predicting scoring/conceding probabilities.
- Assumptions: pre-game win probabilities (inverse odds, vig-adjusted) proxy perceived team strength; VAEP diff proxies in-game strength/momentum; bettors act independently so serial correlation in stakes comes from latent market sentiment, not direct stake-to-stake effects; draws excluded; truncation at minute 85.

## 5. Features / target
- Target: y_t = relative stakes on home team in minute t (continuous [0,1]).
- Inputs: prewindiff (static, vig-adjusted pre-game win-prob difference); vaepdiff (lagged, aggregated VAEP difference per minute); scorediff_t (current score difference); winprobteam_t (vig-adjusted live win probability from bookmaker odds).
- Time-varying effects: α_t (pre-game strength), β_t (VAEP/in-game strength).

## 6. Validation design
No holdout prediction test reported; this is explanatory/inferential modeling with model comparison via AIC (not cross-validated): baseline vs no-prewindiff (ΔAIC = 339.17), vs no-vaepdiff (ΔAIC = 522.04), vs time-varying (ΔAIC = 270.62 in favor of varying coefficients). Time-ordered structure used for estimation; one-step-ahead forecasts shown qualitatively on 2 example matches (Fig. 7, 500 simulated observations per time point). Simple betting strategy evaluated in-sample on tied-at-halftime matches (Table 3) — no out-of-sample or train/test split; authors note positive late-match returns rely on few data points.

## 7. Numerical results / baselines
- Baseline SSM: φ̂ = 0.968 [0.964; 0.971] (strong persistence of market sentiment); ω̂ = 0.249 [0.238; 0.261]; σ̂ = 0.300 [0.296; 0.303]; α̂_0 = −0.195 [−0.278; −0.113] (away-team stake bias at equal odds — bettors underestimate home advantage, cf. Levitt 2004); α̂ (prewindiff) = 2.395 [2.151; 2.640]; β̂ (vaepdiff) = 0.600 [0.550; 0.651]. (Table 2)
- Varying-coefficient model: φ̂ = 0.963; ζ̂_1 (scorediff) = 0.234; ζ̂_2 (winprobteam) = 0.336; chosen λ_α = 1, λ_β = 5; K = 10 basis functions. Effect of prewindiff positive throughout, decreasing approximately linearly over time (strongest at kickoff); effect of vaepdiff slightly positive in first half, then rapidly increasing in the second half (bettors overweight late in-game momentum).
- Simple strategy (1€ bets on home team when tied at HT and vaepdiff > threshold), mean returns: threshold >0.02: −0.27 (min 45–60), −0.08 (60–75), −0.01 (75–end); >0.03: −0.20, −0.17, +0.04; >0.05: −0.14, −0.28, +0.32. Majority of settings negative, some substantially below the ~5% vig → momentum overreaction by bettors.
- Case study (HSV vs Werder): live win probabilities derived from bookmaker odds barely respond to VAEP swings — "changes in the win probability are almost exclusively resulting from the time remaining" — bookmakers do not price in-play momentum the way bettors bet it.

## 8. Code / data availability
None stated in paper. WyScout event data public via Pappalardo et al. 2019. Bookmaker stake data proprietary.

## 9. Leakage & limitations
- Descriptive/inferential: no held-out predictive validation; the "strategy" backtest is in-sample with acknowledged small-n cells.
- Proprietary stake data — the exact target (per-minute relative stakes) is not publicly available for any major market; GSE would need to proxy with ticket-split feeds (Unabated/VSiN) or exchange volume (Betfair).
- Soccer-specific: draws excluded, 90-minute continuous clock, low scoring; NFL has discrete plays, frequent commercial breaks, and much faster market pricing. The VAEP construct ports to NFL only via EPA/WPA-style action valuation (exists: nflverse).
- One bookmaker's customers (mostly German) — sentiment patterns may not generalize.
- The latent "market sentiment" is identified only through the model; no independent validation.
- No uncertainty propagation from the VAEP gradient-boosted trees into the SSM.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus has market-efficiency and odds-modeling coverage, and CLV is a standing theme, but I see no in-play bettor-sentiment state-space model, no beta-inflated handle model, and no formal overreaction-to-momentum measurement in the map. This is a new capability: a framework for quantifying how bettors (vs bookmakers) weight pre-game strength vs in-game momentum over time.

## 11. GSE implementation spec
- Data: NFL live odds + (proxy) handle. Handle proxy: Betfair Exchange NFL volume (public via API); or ticket%/handle% feeds (Unabated, VSiN). Event inputs: nflverse play-by-play with EPA/WPA per play → build NFL analogue of VAEP: vaepdiff-like "in-play momentum" = cumulative (EPA_home − EPA_away) per minute (or per drive, better for NFL's discrete structure).
- Model: replicate the BEINF-SSM (Eqs. 1–2, 5) with g_t AR(1) sentiment state; inputs prewindiff (from closing/pre-game vig-adjusted probabilities), in-play EPA-diff, score diff, live win probability (from GSE's own or Betfair's). Time-varying α_t, β_t via P-splines on NFL game time.
- Serving: one-step-ahead forecast of relative handle per team per minute → two uses: (a) detect bookmaker pricing that ignores momentum (paper's Fig. 6 phenomenon) → value detection: when GSE's live probability diverges from market beyond a threshold with sustained momentum, flag as an edge; (b) unusual-behavior detection (observed stakes outside 99% forecast quantile → steam/fraud signal).
- Effort: medium — reimplementable from the paper's appendices (discretization → HMM forward algorithm; R packages: moveHMM/gamlss style or port to Python with numpyro). VAEP analogue from nflverse is straightforward.

## 12. Reproducible test
Dataset: 2024 NFL season, Betfair Exchange NFL in-play volume per minute as relative-volume target (public API), nflverse EPA per play, pre-game vig-adjusted probabilities from the Odds API (existing account per memory: baxley.garrett@gmail.com, 20K credits/month). Metric: AIC improvement of momentum-SSM over momentum-free SSM; plus the paper's strategy test adapted: when cumulative EPA-diff exceeds a threshold in a tied/second-half game, bet the trailing-by-momentum team only if market live probability differs from GSE's EPA-based probability by >x pp. Baseline: closing-line / live-odds-implied probabilities.

## 13. Acceptance / rejection gate
ADAPT if, on a full NFL season (2024) holdout: (a) the momentum-SSM beats the no-momentum SSM by ΔAIC-equivalent per-game log-likelihood improvement with the β_t second-half effect replicating the paper's shape (vaepdiff coefficient rising in the second half), AND (b) the momentum-divergence rule produces positive CLV (average absolute live-odds error vs GSE probability shrinks when conditioning on divergence flags), or (c) it yields a one-step-ahead relative-volume forecast with ≥15% RMSE improvement over a naive AR(1) baseline — whichever sub-test runs first on available data. REJECT if none of (a)–(c) holds on 2024 data.

## 14. Improvement experiment
NFL has discrete plays with natural state (down/distance/field position), unlike soccer's continuous clock — build the momentum term on per-drive EPA instead of per-minute: g_t per drive with drive-index time-varying coefficients. Test whether a "drive-level momentum" SSM predicts Betfair volume and flags mispricing better than the minute-level port. Also: add weather/pace controls as extra state covariates — the paper's framework accepts them trivially.
