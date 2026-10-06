# [1470] SPORTU: A Comprehensive Sports Understanding Benchmark for Multimodal Large Language Models (arXiv:2410.08474v4)

**Citation:** Xia, H., Yang, Z., Zou, J., Tracy, R., Wang, Y., Lu, C., Lai, C., He, Y., Shao, X., Xie, Z., Wang, Y.-F., Shen, W., & Chen, H. (2025). *SPORTU: A Comprehensive Sports Understanding Benchmark for Multimodal Large Language Models*. Published as a conference paper at ICLR 2025. arXiv:2410.08474v4 [cs.CV]. URL: https://arxiv.org/abs/2410.08474. Dataset/code: https://github.com/chili-lab/SPORTU
**Ledger completed:** 2026-09-21. **Read:** full text (PDF) — methods, results, and error-analysis sections.
**Verdict:** ADAPT — the first large-scale sports video+text understanding benchmark (900 text MCQs, 1,701 slow-motion clips / 12,048 QA pairs, expert annotations); GSE should adapt it as the evaluation harness for any video/multimodal model in the content pipeline, not as a predictor. Key findings for GSE: rationale-first prompting hurts accuracy, and no model averages above 3/5 on open-ended G-Eval.

## 1. Research question
How well do current multimodal LLMs actually understand sports — rules, techniques, tactics — across text and slow-motion video, and where do they fail? The paper builds the benchmark and evaluates a slate of open and proprietary models.

## 2. Dataset / schema
- **SPORTU-text:** 900 multiple-choice questions across five sports, with human-written explanations.
- **SPORTU-video:** 1,701 slow-motion video clips across seven sports; 12,048 QA pairs (10,973 MCQ + 1,075 open-ended); difficulty split 25.36% easy / 50.22% medium / 24.42% hard; 300 multi-angle scenes.
- Annotation: nine expert annotators — two intercollegiate athletes with 12+ years' experience and seven players with 5+ years' training.
- Public: https://github.com/chili-lab/SPORTU.

## 3. Method / model
Benchmark construction: expert-written questions stratified by difficulty and sports-knowledge type (rules, technique, tactics, multi-angle reasoning). Model evaluation: zero-shot and five-shot, direct-answer vs rationale-first (CoT) orderings; temperature 0. Frame sampling: GPT/Claude 10 frames, most open models 16 frames, VideoChat 100 frames, Gemini whole video. Open-ended answers scored by G-Eval (GPT-4o judge), validated against humans (Pearson 0.41).

## 4. Equations & assumptions
No modeling equations (benchmark paper). Assumptions: (1) slow-motion clips isolate sports understanding from temporal perception difficulty; (2) MCQ accuracy + G-Eval proxy true sports comprehension; (3) expert annotators' judgments are gold standard; (4) 10–16 sampled frames suffice to represent a clip.

## 5. Features / target
Inputs: sports video clips / text questions. Targets: MCQ answers, open-ended explanations. Reported metric: accuracy; open-ended G-Eval score (1–5).

## 6. Validation design
Model comparison study, not a train/test ML paper. G-Eval validated against human ratings (r = 0.41). Error analysis: 20 incorrect examples per sport per model, 3,920 errors coded by failure type.

## 7. Numerical results / baselines
- SPORTU-text best: GPT-4o 71.00% (five-shot CoT).
- SPORTU-video direct-answer overall: Qwen2-VL-72B 70.94%; Claude 3.5 Sonnet 70.18%.
- GPT-4o on hard video tasks: 57.84%.
- Rationale-first generally harmed accuracy (Claude example: 52.57% direct vs 39.32% rationale-first).
- Open-ended: GPT-4o G-Eval 1.84; no model averaged above 3.
- Error analysis: question-understanding failures and hallucination were the most common error types.

## 8. Code / data availability
Dataset and evaluation code: https://github.com/chili-lab/SPORTU.

## 9. Leakage & limitations
- Slow-motion clips are an artificial regime; real broadcast footage (GSE's actual input) is full-speed with occlusions, graphics overlays, and commentary.
- Frame-sampling differences across models (10 vs 16 vs 100 vs whole video) confound the leaderboard.
- G-Eval/human correlation 0.41 is modest — open-ended rankings are noisy.
- Seven sports; American football coverage depth unclear — the benchmark may under-test NFL-specific concepts (coverages, protections) GSE cares about.
- Static benchmark; models may already have seen clips in training (contamination not audited).

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's video/content pipeline (telestrated clips for X) has no standardized model-evaluation harness. No existing ledger covers sports video understanding benchmarks. This is a new capability: an eval harness for choosing/tuning multimodal models in the content operation.

## 11. GSE implementation spec
- Pull SPORTU-video; add a GSE-specific NFL split (broadcast-speed clips of coverages, blitzes, route concepts, annotated by the same expert protocol).
- Evaluate candidate video models (for auto-telestration / clip description) on SPORTU + the NFL split before deploying any in the content pipeline.
- Adopt the paper's prompting finding operationally: direct-answer first, rationale only on demand (rationale-first degrades accuracy).
- Effort: ~1 week (harness setup + NFL clip annotation pilot).

## 12. Reproducible test
Dataset: SPORTU-video hard split + 100 GSE-annotated NFL broadcast clips. Metric: MCQ accuracy; open-ended G-Eval. Baseline: current manual/clip-description workflow quality (human-rated). Window: one-time eval, refreshed per model release.

## 13. Acceptance / rejection gate
Route any video model into the content pipeline only if it scores ≥65% on the NFL split MCQs AND its open-ended G-Eval ≥ 2.5 — otherwise keep the human-in-the-loop workflow. Reject SPORTU-only rankings as a deployment criterion (broadcast-speed NFL clips are the real test).

## 14. Improvement experiment
Fine-tune an open video model on the GSE NFL clip annotations with direct-answer training (no CoT) and test whether domain tuning closes the gap to proprietary models on the NFL split — if a 7B open model matches Claude 3.5 Sonnet at 1/50th the inference cost, the content pipeline gets dramatically cheaper.
