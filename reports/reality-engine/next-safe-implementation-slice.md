# Next Safe Implementation Slice — The Single First Build

**Date:** 2026-06-18
**Author:** reality-engine (docs-only pass)
**Status:** Recommendation. This document is docs-only and builds nothing; it *specifies* the one slice to build next so the build, when approved, is unambiguous and minimal.
**Scope:** Choose the single smallest, testable, highest-leverage first build from four candidates, and specify it exactly: files, the test that proves it, invocation, output, and an explicit confirmation it changes **no** public behavior, schema, or deps.

---

## 0. The candidates and the verdict

| Option | What it is | Verdict |
|---|---|---|
| **A** | Inert `edge_type` / `autopsy_reason` fields on `Pick` | **DEFER.** Requires schema approval that does **not** exist yet (see `schema-approval-needs.md`). Cannot be the *safe* first slice. |
| **B** | File-backed / offline report generation from existing pick + CLV data | **STRONG candidate.** Zero schema, zero deps, reads only what we hold. |
| **C** | Tests proving CLV / no-bet / edge-significance logic *influences decisions today* | **VALUABLE — but as a guard.** Honest version asserts they do **NOT** yet affect confidence (CLV + edge are inert/measurement-only). A regression guard, not a feature. |
| **D** | Non-production research script: existing data → edge / no-bet / CLV diagnostics, zero runtime change | **STRONG candidate.** The statking-shaped first step of the sidecar. |

**Recommendation: build B and D as one slice, with C as its bundled test.**

B and D are the same artifact viewed from two angles — an offline diagnostics generator (D) that emits a human-readable report (B). Bundling C makes the slice self-protecting: the moment someone accidentally wires CLV or edge into live confidence, the guard test fails and tells them to go through the calibration gate instead. This gives the highest leverage (first real visibility into no-bet quality, CLV-by-segment, and edge significance) for the lowest possible risk (it cannot change anything users see).

## 1. Rationale

- **It uses data we already hold.** Settled `Pick` rows, `Pick.clvValue` / `clvVerdict` (`clv.ts`, `clv-capture.ts`), and `edge-engine.ts` output. No new ingestion, no schema.
- **It surfaces the three things we are currently blind to**, without changing any decision:
  1. **No-bet quality** — to the extent it is reconstructable from what we have today (acknowledging the considered set is not yet logged — see `schema-approval-needs.md` line item 1).
  2. **CLV-by-segment** — beat/match/lost rates sliced by sport / market / confidence band, from data already persisted.
  3. **Edge significance** — re-running `edge-significance.ts`'s aggregate test offline and reporting whether the edge clears the noise floor.
- **It is the statking pattern exactly** — stdlib-runnable, JSON/markdown out, offline, not in the request path.
- **It changes zero runtime behavior** — confidence stays the heuristic sum in `scoring.ts`; the report is a read-only mirror.
- **It is the first concrete step of the sidecar** (`python-sidecar-research-plan.md`) at phase 0, so it builds toward the larger plan without committing to any heavy library.

## 2. What the slice creates

```
scripts/reality_diagnostics.py        # stdlib-only (json, statistics, pathlib) — the D part
                                       # reads data/reality-engine/inputs/*.json,
                                       # writes the report below
reports/reality-engine/diagnostics/   # output dir for the generated report (the B part)
   latest-diagnostics.md              # human-readable: no-bet quality (caveated),
                                       # CLV-by-segment, edge-significance verdict
package.json                          # one new script: "reality:diagnostics"  (npm-scripted, batch)
```

A read-only TS export step (`reality:export`) writes `data/reality-engine/inputs/*.json` from existing Prisma selects. If a separate slice already provides those exports, this slice reuses them; otherwise the export is part of this slice and is strictly read-only (select, no write-back).

**No Prisma schema file is touched. No dependency is added.** The Python is stdlib-only, matching the spot-checked `statking_*.py` footprint (`pathlib` + `json`, plus `statistics`).

## 3. The test that proves it

Two tests, both runnable in the existing Vitest/Python harness:

1. **Diagnostics-correctness test.** Feed the script a small fixture `inputs/*.json` with known picks/CLV, run it, assert the generated report's CLV-by-segment counts and edge-significance verdict match hand-computed expected values. Proves the diagnostics are *correct*, not decorative.

2. **The inertness guard (option C, honest form).** A test that asserts CLV and edge are **measurement-only today**: construct two scoring inputs identical except for CLV verdict / edge score, run the live confidence path (`scoring.ts`), and assert the resulting confidence is **identical**. This *honestly* encodes the current truth — CLV (`clv.ts`) and edge (`edge-engine.ts`, attached at `weight: 0`) do **not** influence confidence — and turns it into a regression tripwire: if someone later wires either into live confidence without going through a `MODEL_VERSION` bump + `CalibrationProposal`, this test fails. That is the leverage: it protects the calibration gate.

## 4. How it's invoked

```bash
npm run reality:export        # TS, read-only Prisma select → data/reality-engine/inputs/*.json
npm run reality:diagnostics   # Python, offline → reports/reality-engine/diagnostics/latest-diagnostics.md
```

Manual or job-triggered, never from an HTTP handler, webhook, or the pick-generation path — identical to how `npm run statking:*` is invoked.

## 5. What it outputs

`reports/reality-engine/diagnostics/latest-diagnostics.md`, containing:

- **CLV-by-segment** — BEAT/MATCHED/LOST counts and rates by sport, market, and confidence band, from persisted `Pick.clvVerdict`. No fabricated numbers; if a segment has too few rows to be meaningful, it says so.
- **Edge-significance verdict** — the offline re-run of `edge-significance.ts`'s aggregate test: does the realized edge clear the noise floor, with the sample size stated plainly.
- **No-bet quality (caveated)** — explicitly notes that the considered/no-bet set is **not logged today** (schema line item 1), so this section reports only what is reconstructable and names exactly what's missing.
- **Calibration status line** — restates the data-block honestly: **16/100 eligible**, `OUTCOME_LEARNING_ENABLED=false`, `MODEL_VERSION = v5.0.0` — so the report can never be misread as a green light.

## 6. Explicit confirmation

This slice changes:

- **NO public behavior.** Nothing users see changes. Confidence remains the heuristic sum in `packages/prediction-engine/src/scoring.ts`. No page, API, paywall, or pick output is altered.
- **NO schema.** No Prisma model, field, or migration. The export is a read-only select.
- **NO dependencies.** No `requirements.txt`, no `pyproject.toml`, no npm package added. Python is stdlib-only.
- **NO gate / freeze change.** `MODEL_VERSION` stays `v5.0.0`; `FROZEN.md` and `model-freeze.mjs` are untouched. Nothing here can reach live confidence except by later becoming a `CalibrationProposal` that clears held-out `calibratedEce ≤ rawEce`.

It is a read-only mirror plus a guard test. Deleting it would restore the repo to byte-identical runtime behavior.

## 7. Leverage-preservation rule, applied

Per the owner's standing rule, every "needs more data" in this slice is recorded with its exact unlock path, not discarded:

| Blocked insight | Field needed | Source / cadence | Metric unlocked |
|---|---|---|---|
| **No-bet quality** (we can't yet judge the markets we passed) | a `decision` + `noBetReason` row per *evaluated* market | the in-cycle evaluation set in `scoring.ts`, captured at generation time, every pick-generation cycle | realized W/L + CLV of declined vs published markets → honest publish-threshold tuning |
| **Edge-type reliability** (we can't slice CLV by *kind* of edge) | an `edgeType` tag per pick | derived offline from `edge-engine.ts` output now; persisted per-pick once the taxonomy is frozen (`edge-type-taxonomy-v1.md`) | win rate / survival by edge type → which signals to trust |
| **Calibration activation** (mapping is data-starved) | settled, learning-eligible picks | the existing settlement pipeline (`settle-sport.ts`), per settled game; needs the eligible count to cross 100 (now 16) | activates the isotonic calibrator (`calibration-apply.ts`) → first honest confidence re-fit |
| **Line-movement forecasting** | a queryable movement event series | `Odds` batches now (approximate, offline); a `LineMovementEvent` table later (schema line item 2) | predicted-close accuracy → CLV as a *pre-bet* signal |

Each blocked item is therefore a live leverage point with a named path back to value — not a dead end.
