# [2035] LakeVilla: Multi-Table Transactions for Lakehouses (arXiv:2504.20768v2)

**Citation:** Götz, T., Ritter, D. (SAP), Giceva, J. (TU Munich) (2025). *LakeVilla: Multi-Table Transactions for Lakehouses*. arXiv:2504.20768v2. URL: https://arxiv.org/abs/2504.20768
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF, ~14,900 words).
**Verdict:** ADAPT
**Rationale:** closes the one hole every lakehouse paper in this lane leaves open: single-table transactions don't compose. Multi-table atomicity is exactly what GSE's weekly build needs (features + labels + metadata must commit together or not at all), and the paper proves the overhead is negligible.

## 1. Research question
OTFs give ACID per table, per query — but not recovery from aborted multi-query transactions, not complex (multi-query/multi-table) transactions, and not isolation across tables. Concurrent readers can see inconsistent cross-table states (their example: students taking an unknown lecture). Prior fixes add external services (Nessie, Delta commit owners, XTable), reintroducing vendor lock-in. Can multi-table transactions be built *into* the OTF protocol, non-invasively, with per-transaction choice of guarantees?

## 2. Dataset / schema
- YCSB-LH (their lakehouse adaptation of YCSB, public: github.com/goetztj/YCSB-LH): 1,000 ops on 1,000 entries, 1 KB rows; workloads A/B/C/D/F (E skipped — prototype lacks scans); 1/8/64 concurrent clients.
- CAB-LH: CAB (van Renen & Leis) adapted — read streams = TPC-H queries on sf1/sf10/sf100; write streams = 80% inserts of ≤100 rows to random tables, 20% single-table updates; 20-minute phases.
- TPC-DS: three metadata-heavy queries (Q67/Q68/Q90 from Jain et al. 2023) at SF=1000 and 3000; MinIO tracing of object-store interaction time; Spark cold vs best-of-three hot.
- Prototype: separate C++ client vs Spark + Delta Lake baseline.

## 3. Method / model
Three composable, non-invasive features, each choosable per transaction:
- **LV[R] (Recovery):** file-based markers reserve snapshot versions at transaction start (Delta: appended to the log; Iceberg: new path); transaction sublogs + physical/logical undo/redo enable greedy adaptation to concurrent changes instead of aborting.
- **LV[CT] (Complex Transactions):** marker-based conflict and deadlock detection *across all accessed tables*; a client discovering markers on a newly accessed table inherits dependency order; on cycles/timeout, a marker shift inverts the dependency globally. LV[R,CT] ⇒ global serializability.
- **LV[I] (Isolation):** a global version log — a new object-store layer above all tables — with atomic validation (R1–R3: read-set freshness, write-set conflicts, version distance); gives serializability, or snapshot isolation when only R2–R3 are checked; a WriteSerializable mode skips version assignment for read-only transactions. Hidden versions adapt to non-LV concurrent writers.
- Correctness: LV[I]'s global version log defines a total order of committed transactions ⇒ serializability over the whole lakehouse, not per table; LV[R,CT] achieves serializability via marker-order transitivity; each feature is optional per transaction (modular, Q4 design decision).

## 4. Equations & assumptions
No closed-form equations; correctness argued via ordering constructions (marker orders, global log total order). Assumptions: object-store atomic writes (PUT-if-absent) as the primitive; clients may be non-LV (handled via hidden versions); workload mix of 40% writes / 60% reads with 80% inserts / 20% updates (SAP Ariba/S4 use cases).

## 5. Features / target
N/A (systems paper). The "features" are the three composable guarantees; evaluation metrics: latency, throughput, abort rate, object-store request counts, metadata-op latency.

## 6. Validation design
Phase analysis (read vs write path breakdown vs Spark+Delta); concurrency sweep (1/8/64 clients) with Spark allowed 10 retries; feature-combination comparison under 8 clients at 50/95/100% read mixes; table-scaling for LV[CT] (1 row per table, TPC-H customer schema, 64 threads); CAB-LV level-switching every 20 min; TPC-DS OLAP impact; object-store request-count accounting per feature.

## 7. Numerical results / baselines
- Headline: 2% overhead on YCSB writes, 2.5% on TPC-DS reads.
- Sequential YCSB: LV reads comparable to Spark (metadata-layer access 93% vs 95% of read latency); LV[I]'s global version log adds ~4 ms per read/write vs baseline, mitigated by WriteSerializable mode for reads; LV[R]/LV[CT] add no latency on single-table workloads.
- Concurrency (1→64 clients): Spark's throughput rose slightly but abort rates rose with client count — including *read-only* YCSB-C aborts (traced to an internal Spark issue). LV[R] had zero aborts and higher throughput, especially when bundling operations into one transaction (fewer version assignments); but write-heavy workloads (A, F) lost throughput at high concurrency due to commit-time redos — guidance: fewer ops per transaction as write intensity rises.
- 8-client mixed: LV[R] faster but more variable (marker-acquisition failures, clean-ups, retries); LV[I] slower overall but stabilized reads (conflicts only with extremely outdated versions).
- LV[CT] table scaling: commit latency flat at ~1s up to 32 tables (64 threads, 2 threads/table), linear beyond — the prototype's thread budget, not a protocol limit.
- CAB-LV: best reads = plain Delta Lake or LV[I]; best writes = LV[DL] (single-query), LV[R] (single-table), LV[R,CT] (multi-table); all features together = worst.
- Request accounting: LV[CT] adds exactly 1 write + 5 reads per accessed table; LV[I] adds the fewest requests (skippable for read-only in WriteSerializable mode).
- Crucially: "the effects were only noticeable because we isolated the metadata operations. If we also account for data loading, then the observable effects are minimal" — at GSE scale, the overhead vanishes into I/O.

## 8. Code / data availability
YCSB-LH public (github.com/goetztj/YCSB-LH). LV prototype itself not released as OSS in the paper. CAB/TPC-DS/TPC-H are public benchmarks.

## 9. Leakage & limitations
- Adversarial: the LV prototype is a standalone C++ client, not a full engine integration — TPC-DS numbers are explicitly a lower bound ("cannot fully orchestrate query execution or replicate Spark's task concurrency"). Overhead percentages are vs a thin client, not vs production Spark.
- LV[CT]'s 32-table knee is a prototype thread-budget artifact; production numbers would differ.
- No failure-injection testing of the recovery path itself (markers/sublogs under client crash are argued, not measured).
- 2025 paper, pre-production prototype; Delta's own commit-owner work (Jain 2024) is the competing production path — the paper honestly discusses it (commit owners: better in-vendor performance, unknown out-of-sync behavior, single-vendor limitation).
- Snapshot isolation vs serializability choice is per-transaction — powerful but a footgun if misconfigured.

## 10. GSE overlap
No duplication. This is the transactional capstone of the lane: 2026 (lake design) → 2027 (bench) → 2028 (format choice) → 2029 (array storage) → 2030 (maintenance) → 2031 (streaming option) → 2032 (resiliency) → 2033 (tuning) → 2034 (evaluation method) → 2035 (multi-table atomicity). Pairs directly with 2031's frozen-prefix contract and 2032's chaos suite.

## 11. GSE implementation spec
GSE's weekly build writes multiple tables (play features, team features, labels, metadata/run registry). The failure mode this paper names — partial commit across tables — is GSE's real consistency risk (training on features from week N with labels from week N−1). Adopt the lightweight form:
1. **Atomic multi-table build commit:** implement LV's marker idea in 20 lines — the build writes all tables' new snapshots, then flips one atomic manifest file (a JSON version pointer, PUT-if-absent) that the training path reads. If the build dies mid-way, the manifest still points at the last good version (LV[R]'s recovery semantics, minus the sublog machinery — GSE is single-writer, so full LV is unnecessary).
2. **Reader isolation:** the serving/training path reads only through the manifest pointer (LV[I]'s global-version-log idea, degenerate single-entry form) — never direct table reads. This is also the frozen-prefix contract from 2031 made concrete.
3. **Per-path guarantee choice:** training reads = snapshot isolation via manifest (cheap); serving reads = the same manifest; ad-hoc analysis = direct reads allowed (documented as unprotected, matching the paper's per-transaction modularity).
Effort: small — one manifest file + read-path discipline + a chaos test (2032's kill-mid-write test now has an exact expected behavior: manifest unchanged).

## 12. Reproducible test
Simulate a partial build: write new feature snapshots for week N to two of three tables, kill the process before the manifest flip; assert (a) the manifest still points to week N−1, (b) the training path reproduces the week N−1 snapshot hash exactly, (c) orphaned week-N files are detectable by a sweep (compare files present vs manifest-referenced). Then complete the build and assert the manifest advances atomically.

## 13. Acceptance / rejection gate
ADOPT the manifest pattern iff: (a) the kill-mid-write test passes 10/10 runs (manifest never advances partially); (b) orphan sweep runs clean weekly with zero false positives for 4 weeks; (c) manifest-flip + read-path change adds < 1% to build wall-clock (paper's overhead was 2–2.5% on a thin client; GSE's I/O-dominated build should see less). REJECT full LakeVilla adoption (LV[CT]/LV[I] machinery) — GSE's single-writer discipline makes it unnecessary; the manifest captures 95% of the value.

## 14. Improvement experiment
The paper's open question is LV vs Delta commit owners in production. GSE can contribute the small-scale data point: run the manifest pattern for one full season (18 weeks), log every build's commit latency and every orphan-sweep result, and publish the operational record — the first public "multi-table atomicity at small-team scale" report, complementing the paper's enterprise numbers. One season of passive logging, one blog-post-grade artifact for the Sports repo.
