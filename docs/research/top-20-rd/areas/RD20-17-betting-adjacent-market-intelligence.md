# RD20-17: Betting-Adjacent Market Intelligence

Status: R&D handoff
Priority: P1
Horizon: Careful expansion
Owner mode: Market data + compliance

## Strategic Thesis

Market intelligence should explain movement, implied probability, disagreement and context. It should not become guaranteed-profit betting advice.

## Why This Matters Now

Market data is already active through The Odds API. The next value is provider-safe interpretation, not raw odds redistribution.

## Competitor Pressure

Action Network, OddsJam, Outlier, Covers and VegasInsider pull attention with odds, alerts, EV and picks. GSE must be sharper on trust and compliance.

## Current Repo Anchors

- docs/brain/market-gravity.md
- docs/data/source-provider-module-taxonomy.md
- packages/data-ingestion/src/odds-api-client.ts

## External Sources

- [The Odds API](https://the-odds-api.com/liveapi/guides/v4/) - Current repo odds provider and market data reference.
- [Action Network subscriptions](https://actionnetworkhq.zendesk.com/hc/en-us/articles/14456167617805-Subscription-options) - Bet tracking, systems, premium picks and subscription pattern.
- [OddsJam positive EV](https://dev.oddsjam.com/betting-tools/positive-ev) - Odds shopping, EV and alerting competitor reference.
- [Outlier app](https://apps.apple.com/us/app/outlier-betting-data-tools/id6443885102) - Mobile prop research and betting data tool reference.

## Product Surfaces

- Market movement card
- implied probability explainer
- line movement timeline
- market disagreement alert
- cockpit odds source health

## Data Inputs

- odds snapshots
- book/provider metadata
- opening/current line
- timestamp
- market type
- derived probability
- source license constraints

## R&D Questions

- What can be displayed under current provider terms?
- How do we remove vig and explain it safely?
- When is market movement material?
- Which betting terms are forbidden publicly?

## MVP Plan

1. Market signal taxonomy
2. derived-context display rules
3. no-wager copy policy
4. fixture line movement timeline

## V1 Plan

1. Line movement events
2. implied probability context
3. market disagreement alerts
4. source/license labels

## V2 / Moat Plan

1. CLV tracking after sample-size gate
2. multi-provider consensus if licensed
3. portfolio impact
4. market anomaly model

## Claude Build Tasks

1. RD20-17-01: Map current odds data to MarketSnapshot contract
2. RD20-17-02: Define public-safe market language
3. RD20-17-03: Create no-vig probability helper spec
4. RD20-17-04: Draft market movement timeline UI
5. RD20-17-05: Add tests blocking trueEV/Kelly/stake copy

## Acceptance Criteria

- Raw odds redistribution respects provider terms
- No Kelly or stake recommendations public
- Market movement is not labelled sharp money without proof
- Every market card has source timestamp

## Risk Register

- Regulatory exposure
- provider rights
- tout language
- overfitting to market movement

## Metrics To Track

- market card engagement
- line movement alert opens
- compliance block count
- source freshness uptime

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
