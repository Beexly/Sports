# [1605] TimeSoccer: An End-to-End Multimodal Large Language Model for Soccer Commentary Generation (arXiv:2504.17365)

**Citation:** You, L., Huang, W., Xie, X., Wei, X., Li, B., Lin, S., Li, Y., & Wang, C. (2025). *TimeSoccer: An End-to-End Multimodal Large Language Model for Soccer Commentary Generation*. East China Normal University. arXiv:2504.17365. URL: https://arxiv.org/abs/2504.17365
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML). **Note:** this paper replaces the REJECT ledger 1596 (2412.00943) per the replace-on-reject rule.
**Verdict:** ADAPT — end-to-end joint timestamp+commentary MLLM with a training-free motion-aware frame compressor (MoFA-Select) and progressive long-video training; GSE-adaptable to full-game NFL video/commentary generation and long-form temporal event localisation.

## 1. Research question
Existing soccer MLLMs either rely on ground-truth timestamps (temporal a priori) or use a decoupled two-stage spot-then-caption pipeline that loses global context; can a single end-to-end model jointly predict timestamps and generate commentary over full 45-minute matches in one forward pass — and what frame-compression + training recipe makes 45-minute MLLM inference tractable?

## 2. Dataset / schema
SoccerNet-Caption with MatchTime's refined timestamps (ledger 1598): 422 train / 49 test videos, following the MatchTime split. Evaluation protocol: full 45-minute end-to-end inference (primary) vs 3-minute × 15-inference chunks.

## 3. Method / model
Architecture (built on TimeChat): EVA-CLIP ViT-G/14 visual encoder → Image Q-Former with time-aware conditioning ("This frame is sampled at 2s") → MoFA-Select (training-free motion-aware frame selection: (a) time-constrained K-Means clustering of N_o frame features into U=6 segments minimising Σ_k Σ_{t∈k}(1−sim(f_t,c_k)); (b) motion-aware budget R_k per cluster from intra-cluster feature variance s_k = Var(f_t|t∈B_k)/max_j Var; (c) iterative fine-grained merging of max-similarity adjacent pairs, skipping merge when motion penalty Δ_motion(i)=Var({f_i,f_{i+1}}) > δ=0.3) → fixed N_p compressed frames → sliding Video Q-Former → LLaMA-2 7B with LoRA rank 32 (ViT and base LLM frozen; Q-Formers fine-tuned). Training: progressive schedule (3→15→45-min videos) + position-embedding extrapolation by periodic replication (beats interpolation). Standard NLL loss L = −Σ_i log P(Q_a^{(i)} | Q_a^{(<i)}, Q_v, Q_t).

## 4. Equations & assumptions
Eqs (1)–(9): joint (T̂,C) = Φ(V) formulation; cosine sim; cluster loss; motion score s_k; budget R_k = max(1, min(⌊N_p·|B_k|/N_o⌋ + s_k·⌊N_p·|B_k|/N_o⌋, |B_k|)); merge f_merged = (f_i+f_{i+1})/2. Assumptions: feature variance proxies motion salience; periodic position replication preserves positional semantics better than interpolation; MatchTime-aligned timestamps are adequate supervision.

## 5. Features / target
Features: compressed time-aware video tokens + timestamp text tokens ("This video contains N_p frames sampled at t_1..."). Targets: timestamp set T̂ + commentary captions C.

## 6. Validation design
Temporal: Precision@0.3/0.5/0.7/0.9 and F1 with ±5 s extended timestamps and IoU. Caption: CIDEr, METEOR, SODA_c. LLM-judge: Qwen2.5-VL-72B-Instruct M-S (match-level semantic alignment) and C-S (commentary quality), 1–10. Baselines: SN-Caption, SN-Caption+MatchTime, SN-Caption+UniSoccer (fed SN-Caption timestamps), Video-LLaMA, MovieChat, LLaVA-Video-72B, LLaVA-OneVision-72B, TimeChat (fine-tuned). Ablations: MoFA-Select vs G-Prune vs w/o coarse/fine/motion-aware/time-merge; direct vs progressive training; interpolated vs replicated position embeddings.

## 7. Numerical results / baselines
TimeSoccer (45-min): P@0.3 17.0, P@0.5 11.0, P@0.7 6.0, P@0.9 3.4 (vs SN-Caption 12.5/7.2/3.0/1.1); CIDEr 8.3, METEOR 6.2, SODA_c 2.7; M-S 5.03, C-S 5.14 (vs SN-Caption 3.41/4.30). 3-min×15 variant: P@0.3 22.5, F1 12.0, CIDEr 13.8, C-S 6.18 — higher but 15 forward passes, not end-to-end. MoFA-Select beats G-Prune and every ablation removes performance (motion-awareness removal worst for captions). Progressive + repeated-pos-encoding is the best training recipe.

## 8. Code / data availability
Not stated in paper (no public repo link observed).

## 9. Leakage & limitations
No code release; evaluation on 49 test matches only; commentary-quality metrics (M-S/C-S) are LLM-judged, not human; absolute temporal precision still modest (P@0.9 = 3.4%); 45-min setting scores lower than chunked inference; the model inherits MatchTime's timestamp-supervision limits (ledger 1598).

## 10. GSE overlap
Distinct from ledgers 1594/1595/1597 (text→event classifiers) and 1598 (alignment pipeline for the two-stage paradigm this paper replaces): this is the end-to-end video-MLLM alternative. MoFA-Select's motion-aware frame compression is novel to the corpus.

## 11. GSE implementation spec
Adapt to NFL: (a) port MoFA-Select (training-free — directly reusable) to compress full NFL game broadcasts to fixed-length frame sets for a video-MLLM; (b) train an end-to-end TimeChat-style model on NFL Game Pass video with play-by-play timestamps as supervision, using the progressive 3→15→45-min schedule and periodic position-embedding replication; (c) joint timestamp+commentary generation enables auto-generated highlight reels with aligned narration, and long-form event localisation (e.g., "find all missed tackles in Q3") — the visual complement to the text-signal lanes (1594–1597).

## 12. Reproducible test
Replicate Table 1 on SoccerNet-Caption/MatchTime timestamps (TimeSoccer-45min P@0.5 ≥ 10, CIDEr ≥ 8) and Table 2's ablation ordering. For GSE: on a 10-game NFL sample, end-to-end play-event localisation P@0.5 ≥ 2× a two-stage baseline with comparable caption quality by LLM judge.

## 13. Acceptance / rejection gate
ACCEPTED (ADAPT): first end-to-end SDVC MLLM + training-free reusable compression module + systematic ablations. ADAPT (not ADOPT): no code release, soccer-only, modest absolute precision — adopt the MoFA-Select module and training recipe, retrain the MLLM on NFL data.

## 14. Improvement experiment
Add player-identity grounding (fixes 1598's anonymity limitation) via a jersey-number detection head; test MoFA-Select standalone as a highlight-clip selector (motion budget → keyframe extraction); dense-captioning SODA evaluation against human-written NFL recaps; measure the 45-min vs chunked-inference quality gap on NFL's longer effective broadcast duration.
