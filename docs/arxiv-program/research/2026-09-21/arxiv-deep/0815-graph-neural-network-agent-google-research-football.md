# [0815] Graph Neural Network based Agent in Google Research Football (arXiv:2204.11142)

**Citation:** Jinglong Liu, Yuhao Shi, Yizhan Niu, Jiren Zhu (2022). *Graph Neural Network based Agent in Google Research Football*. arXiv:2204.11142. URL: https://arxiv.org/abs/2204.11142
**Ledger completed:** 2026-09-21. **Read:** full text (PDF fetched from https://arxiv.org/pdf/2204.11142v1.pdf — not in the local cache; converted with pdftotext).
**Verdict:** ADAPT — the player-graph representation (24 nodes × 9 features, GCN/GAT value head) is directly portable to NFL Next Gen Stats tracking data for play-outcome modeling; the DQN game-playing apparatus and the paper's own training protocol (batch size 1, 0.3M steps vs 20M-step baselines) are not to be copied.

## 1. Research question
Can a graph neural network represent a football (soccer) game state better than a CNN for reinforcement learning? The Google Research Football observation is a dictionary of player/ball coordinates — a CNN on a rasterized "small map" wastes capacity and trains slowly. The paper builds a DQN whose value function is a GCN or GAT over a 24-node player graph, and asks whether it learns faster (fewer steps) than CNN-based PPO/IMPALA/DQN baselines on the gfootball 11v11 scenarios.

## 2. Dataset / schema
No static dataset — training data is generated online by self-play in the gfootball simulator (v2.6). Observation per step: dict of ball + 22 player positions/speeds, transformed by the authors into a graph with 24 nodes (22 players, 1 ball, 1 "any other information" node), each node carrying 9 features (feature semantics not enumerated — stated only as "9 features in the first layer representing the features of each graph node"). Scenarios: 11v11 easy stochastic (difficulty 0.05), 11v11 hard stochastic (0.95), 11v11 competition (halftime games, 0.6), 11v11 Kaggle (1.0). Rewards: scoring + checkpoints (ball-possession region rewards). Evaluation: average goal difference vs the built-in rule-based AI. Hardware: Intel E5-2678 v3, NVIDIA Tesla V100 32GB, 40GB RAM; PyTorch 1.8.1, CUDA 11.2, cuDNN 8.

## 3. Method / model
DQN with experience replay; the Q-network is a GNN instead of a CNN. Two variants:
- GCN: 2 graph-convolution layers; 9 input features/node → 32 hidden → 19 outputs (one Q-value per action; action_size=19 from the environment).
- GAT: 2 graph-attention layers + a fully connected layer computing attention coefficients, softmax-normalized over neighborhoods.
Two networks as in vanilla DQN: Q_network_local (trained every step from replay buffer) and Q_network_target (copied from local every few steps); PyTorch optimizer on local params. ε-greedy action selection. Hyperparameters (exact as stated): learning rate 0.0001, batch size 1 ("to prevent the unsteadiness of learning" —sic), gradient clipping 0.7 (text: "the gradient is set as 0.7"), 1 epoch = 3,000 episodes, 100 epochs total ≈ 0.3M steps.

## 4. Equations & assumptions
GAT attention: e_ij = a(Wh_i, Wh_j) (Eq. 1); α_ij = softmax_j(e_ij) = exp(e_ij)/Σ_{k∈N_i} exp(e_ik) (Eq. 2).
DQN: TD Local = Q(s,a;θ) (Eq. 3); TD Target = r + γ·max_{a'} Q(s',a';θ⁻) (Eq. 4); Loss = r + γ·max_{a'} Q(s',a';θ⁻) − Q(s,a;θ) (Eq. 5). (Note: Eq. 5 as printed is the signed TD error; the actual optimized loss is presumably its square/MSE — not stated.)
Assumptions (mostly unstated): fixed graph topology across steps (24 nodes; edges presumably complete or distance-based — NOT specified, a real gap); node features sufficient to capture game state; 19 discrete actions adequate; built-in-AI goal difference is a valid progress metric.

## 5. Features / target
Input: 24-node graph, 9 features per node (player/ball coordinates and related state; exact 9 not listed). Target: Q-values for 19 discrete actions (per-step action values); training target is the TD target r + γ max Q. Prediction horizon: single-step action values with discount γ (γ value not stated).

## 6. Validation design
No train/test split (online RL). Four gfootball scenarios × two architectures; learning curves (Figs. 4–7) of average score difference and reward over 100 epochs. Baseline comparison (Table III, exact): PPO / IMPALA / DQN from prior work [7] trained 20M steps vs GCN/GAT at 0.3M steps, compared on easy and hard stochastic schemas at "same number of epochs" (the paper's words — but steps differ by 66×, see §9). Time-ordering N/A.

## 7. Numerical results / baselines
Average score difference vs built-in AI (negative = losing; exact as stated in text):
- GCN: easy −0.37 (rising curve, "great result"), hard −2.23, competition −1.62, Kaggle −2.52.
- GAT: easy −1.13 (peaked −0.43 at epoch ~10 then declined), hard −1.41 (steadily rising — best GAT result), competition −2.62, Kaggle −2.59 (declining reward).
- Table III (exact): Easy — PPO 0.05, IMPALA −0.01, DQN −1.17, GCN −0.37, GAT −1.21; Hard — PPO −1.32, IMPALA −1.38, DQN −2.12, GCN −2.23, GAT −1.41; steps: baselines 20M, GCN/GAT 0.3M.
Paper's claims: GCN "has stronger learning ability in every schema" and is "more suitable in football games"; GAT "excellent" on hard schema, "transcends DQN and approximates IMPALA" on hard at 0.3M vs 20M steps; overall "efficient in low number of periods". My read: every reported number is negative (the agents lose to the built-in AI in all 8 settings); the sample-efficiency claim compares 0.3M-step runs against 20M-step baselines, which is not a controlled comparison.

## 8. Code / data availability
None stated (no repo link). gfootball environment is open-source (google-research/football, v2.6 used).

## 9. Leakage & limitations
- Adversarial: the headline "outperforming other DRL models with significantly fewer steps" rests on comparing 0.3M-step GNN runs to 20M-step baselines — a 66× compute difference that invalidates any efficiency claim; the honest comparison (equal steps) was not run.
- All final scores are negative — the agents never beat the built-in AI; "great result" is relative to worse baselines, not to competence.
- Batch size 1 with lr 1e-4 is an unusual, likely suboptimal training setup; gradient-clip 0.7 is stated without justification; γ, ε-schedule, replay size, target-update frequency all unstated — not reproducible from the paper.
- Graph construction is underspecified: edge definition (complete graph? k-NN? distance threshold?), the 9 node features, and the "1 node for any other information" are never defined.
- GAT collapses on easy (−0.43 → −1.13) and Kaggle (declining reward) — the paper hand-waves this as "schema too easy/hard" rather than diagnosing attention instability.
- Domain gap: soccer 11v11 continuous-control-ish DQN has no direct mapping to GSE's NFL pick prediction; only the representation idea (players-as-graph) transfers.

## 10. GSE overlap
Existing-research map: "GNN sports outcomes (2207.14124)" is listed as already absorbed (line 70) — a GNN-for-scores paper, distinct from this player-graph-RL work. Garrett's NGS program ("one of the single most important things in my website"; 48-post @NextGenStats inventory committed) makes tracking-data representations directly on-strategy. No duplication: nothing in the map covers graph representations of tracking data. This paper's transferable core is representation-only.

## 11. GSE implementation spec
Adaptation: take ONLY the graph-representation idea; discard the DQN/RL scaffolding. Build: per-play graph from NFL NGS tracking frames — 22 player nodes (+ ball node), node features = (x, y, speed, acceleration, orientation, team indicator, down/distance context broadcast), edges = complete graph with distance-weighted adjacency (fixing the paper's unspecified edges). GCN/GAT encoder → play-outcome head (EPA, success prob) or drive-outcome head, trained supervised on nflverse 2020–2025 play-by-play joined to NGS tracking (Big Data Bowl format). This gives a tracking-native play evaluator for: (a) live win-probability features, (b) matchup features for the pick model (e.g., separation-vs-man-coverage embeddings), (c) the "improvement experiment" of ledger 0812's synthetic-data lane (graph-conditional generation). Effort: ~2–3 weeks for data join + supervised GCN baseline; skip RL entirely.

## 12. Reproducible test
Dataset: NFL NGS tracking (Big Data Bowl releases) joined to nflverse play outcomes, 2020–2024 train / 2025 test. Protocol: supervised GCN (2-layer, hidden 32, per paper) predicting play EPA bucket from the tracking graph at snap+1s; baseline = gradient-boosted model on hand-engineered NGS aggregates (the current GSE-style approach). Metric: RMSE on EPA and AUC on play-success; time-ordered by season. Success = GCN beats the GBM baseline by ≥ 5% RMSE reduction — proving the graph representation extracts signal hand features miss (the paper's actual thesis, fairly tested).

## 13. Acceptance / rejection gate
ADAPT if on the 2025 tracking holdout the supervised player-graph GCN beats the hand-feature GBM baseline by ≥ 5% EPA-RMSE AND the attention/GAT variant's edge weights correlate sensibly with football structure (nearest defenders/opponents get weight — a sanity check the paper never ran). REJECT the GNN-tracking direction if it fails — the paper's own negative-vs-baseline scores and uncontrolled comparisons mean its architecture earns no prior credit; only the head-to-head on NFL data counts.

## 14. Improvement experiment
Two upgrades over the paper: (1) temporal graph — stack T frames (snap−1s … +2s) as a spatio-temporal GCN (ST-GCN) instead of the paper's single static frame; hypothesis: route development and closing speed are temporal, so ST-GCN beats static GCN on EPA prediction by a further margin. (2) Replace the paper's unspecified edges with a learned adjacency (graph attention over all 22 players, then sparsify) and test whether learned edges recover football structure (OL-DL, WR-CB matchups) — if they do, the edge weights become interpretable matchup features for the pick model, which is the real GSE product surface.
