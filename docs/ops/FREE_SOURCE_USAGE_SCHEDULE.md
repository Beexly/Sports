# Free source usage schedule (no random key rotation)

**Law:** only **cleared** free sources. Do not invent API keys, scrape paywalls, or
rotate random third-party keys. Paid Odds API stays optional (OfflineOddsProvider
when key missing).

## When to use what (NFL-first weekend mode)

| Need | Prefer first (always free) | Fallback free | Paid only if free fails & rights OK |
|------|----------------------------|---------------|-------------------------------------|
| Scores / results | ESPN public (facts) | nflverse schedules/results | Odds API scores (licensed) |
| Player / team stats | **nflverse** (CC-BY) | ESPN public facts | never invent |
| Schedules | nflverse + ESPN | — | — |
| Injuries | nflverse injuries (labelled empty if stale) | — | never invent designations |
| Weather | **Open-Meteo** | — | — |
| Odds | OfflineOddsProvider / offline books | — | The Odds API if key present |
| PBP / NGS | nflverse hard assets | — | — |

## Quota vs unlimited (not a secret-key carousel)

| Source | Cost tier | Rotation needed? | Ops note |
|--------|-----------|------------------|----------|
| nflverse | free_unlimited | **No** | Catalog HEAD / free-spine currency probe |
| Open-Meteo | free_unlimited | **No** | CC-BY weather |
| ESPN public | free_quota | **Soft** | Space scoreboard polls; free-spine every 2h is enough |
| MoneyPuck / Statcast / etc. | catalog free_legal | Soft | Sport-specific; use when that sport is live |
| The Odds API | licensed_flat | N/A paid | Optional; OfflineOdds when absent |

## Active schedule (production)

1. **Every 2h:** `/api/cron/free-spine-health` — free score chains + nflverse currency + SUCCESS heartbeat.
2. **Hourly player refresh:** existing player-stats crons (primary-only writers).
3. **Settlement:** free scoreboards via multi-source + free-settlement path.
4. **Do not** add parallel key-rotation workers for uncleared APIs.

## Escalation rule

```
if bestFreeClearedSource(need, sport):
  use free
else if licensed key present AND rights cleared:
  use paid once
else:
  empty / labelled degraded  # never fabricate
```

Implementation SoT: `apps/web/lib/data-sources/source-router.ts` (`freeCoverageMatrix`,
`planIngestion`, `PLATFORM_SOURCES`).
