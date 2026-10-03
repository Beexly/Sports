# [1149] Node Classification with Integrated Reject Option (arXiv:2412.03190)

**Citation:** Jayadratha Gayen, U. B.; Sharma, C.; Manwani, N. (2024). *Node Classification with Integrated Reject Option*. arXiv:2412.03190. URL: https://arxiv.org/abs/2412.03190
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:2412.03190v1 [cs.LG]).
**Verdict:** ADAPT

The GNN machinery doesn't port, but the two abstention formulations do: (1) coverage-based selective classification — fix the post rate as a business parameter, then maximize accuracy on posted picks — which matches GSE's daily-card reality exactly; (2) rejection as an integrated (K+1)-th class with a cost-aware cross-entropy loss, a simpler alternative to 1146's replication trick.

## 1. Research question
How do you integrate a reject option into GNN node classification — via a coverage target (SelectiveNet-style) or via a rejection cost (rejection as an extra class) — and which works better on citation networks and on the high-stakes legal-judgment-prediction task?

## 2. Dataset / schema
- Cora, Citeseer, Pubmed citation networks: 20 nodes/class train, 500 validation, 1,000 test; GAT base (dropout 0.6, 8 heads × 8 features, LeakyReLU 0.2, ELU), ~1,800 epochs (Cov) / ~1,000 (Cost), early stopping patience 100.
- ILDC (Indian Legal Documents Corpus): 7,593 Supreme Court cases (5,082/1,517/994 train/test/dev) + 24,907 unlabeled cases linked by citation edges; node features from pretrained XLNet; binary accept/reject petition labels.

## 3. Method / model
- **NCwR-Cov (coverage-based):** SelectiveNet-style — prediction head f: H→Δ^{K−1}, selection head g: H→{0,1} (FC-512 → BN → ReLU → FC-1 → sigmoid); selective risk r(f,g) = Σℓ(f(h_i),y_i)g(h_i)/Σg(h_i); objective E(f,g) = r + λΨ(c − φ(g)) with quadratic penalty Ψ(a)=max(0,a)², λ=32, target coverage c; auxiliary full-coverage CE head for representation learning; final loss αE(f,g)+(1−α)E_aux, α=0.5; threshold τ calibrated on validation to hit target coverage.
- **NCwR-Cost (cost-based):** rejection as (K+1)-th softmax class; loss ℓ_ce^d = −log f_y(h) − (1−d)log f_{K+1}(h) (Cao et al. 2022), consistent with the 0-d-1 loss; d=1 recovers standard CE.
- Baselines: Softmax-Response (reject if max softmax < τ, τ ∈ {0.5…0.9}), CF-GNN conformal (reject if predicted label set size > 1, α ∈ {0.1…0.2}).
- SHAP explanations of rejected legal cases (red/blue token highlights).

## 4. Equations & assumptions
- Selective risk + coverage penalty as above; coverage φ(g) = (1/n)Σg(h_i).
- Cost loss: ℓ_ce^d(f(h),e_y) = ℓ_ce(f(h),e_y) + (1−d)ℓ_ce(f(h),e_{K+1}); d < (K−1)/K for abstention to be relevant.
- Assumptions: validation-set τ calibration transfers to test coverage; the (K+1)-th class trick needs no rejection labels in training; SHAP attributions faithfully explain abstentions.

## 5. Features / target
Citation-network node features / XLNet legal-text embeddings; class labels. GSE mapping: game-level pick features; target = {bet, abstain} via either a coverage target ("post exactly 60% of the slate") or a cost parameter d.

## 6. Validation design
10 random initializations, average accuracies; coverage sweeps {0.5…1.0} (Cov) and rejection costs d ∈ {0.5,0.6,0.7,0.8,0.85} (Cost); accuracy measured on unrejected samples; t-SNE of rejected nodes (rejections concentrate on class-overlap regions for NCwR-Cost).

## 7. Numerical results / baselines
- NCwR-Cost beats Softmax-Response at every coverage on all three datasets, and beats CF-GNN everywhere except Cora at 50% coverage (CF-GNN marginally better there).
- NCwR-Cov accuracy by coverage (Cora): 0.5→93.96±1.45, 0.6→92.65±0.5, 0.7→91.29±0.45, 0.8→89.12±0.8, 0.9→86.65±0.7, 1.0→81.65. Citeseer 0.5→81.3±2.19 → 1.0→70.12. Pubmed 0.5→83.2±3.34 → 1.0→76.7.
- NCwR-Cost (Cora): d=0.5→95.8±0.05 acc at 42.6% cov (0-d-1 loss 0.305); d=0.85→87.2±0.06 at 90.5% cov; d=1→81.65 at 100% cov. Cost-based beats coverage-based at most operating points (coverage constraint doesn't prioritize hard examples; high variance in Cov).
- ILDC: NCwR-Cost d=0.25→87.24±2.45 acc at 67.00±3.30% cov; NCwR-Cov at 0.5 coverage→97.55±0.62 acc.
- Changing the base GNN architecture barely moved results (Appendix A).

## 8. Code / data availability
No code link stated; builds on open pygat (Diego999/pyGAT) and SelectiveNet ideas. Datasets: Cora/Citeseer/Pubmed (public), ILDC (public).

## 9. Leakage & limitations
- **Transductive node classification** — the GNN machinery (message passing over citation graphs) has no GSE analogue; only the abstention formulations transfer.
- **NCwR-Cov's high variance** (std up to ±3.34) and its tendency to reject easy examples of particular classes (t-SNE finding) — the coverage penalty is a blunt instrument vs the cost-based version.
- **τ calibration on validation** assumes stationary coverage — breaks under distribution shift (new season, new market regime).
- **Baselines are weak adaptations** (SR thresholding, CF-GNN repurposed); no comparison against 1146-style learned reject regions or Chow's rule.
- **SHAP-on-rejection** is illustrative, not validated — no faithfulness metrics.

## 10. GSE overlap
This is the fourth reject-option paper in the batch (1146–1149), and its distinctive contribution vs the others is the **coverage-based framing**: instead of tuning a cost or threshold, fix the business parameter directly — "GSE posts picks on exactly X% of games" — and maximize accuracy on the posted set. That matches how a daily card actually operates (a fixed-size card, not a cost parameter). The cost-based (K+1)-class loss is a simpler drop-in alternative to 1146's data replication for the same binary-abstention job. Complements 1146 (learned region), 1147 (agreement gate), 1148 (multiclass theory) — this one supplies the operational framing (coverage targets) and the simplest implementation (extra softmax class).

## 11. GSE implementation spec
Add a **coverage-targeted abstention head** to the pick pipeline:
1. Choose the business parameter: target coverage c (e.g., post picks on 60% of the slate) — set from content capacity, not from ML tuning.
2. Train the existing pick model with an added selection head g (small MLP on the model's penultimate features): loss = selective logistic loss + λ·max(0, c−φ)², λ≈32 per the paper, plus the auxiliary full-coverage head (α=0.5).
3. Calibrate τ weekly on recent games (rolling validation) to hit c; monitor coverage drift as a regime-shift signal.
4. Alternative (simpler): add an ABSTAIN output neuron to the pick classifier with the ℓ_ce^d loss, d set from staking economics; compare both on the picks DB.
Effort: ~1 week (selection head + calibration loop).

## 12. Reproducible test
Dataset: GSE picks DB (3,411 picks). Implement both NCwR-Cov-style (selection head, c=0.6) and NCwR-Cost-style (K+1 class, d=0.3) abstention on the same base model, time-series CV. Baselines: fixed edge threshold (current), 1146-style replication. Metrics: ROI and win rate on retained picks at matched 60% coverage. Success: either integrated method beats the fixed-threshold baseline on ROI by ≥2 points; the coverage method must additionally hit 60±5% realized coverage out-of-sample (calibration transfers).

## 13. Acceptance / rejection gate
ADOPT integrated abstention only if: (a) it beats the fixed-threshold baseline on ROI at the business-chosen coverage, (b) realized coverage stays within ±5 points of target out-of-sample for 4+ consecutive weeks (no calibration collapse), and (c) the cost-based and coverage-based variants agree on ≥75% of abstain decisions (the signal is real, not architecture noise). Otherwise keep the current threshold gating.

## 14. Improvement experiment
Make the coverage target **slate-adaptive**: instead of fixed c=0.6, set c per slate from the predicted edge distribution (post more picks on soft slates, fewer on sharp ones) — a meta-model predicting "how many +EV opportunities does this slate contain." Hypothesis: fixed coverage wastes abstention budget on soft slates and over-posts on sharp ones; slate-adaptive coverage improves seasonal ROI at the same average post rate — test on 2023–2024 slates.

---

**Notes for tracker:** arXiv:2412.03190v1 [cs.LG]. Primary ledger #1149 in reader-05 wave-3 set. Full text read.
