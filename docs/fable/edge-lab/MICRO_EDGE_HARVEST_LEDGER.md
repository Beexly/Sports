# Micro Edge Harvest Ledger

| Candidate | Source type | Metric affected | Decision | Falsification rule |
| --- | --- | --- | --- | --- |
| source freshness decay | public/source metadata | projection staleness | test | no degradation signal after replay windows |
| public injury-report timing delta | public injury report | availability adjustment | test | no lift versus same-day baseline |
| roster transaction shock score | public transactions | role projection | test | shock bucket has no error separation |
| schedule fatigue/rest asymmetry | schedule facts | team efficiency | test | rest delta is not stable out-of-sample |
| travel/body-clock/weather/turf interaction | schedule/weather/venue facts | pace and efficiency | needs data | interaction unstable below sample floor |
| depth chart instability | public depth chart | player role confidence | test | instability does not widen residuals |
| market movement versus public event timestamp | public odds/event time | market disagreement | hold | movement cannot be timestamped lawfully |
| stale consensus penalty | public consensus snapshots | consensus weighting | needs legal review | consensus source cannot be stored |
| model disagreement entropy | model outputs | uncertainty ranking | test | entropy fails to predict review value |
| calibration degradation after roster shock | model/replay | calibration | test | Brier delta not worse after shock bucket |
| team/position-specific drift | safe football segments | drift monitor | test | no segment drift beyond threshold |
| public narrative volatility index | public/manual claim log | narrative risk | needs legal review | automated capture not allowed |
| what changed since market open forensic report | public facts + fixture | explanation quality | test | report adds no auditable flag |
| public-data approximation to tracking metrics | public play data | derived proxy | hold | proxy not correlated with target |
| uncertainty-weighted label selection | model probabilities | labeling efficiency | test | selected labels do not reduce review error |
| source contradiction detection | source metadata | source reliability | test | contradictions are too sparse |
| coach tendency shift after injuries | public play data | scheme tendency | test | post-injury tendency not stable |
| offensive-line continuity proxy | public depth/roster | pressure/rush proxy | needs data | proxy unavailable or stale |
| defensive personnel volatility proxy | public roster/depth | defensive efficiency | needs data | volatility not measurable |
| late-week practice participation trajectory | public injury reports | availability | needs legal review | source terms block storage |
| book-to-book dispersion as uncertainty proxy | licensed odds | uncertainty | needs owner decision | cost or license blocks test |
| crowding/steam reversal detection | licensed odds | market reliability | needs owner decision | no lawful data feed |
| player role elasticity after transaction shock | public transactions | player usage | test | role elasticity has no predictive value |
