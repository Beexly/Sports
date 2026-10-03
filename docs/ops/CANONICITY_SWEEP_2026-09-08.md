# The canonicity marker is respected by 3 of 15 query sites

2026-09-08, 00:2x UTC. Read-only: SELECT via the Neon MCP plus reading the repo. No writes, no
code changed. Every figure **MEASURED** unless marked.

This is the sibling-lane audit applied to `mergedIntoGameId`, prompted by finding the same class of
defect three times in one night.

## 1. The sweep

`mergedIntoGameId` is the database's own canonicity marker: a non-null value means "this row is a
duplicate of another, do not treat it as a real fixture". C-117 established that the board must
filter on it.

Of the 15 files that query `games`, **3 apply the filter**:

| respects the marker | ignores it |
|---|---|
| `apps/web/lib/board/state.ts` | `apps/web/app/api/admin/dashboard/route.ts` |
| `apps/web/lib/board/market-coverage.ts` | `apps/web/app/sitemap.ts` |
| `packages/ingestion-pipeline/src/game-identity.ts` | `apps/web/lib/board/passes.ts` |
| | `apps/web/lib/slate-twin/get-slate-twin.ts` |
| | `apps/web/lib/data-sources/free-score-persist.ts` |
| | `apps/web/lib/ops/shadow-evaluation-pass.ts` |
| | `apps/web/app/api/cron/generate-drafts/route.ts` |
| | `packages/ingestion-pipeline/src/generate-signal-slate.ts` |
| | `packages/ingestion-pipeline/src/process-sport.ts` |
| | `packages/ingestion-pipeline/src/settle-sport.ts` |
| | `packages/ingestion-pipeline/src/freeze-slate-commitments.ts` |
| | `packages/ingestion-pipeline/src/team-game-log-repair.ts` |

The C-117 fix landed on the board's state loader and its coverage helper, and on nothing else. That
is the sibling-lane pattern at its widest: **one lane fixed, eleven not.**

## 2. Almost all of it is LATENT, and saying so matters

**Zero rows are tombstoned today, in any sport.** So eleven of those twelve sites behave identically
whether or not they filter. This is not eleven live bugs, and reporting it as such would be exactly
the overstatement this repository exists to avoid.

What it is: **eleven sites that would silently do the wrong thing the moment the merge runs.**

## 3. The one that is LIVE, and it lands on NFL

`generate-signal-slate.ts:166` selects games over a 21-day horizon with **`take: 80`** and no
dedupe. Duplicates are real today, so the cap is spent on them right now.

MEASURED against the current board:

| | |
|---|---|
| rows in the 21-day window | 744 |
| distinct real fixtures in it | 658 |
| fixtures the slate can actually reach | **71** |
| slots lost to duplicate rows | **9 of 80 (11%)** |
| how far ahead it really reaches | **2026-09-12**, about 4 days |

Two things follow. **11% of the pick-generation budget produces nothing**, because those slots hold
rows that carry no odds and can never yield a pick. And the code comment calls this a "21d signal
board" while the cap makes it a four-day one - the horizon is not the binding constraint, the cap
is.

This is the **cap-applied-before-collapse** pattern for the third time tonight, after C-153 and
C-161 in the pass lane. Here it is in pick generation, and NFL's 2.52 rows per fixture means the
waste grows as Week 1 enters the window.

## 4. What this does to the merge decision

C-163 measured that running `ops:merge-games` today would strand 578 published picks. This sweep
makes the warning stronger and changes the sequence:

**The filters are a prerequisite for the merge, not a follow-up to it.** Run the merge first and
settlement, score persistence, pick generation, the slate twin, the sitemap and the admin dashboard
all keep operating on rows the database has marked as not-real. Two of those write scores, which is
the C-115 corruption family.

Correct order: **filters first, then the pick-stranding companion, then the merge.**

## 5. What I did not do, and why

I did not add the filter to the twelve sites. It touches settlement, ingestion and pick generation
in one sweep; it changes nothing today because nothing is tombstoned; and it is only correct as
part of the sequence above, which is a founder decision. A twelve-file change to hot paths, landed
unattended at midnight on the strength of a grep, is the shape of the mistakes this session has
been correcting all night.

The one change I would argue for on its own merits is the slate's `take: 80`, because that waste is
live and measurable. Even that should be a dedupe rather than a bigger number: raising the cap
without collapsing duplicates buys more duplicates.
