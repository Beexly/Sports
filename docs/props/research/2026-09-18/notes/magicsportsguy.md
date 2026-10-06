# @MagicSportsGuy (StatRankings) — source notes (read 2026-09-18, index)

- StatRankings launch: https://www.accessnewswire.com/newsroom/en/sports-leisure-and-entertainment/statrankings-launches-with-aim-to-deliver-faster-cleaner-and-smart-1067463
  - Free-account launch included 24+ years of NFL data, base + advanced stats, projection models, betting trends back to 2000.
  - No data-provider, source, or public API disclosed in the release.
- Kevin Adams methodology examples: https://oneweekseason.com/one-week-stats-6-25/ (zone rate, QB production vs zone) and https://oneweekseason.com/one-week-stats-4-25/ (accuracy rate, pressure rate, ANY/A).
- WR/CB methodology context:
  - https://www.espn.ph/ffl/insider/story/_/id/32166443/fantasy-football-week-1-shadow-report-key-wr-cb-matchups — ESPN identifies schemes, receiver/corner alignments, shadow matchups from its play-by-play data.
  - https://www.pff.com/news/fantasy-football-week-16-wr-cb-mismatches-shadow-coverage-dfs-fantasy-football-leagues-2021/ pattern + https://www.pff.com/news/fantasy-football-wide-receiver-report-man-zone-coverage-performance-nfl-week-16-2025 — PFF split tables: routes, target rate, FP/route split by man/zone (formula validation only; not StatRankings' source).
  - https://www.rotoviz.com/2021/11/going-deep-week-12-fantasy-passing-preview-wr-cb-matchups/ — RotoViz GPS Matchup Rater precedent for commercial matchup ratings from charting data.
- Reimplementable formulas (all need route/coverage charting; labeled formulas are standard, denominators inferred):
  - target share = player targets / team targets; first-read share = first-read targets / team first-read targets; TPRR = targets / routes run; YPRR = receiving yards / routes; FP/route = format points / routes; alignment share = routes by alignment / routes; man/zone splits = filter by charted coverage; assignment/overlap map = projected offensive alignment distribution × defender side/slot rates normalized to 100%; percentiles = empirical rank vs position/alignment peer group (min-route cutoff unknown).
- PFF grades/prices: https://www.pff.com/grades (paid data). No confirmation of StatRankings' provider — do NOT assert FTN merely because Adams founded FTN.
