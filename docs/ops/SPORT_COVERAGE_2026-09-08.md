# Sport-by-sport readiness — and an NFL Week 1 problem

2026-09-08, 00:0x UTC. Read-only SELECT via the Neon MCP; no writes. Every figure **MEASURED**.

Written because the previous night's analysis was MLB-heavy, which was a real gap: MLB has the
settled-row volume, so it dominated every query, while **NFL Week 1 is 2026-09-13, five days
out**, and NCAAF is already running.

## 1. The headline

**Every NFL fixture currently exists roughly 2.5 times in the database, and no other sport does.**

Upcoming 14 days, game rows per distinct real fixture:

| sport | rows | real fixtures | rows per fixture | namespaces | tombstoned |
|---|---|---|---|---|---|
| **NFL** | 78 | 31 | **2.52** | 3 | **0** |
| MLB | 179 | 160 | 1.12 | 1 | 0 |
| NHL | 22 | 21 | 1.05 | 1 | 0 |
| NCAAF | 180 | 173 | 1.04 | 2 | 0 |
| MLS | 49 | 49 | 1.00 | 2 | 0 |

NFL Week 1 Sunday (2026-09-13) in detail: **12 real fixtures, 36 rows, three namespaces.**

| namespace | rows | with 2+ books | avg books | published picks |
|---|---|---|---|---|
| (opaque id, no prefix) | 12 | **12** | 11.0 | **20** |
| `americanfootball_nfl` | 12 | 0 | 1.0 | 0 |
| `nfl` | 12 | 0 | 0.0 | 0 |

## 2. The good news, stated first because it is real

**Picks are landing on the right row.** All 20 published Week 1 picks sit on the namespace that
carries the odds (avg 11 books, 12 of 12 fixtures at 2+ books). NFL data coverage for Week 1 is
effectively complete: every real fixture is priced. The two empty duplicates attract nothing.

**NFL settled history is clean.** The ground-truth audit found 0 of 66 NFL picks on a game row
with a wrong score, against 169 of 491 for MLB.

## 3. Why this is still urgent

`mergedIntoGameId` is the database's own canonicity marker, and the board's C-117 dedupe treats
`mergedIntoGameId IS NULL` as "this is the real fixture". **Zero rows are tombstoned, in any
sport.** So all three NFL rows are canonical as far as every consumer is concerned:

1. **The board's fallback lanes can surface one NFL fixture up to three times**, since the
   scoring and gated queries select games directly rather than decisions.
2. **This is the exact structural precondition for the C-115 score corruption.** That defect
   needs two things: several rows for one fixture, and `SCORE_MISMATCH_CROSS_PATH` refusing to
   overwrite a final once written. MLB has both, and 34.4% of its checked rows carry another
   fixture's final. NFL has both too. [MEASURED for the structure; the corruption itself is
   NOT yet present in NFL.]
3. **NFL is clean today because its settled volume is preseason-small, not because it is
   protected.** Week 1 is when the volume arrives. [INFERRED, and it is the reason this is a
   five-day problem rather than a season-long one.]

## 4. The automation gap

`scripts/ops/merge-duplicate-games.ts` exists and is wired as `npm run ops:merge-games`. It is
**owner-run only**: it appears in no cron in `apps/web/vercel.json` and in no route under
`apps/web/app/api/cron/`. That is why zero rows are tombstoned anywhere.

This sits directly against the founder's standing instruction that there should be no human step
where a machine can do it. Merging duplicate fixtures is a database write, so an agent does not
run it; but nothing about it needs a human judgement per run, and it is a candidate for the same
treatment the zero-sit settlement lane got.

## 5. The other sports, so this is not another single-sport read

- **NCAAF** is the healthiest forward book: 180 rows for 173 fixtures, 82 games on Saturday
  2026-09-12 with 60 priced, **106 published picks** across all three markets. Its settled
  history is also nearly clean (2 of 51 rows wrong).
- **MLS** is 1.00 rows per fixture, 42 of 81 upcoming games priced.
- **MLB** forward coverage has collapsed to **44 of 295 upcoming games with 2+ books (14.9%)**,
  against 251 with none. Its historical rows were the ~3x duplicated ones; upcoming is 1.12, so
  ingestion improved and the backlog is what carries the damage.
- **NHL** has 65 upcoming games, **zero priced, zero picks**, with the season approaching.
- **NBA has no forward schedule at all**: the furthest scheduled game is 2026-06-14, in the past.

## 6. What I did not do

I did not run the merge. It is a database write, and law 7 reserves those for the owner.

I did not change ingestion to stop minting three NFL rows, because the fix belongs in fixture
identity (`packages/ingestion-pipeline/src/game-identity.ts`) and picking a canonical namespace
is a data-model decision with more than one defensible answer.

**NOT ESTABLISHED:** whether the merge tool, run today, would correctly pick the odds-bearing
opaque-id row as the survivor. That determines whether running it is safe or destructive, and it
should be answered before it runs.
