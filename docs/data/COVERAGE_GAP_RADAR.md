# Coverage Gap Radar

*Source: `coverage-gap-radar.ts`. The radar turns "we need some stats" into a ranked, named list of
exactly what is missing and which modules it blocks.*

## How it works

Each GSE module declares the fact types it requires (`DEFAULT_MODULE_REQUIREMENTS`). The radar
intersects that demand with the fact types the available endpoints actually cover, and returns the
uncovered facts ranked by **how many modules each one blocks** (urgency).

## The documented gaps (with only nflverse wired)

With nflverse (football-reality) as the only endpoint, the radar reports these decision-relevant
gaps — the same list the platform's strongest documented weakness points to:

| Missing fact | Blocks |
|---|---|
| `odds_history` (prop/alt history) | Book DNA, Market Twin, Absorption Half-Life |
| `book_update`, `closing_line`, `live_odds` | Book DNA, Tradability, CLV |
| `player_prop`, `alt_prop` | Book DNA, prop edge |
| `dfs_salary`, `dfs_slate`, `ownership_projection`, `actual_ownership` | DFS Leverage Lab, Contest Reflexivity |
| `platform_projection`, `analyst_rank` | Fantasy Absorption, Manager DNA |
| `adp`, `bestball_adp` | Best Ball Twin, Fantasy Absorption |
| `roster_pct`, `start_pct`, `add_drop_velocity` | Fantasy Absorption, Manager DNA |
| `injury_report`, `inactive_status`, `practice_status` | Information Light Cone, Role Shock |
| `beat_report`, `weather` | Narrative Gravity, Light Cone |

## What closes them

- Add **The Odds API** historical/props endpoints → closes the market gaps (`odds_history`,
  `book_update`, `closing_line`, `player_prop`, `alt_prop`).
- Add **SportsDataIO / FantasyData** → closes `dfs_salary`, `dfs_slate`, `platform_projection`.
- Add **Sleeper / Yahoo** → closes `roster_pct`, `add_drop_velocity`, league context.
- Add **NWS** → closes `weather`; a licensed news feed → `beat_report` / injury timing.

The radar is the demand side of the Acquisition Governor: the highest-urgency uncovered facts point
directly at which source to acquire next.
