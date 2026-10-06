# [1671] Modelling uncertainty in financial tail risk: a forecast combination and weighted quantile approach (arXiv:2104.04918v2)

## 1. Citation and full-text verification

**Citation:** Giuseppe Storti, Chao Wang (2021). *Modelling uncertainty in financial tail risk: a forecast combination and weighted quantile approach*. arXiv:2104.04918v2. URL: https://arxiv.org/abs/2104.04918v2
**Ledger completed:** 2026-09-21. **Read:** full text via ar5iv HTML (https://ar5iv.labs.arxiv.org/html/2104.04918) — abstract, sections 1 (Introduction), 2 (strictly consistent VaR/ES scoring functions), 3 (proposed FC-WQ framework: weighted-quantile background, two-step procedure, estimation, Algorithm 1), 4 (model universe: 8 models), 5 (empirical study: data/design, VaR evaluation Tables 1–3 + Fig. 1, ES evaluation Tables 4–5 + Figs. 2–3), 6 (Conclusion), references. Read all ~1,592 extracted lines in full.
**Verdict:** ADAPT — the two-step "combine VaR models separately at each quantile level via quantile loss, then Beta-weight the combined quantiles into a tail-risk measure via a strictly consistent joint loss" is directly portable to GSE's margin-of-victory/total quantile combination and tail-probability products, but it needs adaptation: the ES/Beta-weight machinery is finance-specific and must be re-expressed for sports tail quantities (blowout probability, expected margin conditional on cover).

## 2. Research question
How to reduce model uncertainty in tail-risk forecasting (VaR + Expected Shortfall at the Basel 2.5% level) by combining a universe of VaR models at a grid of quantile levels, then converting the combined quantiles into an ES forecast with a data-driven weighting scheme — and whether this two-step forecast-combination + weighted-quantile (FC-WQ) framework beats individual models, simple averaging, and single-model weighted quantiles out of sample, including through the 2008 crisis.

## 3. Method / model
- **Step 1 (per-level quantile combination):** for each quantile level α_j on a grid α_1=0.005 < … < α_M=0.025 (M=3 or 5), combine n_mod=8 models' VaR forecasts as Q̂_t^{(C,α_j)} = c_{0,j} + Σ_i c_{i,j} Q̂_{t,i}^{(α_j)} (Eq. 10). Weights ĉ_{j,N+h} estimated per level by minimizing the rolling-window quantile loss (Eqs. 12–13, Giacomini-Komonjer style); Chernozhukov et al. (2010) monotonization prevents quantile crossing.
- **Step 2 (weighted quantile → ES):** EŜ_t^{(FC-WQ)} = w_0 + Σ_{j=1}^M w_j Q̂_t^{(C,α_j)} (Eq. 11), with w_j = Beta(j/M; a, b) density weights (Eq. 8, parsimonious 2-parameter shape) and intercept w_0 absorbing left-truncation bias. (w_0, a, b) estimated by minimizing the Fissler–Ziegel strictly consistent joint VaR–ES log-score (AL log-score, Eqs. 15–16) via Matlab fminunc.
- Key design insight: model uncertainty lives in Step 1 (different models optimal at different quantile levels — each level gets its own weights/structure); Step 2 follows from the mathematical definition of ES as a tail-quantile average, so the combined ES is "purged of model uncertainty."
- Baselines compared: each of the 8 universe models, ES-CAViaR (Add/Mult), single-model WQ (CAViaR-AS-WQ-3/5), simple averages of combined quantiles (FC-SA-3/5) and of CAViaR quantiles (CAViaR-AS-SA-3/5).

## 4. Mathematics / equations / assumptions
- VaR: Q_t = F_t^{−1}(α); ES_t = E[r_t | r_t ≤ Q_t] (target α = 2.5%).
- Strictly consistent joint score (Fissler–Ziegel / Taylor 2019 AL log-score): S_t = −log((α−1)/EŜ_t) − (r_t − Q̂_t^{(C,α)})(α − I(r_t ≤ Q̂_t^{(C,α)})))/(α EŜ_t); jointly minimized at the true (VaR, ES).
- Quantile combination loss (Step 1): QL̄_{t,N}(α_j, c) = (1/N) Σ_{k=1}^N (α_j − I_{t−k,j})(r_{t−k} − X̂_{t−k}c), X̂ = [1, Q̂^{(U,α_j)}].
- Beta weight function: w(x;a,b) = x^{a−1}(1−x)^{b−1} Γ(a+b)/(Γ(a)Γ(b)); M+1 grid points used so the α_M-quantile weight is not 0 by construction.
- Assumptions: F_t strictly increasing/continuous; rolling window N fixed; no parametric assumption on the return distribution for the combination steps (semi-parametric throughout); nonlinear combinations noted as possible but not investigated.

## 5. Dataset / schema
- Daily OHLC from Thomson Reuters Tick History, 2000–2015; returns from closes. Six indices: S&P 500, Hang Seng, FTSE 100, DAX, SMI, ASX 200.
- Rolling fixed in-sample window N ≈ 1871–1943 (varies by market calendar); out-of-sample H = 2000 days starting January 2008 (deliberately includes the GFC), ending ~end-2015. One-step-ahead daily VaR (grid of levels) + ES (2.5%) forecasts.

## 6. Features and target
- Target: 1-day-ahead 2.5% VaR and 2.5% ES of index returns.
- Features: the 8 models' VaR forecast series (the meta-learner sees only model outputs + realized returns, as in §3.3's Q̂^{(U)} universe matrix of size T × (M·n_mod)).

## 7. Validation design
- Rolling-window out-of-sample (H=2000 per market); metrics: VaR violation rate VRate (Eq. 22) and VRate/α MAD across markets; aggregated out-of-sample quantile loss (Eq. 23); Patton et al. (2019) MZ VaR calibration test (OLS, Newey–West 20 lags, 10% level); joint VaR–ES AL log-score S = Σ S_t (Eq. 6); Patton et al. ES regression calibration test.
- Baselines: all 8 universe models + ES-CAViaR-Add/Mult-AS + CAViaR-AS-WQ-3/5 + FC-SA-3/5 + CAViaR-AS-SA-3/5.

## 8. Exact results and baselines with numbers
- **VaR 2.5% violation (VRate/α, target 1.0; MAD across 6 markets, Table 1):** FC-WQ 0.0028 (best), CARE-AS 0.0031, EGARCH-t-HS 0.0035, CAViaR-AS 0.0038, POT-EGARCH-t 0.0038, GJR-GARCH-t 0.0128 (worst). Per-market FC-WQ VRate/α: S&P 1.04, Hang Seng 0.98, FTSE 1.00, DAX 1.18, SMI 1.32, ASX 0.90.
- **VaR quantile loss (avg, Table 2):** FC-WQ 164.2 (best), POT-EGARCH-t 164.3, EGARCH-t-HS 164.3, CAViaR-AS 164.9, GJR-GARCH-t 166.6 / EGARCH-t 166.4 / CARE-AS 166.6 (worst). S&P 500: FC-WQ 160.7 vs GJR-GARCH-t 162.9.
- **VaR calibration rejections (10%, Table 3):** CAViaR-AS 1 (best), FC-WQ 2, POT-EGARCH-t 2, EGARCH-t-HS 2, CARE-AS 2, GJR-GARCH-t 5, EGARCH-t 5.
- **Joint VaR–ES AL log-score (avg, Table 4):** FC-WQ-3 4257.6 (best), FC-WQ-5 4257.8, FC-SA-5 4265.8, FC-SA-3 4266.5, ES-CAViaR-Mult-AS 4266.5, CAViaR-AS-WQ-3 4269.6, ES-CAViaR-Add-AS 4269.6, POT ≈ 4271–4272, GJR-GARCH-t 4314.8, EGARCH-t 4315.1 (worst). Decomposition of the win: combination beats individuals (FC-SA < CAViaR-AS-SA); Beta weighting beats simple averaging (FC-WQ < FC-SA); combining models beats single-model WQ (FC-WQ < CAViaR-AS-WQ).
- **ES calibration rejections (Table 5):** FC-WQ, FC-SA, CARE-AS least rejected; GJR-GARCH-t and EGARCH-t rejected on all 6 markets — yet FC-WQ includes them in the universe and still wins, evidencing the weighting scheme's robustness.
- **Stability (Figs. 1–3):** FC-WQ's per-step quantile loss and joint loss are visibly more stable and smaller than competitors' through 2009–2012 (post-GFC); M=3 ≈ M=5 (negligible gain from finer grids).

## 9. Code / data availability
- No public code stated (estimation in Matlab fminunc; Patton et al. 2019 test code by its authors). Data: Thomson Reuters Tick History (commercial).

## 10. Leakage and limitations
- No leakage: strictly rolling, one-step-ahead, weights estimated only on data available at each origin. But the in-sample quantile universe Q̂^{(U)} mixes in-sample fits and out-of-sample forecasts in the rolling estimation (Algorithm 1, step 4) — a subtle form of in-sample contamination in the weight-estimation window, standard in this literature but worth noting.
- Linear combination only (Eq. 10); nonlinear schemes explicitly not investigated.
- ES is a finance construct; the Beta(a,b) weighting is tuned for tail-quantile averaging and has no sports analog without re-derivation.
- M=3 grid is coarse by construction (works empirically, but discretization error is absorbed by w_0 rather than eliminated).
- CAViaR/CARE need multi-start optimization (quantile-loss non-convexity) — operational fragility.

## 11. GSE overlap
- Round-1 ensembles covered quantile-adjacent combination (Bernstein OA for electricity demand, probabilistic load pools) but nothing that (a) combines models *separately per quantile level* with level-specific weights, or (b) converts combined quantiles into a tail functional via a strictly consistent joint loss. The existing-research map shows no per-level combination doctrine in GSE.
- Direct GSE mapping: for spread/total markets, GSE models output margin-of-victory quantile curves; Step 1 gives per-level combined quantiles (e.g., the 10% worst-case margin gets different model weights than the median — matches the Fig. 1 finding in ledger 1669 that tail quantiles weight models differently); Step 2's "tail functional of combined quantiles" becomes GSE products like P(blowout | spread), expected margin conditional on cover, or tail-risk-adjusted stake sizing.

## 12. Implementation specification
- Build **GSE-FCWQ**: for each game-market, collect J model quantile forecasts of the margin/total on a grid (e.g., α ∈ {0.05, 0.10, …, 0.50} for spread tails); Step 1: per-level linear combination with intercept, weights fit by rolling 8-week quantile-loss minimization (quantreg-style LP or subgradient); apply Chernozhukov monotonization across levels.
- Step 2 (sports analog of ES): define the tail functional of interest, e.g., expected margin conditional on margin < q_10 (downside tail) or P(margin > 10); estimate its Beta-weight representation on combined quantiles by minimizing the matching strictly consistent loss (Fissler–Ziegel for (quantile, ES) pairs; or a custom consistent loss for P(tail event)).
- Serve weekly; log per-level weights for audit. Effort: ~2 weeks (the LP weight fits are cheap; the work is the quantile-history table from ledger 1669's spec, shared).

## 13. Reproducible test
- Dataset: 2022–2024 NFL spreads: ≥4 GSE model margin-quantile curves per game + graded margins (~800 games).
- Baseline 1: simple average of model quantiles per level → tail functional. Baseline 2: best single model per level. Baseline 3: FC-SA (simple average of combined quantiles).
- Candidate: FC-WQ with M=5 level grid, per-level quantile-loss weights on trailing 8 weeks.
- Metric: out-of-sample quantile loss per level + joint consistent loss for (q_10, tail-expectation); DM tests vs baselines; Patton-style calibration of the tail functional.

## 14. Numeric acceptance / rejection gate + improvement experiment
- **Gate (ADAPT accepted):** walk-forward mean quantile loss ≥ 2% below the simple-average baseline at ≥ 4 of 5 grid levels AND the joint tail-functional loss ≥ 2% below FC-SA, with per-level VRate within [0.7α, 1.3α] (calibration guard); else REJECT. Hard fail: if any level's weights collapse to a single model for >80% of weeks (combination adds nothing), reject.
- **Improvement experiment:** replace the linear Step-1 combiner (Eq. 10) with the paper's own suggested-but-untested nonlinear extension — a small monotone neural net (per level) or gradient-boosted quantile combiner — and test whether nonlinearity beats linear FC-WQ on tail-level (α ≤ 0.10) quantile loss. If nonlinear wins only at tails, deploy a hybrid: linear for central levels, nonlinear for tails.

**Verdict:** ADAPT
