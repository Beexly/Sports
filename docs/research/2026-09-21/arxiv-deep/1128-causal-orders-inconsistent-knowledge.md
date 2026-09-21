# [1128] Retrieving Classes of Causal Orders with Inconsistent Knowledge Bases (MATS) (arXiv:2412.14019)

**Citation:** Baldo, F., et al. (2025). *Retrieving Classes of Causal Orders with Inconsistent Knowledge Bases*. arXiv:2412.14019v4. URL: https://arxiv.org/abs/2412.14019
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all sections incl. appendices: tables 9–11, prompts, 12 DAG figures).
**Verdict:** ADAPT — as a hypothesis-ranking tool for discovering candidate causal orderings among candidate engine features, but never as evidence: LLM-derived orders must always be validated against GSE's own data before any model change.

## 1. Research question
Given only a large language model's parametric knowledge (an "inconsistent knowledge base" — the LLM contradicts itself across repeated queries), can we recover classes of causal orders (topological orderings) over variables? The MATS pipeline turns pairwise LLM causal-direction judgments into self-consistency matrices, builds a semi-complete partial DAG, and enumerates equally optimal causal orders via weighted feedback arc set optimization.

## 2. Dataset / schema
- 12 epidemiology/public-health causal DAGs from bnlearn and literature (Asia 6 nodes/8 edges, Cancer 7/5, Climate 8/8, Covid 1–4 with 9–12 nodes, Genetic 13 nodes, MSU 14, Neighborhood 15, Sachs 16/11/17, Supermarket 17/7/12) — see Table 11.
- LLM queries: GPT-4.1-nano (temperature 0.1), plus mistral:7b and llama3.1 comparisons (Table 10); each variable pair queried repeatedly (5 runs).
- Data-driven baselines used 1,000 simulated samples per graph (linear and nonlinear variants).

## 3. Method / model
1. Prompt the LLM repeatedly for pairwise direction: "Does {var_i} cause {var_j}? (A) Yes (B) No" with an expert-framing system prompt (Figure 5; rephrase prompt Figure 4).
2. Build a self-consistency score matrix from repeated answers.
3. Construct a semi-complete PDG (partially directed graph), then a dense MPDAG and/or maximally consistent acyclic tournaments.
4. Solve the weighted feedback arc set problem (ExactFAS is NP-hard) to find causal orders; MATS enumerates *equally optimal* orders rather than a single order, yielding a class of consistent causal orders.
Baselines: NOTEARS (linear and nonlinear), PC/GES-style data-driven methods on 1,000 samples.

## 4. Equations & assumptions
No numbered equations in the extracted text; the method is described procedurally (self-consistency scoring → semi-complete PDG → dense MPDAG/acyclic tournament → weighted feedback arc set). Assumptions: the LLM's parametric knowledge contains correct causal direction signal for the domain; repeated querying with rephrasing (Figure 4) elicits an honest consistency distribution; pairwise consistency scores are meaningful edge weights. Explicitly acknowledged: dependence on LLM knowledge quality, quadratic pairwise query cost, dense output graphs, frequent inability to identify total effects.

## 5. Features / target
Inputs: variable names/descriptions from each DAG. Target: a causal order (total ordering consistent with the true DAG) — evaluated by D_top (topological-order distance metric, lower is better) and SHD against NOTEARS outputs (Table 9).

## 6. Validation design
- 12 graphs × linear/nonlinear data-generating variants × 5 runs. D_top measured per method; best intraclass D_top reported (Table 10).
- Compared against data-driven baselines (1,000 samples) and NOTEARS with SHD (Table 9).
- Prompt ablations across three LLMs (gpt-4.1-nano, mistral:7b, llama3.1).

## 7. Numerical results / baselines
- MATS achieved the lowest D_top on 7/12 linear graphs and 8/12 nonlinear graphs.
- On four graphs, MATS returned exclusively correct causal orders.
- SHD vs NOTEARS (Table 9): MATS competitive or better across the 12 graphs (exact per-graph values in Table 9; paper's claim is aggregate competitiveness, not uniform dominance).
- LLM ablation (Table 10): gpt-4.1-nano and mistral:7b returned 0.00 ± 0.00 D_top on most small graphs (Asia, Cancer, Climate, Covid 1–4); llama3.1 worse (e.g., 13.00 ± 0.00 on Supermarket). Per-graph numbers vary — these are the paper's exact reported values.
- Known limits stated by authors: LLM knowledge dependence, quadratic pairwise queries, dense graphs, frequently cannot identify total effects.

## 8. Code / data availability
Code: https://github.com/Federic0Bald0/MATS (stated). Data: bnlearn DAGs are public.

## 9. Leakage & limitations
- The LLM may have memorized the benchmark DAGs (Asia, Cancer, Sachs are textbook graphs) — benchmark contamination is plausible and unaddressed.
- Quadratic pairwise querying makes this expensive beyond ~20 variables without sampling.
- Dense MPDAGs and the inability to identify total effects limit downstream use for effect estimation — this is ordering only, not a causal model.
- Results are LLM- and prompt-dependent (llama3.1 much worse); temperature 0.1 reduces diversity that the self-consistency matrix needs.
- For GSE: LLM "knowledge" of football causality is anecdotal and recency-biased; any order it proposes is a hypothesis, not evidence.

## 10. GSE overlap
New capability. The existing-research map's causal lane (ML brief area 10, FineCausal dossier, CEPT) has no LLM-based causal-order elicitation. The natural GSE application is hypothesis generation over the engine's candidate feature set (does pressure rate cause EPA/play, or vice versa at team level? does rest cause early-game efficiency?) — ranked hypotheses that then get tested with GSE's own data, never trusted from the LLM alone.

## 11. GSE implementation spec
- Build a MATS-style prompter over GSE's ~30 candidate team-strength/efficiency variables: pairwise direction queries to an LLM with 5 rephrases each, self-consistency matrix, weighted feedback arc set via an exact/ILP solver for ≤30 nodes (or greedy + local search).
- Use the output ONLY as a ranked hypothesis list for the engine's causal validation backlog (e.g., instrumental-variable or discontinuity checks on rest, weather, travel effects).
- Effort: 2–3 days for the pipeline; the validation backlog is ongoing work.

## 12. Reproducible test
Dataset: GSE gse-lab CSVs (2026-09-17, nflverse team metrics). Test: take 5 variable pairs where the causal direction is established by design (e.g., 4th-down aggressiveness → win probability added; NOT the reverse — check against play-level timing), and require the MATS pipeline to recover the correct direction in ≥4/5 before any hypothesis from it enters the validation backlog.

## 13. Acceptance / rejection gate
ADAPT as hypothesis-ranker if: the pipeline recovers ≥4/5 known-direction pairs from GSE data AND the enumerated order classes are stable across two different LLMs (rank correlation of pairwise scores >0.7). REJECT any direct use of LLM orders in the engine — every MATS-proposed edge must survive a data-based test (e.g., conditional independence or IV check) before it touches a model.

## 14. Improvement experiment
Calibrate the self-consistency scores: fit a mapping from pairwise LLM consistency to empirical conditional-independence test p-values on GSE data, and weight the feedback-arc-set objective by calibrated confidence rather than raw consistency. Hypothesis: calibrated weights resolve the paper's dense-graph problem by down-weighting the LLM's confident-but-wrong textbook answers.
