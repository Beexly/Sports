# Odds vs own stats (do not conflate)

| Layer | Source | Role |
|-------|--------|------|
| **Own stats** | Games, box scores, settlement, model features | History, learning labels, ranking features |
| **Odds API** (`THE_ODDS_API_KEY`) | Live book lines | Live lines, implied p, edge vs model, **oddsInserted kill switch** |

## Kill switch
Public picks 503 when last **SUCCESS + oddsInserted > 0** is older than 240m Refresh SLA.  
Empty slate / quiet board = honesty, not “stats broken.”

## Free-path
ABSENT-only. Key present ⇒ paid path. Never delete/empty key to force free.

## Crons
- `refresh-odds` — insert lines when games exist (needs key + quota)
- `settle-picks` — grade from results (stats path)
- `calibration-metrics` — Brier/ECE/Murphy on settled model p

Odds key is for **LIVE lines + edge + board freshness**, not a substitute for settlement stats.
