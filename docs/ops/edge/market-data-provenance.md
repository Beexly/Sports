# Market Data Provenance

## Source
- URL: `https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv.gz`
- Released by Lee Sharpe's `nfldata` / nflverse-data repository.
- Download date: 2026-08-26
- Local file: `data/nflverse/games.csv` (decompressed from `games.csv.gz`); 7,548 total rows, 6,967 regular-season games with scores (1999–2025).

## Column semantics (applied in `scripts/ops/build-games-harness.py`)
- `spread_line` is the HOME team spread (negative = home team favored).
- `away_spread_odds` / `home_spread_odds`: spread-side odds for away/home.
- `total_line`: over/under line.
- `away_moneyline` / `home_moneyline`: moneyline prices when present.
- `under_odds` / `over_odds`: total-side odds when present.
- `div_game`: divisional flag.

## Update cadence
- Per nflverse docs the spread updates to a closing/consensus line; the exact refresh cadence (hourly vs daily vs release-triggered) is **unverified** in this session. Treat it as a consensus close proxy, not live tick data.

## Row counts observed (this run, 2026-08-26)
- Total CSV rows: 7,548
- Regular-season (`game_type == REG`): 7,239
- Scored REG games emitted to harness: 6,967
- With spread line: 6,967
- With total line: 6,967
- Per decade: 1990s 248, 2000s 2,544, 2010s 2,560, 2020s 1,615
- File: `data/nflverse/games_harness_rows.jsonl` — 6,967 lines.

## Known limitations (honest)
- **Single-book consensus line**, not multi-book aggregate.
- **No open-vs-close timestamps**; cannot compute line movement per hour or per day.
- **No tick-level data**; this is a snapshot close, not intra-day movement.
- Some older seasons (pre-2000s) have sparse or missing spread/odds/total columns; the harness keeps them as `null` rather than inventing values.
- Odds columns are missing for many rows; coverage improves from ~2010 onward but is still incomplete.

## How downstream modules should cite
Cite as: "Market lines from nflverse-data (Lee Sharpe, nfldata repo) `games.csv`, downloaded 2026-08-26; harness emitted 6,967 scored regular-season rows (1999–2025). Consensus closing spread/total proxy; not tick data. No open-vs-close timestamps available."
