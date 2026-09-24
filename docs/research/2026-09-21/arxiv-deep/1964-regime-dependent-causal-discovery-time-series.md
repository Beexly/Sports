# [1964] Reconstructing regime-dependent causal relationships from observational time series (arXiv:2007.00267)

**Citation:** Marlene Kretschmer, Dim Coumou, Jonathan F. Donges, Jakob Runge (2020). *Reconstructing regime-dependent causal relationships from observational time series*. arXiv:2007.00267. URL: https://arxiv.org/abs/2007.00267
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; method §§3.1–3.3, Alg. 1, experiments §4, ENSO real-data §5).
**Verdict:** ADAPT

## 1. Research question
Dynamical systems often transition between persistent, unobserved background regimes (e.g. seasons), each with different causal relations — different directions, lags, signs, or autocorrelation. Can regime-dependent causal graphs be jointly learned from observational time series by alternating between (a) regime assignment and (b) per-regime causal discovery, without knowing the regimes in advance?

## 2. Dataset / schema
- Synthetic: low-dimensional (N_X=2) and higher-dimensional toy cases designed to test regime changes in causal direction, time lag, effect sign/magnitude, and autocorrelation. Regimes alternate equidistantly or in blocks; N_R realizations per case.
- Real: ENSO (relative Niño3.4 index, NOAA) + All-India Rainfall anomalies (IITM), monthly, 1871–2016 → 2 series × 1740 months. Public data (NOAA / IITM via KNMI Climate Explorer).

## 3. Method / model
Regime-PCMCI (Kretschmer et al.):
- Assumption 1: persistent discrete regime variable → finite N_K regimes, stationary causal relations *within* each regime.
- Alternating optimization (Algorithm 1):
  - Step 1 — causal discovery: fix regime weights {Γ(t)}; for each regime k, run PCMCI on the subset {x_t : γ_k(t) ≥ 0.5} (eq. 11) to get parents {P_k} and fit model coefficients {Φ_k} (eq. 13, linear or nonlinear functional model G).
  - Step 2 — regime learning: fix graphs {P_k} and coefficients; solve for the regime-assigning process Γ(t) = (γ_1(t),…,γ_{N_K}(t)) minimizing the cost functional L(Γ,P) = Σ_t Σ_k γ_k(t)·d(x_t − Ĝ_t(P_k; Φ_k)) (eq. 8) subject to Σ_k γ_k(t) = 1, γ_k(t) ∈ [0,1] (eq. 9) and persistence constraint Σ_t |γ_k(t+1) − γ_k(t)| ≤ N_C (eq. 10), which caps the number of regime transitions.
- Tuning: N_C ≈ T/(N_M·N_K) where N_M is the expected average regime duration (domain-knowledge driven); N_K (number of regimes) selected via AICc (eq. 18).
- Multiple random restarts (annealing): N_A annealing runs × N_Q optimization iterations; keep the run(s) with lowest prediction error ε̂ (eq. A.4); results averaged over the top cluster of annealings.
- Runtime note (paper): low-dim experiments took ~45 minutes for N_K=3 to complete (hardware not specified beyond that).

## 4. Equations & assumptions
- Per-regime PCMCI parent sets {P_k} and coefficients {Φ_k} from a functional model x_t ≈ G_t(P_k; Φ_k).
- Cost functional L(Γ,P) (eq. 8) with distance d (e.g. squared Euclidean); persistence regularization via N_C (eq. 10); alternative Tikhonov smoothness on Γ mentioned but not used.
- Regime-duration heuristic: N_C ≈ T/(N_M·N_K).
- Model selection: AICc over N_K (eq. 18).
- Assumptions: metastability (persistent regimes, Assumption 1); within-regime stationarity; all PCMCI assumptions (causal sufficiency, Markov, faithfulness) *within* each regime; regime variable is discrete and finite.

## 5. Features / target
Unsupervised: inputs are N_X raw time series. Targets: (a) the regime-assigning process Γ(t) (which regime is active when), (b) one causal graph P_k + coefficients Φ_k per regime.

## 6. Validation design
- Synthetic: 5 low-dim cases (sign change, causal direction change, lag change, effect change, autocorrelation change) + higher-dim cases; N_R realizations each. Metrics: regime-reconstruction accuracy (fraction of time steps correctly assigned), link TPR/FPR per regime and pooled (TPR_all, FPR_all), linear-coefficient error ΔΦ, each compared against a reference (PCMCI run with the *true* regime variable known — TPR^ref, FPR^ref).
- Real: ENSO–AIR; no ground truth — validated against documented domain facts (negative ENSO→AIR summer link; winter independence; seasonality of regimes).
- No time-ordered splits; simulations + one real demonstration.

## 7. Numerical results / baselines
- Sign-change case (detailed): regime reconstruction matches truth in 99.6% of time steps (97% averaged over N_R); networks get TPR=0.99, FPR=0.01; per-link coefficient error 0.028 (9%).
- Across cases: "TPR is always very close to 1" despite regime-learning errors; FPR is higher than the known-regime reference because wrong regime assignments cause false positives/negatives; coefficient errors good except in the causal-effects case.
- N_K=3 experiments (Table 6, N_R=100 per example): TPR_all=0.98 vs TPR^ref_all=1.0; FPR_all=0.05 vs FPR^ref_all=0.01; ΔΦ=0.033 vs ΔΦ^ref=0.020.
- AICc correctly selects N_K in the {2,3} test scenarios (Fig. 8).
- ENSO–AIR real data (N_K=2, N_C=292 ≈ two seasons/year, α=0.01, α_PC=0.2, τmax=2 months, N_A=100, N_Q=100): top 13 annealing runs all find an ENSO→AIR link in one regime only, standardized effect −0.4 (one SD ENSO increase → 0.4 SD AIR decrease), regime 1 peaks June–September; regime 2 shows near-independence (weak −0.05 AIR→ENSO link, below the 0.1 plotting threshold). Matches documented climatology.

## 8. Code / data availability
Not stated in paper (no code link found in text). ENSO/AIR data sources stated (NOAA relative Niño3.4, IITM rainfall, via KNMI Climate Explorer URLs). tigramite provides PCMCI; the regime-learning wrapper is not stated to be public.

## 9. Leakage & limitations
Adversarial notes: (1) No public code — reimplementation of the alternating regime-learner is required (nontrivial: constrained optimization of Γ with persistence constraint). (2) N_K must be chosen (AICc helps but was only tested on {2,3}); wrong N_K splits/merges regimes. (3) N_C/N_M needs domain knowledge of regime duration — in sports, regime durations (injury spells, coordinator changes) are irregular. (4) Within-regime causal sufficiency — latent confounders still bite. (5) Annealing is expensive (N_A=100 × N_Q=100); 45 min for a toy N_K=3 problem suggests scaling pain at d≈30. (6) Hard γ_k(t) ≥ 0.5 subsetting in Step 1 discards uncertain assignments — can bias graphs near transitions. (7) Regime detection is backward-looking (uses full series) — not an online detector; live use needs a streaming variant.

## 10. GSE overlap
New capability and the direct answer to ledger 1963's limitation (stationarity). The existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has nothing on regime-dependent causal discovery; GSE has no mechanism for detecting when the causal structure of football itself changes (e.g. post-injury offensive scheme shifts, mid-season coordinator changes, weather-regime playoffs). Overlaps conceptually with Garrett's online-learning interest in the 15-area brief, but no existing implementation. Extension, not duplicate.

## 11. GSE implementation spec
- Data: nflverse team-week panel; each team-season = one series (T≈18). Since T=18 is short for regime learning, pool across teams: learn shared regimes per season (e.g. N_K=2: "stable" vs "disrupted") with team-specific graphs, or run on league-week aggregates (32 teams → T≈300+ weekly cross-sections).
- Nodes: subset of ~15 core indicators (EPA components, pressure, turnovers, injury counts, pace) to keep runtime manageable; ParCorr CI test.
- Protocol: N_K ∈ {2,3} selected by AICc; N_M ≈ 6 weeks (N_C = T/(N_M·N_K)); N_A=50, N_Q=50 annealings (halved from paper for cost); keep top-cluster runs by ε̂.
- Output: per-regime causal graphs; the live model uses the *current-regime* graph's Markov blanket, with regime identity estimated from the trailing 6-week window via the fitted Γ rule.
- Serving: offline quarterly; regime classifier (logistic on recent indicators → regime) is the only live component.
- Effort: ~5 engineer-days (reimplement alternating optimizer; no public code).

## 12. Reproducible test
Dataset: team-week panel 2015–2023; fit Regime-PCMCI per season on league-week series (N≈15 indicators, T=18). Test on 2024–2025: compare three feature sets in the game-outcome model — (a) full, (b) pooled-PCMCI graph (ledger 1963), (c) regime-specific graphs selected by the trailing-window regime classifier. Metrics: held-out Brier/log-loss; regime-assignment stability (does the classifier put ≥70% of weeks of known-disrupted team-seasons — e.g. starting-QB injury spells — in the "disrupted" regime?).

## 13. Acceptance / rejection gate
ADOPT regime-specific graphs if: (a) model (c) beats (b) by ≥0.003 Brier on 2024–2025 held-out; (b) AICc-selected N_K ≥ 2 in ≥60% of seasons (regimes are real, not forced); (c) the "disrupted" regime classifier recovers ≥70% of documented QB-injury-spell weeks; (d) per-regime link TPR on synthetic sports-like data (regime shifts injected into simulated team series) ≥ 0.85. Reject if (a) fails or AICc persistently selects N_K=1 (no regimes in football data at this resolution).

## 14. Improvement experiment
Beyond the paper: replace the paper's fixed-N_C persistence constraint with a *hierarchical* regime model — league-level regime process (rule changes, season phase) plus team-level regime processes (injuries, coordinator changes), coupled through a shared prior on transition counts. Hypothesis: two-level regimes explain more variance than one flat N_K (testable via AICc comparison), and team-level regimes will align with known injury/coaching events more sharply than league-level ones — turning the method from a descriptive tool into an automated "narrative detector" (e.g. "Team X's offensive causal graph changed in Week 9") for GSE content.
