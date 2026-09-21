# [1497] Sports Intelligence: Assessing the Sports Understanding Capabilities of Language Models through Question Answering from Text to Video (arXiv:2406.14877v1)

**Citation:** Zhengbang Yang, Haotian Xia, Jingxi Li, Zezhi Chen, Zhuangdi Zhu, Weining Shen (George Mason University / UC Irvine). arXiv:2406.14877v1. URL: https://arxiv.org/abs/2406.14877
**Ledger completed:** 2026-09-21. **Read:** full text (PDF — abstract, intro, related work, benchmark section 3, experiments 4.1–4.2 with Tables 1–3, error analysis 5.1–5.2 with Table 4 and Figures 2–4, conclusion, limitations, references, Appendix A with Table 5).
**Verdict:** ADAPT
adopt the four-class text error taxonomy as the QA checklist for GSE's LLM sports-content pipeline, standardize chain-of-thought prompting for any multi-step sports reasoning, and use the hard multi-hop gap (~29% vs ~92% human) as the quantitative reason to keep humans in the loop on scenario analysis.
**GSE rationale:** Directly benchmarks the failure modes GSE's NLP lane must design around: LLMs handle basic sports facts but collapse on multi-hop scenario reasoning; CoT is the single most effective prompting intervention; VLMs cannot yet do video sports action recognition reliably.

## 1. Research question
How well do current LLMs and VLMs actually understand sports, across basic knowledge, advanced scenario reasoning, and video-based action understanding?

## 2. Dataset / schema
No new dataset collected. Consolidates three existing resources into one benchmark with three subtasks: (1) Basic Sports Understanding = SportQA Level-1 (21,385 questions on facts/history) + Level-2 (45,685 questions, 35 sports, rules/tactics) + BIG-bench Sports Understanding subtask (986 two-way multiple-choice plausibility questions); (2) Advanced Scenario Analysis = SportQA Level-3 (3,522 manually designed scenario questions across football, basketball, volleyball, tennis, table tennis, American football, with easy/hard × single-hop/multi-hop splits); (3) Video-based Sports Recognition = Sports-QA (6,000 videos, 94,000 questions, 8 sports; Descriptive/Temporal/Causal/Counterfactual question types). Excluded QASports and LiveQA as unsuitable (context-extraction only / live-broadcast retrieval).

## 3. Method / model
Benchmark evaluation harness, not a new model. LLMs evaluated: Llama3-70B, Gemini 1.5 Pro/Flash, Claude 3 Opus, GPT-4, GPT-4o (via APIs) under 0-shot, 0-shot CoT, 5-shot standard prompting, 5-shot CoT (5-shot CoT prompts human-annotated by SportQA). VLMs evaluated locally: MiniGPT-4-7B, Chat-UniVi-7B, PLLaVA-7B, Video-LLaVA-7B (0-shot CoT only; single-video input limitation). GPT-4 used as judge for VLM free-form answers (temperature 0, max score 5).

## 4. Equations & assumptions
No new equations. Assumptions: multiple-choice accuracy measures sports understanding; GPT-4-as-judge scores correlate with human judgment on video QA; 5-shot human-annotated exemplars are representative; human performance from SportQA is the valid upper bound.

## 5. Features / target
Features: model family × prompting regime. Target: accuracy per subtask; GPT-4 judge score (1–5) for video QA; error-type distribution from 40 sampled wrong answers per task, human-categorized.

## 6. Validation design
Held-out benchmark evaluation; human error taxonomy built from 40 common incorrect responses per task, each categorized into a distinct error type by human judges, with case studies (Tables 4–5) and distribution figures (Figures 2–4).

## 7. Numerical results / baselines
Basic Sports Understanding (Table 1): Level-1 best GPT-4o(0S,CoT) 85.35; Level-2 best Claude 3 Opus(5S,SP) 77.38; BIG-bench best Gemini 1.5 Pro(0S) 95.40. No ceiling improvement on basic tasks vs SportQA's benchmark six months prior. Advanced Scenario Analysis (Table 2): best single-hop GPT-4o(0S,CoT) 79.37 (easy) / 73.17 (hard); best multi-hop GPT-4(5S,CoT) 44.49 (easy) / GPT-4o(5S,CoT) 29.11 (hard) vs human 96.63/96.02/94.90/91.84. Progress +4.5%/+7.0%/+10%/+7% over six months on easy/hard single/multi-hop; best configurations on all four subtasks used CoT. GPT-4o better at single-hop, GPT-4 better at multi-hop. Video-based (Table 3): task-specific Auto-Focus Transformer baseline 59.2/59.1 overall vs VLMs 19.28–31.52 overall; GPT-4 judge scores 1.49–1.92/5 — VLMs far behind the specialized model, especially Temporal (8.82–16.23) and Counterfactual questions. Error distribution: Advanced scenario errors dominated by "Context and Nuances Confused"; video errors dominated by "Lack of Domain Knowledge".

## 8. Code / data availability
No new code or data released; benchmark reuses public datasets (SportQA, BIG-bench, Sports-QA).

## 9. Leakage & limitations
Stated: could not evaluate larger VLMs (e.g. PLLaVA-34B) due to compute limits; GPT-4-as-judge is a proxy metric; potential train-test contamination acknowledged for LiveQA-style broadcast questions (reason it was excluded). Added: evaluation is API-snapshot dependent (models have since changed); error taxonomy from only 40 samples per task; the benchmark inherits SportQA's question-quality ceiling rather than auditing it.

## 10. GSE overlap
Companion to ledger 1486 (SportQA): this paper evaluates models ON SportQA rather than introducing it — no duplication, different contribution. First model-evaluation harness paper in the NLP lane of the corpus.

## 11. GSE implementation spec
- Prompting standard: require zero-shot or few-shot CoT on every GSE LLM call that does multi-step sports reasoning (rule application, scenario analysis, matchup write-ups) — the paper shows CoT in all four best advanced configurations.
- QA checklist from the error taxonomy: every LLM-generated sports content piece gets checked against the four text error classes — (A) domain-knowledge errors (rules/terms/tactics), (B) inaccurate recall (facts/details), (C) context/nuance confusion, (D) reasoning errors. For video/clip work, check number recognition, action recognition, domain terminology.
- Human-in-the-loop gate: hard multi-hop scenario reasoning tops out near 29% vs 92% human — any GSE pipeline step requiring chained sports reasoning (e.g. "given these injuries and weather, how does the game script change") must be human-verified or decomposed into single-hop checks.
- Video: do not use general VLMs for play/action recognition from clips; task-specific models (AFT-style) outperform them 2–3×. GSE clip analysis should use specialized detectors, with VLMs only for captioning.
- Reuse the three-subtask harness (basic / advanced-scenario / video) to regression-test any model upgrade in GSE's content pipeline before it touches published copy.

## 12. Reproducible test
- Sample 100 SportQA Level-3 hard multi-hop questions; run GSE's current LLM pipeline with and without CoT; pass if CoT ≥ non-CoT accuracy and errors concentrate in class C (nuance) rather than class A (knowledge) — matching the paper's distribution signature.
- Run the video-QA harness on 50 Sports-QA clips with GSE's VLM stack; fail the stack for action recognition if overall accuracy < 50 (below the AFT baseline of ~59).

## 13. Acceptance / rejection gate
ADAPT. Not a method to adopt but the evaluation discipline GSE's NLP lane was missing: a concrete error taxonomy, a prompting standard with measured gains, and a quantified human-gap that justifies human review on chained sports reasoning.

## 14. Improvement experiment
Beyond the paper: build an *NFL-live* scenario benchmark the paper never attempts — auto-generate multi-hop questions from recent game logs (play-by-play win-probability swings plus situational context: down, distance, clock, score), testing exactly the failure modes the paper's error analysis found (nuance confusion, reasoning errors) on events no model can have memorized. If the hard-multi-hop gap between models persists on freshly generated games (not static trivia), the benchmark becomes a contamination-proof regression test for GSE's content pipeline — something neither SportQA nor this paper's benchmark provides.
