# [1828] Deep Generative Symbolic Regression (arXiv:2401.00282)

**Citation:** Samuel H. Holt, Zhaozhi Qian, Mihaela van der Schaar (2024). *Deep Generative Symbolic Regression*. arXiv:2401.00282v1. URL: https://arxiv.org/abs/2401.00282
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

The pre-train + inference-time gradient refinement (NGPQT) architecture that generalizes to MORE input variables than seen in pre-training is the best answer to GSE's "many correlated features" problem; needs adaptation to noisy sports data and a sports equation prior, plus verification that refinement doesn't just memorize the training slice.

## 1. Research question
Can a deep conditional generative model p_θ(f|D) — pre-trained to capture equation invariances, then gradient-refined at inference time on the observed dataset — achieve (P1) invariance-aware equation representations, (P2) computationally efficient inference refinement, and (P3) generalization to MORE input variables at inference than seen during pre-training, beating both pure RL and pure pre-trained encoder-decoder SR on many-variable problems?

## 2. Dataset / schema
Pre-training: synthetic (equation, dataset) pairs. Evaluation: (a) standard SR benchmarks incl. Feynman equations with d≥2 variables; (b) challenging sets with d=5 (Feynman) and d=12 (synthetic), 10·d samples per problem, independent train/test splits of 10·d points each; (c) SRBench ground-truth datasets (La Cava et al. 2021); (d) R rationals (Krawiec & Pawlak 2013). Metric: average recovery rate A_Rec% = % of κ random-seed runs finding the true equation f*, plus average equation evaluations γ.

## 3. Method / model
DGSR framework = two steps:
1. **Pre-training**: conditional generative model p_θ(f|D), θ={ζ,φ}: Set Transformer encoder (Lee et al. 2019) — permutation-invariant over {(X_i,y_i)} pairs, handles variable n — producing latent V∈ℝ^w; Transformer decoder with hierarchical tree-state representation (Petersen et al. 2020) — during autoregressive decoding, generated tokens are converted to tree states, embedded to d_s dims, concatenated to V → U∈ℝ^{w+d_s}. End-to-end loss = NMSE(f̂(X), y) over mini-batches of t datasets × k sampled equations; non-differentiable token→equation step handled by policy gradients (pre-train with RL-style gradients).
2. **Inference**: encode observed D → refine the posterior with NGPQT (neural-guided priority queue training, Mundhenk et al. 2021) using the same NMSE loss — gradient refinement of decoder weights starting from a good prior; then discrete search (Monte Carlo sampling, score by NMSE) for the MAP equation.
Properties demonstrated: (P1) learns equation equivalences — generates many distinct-but-equivalent true equations (Table 3, Fig. 3a, zero test NMSE after simplification); generates valid equations at high rate vs NGGP's mostly-invalid (Fig. 3b). (P3): recovers truths with d=12 variables after pre-training on fewer variables.

## 4. Equations & assumptions
p_θ(f|D); V = h({g(X_i, y_i)}_{i=1}^n); U ∈ ℝ^{w+d_s}; loss = NMSE(f̂(X), y) = MSE/var(y).
A_Rec% = fraction of κ seeds recovering f*.
Assumptions: (1) NMSE is a good proxy for the Bayesian posterior; (2) pre-training distribution covers the structural family of test truths; (3) NGPQT refinement converges to high-density region of true posterior; (4) hierarchical tree states capture all needed structural constraints; (5) 10·d samples suffice to identify d-variable equations; (6) recovery (exact truth) is the right metric.

## 5. Features / target
Inputs: d-variable vectors X_i ∈ ℝ^d; target y_i = f*(X_i). GSE analog: d=12–20 game/team features → metric target.

## 6. Validation design
Benchmark problem sets: ω unique equations per set, κ random seeds, train/test = 10·d samples each; recovery = exact f* found. Compared vs NGGP (RL+GP), NESYMRES (Biggio 2021), SRBench baselines. Ablations (Table 4): pre-training on/off, encoder on/off on Feynman d=5. Appendix-level detail for per-equation rates (L, O, P, Q) and SRBench comparison (S).

## 7. Numerical results / baselines
- **SRBench ground-truth: DGSR 63.25% recovery vs previous best 52.65%** — new state of the art (significant).
- **R rationals: +10% recovery rate** over prior best.
- Higher recovery than all baselines on many-variable sets (Feynman d=5, Additional Feynman, Synthetic d=12) with FEWER equation evaluations than RL methods; NESYMRES has the fewest evaluations but "significantly lower recovery rate" — DGSR is the better speed/accuracy trade.
- Ablation: ≥10% better than NGGP on Feynman d=5; both pre-training and the encoder contribute (Table 4).
- P3 demonstrated: truths with more variables than pre-training recovered via inference-time refinement.

## 8. Code / data availability
None stated in extracted text (appendices referenced for pseudocode/NGPQT details). Recorded as: no public repo URL confirmed in text.

## 9. Leakage & limitations
- All evaluation on synthetic, noise-free equations — no noise study; sports noise could destroy the refinement signal.
- Recovery metric rewards exact-truth finding; GSE wants predictive metrics — a method tuned for recovery may overfit structure.
- NGPQT refinement at inference is still iterative RL — cheaper than from-scratch RL but not free; no wall-clock numbers extracted.
- Pre-training distribution unexamined here: P3 (more variables) is shown, but structural OOD (non-physics-like equations) is not.
- 10·d samples per problem is generous; sports team-season data is ~32 rows/season — the low-n regime is untested.
- No code URL found in text — reproducibility depends on reimplementation.

## 10. GSE overlap
New capability; directly addresses GSE's feature-rich setting (12–20 candidate inputs per metric) where flat search (PySR) struggles combinatorially. The P3 property is the killer feature: pre-train on cheap low-dimensional sports equations, refine at inference on the full 15-feature problem. Complements 1827 (NeSymReS: no inference refinement, lower recovery) — DGSR is the upgrade path if 1827's fine-tune underperforms.

## 11. GSE implementation spec
- Reimplement DGSR-lite: Set Transformer encoder (public implementations exist) + Transformer decoder with tree-state embeddings; pre-train on synthetic sports-plausible equations (generator from 1827's Phase 2) with d=4–8 variables; at inference, encode nflverse slices and run NGPQT-style refinement (or simpler: REINFORCE fine-tune of decoder on NMSE) before Monte-Carlo MAP search.
- Data: nflverse team-game rows (n≈4–5k, d=12–15) — the many-variable regime this paper targets.
- Effort: ~2 weeks (reimplementation + pre-training); de-risk by first testing whether inference-time refinement helps the 1827 checkpoint at all.

## 12. Reproducible test
Dataset: nflverse team-game 2015–2023 (d=14 features), target points/drive; 2024–2025 held out. Baseline: NeSymReS-style no-refinement decoding (beam 32). Challenger: DGSR-lite with NGPQT refinement. Metric: held-out RMSE of best ≤15-node equation + equation-evaluation count.

## 13. Acceptance / rejection gate
ADOPT inference-time refinement if it improves held-out RMSE by ≥8% over no-refinement decoding at equal-or-fewer equation evaluations on the 2024–2025 window; REJECT if refinement gains vanish on noisy real data (NMSE signal too weak) or if it merely recovers the pre-training prior's favorite shapes.

## 14. Improvement experiment
"Refinement curriculum": instead of refining directly on the full noisy dataset, refine in stages — first on GP-denoised targets (PySR's denoising kernel, 1822), then on raw data. Hypothesis: denoised-stage refinement finds structure, raw-stage refinement fits constants — separating the two failure modes. Test whether staged refinement beats single-stage on recovery of known synthetic sports equations with injected noise.

---
Lane: symreg_equation_discovery · Block 1822–1841
