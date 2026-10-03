# Synthetic Partner Schemas

No real partner data is represented here.

## GSE Table

- fixture_id
- public_event_type
- event_timestamp
- model_uncertainty_bucket
- source_freshness_bucket
- role_shock_bucket
- data_quality_bucket

## Media / Content Partner Table

- fixture_id
- content_segment
- aggregate_impressions_bucket
- aggregate_engagement_rate

## DFS / Fantasy Partner Table

- fixture_id
- roster_segment
- aggregate_roster_change_rate
- aggregate_entry_count_bucket

## Sportsbook / Operator Partner Table

- fixture_id
- market_segment
- aggregate_movement_bucket
- aggregate_handle_bucket

## Sports Data Provider Table

- fixture_id
- coverage_segment
- aggregate_latency_bucket
- aggregate_completeness_rate

## Required Shared Constraints

- no user identifiers
- no raw row-level partner records
- no export below privacy threshold
- allowed aggregate outputs only
