# [1113] Going for GOAL: A Resource for Grounded Football Commentaries (arXiv:2211.04534v1)

**Citation:** Alessandro Suglia, José Lopes, Emanuele Bastianelli, Andrea Vanzo, et al. (2022). *Going for GOAL: A Resource for Grounded Football Commentaries*. arXiv:2211.04534v1. URL: https://arxiv.org/abs/2211.04534v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — a video-grounded sports commentary dataset + retrieval/grounding benchmark design (commentary retrieval, frame reordering, moment retrieval, generation) directly reusable for GSE's multimodal event-grounding and commentary-retrieval work; generation results themselves are weak.

## 1. Research question
Can we build a dataset and benchmark for *grounded* football commentary: retrieving the right commentary for a video moment, ordering video frames by commentary, retrieving the right video moment for a commentary, and generating commentary from video?

## 2. Dataset / schema
1,107 English football highlight videos, 2018–2020. Total duration 4,387.38 minutes; mean 3.96, min 1.3, max 11.6 minutes. Eight competitions: Serie A 638, Premier League 167, UCL 62, Europa League 61, FA Cup 34, Carabao Cup 18, Championship 77, Euro qualifiers 50 (sums to 1,107).

## 3. Method / model
Four tasks: (1) commentary retrieval (given video, retrieve matching commentary); (2) frame reordering (order shuffled frames); (3) moment retrieval (given commentary, find the video moment); (4) commentary generation (BART, HERO variants, oracle KB-target). Baselines: MLP, bi-GRU, bi-LSTM, HERO, VRoBERTa.

## 4. Equations & assumptions
Retrieval/generation model equations not recorded at re-implementable fidelity in this read ("Not stated in paper" for exact losses/architectures). Assumptions: highlight videos + professional commentary are groundable pairs; retrieval metrics (R@1, MRR) proxy grounding quality.

## 5. Features / target
Inputs: video frames/clips + commentary text. Targets: correct commentary (retrieval), correct frame order, correct video moment, generated commentary text.

## 6. Validation design
Standard train/dev/test splits over videos (exact split not recorded — "Not stated in paper"); manual evaluation of 100 generated samples for language quality (plausible/repetition/incoherent).

## 7. Numerical results / baselines
Commentary retrieval (best config): R@1 63%, MRR 0.79, mean rank 1.58 in main table vs 1.57 in appendix table (discrepancy preserved as read). Frame reordering: MLP 10.42%, MLP+position 10.99% (main) vs 10.42% (appendix); bi-GRU 90%, bi-LSTM 91%, HERO 87%. Moment retrieval: HERO soft 70.6%, weighted 2.6%; VRoBERTa 32.24%, 2.11%. Generation (weak): BART — BERTScore 0.848, BLEU 0.79%, METEOR 3.80%, ROUGE-L 8.79%; HERO-nt — 0.847, 0.60%, 3.7%, 7.2%; Oracle BART KB-target — 0.874, 2.28%, 8.21%, 21.2%. Manual 100-sample: BART language plausible 71% / repetition 9% / incoherent 20%; HERO 77%/0%/23%; HERO+video 43%/0%/57%.

## 8. Code / data availability
Code: https://gitlab.com/grounded-sport-convai/goal-baselines. Data: videos + commentaries as released by the authors.

## 9. Leakage & limitations
Generation is weak across the board (BLEU <1%) — do not treat this as a commentary-generation solution. Main/appendix numeric discrepancies (1.58 vs 1.57; 10.99% vs 10.42%) suggest reporting looseness. Highlight videos are pre-selected exciting moments — models don't face full-game grounding. Football (soccer) only; NFL transfer needs re-derivation. Moment-retrieval weighted scores (~2%) are near floor.

## 10. GSE overlap
Extension: GSE's multimodal/video work is nascent; no grounded-commentary benchmark exists in the repo. Cite `~/workspace/arxiv-sweep/existing-research-map.md`. Not duplicative.

## 11. GSE implementation spec
(a) Build "GOAL-NFL": NFL highlight clips paired with broadcast commentary transcripts (or GSE's own narration); (b) implement the four tasks with modern backbones (CLIP-style video-text encoders); (c) use retrieval (the strong task: R@1 63%) for a "find the clip for this storyline" product feature; (d) skip generation until backbones improve. Effort: ~2 engineer-weeks for the retrieval benchmark.

## 12. Reproducible test
Dataset: the released GOAL data, authors' split. Metric: commentary-retrieval R@1 / MRR. Baseline to beat: the paper's best config (R@1 63%, MRR 0.79) — a reproduction is accepted if within 3 points using the released baselines code.

## 13. Acceptance / rejection gate
ADAPT the retrieval task into GSE's clip-search product if a CLIP-style modern baseline beats the paper's R@1 by ≥5 points on GOAL-NFL pilot data; REJECT the generation task entirely (paper's own numbers don't clear any usable bar).

## 14. Improvement experiment
Condition retrieval on *game state* (score, clock, down/distance) as an extra input — the paper grounds commentary in video alone; adding structured game-state should disambiguate visually similar moments (e.g., any touchdown) and is directly available in GSE's data.
