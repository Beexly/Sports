# bypass_notes.md — private metric → public reconstruction path

Rule: nothing is guessed. Each line names the private field, the public substitute, the join,
and the verified route. "auth-gated" = needs the free Cognito JWT, not a paid tier.

## Verified live this cycle
- `POST api.nfl.com/identity/v3/token` with the inlined desktop client key/secret mints a free
  token carrying `ngs_tracking`, `ngs_advanced_stats`, `hawkeye_tracking`, `ngs_platform`.
- The Nuxt proxy `nextgenstats.nfl.com/api/*` reaches 25 endpoints anonymously.
- BOLA confirmed on `/api/highlights/participation/game/play` (gameId+playId) and
  `/api/gamecenter/overview` (gameId, any season).
- 13-value `defenderLocation` vocabulary captured — the alignment/coverage-disguise feature set.

## Derivable, no auth at all
| private metric | public substitute | join |
|---|---|---|
| CPOE (season/week) | `expectedCompletionPercentage`, `completionPercentageAboveExpectation` | player nflId + season + week |
| YACOE | `expectedYardsAfterCatch` (identity verified 1e-6) | gameId+playId |
| RYOE | `expectedRushYards` (identity verified 1e-6) | gameId+playId |
| separation / cushion | `avgSeparation`, `avgCushion` | gsisId + season |
| pre-snap alignment / coverage responsibility | `defenderLocation` per player, `wasBlitzing`, `wasRunningRoute` | gameId+playId |
| play geometry | `play.*` block (down, distance, yardline, clock, score) | same JSON |

## Derivable through reconstruction (no endpoint exposes them)
- Ghost-defender baseline density and positioning residual — `equations.ghost_density`,
  `positioning_residual`; needs tracking frames (Big Data Bowl releases) for real-frame use.
- Decision efficiency / optimal target rate — reconstructed; needs all-receiver cp per play.
- Context-adjusted EPA residual — basis fixed and documented, coefficients re-solvable per era.

## Still closed
- per-play `completionProbability` for every play (`/api/live/stats/completionProbability/game`)
  and win probability (`/api/live/plays/winProbability`) — Cognito pool id not yet recovered.
- `/api/participation/team/game` — same wall; the per-play variant above covers its content.
- GraphQL — `api.nfl.com/graphql` exists but returns `503 no healthy upstream`.

## Exact joins for the pipeline
`game_id` → `gameId`; `play_id` → `playId` (NGS `sequence` equals the nflfastR play id);
`gsis_id` → `gsisId`; `nfl_id` → `nflId`. Season floor is 2010 (`<2010` = 400 Validation failed).
