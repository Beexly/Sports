# SIGNAL FIREHOSE INVENTORY — what JEV actually gets

**Built:** 2026-10-11
**Rule:** Count honestly. Every signal labeled with source, freshness, and status.

## The number

| Scope | Signals |
|-------|---------|
| Per game (London) | **122** |
| Per game (other 13) | **84** |
| Total game-signals (14 games) | **1,214** |
| Per player (JEV lineup members) | **17** |

## Signal categories

### Game signals (per game)

| Category | Count/game | Source | Status |
|----------|-----------|--------|--------|
| Edge5 derived board (spread, total, team totals, sigma, 1H/2H, win prob) | 10 | edge5_board_2026-10-11.json | live |
| Alt-line probabilities | 5 | edge5_board_2026-10-11.json | live |
| Derived (team total spread, total check, implied win prob) | 3 | derived | live |
| 8 edges (each edge's measured values) | ~25 | edge params / memory | measured |
| Game identity (matchup, fav, home, away, id) | 5 | edge5_board | live |
| Kill ledger diagnostic context (12 entries × 2 fields) | 24 | kill_ledger.jsonl | diagnostic |
| FreshnessGate / CollegeGuard status | 3 | doctrine | live |
| London contextual (venue, weather, inactives, line move, ref, news) | 38 | london_final_intel | live (London only) |

### Player signals (per player in JEV lineups)

| Category | Count/player | Source | Status |
|----------|-------------|--------|--------|
| DK base (name, pos, team, opp, salary, slot) | 6 | JEV lineups JSON | live |
| DK projection / ceiling | 2 | JEV lineups JSON | proxy_salary_derived |
| DK ownership | 1 | JEV lineups JSON | proxy_salary_percentile |
| GSE Score | 1 | JEV lineups JSON | sample-vor (NOT nflverse) |
| JEV aggregates (lineup count, avg/best tourney, best rank) | 4 | derived | live |
| JEV verdict counts | 1-3 | derived | heuristic_not_live_api |
| Positional factor loadings (λ_team, λ_game) | 2 | Antigravity spec | live |

### What's IDLE (available but not in the firehose yet)

| Source | Why idle | Priority |
|--------|----------|----------|
| FTN charting (29 cols × 10,996 plays) | Needs team-week aggregation first | HIGH |
| PFR advanced stats (38 cols × 848 QB-seasons) | Needs player-key join | HIGH |
| Snap counts 2026 | File exists, not yet mapped to players | MEDIUM |
| Officials 2026 (beyond crew EPA) | Individual ref tendencies not extracted | MEDIUM |
| CPOE × pressure (128 QB-weeks) | Needs game-week join for per-game use | MEDIUM |
| Live JEV arbitration API | Windows-only, not reachable from VM | HIGH (when available) |
| nflverse processGrade (real GSE Score) | Not pulled — would replace sample-vor | HIGHEST |

## Honest labels

Every signal carries a `status` field:
- `live` — from a real source, fresh
- `measured` — from a stamped measurement
- `measured_with_caveat` — measured but with a known confound
- `diagnostic` — from the kill ledger / diagnostic work, not a prediction input
- `proxy_salary_derived` — derived from salary, NOT a fitted model
- `proxy_salary_percentile` — ownership proxy, NOT real ownership
- `sample-vor` — GSE Score from pool percentile, NOT nflverse processGrade
- `heuristic_not_live_api` — JEV verdict from heuristic, NOT the live `jev ask` API
- `scheduled` — will exist (e.g., Sunday drift), doesn't yet

## API

- `GET /signals/game/{game_id}` → 84–122 signals as JSON
- `GET /signals/player/{player_key}` → 17 signals as JSON

JEV (or Hermes on Windows) hits these endpoints. No more starving the arbitrator.
