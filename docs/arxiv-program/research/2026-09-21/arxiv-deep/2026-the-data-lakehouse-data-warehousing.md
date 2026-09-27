# [2026] The Data Lakehouse: Data Warehousing and More (arXiv:2310.08697v1)

**Citation:** Mazumdar, D., Hughes, J., Onofré, J.B. (Dremio Inc.) (2023). *The Data Lakehouse: Data Warehousing and More*. arXiv:2310.08697v1. URL: https://arxiv.org/abs/2310.08697
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~10,400 words).
**Verdict:** ADAPT
**Rationale:** the systematic requirements→lakehouse-components mapping justifies GSE's offline-store choice (Delta/Iceberg + object storage) and contributes two concrete ideas: data-as-code branching (blue-green data deployment) and SCD-type-2 via table-format time travel; the vendor-flavored tool recommendations (Dremio Sonar/Arctic) are not adopted.

## 1. Research question
Can a data lakehouse architecture satisfy every requirement of traditional RDBMS-OLAP data warehousing (technical components, technical capabilities, technology-independent practices) while eliminating the two-tier architecture's data copies, vendor lock-in, and cost — and what does it add beyond warehousing?

## 2. Dataset / schema
Not stated in paper — architecture/survey paper; no datasets, no experiments, no benchmarks. The one worked example is a telco churn dataset (BigML "churn-bigml-20", trained with RandomForest n_estimators=600, 80/20 split) used illustratively to show BI + ML running on one Iceberg table; no results numbers are reported.

## 3. Method / model
- Decomposes RDBMS-OLAP data warehousing into technology + technology-independent practices (data modeling, ETL/ELT, data quality: MDM, referential integrity, slowly changing dimensions).
- Maps each warehouse requirement to lakehouse components: object storage (S3/ADLS/GCS) → storage; Parquet/ORC → file format; Iceberg/Hudi/Delta Lake → table format (metadata layer: schema evolution, hidden partitioning, time travel, ACID via optimistic concurrency control); catalog (Hive/Glue/Nessie/REST) → metastore; decoupled compute engines (SQL engine for BI, Spark for ML, Flink for streaming) → compute.
- Capabilities ported: governance (Ranger, column masking, audit logging), high concurrency (optimistic concurrency control), low latency (compaction, clustering, data reflections/materialized views), schema evolution without rewrites, ACID multi-statement transactions (Nessie/LakeFS for multi-table atomicity), transaction rollback via snapshots, separation of storage and compute.
- Practices ported: star/snowflake modeling in semantic layers (raw → staging → business → application); ELT with schema-on-read landing; SCD type 2/4 via row-level updates + time travel.
- "More" beyond warehousing: open data architecture (multi-engine on one copy), fewer data copies (ML reads Parquet directly — no export ETL), data-as-code (Nessie/LakeFS Git-like branching: isolated dev/prod environments, blue-green data deployment, atomic merge after validation), federation (query warehouse + lake data together).

## 4. Equations & assumptions
No equations stated. Assumptions: cloud object storage is the cost-effective substrate (cited qualitatively, not priced); optimistic concurrency control suffices for concurrent-write safety in all three table formats; open table formats will remain engine-neutral. All asserted, none measured.

## 5. Features / target
N/A (architecture paper). Illustrative example only: telco churn classification features/target.

## 6. Validation design
Not stated in paper — no experiments, no baselines, no metrics. The argument is by architectural mapping, not measurement.

## 7. Numerical results / baselines
None. Zero quantitative results; the churn example shows a confusion matrix/classification report figure without quoted numbers.

## 8. Code / data availability
None stated. References are product docs (Dremio Sonar/Arctic, Tabular, Nessie, LakeFS, Iceberg, Hudi, Delta Lake).

## 9. Leakage & limitations
- Adversarial: three authors are Dremio employees and the paper is vendor-flavored — Dremio Sonar/Arctic are the recommended compute/storage-optimization layers throughout, and the "example implementation" is a Dremio stack. The architecture argument is sound but the tool selection is marketing-adjacent; treat product claims as unverified.
- No measurements anywhere: no latency, cost, or concurrency numbers to back "low query latency" or "cost-effective" claims. The "What Went Wrong with Data Lakes" critique (ledger 2032) is the necessary counterweight.
- The paper waves away the hard parts: compaction/indexing maintenance ("can be automated through orchestration"), governance on raw object storage ("stringent security measures" needed), and the operational cost of running a multi-engine lakehouse at small scale — all of which are exactly GSE's scale problem.
- External validity to NFL: the mapping is workload-agnostic and applies to GSE's batch-heavy analytical workload; the BI-dashboard latency story is less relevant than the ML-direct-access story (Spark reading the same Parquet the SQL engine queries).

## 10. GSE overlap
No duplication — GSE has no lakehouse architecture; current state is Neon Postgres for engine predictions plus ad-hoc scripts. This paper is the architectural justification for 2022's offline-store choice (Delta tables on object storage): it explains WHY the offline store should be a lakehouse table format rather than a warehouse or plain Parquet. Extension of 2022, not duplication.

## 11. GSE implementation spec
Adopt the lakehouse pattern for GSE's analytical/offline layer (adapted to small scale — no Dremio):
1. **Substrate:** cloud object storage + Delta Lake (chosen over Iceberg for the Python/Spark-native tooling and the Delta Tensor vector-storage option in 2029; revisit if 2028's benchmark favors Iceberg) for all bronze (raw nflverse pulls, odds snapshots, NGS dumps), silver (cleaned play-by-play), gold (feature tables) layers.
2. **Table format over file format:** never query raw Parquet directly in production paths — always through Delta, so every read gets time travel (point-in-time feature reconstruction for free) and schema evolution without rewrites.
3. **Data-as-code branching:** adopt the Nessie/LakeFS-style pattern in lightweight form — weekly feature-table builds land on a staging branch; the backtest suite runs against the branch; atomic promotion to prod only on pass. This is the blue-green deployment for data and directly implements the acceptance gates in 2022/2024.
4. **Compute decoupling:** DuckDB/Spark for batch feature builds, the same Delta tables read by the training path — zero export ETL, zero copies (the paper's central cost argument, which at GSE's scale is about complexity rather than dollars).
5. **SCD type 2 for dimensions:** team/coach/roster dimensions versioned with effective dates via Delta time travel — handles mid-season coaching changes and trades without breaking historical joins.
Effort: ~1 week to stand up Delta + bronze/silver/gold; branching discipline is process, not code.

## 12. Reproducible test
Build the 2024-season bronze/silver/gold Delta lake; run the full feature-build + backtest pipeline twice — once landing directly on prod tables, once on a staging branch with promotion gated on the 2024 backtest suite. Metrics: (a) time-travel query reproduces the exact Week 10 feature table from the Week 14 snapshot (byte-identical row counts and hashes), (b) the branch-promotion gate blocks a deliberately corrupted silver table (injected bad NGS pull) from reaching prod, (c) zero data copies: count distinct physical copies of the play-by-play data across the whole pipeline (must be 1).

## 13. Acceptance / rejection gate
ADOPT the lakehouse layout iff: (i) time-travel reproduction is byte-identical on the 2024 replay, (ii) the branch gate catches the injected corruption (no prod contamination), (iii) exactly one physical copy of each raw dataset exists. REJECT the branching discipline (keep single-table writes) if branch-merge overhead adds >10% to the weekly build time — at GSE's scale the ceremony must stay cheap. Choose Delta vs Iceberg by the 2028 benchmark read, not by this paper.

## 14. Improvement experiment
Beyond the paper: lakehouse-native feature lineage. The paper treats lineage as a catalog concern; GSE can do better cheaply — embed the feature-DSL fingerprint (from 2024's spec) and source Delta versions as table properties on every gold feature table. Then any feature table is self-describing: its own metadata answers "which transform version, over which source snapshots, built when." This collapses the catalog-lookup step the paper assumes into the table itself.
