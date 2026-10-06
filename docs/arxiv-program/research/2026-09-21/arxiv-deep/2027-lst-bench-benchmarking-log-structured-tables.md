# [2027] LST-Bench: Benchmarking Log-Structured Tables in the Cloud (arXiv:2305.01120v3)

**Citation:** Camacho-Rodríguez, J., et al. (Microsoft) (2023). *LST-Bench: Benchmarking Log-Structured Tables in the Cloud*. arXiv:2305.01120v3. URL: https://arxiv.org/abs/2305.01120
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~13,600 words).
**Verdict:** ADAPT
**Rationale:** the empirical comparison of Delta/Iceberg/Hudi plus the degradation-rate (S_DR) stability metric directly informs GSE's table-format choice and gives a quantitative maintenance doctrine; the TPC-DS workload itself is adapted to GSE's feature-table workload.

## 1. Research question
How do you benchmark log-structured tables (Delta Lake, Apache Iceberg, Apache Hudi) so that the evaluation captures what actually matters for long-running deployments — performance degradation over time from file accumulation, resilience to maintenance operations, read/write concurrency, and time travel — which conventional benchmarks (TPC-DS's single QphDS score) miss?

## 2. Dataset / schema
TPC-DS dataset at scale factors SF100 (100 GB) and SF1000 (1 TB), generated with dbgen, stored in Azure Data Lake Storage Gen2. Workload: TPC-DS 99-query Single User permutations + Data Maintenance (read-write) + new Optimize (compaction) and Time Travel tasks. Hardware: Spark 3.3.1 and Trino 420 clusters, 1 head + 16 workers on Azure Standard E8as v5 (AMD EPYC 7763, 8 vCores, 64 GB RAM); Delta Lake v2.2.0, Iceberg v1.1.0, Hudi v0.12.2. Code: https://github.com/microsoft/lst-bench/ (open source, stated).

## 3. Method / model
- **Conceptual model:** LST performance = f(metadata representation, algorithms/controls, engine characteristics). Metadata layouts: Delta = monotonically-increasing commit log + checkpoints every 10 transactions; Iceberg = hierarchical metadata file → manifest lists → manifests (atomic replace); Hudi = timeline of commit-time files + nested metadata table.
- **Algorithms:** all three use MVCC + optimistic concurrency control (single-table ACID); Hudi/Iceberg support snapshot isolation; Iceberg/Delta serialize writes by default. CoW (copy-on-write) vs MoR (merge-on-read): CoW for read-heavy, MoR for write-heavy; Iceberg/Hudi support both, Delta CoW only (at paper time). Maintenance: compaction (bin-packing small files, optional sort) and vacuum; Hudi auto-compacts/vacuums by default and avoids small files at write time; Iceberg/Delta require explicit maintenance.
- **Benchmark framework:** workload representation = tasks (SQL statement sequences) → sessions → phases (concurrent sessions) → workload (phase sequence). Four baseline workload patterns: WP1 Longevity (6 Single User + 5 interleaved Data Maintenance), WP2 Resilience (Optimize phases after increasing writes), WP3 Read/Write Concurrency (concurrent SU + DM/Optimize, single and multi-cluster), WP4 Time Travel (query prior versions after maintenance).
- **New metric — stability:** degradation rate S_DR = (1/n) Σᵢ (Mᵢ − Mᵢ₋₁)/Mᵢ₋₁ over phase iterations (reciprocal for higher-is-better metrics). A stable LST has low S_DR.

## 4. Equations & assumptions
- S_DR = (1/n) Σᵢ₌₁ⁿ (Mᵢ − Mᵢ₋₁)/Mᵢ₋₁; example computed: S(D)_DR ≈ 0.29 vs S(H)_DR ≈ 0.021.
- Assumption: default configurations, no tuning — the paper explicitly scopes out tuning and warns results are version/config-specific.
- Percentile-free reporting: nearest measured iterations; telemetry from Azure Monitor.

## 5. Features / target
N/A (systems benchmark). "Features" are workload patterns; targets are latency, throughput, API-call counts, I/O volume, S_DR.

## 6. Validation design
Seven LST setups (Spark/Trino × Delta/Iceberg/Hudi × CoW/MoR where supported) × 2 scale factors; WP1 on Spark and Trino, WP2–WP4 on Spark. Baseline package designed from Microsoft customer-workload observations. Metrics: latency, throughput (QphDS), storage API calls, bytes read/written, CPU/memory utilization, S_DR.

## 7. Numerical results / baselines
- Table 1 (TPC-DS SF1000, Spark): Delta 511K QphDS, inter-test degradation 2.7 → 5.2 hrs (92%); Hudi-CoW 262K, 6.2 → 6.5 hrs (5%); Hudi-MoR 112K, 23 → 24 hrs (6%); Iceberg-CoW 549K, 2.7 → 4 hrs (45%); Iceberg-MoR 493K, 2.9 → 5 hrs (73%).
- File accumulation degrades performance up to 6.8× without maintenance.
- Engine effect: Spark's default distribution mode writes up to 200× per table partition → hundreds of thousands of delta files → 5×+ API calls; Trino Data Maintenance creates up to 40× fewer files; baseline queries run ~2× faster on Trino (Delta and Iceberg); Spark DML causes up to 2.4× degradation vs Trino-written files (confirmed by running Spark reads on Trino-written files — degradation disappeared).
- Optimize impact: Delta SU latency drops 2.3× (SU-3→SU-3-O) and 2.6× (SU-4→SU-4-O); Iceberg-CoW 1.5×/1.8×; Iceberg-MoR 2.2×/3.2×. Hudi needs no Optimize (stable).
- S_DR: Hudi < 0.07 (most stable, read-intensive); Iceberg up to 0.89 (least stable). Hudi trades stability for raw speed: reads ~6× more data, higher latencies.
- Concurrency (WP3): single cluster — Spark statement time degrades ≥25%, experiment time within 10% of sequential; Trino gains ≥40% experiment time with minor statement degradation. Multi-cluster: storage/compute decoupling lets concurrent clusters reduce execution time.
- Time travel (WP4): no significant latency or storage-efficiency overhead vs latest-version queries.
- CoW beats MoR for read-heavy workloads across the board.

## 8. Code / data availability
Code: https://github.com/microsoft/lst-bench/ (stated, open source). Dataset: TPC-DS dbgen (public benchmark tool).

## 9. Leakage & limitations
- Adversarial: no tuning was done — every number is "out-of-the-box defaults," so the ranking (Iceberg-CoW fastest at 549K, Hudi most stable) may not survive competent tuning of any format. The authors state this; a reader choosing a format on these numbers alone is over-reading.
- TPC-DS is an OLAP workload, not an ML feature-table workload — GSE's access pattern (point lookups by entity + time-travel reads + weekly bulk rewrites) differs from 99-query analytical scans. The degradation mechanism (small-file accumulation) transfers; the absolute numbers don't.
- Versions are dated (Delta 2.2.0, Iceberg 1.1.0, Hudi 0.12.2 — all 2023); the field has moved.
- Trino supported only Delta CoW and Iceberg MoR reads/writes at the time — incomplete matrix.
- The S_DR metric is sensitive to the choice of phase granularity; the paper's example shows it works, but no sensitivity analysis is given.
- External validity to NFL: the mechanism-level findings (compaction cadence matters more than format choice; engine write behavior dominates file layout) are the transferable part.

## 10. GSE overlap
No duplication — no prior GSE work benchmarks storage formats. This is the empirical companion to 2026's architecture argument: 2026 said "use a table format," 2027 says "here is how the three formats actually behave, and here is the maintenance doctrine." Directly informs the Delta-vs-Iceberg decision left open in 2026's gate.

## 11. GSE implementation spec
Apply the paper's findings to GSE's Delta lake (2026):
1. **Format choice:** default to Delta Lake CoW (GSE is read-heavy: weekly bulk feature builds, constant point-in-time reads; CoW wins read-heavy per the paper). Keep Iceberg as the documented fallback if the 2028 benchmark read favors it.
2. **Maintenance doctrine (the paper's core lesson):** schedule Optimize (compaction) + Vacuum after every weekly feature build — the paper's 2.3–2.6× latency recovery for Delta shows unmaintained tables degrade ~92% inter-test; GSE's tables are small enough that compaction is seconds, so there is no excuse to skip it.
3. **Write-path discipline:** the engine's write behavior dominates file layout — configure the Spark/DuckDB writer for large target file sizes (avoid Spark's 200× small-file pathology; the paper's 40× file-count difference is a configuration artifact, not a format property).
4. **Stability metric:** track S_DR on weekly feature-build latency and on the Sunday serving-read p99; alert if S_DR > 0.1 over 4 weeks — the paper's metric becomes GSE's lake-health KPI.
5. **Time travel:** rely on it for the point-in-time replay tests (2024) — the paper's WP4 result (no overhead) justifies using versioned reads in the test harness without performance worry.
Effort: ~2 days for compaction/vacuum scheduling + S_DR tracking.

## 12. Reproducible test
On GSE's 2024-season Delta tables: (a) run 8 consecutive weekly feature-build cycles with no maintenance, measuring feature-table scan latency each week — confirm degradation trend exists and compute S_DR; (b) run Optimize and confirm latency recovers (paper predicts ~2× recovery for Delta); (c) compare CoW vs MoR-equivalent (Delta only has CoW; instead compare compacted vs uncompacted read latency on the point-in-time join query used by the training path).

## 13. Acceptance / rejection gate
ADOPT the maintenance doctrine iff: (i) the no-maintenance run shows S_DR > 0.1 (confirming the paper's degradation mechanism applies to GSE's workload — if no degradation appears at GSE's scale, the doctrine is unnecessary ceremony and gets REJECTED as over-engineering), AND (ii) post-Optimize latency recovers to within 10% of the fresh-table baseline. Standing rule: compaction runs weekly iff the gate's condition (i) holds; otherwise it is dropped.

## 14. Improvement experiment
Beyond the paper: workload-aware compaction. The paper compacts whole tables on a fixed cadence; GSE's access pattern is entity+time-range skewed (recent weeks queried far more than old seasons). Experiment with Z-ordering/compaction keyed on (season, week) so the hot recent partitions are optimally laid out while cold history is compacted rarely — measure whether targeted compaction beats full-table compaction on the Sunday serving p99 at equal or lower total maintenance cost.
