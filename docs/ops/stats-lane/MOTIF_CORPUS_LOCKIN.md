# Motif GSE research lock-in (from Beexly/Sports origin/main)

Commits: fe4a4a152 + 4a50a0469. Bus: motif/20260919T044957000Z-7c2a.

## Lane-relevant paths (exist on origin/main)

- data/beex-picks/2026-09-18-texans-bengals-week2.md
- docs/research/2026-09-18-props-reverse-engineering/FIRECRAWL-PROMPT.md
- docs/research/2026-09-18-props-reverse-engineering/MISSION-BRIEF-2026-09-18.md
- docs/research/2026-09-18-props-reverse-engineering/firecrawl/APIKEY-FAN-DEEP-DIVE.md
- docs/research/2026-09-18-props-reverse-engineering/firecrawl/APIVAULT-DEEP-DIVE.md
- docs/research/2026-09-18-props-reverse-engineering/firecrawl/FREEPUBLICAPIS-DEEP-DIVE.md
- docs/research/2026-09-18-props-reverse-engineering/firecrawl/ODDSPAPI-CODE-DEEP-DIVE.md
- docs/research/2026-09-18-props-reverse-engineering/firecrawl/ODDSPAPI-DEEP-DIVE.md
- docs/research/2026-09-18-props-reverse-engineering/firecrawl/THESPORTSDB-COVERAGE-GAPS.md
- docs/research/2026-09-18-props-reverse-engineering/firecrawl/nfl-historical-odds-50-links.md
- docs/research/2026-09-18-props-reverse-engineering/notes/benbbaldwin.md
- docs/research/2026-09-18-props-reverse-engineering/notes/bpeters12.md
- docs/research/2026-09-18-props-reverse-engineering/notes/magicsportsguy.md
- docs/research/2026-09-18-props-reverse-engineering/notes/ryanjheath.md
- docs/research/2026-09-18-props-reverse-engineering/notes/samhoppen.md
- docs/research/2026-09-18-props-reverse-engineering/notes/sfdata9ers.md
- docs/research/2026-09-18-props-reverse-engineering/notes/shauncore.md
- docs/research/2026-09-18-props-reverse-engineering/notes/sumersports-app-lead.md
- docs/research/2026-09-18-props-reverse-engineering/notes/sumersports.md
- docs/research/2026-09-18-props-reverse-engineering/notes/thunderdan.md
- docs/research/2026-09-18-props-reverse-engineering/report.md
- docs/research/2026-09-18/ftn/charting/ftn_charting_2022.parquet
- docs/research/2026-09-18/ftn/charting/ftn_charting_2023.parquet
- docs/research/2026-09-18/ftn/charting/ftn_charting_2024.parquet
- docs/research/2026-09-18/ftn/charting/ftn_charting_2025.csv
- docs/research/2026-09-18/ftn/charting/ftn_charting_2025.parquet
- docs/research/2026-09-18/full-tables/README.md
- docs/research/2026-09-18/full-tables/benbbaldwin-objective-ratings-v2-2026-09-18.csv
- docs/research/2026-09-18/full-tables/benbbaldwin-remaining-sos-2026-09-18.csv
- docs/research/2026-09-18/full-tables/cmain7-schedule-adjusted-ev-survivor-week3.csv
- docs/research/2026-09-18/full-tables/devyeusuf-separation-score-2ndyear-wr-2026.csv
- docs/research/2026-09-18/full-tables/hawkblogger-pressure-rates-generated-allowed-2026.csv
- docs/research/2026-09-18/full-tables/jmac-bills-target-distribution-week2.csv
- docs/research/2026-09-18/full-tables/magicsportsguy-coverage-shell-splits-2025.csv
- docs/research/2026-09-18/full-tables/magicsportsguy-mooney-man-zone-splits-2025.csv
- docs/research/2026-09-18/full-tables/magicsportsguy-nyg-lar-cb-2025-context.csv
- docs/research/2026-09-18/full-tables/magicsportsguy-nyg-lar-cb-assignments-week1.csv
- docs/research/2026-09-18/full-tables/magicsportsguy-nyg-receiver-alignment-week1.csv
- docs/research/2026-09-18/full-tables/magicsportsguy-target-distribution-position.csv
- docs/research/2026-09-18/full-tables/pff-defensive-grades-single-game-2026.csv
- docs/research/2026-09-18/full-tables/rjanalytics-lawrence-depth-buckets-week1.csv
- docs/research/2026-09-18/full-tables/scottbarrett-yprr-elite-2025-26.csv
- docs/research/2026-09-18/full-tables/sfdata9ers-allen-career-epa-play-heatmap.csv
- docs/research/2026-09-18/full-tables/sfdata9ers-allen-passing-efficiency-grid-week2.csv
- docs/research/2026-09-18/full-tables/sfdata9ers-buf-rushing-summary-week2.csv
- docs/research/2026-09-18/full-tables/sfdata9ers-playcalling-tendencies-week1.csv
- docs/research/2026-09-18/full-tables/sfdata9ers-sf-mia-last8-games.csv
- docs/research/2026-09-18/full-tables/statyx-irving-lane-usage-week2.csv
- docs/research/2026-09-18/full-tables/statyx-irving-run-path-interaction-week2.csv
- docs/research/2026-09-18/full-tables/statyx-irving-runner-evidence-week2.csv
- docs/research/2026-09-17/edge-sheet/bills-lions-edge-sheet-final.png
- docs/research/2026-09-17/edge-sheet/bills-lions-edge-sheet-v2.png
- docs/research/2026-09-17/edge-sheet/bills-lions-edge-sheet.png
- docs/research/2026-09-17/statrankings/nfl-advanced-players.csv
- docs/research/2026-09-17/statrankings/nfl-advanced-teams.csv
- docs/research/2026-09-17/statrankings/nfl-coverage.csv
- docs/research/2026-09-18-props-reverse-engineering/firecrawl/nfl-odds-apis-metrics-50-links.md
- docs/research/2026-09-18-props-reverse-engineering/firecrawl/nfl-stats-apis-50-links.md

## How Mimo uses this

- FTN charting + full-tables CSVs: situational feature join for MIMO-7 underdog ML (rest/trench/QB).
- statrankings nfl-advanced-teams/players: rung-2 dumb baselines + Elo residuals cross-check.
- props firecrawl URLs: only curl-verified lawful sources; no ToS-forbidden scrapes.
- File every new data point under docs/research/<date>/ in Beexly/Sports (motif rule).
