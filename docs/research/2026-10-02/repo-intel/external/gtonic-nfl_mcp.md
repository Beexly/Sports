# gtonic / nfl_mcp

- **Stars:** 24 | **License:** MIT | **Pushed:** 2026-09-28 (alive, CI + data-source watchdog) | **Lang:** Python (Docker)

## Vision
"Your AI Fantasy Football War Room" — 55–72 MCP tools that turn an AI assistant into a data-backed fantasy manager: VBD draft boards with value-cliff alerts, weekly start/sit with floor/ceiling and transparent breakdowns, trade fairness on market consensus, Monte-Carlo playoff odds, streaming planners, weather/Vegas integration, coaching-tree intel. The thesis: don't build another rankings site; live *inside the user's assistant*.

## The Ask
- `docker run` one-liner; optional `ODDS_API_KEY` (The Odds API) for Vegas lines; everything else free/public: nflverse, Sleeper API, ESPN news, NFL.com practice reports, Open-Meteo weather, FantasyCalc market values, CBS projections.

## Constraints
- MIT — adoptable.
- Personal/small-scale architecture (localhost + bearer token for sharing). Sleeper-centric; Yahoo/ESPN league support absent.

## GSE lens
This is the single most threatening repo in the sweep, and it exposes **three** GSE weak points at once:
1. **Self-grading.** It ships a built-in backtest ("most fantasy tools never check whether they're right. This one does") plus a daily data-source watchdog that alerts when a feed changes. GSE's walk-forward training just started and there is no standing self-grading harness or feed watchdog. A 24-star side project grades itself; GSE doesn't yet.
2. **Uncertainty honesty as a feature.** Verdicts are scaled to the model's own error (a 0.5-pt edge is reported as a coin flip); missing data triggers refusal, not confabulation. GSE's first reasoning trace returned INVALID honestly — good — but that honesty isn't yet a *designed* product behavior with error-scaled verdicts.
3. **Data-source pragmatism.** It blends 0.25×own-model + 0.75×Sleeper projection, labeled, with fallback. GSE's doctrine is "weight and calibrate everything," but today it has *no* baseline projection blend at all — the pragmatic 80/20 (ship a labeled consensus blend now, improve weights later) is a viable interim GSE could stand up while the full wiring finishes.

## Verdict
**REBUILD** — re-implement the self-grading backtest, the feed watchdog, and the labeled consensus-blend pattern as GSE's own. MIT permits it.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/gtonic/nfl_mcp
- GitDiagram: https://gitdiagram.com/gtonic/nfl_mcp
- Star history: https://star-history.com/#gtonic/nfl_mcp (24 stars)
- github.dev: https://github.dev/gtonic/nfl_mcp
