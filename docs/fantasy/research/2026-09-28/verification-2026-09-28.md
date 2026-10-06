# Verification record — two labeled bands

**2026-09-28.** Every line below traces to a command run in this session. Where
a check is red, the exact output is quoted rather than summarized.

## COMMANDS AND EXIT CODES

| Command | Exit | Result |
|---|---|---|
| `npm run lint` (repo) | **0** | clean, `--max-warnings=0` |
| `npm run typecheck` (repo root) | **2** | RED — pre-existing, see below |
| `npm run typecheck` (@sports/prediction-engine) | **0** | clean |
| `npm run typecheck` (@sports/web) | **0** | clean |
| `vitest run` (5 variance suites) | **0** | **56 passed / 56** |

## THE REPO-WIDE TYPECHECK FAILURE IS NOT OURS

```
src/nflverse/ingest.ts(23,8): error TS2307: Cannot find module
  '@nflverse/nflreadts' or its corresponding type declarations.
src/nflverse/ingest.ts(314,32): error TS2345: Argument of type 'unknown' ...
src/nflverse/ingest.ts(322,11): error TS18046: 'contracts' is of type 'unknown'.
... 5 more, all downstream of the first
```

Evidence it is pre-existing and not introduced by this work:

- The file is `packages/data-ingestion/src/nflverse/ingest.ts`.
- `git diff --name-only HEAD | grep -c data-ingestion` → **0**. This branch's
  diff does not touch that package.
- `git log -1 -- src/nflverse/ingest.ts` → `0c5d6d7bd`, dated **2026-09-27**,
  i.e. a prior commit by another author.
- Root cause: `@nflverse/nflreadts` is declared in
  `packages/data-ingestion/package.json` but **absent from `node_modules`**
  (`ls node_modules/@nflverse` → no such directory). Every other error is a
  cascade from that one unresolved import.

**Not fixed, deliberately.** AGENTS.md law 7 forbids installing a package
without approval. An unapproved-install failure is reported and the task is
marked blocked, not worked around. The fix is one `npm install` in
`packages/data-ingestion`, which is a founder call.

Both packages this work actually changed — `@sports/prediction-engine` and
`@sports/web` — typecheck clean on their own.

## TEST INVENTORY (56 tests)

| Suite | Tests | Covers |
|---|---|---|
| `projection-bands.test.ts` | 18 | two labeled intervals, coverage-label arithmetic, QB suppression, z values, monotonicity |
| `mccaffrey-spot-check.test.ts` | 13 | the walk-forward projection, EB shrink direction, label reaching the consumer |
| `variance-projections.test.ts` | 12 | per-player bounds, season freshness, provider mapping |
| `variance-wiring.test.ts` | 8 | remaining-games, registration contract, grade-is-context |
| `variance-honesty.test.ts` | 5 | `canPublishProjections` stays false |

The five the spec named, mapped:

1. **Per-player proj/floor/ceiling sanity bounds** — `projection-bands.test.ts`
   ("per-player sanity bounds") plus the pre-existing bounds suite in
   `variance-projections.test.ts`.
2. **Season-freshness assertion, fails loudly** —
   `variance-projections.test.ts` "SEASON FRESHNESS: throws loudly when the
   source is older than the forecast", and the wiring suite's "never registers
   when the training window is stale".
3. **McCaffrey spot-check** — `mccaffrey-spot-check.test.ts`.
4. **canPublishProjections stays false after wiring** —
   `variance-honesty.test.ts`, plus a compile-time guard
   (`ProcessGradeIsNeverPublishable`) added this session.
5. **A QB surface never claims a per-player band** —
   `projection-bands.test.ts` "a quarterback NEVER carries a per-player band",
   and the consumer-level assertion in `mccaffrey-spot-check.test.ts` that the
   note string itself carries the caveat.

## THE ONE TEST I CHANGED RATHER THAN ADDED

`variance-projections.test.ts` "builds a live provider when handed a pool"
asserted `floor 240 / ceiling 390` on a `proj 300, cv 0.3` fixture — that is
the old z=1.0 band. With the default interval now 68% (z=0.806), the correct
values are 227.5 / 372.5.

The fixture's hand-written `floor`/`ceiling` are now **deliberately ignored**:
`varianceRowsToPlayers` recomputes the interval from `cvPlayer` so a hand-typed
band can never disagree with the label. Asserting 240/390 would have pinned a
band the model no longer produces.
