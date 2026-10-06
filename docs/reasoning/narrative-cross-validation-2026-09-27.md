# Cross-validation: narrative_contract clears honesty under two constructions

Two agents ran the same work order on the same night. Both reached `narrative_contract`, and
both cleared the honesty bars and landed on **STORED, g = 0.2, winning term f3**. They got
there by different routes, on different data paths, with different sample sizes.

That is worth more than either number alone.

## The two measurements

| | lane A (snap-weighted) | lane B (player-slot weighted) |
|---|---|---|
| grain | mean APY gap, snap-weighted per team | mean APY gap, players actually on field |
| how a player is attributed | snap counts joined to rosters | `players_on_field` from participation, via the validated crosswalk |
| training rows | n=1942 | n=1942 |
| training r | 0.23071486948840408 | 0.31023913820488336 |
| holdout n | 285 | 285 |
| **holdout r** | **0.24637068951161498** | **0.1511247312921503** |
| **holdout slope** | **0.8304928047049019** | **0.03416118167229238** |
| **holdout se** | **0.19420308361768532** | **0.013282727356504953** |
| \|r\| >= 0.08 | clears | clears |
| \|slope\| > se | clears | clears |
| verdict | STORED, g=0.2, f3 | STORED, g=0.2, f3 |

Lane B resolves 7,800,652 of 7,952,525 player slots (98.09%) to a contract and a team, using
`players_on_field` and a jersey-number-to-gsis crosswalk. Lane A resolves fewer, because it
only credits a player when that player has snaps. Lane B is the stronger construction and its
write-up is canonical.

## Why the agreement is informative

The two numbers are nowhere near each other — r 0.246 against r 0.151, slope 0.83 against
0.034, a factor of 24 on the slope. If the effect were an artefact of one lane's join logic,
one of these would have failed. Both cleared `|r| >= 0.08` and `|slope| > se` on a 2025
holdout scored by coefficients fitted on 2018-2024 only, and both produced the identical
scalarizer verdict.

The honest reading: **the family carries a real, out-of-sample relationship with home wins**,
and the exact magnitude depends heavily on how you weight a player's presence. That is a
statement about the measurement, not a licence to pick the larger number.

The crosswalk finding from lane B is what made the early seasons usable at all. Before it,
`players_on_field` was jersey numbers in 2018-2022 and gsis ids in 2023-2025, so any all-season
personnel number was capped near 0.38 for reasons that had nothing to do with the football.
Lane A hit that wall independently and could only use snap counts as a proxy.

## The direction is agreed, and it is against LAC

Both lanes measured the LAC@BUF pair from the latest sealed rows and both got a **negative**
value, meaning Buffalo carries the higher contract intensity:

| | lane A | lane B |
|---|---|---|
| LAC mean APY | 7.51068815816024 (3370 snaps) | 7.51 (snap-weighted) |
| BUF mean APY | 10.65846376323198 (3552 snaps) | 10.66 (snap-weighted) |
| signed | -0.22040098946402953 | negative |

At the existing 0.03 prior this family will pull the LAC edge **down**, not up. Neither lane
found a version of this feature that favours LAC.

## Neither lane wrote a registry row

`data/reasoning/parts-registry.jsonl` is unmodified at 8 rows and the LAC edge still recomputes
to exactly `0.30259224777263855`. `g = 0.2`, not 0, so the scalarizer does not permit a
registry row, and the target game has no week-3 snap data yet. Both lanes built and proved the
command that produces the row when that data arrives; on `2026_03_ATL_GB`, the one 2026 week-3
game nflverse has published, `selectPart` returns **LIVE, g = 0**.

## What is still contested

- The magnitude. 0.83 versus 0.034 on the holdout slope. Whoever wires this should use lane
  B's player-slot construction, and should say so.
- Whether the feature belongs in the edge at all before a week-3 row exists. The scalarizer
  says no, and the scalarizer is the only thing that says.

Neither of those is a reason to re-run either measurement. Both are recorded.
