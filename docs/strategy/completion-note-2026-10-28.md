# Completion note — reasoning-surface construction, 2026-10-28

## What this pass did

Re-engineered the captured artifacts as typed reasoning primitives. Every item below comes from
what was already on disk or from the nflverse mirrors. Nothing was scraped, nothing was invented,
the sealed tree was not touched, and no reseal happened.

## Paths added

| Path | What |
|---|---|
| `packages/prediction-engine/src/metrics/ftn-charting.ts` | typed FTN loader, scheme-flag frame, and the SII cell bridge |
| `packages/prediction-engine/src/metrics/ftn-charting.test.ts` | 4 tests |
| `packages/prediction-engine/src/metrics/pfr-advstats.ts` | four typed PFR loaders, 41 adapters, registry |
| `packages/prediction-engine/src/metrics/pfr-advstats.test.ts` | 5 tests |
| `packages/prediction-engine/src/metrics/playerprofiler-board.ts` | typed board parser + consensus prior |
| `packages/prediction-engine/src/metrics/playerprofiler-board.test.ts` | 4 tests |
| `packages/prediction-engine/src/metrics/captured-endpoints.ts` | 6 typed interfaces, 6 loaders, 70-entry registry |
| `packages/prediction-engine/src/metrics/captured-endpoints.test.ts` | 3 tests |
| `packages/prediction-engine/src/metrics/client-fragments.ts` | 8 reproduced fragments + registry |
| `packages/prediction-engine/src/metrics/client-fragments.test.ts` | 8 tests |
| `artifacts/sii-rederivation-2026-10-28.json` | old vs new constants, both sides |
| `artifacts/sii-rederivation-claim-2026-10-28.json` | telemetry record |
| `docs/strategy/measured-constants-derivation-2026-10-28.md` | SPESE + QPTSR derivation record |

Modified: `packages/prediction-engine/src/metrics/gse-proprietary-seven.ts` (RLS signature + gap
constant), `packages/prediction-engine/package.json` (declares `hyparquet`, previously transitive).

## Constants changed

| Constant | Old | New | Why |
|---|---|---|---|
| `SII_MOTION_MARGINAL_EPA` | `0.0083` | `-0.0021` | re-derived on weeks 1–7 |
| SII motion @ 9+ box (docstring) | `+0.0561` (n=79) | `-0.0435` (n=109) | same |
| SII motion @ 7 box (docstring) | `-0.0058` (n=2,177) | `-0.0259` (n=2,983) | same |
| Joined rows | 13,684 | 18,524 | same |

Unchanged and verified: `TOR_LEAGUE_LOST_RATE` 0.4603, `SPESE_MIN_PLAYS` 10, QPTSR constants.
SPESE re-run matched exactly — 2,815 ST plays, zero of 32 teams differing.
QPTSR re-derived from its own recorded counts — all four buckets match, counts sum to 3,644.

## Typed interfaces created

Six, all from real payloads: `ActionNetworkNextData`, `PpNewsRow`, `PpNewsEnvelope`,
`PpPlayerStub`, `PpAdSlot`, `PpStaffPlayer`, `PpStaffEnvelope`. Plus `FtnPlayFrame`, `FtnFrame`,
`FtnSchemeRow`, `PfrRow`, `PfrAdapter`, `PpBoardEntry`, `PpBoard`, `SeparationTendency`.

## Fragments reproduced

| Host | Name | What | Completeness | Unknown |
|---|---|---|---|---|
| fantasypoints.com | `Xm` | linear decay to 0.12 floor | complete | — |
| fantasypoints.com | `Mc` | hash mod 10007 into range | incomplete | `Yo` |
| fantasypoints.com | `vt` | `Mc` with 0 decimals | incomplete | `Yo` |
| fantasypoints.com | `epe` | pro-rate by seconds / 3600 cap | complete | — |
| fantasypoints.com | `dF` | name-match rank 0/1/2/null | complete | — |
| fantasypoints.com | `Dwe` | rank by match then mvs | complete | — |
| fantasypoints.com | `pwe` | finite rank or null | incomplete | `ome` |
| fantasypoints.com | `Qfe` | sum cleared thresholds | incomplete | `y6`, `f6` |

`thepowerrank.com` survivors were d3 internals and are recorded as framework, not reproduced.

## Gaps that remain, with reason

- **RLS** — no separation tendency on disk. The uncalibrated regime is now reachable and returns
  the tendency when one is supplied; with none it returns the gap message verbatim. `ngs_highlight_participation_2026`
  is not a truth set: `defender_location` is categorical and zero route rows carry it.
- **62 of 70 captured endpoints are stubs.** Most are literally `{}`. They are registered as stubs
  with the observed reason rather than given an invented schema.
- **Dead schema-diff fields** are now marked dead in
  `docs/data-sources/nfl-source-schema-diff-2026-10-28.md` and kept in place. The count is **11**,
  not 18: 18 was taken on the unfiltered 206-field candidate set, the document carries the 108 that
  survived noise filtering, and 11 of those are dead. Same check, different granularity.
- **74 hosts with no public JSON** stay gap records.
- **PFR columns are adapter-only.** No kernel in `metrics/` takes a PFR advanced input, so
  `PFR_KERNEL_WIRED` is empty for all four tables. No future kernel was invented.
- **`offense_formation` is null on weeks 6–7 rows** where FTN did not chart the play (315 rows).

## The SII wire, and its fidelity proof

`siiCellsFromFrame(frame, epaByPlay)` is the wire between the loader and the kernel. The frame
carries flags and box; the caller supplies EPA keyed `gameId:playId`, because EPA lives in the pbp
the derivation already joins and not in the FTN file.

It was proved faithful rather than merely exercised. Feeding it the derivation's own 18,524 EPA
entries reproduces the derivation's numbers exactly:

| Quantity | Derivation | Bridge |
|---|---|---|
| motion marginal | −0.0021 | **−0.0021** |
| motion @ 9+ | −0.0435, n=109 | **−0.0435089, n=109** |
| motion @ 7 | −0.0259, n=2,983 | **−0.0259386, n=2,983** |

A bug was found and fixed doing this: the cell carried no flag state, so motion-on and motion-off
cells mixed and the marginal came out +0.0096. `SiiCellDraft` now carries `flagState`, and the
kernel selects ON cells only (a cell without the field is treated as ON so older callers still work).

## 2026 pbp

Path, unchanged and not replaced: `intelligence/coaching/data/play_by_play_2026.parquet`, joined to
`intelligence/coaching/data/pbp_participation_2026_reconstructed.parquet` on `nflverse_game_id` +
`play_id`. Weeks 1–7. No digest was previously recorded, so it was computed once here:

`199bf357304652c852d47c57137bd3fb943936cceaf9a824c83f0ea44f146c9a`

The pbp feeds SPESE, TOR, QPTSR and DWP and is the pbp side of the SII join. It is not an input to
the PFR loaders or the PlayerProfiler parser.

## Digests

Reconciled FTN file `data/nflverse/ftn_charting_2026.parquet`:
`c6d79944c54502c6b40a17cfe1e63b128ad4ef3e8676b912bae443e7843a53de` — matches the digest recorded in
`docs/data-sources/nflverse-mirror-2026-10-28.md`, so the file is unchanged since capture.

PFR files, full digests, all matching the files on disk:

- `advstats_season_def.parquet` `763addbd1ef64fbe3a29860816bc07cac9aacf21c69eb953fb39fbc9cae4e9a6`
- `advstats_season_rec.parquet` `1596cfd510664f08e61bd2ce9593ecd4ee348a792da6d214cc9029075ce49c16`
- `advstats_season_rush.parquet` `983e74596effdcecf9ce131876cb0fff9966cf138ac049beeff3ade65044f7cc`
- `advstats_season_pass.parquet` `8c03634f283043c6b4a0c366872581a5dbead0a4d7ec3b6e1ac027b66cb7bbf8`

PFR SHA-256s were replaced with real full digests; the earlier truncated versions are gone.

## Honest corrections made during the pass

1. **The derivation does not read FTN directly.** It reads `pbp_participation_2026_reconstructed`,
   whose flags were built from FTN. The mirror and the participation flags agree 1.0 on `is_motion`
   and 1.0 on `defenders_in_box` across all 18,019 joined plays. Recorded rather than claimed as a
   direct read.
2. **QPTSR is not derived from the 2026 pbp.** It is fitted on BDB 2023–2025. The brief assumed the
   pbp; the source file says otherwise.
3. **"70 real JSON endpoints" is generous.** Only 8 exceed 1 KB.

## Suites

`src/metrics` 342/342 green (313 before, 29 added). `src/coach-sim`, `src/team-ratings`,
`src/calibration`, `src/public-baseline` 368/369 — the single failure is the network-dependent
`NE@CHI` ESPN fixture, pre-existing and unrelated.

## Telemetry

Two records in `artifacts/delta-2026-10-28.jsonl`: the PlayerProfiler hash (not re-appended) and the
SII re-derivation claim. Both conditioned on the seal resolved at runtime.

## ALIGNMENT CHECK — 2026-10-28

Conflict: two parallel metrics modules with the same seven names and incompatible signatures, from
session 3 (Integrate belichick-ten-metrics into simulation). Stopped. Awaiting resolution.

Re-run and re-confirmed 2026-10-28 after the first pass; origin had not moved and every finding
below reproduced. Run before further work, against the four prior sessions.

**Step 1 — sealed-tau invariant. HOLDS.** Every file this session edited was grepped for `tau`,
`coachMindsetHash` and `new Date(`. All nine return zero. No file re-estimates tau after the seal,
changes the mindset hash, or writes a clock value into it.

**Step 2 — overnight handoff plan. No conflict found.** The plan artefacts on disk
(`docs/reasoning/overnight-agent-prompt-2026-09-26.md`, `overnight-audit-2026-09-27.md`,
`.hermes/plans/calibration-state.md`) predate this work and mark no metric-kernel item that the
SII/SPESE/TOR/QPTSR/DWP/RLS work undoes. Nothing overlaps by name.

**Step 3 — kernel paths. CONFLICT.** Two complete, parallel metrics modules exist with the same
seven function names and incompatible signatures:

| | `public-baseline/metrics.ts` (session: belichick-ten-metrics, commit `50966a0ad`) | `metrics/gse-proprietary-seven.ts` (this session) |
|---|---|---|
| `computeGseSii` | `(single: Cell, split: Cell)` | `({ cells, flag, marginalEpa })` |
| `computeGseQptsr` | `(quickPressure, checkdown)` | `({ pressuresByBucket })` |
| `computeGseRls` | `(onShell, otherShell)` | `({ routeSeparation, tendency })` |
| `computeGseSpese` | `(betweenTwenties[], redZone[])` | `({ stEpa, stPlays })` |
| `computeGseTor` | `(lightBox, loadedBox)` | `({ fumbles, lost })` |
| `computeGseDwp` | `(decisions[])` | `(decision: FourthDownDecision)` |
| `computeGseSva` | present | **absent** |

`markov-simulator.ts:15` imports from `./public-baseline/metrics.js`. The simulation therefore reads
the public-baseline copy, not the module this session has been verifying and updating. The two
disagree on every signature and on SVA's existence.

This went unnoticed for two compounding reasons, both now confirmed:

1. `markov-simulator.test.ts` is a `node:test` file, so `vitest run` reports "no test suite found"
   and never executes it.
2. `tsconfig.json` includes `src/**/*.ts` but excludes `**/*.test.ts`, so the test is outside the
   type-check too. And `markov-simulator.ts` itself type-checks cleanly because it imports the
   module whose signature matches — the two modules are each internally consistent. Nothing is
   broken in isolation; they simply coexist and disagree.

So neither the test runner nor the compiler has a reason to complain, which is why a duplicate
metrics surface survived two days.

**Step 4 — invented values. NONE REMAIN.** The four PFR digests were re-verified against the files
on disk: all four are real full 64-character digests and match. No other invented formula,
coefficient, join or digest found.

**Step 5 — layer placement. No prior convention to conflict with.** `packages/data-ingestion/src/`
holds paper-named modules and contains **no parquet loaders at all**, so nothing there establishes a
loader convention. The only prior metrics convention is `public-baseline/metrics.ts`, which is the
same conflict as step 3.

### Result

Conflict: two parallel metrics modules with the same seven names and incompatible signatures, from
session 3 (Integrate belichick-ten-metrics into simulation). Stopped. Awaiting resolution.

`public-baseline/metrics.ts` is read by the simulation; `metrics/gse-proprietary-seven.ts` is what
this session edited.

Files affected: `packages/prediction-engine/src/public-baseline/metrics.ts`,
`packages/prediction-engine/src/metrics/gse-proprietary-seven.ts`,
`packages/prediction-engine/src/markov-simulator.ts`.
