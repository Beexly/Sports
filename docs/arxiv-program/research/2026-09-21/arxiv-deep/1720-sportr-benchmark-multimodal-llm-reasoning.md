# 1720 SportR: a benchmark for multimodal large language model reasoning in sports (arXiv:2511.06499v1)

**Citation:** Jiawei Xia, Minghao Li, Tianyi Zhang, Yutong Liu (2026). *SportR: A Benchmark for Multimodal Large Language Model Reasoning in Sports*. ICLR 2026. arXiv:2511.06499v1. URL: https://arxiv.org/abs/2511.06499v1
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, 28 pages, all sections, tables, figures, appendices B–E).
**Verdict:** ADAPT — the progressive QA hierarchy (infraction → foul → penalty → explanation → visual grounding → tactics) with human-authored chain-of-thought and the SFT+GRPO training recipe is a strong blueprint for building GSE's sports-reasoning model, but it is a benchmark paper, not a deployable system, and its American-football coverage is one of five sports; adapt the training recipe and the grounding-evaluation idea to GSE's NFL film/stat QA.

## 1. Research question

Do multimodal LLMs actually reason about sports rules, or do they just perceive? The paper builds SportR, a benchmark that separates fine-grained rule-based reasoning (foul identification, penalty prediction, tactic recognition, explicit visual grounding with bounding boxes) from shallow perception, and asks: (a) how far current MLLMs are on these tasks, and (b) whether supervised fine-tuning on human-authored chain-of-thought plus GRPO reinforcement learning can teach a 7B open model to reason — including cross-modal transfer from images to video.

## 2. Dataset / schema

- SportsImage: 4,789 images across basketball, soccer, table tennis, badminton, American football; each with a human-authored CoT rationale (macro-to-micro: court area + parties → action dynamics → precise point of contact).
- SportsVideo: 2,052 video clips with CoT rationales (no bounding-box grounding — deemed too hard to annotate consistently across frames).
- 50 infraction/foul types, 12 tactic types.
- 6,841 human-authored CoT annotations; 20,000+ QA pairs total.
- Progressive QA: Q1 infraction identification, Q2 foul classification, Q3 penalty prediction, Q4 free-form explanation, Q5 visual grounding (bounding-box IoU), Q6 offensive tactic ID, Q7 defensive tactic ID; video Q8–Q13 (no grounding).
- Annotation team: 16 experts including 2 former NCAA Division I athletes; uncertain cases double-reviewed or discarded; no model-assisted annotation.

## 3. Method / model

- Benchmark construction: expert annotation with a strict macro-to-micro CoT protocol; QA pairs generated from the CoT at increasing depth.
- Model training (proof of concept): Qwen-2.5VL-7B, two stages — (1) SFT on the SportsImage CoT data, (2) GRPO reinforcement learning. GRPO objective: J_GRPO(θ) = E[min(ρ_i A_i, clip(ρ_i, 1−ε, 1+ε) A_i) − β·D_KL(π_θ(·|q) ‖ π_ref(·|q))], with advantage A_i = (r_i − μ_r)/σ_r over grouped rollouts. Reward: R(o|q) = 1.0·R_correct + 0.5·R_format (correctness + output-format adherence). Trained on 4×H20 GPUs, image data only.
- Evaluation: IoU for Q5 grounding; LLM-as-judge (GPT-5, Gemini 2.5 Pro, Claude 4 Sonnet, averaged to mitigate self-preference) for text QA, validated against 660 human-judged samples (Pearson r > 0.65).

## 4. Equations & assumptions

- GRPO as above: group-relative advantages, clipped surrogate, KL penalty to the reference policy; reward mixes correctness (1.0) and format (0.5).
- IoU = |pred ∩ gt| / |pred ∪ gt| on the tightest-possible expert bounding box around the infraction's critical visual evidence.
- Assumptions: the expert CoT is ground truth (no model assistance, uncertain cases discarded); LLM-judge scores approximate human judgment (validated at r > 0.65, not perfect); video tasks inherit image-trained reasoning (tested, not assumed).

## 5. Features / target

- Input: image or video + question from the progressive hierarchy.
- Targets: categorical answers (Q1–Q3, Q6–Q13), free-form explanation (Q4/Q11), bounding-box coordinates (Q5).
- Training signal: human CoT rationales (SFT) + correctness/format reward (GRPO).

## 6. Validation design

- Zero-shot evaluation of proprietary (GPT-5, Claude 4 Sonnet, Gemini 2.5 Pro) and open models (LLaVA family, Qwen-VL 2.5 7B/72B, DeepSeek-VL, GLM-4.5V) on the SportsImage test set and all of SportsVideo (cross-modal generalization test for the trained model).
- Consistent prompt template, temperature 0.7, across all models.
- Error analysis on 1,500 failure cases across 5 categories: visual hallucination, domain knowledge gap, reasoning error, format violation, visual perception error.

## 7. Numerical results / baselines

- SportsImage (zero-shot): GPT-5 — Q1 69.19, Q2 44.21, Q3 44.49, Q4 41.34, Q5 5.70 IoU, Q6 65.75, Q7 58.82. All models score < 7% IoU on Q5 grounding; foul classification (Q2) is hard everywhere (best zero-shot 44.21).
- Training effect (Qwen-2.5VL-7B): Q2 accuracy 14.43 → 50.71 (SFT) → 51.54 (SFT+RL); Q1 48.29 → 69.82 → 84.19; Q5 IoU 4.61 → 2.88 → 9.94; trained model tops 5 of 7 categories.
- SportsVideo: GPT-5 leads most (Q9 34.39, Q10 41.83, Q12 60.82); the image-trained SFT+RL model generalizes cross-modally with zero video training — Q8 25.49 → 59.52, beating GPT-5's 59.17.
- Error analysis: video errors dominated by perception + hallucination (60–70%); images unmask domain-knowledge gaps (GPT-5's knowledge-gap share rises 20% → 36% from video to image).

## 8. Code / data availability

- Public repository: https://github.com/chili-lab/SportR (code and data per the paper). This is the most reproducible paper in the wave — the benchmark, annotations, and training details (Appendix B) are released.

## 9. Leakage & limitations

- LLM-as-judge validated at r ≈ 0.65–0.70 with humans — meaningful noise in the text-QA scores; small differences between mid-tier models may not be real.
- American football is one of five sports with no per-sport breakdown reported — the NFL-relevant slice is unquantified.
- Video has no grounding task (acknowledged as future work); the hardest skill is image-only.
- The trained model's video generalization is shown on Q8–Q13 but the paper does not test whether video *training* would do better — cross-modal transfer is demonstrated, not optimized.
- Proprietary judges (GPT-5, Gemini, Claude) grading proprietary models: self-preference mitigation by averaging helps but does not eliminate shared blind spots.

## 10. GSE overlap

- GSE's film-analysis and automated-charting ambitions need exactly this: a model that reasons about rules/concepts in sports video, grounded in visual evidence. The progressive QA hierarchy is a template for GSE's own eval: formation ID → concept classification → outcome explanation → visual grounding of the key block/route.
- The SFT-on-expert-CoT + GRPO recipe is the practical path to a GSE sports-reasoning model without frontier-model budgets.
- The error taxonomy (perception vs knowledge-gap vs reasoning) gives GSE a diagnostic vocabulary for its own model failures.
- Dedup clean against the 1,093-ID set.

## 11. GSE implementation spec

- Build `gse/vision/sportr_adapt/`: (1) construct an NFL analog of SportsImage — sample All-22/broadcast frames, have GSE analysts write macro-to-micro CoTs (formation + personnel → route/coverage dynamics → point of decisive action) for a progressive QA set: formation ID → coverage/blitz classification → outcome explanation → bounding-box grounding of the decisive matchup; (2) SFT Qwen-2.5VL-7B (or successor) on the CoTs, then GRPO with R = 1.0·correctness + 0.5·format, mirroring the paper's Appendix B; (3) evaluate with the paper's protocol: IoU on grounding, LLM-judge panel on explanations, and the 5-category error analysis to diagnose perception vs knowledge gaps.
- Start with the paper's released American-football slice as a zero-shot baseline before spending annotation budget.

## 12. Reproducible test

- Zero-shot the paper's released benchmark American-football subset with GSE's candidate vision model; then fine-tune per the recipe on a 500-frame GSE-annotated NFL pilot set; success criteria: Q2-analog (concept classification) accuracy ≥ 2x the zero-shot baseline, grounding IoU ≥ 0.15 (vs the paper's < 0.07 zero-shot), and the error analysis showing knowledge-gap errors shrinking faster than perception errors (evidence the CoT training teaches rules, not just seeing).

## 13. Acceptance / rejection gate

ADAPT the recipe (progressive QA hierarchy + expert CoT + SFT/GRPO + error taxonomy), not a model checkpoint: the paper trains on 5 sports with unquantified football coverage. ADAPT proceeds if the 500-frame NFL pilot meets the criteria above; REJECT the grounding task (Q5 analog) if analyst box-drawing agreement (inter-annotator IoU) falls below 0.5 — the paper's experts could draw tight boxes on fouls, but if GSE analysts cannot agree on "the decisive matchup," the grounding target is noise; REJECT LLM-as-judge as the sole text metric for GSE (r ≈ 0.65 is too noisy for production gates — keep a human-judged subset always).

## 14. Improvement experiment

Go beyond the paper in the direction its results point. (1) The paper shows image training transfers to video (Q8 25.49 → 59.52) but never trains on video — run the missing experiment: SFT+GRPO on the SportsVideo CoTs and test whether video training beats image-only transfer; for GSE this decides whether to annotate frames or clips. (2) Close the judge-noise gap: the paper validates LLM-judge at r > 0.65 and moves on — build a GSE judge-calibration set (analyst scores on 300 explanations) and fit a bias correction per judge model; if corrected judges reach r ≥ 0.85, GSE can evaluate at scale, which the paper's protocol cannot. (3) Add the football depth the paper lacks: extend the 50-foul/12-tactic taxonomy with an NFL concept taxonomy (coverages, blitzes, route concepts) and test whether the same progressive hierarchy exposes the same perception-vs-knowledge-gap split — a direct test of the paper's claim that the hierarchy generalizes across sports.
