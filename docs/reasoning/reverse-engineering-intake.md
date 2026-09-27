# Reverse-engineering intake

Source: the NFL Analytics Reverse-Engineering file supplied 2026-09-26. The license rule in that file stands. nflverse is the legal base. Grades, chart images, and scraped leaderboards are not republished here.

The file ranks twelve upgrades. Status is what this branch actually did.

| Rank | Upgrade | Status |
|---|---|---|
| 1 | Opponent-adjusted efficiency | Wired for week 3. 2025 defensive EPA allowed is the opponent prior. 2026 weeks 1-2 are the observation. |
| 2 | Turnover regression | Wired as interceptions versus the 2025 rate, shrunk, 5% of the efficiency blend. Fumble luck is not separated yet. |
| 3 | Pass versus rush split | Wired. Pass residual 55%, rush residual 15%. |
| 4 | Explosive-play differential | Wired as pass plays of 20+ yards over attempts, 10% of the blend. |
| 5 | Early-season shrinkage | Wired. 80 pass attempts and 40 carries of pull toward the 2025 prior. Two games do not get a full-season weight. |
| 6 | Pressure and win-rate matchups | Wired as qb_hit per dropback, not charted pressure. 2025 walk-forward r = 0.241 on 250 games. It enters the trench family. |
| 7 | Special-teams EPA | Measured. Walk-forward r = -0.065. Left out. Not sign-flipped. |
| 8 | Pace and weather for totals | Not wired. Roof is on the row. Wind and temperature are not. |
| 9 | Fourth-down aggressiveness coaching prior | Measured. Walk-forward r = -0.014 on 255 games. The rate is stored. It does not move the tilt. |
| 10 | CPOE | Wired, 15% of the efficiency blend, shrunk toward zero. |
| 11 | Rest, travel, altitude | Rest is already in the schedule family. Travel and altitude stay out. The file calls the effect near zero. |
| 12 | PFF grades / SIS | Not wired. Paid, and not licensed for redistribution. |

Market price stays withheld. Brier, Kelly, and Bradley-Terry stay meters. The efficiency change feeds `on_field_efficiency` in the week-3 engine reading.
