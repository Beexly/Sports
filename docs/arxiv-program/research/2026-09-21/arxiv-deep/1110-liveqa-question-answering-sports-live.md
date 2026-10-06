# [1110] LiveQA: A Question Answering Dataset over Sports Live (arXiv:2010.00526v1)

**Citation:** Qianying Liu, Sicong Jiang, Yizhong Wang, and Sujian Li (2020). *LiveQA: A Question Answering Dataset over Sports Live*. arXiv:2010.00526v1. URL: https://arxiv.org/abs/2010.00526v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — a timeline-aware sports QA dataset design (live NBA text with quiz questions requiring tracking, inference, calculation) directly reusable as GSE's event-tracking/evaluation harness; the QA models themselves are dated.

## 1. Research question
Can reading-comprehension models answer quiz questions over live sports broadcast text, where answers require tracking entities across a timeline, inference, and calculation — not just span extraction?

## 2. Dataset / schema
1,670 NBA documents/games, 1,786,616 sentences, 117,050 quizzes. Averages per document: 1,069.83 sentences, 70.09 quizzes. Evidence location: contextual 68.6%, after game 30.6%, impossible 0.8%. Question types: comparison 16.6%, calculation 25.4%, inference 28.5%, tracking 29.5%. Source: live broadcast text; not user queries.

## 3. Method / model
Dataset-construction paper plus baseline models: random (50.0%), dominant-option (56.4%), gated-attention reader (53.1%). The transferable artifact is the dataset taxonomy (comparison/calculation/inference/tracking) and the timeline-evidence design, not the reader architectures.

## 4. Equations & assumptions
Reader equations not recorded at implementation fidelity in this read ("Not stated in paper" for re-implementable detail). Assumptions: quiz questions are answerable from the live text; evidence location labels are reliable; multiple-choice format with a dominant option.

## 5. Features / target
Inputs: long live-game text stream (avg ~1,070 sentences). Target: multiple-choice quiz answer; secondary: evidence sentence location.

## 6. Validation design
Standard train/dev/test over documents (exact split not recorded — "Not stated in paper"). Baselines: random, dominant-option, gated-attention reader. No time-ordered consideration beyond game chronology.

## 7. Numerical results / baselines
Accuracy: random 50.0%, dominant-option 56.4%, gated-attention reader 53.1% — i.e., the neural reader *loses to the dominant-option heuristic*, showing how hard timeline reasoning over 1,000+ sentences is. Question-type split: comparison 16.6%, calculation 25.4%, inference 28.5%, tracking 29.5%.

## 8. Code / data availability
Code: https://github.com/PKU-TANGENT/GAReader-LiveQA. Data: https://github.com/PKU-TANGENT/LiveQA.

## 9. Leakage & limitations
Dominant-option baseline beating the neural model is a red flag about dataset bias (answer-distribution artifacts). NBA-only, broadcast-text only; NFL applicability requires re-derivation. Impossible-answer rate (0.8%) is too low to test abstention. Models are 2020-era; modern long-context LLMs would need re-benchmarking.

## 10. GSE overlap
New capability: GSE has no timeline-QA evaluation harness. Cite `~/workspace/arxiv-sweep/existing-research-map.md`. Not duplicative — complements the event-tracking work by providing an *evaluation* design.

## 11. GSE implementation spec
(a) Build "LiveQA-NFL": sample 2024 NFL games, extract play-by-play + drive text from nflverse; (b) auto-generate quiz questions in the four types (comparison/calculation/inference/tracking) with evidence-location labels; (c) evaluate GSE's game-summary/LLM pipelines on it; (d) use it as the regression test for any live-event narration product. Effort: ~1 engineer-week for the dataset builder.

## 12. Reproducible test
Dataset: 50 NFL games from 2024, 1,000 auto-generated questions. Metric: accuracy by question type vs the dominant-option baseline. Success: GSE's pipeline beats dominant-option by ≥10 points on tracking and inference questions (the LiveQA reader failed here — clearing it proves genuine timeline reasoning).

## 13. Acceptance / rejection gate
ADOPT as the standard GSE timeline-QA benchmark if a 200-question pilot shows the four question types are answerable by humans at ≥90% (validating question quality); REJECT if auto-generated questions are noisy (human accuracy <80%).

## 14. Improvement experiment
Add *counterfactual* questions ("if that 4th-down conversion had failed, who gets the ball?") requiring branching timeline reasoning — the paper's questions are all retrospective; counterfactuals test the causal game-state models GSE actually needs for live win-probability narration.
