# Schema diff — fields these sources expose that the engine does not model

Built 2026-10-28 from the 376 captured payloads. Record-level fields only (keys of objects inside
arrays), so lookup maps and i18n dictionaries do not pollute the result. Compared against the
engine's own vocabulary: every CSV header in `data/gse-dataset/current/` plus every interface field
in `packages/prediction-engine/src`.

**108 football-relevant fields across 17 hosts are not modelled anywhere in the engine.**
Subscription, consent and A/B-test scaffolding is filtered out.

## What this is for

These are the fields the reasoning engine would need to consume to know what these sites know.
Each one is a modelling decision, not a scrape target — the capture proves the field exists and
carries data, not that its semantics are settled.

## By host


### `kalshi.com` — 28 fields

```
dollar_open_interest
eventForecast
eventTicker
eventTitle
event_occurrence_datetime
event_subtitle
event_ticker
event_title
expiration_value
gateValue
headline
leverage_estimate
maximum_value
minimum_value
open_interest
open_interest_contracts_fp
open_interest_fp
rank_score
recent_event_volume
search_score
settlement_value_centicents
structured_target_id
target_datetime
total_event_volume
total_market_count
total_notional_volume
total_series_volume
total_volume
```

### `theathletic.com` — 17 fields

```
additionalValues
algoEverythingSurfaceSuffix
defaultValue
enforcement_level
isDeviceBased
returnValue
subscriptionValueMessage
targetValue
totalDue
totalDueAnnual
totalDueAnnualShort
totalDueFrequency
totalDueMonthly
totalDueMonthlyShort
totalDueShort
totalDueWeekly
totalDueWeeklyShort
```

### `pinnacle.com` — 12 fields

```
hasAltSpread
hasAltTotal
hasExperienceLevels
hasMoneyline
hasSpread
hasTeamTotal
hasTotal
offlineDate
onlineDate
parlayRestriction
sameEventOnly
totalMarketCount
```

### `legalsportsreport.com` — 9 fields

```
headline
moneyLine1
moneyLine2
overUnderLineOver
overUnderLineUnder
pointsLevel
ranking
spreadLine1
spreadLine2
```

### `scoresandodds.com` — 8 fields

```
deliverableVersion
is_restricted
keyspace
level2
level3
lineItemID
lineItemType
targetingFiltersID
```

### `actionnetwork.com` — 7 fields

```
deliverableVersion
is_restricted
level2
level3
lineItemID
lineItemType
targetingFiltersID
```

### `novig.com` — 6 fields

```
backgroundImagePath
competitorSeparator
eventCount
eventStatus
ranking
totalVolume
```

### `oddsjam.com` — 6 fields

```
cpa_value
dfs_screen_odds
has_recent_injuries
promotion_id
reward_value
show_on_dgf_fantasy_scores
```

### `bettingnews.com` — 3 fields

```
best_bet_bookmaker_odds
best_bet_edge
best_bet_fair_odds
```

### `sleeper.app` — 3 fields

```
total_comments
total_reactions
total_views
```

### `keeptradecut.com` — 2 fields

```
impression_id
keyspace
```

### `unibet.com` — 2 fields

```
routeId
zoneValue
```

### `fantasy.nfl.com` — 1 fields

```
eventIndex
```

### `nfl.com` — 1 fields

```
eventIndex
```

### `oddstrader.com` — 1 fields

```
lineid
```

### `pointsbet.com` — 1 fields

```
reviewUrl
```

### `vegasinsider.com` — 1 fields

```
keyspace
```

## Reading of the top three

**kalshi.com** — `dollar_open_interest`, `last_price_dollars`, `leverage_estimate`, `event_forecast`. Open interest and leverage are market microstructure; the engine has no liquidity or positioning concept at all.

**pinnacle.com** — `hasAltSpread`, `hasAltTotal`, `hasTeamTotal`, `totalMarketCount`, `parlayRestriction`. These are market-availability flags: which derivative markets exist, not just the price. The engine models one line per game.

**legalsportsreport.com** — `moneyLine1/2`, `spreadLine1/2`, `overUnderLineOver/Under`, `pointsLevel`. A clean two-sided odds schema with a points level, which is the shape a de-vig needs and the engine does not currently carry.

## Caveat

A field existing in a response does not mean it is populated, stable, or documented. Nothing here is wired. This is a candidate list for the modelling backlog, not a contract.
