# T15 — The Route Inventory Is 16, Not 13, and There Is One Real Leak

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21
**Gate:** `apps/web/__tests__/t15-ngs-route-fence.test.ts` — 13 tests, exit 0

---

## 1. What the spec says

> T15 | no-raw-ngs-fence.ts walk_forward.json | Public/Private Surface Fence & Constitutional
> CRPS Circuit Breaker: Fails CI if any NGS metric identifier or any of the 13 fenced internal
> routes is exposed publicly, or if generate-signal-slate emits > 0 picks when walk_forward.json
> has passed: false (CRPS > 7.099).

## 2. The count is 16, and my own earlier count of 12 was wrong

I previously hand-counted 12 NGS-serving routes and called the spec's 13 "off by one". That was
**my error**, and the worker's derived inventory corrects it in both directions.

**The derivation is a predicate over the route tree, not a hand-written list.** The gate
computes the set of routes that serve NGS-derived or nflverse-derived data, and then asserts
the derived set equals a pinned registry. The count falls out of the tree:

| tier | count | what |
|---|---|---|
| ops/cron | 5 | `ops/ngs-backfill`, `ops/id-crosswalk`, `cron/ngs-ingest`, `cron/refresh-player-stats`, `cron/signal-ledger-write` |
| nflverse | 10 | the ten `nflverse/*` + `trends/nflverse-readiness` metric surfaces |
| public | 1 | `picks/route.ts` |
| **total** | **16** | |

**Two corrections to the spec's 13, both with evidence:**

1. **`ops/public-surface-truth` serves NO NGS data.** It is on the spec's list but serves zero
   NGS rows and zero NGS metric identifiers. Its seven "ngs" hits are all substrings of
   "signals"/"assignments", and its four "separation" hits are the ranking-polarity law
   ("positive_separation_required", "bestSeparation" from the ranking projection) — not NGS
   separation. So it is not a fenced NGS route. (I had listed it as "the 13th", wrongly.)

2. **FOUR routes serve NGS-derived data and are NOT on the spec's list:**
   `cron/signal-ledger-write` (reads `db.nextGenStat` and echoes raw NGS columns — cpoe,
   avgSeparation, avgYacAboveExpectation, avgAirYardsToSticks — in its response body),
   `cron/refresh-player-stats` (runs `ingestNextGenStats`), `ops/id-crosswalk` (reads
   `db.nextGenStat` for the gsisId → playerId join health), and `picks/route.ts` (below).

   12 on the spec's list − 1 that serves no NGS + 4 the list missed = 15, with
   `trends/nflverse-readiness` and `ops/ngs-backfill` accounting for the remainder of 16.

**The number that is pinned is 16, and it is DERIVED.** The gate asserts:

- the derived set equals the pinned registry (no drift);
- the derivation predicate has teeth (it is not matching nothing);
- the tier split is 5 / 10 / 1;
- every registry entry records WHY the route is in it;
- every registry entry exists on disk.

So a route added or removed without updating the registry **fails the build**.

## 3. The real finding: ONE live NGS exposure to possibly-anonymous callers

`apps/web/app/api/picks/route.ts` reaches `db.nextGenStat` and renders NGS metric names and
values into `intelligence.why[]`.

**I verified this chain end to end, independently, by reading the source — not by trusting
the worker's report:**

```
apps/web/app/api/picks/route.ts:16      import { loadBundleSurfaces } from "@/lib/intelligence-core/db-loaders"
apps/web/app/api/picks/route.ts:665     intelligence: (() => { ... enrichPickWithIntelligence(pickForIntel, now, ...)
apps/web/lib/intelligence-core/db-loaders.ts:657   ? loadNgs(input, season, lagWeek)
apps/web/lib/intelligence-core/db-loaders.ts:378   const rows = await db.nextGenStat.findMany({...})
apps/web/lib/picks/intelligence-enrichment.ts:220   homeNgs: surfaces.homeNgs,
apps/web/lib/picks/intelligence-enrichment.ts:221   awayNgs: surfaces.awayNgs,
apps/web/lib/intelligence-core/engine.ts:148        homeNgs: bundle.homeNgs,
apps/web/lib/intelligence-core/signal-adapters.ts:391  out.push(...ngsObservations(input.homeNgs ?? [], "home", now));
apps/web/lib/intelligence-core/signal-adapters.ts:186   notes.push(`CPOE ${r.cpoe > 0 ? "+" : ""}${r.cpoe.toFixed(1)}`);
apps/web/lib/intelligence-core/signal-adapters.ts:190   notes.push(`sep ${r.avgSeparation.toFixed(2)}y`);
apps/web/lib/intelligence-core/signal-adapters.ts:194   notes.push(`YAC+ ${r.avgYacAboveExpectation > 0 ? "+" : ""}${r.avgYacAboveExpectation.toFixed(2)}`);
```

**And it is anonymous-reachable:**
- `apps/web/app/api/picks/route.ts:91` — `const session = await auth();`
- `:93-98` — "Anonymous viewers get the canonical FREE entitlements — the SAME single…"
- The enrichment at `:665` is **unconditional**: there is no entitlement check, no feature
  flag, and no session check between the auth call and the NGS-backed enrichment.
- `PUBLIC_PICKS_ENABLED` defaults to **true** (`packages/prediction-engine/src/platform-config.ts`),
  so `canExposePublicPicks` is ON by default.

**So the public picks board renders NGS metric prose to anonymous callers today.** That is
contrary to the doctrine the fence itself cites (NGS is a keep-out family: the
`public-surface-sweep.test.ts` keep-out list names "raw NGS / tracking rows" and the metric
families QBR, separation, WOPR, EPA).

**The gate records it as a KNOWN, OWNED exposure rather than pretending it does not exist:**

```
const KNOWN_PUBLIC_NGS_EXPOSURES: Readonly<Record<string, string>> = {
  "picks/route.ts": "...",
};
```

and the assertions are:

- "no derived route serves NGS data to an anonymous caller" — counts the derived routes that
  are anonymously reachable and are NOT in the known list; expects **0**. So a **new** leak
  fails the build.
- "the known-exposure list is exactly the set of anonymously reachable NGS routes" — the
  known list is asserted to EQUAL the derived leak set, in both directions. A leak that
  disappears and is left in the list fails; a leak that appears and is not listed fails.
- "every known exposure carries a reason, and the reason admits the exposure" — each reason
  must be > 40 characters and must name the exposure.

**This is the shape of an honest fence.** The count of routes that leak NGS identifiers is
**exactly 1, not 0**, and the fence says so.

**What remains open, and is not resolved by this gate:** whether that ONE exposure is
acceptable. It is a product decision, not a mechanical one. The gate's job is to make the
exposure *visible and owned*; deciding whether the public board may show NGS prose is
Garrett's call. **It has not been raised for that decision here** — it should be.

## 4. The second half: the constitutional CRPS circuit breaker

**The spec's `walk_forward.json` does not exist on this branch.** It is at
`dfs/walk_forward/walk_forward.json` on `origin/grok/walk-forward-2026-10-14`; this branch has
no `dfs/` directory. Two gate files, two different experiments:

| | `walk-forward-gate.json` (this branch) | `walk_forward.json` (other branch) |
|---|---|---|
| n | 2462 | 570 |
| Laplace CRPS | **null — never computed** | 7.0611 conditional, 7.0203 one-scale |
| Gaussian CRPS | 7.154021 | 7.0271 |
| families | 1 | 8 |
| self-admission | "Laplace CRPS 7.1597 was not recomputed: no Laplace margin module on this branch, and none was written" | "The absolute 7.109 / 7.099 bar was not reproduced on this manifest" |

**The real rule is a CONJUNCTION**, from the spec's own artifact:
`rule.passed_if` = `delta_conditional_vs_gaussian >= 0.01 AND n >= 150`; `models.gate_rule` =
"cleared only if a model has n >= 150, beats same-games Gaussian 13.45 by >= 0.01, AND
CRPS <= 7.099 (unreproduced bar); frozen manifest only".

**And the 7.099 bar is one the artifact calls unreproduced** — on the larger unfrozen
nflverse cross-check (n=2494) *every* family's CRPS is above it, and on the frozen manifest
the same-games Gaussian 13.45 baseline is itself below it, which makes the bar not
informative there.

**The live defect, confirmed by reading the code:** `walk-forward-emission-gate.ts` was 36
lines and checked `parsed.passed === true` **only**. It never read the CRPS. The gate was
closed only because `passed` happened to be false; a commit writing `passed: true` would have
opened it on a CRPS of 7.154021 — above the bar.

**The repo already documented this**: `reconciliation/gaps.json` GAP-02 (severity CRITICAL,
`blocks_current_business_model: true`) and GAP-15 (the remedy).

**The CRPS function is in this repo**: `intelligence/ratings/engine_math.py:273`
`crps_gaussian(mu, sd, x)` — the function the gate file names as the origin of 7.154021.

### What the gate now does

The constitutional condition is the full conjunction, fail-closed on every ambiguity:

- `passed` must be true **AND** `crps <= 7.099` **AND** `delta >= 0.01` **AND** `n >= 150`,
  and the file must be the **frozen manifest** (the unfrozen nflverse cross-check can never
  count toward clearing).
- Missing file → `file_missing`; unparseable or non-object → `file_unparseable`; a null or
  missing CRPS → reported as **"the bar was NEVER REPRODUCED"** (`crps_not_reproduced`),
  which is a *different finding* from "the CRPS is above the bar" (`crps_above_bar`), and
  the verdict says which; a missing n → `n_missing`; a non-finite CRPS → `crps_not_finite`.
- Both file shapes are handled: the on-branch `walk-forward-gate.json` and the spec-named
  `walk_forward.json`. The latter is absent here, so it is exercised against a synthetic
  fixture of that exact structure.

**The gate: 27/27 tests. The sweep: 7/7 mutations detected, exit 0.** The mutations are
precisely the legs of the conjunction — drop the CRPS check, drop the delta check, drop the
sample-size floor, let a missing file open the gate, invert the CRPS comparison, let a null
CRPS clear the bar, let the unfrozen cross-check count.

**The three existing ingestion-pipeline tests** now supply the new contract's evidence
(`MINTING_GATE_OVERRIDE` with crps 7.0, n 570, delta 0.02) instead of a bare
`{ passed: true }`. **Their assertions are unchanged** — they exercise the minting path, not
the gate, and the gate's own boundary behaviour is pinned in the new file.

## 5. The scope rule that decides where the breaker belongs

From the corpus (`ingestion-ledger-2026-10-15.md`):

> "Ingestion is universal and ungated; gates rule emission and promotion only."

So the breaker's scope is **emission**, and `generate-signal-slate` is an emission path. That
is where it is, and it is where it belongs. GAP-02's alternative — "delete the gate from the
TS path and re-home it where it has meaning" — is not taken, because the emission path is
here and the gate is now sound.

**GAP-02 also records** that the path that actually *published*
(`scripts/publish_late_sun_mon_live_free.py`) had no gate and is on no cron. That claim was
sent back for independent verification rather than taken on the gaps.json author's word.
**Still unverified at the time of writing.**

## 6. Files

| File | Status |
|---|---|
| `apps/web/__tests__/t15-ngs-route-fence.test.ts` | new — 13 tests; the derived route inventory and the known-exposure list |
| `packages/ingestion-pipeline/src/walk-forward-emission-gate.ts` | rewritten — the constitutional conjunction, fail-closed |
| `packages/ingestion-pipeline/src/signal-slate-options.ts` | the override shape now carries the evidence |
| `packages/ingestion-pipeline/src/__tests__/walk-forward-emission-gate.t15.test.ts` | new — 27 tests |
| `packages/ingestion-pipeline/reconciliation/_mutation_sweep_t15_fence.mjs` | new — 7 mutations |
| `packages/ingestion-pipeline/src/__tests__/{generate-signal-slate-guard,signal-slate-publication-flag,signal-slate-series-and-grade}.test.ts` | modified — supply the new contract's evidence; assertions unchanged |
