# nflverse raw data provenance (2026-09-13 DFS verify lane)

`pbp2025.csv` (94 MB) and `roster2025.csv` were pulled from nflverse on 2026-09-13
for the Week 1 DFS ownership/verification lane. `roster2025.csv` is filed here;
`pbp2025.csv` is intentionally NOT committed to git (raw reproducible bulk data).

- Source: https://github.com/nflverse/nflverse-data (play_by_play_2025.csv)
- Workspace copy: ~/workspace/dfs-research/verify/nflverse/pbp2025.csv
- Refetch: download play_by_play_2025.csv from the nflverse-data releases and
  save as pbp2025.csv in this directory to reproduce the verify lane exactly.
- Consumer: verify_defense.py (filed here) and verify/*.md analyses.
