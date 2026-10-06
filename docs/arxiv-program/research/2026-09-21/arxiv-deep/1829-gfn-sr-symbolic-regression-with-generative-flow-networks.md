# [1829] GFN-SR: Symbolic Regression with Generative Flow Networks (arXiv:2312.00396)

**Citation:** Sida Li, Ioana Marinescu, Sebastian Musslick (2023). *GFN-SR: Symbolic Regression with Generative Flow Networks*. arXiv:2312.00396v1. URL: https://arxiv.org/abs/2312.00396
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

Sampling expressions proportional to reward (GFlowNet) instead of maximizing expected reward fixes DSR's mode-collapse under noise; directly relevant to GSE because sports data is noisy and near-equivalent equations abound, so we need a DIVERSE candidate set, not one argmax; needs adaptation to real sports noise levels and validation beyond the authors' synthetic noisy benchmark.

## 1. Research question
DSR's RL objective (maximize expected reward) collapses onto a single high-reward expression — fatal under noise, where symbolically different equations produce deceptively similar datasets. Can casting SR as a GFlowNet problem — learn a stochastic policy that samples complete expression trees with probability π(s) ∝ R(s) — generate a diverse set of high-quality candidates and beat DSR/BSR/GP at exact recovery under noise?

## 2. Dataset / schema
- Noiseless: Nguyen 12 benchmarks, 20 trials/method, ~25M expression evaluations per run per function, mean ± SE of RMSE (Table 1); baselines GP, DSR, BSR deliberately tuned to equal evaluation budgets.
- Noisy synthetic benchmark (the key experiment): 6 equations in 3 pairs (f_i, g_i), each pair symbolically different but numerically close on the domain (e.g. f_1 = x³+x²+x vs g_1 = sin(x)(√x+exp(x))); 40 points uniform per equation (20 train / 20 test); 10% Gaussian noise ε∼0.1·N(0,Var(y)); 20 trials/method, ~25M evaluations each. Recovery = exact symbolic equivalence (stricter for GFN-SR: ground truth must match the most frequently sampled post-training equations; for DSR/BSR any Pareto-frontier match counts).

## 3. Method / model
- Expression-tree construction as DAG traversal: states = complete + intermediate trees built by pre-order node addition from empty tree s_0; terminal states = complete trees; reward R(s) on terminals.
- GFlowNet objective: sample s with π(s) ∝ R(s), Z = Σ R learned; forward policy P_F(·|s) = categorical over library tokens (LSTM policy fed one-hot parent+sibling tokens, with DSR-style in-situ constraint masking, Fig. 2).
- Training: trajectory balance (TB) loss (Malkin et al. 2022) on trajectories τ = (s_0→…→s_n=s).
- **Adaptive reward baseline** (novel): R_B(s) with baseline B>0 and scaling γ∈[0,1] reshapes rewards so low-reward expressions get relatively lower and high-reward get relatively higher — concentrates the sampled distribution on modes without collapsing to one. B initialized = mean vanilla reward of first batch, annealed toward mean reward of top performers seen so far. Vanilla reward: R(s) = 1/(1+RMSE(s)).

## 4. Equations & assumptions
π(s) ∝ R(s); R_vanilla(s) = 1/(1+RMSE(s)); R_B(s) = baseline-adjusted variant (Eq. in Sec. 2.4, B>0, γ∈[0,1]).
TB loss on τ=(s_0→s_1→…→s_n=s).
Assumptions: (1) DAG/tree construction covers the solution space; (2) reward ∝ satisfaction with the solution; (3) TB training converges to π∝R; (4) the baseline schedule doesn't distort the target distribution's mode ordering; (5) 25M evaluations is a fair equalizer across methods; (6) most-frequent-sample is the right point estimate for GFN-SR.

## 5. Features / target
Nguyen: 1–2 inputs; noisy benchmark: single input x, 40 points. GSE analog: team-game features → metric targets.

## 6. Validation design
Noiseless Nguyen: RMSE mean±SE over 20 seeds, equalized ~25M evals. Noisy: 6 near-degenerate equation pairs, 10% noise, recovery rate over 20 seeds with asymmetric strictness (noted above). Baselines: GP, DSR, BSR.

## 7. Numerical results / baselines
- Noiseless Nguyen (Table 1): deep SR methods dominate; DSR leads most, but GFN-SR — despite no return-maximization objective — is competitive and outright best on Nguyen-5 and Nguyen-12.
- Noisy 10% benchmark (Table 2), recovery rates (GFN-SR / DSR / BSR): f_1: 100/75/30; g_1: 15/5/5; f_2: 15/5/0; g_2: 95/40/90; f_3: 95/5/5; g_3: 85/90/75. **GFN-SR beats both competitors on 5 of 6 equations** (loses only g_3 to DSR 90 vs 85). Paper's diagnosis: DSR's return-maximization locks onto the wrong-but-high-reward mode of each pair; BSR's linear-mixture-of-trees form can't recover exactly.
- Authors' own limitation: proven only on Nguyen + synthetic; SRBench/Feynman and real-world noisy data explicitly listed as future work.

## 8. Code / data availability
"Source code for GFN-SR will be available at https://github.com/listar2000/gfn-sr" — stated as future, not confirmed live in text.

## 9. Leakage & limitations
- Synthetic 1-D noisy benchmark only; 40-point datasets; noise is clean Gaussian 10% — sports noise is heavier-tailed and structured.
- g_1 recovery is 15% even for the winner — near-degenerate pairs remain hard for everyone.
- 25M evaluations/run is a massive budget; no wall-clock comparison.
- No code confirmed available; reimplementation needed.
- Asymmetric recovery definitions (stricter for GFN-SR) actually strengthen the claim, but the benchmark is author-designed — independent replication on SRBench pending per authors.
- LSTM policy + TB training is finicky; no hyperparameter robustness study.

## 10. GSE overlap
New capability and the philosophical complement to 1824 (DSR risk-seeking = exploit the best mode; GFN-SR = sample all good modes). For GSE's metric invention, the DIVERSE-CANDIDATES property is arguably more valuable than single-best: we want 5–10 distinct near-equivalent "true QB efficiency" formulas to compare for stability across eras, not one argmax that might be a noise artifact. No existing GSE GFlowNet code.

## 11. GSE implementation spec
- Reimplement GFN-SR-lite in PyTorch: LSTM policy over pre-order token sequences, in-situ constraint masks (from 1824), TB loss, adaptive baseline B schedule; reward = 1/(1+NMSE) on nflverse train slice.
- Use as a DIVERSITY generator: sample 200 post-training equations, cluster by symbolic skeleton, keep cluster medoids as the candidate metric set → feed each through the 1826 selector.
- Data: nflverse team-game 2015–2023 (target points/drive), test 2024–2025. Effort: ~1 week reimplementation (GFlowNet TB is standard); or adapt an existing GFlowNet library to the SR DAG.

## 12. Reproducible test
Dataset: nflverse QB-game 2015–2023 train / 2024–2025 test; target EPA/dropback; 12 features. Baselines: DSR-style risk-seeking RL (single best) vs GFN-SR (top-5 diverse by sampling frequency). Metric: (a) best test r among candidates; (b) candidate-set diversity = mean pairwise tree-edit distance; (c) stability = rank correlation of candidate test-r between 2024 and 2025 seasons.

## 13. Acceptance / rejection gate
ADOPT GFN-SR as the candidate generator if its top-5 diverse set contains an equation beating DSR's single best by ≥0.02 test r on 2024–2025 AND the set's cross-season stability (2024 vs 2025 rank correlation) exceeds DSR's top-5-beam stability; REJECT if sampling collapses to near-duplicates (diversity < DSR beam) or no candidate beats the baseline.

## 14. Improvement experiment
"Reward shaping with the LM prior": replace vanilla R(s)=1/(1+RMSE) with R(s)·P_LM(s)^λ where P_LM is the 1826 sports-corpus n-gram prior — i.e., sample proportional to fit × domain-plausibility. This fuses the two papers' strengths (diversity + domain sense) and tests whether the GFlowNet's multi-modality survives prior-shaping or collapses back to one mode — directly answering whether GSE should run prior-shaped diverse search or plain search + post-hoc selection.

---
Lane: symreg_equation_discovery · Block 1822–1841
