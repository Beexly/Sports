# [2093] Experience Graphs: The Data Foundation for Self-Improving Agents (Trellis) (arXiv:2606.29823)

**Citation:** Authors (2026). *Experience Graphs: The Data Foundation for Self-Improving Agents*. arXiv:2606.29823 (version verified via export API; v1 current). URL: https://arxiv.org/abs/2606.29823
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Abstract + Sections 1–2 + architecture sections).
**Verdict:** ADAPT — the "experience graph as first-class, governed, queryable database state" thesis is the storage architecture the entire GSE discovery loop should be built on: every backtest attempt, artifact, reward, sibling comparison, and causal lineage becomes queryable, replacing today's disposable logs and static CSVs.

## 1. Research question
Long-horizon agentic tasks (code generation, scientific discovery, hardware design, security research) are a new workload: agents explore over hundreds of steps, generating artifacts, executing tools, observing failures, branching, repairing, comparing alternatives. Yet frameworks treat this experience as disposable state (JSON checkpoints, session logs). What database architecture makes the agent's search — the "experience graph" — first-class, governed, queryable state, so that recovery, cross-session reuse, training-data extraction, and replay become database access patterns?

## 2. Dataset / schema
No empirical dataset (architecture paper). The proposed schema: the experience graph = executable artifacts + tool outputs + objective rewards + sibling comparisons + mutable search statistics + causal lineage. Core access patterns: recovery = a query against the frontier; cross-session reuse = vector-seeded graph traversal; training-data extraction = a materialized view; agent replay = an as-of temporal query. Two-loop architecture: inner loop of skill-driven agent sessions + outer loop of RSI tree search over a persistent data substrate that "renders agents stateless and serverless." Extended to multi-agent scientific societies sharing hypotheses, critiques, and distilled knowledge.

## 3. Method / model
**Trellis** (the proposed system): treat the experience graph as governed database state rather than ephemeral logs. Key design points (from sections read): governed view maintenance, bi-temporal memory (valid-time + transaction-time), crash recovery via frontier queries, cross-user/cross-session governed sharing, and the two-loop architecture (inner skill-driven sessions; outer tree search over the persistent substrate). The paper's thesis line: "databases made data reliable; experience graphs may make agents cumulative." File-based memory (declarative facts, procedural skills, episodic logs) is diagnosed as capturing "what an agent knows, not the reward-bearing experience graph of what its search tried."

## 4. Equations & assumptions
No equations stated (architecture paper). Assumptions: agentic search is usefully modeled as a graph workload; database primitives (queries, views, temporal tables) can express recovery/reuse/replay; governance (access control, lineage) can be enforced at the substrate layer; stateless/serverless agents over a persistent substrate scale.

## 5. Features / target
Inputs: agent sessions (artifacts, tool outputs, rewards, comparisons, lineage). Outputs: queryable experience graph. No numeric targets (no experiments in the extracted sections — position/architecture paper).

## 6. Validation design
Not stated in the extracted sections (no benchmark evaluation; the contribution is the architecture definition and access-pattern mapping).

## 7. Numerical results / baselines
None stated — architecture/position paper; no experiments, tables, or baselines in the extracted sections. (Claim vs interpretation: everything in Sections 10–14 below is my adaptation of the architecture to GSE, not the paper's empirical result.)

## 8. Code / data availability
None stated in the extracted sections.

## 9. Leakage & limitations
No empirical validation — the access-pattern claims (recovery-as-query, replay-as-temporal-query) are asserted, not measured; no cost/latency analysis of storing full experience graphs; governance model is sketched, not specified; the "stateless/serverless agents" vision assumes infrastructure that doesn't exist yet. For GSE: adopt the schema and access patterns, not the full Trellis vision — a SQLite/Postgres implementation of the experience graph covers 90% of the value. Risk: over-engineering the store before the discovery loop produces enough experience to need it — start with the minimal graph (nodes = attempts, edges = parent/derived-from, rewards = gate scores).

## 10. GSE overlap
**MOVE-37 FLAG:** This paper names the data architecture that every other ledger in this lane assumes but none specifies: the MOVE-37 execution lab's persistent substrate. Today GSE's "experience" is scattered — gse-lab CSVs (static artifacts), dated research dirs (narrative reports), the agent-bus (task handoffs) — none of it queryable as a search graph. The experience-graph diagnosis fits exactly: GSE's files capture what analysts know, not the reward-bearing graph of what the search tried (which backtests were run, which failed and why, which were siblings, what the lineage is). Existing-map check: no unified queryable store of experimental experience; the closest is the wave5-dedup base (a flat ID list) and coin-commitments.json (CEPT). **New capability** (substrate); it is the foundation the 2082–2092 loop should be built on rather than bolted onto later.

## 11. GSE implementation spec
Build the **GSE experience graph** (minimal Trellis) as the discovery loop's substrate:
1. **Schema (Postgres/SQLite):** nodes: `attempt` (id, hypothesis_id, code_hash, backtest_spec, started/finished, status); `artifact` (id, attempt_id, type: code/plot/log, content_ref); `reward` (attempt_id, metric, value, split: train/holdout/locked); `comparison` (attempt_a, attempt_b, metric, margin — the Bradley–Terry inputs from 2091); `reflection` (attempt_id, text, embedding — from 2084). Edges: `derived_from` (child attempt → parent), `sibling_of`, `supersedes` (rubric rule versions, from 2090).
2. **Access patterns as queries:** recovery ("what was the frontier last night?") = query max-reward open attempts; cross-session reuse = vector search over reflection embeddings + graph traversal to related attempts (the 2088 case retrieval, now graph-native); training-data extraction = materialized view of (hypothesis features, outcome) for the 2092 learned discriminator; replay = as-of query reconstructing any attempt's full lineage.
3. **Bi-temporal:** every reward row carries valid-time (which season window) and transaction-time (when computed) — kills the "which backtest number was current when?" confusion.
4. **Governance:** append-only rewards; code artifacts content-hashed; the locked-season split physically separate with access logging.
5. **Effort:** 3–4 days (schema + ingestion from the 2082 loop + 3-4 query views); grows with the loop.

## 12. Reproducible test
**Dataset:** the discovery loop's own first 30 nights of operation. **Protocol:** run the loop with experience-graph ingestion vs the current flat-file logging. **Metrics:** (a) time for an analyst to answer "show me every attempt at weather-interaction signals, their holdout scores, and what each learned" (target: <2 min via query vs >30 min via file search); (b) crash recovery — kill the loop mid-night, measure time to resume from the frontier query (target: <5 min, zero repeated backtests); (c) replay fidelity — reconstruct 5 random historical attempts byte-identical from the graph.

## 13. Acceptance / rejection gate
**ADOPT as the loop's substrate if:** analyst query-time test passes (<2 min), crash recovery <5 min with zero duplicate backtests over 3 induced crashes, replay fidelity 5/5, and storage stays <10 GB after 30 nights (experience graphs must not become a cost center). **REJECT (stay with flat files + SQLite cases) if** query-time shows no improvement over grep (the graph is write-only — nobody queries it), or ingestion overhead slows the nightly loop by >15%, or the schema needs redesign twice in the first month (premature abstraction — simplify to the 2088 case bank instead).

## 14. Improvement experiment
Beyond the paper: add **automated experience mining** — a weekly job that runs graph queries to detect patterns the agents don't notice: hypotheses whose siblings systematically outperform them (bad implementation, good idea — flag for re-implementation), lanes with high attempt counts but zero gate-passes (dead lanes — deprioritize in the 2089 MCTS scheduler), and reflections that recur across failures (candidate new testing-playbook entries for 2092). Hypothesis: the graph contains meta-signal about the discovery process itself; mining it improves the loop's own efficiency over time. Test: does acting on the miner's top-3 recommendations each week raise the gate-pass rate over the next 4 weeks vs ignoring them?
