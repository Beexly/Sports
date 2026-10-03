# [0698] Ranking with Abstention (arXiv:2307.02035v1)

**Citation:** Anqi Mao, Mehryar Mohri, Yutao Zhong (2023). *Ranking with Abstention*. arXiv:2307.02035v1. URL: https://arxiv.org/abs/2307.02035v1
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/2307.02035.txt`, ar5iv-converted HTML text; complete paper §§1–6 including theorems 2.1/3.2/4.3/4.5 and the CIFAR-10 experiments, read in full).
**Verdict:** ADAPT — ranking-with-abstention fits GSE's weekly pick-ranking problem: rank games by model edge, and abstain from ordering (i.e., don't distinguish) near-tie pairs. The negative results justify why a distance-based abstention rule is needed rather than trusting surrogate ranking losses alone.

## 1. Research question
Can we formulate pairwise and bipartite ranking with an abstention option (abstain at cost c on pairs with ||x−x'|| ≤ γ) that admits non-trivial H-consistency bounds for linear and one-hidden-layer ReLU hypothesis sets — and is abstention necessary (negative results without it)?

## 2. Dataset / schema
CIFAR-10 (ResNet-34, SGD+Nesterov, 200 epochs, batch 1024); pairs sampled with label ordering y=±1; 10,000 test pairs, ℓ∞ distance; γ ∈ {0, 0.3, 0.5, 0.7, 0.9}, cost c ∈ {0.1, 0.3, 0.5}; exponential surrogate (RankBoost). Theory covers linear H_lin (||w||_q ≤ W) and one-hidden-layer ReLU H_NN. No sports data.

## 3. Method / model
Pairwise abstention loss (Eq. 2): L^{abs}_{0-1}(h,x,x',y) = 1_{y≠sign(h(x')−h(x))}·1_{||x−x'||>γ} + c·1_{||x−x'||≤γ}. Bipartite analogue (Eq. 5). Surrogate L_Φ = Φ(y(h(x')−h(x))) with hinge/exp/sigmoid Φ. H-consistency bounds: R_{abs}(h) − R*_{abs}(H) + M_{abs}(H) ≤ Γ_Φ(R_Φ(h) − R*_Φ(H) + M_Φ(H)), with explicit Γ for each Φ (e.g., exp: max{√(2t), 2((e^{2Wγ}+1)/(e^{2Wγ}−1))·t}). Negative results: for equicontinuous H (all practical nets), no non-trivial H-consistency bound exists without abstention (f(t) ≥ 1 for pairwise, ≥ 1/2 for bipartite).

## 4. Equations & assumptions
- Pairwise abstention loss: L^{abs}_{0-1} = 1_{y≠sign(h(x')−h(x))}·1_{||x−x'||>γ} + c·1_{||x−x'||≤γ} (Eq. 2).
- Surrogate: L_Φ(h,x,x',y) = Φ(y(h(x')−h(x))) (Eq. 3).
- H-consistency bound: R_{\bar L}(h) − R*_{\bar L}(H) ≤ f(R_L(h) − R*_L(H)); minimizability gap M_L(H) = R*_L(H) − E[inf_h E_y[L]].
- Γ_Φ for exp (pairwise): max{√(2t), 2((e^{2Wγ}+1)/(e^{2Wγ}−1))·t}; hinge: t/min{Wγ,1}; sigmoid: t/tanh(kWγ).
- Assumptions: X = B^d_p(1), ℓp norm; W, Λ norm bounds; regular hypothesis sets.

## 5. Features / target
CIFAR-10 image pairs → pairwise ordering. For GSE: pairs of weekly games → rank by predicted edge; abstain from ordering pairs whose feature distance ≤ γ (near-tie games get equal rank / both withheld from the "top plays" list).

## 6. Validation design
Theory-first paper: full H-consistency proofs (Appendices C–F); empirical check on CIFAR-10 with RankBoost surrogate, 3 runs, sweeping γ and c; demonstration that RankBoost fails on close pairs (small ||x−x'||) for equicontinuous hypotheses.

## 7. Numerical results / baselines
- CIFAR-10 RankBoost (Table 1, mean ± std over 3 runs): baseline misranking loss 8.33% ± 0.15% at γ=0. At c=0.1: γ=0.7 → 8.25% ± 0.07% (abstention on close pairs beats no abstention); γ=0.9 → 8.54% ± 0.07% (too much abstention hurts). At c=0.5: γ=0.7 → 11.20% ± 0.14%, γ=0.9 → 32.28% ± 0.07% (abstention cost dominates).
- γ=0.3: no abstention takes place — loss coincides with standard misranking for all c.
- Negative results are exact: f(t) ≥ 1 (pairwise) / f(t) ≥ 1/2 (bipartite) for any non-decreasing f continuous at 0 — vacuous bounds without abstention.

## 8. Code / data availability
None stated in the extracted text. CIFAR-10 public.

## 9. Leakage & limitations
- Abstention rule is input-distance-based (||x−x'|| ≤ γ), not confidence-based — a different notion of abstention than the rest of this batch; the two could conflict.
- Experiments are a sanity check on CIFAR-10, not a competitive benchmark; effect size is small (8.33% → 8.25%).
- γ and c are hand-swept; no principled selection protocol; optimal γ=0.7 is CIFAR/ℓ∞-specific.
- Theory restricted to linear and 1-hidden-layer nets; GSE uses deeper models (bounds don't directly apply).
- Bipartite setting assumes independent conditional distributions per pair element — awkward for game pairs.

## 10. GSE overlap
Existing-research map: ranking entries exist (Elo-type ratings) but no ranking-with-abstention — new capability. Applies to GSE's "top plays" ordering: currently a strict ordering by edge with no mechanism for near-ties.

## 11. GSE implementation spec
1. Build a pairwise ranking head over weekly games: score s(game) = predicted edge; train with exponential surrogate on game pairs (y = which game was the better bet ex post).
2. Abstention: for game pairs with feature distance ≤ γ (tuned), assign equal rank — both games get the same publish tier rather than an artificial ordering; tune γ, c on validation to minimize the abstention loss.
3. Use the bipartite variant for {hit, miss} labeled games (AUC-style optimization of the pick ordering).
Effort: ~3–4 days (pairwise training pipeline + γ/c sweep).

## 12. Reproducible test
Dataset: nflverse 2015–2025, weekly slates. Train pairwise ranker ≤2023 (pairs = games within the same week), validate 2024 (sweep γ, c), test 2025. Metric: pairwise abstention loss and top-5 hit rate vs (a) strict edge ordering, (b) no-abstention RankBoost. Baseline to beat: (a).

## 13. Acceptance / rejection gate
ADAPT if the γ-abstaining ranker beats strict edge ordering on test-window top-5 ROI by ≥1pp with γ, c stable across validation folds; reject if the optimal γ collapses to 0 (no abstention, as in the paper's γ=0.3 case) — then the distance-based abstention adds nothing and plain edge ordering stands.

## 14. Improvement experiment
Combine distance-based abstention (this paper) with confidence-based abstention (0694/0695): abstain from ordering a pair if EITHER ||x−x'|| ≤ γ (too close to call) OR the learned σ/uncertainty is high. Test whether the two abstention criteria are complementary (different pairs flagged) or redundant — if complementary, the joint rule should beat each alone on the abstention loss.
