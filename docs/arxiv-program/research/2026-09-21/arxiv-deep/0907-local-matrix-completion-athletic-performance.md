# [0907] Prediction and Quantification of Individual Athletic Performance (arXiv:1505.01147v2)

## Citation / full-text source

- arXiv:1505.01147v2 — full text: https://arxiv.org/pdf/1505.01147
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Duncan A.J. Blythe, Franz J. Király (2015). *Prediction and Quantification of Individual Athletic Performance*. arXiv:1505.01147v2 [stat.AP, stat.ML]. URL: https://arxiv.org/abs/1505.01147v2
**Ledger completed:** 2026-09-21. **Read:** full text (cached HTML conversion, incl. methods appendix and supplementary analyses S.I–S.IV).
## Verdict

**ADAPT** — local low-rank matrix completion with determinant circuits and variance-weighted averaging is a principled, fast imputation method for GSE's sparse player-week prop matrices, beating global matrix completion under realistic non-uniform missingness.

## 1. Research question
Can individual running performance be predicted more accurately than the state of the art (Riegel power law, Purdy points) by modeling the athlete×event performance matrix as locally low-rank — and does that model reveal a universal, parsimonious physiological structure (an individual power law plus two nonlinear corrections)?

## 2. Dataset / schema
- thepowerof10.info (British Athletics), excerpt to 2013-08-03, officially ratified competitions since 1954. After cleaning: **164,746 individuals** (101,775 male, 62,971 female), **1,407,432 performances** across 10 events: 100m (192,947), 200m (194,107), 400m (109,430), 800m (239,666), 1500m (176,284), Mile (6,590), 5000m (96,793), 10000m (161,504), Half-Marathon (140,446), Marathon (93,033).
- Schema: athletes.csv (athlete ID, gender, date of birth — missing for 114,168, recorded as 1900-01-01), events.csv (athlete ID, event type, date, performance in seconds).
- Main corpus = male athletes; two collation modes: "best" (year around each athlete's best event) and "random" (random calendar year). Access: available upon request subject to British Athletics approval (not open download).

## 3. Method / model
- **Local Matrix Completion (LMC), rank r** (Algorithm 1): to predict entry M[a,s*], take the target event plus the r log-closest events; restrict to rows with no missing entries (plus athlete a); repeat 400×: sample r distinct athletes, solve the circuit equation **det M[(a,a_1,…,a_r),(s*,s_1,…,s_r)] = 0** for the missing entry → candidate m_i; compute first-order variance estimate σ_i from two determinant variants (A_0 with entry 0, A_1 with entry 1); weight w_i = σ_i^{−2}; return inverse-variance weighted mean m*.
- Second stage: impute all missing entries with LMC rank 3, then SVD → universal components f_1,f_2,f_3 (right singular vectors) and per-athlete three-number summary (λ_1,λ_2,λ_3) from left singular vectors.
- Finding: f_1(s) ∝ log s (R²=0.9997) → **individual power law**; f_2 nonlinear (speed↔endurance balance); f_3 parabolic extremum at middle distances (specialization).
- k for k-NN tuned from {1,5,20} minimizing OOS RMSE on 5×50 validation points; bagged variants weight via Gaussian RBF kernel exp(γΔΔᵀ), γ ∈ {−0.001,−0.01,−0.1,−1,−10} selected by CV.

## 4. Equations & assumptions
- Low-rank model (Eq. 1): **log t = λ_1 f_1(s) + λ_2 f_2(s) + … + λ_r f_r(s)**, r = 3 optimal. Riegel is the special case λ_1 = 1.06 ∀ athletes, f_1 = log s, λ_2 f_2 = c.
- Circuit equation: det M[(a,a_1,…,a_r),(s*,s_1,…,s_r)] = 0 solved for the missing entry; first-order weight: σ_i ← 1/|det A_0 + det A_1| + |det A_0|/(det A_0 − det A_1)², w_i ← σ_i^{−2}, m* ← (Σ w_i m_i)/(Σ w_i).
- Synthetic model (Eq. 2): log(t) = λ_1 f_1(s) + λ_2 f_2(s) + λ_3 f_3(s) + η(s), η stationary zero-mean Gaussian white noise; plausible Std(η) = 0.01.
- Assumptions: athlete performances statistically independent across athletes (justifies using other athletes' future results); low-rank generative structure; log-closest events are the relevant conditioning set; missingness ignorable given the local pattern.

## 5. Features / target
No hand features: the full athlete×event matrix is the model. Inputs = observed performances of athlete a in other events (+ all other athletes' performances as reference). Target = single held-out performance, in three parameterizations: log-time, time normalized by event mean, speed. Best results in log-time / normalized time.

## 6. Validation design
Out-of-sample leave-one-out over 1000 randomly omitted single performances; athletes restricted to ≥3 attempted events (rank 2 needs 2 observed + 1 held out); percentile bands (top 95%, top 25%); both collation modes; year-of-best vs random year; past-only prediction variant (Table 4) to check temporal leakage. Significance: non-overlapping 95% bootstrap CIs; two-sided Wilcoxon signed-rank on absolute errors. Baselines: event mean, k-NN, Riegel (α=1.06), global power law, per-athlete power law, Purdy points, EM multivariate-Gaussian, nuclear-norm minimization.

## 7. Numerical results / baselines
- Table 2, log-time RMSE, 0–95th pct, ≥3 events, "best": mean 0.131±0.003; k-NN 0.122±0.003; ind.power-law 0.103±0.004; Riegel 0.0982±0.005; power-law 0.0973±0.005; **Purdy 0.061±0.003**; nuclear-norm 0.391±0.05; EM 0.0566±0.003; **LMC rank1 0.0586±0.003; LMC rank2 0.0515±0.003** — LMC rank 2 best, beats Purdy/EM at **p ≤ 1e-4** (Wilcoxon). Rank 1 beats Purdy only on best-year top athletes (p=5.5e-3).
- Relative time errors (Tables 5–6): LMC rank 2 ≈ **2% relative RMSE / MAE** for top-25% athletes; "average prediction error of under 4 minutes" for elite marathon (~3–4 min avg).
- Rank selection (Table 7, top 25%, ≥4 events): r1 0.0446±0.002, r2 0.0328±0.001, **r3 0.0309±0.001**; ≥5 events: 0.0518/0.0408/0.040/0.0408 → rank 3 optimal, rank 4 no gain.
- Rank2-over-rank1 RMSE improvement by distance: **26.3% short (100m,200m), 29.3% middle (400m,800m,1500m), 12.8% mile→HM, 3.1% marathon** (all p=1e-3) — inter-athlete variability largest at short/middle distances.
- Individual exponent λ_1: median **1.12** (5th/95th pct: 1.10/1.15) vs Riegel WR exponents 1.08 (elite)/1.06 (senior). f_1 linear in log-log with R²=0.9997; rank-3 model fits WR data nearly exactly (rank-1 component R²=0.99 vs linear WR fit R²=0.93) — "broken power law" explained as epiphenomenon of individual heterogeneity.
- Elite three-number summaries (Table 1): Bolt (1.11, −0.367, 0.0813); Farah (1.08, 0.0325, −0.0761); Gebrselassie (1.08, 0.114, −0.0556); Rupp (1.08, 0.104, −0.0395); Coe (1.09, −0.0847, −0.0359); Sunada (1.09, 0.138, −0.00917); Radcliffe (1.10, 0.189, 0.0254).
- Headline predictions: fair Farah–Bolt race at **492m (95% CI 374–594m)**; Lemaitre 43.5±1.3s / Gemili 43.2±1.3s over 400m; Bekele 2:00:36 ±3.6 min marathon.
- Runtime (S.I.h): LMC **orders of magnitude faster** than nuclear-norm and EM per single-entry completion; robust to matrix size (tested 2^8–2^13 athletes).
- Synthetic validation (S.II.a): with clustered (consecutive-distance) missingness, LMC RMSE → 0 as noise → 0 while nuclear-norm stays elevated — global MC fails under realistic missingness patterns; components recovered almost exactly by LMC+SVD pipeline.
- Phase transitions: pivoting anti-correlation for triples below 5km (slower short → faster long), reversal above 5km; kink in f_2 and zero-crossing of f_3 at ~800m.

## 8. Code / data availability
"Full code of our analyses can be obtained from [download link will be provided here after acceptance]" — i.e., not actually provided in the arXiv version. Data: upon request, subject to British Athletics approval. Reimplementation from Algorithm 1 pseudocode is feasible.

## 9. Leakage
Validation modes (i) allows using the athlete's own future performances in other events (non-causal within athlete); mode (ii) restricts to the athlete's past events — results "qualitatively similar" (Table 4 vs Table 2), and authors argue cross-athlete leakage is implausible. Outlier trimming (top 5% outlier-score rows removed; 44 superhuman/subhuman performances removed) is defensible. Preferred-distance/behavioral summaries are computed on the collated matrix — fine for description, would leak if used as prediction features.

## Limitations
- Manuscript explicitly marked "work in progress… treat presented results as preliminary" (never peer-reviewed in this form).
- Running-only, UK-only, male-focused; individual power law claimed "universal" but subgroups show second/third component variation.
- LMC needs ≥ r+1 observed entries per row — cold-start athletes unserved (though EM/nuclear-norm baselines cover 0-observed cases).
- Determinant circuits assume exact low rank; noise handled only via averaging — no principled uncertainty quantification on m* beyond bootstrap.
- No code or data actually released despite the statements.

## 10. GSE overlap
Nothing in the existing-research-map covers matrix completion for sparse player performance data. The 2026-09-18 ML brief lists "representation learning on play-by-play" and "tabular learners" as commissioned topics, but no low-rank/local-completion method has been read. GSE's prop lane repeatedly faces the sparse-history problem (rookies, role changes, few games) — currently handled by shrinkage/averaging. This is a **new capability**, not a duplicate.

## 11. GSE implementation spec
1. Build player×stat-category (or player×week) matrices from nflverse: e.g., rows = WRs, columns = {targets, rec yards, aDOT, YAC, TD} per-week or per-season; log-transform rates.
2. Implement LMC rank 2–3 per Algorithm 1 (400 determinant circuits, inverse-variance weighting) to impute missing player-weeks (bye, injury, DNP) and to predict next-week stat lines from the nearest stat columns.
3. Extract the SVD three-number summary per player as a specialization embedding: λ_1 ≈ overall level, λ_2 ≈ possession-vs-explosive axis, λ_3 ≈ role/scheme specialization — feed as features into the prop model.
4. Benchmark vs current EM/shrinkage imputation and vs per-player power-law-style scaling on 2024–2025 holdout.
5. Effort: medium — ~1 week to implement + validate; no new data needed.

## 12. Reproducible test
Dataset: nflverse 2022–2025 player-week receiving stats (WR/TE, ≥3 games). Protocol: leave-one-player-week-out; predict log receiving yards with (a) column mean, (b) k-NN, (c) EM Gaussian imputation, (d) LMC rank 2/3. Metric: out-of-sample RMSE/MAE, Wilcoxon signed-rank on absolute errors.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT LMC imputation for the prop pipeline iff LMC rank 2 or 3 beats EM imputation by ≥ 5% relative RMSE with Wilcoxon p < 0.01 on the 2024–2025 holdout; also require rank-3 SVD specialization embedding to add ≥ 0.005 OOS R² when appended to the existing prop feature set. Otherwise REJECT.

## 14. Improvement experiment
The paper's circuits use only the r log-closest columns; their own bagged variant found no gain from wider support in running. For NFL stats, column "closeness" is semantic (targets≈receptions≈yards form one block; TDs noisier) — learn the conditioning set per target via cross-validated column selection instead of distance. Second: replace the fixed 400-circuit budget with an adaptive stopping rule on the effective sample size of weights, cutting runtime further for production inference.

**Verdict: ADAPT** — the local-completion machinery (determinant circuits + variance weighting + low-rank specialization embedding) ports cleanly to GSE's sparse player-stat matrices.
