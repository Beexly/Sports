# LANE 5 — Time-Series Changepoint Detection (Sport-Agnostic) — Kaggle Destroy Report

**Fleet:** Kaggle Research Destroyer · **Lane:** 5 of 20 (REDUX) · **Date:** 2026-10-06
**Scope:** Changepoint detection, regime-switching models, BOCPD/CUSUM, anomaly detection in series, structural-break methods — anything that detects WHEN a system changed.
**Power:** Every verdict below was adjudicated by `z-ai/glm-5.3-flash` through the verified `bin/glm-call.py` route (surrogate auth, forced egress proxy). Total token spend: **$0.0123** across 7 calls.

> **Evaluation standard:** METHOD · MATH · DATA · GSE APPLICATION (QB form breaks, pitcher fatigue, line-movement regime changes, coach-scheme shifts) · IMPLEMENTATION SPEC · SHORT-SERIES (SAFE/MARGINAL/LONG-ONLY at n=17 NFL games) · LEAK-FLAG · VERDICT (ADAPT/ADOPT/REJECT + reason + mind-changer).

---

## The governing doctrine (read first)

Three probability series exist for any regime model; **only one is usable live**. Measured on 2,520 simulated days of two-regime returns (fin-skills, MIT-licensed, statsmodels 0.15.0, Hamilton filter re-implemented in numpy to 1e-16 agreement):

| Series | Conditions on | Usable at close of t-1? |
|---|---|---|
| **smoothed** | whole sample | **NO** — flagged 47% of switches *before they started* |
| **filtered** | data through t | **NO** — same-day leak worth 0.20–0.28 Sharpe; "I used filtered probabilities, so no look-ahead" is the most common wrong sentence in this area |
| **predicted** | data through t-1 | **YES** — the only tradeable series (acc 0.907, 3-day delay, 16 false alarms) |

Offline segmentation (ruptures/PELT/BinSeg) is **ex-post by design** — the library's own README states offline detection first. It describes history; it is not a signal. Any GSE use must be for labeling training regimes under trailing-window refit, never for live decisions.

---

## CANDIDATE EVALUATIONS (GLM-adjudicated)

### 1. ruptures PELT — ADAPT
- **METHOD:** Offline changepoint detection via dynamic programming with pruning. Minimizes Σ segment costs + β·K over all segmentations; pruning gives expected O(n). Cost models: `l2` (mean shifts), `rbf` (any distributional shift via kernel/MMD intuition), `linear` (trend breaks), `ar` (autoregressive structure).
- **MATH:** Pruning exploits that adding a segment costs ≥ β: any candidate t with F(t)+β < min F(s) can never be optimal later. Penalty β controls false positives; BIC-style β ≈ 2pσ²ln(n) for l2 on standardized data.
- **DATA:** ruptures 1.1.10 (BSD-2). TDS tutorial (mean shifts); MDPI IoT paper used PELT/l2 to auto-select K, then fed K into fixed-K methods. No sports data in evidence — financial/telemetry only.
- **GSE APPLICATION:** The offline property is sanitizable: run PELT on the **trailing window ending at week g−1** each week (expanding-window causal refit). Breakpoints can move week to week, but the *regime-mean feature* is what the model consumes, not breakpoint labels. Best fits: (a) **line-movement regime breaks** on intraday series (hundreds of obs — the NFL sweet spot); (b) **pitcher in-start drift** on pitch-level velocity/spin (n≈100/start, run per-pitch on trailing pitches); (c) QB form breaks on pooled multi-season EPA/dropback (n=17/season alone is too thin for stable penalty calibration).
- **IMPLEMENTATION SPEC:** `pip install ruptures==1.1.10`. Standardize signal first. `rpt.Pelt(model="rbf", min_size=3, jump=1).fit(sig).predict(pen=β)`; calibrate β per signal on validation seasons (ruptures docs suggest pen ∈ [log n, 10·log n] on standardized data). Wrap in `trailing_pelt(signal, asof_week)` that only ever sees data < game week.
- **SHORT-SERIES:** MARGINAL at game level (penalty calibration unstable below ~30 obs); SAFE on intraday line movement and play-by-play.
- **LEAK-FLAG:** STRUCTURAL — offline by design. Any segmentation touching the prediction game's week (or later) ex-post labels regimes. Trailing-window discipline is mandatory, not optional.
- **VERDICT: ADAPT** — take penalized segmentation, rebuild as causal trailing-window detector; feed regime-mean/variance features, never raw breakpoint labels. Mind-changer: none needed — the wrapper is the verdict.

### 2. ruptures BinSeg / WinSeg / BottomUp (fixed-K) — REJECT (standalone)
- **METHOD:** Approximate search given K breakpoints: BinSeg greedily splits at max gain; WinSeg slides two half-windows; BottomUp merges from n segments. Fixed-K = "top-K most prominent changes," not a statistical existence test.
- **MATH:** BinSeg O(K·n log n) with known early-split bias (each split re-uses whole-segment cost; errors compound). BottomUp more robust to local noise.
- **DATA:** Same library; MDPI paper set K from PELT output — making fixed-K downstream of PELT anyway.
- **GSE APPLICATION:** Redundant given the PELT wrapper. Only residual value: BottomUp as a robustness cross-check inside the same causal wrapper (if PELT and BottomUp segmentations disagree, downweight the regime feature).
- **SHORT-SERIES:** MARGINAL (same as PELT; fixed-K dodges penalty selection but adds "K is wrong").
- **LEAK-FLAG:** Same structural offline issue; plus BinSeg's first split maximizes separation using both sides.
- **VERDICT: REJECT** as standalone imports. Mind-changer: benchmarks showing BinSeg/WinSeg beat PELT on trailing-window stability at n<50.

### 3. Classic CUSUM (Page 1954) — ADAPT
- **METHOD:** Sequential online detector. Two accumulators S_h(n)=max(0,S_h+x_n−μ−k), S_l(n)=min(0,S_l+x_n−μ+k); alarm when |S|>h, then reset. Causal by construction — decision at t uses only data ≤ t. Moustakides (1986): minimax-optimal worst-case detection delay under a false-alarm constraint.
- **MATH:** k≈σ/2 (allowance), h≈5σ (threshold). **Critical evidence:** an MQL5 study (6 instruments × 3 timeframes, 36 runs) found the textbook Siegmund ARL formula **overpredicts time-between-false-alarms ~5× on real data** (fat tails, autocorrelation). Calibrate h empirically via block-bootstrap of the actual series, never from the formula.
- **DATA:** Industrial QC origins; forex validation; Kats ships `CUSUMDetector` as its canonical example. No sports evidence — greenfield for GSE.
- **GSE APPLICATION:** The natively point-in-time method. (a) **QB form breaks:** CUSUM on weekly EPA/dropback residuals vs trailing mean; (b) **in-game scoring-regime shifts** to reprice live totals; (c) **steam detection** on 5-min line-move bars. Empirical h/k calibration pooled across 5+ seasons.
- **IMPLEMENTATION SPEC:** ~40 lines: rolling μ/σ from trailing window (min 20 obs), k=σ/2, h from block-bootstrap false-alarm targeting (e.g., 1 false alarm per 100 games). Kats `CUSUMDetector` as reference; own implementation for the point-in-time wrapper.
- **SHORT-SERIES:** MARGINAL — sequential so it runs within a season, but 17 games can't calibrate h alone; pool seasons.
- **LEAK-FLAG:** NONE.
- **VERDICT: ADAPT** — take the recursion, calibrate h/k empirically on realized residuals, discard Siegmund. Mind-changer: if pooled-season h proves unstable, fall to Bayesian alternatives.

### 4. BOCPD online (Adams & MacKay 2007) — ADAPT
- **METHOD:** Maintains posterior p(r_t | y_1:t) over run length (time since last changepoint); changepoint prior via hazard function H(r); conjugate exponential-family models give closed-form predictives. O(K) per observation with truncated run length.
- **MATH:** Recursion p(r_t,y_1:t) = Σ p(y_t|r_t)·p(r_t|r_{t-1})·p(r_{t-1},y_1:t-1). The money object is the **run-length posterior**, not just alarms.
- **DATA:** TCPDBench: online F1 0.696 (matches R's `ocp` on 27/31 series); offline variant 0.739; **no-hindsight MAP readout only 0.571** — the readout matters more than the recursion. GitHub finance repo: Student-t BOCPD, hazard 1/30, ROC-AUC 0.955 on equity data.
- **GSE APPLICATION:** Use the **run-length expectation as a regime-confidence weight**: scale Layer-2 situational features by how long the current team regime has persisted. QB form: run-length of current EPA regime gates how much weight the last-4-games form factor gets.
- **IMPLEMENTATION SPEC:** `bayesian-changepoint` 1.2.1 (PyPI) for the recursion; **discard** `get_map_changepoints`, use filtered predictive p(y_{t+1}|y_1:t) + E[r_t] as the signal. Hazard rate tuned per sport on pooled seasons.
- **SHORT-SERIES:** MARGINAL — conjugate priors + informative hazards tame broad posteriors; per-season alone underfits.
- **LEAK-FLAG:** NONE — causal by construction.
- **VERDICT: ADAPT** — keep the recursion, fix the readout. Mind-changer: if hazard tuning on 17-game blocks can't empirically beat CUSUM's ROC, reject.

### 5. R-BOCPD (restarted, optimal delay) — ADAPT (conditional)
- **METHOD:** Replaces constant hazard with an adaptive restart rule; proves P(no false alarm on [r,c)) ≥ 1−δ and optimal expected detection delay up to constants.
- **MATH:** Restart index r_{s;t} lower-bounds the run-length grid; false alarms certified, not just simulated.
- **DATA:** HAL 2020 paper, Bernoulli formulation. **No maintained library** — implement from paper.
- **GSE APPLICATION:** High-stakes windows where a false regime call is expensive: playoff stretches, futures repricing, "certify no regime change before extending a situational edge."
- **SHORT-SERIES:** MARGINAL — the restart guarantee specifically protects short stable windows, but from-paper implementation risk on 17-game data.
- **LEAK-FLAG:** NONE.
- **VERDICT: ADAPT** — only if false-alarm control is the binding constraint; otherwise CUSUM/BOCPD suffice. Mind-changer: a maintained library release or δ-certified false alarms validated on NFL residuals.

### 6. Probabilistic CUSUM (sarem-seitz 2022) — REJECT
- **METHOD:** Classic CUSUM recursion with the binary alarm replaced by a shaded "probability of extremity." Tested on simulated constant-mean data (all changepoints found, with delay) and a SKAB Kaggle sensor excerpt.
- **MATH:** Same accumulators as #3; the "probability" is an extremity score, **not a calibrated posterior** of changepoint.
- **GSE APPLICATION:** None standalone — zero detection gain over #3; the author himself points to BOCPD for harder problems.
- **SHORT-SERIES:** MARGINAL (inherits CUSUM validity; probability mapping needs more calibration data).
- **LEAK-FLAG:** NONE.
- **VERDICT: REJECT** — a display layer, not a signal. Mind-changer: empirical reliability calibration on held-out NFL windows showing the score adds signal beyond thresholded CUSUM.

### 7. Markov switching, predicted-probabilities only (statsmodels) — ADAPT
- **METHOD:** `MarkovRegression(k_regimes=2, trend="c", switching_variance=True)`. The **only** usable output is the *predicted* series P(r_t | data through t−1).
- **MATH:** Hamilton filter; Kim smoother must be **banned** from features. Measured: predicted acc 0.907, 3-day delay, 16 false alarms, Sharpe 1.205. Smoothed: acc 0.947, 0 delay, **0 false alarms, 47% of switches flagged before they started** — the look-ahead made visible. Filtered same-day: Sharpe 1.616, leak worth 0.20–0.28.
- **DATA:** fin-skills measured skill (MIT, verified 2026-09-08). Rule-based alternatives on same data: 21-day vol threshold acc 0.846 (6/8d delay); turbulence index 0.855 (7/0d); 200-day SMA 0.722 — **worse than never flagging** (0.81 base rate).
- **GSE APPLICATION:** **Two-state live/dead gate per Layer-2 factor**: apply a situational factor (rest, altitude, divisional) only when filtered P(responsive regime) is high. Transition matrix fit on pooled seasons, parameters walk-forward.
- **IMPLEMENTATION SPEC:** `statsmodels.tsa.regime_switching.MarkovRegression`; `search_reps` multiple starts; use `predicted_marginal_probabilities` only; refit yearly on past data. Add a CI assertion that no smoothed attribute is ever referenced in feature code.
- **SHORT-SERIES:** MARGINAL — few regime flips per 17 games; pool 3+ seasons, never fit per-season.
- **LEAK-FLAG:** SMOOTHED/EX-POST PROBABILITIES + full-sample MLE — the two most common leaks in this area, both measured.
- **VERDICT: ADAPT** — rebuild around filtered-only posteriors under walk-forward params. Mind-changer: filtered-only walk-forward Sharpe below the CUSUM baseline → drop for #3.

### 8. hmmlearn HMM — REJECT (live use)
- **METHOD:** `predict()` (Viterbi) and `predict_proba()` (forward-backward), both documented "given all emissions."
- **MATH:** No filtered (forward-only) posterior in the public API. **Every label is smoothed.**
- **DATA:** hmmlearn 0.3.3, 3,420 stars, no commits since 2024-10-31.
- **GSE APPLICATION:** None live. Residual use: offline ex-post regime labels for training/auditing Layer-2 supervised models.
- **SHORT-SERIES:** MARGINAL (moot — leaked regardless of n).
- **LEAK-FLAG:** ALL LABELS SMOOTHED — look-ahead by construction.
- **VERDICT: REJECT** for any live path. Mind-changer: a fork exposing p(z_t|y_1:t) that empirically beats statsmodels filtered Markov switching.

### 9. Turbulence index (Kritzman–Li) — ADAPT (as kill switch)
- **METHOD:** Mahalanobis distance of current observation vs trailing mean/covariance: d_t = (y_t−μ)'Σ⁻¹(y_t−μ).
- **MATH:** Measured: acc 0.855, **7d in-delay / 0d out-delay**, 20 false alarms. The 0-day exit is the asset: correlation breaks show instantly.
- **DATA:** fin-skills measured; needs multi-asset panel + covariance history.
- **GSE APPLICATION:** **Multivariate kill switch, not entry signal.** 7-day in-delay ≈ a full NFL game cycle (too slow to enter); 0-day out-delay kills stale edges instantly. Panel = team feature vector (off EPA, def EPA, pressure rate, etc.); Mahalanobis spike → retire the situational factor's live weight.
- **IMPLEMENTATION SPEC:** Expanding-window Σ only (full-sample Σ leaks). Panel of 3–5 features max at 17-game scale.
- **SHORT-SERIES:** LONG-ONLY — Σ has d(d+1)/2 params; 17 games can't estimate covariance for d>2. Multi-season pooling required.
- **LEAK-FLAG:** FULL-SAMPLE COVARIANCE — Σ over all history includes future; d_t not causal until re-estimated expanding-window.
- **VERDICT: ADAPT** — rebuild covariance estimation; deploy as kill switch. Mind-changer: if Σ on a 3–5 feature panel can't stabilize from <100 pooled observations, reject.

### 10. SCUSUM existence test (Kirch 2006) — ADOPT (as referee)
- **METHOD:** Whole-sample test for *whether* a changepoint exists: T_n = (1/n)Σ(CUSUM_k/σ̂)² → ∫B² under H₀ (Brownian bridge). Won the Shi et al. 2022 single-changepoint competition — best-in-class power with controlled false alarms.
- **MATH:** Standardized CUSUM path; reject when T_n exceeds the ∫B² quantile. Detects interior breaks; weak at sample boundaries.
- **DATA:** Competition winner; no Kaggle sports notebook found using it — greenfield.
- **GSE APPLICATION:** **The referee, not the detector.** Offline gate: "is this team's mid-season break (QB injury, OC change) statistically real or noise?" Run on trailing windows to validate regime labels before retraining Layer-2 weights. Pairs with #4: BOCPD proposes, SCUSUM disposes.
- **IMPLEMENTATION SPEC:** ~25 lines: CUSUM path on trailing window, σ̂ via MAD of diffs (robust), compare against ∫B² quantiles (simulate once, cache).
- **SHORT-SERIES:** MARGINAL — asymptotics assume large n; fine for MLB/NBA windows, thin for NFL (use as weak gate, not hard).
- **LEAK-FLAG:** NONE if trailing-window-only; never run on windows containing the prediction game.
- **VERDICT: ADOPT** — as existence-test/referee. Mind-changer: none — the role is well-defined.

### 11. Regime-as-feature (soft conditioning) — ADOPT
- **METHOD:** Feed regime *probabilities* as ML features instead of hard-switching between models. Includes Wasserstein regime clustering (Horvath et al. 2021): cluster trailing windows as empirical *distributions* via optimal transport, not moment features.
- **MATH:** Soft membership avoids brittle switch churn; Wasserstein distance captures shape changes (score distributions), not just mean shifts. Cross-sectional pooling (32 teams × 17 games = 544 team-games/season) rescues short series.
- **DATA:** yohoyu ML-for-trading notebook series (regime-as-feature methodology demonstrated on ETF/macro data).
- **GSE APPLICATION:** Regime probabilities (from #7 or Wasserstein clusters) as Layer-2 inputs; interact with situational features near transitions ("regime awareness changes how other signals are interpreted"). Offense/defense form-cluster membership as features for totals.
- **IMPLEMENTATION SPEC:** Rolling 8-game windows, Wasserstein distance between consecutive windows on PBP feature distributions, 3–5 clusters, membership probs as features; clusters refit point-in-time.
- **SHORT-SERIES:** SAFE with cross-sectional pooling (per-team 17 points insufficient alone).
- **LEAK-FLAG:** Offline-fit-then-backfill — clusters fit on full history and labels used in the past. Refit per timestamp.
- **VERDICT: ADOPT** — the doctrine is directly compatible with Layer 2. Mind-changer: none.

### 12. Kats detectors (selective vendoring) — ADAPT
- **METHOD:** `CUSUMDetector` (canonical), `BOCPDDetector` (Bayesian online), `OutlierDetector`.
- **MATH:** As #3/#4; Kats adds bootstrapped significance for CUSUM.
- **DATA:** Meta's library; GSE already vendoring selectively (Jules wave). Known traps: **OutlierDetector silently daily-interpolates gaps** (fabricates offseason data — a point-in-time-law violation); TSFeatures NaN on 17-point series; stale dependency pins.
- **GSE APPLICATION:** Vendor **only** `BOCPDDetector` (online trigger on market-implied residuals → Layer-2 reweight trigger). Excise `OutlierDetector` entirely.
- **SHORT-SERIES:** MARGINAL (BOCPD safe; CUSUMDetector's bootstrap marginal at 17).
- **LEAK-FLAG:** OutlierDetector's gap interpolation uses future observations — fabricated points across time boundaries.
- **VERDICT: ADAPT** — vendor BOCPDDetector only. Mind-changer: none; the excision list is the verdict.

---

## WIRING PRIORITY QUEUE (build order)

1. **Causal CUSUM on team-efficiency residuals** (#3) — ~40 lines, natively point-in-time; QB form breaks + steam detection. Empirical h calibration pooled 5+ seasons.
2. **Markov-switching live/dead gate** (#7) — filtered-only posteriors under walk-forward params; gate each Layer-2 factor. CI ban on smoothed attributes.
3. **BOCPD run-length as regime-confidence weight** (#4) — scale situational features by regime persistence.
4. **SCUSUM referee** (#10) — validate regime labels offline before retraining; BOCPD proposes, SCUSUM disposes.
5. **Regime-as-feature** (#11) — soft probabilities into Layer-2 ML; Wasserstein clusters pooled cross-sectionally.
6. **Turbulence kill switch** (#9) — multivariate Mahalanobis on team panel; 0-day exits retire stale factors.
7. **PELT trailing-window wrapper** (#1) — line-movement regime breaks on intraday series (the NFL high-n lane); pitch-level drift.
8. **Quit-detector** (situational layer below) — hustle-residual BOCPD.

---

## REJECT LIST (with reasons + mind-changers)

| Rejected | Reason | Mind-changer |
|---|---|---|
| ruptures BinSeg/WinSeg/BottomUp (standalone) | Redundant given PELT wrapper; K-selection is the hard problem they don't solve; BinSeg early-split bias | Trailing-window stability benchmarks at n<50 beating PELT |
| Probabilistic CUSUM | Display layer over CUSUM; uncalibrated "probabilities"; zero detection gain | Empirical reliability calibration on held-out NFL windows |
| hmmlearn (live use) | Smoothed-only API = look-ahead by construction | Fork exposing p(z_t\|y_1:t) beating statsmodels filtered |
| Kats OutlierDetector | Silently interpolates gaps → fabricates offseason data | N/A — excised, not rejected pending |

---

## SITUATIONAL / EMOTIONAL LAYER — can changepoint methods detect WHEN A TEAM QUIT?

**Yes — with the right proxies and causal detectors.** Quit signatures split by measurability:

**Play-by-play-derivable (every league, no tracking):** pre-snap penalty indiscipline rate (false starts, delay of game — officiated ground truth); pace/play-clock usage and hurry rate on must-score possessions; substitution patterns (starters benched = management quit-signal); hustle box-score events (charges taken, blocks, TFLs); intentional-foul rate when trailing (NBA).

**Tracking-data-only:** yards-after-first-contact conceded (tackle intensity); off-ball route depth and separation quality ("loaf detector"); pursuit closing speed vs optimal path; block sustain time; sprint-share of distance covered; NBA closeout speed; soccer pressing distance.

**The single most promising design — hustle-residual BOCPD:** per possession t, compute h_t = w₁·(penalty-rate z) + w₂·(pace-deviation z) − w₃·(hustle-event-rate z), each residualized against score margin, time remaining, and timeout state within a rolling pre-game window (this kills the "trailing teams naturally slow down" confound). Stream h_t through **BOCPD** (causal, outputs run-length posterior = calibrated quit probability, no labeled quit events needed — and none exist). **Why it beats alternatives:** PELT/offline is look-ahead; HMM Viterbi is retrospective smoothing; rolling means have no regime probability; binary classifiers need labels that don't exist. BOCPD's posterior is a *probability*, which wires naturally into Layer 2.

**Layer-2 wiring — dampen by default, gate at extremes:** quit-detection is a **dampener**: shrink the team's situational features (comeback priors, late-game scoring rates, momentum factors) by f = P(new effort regime). **Gate** only when P(quit) > 0.9 with minimum run length: drop features that assume full effort (e.g., fourth-quarter comeback probability). Point-in-time discipline: residualization windows and BOCPD refits use strictly pre-game data; the composite weights wᵢ are learned on prior seasons only.

---

## CANDIDATE INVENTORY (12 evaluated)

| # | Candidate | Verdict | Short-series |
|---|---|---|---|
| 1 | ruptures PELT | ADAPT | MARGINAL / SAFE on high-n |
| 2 | ruptures BinSeg/WinSeg/BottomUp | REJECT | MARGINAL |
| 3 | Classic CUSUM | ADAPT | MARGINAL |
| 4 | BOCPD online | ADAPT | MARGINAL |
| 5 | R-BOCPD | ADAPT (conditional) | MARGINAL |
| 6 | Probabilistic CUSUM | REJECT | MARGINAL |
| 7 | Markov switching (predicted) | ADAPT | MARGINAL |
| 8 | hmmlearn (live) | REJECT | MARGINAL (moot) |
| 9 | Turbulence index | ADAPT | LONG-ONLY |
| 10 | SCUSUM test | ADOPT | MARGINAL |
| 11 | Regime-as-feature | ADOPT | SAFE (pooled) |
| 12 | Kats detectors | ADAPT | MARGINAL |

**Adopted as-is (2):** SCUSUM referee, regime-as-feature doctrine. **Adapted (7):** PELT wrapper, CUSUM, BOCPD, R-BOCPD, Markov switching, turbulence kill-switch, Kats BOCPD-only vendoring. **Rejected (3+1 excised):** fixed-K standalone, probabilistic CUSUM, hmmlearn live, Kats OutlierDetector.

## GLM ROUTE STATUS & TOKEN SPEND

All 7 GLM calls completed via `bin/glm-call.py` → `z-ai/glm-5.3-flash` (provider: Relace). Total: **$0.0123**, ~29K tokens. One quirk handled: GLM returns verdicts in the `reasoning` field with `content: null` — all evaluations extracted from reasoning traces. Two batches hit generation-length truncation; missing verdicts recovered via condensed follow-up calls.

---

## REVIEW PASS (adversarial, wave 2)

**Reviewer stance:** The original is the strongest lane report in the fleet on point-in-time discipline — the smoothed/filtered/predicted doctrine table is load-bearing and correct. This pass does not relitigate it. It attacks coverage: the lane missed the most-cited nonparametric method in the field, missed an entire sports-specific paper, missed the concept-drift literature, and never once pointed a detector at GSE's own models.

### (a) Five missed candidates

**R1. Glazer (2025), "Tractable Algorithms for Changepoint Detection in Player Performance Metrics" — ADAPT.** arXiv 2510.25961 (submitted Oct 2025, rev. Jan 2026). A sports-native changepoint paper the original somehow missed: LR-scan for candidate location + **split-sample confirmation** instead of thresholding (thresholding "can lead to substantial overflagging in sports applications" — the paper's words, and they match the lane's own doctrine). A shift parameter sets the minimum detectable magnitude. Validated on 2023–24 MLB batting/pitching data: 91% detection on a quasi-ground-truth set of pitchers transitioning relief→starter, and >60% of detected changes occur **in-season**. GSE fit: pitcher velocity/spin breaks, batter chase/whiff-rate breaks — per-player monitoring with a built-in false-positive discipline the original's per-player designs lack. https://arxiv.org/abs/2510.25961

**R2. E-divisive / ecp (Matteson & James 2014) — ADAPT.** The most-cited nonparametric multiple-changepoint method in existence, multivariate-native, energy-statistic based — detects *any* distributional change, not just mean shifts. The original reached for PELT/rbf to get "any distributional shift via kernel/MMD intuition"; E-divisive is the purpose-built tool for that job, with permutation-based significance (sig.lvl) instead of penalty calibration. R `ecp` 3.1.6 on CRAN (maintained, 2024); Python access via `aeon.segmentation.EAggloSegmenter` (E-agglomerative port). For team-panel data (off EPA, def EPA, pressure rate jointly), this should sit next to the PELT wrapper, not be absent.

**R3. ClaSP (Schäfer et al., CIKM 2021; `aeon.segmentation.ClaSPSegmenter`) — ADAPT.** Self-supervised segmentation: trains a k-NN classifier at every candidate split and takes the split with max ROC-AUC — change points are where past and future are *distinguishable*. Won the 107-series TSS benchmark against FLOSS, BinSeg, PELT, BOCD, and ESPRESSO (best in 70/107). Parameter-light, label-free, and conceptually ideal for GSE's "home/road split" and "pre/post-injury" regime discovery on play-level series. Offline by default → same trailing-window wrapper as PELT applies. https://www.aeon-toolkit.org/en/stable/examples/segmentation/segmentation_with_clasp.html

**R4. river drift detectors — ADWIN (+DDM, Page-Hinkley, KSWIN) — ADAPT.** The entire concept-drift literature is missing from the lane. Two duties: (1) streaming regime detection on team series (ADWIN's adaptive window is CUSUM's distribution-free cousin); (2) **model-decay monitoring on GSE's own prediction residuals** — the single highest-leverage changepoint application in the building and never mentioned once in the original. When Layer-1 residuals break regime, every downstream weight is stale; ADWIN-on-residuals is the automated trigger for recalibration. `pip install river`; `from river.drift import ADWIN`.

**R5. Bai-Perron / `strucchange::breakpoints` — ADAPT (as referee, alongside SCUSUM).** SCUSUM tests whether a *univariate series* broke. Bai-Perron tests whether a *regression relationship* broke — different question, and GSE's question more often: "did the market's pricing of rest change?", "did the EPA→spread mapping break after the schedule reform?" `strucchange` (R, Zeileis et al.) implements Bai & Perron (2003) with break-date confidence intervals. The original's referee bench has one judge; it needs two.

**Honorable mentions (real gaps, no full verdict):** Twitter S-H-ESD AnomalyDetection — "anomaly detection in series" was in the lane's stated scope and the original covers almost no anomaly methods; WBS2/NOT (Fryzlewicz, R `breakfast`) — the actual successors to BinSeg that fix its early-split bias; Prophet trend changepoints (Laplace prior on trend breaks — belongs in this lane's inventory even if Jules owns Prophet); `changepoint.np` nonparametric PELT (sports residuals are heavy-tailed; the l2 cost is the wrong default).

### (b) Verdict changes advocated

1. **#5 R-BOCPD: ADAPT(conditional) → REJECT (parked).** The original's own caveats convict it: Bernoulli formulation means binarizing continuous residuals (information destruction at the input), no maintained library, and CUSUM already covers the false-alarm-control use case with empirical calibration. A δ-certificate on a binarized toy is not worth a from-paper implementation. Mind-changer: maintained implementation + validation on continuous NFL residuals.
2. **#11 Regime-as-feature: ADOPT stands, implementation amended.** Full Wasserstein distance between 8-game windows of PBP *distributions* in high dimensions is noise-dominated at n=8 — the distance concentrates and the clusters will be garbage. Use **sliced-Wasserstein or MMD** for the window-distance; keep the soft-membership doctrine, change the metric.
3. **#2 BinSeg rejection: verdict stands, mind-changer corrected.** "Benchmarks showing BinSeg beats PELT" is the wrong bar — BinSeg's early-split bias is fixed by **WBS2/NOT**, so the mind-changer should be WBS2/NOT benchmarks on trailing windows, not BinSeg-vs-PELT.
4. **Quit-layer proxies: two corrections.** (i) *Intentional-foul rate when trailing (NBA)* is not an effort proxy — intentional fouling is a deliberate strategy by a team that is trying. Remove it; it measures the opposite of quit. (ii) The composite weights wᵢ are "learned on prior seasons only" — against what target? No quit labels exist (the report admits this). Either specify unsupervised calibration (tune weights on known rest/blowout-management games) or admit the weights are hand-set priors. A design that needs labels it says don't exist is a hole, not a feature.
5. **Quit-layer estimand conflation.** BOCPD's P(new regime) fires on *any* regime change — including tactical ones (garbage-time lineup swaps, prevent defense). The design equates "new effort regime" with quit, but half the flagged events will be *management* decisions, not player quit. The wiring needs a management-vs-player attribution split before the dampener touches Layer-2 weights, or the feature will punish teams whose coaches rest starters.

### (c) Wiring-queue re-ranking

Revised queue (changes in **bold**):

1. Causal CUSUM on team-efficiency residuals (#3) — unchanged.
2. **ADWIN model-decay monitor on Layer-1/Layer-2 prediction residuals (R4) — NEW.** Engine self-monitoring outranks every additional world-detector. Fires recalibration, not bets.
3. Markov-switching live/dead gate (#7) — unchanged.
4. BOCPD run-length as regime-confidence weight (#4) — unchanged.
5. SCUSUM referee (#10) + **Bai-Perron regression-break referee (R5)** — paired; series breaks and relationship breaks are different questions.
6. Regime-as-feature (#11) — unchanged, with the sliced-W/MMD amendment.
7. **E-divisive offline labeling (R2)** — multivariate-native, permutation significance; sits with the PELT wrapper for team-panel data.
8. Glazer split-sample per-player protocol (R1) — pitcher velocity, batter discipline.
9. ClaSP self-supervised segmentation (R3) — home/road and pre/post-injury discovery.
10. Turbulence kill switch (#9) — demoted; ADWIN (new #2) covers the live-decay duty with fewer covariance-estimation headaches.
11. PELT trailing-window wrapper (#1) — demoted; still the intraday line-movement workhorse, but E-divisive and ClaSP are better first choices for multivariate/offline labeling.
12. Quit-detector — demoted to last pending the attribution-split fix in (b)(5) and the weight-calibration fix in (b)(4). The estimand is not yet honest.

R-BOCPD removed (rejected). Kats BOCPD vendoring unchanged.

### (d) Dangerously wrong or overstated

**The lane's central blind spot: changepoint is treated purely as world-detection, never as model-detection.** Every candidate is pointed at teams, players, and lines. None is pointed at GSE's own residuals. In a system whose Layer-1 is a market model and Layer-2 is a stack of situational factors, the most expensive regime break is *ours* — silent model decay, market adaptation to our factors, calibration drift after rule changes. The original builds eleven world-detectors and zero self-monitors. That inverts the leverage ordering: a stale engine with perfect world-regime labels still loses. The ADWIN-on-residuals addition in (c) is not a nice-to-have; it is the missing half of the lane.

**Secondary:** the "anomaly detection in series" scope line is unfulfilled — one Mahalanobis kill-switch does not cover it. **Tertiary:** the original's evidence base is finance/telemetry-heavy with zero Kaggle sports notebooks cited in a Kaggle-first lane; the Glazer paper (R1) existing since Oct 2025 makes that gap inexcusable going forward.

**What the original got right and this pass preserves:** the smoothed/filtered/predicted doctrine, the trailing-window wrapper discipline, the Siegmund-formula rejection, the hmmlearn smoothed-API kill, and the Kats OutlierDetector excision are all correct and should be treated as settled law.
