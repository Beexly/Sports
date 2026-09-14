# Production measurement, 2026-09-14

Read-only SQL against the live `gse-postgres` database (Neon project
`summer-brook-99380762`) via the session's attached connector. Every number below
is an observed query result. Nothing here is estimated, and where a sample is too
thin to support a conclusion the entry says so instead of reporting a rate.

No write of any kind was issued. No gate, flag, floor or `MODEL_VERSION` moved.

Population used throughout unless stated otherwise:

```sql
picks p JOIN games gm ON gm.id = p."gameId"
WHERE p."isPublished" AND p."isBootstrap" = false
  AND p.result IN ('WIN','LOSS')            -- decided only; pushes excluded
  AND p."generatedAt" < gm."commenceTime"   -- pre-game only; in-play excluded
```

Both filters matter and both are the repo's own existing doctrine: pushes are
excluded from every other published rate (AGENTS.md, "Never average a push into a
published win rate"), and in-play rows are excluded from the calibration sample by
C-298 / C-302.

---

## 1. The line archive: root cause confirmed, competing hypothesis refuted

AGENTS.md recorded honestly that the Prisma filter-shape diagnosis had **not** been
observed at runtime, and named an alternative it could not eliminate from the repo:
that `LINE_ARCHIVE_ENABLED` was simply switched off in Vercel on 08-22.

```
odds_line_snapshots, rows per day
  2026-08-19     24,172
  2026-08-20    107,944
  2026-08-21     74,160
  2026-08-22    478,222
  2026-08-23 .. 2026-09-12        0     <- 21 days, exactly zero
  2026-09-13      4,187
  2026-09-14      2,661            (still writing, ~every 20 min)

fix 080dd1976 merged to main (PR #818, 53c764847)   2026-09-13 20:45:20 UTC
first archived row after the outage                 2026-09-13 21:02:40 UTC
```

**Seventeen minutes.** Vercel auto-deploys from `main`. A flag flip would have to
have landed inside that same window by coincidence. The bare-array-on-a-scalar-filter
root cause is confirmed; the flag hypothesis is refuted.

Also measured: `player_receptions|*` and `player_pass_tds|*` markets begin
2026-09-13 21:30:15 UTC, so `EVENT_ODDS_INGEST_ENABLED` is ON as well. Both founder
env actions AGENTS.md lists as open are done. Prop coverage is credit-capped as
designed (two games).

**Consequence:** closing lines are being recorded again, so CLV is gradable on picks
generated from 2026-09-13 onward. The 08-22..09-12 gap is permanent -- those closing
lines were never captured and cannot be backfilled.

**Still open:** nothing alarms on archive staleness. Twenty-one silent days is the
argument for that monitor.

---

## 2. CLV is measured against a denominator that counts no-moves as failures

`loadPublicClvPolicy` publishes `beatCloseCount / gradedSampleSize`, where
`gradedSampleSize` counts every graded row including `MATCHED_CLOSE` -- a line that
did not move between our lock and the close.

Measured on exactly the population that function counts (canonical, published,
non-bootstrap, VOID excluded):

| verdict | n | share |
|---|---|---|
| BEAT_CLOSE | 348 | 22.7% |
| MATCHED_CLOSE | 659 | **43.0%** |
| LOST_TO_CLOSE | 527 | 34.4% |
| graded | 1,534 | |

| denominator | rate |
|---|---|
| all graded rows (**what is published today**) | **22.69%** |
| moved lines only | 39.77% |
| moved lines, in-play rows also excluded | **47.77%** |

The repo already settled this question for win rates and states it in three places
(`calib-types.ts:6`, `build-performance-summaries.ts:63`, `compute.ts:272`) plus
AGENTS.md. CLV is the one published rate that does not apply it.

**The suite cannot see this.** Every test in `public-clv-policy.test.ts` that
exercises the 52.4% threshold passes `matchedCloseCount: 0`, so in each one
`graded === beat + lost` and the denominator never enters. In production it is 43%
of the sample. `public-clv-denominator.test.ts` now pins the arithmetic and
demonstrates one sample where the two denominators publish **opposite** break-even
verdicts.

**FOUNDER DECISION.** `beatCloseRate` feeds `evaluatePhaseAdvance`, so the
denominator is a pricing-ladder gate input and law 3 applies. On today's data the
verdict is unchanged either way -- both fail 52.4% -- so nothing is unlocked by
deciding, only made honest. Open question for the decision: 52.4% is the vig
break-even for a -110 **wager**, and CLV is a comparison of two prices, not a wager.
Whether 52.4% or 50% is the right null for a beat-close rate is not settled here.

### 2a. In-play rows contaminate the CLV sample

158 graded rows were generated at or after kickoff. Their "lock price" is a live
price, so there is no close for them to have beaten.

| kind | in-play | n | mean CLV | beat% (moved lines) |
|---|---|---|---|---|
| POINTS | no | 1,272 | -0.05 pts | 48.7% |
| POINTS | yes | 39 | **-6.85 pts** | 13.2% |
| PROBABILITY | no | 126 | -0.015 | 38.0% |
| PROBABILITY | yes | **119** | -0.362 | **0.0%** |

**0 of 119 in-play moneylines beat the close.** That is arithmetic, not a model
outcome. A mean CLV of -6.85 points is structurally impossible pre-game.

The extreme lock prices that make these rows conspicuous (-21200 on a Padres ML,
-15000 on a Marlins ML) are **real live prices**, not corrupt data: the Padres row
was minted 3.4 hours after first pitch.

C-299 fixed the generator -- the newest in-play pick is 2026-09-06, and zero of the
725 published September picks are in-play. The contamination is entirely historical.
What remains is that the CLV reader never applied the exclusion, exactly as C-302
found for the confidence readers. `lib/calibration/in-play-exclusion.ts` already
holds the rule; CLV is the surface it has not reached.

---

## 2b. The 52.4% threshold is a category error, and half the MATCHED rows are a bug

Literature review commissioned this session. Full citations in the research artifact;
the load-bearing points and what they are graded as:

**52.4% does not apply to CLV. ESTABLISHED.** It is the settlement break-even for a
-110 *ticket* (`100·WR = 110·(1−WR)` → 0.5238). A CLV verdict compares two prices;
nothing settles and no vig is paid on the comparison. The null for a beat rate is
**50%**, stated explicitly in Buchdahl's tipster work ("Assuming we would expect 50% to
shorten and lengthen where the tipster was just guessing"). No source was found
applying 52.4% to CLV.

The instinct behind 52.4% is half-right and the correction matters: measured against a
**de-vigged** close, a zero-edge bettor loses half the hold every time. Buchdahl on
1,525 real bettors: "a t-score of 0 broadly equates to losing the equivalent of
Pinnacle's margin". **But that fact belongs to the CLV magnitude, not to the rate.**

**MATCHED does not belong in the denominator. ESTABLISHED.** This is the zero-difference
problem in the sign and Wilcoxon tests, and all three recognised conventions -- Wilcoxon
(discard), Pratt (1959), zsplit -- decline to score a zero as a failure. Counting a tie
as a loss estimates a different quantity, P(market moved my way) rather than
P(our price better | prices differ), and it is driven by liquidity rather than skill.
The "it is conservative" defence fails because the distortion is non-uniform: it
punishes thin markets hardest, biasing across sports rather than shrinking evenly.

**A rate is the wrong statistic. ESTABLISHED, convergent across sources.** The
defensible measure is mean vig-adjusted CLV, which is not a proxy for EV but *is* the EV
estimate. The decisive case is Buchdahl's own: a tipster beat the close on 17 of 23
picks -- a 74% rate, above every consumer benchmark -- while averaging a 2% edge, which
after margin is break-even. A rate is a sign test on a continuous quantity and discards
the half of the information that carries the money. `ClvSummary.averageClv` already
exists in this repo and is already computed; it is simply not headlined.

**CLV predicts profit far more weakly than the product's premise assumes. IMPORTANT.**
Three layers, unevenly evidenced. That the closing consensus is an excellent forecast is
strongly established (Kaunitz et al., 479,440 games, R² 0.999/0.995/0.998). That CLV
skill persists is established on one large study (Buchdahl: first-half CLV t-score
explains half the variance of second-half). That CLV predicts *realised profit* is the
weak link, and measured rather than asserted in that same dataset: **R² = 6%**. Only 60
of 1,525 bettors had profitable CLV. The real argument for measuring CLV is that P&L
variance was **75× CLV variance** -- it reveals signal fast, not strongly. Public copy
should not overstate this.

### The spread/total CLV comparison is price-blind, and it is ours to fix

`packages/prediction-engine/src/clv.ts`:

```ts
export function computeSpreadClv(pickHomeLine, closeHomeLine, side)   // three args
export function computeTotalClv(pickTotal, closeTotal, side)          // three args
```

Neither takes a price. A spread holding at -3 while its price moves -105 → -125 is real,
capturable CLV recorded as `MATCHED_CLOSE` with `clvPoints: 0`.

**Measured, `odds` table, spread markets since 2026-08-01, prices restricted to
-400..+400, game-book pairs with more than one observation:**

```
line held first-to-last                      3,481
  of those, the PRICE moved anyway           1,737   (49.9%)
  median move                                    9 cents
  moved >= 10 cents                            856
  moved >= 20 cents                            490
```

**Half of every MATCHED_CLOSE on a spread hides a real price move.** So the 43% MATCHED
share is substantially a grading artefact, not a still market, and fixing the comparison
collapses much of the denominator argument before anyone has to decide it.
`computeMoneylineClv` has a related issue: it compares raw implied probability with
`DEFAULT_ML_EPSILON = 0.005`, folding genuine moves into MATCHED too.

There is also an internal inconsistency: `clv.ts:170` uses 0.5 as its note threshold
while `public-clv-policy.ts` uses 0.524.

**Scoping, measured, because it changes who should do this.** The price was never
captured for these markets at all:

| pickType | graded | has lock LINE | has lock PRICE |
|---|---|---|---|
| SPREAD | 713 | 713 | **0** |
| TOTAL | 598 | 598 | **0** |
| MONEYLINE | 245 | 0 | 245 |

So the fix is **forward-only and cannot be backfilled** -- the 1,311 historical spread
and total verdicts can never be re-graded, because the prices they were locked and
closed at do not exist anywhere. It also is not a one-function change: the mint path has
to start writing `clvLockPrice` for these markets, the close capture has to write
`clvClosePrice`, and `computeSpreadClv`/`computeTotalClv` plus their four call sites
(`clv-capture.ts`, `historical-replay.ts`, `clv-harness.ts`, the package index) all move.

And there is a real methodology choice inside it, not just an implementation: grade on
the price alone, or convert line-and-price to a single implied probability and grade on
that (the "odds-based CLV" the sources prefer). Those give different numbers and the
second is the better answer. **That combination -- multi-file, changes a published gate
input, and has more than one defensible path -- is why this is written up rather than
built here.**

### Sample size

At the corrected rate, against a 50% null: the 95% Wilson interval first excludes 50% at
**n 1,934**; 80% power needs **n ≈ 3,950**. At today's n 718 the interval is
[44.14%, 51.43%], z = -1.19, p = 0.23 -- **indistinguishable from 50%**. Against 52.4%
it is z = -2.48, p = 0.013, significantly below. So the honest statement is not "not yet
proven" but "failing a threshold that does not apply, and indistinguishable from the one
that does." All of this assumes independence; correlated picks on one slate make the
effective n smaller, so 3,950 is a floor.

**Order of operations that falls out of this.** Fix the price-blind comparison first
(engine bug, nobody has to decide anything). Re-measure. Then the denominator and
threshold questions are much smaller, and may answer themselves.

---

## 3. Published spread and total picks lose, and the deployed version has not fixed it

Pre-game, decided, published, non-bootstrap, book-priced:

| pickType | source | n | win rate | mean confidence |
|---|---|---|---|---|
| SPREAD | book-priced | 775 | **0.4671** | 66.0 |
| TOTAL | book-priced | 618 | **0.4595** | 62.2 |
| MONEYLINE | model-signal | 761 | 0.6163 | 69.7 |
| MONEYLINE | book-priced | 128 | 0.7656 | 54.6 |

Spreads and totals are priced at roughly -110, so win rate is the correct metric and
52.4% is the correct break-even. **A moneyline win rate is not comparable** -- heavy
favourites win often at prices that still lose money -- so the two moneyline rows
above say nothing about profitability and must not be quoted as if they do.

95% Wilson intervals:

| group | n | win rate | 95% Wilson | vs 52.4% |
|---|---|---|---|---|
| all versions, SPREAD+TOTAL | 1,393 | 0.4637 | 0.4377 - 0.4900 | **below** |
| all versions, SPREAD | 775 | 0.4671 | 0.4322 - 0.5023 | **below** |
| all versions, TOTAL | 618 | 0.4595 | 0.4206 - 0.4990 | **below** |
| v5.2.7, SPREAD | 332 | 0.4699 | 0.4168 - 0.5236 | below **by 0.0004** |
| v5.2.7, SPREAD+TOTAL | 505 | 0.4832 | 0.4399 - 0.5267 | inconclusive |
| v5.2.7, TOTAL | 173 | 0.5087 | 0.4348 - 0.5822 | too thin |

State the deployed-version result carefully. v5.2.7 spreads clear the significance
bar by four ten-thousandths, which is a knife-edge, not a robust rejection -- report
it as "point estimate 47.0%, interval essentially excluding break-even" and not as a
confident finding. The robust result is the pooled one at n 1,393.

By version, SPREAD+TOTAL combined: v5.2.7 0.4832 (n 505), v5.1.0 0.4636 (n 481),
v5.0.0 0.4536 (n 377), v5.2.6 0.2667 (n 30). The deployed version is the best of
them and is still at or below break-even.

**The adverse-edge gate cannot be credited or blamed yet.** It landed 2026-09-13;
13 book-priced spread/total picks have been minted since and **zero have settled**.
The first pending kickoff is 2026-09-14 22:40 UTC. Any claim that the gate helped or
did not help is unmeasurable today.

---

## 4. The confidence inversion is a localized 80-84 dip, not a collapse at the top

AGENTS.md states: "Realized win rate PEAKS at conf 75-79 (0.6146) and FALLS to
0.4643 by conf 90-94, below the 0.5280 of the lowest band."

The peak reproduces. The tail does not.

| band | n (pre-game) | win rate |
|---|---|---|
| <55 | 393 | 0.4656 |
| 55-59 | 285 | 0.4667 |
| 60-64 | 451 | 0.5743 |
| 65-69 | 437 | 0.5240 |
| 70-74 | 296 | 0.5878 |
| 75-79 | 191 | **0.6178** (peak, matches) |
| 80-84 | 104 | **0.4231** |
| 85-89 | 72 | 0.5417 |
| 90-94 | **25** | 0.5200 |
| 95+ | **28** | **0.7500** |

Two corrections to the record:

1. **The bands the strong claim rests on are n 25 and n 28.** At n 25 a win rate of
   0.52 carries a 95% interval of roughly +/-0.20. Those bands cannot distinguish
   0.52 from 0.75.
2. **95+ is the best band on the board (0.7500)** and the recorded note stops at
   90-94, which is the weakest. Reporting the tail without it understates the top.

What survives, and it is the part that matters: **confidence is badly overconfident
as a probability.** Confidence 80+ realizes 0.5109 on n 229 while `confidence / 100`
would claim ~0.87. That gap is real, large, and well-sampled. The repo's existing
position -- never present confidence as a win probability -- is correct and is
unaffected by the corrections above.

What does **not** survive on this evidence is the stronger claim that confidence is
monotonically anti-predictive at the top and therefore useless for ranking. The
damage is concentrated in one band.

### 4a. The 80-84 dip is one pick type

| pickType | source | n | win rate |
|---|---|---|---|
| MONEYLINE | model-signal | 39 | 0.5641 |
| SPREAD | book-priced | 39 | 0.3846 |
| **TOTAL** | book-priced | 26 | **0.2692** |

Totals at confidence 80-84 won 7 of 26. `scoreTotalPick` computes no independent
edge at all -- it sets `rankingP: confidence / 100` with `rankingSource: "confidence"`
and its own comment says there is no independent total model yet -- so totals are the
one market uncovered by the adverse-edge gate at **both** mint and display
(`lib/picks/adverse-edge-suppression.ts` reads `independentEdge` off a breakdown
totals never populate).

n 26 is thin and this sub-table is directional, not conclusive. It is recorded
because it has a mechanism, not because the sample is strong.

**This is not a quick withhold-only fix.** Calling `pricesWorseThanMarket` from the
totals scorer is a literal no-op -- the predicate opens `if (!edge) return false` --
so closing it means building a totals edge model, which is scoring work under a
`MODEL_VERSION` bump. Founder.

---

## What changed in the repo as a result

Nothing behavioural. This pass added measurement and two records:

- `public-clv-denominator.test.ts` -- makes the CLV denominator question executable.
  Asserts the arithmetic of the denominator in use; asserts nothing about which is right.
- AGENTS.md -- line-archive root cause upgraded from NOT VERIFIED to confirmed, with
  the timeline; props-live noted; competing hypothesis refuted.

## Open, in the order they are worth taking

1. ~~**AGENT** -- apply `in-play-exclusion` to the CLV reader.~~ **DONE**, commit
   `1f95c8873`. 22.69% -> 24.93%, exclusion counted and named on the policy object,
   verdict unchanged.
2. **AGENT, and do this before deciding anything else** -- make the spread/total CLV
   comparison price-aware (section 2b). It is an engine bug with no policy question
   attached, and it is upstream of both founder decisions below: half the MATCHED rows
   are its artefact, so fixing it shrinks the denominator argument before anyone has to
   rule on it. Needs no `MODEL_VERSION` bump -- CLV grading is settlement bookkeeping,
   not scoring.
3. **FOUNDER** -- the CLV denominator, and whether 52.4% applies at all (sections 2, 2b).
   The literature says the null is 50% and that ties should be discarded. Take it after
   item 2, on re-measured numbers.
4. **FOUNDER** -- headline mean vig-adjusted CLV rather than a beat rate. `averageClv`
   already exists and is already computed.
5. **FOUNDER** -- a totals edge model (section 4a). Needs a `MODEL_VERSION` bump.
6. **AGENT** -- an archive-staleness monitor (section 1).
7. ~~Correct AGENTS.md's confidence-tail wording.~~ **DONE**, commit `ee4ee449d`.
8. Review public CLV copy against the R² = 6% finding (section 2b). "Leading indicator
   of edge" is defensible; anything stronger is not.
