# Signal 6 — Defensive EPA / play by quarter

Method: @sfdata9ers full 32-team defensive EPA/play-by-quarter table
from Garrett's Oct 30 phone-feed video. Window: Weeks 1-7, nflverse
play-by-play, scrimmage plays only (pass + run, 2pt excluded),
regulation quarters. Negative = good defense.

**Check vs the post:** the post's values are image-only; no numeric
check is possible. The table is computed in-house — which was the
point of the exercise: this recurring series is now an owned weekly
artifact instead of a borrowed screenshot.

Best three defenses overall this window:

| defense | q1_epa_allowed | q2_epa_allowed | q3_epa_allowed | q4_epa_allowed | all_q_epa_allowed |
|---|---|---|---|---|---|
| MIN | 0.026 | -0.088 | -0.138 | -0.53 | -0.193 |
| SEA | -0.177 | -0.031 | -0.25 | -0.084 | -0.13 |
| TB | -0.12 | -0.147 | -0.297 | 0.037 | -0.127 |

Worst three:

| defense | q1_epa_allowed | q2_epa_allowed | q3_epa_allowed | q4_epa_allowed | all_q_epa_allowed |
|---|---|---|---|---|---|
| BUF | 0.096 | 0.124 | 0.172 | 0.117 | 0.129 |
| MIA | 0.333 | 0.001 | 0.26 | -0.027 | 0.131 |
| DAL | 0.294 | 0.038 | 0.224 | 0.046 | 0.138 |

Full table: `06_defensive_epa_by_quarter.csv` (32 defenses x Q1-Q4 + overall).
