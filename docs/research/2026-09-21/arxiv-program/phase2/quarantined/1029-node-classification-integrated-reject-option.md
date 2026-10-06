# 1029 Node Classification With Integrated Reject Option (arXiv:2412.03190v1)

**Citation:** Uday Bhaskar, Jayadratha Gayen, Charu Sharma, Naresh Manwani (2024). *Node Classification With Integrated Reject Option*. arXiv:2412.03190v1. URL: https://arxiv.org/abs/2412.03190
**Full-text source:** local cache `/tmp/arxiv750-cache/fulltext/2412.03190.txt` (complete paper incl. appendices A-B).
**Ledger completed:** 2026-09-21. **Read:** full text (not abstract).
**Lane (assignment):** abstention.

## 1. Research question
Can the reject option be integrated directly into graph neural networks for node classification (rather than bolted on post-hoc), and which formulation works better — a coverage-constrained selective classifier or a cost-based one that treats "reject" as an extra class? Demonstrated on citation networks and on Indian legal judgment prediction (ILDC) as a high-stakes node-classification task, with SHAP explanations of rejected cases.

## 2. Dataset / schema
- **Cora, Citeseer, Pubmed** (Sen et al. 2008): citation networks; documents = nodes, citations = undirected edges, label = document category. Standard splits per Kipf & Welling / Veličković: **20 nodes per class for training**, 500 validation, 1000 test (all three datasets).
- **ILDC-single** (Malik et al. 2021): 7,593 Indian Supreme Court cases (1947–Apr 2020), split **5,082 train / 1,517 test / 994 dev**; expanded with **24,907 unlabeled cases** (no final verdict) plus their citations via the ikanoon API (Khatri et al. 2023). Graph: node = case text, edge = citation (undirected — directed vs undirected "does not affect performance by a lot"). Node features = pretrained XLNet embeddings (from Malik et al.). Labels binary: 0 = petition rejected, 1 = accepted. SHAP explanations use the last 512 tokens of each petition.
- Appendix B (medical): **UCI Thyroid** (Quinlan 1986) and **Pima Indians Diabetes** (Smith et al. 1988) converted to k-NN graphs (k=5, standardized features, transductive: train 85% + test 15% concatenated, ~10% of train held as validation).

## 3. Method / model
Two architectures (GAT backbone, claimed model-agnostic):
- **NCwR-Cov** (coverage-based, SelectiveNet-style): GAT layer 1 → GAT layer 2 → softmax: prediction head f: H→Δ^{K−1}. A separate selection head g: H→{0,1} (FC 512 → BatchNorm → ReLU → FC 1 → sigmoid; predict iff g(h) ≥ 0.5 initially). An auxiliary head a(h) trains the prediction task without coverage constraint to keep representations for low-confidence examples. Selective risk: r(f,g|S_n) = [(1/n)Σ l(f(h_i),y_i) g(h_i)] / φ(g|S_n), empirical coverage φ(g|S_n) = (1/n)Σ g(h_i). Objective: E(f,g) = r(f,g|S_n) + λΨ(c − φ(g|S_n)), Ψ(a) = max(0,a)², **λ=32**, c = target coverage. Final loss: E = αE(f,g) + (1−α)E(f), **α=0.5**. Test-time: threshold τ recalibrated on the validation set (sort selection scores, pick τ hitting target coverage).
- **NCwR-Cost** (cost-based): reject treated as the **(K+1)-th class**; softmax over K+1 outputs. Loss (Eq. 1): l_ce^d(f(h), e_y) = l_ce(f(h), e_y) + (1−d)·l_ce(f(h), e_{K+1}) = **−log f_y(h) − (1−d)·log f_{K+1}(h)**, consistent with the l_{0d1} loss (Cao et al. 2022). Small d → model prefers rejection; d=1 → standard cross-entropy.
- GAT details: dropout p=0.6 on features; first GAT layer 8 heads × 8 features (64 concatenated), LeakyReLU α=0.2; dropout again; final single-head GAT (64→k) → ELU → softmax. Early stopping patience 100 epochs; ~1800 epochs (Cov) / ~1000 epochs (Cost).

## 4. Equations & assumptions
- Selective risk and coverage (above); penalty Ψ(a)=max(0,a)²; convex combination E = αE(f,g)+(1−α)E(f), α=0.5, λ=32.
- Cost loss Eq. 1: l_ce^d = −log f_y(h) − (1−d) log f_{K+1}(h).
- Assumptions: transductive/semi-supervised setting (graph available at train time); reject cost d ∈ (0,1) fixed in advance; for Pubmed (k=3 classes) only d < (k−1)/k = 2/3 is meaningful, so only d ∈ {0.5, 0.6} tested there; threshold τ must be recalibrated on validation because train-time coverage ≠ test-time coverage.

## 5. Features / target
Citation nets: bag-of-words document features (standard). ILDC: XLNet embeddings of case proceedings (last 512 tokens used for SHAP). Target: node class (document category / judgment 0/1). No NFL features; the method is architecture-level.

## 6. Validation design
- 10 random initializations; mean ± std accuracy on **unrejected** test samples at fixed coverage levels.
- Baselines (same GAT backbone): **Softmax Response (SR)** — reject when max softmax < threshold, thresholds {0.5,...,0.9}; **CF-GNN** (Huang et al. 2023, conformal GNN) — reject when predicted label set has >1 class, α ∈ {0.1, 0.125, 0.15, 0.175, 0.2}.
- Coverage-based models trained at target coverages {0.1,...,0.9} then τ-calibrated; cost-based trained at d ∈ {0.5, 0.6, 0.7, 0.8, 0.85}.
- Appendix A: robustness across GCN / GAT / GraphSAGE / GATv2 / 3-layer / 4-layer GAT.

## 7. Numerical results / baselines
Exact numbers:
- NCwR-Cov accuracy at coverage (Table 1): Cora — 0.5: **93.96±1.45**, 0.6: 92.65±0.5, 0.7: 91.29±0.45, 0.8: 89.12±0.8, 0.9: 86.65±0.7, 1.0: 81.65; Citeseer — 0.5: **81.3±2.19**, 0.9: 72±0.69, 1.0: 70.12; Pubmed — 0.5: **83.2±3.34**, 0.9: 79.7±0.59, 1.0: 76.7.
- NCwR-Cost (Table 2): Cora d=0.5: acc **95.8±0.05**, cov 42.6±0.02; d=0.85: 87.2±0.06, cov 90.5±0.07 (d=1: 81.65 @ 100%). Citeseer d=0.5: **91.6±0.12**, cov 9.7±0.05; d=0.85: 75.8±1.61, cov 79.2±0.04. Pubmed d=0.5: **88.9±0.02**, cov 49.3±0.08; d=0.6: 84.6±0.05, cov 67.8±0.05.
- ILDC (Table 3): NCwR-Cost d=0.25: **87.24±2.45** acc @ 67.00±3.30 cov; d=0.9: 79.94±2.09 @ 98.99±0.20. NCwR-Cov cov=0.5: **97.55±0.62**; cov=0.9: 81.87±1.03.
- Headline comparisons: NCwR-Cost beats Softmax-Response at **all** coverage levels on all datasets; beats CF-GNN everywhere except Cora@50% (CF-GNN marginally better) and Pubmed coverage<60% (CF-GNN marginally better). NCwR-Cov beats SR everywhere except Pubmed@60%.
- **Cost > Coverage**: NCwR-Cost dominates NCwR-Cov because the coverage constraint rejects arbitrary (sometimes easy) examples while the cost loss rejects hard/boundary examples first (confirmed by t-SNE: rejected = class-overlap regions for Cost; Cov sometimes rejects whole classes, e.g. classes 3-4 at 50.4% coverage).
- Medical appendix: Thyroid NCwR-Cov @cov 0.5: **99.66±0.09**; Pima NCwR-Cov @cov 0.5: 94.38±1.40. Base-GNN robustness (Table 4): at coverage 0.7, Cora accuracy ranges 85.86 (GraphSAGE) – 89.21 (4-layer GAT) — method is backbone-agnostic.
- No code link for NCwR itself (only the pyGAT base: github.com/Diego999/pyGAT).

## 8. Code / data availability
No NCwR code link stated. Datasets: Cora/Citeseer/Pubmed (public, Sen et al.), ILDC (public corpus), UCI Thyroid/Pima (UCI repo). SHAP used for explanation (Lundberg & Lee 2017).

## 9. Leakage
- Transductive setup: test nodes participate in message passing (standard for these benchmarks, but inflates vs. inductive deployment).
- ILDC graph mixes 24,907 unlabeled cases via citation edges — fine for semi-supervised, but label leakage through citation structure is unexamined (cases citing each other may share outcomes temporally).
- Threshold τ is fit on the validation selection-scores — a form of test-set-adjacent tuning, though standard.
- NCwR-Cov shows "very high standard deviation" (authors' own note) — the coverage penalty optimization is unstable.
- Baselines are weak by construction (SR thresholding, CF-GNN repurposed); no comparison against a learned reject head outside their own.

## Limitations
- All experiments are on citation/legal/medical graphs — zero sports content, and node classification ≠ GSE's pick-classification problem structurally.
- The (K+1)-class trick needs the reject cost d chosen a priori; no guidance on setting d from a profit objective.
- NCwR-Cov's instability (high variance, whole-class rejection artifacts) makes it the weaker of the two — the paper's own results argue against the coverage formulation.
- 1800/1000-epoch training with patience-100 early stopping suggests a fiddly optimization landscape.
- SHAP explanations are illustrative (2 cases), not evaluated.

## 10. GSE overlap
Existing-research map check: the map has GNN sports outcomes (2207.14124) already read, but **nothing on reject-option heads or abstention inside neural classifiers** — GSE's abstention is currently post-hoc thresholding on calibrated probabilities, and the map's gap #4 (learning-to-abstain) is open. The paper's portable artifact is **not** the GNN part — it's the **cost-based (K+1)-class reject loss** (Eq. 1), which is backbone-agnostic and applies to any classifier with a softmax output, including a pick-direction classifier. The empirical finding that cost-based rejection (reject hard examples first) beats coverage-constrained rejection (rejects arbitrary examples) directly informs GSE's abstention design: price the abstention, don't fix the coverage.

## 11. GSE implementation spec
- Add an explicit **ABSTAIN output** to GSE's pick classifier: for a 3-way pick head (home/away or over/under... actually binary pick + abstain = 3 outputs), train with l_ce^d = −log f_y − (1−d)·log f_abstain, where d is set from the economics: d ≈ (profit forgone by skipping a +EV pick) / (loss from a wrong pick), tuned on the predictions DB.
- Data: existing pick features + labels (cover / not-cover) from the engine predictions DB and nflverse; no new data needed.
- Training: same GBM/NN pipeline with the extra head; calibrate d on a validation season by maximizing backtested P&L (not accuracy).
- Serving: if argmax = abstain → no pick published; log abstain-rate and P&L attribution.
- Effort: 2-3 days (loss swap + d sweep + backtest harness).

## 12. Reproducible test
Dataset: GSE 2023-2024 NFL pick history (features + ATS outcomes). Protocol: train binary pick classifier with and without the abstain head (d swept over {0.1,...,0.5}); validate on 2024 season. Baselines: (a) no-abstention classifier, (b) post-hoc confidence-threshold abstention at matched abstain rates. Metric: backtested profit at flat stakes on published (non-abstained) picks. Must beat both baselines.

## 13. Acceptance / rejection gate
**Gate:** adopt the abstain-head if, on the 2024 validation season, the (K+1)-class model at its profit-optimal d delivers ≥ 8% higher backtested profit than the best post-hoc confidence-threshold rule at the same abstain rate, with abstain rate ≤ 30% (a model that abstains on everything is degenerate — cf. paper 1027's lesson). Reject if it only matches thresholding or if profit-optimal d is unstable across seasons.

## 14. Improvement experiment
Make d **instance-dependent** (cf. Kalra et al. 2021 RISAN, cited in the paper): learn d(x) as a function of market features (line movement, steam, limits) so the model abstains more aggressively when the market disagrees with the engine's direction — i.e., the reject cost becomes the estimated probability the market is right. Second: combine with paper 1026's CSR — use conformal interval width on the *probability* output as a second-stage veto over the learned abstain head, and measure whether the combination beats either alone.

**Verdict: ADAPT** — the (K+1)-class cost-based reject loss is a clean, backbone-agnostic abstention head for GSE's pick classifier, and the cost-beats-coverage finding settles a real design question.
