# Trend Passports & Trend Trials

**Module:** `packages/decision-field-runtime/src/trend-passport.ts`
**Surface:** Passports tab of `/matches/preview/*` and the offline Event Genome page
**Status:** fixture-only; a trend alone caps at `WATCH` (or `INFO_ONLY` with no market line).

## The problem with trends

"Under 9.5 in 8 of the last 9" is the native language of every betting-tips site. It is also the
native language of overfitting: cherry-picked windows, stacked filters, tiny samples, and trends that
secretly point at the same underlying fact. GSE refuses to launder a fragile pattern into a confident
call. The Trend Passport makes the fragility *visible* instead of hiding it.

## The passport

`buildTrendPassport(input, allTrends)` → `TrendPassport` carrying: `claim`, `sampleScope`,
`sampleSize`, `hitCount`/`missCount`/`hitRate`, the active filters (`homeAway`, `tournament`,
`opponent`, `timeWindow`), `marketLine`, `oddsAtPublish`, `knownAt`, and the honesty fields:

- **`fragilityScore`** = `round(1 / (1 + n/8))` — small samples are fragile by construction.
- **`overfitRisk` / `pHackingRisk`** — rise with the number of active filters on a small sample.
- **`correlatedTrends` / `opposingTrends`** — other trends that share team scope (so they are *not*
  independent evidence) or point the opposite way on the same event.
- **`authorityCeiling`** = `INFO_ONLY` when there is no market line, else `WATCH`. A trend never
  licenses a public action on its own.
- **`whatWouldInvalidate`** — the named condition that breaks the trend.

Correlation detection uses `sameTeamScope` (tokens ≥6 chars, common words excluded) so "last 8
Saskatchewan games" and "last 11 Saskatchewan games" are flagged as the same dependence — not two
votes.

## Trend Trials — process apart from outcome

`gradeTrendTrial(passport, predictionId, result)` separates *whether the trend hit* from *whether
trusting it was sound*. `TrendProcessGrade` ∈ `GOOD_PROCESS | THIN_EVIDENCE | OVERFIT_TREND |
NO_MARKET_LINE | NO_ODDS | CORRELATED_DOUBLE_COUNT`. A trend can hit on bad process (luck) and miss
on good process; the trial records both.

## Invariants

- No market line → no action (`INFO_ONLY`), regardless of hit rate.
- Overlapping trends are flagged non-independent before they can be stacked.
- A trend supports `WATCH`, never a public action alone.
- No `lock` / `guarantee` / `sure-thing` language anywhere near a trend.

## Tests

`__tests__/trend-passport.test.ts`: small samples are fragile, overlapping trends flagged,
no-line→no-action, trend caps at WATCH, trial separates result from process.
