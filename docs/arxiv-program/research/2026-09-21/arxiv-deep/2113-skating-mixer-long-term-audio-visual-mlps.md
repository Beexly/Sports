# [2113] Skating-Mixer: Long-Term Sport Audio-Visual Modeling with MLPs (arXiv:2203.03990)

**Citation:** Jingfei Xia, Mingchen Zhuge et al. (2022). *Skating-Mixer: Long-Term Sport Audio-Visual Modeling with MLPs*. arXiv:2203.03990v1. URL: https://arxiv.org/abs/2203.03990
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2203.03990v1).
**Verdict:** ADAPT
**Rationale:** MLP-Mixer-based multimodal architecture with a Memory Recurrent Unit (MRU): processes long sequences clip-by-clip, carrying a learnable [MEM] token forward, mixing audio+video with linear (not quadratic) complexity. The transferable idea is GAME-LEVEL recurrent modeling: process a game quarter-by-quarter with a persistent memory token instead of aggregating independent per-play predictions. Needs adaptation (quarters/drives as clips; tracking+audio as modalities).

## 1. Research question
Figure skating videos are 3–5 minutes with fast-changing moves; frame sampling loses information and prior methods ignore audio (music coordination is scored). Can a pure-MLP multimodal architecture — avoiding Transformers' quadratic complexity and data hunger — model extremely long audio-visual sequences for action quality assessment?

## 2. Dataset / schema
- **FS1000 (new, collected by authors)**: 1,000+ figure skating videos, 8 program types, 7 scores per video: TES, PCS, SS (skating skills), TR (transitions), PE (performance), CO (composition), IN (interpretation). Largest/most diverse skating dataset at the time.
- **Fis-V**: 500 videos (400/100 split), TES + PCS labels.
- Backbones: TimeSformer (video patches) + AST (audio spectrogram) as projection front-ends.

## 3. Method / model
**Skating-Mixer** = MLP-Mixer blocks (token-mixing + channel-mixing MLPs, linear complexity) composed into:
1. Per clip t: [MEM]_{t−1} → two bottleneck MLPs → A_t^{prev}, V_t^{prev}; concat with current clip features: Ã_t = [A_t^{prev} A_t] + PE_a, Ṽ_t = [V_t^{prev} V_t] + PE_v (Eq. 1).
2. **Audio-Mixer** / **Video-Mixer**: separate MLP-Mixer blocks fuse along the time dimension per modality.
3. **Multimodal Mixer**: [CLS] token concatenated with Â_t, V̂_t → cross-modal mixing; [CLS]_t represents the clip.
4. **Memory-Mixer**: [CLS]_t concat [MEM]_{t−1} → updated [MEM]_t (the memory interaction; skip connections mitigate vanishing/exploding gradients without LSTM gates).
5. **CLS Mixer**: all [CLS]_1..T + PE_c (Eq. 2) → averaged and concatenated with [MEM]_T → linear layer → score.
- **Bi-directional Mixer**: backward pass (last clip first); average forward/backward [CLS] per clip and [MEM] for scoring.
- Applied to Beijing 2022 Winter Olympics competitions as a real-world demonstration.

## 4. Equations & assumptions
- Eq. 1: memory-conditioned clip features Ã_t, Ṽ_t. Eq. 2: CLS sequence C̃ = [CLS_1 … CLS_T] + PE_c.
- Assumptions: (1) a single [MEM] vector can carry the whole-video context across clips; (2) MLP-Mixers suffice for temporal and cross-modal mixing (no attention needed); (3) skip connections alone handle gradient flow over long recurrences; (4) judge scores (7 metrics) are reliable; (5) audio (music) and video are the sufficient modalities.

## 5. Features / target
- Inputs: video patches (TimeSformer) + audio spectrogram patches (AST), split into clips.
- Targets: TES/PCS (Fis-V); 7 scores (FS1000). Metrics: MSE (lower better) + Spearman correlation (higher better).

## 6. Validation design
Fis-V and FS1000 splits. Baselines: C3D-LSTM, MSCADC, M-LSTM, S-LSTM, MS-LSTM, M-BERT (early/mid/late fusion). Both MSE and Spearman reported.

## 7. Numerical results / baselines
- **Fis-V**: MSE TES **19.57** / PCS **7.96** (best; next S-LSTM 22.31/10.21, MS-LSTM 22.64/9.84); Spearman TES **0.68** / PCS **0.82** (S-LSTM 0.57/0.74, MS-LSTM 0.59/0.73).
- **FS1000**: MSE TES **81.24** / PCS **9.47** (best; S-LSTM 83.79/10.90); Spearman across all 7 metrics **0.88/0.82/0.80/0.81/0.80/0.81/0.81** — best on every metric vs. all baselines.
- Efficiency claim: MLP-Mixer blocks give linear complexity vs. Transformer quadratic — trainable on the small datasets where ViTs "hardly" work.

## 8. Code / data availability
Not stated in extracted text (no repo URL found). FS1000 "collected" by authors — availability unclear; verify before depending on it.

## 9. Leakage & limitations
- Single [MEM] vector is a narrow bottleneck for a 5-minute video — information loss vs. full attention, unquantified.
- No ablations of the memory mechanism vs. plain clip-averaging in extracted text; the bidirectional gain is asserted.
- Judge-score targets (bias unexamined); Beijing 2022 demo is qualitative.
- FS1000 availability/code unverified.
- External validity: judged artistic sport; but the MRU is a task-agnostic long-sequence architecture.

## 10. GSE overlap
Existing-research-map: no MLP-Mixer or recurrent-memory read; complements 2108/2109 (same AQA datasets, different architecture family) and 2102 (Perceiver's latent bottleneck vs. MRU's recurrent memory — two answers to "how to handle very long sequences"). NEW: clip-by-clip memory recurrence as a game-modeling paradigm; linear-complexity long-sequence modeling. No duplication.

## 11. GSE implementation spec
**Goal:** game-level state modeling with persistent memory — an alternative to aggregating independent per-play EPA.
- **Game-Mixer**: treat a GAME as the long video, quarters (or drives) as clips. Per quarter: features = tracking aggregates + score differential + pace + injury/lineup changes; [MEM] token carries "game state" (momentum, adjustments, fatigue) forward via the Memory-Mixer recurrence. Final [MEM] + averaged quarter [CLS] tokens → predict second-half/final outcome, or per-quarter win probability evolution.
- Why it matters: per-play models assume conditional independence given features; the MRU explicitly models path dependence (a 14-point comeback has a different memory trace than a wire-to-wire lead with the same per-play EPA sum).
- Bidirectional variant: forward (as played) + backward (from final state) — the backward memory answers "when did the game actually get decided."
- Effort: medium (3–4 weeks; the architecture is simple MLPs; data is already tabular per-quarter features — no video needed for v1).

## 12. Reproducible test
Dataset: 2022–2024 NFL games, quarter-level feature vectors (score diff, EPA totals, pace, turnovers, injuries): train 2022–2023, test 2024 (time-ordered). Task: at each quarter boundary, predict final winner. Baselines: (a) logistic on current score diff + EPA (the "memoryless" model); (b) per-play EPA aggregation. Metric: log-loss + accuracy on Q2/Q3/Halftime predictions. Ablate: MRU memory vs. no-memory (quarter features concatenated) to isolate the recurrence's value.

## 13. Acceptance / rejection gate
**ACCEPT:** Game-Mixer beats the memoryless baseline by ≥0.02 log-loss at halftime on 2024 games AND the no-memory ablation is worse (proving the recurrence, not just the features, adds value). **REJECT:** no gain over score-diff + EPA (then game path-dependence is already captured by the scoreline and per-play aggregates, and the MRU adds nothing). Pre-registered before running.

## 14. Improvement experiment
Beyond the paper: **event-triggered memory writes.** The paper updates [MEM] every clip uniformly. In football, most plays shouldn't rewrite game state — only high-leverage events (turnovers, 4th-down conversions, injuries, scores) should. Add a learned write gate: [MEM]_t = g_t · Memory-Mixer([CLS]_t, [MEM]_{t−1}) + (1 − g_t) · [MEM]_{t−1}, with g_t predicted from the clip. Why it might beat the paper: it makes the memory interpretable ("the model wrote to memory on exactly these 6 plays") — each write is a candidate "game-deciding moment" for content — and it prevents memory washout over a 60-minute game, the exact failure mode a uniform-update MRU would hit on NFL timescales.
