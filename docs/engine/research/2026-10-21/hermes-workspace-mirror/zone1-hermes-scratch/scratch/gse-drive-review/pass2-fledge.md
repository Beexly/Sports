# Pass 2 — fledge slice: what "unsafe to publish" hid

My first pass marked `sports-taxonomy.ts` the only leg of the slice carrying `n`, and every probability emitter "unsafe to publish." That frame treated publishability as a property of the *disabled modules' outputs*. It missed the leverage that is one call away from them: diagnostics that emit counts, categories, and refusals — never probabilities — and therefore do not need n attached to a probability because the count IS the payload.

## Primary answer

**File:** `packages/prediction-engine/src/edge-lab/walk-forward-taxonomy.ts`
**Function:** `runWalkForwardTaxonomy(rows, options)`

- It is the existing production call site for `summarizeCategoryDiagnostics` in `conformal/sports-taxonomy.ts` (walk-forward-taxonomy.ts:4-8), which otherwise has no caller.
- Its output is publishable as-is: per-category `sampleSize`/`coverage`/`meanWidth`, `underpowered` categories (`n < minSamplesForTrust`, default 30), `underCoverage` flags vs target 0.9, `alerts[]` (`underpowered` / `under_coverage` / `wide_intervals`), `overallCoverage`, `overallMeanWidth`. No probability is asserted per row; a probability without n stays unpublished, but a count, a category, or a refusal-alert can ship.
- It never invents: rows missing `covered`/`width`/`residual` simply do not contribute to those aggregates (walk-forward-taxonomy.ts:84-87).

**One call above it:** `nflverseScheduleRowsToTaxonomyRows(rows)` in `edge-lab/walk-forward-taxonomy-source.ts:142` converts real nflverse `schedules` rows into real-context `WalkForwardTaxonomyRow[]` with the same "never invent" discipline — rows whose favorite/rest cannot be derived honestly are dropped (`settledHistoricalPickToTaxonomyRow` returns null, `realGameContextFromPreGame` returns null), and TOTAL picks are refused. That refusal-by-drop is itself a countable, publishable diagnostic.

## Secondary sample-count / refusal gates, one call away from the same taxonomy inputs

- `MondrianResidualManager.quantile(category, probability)` — `conformal/mondrian.ts:93`. Returns `sampleSize`, `usedFallback`, and `fallbackChain` per query; refuses (silently walks parents) until `minSamples` (default 10) residuals exist. The fallback chain is the publishable signal.
- `applySelectiveGate` — `edge-lab/selective-gate.ts:266,306`: `MIN_STRATUM_CALIBRATION = 100`; strata below it never fire ("silent stratum"), and `widthNoBets` counts first-class No-Bet refusals (selective-gate.ts:55, 320-325). Refusal counts and the minimum-n gate, not a probability.
- `bookBiasAudit` — `data-ingestion/src/sportsbook-mispricing-audit.ts:101`: per-book `n` plus calibration slope. The `n` per book was noted in pass 1 but undervalued as publishable diagnostic leverage.

## Why pass 1 undervalued this

"Unsafe to publish" was applied to each module's probability output. The conformal taxonomy modules are disabled, but their *shadow diagnostic surface* — `runWalkForwardTaxonomy` + `nflverseScheduleRowsToTaxonomyRows` + `MondrianResidualManager.quantile` + the selective-gate refusal counters — produces counts, categories, fallback chains, and refusals that need no calibration claim and are safe to surface today.

No files modified.
