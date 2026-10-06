# Ranking-basis census: the 34.8% is legacy, and current picks are clean (2026-09-28)

**Bucket: engine.** Corrects and completes
`ranking-basis-census-measured.md` in this folder, which reported
`confidenceShare = 0.3484` as a live property of the board. It is not
live. Every row on the anti-predictive branch is from June and July, before
the current model version. August and September picks are 100% clean.

**This is a correction of my own measurement, in the direction that matters
less, so it is worth being explicit: the number was right and the
interpretation was wrong.** The fix is not to soften a bad result. It is
that a reader acting on the first doc would have chased a defect that does
not exist in current data, and would have missed the one that does.

## The measurement

Same population, same role, same branch as the first census. Read-only.

```sql
SELECT date_trunc('month', "generatedAt")::date AS mon,
       count(*) AS pop,
       count(*) FILTER (WHERE jsonb_typeof("factorBreakdown"->'rankingP')='number') AS has_rp,
       count(*) FILTER (WHERE ("factorBreakdown"->'rankingP') IS NULL) AS rp_json_null
FROM picks
WHERE "result" IN ('WIN','LOSS') AND "isPublished" AND NOT "isBootstrap"
GROUP BY 1 ORDER BY 1;
```

| Month | Pop | has rankingP | rankingP is JSON null |
|---|---|---|---|
| 2026-05 | 62 | 57 (91.9%) | 5 |
| 2026-06 | 451 | 2 (0.4%) | 449 |
| 2026-07 | 561 | 0 (0.0%) | 561 |
| 2026-08 | 760 | **760 (100%)** | 0 |
| 2026-09 | 1,079 | **1,079 (100%)** | 0 |

The 1,015 rows on the confidence branch are 449 + 561 + 5, all from the
June-July window. August and September are 100 percent.

## Why my first query said 0, and then why my second one also lied

Two separate SQL mistakes, both mine, and both pointing at "there is no
problem here". I am recording them because the failure mode is the
dangerous one: each wrong query made the finding look CLEANER than it was,
and I nearly shipped a "no live problem" conclusion on a query that
contradicted the JavaScript it was supposed to model.

1. **First attempt**: `count(*) FILTER (WHERE ... ->'rankingP' IS NOT NULL
   AND jsonb_typeof(...)='number')`. In Postgres, `jsonb 'null' IS NOT
   NULL` is TRUE. A JSON null is a present-but-empty value, so the
   `IS NOT NULL` guard did not exclude it, and the two `FILTER`s were
   counted against different buckets than I assumed. It produced
   `confidence = 0`.

2. **Second attempt**: grouped only by `jsonb_typeof(...)`. JSON null
   reports an EMPTY type string, not the string `null`, so those 1,015
   rows grouped into a bucket I was not printing. It produced
   `no_rp = 0` for every month, which contradicted the JavaScript count of
   1,015 and should have stopped me immediately. I noticed it only because
   the two numbers could not both be true.

The rule I would hand the next agent: **when a SQL approximation disagrees
with the code it models, the code is the measurement and the query is the
draft.** The first census ran `readRankingKey()` in Node over the actual
rows and was right. The fast SQL was wrong twice, and both times it erred
toward "no problem".

## What this means for launch

**Nothing is wrong with the current board, and this closes the "still OPEN
from this section" ranking item in AGENTS.md for present-day data.**

The comparator is already correct: `readSignedEdge()` is the primary key,
`rankingP` is the first fallback, and `confidence` is reached only when
both are absent. On every pick generated since August, `rankingP` is
present on 100 percent of rows, so the anti-predictive branch does not
order anything a customer sees today.

The residual 34.8 percent is a property of the HISTORICAL record, and it
still matters for one reason: any backtest, calibration fit, or confidence
curve computed over all settled picks is mixing a well-ordered recent
sample with a June-July sample that has no `rankingP` at all. If those
two populations behave differently, a fit across both is fitting two
things at once. That is a measurement question, not a code change, and it
is the one thing I would look at next.

## Standing recommendation, unchanged and now better founded

`loadRankingBasisCensus()` still has zero non-test callers, and that is
now demonstrably a real risk rather than a theoretical one: the share it
reports is a function of the era, so a version bump that drops `rankingP`
on new picks would move the board from 100 percent to something worse
without any test noticing. Wiring it to one founder-facing read is a
customer-visible decision and stays with the founder.

## Limits of this measurement

- Read-only, role `hermes_ro`, branch `main`. No writes, no migrations, no
  branch created. The branch-only Neon policy added at `b4b9bdd09` is
  unaffected.
- Split is by `generatedAt` month, not by settle date. A pick generated
  late in a month and settled in the next lands in its generation month,
  which is the right bucket for "which model version produced this".
- `modelVersion` is not a clean proxy for the split on its own: June rows
  carry `v5.2.7` while July rows carry `v5.1.0`, so the month boundary and
  the version boundary do not line up. The `rankingP` presence is the
  direct evidence; the version column is context, not proof.
- 5 May rows have a null `rankingP` alongside 57 that do not, so even the
  oldest month is mixed. I did not chase that; it is 0.2 percent of the
  population and predates everything in play.

*No code changed. No gate moved. No threshold touched.*

## The follow-on question, and the answer that matters

If the legacy rows are the ones lacking `rankingP`, the obvious worry is that
they also behave differently, which would mean every confidence curve or
calibration fit computed over all settled picks is mixing two populations.

They do behave differently. Measured on the same slice, split by
`generatedAt`:

| Era | n | avg conf | win rate | claimed - realized | conf 80+ n | conf 80+ win rate |
|---|---|---|---|---|---|---|
| legacy Jun-Jul | 1,074 | 64.4 | 0.5084 | +0.1358 | 130 | **0.4077** |
| current Aug-Sep | 1,839 | 65.5 | 0.5808 | +0.0739 | 146 | **0.6164** |

Band by band, realized win rate:

| conf band | legacy n | legacy realized | current n | current realized |
|---|---|---|---|---|
| 50-59 | 453 | 0.5033 | 431 | 0.5360 |
| 60-69 | 312 | 0.5256 | 875 | 0.5863 |
| 70-79 | 179 | 0.5642 | 387 | 0.6047 |
| 80-89 | 98 | **0.3776** | 115 | 0.5826 |
| 90-99 | 23 | **0.3478** | 28 | 0.7143 |

**The inversion is real, and it is entirely in the legacy cohort.** Legacy
climbs honestly to 0.5642 at conf 70-79 and then falls to 0.3776 and 0.3478
at the top, which is the shape AGENTS.md describes and no calibrator can
fix. The current cohort does not do this: 0.5360 / 0.5863 / 0.6047 / 0.5826
/ 0.7143 is roughly monotone, and its top band beats its own middle. The
90+ cell is 28 picks and should not be over-read, but it points the right
way, and the 80-89 band at 0.5826 against a claimed 0.80-0.89 is still
over-confident rather than inverted, which is a different and much milder
defect.

So the confidence-inversion work in AGENTS.md is aimed at a population that
no longer exists. The current generator is not producing the inverted
ordering the proposal was written to fix.

**What I would actually do with this, and have not done.** Any fit,
threshold, or backtest that pools both eras is averaging a well-behaved
recent sample with an inverted one, and will land somewhere neither
deserves. Fitting on 2026-08-01 onward is the defensible default. That is a
calibration decision with a MODEL_VERSION implication, so it is recorded,
not applied.
