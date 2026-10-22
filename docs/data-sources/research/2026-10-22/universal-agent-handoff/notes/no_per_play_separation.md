dub# No per-play separation route exists — aggregates are the floor of resolution

Checked the finest-grained NGS route we hold (`/api/highlights/participation/game/play`) for separation fields.
Result: none.

Participation rows (11 home + 11 away on the sampled play) carry alignment and behaviour only:
`defenderLocation` enum, `wasRunningRoute`, `wasBlitzing`, `isBallCarrier`, `isLinedUpAsQb`, `isOffensePlay`,
`isDefensePlay`, plus identity. No distance, no separation, no cushion. The `play` object carries context —
including a field not previously noted, **`playClockAtSnap`** — but no geometry either.

So the resolution ladder for separation is: **per-receiver game aggregate** (gamecenter `receptionInfo`) and
nothing finer. Per-play separation would have to be reconstructed from tracking frames, and the only tracking
frames available (BDB) are subject-only, already shown to fail.

## What participation is still good for
Alignment is genuinely rich at play level: `defenderLocation` gives 14 positional classes per defender per play
(SAFETY, LEFT_WIDE, RIGHT_SLOT, LEFT_EDGE_RUSHER, ...), which is the strongest defensive-shape signal recovered in
this whole run and is per-defender rather than team-level. Complements the BDB lined_up_position work with the
advantage of being current-season and play-exact.

## New contextual field worth noting
`playClockAtSnap` is a pre-snap timing covariate (hurry-up vs slow), cheap to harvest per play and not in any
public dataset used so far.

## Caveats
- Sampled one play only for field discovery; the schema is per-player and stable, but 22 rows is not a survey.
- `defenderLocation` is populated on defensive rows only; nulls on offence are schema, not missing data.
- Participation is still highlight-gated, so per-play yield stays ~1-5 plays per game.
