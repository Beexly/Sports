# RD20-05: Player Intelligence Cards

Status: R&D handoff
Priority: P1
Horizon: User value
Owner mode: Entity graph + UI

## Strategic Thesis

A player card should be a living dossier, not a stat block. It should explain role, health, usage, matchup, volatility, trend, analog ratings and current delta.

## Why This Matters Now

Player pages are the natural destination for SEO, fantasy, optimizer, watchlists and subscriptions. They also make the world model legible.

## Competitor Pressure

FantasyPros, Draft Sharks, Footballguys and Outlier win by making player decisions personal and quick. GSE can win with deeper evidence and clearer uncertainty.

## Current Repo Anchors

- docs/brain/entity-graph.md
- docs/brain/fantasy-war-room.md
- docs/performance/player-performance-intelligence.md

## External Sources

- [nflverse](https://nflverse.nflverse.com/) - Open NFL historical data ecosystem for modeling and replay.
- [nflverse data](https://github.com/nflverse/nflverse-data) - Open repository for NFL historical datasets.
- [NFL injuries](https://www.nfl.com/injuries/) - Official injury designation reference surface.
- [FantasyPros premium plans](https://www.fantasypros.com/premium/plans/) - Consensus rankings, league sync, draft and DFS premium pattern.

## Product Surfaces

- Player page
- player drawer in optimizer
- watchlist card
- injury/weather impact card
- draft/best-ball card

## Data Inputs

- canonical player entity
- team/position
- usage history
- injury/practice signals
- matchup
- weather
- market context
- fantasy settings

## R&D Questions

- What are the canonical player sections?
- Which signals can show publicly vs Pro?
- How should unknown data be shown?
- What belongs on mobile first viewport?

## MVP Plan

1. Player card data contract
2. Fixture player cards
3. status/freshness badges
4. watchlist CTA

## V1 Plan

1. Live player page from canonical entities
2. role and availability sections
3. source drawer
4. Pro impact module

## V2 / Moat Plan

1. Personalized fantasy league context
2. best-ball portfolio exposure
3. historical comparable states
4. player timeline replay

## Claude Build Tasks

1. RD20-05-01: Draft PlayerIntelligenceCard data interface
2. RD20-05-02: Create section priority map for mobile and desktop
3. RD20-05-03: Specify public/Pro/Elite field gating
4. RD20-05-04: Add empty/stale/unknown states
5. RD20-05-05: Map source provenance drawer fields

## Acceptance Criteria

- No player card shows fabricated stats
- Unknown is rendered as unknown, not hidden
- Card has source/freshness state per major signal
- Mobile first viewport shows identity, status, delta and primary action

## Risk Register

- Overcrowded cards
- stale injury data
- ranking clone behavior
- player prop compliance spillover

## Metrics To Track

- player page return rate
- watchlist adds
- card-to-upgrade conversion
- source drawer opens

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
