# [0336] MVU-Eval: Towards Multi-Video Understanding Evaluation for Multimodal LLMs (arXiv:2511.07250v2)

**Citation:** Tianhao Peng, Haochen Wang, Yuanxing Zhang, Zekun Wang, Zili Wang, Gavin Chang, Jian Yang, Shihao Li, Yanghai Wang, Xintao Wang, Houyi Li, Wei Ji, Pengfei Wan, Steven Huang, Zhaoxiang Zhang, and Jiaheng Liu (2025). *MVU-Eval: Towards Multi-Video Understanding Evaluation for Multimodal LLMs*. arXiv:2511.07250v2. URL: https://arxiv.org/abs/2511.07250v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 18 pages incl. appendix).
**Verdict:** ADAPT — adopt its 8-task multi-video taxonomy and its leakage-removal QA-generation pipeline to build GSE's own multi-angle NFL clip evaluation; the headline capability gap (best MLLM 58.4% vs. human 93.6%) is the reason GSE must not trust off-the-shelf MLLMs for cross-angle play analysis yet.

## 1. Research question
Existing video benchmarks evaluate MLLMs on single videos only, ignoring the real-world need to reason across multiple videos (the paper explicitly names **cross-angle sports analytics** and multi-sensor autonomous driving as motivating applications). Can a comprehensive benchmark — 8 core competencies, perception + reasoning, over 1,824 curated QA pairs spanning 4,959 videos — reveal the true state and specific failure modes of multi-video understanding in current MLLMs?

## 2. Dataset / schema
**MVU-Eval**: 1,824 QA pairs, 4,959 total videos (avg 4.7 videos/question, up to 13; majority 4–6 videos). Each question requires cross-video integration. Two protocols:
- **Perception** (667): Object Recognition (126; identify/track identical objects across non-overlapping sequences), Spatial Understanding (179; spatial layout from complementary camera angles), Counting (227; aggregate transient objects across asynchronous videos), Comparison (135: Replacement 40, Removal 24, Addition 40, Others 31).
- **Reasoning** (1,157): Knowledge-Intensive Reasoning (281: action classification, difficulty measuring, score judging — sports-domain), In-Context Learning (164; infer the question from answered examples, then answer for a new video), Retrieval-Augmented Generation (339; synthesize relevant evidence from redundant multi-video inputs), Temporal Reasoning (373: temporal ordering 152, temporal grounding 164, temporal caption filling 27, others 30).
- Video sources: Kinetics-400, nuScenes, ScanNet, FineDiving (sports KIR/ICL), YouCook2, Vchitect-2.0 (RAG), DREAM-1K, plus 130 manually curated Kling.AI video-editing comparison samples. Human faces / copyright-sensitive content excluded.
- Construction pipeline (Figure 2): rule-based video-pair sampling → auto QA generation (MLLM reject sampling + templates; Jaccard similarity on captions for RAG pair sampling) → **leakage removal** (content leakage: strip descriptive text from options, e.g. "The classroom in Video 1" → "Video 1"; format leakage: regenerate until no-video accuracy ≈ random chance) → difficulty filtering (drop questions Gemini 2.5 Pro + Gemini 2.0 Flash + Qwen2.5-VL-72B all answer correctly) → human verification (utility + correctness; ~563 more removed) → option rebalancing (final: A 25.5%, B 25.8%, C 22.7%, D 20.4%). Yield: 4,187 initial pairs → 1,824 final (46% retained).
- Token stats: avg video token length 51,013 (max 154,336); question length avg 111. Eval protocol: zero-shot accuracy, 32 frames/video (longer side ≤720px, patch 28×28), robust regex answer extraction.

## 3. Method / model
This is a benchmark paper, not a model paper. The "method" is the benchmark design and QC methodology above. Evaluated: 26 MLLMs — closed (Gemini 2.5 Pro, Gemini 2.0 Flash, Gemini 1.5 Pro, GPT-4o) and open (Qwen2.5-VL 3B/7B/32B/72B, InternVL2.5/3, InternVideo2.5, VideoChat-Flash, VideoLLaMA3, mPLUG-Owl3, LLaVA-OneVision/Video/NeXT-Video, MiniCPM, Slow-Fast-MLLM, LongVILA, Video-XL-2/Pro). Plus 5 human experts with two-phase consensus adjudication.

## 4. Equations & assumptions
No numbered equations in the paper. Stated formal quantities: Jaccard similarity on text captions as the video-similarity metric for RAG anchor sampling; accuracy (exact option-letter match) as the metric. Stated assumptions: (i) zero-shot evaluation; (ii) 32 frames/video uniform sampling is sufficient; (iii) questions are answerable only after watching all provided videos (enforced by human utility check); (iv) no-video accuracy ≈ random chance validates leakage removal; (v) human-expert consensus (majority ≥3/5) as ground truth ceiling.

## 5. Features / target
Inputs: multiple videos (2–13) + a multiple-choice question with 4+ options. Target: the correct option letter. Metric: accuracy overall and per-task. Secondary analyses: accuracy vs. number of videos, frames, resolution, input format (native multi-video vs. multi-image vs. merged-video), and information-ablation (multi-video vs. single-video vs. multi-image vs. text-description vs. no-video).

## 6. Validation design
Benchmark validation: (1) leakage audits (no-video baseline 16.0%, below random 26.0% — models refuse to answer, confirming no exploitable priors); (2) information ablation showing monotonic degradation as visual information decreases; (3) human ceiling 93.6% confirming tasks are solvable; (4) balanced options; (5) per-task breakdown across 26 models; (6) failure-case analysis with representative examples.

## 7. Numerical results / baselines
- **Overall**: best closed model Gemini 2.5 Pro 58.4%; best open Qwen2.5-VL-72B 57.1% (≈ Gemini 2.0 Flash 56.3); human 93.6%; random 26.0%. Most open models <50%. **35-point gap to human.**
- Per-task bests: OR — GPT-4o 54.7; SU — GPT-4o 57.7; Counting — Gemini 1.5 Pro 66.1; Comparison — Qwen2.5-VL-72B 77.8; KIR — Gemini 2.0 Flash 53.7; ICL — Gemini 1.5 Pro 47.6; RAG — Video-XL-2-8B 48.7 / Qwen2.5-VL-72B 48.1; TR — Gemini 2.5 Pro 83.1. Capabilities are imbalanced across models — no single model leads everywhere.
- Scaling holds: Qwen2.5-VL 3B→72B (46.2→57.1); InternVL3 8B→38B→78B (41.7→48.4→50.6). Small Qwen2.5-VL-3B (46.2) beats larger LLaVA-OneVision-7B (40.4) — architecture/data strategy matter.
- More videos = harder: accuracy declines as video count rises (Figure 6).
- Frames: VideoLLaMA3-7B improves up to 32 frames, degrades at 64 (token overload). Resolution: improves to 720, degrades at 960.
- Input format (Qwen2.5-VL-7B): native multi-video 51.9 vs. multi-image 45.2 vs. merged-video 44.6 — format matters (−7.3 pp for naive merging).
- Information ablation (VideoLLaMA3-7B): multi-video 47.5; text-description 41.0 (−6.5); multi-image 34.6 (−12.9); single-video 24.9 (−22.6); no-video 16.0 (−31.5).
- Long-video specialists (Video-XL-Pro-3B 39.1, LongVILA 32.7, Video-XL-2-8B 43.7) remain modest — long-context alone doesn't solve cross-video reasoning.
- Failure modes: (1) object status/function (shovel held vs. used); (2) spatial understanding across camera angles on the same vehicle; (3) domain knowledge + filtering irrelevant videos; (4) temporal/causal reasoning ("what" vs. "why"); (5) instruction-following (LLaVA-Video-7B: >98% free-form paragraphs ignoring the option-letter instruction).

## 8. Code / data availability
Benchmark to be released: https://github.com/NJU-LINK/MVU-Eval. Video sources are public datasets (Kinetics-400, nuScenes, ScanNet, FineDiving, YouCook2, DREAM-1K).

## 9. Leakage & limitations
- **Stated by authors**: videos are short (no movie-length long-range reasoning); visual-only, no audio; asynchronous videos dominate (temporal alignment is the hard part).
- **Sports coverage is thin**: only FineDiving (diving) supplies sports KIR/ICL; no team-sport, no multi-camera-angle sports data — the "cross-angle sports analytics" motivation is asserted, not evaluated.
- **Option-format artifacts**: despite rebalancing, Comparison random baseline is 13.6% (not 25%) — uneven option counts per subtask.
- **Evaluation fragility**: models that don't follow the option-letter instruction (LLaVA-Video-7B) are penalized by the regex pipeline even when semantically relevant — the benchmark measures instruction-following as much as understanding for some models.
- **32-frame cap**: uniform sampling may miss brief decisive moments in longer videos; the frame-count finding (degradation at 64) is model-specific, not fundamental.

## 10. GSE overlap
New capability — no MLLM evaluation harness exists in the repo. Two distinct ports: (1) **the QC pipeline is reusable methodology** — leakage removal (content + format), difficulty filtering against strong models, human utility verification, option rebalancing — for any QA set GSE builds over its clip library; (2) **the task taxonomy maps onto NFL multi-angle analysis**: broadcast + all-22 + end-zone views of the same play are exactly the "complementary camera angles" Spatial Understanding task; Temporal Ordering/Grounding map to drive sequencing across clips; KIR's action-classification + difficulty + score-judging maps to grading player performance across views. Per the existing-research map, this extends the video/clip lane with an evaluation layer, and it cautions the 0332/0333 pipeline: any MLLM-based analyst-assist step must be benchmarked first, because even the best model is 35 points below human on multi-video tasks.

## 11. GSE implementation spec
1. **GSE-MVU (NFL)**: build a 200–500 QA-pair evaluation set over multi-angle NFL clips (broadcast + all-22 + end-zone of the same plays), adapting the 8-task taxonomy: OR (identify the same player across angles), SU (spatial relations from complementary views), Counting (e.g., box count across views), Comparison (formation changes pre/post-motion), KIR (penalty/rule judgments requiring the rulebook + video), ICL (grade a new play given graded examples), RAG (find the relevant angle among redundant clips), TR (order the plays of a drive).
2. **QC**: replicate the paper's pipeline — strip content leakage from options, regenerate until no-video accuracy ≈ chance, difficulty-filter against the strongest available MLLMs, human-verify utility/correctness, rebalance options.
3. **Use**: gate every MLLM deployment (clip tagging, analyst assist, auto-writeups) on GSE-MVU score.
4. **Effort**: 2–3 weeks for a 200-pair pilot (clip curation dominates; QC protocol is directly reusable).

## 12. Reproducible test
Dataset: the 200-pair GSE-MVU pilot. Metric: overall + per-task accuracy, zero-shot, 32 frames/clip, same regex extraction. Baselines: no-video (must be ≈ chance), single-angle (must be well below multi-angle), and the paper's reported model scores as reference points.

## 13. Acceptance / rejection gate
**Adopt** an MLLM for any GSE production clip task only if it scores ≥70% overall on GSE-MVU AND ≥60% on the Spatial Understanding and KIR subtasks (the two most NFL-relevant) — a bar no current model clears on the paper's benchmark (best: 58.4% overall), which is precisely the point. **Reject** (i.e., keep MLLMs out of production clip workflows) until a model clears the bar; use the deterministic pipelines (0332/0333/0334) instead. Re-run the gate quarterly as models improve.

## 14. Improvement experiment
Go beyond the paper's multiple-choice format: add a **free-response grading task** where the model must produce a structured play grade (formation, motion, result, key blocks) from multi-angle clips, scored against analyst rubrics by an LLM judge with human spot-checks — multiple-choice underestimates what analysts need and overestimates deployability (the paper's own instruction-following failures show format compliance is part of the skill). If free-response grading correlates with the multiple-choice subtask scores, the cheaper MCQ benchmark suffices as a proxy; if it diverges (likely, given the LLaVA-Video-7B format failures), GSE learns that MCQ benchmarks can't gate production and the rubric task becomes the real gate.
