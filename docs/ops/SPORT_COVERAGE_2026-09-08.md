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

## 7. The merge is NOT safe to run today, and here is the number

The open question above is now answered, and the answer inverts the recommendation.

**The survivor rule is correct.** `selectCanonical` (`apps/web/lib/ops/game-merge-plan.ts:253`)
sorts by pick count first, then odds and snapshot counts, then external-id shape, then age. For
NFL Week 1 the odds-bearing, pick-bearing row wins on the first tie-break and would be kept. That
half of the worry was unfounded.

**The cost is somewhere else, and it is large.** `merge-duplicate-games.ts` re-points odds,
snapshots, signals and several other child tables onto the canonical row, but by explicit design
it **never moves `picks`** - they are treated as settlement history and stay where they are. The
alias row is then tombstoned with `mergedIntoGameId`, and the board filters on
`mergedIntoGameId IS NULL`. So any published pick sitting on a losing row disappears from the
product.

MEASURED, replicating the tool's own ordering:

| sport | fixtures merged | published picks kept | **published picks stranded** |
|---|---|---|---|
| MLB | 405 | 486 | **420** |
| NCAAF | 105 | 168 | **90** |
| MLS | 75 | 58 | **49** |
| NFL | 64 | 79 | **19** |
| NHL | 3 | 0 | 0 |
| NBA | 0 | - | - |
| **total** | **652** | **791** | **578** |

**Running the merge today would hide 578 published picks.** That is not a reason never to run it,
and the duplication has to be resolved before NFL volume arrives. It is a reason the merge needs a
companion step first: published picks on alias rows must be re-pointed, or deliberately withdrawn
with a reason, before the tombstone hides them.

**Caveat on my replication, stated because the number drives a decision:** I ordered by pick count,
then odds count, then age. The real `selectCanonical` also counts `oddsLineSnapshots` alongside
odds and carries an ESPN-shape tie-break ahead of age. Groups decided by those two terms could
split differently, so treat 578 as accurate to its order of magnitude rather than to the unit. The
tool's own `--dry-run` prints the exact set and is the right instrument before any apply.

**Founder decisions this creates:** whether to re-point or withdraw the 578 before merging; whether
the merge becomes a cron once that companion exists; and the canonical namespace for NFL fixture
identity so three rows stop being minted in the first place.


## 8. Why there are three rows, and why that is the real finding

The duplication is not a mystery and not a new bug. **Three writers mint three different ids for
one contest**, and the code says so itself at `packages/ingestion-pipeline/src/seed-games-from-espn.ts:81`:

> This seed writes `espn:<short>:<id>` while espn-odds-client writes `espn:<sportKey>:<id>` and the
> paid path writes the Odds API id - three ids for one contest.

- `packages/data-ingestion/src/espn-schedule-seed.ts:121` writes `espn:<short>:<id>`, e.g. `espn:nfl:...`
- `packages/data-ingestion/src/espn-odds-client.ts:361` writes `espn:<sportKey>:<id>`, e.g. `espn:americanfootball_nfl:...`
- the paid Odds API path writes a bare 32-hex hash, e.g. `000fc688beb4fc004ecdad115d9adb1c`

There IS a reconciliation attempt: the seed calls `resolveCanonicalGame`
(`packages/ingestion-pipeline/src/game-identity.ts`) and claims a twin when identity proves the
same game. It is evidently not catching every case, since NFL sits at 2.52 rows per fixture with
zero tombstones.

**So the architecture mints up to three rows per contest by design, and the only reconciliation
that actually tombstones anything is an owner-run tool whose known side effect is hiding 578
published picks.** That is the finding worth acting on, and it is bigger than NFL: it is why MLB
accumulated the duplicate rows that carry 34.4% wrong finals.

MEASURED on creation dates: the hash writer has stopped minting NFL and MLB rows (last NFL hash row
2026-08-22, none in the last 48 hours) while ESPN ingestion continues (NCAAF created 134 rows in 48
hours). So the mix is shifting, but nothing retires the rows already made.

**This is a data-model decision, not an agent's:** pick one canonical identity for a fixture, make
the other writers resolve to it before insert, and give the merge a companion that re-points or
withdraws alias picks. All three parts are founder-gated because they touch published history and
the shape of the data.


## 9. A correction to my own numbers: per ROW understates NFL badly

Sections 1 and 5 counted priced coverage per game ROW. With NFL at 2.52 rows per fixture, that
divides by the empty duplicates and reports a number no customer would recognise. Recounted **per
real fixture** (priced if ANY row for that fixture carries 2+ books):

| sport | horizon | real fixtures | game rows | fixtures priced | share |
|---|---|---|---|---|---|
| **NFL** | next 7 days | 15 | 45 | **15** | **100%** |
| **NFL** | beyond 7 days | 257 | 275 | 245 | **95%** |
| NCAAF | next 7 days | 97 | 101 | 74 | 76% |
| NCAAF | beyond 7 days | 161 | 164 | 7 | 4% |
| MLB | next 7 days | 80 | 89 | 16 | **20%** |
| MLB | beyond 7 days | 159 | 178 | 0 | **0%** |

Three things change:

1. **NFL is the healthiest sport in the product, not a worry.** Every fixture in the next seven
   days is priced, and 95% of the rest of the season is too. The earlier 33% was an artifact of
   dividing by duplicates. Five days from Week 1 that is a strong position.
2. **NCAAF is normal.** 76% near-term falling to 4% further out is exactly how books post lines:
   close to kickoff, not months ahead. Nothing to fix.
3. **MLB is the sport that is actually broken.** 20% of this week's fixtures priced and **zero**
   beyond seven days. MLB cannot produce book-priced picks for most of its own slate.

**So the ranking of concern is the reverse of where my attention had been.** MLB dominated every
query because it has the settled-row history; it is also the one sport whose forward pipeline has
failed. NFL, the commercially decisive one, is in the best shape of any sport and its only real
issue is the duplication in section 8, which is latent rather than live.

The MLB pricing failure is the two-book problem (ledger C-104, WP-27) and the Odds API credit
governor (C-109) meeting in the same place. It is not a new defect; it is the known constraint
finally showing up as a product outage in one sport.
