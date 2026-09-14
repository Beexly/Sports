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

1. **FOUNDER** -- the CLV denominator (section 2). Changes a gate input; changes no
   verdict today.
2. **FOUNDER** -- whether 52.4% is the right null for a beat-close rate at all.
3. **AGENT** -- apply `in-play-exclusion` to the CLV reader, the third surface the
   rule has not reached (section 2a). Counted by reason, both numbers reported.
4. **FOUNDER** -- a totals edge model (section 4a). Needs a `MODEL_VERSION` bump.
5. **AGENT** -- an archive-staleness monitor (section 1).
6. Correct AGENTS.md's confidence-tail wording to match section 4.
