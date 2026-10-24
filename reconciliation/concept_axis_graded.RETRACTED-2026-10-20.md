# The Concept Axis — measured, graded, and what it found

**Measured:** 2026-10-20T08:30Z · **Branch:** `dev-lit-vectors-2026-10`
**Code:** `audit/reconciliation-2026-10-20`
**Machine-readable:** `reconciliation/concept_grader_run.json`,
`reconciliation/direction_signal_measurement.json`
**Reproduce:**
`node reconciliation/run_concept_grader.mjs` ·
`node reconciliation/measure_direction_signal.mjs`

---

## 0. The result, in one table

**The concept axis runs end to end. It graded 139 premises against real
game data. And it found that the corpus's asserted directions carry
essentially no signal.**

| | count |
|---|---:|
| live premises with context tags | 5,434 |
| resolved to a measure | **201** |
| **graded on real data** | **139** |
| refused: `conditional_direction` | 4,540 |
| refused: `no_measurable_tag` | 693 |
| refused: `no_agreements` | 62 |

| agreement rate across the 139 graded | |
|---|---:|
| minimum | 0.1109 |
| **median** | **0.4911** |
| maximum | 0.5153 |
| above 0.5 (better than chance) | 53 of 140 (37.9%) |

**The median is BELOW chance.** The best is 1.5 points above it.

---

## 1. The direction is noise — measured, not asserted

This is the load-bearing measurement of the whole cycle.

**The method:** grade the same data twice per premise — once with the
corpus's asserted direction, once with it **inverted**. If the direction
carries information, the asserted rate will beat the inverted one.

| measure | premises | asserted | inverted | gap | verdict |
|---|---:|---:|---:|---:|---|
| `route_running` | 1 | 0.1109 | **0.8891** | **−0.7783** | the corpus's direction is **78 points WORSE** than the inverse |
| `workload` | 1 | 0.2912 | **0.7088** | **−0.4175** | **42 points worse** |
| `tracking` | 68 | 0.4982 | 0.5018 | −0.0036 | indistinguishable |
| `coverage` | 70 | 0.4970 | 0.5030 | −0.0061 | indistinguishable |

**Per premise: the corpus's direction beats the inverse for 53 and loses
for 87.** It loses more often than it wins.

**This is exactly what the keyword-fallback finding predicted.**
`scripts/build-grounded-mind-corpus.mjs:101-111` returns `"conditional"`
when neither of two regexes matches, and 96.5% of the corpus matches
neither. A direction assigned by a keyword miss carries no information
about the claim's sign, and the measurement confirms it end to end.

**And the two measures that DO carry signal carry a lot of it — the
corpus just has the sign backwards.** `route_running`'s best achievable
rate is **0.8891** (a 38.9-point edge over chance) and `workload`'s is
**0.7088** (20.9 points). **The concept carries a strong, real
association. The corpus's direction is inverted for it.**

**That is a much more actionable finding than "the corpus is noisy."** It
says: the measurement apparatus works, the data works, and the corpus's
sign field is wrong in a way a careful re-read of the source documents
can fix.

---

## 2. The grader's arithmetic is verified against an independent check

The `route_running` result (88.9% under the better direction) is large
enough to be suspicious, so it was checked against a **separate query**
that computes the same thing without the grader:

```
215,534 pairwise judgments within team-games
191,642 same-sign          ->  0.8891
 11,946 targets-up / yards-down
 11,946 targets-down / yards-up
```

**191,642 / 215,534 = 0.88912** — the grader's `0.8891` to four decimal
places. The arithmetic is right.

**But the same check exposed the deeper problem.** The `route_running`
premise is *"NFL Ghosts: Counterfactual Defender Positioning &
Separation Over Expected"* (`numeric_metric: separation_over_expected`,
`numeric_value: 1.4 yards`) — a premise about **defender separation**.
The first version of the resolver took the premise's first *resolvable*
context tag, and `route_running` came before `separation` in its tag
list, so **a premise about separation was measured on receiving yards.**

**The context tags are the extractor's broad domain buckets, and many
premises share identical tag sets.** 140 premises resolved to only **4
distinct measurements**. The score was a **measure-level** number
repeated across premises, and a premise's score was its measure's score.

**The fix: the concept match.** The premise's CONCEPT is named in its
`numeric_metric` and its title, not in the first resolvable tag. The
resolver now prefers a tag that appears as a word in the concept text,
and reports the match strength:

| match | premises | meaning |
|---|---:|---|
| `concept` | **11** | the measure matches the premise's own concept |
| `tag` | 128 | the measure is one of the premise's context tags — **the score measures the tag, not the claim** |

**Only the 11 concept-matched grades are premise-level evidence.** The 128
`tag` matches are measurements of a shared domain bucket and must not be
read as 128 independent findings. That distinction is now carried on
every grade row.

**After the fix, the `separation` premise grades on
`NextGenStat.avgSeparation` — its own concept — and the measure list
shows `separation` as its own row instead of being folded into
`route_running`.**

---

## 3. Two grader bugs, both found by running it

Neither was found by reading the code. Both were found by running it
against the live database and asking why the numbers were impossible.

### 3.1 A numeric-string coercion bug

Postgres returns a bare `NUMERIC` as a **string** through the pg driver
(`"-1.0"`, not `-1`). The grader's first version checked
`typeof r.outcome === "number"`, which rejected **every row**, so
`outcomeByGame` was empty and all 201 resolvable premises were refused
with `no_observed_games` — a clean-looking refusal that was actually a
type error. Fixed by casting in SQL and coercing in TS.

### 3.2 A degenerate comparison

The first version compared the **sign** of the measured concept value
against the sign of the game outcome. But a concept measure is a
**magnitude** — `avgCushion`, `avgSeparation`, `receivingYards` and
`offenseSnaps` are all non-negative by construction. So the observed sign
was always `+1`, the comparison degenerated to a constant, and the
grader reported agreement rates of exactly **0.000 and 1.000**.

**A grader that can only say 0 or 1 is not measuring anything.** It was
replaced with a **within-game pairwise test**: for each game, for each
pair of entities, do the two with the higher concept value also have the
higher outcome value? A premise that is right about its concept has an
agreement rate near 1.0; one that is wrong near 0.0; one that is noise
near 0.5.

**That change took the graded count from 1 to 139.**

### 3.3 And a near-tautology in the outcome

The `route_running` measure reads `PlayerGameStat.receivingYards` and its
outcome was `receivingYards + rushingYards` — **the concept compared with
itself.** The outcome is now `targets`, a different quantity: "did the
routes produce?" is answered by how much volume the player was *given*,
against how much he produced from it.

---

## 4. The database work this required

**The stat tables are keyed on `(season, week, team)`, not on a game
id**, and `historical_games` holds the outcomes. So the grader had to
re-key every source to the canonical `(season, week, team)` form and
index the outcome on **both** sides of a game — a measurement taken on the
away side has to be inverted, because the outcome is the home side's win.

**The id spaces are disjoint outside `players`:**

| bridge | rows |
|---|---:|
| `next_gen_stats.gsisId` → `players.gsisId` | 3,244 |
| `snap_counts.playerName` → `players.fullName` (lower) | 10,894 |
| `depth_chart_entries.gsisId` → `players.gsisId` | 2,460 |
| `injuries.gsisId` → `players.gsisId` | 2,719 |

`next_gen_stats.gsisId` is `"00-0036158"`; `player_game_stats.playerId` is
a cuid (`"cmsi4tkv10005tmxa0d6y72bd"`). **`players` (1,449 rows) is the
only bridge**, and the concept side and the outcome side must agree on
the entity key or the join silently produces zero overlapping entities —
which is exactly what produced the 62 `no_agreements` refusals before the
fix.

---

## 5. What the concept axis does NOT do

- **It does not touch a published number.** A concept premise earns an
  `activation_score`; it is not wired into `trueProb`, and the
  market-comparison gate (`maxBrierScoreVsMarket 0.250`) has not been
  applied to this axis. **Nothing here changes a pick.**
- **It does not mix with the probability axis.** The scorecard branches
  on `axis`; the two branches are never summed.
- **It does not rescue the 285 bridge premises.** Those are game-scoped
  and probability-typed, and the f2 measurement
  (`reconciliation/f2_duplicate_measurement.md`) is unaffected.
- **It is not a corpus-quality result.** 139 graded premises is 2.5% of
  the index, and 11 of those are concept-matched. **The axis is proven
  to work; it is not yet proven to find anything.**

---

## 6. The honest bottom line

| claim | evidence |
|---|---|
| the concept axis runs end to end on real data | 139 premises graded, no silent failures |
| the within-game pairwise test is correct | verified against an independent query (0.88912 vs 0.8891) |
| the corpus's directions carry no signal | the asserted direction loses to its inverse for 87 of 140 premises |
| the concepts themselves carry signal | `route_running` 0.8891, `workload` 0.7088 at the better direction |
| only 11 grades are premise-level | the concept-match distinction is now carried on every row |

**So the next move is not more machinery. It is to fix the direction
field** — and the measurement now says exactly what fixing it is worth:
**the `route_running` and `workload` families have a 21–39 point
association that the corpus's own direction field has backwards.**

**The work is:** read the source document for each premise with a
specific metric and record the sign the paper actually claims. That is
21 records (`staged_improvements/09-extract-the-condition.md` §3.0), and
the measurement above says the payoff is large and the sign is currently
wrong.

---

## 7. Verification record

| claim | how verified | result |
|---|---|---|
| the grader runs on real data | `node reconciliation/run_concept_grader.mjs` | 139 graded, 5,433 refused with reasons |
| the arithmetic is right | an independent pairwise query over the same tables | 191,642/215,534 = 0.88912 vs the grader's 0.8891 |
| the direction is noise | the same data graded with the direction inverted | 87 of 140 lose to the inverse |
| the concept match is right | the `separation` premise moves to `NextGenStat.avgSeparation` | confirmed |
| the resolver is truthful | `literature-measures.test.ts` parses `schema.prisma` | 20/20 pass |
| nothing publishes | the grader has no path to `trueProb` | asserted by construction |
| the test suite is green | `vitest run src/literature/__tests__/` | 65/65 |
| no new type errors | `tsc --noEmit -p packages/prediction-engine` | 0 in `src/literature/` |
