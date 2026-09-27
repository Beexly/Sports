# Situational edges, measured before use

2025 regular season, walk-forward. A team enters a game with only earlier weeks. Correlation is with the home team winning.

| signal | games | pearson r | enters the tilt |
|---|---:|---:|---|
| pressure matchup | 250 | 0.24135296163107084 | yes |
| fourth-down go rate | 255 | -0.01363209458605604 | no |
| special-teams EPA | 256 | -0.0647853105170034 | no |

Pressure is qb_hit divided by dropbacks. The matchup is the home team's pressure created minus pressure allowed, minus the same net for the away team. Fourth-down go rate is passes and runs divided by those plus punts and field goals. Special-teams EPA is the mean EPA on the posteam's kickoffs, punts, field goals, and extra points.

A signal is allowed into the tilt only if r is above 0.03 in the direction that makes the signal useful. Otherwise the number is kept on the row and the family stays dark. Special-teams EPA correlated the wrong way and was not sign-flipped. Fourth-down go rate is recorded and is not treated as "more aggressive is better."
