# [1971] ML4C: Seeing Causality Through Latent Vicinity (arXiv:2110.00637)

**Citation:** Microsoft Research authors (2021). *ML4C: Seeing Causality Through Latent Vicinity*. arXiv:2110.00637. URL: https://arxiv.org/abs/2110.00637
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; abstract, §§1–4, featurization, asymptotic-correctness proof sketch, experiments Table 1, learnability studies).
**Verdict:** ADAPT

## 1. Research question
Unsupervised causal learning never sees ground-truth graphs. Can *supervised* causal learning (SCL) — training on datasets with known causal relations — do better, and what exactly does supervision buy? Starting from the observation that SCL targeting a non-identifiable edge is no better than random guessing, the paper proposes a two-phase paradigm (1: determine identifiability; 2: classify orientation) and instantiates it for discrete data.

## 2. Dataset / schema
- Training: labeled data "collected from synthesis" — synthetic discrete datasets generated from known DAGs (UTs labeled v-structure/non-v-structure from ground truth).
- Test: bnlearn benchmark networks (discrete): child (20 nodes/25 edges), insurance (27/52), plus others in Table 1.
- Learnability studies: varied sample sizes (robustness), imperfect skeleton inputs (tolerance), weak vs strong predicate comparisons (reliability).

## 3. Method / model
ML4C:
- Input: dataset + skeleton (skeleton given or learned).
- Core: ML4C-Learner, a binary classifier whose target is whether an Unshielded Triple (UT: X–Z–Y with X,Y nonadjacent) is a v-structure (X→Z←Y). Each UT classified as v-structure gets oriented; v-structures + Meek rules → CPDAG output.
- Why this target: by Markov completeness, v-structures are invariant across the Markov equivalence class and fully determine the CPDAG given the skeleton; an identifiable UT *is* a v-structure — so one classifier serves both paradigm phases.
- Featurization ("latent vicinity"): for each UT, features from its vicinity (neighbors in the skeleton) capturing conditional dependencies and "structural entanglement" — designed to reveal the asymmetry distinguishing v-structures from non-v-structures.
- Theory: asymptotic correctness proved via "discriminative predicates" (weak predicates: false ⟹ non-v-structure; strong predicates: sound and complete). PC and Majority-PC recast as hand-crafted special-case classifiers, also asymptotically correct — ML4C learns a better mechanism than the hand-crafted ones.
- Code: https://github.com/microsoft/ML4C (stated).

## 4. Equations & assumptions
- UT definition, v-structure, Markov equivalence (same skeleton + same v-structures ⟺ equivalent).
- Discriminative predicate formalism (Lemmas 4.2/4.3): weak/strong predicates with stated soundness/completeness.
- Assumptions: discrete data; Markov, faithfulness, causal sufficiency (standard); skeleton available (tolerance to misspecification studied empirically).

## 5. Features / target
Supervised: inputs are per-UT feature vectors (vicinity conditional-dependency + structural-entanglement features); target is the binary label v-structure/not, from ground-truth DAGs. At inference: dataset + skeleton in, oriented CPDAG out.

## 6. Validation design
- End-to-end on bnlearn benchmarks: SHD + UT-level F1 vs 4 supervised competitors (Jarfo, D2C, RCC, NCC) and 12 unsupervised (PC, CPC, MPC, GMB, GES, GS, HC, CDS, GNIP, DGNN, BLIP, GRSP). ML4C given skeleton input; tolerance study reruns with imperfect skeletons for fairness.
- Learnability: (i) distance to the asymptotically-correct classifier in finite samples; (ii) reliability vs individual predicates; (iii) robustness across sample sizes; (iv) tolerance to skeleton misspecification.
- No time-ordered splits (cross-sectional benchmarks).

## 7. Numerical results / baselines
Table 1 (SHD / UT-level F1):
- child (20/25): ML4C 0 / 1.0 vs PC 22 / .12, CPC 13 / .12, GMB 9 / .74, GES 15 / .47, GS 13 / .59.
- insurance (27/52): ML4C 5 / .89 vs PC 36 / .39, GMB 19 / .76, GES 34 / .46, GS 28 / .56.
- Paper: "ML4C significantly outperforms all competitors, with the highest average F1-score and consistent performance across all datasets"; rank-by-SHD and rank-by-F1 rows put ML4C first.
- Learnability: ML4C-Learner beats individual weak/strong predicates (reliability); robust across sample sizes where CI-test-based methods degrade; tolerates imperfect skeletons.

## 8. Code / data availability
Code: https://github.com/microsoft/ML4C (stated). bnlearn benchmarks public. Training synthesis recipe described in paper.

## 9. Leakage & limitations
Adversarial notes: (1) Discrete data only — sports indicators are continuous; discretization loses information and the v-structure theory is stated for the discrete case. (2) Supervised = needs training DAGs: the paper trains on synthetic DAGs, so transfer to football depends on the synthetic distribution matching reality — sample bias in training data is explicitly flagged by the paper as a failure mode ("could be worse due to sample bias"). (3) Skeleton is an input — errors propagate; tolerance studied but the headline numbers use good skeletons. (4) Only orients what v-structures + Meek rules can reach; many edges remain undirected (the identifiability ceiling the paper itself establishes). (5) bnlearn networks are small, clean, discrete — far from noisy sports panels.

## 10. GSE overlap
New capability — the *orientation* layer. Ledgers 1962–1966 produce skeletons / partial orientations; PCMCI+ orients lagged links by time but leaves contemporaneous links largely unoriented (Markov equivalence). ML4C is the purpose-built tool for exactly that gap: orient unshielded triples in the learned skeleton. The existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has nothing on supervised causal learning. Extension, not duplicate.

## 11. GSE implementation spec
- Data: discretize the ~35 team-season indicators into tertiles (low/med/high) for the ML4C stage only.
- Training: synthesize 5000 discrete DAGs with football-plausible structure (layered: game-context → efficiency → scoring → outcome; 20–35 nodes, sparse), sample discrete data, train ML4C-Learner (or reimplement the featurization + gradient booster) on UT labels. Deliberately vary the synthetic distribution (edge densities, noise levels) to blunt the sample-bias failure mode.
- Inference: take the consensus skeleton from ledgers 1962–1966, run the trained orienter on its UTs, apply Meek rules → oriented CPDAG; edges the orienter leaves undirected stay undirected (honest identifiability ceiling).
- Effort: ~4 engineer-days (public code; work is the football-plausible DAG synthesizer + discretization).

## 12. Reproducible test
Dataset: (a) synthetic football-like DAGs held out from training — UT-level F1 ≥ 0.8 required (paper achieves 0.89–1.0 on bnlearn); (b) real team-season data: orientation stability across season splits (fraction of UTs oriented the same way ≥ 0.7); (c) domain check: oriented v-structures must include known colliders (e.g. offensive EPA → win ← defensive EPA; pressure → sacks ← coverage quality) at ≥80%.

## 13. Acceptance / rejection gate
ADOPT the supervised orienter if: (a) held-out synthetic UT-F1 ≥ 0.8; (b) real-data orientation agreement across season splits ≥ 0.7; (c) ≥80% of hand-labeled known colliders recovered; (d) adding orientations strictly improves the quantitative-probing hit rate (ledger 1967) vs the unoriented skeleton — orientations must earn their keep. Reject if (a) fails (synthetic distribution doesn't transfer) or if orientations *hurt* probe hit rate (the orienter is confidently wrong).

## 14. Improvement experiment
Beyond the paper: *continuous* ML4C — replace the discrete featurization with vicinity features computed from continuous CI-test statistics (partial correlation profiles, GPDC residuals) and train the UT classifier directly on continuous synthetic SEMs. Hypothesis: skipping discretization recovers the information the discrete version throws away, beating discrete-ML4C on continuous benchmarks — and it would let GSE orient the PCMCI+ skeleton natively without a lossy discretization step. Testable on the paper's own bnlearn suite (discretized vs continuous variants).
