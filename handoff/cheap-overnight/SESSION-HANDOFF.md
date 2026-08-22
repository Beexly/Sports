# Overnight Handoff — 2026-08-22 (covariate bus + SEP bind)

## Context

Galaxy Sports Edge posture: independent p with process, then e = p − q.
The site is a window — we do NOT build chrome. This slice implements the
**covariate bus (IP)** and the **SEP bind** as pure, leak-safe, fail-closed
feature plumbing — no Odds market ingestion, no y-axis fields as p.

## PRs shipped (origin/hermes/ngs-sep-adot-catch, pushed)

### PR 1 — covariate bus (IP)
`packages/prediction-engine/src/edge-lab/covariate-bus.ts` — pure, no I/O, no Prisma.

- Key: `gsisId + season + week + statType` (receiving | passing | rushing).
- `week=0` (season aggregate) → dropped unconditionally, never selected as next-game X.
- Leak-safe: `sepForKickoff(rows, gsisId, season, kickoffWeek)` uses latest
  `1..kickoffWeek-1` receiving row. No same-week. No future. null → fail-closed.
- Fields: receiving `avgSeparation`/`avgCushion`/`airYardsShare`; passing
  `avgTimeToThrow`/`aggressiveness`/`avgIntendedAirYards`; rushing
  `pctAttemptsGte8Defenders`/`avgTimeToLos`.
- NEVER as p: `expectedCompletionPct`, `avgExpectedYac`, `expectedRushYards`,
  vendor `cpoe`/`ryoe` — all y-axis, explicitly absent from the bus type.
- Honesty: returns `{ value, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" }`
  — weekly mean, not arrival sep. Tagged via `COVARIATE_BUS_METHOD_TAG = "covariate_bus_v1"`.
- Tests: 13 tests in `__tests__/covariate-bus.test.ts` covering leak (week t
  not used for week t), week 0 dropped, missing→null, finite sep≥0, y-axis
  fields absent by construction.

### PR 2 — SEP bind (hermes/ngs-sep-adot-catch)
`packages/prediction-engine/src/edge-lab/props-hb-adot-sep-bind.ts` — binds the bus
into the aDOT×SEP catch model.

- `bindSepSamples(rows, requests)` — caller supplies `SepBindRequest` (gsisId,
  season, kickoffWeek, adot sample). Bus value forwarded verbatim.
- If `sepForKickoff` returns null → sample DROPPED (`ok:false`, `refuse:"no_prior_row"`).
  Never invents 3.0 yards. Never imputes.
- `boundSepSamples()` convenience filter; `priced:false` on every result.
- Honesty header in file: weekly NGS mean forwarded, not arrival separation.
- Barrel exports in `packages/prediction-engine/src/index.ts`:
  `SEP_BIND_METHOD_TAG`, `bindSepSamples`, `boundSepSamples`,
  `SepBindRequest`, `SepBindResult`.
- Tests: 6 tests in `__tests__/props-hb-adot-sep-bind.test.ts` covering leak-safe
  selection (not 99, not 5.0), fail-closed on no prior row / null separation,
  aDOT field preservation, end-to-end aDOT×SEP priors.

## Test results
All 639 tests pass across 62 test files (vitest 2.1.9, 6.70s).

## Next up (not started)
- xYAC bind: `props-hb-air-yac.ts` needs the covariate bus for volume T + YAC
  split. Next bind on the list after SEP.
- If three fails on one file → BLOCKED, move to next bind.

## Watchdog
Watchdog pid 24188 stays live (per AGENT.md). Do not start a second Hermes.
No DONE.md STOP written.
