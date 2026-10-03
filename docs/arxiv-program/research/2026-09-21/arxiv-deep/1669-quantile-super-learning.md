# [1669] Quantile Super Learning for independent and online settings with application to solar power forecasting (arXiv:2310.19343v1)

## 1. Citation and full-text verification

**Citation:** Herbert Susmann, Antoine Chambaz (2023). *Quantile Super Learning for independent and online settings with application to solar power forecasting*. arXiv:2310.19343v1. URL: https://arxiv.org/abs/2310.19343v1
**Ledger completed:** 2026-09-21. **Read:** full text via ar5iv HTML (https://ar5iv.labs.arxiv.org/html/2310.19343) — abstract, sections 1 (Introduction), 2 (Independent setting: super learner, oracle inequalities), 3 (Sequential setting: super learner, oracle inequalities), 4 (Simulation studies, Tables 1–5), 5 (Case studies: perovskite + solar irradiance, Tables 6–9, Figure 1), 6 (Discussion), references, Appendix A (theoretical background + full proofs, eqs. 37–65). Read all ~2,707 extracted lines; skimmed only the measure-theoretic proof details in the appendix after verifying theorem statements.
**Verdict:** ADAPT — the quantile Super Learner (discrete + continuous, i.i.d. + online) is a principled, theoretically grounded way to combine GSE's quantile/projection models, but it needs adaptation: it is proven for continuous conditional quantiles under boundedness/stationarity assumptions, while GSE needs it on discrete outcome grids and nonstationary sports data (rolling windows, no stationarity guarantee).

## 2. Research question
How to estimate conditional quantiles (and, from them, prediction intervals) by ensembling multiple candidate quantile algorithms without knowing a priori which is best — with finite-sample oracle guarantees, in both i.i.d. and sequential/online settings. The authors extend Super Learning (van der Laan et al.) from mean/squared-error to the quantile loss, proving the data-driven selector/combiner is asymptotically as good as the oracle-best candidate, and test it on simulations plus two solar-energy case studies.

## 3. Method / model
- **Discrete QSL (i.i.d.):** K candidate quantile algorithms ψ̂_1^α…ψ̂_K^α; pick κ̂_n = argmin_k of the V-fold cross-validated empirical quantile risk R̂_n^α. Output ψ̂_{κ̂_n}^α.
- **Continuous QSL (i.i.d.):** richer library of convex combinations ψ̂_π^α = Σ_k π_k ψ̂_k^α over the K-simplex, restricted to a finite grid Π_n whose cardinality grows at most polynomially in n; π̂_n = argmin_{π∈Π_n} R̂_n^α(ψ̂_π^α). (Continuous = discrete on the expanded library, so theory carries over.)
- **Online QSL (sequential):** at each time t, train each candidate on all data before t, score on the new batch; select κ̂_t = argmin_k of the running empirical risk R̂_t^α (Eq. 25–27); continuous version optimizes weights in hindsight (Eq. 28). Multi-location batches (index set J) supported; reduces to single time series when |J|=1.
- Candidate library used: distributional/quantile random forests (DRF, grf), GBM (lightgbm), quantile GAMs (qgam), quantile regression neural nets (qrnn), plain quantile regression (quantreg).
- Compared against EWA (exponentially weighted average) and BOA (Bernstein online aggregation) from the opera R package.

## 4. Mathematics / equations / assumptions
- Quantile loss: L^α(ψ)(x,y) = α|y−ψ(x)| if y>ψ(x), else (1−α)|y−ψ(x)|. Risk R_P^α(ψ) = E_P[L^α(ψ)]; true conditional quantile minimizes it (Eqs. 1–6).
- Oracle CV risk R̃_{n,P}^α(ψ̂_k^α) = E_{B_n}[P L^α(ψ̂_k^α(P_{n,B_n}^0))] (Eq. 7); empirical version substitutes the test fold P_{n,B_n}^1 (Eq. 8).
- **Theorem 1 (i.i.d. oracle inequality):** if K = O(n^a) and all candidates output uniformly bounded functions, then E[R̃_{n,P0}^α(ψ̂_{κ̂_n}^α) − R̃(oracle-true)] ≤ E[R̃(oracle-selector) − R̃(oracle-true)] + O(log n / √n). Price of not knowing the best candidate is only log n/√n.
- **Theorem 2 (online oracle inequality):** same setup with batch risk R̄^α; excess risk ≤ oracle excess risk + O(log log t / √t) for t large enough; more locations |J| → inequality kicks in sooner.
- Assumptions i.i.d.: A1 unique quantiles a.s.; A2 outcomes bounded |Y| ≤ C0 < ∞ (C0 need not be known). Online adds B1 common covariate support across locations/time, B2 unique quantiles, B3 boundedness, B4 Markov (all info about Y_{j,τ} in past obs + current X_{j,τ}), B5 stationarity (same quantile functional across j,τ), B6 regularity: conditional laws have α-quantiles of p-average type q (Steinwart & Christmann margin condition — density near the quantile bounded below by b_Q s^{q−1}) with uniform bound Γ.
- Prediction intervals: estimate lower/upper quantiles separately; **no finite-sample coverage guarantee** is claimed for the resulting intervals (stated explicitly; investigated only empirically).

## 5. Dataset / schema
- **Simulation (i.i.d.):** N1 ∈ {250, 500, 1000} training draws + N2 = 1000 validation draws; X = 5 covariates i.i.d. Uniform[0,1]; Y = sin(2X1) + |X2| − 0.5 X1 X3 + ⌊X4⌋ + ε, ε ~ N(0, 0.1); 50 replications per N1; quantiles α ∈ {0.025, 0.05, 0.1, 0.5, 0.9, 0.95, 0.975}.
- **Simulation (online):** same DGP with AR(1) errors ε_t, ρ ∈ {0, 0.5, 0.9, 0.99}, T = 2000; candidates fit once on t = 1…1000 (to save compute), evaluated on t = 1001…2000.
- **Case study 1 (perovskite, i.i.d.):** 1,453 perovskite compounds (Materials Project via Chenebuah et al. 2021); targets = DFT formation energy and energy bandgap; 56 covariates (element-based, stability, crystallographic; 2 dropped for collinearity).
- **Case study 2 (solar GHI, online):** 7 US locations (BON, DRA, FPK, GWN, PSU, SXF, TBL); target = satellite-measured global horizontal irradiance at 13:00 local time, 1-day-ahead; 2017–2019 as burn-in training, online from 2020-01-01; covariates = 50 ECMWF NWP ensemble members + solar zenith angle + lagged GHI.

## 6. Features and target
- Target: conditional α-quantile of a univariate outcome (continuous). Secondary target: (1−β) prediction intervals from paired quantile estimates.
- Features: whatever covariates each candidate uses (the QSL itself takes only candidate predictions + outcomes as inputs — it is a meta-learner over algorithms, not over features).

## 7. Validation design
- i.i.d.: V-fold CV inside QSL; final evaluation on a held-out 1000-obs validation set via empirical quantile risk (Eq. 31) and interval coverage (Eq. 32), averaged over 50 replications.
- Online: walk-forward — candidates trained on data before t, scored on batch t; empirical risk Eq. 35, coverage Eq. 36, over t = T/2+1…T.
- Baselines: each individual candidate (GRF/DRF, GBM, QGAM, QRNN, QReg); online also EWA and BOA from the opera package with adaptive learning rates.
- Case studies: cross-validated quantile risk (perovskite); walk-forward empirical risk + coverage at final time T (GHI).

## 8. Exact results and baselines with numbers
- **i.i.d. sim (Table 2):** QSL best or tied-best quantile risk for ALL quantiles × sample sizes. N1=1000, α=0.5: QSL 0.092 vs GBM 0.092, GRF 0.20, QGAM 0.27, QRNN 0.31, QReg 0.40. N1=250, α=0.025: QSL 0.033 vs QGAM 0.034, GBM 0.060. Coverage (Table 3, N1=1000): QSL 73.0%/89.7%/97.4% at nominal 80/90/95% — undercovers at 80%, closest at 95%.
- **Online sim (Table 4):** QSL slightly better than EWA/BOA at most quantiles: ρ=0, α=0.5: QSL 0.27 vs EWA 0.29 vs BOA 0.30; ρ=0.9, α=0.5: QSL 0.34 vs EWA 0.36 vs BOA 0.38; at ρ=0.99 all ~equal (0.56–0.61). Intervals (Table 5) undercover for all methods (e.g., ρ=0, nominal 80%: QSL 70.9%).
- **Perovskite (Table 6, formation energy):** QSL lowest CV quantile risk at all 7 quantiles: α=0.5: QSL 0.065 vs GBM 0.078, QRNN 0.079, QReg 0.094. Bandgap: QSL lowest/tied at 6/7 (α=0.5: QSL 0.30 vs GBM 0.30, QGAM 0.39). Coverage (Table 7): QSL 90% and 95% intervals closest to nominal for both targets; 80% intervals undercover (formation energy: QSL 79.9% vs GRF 94.6% — here QSL notably better calibrated).
- **GHI (Table 8):** QSL lowest empirical risk in most location×quantile cells except α=0.5 where EWA/BOA tie or edge it (e.g., BON α=0.5: BOA 31.2, QSL 31.3, EWA 31.4; BON α=0.9: QSL 14.8 vs BOA 15.2 vs EWA 15.1). Coverage (Table 9): all near nominal; QSL best/tied at 5/7 locations for interval coverage (e.g., TBL 95% nominal: BOA 95.6%, EWA 92.6%, QSL 92.6%).
- **Weight inspection (Fig. 1):** no single candidate dominates; GBM gets higher weight for tail quantiles (10%/90%) than for the median; weights vary by location — the ensemble genuinely adapts.

## 9. Code / data availability
- Code: https://github.com/herbps10/QuantileSuperLearner (simulations + case studies; R).
- QSL implemented in the sl3 R package (i.i.d.) and added by the authors to the opera R package (online, alongside EWA/BOA).
- Data: perovskite data from Chenebuah et al. 2021 / Materials Project (public); GHI case-study dataset released by Wang et al. 2022, ECMWF forecasts + NSRDB satellite measurements (public).

## 10. Leakage and limitations
- Online simulation refit candidates only once (t ≤ 1000) rather than truly refitting each step — understates adaptivity and may flatter the meta-learner.
- Prediction intervals built from separate quantile estimates have **no coverage guarantee**; simulations show systematic undercoverage (70–73% at nominal 80% in the online sim).
- Theorem 2 needs stationarity (B5) — the same quantile functional across all time/locations; sports data (injuries, trades, scheme changes) violate this; no structural-break analysis.
- Bounded-outcome assumption (A2/B3) is fine for scores but the margin condition (B6) is unverifiable in practice.
- Continuous QSL optimizes over a finite grid Π_n, not the true simplex — grid coarseness is an unexamined tuning choice.
- GHI case study: candidates include the 50 raw NWP members as features, so part of the gain is post-processing, not pure combination.

## 11. GSE overlap
- Nothing in the corpus covers quantile-loss-based super learning: round-1 ensembles covered density combination (linear/angular pools, BPS), EWA-style weight optimization, and Bernstein OA for means, but not a discrete/continuous Super Learner targeting conditional quantiles with oracle inequalities, and not an online multi-location (multi-game) formulation. The existing-research map shows no quantile-combination doctrine in the GSE codebase.
- Direct GSE relevance: GSE's prop/fantasy outputs are naturally quantile objects (e.g., "P(Yards > 82.5)"), and combining multiple projection systems' quantile curves is exactly QSL's job. The online formulation maps to weekly model-weight updates; the multi-location (|J|) structure maps to many simultaneous games.

## 12. Implementation specification
- Build a **Quantile Super Learner for GSE prop distributions**: for each prop market, collect K candidate quantile curves (per-α predictions from GSE's projection models + market-implied quantiles inverted from lines); select/combine via rolling-window cross-validated quantile loss (walk-forward, refit weekly).
- Use the **continuous** variant (convex weights on a simplex grid) for stability; constrain weights ≥ 0, Σ = 1. Optimize weights with a simple projected-subgradient or grid+local search on the trailing 6–8 weeks of resolved props.
- Output: combined quantile function per player-prop; derive fair probabilities P(over) by interpolating the combined quantile curve at the posted line.
- Data: GSE engine picks table (model probabilities per game) + a new per-prop quantile history table; outcomes from graded props.
- Effort: ~1–2 weeks (meta-learner is ~200 lines; the work is the quantile-history plumbing).

## 13. Reproducible test
- Dataset: 2024 NFL season player-prop quantiles from ≥3 GSE projection sources (or reconstructed: model point projections ± historical error quantiles), paired with posted lines and graded outcomes (≥500 resolved props).
- Baseline 1: single best candidate by trailing quantile loss. Baseline 2: simple average of candidate quantiles. Baseline 3: EWA-weighted quantiles (opera-style).
- Candidate: continuous QSL weights fit on trailing 8-week walk-forward windows.
- Metric: mean quantile loss at the line-implied α per prop + Brier/log-loss of derived over-probabilities; Diebold-Mariano vs baselines.

## 14. Numeric acceptance / rejection gate + improvement experiment
- **Gate (ADAPT accepted):** walk-forward mean quantile loss ≥ 3% lower (relative) than the simple-average baseline AND ≥ 1% lower than EWA, with no single week worse than 5% above the best baseline (robustness); else REJECT. Hard fail: if continuous-QSL weights collapse to a single candidate every week (i.e., it adds nothing over discrete selection), reject as non-value-add.
- **Improvement experiment:** relax the paper's stationarity (B5) with regime-aware QSL — fit separate weight vectors per regime (e.g., pre/post key-injury, dome/outdoor, divisional) selected by a context gate, i.e., a hierarchical-stacking-flavored QSL; test whether regime-gated weights beat global weights on tail-quantile (α ∈ {0.1, 0.9}) loss, where the paper shows the biggest candidate heterogeneity (Fig. 1: GBM dominates tails). If regime gating wins, it becomes the GSE default combiner.

**Verdict:** ADAPT
