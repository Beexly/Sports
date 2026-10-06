# The `agreement: CONFIRMS` defect — what it cost, measured

**2026-09-28, production Neon (read-only).** Commits `ebd125bd1` (the fix) and
`bb7e91558`. The number this file exists to answer: **how many published rows
carried a corroboration claim nobody tested?**

## THE COUNT

```sql
SELECT "factorBreakdown"->'independentEdge'->>'agreement' AS agreement,
       ("factorBreakdown"->'independentEdge'->'marketFairProb') = 'null'::jsonb AS market_is_json_null,
       count(*) AS rows
FROM picks
WHERE "factorBreakdown"->'independentEdge'->>'agreement' = 'CONFIRMS'
GROUP BY 1,2;
```

| market price | rows | which path |
|---|---|---|
| JSON null | **788** | the signal path — the one with the defect |
| present | 202 | the book-priced path, which calls `assessEdge` correctly |

**788 published rows carried a `CONFIRMS` stamp produced by counting estimators.**

A SQL gotcha worth recording, because it produced a false zero first: JSONB null
must be compared as `= 'null'::jsonb`. The `->>` operator on a JSON null returns
SQL `NULL`, which never equals the *string* `'null'`. The whole chained
`->>` expression also needs parentheses or `=` binds to the last `->`.

## WHAT THOSE 788 ROWS ACTUALLY CLAIMED

```sql
SELECT "factorBreakdown"->'independentEdge'->'sources' AS sources, count(*)
... GROUP BY 1 ORDER BY 2 DESC;
```

| sources | rows |
|---|---|
| `poisson`, `mlb_standings`, `elo` | 510 |
| `kalshi`, `poisson`, `mlb_standings`, `elo` | 190 |
| `poisson`, `elo` | 47 |
| `kalshi`, `elo` | 20 |
| `kalshi`, `espn_powerindex` | 13 |
| `espn_powerindex`, `elo` | 8 |

Every one is **baseball**. `poisson`, `mlb_standings`, `elo`, and
`espn_powerindex` are all **team-strength estimators**. The old rule stamped
three team-strength models agreeing on a matchup as "3 independent sources
confirm" — which is one opinion counted three times, presented to customers as
corroboration by `apps/web/lib/pick-explainer/grounding.ts`.

## WHAT CANNOT BE RECOVERED

Rows store `sources` (names) and the blended `trueProb`. They do **not** store
each source's own `homeFairProb`. The per-source direction that produced the
stamp is gone. Reconstructing it would be inventing the number under audit.

So the honest claim is: **788 rows carried an untested corroboration label, and
the fraction of them that were actually false is not determinable from stored
data.** Not "probably some." Not determinable.

## THE STRUCTURAL MEASUREMENT, WITH ITS PRIOR WRONG IN IT

`.hermes/scratch/confirms_audit.py` measures how much independent information
the team-strength estimators actually carry: correlation between a single
train-window rate and the realized 2025 outcome, plus top-20% overlap.

```
players: 285
corr(train rate, 2025 realized total) = 0.7533
R^2 = 0.5675
top-20% overlap: 32 of 57    jaccard = 0.390
```

**I expected these near 1.0 and the script's own conclusion text asserted it.
They are not.** The corrected reading, weaker than my prior:

- One team-strength estimator already explains **57%** of outcome variance, so
  the extra two added little *independent* information — but not zero.
- At the decisive top-20% end a single estimator finds **32 of the 57** players
  who actually finish there. Direction agreement is real and far from
  unanimous.

So the fix **removes an overstated claim without manufacturing a new one**:
where directions genuinely differ the row now reads `SPLIT`. It does not turn a
moderate signal into a strong one, and nothing here should be read as evidence
that the baseball blend is well-calibrated — that is a separate, unmeasured
question.

## WHAT THE FIX DOES NOT TOUCH

`decision`, `confidence`, and `conviction` are computed above the agreement
field and are unchanged, so no published probability, rank, or grade moved. The
only consumers of the field are the pick explainer (now honest) and the staleness
gate, which branches on `!== "SOLO"` and therefore treats `SPLIT` and `CONFIRMS`
identically. **No row was rewritten**; the 788 historical rows keep the label
they were published with, which is the correct treatment of a published record.
