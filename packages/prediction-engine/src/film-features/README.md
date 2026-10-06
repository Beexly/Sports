# CV-to-engine bridge (film-features)

**Layer 4 of the film system: understanding → prediction.**

- Layer 1 (tracking): detections → tracklets → field coordinates (Stream A)
- Layer 2 (perception): tracklets → plays (`src/perception/`, Stream D)
- Layer 3 (memory): plays → tendencies (`src/perception/cv-tendencies.ts`)
- **Layer 4 (bridge, here): plays/tendencies → engine inputs (shadow only)**

## What this is

Pure functions that turn film understanding into the exact input shapes
the props / fantasy / pick lanes already consume — plus a shadow scoring
harness that runs the engine twice per slate (control vs film treatment)
and logs both arms to the shadow ledger.

## The honesty contract

- **weight = 0 everywhere**, typed as the literal `0`. The type system —
  not convention — enforces that film cannot move a published number.
- Every feature and every shadow row is labeled **UNCALIBRATED**.
- The blend law is `P = (1−w)·P_base + w·P_film` with `w = 0`.
- `blendedProb` (the published number) is ALWAYS the control arm.
- `wouldBeDeltaW1` is the research signal the calibrate step will fit on.
- Public surface shows projections and rankings ONLY. Film internals,
  metric names, and methodology never leak.

## Engine order

research → **wire** → weight → calibrate → test → polish

This package is the **wire** step. Weight/calibrate/test/polish are later
streams and must not be attempted here.

## Modules

| File | Purpose |
|---|---|
| `film-provenance.ts` | Provenance stamp + calibration labels |
| `film-types.ts` | `FilmPlayInput` (PlayRecord + enrichment) |
| `player-film-features.ts` | Route mix, target share, separation per player |
| `team-film-features.ts` | Down×distance matrix, formation freq, rates |
| `game-script-features.ts` | Quarter/clock/score/field-zone vector |
| `route-combo-features.ts` | Route-combo frequency + results |
| `film-priors.ts` | Honest film probability priors (weight 0) |
| `film-feature-adapter.ts` | `toPropsInputs` / `toFantasyInputs` / `toPickInputs` |
| `shadow/film-shadow-harness.ts` | Control/treatment engine runs + ledger rows |
| `backtest/film-backtest-2024.ts` | Deterministic synthetic-season replay |
| `db/schema/watch-shadow-ledger.sql` | Shadow ledger DDL (branch-only) |

## v2 gaps (documented, not hidden)

- Coverage shells: always `'unknown'` — broadcast film doesn't classify
  the defensive shell yet.
- EPA on plays: null by design until the result-wiring stream lands.
- Player identity: needs the tracklet→player map (number OCR / manual);
  without it, player features are skipped, never guessed.
- Coefficients in `film-priors.ts` are UNCALIBRATED heuristics — the
  calibrate step fits them on held-out slates.
