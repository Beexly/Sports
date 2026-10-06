# 1716 AskSport: Web application for sports question-answering (arXiv:2503.21067v1)

**Citation:** Enzo Baraldi de Onofre, Maria Camila N. Barioni, Caio C. C. R. dos Santos (2025). *AskSport: Web Application for Sports Question-Answering*. arXiv:2503.21067v1. URL: https://arxiv.org/abs/2503.21067v1
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, all sections and references).
**Verdict:** ADAPT — the provenance-first QA pattern (BM25 retrieval → extractive reader → answer + confidence + source title + source URL) is exactly the shape GSE's research copilot should take, but the paper's evaluation is three qualitative examples with zero benchmarks, so adapt the interface contract and build GSE's own evaluation, never cite its "results."

## 1. Research question

Can a simple, transparent retrieve-and-read pipeline answer sports questions well enough to be useful as a web application? The paper asks whether combining BM25 retrieval over a curated sports corpus (QASports) with a RoBERTa extractive reader produces a usable sports QA demo, with emphasis on the user-facing contract: every answer ships with a confidence score, the source document title, and the source URL so the user can verify it.

## 2. Dataset / schema

- QASports corpus: JSON/CSV resources with (context, question, answer) triples across soccer, American football, and basketball. The deployed app uses the basketball subset only.
- No training of new models: the reader is a pre-trained RoBERTa QA model; the retriever is BM25 over the QASports document set.
- Three qualitative demo questions (Rookie of the Year, Warriors titles, best player) with reported answer confidences.

## 3. Method / model

- Pipeline: (1) BM25 retrieves the top-10 QASports documents for the user's question; (2) a RoBERTa extractive reader scores answer spans in each retrieved document and returns the top-3 answers; (3) the UI presents each answer with its confidence, the source document title, and the source URL.
- Implementation: Haystack (retriever + reader), Python 3.10, Streamlit frontend, HuggingFace model hub for RoBERTa.
- No fine-tuning, no reranking, no query expansion, no multi-hop reasoning — deliberately a thin baseline.

## 4. Equations & assumptions

- BM25 scoring as implemented in Haystack (standard Robertson–Spärck Jones formulation); no custom ranking math.
- Reader confidence = softmax over start/end span logits; the paper treats these as displayable confidences without any calibration analysis.
- Assumption: the answer to any asked question exists as a contiguous span in one of the top-10 retrieved documents (single-hop extractive QA assumption). Questions requiring synthesis across documents or arithmetic are out of scope by construction.

## 5. Features / target

- Input: free-text sports question.
- Output: top-3 answer spans, each with (confidence, source title, source URL).
- Example outputs: "Who won Rookie of the Year?" confidences 0.7945 / 0.7198 / 0.6899; "How many titles have the Warriors won?" 0.7897 / 0.7677 / 0.6377; "Who is the best basketball player?" 0.7978 / 0.7108 / 0.6684.

## 6. Validation design

- No systematic benchmark. Evaluation consists of three hand-picked example questions with their returned answers and confidences. No EM/F1 on a held-out QA set, no retrieval recall measurement, no latency numbers, no user study.

## 7. Numerical results / baselines

- None beyond the three examples: confidences in the 0.64–0.80 range for all three demo questions, including the subjective "best player" question (0.7978 top confidence) where no correct answer exists — a quiet warning that the displayed confidences are uncalibrated.
- No baseline comparison of any kind.

## 8. Code / data availability

- Built on public components (Haystack, Streamlit, HuggingFace RoBERTa, QASports dataset). The paper describes the app but the ledger found no repository link in the text; the components are all reproducible from public sources.

## 9. Leakage & limitations

- **No evaluation** is the central limitation: three cherry-picked examples cannot support any claim about QA quality.
- Displayed confidences are raw softmax values with no calibration; the 0.7978 confidence on an unanswerable opinion question ("best player") demonstrates they should not be shown to users as reliability signals.
- BM25-only retrieval with no reranker will miss paraphrased questions; the single-hop extractive assumption fails on the multi-hop and aggregation questions GSE users actually ask ("how did injuries affect the Chiefs' second-half ATS record?").
- Basketball-only deployment despite the corpus covering three sports; American football coverage (GSE's core) is not demonstrated.

## 10. GSE overlap

- GSE needs a research copilot / QA surface over its corpus (research docs, NGS metrics, injury reports, market data). The paper's answer-plus-provenance contract (confidence + source title + source URL) is the right interface shape and matches GSE's "show your work" doctrine.
- The 2601.00216 ledger (SR-RAG) in this same wave covers the heavyweight retrieval machinery; AskSport covers the thin, transparent UI contract. They compose: SR-RAG-grade retrieval underneath, AskSport-grade provenance display on top.
- Dedup clean: no QA-app paper in the 1,093-ID set.

## 11. GSE implementation spec

- Build `gse/copilot/` as a retrieve-and-read service over GSE's research corpus: (1) hybrid retriever (BM25 + dense) over docs/research, NGS glossary, and injury-report archive, with a cross-encoder reranker on top-50 → top-10; (2) reader: extractive span model for factoid questions, with a documented fallback to "no single-span answer — synthesizing" for multi-hop questions; (3) UI contract per answer: answer text, calibrated confidence (temperature-scaled on a held-out QA set, not raw softmax), source title, source URL/anchor, and retrieval rank. Unanswerable questions must return "not found in corpus" rather than a confident guess — the paper's failure mode.
- Add an abstention path: if top-1 retrieval score is below a tuned threshold, the copilot says so instead of answering.

## 12. Reproducible test

- Build a 200-question GSE QA eval set (factoid + multi-hop + unanswerable, drawn from the research corpus with human-verified answers); success criteria: EM ≥ 0.70 on factoid, abstention rate ≥ 80% on unanswerable with ≤ 10% false abstention on answerable, and calibration error (ECE) ≤ 0.10 on displayed confidences. The paper's three examples are replaced entirely by this eval.

## 13. Acceptance / rejection gate

ADAPT the interface contract only — answer + calibrated confidence + source title + source URL + explicit abstention. Nothing in the paper's "results" is usable (n=3 examples). ADAPT proceeds if the reproducible test above passes on GSE's corpus; REJECT the raw-softmax confidence display unconditionally (the paper's 0.7978-on-opinion-question example is disqualifying evidence); REJECT BM25-only retrieval for GSE's multi-hop workload if hybrid+rerank does not beat it by ≥ 5 pp EM on the eval set.

## 14. Improvement experiment

Go beyond the paper where it is weakest — calibration and abstention. (1) Temperature-scale the reader's span confidences on the 200-question eval and plot reliability diagrams before/after; the paper displays raw softmaxes, so a calibrated-confidence comparison is a direct, publishable improvement. (2) Add a retrieval-confidence gate: measure the joint calibration of (retrieval score × reader confidence) as the displayed number, and test whether it predicts correctness better than reader confidence alone — the paper never considers that a confident span in a bad document is still a bad answer. (3) Run the abstention experiment the paper omits: inject 50 unanswerable questions and compare "answer anyway" (paper behavior) vs threshold-abstain on user trust ratings; this converts the paper's demo into a deployable product decision.
