# Signal board vs market board

| | **Market board** | **Signal board** |
|--|------------------|------------------|
| Env | `PUBLIC_BOARD_SURFACE=market` (default) | `PUBLIC_BOARD_SURFACE=signal` |
| Kill switch | Odds-fresh: SUCCESS + **oddsInserted>0** within 240m | Slate-fresh: recent **published non-seed pick** within 240m |
| Line label | Book / exchange (OddsProvider only) | **Model signal** — never book/exchange |
| Use Odds key | Required for live lines + edge | Optional enrichment; not required to show signals |
| LIVE_BOARD | Still odds-fresh always | Still odds-fresh always (independent) |

## OddsProvider
Abstraction + failover stay. Offline provider is **not** certifiable for LIVE_BOARD. Never invent book prices. Free-tier cron cadence stays conservative.

## FOUNDING
For model-first public open without warm odds: set **`PUBLIC_BOARD_SURFACE=signal`**.  
Market board remains available when odds are warm.

## Integrity
- No synthetic fair lines labeled as book lines
- Performance publish still requires eligibility GREEN + policy (independent of board surface)
