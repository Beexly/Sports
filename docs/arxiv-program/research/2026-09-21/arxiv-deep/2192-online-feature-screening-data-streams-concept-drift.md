# [2192] Online Feature Screening for Data Streams with Concept Drift (arXiv:2104.02883v1)

**Citation:** Mingyuan Wang and Adrian Barbu (2021, Florida State Univ., Dept. of Statistics). *Online Feature Screening for Data Streams with Concept Drift*. arXiv:2104.02883v1. URL: https://arxiv.org/abs/2104.02883
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF; ar5iv HTML conversion unavailable — fatal error).
**Verdict:** ADAPT

*Rationale:* five classic screening criteria (T-score, Fisher, Gini, Chi-square, MI) rebuilt as one-pass online algorithms with sparse-input handling and fading-factor drift adaptation. The quantile-summary machinery provably matches offline scores (zero rank error at ε < 0.01), and adaptation beats no-adaptation on drifting streams and on 3.2M-feature URL data. Adapt as the always-on feature monitor for GSE's weekly model refresh: incrementally re-rank the feature pool as each week's games land, with fading memory so post-drift features surface without a full recompute.

## 1. Research question
Classical screening (filter) feature selection assumes complete batch data. Modern streams are high-dimensional, sparse, streaming, and drifting. Can five standard criteria — T-score, Fisher score (mean-variance based), Gini index, Chi-square, mutual information (quantile/bin-count based) — be extended to exact-or-nearly-exact online versions handling sparsity and concept drift, matching their offline rankings at lower time/storage cost?

## 2. Dataset / schema
Online-vs-offline: Gisette (5000×7000), Dexter (20000×600), Madelon (500×2600), Dorothea (100000×1150), SMK-CAN-187 (19993×187), GLI-85 (22283×85), URL Day0 (74110×16000), KDD12 (48957×16000). Drift: synthetic 1000-D, 100 true features, 100k samples, true-feature indices shift every l samples. Realistic: 20NewsGroups (723,066 binary features, 11,862 emails, time-ordered), URL days 0–99 (3.2M features, 2M samples).

## 3. Method / model
- **Mean-variance methods (T-score, Fisher):** sufficient statistics via running averages μ_nj, MS_nj (mean of squares); variance = MS − μ²; scores incrementally **exact**. Sparse input: accumulate only on non-zero appearances, track sample counts. Drift: fading factor α ∈ (0,1) penalizes history: μ_n = α(n−1)μ_{n−1} + x_n (sparse variant uses time anchors n_last and universal weight maps to recover penalized zero-weights cheaply).
- **Quantile methods (Gini, Chi-square, MI):** improved Greenwald-Khanna-style weighted quantile summary (multi-level sub-summaries, PRUNE/MERGE, ε-approximate) with a novel **exact weight preservation** adjustment in PRUNE (reassigns dropped tuples' weights so the ε-approximate guarantee holds with exact bin counts), then on-demand aggregation into K=5 quantile bins. Sparse: zeros injected as a single (0, w) point at query time. Drift: fading applied to tuple weights, split into cheap s₀-level updates + penalized PRUNE/MERGE updates (W_i = α^k W_{i−1}).
- **Minibatch** (250) to amortize per-feature summary visits.

## 4. Equations & assumptions
- T_j = (μ_{1}−μ_{2})/√(σ₁²/n₁ + σ₂²/n₂) (Eq. 1); Fisher_j = Σ_c n_c(μ_c−μ)² / Σ_c n_c σ_c² (Eq. 2); MI, Chi-square, Gini from bin counts (Eqs. 4–6).
- ε-approximate quantile guarantee: |r̃⁺(x) − r̃⁻(x) − w̃(x)| ≤ ε·w(Q) (Eq. 15); their PRUNE adjustment drives the LHS to zero.
- Assumptions: (i) fading factor α is user-set (0.9 in drift experiments) — no automatic drift detection; (ii) quantile methods assume bin-count criteria are adequate proxies (K=5 fixed); (iii) feature independence in screening (univariate scores, no interactions).

## 5. Features / target
Features: raw high-dimensional streams (screening over features, not extraction). Targets: binary class labels; metrics: detection rate @k (synthetic), misclassification error (real).

## 6. Validation design
(1) Online-vs-offline parity: count differences per bin per feature, score difference ratio DR (Eq. 19), top-10% rank mismatch ratio, timing vs minibatch size and ε. (2) Drift: detection rate @500 across shift rates l and fading factors, with/without adaptation. (3) Realistic: SparseFSA and SGD learners with/without screening ± adaptation; runtime and error.

## 7. Numerical results / baselines
- **Parity:** bin-count differences → 0 for ε ≤ 0.001 on all 7 datasets (Table 4); score DR = 0 at ε ≤ 0.001 (Table 5); top-10% rank mismatch = 0 at ε < 0.01 even on hardest sets (Table 6). Chosen operating point: minibatch 250, ε = 0.001.
- **Speed:** online quantile (ε=0.001) vs offline — url: 19,094 vs 130,177 ms (~7×); dorothea: 4,285 vs 11,961 ms; gisette: 1,176 vs 4,018 ms. Caveat: at ε=0.0005 url explodes to 934,553 ms — worse than offline; precision has a sharp cost cliff.
- **Drift (synthetic):** with adaptation (α=0.9) strictly dominates without at every shift rate; even at the fastest shift (true set changes every 250 samples), adaptation detects all 100 true features with fewer selected features. Tuning α compensates faster drift (Fig. 2 heatmap).
- **20NewsGroups + SparseFSA:** MI with adaptation: error **0.061** vs 0.064 no-screening vs 0.062 without adaptation; random 70k: 0.144.
- **URL (3.2M feats) + SGD:** T-score with adaptation: **0.0073** vs 0.0080 no-screening vs 0.0097 without adaptation; Fisher with adaptation **0.0072** vs 0.0092. Screening runtime 63–205 s vs SparseFSA training 12,484 s — screening is ~2% of training cost.

## 8. Code / data availability
Datasets public (NIPS 2003 challenge, URL, KDD12, 20NewsGroups). Implementations in MATLAB 2018b by the authors; no public repo link extracted from this read.

## 9. Leakage & limitations
Adversarial read: (i) univariate screening ignores interactions — a feature useless alone but lethal in combination is dropped (complements 2189/2190, which find interactions); (ii) fading factor is hand-set, no drift detector — wrong α either lags regime change or forgets stable signal; (iii) ε cost cliff (934 s at ε=0.0005) means the operating point is fragile on wide streams; (iv) K=5 bins fixed — coarse for heavy-tailed sports metrics; (v) real-data wins are small in absolute terms (0.061 vs 0.064) and one table (URL+SparseFSA) shows no improvement from screening at all; (vi) classification-only framing; GSE's log-loss targets need the scores re-derived, though T-score/Fisher generalize naturally.

## 10. GSE overlap
GSE rebuilds models weekly as games land; feature relevance drifts across eras (2184/2185). This paper is the **streaming feature monitor**: maintain online T-score/Fisher/MI over the pooled feature streams (gse-lab + catch22 + signatures + TCTO crosses) with a fading factor, so each week's refresh starts from an up-to-date importance ranking instead of a stale hand-picked set. Nothing in GSE does incremental screening today — selection is batch and manual. Pairs with 2191 (NFS): NFS does deep supervised pruning at train time; this does cheap always-on univariate monitoring between trains, flagging when a faded score crosses a threshold (regime-shift alarm for the pick desk).

## 11. GSE implementation spec
1. Reimplement the two cheapest exact methods first: online T-score and Fisher with fading (running μ/MS per class — spread-cover / over-under as binary labels), sparse-aware via appearance counts.
2. Add the quantile-summary MI for continuous metrics (K=8 bins, ε=0.001, minibatch=one week of games).
3. Run over 2015–2024 game stream in chronological order; α ∈ {0.9, 0.95, 0.99} chosen by 2023 validation log-loss of a top-40-feature model.
4. Wire into the weekly pipeline: every Tuesday, emit re-ranked feature list + drift flags (features whose rank moved > 20 places week-over-week).
5. Effort: ~3 engineer-days (the exact mean-variance part is ~100 lines; quantile summary ~300).

## 12. Reproducible test
Dataset: gse-lab team-game features 2015–2024 streamed chronologically, binary cover label. Protocol: maintain online scores with α=0.95; at each season boundary, take top-40 by faded T-score, train LightGBM on all prior seasons, test on the new season. Baselines: (A) top-40 by full-history offline T-score (no fading), (B) hand-picked current features. Report per-season log-loss 2019–2024.

## 13. Acceptance / rejection gate
**Accept iff** the faded online top-40 matches-or-beats baseline A on average 2019–2024 log-loss (Δ ≥ 0.001) AND the online scores reproduce offline scores within rank-mismatch < 1% on a static snapshot (parity check from §3.1). Reject if fading adds nothing over full-history screening (no drift worth adapting to — then keep the cheaper offline version), or if weekly rank churn is so high the feature set is unstable (fading factor too aggressive — retune α before rejecting).

## 14. Improvement experiment
Beyond the paper: **drift-triggered reselection**. The paper fades continuously; GSE should discretize — keep the faded scores as a monitor, but only swap the production feature set when a drift statistic (e.g., top-40 Jaccard similarity between consecutive months < 0.7) fires, and log every swap with its trigger. This turns the paper's continuous adaptation into an auditable regime-change detector: each feature-set change is an event the pick desk can see, backtest, and explain — "after Week 6 2023, pressure-rate features replaced pace features," which is content as well as modeling.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2104.02883 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
