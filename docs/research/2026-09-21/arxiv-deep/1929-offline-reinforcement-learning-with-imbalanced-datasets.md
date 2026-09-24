# [1929] Offline Reinforcement Learning with Imbalanced Datasets (arXiv:2307.02752)

**Citation:** Li Jiang, Sijie Cheng, Jielin Qiu, Haoran Xu, WaiKin Chan, Ding Zhao (2023). *Offline Reinforcement Learning with Imbalanced Datasets*. arXiv:2307.02752. URL: https://arxiv.org/abs/2307.02752
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Real-world offline RL datasets have imbalanced state coverage (Zipf/power-law, from skewed behavior policies), while benchmarks are near-uniform — do standard offline RL methods (esp. distributional-constraint methods like CQL) survive imbalance, and if not, what fixes them? The paper characterizes imbalanced datasets, proves why CQL degrades, and proposes retrieval-augmented CQL (RB-CQL).

## 2. Dataset / schema
D4RL variants with controlled imbalance levels (Easy → Medium → Hard → Hard+): AntMaze (medium) and MuJoCo locomotion with varying random-dataset ratios (95%, 97%). Imbalance parameterized by a power-law exponent over state visitation. Baselines: CQL, TD3+BC, others. D4RL public.

## 3. Method / model
**RB-CQL = CQL + retrieval.** (1) Build an auxiliary dataset D_aux of related experiences (other agents' trajectories / same-environment states). (2) Retrieval: encode query states s_ori and auxiliary states s_aux (static indexes; encoder Enc for high-dim, raw states for low-dim MuJoCo), compute similarity via MIPS (dense inner product, Sim=exp(⟨Enc(s_ori),Enc(s_aux)⟩)-style) or Euclidean distance, retrieve nearest-neighbor states. (3) Augment CQL training with retrieved experiences so poorly covered states get informed updates. Theory: CQL applies a *uniform* divergence penalty across all state-action pairs, which under imbalance over-penalizes rare states and amplifies distributional shift — the provable failure mode.

## 4. Equations & assumptions
- Imbalanced dataset: behavior-policy state visitation d^{π_β}(s) follows a power law (Zipf) with imbalance degree set by an exponent parameter.
- Failure claim: CQL's penalty term is "a constant for every state-action pair, and thus the value function learned by CQL is changed to the same extent at all possible state-action pairs" — under imbalance this uniform penalty "may ultimately lead to a decline in the performance of the learned policy and even result in failure."
- Retrieval similarity: Sim(s_ori^i, s_aux^i) based on exp inner product (MIPS) or Euclidean distance over encoded states.
- Assumptions: auxiliary dataset from "same and relevant environments"; low-dim states in experiments (high-dim/embedding-network study explicitly deferred); retrieval indexes static.

## 5. Features / target
Input: MuJoCo/AntMaze states (low-dimensional). Target: conservative Q-values with retrieval-augmented Bellman updates; policy = greedy/actor over Q. Horizon: discounted infinite-horizon.

## 6. Validation design
D4RL with graded imbalance (Easy/Medium/Hard/Hard+), not time-ordered (MDP benchmark). Baselines: CQL, TD3+BC, SOTA offline methods. Metrics: normalized return; robustness of performance across imbalance levels. Retrieval visualization (Figure 4: retrieved locomotion postures "similar from the macroscopic point of view").

## 7. Numerical results / baselines
- AntMaze-medium across Easy→Hard: "RB-CQL is robust to the imbalance and maintains its performance to a certain degree, especially from Easy to Medium without any performance drop," while "CQL decreases from 60 to 20, and TD3+BC decreases from 20 to 0" — "the performance gap between RB-CQL and CQL grows with the increasing imbalance."
- MuJoCo locomotion: "RB-CQL outperforms other methods with 95% and 97% random dataset ratio."
- Failure boundary: "All algorithms, including RB-CQL, fail in the extremely hard AntMaze task Hard+" — retrieval helps up to a point.
- Limitations (authors): "the retrieval process requires huge computation sources from the CPU and ... the lack of study on high dimensional inputs, which requires the embedding networks."

## 8. Code / data availability
None stated in the paper. D4RL public.

## 9. Leakage & limitations
- Experiments only on low-dimensional states; the embedding-network path needed for rich states is untested.
- Retrieval is CPU-heavy (nearest-neighbor over a large auxiliary set per update).
- Auxiliary dataset assumed "same and relevant" — in GSE, cross-season slate similarity is plausible but unvalidated.
- Hard+ failure shows retrieval is not a cure for extreme coverage gaps.
- 2023 paper; retrieval-augmented RL has since advanced (not covered).

## 10. GSE overlap
Directly qualifies ledger 1923 (CQL): GSE's offline dataset is imbalanced — common slate regimes (e.g., typical Sunday 13-game slates) dominate, while rare regimes (Thanksgiving/Christmas slates, extreme-weather weeks, playoff weeks, weeks with massive line moves) have few samples. Uniform CQL conservatism will over-penalize exactly the rare high-leverage weeks. No repo work addresses dataset imbalance for decision policies. Extension of 1923, not duplicate.

## 11. GSE implementation spec
1. Quantify imbalance: histogram weekly slate states (2021–2024) over regime features (slate size, mean total, weather flags, holiday); fit power law; identify thin regimes (<30 samples).
2. Build D_aux: all historical weeks 2015–2024 (pre-2021 weeks excluded from the main training set become the auxiliary pool) + bootstrap-perturbed copies of thin-regime weeks (jitter edges/odds within measurement noise).
3. State encoder: small MLP over slate features → 32-dim embedding; precompute FAISS index over D_aux; retrieve k=8 nearest neighbors per thin-regime training state (MIPS).
4. Train RB-CQL: standard CQL loss on main data + retrieved (s,a,r,s′) tuples upweighted for thin regimes.
5. Effort: ~2 weeks (FAISS retrieval + reweighting on top of the 1923 pipeline).

## 12. Reproducible test
Dataset: GSE logged picks 2021–2024; define thin regimes as above. Train plain CQL (1923) vs RB-CQL on 2021–2023; evaluate 2024 overall AND on thin-regime weeks only. Baselines: plain CQL, TD3+BC-style baseline. Metrics: ROI and max drawdown overall + thin-regime-only ROI. The paper predicts the gap concentrates in thin regimes.

## 13. Acceptance / rejection gate
ADOPT iff on 2024 thin-regime weeks RB-CQL beats plain CQL ROI by ≥3pp with overall-season ROI no worse than −1pp vs plain CQL; otherwise REJECT (retrieval complexity not justified).

## 14. Improvement experiment
Replace static kNN retrieval with a learned retriever: train the state encoder contrastively so that retrieved neighbors are those whose *optimal stake* (hindsight) matches, not just whose features match. Tests whether task-aware similarity beats feature similarity — the paper's macroscopic-similarity visualization suggests feature similarity is coarse, and stake-relevant similarity should retrieve more useful experiences for thin regimes.
