# Ranking-basis census, measured with the real comparator (2026-09-28)

**Bucket: engine.** This answers a question the code has been asking in its own
header since it was written, and which nobody had ever measured.

**This file replaces an earlier version of itself that led with
`confidenceShare = 0`. That number was wrong.** The correction is kept at the
bottom rather than deleted, because the error is the useful part of the record.

## The question

`apps/web/lib/ranking/sort-key.ts` sorts the public board through a three-branch
cascade:

1. `factorBreakdown.rankingP` — measured **monotone**, n 1,390
2. `factorBreakdown.rankingScore / 100`
3. `confidence / 100` — measured **ANTI-predictive** (n 2,385; conf 80+ claims
   0.8663, realizes 0.5191, z = -10.7)

Its header carries this line, unchanged:

> "`confidence` is the branch that matters: it is the one measured as
> ANTI-predictive at the top... and **NOBODY HAS EVER MEASURED WHAT SHARE OF ROWS
> THAT IS**."

`apps/web/lib/calibration/ranking-basis-census.ts` was written to produce that
share and has **zero non-test callers**, which is why the number stayed unknown.
The code was correct; it only wanted a caller.

## Method

Rows were dumped read-only from Neon `gse-postgres`, branch `main`, role
`hermes_ro`:

```sql
SELECT jsonb_build_object('confidence', "confidence", 'fb', "factorBreakdown")::text
FROM picks
WHERE "result" IN ('WIN','LOSS') AND "isPublished" AND NOT "isBootstrap";
```

2,913 rows, 12.5 MB. The census then runs **`readRankingKey()` and
`readSignedEdge()`, copied byte-for-byte from `sort-key.ts`**, over those rows in
Node.

**Why in-process and not in SQL.** `readRankingKey` decides on JS types
(`typeof rankingP === "number" && Number.isFinite(...)`), and a SQL `FILTER` over
JSONB does not reproduce those conditions. The first attempt used SQL anyway and
got the wrong answer. A census has to run the function it is a census of.

## The population

| Stage | Rows |
|---|---|
| `picks` total | 4,165 |
| settled (WIN/LOSS) | 3,493 |
| **census population** (published, non-bootstrap, graded) | **2,913** |

## The answer

| Branch | Rows | Share |
|---|---|---|
| `rankingP` (monotone, the good key) | 1,898 | **65.2%** |
| `rankingScore` | 0 | 0.0% |
| **`confidence` (the anti-predictive key)** | **1,015** | **34.8%** |

**`confidenceShare = 0.3484`.** Roughly a third of the published graded
population is ordered by the number measured to be anti-predictive at its top.

Not one of those 2,913 rows has a null `factorBreakdown`. They all carry the
object; it simply lacks `rankingP` and `rankingScore`, so the cascade falls
through to branch 3.

### The confidence-branch rows, by decile

```
conf 90-99:  30
conf 80-89:  84
conf 70-79: 155
conf 60-69: 301
conf 50-59: 445
```

**114 rows sit in the 80+ bands**, where `confidence` is measured most
anti-predictive. That is the subset this matters for.

## What the board is actually ordered by

`comparePicksByRanking` ranks on `readSignedEdge()` **first** and only then falls
through to the `readRankingKey()` cascade, so these are not alternatives: the
first is the primary key, the second is the fallback.

| Condition | Rows | Share |
|---|---|---|
| carry a finite `expectedClv` (the PRIMARY key) | 1,766 | **60.6%** |

**Reading this honestly.** 60.6% of published graded rows are ordered by the
engine's own signed edge. The remaining ~39% carry no estimate, and for those the
cascade resolves to `confidence`, so **34.8% of the population is being ordered,
at least in part, by a score measured to invert at its top.**

Two things this does **not** say:

- It does not say 34.8% of the *board* is inverted. This is the settled
  population; a live board row is ungraded and may carry a different mix.
- It does not justify changing the comparator. Absence of an estimate is
  genuinely neutral, and the existing behaviour (a measured row always outranks
  an unmeasured one) is correct. The finding is that **the unmeasured ~39% is
  large enough that the fallback does real ordering work**, which is exactly what
  the header said was unknown.

## Recommendation, not a change

Nothing here justifies editing `comparePicksByRanking` today, and editing it is a
customer-visible ranking decision that belongs to the founder. What is worth
doing, and is unblocked:

1. **Give `loadRankingBasisCensus()` a caller.** One founder-facing read, so this
   number cannot silently drift when a future `MODEL_VERSION` changes which key
   new picks carry. That is the entire reason the module exists.
2. **Re-run after any model version bump.** 34.8% is a moving target.
3. **`rankingScore` is 0 across the whole population**, so branch 2 is dead code
   today. Worth knowing before trusting it as a fallback.

## The correction, kept on the record

The first version of this doc led with `confidenceShare = 0`, from a SQL `FILTER`
that counted rows with a non-numeric `rankingP` as "confidence branch" and
returned none. The real function labels those same 1,015 rows
`basis: "confidence"`.

The earlier version did carry the right number, but only in a footnote under
"Method notes and limits", directly contradicting its own headline. That is worse
than being simply wrong: a reader taking the headline believes the board is
clean, and a reader taking the footnote has to notice they disagree. I caught the
discrepancy while writing it, wrote the footnote, and pushed anyway instead of
replacing the number.

**The lesson: a document that contains both answers resolves to the headline, and
a measurement whose SQL does not reproduce the function's semantics produces a
confident, plausible, wrong number.**

## Method notes and limits

- Read-only throughout. Role `hermes_ro`, branch `main`. No writes, no schema
  change, no migration (AGENTS.md law 7).
- The 7-day preview-branch TTL policy added at `b4b9bdd09` is unaffected; this
  queried `main`.
- Population matches `loadRankingBasisCensus`'s own filter exactly, so the number
  is comparable with `loadConfidenceTail` rather than describing a different
  slice.
- The comparator functions were copied verbatim into the measurement script, so
  the answer describes the shipped code as of this commit. If `sort-key.ts`
  changes, re-run rather than trusting this table.
