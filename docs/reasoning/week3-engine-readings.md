# Engine edge, week 3

The edge is the sum of prior times signal across the whole table. A dark family adds zero and the live families are not scaled up to hide it. The price is context. Brier, Kelly, and Bradley-Terry are meters.
On-field efficiency is a shrunk opponent-adjusted blend: 55% pass EPA residual, 15% rush EPA residual, 15% CPOE, 10% explosive-pass rate, 5% interception luck. The 2025 season is the prior. 2026 weeks 1-2 are the observation.
Airwave is in the edge at a prior of 0.05. It is the questionable and doubtful skill wire, not a second copy of the out list. SiriusXM audio was not captured.
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
| social | 0.00 | dark |
| calibration_meters | 0.03 | meter |
| airwave | 0.05 | premise |

Dark share by design: 0.28. Those families are named so they are not forgotten. They contribute nothing until a row exists.

| game | edge | coverage | dark | rest | roof | referee |
|---|---:|---:|---:|---:|---|---|
| ATL at GB | 0.054 | 0.59 | 0.33 | 0 | outdoors | Shawn Smith |
| ARI at SF | 0.100 | 0.64 | 0.28 | 0 | outdoors |  |
| BAL at DAL | -0.022 | 0.64 | 0.28 | 0 |  |  |
| CAR at CLE | 0.012 | 0.64 | 0.28 | 0 | outdoors |  |
| CIN at PIT | -0.026 | 0.64 | 0.28 | 0 | outdoors |  |
| HOU at IND | 0.059 | 0.64 | 0.28 | 0 |  |  |
| KC at MIA | -0.157 | 0.64 | 0.28 | 0 | outdoors |  |
| LAC at BUF | 0.308 | 0.64 | 0.28 | 3 | outdoors |  |
| LA at DEN | 0.028 | 0.64 | 0.28 | 1 | outdoors |  |
| LV at NO | 0.077 | 0.64 | 0.28 | 0 | dome |  |
| MIN at TB | 0.028 | 0.64 | 0.28 | 0 | outdoors |  |
| NE at JAX | 0.097 | 0.64 | 0.28 | 0 | outdoors |  |
| NYJ at DET | 0.211 | 0.64 | 0.28 | 3 | dome |  |
| SEA at WAS | -0.139 | 0.64 | 0.28 | 0 | outdoors |  |
| TEN at NYG | -0.001 | 0.64 | 0.28 | -1 | outdoors |  |
| PHI at CHI | -0.018 | 0.64 | 0.28 | 0 | outdoors |  |


LAC at BUF, the edge taken apart. The parts sum to the edge.

| signal | signed | points in the edge |
|---|---:|---:|
| on_field_efficiency | 0.950 | 0.133 |
| scheme_play_design | -0.094 | -0.011 |
| availability | 0.667 | 0.080 |
| schedule_and_body | 0.429 | 0.034 |
| historical_strength | 0.556 | 0.044 |
| trench_personnel | 0.749 | 0.037 |
| airwave | -0.208 | -0.010 |
