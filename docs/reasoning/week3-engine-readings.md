# Engine readings, week 3

The tilt is home-positive and unitless. It is not a win probability. Nothing here is a pick.
On-field efficiency is no longer raw passing EPA. It is a shrunk opponent-adjusted blend: 55% pass EPA residual, 15% rush EPA residual, 15% CPOE, 10% explosive-pass rate, 5% interception luck. The 2025 season is the prior. 2026 weeks 1-2 are the observation. Passing is weighted above rushing because rushing efficiency does not carry the same way.
Brier, Kelly, Bradley-Terry, and the closing price do not enter the tilt. The price is withheld on purpose. The meters stay a governor. Calibration on the Elo is still WATCH.
OpenRouter lane: openrouter_unconfigured. No model call was made.

Priors:

| family | prior | role |
|---|---:|---|
| on_field_efficiency | 0.14 | premise |
| scheme_play_design | 0.12 | premise |
| availability | 0.12 | premise |
| schedule_and_body | 0.08 | premise |
| historical_strength | 0.08 | premise |
| weather_physics | 0.07 | dark |
| coaching | 0.06 | dark |
| trench_personnel | 0.05 | dark |
| market_context | 0.05 | context_not_objective |
| officials | 0.04 | dark |
| chemistry | 0.04 | dark |
| bio_nutrition | 0.04 | dark |
| narrative_contract | 0.03 | dark |
| social | 0.03 | dark |
| calibration_meters | 0.03 | meter |
| airwave | 0.02 | dark |

Dark share by design: 0.38. Those families are named so they are not forgotten. They contribute nothing until a row exists.

| game | tilt | coverage | dark | rest | roof | referee |
|---|---:|---:|---:|---:|---|---|
| ATL at GB | 0.118 | 0.54 | 0.38 | 0 | outdoors | Shawn Smith |
| ARI at SF | 0.140 | 0.54 | 0.38 | 0 | outdoors |  |
| BAL at DAL | -0.100 | 0.54 | 0.38 | 0 |  |  |
| CAR at CLE | -0.011 | 0.54 | 0.38 | 0 | outdoors |  |
| CIN at PIT | -0.079 | 0.54 | 0.38 | 0 | outdoors |  |
| HOU at IND | 0.152 | 0.54 | 0.38 | 0 |  |  |
| KC at MIA | -0.191 | 0.54 | 0.38 | 0 | outdoors |  |
| LAC at BUF | 0.520 | 0.54 | 0.38 | 3 | outdoors |  |
| LA at DEN | -0.055 | 0.54 | 0.38 | 1 | outdoors |  |
| LV at NO | 0.084 | 0.54 | 0.38 | 0 | dome |  |
| MIN at TB | 0.042 | 0.54 | 0.38 | 0 | outdoors |  |
| NE at JAX | 0.176 | 0.54 | 0.38 | 0 | outdoors |  |
| NYJ at DET | 0.299 | 0.54 | 0.38 | 3 | dome |  |
| SEA at WAS | -0.240 | 0.54 | 0.38 | 0 | outdoors |  |
| TEN at NYG | 0.014 | 0.54 | 0.38 | -1 | outdoors |  |
| PHI at CHI | 0.001 | 0.54 | 0.38 | 0 | outdoors |  |
