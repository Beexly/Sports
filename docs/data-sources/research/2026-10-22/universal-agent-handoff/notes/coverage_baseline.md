# Coverage baseline — pre-snap only (BDB 2027 labels)

First model on the 275,278 labelled player-play rows (`team_coverage_man_zone`), pre-snap features
only: down, yards_to_go, formation, receiver alignment, motion flag, quarter, scores.

HistGradientBoosting, stratified 75/25 split: **AUC 0.719**, Brier **0.1736** vs 0.2022 base rate
(man 28.1%). So pre-snap state carries real signal but nowhere near resolution — this is a prior, not
a decoder.

## Permutation importance (AUC drop, 4k sample, 5 repeats, full-model AUC 0.7088)
| feature | ΔAUC |
|---|---|
| yards_to_go | **+0.1464** |
| down | **+0.0478** |
| pre_snap_visitor_score | +0.0215 |
| pre_snap_home_score | +0.0161 |
| quarter | +0.0066 |
| formation WILDCAT | +0.0022 |
| alignment 2x2 | +0.0017 |
| formation SHOTGUN | +0.0017 |

## The uncomfortable result
Distance (14.6 pts of AUC) dwarfs everything. **Formation and alignment, the features the scouting
literature treats as the tells, contribute ~0.1–0.2 pts each.** The motion flag is inert — but it is
only true on 3,417 of 275,278 rows (1.2%), so its null here says more about sparsity than about
motion's value.

Interpretation: down-and-distance proxies the called concept (3rd-and-long is a passing down is a
zone-beating down), so the model is largely learning *situation*, not *shape*. The clustering
approach in the BDB 2025 deck bypasses this by encoding per-player leverage, which a categorical
`receiver_alignment` cannot represent.

## Next
Needs player-level position features (BDB 2027 has `lined_up_position` per player, plus tracking) and
the motion subset modelled separately. Man rate 28.1% is also the imbalance floor any real decoder
must beat.
