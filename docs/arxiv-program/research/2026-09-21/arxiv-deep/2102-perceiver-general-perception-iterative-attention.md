# [2102] Perceiver: General Perception with Iterative Attention (arXiv:2103.03206)

**Citation:** Andrew Jaegle, Felix Gimeno, Andrew Brock, Andrew Zisserman, Oriol Vinyals, Joao Carreira (2021). *Perceiver: General Perception with Iterative Attention*. arXiv:2103.03206v2. URL: https://arxiv.org/abs/2103.03206
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2103.03206v2).
**Verdict:** ADAPT
**Rationale:** the canonical architecture for fusing NGS tracking + broadcast video + commentary/audio + play-by-play text into one modality-agnostic latent representation; needs adaptation (modality encodings, NFL task heads, NFL-scale data).

## 1. Research question
Can a single Transformer-based architecture — making few architectural assumptions about its inputs — scale to hundreds of thousands of input elements (pixels, raw audio samples, point-cloud points) across diverse modalities (images, audio, video, point clouds, multimodal combinations) and match or beat strong modality-specialized models? The paper's core hypothesis: baking in modality-specific inductive biases (e.g., 2D convolutions for vision) is unnecessary when an attention bottleneck can distill arbitrary high-dimensional inputs into a fixed-size latent array.

## 2. Dataset / schema
- **ImageNet** (ILSVRC 2012 split, Deng et al. 2009): single-label classification; 224×224 crops (Inception-style preprocessing + RandAugment). Paper does not restate row counts (standard: ~1.28M train / 50k validation).
- **AudioSet** (Gemmeke et al. 2017): 1.7M 10-second training videos, 527 multi-label classes; input either 61,440 raw audio samples (48kHz, 1.28s → 480 vectors of 128-d) or mel spectrogram (4,800 flattened inputs); video = 32-frame clips → 2×8×8 space-time patches (12,544 inputs), 25fps.
- **ModelNet40** (Wu et al. 2015): 9,843 train / 2,468 test point clouds, 40 categories, ~2,000 3D points per object; zero-centered, unit-cube normalized; per-point scaling augmentation (0.99–1.01).
All public; no proprietary data.

## 3. Method / model
Two components alternating: (i) a **cross-attention module** mapping a large input byte array (M elements) and a learned latent array (N latents, N ≪ M) to a latent array; (ii) a **Transformer tower** (GPT-2 style decoder blocks) mapping latent→latent. Cross-attention complexity O(MN) instead of O(M²); latent self-attention O(N²). Depth L is decoupled from input size: total complexity O(MN + LN²), so very deep latent stacks are affordable. **Iterative attention**: the latent array re-queries the input with multiple cross-attend modules (up to 8 on ImageNet), with optional weight sharing across cross-attends (all but the first) and across Transformer towers — functionally an RNN unrolled in depth over a fixed input. Attention modules are non-causal (no masks).
- ImageNet config: 8 cross-attends, 512 latents × 1024 channels, latent Transformer 6 blocks (one cross-attend with single head per block), 64 Fourier frequency bands (max resolution 224), weight sharing → ~45M parameters.
- Position/modality encoding: concatenated Fourier features [sin(f_k π x_d), cos(f_k π x_d)] for spatial/temporal axes plus raw position; learned modality-specific encodings distinguish domains (e.g., audio vs. video on AudioSet; embedding of size 4 for video, audio encoding sized to match channels).
- Training: LAMB optimizer, lr 0.004 decayed ×0.1 at epochs [84, 102, 114], 120 epochs (ImageNet); AudioSet trained 100 epochs, 2 attention iterations, 8 self-attention layers per Transformer block, no weight sharing; sigmoid cross-entropy loss (multi-label) / cross-entropy (single-label).
- Key trick on AudioSet multimodal: **video dropout** (zero the video stream with 30% probability per example) gave >3% mAP gain; tuned spectrogram model additionally drops spectrogram with 10% probability and turns off SpecAugment.

## 4. Equations & assumptions
- Attention cost: softmax(QKᵀ)V is O(M²) for Q,K,V ∈ ℝ^{M×D}; asymmetric cross-attention with latent queries Q ∈ ℝ^{N×D}, K,V ∈ ℝ^{M×C}, N ≪ M gives O(MN).
- Total architecture cost: O(MN + LN²) vs. byte-level Transformer's O(LM²); L = depth.
- Fourier features: encoding value [sin(f_k π x_d), cos(f_k π x_d)], k-th band f_k from a bank of K frequencies equally spaced between 1 and μ/2 (μ/2 = Nyquist frequency for target sampling rate μ); x_d ∈ [−1, 1] per dimension; concatenated with raw x_d → final position encoding of size d(2K+1). (Related to but not identical to NeRF's powers-of-two scheme; paper reports numerical instability for NeRF-style beyond ~15 bands.)
- Assumptions: (1) no architectural spatial priors — all position/modality structure must be supplied via encodings; (2) fixed-size latent bottleneck (N) suffices to capture task-relevant detail from M inputs; (3) cross-attention queries can iteratively extract relevant information (attention maps show early layers capturing image structure, later layers high-frequency "tartan" patterns from Fourier features); (4) modality encodings must be concatenated (not added) for low-dimensional dense modalities.
No equations for the loss beyond standard cross-entropy / sigmoid cross-entropy.

## 5. Features / target
- Inputs (features): raw pixels + Fourier (x,y) features (ImageNet); raw audio waveform segments or mel-spectrogram values + time Fourier features; space-time video patches + (x,y,t) Fourier features; concatenated raw audio (480×128-d) or spectrogram (4,800 values) with modality embedding + video patches (12,544) for multimodal fusion.
- Targets: ImageNet class label (softmax); AudioSet 527 multi-label events (sigmoid); ModelNet40 class.

## 6. Validation design
Standard held-out splits: ImageNet ILSVRC validation (test not public); AudioSet eval = 16 overlapping 32-frame clips per 10s video, scores averaged; ModelNet40 test set (paper selects best config by test score — a snooping concern, noted below). Baselines: ResNet-50 (He et al. 2016; Cubuk et al. 2020 protocol), ViT-B-16, vanilla Transformer on downsampled 64×64, Set Transformer discussion, CNN-14, G-blend (Wang et al. 2020c), Attention AV-fusion (Fayek & Kumar 2020) on AudioSet; PointNet++ on ModelNet40. Permuted-ImageNet stress test: one shared permutation pattern applied after position encoding to measure reliance on grid priors. Splits are time-ordered only in the sense of standard dataset splits (not temporal).

## 7. Numerical results / baselines
All numbers quoted exactly as in the paper; higher is better.
- ImageNet top-1 val accuracy (Table 1): ResNet-50 77.6; ViT-B-16 77.9; ResNet-50 (FF) 73.5; ViT-B-16 (FF) 76.7; Transformer 64×64 (FF) 57.0; **Perceiver (FF) 78.0**.
- Permuted ImageNet (Table 2): ResNet-50 (FF) 39.4 (RF 49); ViT-B-16 (FF) 61.7 (RF 256); Transformer 64×64 (FF) 57.0; Perceiver (FF) 78.0 (RF 50,176); Perceiver with learned (structure-free) position encoding 70.9.
- AudioSet mAP (Table 3): benchmark (Gemmeke) 31.4 audio; Attention (Kong) 32.7; Multi-level Attention (Yu) 36.0; ResNet-50 38.0; CNN-14 43.1 (37.5 without balancing & mixup); G-blend audio 32.4 / video 18.8 / A+V 41.8; Attention AV-fusion audio 38.4 / video 25.7 / A+V 46.2; **Perceiver raw audio 38.3 / video 25.8 / A+V 43.5**; **Perceiver mel spectrogram 38.4 / 25.8 / 43.2**; **Perceiver mel (tuned) A+V 44.2**. Video dropout alone: spectrogram 39.9 → 43.2; raw audio 39.7 → 43.5 (>3% gains).
- ModelNet40 top-1 test (Table 4): PointNet++ 91.9; Perceiver 85.7; Transformer (44×44) 82.1; ViT-B-2 (FF) 78.9; ResNet-50 (FF) 66.3. (Specialized PointNet++ wins; Perceiver beats all generic baselines.)
- Paper's claim (abstract/discussion): "competitive with or outperforms strong, specialized models" across modalities; "the Perceiver does best overall" across modalities considered.

## 8. Code / data availability
Paper states experiments were conducted in JAX with the DeepMind JAX ecosystem; no URL given in the text. The authors' official implementation is publicly known as deepmind/perceiver on GitHub (verify before use — not stated in the paper). No new datasets released.

## 9. Leakage & limitations
- ModelNet40 "best result per model class, selected by test-set score" (Table 4 caption) = test-set snooping in model selection; gaps vs. PointNet++ may be slightly flattered.
- ImageNet numbers for baselines mix literature values (ResNet-50 77.6 from Cubuk) with re-implementations (FF variants) — protocol-consistent but not identical training.
- Multimodal AudioSet fusion (44.2 mAP tuned) underperforms late-fusion SOTA (46.2) — early/input-level fusion is not yet dominant; the paper concedes this as future work.
- Heavy overfitting risk: "with great flexibility comes great overfitting" (paper's own words); ImageNet needed weight sharing (~10× parameter reduction) to avoid overfitting; per-pixel memorization risk required crop-coordinate (not image-coordinate) position encodings.
- Fixed latent bottleneck N is a hyperparameter that caps representable detail; iterative cross-attention mitigates but adds O(M) layers.
- External validity: all tasks are classification; nothing here validates generative or probabilistic forecasting quality (calibration) — NFL use needs a probabilistic head and calibration check.

## 10. GSE overlap
Existing-research-map: "multimodal fusion" appears only as a commissioned topic in the 2026-09-18 15-area ML research brief ("topics commissioned, results not yet in repo") — no Perceiver-family read exists in the corpus. NGS/tracking coverage (27-metric taxonomy, STRAIN paper) is feature-level, not a fusion architecture. This is a NEW capability: a single architecture ingesting tracking sequences + video frames + audio/commentary + text features with no modality-specific pipelines. No duplication with existing reads.

## 11. GSE implementation spec
**Goal:** one pre-game representation per team-game fusing (a) NGS tracking embeddings (player trajectories → per-play pooled embeddings), (b) broadcast-video features (sampled frames/clips from recent games), (c) injury-report / depth-chart text embeddings, (d) crowd/weather meta — feeding the existing win-probability / spread model.
- Data: nflverse (pbp, rosters), NGS-style tracking (public 2018–2022 Big Data Bowl releases as proxy; NGS catalog per repo), game video (licensed highlights or YouTube per posting-dial rules — short clips only), injury reports (nflverse injuries), text (BERT-style embeddings of beat-writer reports).
- Model: Perceiver IO-style (same family) — latent array N=256–512; input byte arrays: tracking trajectories (x,y,speed per player per frame, Fourier time/space features), video space-time patches, text token embeddings; learned modality encodings concatenated; video/text dropout during training (paper's 30% video-dropout trick to prevent dominant-modality overfit); prediction heads: win prob (sigmoid), spread (regression), calibrated via temperature scaling.
- Training: LAMB or AdamW; time-ordered splits (train ≤2023, val 2024, test 2025–2026); class-balanced sampling for upsets.
- Serving: precompute latent representations weekly per team; inference = cross-attention pass over cached input arrays, cheap at N≪M.
- Effort: medium-high (4–6 weeks eng: data plumbing dominates; architecture is ~200 lines in PyTorch/Flax with open Perceiver implementations).

## 12. Reproducible test
Dataset: 2018–2024 NFL regular seasons (nflverse pbp + public tracking where available). Metric: log-loss on game outcomes (or spread MAE). Baseline: GSE's current tracking-only feature model (or tabular baseline from the repo). Test: held-out 2025 season. Protocol: train Perceiver-fusion (tracking + text-only first, video optional) vs. tracking-only Perceiver ablation with identical latent size and training budget; report log-loss deltas and reliability diagrams.

## 13. Acceptance / rejection gate
**ACCEPT (ADOPT into engine):** multimodal Perceiver-fusion beats the tracking-only baseline by ≥0.003 log-loss on the held-out 2025 season AND beats-or-matches it on 2024 backtest, with ECE no worse than baseline +0.005. **REJECT:** fusion fails to clear the 0.003 log-loss bar on either window, or the win comes only from the text modality (then the right move is a cheaper text-only feature, not the fusion stack). Gate is set before running; no post-hoc metric shopping.

## 14. Improvement experiment
Beyond the paper: **per-play Perceiver with causal temporal latents** — replace the non-causal, fixed latent array with a recurrent latent state that updates play-by-play within a game (Perceiver AR / Perceiver-IO decoding at each play), so the same model produces live in-game win probability. Why it might beat the paper: the paper's architecture is batch-classification; a recurrent-latent variant reuses the O(MN+LN²) scaling for streaming, and NFL in-game WP is exactly a streaming multimodal problem (tracking + score state + clock + text updates). Compare streaming Perceiver vs. the paper's batch Perceiver on live-WP log-loss over 2025 games.
