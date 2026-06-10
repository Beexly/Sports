# RD20-09: Personal Watchlists

Status: R&D handoff
Priority: P1
Horizon: Retention
Owner mode: Personalization + notifications

## Strategic Thesis

Watchlists turn the world model into a personal operating system. Users should follow players, teams, games, weather spots, injuries, markets, best-ball exposures and optimizer lineups.

## Why This Matters Now

Personalized return paths are more durable than generic content. The user should feel the site is monitoring their football world.

## Competitor Pressure

FantasyPros and Draft Sharks use league sync; Action Network and Outlier use alerts/tracking. GSE should unify the same behavior across evidence and scenarios.

## Current Repo Anchors

- docs/brain/fantasy-war-room.md
- docs/product/game-room-spec.md
- apps/web

## External Sources

- [Braze 2026 Customer Engagement Review](https://www.braze.com/press-releases/the-2026-braze-customer-engagement-review-ai-innovation-meets-the-trust-plateau) - Trust gap and privacy risk in AI-assisted customer engagement.
- [Amplitude mastering retention](https://amplitude.com/books/mastering-retention/current-user-retention) - Retention analysis through activation and habit-forming behaviors.
- [NFL injuries](https://www.nfl.com/injuries/) - Official injury designation reference surface.
- [The Odds API](https://the-odds-api.com/liveapi/guides/v4/) - Current repo odds provider and market data reference.

## Product Surfaces

- Watchlist dashboard
- add-to-watch controls
- daily digest
- notification preferences
- scenario trigger alerts

## Data Inputs

- user account
- entity graph refs
- ChangeEvent feed
- notification channel permissions
- entitlement tier
- privacy preferences

## R&D Questions

- What can be watched without account friction?
- How granular should triggers be?
- Which notifications are allowed for Free vs Pro?
- How do we avoid privacy and message-fatigue risk?

## MVP Plan

1. Watchlist data contract
2. fixture add/remove UX
3. digest copy rules
4. privacy and frequency controls

## V1 Plan

1. Account-backed watchlists
2. daily/weekly digest
3. player/game/team triggers
4. basic notification preferences

## V2 / Moat Plan

1. Scenario threshold alerts
2. optimizer lineup watch
3. best-ball exposure watch
4. AI digest constrained to deltas

## Claude Build Tasks

1. RD20-09-01: Define WatchlistItem and WatchTrigger types
2. RD20-09-02: Draft add/remove UI states for cards
3. RD20-09-03: Create notification preference model
4. RD20-09-04: Specify digest generation from ChangeEvent records
5. RD20-09-05: Add privacy guardrails for personalization data

## Acceptance Criteria

- Users can see and delete watched entities
- Every notification has a source event
- Frequency caps exist
- No sensitive personal data used without explicit purpose

## Risk Register

- Notification fatigue
- privacy trust gap
- irrelevant alerts
- account friction killing activation

## Metrics To Track

- watchlist creation rate
- D7 retention by watchlist users
- notification open rate
- unsubscribe rate

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
