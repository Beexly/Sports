# Seal-gate completion — 2026-10-28

**Branch:** `engine/public-baseline-2026-10-24`
**HEAD:** `734da2d020f77526c0d180a6c95a904ba0dcd824` — verified equal to origin.
**Resealed:** no. Seal merkle unchanged at `23245bcb…`, resolved at runtime, never hard-coded.

## What closed

**Rule 4 — cross-runtime serializer conflict.** `canonicalizeForSeal` +
`computeCanonicalSealDigest` in `locked-projection.ts`, applied to both `coachMindsetHash` call
sites: recursive lexicographic key sort at every depth, `undefined` dropped, arrays left in order.
`canonical_hash` in the simulator narrows integral floats.

The blueprint prescribed key sorting as the whole fix. It is half. With keys already sorted on both
sides, the real sealed payload still hashed `a293ee26…` from TypeScript and `14d05395…` from Python,
because Python emits `27.0` where JS emits `27`. Both runtimes now produce `a293ee26…`.

`golden-digest-parity.test.ts` pins the agreement — hostile fixture (reverse-lexicographic insertion
at every depth, nested arrays, an undefined member) plus the real-payload float case. Five tests.

**D3.** `candidates/` tracked. `_quarantine/` canonical, `_QUARANTINE_PLACEHOLDER_20261027_185538/`
superseded audit trail. Week-8 copy is the placeholder (tau 0.001, sequential parent `faab2827`).

**D6.** Cron registry and `CADENCE` 1:1 at 6/6, zero orphans. The two Sunday v4.0 slots are distinct
early/afternoon-slate locks, not a duplicate.

## Verification

Two consecutive fresh-process sweeps of the blueprint's suite — metrics, coach-sim, coach-brain,
gse-pre-seal, p0-seal-isolation, calibration-knots-monotone, golden-digest-parity:

| Run | Files | Tests | Failures |
|---|---|---|---|
| 1 | 65 | 467 | 0 |
| 2 | 65 | 467 | 0 |

Delta selftest: PASS, zero skips. 10,000-sim stress: completes.

## Still open

307 of 319 citations unverified by the 4-layer AST and metadata verifier. D8 (`cffa75a` absent).
Google Docs API 403. QB estimator re-run needs 2024/2025 injury CSVs. RLS needs the NGS
player-tracking feed. `ne-chi-fixture.test.ts` fails on a live `webws.365scores.com` fetch.

## Blueprint claims wrong on disk

Orchestrator has 0 `ticket: null` literals, not 1 at line 180. `call-sheet.ts` has 9 sites not 8;
`x-corpus.ts` 5 not 6. `ENABLED=false` is 202 modules, not 146. Key sorting alone does not close
Rule 4.
