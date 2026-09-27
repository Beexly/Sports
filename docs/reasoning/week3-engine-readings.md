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
| officials | 0.04 | premise |
| chemistry | 0.04 | premise |
| bio_nutrition | 0.04 | dark |
| narrative_contract | 0.03 | dark |
| social | 0.00 | dark |
| calibration_meters | 0.03 | meter |
| airwave | 0.05 | premise |

Dark share by design: 0.20. Those families are named so they are not forgotten. They contribute nothing until a row exists.

| game | edge | coverage | dark | rest | roof | referee |
|---|---:|---:|---:|---:|---|---|
| ATL at GB | 0.126 | 0.67 | 0.25 | 0 | outdoors | Shawn Smith |
| ARI at SF | 0.109 | 0.68 | 0.24 | 0 | outdoors |  |
| BAL at DAL | -0.029 | 0.68 | 0.24 | 0 |  |  |
| CAR at CLE | -0.009 | 0.68 | 0.24 | 0 | outdoors |  |
| CIN at PIT | -0.039 | 0.68 | 0.24 | 0 | outdoors |  |
| HOU at IND | 0.075 | 0.68 | 0.24 | 0 |  |  |
| KC at MIA | -0.154 | 0.68 | 0.24 | 0 | outdoors |  |
| LAC at BUF | 0.303 | 0.68 | 0.24 | 3 | outdoors |  |
| LA at DEN | 0.024 | 0.68 | 0.24 | 1 | outdoors |  |
| LV at NO | 0.055 | 0.68 | 0.24 | 0 | dome |  |
| MIN at TB | 0.072 | 0.68 | 0.24 | 0 | outdoors |  |
| NE at JAX | 0.105 | 0.68 | 0.24 | 0 | outdoors |  |
| NYJ at DET | 0.200 | 0.68 | 0.24 | 3 | dome |  |
| SEA at WAS | -0.156 | 0.68 | 0.24 | 0 | outdoors |  |
| TEN at NYG | -0.028 | 0.68 | 0.24 | -1 | outdoors |  |
| PHI at CHI | -0.010 | 0.68 | 0.24 | 0 | outdoors |  |


LAC at BUF, the edge taken apart. The parts sum to the edge.

| signal | signed | points in the edge |
|---|---:|---:|
| on_field_efficiency | 1.000 | 0.140 |
| scheme_play_design | 0.034 | 0.004 |
| availability | 0.667 | 0.080 |
| schedule_and_body | 0.088 | 0.007 |
| historical_strength | 0.556 | 0.044 |
| trench_personnel | 0.749 | 0.037 |
| chemistry | 0.000 | 0.000 |
| airwave | -0.208 | -0.010 |
