# [1827] Neural Symbolic Regression that Scales (arXiv:2106.06427)

**Citation:** Luca Biggio, Tommaso Bendinelli, Alexander Neitz, Aurelien Lucchi, Giambattista Parascandolo (2021). *Neural Symbolic Regression that Scales*. arXiv:2106.06427v1. URL: https://arxiv.org/abs/2106.06427
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

Pre-trained set-Transformer→skeleton-decoder with beam search + BFGS is the fastest inference-time SR architecture and the "improves with experience" property is unique; needs adaptation because the prior is controlled by the pre-training equation distribution (must be re-pre-trained or fine-tuned on sports-plausible equation families, not generic math), and OOD behavior needs verification on noisy sports data.

## 1. Research question
Can symbolic regression be learned as a task — pre-training a Transformer on procedurally generated (equation, data) pairs so the model improves with experience and compute — rather than hand-designing search strategies, and does the resulting system outperform GP/RL/Eureqa-style search both in accuracy and wall-clock time, scaling gracefully to large numbers of input-output pairs?

## 2. Dataset / schema
Pre-training: procedurally generated equations, fresh minibatches — 1.5M training steps ≈ 225M distinct equations seen; 10M skeletons pre-sampled with up to 3 numerical constants each; support points {x_i} sampled per equation to produce (x,y) pairs. Evaluation: 5 test sets including the Nguyen benchmark suite and 4 others (Sec. 5); test-time budget ~100s per equation. The generator distribution is the controllable prior: "the distribution over equations used during pre-training strongly influences the prior over equations of the final system."

## 3. Method / model
NeSymReS (Neural Symbolic Regression that Scales):
- **Data generator**: sample (i) equation skeleton with '◇' placeholders for constants, (ii) numerical constants, (iii) support points {x_i}; evaluate to get {(x_i, y_i)}; target = skeleton in prefix notation.
- **Encoder**: Set Transformer (Lee et al. 2019) mapping the (x,y) set to a fixed latent vector z — O(nm) instead of O(n²), m=50 inducing points, so it scales to large n.
- **Decoder**: standard Transformer decoder (11M encoder + 13M decoder params), P(ē_{k+1} | ē_{1:k}, z), trained with cross-entropy on skeleton prediction (Adam, lr 1e-4, no schedule).
- **Test time**: encode new data → z → beam-search skeletons from decoder → fit constants with BFGS on MSE → select best by in-sample loss + 1e-14/token skeleton-length penalty.
- Key properties: improves with more pre-training data/compute (Fig. 2 accuracy vs pre-training size); prior is explicit and steerable via the generator distribution; amortized inference (~seconds per equation vs hours for search).

## 4. Equations & assumptions
P(ē_{k+1} | ē_{1:k}, z); cross-entropy loss on skeleton; BFGS on MSE for constants; selection: in-sample loss + 1e-14 × tokens.
Assumptions: (1) test equations come from (or near) the pre-training generator distribution — in-distribution performance is the strong case; (2) skeleton/constants decouple cleanly (BFGS finds good constants for any proposed skeleton); (3) beam search covers the posterior modes; (4) synthetic pre-training transfers to real data; (5) Set Transformer inducing points (m=50) suffice to summarize the dataset.

## 5. Features / target
Inputs: sets of (x,y) pairs from any equation ℝ^{dx}→ℝ^{dy}; target: skeleton tokens. GSE analog: (features, metric) pairs → metric skeleton.

## 6. Validation design
5 test datasets; baselines: GP variants, DSR (Petersen 2021), Eureqa-style, EQL, GrammarVAE-style, Gaussian Process; all methods compared on accuracy-vs-wall-clock curves on a single CPU per equation (Figs. 3–4, 7); baselines given hyperparameter configs with comparable-or-more compute. Accuracy-vs-pretraining-data-size ablation (Fig. 2, fixed ~100s test budget). In-distribution vs out-of-distribution split: GP baseline does well in-distribution but poorly OOD.

## 7. Numerical results / baselines
- NeSymReS **outperforms all baselines on all 5 datasets in both time and accuracy by a large margin on most compute budgets** (Figs. 3–4).
- Accuracy increases monotonically with pre-training dataset size (Fig. 2) — the only method that "improves with experience."
- On Nguyen at large test-time budgets (~10³ s), NeSymReS ≈ DSR — notable because DSR was fine-tuned on Nguyen-7/10 while NeSymReS was not.
- GP baseline: high in-distribution accuracy quickly, poor OOD.
- Model sizes modest: 11M + 13M params; pre-training is the expensive part (one-time).
- Note: the paper reports these as accuracy-vs-compute-budget curves (Figs. 2–4), not numeric tables, so exact point values are not recoverable from the text — the rankings above are the paper's stated conclusions from those curves.

## 8. Code / data availability
https://github.com/SymposiumOrganization/NeuralSymbolicRegressionThatScales — code AND largest pre-trained model released.

## 9. Leakage & limitations
- Pre-training distribution = the prior: if sports equations live outside the generator's family, the model will force them into familiar shapes — the paper's strength (steerable prior) is also its main risk for us.
- Evaluation is on synthetic/skeleton-recovery benchmarks; noise robustness not stressed like PySR's EmpiricalBench; real sports noise may break the encoder.
- Skeleton/constant decoupling assumes BFGS succeeds — fails on stiff/chaotic targets.
- 1e-14/token penalty is a hand-tuned hack, not a principled selector (see 1826 for the proper treatment).
- "Improves with experience" shown only within the synthetic family; transfer to real scientific data asserted, not quantified here.
- Beam search at test time is still sequential decoding — latency per equation is seconds, fine for us.

## 10. GSE overlap
New capability — and the natural inference engine for a production "metric inventor": pre-train once on sports-plausible skeletons, then propose candidate metric formulas in seconds per dataset slice (vs hours for PySR search). Complements 1822 (PySR = verifier/optimizer), 1825 (LLM = prior proposer), 1826 (selector). No existing GSE pre-trained SR model.

## 11. GSE implementation spec
- Phase 1 (no training): use the released pre-trained model as a fast proposer on nflverse slices; BFGS-fit constants; rank with the 1826 selector. Tests whether the generic-math prior transfers at all.
- Phase 2 (the real play): build a sports equation generator — skeletons sampled from operator distributions fit to the 1826 sports corpus, constants in sports ranges, support points drawn from real nflverse feature marginals — and fine-tune (or re-train small) the Set Transformer→decoder on ~10–50M sports-plausible equations. The generator IS the prior; curate it like a portfolio.
- Serving: encoder+decoder inference is seconds on CPU — embed in the weekly research pipeline: each week, propose fresh candidate metrics from the latest season slice.
- Effort: Phase 1 ~1 day; Phase 2 ~1–2 weeks (generator curation + GPU fine-tune).

## 12. Reproducible test
Dataset: nflverse team-game 2015–2023; target points/drive; features 12 stats. Baseline: PySR search (30 min budget). Challenger: released NeSymReS model, beam 32, 100s budget. Metric: best test (2024–2025) RMSE among ≤15-node equations. Then repeat with a sports-fine-tuned checkpoint if Phase 1 shows promise.

## 13. Acceptance / rejection gate
ADOPT NeSymReS as the proposer if, within a 100s test-time budget, its best ≤15-node equation is within 5% test RMSE of PySR's 30-minute best on the 2024–2025 window (speed parity at near-quality parity justifies the pipeline); ADOPT the fine-tune if it beats the released checkpoint by ≥10% test RMSE. REJECT if the generic prior proposes only math-textbook shapes that underperform a linear baseline on real data.

## 14. Improvement experiment
"Prior surgery by generator mixing": fine-tune three checkpoints — (a) 100% generic math, (b) 50/50 generic/sports-plausible, (c) 100% sports-plausible — and measure the in-distribution→OOD (2024–2025 seasons) degradation curve for each. This directly tests the paper's core claim (generator distribution = prior = performance) in our domain and tells us the minimum sports-mixture needed — a result worth publishing in the GSE research corpus regardless of outcome.

---
Lane: symreg_equation_discovery · Block 1822–1841
