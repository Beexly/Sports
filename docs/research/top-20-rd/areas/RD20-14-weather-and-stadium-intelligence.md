# RD20-14: Weather and Stadium Intelligence

Status: R&D handoff
Priority: P1
Horizon: Signal depth
Owner mode: Data adapters + UI

## Strategic Thesis

Weather should become a source-backed football signal with stadium context, not a decorative icon. Wind, precipitation, temperature, roof state, surface and alerts can change decisions.

## Why This Matters Now

Weather is free, high-signal in specific games and easy for users to understand. It also demonstrates the world-model concept cleanly.

## Competitor Pressure

DFS optimizers often include weather. GSE can go deeper with stadium-specific interpretation and scenario toggles.

## Current Repo Anchors

- docs/research/gse-nfl-signal-taxonomy.md
- docs/data/source-provider-module-taxonomy.md
- packages/data-ingestion/src

## External Sources

- [National Weather Service API](https://www.weather.gov/documentation/services-web-api) - Primary U.S. weather source for game weather and alerts.
- [nflverse](https://nflverse.nflverse.com/) - Open NFL historical data ecosystem for modeling and replay.
- [web.dev Interaction to Next Paint](https://web.dev/inp/) - Current responsiveness standard and lifecycle interaction metric.

## Product Surfaces

- Game card weather module
- weather alert watchlist
- kicking/pass/run impact labels
- Scenario Lab weather toggle
- cockpit weather source health

## Data Inputs

- stadium coordinates
- roof/surface metadata
- NWS forecast/gridpoint data
- forecast update time
- manual overrides
- game start time

## R&D Questions

- Which stadium metadata is canonical?
- How should roof closure be represented?
- Which weather thresholds matter by position/game type?
- What is the fallback for non-U.S. or missing NWS data?

## MVP Plan

1. Stadium weather schema
2. NWS adapter spec
3. threshold taxonomy
4. fixture weather cards

## V1 Plan

1. Weather snapshot ingestion
2. game weather module
3. weather delta events
4. scenario weather overrides

## V2 / Moat Plan

1. Historical weather impact calibration
2. position-specific sensitivity
3. weather forecast confidence
4. live nowcast near kickoff

## Claude Build Tasks

1. RD20-14-01: Create stadium metadata fixture list schema
2. RD20-14-02: Draft NWS adapter contract
3. RD20-14-03: Define WeatherImpact rating rules
4. RD20-14-04: Specify roof/manual override workflow
5. RD20-14-05: Create UI states for missing/stale weather

## Acceptance Criteria

- Weather data shows source and retrieved time
- Stale weather is blocked or labelled
- Roof/surface uncertainty is explicit
- No weather impact appears without activated source

## Risk Register

- Wrong stadium coordinates
- roof state not available
- overstating weather effect
- refresh quota or outage

## Metrics To Track

- weather module engagement
- weather delta clickthrough
- forecast staleness incidents
- scenario toggle usage

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
