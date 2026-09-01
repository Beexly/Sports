# NFL Historical Odds — Data Manifest

Created: 2026-08-27
Branch: `hermes/sports-intel-orientation`
Status: COMPLETE — 12,164 games, 1966-2026

## Files

All files live in `data/historical-odds/` in this repo.

| File | Size | Rows | Source | Description |
|---|---|---|---|---|
| `nfl_historical_odds_unified.csv` | 1.17 MB | 12,164 | merged | Unified normalized dataset. **This is the file to use.** |
| `nflverse_games.csv` | 2.18 MB | 7,548 | nflverse/nfldata | Raw download. 1999-2026, full odds (spread, total, ML, spread odds, O/U odds). |
| `spreadspoke_scores.csv` | 1.57 MB | 12,144 | slieb74/NFL-Betting-Data | Raw download. 1966-2017, spread + O/U only (no ML). |

## Unified CSV Schema

```
season, week, game_type, date, away_team, home_team, away_score, home_score,
spread_line, total_line, away_moneyline, home_moneyline,
away_spread_odds, home_spread_odds, over_odds, under_odds, source, game_id
```

- `spread_line`: positive = home team favored by that many points; negative = away favored
- `total_line`: over/under line
- `away_moneyline` / `home_moneyline`: American odds (e.g. +124, -148)
- `away_spread_odds` / `home_spread_odds`: American odds for the spread bet
- `over_odds` / `under_odds`: American odds for the totals bet
- `source`: `nflverse` or `spreadspoke`
- `game_type`: `REG` (regular), `WC` (wildcard), `DIV` (divisional), `CON` (conference), `SB` (super bowl)

## Coverage

| Metric | Count |
|---|---|
| Total games | 12,164 |
| With spread_line | 12,004 |
| With total_line | 11,932 |
| With moneyline | 5,407 |
| With spread_odds | 5,407 |
| Season range | 1966-2026 |
| 2018+ games (walk-forward window) | 2,303 |

### By season (2018-2026, the walk-forward window)

| Season | Games |
|---|---|
| 2018 | 267 |
| 2019 | 267 |
| 2020 | 269 |
| 2021 | 285 |
| 2022 | 284 |
| 2023 | 285 |
| 2024 | 285 |
| 2025 | 285 |
| 2026 | 272 |

## Sources

### nflverse games.csv (primary, 1999-2026)
- URL: `https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv`
- License: NFLVerse data terms (public research use)
- Updated: regularly by nflverse maintainers
- Fields: spread_line, total_line, away_moneyline, home_moneyline, away_spread_odds, home_spread_odds, under_odds, over_odds
- This is the SAME source the repo's nflverse ingestion already uses for play-by-play

### spreadspoke_scores.csv (supplementary, 1966-2017)
- URL: `https://raw.githubusercontent.com/slieb74/NFL-Betting-Data/master/spreadspoke_scores.csv`
- License: public (GitHub, 8+ years)
- Fields: spread_favorite, over_under_line (no moneyline, no spread odds)
- Used only for pre-1999 seasons not covered by nflverse

## Legal boundary

Both sources are public research datasets on GitHub. They contain closing lines
(spread/total/ML), not live odds. Use for personal walk-forward backtesting only.
Do NOT redistribute raw rows as a commercial product (see AGENTS.md BE THE PROVIDER section).

## How to use

```python
import csv

with open('data/historical-odds/nfl_historical_odds_unified.csv') as f:
    reader = csv.DictReader(f)
    rows = [r for r in reader if int(r['season']) >= 2018]

# Walk-forward: for each season, train on all prior seasons, test on that season
for test_season in range(2018, 2026):
    train = [r for r in rows if int(r['season']) < test_season]
    test = [r for r in rows if int(r['season']) == test_season]
    # ... model fit on train, predict on test, record CLV/ROI
```

## What this enables

1. **Walk-forward backtesting** (the blueprint's rigor gate): chronological,
   no shuffled CV, no leakage. 2018-2026 is the test window; 1966-2017 is training.
2. **ROI validation**: any "+X% ROI" claim can now be checked against this dataset
   before publishing. No claim without a walk-forward pass on this data.
3. **CLV tracking**: compare model probabilities to closing lines, measure
   closing line value across the full 2018-2026 window.
4. **Calibration**: isotonic/Brier decomposition against actual results.
