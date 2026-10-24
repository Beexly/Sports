# Truth Scoring And Conflict Resolution

As of: 2026-06-09

## Fact Types

team assignment, roster status, jersey number, position, height, weight, age/DOB, college, experience, depth chart role, injury/practice status, transaction status, coach role, staff role.

## Fact Fields

canonical_value, confidence_score 0-100, truth_status, source_count, official_source_count, latest_source_at, conflict_count, stale_source_count, evidence_ids.

## Truth Status Values

CONFIRMED, OFFICIAL_ONLY, MULTI_SOURCE_CONFIRMED, CONFLICTED, STALE, UNSOURCED, UNKNOWN, NEEDS_REVIEW.

## Scoring Inputs

source authority, freshness, independent agreement, transaction recency, field volatility, source coverage, parser confidence, known source lag, historical consistency, and founder/admin-approved manual override.

## Minimum Public Display Rules

- Team assignment: official source OR two independent current sources OR recent official transaction evidence.
- Roster status: official roster/status source OR current official transaction/injury evidence.
- Jersey number: official/team source preferred; otherwise lower confidence.
- Coach/staff role: official team source or official media guide preferred.
- Trainer/staff info: public official/professional source only.
- Conflicted facts: do not silently display as confirmed.
- Stale facts: warn internally or hide/qualify publicly.

