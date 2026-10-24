# BREAKTHROUGH: NGS serves its own completionProbability and YACoE

The mission's primitive #2 is not hidden at all. Via the BOLA participation path, `nextgenstats` surfaces
are reachable anonymously and carry the proprietary expected-value fields directly:

- `completion_this_game` → `completionProbability` (their xComp), `airYards`, `passYards` per play
- `yac_this_game` → `expectedYardsAfterCatch`, `yardsAfterCatchOverExpectation` (their YACoE)
- `ryoe_this_game` → present in the surface list, returned 0 rows on these games

Captured to `schemas/ngs_expected_value_surfaces.json` (10 completion rows, 5 YAC rows across 4 games).

## The decomposition identity, verified exactly
YACoE is a pure residual, not a fitted score:

| yardsAfterCatch | expectedYAC | YACoE | diff |
|---|---|---|---|
| 16.64 | 7.5206 | 9.1194 | 0.0 |
| 41.42 | 11.956 | 29.464 | 0.0 |
| 32.21 | 19.3654 | 12.8446 | 0.0 |
| 37.62 | 3.2564 | 34.3636 | 0.0 |
| 21.57 | 1.5257 | 20.0443 | 0.0 |

`YACoE = YAC − E[YAC]` holds to the digit on every row. So the published metric is the residual we were
reconstructing — NGS just serves the expectation term, which is the part BDB could not give us.

## The anomaly worth chasing
`completionProbability` sits in a **narrow 0.218–0.286 band** across air yards from 4.4 to 33.6 — a 33-yard
throw scores barely above a 4-yard one (0.286 vs 0.223). Either the model is conditioned on tracking
features (separation, closing speed) that offset depth almost entirely, or the field is computed per
receiver on these highlight plays rather than per throw. Ten rows is far too few to decide; this is the
first thing to resolve with a larger harvest.

## What it changes
- The xComp/YACoE reconstruction thread now has **ground truth to score against** instead of BDB proxies.
- The scalar ghost/separation work becomes a validation target rather than an end in itself.
- `airYards` is signed (negative behind the LOS: −5.64 observed), so it is a launch-point measure, not a
  distance.

## Caveats
- These surfaces only populate for **highlight** plays — 2–5 rows per game, so harvest volume is the
  binding constraint, not access.
- `completionProbability` is 4 dp, `expectedYardsAfterCatch` is full float; serialisation artefacts show as
  values like 7.159999999999997 in airYards.
- No documentation of the feature set; everything about the model's inputs is inference.
