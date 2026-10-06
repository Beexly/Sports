# [2034] Benchmarking Distributed Stream Data Processing Systems (arXiv:1802.08496v2)

**Citation:** Karimov, J., Rabl, T., Katsifodimos, A., Samarev, R., Heiskanen, H., Markl, V. (DFKI / TU Berlin / TU Delft / Rovio) (2018; v2 2019). *Benchmarking Distributed Stream Data Processing Systems*. arXiv:1802.08496v2. URL: https://arxiv.org/abs/1802.08496
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF, ~9,100 words).
**Verdict:** ADAPT
**Rationale:** the systems are museum pieces in their 2018 forms (Storm, DStream-era Spark, Flink 1.x) and the absolute numbers are not actionable, but the *benchmark methodology* is the value: sustainable throughput, driver/SUT separation, event-time latency for stateful operators, and skew/fluctuation stress tests. This is the evaluation template GSE should use when load-testing its serving layer.

## 1. Research question
Prior stream benchmarks measured the wrong things: batch metrics on streaming systems, latency measured inside the SUT, no definition of latency for stateful operators, and unbounded ingestion that collapses into backpressure. The paper asks: with a clean methodology, what are the real throughput/latency characteristics of Storm, Spark, and Flink on windowed aggregation and windowed joins?

## 2. Dataset / schema
Industrial gaming use-cases from Rovio: in-app purchase tracking per app/channel/item and ad-campaign monitoring. Workloads: windowed aggregation (8s window, 4s slide) and windowed joins; large-window variants (60s); extreme single-key skew; fluctuating workloads (0.84 → 0.28 → 0.84 M events/s). Data generated on the fly by a scalable generator (no Kafka/Redis bottleneck — the Yahoo benchmark's flaw), queues between generator and SUT, driver fully separated from the system under test. 2/4/8-node clusters.

## 3. Method / model
- **Sustainable throughput:** the maximum ingestion rate a system sustains without large latency fluctuations — measured by controlling the driver's ingestion rate rather than letting systems ingest at max rate (which just measures backpressure collapse).
- **Latency definition for stateful operators:** event-time latency = source production timestamp → sink result emission, measured externally in the driver (prior work measured inside the SUT, hiding backpressure).
- Workload tuning per system documented honestly: Spark 4s batch size, Storm workers/executors/buffer tuning, Flink network-bound at 4+ nodes; Storm's backpressure immature (dropped queue connections at high load = treated as failure).

## 4. Equations & assumptions
No equations. Assumptions: on-the-fly generation is faithful to production feeds; the gaming workloads generalize to other streaming analytics; per-system tuning effort was comparable (authors disclose the tuning surface per engine).

## 5. Features / target
N/A (benchmark paper). Workload parameters: window length/slide, batch size, parallelism, skew key distribution, spike profiles.

## 6. Validation design
Five experiments: (1) windowed aggregation throughput+latency at max and 90% load; (2) windowed joins (Spark vs Flink; Storm's Trident computed incorrect results at larger batch sizes — excluded); (3) large windows; (4) extreme single-key skew; (5) fluctuating workloads. Latency distributions plotted as time series to expose fluctuation behavior, not just averages.

## 7. Numerical results / baselines
- Windowed aggregation avg latency (seconds): 2-node — Storm 1.4, Spark 3.6, Flink 0.5; 8-node — Storm 2.2, Spark 3.1, Flink 0.2. Lowering load 10% below max collapses latency fluctuation — evidence the "max" point is saturated.
- Storm outperformed Spark by ~8% in sustainable aggregation throughput across configs; Flink bounded by network bandwidth at 4+ nodes (saturation ~1.2M events/s).
- Windowed join sustainable throughput (M events/s): 2-node — Spark 0.36, Flink 0.85; 8-node — Spark 0.94, Flink 1.19 (network-bound). Join avg latency: 2-node — Spark 7.7s, Flink 4.3s; 8-node — Spark 6.2s, Flink 3.2s.
- Large windows (60s window, 4s batch): Spark throughput halved, avg latency 10× — fixed with inverse reduce functions (evict old data incrementally instead of recomputing).
- Skew (single key): Flink/Storm throughput bounded by one machine slot (Flink 0.48 M/s, Storm 0.2 M/s, no scaling); Spark handled it via tree aggregation (0.53 M/s on 4-node, best of three) — but for *joins* under skew, Flink went unresponsive and Spark showed extreme latencies.
- Fluctuating workloads: Storm most susceptible; Flink handled join spikes best.

## 8. Code / data availability
Framework described and positioned as reusable; no link extracted from the text read. Workloads are replicable from the specification (Rovio gaming queries, Nexmark-style windows).

## 9. Leakage & limitations
- Adversarial: 2018 systems — Spark Streaming measured is the DStream API (Structured Streaming existed but wasn't the measured path in the read sections), Storm was already declining, Flink pre-1.10. Every absolute number is stale; treat as historical record only.
- The tuning surface differs per system and the authors' expertise may not be uniform — a standard caveat, partially mitigated by their transparency about what was tuned.
- No cost metrics (only throughput/latency); no exactly-once overhead isolation.
- The driver/SUT separation, while correct, means results depend on the generator's fidelity, which isn't independently validated.

## 10. GSE overlap
No duplication. Methodological complement to 2031 (Pathway's benchmarks are the modern counterpart — note Pathway's backfill scale vs this paper's join-throughput focus). The skew findings reinforce 2032's WeakHash point and 2033's skew-aware tuning.

## 11. GSE implementation spec
Port the methodology to GSE's *serving layer* evaluation (the paper's concepts, not its systems):
1. **Sustainable-throughput test for the feature server:** the standing gate is p99 ≤ 50 ms. Don't just test at one QPS — ramp QPS in the driver (separate load-generator process, never in-process) until p99 degrades, then define GSE's sustainable serving throughput as 90% of that knee (the paper's max-vs-90% lesson: at the max point, fluctuations dominate).
2. **Event-time latency for stateful serving paths:** if the serving path ever joins live odds with point-in-time features (a stateful operation), measure end-to-end latency externally in the load driver — never trust in-process timers (the paper's core measurement lesson).
3. **Skew stress test:** the paper's single-key-skew result is GSE's playoff/Super-Bowl scenario — one entity (a popular game) dominating request distribution. Test the serving layer under 80/20 and single-key skew and verify the p99 gate holds; Spark's tree-aggregation lesson says hierarchical fan-in beats single-slot processing.
4. **Spike test:** replay the paper's 0.84→0.28→0.84 fluctuation profile against the serving layer around simulated game-time traffic spikes.
Effort: small — a load-driver script reusing the paper's experiment shapes.

## 12. Reproducible test
Build the serving load test: external driver process generating feature requests at controlled QPS (ramp 50→500 QPS), measuring p99 end-to-end from the driver. Record: sustainable QPS (p99 ≤ 50 ms), the 90%-load latency distribution (expect the paper's fluctuation-collapse pattern), single-key-skew behavior (all requests for one game), and spike recovery time. This replaces the paper's Flink/Spark numbers with GSE's serving numbers.

## 13. Acceptance / rejection gate
ADOPT the sustainable-throughput methodology as GSE's serving evaluation standard iff: (a) the driver's measured sustainable QPS ≥ 2× GSE's peak expected game-day QPS (headroom margin); (b) under single-key skew, p99 stays ≤ 50 ms up to at least 50% of sustainable QPS (the paper showed skew is where systems break — the gate must be skew-aware); (c) spike recovery (return to p99 ≤ 50 ms) within 60 seconds of the spike ending. REJECT the absolute 2018 engine numbers as decision inputs — methodology only.

## 14. Improvement experiment
The paper's blind spot: no cost dimension. Extend GSE's serving benchmark with cost-per-1K-served at each QPS level (compute cost from the 2033 tuning work), producing a throughput–latency–cost Pareto surface — the three-way trade-off none of the lane's benchmark papers (2027, 2028, 2031, this one) jointly measure. One afternoon of instrumentation on the existing load test.
