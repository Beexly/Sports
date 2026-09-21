# [1478] Large Language Models in Sport Science & Medicine: Opportunities, Risks and Considerations (arXiv:2305.03851v1)

**Citation:** Mark Connor, Michael O'Neill (2023). *Large Language Models in Sport Science & Medicine: Opportunities, Risks and Considerations*. arXiv:2305.03851v1. URL: https://arxiv.org/abs/2305.03851
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf; main text + supplementary ChatGPT/BARD transcripts read in full).
**Verdict:** REJECT
**Verdict rationale:** perspective/opinion paper on clinical sports-medicine LLM use; contains no method, no dataset, no experiment, no equation, and no numerical result to adapt; domain (practitioner diagnosis, training-program generation) has no path to sports prediction, fantasy, or calibration.

## 1. Research question
What are the opportunities, risks, and considerations of using LLMs in sports science and medicine? (A survey/perspective question, not an empirical one.)

## 2. Dataset / schema
No dataset. Evidence consists of ad-hoc ChatGPT/BARD prompt transcripts (reproduced in the supplementary material): heat-acclimation physiology Q&A, a 4-week lower-limb injury-prevention program prompt, and jailbreak probes about performance-enhancing drugs.

## 3. Method / model
No method proposed. The paper speculates that a ChatDoctor-style model ([4] in refs) could be fine-tuned on EMRs, clinical notes, and sports-science literature, and includes a conceptual workflow diagram (Fig. 1.0: initial prompt + expert knowledge database → augmented prompt → LLM) — i.e., a standard RAG sketch with no implementation or evaluation.

## 4. Equations & assumptions
No equations stated. Assumptions are informal (LLMs will keep improving; fine-tuning on domain data yields useful assistants).

## 5. Features / target
Not applicable — no model trained, no target defined.

## 6. Validation design
None. No experiment, no baseline, no metric.

## 7. Numerical results / baselines
None. Claims are qualitative ("the model returned a reasonable response", "generally more difficult to extract").

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Not applicable as an empirical matter; as a perspective, its limitations are: zero empirical grounding, anecdotal prompting (n=2 models, handful of prompts), no comparison of any kind, and conclusions ("further research is needed") that are unfalsifiable.

## 10. GSE overlap
Existing-research-map check: no overlap because there is nothing to overlap with — but also nothing to gain. The one transferable sketch (RAG over an expert knowledge base) is already mandated in GSE's TASK-012 Kit AI Receptionist spec ("answers only from the per-client knowledge base, never invents"), which is stricter and more concrete than this paper. The hallucination/jailbreak risk catalog is generic LLM-safety knowledge, not a research contribution.

## 11. GSE implementation spec
Not applicable — nothing to implement.

## 12. Reproducible test
Not applicable — nothing to test.

## 13. Acceptance / rejection gate
Rejected at the gate: a paper with no method, data, or results cannot clear any numeric bar for prediction/fantasy/calibration value.

## 14. Improvement experiment
Not applicable.

**Rejection rationale (for the record):** GSE's standard is papers ACTIVE AND WORTH ADAPTING. This paper is a 2023-era opinion piece in the sports-medicine practitioner domain. Even its most relevant idea (RAG for domain assistants) is already specified more rigorously in GSE's own build specs. Replaced per the replace-on-reject rule.
