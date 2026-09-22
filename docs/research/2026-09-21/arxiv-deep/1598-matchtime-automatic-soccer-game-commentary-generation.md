# [1598] MatchTime: Towards Automatic Soccer Game Commentary Generation (arXiv:2406.18530)

**Citation:** Rao, J., Wu, H., Liu, C., Wang, Y., & Xie, W. (2024). *MatchTime: Towards Automatic Soccer Game Commentary Generation*. Shanghai Jiao Tong University. arXiv:2406.18530. URL: https://arxiv.org/abs/2406.18530
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — coarse-to-fine text↔video temporal alignment pipeline plus a video-LLM commentary generator; GSE-adaptable as the alignment front-end for turning NFL audio/transcript streams into event-locked commentary feeds.

## 1. Research question
Soccer commentary datasets (SoccerNet-Caption, 471 matches) suffer large text↔video timestamp misalignments that corrupt commentary-generation training; can a two-stage (ASR+LLM coarse → CLIP-contrastive fine) alignment pipeline repair them, and does training on the aligned dataset (MatchTime) produce a state-of-the-art commentary generator (MatchVoice)?

## 2. Dataset / schema
SN-Caption-test-align: 49 matches, 3,267 video-text pairs manually re-aligned by 20 football fans (offsets range −108 to +152 s, mean abs offset 16.63 s; only 26.29% within 10 s, 85.03% within 60 s). MatchTime: 422 matches (373 train / 49 val), 29,476 pairs (26,058 train / 3,418 val), timestamps auto-corrected. Schema: match video V with key frames + k textual commentaries with noisy timestamps → corrected timestamps ~t_i.

## 3. Method / model
Two-stage alignment: (a) coarse — WhisperX ASR over match audio → LLaMA-3 summarises narration into event descriptions per 10-s clip → LLaMA-3 re-times each textual commentary by sentence similarity; (b) fine — frozen CLIP ViT-B/32 text+vision encoders, trainable MLPs f(·), g(·) to 512-d, contrastive InfoNCE-style loss L_align on affinity matrix A[i,j] = C_i·V_j/(‖C_i‖‖V_j‖) trained on 45 manually aligned videos (2,975 pairs, frames sampled 1 FPS in ±2-min windows). Inference: argmax over 1 FPS candidates in [t−45 s, t+30 s] (replay-robust). MatchVoice generator: frozen visual encoder (C3D/ResNet/CLIP/InternVideo/Baidu) → 2-layer Perceiver-style temporal aggregator (32 learnable queries) → MLP projection to 768-d prefix tokens → LLaMA-3 decoder (frozen or LoRA rank 8–64), standard NLL loss, 30-s input window.

## 4. Equations & assumptions
Affinity A[i,j]; L_align = −(1/k)Σ_i log[Σ_j Y[i,j]exp(A[i,j]) / Σ_j exp(A[i,j])]; ~t_i := ^t_j, j = argmax A[i,:]; generation ^C = Ψ_dec(Ψ_proj(Ψ_agg(v_1..v_n))). Assumptions: audio narration correlates with on-screen events; manual alignment of 45 videos generalises; 30-s window contains the event (window ablation supports this); Baidu encoder's soccer pre-training explains its edge.

## 5. Features / target
Features: per-frame visual embeddings + (for alignment) CLIP text embeddings of commentary. Targets: corrected timestamps (alignment), ground-truth commentary strings (generation).

## 6. Validation design
Alignment evaluated on 4 unseen annotated matches (292 samples): mean abs offset and % of commentaries within 10/30/45/60 s windows. Generation evaluated on the manual SN-Caption-test-align benchmark (avoiding noisy-test evaluation): BLEU-1/4, METEOR, ROUGE-L, CIDEr + GPT-score (GPT-3.5 judge, 1–10). Ablations: window size (10/30/45/60 s), coarse/fine alignment on/off, LoRA rank on LLM decoder, visual encoder choice; baselines (SN-Caption variants, Video-LLaMA zero-shot) retrained on both original and aligned data.

## 7. Numerical results / baselines
Alignment: mean abs offset 13.89 s → 6.89 s; 10-s window compliance 35.32% → 80.73%; 60-s 88.07% → 98.17%. Generation (MatchVoice + Baidu + LoRA r=16, trained on MatchTime): BLEU-1 33.22, BLEU-4 10.10, METEOR 26.79, ROUGE-L 26.06, CIDEr 39.27, GPT-score 7.32 — vs same model trained on unaligned data (BLEU-1 30.32, CIDEr 33.84, GPT 7.07) and vs SN-Caption baseline (BLEU-1 29.74, CIDEr 23.74, GPT 6.84). Window ablation: 30-s window best. Coarse+fine alignment jointly best (Table 5). LoRA r=16 peak CIDEr 39.27 vs frozen-LLM 38.42.

## 8. Code / data availability
Project page: haoningwu3639.github.io/MatchTime (datasets, code, benchmarks released per paper).

## 9. Leakage & limitations
Alignment evaluated on only 4 matches (292 samples); the 49-video manual set is small as supervision. Commentary remains anonymous (no player names) — acknowledged limitation; corner vs free-kick confusion noted. GPT-score is an LLM-judge metric (GPT-3.5), not human evaluation. Baidu encoder's edge may partly reflect soccer-pretraining data overlap. Audio-based coarse alignment fails for matches without commentary audio.

## 10. GSE overlap
No GSE text-alignment pipeline exists for broadcast audio/transcript streams; this is a new capability. Pairs with ledger 1594/1595/1597 (commentary→event extraction) — alignment is the missing upstream step that makes those extractors work on real noisy NFL broadcast/transcript feeds.

## 11. GSE implementation spec
Adapt the two-stage alignment to NFL: (a) run ASR (WhisperX) on NFL broadcast/Game-Pass audio to get timestamped narration; (b) use an LLM to summarise narration into play descriptions per 10-s clip; (c) fine-align beat-writer/X text timestamps to play-by-play using a CLIP-style text↔text or text↔clip contrastive model trained on a manually aligned sample (NFL equivalent of SN-Caption-test-align: ~20–50 games, fan-annotated); (d) feed aligned pairs into the injury/event classifiers from 1594/1595/1597. This directly fixes the timestamp noise that would otherwise corrupt any text-signal model trained on scraped NFL feeds.

## 12. Reproducible test
Replicate Table 2 on the released SN-Caption-test-align (mean abs offset ≈ 6.9 s; 10-s window ≈ 80.7%) and Table 3's key cell (MatchTime-trained MatchVoice BLEU-1 ≥ 31, CIDEr ≥ 38). For GSE: aligned NFL pairs reduce event-label timing error vs raw scrape by a measurable margin on a manually annotated 5-game sample.

## 13. Acceptance / rejection gate
ACCEPTED (ADAPT): public datasets + released pipeline + quantified gains on both stages + ablations isolating each component. The generator itself is soccer-bound and anonymous, so ADAPT (not ADOPT) — the transferable asset is the alignment methodology.

## 14. Improvement experiment
Swap CLIP ViT-B/32 for a domain-finetuned encoder and test on NFL; inject player identity (roster/Jersey-number vision model) to fix the anonymity limitation; extend to play-by-play text alignment (not just commentary); measure downstream impact of alignment on the event-classifier F1 from ledgers 1594/1595/1597 — the paper's Table-5-style result for GSE.
