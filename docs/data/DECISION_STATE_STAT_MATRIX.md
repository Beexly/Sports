# Decision-State Stat Matrix

**Source of truth:** `packages/nfl-stat-universe/src/decision-state-matrix.ts`
**Tests:** `packages/nfl-stat-universe/src/__tests__/decision-state-matrix.test.ts`

This is the demand-and-supply spec. For **every** decision state the product can be in, it declares
exactly which facts are *required*, which *strengthen* it, the *free* vs *paid* source that supplies
them, the *legal floor*, the **strongest card the state may become when a required fact is missing**,
and which surfaces go dark without it. It turns a missing stat into a concrete owner acquisition
decision — data-hungry without being data-chaotic.

It is **pure data**. No network, no keys, no ingestion. It aligns with the scraping-clearance registry
(`apps/web/lib/scraping/source-rights-registry.ts`) and reuses the mesh's `FactType`/`LegalVerdict` and
the runtime's `MaxPermittedStrength`.

## Invariants (enforced by tests — fail-closed)

1. **All 14 states have a complete contract** with a non-empty legal floor.
2. **No forbidden source** (`DO_NOT_USE` / `RIGHTS_REVIEW`) is ever named as a free or paid source.
3. **Missing required data can never reach an action card.** Every `maxStrengthIfMissing` ranks strictly
   below `ACTION` — the strongest a state may be while a required fact is absent.
4. **Every required fact is unlockable by at least one production-usable source** (no dead-end demand).
5. **Forbidden sources unlock nothing.** `PROVIDER_UNLOCKS` for `draftkings_unofficial` and `pfr_scrape`
   is empty; `sourcesUnlocking()` never returns a forbidden source.
6. **Fantasy-late, DFS, and market-lag are gated on their snapshot:** fantasy-late caps at `WATCH`
   without a `platform_projection`; DFS caps at `INFO_ONLY` without a licensed `dfs_salary` feed;
   market-lag requires timestamped `odds_history`.

## The 14 decision states

| State | Required facts | Free source | Paid source | Legal floor | Max if missing | Goes dark |
|---|---|---|---|---|---|---|
| `ROLE_UP_FANTASY_LATE` | route_rate, platform_projection | nflverse | fantasydata | LICENSED→PAID | **WATCH** | gameplan, today |
| `GOOD_IDEA_BAD_PRICE` | snap_share, player_prop | nflverse | the_odds_api | LICENSED→PAID | WATCH | edge |
| `PUBLIC_OVERREACTION` | betting_splits, snap_share | nflverse | the_odds_api | LICENSED→PAID | WATCH | edge, today |
| `ROLE_MASS_MISALLOCATED` | snap_share, carry_share | nflverse | — | FREE | INFO_ONLY | gameplan |
| `DATA_CONFLICT` | injury_report, practice_status | nflverse | — | FREE | INFO_ONLY | today |
| `TOO_LATE` | closing_line, odds_history | — | the_odds_api | LICENSED→PAID | INFO_ONLY | edge |
| `NEEDS_LIVE_DATA` | — | — | — | FREE | INFO_ONLY | today, edge, gameplan |
| `TRAP` | snap_share | nflverse | — | FREE | INFO_ONLY | today |
| `WATCHLIST` | snap_share | nflverse | — | FREE | WATCH | today |
| `ACTIONABLE` | snap_share, player_prop | nflverse | the_odds_api | LICENSED→PAID | WATCH | today, edge |
| `DFS_SALARY_LAG` | dfs_salary, route_rate | — | fantasydata | LICENSED, PAID | **INFO_ONLY** | gameplan_dfs |
| `OWNERSHIP_OVERREACTION` | ownership_projection, snap_share | — | fantasydata | LICENSED, PAID | WATCH | gameplan_dfs |
| `PLAYER_PROP_MARKET_LAG` | player_prop, odds_history, snap_share | nflverse | the_odds_api | LICENSED→PAID | WATCH | edge |
| `INJURY_SOURCE_CONFLICT` | injury_report, practice_status | nflverse | — | FREE | INFO_ONLY | today |

*"Legal floor" `LICENSED→PAID` means the lane spans `FREE_OPEN`/`FREE_CAUTION`/`LICENSED` and tops out
at `PAID_REQUIRED`; `FREE` means no paid acquisition is needed.*

## Provider-unlock map

Which facts each provider unlocks **for production**. A forbidden lane unlocks nothing.

| Provider | Legal status | Unlocks |
|---|---|---|
| `nflverse` | FREE_OPEN | play_by_play, snap_share, route_rate, target_share, carry_share, air_yards, red_zone_touch, injury_report, practice_status, depth_chart, inactive_status |
| `nws` | FREE_OPEN | weather |
| `sleeper` | FREE_CAUTION | add_drop_velocity, roster_pct, start_pct |
| `yahoo_oauth` | FREE_CAUTION | league_settings, roster_pct |
| `the_odds_api` | LICENSED | player_prop, spread, total, moneyline, odds_history, alt_prop, closing_line, betting_splits |
| `sportsgameodds` | LICENSED | player_prop, spread, total, moneyline, odds_history, alt_prop, closing_line |
| `fantasydata` | PAID_REQUIRED | platform_projection, adp, roster_pct, start_pct, dfs_salary, dfs_slate, ownership_projection, injury_report |
| `sportsdataio` | PAID_REQUIRED | platform_projection, adp, dfs_salary, dfs_slate, ownership_projection |
| `sportradar` | PAID_REQUIRED | play_by_play, snap_share, route_rate |
| `draftkings_unofficial` | **DO_NOT_USE** | *(nothing — forbidden)* |
| `pfr_scrape` | **RIGHTS_REVIEW** | *(nothing — rights review required)* |

## How to extend

- **Add a decision state:** add the key to `DecisionStateKey`, add a contract to `DECISION_STATE_MATRIX`,
  and update the count assertion in the test. Keep `maxStrengthIfMissing` strictly below `ACTION`.
- **Add a provider:** register it in `SOURCES` (`stat-definition.ts`), then add its `PROVIDER_UNLOCKS`
  entry. If its `legalStatus` is `DO_NOT_USE`/`RIGHTS_REVIEW`, its entry **must** be empty `[]`.
- **Never** name a forbidden source as a free/paid source — the test will reject it.
