# [2104] Flamingo: a Visual Language Model for Few-Shot Learning (arXiv:2204.14198)

**Citation:** Jean-Baptiste Alayrac et al. (DeepMind) (2022). *Flamingo: a Visual Language Model for Few-Shot Learning*. arXiv:2204.14198v2. URL: https://arxiv.org/abs/2204.14198
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2204.14198v2).
**Verdict:** ADAPT
**Rationale:** interleaved broadcast-video + text few-shot reasoning (prompt with a few labeled play clips, query a new one, get analysis text out) is a genuine new GSE capability for film study, injury-clip triage, and officiating review; needs adaptation (sports video-text corpus, smaller efficient variant of the 80B stack).

## 1. Research question
Can a visual-language model rapidly adapt to novel image/video tasks from only a handful of annotated examples (in-context few-shot learning, GPT-3 style) — without task-specific fine-tuning — by training on large-scale web corpora of arbitrarily interleaved images/videos and text? The architectural question: how to bridge powerful pretrained vision-only and language-only models so a frozen LM can condition on visual inputs.

## 2. Dataset / schema
All web-scraped, proprietary (not released): **M3W** (MultiModal MassiveWeb) — ~43M webpages, text + images with DOM-derived positions, <image> tags inserted, <EOC> tokens; sequences sampled at L=256 tokens with up to N=5 images. **ALIGN** — 1.8B image/alt-text pairs. **LTIP** — 312M long-text/image pairs (authors' own). **VTP** — 27M short videos (~22s avg) with sentence descriptions. Eval: 16 public benchmarks (COCO, OKVQA, VQAv2, MSVDQA, VATEX, VizWiz, Flickr30K, MSRVTTQA, iVQA, YouCook2, STAR, VisDial, TextVQA, NextQA, HatefulMemes, RareAct); 5 used for dev (model-selection bias acknowledged), 11 held as unbiased few-shot estimates. Training corpora themselves are proprietary — replication needs a substitute interleaved corpus.

## 3. Method / model
- Vision encoder: pretrained + frozen Normalizer-Free ResNet F6 (NFNet), contrastively pretrained on image-text pairs; final-stage 2D grid flattened to 1D; video = frames at 1 FPS encoded independently + learned temporal embeddings.
- **Perceiver Resampler**: learned latent queries cross-attend to variable-size visual features → fixed 64 visual tokens. Ablations: beats plain Transformer and MLP resamplers.
- **Gated xattn-dense layers**: freshly initialized cross-attention + dense FFN blocks interleaved between frozen pretrained LM layers; output multiplied by tanh(α), α a learnable scalar initialized to 0 → model = pretrained LM at initialization (stability). Keys/values from vision, queries from language.
- **Per-image attention masking**: at text token ℓ, attend only to the image immediately preceding it (x_{≤ℓ} in Eq. 1), not all prior images; dependence on earlier images flows via LM self-attention. Generalizes to 32 shots at eval despite ≤5 images/sequence in training. Ablation: beats cross-attending to all previous images.
- Sizes: Flamingo-3B (1.4B Chinchilla), Flamingo-9B (7B), Flamingo-80B (70B); vision encoder + resampler fixed across sizes.
- Training: weighted sum of per-dataset expected NLL (Eq. 2), λ_m weights "key to performance"; gradient accumulation over all datasets beats round-robin.

## 4. Equations & assumptions
- Eq. 1 (image-causal LM): p(y|x) = ∏_{ℓ=1}^{L} p(y_ℓ | y_{<ℓ}, x_{≤ℓ}); y_ℓ = ℓ-th text token, x_{≤ℓ} = images/videos preceding it.
- Eq. 2 (multi-objective): Σ_m λ_m · 𝔼_{(x,y)~D_m}[ −Σ_ℓ log p(y_ℓ | y_{<ℓ}, x_{≤ℓ}) ].
- Gating: layer output = tanh(α) · xattn-dense(x) + x, α init 0 → identity at init.
- Assumptions: (1) frozen vision + frozen LM suffice — only the bridge (resampler + xattn-dense) needs training; (2) few-shot ability emerges from interleaved (not just paired) training data; (3) single-image cross-attention + LM self-attention captures multi-image context; (4) web alt-text/captions are adequate visual supervision.

## 5. Features / target
- Inputs: interleaved sequences of images/video frames + text tokens (<image> tags, <EOC> separators).
- Target: next text token (free-form text out) — open-ended VQA answers, captions, close-ended multiple-choice scored by log-likelihood.

## 6. Validation design
Few-shot evaluation: prompt with K support (image/video, text) pairs + query visual input; open-ended decoded with beam search, close-ended scored by likelihood. Support/query subsets drawn from validation and test splits; dev-benchmark model-selection bias explicitly disclosed. Baselines: prior zero/few-shot SOTA per benchmark with shot counts in parentheses. Fine-tuning check: Flamingo fine-tuned sets new SOTA on VQAv2, VATEX, VizWiz, MSRVTTQA, HatefulMemes. Appendix: ImageNet and Kinetics-700 classification.

## 7. Numerical results / baselines
Few-shot table (selected, Flamingo-80B rows; numbers quoted exactly):
- OKVQA: SOTA 43.3 (16-shot); Flamingo-3B 0-shot 41.2 / 4-shot 43.3 / 32-shot 45.9; Flamingo-9B 0-shot 44.7 / 4-shot 49.3 / 32-shot 51.0; Flamingo-80B 0-shot 50.6.
- VQAv2: SOTA 38.2 (4-shot); 3B: 49.2 / 53.2 / 57.1; 9B: 51.8 / 56.3 / 60.4; 80B: 56.3 (0-shot).
- COCO captioning (CIDEr): SOTA 32.2 (0-shot); 3B: 73.0 / 85.0 / 99.0; 9B: 79.4 / 93.1 / 106.3; 80B: 84.3 (0-shot).
- MSVDQA (video): SOTA 35.2 (0-shot); 80B 0-shot 35.6.
- VATEX (video): 3B 0/4/32-shot 40.1 / 50.0 / 59.2.
- VizWiz: SOTA 19.2 (0-shot); 80B 0-shot 31.6.
Paper claim: "a single Flamingo model can achieve a new state of the art with few-shot learning... outperforms models fine-tuned on thousands of times more task-specific data" on numerous benchmarks.

## 8. Code / data availability
None stated in the paper (DeepMind, 2022 — no public release at publication). Open re-implementations exist (OpenFlamingo) — external knowledge, verify before use. Training corpora (M3W/LTIP/VTP) not released.

## 9. Leakage & limitations
- Dev-set model selection bias disclosed by authors (5 of 16 benchmarks); mitigated by 11 untouched benchmarks but headline numbers include dev benchmarks.
- 80B scale — compute cost is enormous; the few-shot SOTA claims ride on a 70B frozen LM; the paper does not show the small models matching specialists everywhere.
- Web-scraped training data: quality/noise unquantified; M3W image-text alignment is DOM-heuristic, noisy by construction.
- Close-ended eval via likelihood scoring can flatter vs. true generation quality; open-ended beam-search outputs not human-rated at scale in the main paper.
- External validity to NFL: zero sports data in training; broadcast video + jargon-heavy text (coverages, blitz packages) is far from web alt-text distribution — few-shot transfer to NFL film questions is untested and likely weaker without domain adaptation.

## 10. GSE overlap
Existing-research-map: no VLM / few-shot-multimodal read in the corpus; video work is absent (ML brief lists "frontier-model techniques" as a commissioned topic, results not in repo). NEW capability: in-context film reasoning — e.g., prompt with 4 labeled ("blitz", "simulated pressure", "coverage sack") clips and classify/explain a 5th, or generate draft film-room notes. Complements 2102 (Perceiver fusion encoder) and 2103 (ImageBind retrieval): Flamingo is the *generative reasoning* layer on top of fused representations. No duplication.

## 11. GSE implementation spec
**Goal:** "ask the film a question" — few-shot VQA over broadcast clips: input K=4–8 labeled (clip, note) pairs + query clip → output scheme label, coverage call, or injury-mechanism note.
- Data: build "M3W-sports": All-22/broadcast clips (short, per posting-dial rules) interleaved with analyst notes, play-by-play text, and injury-report text; LTIP-analog = long-form coach's-film notes. Start with public Big Data Bowl + NFL YouTube highlights (short clips only).
- Model: open VLM (verify OpenFlamingo or a 2025-era open VLM) — frozen vision encoder + frozen small LM (7B-class, not 80B) + trainable gated xattn-dense bridge (paper's recipe); Perceiver Resampler to 64 tokens per clip; per-clip attention masking.
- Training: weighted NLL over (paired clip↔note) + (interleaved film-note documents); single-image cross-attention masking per paper.
- Serving: offline batch over weekly film; analyst-in-the-loop (outputs are notes, never auto-published picks).
- Effort: medium (3–5 weeks with an open VLM base; the corpus build is the long pole).

## 12. Reproducible test
Dataset: 500 labeled broadcast clips across 8 defensive-scheme classes (from public charting/film notes). Metric: 4-shot classification accuracy via in-context prompting vs. a fine-tuned video classifier baseline (e.g., TimeSformer fine-tuned on the same 500). Protocol: 5-fold, disjoint games per fold (no same-game leakage); report accuracy + calibration of the likelihood-scored close-ended outputs.

## 13. Acceptance / rejection gate
**ACCEPT:** Flamingo-style 4-shot prompting beats the fine-tuned video-classifier baseline by ≥5 percentage points accuracy on the held-out folds AND close-ended likelihood scores are rank-calibrated (top-1 pick correct ≥60% when margin >0.3). **REJECT:** fails to beat the fine-tuned specialist — then few-shot generality isn't buying anything over cheap supervised heads and the lane stops. Gate pre-registered before the test.

## 14. Improvement experiment
Beyond the paper: **tracking-conditioned visual prompting.** The paper conditions the LM only on resampled *visual* tokens. For NFL, prepend a tracking-derived symbolic token stream (downsampled player trajectories as discretized "words") to the interleaved sequence, so the LM cross-attends to both pixels and trajectories. Why it might beat the paper: broadcast pixels lose depth/occlusion information that tracking preserves (e.g., disguised coverages); a dual-conditioned LM should outperform the vision-only variant on scheme classification, and the ablation (vision-only vs. vision+tracking tokens) directly measures the value of the tracking modality inside a generative VLM.
