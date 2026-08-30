# World-class data redundancy

**SoT:** `lib/data-sources/source-router.ts` · multi-source scores · free settle/persist  
**Law:** oddsApiRequired=false · paid Odds optional  

## Dual free score chains
| Sport | Primary | Failover |
|-------|---------|----------|
| ncaaf/ncaab | ESPN | henrygd |
| mlb | ESPN | MLB Stats API |
| nba | ESPN | BALLDONTLIE |
| nhl | ESPN | NHL web API |
| nfl | ESPN + nflverse (stats) | free:doctor |

## Free odds dual
Polymarket Gamma + Kalshi public (no Odds key required).

## Operator surface
- `GET /api/cockpit/world-class-readiness` (admin)
- `freeCoverageMatrix()` / `redundancyGaps(2)`
- `/cockpit/sources`

## Agents / media / engines
Draft-ready only. externalActions NONE. Media auto-publish off.
