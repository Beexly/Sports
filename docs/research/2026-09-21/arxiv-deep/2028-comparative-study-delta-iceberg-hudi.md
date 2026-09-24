# [2028] A Comparative Study of Delta Parquet, Iceberg, and Hudi for Automotive Data Engineering Use Cases (arXiv:2508.13396v1)

**Citation:** Eswararaj, D., Nellipudi, A.B., Kollati, V. (Compunnel/Sogeti practitioners) (2025). *A Comparative Study of Delta Parquet, Iceberg, and Hudi for Automotive Data Engineering Use Cases*. SSRG Int. J. Computer Science and Engineering 12(7): 31–42. arXiv:2508.13396v1. URL: https://arxiv.org/abs/2508.13396
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF, ~8,500 words).
**Verdict:** ADAPT
**Rationale:** a practitioner benchmark with real numbers on all three table formats; it closes the Delta-vs-Iceberg decision left open in 2026 (Delta wins for GSE's Spark-centric ML workload) and documents the Hudi-ingestion/Iceberg-batch/Delta-ML split. Numbers are treated as directional, not gospel, given the paper's methodological weaknesses.

## 1. Research question
Which lakehouse table format — Delta Parquet, Apache Iceberg, or Apache Hudi — best fits time-series-heavy data engineering workloads (the paper's domain: automotive telemetry; structurally analogous to GSE's play-by-play/odds time series), across ingestion, batch query, storage, throughput, and ML readiness?

## 2. Dataset / schema
Synthetic automotive telemetry: 100 vehicles × 2,000 records × 30 days ≈ 200,000 records. Schema: vehicle_id (STRING), timestamp (TIMESTAMP UTC), latitude/longitude (FLOAT), engine_temp (FLOAT), speed (FLOAT), acceleration (FLOAT), dtc_code (STRING). Partitioned by date(timestamp), sorted by vehicle_id + timestamp, Parquet base format. Query scenarios: time-range filtering, vehicle-level lookup, geospatial range, aggregations, UPSERTs/CDC, time travel. Environment: AWS EC2 m5.4xlarge (16 vCPUs, 64 GB RAM, 256 GB SSD), Apache Spark 3.3.0 standalone — except Delta, which was run on Databricks Runtime 11.3 (fairness caveat, see §9).

## 3. Method / model
- Architecture summaries: Delta = `_delta_log` JSON transaction log + checkpoints, append-only snapshots, schema enforcement at write time, Z-order clustering, Delta caching; Iceberg = hierarchical versioned metadata files + manifest lists, hidden partitioning (physical/logical partition decoupling), snapshot isolation, partition evolution; Hudi = commit timeline + write markers, nested metadata table, CoW/MoR table types, Bloom filters, asynchronous compaction/clustering, incremental queries.
- Evaluation criteria: performance, scalability, query support, data consistency, ecosystem maturity; plus the empirical benchmark above.
- Case-study recommendation: Hudi for real-time ingestion, Iceberg for batch analytics, Delta for ML lifecycle management — possibly combined in one pipeline.

## 4. Equations & assumptions
No equations stated. Assumptions: synthetic telemetry is representative of production time-series workloads; the tested query mix represents automotive analytics; Spark-standalone is a fair common engine (undermined by the Databricks-runtime exception for Delta).

## 5. Features / target
N/A (systems comparison). The telemetry fields above are the dataset schema, not model features.

## 6. Validation design
Single-environment benchmark: identical ingestion + query loads on all three formats, testing schema evolution, time travel, and upserts individually. No statistical replication reported (single runs); no confidence intervals. Comparison is descriptive, not inferential.

## 7. Numerical results / baselines
Table 2 benchmark results (exact quotes):
- Ingestion time (min): Delta Parquet 13.5, Apache Iceberg 14.1, Apache Hudi 9.7
- Query latency (sec): Delta 4.8, Iceberg 3.2, Hudi 6.4
- Storage size (GB): Delta 88, Iceberg 76, Hudi 91
- Throughput (records/sec): Delta 123,456, Iceberg 119,034, Hudi 153,870
- Compaction time (min): Delta 3.1, Iceberg N/A, Hudi 2.2 (MOR mode)
- Setup notes: Hudi ran Merge-on-Read; Iceberg used default hidden partitioning; Delta ran on Databricks Runtime 11.3.
Author insights: Hudi fastest ingestion (incremental/upsert architecture); Iceberg best query latency and ~13% less storage (metadata pruning, fewer small files); Hudi async compaction outpaced Delta's background optimization; Delta competitive across the board in Spark environments but higher latency/storage when compaction+versioning overhead counted.
Feature comparison (Table 1): Delta — schema enforcement, strong Spark Structured Streaming, time travel via _delta_log, Spark-primary engine compat; Iceberg — flexible schema evolution incl. complex types, broadest engine compat (Spark/Trino/Flink/Hive/Presto), best batch reads; Hudi — native real-time ingestion/upserts, incremental queries (unique among the three), timeline-based rollback.

## 8. Code / data availability
None stated. Dataset described as synthetic and not published.

## 9. Leakage & limitations
- Adversarial: the benchmark's single biggest flaw — Delta was run on Databricks Runtime 11.3 (optimized, proprietary) while Iceberg and Hudi ran on vanilla Spark 3.3.0 standalone. The comparison is not apples-to-apples; Delta's numbers are flattered. Notably, Iceberg STILL beat Delta on query latency (3.2s vs 4.8s) and storage (76 vs 88 GB) despite Delta's runtime advantage — which strengthens the Iceberg-read-performance finding.
- Single runs, no variance reported, ~200K-record toy dataset — the absolute numbers (seconds, GB) do not generalize to GSE's multi-season scale; only the relative ordering is informative.
- Practitioner-journal paper (SSRG IJCSE), not peer-reviewed at a top venue; several claims are uncited or cite vendor blogs; some internal inconsistencies (e.g., Delta described as both "optimized for batch + streaming (moderate latency)" and ML-ready leader).
- Hudi's operational complexity (compaction scheduling, tuning) is acknowledged but not measured.
- External validity to NFL: time-series telemetry ≈ play-by-play/odds ticks structurally (timestamped entity events, late corrections via upserts, time-travel for replay) — the workload analogy is reasonable. The ML-readiness finding (Delta + Spark + MLflow) maps directly to GSE's training path.

## 10. GSE overlap
No duplication. This ledger is the decision record for the open question in 2026 ("choose Delta vs Iceberg by the 2028 benchmark read") and the empirical complement to 2027 (LST-Bench). Consistent story across all three: Iceberg = fastest batch reads, Delta = best Spark/ML integration, Hudi = best streaming ingestion.

## 11. GSE implementation spec
Decision (combining 2026/2027/2028):
1. **Gold feature tables + ML training path: Delta Lake.** GSE is Spark/Python-centric with no multi-engine requirement; Delta's Spark-native integration, schema enforcement at write time, and time travel serve the training path best. The paper's Delta-on-Databricks caveat is noted, but GSE won't use Databricks — vanilla Delta on Spark is the deployment, and 2027's numbers (Delta 511K QphDS, best raw throughput on Spark) support it.
2. **If a second engine enters the picture** (e.g., Trino for ad-hoc analyst queries), revisit Iceberg — its engine-agnosticism and hidden partitioning are the documented advantages, and it won query latency even against a advantaged Delta.
3. **Hudi is rejected for GSE** — its win is real-time ingestion/upserts, which GSE doesn't need (weekly batch feature builds; odds snapshots are append-only, never upserted). Its operational complexity is not worth it at GSE's scale.
4. **Compaction cadence:** weekly post-build Optimize (per 2027's gate), Delta's 3.1-min compaction cost at the paper's toy scale is negligible at GSE's scale.
Effort: decision only — no code; implementation rides on 2026's lake build.

## 12. Reproducible test
Port the paper's benchmark to GSE's workload: load one full NFL season of play-by-play (~50K plays, larger than the paper's 200K-record toy in row width if not count — use 5 seasons) into Delta and Iceberg tables on GSE's actual stack (Spark or DuckDB); run (a) bulk load, (b) point-in-time range query (the training-path join pattern), (c) time-travel query, (d) schema evolution (add a column mid-season). Metrics: wall-clock per operation, storage footprint. This replaces the paper's telemetry proxy with GSE's real access pattern.

## 13. Acceptance / rejection gate
CONFIRM Delta iff on GSE's 5-season replay: Delta's point-in-time range-query latency is within 20% of Iceberg's AND Delta's total storage is within 15% of Iceberg's (the paper's gaps were 4.8 vs 3.2s and 88 vs 76GB — wider than these gates, but measured on a disadvantaged setup for Iceberg's rivals). If Iceberg beats Delta by more than those margins on GSE's real workload, switch the gold layer to Iceberg. REJECT Hudi unconditionally for the batch feature layer (no test needed — workload mismatch is documented).

## 14. Improvement experiment
Beyond the paper: a fair re-run. The paper's benchmark is broken by the Databricks-runtime asymmetry. Re-run all three formats on the identical vanilla engine with 3+ replicates and report variance — a 2-day experiment that would turn this paper's directional findings into a citable decision record for the Sports repo, and incidentally produce a publishable artifact (GSE's "we benchmarked lakehouse formats on sports time series" post).
