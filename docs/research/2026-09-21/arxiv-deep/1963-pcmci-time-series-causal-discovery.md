# [1963] Discovering contemporaneous and lagged causal relations in autocorrelated nonlinear time series (arXiv:2003.03685)

**Citation:** Jakob Runge (2020). *Discovering contemporaneous and lagged causal relations in autocorrelated nonlinear time series datasets*. arXiv:2003.03685. URL: https://arxiv.org/abs/2003.03685
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; method sections 2–3, Theorems 1–4, experiments §4, supplement skimmed for implementation notes).
**Verdict:** ADAPT

## 1. Research question
CI-based causal discovery (PC algorithm and its time-series adaptations) suffers low recall and inflated false positives under strong autocorrelation — ubiquitous in real time series. Can a constraint-based method be designed that (a) discovers both lagged (τ>0) and contemporaneous (τ=0) causal links, (b) is consistent in the oracle case and order-independent, and (c) actually *benefits* from autocorrelation by optimizing the choice of conditioning sets in CI tests?

## 2. Dataset / schema
Simulation-only (no real data): additive model X_t^j = a_j X^j_{t-1} + Σ_i c_i f_i(X^i_{t−τi}) + η_t^j. Autocorrelations a_j ~ U[max(0,a−0.3), a]; L = ⌊1.5·N⌋ cross-links per model (N=2 → L=1); 30% contemporaneous (τ_i=0), rest τ_i ~ U{1,…,5}; c_i ~ ±U[0.1, 0.5]; η i.i.d. Gaussian N or Weibull W (scale 2), sd ~ U[0.5, 2]; only stationary models kept. Setups: linear Gaussian, linear mixed noise (50/50 Gaussian/Weibull), nonlinear mixed (50% linear, 50% f^(2)(x) = (1+5xe^{−x²/20})x; 66/34 Gaussian/Weibull). Defaults: N=5, T=500, a=0.95, τmax=5, α=0.01; 500 realizations per setting. Schema: N-variate time series of length T.

## 3. Method / model
PCMCI+ (extends PCMCI, Runge et al. 2019b, to contemporaneous links):
- Phase 1 — lagged skeleton (Alg. 1): PC-style edge removal restricted to lagged candidate parents B̂^−_t(X^j_t) = X^−_t = (X_{t−1},…,X_{t−τmax}). Iterates conditioning-set size p = 0,1,…; tests CI(X^i_{t−τ}, X^j_t, S) with S = first p variables of B̂^−_t \ {X^i_{t−τ}}; removes when p-value > α_PC; tracks I^min = min over tests of |I| (test statistic) and sorts survivors by I^min descending — this ranking is the key device for the later MCI tests.
- Phase 2 — contemporaneous skeleton (Alg. 2): PC full-skeleton over τ=0 pairs, but every CI test uses *optimized conditioning sets* — the Momentary Conditional Independence (MCI) idea: condition on the estimated lagged parents of both variables (plus contemporaneous conditions), which makes tests well-calibrated under autocorrelation instead of degraded by it.
- Phase 3 — orientation: time-order orients all lagged links automatically (past → future); contemporaneous links oriented via collider phase (restricted triples X^i_{t−τ}→X^k_t ∘−∘ X^j_t) and Meek-style rules R1–R3 adapted to time series (Algs. S2/S3). Majority-rule and conservative variants; triples with inconsistent separating sets marked ambiguous, conflicting orientations flagged — hence order-independent.
- CI tests: ParCorr (linear), GPDC (Gaussian-process + distance correlation on residuals, nonlinear additive noise).
- Theory: Theorem 1 — soundness (Alg. 2 returns correct adjacencies) under causal sufficiency, Causal Markov, *Adjacency* Faithfulness, consistent CI tests (oracle), stationarity, time-order, correct τmax. Theorems 2–4 — completeness of the orientation phases. PCMCI+ thus consistent under weaker-than-Faithfulness assumptions.
- Code: tigramite Python package, https://github.com/jakobrunge/tigramite.

## 4. Equations & assumptions
- Generative SCM: X^j_t = f_j(P(X^j_t), η^j_t), f_j arbitrary measurable, η^j_t mutually and serially independent noise (eq. 1).
- Time series graph G assumed acyclic, links stationary (X^i_{t−τ}→X^j_t ⟹ same at all t′), infinite in time but truncated at τmax.
- MCI conditioning: for pair (X^i_{t−τ}, X^j_t) the test conditions on optimized parent sets rather than arbitrary subsets — the paper's central claim is that this both raises power and controls FPR under autocorrelation.
- Assumptions listed explicitly (§3.2 end): Causal Sufficiency, Causal Markov Condition, Adjacency Faithfulness, consistent (oracle) CI tests, stationarity, time-order, maximum lag known/covered by τmax.

## 5. Features / target
Unsupervised: inputs are the N raw time series (no feature engineering); target is the time series causal graph G* (skeleton + orientations) over (variable × lag) nodes — i.e., which lagged/contemporaneous links exist and their directions.

## 6. Validation design
Ground-truth graph recovery over 500 simulated realizations per setting; metrics: adjacency TPR/FPR split by lagged cross-links / contemporaneous / autodependency; contemporaneous orientation precision (fraction of correctly oriented among estimated) and recall (fraction of true contemporaneous correctly oriented); fraction of conflicting links. Baselines: PC-stable (majority rule), GCresPC (Granger causality + PC on residuals, Moneta et al. 2011), autoregressive LiNGAM (Hyvärinen et al. 2010, LASSO pruning, no α-control). CI test matched across methods (ParCorr linear / GPDC nonlinear). Vary a, N, T, τmax one at a time (Fig. 3). Runtimes on Intel Xeon Platinum 8260. Splits not time-ordered — simulations, but the data-generating process itself is temporal.

## 7. Numerical results / baselines
(Numbers are read from the paper's text description of Fig. 3; exact curve values live in figures, not tables — quoted claims are the paper's.)
- Linear Gaussian, defaults N=5, T=500, a=0.95, τmax=5, α=0.01: PCMCI+ and GCresPC contemporaneous TPR stable under high autocorrelation; PC and LiNGAM show "strong declines". Lagged TPR "decreases strongly" for PC; others robust.
- FPR "well-controlled for PCMCI+" while PC (and slightly GCresPC) show inflated lagged FPR at high autocorrelation; LiNGAM strong lagged-FPR increase.
- Contemporaneous orientation recall *increases* with autocorrelation for PCMCI+, decreases for all others; PCMCI+ has "more than twice as much contemporaneous recall" vs other methods at larger N and is "almost not affected" by higher N.
- Conflicts: "almost no conflicts" for PCMCI+; PC conflicts increase with autocorrelation.
- Runtime: increases for PCMCI+ and "much stronger" for PC (with high variability); GCresPC/LiNGAM flat; GPDC vs ParCorr "orders of magnitude longer", and GPDC "seems to not work well in high-dimensional, highly autocorrelated settings" (slight FPR inflation for high autocorrelation noted).

## 8. Code / data availability
Code: tigramite at https://github.com/jakobrunge/tigramite (stated). No real datasets; simulation recipe fully specified in §4 + supplement.

## 9. Leakage & limitations
Adversarial notes: (1) Pure simulation — no real-world validation in the paper; performance on non-additive, regime-switching sports dynamics is untested. (2) Causal sufficiency assumed — sports has massive latent confounding (weather, motivation, officiating crews); unobserved common drivers will create spurious edges. (3) Stationarity assumed — NFL regimes shift within seasons (injuries, trades); the paper notes the assumption "may be relaxed" but provides no mechanism. (4) Orientation only up to Markov equivalence for contemporaneous links; many contemporaneous sports links (e.g. offensive vs defensive EPA same week) may be unidentifiable from observational data alone. (5) τmax must cover true lags — misspecification effects studied but real-world lag structure unknown. (6) GPDC (the nonlinear test sports likely needs) is orders of magnitude slower and degrades in high dimensions — practical bottleneck at d≈35. (7) Acyclicity over time-unrolled graph is trivially satisfied for lagged links, but contemporaneous acyclicity is a real restriction on same-week football metrics.

## 10. GSE overlap
New capability. The existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has "causal inference" as a brief topic (player-level injury *effect estimation*, thin) and FineCausal (2503.23911, effect estimation) — nothing on time-series causal *structure* learning. GSE models team strength with engineered indicators but has no learned lag structure; current feature engineering implicitly assumes contemporaneous relationships. PCMCI+ fills the specific gap ledger 1962 (NOTEARS) leaves: NOTEARS assumes i.i.d. rows and would confound lagged with contemporaneous effects on autocorrelated team-week data; PCMCI+ is the time-native complement. Duplicates nothing.

## 11. GSE implementation spec
- Data: nflverse team-week panel 2015–2026. Treat each team-season as one multivariate series (N≈30 indicators, T≈18 weeks); run PCMCI+ per team-season, then aggregate edge frequencies across team-seasons (stability selection over ~380 team-seasons).
- Nodes: EPA components, success rate, pressure/sack rates, turnover luck metrics, explosive play rates, pace, rest/travel, injury counts, market spread/total. τmax = 4 weeks.
- CI tests: ParCorr first (fast, paper shows it dominates); GPDC only for nonlinear confirmation on the top-50 stable edges.
- Training: tigramite PCMCIplus, α=0.01, τmax=4; bootstrap within team-season for edge stability; retain edges with cross-team-season frequency ≥ 0.4.
- Serving: offline quarterly graph artifact feeding the same Markov-blanket feature-pruning pipeline as ledger 1962; lagged edges inform which lagged features (t−1…t−4) survive in the prediction stack.
- Effort: ~3 engineer-days (mature package; main work is panel adaptation + stability aggregation).

## 12. Reproducible test
Dataset: team-season series 2015–2023 for graph learning, 2024–2025 held-out. Baseline: GSE outcome model using all lags 0–4 of all indicators. Treatment: same model restricted to features reachable in the PCMCI+ graph (parents/children of the target at lags 0–τmax). Metrics: held-out Brier + log-loss; feature-count ratio; edge-stability Jaccard across team-season splits.

## 13. Acceptance / rejection gate
ADOPT the PCMCI+-pruned feature set if: (a) held-out 2024–2025 Brier within 0.002 of the all-lags baseline (or better) while using ≤60% of features; (b) median cross-team-season edge Jaccard ≥ 0.5 for retained edges; (c) contemporaneous orientation precision on edges where football domain knowledge fixes direction (e.g. pressure→sacks, turnovers→EPA) ≥ 0.75. Reject if Brier worsens >0.003, stability <0.5, or ParCorr and GPDC graphs disagree on >50% of retained edges (linearity failure).

## 14. Improvement experiment
Beyond the paper: (a) drop the stationarity assumption the paper punts on — run PCMCI+ in sliding 6-week windows and test whether edge sets drift (regime-change detection; unstable edges get down-weighted in the live model); (b) multi-team joint discovery: stack team-seasons as independent realizations of one PCMCI+ run (tigramite supports multi-dataset mode) instead of per-team aggregation, testing whether pooled estimation raises recall on rare edges like injury→performance links. Hypothesis: pooled multi-team PCMCI+ finds stable low-frequency causal links (injury counts → EPA at τ=1–3) that per-team runs miss at T=18, verifiable via the gate's stability metric.
