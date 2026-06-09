# RD20-02: What Changed Engine

Status: R&D handoff
Priority: P0
Horizon: Foundation
Owner mode: Signal lifecycle + retention

## Strategic Thesis

The most valuable user question is not 'what is the pick?' It is 'what changed since I last looked, and does it matter?' The delta engine should turn every source refresh into a ranked change event.

## Why This Matters Now

Retention depends on repeat visits. A static projection table dies between slates; a changed-information feed creates daily habit and gives the site a reason to exist outside lineup lock.

## Competitor Pressure

Action Network, OddsJam, Outlier and sportsbooks train users to watch lines and alerts. Fantasy products train users to watch injury/news. GSE should unify all deltas into one intelligent change feed.

## Current Repo Anchors

- docs/brain/signal-ledger.md
- docs/brain/weak-signal-engine.md
- docs/research/nfl-world-state-machine.md
- workers/data-refresh/src/index.ts

## External Sources

- [OpenLineage](https://openlineage.io/) - Open standard reference for pipeline, dataset and run lineage.
- [The Odds API](https://the-odds-api.com/liveapi/guides/v4/) - Current repo odds provider and market data reference.
- [National Weather Service API](https://www.weather.gov/documentation/services-web-api) - Primary U.S. weather source for game weather and alerts.
- [NFL injuries](https://www.nfl.com/injuries/) - Official injury designation reference surface.
- [Braze 2026 Customer Engagement Review](https://www.braze.com/press-releases/the-2026-braze-customer-engagement-review-ai-innovation-meets-the-trust-plateau) - Trust gap and privacy risk in AI-assisted customer engagement.

## Product Surfaces

- Daily What Changed page
- Player card change ribbon
- Game card event timeline
- Watchlist notifications
- Founder-only source diff view

## Data Inputs

- SourceSnapshot hashes
- normalized game/player/team features
- prior feature values
- market line movement
- weather forecast changes
- injury designation deltas

## R&D Questions

- Which changes are material enough to notify?
- How do we rank impact without overclaiming?
- How does a delta connect to one or more user watchlists?
- What is the public-safe language for uncertainty?

## MVP Plan

1. Create normalized ChangeEvent type
2. Generate deltas for odds, weather and injury placeholders
3. Write docs for impact severity rules
4. Render a mock What Changed feed from fixture data

## V1 Plan

1. Persist ChangeEvent records
2. Add watchlist filters and email/in-app digest
3. Connect deltas to player/game cards
4. Add cockpit materiality review

## V2 / Moat Plan

1. Personalized delta ranking
2. AI summarization constrained to change records
3. Slack/Discord/email channel variants
4. Historical delta replay

## Claude Build Tasks

1. RD20-02-01: Define ChangeEvent schema and severity taxonomy
2. RD20-02-02: Create fixture-based delta builder for odds/weather/injury examples
3. RD20-02-03: Draft UI spec for What Changed feed and cards
4. RD20-02-04: Add brand-safety copy rules for delta summaries
5. RD20-02-05: Create analytics events for viewed/saved/dismissed deltas

## Acceptance Criteria

- Every change event links before value, after value, source and timestamp
- No notification can be emitted from Tier 5 or Tier 6 as fact
- Users can filter by team, player, game, market and severity
- The same event can power public, Pro and cockpit renderers

## Risk Register

- Notification spam
- False urgency
- Market movement interpreted as inside information
- LLM summarizer inventing causal links

## Metrics To Track

- D7 return from delta viewers
- watchlist-to-return rate
- delta clickthrough
- notification unsubscribe rate

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
