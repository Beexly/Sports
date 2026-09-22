# [2005] Data Shapley Valuation for Efficient Batch Active Learning (arXiv:2104.08312)

**Citation:** Ghorbani, A., Zou, J., Esteva, A. (2021). *Data Shapley Valuation for Efficient Batch Active Learning*. arXiv:2104.08312. URL: https://arxiv.org/abs/2104.08312
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
**Verdict rationale:** Data Shapley as a pre-selection filter for batch AL: 6x average efficiency gain plus robustness to noisy/domain-shifted pools; the data-valuation half of the lane, directly applicable to valuing GSE's data feeds and filtering harmful training games, but the KNN-Shapley machinery needs labeled data and a good representation space.

## 1. Research question
Can the Shapley value of data — a direct, axiomatic measure of each point's expected contribution to model performance — be used as a pre-selection filter for batch active learning, so that expensive diversity methods (Coreset, BADGE, K-Medians) run on a small high-value subset instead of the whole pool, gaining efficiency without losing performance, and gaining robustness when the pool is noisy, heterogeneous, or domain-shifted?

## 2. Dataset / schema
- Curated: CIFAR-10 (50k), CINIC-10 (250k: 50k CIFAR-10 + 200k ImageNet, 10 classes), Tiny ImageNet (100k, 200 classes), SVHN (70k + 500k extra images used as the large pool).
- Noisy/realistic: SVHN-extra with 80% of images corrupted by white noise (power sampled from a Beta distribution, varied quality); Cheap-10: 500k web-scraped images via Bing (10× CIFAR-10, "a few hours of effort"), containing out-of-distribution, noisy, and mislabeled examples.
- Model: WideResNet (16-8 for character tasks, 24-10 otherwise); initial labeled pool 5,000; batch 5,000/iteration; retrain from scratch each iteration; 500 held-out test examples for early stopping AND for approximating Data Shapley values; results on the rest of the test set. All public.

## 3. Method / model
Active Data Shapley (ADS) — a filtering layer in front of any diversity-based batch AL method (Figure 1–2):
1. Train the deep model on the labeled pool; extract pre-logit representations.
2. Compute EXACT Data Shapley values of labeled points with the linear-time KNN-Shapley dynamic program (Jia et al. 2019, ref [18]) on a KNN classifier in representation space ("a KNN model on top of a deep network's pre-logit layer achieves similar accuracy to the model's accuracy"; only values contribution to prediction, not to representation learning).
3. Distributional Shapley interpolation (Ghorbani et al. 2020, ref [10]; Lipschitz continuity in value): train C class-conditional KNN regressors (one per class) on labeled points' Shapley values to predict values for unlabeled points; per unlabeled xᵘ compute Shapley((xᵘ, y_c)) for each candidate class (top-10 confident classes when C large), aggregate optimistically: Shapley(xᵘ) := max_c Shapley((xᵘ, y_c)) (max beat mean/weighted-mean in practice).
4. Pre-select the top fraction (2–10× B; 30% for CIFAR-10, 20% for CINIC-10/Tiny ImageNet, 10% for the large noisy pools) by estimated value; run the diversity method (Coreset/BADGE/K-Medians) on the pre-selected subset only; label the resulting batch B.
Motivating pathology: uncertainty/representativeness methods fail when a minority cluster hurts a linear classifier (Figure 3: minority-cluster points get very low Shapley values; removing low-value points then sampling representatively "greatly improves performance").

## 4. Equations & assumptions
- (1) Batch AL objective: max_{s¹ ⊆ N\s⁰, |b|=B} v(s⁰ ∪ s¹), v(s) = expected test performance of model trained on s.
- (2) Data Shapley: φ(z) = Σ_{i=0}^{N−1} Σ_{s ⊆ N−{z}, |s|=i} [v(s∪{z}) − v(s)] / C(N−1, |s|) — weighted average of marginal contributions over all subsets; uniquely satisfies null-element, symmetry, linearity axioms.
- (3) Permutation form: φ(z) = E_{π∼Π}[v(s_π^z ∪ {i}) − v(s_π^z)] (basis of TMC-Shapley MC approximation; infeasible for DNNs at O(N² log N) retrains — hence KNN-Shapley).
- Aggregation: Shapley(xᵘ) := max_{c ∈ C} Shapley((xᵘ, y_c)).
- Assumptions: KNN on pre-logit features ≈ full model accuracy; Lipschitz continuity of distributional Shapley values (similar points ⇒ similar values) justifies regressor interpolation; value estimated w.r.t. a fixed 500-example validation proxy of test performance.

## 5. Features / target
Features: pre-logit representations of WideResNet. Target: Shapley value of a (point, label) pair w.r.t. validation accuracy; unlabeled points get interpolated values per candidate class. Downstream AL target: classification accuracy.

## 6. Validation design
- Efficiency: time per batch for Coreset, K-Medians, BADGE with/without ADS on pools of 50k–500k (Cheap-10, SVHN-extra, CINIC-10, Tiny ImageNet, CIFAR-10); reported times include Shapley regression+prediction.
- Effectiveness (curated): first 5 AL iterations, ADS-Coreset vs Coreset vs Entropy vs Random on CIFAR-10, CINIC-10, Tiny ImageNet.
- Effectiveness (noisy): (a) domain shift — CINIC-10 pool, CIFAR-10 test; (b) corruption — SVHN-extra pool with 80% Beta-noise-corrupted, SVHN test; (c) cheap web data — Cheap-10 pool, CIFAR-10 test. ADS-Coreset vs Coreset, Entropy, Random.
- No time-ordered splits; i.i.d. vision benchmarks (+ synthetic noise).

## 7. Numerical results / baselines
- Efficiency: ADS enhancement yields 2.6–8× speedup of the diversity step across methods/datasets (Figure 4); "average factor of 6×" (abstract), "about 6.4×" on curated sets; gains grow with pool size (diversity methods are ~O(n³), ADS pre-selection is linear-time KNN-Shapley + regression).
- Table 1 (first-iteration accuracy, %; Cheap-10 500k / SVHN 500k / CINIC-10 250k / Tiny ImageNet 100k / CIFAR-10 50k): K-Median 63.4/94.9/64.5/34.2/85.4 vs K-Medians+ADS 63.3/95.5/65.2/34.1/85.4; Coreset 63.1/93.1/64.7/34.3/86.2 vs Coreset+ADS 63.4/93.4/64.7/34.4/86.4; BADGE 63.9/95.0/70.4/–/87.8 vs BADGE+ADS 64.3/95.4/70.4/–/87.2 (BADGE omitted on Tiny ImageNet as "computationally prohibitive"). → Performance preserved or slightly improved everywhere while running 2.6–8× faster.
- Curated (Figure 5 left): ADS-Coreset matches Coreset on all three datasets; both beat Entropy and Random.
- Noisy (Figure 5 right): domain shift — ADS-Coreset top (finds CIFAR-relevant points in CINIC-10 mix); corruption — ADS-Coreset best; Cheap-10 — ADS-Coreset "significantly outperforms" all AL methods (random surprisingly strong second).
- Graphical toy (Figure 3): removing low-Shapley minority-cluster points then sampling representatively beats uncertainty-only, representativeness-only, and random selection.

## 8. Code / data availability
None stated in paper (no code URL; Cheap-10 scrape described but no release link). KNN-Shapley algorithm from Jia et al. 2019 (ref [18]).

## 9. Leakage & limitations
- Paper's own caveat: "the ADS pipeline depends on the quality of the value estimation; if we are unable to properly estimate unlabeled points' values, the method's performance will suffer."
- KNN-Shapley ignores the point's contribution to representation learning (values only the prediction head) — for GSE's engineered features this is less of an issue (features are fixed), but for learned embeddings it understates value.
- The optimistic max-over-classes aggregation is a heuristic; miscalibrated class confidences distort it.
- Value is estimated against a 500-example validation proxy — small proxy, noisy Shapley targets; interpolation regressor compounds the noise.
- Negative Shapley values are meaningful (harmful points) but the pipeline only uses them for filtering, not diagnosis.
- No cost-awareness; vision classification only.

## 10. GSE overlap
No data-valuation machinery in the existing map. Two distinct GSE applications, both new: (a) TRAINING-data valuation — which historical games/plays have negative Shapley value for the engine (COVID-season games, games with bad injury data, preseason)? Filter or down-weight them; (b) FEED valuation — GSE buys multiple feeds (OddsPapi, FTN charting, tracking); distributional-Shapley-style valuation of feed sources against held-out pick performance answers "which feed do we renew/upgrade." Complements ledgers 2002–2004 (acquisition of new labels); this one values data already held or on offer.

## 11. GSE implementation spec
- Training-data audit: fix engine feature space (engineered features ⇒ representation-learning caveat vanishes); train a KNN (or gradient-boosted) classifier on engine features for binary cover/over; compute exact KNN-Shapley values (linear-time DP) of each training game/season against a held-out validation slate (e.g., 2024 season); rank; drop or down-weight negative-value games; retrain.
- Feed valuation: for each candidate feed (nflverse, FTN charting subset, odds history), compute the Shapley value of the feed's data block via the same KNN proxy — block-Shapley by treating each feed as a "point group"; renew feeds with positive value, drop/renegotiate the rest.
- Acquisition filter: before running BADGE/BatchBALD/ACS-FW on the charting pool, pre-filter to the top-value 20–30% via a value regressor trained on labeled games' Shapley values (mirrors the paper's pipeline) — cuts acquisition compute and avoids spending charting budget on games the model can't learn from.
- Effort: ~1–2 weeks (KNN-Shapley implementation on engine features, valuation audit notebook, feed-ranking report).

## 12. Reproducible test
Dataset: nflverse 2022–2024, engine binary cover head features. Compute KNN-Shapley values per game (2022–2023 training, 2024 validation proxy for v(s)). Retrain the engine on (a) full data, (b) data minus bottom-decile Shapley games, (c) data minus random decile. Evaluate 2024 held-out log-loss. Baseline to beat: (a) full-data model.

## 13. Acceptance / rejection gate
ADOPT the valuation filter iff (b) beats (a) on 2024 held-out log-loss by ≥ 0.003 AND beats (c) by ≥ 0.005 (i.e., the gain is from value, not just data removal), with the removed decile concentrated in identifiable regimes (e.g., specific seasons/data-quality flags) rather than scattered noise. REJECT if Shapley values are unstable across validation-proxy resamples (Spearman < 0.5 between two 500-game proxies) or if no decile removal beats full data.

## 14. Improvement experiment
Cost-normalized Shapley acquisition: replace the paper's pure-value ranking with value-per-dollar φ(x)/cost(x) (cost = charting minutes or feed price per game), then run the diversity step. Compare ROI-per-charting-dollar of value/cost-ranked batches vs. value-only batches in the charting-budget simulation — hypothesis: value-only ranking over-acquires expensive primetime games with marginally higher value, while value/cost finds the efficient frontier, directly serving GSE's fixed-budget data operation in a way the paper's accuracy-only objective cannot.
