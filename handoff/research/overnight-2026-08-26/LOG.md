# Overnight Edge Hunt — 2026-08-26 (live log)

Orchestrator: ox-alpha on branch hermes/w2-audit-settlement. Doctrine:
falsifier-led, KILLED = success, every cycle committed+pushed, honest numbers only.

## Data acquired (verified real, all free/licensed)

| Feed | Path | Verified |
|---|---|---|
| Games + closing lines | data/nflverse/games.csv(.gz) | 7,548 rows; 6,967 scored REG 1999–2025; spread_line/total_line/spread odds present |
| PFR advstats pass/rec/rush/def (season bulk) | data/nflverse/pfr_advstats/*.csv | 848 / 4,130 / 2,820 / 7,537 rows; 2018–2025 |
| FTN charting 2022–2025 | data/nflverse/ftn/ftn_charting_*.csv | ~48K plays/yr each; n_defense_box, n_blitzers, RPO/play-action/motion flags |
| NFL play-by-play 2024 | data/nflverse/pbp/play_by_play_2024.csv | 49,493 plays; EPA/WP/cpoe/xpass/xyac columns confirmed |
| ESPN QBR season | data/nflverse/espn/qbr_season_level.csv | 1,523 rows |
| Manifold live quotes | data/quotes/quotes.jsonl | 32 records appended 06:15Z |

Provenance + limitations: docs/ops/edge/backend-engine-data-sources.md and
market-data-provenance.md. Scraping verdicts recorded there (PFR = Cloudflare,
do not scrape; use nflverse mirror).

## Workers in flight

1. games-harness builder (W1a) — games_harness_rows.jsonl landed: 6,967 rows.
2. Falsifier sweep over NGS signals (W1c).
3. Quote-fetcher completion — Polymarket leg retry in flight.
4. Edge-sources recon (sportsbooks/markets/theory) → handoff/research/edge-sources-2026-08-26/.
5. Tooling probe (crawl4ai / Scrapling / Firecrawl) → same dir.

## CRITICAL sign-convention finding (orchestrator, verified empirically)

spread_line in games.csv is **positive = home team favored** (NOT the
nflfastR-docs "negative = home favored" convention). Verified: home win rate
is 67.6% when spread_line>0 (n=4,481) vs 35.1% when spread_line<0 (n=2,456);
mean cover margin (result − spread_line) = 0.069 ≈ 0 across 6,967 games,
which is the market-efficiency fingerprint. Home-dog cover rate under the
correct convention: 48.78% — i.e. NO exploitable home-dog bias remains at the
consensus close in 1999–2025. The famous anomaly is dead in this feed.
First honest scan result: market is efficient at close; edges must come from
BEFORE close or from markets this feed doesn't capture.

## Early market-data scan (superseded by the sign fix above)

The initial "home-dog cover 77.8%" figure was a SIGN ERROR (used
result + spread_line). Do not cite it. Correct figures: home-dog cover 48.8%,
big-fav cover 48.1%, mean cover margin +0.07 (efficient).

## Next

- Commit batch 1 once workers return (named files, then push).
- W2 preregistration: ONE design vs close with price assumptions stated.
