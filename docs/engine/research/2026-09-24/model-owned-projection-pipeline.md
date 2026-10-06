# Model-Owned Projection Pipeline

Generated 2026-09-25T04:51:54Z from Firecrawl research. This is the durable architecture for
replacing illustrative DFS constants with real, versioned, calibrated projections.

## Design principle

The model owns the projection; sources own observations; the contest engine owns constraints; the evidence layer owns explanation; the registry owns promotion. Do not let a source, heuristic rank, LLM narrative or optimizer silently become the projection.

## Pipeline steps

### Step 1. Decision spine and identity

- **Input:** sport, league, game/event, contest/slate, player/team/official/venue identities
- **Output:** resolved canonical entities and effective-dated relationships
- **Notes:** 

### Step 2. Immutable observation ledger

- **Input:** raw provider responses, official reports, odds/lines, salaries, news, weather, tracking and user/league inputs where consented
- **Output:** append-only SourceSnapshot and Observation records
- **Notes:** 

### Step 3. Point-in-time feature materialization

- **Input:** observations and feature definitions at a decision timestamp t0
- **Output:** FeatureSnapshot keyed by entity, slate/game, t0, feature-set version and rights state
- **Notes:** 

### Step 4. Role and availability state model

- **Input:** injury/availability reports, depth charts, transactions, lineups, rotations, historical role and coach/team context
- **Output:** availability probability, expected minutes/snaps/plate appearances, role distribution and scenario states
- **Notes:** 

### Step 5. Sport-specific hierarchical distribution model

- **Input:** PIT FeatureSnapshot plus role state, market priors and historical labels
- **Output:** joint player/team/game distributions and conditional scenario forecasts
- **Notes:** 

### Step 6. Calibration and uncertainty wrapper

- **Input:** raw probabilities/distributions and held-out calibration residuals
- **Output:** calibrated probabilities, quantiles/intervals, coverage estimate, sharpness and refusal state
- **Notes:** 

### Step 7. Ownership and contest decision layer

- **Input:** calibrated player distributions, ownership distribution, salaries, contest rules, field size, payout curve and user constraints
- **Output:** expected fantasy points, percentile outcomes, leverage, duplication-adjusted utility, lineup set and risk metrics
- **Notes:** 

### Step 8. Evaluation and promotion

- **Input:** sealed historical replay, live shadow predictions, realized labels/settlements and baseline predictions
- **Output:** EvaluationReceipt plus champion/challenger decision
- **Notes:** 

### Step 9. Serving and evidence publication

- **Input:** promoted ProjectionRun/LineupRun and evidence graph
- **Output:** customer payload with projection, uncertainty, freshness, factors, source lineage, counter-evidence, limitations and gate state
- **Notes:** 

### Step 10. Monitoring, feedback and retraining

- **Input:** source health, feature/prediction drift, user feedback, delayed labels, settlement outcomes, optimizer results and incident logs
- **Output:** alerts, recalibration/retraining proposals, model rollback/kill decisions and a controlled feedback dataset
- **Notes:** 

## Minimum durable schema

- **CanonicalEntity**: provider-neutral sport-scoped identity and effective-dated alias/crosswalk state
- **SourceSnapshot**: immutable raw input with timing, rights, parser and hash provenance
- **FeatureDefinition / FeatureSnapshot**: versioned, point-in-time materialized inputs and missingness state
- **LabelDefinition / LabelObservation**: outcome/settlement semantics, score rules and revisions
- **ModelArtifact / ModelVersion / ModelPromotion**: immutable model package, registry metadata, approval and rollback lineage
- **PlayerProjection / ProjectionDistribution**: model-owned point and distribution forecasts for a decision timestamp
- **OwnershipProjection**: selection probability and uncertainty kept separate from performance probability
- **ContestSlate / ContestRule / SalarySnapshot / PlayerEligibility**: reconstructable contest state and constraints
- **OptimizationRun / Lineup / LineupSlot**: reproducible contest decision with seed, constraints, simulation and model versions
- **EvaluationReceipt / EvidenceArtifact**: promotion proof and customer/operator explanation

## Model output contract

- **required_fields:** ['entity_id', 'sport', 'league', 'event_id', 'decision_time', 'projection_run_id', 'model_version_id', 'feature_snapshot_id', 'availability_probability', 'role_state', 'mean', 'median', 'quantiles', 'floor', 'ceiling', 'probability_over_threshold', 'calibration_version', 'interval_coverage_target', 'interval_width', 'missing_features', 'stale_features', 'rights_state', 'evidence_ids', 'gate_state']
- **citation_urls:** ['https://raw.githubusercontent.com/Beexly/Sports/main/handoff/FANTASY_DATA_LAUNCH_BLOCKERS.md', 'https://raw.githubusercontent.com/Beexly/Sports/main/docs/evidence-engine.md', 'https://scikit-learn.org/stable/modules/calibration.html']

## What not to do

- Do not train on latest tables without as-of/created-at filtering.
- Do not call manual illustrative constants model-owned projections.
- Do not blend probability, edge, rank, confidence, ownership and narrative into one unexplained number.
- Do not activate a source because it is publicly visible; rights and redistribution are separate gates.
- Do not treat tests, fixtures, or a backtest harness as historical proof until sealed point-in-time replay and evaluation receipts exist.
- Do not use sensitive health/wearable/cognitive data without consent, minimization, purpose limitation and access controls.

## Citations

- https://docs.feast.dev/getting-started/concepts/point-in-time-joins
- https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/fantasy/dfs-slate.ts
- https://raw.githubusercontent.com/Beexly/Sports/main/packages/data-ingestion/src/source-registry.ts
- https://raw.githubusercontent.com/Beexly/Sports/main/packages/prediction-engine/src/backtest/harness.ts
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/

