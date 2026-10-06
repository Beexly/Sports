# [2030] AutoComp: Automated Data Compaction for Log-Structured Tables in Data Lakes (arXiv:2504.04186v1)

**Citation:** Gruenheid, A., Camacho-Rodríguez, J., Curino, C., Ramakrishnan, R. (Microsoft), Pak, S., Sakdeo, S., Gandhi, L., Singhal, S.K. (LinkedIn), Nilangekar, P., Abadi, D.J. (U. Maryland) (2025). *AutoComp: Automated Data Compaction for Log-Structured Tables in Data Lakes*. arXiv:2504.04186v1. URL: https://arxiv.org/abs/2504.04186
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF, ~12,400 words).
**Verdict:** ADAPT
**Rationale:** production-proven compaction automation from LinkedIn/OpenHouse; this is the operational maintenance layer that makes GSE's lakehouse decisions in 2026/2027/2028 stick. Concrete MOOP ranking math, cost model, and production numbers — the strongest "how to run it" paper in the lane.

## 1. Research question
LSTs (Delta/Iceberg/Hudi) accumulate small files from append-only writes, degrading query performance, bloating metadata, and raising cloud I/O costs. Existing compaction automation lacks flexibility and cost/benefit balance. Can an OODA-structured, extensible framework automate compaction decisions at LinkedIn scale (21K→35K+ tables)?

## 2. Dataset / schema
- Motivating data: LinkedIn OpenHouse-managed Iceberg tables — before any compaction, **83% of files were smaller than 128 MB**; centrally-ingested raw tables hit ~512 MB target, end-user derived tables did not.
- Synthetic: CAB-gen over TPC-H-derived schemas (500 GB, 20 databases, 5 hours), plus LST-Bench extensions; TPC-DS at SF=1000 (16-node Spark), TPC-DS/TPC-H at SF=100 (16-node Spark) with Delta Lake v2.4.0 and Iceberg v1.2.0.
- Production: LinkedIn OpenHouse deployment, 35K tables, Azure clusters (Standard E8s v3, 8 vCPU/64 GB), OpenHouse v0.5.131, hourly/daily compaction cadences.

## 3. Method / model
- OODA workflow: Observe (candidate generation at table/partition/snapshot scope + statistics extraction), Orient (trait generation: benefit traits like file-count reduction and file entropy; cost traits like compute), Decide (objective-oriented ranking), Act (scheduling with LST conflict awareness). Optional filters between phases (skip small tables, skip recently-written tables) and a feedback loop Act→Observe.
- Two triggering modes: optimize-after-write hooks (push) and periodic standalone service (pull), integrable into a catalog control plane.
- Conflict-awareness: observed Iceberg compaction conflicts even across *disjoint* partitions — schedulers must respect LST-specific conflict semantics; smaller (partition-scoped) candidates reduce conflict probability.

## 4. Equations & assumptions
- File count reduction trait: ΔF_c = Σ_i 1(FileSize_{i,c} < TargetFileSize_c), summed over candidate files below the target size (e.g., 512 MB or HDFS block size).
- Compute cost: GBHr_c = ExecutorMemoryGB × (DataSize_c / RewriteBytesPerHour).
- Min-max trait normalization: T'_i,c = (T_i,c − min(T_i)) / (max(T_i) − min(T_i)).
- MOOP scalarized score: S_c = w_1·T'_1,c − w_2·T'_2,c (weights sum to 1; experiments used 0.7 file-count-reduction / 0.3 compute-cost).
- Production dynamic weight: w_1 = 0.5·(1 + UsedQuota/TotalQuota), tying compaction aggressiveness to HDFS namespace-quota pressure per tenant.
- Top-k selection: greedy fit of highest-scoring candidates within the compute budget (production: 226 TBHr budget → ~2,500 tables/iteration).
- Assumptions: executor memory is the dominant cost driver (CPU/disk/network deferred to future work); table-level estimates are usable proxies (later shown to overestimate by ignoring partition boundaries).

## 5. Features / target
N/A (systems paper). The decision inputs are the traits: file count reduction, file entropy, compute cost, quota utilization.

## 6. Validation design
Three compaction strategies compared on the CAB workload: none, table-scope, hybrid (partition-scope when partitioned, else table-scope), compaction triggered hourly. Metrics: file counts over time, mean GBHr_App, query latency candlesticks per hour, write-write conflict counts. Auto-tuning experiment with FLAML/MLOS optimizing compaction trigger thresholds (small-file-count vs entropy triggers) on TPC-DS WP1/WP3 and TPC-H. Production A/B of manual top-100 vs AutoComp top-10.

## 7. Numerical results / baselines
- TPC-DS SF=1000: 3% data maintenance degraded single-user workload runtime by 1.53×; compaction restored it to baseline.
- No-compaction baseline: file count grew ~2,640 files/hour; baseline incurred +25 min over the 5-hour limit; compaction strategies eliminated it.
- Production: manual compaction shifted files <128MB from 83% → 62%, then stalled (second→third month: distribution nearly unchanged). Switching manual top-100 → AutoComp top-10: 6.59M → 7.44M files reduced (+12%) while compacting 10× fewer tables — automatic selection beat manual targeting.
- Scan-heavy daily workload over 30 days (1,291 tables): file-count reductions correlated with lower files-scanned, query time, and query cost; unscheduled tables showed a recurring sawtooth re-fragmentation pattern.
- Filesystem impact: open() calls declined sharply after manual compaction (month 4, on tables averaging 42M small files at 64 MB avg) and continued declining with AutoComp (month 9+); read timeouts / thundering-herd retries were the pre-compaction symptom.
- Auto-tuning: TPC-DS WP1 query time cut up to 2× with proper thresholds; TPC-H default (no compaction) won — compaction of full non-partitioned tables was too costly; TPC-DS WP3 (decoupled read/write clusters) benefited consistently. Small-file-count and entropy triggers performed comparably given tuned thresholds.
- Estimator accuracy: compute cost underestimated by 19% (108 predicted vs 129 TBHr actual); file-count reduction overestimated by 28% — ranking is robust anyway, but table-level estimates ignore partition boundaries.
- Cost scale: ~3K raw tables in LinkedIn's managed pipeline consume 150 TBHr/day average, 600 TBHr/day peak — the reason periodic blanket compaction was deemed infeasible and AutoComp's selective approach required.

## 8. Code / data availability
LST-Bench extensions contributed to OSS LST-Bench; AutoComp itself described but not released as code. OpenHouse is open source.

## 9. Leakage & limitations
- Adversarial: no confidence intervals anywhere; production numbers are deployment narratives (honest about estimator error, which is rare and credible). The synthetic-vs-production gap: TPC workloads exercise SQL analytics, not feature-store access patterns (point-in-time joins, slice reads) — GSE's read pattern differs.
- Conflicts are reported but conflict *prediction* is unsolved (future work; formal verification cited).
- The weighted-sum MOOP collapses trade-offs to one point — authors themselves propose Pareto-frontier exploration as future work.
- Threshold/tuning results use "unlimited compaction resources" in the auto-tuning arm — not a production regime.
- Delta Lake v2.4.0 + Iceberg v1.2.0 are now two major versions old; per-version quirks (e.g., Iceberg's disjoint-partition conflicts) may be fixed or replaced.

## 10. GSE overlap
No duplication. Operationalizes 2027 (LST-Bench showed compaction recovers 2.3–2.6× throughput) and 2029 (my auto-chunker improvement note). 2026/2028 decided the format; this decides how it stays healthy.

## 11. GSE implementation spec
1. **Maintenance policy for GSE's Delta gold layer:** adopt the AutoComp skeleton in a 50-line form: Observe = `DESCRIBE DETAIL` + file listing per table after each weekly build; traits = ΔF (files < 128 MB vs target) and GBHr (estimated from bytes to rewrite); Decide = compact iff ΔF ≥ 10% (the paper's unconstrained threshold) or the table's files scanned per query doubled since last compaction (sawtooth guard); Act = run `OPTIMIZE` off-peak, never concurrent with builds (conflict lesson).
2. **Post-build hook:** optimize-after-write on the weekly feature build — GSE's write pattern is a weekly bulk append, exactly the "incremental insert" small-file generator from §2, but tiny in scale (GSE will have dozens of tables, not 35K). The MOOP machinery is overkill; the traits and thresholds are the portable part.
3. **Monitor:** track files-scanned per query and query latency across weekly training runs — the paper's correlation means these are GSE's early-warning metrics for fragmentation; expect a sawtooth if the hook misfires.
Effort: small — one maintenance script + two metrics logged per week.

## 12. Reproducible test
Simulate fragmentation: run GSE's weekly feature build 8 times appending small Parquet files without Optimize; measure (a) point-in-time training join wall-clock, (b) files scanned, before and after an `OPTIMIZE`; verify the 1.53×-style degradation exists at GSE scale and that compaction restores it. Also test the estimator: compare predicted vs actual rewrite cost to confirm the ~19% underestimation regime.

## 13. Acceptance / rejection gate
ADOPT the hook iff: (a) uncompacted 8-week fragmentation degrades the training-path join by ≥ 20% vs post-OPTIMIZE (paper's TPC-DS gap was 53%; GSE's smaller tables should show at least this); (b) weekly OPTIMIZE cost < 5% of the weekly build's compute cost; (c) zero write-write conflicts over 4 consecutive weeks of hook operation (conflict-safety per the paper's scheduling lesson). REJECT as unnecessary automation if fragmentation never materializes at GSE's write volume — a cron reminder to check file counts quarterly is the fallback.

## 14. Improvement experiment
Close the paper's own gap: multi-objective Pareto frontier instead of weighted sum. At GSE scale this is tractable — with ~dozens of tables, enumerate (ΔF, GBHr) for all compactable tables weekly and pick the Pareto knee rather than a fixed w1/w2. Log the frontier weekly; this produces the first empirical Pareto study of compaction trade-offs, which the authors explicitly left as future work — a publishable Sports-repo artifact in one afternoon.
