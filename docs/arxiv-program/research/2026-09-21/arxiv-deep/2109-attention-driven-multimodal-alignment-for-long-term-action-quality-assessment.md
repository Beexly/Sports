# [2109] Attention-Driven Multimodal Alignment for Long-term Action Quality Assessment (arXiv:2507.21945)

**Citation:** Xin Wang, Peng-Jie Li, Yuan-Yuan Shen (2025). *Attention-Driven Multimodal Alignment for Long-term Action Quality Assessment*. Applied Soft Computing. arXiv:2507.21945v1. URL: https://arxiv.org/abs/2507.21945
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2507.21945v1).
**Verdict:** ADAPT
**Rationale:** LMAC-Net: learnable temporal queries per modality + attention-center consistency loss forcing modalities to agree on which moments matter + two-level scoring (segment scores → weighted overall). The transferable machinery is cross-modal TEMPORAL ALIGNMENT over long sequences (a drive, a game) and interpretable segment-level scoring ("which plays decided it"). Needs adaptation (NFL drive/game as the long sequence; tracking as a modality).

## 1. Research question
For long (multi-minute) sports performances with music, existing multimodal AQA uses shallow feature-level fusion and ignores deep cross-modal collaboration and temporal dynamics. Can explicit attention-based alignment — forcing RGB, optical flow, and audio branches to focus on the same key temporal segments — improve long-term action quality assessment, while keeping the scoring interpretable via stage-wise scores?

## 2. Dataset / schema
- **RG** (rhythmic gymnastics): 1,000 videos (250 each: ball, clubs, hoop, ribbon), ~1m35s @ 25 fps; labels = difficulty, execution, final scores. Split: 200 train / 50 test per type.
- **Fis-V** (figure skating): 500 short-program videos, ~2m50s @ 25 fps; labels = TES and PCS from nine international judges. Split: 400 train / 100 test.
Public. Features from prior multimodal AQA work (fine-tuned backbones); labels normalized to [0,1].

## 3. Method / model
**LMAC-Net**, three parts:
1. **Multimodal local query encoder**: per modality m ∈ {RGB, Flow, Audio}, stacked Transformer decoders with K=5 learnable "atomic pattern" queries. Per layer i: q̂_k^{(m,i)} = p_k^{(m,i−1)} + q_k^{(m,i)} (Eq. 4); cross-attention over T temporal segments with learnable temperature τ (init 0.07): α_{k,t} = exp(q̃_kᵀv_t/τ)/Σ_j exp(q̃_kᵀv_j/τ) (Eq. 6); update p_k^{(m,i)} = Σ_j a_{k,j} v_j + p_k^{(m,i−1)} (Eq. 7); then FFN + multi-head self-attention across queries. Concatenate per-modality query features: p_k = [p_k^{RGB}, p_k^{Flow}, p_k^{Audio}] (Eq. 8).
2. **Two-level score evaluation**: linear regression per query → K segment scores ŝ_k; final Ŝ = Σ_k w̃_k ŝ_k with w̃ = softmax(w), w ∈ ℝ^K learnable (Eq. 9–10).
3. **Composite loss** L = λ_1 L_score + λ_2 L_feature (Eq. 11): L_score = MSE (Eq. 12); L_feature = L_rank + L_sparsity + L_consistency (Eq. 13). Attention center ᾱ_k^m = Σ_t t·α_{k,t}^m (Eq. 14). L_rank: hinge enforcing ᾱ_1^m < ᾱ_2^m < … < ᾱ_K^m with margin d plus boundary terms (Eq. 15). L_sparsity = Σ|t − ᾱ_k^m|·α_{k,t}^m — concentrates attention (Eq. 16). L_consistency = Σ_t Σ_{i<j} ‖ᾱ_t^{m_i} − ᾱ_t^{m_j}‖² — pulls modalities' attention centers together (Eq. 17).
- Config: 2 stacked decoders per branch, 8 heads, 2 layers; output dim 512; dropout 0.1 (RG) / 0.2 (Fis-V); AdamW, lr 9e-4 (RG) / 9e-5 (Fis-V), cosine decay, batch 32; single NVIDIA GPU (PyTorch).

## 4. Equations & assumptions
- Eq. 4–8: query update mechanics (above). Eq. 9–10: two-level scoring. Eq. 11–13: composite loss. Eq. 14: attention center. Eq. 15: ranking hinge. Eq. 16: sparsity. Eq. 17: cross-modal consistency. Eq. 18: Spearman's ρ (Fisher-z averaged).
- Assumptions: (1) each modality's key moments can be summarized by K ordered queries; (2) temporal order of queries should be monotonic (ranking loss); (3) modalities SHOULD attend to the same segments (consistency loss) — i.e., complementarity lives in features, not in timing; (4) judge scores are reliable; (5) 32-frame segments are an adequate temporal atom.

## 5. Features / target
- Inputs: RGB / optical-flow / audio features per 32-frame segment (backbones from prior AQA work, fine-tuned).
- Target: referee scores (RG: difficulty/execution/total; Fis-V: TES/PCS), normalized to [0,1]; Spearman rank correlation metric.

## 6. Validation design
Official train/test splits. Metric: Spearman ρ, Fisher-z averaged across actions. Baselines: unimodal AQA (C3D+SVR, MS-LSTM, ACTION-NET, GDLT); multimodal (PAMFN — the 2108 paper — plus re-implemented Joint-VA, MSAF, UMT under identical settings); ablations adding MLQE, L_rank, L_sparsity, L_consistency incrementally to a concat-features baseline. Efficiency: FLOPs/params/latency table.

## 7. Numerical results / baselines
- RG avg Sp. Corr: LMAC-Net **0.840** vs PAMFN 0.819 vs GDLT 0.765 (unimodal SOTA). Fis-V avg: **0.850** (TES 0.811, PCS 0.881) vs PAMFN 0.822 vs GDLT 0.820.
- Efficiency (Table 4): 0.419G FLOPs, 8.95M params, 4 ms inference — "substantially lower than PAMFN" (18.06M, 33 ms), "nearly on par with some unimodal methods."
- Ablation (Table 5, RG avg / Fis-V avg): concat baseline 0.676 / 0.731 → +MLQE 0.730 / 0.765 → +L_rank 0.731 / 0.779 → +L_sparsity 0.735 / 0.779 → +L_consistency (full) 0.797 / 0.808. (Note: these ablation-run numbers are lower than the headline 0.840/0.850 — the paper reports both; the ranking of components is the stable finding.)
- Paper's claim: consistency loss is the single biggest contributor; two-level scoring gives interpretability "for free."

## 8. Code / data availability
Not stated in the extracted text (no repo URL found). Datasets public (RG, Fis-V via the cited repos).

## 9. Leakage & limitations
- Assumption (3) is the weak point: forcing modalities to attend to identical segments may be wrong when modalities are genuinely complementary in TIME (e.g., crowd audio spikes BEFORE the visible play — anticipation). The consistency loss could destroy exactly the cross-modal lead-lag structure that matters in football.
- Ablation headline numbers (0.797/0.808) ≠ main-table numbers (0.840/0.850) — configuration differences unexplained in extracted text; treat effect sizes as approximate.
- Small datasets, judge-score targets (bias unexamined), no cross-dataset test.
- External validity: artistic judged sports; but the alignment losses are task-agnostic sequence machinery.

## 10. GSE overlap
Existing-research-map: no temporal-alignment-loss read; complements 2108 (PAMFN adaptive fusion — same datasets, beaten by this paper). NEW: the attention-center consistency loss as a training objective for multimodal NFL models, and two-level scoring as an interpretable "which plays decided the game" readout. No duplication.

## 11. GSE implementation spec
**Goal:** drive-level (or game-level) multimodal assessment — treat a DRIVE as the "long video": segments = plays; modalities = tracking features, broadcast-video features, audio (crowd), text (pbp).
- Learnable queries (K≈8) per modality attend over the play sequence; consistency loss forces tracking/video/audio/text to agree on the drive's key plays; two-level scoring: per-play scores → softmax-weighted drive score.
- Targets: drive EPA total (regression) or drive outcome (TD/FG/punt/turnover).
- The learned per-play weights w̃_k are directly publishable: "the 3 plays that decided the drive, according to each modality" — film-room content.
- Caution from §9: make the consistency loss ASYMMETRIC or lag-tolerant (allow audio to lead video by 1 segment) rather than the paper's exact-center matching.
- Effort: medium (3–4 weeks; the loss functions are the novel part, ~100 lines; data is plays not frames).

## 12. Reproducible test
Dataset: 2022–2024 NFL drives with tracking + video features + audio proxy + pbp text: train 2022, val 2023, test 2024 (time-ordered). Target: drive point outcome. Metric: Spearman (paper's metric) + RMSE vs. (a) concat-features baseline (paper's own baseline), (b) per-play EPA sum (the "no-model" baseline). Ablate L_consistency on/off to test the paper's core claim on NFL data.

## 13. Acceptance / rejection gate
**ACCEPT:** LMAC-Net-style model beats the concat baseline by ≥0.04 Spearman on 2024 drives AND the consistency-loss ablation shows a positive contribution (≥+0.01) — proving alignment (not just more parameters) does the work. **REJECT:** no gain over concat, or the consistency ablation is negative (modalities genuinely disagree in time — then the paper's core assumption fails for football and the lane stops). Pre-registered before running.

## 14. Improvement experiment
Beyond the paper: **lag-aware consistency loss.** Replace ‖ᾱ^{m_i} − ᾱ^{m_j}‖² with a learned per-modality-pair temporal offset δ_{ij}: ‖ᾱ^{m_i} − (ᾱ^{m_j} + δ_{ij})‖², δ learned with an L1 penalty toward 0. Why it might beat the paper: in football, audio (crowd roar, whistle) systematically LEADS or LAGS visual/tracking events (crowd reacts after a catch; cadence precedes the snap) — the paper's exact-alignment assumption destroys this structure, while a learned lag preserves alignment AND captures lead-lag. The learned δ matrix itself becomes a GSE finding ("crowd noise leads the broadcast feed by X seconds on big plays").
