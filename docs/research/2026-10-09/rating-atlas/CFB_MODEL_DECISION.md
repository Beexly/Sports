# College football model decision — 2026-10-09

## Verdict

Additional model. Do not fold college into the NFL model.

## What exists

- `packages/data-ingestion/src/cfbfastr-intake.ts` on main. Data intake only. Env-gated (`CFBFASTR_INTAKE_ENABLED`), fail-closed, null-on-missing, as-of discipline. It validates play rows and aggregates EPA. It does not price a game.
- `packages/data-ingestion/src/espn-schedule-seed.ts` and `paid-odds-governor.ts` know college exists as a board. The governor notes that college boards are several groups and an empty board skips the paid path.
- `packages/prediction-engine` has no college, cfb, or CFB code. Verified by code search on 2026-10-09.

## What is shared, and what is not

Shared, because the math is the same sport-agnostic layer:

- Shin and the other devigs
- Calibration (Brier, PIT, ECE, temperature, conformal)
- CLV ledger and the close as the bar
- Kelly sizing
- Honesty gates and the no-pick rule

Not shared, because the data-generating process is different:

- Sigma. NFL ladder is 13.45. College margins are wider and conference-heterogeneous. Do not copy 13.45.
- Home field. NFL modern point is about 1.56 to 1.58 on 2019+. College home field is larger and varies by conference and travel. Do not copy 1.56. Production NFL is 0.025 EPA/play, which is also not a college constant.
- Rating scale and talent gap. A 40-point college favorite is a normal observation. It is an outlier in the NFL.
- Covariates. Altitude, travel, and rest may price differently, and the close is thinner outside the power conferences. The NFL finding that rest and travel die against the close does not automatically transfer. It has to be re-tested.
- Market quality. Pinnacle-quality closes exist for a slice of FBS. They do not exist for the long tail. A model that beats a soft college open is not an edge.

## What tomorrow is

Saturday 2026-10-10 is a college slate. No NFL. The research packet cannot score it. The intake can accept plays after the games if the env flag is on. It cannot produce a number before kickoff.

## Build order, if college is next

1. Games table and closing-line join for FBS only. Keyless schedule first. Closes only where a real close exists.
2. Fit sigma and home field on college residuals against the close. Do not start from the NFL numbers.
3. Leakage-free holdout. Last season sealed.
4. Score against the close, not against the open.
5. Only then decide whether a rating (Glicko-2 or otherwise) adds anything the close does not have.

Until that fit prints, college is a separate model that has not been built. It is not a config flag on the NFL engine.

## Readiness — 2026-10-10

- Separate model required. College is not a flag on the NFL engine and never becomes one.
- Intake exists on main (`cfbfastr-intake.ts`); no college model exists in `packages/prediction-engine`, and none was added.
- Saturday's slate is not scored until sigma and home field are fit on college rows only — against a real college close, with last season sealed. NFL 13.45 and HFA 1.56 (and the production 0.025 EPA/play) are NFL constants and stay out of college.
- The 2026-10-10 point-in-time warehouse (`WAREHOUSE_SCHEMA.md`) is where a college close join would land once a college close source exists.
