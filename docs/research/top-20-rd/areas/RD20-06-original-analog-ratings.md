# RD20-06: Original Analog Ratings

Status: R&D handoff
Priority: P1
Horizon: Differentiation
Owner mode: Model vocabulary + design

## Strategic Thesis

GSE needs original ratings that make complex football states readable: Role Stability, Weather Sensitivity, Game Script Leverage, Injury Volatility, Ceiling Pressure, Source Confidence and more.

## Why This Matters Now

Game-style ratings are instantly understandable, but copied sports-game IP is unsafe. Original analogs can become GSE's language and product identity.

## Competitor Pressure

Competitors often display projections, ranks and stars. GSE can create a richer vocabulary if each analog is backed by evidence and not treated as a fake official rating.

## Current Repo Anchors

- docs/research/gse-video-game-analog-signal-map.md
- docs/design/final-wave-design-pattern-register.md
- docs/brand-safety-rules-v2.md

## External Sources

- [nflverse](https://nflverse.nflverse.com/) - Open NFL historical data ecosystem for modeling and replay.
- [NFL injuries](https://www.nfl.com/injuries/) - Official injury designation reference surface.
- [National Weather Service API](https://www.weather.gov/documentation/services-web-api) - Primary U.S. weather source for game weather and alerts.

## Product Surfaces

- Player cards
- game cards
- optimizer columns
- scenario lab
- weekly briefing
- Founder formula notebook

## Data Inputs

- source-backed features
- scaling function
- confidence band
- activation state
- historical calibration

## R&D Questions

- Which analog ratings are valuable and legally original?
- How are ratings scaled and calibrated?
- Which ratings are public vs founder-only?
- How do ratings degrade when data is stale?

## MVP Plan

1. Analog rating dictionary
2. formula documentation placeholder
3. fixture cards
4. brand-safety language rules

## V1 Plan

1. Activated ratings from available data
2. rating confidence bands
3. trend arrows
4. source drawer

## V2 / Moat Plan

1. Custom user-weighted analog views
2. historical analog search
3. best-ball-specific ratings
4. portfolio risk ratings

## Claude Build Tasks

1. RD20-06-01: Create analog rating glossary with allowed names
2. RD20-06-02: Define AnalogRating type and display contract
3. RD20-06-03: Classify each rating by source dependency and activation state
4. RD20-06-04: Write copy rules blocking Madden/EA/trade-dress language
5. RD20-06-05: Design compact rating UI component spec

## Acceptance Criteria

- No external game rating names/assets copied
- Every rating has formula status and source dependency
- Shadow ratings cannot affect public scores
- Ratings render confidence and stale state

## Risk Register

- IP/trade dress risk
- toy-like perception
- formula leakage
- over-precision

## Metrics To Track

- rating comprehension in user testing
- source drawer opens
- rating-driven watchlist adds
- Pro conversion from analog modules

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
