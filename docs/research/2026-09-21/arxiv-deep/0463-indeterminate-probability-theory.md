# [0463] Indeterminate Probability Neural Network (arXiv:2303.11536v2)

**Citation:** Yang, T., et al. (2023). *Indeterminate Probability Neural Network*. arXiv:2303.11536v2. URL: https://arxiv.org/abs/2303.11536v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5597 lines).
**Verdict:** REJECT — the "exponential capacity from summed neurons" claim confuses representational combinatorics with learnability, rests on conditional-independence assumptions the authors admit can "neither be proved nor falsified," and is demonstrated only on MNIST and a toy bit-mapping task with local-minimum failures.

## 1. Research question
Can a neural network whose output layer is split into N separately-softmaxed categorical "code" variables (sizes M_1…M_N) — with labels predicted from empirical joint-code/label associations — achieve classification capacity ∏M_j using only ∑M_j output neurons, and can this "indeterminate probability" mechanism solve problems (like 12-bit→4096-class mapping) that defeat ordinary networks?

## 2. Dataset / schema
- **MNIST:** 70,000 handwritten digits, used in a clustering formulation (cluster shapes like {2,10}).
- **Toy binary-to-decimal:** 12-bit input vectors mapped to 4,096 classes (all 2^12 combinations); the paper's headline demonstration.
- No real-world, noisy, or sports dataset.

## 3. Method / model
- Output neurons partitioned into N groups ("code variables"), each group softmaxed separately; each variable takes values in {0…M_j−1}; the joint code space has ∏M_j combinations from ∑M_j neurons.
- Inference: two rolling accumulators H (joint code/label counts) and G (marginal code counts) over a forgetting window T, plus a small ε for unseen combos; labels are assigned from empirical P(label | code) associations — not learned end-to-end by gradient descent.
- Optional subspace (auxiliary) labels to disambiguate; MNIST experiments use a "batch sample clustering" front end.
- Claimed capacity: with 24 output neurons (two 12-ary variables… in the paper's bit-mapping setup, 24 outputs) the model represents 4,096 classes.

## 4. Equations & assumptions
The paper's equation spine (Eqs. 1–19 in the paper's numbering): softmax-per-code-variable definitions; the joint-code counting accumulators H and G with forgetting window T; the ε-smoothing for unobserved code combinations; the empirical conditional label rule P(label|code) = H/G; subspace-label disambiguation rules; and the MNIST clustering-split objectives. The load-bearing assumptions are strong conditional-independence claims about the code variables given the label (and vice versa) — which the paper itself states "can neither be proved nor falsified." Additional implicit assumptions: the training data visits enough of the ∏M_j code space to populate H/G (exponential sample complexity in the worst case); the forgetting window T and ε are set appropriately; the chosen split shape (e.g., {2,10}) is adequate.

## 5. Features / target
- MNIST: raw pixel vectors → digit label (via clustering codes).
- Bit-mapping: 12-bit binary input vector → integer class in [0, 4095].

## 6. Validation design
- MNIST clustering: split {2,10}, ε=2, batch size 64, T=5, 5 epochs, 876 rounds; convergence judged by train accuracy and code-usage statistics.
- Binary-to-decimal: without auxiliary bit labels — 69.5% train accuracy (failure); with all 12 bit-level auxiliary labels — 100% train accuracy using 24 outputs (the headline, but the auxiliary labels essentially hand the model the answer).
- No test-set generalization numbers reported in the extracted text; no baselines against standard architectures on the same tasks.

## 7. Numerical results / baselines
- Binary-to-decimal without auxiliary labels: 69.5% train accuracy (the model fails to learn the mapping).
- Binary-to-decimal with 12 bit-level auxiliary labels: 100% train accuracy with 24 output neurons vs 4,096 classes — presented as the capacity triumph, but the auxiliary labels provide the factorization directly.
- MNIST clustering runs converge but the paper reports train-accuracy-style statistics, not held-out classification accuracy vs any baseline.
- The paper also reports sensitivity to split shape, T, ε, and initialization (local minima). All numbers are the paper's claims; no independent benchmark.

## 8. Code / data availability
Code stated: https://github.com/Starfruit007/ipnn. (Not verified runnable in this offline review.)

## 9. Leakage & limitations
- **Unfalsifiable core:** the authors' own words — the key independence assumptions "can neither be proved nor falsified." A method whose premises are declared untestable cannot be adopted on evidence.
- **Capacity ≠ learnability:** ∏M_j combinations exist combinatorially, but populating the empirical H/G tables requires seeing a large fraction of the joint code space — the "exponential capacity" comes with exponential sample complexity, defeating the claimed efficiency.
- **The headline result is circular:** 100% on binary-to-decimal requires all 12 auxiliary bit labels, which encode the factorization the model is supposed to discover; without them it manages 69.5%.
- **Toy-only evidence:** MNIST clustering and a synthetic bit-mapping task; no noisy real data, no generalization metrics, no baselines.
- **Optimization fragility:** reported dependence on split shape, forgetting window T, ε, and initialization — local minima abound.
- **No uncertainty semantics:** despite the "probability" branding, the outputs are empirical frequency tables over codes, with no calibrated probabilistic interpretation — nothing here transfers to GSE's calibration work.
- External validity to sports modeling: none.

## 10. GSE overlap
Per `existing-research-map.md`, GSE's representation-learning lane (ML brief area 3, TabTransformer 2606.09327, representation learning on play-by-play) covers learned embeddings for sports prediction. IPNN offers nothing in that direction: it is not a representation learner but a combinatorial output-coding scheme with frequency-table inference. It is **not a duplicate** — but it is also not a capability: there is no evidence it learns anything a standard softmax or hierarchical-softmax cannot, and its inference machinery is unsuited to gradient-trained sports models. The 15-area ML brief's representation topics remain the correct vehicle for any output-structure work.

## 11. GSE implementation spec
No build recommended. The closest legitimate idea — factorized output spaces for large discrete label sets (e.g., exact-score or full slate outcome prediction) — is already better served by hierarchical softmax or autoregressive factorization, both standard, calibrated, and gradient-trainable. Effort: zero; do not prototype.

## 12. Reproducible test
To close the lane empirically rather than on argument alone: implement the paper's released code on the binary-to-decimal task exactly as described (24 outputs, no auxiliary labels) and check whether train accuracy reproduces ~69.5% rather than converging to 100% with more epochs — confirming the capacity claim does not survive without the auxiliary supervision. Expected outcome: reproduces the failure, confirming §9. (Not worth GSE engineering time; noted for completeness.)

## 13. Acceptance / rejection gate
**Adopt** only if a replication shows ≥95% *test* accuracy on a held-out bit-mapping task with NO auxiliary labels, using ≤30 output neurons, and the same machinery then beats a 2-layer MLP baseline on a noisy real classification task (e.g., MNIST with label noise) — i.e., the capacity claim must survive without hand-fed factorization. **Otherwise reject.** The paper's own 69.5% number already fails this gate.

## 14. Improvement experiment
If the combinatorial-coding idea were ever revisited, the honest version is **learned codebooks with gradient flow**: replace the frequency-table H/G inference with a VQ-VAE-style discrete latent code trained end-to-end, where the "exponential capacity" claim can be tested against reconstruction/generalization error as codebook size grows. Test whether test-set log-likelihood improves over a flat softmax baseline at matched parameter count — this converts the paper's unfalsifiable combinatorics into a measurable representation-learning hypothesis.
