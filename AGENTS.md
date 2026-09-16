# AGENTS.md — autonomous run contract

Auto-loaded by Grok Build, Codex, and Copilot at workspace root; Claude Code loads it through the `@AGENTS.md` import on line 1 of `CLAUDE.md`. Read this first, every session.

Repository rules live in `CLAUDE.md` and apply in full. This file governs how an
**unattended agent** works here.

---

## THE LOOP

**UPDATED 2026-09-15 (NATIVE iOS CLIENT BUILT — `apps/mobile` now exists; read this
before touching mobile, the mobile API surface, or the X transport).**

**What landed.** `apps/mobile/` is a new Expo SDK 57 / React Native 0.86.3 / React 19.2.3
iOS client, plus a small `apps/web/app/api/mobile/v1/*` server surface, a bearer-auth helper at
`apps/web/lib/mobile/bearer-auth.ts`, and an X transport at `workers/twitter-bot/`.
Full context in `docs/mobile/` (README, PLAN, REVIEW_AND_AUDIT, research round 1).

**`apps/mobile` IS DELIBERATELY EXCLUDED FROM THE npm WORKSPACES.** The root `workspaces`
array now carries `"!apps/mobile"`. Reason, and do not undo it casually: `apps/web` is on
React 18.3 while the mobile client is on React 19.2.3 (React Native 0.86 requires it). npm
hoists to one root `node_modules`, so a shared workspace either fails the install or silently
gives one of the two apps the wrong React — the second outcome is far more likely and much
harder to diagnose. The mobile app therefore installs with its own lockfile and is driven from
the root by `npm run mobile:start` / `mobile:verify` / `mobile:test`, which use `npm --prefix`.

**NEVER publish `confidence` as a percentage on a mobile surface either.** The template
carries the rule as a linter check (`apps/mobile/scripts/lint-rules.js`) because a client has
no server to correct it. Same measurement as the web: the 80+ band claims 0.8663 and realizes
0.5191 (z = −10.7). The app renders `72/100`.

**Client mirroring rule — the mobile app may only ever REMOVE rows, never add them.**
`apps/mobile/src/lib/trust.ts` mirrors `adverse-edge-suppression` and the stale-pick policy
defensively. If you change either predicate on the server, change the mirror in the same PR or
the client will resurrect rows the server stopped sending. The mirror preserves the upstream
asymmetry exactly: absence is silence, and silence KEEPS the row. A parse failure must never
become a board wipe, and there is a negative-control test pinning that.

**Entitlements on the client are PRESENTATIONAL ONLY.** `apps/mobile/src/lib/entitlements.ts`
picks labels for fields the server already redacted. It must never be used to reveal data that
arrived in a payload — that is CLAUDE.md rule 3 and there is a test asserting the module
imports no components and holds no state. If a future change reads a `canSee*` flag to show
something, reject it in review regardless of how convenient it is.

**TypeScript is NOT a reliable gate on the iOS-side dev host.** `tsc` there intermittently
exits 0 with EMPTY output when it was actually killed by a ~180s process cap. Measured: a
one-file project importing `react-native` took 182s and died silently; the same configuration
later completed and reported real errors. `apps/mobile/scripts/typecheck.js` writes its report
with `fsync` and prints its own summary line — **a missing summary line means the run was
killed, not that the code is clean.** Before trusting any check, feed it a known-bad input.

**Do not treat the typecheck as a gate for `apps/mobile`.** It completed several times with 0
diagnostics and later failed to complete on every attempt, including a two-file project. The
gates are `scripts/lint-rules.js` (9 rules, self-tested on every run) and the test suite. Run
`tsc --noEmit` on a reliable host before believing the type layer.

**The X transport now EXISTS** at `workers/twitter-bot/` (OAuth 1.0a signer, API v2 client,
send pipeline). It is tested and NOT wired up: it needs credentials, a real ledger over
`BotOutboxRecord`, and a cron entry. Read `workers/twitter-bot/README.md` before touching it.

**TWO LINES FROM THAT README ARE LOAD-BEARING, so they are repeated here:**

- **`MUTE_BOT` is checked at SEND time, not at schedule time**, and only the literal `"true"`
  mutes. A mute that takes effect next cycle is not a mute.
- **A lost response is classified `UNKNOWN` and MUST NOT be retried.** The failure mode that
  matters is not "posted never", it is "posted twice after a timeout". A duplicate post to a
  public account is worse than a missing one.

**`XClient` has exactly ONE mutating method: `postTweet`.** There is no follow, like, retweet,
unfollow, unlike or delete, because the voice spec says the bot does none of those and a
capability that does not exist cannot be called. There is a test asserting the prototype
surface. Adding one of those methods is a product decision, not a refactor.

**One template defect is FIXED and one question is still OPEN.**

Fixed 2026-09-15, found by EXECUTING the template rather than reading it:
`pick-publication.ts` rendered the pick line TWICE (`BOS @ NYK BOS -3.5` in production,
`BOS -3.5 -3.5` in any test whose fixture followed the field names instead of the adapter —
the `matchup`/`line` split is not what the field names suggest). It also rendered confidence as
a percent. Both are corrected, with a test that asserts the exact rendered line and counts the
side occurrences so the duplication cannot return.

Still OPEN, and it is an OWNER decision: `docs/product/twitter-bot-voice-spec.md` permits
✅/❌/⚖️ while `DESIGN.md` mandates W/L/P/V monograms and forbids emoji. Both cannot be right.
The proposed resolution is in `docs/mobile/X_COMMUNITY_STRATEGY.md` section 3: the settlement
glyph is a single-use exception on the settlement lead post only. It was NOT changed
unilaterally, because it would override an explicit product decision and break pinned tests.

**Upstream findings an agent should carry forward** (full detail in
`docs/mobile/REVIEW_AND_AUDIT.md` §4):

- The FIELD revision collapsed the four-band confidence ladder to two effective colours —
  `--conf-strong`, `--conf-solid` and `--conf-lean` all resolve to `#C4BFB6`. `DESIGN.md` still
  specifies four hues. Either accept two bands or reintroduce two tints; do not invent a third
  palette at a call site.
- `DESIGN.md`'s YAML front matter and `design-system/colors_and_type.css` are STALE and still
  document the pre-FIELD palette. `BRAND_AND_DESIGN_SYSTEM.md` flagged this in June; it is still
  true, and this build had to choose between two files that disagree. Generate one from the
  other with Style Dictionary rather than keeping two mirrors in sync by hand.
- `/api/push/subscribe` is Web Push only (it validates `PushSubscription.toJSON()`); native
  devices need `/api/mobile/v1/devices`, which is additive and does not loosen that validator.
- React Native 0.86's bundled TypeScript definitions omit `ListHeaderComponent` and
  `ListFooterComponent` from `VirtualizedListProps`. Use `ScrollView` or augment locally.
- `expo-iap` v3 renamed `E_USER_CANCELLED` to `ErrorCode.UserCancelled`; comparing against the
  v2 name compiles and makes every user cancellation render a purchase error.

**DO NOT `finishTransaction` BEFORE THE SERVER ACKNOWLEDGES.** `apps/mobile/app/paywall.tsx`
currently does, and it is the most expensive defect in the client. `finishTransaction` tells
StoreKit the app has handled the transaction, so StoreKit will never re-deliver it. If the
subsequent server call fails, the customer has been charged and the server has no record — they
see the free tier and StoreKit will not help. The fix: finish only after the server confirms, set
`appAccountToken` on the purchase so a signed-out purchase is still reconcilable to an account,
and reconcile `getAvailablePurchases()` against the server on every foreground. Full reasoning in
`docs/mobile/research/round-02-repositories.md`. **Do not build a client-side retry queue for
this** — StoreKit already has a durable one, and a second queue is how a purchase gets recorded
twice.

**The mobile client has never been built or run.** There is no Xcode on the host it was written
on. Treat every runtime claim in `docs/mobile/` as unverified until someone runs
`npx expo start --ios` on a Mac. The typecheck passes; the build does not exist yet.

---

**UPDATED 2026-09-13 (NFL WEEK 1 LIVE CHECK — three production defects fixed, three
data outages found, conviction gate built). PR #808, branch
`claude/nfl-kickoff-live-check-0qwxfm`. Read this before touching the board, the
picks API, the DFS optimizer, or CLV.**

**FIXED AND PUSHED (PR #808, not yet merged):**

1. **`/fantasy/dfs` was HTTP 500 in production all day.** `dfs-exact.ts` imported
   `eligible`/`objVal`/`salaryOf` and `dfs-optimizer-edge.ts` imported `objOf` from
   `dfs-optimizer.ts`; none of the four was exported. `tsc` reported TS2459 on every
   one, but `next.config` sets `typescript.ignoreBuildErrors`, so it built and the
   bindings resolved to `undefined` at runtime (8 Vercel errors logged today,
   `TypeError: (0 , l.objVal) is not a function`). Also fixed in the same pass:
   `benchmark()` called `optimizeOne(opts, undefined, slate)`, putting the slate in the
   `restarts` slot; and `GenResult` lacked `partial`/`requested`/`exposureTarget`, which
   the optimizer component already read, so the partial notice never rendered and the
   exposure header printed `NaN%`. tsc 10 errors -> 0; 49/49 tests (21 were failing).

2. **Opposite sides published on one game.** Chicago Bears -3.0 (PREMIUM, conf 72,
   11 books) beside Carolina Panthers ML (model signal) (FREE, conf 63, 0 books) on
   game `cmpg6t8pl000f1hera7bgiigu`; Toronto Blue Jays -1.5 beside Baltimore Orioles ML
   (model signal), both FREE, on `cmt63npik073a29ovi2mlgrrc`. New
   `apps/web/lib/picks/model-signal-coherence.ts` drops a `bookmakerCount<=0` row when
   the same VIEWER's slate already carries a book-priced row for the same game.
   Viewer-scoped so the tier filter cannot defeat it. Never drops a book-priced row,
   never touches a game whose only read IS a model signal, writes nothing. 10/10 tests.

3. **"We passed" on games we were selling picks on.** Root cause is FIXTURE
   TRIPLICATION: every NFL fixture exists as THREE `games` rows, none tombstoned.
   Atlanta @ Pittsburgh: `cmpg6t8jg` (odds-api id, 11 books, dq 100, 35,016 odds, 1 live
   pick), `cmtfag55p` (`espn:americanfootball_nfl:`, 1 book, dq 64, 6,522 odds, 0 picks),
   `cmt621rco` (`espn:nfl:`, 0 books, dq 0, 0 odds, 0 picks). The gated lane's
   `picks: {none}` predicate is per-ROW, so the rich row was excluded and a thin phantom
   rendered as held with a reason computed off the phantom's own columns. Suppression now
   runs on fixture identity via `findTwinCandidate` and reads the full published set, not
   the 12-row display slice.

**MEASURED 2026-09-13 19:30 UTC: `confidence` IS ANTI-PREDICTIVE AT THE TOP, AND NO
CALIBRATOR CAN FIX IT. The v5.2.8 proposal is right and now has 15x the evidence. The
IMPLEMENTED flip and the MODEL_VERSION bump remain FOUNDER-ONLY.**

Full tables are in `docs/calibration-proposals/2026-09-05-market-anchored-display-probability-v5.2.8.md`
section 3b. The three numbers that matter, over settled published non-bootstrap picks with
pushes excluded:

- `confidence` (n 2,385): conf 80+ claims 0.8663 and realizes **0.5191**, gap -0.3472,
  **z = -10.7**. Its Brier as a probability on that band is **0.3617**; a constant 0.5
  forecast scores 0.25. Realized win rate PEAKS at conf 75-79 (0.6146) and FALLS to 0.4643
  by conf 90-94, below the 0.5280 of the lowest band.
- `rankingP` (n 1,390): monotone, over-confident in the upper middle, top band 0.8934
  claimed against 0.8286 realized.
- `marketFairProb` (n 622, books >= 2): monotone and every gap within 0.07.

**Why this cannot be calibrated away, and why nobody should try.** The display calibrator
(`calibration-apply.ts:70,80`) is isotonic regression (PAVA), monotone non-decreasing by
construction. It can flatten a curve; it can never invert one. Applied to a non-monotone
score it turns a score inversion into a stated win-probability inversion. More sample does
not help. The repo already half-knew this: the truth surface's `confidenceTail` has read
`verdict=inverted` since at least 2026-09-05 at n 167.

**What is already true in code, so nobody re-derives it:** `pick-card.tsx` renders raw
confidence as a SCORE ("72/100") with a comment saying a percent would read as a win
probability which this number is not, and it already has a `marketImplied` block from the
v5.2.8 display side (Phase 1). The gap is that `/calibration` still publishes
`expectedFromConfidence = confidence / 100` as the forecast (`compute.ts:260`, consumed at
:349/:355/:448/:459), and the `marketImplied` block is gated on `canSeeConfidence` while the
proposal says FREE viewers get it too because it is public arithmetic.

**Do not:** flip `status: IMPLEMENTED`, bump MODEL_VERSION, or change a floor to make any of
this pass. The proposal names the flip as the founder's and `model-freeze.mjs` guards it.

**STOP: THE BOARD PUBLISHES PICKS THE ENGINE ITSELF SAYS ARE LOSING BETS (2026-09-13 17:20 UTC,
read-only production SQL, 124 published PENDING rows). This is the most serious defect found today
and it outranks everything else in this file.**

Seven rows carry `factorBreakdown.independentEdge.decision = "PASS"` AND a negative `expectedClv`,
and every one of them is `isPublished = true`:

| conf | selection | trueProb | marketFairProb | decision | expectedClv |
|---|---|---|---|---|---|
| 78 | Los Angeles Dodgers -1.5 | 0.208 | 0.434 | PASS | -0.1356 |
| 79 | San Diego Padres -1.5 | 0.307 | 0.405 | PASS | -0.0592 |
| 58 | Toronto Blue Jays -1.5 | 0.097 | 0.387 | PASS | -0.1742 |
| 64 | Atlanta Braves -1.5 | 0.217 | 0.378 | PASS | -0.0964 |
| 72 | Milwaukee Brewers -1.5 | 0.425 | 0.462 | PASS | -0.0226 |
| 66 | Minnesota Twins -1.5 | 0.353 | 0.362 | PASS | -0.0055 |
| 56 | Seattle Mariners -1.5 | 0.412 | 0.434 | PASS | -0.0134 |

`decision` is computed, persisted, and rendered in the paying customer's factor trail.

**CONFIRMED IN CODE AND CLOSED, 2026-09-13 20:30 UTC. Both halves. Do not re-open.**

The publish path genuinely did not read it. `scoring.ts` asked the independent model AFTER its
last publish veto, then used the answer only as a display label. Fixed at mint in PR #811
(`pricesWorseThanMarket`, applied in the spread and moneyline scorers): a row whose own
`expectedClv` is negative is no longer minted.

That gate is FORWARD-ONLY and it does not reach rows that already exist. Re-measured 20:20 UTC
over published PENDING rows carrying an edge estimate:

```
published PENDING rows with an edge estimate   71
  of those, expectedClv < 0                      9
  of those 9, independentEdge.decision = PASS    9   (the predicates agree exactly)
  worst                                    -0.1742
  still pre-kickoff                              1
```

Nine rows minted before the gate deployed were still on the board, so a DISPLAY-side rule now
runs on both read surfaces: `apps/web/lib/picks/adverse-edge-suppression.ts`, applied in
`/api/picks` and `lib/board/state.ts` before their row caps. Four things about it that must
survive future edits:

- It IMPORTS `pricesWorseThanMarket` rather than restating the rule. Two gates spelling one rule
  two ways is how they drift, and a drift in this direction publishes a row the engine said to
  withhold. The predicate lives in `@sports/types`, NOT in the engine, and that placement is
  load-bearing: **nineteen web test files replace `@sports/prediction-engine` with a partial
  `vi.mock` factory defining only the symbols they need**, so importing it from there resolved to
  `undefined` under those mocks and collapsed the board's published lane to zero rows. The board
  suite caught it (10 pre-existing failures went to 15) before it shipped. Anyone adding a new
  cross-package import into `lib/board/state.ts` or the picks route should check that mock list
  first; `@sports/types` is the boundary both sides already cross intact.
- It gates on the signed number, never on `decision === "PASS"`. The two select the same nine
  rows today, but a CONTRADICTS row carries `expectedClv` 0.0 by construction, so the label
  would drop rows that are not adverse.
- Absence is SILENCE. No estimate, a non-finite value, or an unparseable breakdown all KEEP the
  row. If that asymmetry ever inverts, a parse bug becomes a silent board wipe; there is a
  negative-control test pinning it.
- It writes NOTHING. `isPublished` is untouched, so a suppressed row still settles and still
  counts in the published record, win or lose. That is deliberate: these nine are expected to
  grade badly, and removing them from the record would flatter our numbers by dropping exactly
  the rows the model said were worst. Hiding a row we should not have offered is honest;
  erasing it from the track record is not.

Considered and REJECTED: promoting a suppressed row into the Held lane. That lane is built from
GAMES, not picks (`state.ts`, `gatedToday.map((game) => ...)`), and a game whose adverse row is
suppressed may still carry a good published row, so the promotion would put the same game in
both lanes and re-create the "one game, one story" contradiction that
`model-signal-coherence.ts` exists to prevent.

Still OPEN from this section: the RANKING half. Confidence still orders the board and is still
anti-correlated with the engine's own edge (re-measured 20:20 UTC: conf 91 carries +0.0217, the
smallest positive edge on the slate, while conf 85 carries +0.2257, the largest). Suppression
removes the negatives; it does not reorder the positives.

**Second, `confidence` is not monotone in the engine's own probability, and today it inverted the
board.** Ranked by the engine's own `expectedClv`, today's book-priced MLB slate reads D-backs -1.5
(+0.2257), Red Sox -1.5 (+0.1351), White Sox -1.5 (+0.1032), Cubs -1.5 (+0.1010), Nationals -1.5
(+0.0697), Rays -1.5 (+0.0629), Yankees ML (+0.0614), Yankees -1.5 (+0.0217). Ranked by
`confidence` the same slate reads Yankees -1.5 **91** first and D-backs 85 third, with four PASS
rows interleaved at 79/78/72/66. The top-ranked pick on the board had the SMALLEST positive edge on
the board.

The mechanism is visible in the stored breakdown for that 91: `consensusScore` 30 +
`marketDepthScore` 20 are **constants** for any 11-book MLB run line (see the consensusPct bullet
below), so 50 of the points are fixed before the engine looks at the game. The only term that knows
whether the bet is good, `Independent Edge (skellam_cover)`, is stored with `"weight": -31` and
`"impact": "positive"` — a negative weight labelled positive, on a customer-facing surface.

**Rules from here:**
- Never publish a row whose own `independentEdge.decision` is PASS. Withholding needs no
  MODEL_VERSION bump (same asymmetry argument as the conviction gate) and is the safe direction.
- Never present `confidence` to a customer as a probability or a win rate. It is a weighted factor
  sum and today it was anti-correlated with the model's own P(win).
- Rank public boards on `expectedClv` / `trueProb` vs `marketFairProb`, never on `confidence` alone,
  until the composite is refit under a real MODEL_VERSION bump.
- Do NOT "fix" any of this by suppressing the numbers. The numbers are right; the gate and the
  ordering are wrong.

**Also measured on the same pull, not yet root-caused:** 124 published PENDING rows include fixtures
on 10-27, 12-06, 12-13, 12-20 and 01-10 with `generatedAt` of 05-22 and 08-22; the same model-signal
selection is published once per fixture across a whole series with byte-identical trueProb
(Rays ML 0.8597101874244611 on three different dates, Red Sox ML 0.7666284226276924 on three); and
`pickGrade` disagrees with both confidence and decision (Rays ML 0 books graded STRONG_PLAY at 86,
Yankees -1.5 11 books graded LEAN at 91).

**FIVE DATA OUTAGES FOUND — none fixed, all need an owner:**

- **THE GATE-DECISION TABLE HAS NO WRITER, AND HAS NOT BEEN WRITTEN IN 94 DAYS
  (found 2026-09-13 19:20 UTC).** `gate_decisions` holds 1,167 rows spanning
  **2026-06-10 23:54 to 2026-06-11 21:14** and nothing since. This is not a stalled cron:
  `git grep` for `gateDecision.create`, `.createMany` and `.upsert` across the repo, tests
  excluded, returns **NOTHING**. No code writes this table. Three files read it:
  `apps/web/lib/board/passes.ts`, `apps/web/lib/board/state.ts`,
  `apps/web/lib/bot-outbox/load.ts`.

  So every consumer of the gate's own record has been on its fallback path for three
  months, and always will be. That is why `pass-reason.ts` documents that fallback rows
  "were never evaluated" and why the ticker had to be changed from "we passed" to "held"
  (#810) — the stronger word asserted a judgement that no longer exists anywhere. There is
  no audit trail of why any game was passed on since 2026-06-11.

  Two knock-on facts, both measured. `todayBounds()` — duplicated byte-for-byte at
  `passes.ts:76` and `state.ts:305`, both using `setHours(0,0,0,0)`, i.e. the Node process
  zone, i.e. UTC on Vercel — bounds THIS table, so its timezone is currently moot: 0 rows
  in the UTC day, 0 in the Central day. Do not "fix" that boundary in isolation; it changes
  nothing until a writer exists, and when one does the right zone is Central (it answers
  "what did we evaluate today" for a reader) and NOT Eastern (which is the game-day
  contract, a different question). Separately, `passes.ts:126/277/361/366` stamp the panel
  with `now.toISOString().slice(0, 10)`, a UTC date, so from 19:00 Central onward the board
  would headline today's passes with tomorrow's date — latent today only because the panel
  has no rows to headline.

  Whoever owns this decides first whether the gate decision record is coming back or is
  retired. If it is retired, the three readers and the table should go, because code that
  reads a source nothing writes is worse than no code. If it is coming back, the writer is
  the work and the two items above ride with it.

- **THE LINE ARCHIVE HAS BEEN DEAD SINCE 2026-08-22. ROOT CAUSE FOUND AND FIXED
  2026-09-13.** `odds_line_snapshots` held 684,498 rows spanning only 2026-08-19 to
  2026-08-22. **This reframes the ESTABLISHED blocker:** the older note "CLV 23% vs 52.4%
  ... that is a model problem, not a gate problem" is NOT safe, because closing lines
  stopped being recorded, so CLV cannot be graded on any pick generated since.

  The cause was one argument shape, in `544d0148e` ("line-archive N+1 batch", landed
  2026-08-22, the archive's last day). It replaced N per-market `count()` calls with one
  `findMany` and wrote the filter as `where: { gameId, market: markets }` where `markets`
  is a `string[]`. `OddsLineSnapshot.market` is a scalar String (`schema.prisma:473`), so
  Prisma spells list membership `{ in: [...] }`; a bare array is a validation error.
  `captureLineSnapshots` wraps its body in a catch returning `{ persisted: 0, error }`
  instead of raising, so every capture since threw there and was swallowed.

  Fixed in `line-archive.ts`. **Three things let it survive three weeks, and all three
  are worth knowing because none of them is specific to this file:**
  1. The catch swallows. Failure isolation is right (a broken archive must not take down
     ingestion) but the only signal was a row count, and NOTHING in the repo monitors the
     freshness of `odds_line_snapshots`. A three-week outage had no alarm to trip.
  2. `db` enters the module as `unknown` and is cast, so the real Prisma client's types
     never constrain the call.
  3. The local `LineArchiveDb` interface declared `market?: readonly string[]` — written
     to match the buggy call rather than Prisma's actual filter. With the type endorsing
     the mistake, `tsc` passed throughout. It now declares `{ in: readonly string[] }`.

  **And the test suite CERTIFIED the bug.** Three assertions in `line-archive.test.ts`
  read `toHaveBeenCalledWith({ where: { gameId, market: ["SPREAD"] } })`. They were
  written to match the new call, so they locked the wrong wire format in place.
  Corrected, plus a dedicated `line-archive-filter-shape.test.ts` that pins the shape and
  explains the failure mode. Correcting an assertion that pinned a defect is not
  weakening a guard; it is the guard finally pointing at the right thing.

  **NOT VERIFIED, state it honestly:** that Prisma rejects this specific shape at runtime
  was NOT observed against a live database — no DB was reachable from the session, and a
  probe against an unreachable DSN returns an initialization error for every shape. What
  is verified: the column is scalar, the API requires `{ in: ... }`, the commit date is
  the archive's last day, and the error path is swallowed. The fix is correct by Prisma's
  contract either way. A COMPETING hypothesis that cannot be eliminated from the repo is
  that `LINE_ARCHIVE_ENABLED` was simply turned off in Vercel on 2026-08-22 — the founder
  can settle that by checking the flag, and both fixes are wanted regardless.

  **Still open:** nothing alarms on archive staleness. That monitor is the follow-up.

- **~~Stale-generation picks are live on today's board.~~ MEASURED AND LARGELY WITHDRAWN
  2026-09-13 18:55 UTC. Do not "fix" this — the obvious fix re-creates a bug that was
  already fixed on purpose.** The original claim: `Chicago Bears -3.0` and
  `Los Angeles Chargers ML (-503)` generated 2026-05-22, `Jaguars ML (-429)` and
  `Lions ML (-324)` on 2026-08-22, passing `freshPickWhere` because `dataFreshnessAt` is
  restamped every refresh while `selection`/`line` are frozen write-once (A-15) — "a
  four-month-old line is being sold as today's read."

  **The line is not stale. Only the timestamp is.** Read-only SQL over every published
  PENDING row on a future game: 103 rows, 28 with `generatedAt` older than 14 days, 8
  older than 30, oldest 2026-05-22. Joining each to the consensus of the last six hours
  of the odds table, the drift between the published line and the current market is
  **at most 0.07 points, and exactly 0.00 on 15 of the 18 rows** with live odds
  (`Bengals -6.0` generated 05-22 against a current 5.96; `Ravens -10.0` from 08-22
  against 9.96). These are October-to-January NFL fixtures where books post season-long
  lines early and they do not move. An old `generatedAt` on an unmoved line is not a
  wrong price.

  **Why the obvious fix is forbidden.** Bounding the selection on `generatedAt` would
  unpublish all 28. `stale-pick-policy.ts`'s own header records that `generatedAt`-based
  selection WAS the defect, fixed on 2026-09-05: it hid 80 book-priced picks created
  earlier in the week for that day's games. Re-introducing it re-creates that. It is also
  the shape a reviewer flagged as silently unpublishing every founder pick, since
  `dataFreshnessAt` is nullable and the founder lane leaves it null (0 such rows in this
  selection today, but the hazard is real for any broader version).

  **What survives, and it is a different defect: board SCOPE, not freshness.** 103
  published PENDING rows sit on future games, including fixtures on 10-27, 11-08, 12-06,
  12-13, 12-20, 12-27 and 01-10. A day board should not carry January. Whoever takes this
  bounds the horizon or labels the row's date; nobody touches `freshPickWhere`.

  Anyone re-opening the original claim needs a measurement that shows real drift, not an
  old timestamp.

- **The NFL elo path is not carrying information.** Six model-signal NFL picks today, six
  HOME teams, confidence 60-64, and three land on the identical `consensusPct` 0.6036.
  Full spread across six different games is 0.6036 to 0.6399. That is home-field advantage
  with a rounding wobble, not a per-game read — and it outranks genuine 11-book picks
  (Steelers -285 at conf 50) because elo returns ~60 while a real consensus returns ~50.

- **`consensusPct` carries no information on MLB run lines either (measured 17:08 UTC,
  read-only SQL).** Every one of the 14 published MLB SPREAD picks open on today's board
  reads `consensusPct` exactly 1.0000 — Yankees -1.5 at confidence 91 and Blue Jays -1.5
  at 58 are on the identical consensus figure. The card copy renders this as "100%
  bookmaker consensus on <selection>", which a customer reads as "every book likes this
  side". It does not mean that. An MLB run line is always 1.5, so "every book posts the
  same number" is true by construction and says nothing about which side the books favour.
  TOTAL picks on the same board do vary (0.6364 to 1.0000) and MONEYLINE picks vary, so
  this is specific to the MLB spread path. The consequence is the same shape as the elo
  bullet above: a factor pinned to a constant is still inside the ranking, so the 91-to-58
  ordering on MLB run lines is being produced entirely by the other factors while the copy
  credits consensus. Whoever owns this: either the reasoning string stops claiming
  consensus on a structurally-constant input, or the run-line consensus is recomputed as a
  side-agreement fraction (share of books whose price favours the selection) rather than a
  line-agreement fraction. Do NOT "fix" it by suppressing the number — that hides it.

**CI: THE LOCKFILE BLOCKER IS CLEARED, AND IT UNCOVERED THREE REAL FAILURES (2026-09-13
17:15 UTC).** The founder landed the resync (`077afd2` resync + `ff44d73` audit-fix); every
`npm ci` step on main run 5618 is now green, so the EUSAGE blocker described in earlier
notes is HISTORY — do not re-diagnose it. But `main` at `a0879d9e` still reads RED, because
for the first time in weeks CI got far enough to run anything. Three jobs failed and none of
them was caused by the merges that day; all three predate them and were simply unreachable
behind the install error:

- `Trust gate` — 2 betting-slang hits in `apps/web/components/fantasy/postlock-panel.tsx`,
  on the section aria-label and the h2. The rule bans the sure-thing noun and exempts only
  the temporal idioms ("at ...", "... time", "before the ..."); the panel's hyphenated
  prefix form was not among them.
- `All guardrails` — the same hit, plus 1 `commercial-copy` hit on a code comment in
  `components/three/signal-core-scene.tsx` and 3 `em-dash-scan` hits in
  `components/news/the-beat.tsx` (two comments, one customer string).
- `Test, type-check, lint, Prisma` — lint and typecheck both PASS; the failure is in
  "Run tests (all workspaces)".

Fixed by rewording the source, never the guard (law 9): the panel now reads "Late swap:
what changed", the comment reads "the entrance sequence", and the-beat's dashes are prose.
26/26 guardrails green after that.

**Two process notes, learned the hard way on this pass.** First, the guards were right and
every phrase was real, so do not add allowlist entries. Second, the scanners read THIS FILE
too, and a note that QUOTES the banned token to explain the fix trips the same rule — the
first draft of the four bullets above added 5 fresh hits and turned the PR red. Describe the
offending string, never reproduce it, and re-run `npm run guardrails` after editing AGENTS.md,
not only after editing code.

**NEW: THE CONVICTION GATE (`apps/web/lib/conviction/`).** Founder ask 2026-09-13: beat
and coach reporting, prop alignment, travel and rest, offense-vs-defense and scheme
matchups, and narrative/contract-incentive angles (his example: a receiver needing 105
yards for a season bonus) all feeding a TOUGHER gate so published picks hit better.

Built as a SECOND gate that runs AFTER the engine decides, and it may only WITHHOLD
publication. It does not score, rank, or alter a selection, line or probability, so
MODEL_VERSION stays v5.2.7 and the scoring math is untouched. That asymmetry is the whole
safety argument and must survive every future edit: a noisy signal costs us picks we would
have published, never a pick we would not have. A signal that wants to ADD conviction is a
scoring change, needs a MODEL_VERSION bump and a calibration pass, and does not belong here.

- `gate-contract.ts` — `SignalFn`, `SignalRead`, `evaluateGate`. Conjunctive: any one
  CONTRADICTS holds the pick; otherwise `minCorroborations` CONFIRMS are needed. A signal
  returning `null` has no data and gets no vote; `null` is never read as agreement,
  disagreement or zero. A signal that THROWS is silent, never evidence.
- `registry.ts` — the honest inventory of which signals are live and exactly what blocks
  each one. `requireEvidence` defaults FALSE, so wiring the gate changes nothing until an
  operator turns it on. **That last switch is founder-only under law 3 — no agent may flip
  it.** Report first, withhold on the founder's word.
- `signals/` — rest-travel, market-movement, book-agreement, beat-report, prop-alignment,
  scheme-matchup, narrative-incentive.

**What is actually live today, measured:** only `book-agreement`. `market-movement` is
dead because the line archive stopped on 08-22. `rest-travel` computes but CANNOT
DISCRIMINATE IN WEEK 1 — every team's previous game is a preseason game from 08-21..08-29,
so all rest gaps are 15-23 days; it becomes meaningful from Week 2. `beat-report` is inert
because the news wire is still fictional sample data and a fabricated wire must never gate
a real pick. `prop-alignment` is inert pending `EVENT_ODDS_INGEST_ENABLED`.
`scheme-matchup` is inert because nflverse is unreachable. `narrative-incentive` has no
source at all — the input contract is defined and requires `source` + `verifiedAt` on every
fact, and the module will never infer a narrative on its own.

**Do not regress:** never let the conviction gate ADD conviction or alter a pick. Never let
an inert signal default to NEUTRAL instead of null. Never let illustrative props or the
sample news wire reach a signal that gates a real pick. Never flip `requireEvidence` from
an agent session.


**UPDATED 2026-09-10 (21:15 UTC): FIELD visual system is LIVE on production
(galaxysportsedge.com). Founder-approved direction + logo; "math you can read"
is retired as a public tagline (internal trust-claim comments may still cite
BS-004; do not put the phrase on public chrome).**

FIELD tokens (authoritative — keep in sync across three files):
- Ground `#08090C` · panel `#12141A` · panel-2 `#191C23` · line `#23262E` · line-2 `#31353F`
- Bone `#EDE8E0` · fog `#C4BFB6` · mist `#8F8A82`
- Signal (action only) `#FF4D2E` · paper `#F4F1EB`
- Sources of truth: `apps/web/styles/design-tokens.css`, `apps/web/tailwind.config.ts`,
  `apps/web/lib/brand.ts` `BRAND_COLORS`. Change all three together.

FIELD IA (nav = footer, trimmed 2026-09-12):
- Top bar: Board / Players / Fantasy / GSN (four doors, not seven)
- Board menu: The board · Today's picks · Our record
- Footer: Board / Record / Method / Verify / Plans · X · 1-800-GAMBLER · one legal line
- Do NOT restore Record/Verify/Plans to the top bar. Do NOT restore Intelligence as a top-bar item.
- Do NOT restore the 4-column footer sitemap, footer-wordmark, or "MATH YOU CAN READ" stamp.

FIELD logo (`LogoMarkInline`): outer ring + tilted ellipse + thick arc + bone core + ember ping.
Wordmark: solid bone text + solid ember underline. No chrome/gradient fill, no Exo 2, no cyan→magenta fade.

FIELD copy rules (public surfaces):
- Hero thesis: Noise. / Signal. Closer: We detect. You decide.
- Holds are first-class ("a held row is not a blank — it is the finding").
- Never: "math you can read" on chrome, Mission Control as a primary label, "Four doors",
  sports decision intelligence, neon/crypto vocabulary.
- Prefer: Board, Record, Method, edge rank (not win probability), sealed receipt.

FIELD atmosphere: `gw-nebula` / `gw-nebula-deep` are quiet near-black + one ember crown.
Do not reintroduce violet radials (`rgba(60,45,110` / `#131022` / `#1B1530`).


**NEXT LEVEL 2026-09-10 (22:30 UTC):** Homepage rebuilt without GeneratedPlate /
SentientWeather / GalaxyCursor / SignalSpine / Nova launcher (those fight Field).
Cinematic intro = FieldCinematicIntro (canvas, once/session, skippable). Hero =
FieldHeroCanvas + Noise/Signal + three doors (Board / Record / Verify). Live
FieldBoardTicker from real board rows. Calm FieldRecordPanel wrapping
CalibrationCurve. Board page: plate + atmosphere removed; title "Scored.
Published or held." Nav Board menu collapsed to The board + Picks (no House/
Today in the dropdown). House = NFL hub, plate removed. Brand kit:
Downloads/gse-brand-kit (SVG mark + lockup + X/YT/FB headers).

**Audit 2026-09-10 (this pass):** live site verified Field (Noise hero, condensed footer, no
MATH YOU CAN READ, no starfield). Remaining NEBULA aliases in tokens/tailwind repointed to Field
hexes; nav condensed to five destinations; tools/intelligence public "math you can read" strings
replaced; brand lockup wordmark de-gradiented; gw-nebula de-violeted. typecheck/lint/brand must
pass before deploy (`vercel deploy --prod` from a worktree linked to project `sports-web`).

---

**SCRAPING QUEUE (founder has a scraping agent — 2026-09-12). Scrape these, in this order.
Format: what → why → where it lands. Founder will run the scrape; agents wire the results.**

1. **MLB Statcast (Savant) — pitcher + batter underlying.**
   Why: founder wants barrel%, hard-hit%, spin rate, exit velo, launch angle for
   every MLB prop/pick. The factor engine already accepts an `underlying` input;
   this is the data.
   Land: `apps/web/lib/statcast/` (new). Mirror the nflverse loader pattern
   (fetchWithFailover, assertIngestible, honest empty state). Source rights:
   MLB Stats API is facts-only; Savant is the public sabermetric backbone.
   Columns per player-season and per-pitcher-start: barrel%, hard-hit%, xwOBA,
   avg exit velo, avg launch angle, whiff%, chase%, spin rate (pitchers),
   sprint speed (batters).
2. **NBA rest / back-to-back + minutes.**
   Why: founder's own example — a player on a B2B or 3-in-4 is tired. The
   factor engine has a `rest` input ready.
   Land: `apps/web/lib/nba/rest.ts` (new). Source: Basketball-Reference or
   the NBA schedule + player game logs (facts). Fields: gamesInLast7Days,
   daysRest, minutesLast3.
3. **NFL coach / beat-reporter news (structured).**
   Why: founder wants coach news, coach rumors, beat reporter rumors as a
   factor. The news wire already classifies signals; this adds a
   `coach-report` tier.
   Land: extend `apps/web/lib/news/impact.ts` with a `coach-report` signal
   type, and add RSS feeds for each team's top beat reporter to
   `NEWS_RSS_FEEDS`. Founder: provide the feed URLs.
4. **Public pick consensus (over/under split).**
   Why: founder's 5,000-over / 3,700-under example. The factor engine
   already accepts `consensus: { overCount, underCount }`.
   Land: `apps/web/lib/consensus/public-picks.ts` (new). Sources: PrizePicks /
   Underdog public pick percentages if scraped; otherwise Action Network or
   similar public consensus pages. Store as a per-prop over/under count.
   NEVER fabricate a consensus number — absent = factor does not fire.
5. **Defensive-front / coverage splits (zone vs man, box counts).**
   Why: founder wants "this RB does better vs this front" and "this QB reads
   zone better than man."
   Land: `apps/web/lib/nfl/coverage-splits.ts` (new). Source: nflverse
   play-by-play already has some of this; supplement with Next Gen Stats if
   the license clears. Fields per player: rate vs man, rate vs zone, rate
   vs light box, rate vs stacked box, with sample sizes.
6. **Historical prop closing lines (for CLV).**
   Why: CLV 23% vs 52.4% is the ESTABLISHED blocker. More closing-line
   history = more graded CLV samples.
   Land: `odds_line_snapshots` already persists (LINE_ARCHIVE_ENABLED is ON).
   Founder: if you can scrape historical prop closing lines from a cleared
   source, we ingest them through the same path.

**Do NOT scrape:** sportsbook sites for display prices without a license;
fantasy sites that prohibit scraping (check `source-rights-registry.ts` first);
anything that would put a real book's quotes into a paid SaaS without rights.

**Founder feedback 2026-09-12 (post-merge, progress log):**

SHIPPED this round (PRs #773-#781, commits A22-A33):
- ADMIN→ELITE so the owner is never paywalled out of their own product
- Source JSON → Data sources (leftover jargon)
- The Beat rebuilt: robotic speechSynthesis REMOVED, full-bleed cinematic opening
- /calibration condensed: graph is the hero, 3 doors, rest collapsed
- **GSE Score + GSE Index** (`lib/fantasy/gse-score.ts`): real player ranking.
  LIVE reads processGrade from nflverse; SAMPLE is a pool percentile, labelled.
  Wired into trade analyzer AND draft assistant — one ranking system.
- **Board** cinematic opening + "You are here" IA strip naming all three
  surfaces (board / published picks / founder picks). Lane "Gated Today" →
  "Held Today".
- **House** weekly rhythm is now an actionable calendar: every beat carries
  action + href, today's CTA banner, today highlighted in the grid.
- **DFS projections table** (LineStar parity): sortable Sal/Proj/Val/Ceil/
  pOwn%/Lev, pin/exclude from the row.
- **Props board** market + team filters (PropFinder parity).
- **CSV export** of generated lineups (DK Classic format).
- **Max exposure slider** on the optimizer (10-100%).
- **Last JSON button** on the intelligence engines page killed.

STILL OPEN — next agents pick these up in order:

1. **Optimizer / props rebuild against LineStar + PropFinder.** Founder wants the
   optimizer to look and work like LineStar. Feature map scraped 2026-09-12 from
   linestarapp.com and propfinder.app — DO NOT re-scrape from scratch, use this:
   - LineStar: Projections table (salary, proj pts, value, pOwn%), Daily Dashboard,
     Patented Optimizer (150+ lineup MME, pin/fade, exposure, stacks, budget),
     Value Plays, Projected Ownership (pOwn%), Social Sentiment, Breaking News &
     Injuries with push alerts, Community Chat, Export Lineups (DK/FD/Yahoo),
     Salary Comparison + Salary Changes, Vegas Odds inline, Import/Export Custom
     Projections, Advanced Lineup Settings (stack finders, exposure, models).
     Sports: NFL/MLB/NBA/NHL/PGA/CFB/CBB/WNBA/UFC/NAS/CSGO/LOL/CFL.
   - PropFinder: Player Dashboard (trends, matchup, advanced stats, opponent
     game logs, injury reports, real-time odds, custom filters), Cheatsheets
     (TD / rushing / redzone / line / coverage matchups), Power Ratings with QB
     adjustments + weekly movement, Games Board (model spreads/totals/projections),
     QB rankings, win totals, HFA, weather, hit rates, opponent matchup ranks,
     conference filters. 18+ sportsbooks. Free tier 1 game/league; $14.99/mo.
   - Our props HB engine already exists (`edge-lab/props-hb*.ts`). Ingest needs
     `EVENT_ODDS_INGEST_ENABLED=true` (founder env).
2. **Player rankings are wrong.** Trade analyzer showed Lamar Jackson as most
   valuable — the illustrative pool is not real rankings. Need a live player
   ranking system plus a visible **GSE score** and **GSE index** per player.
3. **Board is still confusing and boring.** Founder cannot tell public picks vs
   published picks vs the board. This is the premier surface; it should be
   cinematic (visual presentation, not research). Optimizers = functional
   engagement. Beat = cinematic.
4. **House is underutilized.** No leverage for the customer. Tie in the weekly
   rhythm as a real calendar with alerts: do your waivers, set your lineups,
   this player is out (injury).
5. **Trade analyzer** needs real values, not the sample pool.

**UPDATED 2026-09-12 (ASTRA REDESIGN + RECORD ACCURACY + FOUNDER PICKS — merged as PR #769,
main `8a1df39cf`).** Full session record. Other agents: read this before touching anything
listed below. Ledger rows A-1..A-24 in `docs/ops/AGENT_LEDGER.md`.

**What shipped (24 commits on `claude/astra-redesign-2026-09-14`, merged):**

1. **ASTRA 12 owner items** — age-21 gate off subscriptions; tiers re-weighted for DFS season
   (Elite no longer sells retired Galaxy Twin / useless Academy); proof-crystal backgrounds
   replaced on /verify /calibration /proof /engine with one Field atmosphere; The Beat made
   interactive (pulse, sort, quiet-the-noise, expandable cards); Studio internal-only; Academy
   hidden from public nav + noindex; fantasy "gated" badge honesty (live / partly live / sample);
   jargon stripped from intelligence engines (JSON button gone, titles plain); free tools given
   usage moments; House collapsed to 4 doors (no Observatory, no Sunday Couch); /board vs /picks
   IA fixed ("Published picks" vs "The board").
2. **Record accuracy (the big one)** —
   - PUSH was structurally unreachable for spreads/totals (settlement needs an integer line; the
     mean is an integer only when every book agrees). Published and graded the POSTED book line
     nearest the consensus mean (`packages/prediction-engine/src/published-line.ts`). Scoring math
     still reads the raw mean — no grade/rank moves, MODEL_VERSION stays v5.2.7. Ties resolve
     against us. Forward-only.
   - Published bet terms (selection/line/reasoning/reasoningShort) frozen write-once at creation
     in `process-sport.ts`, minted with clvLockLine. The card can no longer show -4.5 while we
     grade -3.0.
   - Calibration bucket win rates excluded pushes (were averaging push as half a win, flattering
     sub-50% buckets). Correlation WIN_RATE excluded pushes (were counting every push as a loss).
   - /api/performance floor now counts decided picks only (was counting pushes toward the floor).
3. **Calibration skill picture (additive, no floors)** — `apps/web/lib/calibration/skill-metrics.ts`:
   BSS, NLL, Murphy REL/RES/UNC, null-band ECE diagnostic. Wired into computeCalibration as
   `report.skill`. Synthetic-forecaster tests pin constant/perfect/overconfident behaviour.
   `marketGatesAdvisory` on the live metrics artifact — ADVISORY ONLY, calibration-eligibility.ts
   never reads it. Live eligibility is MONEYLINE-only.
4. **Landed unlanded branches** — `claude/calibration-math-verification` (39 hand-computed math
   pins + the performance floor bug), `claude/push-handling-in-rates`, `claude/settlement-push-and-line-drift`.
5. **Founder picks ("Beak's picks")** — `apps/web/lib/founder-picks/`. modelVersion=founder-v1,
   isBootstrap=false, ADMIN POST /api/admin/founder-picks, public /founder-picks + /api/founder-picks.
   Decided-only win rate. Locks at kickoff (fail-closed). Requires a written reason. factorBreakdown
   tags source=founder, rankingP null. Can fill a held game or override a PENDING engine pick.
   No schema change.
6. **Owner permissions (code-level, works even when ADMIN_EMAILS env is empty)** —
   `apps/web/lib/auth.ts` `CODE_OWNER_ALLOWLIST`:
   - `baxley.garrett@gmail.com` — primary owner, full admin. The ONLY email that should ever flip
     gates/env flags (law 3).
   - `dbax66@icloud.com` — secondary admin. Cockpit, founder picks, ops surfaces. Do NOT flip
     gates or env flags.
   ADMIN_EMAILS env still works and is OR'd with this list.

**Verified at merge:** typecheck 0, lint 0, model-freeze OK (MODEL_VERSION v5.2.7), trust-gate OK
(2138 files), 2323-test calibration+honesty+settlement sweep green, auth 34/34, founder-picks 9/9,
calibration-math-invariants 39/39. Floors (n 100 / Brier 0.22 / ECE 0.05) byte-identical. No env
flag flipped.

**Live truth surface 2026-09-11T23:56Z (do not re-litigate):** eligibility GREEN, streak 93,
PERFORMANCE_STATS ON, calibration published, revenue ladder PROVEN, money path ready, settlement
HEALTHY (0 of 2802 overdue), canonicalSettled 2300. The only unmet ESTABLISHED requirement is
CLV beat-close 23.0% vs 52.4%.

**Props activation (founder env only, NOT flipped):** the full hierarchical-Bayes props engine
already exists (`packages/prediction-engine/src/edge-lab/props-hb*.ts`, fire-gate, line-shop,
juice-floor). Ingest is wired and no-ops unless `EVENT_ODDS_INGEST_ENABLED=true` (credit-capped,
default 8 calls) and `LINE_ARCHIVE_ENABLED=true`. Schema sealed — prop lines persist in
OddsLineSnapshot. Two founder env flips turn it on.

**Founder env actions still open:**
- Set `ADMIN_EMAILS=baxley.garrett@gmail.com,dbax66@icloud.com` in Vercel (belt-and-braces; the
  code allow-list already works without it).
- Props: `EVENT_ODDS_INGEST_ENABLED=true` + `LINE_ARCHIVE_ENABLED=true`.
- Vercel AI Gateway for internal LLM: `INTERNAL_LLM_BASE_URL=https://ai-gateway.vercel.sh/v1`,
  `INTERNAL_LLM_API_KEY=<vck_… key from founder, NEVER commit it>`, `INTERNAL_LLM_MODEL=<model>`.
- Merge is done; production auto-deploys from main at `8a1df39cf`. Redeploy if the truth surface
  SHA lags.

**Do not regress:**
- Never restore the age-21 checkout gate.
- Never put "gated" back on fantasy tools that render on sample data.
- Never put "Today's Board" eyebrow back on /picks.
- Never re-add proof-crystal to the trust surfaces.
- Never average a push into a published win rate.
- Never publish a pick whose displayed line differs from its clvLockLine.
- `marketGatesAdvisory` is NOT a gate. calibration-eligibility.ts does not read it.
- Founder picks use modelVersion `founder-v1` — never mix them into engine calibration samples.

**Next highest-value work (in order):**
1. Props env flip (founder) + verify prop lines land in OddsLineSnapshot.
2. Owner starts locking founder picks; promote the honest record.
3. Keep selective δ=0.1 + pause ON; rank on marketFairProb (bestScore per the bake-off).
4. CLV 23% → 52.4% is the ESTABLISHED blocker — that is a model problem, not a gate problem.
5. Visual polish pass on /founder-picks and the props board once props are live.

**UPDATED 2026-09-12 (OVERNIGHT AUTONOMOUS RUN — scrape wave 2 + humanizer + nav trim).**
Branch `claude/astra-redesign-2026-09-14`, commits A43-A45. Other agents: read this.

**What shipped:**

1. **Statcast loader** (`apps/web/lib/statcast/`) — batter/pitcher/sprint-speed CSV endpoints
   from baseballsavant.mlb.com. `baseball-savant` added to source registry (use-with-caution,
   facts-as-inputs). 8 unit tests. Feeds the `underlying` factor in the founder-picks engine.
2. **Scrape wave 2 research** (`docs/research/scrape-wave-2-results.md`) — full wiring map from
   two scrape JSONs (71+53 features, 567+93 columns). Covers Statcast, LineStar, PropFinder,
   RBSDM, NFL/Savant, NGS, Fangraphs, competitor pricing.
3. **Humanizer pass** — nav trimmed to Board / Players / Fantasy / GSN (Record, Verify, Plans
   moved to footer + Board menu). Intelligence folded into Board menu. Ticker slowed 48s→90s.
   Gate reasons rewritten in plain English. Homepage stats relabeled. Mission Control removed
   from public copy. Methodology cards humanized.

**Nav doctrine (updated):** top bar = Board / Players / Fantasy / GSN only. Record lives under
Board menu ("Our record"). Verify and Plans live in footer. Intelligence tools live under
Board menu ("Free tools") and /intelligence/engines. Do NOT add Record/Verify/Plans back to
the top bar.

**Copy doctrine (updated):** every customer-facing string must pass the "would a sharp friend
who actually plays DFS say this?" test. Banned: "cleared the gate", "market depth below
publish threshold", "not evaluated", "no pick generated", "Mission Control", "Sports decision
intelligence", "Four doors". Use: "we're on this", "we passed", "not enough sportsbooks are
pricing this", "we haven't scored this yet".

**Founder env actions still open (unchanged):**
- `ADMIN_EMAILS=baxley.garrett@gmail.com,dbax66@icloud.com`
- `EVENT_ODDS_INGEST_ENABLED=true` + `LINE_ARCHIVE_ENABLED=true`
- `INTERNAL_LLM_BASE_URL` + `INTERNAL_LLM_API_KEY` + `INTERNAL_LLM_MODEL`

**UPDATED 2026-09-10 (17:15 UTC): NFL CLIP OPERATION — "GSE Film Room" on @GalaxySportsHQ (Motif, Muse agent).** Garrett's directive: real clipped sports footage with our data narrative; no synthetic/fake footage; no commercial license; transformative edits only. Full build artifacts live in the revenue-engine workspace under `clips/video-builds/` (not in this repo).

1. **First native clipped video POSTED 2026-09-10:** "How Seattle manufactured THREE fourth-quarter INTs off Drake Maye" (74.7s, 1080x1920, H.264+AAC). Live: https://x.com/GalaxySportsHQ/status/2098095892268273696. Final file `gse-filmroom-seahawks-3int-mayes-meltdown-v2.mp4`; source log `SOURCE-LOG-seahawks-3int.md` carries both official @Seahawks post URLs, exact excerpt timestamps, and every transformation.
2. **Footage doctrine (Garrett-approved):** seconds-long excerpts only; commentary visibly/audibly dominates; telestrate, pause, crop, or slow-mo each excerpt; attribution burned in (`FOOTAGE: @SEAHAWKS` on every footage frame); never standalone rips or compilations; footage well under half the runtime (18.3% on this video: 13.7s of 74.7s). Fair use is a defense, not permission: comply with takedowns, preserve records, never repost.
3. **Narrative doctrine (Garrett, 2026-09-10):** every package carries a DATA THESIS — a fantasy/prop/scheme angle answering "why does this matter for fantasy/bets?" No data thesis = failed package. All content funnels to the site's predictions (galaxysportsedge.com).
4. **Verified data bank** (2+ sources each; full URLs in `clips/clip-desk/2026-09-10-live/data-theses-2026-09-10.md`): JSN 11 targets / 8 rec / 122 yds / 1 TD vs Patriots (+35 YAC over expected); Seahawks D 3 sacks / 9 TFL / 6 PBU; Maye 23/33, 178 yds, 1 TD, 3 INT — all in Q4; CMC vs Rams last two meetings: 2.6 YPC then 8 rec/82 yds, 2.5 YPC then 8 rec/66 yds (receiving thesis, not rushing); Puka Nacua 86.8 yds/g vs 49ers (5 games); Rams -3.5, O/U 48.5; injuries: 49ers DT Alfred Collins out for season (torn patellar tendon), Donald didn't travel. **Honest gaps:** no public numeric average-separation figure exists for JSN — do not cite one; no beat/film source names the exact coverage shells on the three INTs (Love "baited" Maye on 3rd & 14; Jobe jumped an underthrown ball to double-covered Hollins) — do not invent scheme claims.
5. **Pregame series 2026-09-10** (49ers-Rams, Melbourne Cricket Ground, kickoff 7:35 PM CT). STRATEGY: 4 spaced text posts building hype toward kickoff; every post funnels to galaxysportsedge.com predictions; no hashtags, no extra links. Garrett approved all four verbatim ("Yes — post all four, spaced out"). Exact copy and status:
   - **1/4 — Travel contrast — POSTED live 12:16 PM CT:** https://x.com/GalaxySportsHQ/status/2098098379121402179. Copy: "The 49ers flew to Melbourne eight days early. Sleep scientists, advance staff, full body-clock protocol. / The Rams landed ~24 hours before kickoff. In and out. / Shanahan, on Melbourne time: "I call today Wednesday... but I think it's Monday, however though it's Sunday in the present." / One of these staffs is about to look very smart. Our full prediction: galaxysportsedge.com"
   - **2/4 — CMC receiving thesis — scheduled 2:00 PM CT** (cron id `gse-x-post-pregame-2`). Copy: "Christian McCaffrey vs the Rams, last two meetings: / 2.6 YPC → 8 catches, 82 yards / 2.5 YPC → 8 catches, 66 yards / They've solved his rushing and still can't cover him. Short game decides this one. / Full prediction: galaxysportsedge.com"
   - **3/4 — Puka vs compromised fronts — scheduled 3:30 PM CT** (cron id `gse-x-post-pregame-3`). Copy: "Puka Nacua vs the 49ers: 86.8 yards per game across 5 meetings. / Now the 49ers lose starting DT Alfred Collins for the season, and Donald didn't travel. / Both fronts compromised. Somebody's scoring tonight. / Full prediction: galaxysportsedge.com"
   - **4/4 — McVay business trip — scheduled 5:00 PM CT** (cron id `gse-x-post-pregame-4`). Copy: "McVay, asked about the Rams' Melbourne plan: "We won't be there long enough for the fans to really have any curiosity about it." / Less than 24 hours in Australia. No acclimation — just ball. / Genius or disaster, we made our call: galaxysportsedge.com"
   Clip-desk live runonce `clip-desk-live-2026-09-10` fires 7:30 PM CT, re-briefed with the data-thesis requirement (packages without one are FAILED).
6. **Technical notes:** v1 failed QC — Pillow `anchor="lb"` aligned each letter to its own ink box, shifting descenders upward so captions read "steP"/"MaYe"; fixed with shared-baseline `anchor="la"`. Telestration label overlap on the Pick-2 freeze fixed by repositioning. A service restart wiped /tmp mid-render and killed one v2 attempt; all build scripts are now durable under `clips/video-builds/build/`. X sign-in for @GalaxySportsHQ restored via "Continue with Google" (signal.origin.hq@gmail.com). Session kept dropping between browser tasks: first restore hit Google's "Verify it's you" reCAPTCHA, which cleared on page refresh with OAuth completing and no password prompt (transient password Garrett supplied then was never entered or stored); on the next drop Google presented a password challenge instead, and with Garrett's explicit authorization the password was entered once on Google's official page, used transiently, never stored. Each scheduled post verifies @GalaxySportsHQ via the account menu before publishing and logs its live URL to the revenue-engine `ops/ACTION_LOG.md`.
7. **Mechanics — the engines, algos, research, schedules** (what runs the operation; full docs in the revenue-engine workspace, not here):
   - **Posting engine (x-poster skill):** voice-locked drafts → real scorer gate **Hold ≥9.2** (composite ≥9.2, density ≥8, bait ≥9, adversarial checks) → staged to approve-desk → Garrett APPROVE → browser post → ACTION_LOG. Human-primary absolute: no post/schedule/edit of public copy without his explicit approval; exception is the standing full-operation authorization for sports videos. Spacing 60–90+ min, 2–4/day (author-diversity decay halves reach on burst posts); max 1 primary + 1 backup, never a batch.
   - **Algorithm levers (from X's open-sourced 2026 ranking code, xai-org/x-algorithm):** share-via-copy-link 20.0 (40× a like — highest positive signal; every post needs a copy-worthy line), reply 5.0, quote-post 5.0, follow-from-post 4.0, like 0.5; negatives: report −234, mute −58.8, not-interested −43.2, block −31.2. No video scorer boost (VQV=0.0 — video wins via dwell, not a multiplier); quote-posts scored as independent candidates; no hashtag signal; link penalty dead. Premium ~6–7× median impressions, active. Cold-start reserves 15–16 feed slots for ≤1K-follower authors on <24h posts — @GalaxySportsHQ qualifies. Every post: copy-worthy line + genuine reply fuel; reply back to every reply fast (bidirectional boost +15.0); no engagement pods (zero ranking impact by code).
   - **Footage engine (GSE Film Room):** real seconds-long excerpts only; pause/crop/telestrate/slow-mo each; commentary dominates runtime; attribution burned in; footage well under half the runtime (18.3% on v1); source log with post URLs + exact excerpt timestamps + every transformation; frame-by-frame QC at the 9.2 bar; durable scripts under `clips/video-builds/build/` (Pillow anchor="la" fix). Lanes: quote-post official/publisher clips — no upload, zero DMCA surface (@HouseofHighlights has an active 3-yr NFL content partnership); official YouTube embeds; presser lane; telestrated excerpts under the authorized gray-zone dial.
   - **Research inputs:** Grok email briefs ("GSE Signal Desk daily factory", "signal-origin-overnight-ops") mined daily — every claim independently 2-source verified before it touches a post (`ops/x-drafts/GROK-INTEL-2026-09-10.md` tracks verified vs leads). Concept miner scans viral formats for stealable mechanics: dense working-note infographics, controversy reaction-aggregation, comment-gated lead magnets. Reply-opportunity monitor drafts paste-ready replies to high-velocity NFL posts — nothing posts without Garrett. Adopted Grok methodology: kill/rewrite patterns log, revenue-path note per candidate.
   - **Enforcement reality (footage-playbook-v2, verified):** X publishes no strike count; an infringement-dedicated account can be **permanently suspended on day one**; deleting a flagged post clears nothing (notices persist in Lumen); counter-notices require real identity + federal-jurisdiction consent + perjury statement; transformative commentary did not save Orlovsky (NFL told him "no more" directly, no DMCA filed); McAfee pays $4M+/yr for highlight rights, killing the "no market harm" fair-use argument; detection is content-based, so risk rises mechanically with virality. NCAA: Fox is the live wire (DMCA'd @nocontextcfb Nov 2023, even a repost of Fox's own clip); ESPN/ABC have zero documented clip-enforcement on X in a decade of reporting (searched, not asserted as safe); NetResult has no college footprint. **CLIPS-DOCTRINE.md carries a known defect** — overconfident "zero risk / unlimited" wording on quote-posts — pending correction; the v2 playbook wording governs until it is fixed.
   - **Schedules live:** clip script 7:08 AM CT daily; marketplace watch 9:08 AM daily; card scan Wed 10 AM; POD scan Mon 10 AM. Today: pregame 2/4 at 2:00 PM CT (`gse-x-post-pregame-2`), 3/4 at 3:30 PM CT (`gse-x-post-pregame-3`), 4/4 at 5:00 PM CT (`gse-x-post-pregame-4`); clip-desk live runonce 7:30 PM CT (`clip-desk-live-2026-09-10`) for the 7:35 PM CT kickoff — draft-only, it never posts, schedules, or DMs.
   - **Partnership track:** Chiefs Kingdom Creators — inaugural 30-creator roster set, Creator Camp ran Aug 2026; recommendation is monitor for a 2027 cycle, not apply now (approval/revision terms constrain the voice needed at 1 follower). Rams/Lions programs exist with no public application surfaced. NFL Access Pass / Creator of the Week: invite-only, no application exists.

**UPDATED 2026-08-20 — `handoff/LEDGER.md` and `docs/ops/hermes/CONTINUOUS.md`
below are FROZEN artifacts of an earlier session (last touched 2026-08-17/18).
They are not the live coordination system. Do not resume work from them.**

The live, multi-agent ledger — shared by Hermes, Copilot, the browser agent,
and Claude sessions — is **`docs/ops/AGENT_LEDGER.md`**. It is validated by
`scripts/ops/check-agent-ledger.mjs` (real exit code — never pipe it away) and
enforced in CI. Read its own "Rules" section before touching a row: claim
before starting, never edit a row you do not own, `DONE` requires a
resolvable commit SHA or `#PR`, `UNPUSHED` if you cannot push.

**UPDATED 2026-09-03 — `docs/ops/AGENT_LEDGER.md` is LIVE and current
(142 rows: 27 OPEN / 2 CLAIMED / 4 BLOCKED / 102 DONE / 6 CANCELLED, guard green).
LQ-tagged work is additionally tracked in `docs/data/FLEET_DISPATCH.md`.
Read both before claiming; a task already dispatched there is not free.**
**Verified-fixes note:** the C-64..C-70 dual-audit batch lives on
`claude/verified-fixes-2026-09-03` (draft PR #689) — check whether it merged
before re-fixing anything from that list. The ledger guard now also prints
SLA warnings: a CLAIMED row with no evidence or an OPEN row with evidence but
no owner will be called out on every guard run — resolve or re-own them.

**UPDATED 2026-09-09 (17:55 UTC): PROVEN IS LIVE.** The 14:40 UTC RED had one cause, C-301: the
odds-table loader skipped every receipted pick (57 rows, 54 of them priceable), so C-300's
verifiableOnly pass dropped them. Fixed in #747 (`52711719c`). First run on the fix, 16:38 UTC:
pool n 380, Brier 0.2099, debiased ECE 0.0374; deployed v5.2.7 n 258, debiased 0.0582, bound
0.0438; GREEN, and the receipt auto-published on the third consecutive run. The founder flipped
`PERFORMANCE_STATS_ENABLED=true`, `PRICING_PHASE=PROVEN` and `LINE_INTEGRITY_VOID_ENABLED=true`
(Production, ~17:15 UTC) and `PUBLISH_LEDGER=true` after; the surface read phase PROVEN, gate GREEN,
streak 8 at 17:25 UTC. Public surfaces: #751 adds the gate reading to /calibration and a
phase-aware /pricing hero. Launch copy: `docs/launch/PROVEN_LAUNCH_KIT_2026-09-09.md`. Open
integrity item: the public performance surfaces (confidence-bucket report, public-confidence,
confidence-tail, performanceSummary) do not yet exclude in-play-generated picks the way the eligibility sample does
(C-302, OPEN). No floor, bin, basis or engine changed today; the streak reads on market_anchored_v4.

**UPDATED 2026-09-09 (13:45 UTC): THE DEPLOYED VERSION WAS NEVER MISCALIBRATED. THE SAMPLE WAS
(C-298, same branch, PR #742). This supersedes the 13:00 note below.** The founder said to assume
more database bugs, and read-only production SQL found two in the eligibility sample. First,
113 of 477 settled moneyline rows were generated at or after their game's commenceTime and priced
off in-play odds (a Twins moneyline minted at -1771 at 02:03Z with first pitch at 01:40Z, receipt
frozen at 0.884, Padres won); a live price already encodes part of the outcome. Second, on v5.2.7's
pre-game rows the receipt's marketFairProb sat 0.169 above the odds table's de-vigged consensus at
generatedAt on average (15 of 46 receipted rows more than 0.15 off), and the sample builder read
the receipt first. Scored on clean pre-game rows from the odds table: pool n 344, debiased ECE
0.033, hit 0.622 against stated 0.602; deployed v5.2.7 n 221, debiased ECE 0.052, hit 0.638 against
0.617. The 0.1055 the surface showed for v5.2.7 was the two bugs, not the model. The fix: in-play
rows excluded and counted (`in_play`), the odds table at generatedAt read first with the receipt
and factor breakdown as fallbacks, basis tag `market_anchored_v3` (the streak restarts on the
corrected definition, by design), and the deployed-version floor reads the slice's seeded
5th-percentile bootstrap bound of its debiased ECE so a version a third the size of the pool fails
only when it is demonstrably above the floor. Floors, bins, streak and env flags unchanged. Expected
reading after deploy: GREEN floors on the first run; three consecutive runs are needed for the
publish receipt, and the cron can be triggered by the founder or the browser agent with the real
secret (never by an agent session). Pipeline follow-up C-299: stop generating and re-scoring picks
after kickoff; until it lands, tonight's NFL game can still be re-priced in-play on the board.

**UPDATED 2026-09-09 (13:00 UTC): PROVEN IS NOT AVAILABLE BEFORE KICKOFF, AND THE TWO GATE PRs OF
THE MORNING WERE TWO HALVES OF ONE PROBLEM (C-292, branch `claude/gate-combined`).** Read
together on the 12:23 UTC truth surface: the POOL (n 487) is calibrated to within sampling noise
(Murphy reliability 0.0060 against a binomial null of about 0.002 to 0.005), which is what C-290
below says; the DEPLOYED v5.2.7 (n 274) is NOT (reliability 0.0189 against about 0.004 to 0.008,
a real 10 to 12 point RMS gap, six null standard deviations), which is what PR #739's
deployed-version floor says. Read-only production SQL on the receipted subset shows the shape:
v5.2.7 MLB moneylines priced 0.80 to 0.90 hit 0.60 on 15 rows. So the sentence below claiming the
#739 stratum finding "is inflated by the same bias" is only half right: smaller strata do carry
more noise bias, and the deployed stratum is still off after the noise is removed. Merging #741
alone would have turned the gate GREEN at 03:40 UTC on the pool while the version serving
traffic is measurably off, the unearned claim; it was HELD at 12:35 UTC. Also corrected: C-290's
`max(0, raw - noise)` over-subtracts when a real gap exists and at n 274 reads a true 10-point
gap as about 4; the estimator is now the per-bin variance correction (C-292, same doc, section
"Correction"), applied to the pool AND to every slice, and the deployed-version floor reads the
corrected slice value. Floors, bins, sample, pBasis, streak and every env flag are unchanged.
Expected reading after deploy: pooled at or under the floor, deployed v5.2.7 RED on its own rows.
That RED is the honest state. What moves it is a calibration pass on the deployed version's
displayed probability (the market-anchored p under-prices v5.2.7's heavy MLB favourites) and then
100 of that version's own settled rows; no estimator, floor or flag moves it, and no agent should
try. Week 1 launches at FOUNDING with the calibration page reading its live numbers.

**UPDATED 2026-09-09 (10:10 UTC): the ECE floor was unreachable by construction, and that is
being corrected, not lowered (C-290, `docs/ops/CALIBRATION_ECE_ESTIMATOR_2026-09-09.md`).**
Binned ECE is biased upward at finite n: a PERFECTLY calibrated forecaster reads about 0.09 at
the gate's own n floor of 100 and about 0.04 at the measured n 487 (10 equal-width bins,
simulated 2026-09-09), so the literal 0.05 floor could not be met by any model at the n floor
and today's raw 0.0539 is mostly sampling noise (the SQUARED Murphy reliability on the same
bins reads 0.006 against 0.05, which is the same fact seen from the other side). The founder
authorized changing the gate on 2026-09-09; the narrowest fix is the estimator, not the floor:
the cron now writes `eceNoise` (plug-in expectation on the sample's own bins) and `eceDebiased =
max(0, raw - noise)`, eligibility reads the debiased value against the unchanged 0.05 floor with
raw and noise stated in the reason, old artifacts fall back to raw, and the truth surface shows
all three. Floors, bins, sample, pBasis, streak and every env flag are untouched. The stratum
finding in PR #739 (weighted per-version raw ECE 0.0938) is inflated by the same bias, more so,
because each stratum is smaller. After deploy the streak needs three consecutive GREEN
six-hourly runs (40 past 03/09/15/21 UTC); deployed before 15:40 UTC the earliest publish
receipt is 03:40 UTC 2026-09-10. Line-integrity (#733) and the money path (#736) are on the same
night's merge train. Local test and typecheck runs in the coordinating session were denied by
its tool permission classifier; CI on the PR is the verification of record.

**UPDATED 2026-09-06 (16:40 UTC): PROVEN IS NOT CLOSE. Calibration eligibility reads RED on
production and F-36's precondition cannot be met on current data. Do not wait for a publish
receipt and do not flip anything.** Measured read of
`/api/ops/public-surface-truth` `calibrationEligibility` at 16:38:22 UTC, generatedAt from the
surface itself: status RED, `consecutiveGreen` 0 of `streakRequired` 3, reasons
"Settlement not healthy" and "ECE 0.0524 > 0.05". The other three floors pass
(n 458 against 100, Brier 0.1926 against 0.22, Murphy reliability 0.0053 against 0.05), but
do not read that as three pieces of corroborating evidence: measured 17:09 UTC and derived in
`docs/ops/CALIBRATION_GATE_SCALE_2026-09-06.md`, the Brier floor is cleared by a constant
base-rate forecast with no skill at all (uncertainty alone is 0.2139 against the 0.22 floor)
and the Murphy reliability floor averages SQUARED per-bin gaps against the same literal 0.05,
so it permits a 22.4-point RMS gap where the ECE floor permits 5.0, a 4.47x difference in
strictness. Murphy reliability is still a real calibration constraint, just a far looser one:
ECE is the only floor that BINDS here, and it is the one that fails. CONFIRMED 19:08:42 UTC: the settlement reason HAS cleared and RED now reads
"ECE 0.0524 > 0.05" alone. overduePending is 0 of 2627 commenced picks and stalePendingPicks
is 0, so C-106 is DONE (the zero-sit lane voided the last two phantom-fixture picks through
the outbox at 19:07:18 UTC with rcaCode FIXTURE_NOT_FOUND; ledger row has the ids). n, Brier,
Murphy and ECE are unchanged at 458 / 0.1926 / 0.0053 / 0.0524, consecutiveGreen still 0 of 3.
ECE does not clear on its own, and nothing that has happened today moved it.

Two things this corrects in the record above. First, the 2026-09-05 19:05 UTC note that "all
four floors pass today" was measured on the receipt-only sample (n 115 after the soccer
exclusion, ECE 0.0440). C-110's single-book resolution has since grown the sample to n 458,
and on that fuller, more representative sample ECE reads 0.0524. That is not a regression: it
is the honest number emerging with more data, and it is the number the gate reads. Second,
the pooled figure flatters. Every individual model version measures WORSE than the pool:
v5.2.7 (the current one, n 245) ECE 0.1089, v5.2.6 (n 110) 0.0587, v5.1.0 (n 74) 0.0729,
v5.0.0 (n 29) 0.1531. State that carefully: what is MEASURED is that the pooled value sits
below every stratum it is built from. `expectedCalibrationError` stores weighted ABSOLUTE
per-bin gaps, so these numbers do not by themselves demonstrate that signed errors cancelled
across strata; that is a plausible mechanism, not an observed one, and proving it needs an
aligned per-bin decomposition nobody has run. The actionable part does not depend on the
mechanism: whatever produces it, 0.0524 is the pooled figure and the deployed v5.2.7 measures
0.1089 on its own 245 rows. Publishing a PROVEN claim off the pooled number while the version
actually serving traffic measures more than twice the floor is exactly the kind of thing this
product's premise forbids.

By sport, only ONE stratum has the sample to support a conclusion. MLB n 365 ECE 0.0501, hit
0.649 against meanP 0.648: essentially calibrated, and it carries the pooled figure. The other
two are small-sample and illustrative only: NCAAF n 65 ECE 0.1123, NFL n 28 ECE 0.267. Do not
read a direction off those. An ECE spread across ten confidence bins at n 28 puts roughly three
picks in a bin, so both the magnitude and the sign are dominated by sampling noise; an earlier
draft of this note called the two football books "under-confident, the safer direction to be
wrong in" and that inference is not supported by n 28 (cubic, PR #715). Anyone acting on this
should treat MLB as the measurement and treat NCAAF and NFL as too thin to steer by until they
have real rows. No agent should touch thresholds, floors or the engine to move any of this:
law 9 forbids weakening the guard, and the engine is frozen under MODEL_VERSION. The levers are
more settled rows and a real calibration pass, both founder-gated.

**UPDATED 2026-09-06 (05:00 UTC): tonight's build is on `claude/sports-prediction-launch-rtiexc`
(four code commits `b4885f214`, `3359e072a`, `23a0a3a0f`, `f06be6b31`; typecheck 0, lint 0,
guardrails 26/26, five adversarial reviews approved).** C-109 credit governor DONE, C-110
single-book market p DONE (basis `market_anchored_v2`, one streak reset on the 08:40 UTC run
by design), C-111 fixture guard DONE, FE-05/10/15 DONE, C-107 display half landed (the
IMPLEMENTED flip and MODEL_VERSION v5.2.8 wait for the first clean NFL Sunday, 2026-09-13).
C-106 zero-sit lane is CODE-COMPLETE and flips to DONE when the truth surface reads
overduePending 0 and stalePendingPicks 0 after the first settle cycle post-deploy. Hermes:
merge `origin/main` after this lands; your work is C-104 (WP-27), nothing in this batch.
The open founder acceptance: the public calibration claim was reworded to "The calibration we
measure ourselves on is ..." because the /calibration chart still buckets by confidence
(`apps/web/lib/calibration/compute.ts`, `BUCKETS` and `bucketFor()`); accept it or open a row
to re-scope that chart.**

**UPDATED 2026-09-06 (03:30 UTC): F-15 is DONE and #709 is merged as `c3d955c2c`.** The
browser agent rotated the 20K key, set `THE_ODDS_API_KEY` in Vercel Production and redeployed
(Ready 02:37:12 UTC); no 402 after the rollover, dashboard usage 0 to 112 credits in 21
minutes, `oddsInserting` back to 242 rows a cycle. Three findings, all in plan section 3f and
ledger C-109..C-111: (1) **credit cliff**: at the observed rate the 20K plan exhausts around
2026-09-08, at the schedule-implied rate around 2026-09-11 (NFL Week 1 kickoff); `settle-picks`
runs five times an hour (the :20 cron plus the autonomy cycle) and the paid scores spend
guard logs "not justified" then proceeds; **C-109 is coder priority 1, ship before
2026-09-08 00:00 UTC.** (2) **The 16 overdue picks are two cohorts and neither self-heals**:
10 MLB spreads on city-only game rows refused every cycle as `SCORE_MISMATCH_CROSS_PATH`
(void lane, C-106, priority 2) and 6 NCAAF picks on phantom fixtures absent from ESPN's
2026 schedule, which the signal slate generated on yesterday (C-111, priority 3).
(3) **Calibration**: n 223, ECE 0.0553, bootstrap CI 0.0365 to 0.1142; the soccer exclusion
works (120 excluded); more real rows is the lever (C-110 single-book recompute, priority 4).
Floors, bins and streak unchanged. Coder order: C-109, C-106, C-111, C-110, C-107,
FE-05/10/15. Hermes: `hermes/finish-line-2026-09-05` (tip `0dd81273f`) lacks `main`, merge
`origin/main` first (merge-tree clean); the Odds API shell steps it proposed (key via
`vc env get` or `vc env set`, key in a curl URL) are forbidden and moot; its Week 1 work is
C-104 (WP-27, OPEN, unowned); its auxiliary reviewer model has a 32K context, below the 64K
it needs. Browser agent: scripts A, C, E done; B (alerting) and D (checkout) skipped by
founder decision; the two public flips remain for a later prompt.**

**UPDATED 2026-09-06 (02:15 UTC): PR #707 is MERGED to `main` as `cff3e72d7` and deployed
(the truth surface reports that SHA). Score 60 of 100; the measured path to 100 with owners
is plan section 3e. Founder instruction: no human step where a machine can do it; console
steps go to the Claude browser agent via the scripts in 3e. Coder priorities, in order:
WP-29 (C-106, stale picks automated), C-107 (display label and claim, IMPLEMENTED flip,
MODEL_VERSION v5.2.8), FE-05/FE-10/FE-15 copy. The calibration streak runs on its schedule
and the publish receipt is automatic at streak three; the public flips are two Vercel
variables (`PERFORMANCE_STATS_ENABLED`, `PRICING_PHASE=PROVEN`) after that receipt AND
C-107 are live. Hermes merges `origin/main` before opening its PR.**

**UPDATED 2026-09-05 (18:20 UTC) by the launch session on `claude/sports-prediction-launch-rtiexc`
(PR #707, since merged). Read `docs/ops/LAUNCH_FINISH_LINE_2026-09-05.md` before claiming
anything: section 3b holds eleven decisions the founder delegated in-session, section 4 the
founder-only actions, section 5 every dispatchable work package (WP-1..26, FE, FAN, NFL, OPS,
TCI, SEC) with entry files and acceptance commands. Ledger rows C-80..C-103 and F-14..F-33.**

- **F-15 DONE 2026-09-06 02:37 UTC (browser agent).** The account was never unpaid: the 20K
  plan is Active ($30 a month, next invoice Sep 22) and the HTTP 402 "payment circuit open"
  since 2026-09-03 20:20 UTC was a stale production key. The key was rotated, set in Vercel
  Production and the redeploy reset the process-local breaker. Book odds flow again. The
  open risk is now spend, not access: C-109 (plan 3f item 1). Nobody pastes a key anywhere.
- **Second book root cause (2026-09-05 production logs, verbatim):** every refresh cycle,
  all four in-season sports log `rundown empty (2d): HTTP 429 rate_limited`. TheRundown is
  the registered commercial-use fallback (`packages/data-ingestion/src/source-registry.ts`
  id `therundown`, free 20k data-points/day) and it alone satisfies `MIN_BOOKMAKERS = 2`;
  our own cadence (refresh-odds every 15 min plus board-fill 4x/h, 4 sports, 2 dates, no
  cooldown after a 429) exhausts its daily quota early and it 429s for the rest of the day.
  ESPN public (`espn_public`) is one book (DraftKings via ESPN, verified live for NFL, CFB,
  MLB, MLS), so no picks can be book-priced without a second cleared source.
- **The completely free two-book board is already designed in this repo (WP-27, ledger
  C-104). Founder position, verbatim from the Hermes brief on PR #680: "we are the provider
  (Galaxy Sports API). Not Rundown. Not The Odds API."** Book 1 is ESPN inline odds through
  `GalaxySportsApiOddsProvider` (PR #680 branch `hermes/galaxy-keyless-odds`, de-vig
  formula, 8s timeouts, registry entry `galaxy-espn-inline`). Book 2 is Kalshi exchange
  quotes as a real bookmaker (`galaxy-kalshi-book.ts` on that branch) fed through the
  PredExon catalog (`packages/data-ingestion/src/predexon-client.ts` on main, verdict
  use-with-caution, free key the founder already holds, `PREDEXON_INGEST` default OFF),
  which is the legal route around Kalshi Dev Agreement section 3. Kalshi lists
  `KXNFLSPREAD` and `KXNFLTOTAL` (`kalshi-series.ts`), so NFL spreads and totals are
  reachable, not only moneylines. Nothing on main consumes PredExon yet: that wiring plus
  re-landing the #680 core is the work. TheRundown is at most a bridge (WP-26), not the
  product path.
- Decisions already taken (do not re-open): the keyless Galaxy Sports API becomes primary
  with Kalshi via PredExon as the second book (WP-27); v5.2.8 YES sequenced after the first clean NFL Sunday; stale
  published picks are UNPUBLISHED via `npm run ops:stale-picks:unpublish -- --execute`
  (owner-run); ESPN Power Index is gated fail-closed (`ESPN_POWERINDEX_LICENSED` unset);
  `hermes/settlement-token-fix` is superseded by `6880f18` (do not merge it); Vercel cron
  is the primary scheduler; `/picks` is the product surface; the `/fantasy` age gate stays.
- **Coordination with `hermes/finish-line-2026-09-05` (verified against the remote 2026-09-05
  18:55 UTC):** that branch is stacked on top of the #707 branch at `6a9c092f7` and merges
  cleanly with the #707 tip (`git merge-tree` reports no conflict). SEC-01 (`fe42773bd`) and
  SEC-02 (`96ab46d27`) are on the remote; ledger C-102 is owned by hermes (CLAIMED), do not
  edit that row from another branch. **Update 2026-09-06 00:10 UTC (verified against the
  remote):** the Hermes tip is `5fa7c88d0`; SEC-03 (`dbb49850b`, `7bc9508d5`, `8014c67c8`)
  plus its repair (`3efb1634d`, the half-applied `contests/enter` edit is finished), SEC-04
  (`30b238e12`) and SEC-05 (`e60f887a9`) are on the remote. It also carries C-108
  (`99ff4d545`, an OpenRouter free lane for the Claude API router), which edits
  `.env.example`: law 2 freezes any `.env*` for agents, so the founder accepts that hunk
  explicitly or Hermes moves the variable documentation to `docs/ops/OPERATOR.md` section 5.
  `git merge-tree` of the Hermes tip against the #707 tip (`0fb97ab36`) is still clean.
  Landing order unchanged: #707 first, then Hermes merges
  `origin/claude/sports-prediction-launch-rtiexc` (WP-27, the calibration pass `fbc3784c7`)
  into its branch before opening its own PR.
- **PROVEN is days away, not weeks (measured on production 2026-09-05 19:05 UTC, read-only
  SQL):** on settled MONEYLINE picks that carry a receipt, the market-anchored probability
  reads n 150, Brier 0.1692, Murphy REL 0.0050, ECE 0.0552 (ten bins). Excluding soccer
  two-way moneylines (wrong by construction on a three-way market; the engine already refuses
  to publish them), the same sample reads n 115, Brier 0.1444, ECE 0.0440, Murphy REL 0.0044:
  **all four floors pass today.** Founder approved the source switch and cron triggering at
  19:20 UTC. 610 more settled moneyline picks have no
  receipt but their publish-time market probability is recomputable from the append-only odds
  table with zero writes (WP-28, C-105). The eligibility streak is three consecutive green
  runs of a six-hourly cron. Shipped in `fbc3784c7` on the #707 branch: the
  measurement side of WP-1, WP-28 and the drift alert (receipt-first scoring, MONEYLINE-only
  pooled floors, basis-aware streak). Receipts carry a mean-implied proportional de-vig, not
  Shin-median; the proposal wording now says so. Remaining: C-107 (display label and claim
  copy, then the IMPLEMENTED flip and MODEL_VERSION v5.2.8),
  restore the book-priced flow, streak, founder flips `calibrationPublished` and the PROVEN
  pricing phase (F-36). Plan section 3c.
- **No pick ever sits (founder policy 2026-09-05):** graded, voided with an RCA reason through
  the settlement outbox lane, or unpublished. WP-29 (C-106) automates it; the owner tool
  handles today's 20 stale rows once.
- Settlement CRITICAL (36 overdue) root causes are fixed on the PR branch, not on main:
  ESPN `limit=1000` truncation, matcher containment on 2-3 letter abbreviations and bare
  club tokens, overdue-only runner slice, backfill date order. Do not re-fix them; land #707.

```
1. git fetch origin; open docs/ops/AGENT_LEDGER.md at the latest branch tip
2. Also check docs/ops/hermes/BUILD-QUEUE-*.md (latest date) if present —
   it is the current build task list when one has been issued
3. First unclaimed row you can do -> claim it (Owner + Status: CLAIMED) in
   the SAME commit that begins the work
4. Do exactly that task, nothing else
5. Run its Definition of Done / the repo guards (see WORKING RULES)
6. Mark DONE (with a real SHA) or BLOCKED (with the exact error), one line
7. Commit; push only if explicitly told to for this session — otherwise
   stay UNPUSHED and say so
8. Go to 1
```

Never ask what to do next — the ledger knows. The owner is asleep or busy.
The ledger is how you talk to them, and to every other agent working here.

---

## THE LAWS

Breaking one discards the run.

1. **NEVER `git push` unless the owner said so for this session.** Default is
   commit locally, the owner reviews and pushes. If the owner has explicitly
   told you to push tonight, push only to the branch named, never to `main`
   directly unless that too was explicit.
2. **NEVER modify:** `packages/db/prisma/schema.prisma` · `packages/db/prisma/migrations/**` ·
   `.github/workflows/**` · `scripts/guardrails/**` · `.claude/**` · any `.env*` ·
   `package-lock.json` · `.gitignore` · `.githooks/**` · `apps/web/lib/ai-control-plane/**`
3. **NEVER flip a gate or env flag** — `PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`,
   `PERFORMANCE_STATS`, any other. Never edit code so a gate resolves differently.
   **Owner amendment, 2026-09-09 (founder, verbatim: "if we need to remove this then do
   it", "APPROVED", "if we have to revise or polish some laws then do it"):** a gate's
   ESTIMATOR may be corrected when the correction is derived, documented and tested, keeps
   every floor value byte-identical, reports the raw number beside the corrected one, and
   is recorded as a ledger row citing this amendment. C-290 as reworked by C-292 (the
   bias-corrected ECE, `docs/ops/CALIBRATION_ECE_ESTIMATOR_2026-09-09.md`) is the first and
   only such change; a correction may be applied to a stratum the gate reads as well as to
   the pool, and must never let a stratum pass on fewer rows than the n floor.
   **Second amendment, 2026-09-09 (founder, verbatim: "if we have to change laws or rules or
   wording then do it"):** a row may be EXCLUDED from the eligibility sample when its
   probability is shown by measurement not to be a publish-time market price (in-play
   generation, C-298; a receipt-only or factor-breakdown-only probability the odds table
   cannot reproduce at generatedAt, C-300), provided the exclusion is counted by reason on
   the artifact and the streak restarts on the new basis tag. An exclusion may never be
   chosen by outcome, and a row the odds table prices is never dropped.
   Flipping an env flag, lowering a floor, or widening a sample stays forbidden.
   Never run a cron with a real secret. Never search for credentials. These gates are
   the honesty boundary; opening one publishes an unearned claim.
4. **NEVER write a claim you did not observe.** Every report line traces to a command
   you ran and output you saw. Not run → write `NOT RUN`. Failed → paste the error.
   An honest gap is a contribution; an invented fact is sabotage.
5. **NEVER mark DONE** unless the Definition of Done commands actually passed.
6. **NEVER `git commit --no-verify`.**
7. **NEVER install a package, run a migration, or touch a database.** (Bare
   `npm install` is fine — it is setup, and it still works normally.)
   **Supply-chain controls, added 2026-08-16 — do not disable them.** `.npmrc`
   sets `strict-allow-scripts=true` and `min-release-age=7`. Install scripts run
   only for the version-pinned packages approved in `package.json`'s
   `allowScripts`; anything else HARD FAILS instead of silently running code on
   a machine that holds live production credentials.
   - If an install fails with an unapproved-script error, that is the control
     working. **Do NOT delete `.npmrc`, do NOT set `ignore-scripts`, and do NOT
     run `npm install-scripts approve` to make it pass.** Mark the task BLOCKED
     and report which package wanted to run code.
   - A version bump of an already-approved package also requires re-approval by
     design (the allow-list is pinned per version). Same rule: report, don't
     approve.
8. **NEVER fabricate product data** — no mock picks, sample odds, placeholder win
   rates, invented benchmarks. Anywhere.
9. **NEVER weaken a guard to make a test pass.** Never delete a phrase from a
   forbidden-copy list, never loosen an assertion's intent, never change a guardrail's
   threshold. If a guard is red, either the code is wrong or the guard needs *narrower*
   context — never less power.

---

## WORKING RULES

- **Two attempts per task.** Then revert, mark `BLOCKED` with the exact error text,
  move on. Never a third. A BLOCKED task with an honest error is a success.
- **One task = one commit.** Stage by name — never `git add -A` or `git add .`.
  Tag every message `[hermes-<task-id>]`.
- **Verify block before every code commit:**
  ```bash
  npm run typecheck                              # exit 0 (real exit code — never pipe it away)
  npm run lint                                   # exit 0
  npx vitest run <this task's test file>         # green
  ```
- TypeScript is strict. Never `any`, `as any`, `@ts-ignore`, `@ts-expect-error`.
- Update the ledger the moment a status changes. Never batch it.

---

## DECISION BUDGET

Per task: **3 file reads · 2 command runs · ONE conclusion · then act.**

If you catch yourself writing *"actually"*, *"wait"*, *"let me reconsider"*, or
*"let me think about this differently"* — **stop. You already have your answer.**
Execute it. If it is wrong, the Definition of Done catches it and you get one retry.
That is what two strikes are for. Never re-derive a conclusion you already reached.

**PRECEDENT FIRST** on any test repair — before analysing anything:
```bash
git grep -l "<the symbol or module the test needs>" -- "*.test.ts"
```
If another test already mocks it, copy that pattern. That is both the answer and the
evidence, in one step.

---

## CONTEXT HYGIENE — this is what keeps you alive

You will be cut off when your context fills. That is expected and survivable, because
the ledger holds your state. Make each session last longer:

- Do not re-read a file you already read this session.
- Do not re-read `CONTINUOUS.md` in full — jump to the section you need.
- Do not summarise your progress unless you are about to be cut off.
- Do not restate a root cause already written in the ledger.
- Ledger evidence is **one line**, not a paragraph.
- After each commit, forget that task completely. It is recorded. Move on.

---

## THE STANDARD

Every commit must be one the owner can read in two minutes and keep or drop with total
confidence. Every report line must trace to output you actually saw. Every uncertainty
must be written down rather than papered over.

This product's entire premise is that it does not lie about its own performance. One
invented number makes every other number suspect.

**Work continuously. Record everything. Invent nothing. Push nothing.**

---

