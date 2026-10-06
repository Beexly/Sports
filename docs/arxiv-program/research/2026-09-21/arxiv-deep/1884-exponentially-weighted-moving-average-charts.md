# [1884] Exponentially Weighted Moving Average Charts for Detecting Concept Drift (arXiv:1212.6018)

**Citation:** Gordon J. Ross, Niall M. Adams, Dimitris K. Tasoulis, David J. Hand (2012). *Exponentially Weighted Moving Average Charts for Detecting Concept Drift*. arXiv:1212.6018v1. URL: https://arxiv.org/abs/1212.6018
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the cheapest possible drift detector (O(1), zero stored history, constant controllable false-positive rate via ARL0) that bolts onto any classifier as a black box; ideal weekly binary error-stream monitor for GSE's win-probability model, though its abrupt-drift/Bernoulli framing needs NFL-specific adaptation.

## 1. Research question
Streaming classifiers rot under concept drift, and existing drift detectors (DDM-style, PC, SPRT) have two flaws: super-linear cost and no way to control the false-positive rate in advance. Can a classical SPC (statistical process control) tool — the EWMA chart — be adapted into a drift detector that is O(1), stores nothing, treats the classifier as a black box, and guarantees a *constant, pre-chosen* rate of false alarms? The paper's ECDD answers yes and matches the tuned competitors on synthetic and real benchmarks.

## 2. Dataset / schema
Synthetic: GAUSS (bivariate Gaussian class flip at T=50/200, stream length 2T) and SINE (y=sin(x) boundary flip), 10,000 realizations each, 100–400 observations per stream. Real: NSW Electricity Market (45,312 half-hourly points, May 1996–Dec 1998; 5 features → 2-feature price-movement classification task) and a colonoscopic imaging dataset (sizes not stated in main text). Base classifiers: streaming LDA and 3-NN. Protocol: 10,000 realizations averaged; McNemar tests for pairwise significance (p < 10⁻⁵ everywhere due to simulation count).

## 3. Method / model
**ECDD (EWMA for Concept Drift Detection):** reduce the classifier's output to a Bernoulli error stream X_t ∈ {0,1} (1 = misclassified). Maintain two estimators: a fast EWMA Z_t = (1−λ)Z_{t−1} + λX_t (λ=0.2 recommended; insensitive in [0.1,0.3]) tracking the *current* error rate, and a slow running mean p̂_{0,t} = (t−1)/t·p̂_{0,t−1} + (1/t)X_t tracking the *pre-change* rate. Alarm when Z_t > p̂_{0,t} + L_t·σ_{Z_t}, where σ_{Z_t} = sqrt(p̂_{0,t}(1−p̂_{0,t})·λ/(2−λ)·(1−(1−λ)^{2t})). The novelty: L_t is *time-varying*, chosen each step from pre-computed degree-7 polynomial lookup tables mapping (p̂_{0,t}, ARL_0) → L_t, where the polynomials are fit (once, offline, Monte Carlo) to hold the average run length between false positives ARL_0 constant (Table 1: polynomials for ARL_0 = 100, 400, 1000). ECDD-WT adds a warning-threshold tier (retain recent data instead of full reset). On alarm the classifier is reset and relearned from post-change data.

## 4. Equations & assumptions
- Z_0 = μ_0; Z_t = (1−λ)Z_{t−1} + λX_t, t>0. (Eq. 1)
- Alarm rule: Z_t > μ_0 + L·σ_{Z_t}. (Eq. 2)
- Bernoulli pre-change EWMA sd: σ_{Z_t}² = p_0(1−p_0)·λ/(2−λ)·(1−(1−λ)^{2t}). (Eq. 3)
- Online pre-change rate: p̂_{0,t} = (1/t)ΣX_i = (t−1)/t·p̂_{0,t−1} + (1/t)X_t.
- Alarm with estimates: Z_t > p̂_{0,t} + L_t·σ_{Z_t}; σ̂_{Z_t} uses p̂_{0,t}(1−p̂_{0,t}).
- L = c_0 + c_1 p̂_0 + c_3 p̂_0³ + c_5 p̂_0⁵ + c_7 p̂_0⁷; e.g. ARL_0=1000: L = 1.17 + 7.56p̂_0 − 21.24p̂_0³ + 112.12p̂_0⁵ − 987.23p̂_0⁷ (Table 1).
Assumptions: drift is abrupt and raises the error rate (paper explicitly declines the "drift without error change" case as rare); binary classification (multi-class extension left as future work); immediate label feedback; stream mean has exactly two regimes.

## 5. Features / target
Inputs: only the classifier's binary correctness stream X_t — no features used at all (pure black box). Target: binary change-point alarm per time step. Underlying classification targets: GAUSS/SINE class labels, electricity price direction (up vs flat/down), colonoscopy classes.

## 6. Validation design
Two ARL_0 regimes (100 and 600 = 2T for the synthetic streams) × two base classifiers (LDA, 3-NN) × 4 synthetic configs; baselines: no-detector classifier, Paired Classifier (PC), SPRT — all tuned to the same target ARL_0 (paper notes PC/SPRT parameters achieving a given ARL_0 vary by dataset, i.e., they *cannot* control it blind; ECDD's polynomial gives it for free). Real data: ECDD's ARL_0 swept 100→1000; PC/SPRT tuned over ranges around their empirical best (an acknowledged advantage to the competitors). Significance: McNemar, p<10⁻⁵.

## 7. Numerical results / baselines
- Synthetic (accuracy, mean ± SE over 10k realizations): LDA alone 0.51–0.52 on Gauss50/200 → LDA-ECDD 0.59–0.71 (ARL_0=600) / 0.63–0.71 (ARL_0=100); SINE: 0.50–0.52 → 0.77–0.90. KNN similar (0.54–0.62 → 0.61–0.92). ECDD ≈ PC ≈ SPRT in all configs (differences small; paper: detector only matters for the few post-change observations).
- λ sensitivity: λ ∈ {0.1,0.2,0.3} changes accuracy by ≤0.02 everywhere — λ=0.2 is safe default.
- Electricity: LDA 0.70 → **0.86** with ECDD (KNN 0.73 → **0.88**); best ARL_0=100, degrading only to 0.85/0.87 at ARL_0=1000 — robust within reason. Colon: LDA 0.68 → **0.90**. All three detectors identical at best settings.
- Key structural result: ARL_0=100 beats 600 when change is early (T=50); 600 beats 100 when change is late (T=200) — matching false-positive rate to change frequency matters, which is exactly what the ARL_0 knob provides.

## 8. Code / data availability
None stated (2012 paper; no repo link). Electricity dataset is the standard elec2 benchmark, public.

## 9. Leakage & limitations
- Binary-only formulation; NFL win-probability is binary so this fits, but the props/spread-lane extensions would need the confusion-matrix extension the paper leaves as future work.
- Assumes abrupt drift; NFL regime changes are often gradual (QB decline over weeks, cumulative injuries) — the paper tests gradual drift only briefly and concedes ensembles suit it better.
- Needs *immediate* label feedback in its streaming formulation; in our weekly setting this is satisfied (games resolve weekly), but per-game "points" within a week arrive in one batch — the per-game update cadence is an adaptation choice, not the paper's tested regime.
- The two-estimator trick (fast Z_t vs slow p̂_{0,t}) assumes the slow estimator still reflects pre-change p_0; with weekly NFL data and T measured in games, burn-in is ~1 season before p̂ is stable — first-season alarms would be noisy.
- Like all error-rate detectors, blind to drift that doesn't move accuracy — the exact gap PUDD (1882) fills; use the two together.
- No overfitting analysis of the degree-7 polynomial fits is shown; and the claim that one table serves all classifiers rests on the mapping being purely through p̂_0, which holds only if errors are iid Bernoulli pre-change.

## 10. GSE overlap
Per the existing-research map, online/continuous learning was commissioned-but-unfilled — no duplication. Complements 1882 (PUDD: sensitive, label-hungry chi-square machinery) and 1883 (CDSeer inspector: pre-game, model-agnostic). ECDD is the *lightweight operational* alternative: no windows, no clustering, no retraining of anything except the main model itself. The AGENTS.md benchmark inventory has no error-stream monitor.

## 11. GSE implementation spec
- **Monitor:** weekly binary correctness of the win-probability model (1 = model picked the loser). Feed the per-game stream into ECDD with λ=0.2 and ARL_0 = 1 season ≈ 272 games (one false alarm per season on average — directly interpretable knob, a first for this lane).
- **Mechanics:** maintain Z_t, p̂_{0,t}, and L_t from the Table-1-style polynomial (refit once offline via Monte Carlo on the NFL error-rate regime, p̂_0 ≈ 0.3–0.4; ~30 lines of NumPy, no sklearn needed). Update per game as results resolve; alarm ⇒ trigger the post-drift refit policy (retrain on trailing post-alarm games, challenger-vs-champion for 2 weeks).
- **Season handling:** reset p̂_{0,t} at season start (burn-in: suppress alarms for the first 3 weeks while p̂ stabilizes) — the offseason is a guaranteed regime change, so auto-reset doubles as the seasonal prior.
- **Serving:** O(1) per game, zero stored history; runs inside the existing weekly pipeline. Effort: ~half a day.

## 12. Reproducible test
Dataset: nflverse 2015–2025 game-level, frozen win-prob model from 2015–2019. Stream per-game correctness 2020–2025 through ECDD (ARL_0 ∈ {136, 272} games) vs a fixed 4-week refit schedule. Primary metric: Brier score on 2020–2025; secondary: alarm precision/recall against the labeled regime-change episodes from 1882. ECDD must (a) not trail the fixed-schedule Brier by more than 0.001, and (b) produce ≤1 false alarm per season on average (verifying the ARL_0 guarantee transfers to NFL data).

## 13. Acceptance / rejection gate
ADOPT as the production drift monitor if on 2020–2025 nflverse: (i) Brier within 0.001 of the 4-week fixed refit schedule, (ii) observed false-alarm rate ≤1.5× the nominal ARL_0 rate (i.e., the constant-FP guarantee approximately transfers), (iii) refit-on-alarm does not degrade Brier by more than 0.002 vs frozen baseline on non-alarm weeks. REJECT if ECDD's alarms are no better than a coin-flip refit schedule on Brier, or if the ARL_0 calibration collapses (≥3 false alarms/season at ARL_0=272).

## 14. Improvement experiment
ECDD's blind spot is drift-without-accuracy-loss. Feed the *PU-index stream* (1882's u_i = 1 − P(actual)) into ECDD instead of the binary error stream — a continuous-valued EWMA on prediction uncertainty rather than 0/1 errors. This keeps ECDD's O(1), constant-ARL_0 machinery but inherits PUDD's early-warning sensitivity, at a fraction of PUDD's complexity. Test on the same nflverse protocol: hypothesis is the PU-ECDD variant detects the labeled regime changes ≥1 week earlier than binary ECDD with no increase in false alarms — if true, it obsoletes the heavier PUDD chi-square machinery for the weekly pipeline.
