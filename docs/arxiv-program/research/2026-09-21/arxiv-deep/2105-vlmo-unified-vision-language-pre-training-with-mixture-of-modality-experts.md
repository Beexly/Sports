# [2105] VLMo: Unified Vision-Language Pre-Training with Mixture-of-Modality-Experts (arXiv:2111.02358)

**Citation:** Hangbo Bao, Wenhui Wang, Li Dong, Furu Wei et al. (Microsoft) (2021). *VLMo: Unified Vision-Language Pre-Training with Mixture-of-Modality-Experts*. arXiv:2111.02358v2. URL: https://arxiv.org/abs/2111.02358
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2111.02358v2). (Note: an earlier wrong ID 2111.11483 was verified via the arXiv API to be an unrelated physics paper; the correct VLMo ID is 2111.02358, confirmed clean against the dedup list.)
**Verdict:** ADAPT
**Rationale:** one Transformer that switches between fast dual-encoder retrieval (find similar historical plays) and deep fusion-encoder reasoning (matchup analysis), plus a stagewise pre-training recipe (tracking-only → text-only → joint) that fits NFL data scarcity; needs adaptation (tracking modality expert, NFL corpora).

## 1. Research question
Can one Transformer serve BOTH as a dual encoder (separate image/text encoding, linear-time retrieval) and as a fusion encoder (deep cross-modal interaction for classification/VQA) — getting the retrieval speed of CLIP and the reasoning depth of fusion models — while also being pre-trainable on abundant single-modality data, not just scarce image-text pairs?

## 2. Dataset / schema
- Vision-language: COCO, Visual Genome, SBU, Conceptual Captions (4M pairs) for base/large; 1.0B noisy web image-text pairs for VLMo-Large++ (200k steps @16k batch + 100k steps @32k batch).
- Image-only: BEiT-style masked image modeling corpus (ImageNet-scale). Text-only: large text corpus for MLM.
- Eval (public): VQA 2.0 (3,129-answer classification), NLVR2 (image-pair + text entailment), COCO/Flickr30K retrieval (Karpathy split), ImageNet classification, ADE20K segmentation. All public.

## 3. Method / model
- **MoME Transformer**: each block = shared multi-head self-attention (across modalities) + a pool of modality-specific experts replacing the FFN. Three experts: V-FFN (vision), L-FFN (language), VL-FFN (vision-language fusion). Routing is deterministic by input modality and layer index: image/text-only inputs use V/L experts throughout; image-text pairs use V+L experts in bottom layers and the VL expert in the top layers (top-2 layers base, top-3 large).
- **Stagewise pre-training**: (1) train V-FFN + shared self-attention on image-only data via BEiT masked image modeling; (2) freeze those, train L-FFN on text-only data via MLM; (3) initialize full model and run vision-language pre-training with three losses: image-text contrastive (ITC), image-text matching (ITM), masked language modeling (MLM).
- Configs: Base = 12 layers, 768 hidden, 12 heads, FFN 3072; Large = 24 layers, 1024 hidden, 16 heads, FFN 4096. 224×224 images, 16×16 patches, RandAugment, BERT-uncased tokenizer, max text length 40, whole-word masking. 200k steps, batch 1024, AdamW (β1=0.9, β2=0.98), LR 2e-4 (base) / 5e-5 (large), 2.5k-step linear warmup + linear decay, weight decay 0.01. Base: ~2 days on 64×V100-32GB; Large: ~3 days on 128×V100-32GB.
- Dual-encoder mode: encode image and text separately, dot-product similarity (linear time). Fusion-encoder mode: joint encoding, [T_CLS] → classifier.

## 4. Equations & assumptions
- MoME block: H'_l = MSA(LN(H_{l−1})) + H_{l−1}; H_l = MoME-FFN(LN(H'_l)) + H'_l. (Eq. 1–2)
- Assumptions: (1) shared self-attention aligns modalities while separate experts preserve modality-specific statistics; (2) fusion is only needed in top layers (bottom layers stay modality-specific); (3) single-modality pre-training transfers to the joint task (stagewise > joint-only ablation supports this); (4) deterministic expert routing by modality/layer is sufficient (no learned gating).

## 5. Features / target
- Inputs: image patches (linear projection, ViLT-style — no object detector), text tokens.
- Targets: contrastive pair labels (ITC), match/no-match (ITM), masked tokens (MLM) in pre-training; 3,129 VQA answers / NLVR2 binary label / retrieval ranking in fine-tuning.

## 6. Validation design
Fine-tuning on VQA 2.0, NLVR2, COCO/Flickr30K retrieval, ImageNet, ADE20K. Baselines: UNITER, VILLA, UNIMO, ViLT, ALBEF, VinVL, SimVLM, Florence, ALIGN (same 4M data for base/large; larger-data models for ++). Ablations: stagewise variants (image-only vs image+text init); pre-training tasks (ITC/ITM/MLM on/off); MoME vs standard Transformer (Table 5); retrieval speed comparison vs fusion encoders (quadratic) and ALBEF reranking.

## 7. Numerical results / baselines
- VQA test-dev / test-std (Table 1): VLMo-Base 76.64 / 76.89 (vs ALBEF-Base 74.54 / 74.70, ViLT-Base 71.26, VILLA-Base 73.59 / 73.67); VLMo-Large 79.94 / 79.98; VLMo-Large++ 82.88 / 82.78 (vs Florence-Huge 80.16 / 80.36, SimVLM-Huge 80.03 / 80.34, SimVLM-Large 79.32 / 79.56).
- NLVR2 dev / test-P: Base 82.77 / 83.34 (vs ALBEF-Base 80.24 / 80.50); Large 85.64 / 86.86; Large++ 88.62 / 89.54 (vs SimVLM-Huge 84.53 / 85.15).
- Retrieval (Table 2): VLMo-Large++ COCO text-retrieval R@1/R@5/R@10 = 83.1 / 96.0 / 98.2, image-retrieval = 65.2 / 86.5 / 92.2; Flickr30K TR = 96.8 / 100.0 / 100.0, IR = 88.1 / 98.4 / 99.3 — beats Florence-Huge (COCO TR 81.8 / 95.2, IR 63.2 / 85.7) with linear-time retrieval.
- Ablations: stagewise image+text init NLVR2 82.09 / 82.49 vs image-only init 80.33 / 81.06 (Table 4); MoME 80.13 / 80.31 vs standard Transformer 78.81 / 79.27 (Table 5 rows [6] vs [4]); all three losses together best (ITC alone 73.91/73.75 → ITC+ITM+MLM 80.13/80.31).
- ImageNet acc@1: VLMo-Base 85.5 (vs BEiT-Base 85.2, ViT-Base 83.6); ADE20K mIoU 53.4 (vs BEiT 52.8).

## 8. Code / data availability
Code and pretrained models released at https://aka.ms/vlmo (stated in paper). All eval datasets public; 1B web pairs proprietary.

## 9. Leakage & limitations
- VQA/NLVR2 fine-tuning uses standard splits; no leakage flags beyond normal practice. Large++ trained on 1B noisy pairs — label noise unquantified; web-data biases transfer.
- Expert routing is hand-designed (top-K layers), not learned — may be suboptimal for a third modality (tracking).
- Dual-encoder retrieval is linear-time but still requires encoding the full corpus per query side; "significant speedup" claim is vs. region-feature fusion models, not vs. CLIP itself.
- External validity: 2 modalities only (vision+language); a tracking expert is untested in this framework, and NFL text (jargon-heavy) differs from caption text.

## 10. GSE overlap
Existing-research-map: no MoME / unified dual+fusion architecture read; multimodal fusion exists only as a commissioned ML-brief topic. NEW capability with a distinctive GSE fit: ONE model that does fast historical-play retrieval (dual mode: "find plays like this 3rd-and-7 look") AND deep matchup reasoning (fusion mode: clip + scouting text → prediction). The stagewise recipe maps directly onto NFL data reality: abundant tracking-only data (pretrain T-FFN like the V-FFN), abundant text-only data (pretrain L-FFN on pbp/injury text), scarce paired data (joint fine-tune). No duplication.

## 11. GSE implementation spec
**Goal:** a single GSE multimodal Transformer with three experts — T-FFN (tracking), V-FFN (video), L-FFN (text) — usable as (a) dual encoder for historical-play retrieval and (b) fusion encoder feeding the engine.
- Stage 1: pretrain T-FFN + shared attention on tracking-only data (Big Data Bowl 2018–2022, masked-trajectory modeling à la BEiT).
- Stage 2: freeze, pretrain L-FFN on text-only NFL corpus (nflverse pbp descriptions, injury reports, beat-writer text) via MLM.
- Stage 3: joint training with tracking↔text contrastive + matching + MLM on paired (play window, pbp text) data; fusion expert on top layers.
- Serving: dual mode precomputes play embeddings weekly (fast retrieval API for content/analysis); fusion mode runs on-demand for matchup cards.
- Effort: medium (4–6 weeks; the MoME routing and stagewise schedule are the new mechanics; encoders are standard).

## 12. Reproducible test
Dataset: Big Data Bowl tracking + nflverse pbp text, 2018–2022 train / 2023 val / 2024–2025 test (time-ordered). Metric: (a) text→play retrieval Recall@10 on 500 labeled concept queries vs. ImageBind-style (2103) joint model and vs. CLIP text-video baseline; (b) fusion-mode play-EPA prediction MAE vs. tracking-only baseline. Baselines run with identical data splits.

## 13. Acceptance / rejection gate
**ACCEPT:** VLMo-style model beats the 2103-style single-space model by ≥3 points Recall@10 on the retrieval test AND its fusion-mode EPA MAE beats the tracking-only baseline by ≥2% on the held-out seasons. **REJECT:** no retrieval gain over the simpler joint space (then the MoME complexity isn't justified) or no EPA gain (then fusion adds nothing). Pre-registered before running.

## 14. Improvement experiment
Beyond the paper: **learned expert routing with a tracking gate.** The paper hard-codes expert selection by modality and layer. Replace with a lightweight learned router (per-token gating over {T,V,L,TV,TL,VL,TVL} experts) trained with load-balancing loss, and let the model decide fusion depth per play. Why it might beat the paper: some plays are decided by formation (tracking-dominant → shallow fusion), others by personnel/matchup context (text-dominant → deep fusion); adaptive routing should outperform the fixed top-K fusion layers, and the router's expert-utilization statistics become an interpretable "which modality mattered" signal for the engine — directly useful for GSE's matchup cards.
