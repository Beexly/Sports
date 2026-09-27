# Engine edge, week 3

The edge is the weighted composite of the live signals. We build it. The price does not define it. Brier, Kelly, and Bradley-Terry measure it after the fact. A dark family is a named hole, not a reason to call the rest nothing.
On-field efficiency is a shrunk opponent-adjusted blend: 55% pass EPA residual, 15% rush EPA residual, 15% CPOE, 10% explosive-pass rate, 5% interception luck. The 2025 season is the prior. 2026 weeks 1-2 are the observation.
Trench is in the edge. It is qb_hit per dropback, home net minus away net, measured at r = 0.241 on 250 walk-forward games. Fourth-down rate and special-teams EPA were measured and left out.
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
| trench_personnel | 0.05 | premise |
| market_context | 0.05 | context_not_objective |
| officials | 0.04 | dark |
| chemistry | 0.04 | dark |
| bio_nutrition | 0.04 | dark |
| narrative_contract | 0.03 | dark |
| social | 0.03 | dark |
| calibration_meters | 0.03 | meter |
| airwave | 0.02 | dark |

Dark share by design: 0.33. Those families are named so they are not forgotten. They contribute nothing until a row exists.

| game | edge | coverage | dark | rest | roof | referee |
|---|---:|---:|---:|---:|---|---|
| ATL at GB | 0.092 | 0.59 | 0.33 | 0 | outdoors | Shawn Smith |
| ARI at SF | 0.179 | 0.59 | 0.33 | 0 | outdoors |  |
| BAL at DAL | -0.065 | 0.59 | 0.33 | 0 |  |  |
| CAR at CLE | -0.008 | 0.59 | 0.33 | 0 | outdoors |  |
| CIN at PIT | -0.015 | 0.59 | 0.33 | 0 | outdoors |  |
| HOU at IND | 0.099 | 0.59 | 0.33 | 0 |  |  |
| KC at MIA | -0.199 | 0.59 | 0.33 | 0 | outdoors |  |
| LAC at BUF | 0.539 | 0.59 | 0.33 | 3 | outdoors |  |
| LA at DEN | -0.001 | 0.59 | 0.33 | 1 | outdoors |  |
| LV at NO | 0.103 | 0.59 | 0.33 | 0 | dome |  |
| MIN at TB | 0.047 | 0.59 | 0.33 | 0 | outdoors |  |
| NE at JAX | 0.165 | 0.59 | 0.33 | 0 | outdoors |  |
| NYJ at DET | 0.302 | 0.59 | 0.33 | 3 | dome |  |
| SEA at WAS | -0.235 | 0.59 | 0.33 | 0 | outdoors |  |
| TEN at NYG | -0.020 | 0.59 | 0.33 | -1 | outdoors |  |
| PHI at CHI | -0.013 | 0.59 | 0.33 | 0 | outdoors |  |


LAC at BUF, the edge taken apart. The parts sum to the edge.

| signal | signed | points in the edge |
|---|---:|---:|
| on_field_efficiency | 0.950 | 0.226 |
| scheme_play_design | -0.094 | -0.019 |
| availability | 0.667 | 0.136 |
| schedule_and_body | 0.429 | 0.058 |
| historical_strength | 0.556 | 0.075 |
| trench_personnel | 0.749 | 0.063 |
