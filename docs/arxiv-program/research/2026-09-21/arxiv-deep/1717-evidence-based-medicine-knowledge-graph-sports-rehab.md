# 1717 From evidence-based medicine to knowledge graph: retrieval-augmented generation for sports rehabilitation and a domain benchmark (arXiv:2601.00216v1)

**Citation:** Jinning Zhang, Wei Li, Chen Xu, Min Zhao (2026). *From Evidence-Based Medicine to Knowledge Graph: Retrieval-Augmented Generation for Sports Rehabilitation and a Domain Benchmark*. arXiv:2601.00216v1. URL: https://arxiv.org/abs/2601.00216v1
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, all sections, tables, and appendices).
**Verdict:** ADAPT — the evidence-tiered retrieval stack (PICO-schema GraphRAG + HyDE + ColBERT/BGE rerank + evidence-grade pools + Bradley–Terry BETR reranker) is the most directly transferable architecture in this wave for GSE's injury-news pipeline, but it is a clinical-rehab system on a private corpus with a brand-new benchmark, so adapt the ranking machinery and source-tiering discipline to GSE's public injury-report corpus rather than adopt any artifact.

## 1. Research question

Can retrieval-augmented generation be made trustworthy for sports rehabilitation QA — a domain where wrong answers can harm — by structuring retrieval around evidence-based-medicine principles? The paper asks whether a pipeline that (a) organizes knowledge as a PICO-schema graph, (b) keeps separate retrieval pools by evidence grade (A–E), and (c) reranks with a Bradley–Terry model that respects evidence grades, outperforms naive RAG and existing GraphRAG systems on a new 1,637-question sports-rehab benchmark.

## 2. Dataset / schema

- Corpus: PubMed, Embase, and authoritative rehabilitation-organization sources; 21 rehabilitation conditions; evidence grades A (strongest) through E.
- Knowledge graph: 357,844 nodes, 371,226 edges, of which 44,033 are PICO-aligned medical nodes (Population, Intervention, Comparison, Outcome schema).
- Benchmark: 1,637 QA pairs; 983 train / 327 validation / 327 test.
- Human evaluation: 5 clinicians rating 20 questions on 1–5 scales; human-verified subset n=80 used to confirm system rankings.

## 3. Method / model

- SR-RAG pipeline: (1) PICO-schema GraphRAG — retrieve from the KG by matching the question's PICO structure; (2) PICO-guided HyDE — generate a hypothetical answer structured by PICO and use it as a dense retrieval query; (3) ColBERT + BGE reranking of candidates; (4) separate evidence-grade pools — retrieval runs independently within each grade A–E so weak evidence cannot drown out strong evidence; (5) BETR reranker — a Bradley–Terry pairwise ranker P(d+ ≻ d−|q) = σ(aΔs + u_{t+} − u_{t−}) with monotone grade-bias terms and MAP priors, learning to prefer higher-grade evidence.
- Generator: DeepSeek-V3 (also tested with other backbones), conditioned on the reranked evidence.

## 4. Equations & assumptions

- BETR: P(d+ ≻ d− | q) = σ(a·Δs + u_{t+} − u_{t−}), where Δs is the base relevance-score gap, u_{t} are learned grade-bias terms constrained to be monotone in evidence grade (u_A ≥ u_B ≥ … ≥ u_E), and MAP priors regularize the biases. Trained on pairwise human preference labels over retrieved documents.
- Metrics: Recall@10; nugget coverage (fraction of gold answer nuggets present); faithfulness (fraction of generated claims supported by retrieved evidence); semantic similarity; PICOT match (whether the answer addresses the question's PICO elements).
- Assumption: evidence grades assigned to sources are correct and stable; PICO parsing of questions is reliable; pairwise preference labels generalize to the test distribution.

## 5. Features / target

- Input: natural-language sports-rehabilitation question.
- Retrieval target: ranked list of evidence documents with grade labels.
- Generation target: answer with inline evidence, evaluated on the five metrics above.
- Key learned parameters: BETR grade biases u_A…u_E and the relevance-scale a.

## 6. Validation design

- 983/327/327 train/val/test split of the 1,637 QA pairs.
- Baselines: naive RAG, Youtu-GraphRAG, Med-R2, plus ablations of the ranking stack (semantic-only, heuristic grade weighting, full BETR).
- Human verification: 5 clinicians scored 20 questions (4.66–4.84/5 across systems on the top system); an n=80 human-verified subset confirmed the automatic ranking (system order preserved).

## 7. Numerical results / baselines

- DeepSeek-V3 + SR-RAG (test): R@10 0.812; nugget coverage 0.830; faithfulness 0.819; semantic similarity 0.882; PICOT match 0.788.
- Baselines: naive RAG 0.643 / 0.718 / 0.769 / 0.841 / 0.582; Youtu-GraphRAG 0.741 / 0.773 / 0.798 / 0.868 / 0.659; Med-R2 0.724 / 0.758 / 0.803 / 0.861 / 0.678. SR-RAG leads on every metric.
- Ranking ablation (quality metric reported as 3.51 / 0.473 / 0.847 / 0.641 for BETR vs 3.18 / 0.362 / 0.781 / 0.523 semantic-only vs 3.34 / 0.418 / 0.814 / 0.586 heuristic): full BETR wins on all four.
- Human-verified n=80: SR-RAG PMhv 0.762 vs Med-R2 0.649 — ranking preserved under human judgment.
- Clinician ratings of the top system: 4.66–4.84/5 across the 20 questions.

## 8. Code / data availability

- The paper presents a new benchmark and a large KG; the ledger found no public code repository or dataset download link in the text. The underlying corpus (PubMed/Embase) is public but the PICO annotations, grade labels, and QA pairs are not released. Treat as non-reproducible from artifacts; reproducible from method description only.

## 9. Leakage & limitations

- Benchmark is brand-new and author-constructed; the 1,637 QA pairs were written by the same team that built the system, which risks benchmark-system co-adaptation (questions shaped, consciously or not, to the pipeline's strengths).
- Evidence grades are assigned by the authors' pipeline, not by an independent guideline body; the monotone-bias constraint then bakes those assignments into the ranker — grade-label errors propagate silently.
- Human evaluation is thin: 5 clinicians, 20 questions; the n=80 verification subset is better but still small.
- Clinical-rehab domain: the PICO schema and grade-A–E discipline transfer conceptually to injury news, but no sports-news or betting-domain evaluation exists.
- No latency/cost analysis of the five-stage pipeline (GraphRAG + HyDE + ColBERT + BGE + BETR + DeepSeek-V3) — production cost is unaddressed.

## 10. GSE overlap

- This is the closest paper in the wave to GSE's injury-report parsing lane: it solves "retrieve trustworthy domain evidence and generate faithful answers" with explicit source tiering. GSE's injury-news pipeline needs exactly this: official injury reports (grade A) vs beat-writer reports (grade B) vs aggregator rumors (grade C) vs social speculation (grade D).
- Complements ledger 1716 (AskSport): 1716 gives the UI contract, 1717 gives the retrieval/ranking engine.
- Dedup clean against the 1,093-ID set; no evidence-graded RAG paper in the corpus.

## 11. GSE implementation spec

- Build `gse/injury/evidence_rag.py`: (1) define GSE evidence tiers — T1: official team/league injury reports; T2: beat writers with track records; T3: national reporters/aggregators; T4: social/unverified — the direct analog of grades A–E; (2) separate retrieval pools per tier over the injury-news archive (a T4 rumor can never outrank a T1 report on relevance alone); (3) HyDE-style query expansion using an injury-schema (player, body part, mechanism, status, timeline) as GSE's PICO; (4) train a BETR-style pairwise reranker on GSE analyst preference labels with monotone tier biases; (5) generation with faithfulness constraint — every factual claim in an injury summary must cite a retrieved source, and T1 sources outrank on conflicts.
- Log the tier of every cited source in the output so downstream consumers (props models, content) can weight accordingly.

## 12. Reproducible test

- Assemble a 300-question injury-QA eval from 2024–2025 NFL injury news with analyst-verified answers and gold source tiers; run naive RAG vs tiered-pools + BETR-rerank; success criteria: faithfulness ≥ 0.80, R@10 ≥ 0.75, and ≥ 90% of answers to conflict questions (T1 vs T4 disagree) siding with the T1 source. Also replicate the paper's ranking ablation (semantic-only vs heuristic tier weight vs learned BETR) to confirm the learned biases earn their complexity.

## 13. Acceptance / rejection gate

ADAPT the architecture (tiered pools + schema-guided HyDE + monotone-bias pairwise reranker + faithfulness metric), not the paper's artifacts (no code/data released; benchmark is self-built). ADAPT proceeds if the reproducible test meets the faithfulness and conflict-resolution criteria on GSE's injury corpus; REJECT the learned BETR tier biases if the heuristic tier weighting matches them within 2 pp on faithfulness — the paper's own ablation shows heuristic gets most of the way there (0.814 vs 0.847), and the simpler version is cheaper to maintain; REJECT the full five-stage pipeline if end-to-end latency exceeds GSE's news-ingestion SLA, in which case keep tiered pools + heuristic weighting only.

## 14. Improvement experiment

Go beyond the paper on its two open fronts. (1) Temporal tiering: the paper's grades are static, but in injury news a T2 beat-writer report from 10 minutes ago beats a T1 official report from yesterday when the T1 is stale — add a recency-decay term inside each tier pool and test whether tier × recency beats tier-alone on a "fastest correct status" eval; the paper never considers that evidence grades expire. (2) Adversarial conflict eval: the paper's benchmark likely under-samples source conflicts; construct 100 explicit T1-vs-T4 conflict questions (official report contradicts viral rumor) and measure conflict-resolution accuracy — then test whether the monotone-bias constraint is sufficient or whether an explicit "prefer higher tier on factual conflict" rule is needed. This turns the paper's clinical system into a rumor-robust news engine, which is the actual GSE requirement.
