# Integration Sprint Plan (S0–S7)

Generated 2026-09-25T04:51:54Z from Firecrawl research against Beexly/Sports (Galaxy Sports Edge).

## Objective

Move from an impressive, safety-gated market-pick platform with illustrative DFS surfaces to a real, model-owned fantasy/prediction data product whose projections are reproducible, calibrated, contest-aware, rights-cleared and explainable.

## Ordering principle

Do not add more signal breadth until identity, point-in-time availability, durable model artifacts and evaluation receipts are real; otherwise extra feeds increase apparent sophistication without increasing trustworthy accuracy.

## Phased build sequence (first-pass)

### 0. Freeze truth and rights

**Why:** The repo already has clearance/source-graph concepts but documents gaps between candidate and active sources and between registries.

**Citation:** https://raw.githubusercontent.com/Beexly/Sports/main/docs/source-atlas.md

**Deliverables:**

- source registry with rights/status/contract/attribution
- single point-in-time event schema
- source conflict and freshness rules
- sensitive-data boundary
- provider health/coverage monitoring

---

### 1. Make fantasy data real

**Why:** The fantasy blocker identifies single-source ADP, unwired rankings and manual projections as the largest product gaps.

**Citation:** https://raw.githubusercontent.com/Beexly/Sports/main/handoff/FANTASY_DATA_LAUNCH_BLOCKERS.md

**Deliverables:**

- second ADP source
- scheduled ADP/rankings ingestion
- official salary/slate/contest feeds
- player identity/crosswalk service
- role/depth-chart/injury timeline
- versioned feature snapshots

---

### 2. Build model-owned projections

**Why:** The current DFS surface is deterministic and transparent but its shipped slate is illustrative; production scores require a trained, persisted model.

**Citation:** https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/fantasy/dfs-slate.ts

**Deliverables:**

- sport-specific projection heads
- hierarchical/partial-pooling player-team model
- distributional output not only point projections
- ownership and leverage model
- simulation-based lineup optimizer using real slates
- model registry and reproducible training

---

### 3. Prove calibration and edge

**Why:** The current state is explicitly not PROVEN and the architecture prioritizes a calibration-first head and honest abstention.

**Citation:** https://raw.githubusercontent.com/Beexly/Sports/main/docs/ops/CURRENT_STATE.md

**Deliverables:**

- purged game-grouped walk-forward
- sealed holdout
- market-only baseline
- Brier/log-loss/ECE/reliability/coverage
- closing-line and same-book CLV
- drift and subgroup reports
- promotion/kill gates

---

### 4. Add high-value context in shadow first

**Why:** The signal architecture says narrative/incentive/beat signals should be capture-first and withhold-only until as-of logs exist.

**Citation:** https://raw.githubusercontent.com/Beexly/Sports/main/docs/architecture/2026-09-18-signal-architecture.md

**Deliverables:**

- official injuries/transactions
- weather/venue/travel/time-zone
- tracking/video only under contract
- news/beat signals with timestamps
- health/wearable signals only with consent
- social signals with bot/manipulation controls

---

### 5. Productize evidence

**Why:** The gap audit states premium UX must explain trust, coverage, conflicts and missing data quickly.

**Citation:** https://raw.githubusercontent.com/Beexly/Sports/main/docs/statking-gap-audit.md

**Deliverables:**

- per-pick evidence graph
- source freshness/conflict cards
- why/why-not explanation
- uncertainty intervals
- abstention and missing-data state
- public performance only after gates pass

---

## Sprints (second-pass refined)

### S0 — Truth, identity and rights freeze

*First implementation sprint; complete before training a production fantasy model.*

**Deliverables:**

- Canonical sport-scoped entity IDs and provider-ID crosswalks with effective dates, aliases, resolution confidence and quarantine states.
- Immutable raw SourceSnapshot plus source_as_of, fetched_at, available_at/created_at, correction lineage, parser version, raw hash, rights snapshot and license status.
- Separate technical ingestion from cleared-for-training and cleared-for-customer publication states.
- Fail-closed paid-data governor in production; explicit emergency mode with hard ceiling and audit receipt.
- Production observability contract: source, worker, model, data-build and prediction-run IDs on logs/traces.

---

### S1 — Durable fantasy slate and contest plane

*Second implementation sprint; start with one sport and one contest family.*

**Deliverables:**

- Contest, ContestSlate, ContestRule, SalarySnapshot, PlayerEligibility, RosterSlot, ProjectionRun, Lineup and LineupSlot entities.
- Real contest/slate/salary/roster-slot ingestion with lock time, scoring rules, late-swap rules and source lineage.
- Canonical player/team/game crosswalk and historical effective-dated roles/depth charts.
- Replace fictional/illustrative DFS rows with a clearly blocked empty state until real inputs pass the rights and freshness gate.

---

### S2 — Point-in-time feature and label store

*Third implementation sprint; build once and reuse across all sports.*

**Deliverables:**

- FeatureDefinition registry with owner, sport, source, rights, event_time, available_at, transform version, missingness policy and kill condition.
- Historical training-set builder that performs event-time plus created/available-time filtering.
- Label ledger with outcome definition, settlement time, scoring-rule version and revision/void handling.
- Feature snapshots keyed by decision timestamp and model/feature-set hash; no live table reads during training.

---

### S3 — Baseline model-owned projections

*Fourth implementation sprint; productionize one sport/position family before broadening.*

**Deliverables:**

- A market-only/role-only baseline and a sport-specific hierarchical model with partial pooling across player, team, opponent, venue and season.
- Separate availability/minutes/role model from per-minute production model; propagate uncertainty from availability and role into stat-line distributions.
- Joint team/game latent variables so player outcomes preserve game totals, shared pace/possessions and teammate/opponent correlation.
- Distributional outputs: median, quantiles, floor/ceiling, variance, probability over thresholds and scenario states—not only a point projection.
- ModelArtifact/ModelVersion registry with artifact hash, code commit, feature schema hash, training window, label schema, calibration version, owner, approval and rollback lineage.

---

### S4 — Calibration, uncertainty and sealed evaluation

*Fifth implementation sprint; no public superiority claim before this gate.*

**Deliverables:**

- Purged, time-ordered train/validation/holdout protocol with season/game/player grouping rules.
- Proper scoring and calibration dashboard: log loss/Brier for probabilities, CRPS or interval score for distributions, reliability/ECE, calibration slope/intercept, sharpness and coverage.
- Time-aware conformal or other uncertainty wrapper with coverage and interval-width diagnostics by sport, position, horizon, contest type and data-quality bucket.
- Benchmark report against market-only, consensus, naive rolling and current deterministic baselines.
- Machine-readable EvaluationReceipt that records dataset snapshot, model artifact, code commit, metrics, confidence intervals, slices, leakage checks and promotion decision.

---

### S5 — Ownership, correlation and contest decision engine

*Sixth implementation sprint; only after S1–S4 produce real distributions.*

**Deliverables:**

- Ownership/selection model with time-sliced training and calibration, separated from player performance probability.
- Contest utility layer using payout structure, entry fee, roster constraints, field size and duplication risk.
- Joint simulation of player outcomes, ownership and opponent-lineup construction; cash, GPP and leverage are separate decision policies.
- Simulation-based optimizer that consumes distributions and covariance, not static proj/ceiling/ownership constants.
- Post-lock result ledger linking lineup, forecast distribution, realized points, rank, payout, duplication and decision rationale.

---

### S6 — High-value signal activation in shadow mode

*Run incrementally after the baseline is stable; activate one factor at a time.*

**Deliverables:**

- Official injuries/transactions/lineups, weather/venue/travel, tactical/event data, officials and role/depth-chart signals with as-of logs.
- One contracted tracking/event source per priority sport, plus lawful public substitutes such as Statcast/NBA tracking/StatsBomb open data where permitted.
- Scenario engine for late scratches, minutes limits, weather changes, travel disruption and lineup changes.
- Narrative/social/news signals captured with timestamps and reliability/bot/manipulation controls; shadow/withhold first, publish only after calibration evidence.
- Sensitive health/wearable/cognitive data isolated behind consent, purpose limitation and access control.

---

### S7 — Production reliability, safety and evidence UX

*Final pre-launch sprint; ship only as independently gated capability flags.*

**Deliverables:**

- Champion/challenger registry, drift dashboards, data-quality tests, source/worker/model SLOs, error budgets, alert ownership and restore/failover evidence.
- Per-projection evidence artifact: source snapshots, timestamps, feature contributions, missingness, interval/coverage, calibration, model version, counter-evidence and correction path.
- Production security gates for object/function authorization, abuse/rate-limit economics, SSRF, API inventory, secrets, SBOM and incident response.
- Privacy, deletion/export/retention, consent and sensitive-data policies; age/geo/responsible-gaming/affiliate controls before money or promotions.
- Public claims compiler that cannot say proven/accurate/superior unless the linked evaluation receipt and current gates pass.

---

