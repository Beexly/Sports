# @ThunderDanDFS — source notes (read 2026-09-18, index)

- Methodology (direct): https://www.rotoballer.com/nfl-dfs-picks-running-backs-to-target-in-week-1-2/1923472
  - "Thunder Dan Matchup Grade" incorporates PFF (grades, O-line data) and FTN DVOA.
  - Evaluates blocker quality, offensive scheme, projected role/usage, projected game script; explicitly NOT the RB's own elusiveness/explosiveness/broken tackles.
  - Week 1 used 2025 data; manually accounted for personnel/coaching changes (analyst override).
- Related 2026 piece: https://www.rotoballer.com/fantasy-football-d-st-matchups-strength-of-schedule-analysis-2026/1925785
  - Uses offensive/defensive DVOA, adjusted sack rate, turnover rate; scales 0–100. Suggests Dan's preferred 0–100 grade scaling but does NOT document his passing/rushing grade weights.
- Implied totals from spread/total: standard formula — team implied total = total/2 − (signed spread)/2 (favorite's perspective). No source found confirming Dan's exact odds book; likely sportsbook lines (DraftKings/FanDuel) or The Odds API feed.
- Data access: PFF = paid (pff.com subscriptions; raw PFF data via PFF Data / paid feeds). FTN DVOA = FTN (ftnfantasy.com) proprietary/paid subscription; DVOA methodology lineage = Football Outsiders/FTN.
- Verdict: black box composite. Weights, normalization, percentile transforms unpublished.
