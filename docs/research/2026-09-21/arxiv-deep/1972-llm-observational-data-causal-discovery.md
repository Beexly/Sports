# [1972] Can LLMs Leverage Observational Data? Towards Data-Driven Causal Discovery with LLMs (arXiv:2504.10936)

**Citation:** Fujitsu Limited + ScaDS.AI/TU Dresden authors (2025). *Can LLMs Leverage Observational Data? Towards Data-Driven Causal Discovery with LLMs*. Workshop on Causal Neuro-symbolic AI, June 2025, Portoroz. arXiv:2504.10936. URL: https://arxiv.org/abs/2504.10936
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; abstract, §§1–3 methods, §4 experiments, Table 1, discussion).
**Verdict:** ADAPT

## 1. Research question
LLMs have been used for causal discovery mainly as domain-knowledge oracles (metadata only). Can LLMs *effectively process observational data* — with sampled data embedded directly in the prompt — to do data-driven causal discovery, beyond reciting textual prior knowledge?

## 2. Dataset / schema
- BNLearn benchmarks: ASIA (8 vars, lung-disease diagnosis), CANCER, SURVEY (transport usage by social group).
- Statistical baselines (PC, GES) run at sample sizes {100, 500, 1000}; LLM methods fixed at k=100 sampled observations (token limits). Sampling strategies tried (random, cluster, systematic, adaptive K-means) — no significant difference; random reported.
- LLM: gpt-4-0125-preview, 4 queries per prompt at temperatures {0, 0.5, 0.7, 1.0}.

## 3. Method / model
Two prompting strategies with observational data embedded:
1. **Pairwise prompting:** for each variable pair, prompt the LLM (with k=100 sampled rows) to decide whether a causal relationship exists. O(n²) queries.
2. **BFS prompting:** traverse the graph breadth-first — LLM proposes variables/edges from the data, suggested edges cycle-checked before insertion. O(n) queries, "impractical for large graphs" problem of pairwise solved.
- Variants: ± observational data, and + Pearson correlation in prompt (following Jiralerspong et al. 2024).

## 4. Equations & assumptions
No new equations; metrics: precision, recall, F1 (edge classification), NHD (normalized Hamming distance), Ratio. Assumptions: benchmark graphs are small enough for k=100 rows in-prompt; LLM's pretraining contains usable domain knowledge.

## 5. Features / target
Prompt = variable names/metadata + 100 sampled observational rows (+ optional Pearson correlations); target = edge existence/direction decisions per pair (pairwise) or proposed edge set (BFS).

## 6. Validation design
- Baselines: PC, GES (at n=100/500/1000), Pairwise, Pairwise+ObsData, BFS, BFS+ObsData, Pairwise+Pearson, BFS+Pearson.
- Metrics on three BNLearn networks; multiple temperatures; random sampling. No time-ordered splits (cross-sectional).

## 7. Numerical results / baselines
- BFS+ObsData is best overall: F1 0.77 vs PC 0.33 on one dataset (+0.44); 0.90 vs 0.50 on another (+0.40); vs GES, consistent +0.29 to +0.44 F1 across datasets.
- Adding observational data: pairwise F1 0.47→0.58 (+0.11); BFS 0.66→0.77 (+0.11). Lowest NHD and Ratio for BFS+ObsData on all datasets.
- Pearson-correlation variants help but data-in-prompt wins.

## 8. Code / data availability
No code link stated. BNLearn data public; method reimplementable from the prompt examples (Figure: "Prompt examples for Pairwise and BFS prompting").

## 9. Leakage & limitations
Adversarial notes: (1) **Memorization risk is severe**: ASIA/CANCER/SURVEY are famous textbook networks almost certainly in GPT-4's training data — the "up to +0.52 vs statistical baselines" margin may partly measure recall of known graphs, not data-driven reasoning. The paper does not control for this. (2) Tiny graphs (8 vars); k=100 fixed samples — does not scale to d=35 sports panels (prompt budget explodes; BFS helps but each step still needs data context). (3) Workshop paper, no ablations of *which* data aspects the LLM uses (statistics vs raw rows). (4) Temperature sweep shows variance; no confidence calibration. (5) No comparison with NOTEARS/PCMCI-class modern methods — only PC and GES, the weakest baselines.

## 10. GSE overlap
New capability — the LLM-assist lane. No other ledger uses LLMs for structure learning (1967 uses probes, not LLMs). The existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has no LLM-based causal discovery. Extension, not duplicate. Fits GSE's LLM-heavy stack: the engine already runs LLM workflows, so an LLM edge-proposal layer is cheap to pilot.

## 11. GSE implementation spec
- Role: *proposal + prior*, never oracle. Pipeline: (a) BFS-style prompting with sampled team-season rows (k=100 team-weeks) to propose candidate edges among the ~35 indicators; (b) feed proposals as *edge priors* into NOTEARS (ledger 1962) or as the initial skeleton for PC/PCMCI+ (1963) — statistical methods keep veto power; (c) any LLM-proposed edge not confirmed by a statistical test or a quantitative probe (1967) is dropped.
- Memorization control: never ask about named textbook concepts ("EPA"); use anonymized indicator labels (V1..V35) in a holdout run — if the LLM's edge proposals collapse without names, its contribution was memorization, and the pilot is killed.
- Cost control: pairwise is O(n²) = 595 prompts for 35 vars; use BFS (linear) as the paper recommends.
- Effort: ~2 engineer-days (prompt templates + harness; no training).

## 12. Reproducible test
Dataset: team-season panel; synthetic football-like DAGs with known ground truth (same generator as ledger 1971's test). Protocol: (a) on synthetic DAGs with anonymized labels, BFS+data LLM vs PC vs GES — require LLM F1 ≥ PC F1 (replicating the paper's qualitative finding) *without* real variable names; (b) with real names, measure the name-vs-anonymized F1 gap = memorization estimate; (c) end-to-end: NOTEARS+LLM-priors vs NOTEARS alone on 2015–2023, SHD on synthetic and probe hit rate (1967) on real.

## 13. Acceptance / rejection gate
ADOPT the LLM proposal layer if: (a) anonymized-label LLM F1 ≥ PC F1 on synthetic (data-driven value proven, not memorization); (b) LLM priors reduce NOTEARS SHD on synthetic by ≥10% or raise probe hit rate by ≥0.05; (c) per-edge cost stays under $0.50 at 35 vars (BFS, batched). Reject if (a) fails — then the paper's margin was memorization and the lane is dead — or if LLM-proposed edges consistently fail statistical confirmation (>50% rejection rate at the probe stage).

## 14. Improvement experiment
Beyond the paper: *closed-loop* LLM discovery — iterate: LLM proposes edges from data → statistical tests (PC CI tests / probe battery) accept/reject → rejections fed back into the prompt as constraints ("V3 does NOT cause V7; propose alternatives"). Hypothesis: the feedback loop converges to a higher-F1 graph than one-shot BFS because the LLM stops re-proposing statistically-dead edges — testable on the paper's own ASIA/CANCER/SURVEY suite by comparing one-shot vs 3-round closed-loop F1, with the anonymized-label control separating reasoning gains from memorization.
