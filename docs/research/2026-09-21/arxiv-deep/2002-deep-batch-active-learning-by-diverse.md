# [2002] Deep Batch Active Learning by Diverse, Uncertain Gradient Lower Bounds (arXiv:1906.03671)

**Citation:** Ash, J. T., Zhang, C., Krishnamurthy, A., Langford, J., Agarwal, A. (2019). *Deep Batch Active Learning by Diverse, Uncertain Gradient Lower Bounds*. arXiv:1906.03671. URL: https://arxiv.org/abs/1906.03671
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
**Verdict rationale:** a hyperparameter-free batch acquisition rule (k-means++ over hallucinated last-layer gradient embeddings) that robustly blends uncertainty and diversity; directly adaptable to budgeted charting/game-selection but built for classification, so needs a regression adaptation for GSE targets.

## 1. Research question
How to design a practical, general-purpose, label-efficient batch active learning algorithm for deep neural networks that is robust to architecture choice, batch size, and dataset — simultaneously capturing predictive uncertainty and sample diversity in every selected batch without hand-tuned hyperparameters (which are themselves label-expensive to tune, since hyperparameter sweeps relabel examples).

## 2. Dataset / schema
- SVHN, CIFAR10 (image classification; standard 32x32 images, 10 classes each; sizes not restated in paper — standard splits).
- MNIST (only with MLP, since it is "extremely easy to classify" — paper's own characterization).
- Four non-image datasets from the OpenML repository (#6, #155, #156, #184), selected on two criteria: (1) at least 10,000 samples; (2) neural networks have significantly smaller test error than linear models. Schema not restated in paper.
- All datasets public (openml.org; standard vision benchmarks). Time range: not stated (benchmark snapshots as of 2019).

## 3. Method / model
BADGE (Batch Active learning by Diverse Gradient Embeddings):
1. Seed labeled set S with M=100 uniformly random examples from pool U; train initial model θ₁ (cross-entropy).
2. Per round t: for each unlabeled x, compute hallucinated label ŷ(x) = argmaxᵢ f(x;θₜ)ᵢ, then gradient embedding gₓ = ∂ℓ_CE(f(x;θ),ŷ(x))/∂θ_out|_{θ=θₜ}, i.e., gradient of CE loss w.r.t. FINAL (output) layer parameters using the model's own prediction as label.
3. Select batch Sₜ of size B via k-means++ seeding (Arthur & Vassilvitskii 2007) on {gₓ} — iteratively sampling points proportional to squared distance from the nearest already-chosen centroid, which favors both high magnitude (uncertainty) and diversity (non-redundant directions). Query their labels.
4. Retrain from scratch (per Ash & Adams 2019 — no warm starting) on S ∪ Sₜ; repeat.

Key design point: a k-DPP sampler is the principled target (batch probability ∝ det of Gram matrix; small batches favor length/uncertainty, large batches force diversity via linear independence), but exact/state-of-the-art k-DPP sampling (Dereziński 2018) has high-order polynomial runtime in batch size and embedding dim, and MCMC samplers have mixing-time hurdles. k-means++ empirically matches k-DPP performance while being far cheaper (Figure 1: learning curves "nearly perfectly overlap"; runtime greatly improved).

## 4. Equations & assumptions
- Block decomposition of gradient embedding (Eq. 1): (gₓ)ᵢ = ∂ℓ_CE(f(x;θ),ŷ)/∂Wᵢ = (pᵢ − I(ŷ=i)) · z(x;V), where pᵢ = softmax output, W ∈ ℝ^{K×d} final-layer weights, z(x;V) = penultimate-layer representation. Each block is a scaling of z(x;V).
- Proposition 1: ‖gₓʸ‖² = (Σᵢ pᵢ² + 1 − 2p_y) ‖z(x;V)‖², so ŷ = argmin_y ‖gₓʸ‖. Hence ‖gₓ‖ ≤ ‖gₓʸ‖ for every true label y — the hallucinated-gradient norm is a lower bound on the true-label gradient norm ("conservatively estimates the example's influence on the current model").
- Assumptions: softmax final layer (structure of Eq. 1/Prop. 1); pool-based multiclass classification; cross-entropy loss. Appendix B gives binary logistic regression justification for why BADGE beats vanilla uncertainty sampling. No other theoretical guarantees claimed (the paper is empirical).
- t-statistic for pairwise comparison: t = √5 μ̂/σ̂ with μ̂ = (1/5)Σₗ(eᵢˡ − eⱼˡ), σ̂ = √((1/4)Σₗ(eᵢˡ − eⱼˡ − μ̂)²); algorithm i beats j if t > 2.776 (two-sided t-test, p=0.05).

## 5. Features / target
Features: raw inputs (pixels for vision; OpenML feature vectors for non-image). Gradient embedding = outer product of penultimate representation z(x;V) and probability-score vector (p − e_ŷ) — "the penultimate layer embedding characterizes the diversity of each example, whereas the probability score vector characterizes the quality of each example." Target: class label; acquisition target is the batch Sₜ maximizing expected model improvement under labeling budget. Prediction horizon: n/a (classification, not forecasting).

## 6. Validation design
- Protocol: pool-based batch AL, M=100 initial random labels, batch sizes B ∈ {100, 1000, 10000}, architectures: 2-layer MLP (ReLU; embedding dim 256 for images, 1024 for OpenML), ResNet-18, VGG-11.
- 231 total experiments = 7 algorithms × 33 (D,B,A) combos (3 batch sizes × 11 dataset-architecture pairs). Baselines (libact implementations): Coreset (FF k-center on penultimate embeddings), Conf (min max-probability), Marg (multiclass margin), Entropy, ALBL (bandit meta-learner choosing between Coreset and Conf), Rand.
- Training: Adam, lr 0.001 (image) / 0.0001 (non-image), train until training accuracy > 99%; models retrained from scratch each round; 5 independent repeats; no LR schedules, no data augmentation.
- Aggregation: pairwise penalty matrix P (each (D,B,A) combo gets equal weight via 1/n_{D,B,A} penalties from t-tests at label budgets L ∈ {M + 2^{m−1}B}); plus CDF of normalized errors neᵢ = ēᵢ/ē_rand per (D,B,A,L) with 1/n_{D,B,A} weights. Label budgets chosen where learning still progresses (n₀ = smallest #labels where Rand reaches 99% of final accuracy), since all methods converge in the large-sample limit. No time-ordered splits — i.i.d. benchmark classification, not forecasting.

## 7. Numerical results / baselines
- BADGE has the best overall performance across all experiments (Figure 4 penalty matrix; Figure 5 normalized-error CDF dominates).
- Regime detail: with small batch size (100, 1000) or MLP architectures, BADGE and Marg perform best; with large batch size (10000), Marg degrades while BADGE, ALBL, and Coreset are the best performers (Appendix E, Figs. 22–23).
- Robustness claim: "While other approaches sometimes succeed for particular batch sizes or architectures, BADGE consistently performs as well or better" — e.g., Coreset often performs worse than random on complex non-image data with MLP (diversity on meaningless penultimate representations is deleterious; unconditional random sampling can beat it); uncertainty-only methods fail at large batch sizes by selecting near-identical batches.
- k-means++ vs k-DPP sampling: statistical performance "nearly perfectly overlaps" (Figure 1, five repeats) with large runtime advantage for k-means++.
- Figures 2: k-means++ on gradient embeddings selects batches with higher log-det Gram determinant (diversity) AND higher average gradient magnitude (uncertainty) than FF-k-center (Coreset's sampler) and even than k-DPP itself ("a potential pathology of the k-DPP's degree of stochasticity").
- Early rounds favor diversity sampling, later rounds favor uncertainty sampling (Figure 3a: Coreset beats confidence methods early, loses later); BADGE matches diversity methods when they win and uncertainty methods when they win — the key "good choice regardless of labeling budget" result.

## 8. Code / data availability
None stated in paper (no code URL, no data URL). Datasets are all public benchmarks/OpenML.

## 9. Leakage & limitations
- All benchmarks are i.i.d. classification; nothing tests time-ordered/streaming selection or distribution shift — the sports setting (sequential slates, season drift) is not validated.
- Proposition 1's lower-bound guarantee depends on the softmax-final-layer structure; the method is built for classification. GSE's spread/total targets are regression — the "hallucinated label" trick needs a regression analogue (e.g., hallucinate ŷ(x) as the current prediction and use residual-magnitude-scaled embeddings).
- No cost-awareness: every query costs the same in this paper; GSE's charting labor and data-feed costs vary per game/source.
- Retraining from scratch each round is expensive (the paper accepts it per Ash & Adams 2019); fine for weekly GSE retrains, expensive for daily.
- Hyperparameter-free claim applies to the acquisition rule, not the underlying model training.
- Appendix-dependence: full learning curves (App. C), grouped penalty matrices (App. D), CDFs (App. E), k-DPP runtime comparison (App. G) live in appendices (were present in ar5iv text).
- External validity: vision/OpenML only; no tabular forecasting with heavy feature engineering as in GSE.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: the corpus has chart-reads (6 chart CSVs), FTN charting catalog, DVOA docs, full-tables (30+ CSVs), and calibration work (Mimo's CQR lane), but no existing active-learning / optimal-acquisition machinery — no method for deciding *which* games/plays to chart or buy next under a budget. BADGE is a new capability: a principled batch acquisition rule for the labeling-budget problem GSE faces with charting labor and paid data feeds. Complement (not duplicate) of the FTN charting catalog work: that tells us what charting exists; BADGE tells us what to acquire next.

## 11. GSE implementation spec
- Setting: pool = all games/plays in a season not yet charted or not yet in a purchased feed; labeling = paying for FTN charting entries, manual charting labor, or buying a game's tracking feed; batch = weekly charting budget (e.g., 40 games/week of charting labor).
- Adaptation to regression: replace hallucinated class label with current model prediction ŷ(x); gradient embedding gₓ = ∂ℓ/∂θ_out on (x, ŷ(x)) for the final layer of the pick-probability head (spread/total binary heads → classification applies directly: P(home cover), P(over) are binary classification; log-loss heads give softmax-like structure where Prop. 1's logic carries). Magnitude ≈ predicted-class uncertainty; k-means++ on embeddings gives diverse, high-uncertainty batches.
- Features: the engine's game/play feature vector; the "penultimate representation" is the engine's learned embedding before the output head.
- Serving: run acquisition weekly — score the unlabeled pool with the current model, compute gradient embeddings (one backward pass per pool example through final layer only), k-means++ sample the batch, send to charting queue. Cost: one forward+partial-backward per candidate; trivial vs. data cost.
- Effort: ~1–2 weeks (embedding extraction hooks, k-means++ sampler, charting-queue integration, A/B harness vs. random selection).

## 12. Reproducible test
Dataset: nflverse play-by-play 2023–2024 as the pool; simulate charting acquisition: start with 2023 weeks 1–4 charted (seed), then run BADGE vs. random vs. margin-sampling to select 20% of remaining plays' "charting labels" (charted features: e.g., coverage type, pressure) per batch; train the GSE pick model on acquired data; evaluate on held-out 2024 season log-loss on spread/total picks. Baseline to beat: random acquisition at 40% budget. Metric: held-out log-loss; success = BADGE at 20% budget ≤ random at 40% budget.

## 13. Acceptance / rejection gate
ADOPT the acquisition rule iff BADGE-selected 20% charting budget achieves held-out log-loss within 0.005 of (or better than) random-selected 40% budget on the 2024 holdout, in two consecutive simulated seasons (2024 and 2025 when data complete). REJECT (keep random) if BADGE underperforms random at equal budget by > 0.01 log-loss, or if the 20%-vs-40% efficiency gain is < 1.5×.

## 14. Improvement experiment
Regression-native BADGE: instead of hallucinating a single label, compute the expected gradient embedding over the model's predictive distribution (Fisher-information-style: E_{y~p(y|x)}[gₓʸ]) — for binary pick heads this is closed-form (p-weighted sum of the two class gradients). Test whether expected-gradient k-means++ beats the MAP-hallucinated version on the same charting-budget simulation; hypothesis: it better handles high-aleatoric-uncertainty games (injury news, weather) where the argmax label is a coin flip and the hallucinated gradient understates true expected model change.
