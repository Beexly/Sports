# RD20-15: Injury and Availability Intelligence

Status: R&D handoff
Priority: P1
Horizon: Signal depth
Owner mode: Official data + claim governance

## Strategic Thesis

Availability is one of the highest-leverage NFL signals, but it is legally and ethically sensitive. GSE should track official status, practice trends, replacement impact and uncertainty without medical speculation.

## Why This Matters Now

Fantasy, DFS, best-ball and betting-adjacent users all care about availability. The product needs strong guardrails before surfacing injury intelligence.

## Competitor Pressure

Fantasy media and tools compete heavily on injury news. GSE can win through official precedence, impact mapping and careful language.

## Current Repo Anchors

- docs/brain/source-hierarchy.md
- docs/research/gse-source-risk-register.md
- docs/performance/sports-science-evidence-vault.md

## External Sources

- [NFL injuries](https://www.nfl.com/injuries/) - Official injury designation reference surface.
- [nflverse](https://nflverse.nflverse.com/) - Open NFL historical data ecosystem for modeling and replay.
- [FantasyPros premium plans](https://www.fantasypros.com/premium/plans/) - Consensus rankings, league sync, draft and DFS premium pattern.

## Product Surfaces

- Player status ribbon
- team unit injury cluster
- replacement impact card
- late-week volatility watch
- claim-card timeline

## Data Inputs

- official injury designations
- practice participation
- team reports
- roster/depth chart
- usage history
- news claims
- source tier

## R&D Questions

- What is official vs reported vs speculative?
- How do we model replacement impact without pretending certainty?
- Which injury details are forbidden?
- How does status change feed optimizer/scenario outputs?

## MVP Plan

1. Availability state machine
2. official-status precedence rules
3. forbidden medical language list
4. fixture player timeline

## V1 Plan

1. Official status ingestion/manual entry
2. practice trend module
3. replacement impact labels
4. watchlist alerts

## V2 / Moat Plan

1. Unit injury cluster model
2. late-swap availability logic
3. historical status-to-usage calibration
4. fantasy league impact

## Claude Build Tasks

1. RD20-15-01: Define AvailabilityState and PracticeTrend types
2. RD20-15-02: Map source precedence and contradiction rules
3. RD20-15-03: Draft medical-speculation copy blocks
4. RD20-15-04: Create replacement impact card spec
5. RD20-15-05: Add tests for injury language guardrails

## Acceptance Criteria

- Official status overrides lower tiers
- Medical diagnosis language is blocked
- Replacement impact is labelled as model estimate
- Every status has source and timestamp

## Risk Register

- Medical speculation
- wrong inactive status
- rumor leakage
- overconfident replacement projections

## Metrics To Track

- availability alert accuracy
- stale injury incident count
- watchlist engagement
- guardrail block count

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
