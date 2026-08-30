# ESPN public odds — free tertiary path (2026-08-10)

## Why

Rundown free tier **HTTP 429** and Odds API key **ABSENT/misnamed** left market
clock dark (last oddsInserted>0 = 2026-07-25). Founder free sources research
pointed at [pseudo-r/Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API).

## Law

| Rule | Holding |
|---|---|
| Never invent quotes | Empty soft-fail when ESPN has no ML |
| Free path only | No key required |
| Order | Odds API → Rundown → **ESPN public** |
| Gates | Does not flip LIVE_BOARD / PROVEN / PERFORMANCE_STATS |
| ToU | Undocumented public JSON; rate-friendly (scoreboard once + per-event odds, inter-sport pause) |

## Implementation

| Piece | Path |
|---|---|
| Client | `packages/data-ingestion/src/espn-odds-client.ts` |
| Wire | `process-sport.ts` tertiary when primary+Rundown empty |
| Refresh | `refresh-odds.ts` always allows ESPN (`espn-free-path` sentinel); on Rundown 429 cascade still tries ESPN |
| Bookmaker key | `espn_public` (title `ESPN/{provider}`) |
| Markets | h2h required; spreads + totals when present |

## Sports mapped

NFL, NCAAF, MLB, NBA, NCAAB, NHL, MLS, EPL (Odds-API sport keys).

## Ops visibility

`public-surface-truth.oddsInserting.dualPath.espnPublicTertiary = true`

## Key aliases (founder's "switched keys")

Expanded `ODDS_API_KEY_ENV_NAMES` and `RUNDOWN_API_KEY_ENV_NAMES` so dashboard
renames still resolve. If dualPath still shows Odds ABSENT after switch, check
Production env name against the alias list (canonical remains `THE_ODDS_API_KEY`).

## Not a Brier magic wand

ESPN odds advance **market clock** + densify `marketFairProb` for live p.
PROVEN still needs Brier ≤ 0.22 via RES lift (independent trueProb + selective +
pause dead groups). Maps still OFF.
