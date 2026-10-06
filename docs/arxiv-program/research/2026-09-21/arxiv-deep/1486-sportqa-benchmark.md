# [1486] SportQA: A Benchmark for Sports Understanding in Large Language Models (arXiv:2402.15862v2)

**Citation:** Haotian Xia, Zhengbang Yang, Yuqing Wang, Rhys Tracy, Yun Zhao, Dongdong Huang, Zezhi Chen, Yan Zhu, Yuan-fang Wang, Weining Shen (2024). *SportQA: A Benchmark for Sports Understanding in Large Language Models*. arXiv:2402.15862v2. URL: https://arxiv.org/abs/2402.15862
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv v2, 18 Jun 2024 — abstract through Appendix D, tables 2–14, figures 2–5).
**Verdict:** ADAPT
adopt the benchmark as an LLM-selection/QA harness for GSE's sports-content pipeline (NFL-relevant subset + sportscopy QA extension), not the paper's full academic protocol.

## 1. Research question
Can existing LLMs genuinely understand sports — beyond fact recall into rules/tactics and scenario-based reasoning — and can a purpose-built benchmark measure the gap between models and human experts? The authors build SportQA (70,592 multiple-choice / multiple-select questions across three difficulty levels) and use it to compare Llama2-13b-chat, PaLM2 (bison-chat), GPT-3.5-turbo, and GPT-4 under few-shot standard prompting and chain-of-thought prompting.

## 2. Dataset / schema
- **SportQA benchmark**: 70,592 questions total.
  - Level-1 (Foundational Sports Knowledge): 21,385 MC questions with one correct answer (2-way or 4-way), aggregated/normalized from Trivia QA, QUASAR, Hotpot QA, KQA Pro, BoolQ; distractor generation via automated semantic templates (sport → other sports; time → adjacent periods; location → nearby locations; person → per-sport name library) plus manual refinement.
  - Level-2 (Rules and Tactics Comprehension): 45,685 questions, 4-way MC, covering 35 sports (28 Olympic + 4 Paris-2024 debut sports + baseball/ice hockey/American football), built from Wikipedia rules/tactics/history content via template + manual question generation and sport-specific distractor libraries.
  - Level-3 (Scenario-Based): 3,522 questions across 6 sports (football/soccer, basketball, volleyball, tennis, table tennis, American football), "multiple select" format (1–4 correct answers out of options), split into easy/hard × single-hop/multi-hop tasks (24 tasks total: 6 sports × 4), manually authored by sports experts (coaches proposed assessment angles).
- **Quality verification**: 36 intercollegiate student-athletes (US + China), each with ≥8 years sports training, interviewed and trained before annotating; level-3 sampled 980 questions for model eval; level-1 sampled 2,000 test questions; level-2 sampled 2,243 via tiered rates (30% of sports with <200 Qs, 15% for 200–800, 5% for 800–1500, 2.5% for 2500–10,000, 1.5% for >10,000).
- **Human baselines**: student-athletes outside the review team answered level-3 test sets as the expert upper bound.
- Access: public. Dataset at https://github.com/haotianxia/SportQA (stated in abstract). Schema: JSONL QA records with question, options, answer(s), level, sport, task tags (per Table 1 and Appendix A).

## 3. Method / model
Not a model paper — a benchmark + evaluation study. Evaluation protocol: temperature 0; 5-shot exemplars drawn from the dev set with expert-annotated CoT traces; three prompting conditions per model: 0-shot CoT ("Let's think step by step"), 5-shot standard prompting (SP), 5-shot CoT. Metric: accuracy everywhere; "holistic accuracy" for level-3 multi-hop (whole question wrong if any sub-question wrong). Error analysis: 20 incorrectly-answered instances per level manually reviewed against model-generated explanations, categorized into error taxonomies (L1/L2: Deficiency in Conceptual Understanding, Misuse of Known Information, Inaccuracies in Factual Recall; L3: Conceptual Misunderstanding, Logical Reasoning Error, Contextual Misinterpretation).

## 4. Equations & assumptions
No equations stated. Key assumptions: (1) MC/multiple-select accuracy proxies "sports understanding"; (2) 5-shot exemplars with expert CoT traces are representative; (3) the tiered sampling fractions for L2/L3 are representative of the full benchmark; (4) student-athlete answers define expert-level performance; (5) models' self-explanations faithfully reveal error causes (error analysis rests on prompted rationales).

## 5. Features / target
Not applicable as a prediction paper (benchmark study). Inputs: questions + few-shot exemplars. Target: option selection (single correct MC at L1/L2; 1–4 correct multiple-select at L3).

## 6. Validation design
No train/validation split of a model — the benchmark itself is the fixed test instrument. Model comparison is within-benchmark (same sampled questions per level across all models and prompting conditions). Baselines compared: Llama2-13b-chat, PaLM2 bison-chat, GPT-3.5-turbo, GPT-4, plus human expert upper bounds on level-3. 5-shot dev exemplars held out from test samples.

## 7. Numerical results / baselines
Quoted exactly from Table 2 (accuracy %):
- GPT-4(0S,CoT): L1 80.60, L2 69.01, L3-easy-single-hop 67.07, L3-hard-single-hop 55.10, L3-easy-multi-hop 32.00, L3-hard-multi-hop 22.59.
- GPT-4(5S,SP): L1 80.24, L2 77.17, L3: 70.73 / 63.27 / 33.60 / 24.69.
- GPT-4(5S,CoT): L1 85.63, L2 78.82, L3: 73.58 / 64.08 / 34.40 / 23.01.
- Abstract reports GPT-4 averages: L1 82.16%, L2 75%, L3 47.14%.
- GPT-3.5(5S,SP): L1 74.74, L2 68.07; L3: 45.52 / 36.73 / 25.20 / 19.24.
- PaLM2(5S,SP): L1 64.85, L2 56.62; L3: 49.19 / 49.80 / 29.20 / 16.74.
- Llama2-13b(5S,CoT): L1 48.65, L2 51.54; L3: 26.72 / 32.38 / 9.20 / 8.79.
- Human (L3): 96.63 / 96.02 / 94.90 / 91.84.
- Error analysis: in L1/L2, "deficiency in conceptual understanding" was the most frequent error, 40% of mistakes. In L3, 82.5% of incorrect questions showed "inadequacy in multifaceted answer identification"; conceptual misunderstanding = 55% of single-hop and 50% of multi-hop errors.
- Paper's headline: GPT-4 leads every level and prompting mode, >15% ahead of other models on average, but lags human experts by roughly 30%–65% across L3 tasks.

## 8. Code / data availability
Dataset: https://github.com/haotianxia/SportQA (abstract; GitHub link). No model-training code (none needed — evaluation scripts implied, not linked in the text I read). No equations or model weights involved.

## 9. Leakage & limitations
- Evaluation-time data contamination: the benchmark's L1/L2 questions derive from public Wikipedia/TriviaQA/QUASAR/HotpotQA/KQA Pro/BoolQ text that was in the training corpora of every evaluated model — reported L1/L2 accuracies likely overstate true capability (the paper does not test a contamination-free subset).
- Models evaluated are 2023-vintage (GPT-4, GPT-3.5-turbo, PaLM2 bison, Llama2-13b); numbers do not transfer to 2026-era models GSE would actually use.
- Tiered sampling (e.g., 1.5% of >10,000-question sports) is coarse; reported per-level scores rest on 2,000 / 2,243 / 980 sampled questions, not the full 70,592.
- Level-3 covers only 6 sports; no NFL-specific deep scenarios beyond American-football basics; nothing about betting markets, fantasy scoring, calibration, or predictive reasoning — the GSE-relevant question types are absent.
- Stated by authors: budgetary constraints excluded Llama2-70b; sports-medicine/psychology not covered; error taxonomy built from models' own prompted explanations (faithfulness assumed).
- External validity to NFL: indirect only — it measures general sports-QA ability, not predictive accuracy.

## 10. GSE overlap
GSE does not currently run its own LLM eval harness. Per ~/workspace/arxiv-sweep/existing-research-map.md, the NLP/sports-QA corner of Garrett's corpus is thin (benchmark dossiers cover X analyst accounts and metrics, not LLM capability measurement). Adjacent: the kit-lane and X-content ops rely on LLMs for copy (replies, articles, video scripts) — the 2026-09-10 copy doctrine and x-poster skill (voice-locked drafts, 9.2 quality gate) exist, but there is no systematic test of which model actually reasons about sports best. This paper is a NEW capability: a sports-understanding benchmark for model selection — extension, not duplicate.

## 11. GSE implementation spec
1. Clone SportQA (public GitHub), extract the American-football L2/L3 subsets + all scenario-style L3 questions (all 6 sports, for generalization signal).
2. Build a GSE eval harness (Python, ~/workspace/gse-discovery/ or a new `llm-eval/` dir): run candidate models (the ones GSE actually uses for content: GPT-series, Gemini, Llama, Nemotron via NVIDIA NIM) at temperature 0, 5-shot SP + 5-shot CoT with the repo's dev exemplars; score accuracy by level.
3. Write ~200 GSE-specific questions in the L3 multiple-select style targeting what the benchmark lacks: NFL rules edge cases (e.g., overtime rules, catch rule, penalty enforcement spots), fantasy scoring implications (PPR edge cases, stat corrections), and pick-rationale QA ("why does line move X given injury Y?") — have these reviewed by the same bar (domain expert, not intercollegiate athletes).
4. Use the harness as the gate for any LLM swap in the x-poster/kit content pipeline: a model must clear ≥ the incumbent's SportQA-football accuracy before it drafts public copy.
5. Effort: ~2–3 days for the harness + API costs; question authoring is the long pole (~1 week for 200 reviewed questions).

## 12. Reproducible test
Dataset: SportQA public release, filtered to American-football questions (L2 football task + L3 American-football tasks). Metric: accuracy, same prompting (5S,CoT, temp 0). Baseline to beat: paper's GPT-4(5S,CoT) figures on those subsets (approx: L2 78.82 overall; L3 football single-hop easy 73.58 / hard 64.08 as the published anchors). Test window: single run — benchmark is static, not temporal. A candidate model "passes" if it matches or beats GPT-4's L3 football numbers (the hardest, least contamination-prone subset).

## 13. Acceptance / rejection gate
ADAPT if: (a) the SportQA repo is downloadable and the football subsets extract cleanly (≥1,000 L2 + ≥200 L3 football questions parse), AND (b) at least one GSE-used model scores within 5 pp of the paper's GPT-4 L3 football numbers, confirming the harness discriminates on 2026 models. Reject (the adaptation, not the paper) if the dataset link is dead or football content is <500 questions — then fall back to the companion paper 2406.14877's instrument instead.

## 14. Improvement experiment
Beyond the paper: replace generic accuracy with a *decision-weighted* score. Sample GSE's real content decisions (which reply drafts got posted, which were held at <9.2) and test whether a model's SportQA L3 score predicts its draft-acceptance rate. If L3 accuracy correlates with draft acceptance (point-biserial r > 0.3 on ≥300 drafts), the benchmark becomes a true proxy for GSE's production gate — something the paper never tests.
