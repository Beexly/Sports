# RD20-03: Scenario Lab

Status: R&D handoff
Priority: P0
Horizon: User value
Owner mode: Modeling + interactive product

## Strategic Thesis

Scenario Lab should let users safely manipulate uncertain football states and see how the model responds. This turns raw data into an interactive thinking surface.

## Why This Matters Now

Static rankings and projections are commodities. Interactive scenario control gives users a reason to trust, explore, save and upgrade.

## Competitor Pressure

SaberSim and Run The Sims sell simulation-first workflows; optimizer tools expose sliders and rules. GSE can make scenario reasoning visible across fantasy, DFS and betting-adjacent context.

## Current Repo Anchors

- docs/brain/ask-the-brain.md
- docs/product/game-room-spec.md
- docs/research/gse-product-signal-map.md
- packages/prediction-engine/src

## External Sources

- [nflverse](https://nflverse.nflverse.com/) - Open NFL historical data ecosystem for modeling and replay.
- [National Weather Service API](https://www.weather.gov/documentation/services-web-api) - Primary U.S. weather source for game weather and alerts.
- [NFL injuries](https://www.nfl.com/injuries/) - Official injury designation reference surface.
- [SaberSim NFL optimizer](https://www.sabersim.com/nfl/optimizer) - Simulation-first optimizer and game script benchmark.
- [Run The Sims](https://www.runthesims.com/) - Sim-first DFS and optimizer reference.

## Product Surfaces

- Game scenario page
- Player impact panel
- Weather/injury/market toggles
- Saved scenarios
- Founder model sensitivity lab

## Data Inputs

- Baseline world state
- scenario overrides
- feature dependency graph
- model output deltas
- confidence bands
- source provenance

## R&D Questions

- Which toggles are safe and meaningful at MVP?
- How do we distinguish user hypothetical from verified source state?
- How do scenario outputs avoid becoming betting advice?
- What assumptions must be rendered with every result?

## MVP Plan

1. Docs-only scenario state schema
2. Fixture demo for injury/weather/line toggles
3. Result delta format
4. Copy rules for hypothetical mode

## V1 Plan

1. Server-side scenario evaluator for selected games
2. Saved scenario objects
3. Side-by-side baseline vs scenario UI
4. Pro gating

## V2 / Moat Plan

1. Portfolio scenario stress test
2. User watchlist triggers from scenario thresholds
3. Backtest scenario sensitivity
4. Team/player-level scenario graphs

## Claude Build Tasks

1. RD20-03-01: Create ScenarioState and ScenarioOverride type spec
2. RD20-03-02: Define allowed MVP toggles and forbidden toggles
3. RD20-03-03: Build fixture examples showing baseline vs scenario deltas
4. RD20-03-04: Draft Pro Scenario Lab UI spec
5. RD20-03-05: Add tests that scenario output is labelled hypothetical

## Acceptance Criteria

- Scenario output never overwrites verified state
- Every scenario includes changed assumptions
- Hypothetical data is visually and structurally distinct
- Public copy never says a scenario is a guaranteed outcome

## Risk Register

- Users confusing hypothetical with source truth
- Medical speculation
- Slow interactive performance
- Too many sliders creating toy-like UX

## Metrics To Track

- Scenario saves
- Pro conversion from scenario use
- average toggles per session
- scenario share/export rate

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
