# [1954] FootBots: Motion Prediction in Soccer (arXiv:2406.19852)

**Citation:** (Kognia Sports Intelligence / CSIC-UPC, 2024). *FootBots* — encoder-decoder transformer for motion prediction and conditioned motion prediction in soccer. arXiv:2406.19852. URL: https://arxiv.org/abs/2406.19852
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

permutation-equivariant set attention (SAB) with decoupled temporal/social attention is the right architecture for 22-player NFL tracking: no agent ordering, social interaction modeling, and CONDITIONED motion prediction (predict players given ball / offense given defense) maps directly to GSE's "what-if" play simulation.

## 1. Research question
Can an encoder-decoder transformer with permutation equivariance outperform baselines on multi-agent soccer motion prediction — i.e., do decoupled temporal (SAB_T) and social (SAB_S) set-attention blocks plus a multi-attention-block decoder capture player-ball dynamics better, and does conditioned motion prediction (CMP: predict a subset of agents given others) work?

## 2. Dataset / schema
LaLiga 2022–2023 real tracking data + a tailored synthetic dataset for controlled social-attention analysis. 2D player/ball trajectories; prediction horizon ~4 seconds (T ≤ t constraint).

## 3. Method / model
FootBots: encoder-decoder transformer.
- Set Attention Block (SAB, Lee et al.): transformer encoder block WITHOUT positional encoding over the agent set → permutation equivariance (no agent ordering needed).
- Encoder: FFN + temporal positional encoding → SAB_T (temporal dynamics) → SAB_S (social interactions) sequentially decoupled (cheaper than joint temporal-social attention) → context tensor C.
- Decoder: Multi-Attention Block Decoder (MABD) with cross-attention; decoder input H depends on task: H = C_{t−T:t} for MP; H = FFN(X^C_{t+1:t+T}) ∪ C^P_{t−T:t} for CMP (condition on known future of subset C, predict subset P).
- CMP tasks: predict players given ball position; predict offense given ball+defense; predict defense given ball+offense; predict ball given all players.

## 4. Equations & assumptions
MP: f(X_{0:t}) = X_{t+1:t+T}. CMP: f(X^P_{0:t} | X^C) with conditioning subsets.
MHA: softmax(QK^T/√d_k)V; SAB = MHA block without positional encoding (permutation equivariant).
Assumptions (stated): permutation equivariance is required (varying player compositions); T ≤ t (prediction horizon ≤ observation length); temporal and social attention can be decoupled sequentially without loss.

## 5. Features / target
Inputs: partial 2D trajectories of M agents (M−1 players + ball). Target: future 2D positions over ~4s horizon. Tasks: MP + 4 CMP variants.

## 6. Validation design
Synthetic dataset (controlled social-interaction tests) + LaLiga real data. Baselines: non-social RNN, social pooling, GNN+recurrent, GAT+TCN, prior transformer sports models. Metrics: trajectory prediction error (ADE/FDE-style); qualitative + quantitative CMP analysis.

## 7. Numerical results / baselines
(Paper claims.) FootBots "outperforms baselines in motion prediction and excels in conditioned tasks" on LaLiga data; synthetic insights confirm the social attention mechanism's effectiveness and the value of CMP. Exact numeric tables not extracted from the text.

## 8. Code / data availability
Video demo: https://youtu.be/9kaEkfzG3L8 (stated). No code-release statement extracted.

## 9. Leakage & limitations
Standard trajectory-prediction splits. Limitations: (i) SOCCER, ~4s horizons — American football plays are 4–7s but the tactical structure (downs, line of scrimmage) differs; (ii) 2D only, no velocity/acceleration features mentioned; (iii) CMP conditioning is on ground-truth future of the conditioning set — at GSE deployment we'd condition on HYPOTHESIZED futures (counterfactual), which is a harder task; (iv) no numeric results extracted.

## 10. GSE overlap
Complements 1953 (GNS message passing): FootBots is the TRANSFORMER alternative for the same within-play tracking problem — set attention instead of graph message passing. No overlap with existing GSE work. The CMP framing is unique in the lane: no other paper does conditioned (subset-given-subset) motion prediction.

## 11. GSE implementation spec
"GSE-FootBots": within-play NGS tracking model with decoupled temporal/social set attention. Agents = 22 players + ball, permutation-equivariant (no jersey ordering). CMP tasks reframed for football: (a) predict ball-carrier trajectory given all blockers/defenders (broken-tackle analysis); (b) predict defense given offensive routes (coverage diagnosis); (c) predict receivers given QB+ball (route-concept evaluation); (d) counterfactual CMP: condition on a HYPOTHESIZED ball trajectory ("what if the QB throws to the flat instead of deep?") and predict defensive reactions — the core of GSE's play-design/what-if content. Feed the predicted trajectories into the 1953 event head for play outcomes.

## 12. Reproducible test
NGS tracking 2018–2024; train 2018–2023, test 2024. Metrics: (a) MP: 4s ADE/FDE vs baselines (independent LSTMs, GNS-1953); (b) CMP: prediction error on the predicted subset given ground-truth conditioning; (c) counterfactual CMP: condition on perturbed ball trajectories, measure plausibility (defender reaction realism scored by the 1953 event head's likelihood). Success = beats independent-LSTM baseline on ADE by ≥15% AND CMP error within 20% of MP error (conditioning helps rather than hurts).

## 13. Acceptance / rejection gate
ADOPT the FootBots architecture (decoupled temporal/social set attention) as GSE's tracking-motion backbone if it beats both the independent-LSTM baseline AND the GNS-1953 model on 2024 ADE/FDE (pick the winner; they're competing solutions to the same problem). ADOPT CMP for the what-if content engine if counterfactual conditioning produces plausible reactions (event-head likelihood within 2× of real plays). REJECT if social attention adds nothing over temporal-only (then interactions don't matter at this granularity — test via ablation).

## 14. Improvement experiment
Beyond the paper: down-aware conditioning — add down/distance/yardline/formation embeddings to the context tensor C, since NFL motion is strongly conditioned on game situation (unlike soccer's continuous flow). Expectation: biggest gains on CMP tasks (e.g., predicting defense given offense improves when the model knows it's 3rd-and-long). Test: ADE with vs without situational embeddings.
