# 0263 Computational Intelligence in Sports: A Systematic Literature Review (arXiv:1810.12850v1)

**Citation:** Robson P. Bonidia et al. (2018). *Computational Intelligence in Sports: A Systematic Literature Review*. arXiv:1810.12850v1. URL: https://arxiv.org/abs/1810.12850v1
**Ledger completed:** 2026-09-21. **Read:** full text (local extract, 875 lines, including references).
**Verdict:** REJECT — a dated (2010–2018 window), shallow systematic review whose taxonomy is superseded by GSE's own 2026 research corpus; useful at most as a historical snapshot, not as methodology.

## 1. Research question

The paper conducts a systematic literature review of computational-intelligence methods applied to sports: which CI techniques (classification, clustering, heuristics, association, regression) have been used, on which sports problems (result prediction, training planning, decision support, strategy, motion analysis, etc.), with what datasets and algorithms, over the 2010–2018 window. It asks what the field's distribution of effort looks like and where the gaps are — a mapping study, not an empirical contribution.

## 2. Dataset / schema

- **Corpus construction:** database searches returned ACM 493 + IEEE 517 + ScienceDirect 72 + Semantic Scholar 500 = 1,582 titles. 410 pre-2010 titles rejected; 1,172 reviewed by title/keywords/abstract; 1,136 rejected; 36 passed to quality review; 5 rejected at quality review; **31 papers included**.
- **Window:** 2010–2018. Peak years 2014 and 2016 with 6 papers each.
- **Schema (per included paper):** sport, CI technique category, specific algorithm, dataset used, sports problem addressed.
- **Access:** the review protocol is described; the included-paper list and extracted data tables are in the paper, but no machine-readable artifact or search-query dump is provided. Reproducibility of the SLR itself is weak (Semantic Scholar's 500-title cap, unstated exact queries).

## 3. Method / model

Standard SLR protocol: define search strings and databases, apply inclusion/exclusion criteria (date window 2010–2018, CI methods in sports), screen title → keywords → abstract, quality-review the survivors, then tabulate by technique category and application topic. No model is trained; the "method" is the review procedure. Categories used: classification, clustering, heuristics (metaheuristics), association rules, regression.

## 4. Equations & assumptions

One equation is stated in the paper, quoted faithfully:

- Bayes' theorem: P(H|E) = P(E|H)·P(H) / P(E) (presented in the context of Bayesian classifiers used in the reviewed literature).

No other mathematics. Assumptions of the review: the five databases plus Semantic Scholar adequately cover the field; the 2010–2018 window is representative; title/keyword/abstract screening does not systematically miss relevant work; the 31 included papers are a fair sample of CI-in-sports research.

## 5. Features / target

Not a modeling paper. The "inputs" are the 1,582 retrieved titles and the screening criteria; the "outputs" are descriptive statistics: technique distribution (classification 51.28%, clustering 17.95%, heuristics 15.39%, association 12.82%, regression 2.56%) and topic distribution (predicting results/patterns 9; training planning 6; decision support 4; strategic planning 3; sports data analytics 3; motion analysis 2; performance evaluation 2; sports data capture 1; eating plans 1). No prediction target.

## 6. Validation design

No train/test or empirical validation — this is a literature survey. Its internal validity rests on the SLR protocol: multi-database search, staged screening, quality review. Threats the authors do not quantify: inter-rater reliability of screening decisions, sensitivity to the exact search strings, and the Semantic Scholar 500-result truncation.

## 7. Numerical results / baselines

Descriptive counts, quoted exactly: 1,582 titles retrieved (ACM 493, IEEE 517, ScienceDirect 72, Semantic Scholar 500); 410 rejected as pre-2010; 1,172 reviewed; 1,136 rejected at title/keyword/abstract; 36 quality-reviewed; 5 rejected; 31 included. Window 2010–2018; 2014 and 2016 peak years with 6 papers each. Technique shares: classification 51.28%, clustering 17.95%, heuristics 15.39%, association 12.82%, regression 2.56%. Topic counts: predicting results/patterns 9, training planning 6, decision support 4, strategic planning 3, sports data analytics 3, motion analysis 2, performance evaluation 2, sports data capture 1, eating plans 1. These are the paper's claims about the literature, not empirical results.

## 8. Code / data availability

None stated. No repository, no extracted-data spreadsheet, no search-query log. The included studies' datasets and algorithms are catalogued in the paper's tables but not linked as artifacts.

## 9. Leakage & limitations

- **Dated window.** 2010–2018 misses the entire modern era: deep learning for sports, transformers, tracking-data analytics (NGS launched 2016 but matured after 2018), and the last eight years of literature. As a map of the field it is obsolete.
- **Shallow extraction.** The review tabulates technique names and topics but does not compare results, datasets, or effect sizes — it cannot tell a practitioner which method works.
- **Weak search reproducibility.** Exact search strings are not given in the extract; Semantic Scholar's 500-result cap introduces an undocumented truncation bias; single-reviewer screening is not ruled out.
- **Category coarseness.** "Classification 51.28%" lumps logistic regression with random forests and neural nets — the taxonomy is too coarse to guide any engineering choice.
- **Small final set.** 31 papers from 1,582 titles is a steep funnel; the screening criteria likely excluded relevant applied work (e.g., industry papers not indexed in ACM/IEEE).
- **No NFL specificity.** The included sports skew toward the review's retrieval, with no guarantee of football coverage.

## 10. GSE overlap

**Duplicate (and superseded).** The existing-research map shows GSE's corpus is vastly deeper and newer than this review: the 2026-09-18 ML research brief commissions 15 current areas (tabular learners, hierarchical pooling, representation learning, state-space models, conformal uncertainty, causal inference, multimodal fusion, etc.); 57 Drive dossiers plus 7 repo-covered papers were read in depth; the map inventories modern methods (TFT, diffusion, GNNs, TabTransformer, conformal prediction) that postdate this review entirely. Everything this 2018 taxonomy could teach — "classification is popular for result prediction" — is already assumed knowledge in GSE's program. There is no method, dataset, or gap in this paper that the current corpus does not cover better.

## 11. GSE implementation spec

No implementation. If a literature-mapping artifact were ever needed, the correct approach would be a fresh automated sweep over 2018–2026 (the program's own 500-paper sweep is exactly this), not this paper's tables.

## 12. Reproducible test

Not applicable — there is no empirical claim to test. The review's descriptive statistics (technique shares, topic counts) are about a 2010–2018 corpus and cannot be "beaten" by a baseline.

## 13. Acceptance / rejection gate

REJECT as a research input. It fails the recency gate (window ends 2018), the depth gate (no comparative results extracted), and the novelty gate (fully superseded by GSE's own 2026 corpus and the in-flight 500-paper sweep). Retain only as a citation for "what the field looked like pre-2019" if a historical framing is ever needed.

## 14. Improvement experiment

The experiment this paper should have been: a **living, automated SLR** — re-run the search protocol programmatically (OpenAlex/arXiv APIs), extract per-paper method/result/effect-size triples with an LLM pipeline, and publish the technique×topic matrix as a versioned dashboard updated quarterly. That is, in effect, what GSE's 500-paper deep-research program already is; the improvement is to make the sweep itself the continuously updated review rather than a one-off 2018 snapshot.
