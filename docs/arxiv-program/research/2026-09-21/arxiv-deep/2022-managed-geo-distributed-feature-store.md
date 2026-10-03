# [2022] Managed Geo-Distributed Feature Store: Architecture and System Design (arXiv:2305.20077v1)

**Citation:** Li, A., et al. (Microsoft AzureML Feature Store team) (2023). *Managed Geo-Distributed Feature Store: Architecture and System Design*. arXiv:2305.20077v1. URL: https://arxiv.org/abs/2305.20077
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~5,200 words).
**Verdict:** ADAPT
**Rationale:** the reference architecture for GSE's NFL feature store: offline/online consistency, point-in-time joins, and leakage-preventing merge semantics are directly applicable; the Azure-specific managed services must be adapted to GSE's stack.

## 1. Research question
What are the core architectural components of a managed feature store that solves (a) training/inference skew between online (inference) and offline (training) stores, (b) data leakage (target leakage) from future data during training, (c) duplicated/conflicting feature definitions across teams, and (d) cross-region asset sharing with compliance constraints? The paper distills Microsoft's AzureML Feature Store design learnings (authors are the product team).

## 2. Dataset / schema
Not stated in paper — this is a systems-design paper; no empirical dataset, no experiments, no evaluation table. All claims are design assertions from a production system.

## 3. Method / model
Managed feature-store architecture (AzureML Feature Store):
- **Resource model:** feature store = RESTful resource containing feature sets (source + transformation function + materialization policy) and entities (index/key columns shared across feature sets). Assets versioned (immutable properties bump version).
- **Execution modes:** bring-your-own stores, fully managed stores, one-box local dev.
- **Feature calculation:** user UDF `udf(source_df, context) -> feature_df`; output schema must contain index columns, timestamp column, feature columns. Feature window logic: `source_window_start_ts = feature_window_start_ts - source_lookback`; compute on source window, then filter outputs to feature window (Algorithm 1).
- **Materialization:** one-time backfill + scheduled incremental materialization; scheduler tracks data state (not-materialized/materialized per window) and job state (queued/running, windows covered); concurrent jobs must not have overlapping feature windows.
- **Storage:** metadata store (assets + runtime state), online store (Redis, low-latency), offline store (ADLS Gen2 / Delta tables, high-throughput).
- **Hub-and-spoke:** feature store = hub, ML workspaces = spokes; assets shared across subscriptions/regions.
- **DSL query optimization:** for DSL-defined transforms (e.g., rolling-window aggregations), the feature store optimizes the aggregation from join results instead of treating the UDF as a black box.
- **Context-aware scheduling:** backfills suspended/resumed around scheduled materializations; region failover with resume-from-checkpoint.
- **Feature-model lineage:** dedicated subsystem tracking lineage at hundreds-of-features scale, cross-region.

## 4. Equations & assumptions
Section 4.5 gives the storage-consistency semantics (equations (1) and (2) in the paper):
- Offline store: keeps every record for each ID (combo) keyed on `(event_timestamp + creation_timestamp)`.
- Online store: keeps the latest record for each ID (combo), assuming TTL satisfies `max(tuple(event_timestamp, creation_timestamp))`.
- Merge logic (Algorithm 2): offline — insert iff key `(IDs + event_timestamp + creation_timestamp)` does not exist, else no-op (dedupe preserves history); online — override iff `new event_timestamp > existing`, or equal event timestamps and `new creation_timestamp > existing`, else no-op. Explicit assumption: "Assuming that there is no failure of dumping the calculated Feature Set records into offline/online store" and ignoring compute-to-store latency; failures are handled by retry to eventual consistency.
- Leakage-prevention rule (§4.4): for an observation event at ts₀, retrieval uses only feature values from the past of ts₀, taking the nearest past value while accounting for expected source/feature data delay.
- No empirical equations; "no equations stated" otherwise. No experimental assumptions validated.

## 5. Features / target
N/A (systems paper; no ML task). The "features" here are feature-store features (e.g., `30day_transactions_sum`), not model inputs for an evaluated task.

## 6. Validation design
Not stated in paper — no experiments, no splits, no baselines, no metrics. The design is asserted from production experience. Several components (§3 intro) are explicitly marked "aspirational... not formally implemented in the AzureML Feature Store at the time this paper is published."

## 7. Numerical results / baselines
None. The paper reports zero numbers — no latency, throughput, consistency-lag, or cost figures.

## 8. Code / data availability
None stated. References: Feast (OSS, [3]), Feathr (OSS, [4]), Databricks Feature Store, Vertex AI, Hopsworks, SageMaker, Tecton (commercial).

## 9. Leakage & limitations
- Adversarial note: the paper's own anti-leakage mechanism (§4.4, nearest-past-value with source-delay allowance) is exactly the right primitive — but the paper provides NO validation that it works, no measurements, and no failure-mode analysis. The "assuming no failure" merge-semantics caveat (§4.5.2) is doing real work: eventual consistency under failure relies entirely on retries, and the paper gives no bound on how stale the online store can be while retrying.
- No conflict-free merge spec: concurrent materialization jobs with overlapping windows are forbidden by the scheduler rather than handled by the merge — so the scheduler is a single point of correctness, but its implementation is not described.
- Aspirational components (§3) are not implemented — the paper does not clearly mark which sections are aspirational; the reader must treat the whole design as part-built.
- External validity to NFL: the architecture is sport-agnostic; the hardest NFL-specific bits (point-in-time joins over as-of odds feeds, roster/lineup event timestamps, NGS re-runs that retroactively change "event" values) are not addressed — those map to the creation_timestamp/event_timestamp duality, which the paper gives but does not stress-test.
- For GSE: the "offline keeps everything, online keeps latest-by-(event,creation) tuple" semantics is precisely what GSE needs, but GSE's live-prediction path additionally needs deterministic replay of "what the online store held at kickoff time," which requires snapshotting, not just eventual consistency.

## 10. GSE overlap
No duplication. `/home/hatch/workspace/arxiv-sweep/existing-research-map.md` contains no feature-store, MLOps, or data-infrastructure entries, and no ledger in `docs/research/2026-09-21/arxiv-deep/` addresses feature stores as infrastructure. GSE's current pipeline (engine predictions DB in Neon Postgres per 2026-09-13 memory; nflverse/FTN ingestion scripts in the Sports repo) has no centralized feature layer: training and live-prediction features are computed by separate code paths, which is exactly the train/serve-skew failure mode this paper exists to kill. This lane is greenfield — ADAPT as new capability, not extension.

## 11. GSE implementation spec
Build a GSE Feature Store (Feast + Delta Lake, not AzureML — adaptation):
1. **Offline store:** Delta tables on object storage keyed `(entity_id, event_timestamp, creation_timestamp)`; entities: `player_id`, `team_id`, `game_id`, `week_season`.
2. **Online store:** Redis (single AZ, failover not geo) holding latest `(event_ts, creation_ts)` per entity — Algorithm 2 merge semantics ported verbatim.
3. **Feature sets (initial):** QB efficiency rollups (pass EPA, CPOE, success rate over trailing 4/8/17 weeks with `source_lookback` ≥ 17 weeks), OL/DL pressure rates, team pace & pass-rate-over-expected, market features (spread/CLV movement from The Odds API, line-opened timestamps as event_timestamp), weather.
4. **Point-in-time joins:** every training row joins features as-of `ts₀ - feature_delay`; enforce the §4.4 nearest-past rule in the retrieval path, with per-source delay configs (NGS re-runs: 48h delay; odds: 0 delay).
5. **Materialization scheduler:** nightly incremental jobs + on-demand backfills; scheduler tracks data-state/job-state per (§3.1.1); concurrent backfills over overlapping windows forbidden.
6. **Lineage:** record (feature_set_version → model_version → prediction_id) for every published pick, satisfying the "every pick public, every result posted" audit mandate.
7. Effort: ~3-4 weeks for Feast+Delta skeleton + 3 feature sets; serving parity is the hard part.

## 12. Reproducible test
Backfill the QB-efficiency feature set for 2023–2025 seasons from nflverse; run the store's point-in-time retrieval for every Week 1–18 game (observation ts = kickoff), and compare against features recomputed directly from raw play-by-play in a separate script. Metrics: (a) feature-value equality (100% required — any mismatch = retrieval bug), (b) simulated-online parity: features served from Redis vs offline table must be identical row-for-row (any divergence = skew bug), (c) end-to-end: retrain the v5.2.7 spread model on store-joined features and confirm out-of-sample log-loss within ±0.5% of the baseline trained on hand-joined features (proves no leakage introduced).

## 13. Acceptance / rejection gate
ADOPT the design iff: (i) point-in-time retrieval reproduces hand-computed features exactly (100% row equality) on the 2023–2025 replay, AND (ii) Redis-online vs Delta-offline parity holds at 100% over a one-week simulated serving window, AND (iii) model retrained on store features shows no test-window log-loss degradation beyond 0.5% absolute. REJECT (redesign the retrieval layer) if any mismatch appears. Serving p99 latency gate: Redis point lookups ≤ 50ms p99 during the simulated Sunday window (per the lane's standing gate).

## 14. Improvement experiment
Beyond the paper: snapshot-based deterministic replay — after each materialization, write a content-addressed snapshot manifest (entity_id → (event_ts, creation_ts, sha)) so GSE can re-serve the exact feature values any past pick saw, giving auditors (and Garrett's public record) a byte-exact "what the model knew at kickoff" proof. The paper's eventual-consistency model cannot answer "what did the online store hold at time T" — the snapshot manifest can, at the cost of one extra write per materialization job.
