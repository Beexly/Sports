# [2031] Pathway: a fast and flexible unified stream data processing framework (arXiv:2307.13116v1)

**Citation:** Bartoszkiewicz, M., Chorowski, J., Kosowski, A., et al. (Pathway.com, Paris) (2023). *Pathway: a fast and flexible unified stream data processing framework for analytical and Machine Learning applications*. arXiv:2307.13116v1. URL: https://arxiv.org/abs/2307.13116
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF, ~8,100 words).
**Verdict:** ADAPT
**Rationale:** unified batch/streaming engine with measured batch/stream parity, deterministic replay, and backfilling benchmarks; the reference design for any future GSE real-time signal layer, and a live demonstration that "same code, batch and streaming" actually works.

## 1. Research question
Batch and streaming systems force either lambda architecture (two codebases) or approximate results (watermarks, eventual consistency). Can a single Rust-backed incremental dataflow with a Python Table API match batch engines on throughput, beat streaming engines on latency, and support streaming *iterative* algorithms (PageRank on a changing graph) that no industrial Table-API system handles?

## 2. Dataset / schema
- Streaming wordcount: 76M words (16M burn-in discarded, 60M measured), from 5,000-word dictionary; Kafka-sourced, LogAppendTime latency measurement, 5 reps, median.
- PageRank: LiveJournal graph, 4,847,571 nodes, 68,993,773 edges (batch); subsets of 400K and 5M edges (streaming/minibatch and backfilling).
- Machine: 12-core AMD Ryzen 9 5900X, 128 GB RAM, SSD; Docker with core limits; up to 6 cores reported (CPU is two 6-core halves; cores pinned to share L3).

## 3. Method / model
- Two-layer design: Python layer builds/optimizes the computation graph (transpiles to high-level dataflow, then to an internal dataflow assembly in Rust); the Rust runtime (modified subset of differential dataflow + custom operators on a modified LSM tree) executes both batch and streaming.
- Table API: collections of typed columns sharing an identifier set; inserts/deletes/modifications propagate as deltas. Same code runs interactively (Jupyter) and on streams (disable eager mode). Recursion-friendly transformer classes transpiled specially; `.ix` pointer dereference compiled to joins.
- Consistency: stronger than eventual — single non-sharded input: user controls output progress via injected COMMIT control messages; no approximate watermarking. Bounded streams replay to identical results (deterministic modulo user-defined nondeterministic callbacks).
- Connectors: Kafka, Debezium CDC, file formats in the Rust layer; REST/websockets in Python.

## 4. Equations & assumptions
No equations stated. Assumptions: out-of-order arrival handled by the dataflow model rather than watermarks; Python-callback elimination keeps the GIL out of the hot path; min-batch size (autocommit_duration_ms) trades latency vs throughput; batch and streaming produce bit-identical outputs for the same logical computation.

## 5. Features / target
N/A (systems paper). In GSE terms the "features" are the Table columns a pipeline would carry: event-time, entity id, metric columns.

## 6. Validation design
Streaming wordcount: black-box latency measured as (Kafka timestamp of earliest output with correct count) − (input timestamp), optimistic matching favoring all systems; 95th-percentile latency vs sustained throughput curves. Batch PageRank: total runtime on identical idiomatic logic across Flink Table API, Spark SQL, Pathway. Streaming PageRank: start empty, add edges in 1000-edge batches, update ranks per batch. Backfilling: batch-compute a large prefix, then stream remaining edges — tests "recompute after a code change, then resume streaming."

## 7. Numerical results / baselines
Streaming wordcount: Flink and Pathway on the Pareto front, dominating Spark Structured Streaming and Kafka Streams. Pathway dominates Flink's default streaming setup on sustained throughput and dominates Flink's minibatching setup on latency across the measured spectrum.
Batch PageRank (LiveJournal, seconds, 1/2/4/6 cores):
- Flink (batch, standard): 215 / 132 / 96 / 83
- Spark (batch, standard): 556 / 340 / 193 / 143
- Spark (docs example): 2643 / 1408 / 781 / 571
- Spark GraphX: 130 / 78 / 44 / 35
- Pathway (public build): 171 / 95 / 54 / 47
- Pathway (benchmark release): 108 / 63 / 44 / 39
On like-for-like Table-API logic, Pathway is fastest; GraphX (a specialized, non-equivalent routine) wins overall on 6 cores (35s vs 39s).
Streaming PageRank (seconds): 400K edges — Flink 91/56/29/18 vs Pathway 2.2/1.3/0.7/0.6 (~40×). 5M edges — Flink 3350/3190/1286/830 vs Pathway 61.0/36.1/21.4/17.3 (~48×; Flink hit memory issues beyond).
Backfilling (5M edges: batch + 1-edge stream): Flink 380/200/110/85 vs Pathway 13/8/4/4. Full LiveJournal backfill (68.99M edges): Flink did not finish (OOM or >2h on 6 cores); Pathway finished in 150/90/58/49 s (single-edge stream) and 266/160/100/83 s (500K-edge stream). Spark variants cannot express this workload at all (GraphX no streaming; Structured Streaming no chained groupby-reductions).

## 8. Code / data availability
Benchmarks reproducible from the public GitHub repo (pathwaycom); datasets are public (dictionary words, LiveJournal). Engine open source.

## 9. Leakage & limitations
- Adversarial: vendor-authored paper — all authors are Pathway.com staff; benchmarks were designed, run, and reported by the vendor. Mitigation: methodology is detailed (harness, burn-in, medians of 5, optimistic black-box latency matching, core pinning) and the repo is public, which is above the bar for vendor benchmarks. Treat the 40–48× streaming margins as upper bounds; independent replication would be needed before procurement-level trust.
- The streaming-PageRank comparison excludes Spark entirely (framework limitation, fairly disclosed) and Kafka Streams (dropped after wordcount loss).
- Consistency claims assume deterministic user code; Python callbacks are a documented escape hatch.
- 2023 vintage; both Pathway and the baselines have moved since.

## 10. GSE overlap
No duplication. Pairs with 2023/2024 on train/serve parity — this paper is the strongest evidence in the lane that parity is *achievable* (bit-identical batch/streaming outputs by construction) rather than aspirational. Also complements the 2028 decision: GSE stays batch, but the paper documents the escape route.

## 11. GSE implementation spec
No immediate build — GSE's signal ingestion is batch (weekly), so a streaming engine is not needed today. The ADAPT value is the pattern and the option:
1. **Parity principle adopted as GSE policy:** any future real-time feature path (live odds ticks, injury-news feeds) must run the same logic as the batch path — the paper's "unified engine, replay-identical results" is the bar; a lambda architecture is rejected by precedent.
2. **Backfilling as the feature-definition workflow:** when a feature bug is found (as in 2024's future-perturbation tests), the correct workflow is backfill-then-resume — Pathway's benchmark proves the pattern at 68.99M-edge scale. GSE's equivalent today: rebuild one week, then resume.
3. **Candidate engine shortlist:** if GSE ever needs streaming, Pathway goes on the shortlist alongside Flink, evaluated on (a) the paper's latency/throughput Pareto claim replicated on GSE's event mix, and (b) the COMMIT-control-message determinism (no watermark approximation), which is exactly what point-in-time correctness requires.
Effort: zero today; document the decision in the Sports repo streaming notes.

## 12. Reproducible test
Run the paper's backfilling scenario at GSE scale as a smoke test of the principle: take GSE's weekly feature pipeline, run it on 17 weeks of play-by-play (batch prefix), inject a simulated feature-definition fix, and verify that (a) the backfilled 17-week output is bit-identical to a from-scratch recompute, and (b) the streaming-resume (week 18) matches a batch run including week 18. This is the parity test the paper's architecture enables.

## 13. Acceptance / rejection gate
For any future real-time GSE path: ADOPT a streaming approach iff a candidate passes the parity test above (bit-identical batch prefix + resumed stream vs from-scratch batch) AND its 95th-percentile event-to-feature latency on GSE's tick rate is ≤ 1 second at sustained throughput (the paper's regime was word-count-scale; GSE ticks are orders of magnitude smaller, so this gate is lenient). REJECT any design requiring separate batch and streaming logic — the paper's entire contribution is that this is unnecessary.

## 14. Improvement experiment
The paper's open direction is partially-frozen streams (replay only the head). GSE's use case is the inverse: *frozen history + live head*. Formalize this as a "frozen-prefix contract" for the feature layer: pin snapshot hashes of weeks 1–17, allow recomputation only of the head week, and assert prefix-hash equality in CI. This is a 1-day test harness that gives GSE Pathway's replay determinism on top of the existing batch pipeline, without adopting any new engine.
