# narrative_contract: DARK -> STORED, and the exact steps to reach LIVE

2026-09-27. The crosswalk fix made this family measurable for the first time, and
it clears both honesty bars out of sample.

## Why it was unmeasurable before

Only 2023-2025 were roster-joinable, which left two training seasons. Two seasons
is not a training set. The validated `nfl_id -> gsis_id` crosswalk made
2018-2024 joinable, giving seven seasons of training history and 2025 as a clean
holdout.

## The measurement

| | on-field variant | roster-level variant |
|---|---:|---:|
| what it measures | APY of players actually on the field | mean APY of the season roster |
| train games | 1942 | 1942 |
| **holdout n** | **285** | **285** |
| **holdout r** | **+0.151125** | **+0.112232** |
| **holdout slope** | **+0.034161** | **+0.051235** |
| **holdout se** | **+0.013283** | **+0.026966** |
| `\|r\| >= 0.08` | clears | clears |
| `\|slope\| > se` | clears | clears |
| verdict | **STORED** (f3) | **STORED** (f3) |

Both variants pass honesty. `f1 = 0`. The only failure is `f3`: there was no
week-3 row, so the family is STORED rather than LIVE.

The roster-level variant is the one that matters going forward, because the
on-field variant **can never produce a week-3 value**: `2026_03_LAC_BUF` has not
been played, so there is no participation row for it. That is not a data problem
to wait out, it is a definitional limit of the feature.

## The week-3 value, computed

The 2026 season roster **is** published by nflverse (2,997 rows kept, 2 refused
for a blank `gsis_id`), even though the season has not been played. So the
roster-level feature is computable for the week-3 game after all.

```
BUF mean roster APY   5.311 M      LAC mean roster APY   5.442 M
x (gap)              -0.131 M      BUF players with a contract   57
p_home                0.520809     LAC players with a contract   51
signed               +0.041619
```

`signed = clip((intercept + slope * x) - 0.5) * 2, -1, 1)`, with intercept
0.5414884844705745 and slope 0.15808219460661174 fitted on 2018-2024 and scored
on the 2025 holdout. Nothing is refitted for the application row.

The signed value is small. The APY gap between these two rosters is nearly zero,
so the part contributes 0.0012 of points, and the edge moves from 0.30259224777263855
to 0.30384082052641725.

## Why it is NOT promoted tonight

I built the promotion, ran it, and then reverted it. It is not a small change:

1. `LiveEdgePart["family"]` is a **closed union of the eight original families**.
   Adding a ninth widens a type the whole reasoning layer is built on.
2. `data/gse-dataset/current/week3-engine-readings.jsonl` is an on-disk reading
   that the test suite cross-checks. It still carries eight parts and the old
   edge, so promoting means regenerating that artifact too.
3. `live-edge-registry.test.ts` asserts the part count, and `part-reading.test.ts`
   asserts "eight live parts and four dark candidates". Both are locked
   assertions, and `part-selector.ts` is on the shared path.

Running it broke four tests and a typecheck. The owner asked for no regressions,
and that is the definition of one, so the promotion is reverted and the eight
locked parts are untouched. The registry is back to 8 rows and the edge
recomputes to exactly `0.30259224777263855`.

The measurement is not lost. It is the strongest holdout result of the night and
it is fully reproducible.

## Exact steps to promote, when you want it

```powershell
Set-Location C:\Users\Garrett\Sports-wt-on-0927-A
node scripts\overnight\measure-narrative-contract.ts
node scripts\overnight\compute-week3-contract.ts
```

Then, as one reviewed change:

1. Add `"narrative_contract"` to the `LiveEdgePart["family"]` union in
   `packages/prediction-engine/src/reasoning/live-edge-registry.ts`.
2. Append the LIVE_EDGE_PARTS entry with `prior: 0.03`. **0.03 is the prior the
   edge already carried for this direction; this is not a ninth prior.**
3. Append to `LAC_BUF_PARTS`: `signed 0.04161909179262402`,
   `points 0.0012485727537787205` (that is `0.03 * signed`, and getting it wrong
   is a 1.2e-7 edge error the tests WILL catch).
4. Set `LAC_BUF_EDGE = 0.30384082052641725`.
5. Append the registry row with `signed_source` naming the formula, the fitted
   intercept and slope, and the three files it reads.
6. Regenerate `week3-engine-readings.jsonl` to match.
7. Update the two count assertions, from 8 to 9, saying a measured family was
   added rather than an assertion relaxed.
8. `cd packages\prediction-engine`, then `tsc --noEmit` and
   `vitest run src/reasoning/`.

## One caution worth stating

The train-to-holdout drop is real and large: r falls from 0.279 in sample to
0.112 out of sample on the roster-level variant. The holdout number is the only
one that counts and it does clear both bars, but a family whose in-sample
correlation halves out of sample is a weaker signal than the training figure
suggests. That is why the signed value is small and why this is a judgment call
rather than an obvious win.
