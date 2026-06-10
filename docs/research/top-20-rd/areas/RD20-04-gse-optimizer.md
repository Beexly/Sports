# RD20-04: GSE Optimizer

Status: R&D handoff
Priority: P0
Horizon: Revenue wedge
Owner mode: DFS/fantasy tooling

## Strategic Thesis

The optimizer should be a product surface powered by the world model, not the whole company. Its differentiator is provenance, scenario awareness, source freshness and explanation.

## Why This Matters Now

The optimizer market is crowded but user expectations are clear: salary import, locks, excludes, stacks, exposures, ownership, custom projections, export and late swap.

## Competitor Pressure

RotoGrinders, FantasyCruncher, FTN, FantasyPros and Footballguys set baseline controls. SaberSim and Run The Sims set sim expectations. Free tools set acquisition expectations.

## Current Repo Anchors

- docs/research/gse-nfl-optimizer-competitor-inventory.md
- docs/research/gse-nfl-optimizer-pattern-analysis.md
- apps/web
- packages/prediction-engine/src

## External Sources

- [RotoGrinders LineupHQ](https://rotogrinders.com/lineuphq) - DFS optimizer benchmark for exposures, stacks and ownership.
- [SaberSim NFL optimizer](https://www.sabersim.com/nfl/optimizer) - Simulation-first optimizer and game script benchmark.
- [FantasyCruncher FAQs](https://www.fantasycruncher.com/help/faqs) - Custom projection, lock, exclude and optimizer controls.
- [FTN tools](https://ftnfantasy.com/tools) - Competitor suite pattern for fantasy, DFS and betting tools.
- [FantasyPros premium plans](https://www.fantasypros.com/premium/plans/) - Consensus rankings, league sync, draft and DFS premium pattern.

## Product Surfaces

- Free quick optimizer
- Pro optimizer with saved lineups
- Elite portfolio simulator
- CSV import/export
- Late-swap delta panel

## Data Inputs

- User-uploaded salary CSV
- site scoring rules
- GSE projections
- ownership if licensed/available
- injury/weather/market features
- scenario overrides

## R&D Questions

- Which DFS sites are MVP without scraping?
- What optimizer library is acceptable for constraints?
- How do we separate fantasy utility from wagering advice?
- What features are free vs Pro vs Elite?

## MVP Plan

1. CSV parser spec for user-provided files
2. Constraint model spec
3. Optimizer feature matrix
4. No-scrape compliance checklist

## V1 Plan

1. Single-lineup optimizer with locks/excludes
2. Projection provenance labels
3. Basic stack rules
4. CSV export

## V2 / Moat Plan

1. 150-lineup generation
2. ownership/leverage if licensed
3. late swap
4. contest portfolio simulation
5. scenario-aware optimizer

## Claude Build Tasks

1. RD20-04-01: Create salary CSV import spec with validation errors
2. RD20-04-02: Define OptimizerInput and OptimizerLineup interfaces
3. RD20-04-03: Write docs for supported roster/scoring constraints
4. RD20-04-04: Create UI wire spec for lock/exclude/exposure controls
5. RD20-04-05: Add compliance checklist blocking platform scraping

## Acceptance Criteria

- Optimizer accepts only user upload or approved provider data
- Every projection has source/version/freshness
- Generated lineups are reproducible from stored input hash
- Free tier caps output without hiding legal/source warnings

## Risk Register

- Terms violations from scraping
- Overpromising edge
- Slow combinatorial generation
- Incorrect scoring constraints

## Metrics To Track

- CSV import success rate
- lineups generated
- free-to-Pro optimizer conversion
- late-swap retention

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
