# [0352] SV3.3B: A Sports Video Understanding Model for Action Recognition (arXiv:2507.17844v1)

**Citation:** Sai Varun Kodathala, Yashwanth Reddy Vutukoori, Rakesh Vunnam (2025). *SV3.3B: A Sports Video Understanding Model for Action Recognition*. arXiv:2507.17844v1. URL: https://arxiv.org/abs/2507.17844
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 448 lines).
**Verdict:** ADAPT — reject the 3.3B LLM caption generator itself (vendor paper, small eval, no code, AI-generated copy conflicts with GSE's voice doctrine), but the DWT-VGG16-LDA keyframe extractor is a portable highlight-frame selection recipe worth porting to GSE's video clip pipeline.

## 1. Research question
Can a lightweight (3.3B parameter) video understanding model generate technically detailed sports action descriptions (preparation → execution → follow-through phases) good enough to beat large closed-source models (GPT-4o variants) at a fraction of the compute, enabling on-device/edge sports video analytics for amateur coaching? The authors combine a novel DWT-VGG16-LDA keyframe sampler with a V-JEPA2 self-supervised video encoder and a LoRA-tuned LLaMA-3.2-3B decoder.

## 2. Dataset / schema
- **NSVA subset:** 1,315 NBA video clips (1,050 train / 265 validation), 720p, each clip = one basketball event with play-by-play-derived action descriptions ("MISS 3' Layup", "OFFENSIVE REBOUND", "MISS 16' Pullup Jump Shot", "17' Jump Shot"). Derived from the full NSVA dataset (32,019 clips from 132 games, 10 NBA teams, 2018–2019 season, scraped from NBA.com). Player names stripped from annotations to focus on action, not identity.
- **Access:** HuggingFace — https://huggingface.co/datasets/sportsvision/nsva_subset (reference [42]). Note: NSVA is NBA-scraped data; licensing for reuse is unclear.
- **Authors' context:** Sports Vision, Inc. / Vizworld, Inc. — industry authors; this reads as a product paper (amateur-sports analytics democratization framing).

## 3. Method / model
- **Phase (a) — DWT-VGG16-LDA keyframe sampling:** for each candidate frame, compute the Haar DWT approximation (LL subband) at decomposition level L=2; motion maps = differences of consecutive frames' LL coefficients (claimed more lighting-robust than raw pixel differences). Dual-path: RGB frames → VGG-16 appearance features; LL-difference maps (converted to 3-channel) → VGG-16 motion features. Concatenate [appearance, motion], K-means cluster (K=16), LDA for cluster-separating dimensionality reduction, select the frame nearest each cluster center → 16 representative keyframes. Paper claims this beats uniform sampling and color-histogram sampling for capturing biomechanical phases (Figs. 2–5: basketball free throws, golf swings; baseball was the development domain).
- **Phase (b) — Video encoder pretraining:** ViT-L (300M params), 16 frames @ 4 fps, 256×256, patch 16, tubelet 2; V-JEPA2 self-supervised mask-denoising: 8 spatial-mask blocks at scale [0.15, 0.15] + 2 blocks at [0.7, 0.7], temporal scale [1.0, 1.0], aspect ratio [0.75, 1.5]. Batch 4, 10 epochs × 300 iters = 3,000 iterations, bfloat16. Encoder loss 0.8 → 0.25 in first 500 iters (Fig. 6).
- **Phase (c) — LLM decoder post-training:** frozen ViT-L encoder; two-layer MLP projector (1024 → 512 → LLM dim, ReLU + dropout + LayerNorm); LLaMA-3.2-3B fine-tuned with LoRA rank 16 on all linear layers (q/k/v/o/gate/up/down), batch 8, LR 1e-4, warmup + gradient clipping. LLM loss 5.0 → 1.0 in first 50 iters, stabilizing 0.5–1.0 (Fig. 6).
- Total: 3.3B params (300M encoder + 3B LLM).

## 4. Equations & assumptions
No equations stated. Only notation: input clip X ∈ R^{H×W×3×N} (N frames), K = 16 keyframes with K << N, output text {y}. All loss functions, LDA objective, JEPA masking objectives are described in prose, never written mathematically — the paper is not reproducible from its text. **Assumptions:** 16 keyframes suffice to cover a sports action's phases; DWT-LL differences capture motion better than pixels under lighting variation; frozen encoder + LoRA decoder is sufficient (no joint fine-tuning); player-name stripping removes identity bias without hurting action semantics; NSVA play-by-play text is adequate ground truth for description quality.

## 5. Features / target
- Inputs: N-frame sports video clips (basketball, 720p).
- Internal features: VGG-16 appearance features + VGG-16 motion features from Haar-DWT LL-difference maps, K-means/LDA fused.
- Target: natural-language sports action descriptions with technical terms, measurements (distances), multi-phase action coverage; average output length 45.2 words.

## 6. Validation design
- **Splits:** NSVA subset: 1,050 train / 265 validation; no held-out test set reported — all metrics are on the 265-clip validation split.
- **Baselines:** GPT-o4 Mini, GPT-4o Mini, GPT-4o with *uniformly sampled* frames (not the DWT sampler — sampling method is confounded with model quality); evaluated on the same 265 validation clips.
- **Metrics:** standard text-gen (ROUGE-L F1, BLEU, BERT F1, Content F1, semantic similarity) + authors' sports-specific metrics (information density, action complexity, measurement precision, sequence length, vocabulary richness, technical coverage) + composite scores (GT Validation = sum of 5 accuracy metrics; Information Richness = sum of 6 sports metrics; Combined = sum of the two).
- **Stats:** Cohen's d + 95% CIs for SV3.3B vs each baseline (Table IV).
- **Adversarial notes:** no independent test split; baselines handicapped by uniform sampling while SV3.3B gets its own sampler; all composite metrics are author-defined and unvalidated externally; Tables I and III report *different* GT Validation scores for the same models (Table I: GPT-o4 Mini 1.713, GPT-4o 1.643; Table III: GPT-o4 Mini 1.6431, GPT-4o 1.3056) and the Table III ranking order is inconsistent with its own numbers (GPT-4o Mini 1.7134 ranked below GPT-o4 Mini 1.6431) — treat reported tables with caution.

## 7. Numerical results / baselines
From Table I (GT Validation = sum of ROUGE-L + BLEU + BERT F1 + Content F1 + Semantic Similarity):
- **SV3.3B:** ROUGE-L 0.255 ± 0.248, BLEU 0.103 ± 0.147, BERT F1 0.856 ± 0.052, Content F1 0.350 ± 0.336, Semantic similarity 0.559 ± 0.235, **GT Validation 2.123**.
- GPT-4o: ROUGE-L 0.231 ± 0.239, BLEU 0.033 ± 0.054, BERT F1 0.706 ± 0.299, Content F1 0.223 ± 0.238, sim 0.450 ± 0.263, GT 1.643. GPT-4o Mini: 0.101/0.016/0.695/0.112/0.382, GT 1.305. GPT-o4 Mini: 0.212/0.063/0.732/0.240/0.467, GT 1.713.
- "29.2% improvement over GPT-4o in ground truth validation metrics": 2.123/1.643 = 1.292 — checks out arithmetically.
- **Information Richness (Table II):** SV3.3B — information density 0.978 ± 0.053, action complexity 2.307 ± 1.161, measurement precision 2.557 ± 0.808, sequence length 3.271 ± 0.456, vocab richness 151.6 ± 66.4, technical coverage 0.028 ± 0.010; Info Richness score 160.697; **Combined 162.821** vs GPT-o4 Mini 137.676, GPT-4o 88.956 (Table III).
- **Stats (Table IV):** vs GPT-o4 Mini ΔGT +0.4105, Cohen's d 1.24, 95% CI [0.31, 0.51]; vs GPT-4o Mini +0.8183, d = 2.47; vs GPT-4o +0.4808, d = 1.45. (CIs are narrow relative to the huge per-metric SDs — the CI computation is not explained; the raw metric SDs are enormous, e.g., BLEU 0.103 ± 0.147.)
- Enormous SDs on most metrics (ROUGE-L 0.255 ± 0.248) mean the model beats GPT-4o on average but with heavy per-clip variance — the win is not consistent clip-to-clip.

## 8. Code / data availability
No model code or checkpoint link stated — "None stated" for code. Data: NSVA subset on HuggingFace (sportsvision/nsva_subset). Training hyperparameters given in prose (batch, LR, LoRA rank, JEPA mask config) but no training script.

## 9. Leakage & limitations
- **No held-out test set** — 265-clip validation split only; everything reported is effectively in-sample tuning territory.
- **Confounded baseline comparison:** baselines used uniform frame sampling while SV3.3B used DWT sampling; the paper never ablates SV3.3B with uniform sampling, so model-vs-sampler contributions are inseparable. The sampler may be doing all the work.
- **Table inconsistencies:** GT Validation scores differ between Table I and Table III; Table III's rank order contradicts its own GT scores; 95% CIs are implausibly tight given the raw SDs. Vendor-authored (Sports Vision, Inc.) evaluation of a vendor product — the numbers need independent verification.
- **Composite metrics are author-invented** (information density, measurement precision, etc.) with no external validation that they measure description quality rather than verbosity.
- **No equations** — nothing about the sampler fusion, JEPA objective, or projector is specified mathematically; reproducibility rests on a nonexistent code release.
- **Tiny training set:** 1,050 clips, 3,000 pretraining iterations — a ViT-L trained for 3,000 iterations on 1,050 basketball clips is unlikely to have learned general video representations; results may be dataset-memorization-adjacent.
- **Licensing:** NSVA derives from NBA.com scraped video — reuse risk for commercial GSE products.
- **External validity to NFL:** basketball-only evaluation; no NFL or football evaluation. The action-description task doesn't transfer to prediction. The relevant transferable piece is the keyframe sampler, which is sport-agnostic by construction (DWT motion features + appearance clustering).

## 10. GSE overlap
Per the existing-research-map: Garrett's corpus has **no video-understanding / vision-language lane** — the tracking lane is NGS taxonomy + STRAIN; content ops produce videos via real footage (AGENTS.md standing video rule: real footage only, 2–4 s telestrated clips, commentary-led). An LLM that auto-generates sports descriptions directly conflicts with the X copy doctrine (human voice, "sports intelligence" banned, 9.2 voice floor) — AI caption text would need full rewriting anyway. However, GSE's video operation (clip selection for MNF recaps, DFS packets, X video posts) has **no automated keyframe/highlight-frame selection method** anywhere in the corpus — the DWT-VGG16-LDA sampler fills a genuine tooling gap (finding representative biomechanical phases = finding the best frames to feature). Verdict: **partial overlap / new tooling capability** — caption model rejected, sampler is an extension of the video-content tooling lane.

## 11. GSE implementation spec
- **Port only the sampler, not the model.** Reimplement DWT-VGG16-LDA keyframe extraction as a standalone preprocessing tool in GSE's video pipeline: input NFL clip → Haar DWT LL-difference motion maps + VGG-16 (or any modern backbone) appearance/motion features → K-means (K tuned to clip length) → LDA → nearest-to-center frame selection → output 8–16 representative stills per clip.
- **Use case:** automatic "best frames" selection for clip thumbnails, telestration frame choice, and highlight-cut candidates in the X/YouTube content operation; replaces uniform sampling for preview/contact-sheet generation.
- **Data:** existing GSE video assets; no new data. Prototype against recorded NFL broadcast clips (any length), compare selected frames vs human editor's picks.
- **Model/training:** no training needed — classical CV pipeline (DWT + frozen VGG-16 + K-means + LDA). Consider swapping VGG-16 for a lighter modern backbone if latency matters.
- **Serving:** offline batch tool; ~seconds per clip on CPU.
- **Estimated effort:** 1–2 weeks for a working prototype (OpenCV DWT via PyWavelets, torchvision VGG-16, sklearn K-means/LDA), plus an eval harness comparing against editor picks.
- **Explicit non-build:** do NOT adopt the 3.3B LLaMA captioner — no code, basketball-only, conflicts with the human-voice copy doctrine, and NSVA licensing is murky.

## 12. Reproducible test
- **Sampler test (the adoptable piece):** take 50 NFL broadcast clips (varied: runs, passes, TDs); run the reimplemented DWT-VGG16-LDA sampler (K=8) vs uniform sampling (8 frames) vs color-histogram sampling (the paper's Fig. 4/5 baselines). **Metric:** blind pairwise preference by a human editor ("which contact sheet better captures the play's phases") + coverage metric (fraction of the play's annotated phases — snap, mesh/handoff, break, tackle/catch — represented). **Baseline to beat:** uniform sampling. **Gate:** sampler preferred in ≥ 60% of clips with ≥ 1 phase more covered on average.
- **Captioner test (reproducibility only):** cannot run — no code/checkpoint released. If code appears: evaluate on the 265-clip NSVA validation split, metric GT Validation score vs reported 2.123, accept within ±0.3.

## 13. Acceptance / rejection gate
- **Adopt the DWT-VGG16-LDA sampler** if, on 50 NFL clips, the editor-preference test shows ≥ 60% preference over uniform sampling AND mean phase coverage improves by ≥ 1 phase per clip, with runtime < 30 s per 10-s clip on CPU.
- **Reject the sampler** if preference is ≤ 50% or phase coverage doesn't improve — uniform sampling is then sufficient and the complexity is unjustified.
- **Reject the 3.3B captioner unconditionally** for GSE: no code, no NFL evaluation, vendor-authored eval with table inconsistencies, and auto-generated descriptions violate the human-voice copy doctrine.

## 14. Improvement experiment
Replace the frozen VGG-16 appearance/motion features with a **self-supervised NFL-fine-tuned video encoder** (the paper's own V-JEPA2 idea, but trained on NFL broadcast clips rather than 1,050 basketball clips): keep the DWT motion-map branch, but swap the backbone to a ViT pretrained with JEPA masking on ~10K NFL clips, then run the same K-means/LDA keyframe selection on its features. Hypothesis: domain-matched features will cluster on football-specific phases (route breaks, tackle points, catch moments) that VGG-16/ImageNet features miss, lifting phase coverage by 1–2 phases per clip over the ImageNet-backbone sampler. Second arm: make K adaptive (K ∝ clip motion energy from the DWT coefficients) instead of fixed 16 — long drives need more keyframes than a single screen pass.
