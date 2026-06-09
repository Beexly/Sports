# RD20-07: Live Slate Command Center

Status: R&D handoff
Priority: P1
Horizon: Game-day habit
Owner mode: Ops + premium UI

## Strategic Thesis

The live slate view should be the game-day nerve center: what changed, what is locked, what is stale, what needs action and what is safe to ignore.

## Why This Matters Now

High-frequency Sunday usage can become the product's strongest habit. But it must be fast, stable and source-aware under time pressure.

## Competitor Pressure

Optimizer and sportsbook products win game-day attention with alerts, late swap and live odds. GSE can win with unified context and less noisy prioritization.

## Current Repo Anchors

- docs/product/live-war-room-spec.md
- docs/cockpit-spec.md
- apps/web/app/cockpit
- workers/data-refresh/src/index.ts

## External Sources

- [The Odds API](https://the-odds-api.com/liveapi/guides/v4/) - Current repo odds provider and market data reference.
- [National Weather Service API](https://www.weather.gov/documentation/services-web-api) - Primary U.S. weather source for game weather and alerts.
- [NFL injuries](https://www.nfl.com/injuries/) - Official injury designation reference surface.
- [web.dev Interaction to Next Paint](https://web.dev/inp/) - Current responsiveness standard and lifecycle interaction metric.

## Product Surfaces

- Sunday command center
- late-swap module
- alerts queue
- operator cockpit view
- mobile action feed

## Data Inputs

- scheduled games
- SourceSnapshot status
- ChangeEvent feed
- weather alerts
- injury inactive lists
- odds refreshes
- user watchlists

## R&D Questions

- What is the minimum live refresh cadence?
- Which events need push vs passive display?
- How do we prevent stale or contradicted data from showing as current?
- What must work on mobile under 200 ms interaction targets?

## MVP Plan

1. Live slate UI spec with fixture data
2. alert severity taxonomy
3. stale data blocking rules
4. mobile-first performance budget

## V1 Plan

1. Live command center route
2. polling or streaming data layer
3. late-swap watch module
4. operator override state

## V2 / Moat Plan

1. Personalized action queue
2. cross-slate portfolio state
3. real-time source health
4. post-slate autopsy link

## Claude Build Tasks

1. RD20-07-01: Create fixture-driven LiveSlateState contract
2. RD20-07-02: Draft mobile command center wire spec
3. RD20-07-03: Specify refresh cadence and stale fallback states
4. RD20-07-04: Add performance budget for interactions and updates
5. RD20-07-05: Define alerts and dismiss/snooze behavior

## Acceptance Criteria

- Live view clearly labels last update time
- Stale data blocks or degrades action language
- Critical interactions have immediate visual feedback
- No hidden formulas or shadow factors leak publicly

## Risk Register

- Performance degradation
- alert overload
- source outage
- dangerous urgency language

## Metrics To Track

- Sunday active users
- alerts acknowledged
- stale state incidents
- INP on live route

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
