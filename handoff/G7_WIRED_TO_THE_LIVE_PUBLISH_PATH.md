# G7 IS WIRED — the circuit breaker now stops a drifting family on the live board

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21
**Closes:** the "G7 has no live importer" finding in
`handoff/WIRING_FEASIBILITY_THE_FINDING.md` — G7 was one of the **seven of nine** gates
with no live evidence producer.

---

## 1. What was dead, and why it was safe to wire

`packages/prediction-engine/src/learning/g7-circuit-breaker.ts` computed a per-market-family
calibration-drift verdict correctly — it has 15 tests and a 10-mutation sweep — and
**nothing consumed it**. The module had **zero live importers**, and the spec's rule
(*"If ECE30-ECE250>0.02, Gate G7 halts firing on that market family"*) had no path to a
family's picks.

**Why this one was safe to wire, and the other six were not.** The audit's finding was that
seven of nine gates have no live evidence producer, and that feeding a gate a
rubber-stamped verdict is **worse than no gate** — it would report "passed" on evidence
nobody produced. G7 is different: its verdict is computed from **real settled bets**, with
their real outcomes and their real settlement times, and it was measured at **0 false halts
in 400 perfectly calibrated families**. The evidence is real, so the wiring is real.

**The repo already had the other half.** A durable per-group pause list, a per-group key in
the repo's own `sport|market` form, and a **live reader on the public surface**:
`/api/picks` calls `passesPublicSelectiveFilterAsync` per pick, which returns false for a
paused group and the pick is dropped from the response. **The gate was live. The producer
was missing.**

## 2. The wiring — three hops

**HOP 1 — PRODUCER.** `apps/web/lib/calibration/proven-path-engine.ts` now runs the G7
breaker over the settled, time-stamped rows the plan is already given, and puts the halt
list on the plan as `g7HaltedGroups` (plus a `g7Note` an operator can check).

```
const g7Observations: SettledObservation[] = [];
for (const r of rows) {
  const settledAt = r.settledAt;
  if (settledAt == null || !Number.isFinite(settledAt)) continue;
  const raw = r.pIndependent ?? r.pConfidence;
  if (!Number.isFinite(raw)) continue;
  g7Observations.push({ groupKey: r.groupKey, p: Math.min(1, Math.max(0, raw)), y: r.y, settledAt });
}
const g7Report = g7CircuitBreaker(g7Observations);
const g7HaltedGroups = g7HaltedGroupKeys(g7Report);
```

**WHAT `p` IS, AND WHY IT IS NOT `marketP`.** G7 is a **calibration** rule: it asks whether
the **engine's own** forecast has drifted from its realised outcomes. So the probability is
`pIndependent` (the model's own trueProb) when the row has one, and `pConfidence`
otherwise. It is deliberately **not** `marketP` — that is the *market's* forecast, and
grading the market against the outcome is a different question, and one the engine cannot
fix.

**WHY THE TIMESTAMP IS REQUIRED.** The fast window is the most recent 30 settled bets and
the slow baseline the most recent 250, **ordered by settlement time**. A row with no
settlement time has no place in either window: it is **skipped, not defaulted**.

**HOP 2 — TRANSPORT.** The plan is persisted whole (`JSON.stringify(plan)`) and read back
whole (`plan: raw as ProvenPathPlan`), so the new field survives to the runtime. The
existing validator still requires `pauseGroups` and `defaultDelta`; a plan persisted before
this change simply has no `g7HaltedGroups`, and the runtime reads that as "no family is
halted".

**HOP 3 — CONSUMER.** `apps/web/lib/calibration/selective-publish-runtime.ts` — the function
`/api/picks` calls per pick — now drops a pick whose family is in the list:

```ts
const groupKey = `${pick.sportKey ?? "unknown"}|${pick.pickType ?? "unknown"}`;
if (cfg.pausedGroups.includes(groupKey)) return false;
if (cfg.g7HaltedGroups.includes(groupKey)) return false;   // <-- the wiring
```

## 3. Why it is NOT the founder's pause list

`pauseGroups` is the **founder's** list and is **advisory** until the founder opts in
(`ranking-pause-apply.ts` needs `RANKING_PAUSE_APPLY`, or `SELECTIVE_PAUSE_GROUPS`, or a
durable founder-yes). **A machine-computed calibration halt must not need a human to approve
it**, and it must not overwrite the founder's list either.

So: **two lists, two owners, applied together.** The G7 list is machine-owned and always
applied; the founder's list is founder-owned and gated. The tests pin the separation in
both directions.

## 4. The plumbing that had to be threaded

G7 requires a settlement timestamp, and the row type did not carry one:

| file | change |
|---|---|
| `apps/web/lib/calibration/proven-path-rows.ts` | `SettledPickForProvenPath` gains `settledAt?: Date \| number \| string \| null`; `toProvenPathPickRow` maps it through a new `toEpochMs` helper (Date / epoch-ms / ISO → epoch-ms, or `null`); `ProvenPathPickRow` gains `settledAt?: number \| null` |
| `apps/web/app/api/cron/calibration-metrics/route.ts` | passes `settledAt: pick.settledAt ?? null` — **the query already selected it** |
| `apps/web/lib/ops/proven-path-seed.ts` | **no change needed** — its query already selects `settledAt: true` and orders by `settledAt: "desc"`, and the bulk mapper passes the pick through |
| `packages/prediction-engine/src/index.ts` | exports the G7 module, so a live path can import it at all |

**A note on `toEpochMs` returning `null` rather than `0`.** A row settled "at the epoch" and
a row with **no known** settlement time are different facts, and G7 rejects a non-finite
timestamp — `0` is finite, so a `0` default would silently place undated rows at the very
beginning of the history.

## 5. The test — and why it is not a tautology

`apps/web/__tests__/g7-drift-halt-wiring.test.ts`, **7 tests**, all passing.

The load-bearing one is **not** "the plan carries the list" — that is one hop of three, and
the consumer could ignore the list and the test would still pass. The load-bearing
assertion is on the **consumer's return value**:

```
it("THE LIVE FILTER DROPS A PICK FROM THE DRIFTING FAMILY -- the wiring itself", ...)
```

**AND IT HAS A CONTROL.** A test that asserts a pick is dropped can pass for the wrong
reason — the pick could be dropped by the selective thresholds rather than by G7. So every
drop assertion is paired with:

```
it("THE CONTROL: the same pick shape in a family that did NOT drift still publishes", ...)
```

**The pair (control publishes, halted drops) is what makes the difference attributable to
G7 and to nothing else.** Without the control, the wiring could be deleted with no test
going red.

The other five: the G7 signal is **machine-owned** (applies with the founder's opt-in
off); it **does not overwrite** the founder's list (and the founder's opt-in still gates the
founder's list); a family **below the sample floor** is not judged; rows **without a
settlement time** are not silently treated as recent.

**The fixture.** The drifting family is 280 settled bets: 250 calibrated (p=0.6, exactly 3
wins in every 5 — so **any** window of 30 or 250 has a 60% win rate and an ECE of ~0, and
the test measures the rule rather than luck) followed by 30 that are maximally
miscalibrated (p=0.9, every outcome a loss). The healthy family is the same 280 calibrated
bets.

## 6. The mutation check — the test can go red

Run against the real files, with the source restored in a `finally` each time:

| mutation | result |
|---|---|
| baseline | **7 passed / 0 failed** |
| **the consumer check removed** (the wiring is gone) | **5 passed / 2 failed** — *"THE LIVE FILTER DROPS A PICK FROM THE DRIFTING FAMILY"* and *"the G7 signal is MACHINE-OWNED"* |
| **the producer disabled** (the list is always empty) | **4 passed / 3 failed** — the three that depend on a real verdict |

Both mutations are caught, and both sources were verified byte-identical after restore.

## 7. Verification

| check | result |
|---|---|
| `__tests__/g7-drift-halt-wiring.test.ts` | **7 passed / 0 failed** |
| mutation: the consumer check removed | **caught — 2 failures** |
| mutation: the producer disabled | **caught — 3 failures** |
| the 16 related `apps/web` test files, **before** my change | 4 failed files / 9 failed tests |
| the same 16 files, **after** my change | **4 failed files / 9 failed tests — IDENTICAL** |
| `tsc` on my touched files, with local package resolution | **0 errors** |
| `tsc` for `packages/prediction-engine` | **64** — the exact baseline |
| the threshold auditor / the class-A guard | exit 0 / exit 0 |

**THE 4 PRE-EXISTING FAILURES ARE NOT MINE.** They are `neon pool exhausted` DB errors and
they reproduce **identically** with my changes reverted (measured both ways on the same
16-file batch). They are the same pre-existing surface-suite failures recorded in
`handoff/APPS_WEB_SURFACE_FAILURES_CENSUS.md`.

### A note on `tsc` in this worktree, because it will bite the next agent

`node_modules/@sports/prediction-engine` is a **symlink to the MAIN checkout**
(`C:/Users/Garrett/Sports/packages/prediction-engine`), not to this worktree. So `apps/web`'s
`tsc` resolves `@sports/prediction-engine` to the **other** tree's source and **cannot see
any change made here** — it reported four false `TS2305: has no exported member` errors for
the new G7 export. Re-running with a temporary tsconfig whose `paths` point at
`../../packages/prediction-engine/src` gave **0 errors in the touched files**. The stale
symlink is a **local environment** artifact; CI installs the workspace fresh and resolves
to the local packages. (vitest is unaffected — `apps/web`'s vitest config aliases
`@sports/*` to the local sources, which is why the test passed while `tsc` complained.)

## 8. What is NOT done

- **T16 (`settlement-loop.ts`) is still not wired.** The delegated task that would have done
  it was stopped with nothing written, and the scope was deliberately kept to G7 so that
  *something real* would land rather than two half-wirings. T16 remains a module with a
  computed verdict and no consumer.
- **The other six gates with no producer are still unwired** — see
  `handoff/WIRING_FEASIBILITY_THE_FINDING.md`. They were not wired because their evidence
  is not real yet, and a rubber-stamped gate is worse than no gate.
- **No live-production verification.** The G7 list is computed from the settled picks the
  `calibration-metrics` cron already loads, but this audit did not run against production
  data — there is no Neon connection here, and the four pre-existing failures above are
  `neon pool exhausted` errors. **The first production run is the real test of whether the
  rule's thresholds behave on real families**, and the plan's `g7Note` is the thing to read
  when it does.
- **The founder's law on the public board is still open** (GAP-21) — see
  `handoff/GAP21_PUBLIC_PICKS_ENABLED_READERS.md`. This wiring does not change whether the
  public board is exposed at all; it changes which *families* are published on it.
