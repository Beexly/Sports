# Backend Engine Data Sources — acquired 2026-08-26 (overnight edge hunt)

All bulk feeds below are FREE, license-clean (nflverse open data, CC-BY-style
attribution norms; FTN charting is publicly released via nflverse with
permission), and now stored locally under `data/nflverse/`. This is the
"backend engine data" layer: real, structured, no scraping needed.

## Acquired this cycle

| Feed | Path | Coverage | Why it matters for GSE |
|---|---|---|---|
| Games + market lines | `data/nflverse/games.csv` (+ .gz) | 7,548 rows; 6,967 scored REG games 1999–2025 | FIRST real market prices in repo: closing spread_line, total_line, spread odds. Every edge claim can now be tested vs a price. |
| PFR adv stats PASS | `data/nflverse/pfr_advstats/advstats_season_pass.csv` | 848 rows, 2018–2025 | pressure_pct, times_blitzed/hurried/hit, pocket_time → blitz-rate→sacks bind finally has its source |
| PFR adv stats REC | `data/nflverse/pfr_advstats/advstats_season_rec.csv` | 4,130 rows | ybc/yac/adot/brk_tkl per player-season |
| PFR adv stats RUSH | `data/nflverse/pfr_advstats/advstats_season_rush.csv` | 2,820 rows | ybc_att, yac_att, brk_tkl, loaded box rate |
| PFR adv stats DEF | `data/nflverse/pfr_advstats/advstats_season_def.csv` | 7,537 rows | cmp_pct_allowed, rat_allowed, dadot → comp-pct-allowed→passAttempts bind source |
| FTN charting | `data/nflverse/ftn/ftn_charting_{2022..2025}.csv` | ~48K plays/yr (~190K total) | n_defense_box → box-rate→rushYards bind; n_blitzers, play_action, RPO, motion flags; joins nflverse pbp via nflverse_play_id |
| ESPN QBR | `data/nflverse/espn/qbr_season_level.csv` | 1,523 rows | qbr_total, pts_added, epa_total per QB-season |

## Source URLs (reproducibility)

- games: https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv.gz
  (Lee Sharpe's nfldata; spread_line = HOME team spread at close; see
  market-data-provenance.md for semantics + limitations)
- pfr_advstats: https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/<file>.csv.gz
- ftn_charting: https://github.com/nflverse/nflverse-data/releases/download/ftn_charting/ftn_charting_<year>.csv
- espn QBR: https://github.com/nflverse/nflverse-data/releases/download/espn_data/qbr_season_level.csv

## Honest limitations

- games.csv lines are a single consensus closing proxy — no open/close
  timestamps, no per-book tick history. Line-movement edges are NOT testable
  from this feed alone.
- pfr_advstats bulk files are SEASON-grain (2018–2025). The covariate bus was
  designed around WEEKLY PFR rows; season-grain supports prior-season→next-week
  binds only. Weekly PFR remains a gap.
- FTN charting starts 2022 — no earlier seasons exist.
- All feeds update on nflverse's schedule; re-download before any live run.

## Scraping verdicts (probed 2026-08-26, robots.txt checked)

- teamrankings.com: robots ALLOWS site content, Crawl-delay: 10 → legal slow
  crawl of power-ratings/trend pages via crawl4ai (deferred to next lane).
- sportsbookreview.com: robots allows /betting-odds/ (only ---old/ and /user/
  subpaths disallowed) BUT site is Cloudflare-hardened; needs Scrapling/camoufox.
  Deferred — odds API feeds preferred over scraping books directly.
- pro-football-reference.com: Cloudflare challenge on even robots.txt → do NOT
  scrape; use the nflverse pfr_advstats mirror instead (same data, licensed path). 
- espn.com: robots disallows GPTBot/CCBot etc.; use espn_data release above.

## Next lanes queued

1. Convert advstats season files → covariate-bus-compatible harness rows.
2. Preregistered edge designs vs games.csv close (see W2 in overnight plan).
3. teamrankings slow crawl for historical power ratings (crawl4ai, 10s delay).
