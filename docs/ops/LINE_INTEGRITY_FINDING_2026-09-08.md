# Published picks carry lines no sportsbook offers

**Measured 2026-09-08 on production (read-only SELECT, Neon `gse-postgres`).**
**Status: OPEN. Founder decision required. Nothing was changed in response to this.**

## The finding

Published picks store and display a **model-predicted margin in the `line`
field**, not a real book line. The signature is unmistakable — repeating
decimals:

| Published selection | Stored `line` | Game | Result |
|---|---|---|---|
| Missouri Tigers -53.8 | `-53.83333333333334` | Missouri vs Arkansas Pine Bluff | LOSS |
| Ohio State Buckeyes -50.2 | `-50.2` | Ohio State vs Ball State | WIN |
| Mississippi State Bulldogs -48.8 | `-48.83333333333334` | Miss State vs UL Monroe | WIN |
| Georgia Bulldogs -46.2 | `-46.16666666666666` | Georgia vs Tennessee State | WIN |
| UCF Knights -41.2 | `-41.16666666666666` | UCF vs Bethune-Cookman | WIN |

No sportsbook has ever offered -53.83. Football spreads trade on a half-point
grid and effectively never exceed the mid-thirties. `-53.8333...` is an
averaged model output written into the field a customer reads as a line.

## Scope

Published, non-bootstrap, settled picks:

| Market | n | off the half-point grid | % | repeating decimals |
|---|---|---|---|---|
| SPREAD | 719 | 310 | 43.1% | 133 |
| TOTAL | 599 | 369 | 61.6% | 172 |
| MONEYLINE | 883 | 34 | 3.9% | 15 |

Roughly **680 published settled picks** across spreads and totals carry a line
that no book offers. MONEYLINE has no line, so its 34 are a separate, smaller
anomaly.

Baseball is the clearest proof. A runline is **always** plus or minus 1.5. In
the pre-registered sample the stored MLB "runline" ranges from **-13.50 to
+17.75**. That is not a runline under any definition.

## Why it matters, in order

1. **CLAUDE.md rule 1 — no fake data.** A published pick at a price that does
   not exist is fabricated product data on a customer surface. This is the
   rule the product's whole premise rests on.
2. **The pick is unbettable.** A member cannot act on -53.83. There is nothing
   to place.
3. **It corrupts the track record.** Grading against a fabricated line makes
   every derived number meaningless — hit rate, CLV, ECE, the calibration
   floors, and the PROVEN gate that reads them.

## What it explains

On the **cryptographically pre-registered** record — the 51 slate commitments
frozen before first kickoff, the one sample that cannot be selected after the
fact — spread performance is not merely weak, it is an anti-edge:

| Market family | n | hit | 95% CI | z vs 52.4% breakeven |
|---|---|---|---|---|
| MLB runline | 114 | 34.21% | 25.0 – 43.4 | **-3.88** |
| Soccer handicap | 54 | 44.44% | 31.1 – 57.8 | -1.17 |
| Football spread | 83 | 55.42% | 44.7 – 66.2 | +0.55 |

The MLB runline confidence interval lies **entirely below breakeven**. A model
graded against a fabricated line should produce exactly this, and the damage
should be worst where the fabrication is most absurd — which is what the data
shows: baseball, where a ±13.5 "runline" is furthest from the real ±1.5.

Read the football number carefully. 55.42% at n=83 has a CI from 44.7 to 66.2
and is **not** evidence of an edge; it is only evidence that football is not
where the harm is concentrated.

## What this does NOT establish

- It does not show the underlying model is bad. It shows the model's output is
  being written into a field that is supposed to hold a market price. The
  model may be fine; the plumbing between it and the published pick is not.
- It does not give a corrected hit rate. Re-grading against real historical
  book lines is a separate exercise against the append-only odds table.
- It says nothing about MONEYLINE performance, which does not use `line`.

## Reproduce

```sql
SELECT p."pickType"::text AS market, count(*) AS n,
  count(*) FILTER (WHERE (abs(p.line)*2) <> floor(abs(p.line)*2)) AS off_grid,
  count(*) FILTER (WHERE p.line::text ~ '\.\d{6,}') AS repeating_decimals
FROM "picks" p
WHERE p."isPublished" AND NOT p."isBootstrap"
  AND p.result IN ('WIN','LOSS') AND p.line IS NOT NULL
GROUP BY 1;
```

## Recommended sequence (founder-gated, none of it done)

1. **Do not flip `PERFORMANCE_STATS_ENABLED` or `PRICING_PHASE=PROVEN`.** A
   published track record computed from fabricated lines is the single worst
   claim this product could make, and the honesty premise is the whole moat.
2. **Find the write path** that puts a model margin into `line` and decide
   whether the field means "market line" or "model projection". If both are
   wanted they are two columns, not one.
3. **Refuse to publish a pick whose line is off the sport's grid** — half-point
   for football and totals, exactly ±1.5 for a runline, quarter-point for Asian
   handicaps. That guard is cheap and would have caught all 680.
4. **Re-grade the settled history** against real book lines from the
   append-only odds table before any performance claim is published.
5. Only then revisit the calibration floors, which currently read a corrupted
   input.

Steps 2 and 3 touch pick generation and may implicate `MODEL_VERSION`, which is
frozen. That is a founder call, not an agent's.
