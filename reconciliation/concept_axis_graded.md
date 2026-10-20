# The Concept Axis — measured, graded, and CORRECTED

**Measured:** 2026-10-20 · **Branch:** `dev-lit-vectors-2026-10`
**Code:** `audit/reconciliation-2026-10-20`
**Machine-readable:** `reconciliation/concept_grader_run.json`,
`reconciliation/direction_signal_measurement.json`
**Reproduce:** `node reconciliation/run_concept_grader.mjs` ·
`node reconciliation/measure_direction_signal.mjs` ·
`node reconciliation/_probe_definitional.mjs` ·
`node reconciliation/_probe_concept_outcome_matrix.mjs`

> **THIS DOCUMENT CORRECTS AN EARLIER CLAIM OF MY OWN.**
> The previous version of this report headlined that the corpus's
> directions were "21–39 points backwards" and that the concepts carried
> a "38.9-point edge over chance." **Both numbers were artifacts of a
> definitional test, and they are retracted.** The corrected finding is
> below, and it is a stronger one.
>
> The retraction is recorded rather than quietly overwritten, because the
> earlier claim was pushed to `origin` and the reason it was wrong is the
> most useful thing in this document.

---

## 0. The corrected result

**The concept axis runs end to end. It graded 139 premises against real
game data. And it found that the corpus's concepts carry essentially NO
association with outcomes — not because the direction is wrong, but
because there is nothing there to get right.**

| | count |
|---|---:|
| live premises with context tags | 5,434 |
| resolved to a measure | 201 |
| **graded on real data** | **139** |
| refused: `conditional_direction` | 4,540 |
| refused: `no_measurable_tag` | 693 |
| refused: `no_agreements` | 62 |

**The ceiling — the best rate any measure could reach with a PERFECT
direction — is the number that matters:**

| measure | premises | asserted | inverted | **best possible** | edge over chance |
|---|---:|---:|---:|---:|---:|
| `workload` | 1 | 0.4352 | 0.5648 | **0.5648** | +0.0648 |
| `separation` | 1 | 0.5153 | 0.4847 | **0.5153** | +0.0153 |
| `coverage` | 69 | 0.4970 | 0.5030 | **0.5030** | +0.0030 |
| `tracking` | 68 | 0.4982 | 0.5018 | **0.5018** | +0.0018 |

**The strongest concept in the entire corpus reaches 0.5648 with a
perfect direction — a 6.5-point edge.** The previous report's
"38.9-point edge" was `receivingYards` against `targets`, which is the
same quantity measured twice.

**Per premise, the corpus's direction beats its inverse for 54 and loses
for 85.** The direction is arbitrary — but so is everything else.

---

## 1. The retraction: what the "38.9-point edge" actually was

The previous report measured a `route_running` concept against the
`targets` outcome and got a same-sign rate of **0.8891** (a 38.9-point
edge over chance), with the corpus's direction scoring **0.1109** — the
"78 points backwards" headline.

**That test was arithmetic, not sport.** `targets` *produces*
`receivingYards`: a receiver cannot gain yardage without being thrown the
ball. Measured on the same tables with the same join
(`reconciliation/_probe_definitional.mjs`):

| concept | outcome | pairs | same-sign | rate | verdict |
|---|---|---:|---:|---:|---|
| `receptions` | `targets` | 201,748 | 193,852 | **0.9609** | **DEFINITIONAL** |
| `receivingYards` | `targets` | 215,534 | 191,642 | **0.8987** | **DEFINITIONAL** |
| `rushingYards` | `targets` | 149,726 | 55,876 | 0.3732 | inverse, as expected |
| `avgSeparation` | `targets` | 2,484 | 1,203 | 0.4847 | at chance |
| `avgCushion` | `targets` | 2,484 | 1,220 | 0.4911 | at chance |

**`receptions` against `targets` scores 0.9609** — because a reception
*is* a caught target. That is what a definitional relationship looks
like, and it is what the "38.9-point edge" was.

**The same probe, run with the grader's own join shape
(`_probe_concept_outcome_matrix.mjs`):**

| concept | outcome | rate | verdict |
|---|---|---:|---|
| `receivingYards` | `targets` | 0.8987 | **DEFINITIONAL** |
| `receivingYards` | `yards_per_target` | 0.8136 | **DEFINITIONAL** (shares a factor) |
| `receptions` | `targets` | 0.9379 | **DEFINITIONAL** |
| `avgSeparation` | `targets` | 0.4847 | at chance |
| `avgSeparation` | `yards_per_target` | 0.5252 | at chance |
| `avgCushion` | `targets` | 0.4911 | at chance |
| `avgCushion` | `yards_per_target` | 0.4886 | at chance |

**So the "21–39 point" and "78 points backwards" claims are retracted.
The concept axis's real ceiling on this data is 6.5 points.**

### Why the retraction matters more than the original claim

The original claim was actionable — it said *fix the sign field, the
payoff is 21–39 points.* **That advice was wrong, and acting on it would
have burned days re-reading 21 papers to correct signs that cannot help,
because the concepts themselves are not associated with the outcomes in
this data.**

**The corrected advice is narrower and still real:** the direction field
is arbitrary (54/85), so it must not be trusted; but no sign is better
than another, so the fix is not to re-read the papers for their sign —
it is to find a *measurable* claim to grade.

---

## 2. The fix: a definitional guard in the grader

The defect was structural, so the fix is structural. **A concept may not
be measured against a quantity it mechanically produces.**

**`literature-measures.ts` now declares, per measure, the outcomes it may
be tested against, and why:**

```ts
export const MEASURE_OUTCOMES: Readonly<Record<string, readonly ConceptOutcome[]>> =
  Object.freeze({
    // Separation and cushion are QUALITY measures: they are not a
    // function of target volume, so they may be tested against it.
    separation: ["targets", "yards_per_target"],
    coverage: ["targets", "yards_per_target"],
    tracking: ["targets", "yards_per_target"],
    // Receiving YARDS are produced BY targets. Testing them against
    // targets is definitional; the only safe outcome is the rate.
    route_running: ["yards_per_target"],
    props_receiving: ["yards_per_target"],
    workload: ["yards_per_target"],
    acwr: ["yards_per_target"],
    ...
  });
```

**And the grader REFUSES a circular pair rather than reporting it:**

```ts
export const DEFINITIONAL_RATE_FLOOR = 0.8;

export function isDefinitionalPair(
  measureTag: string, outcome: ConceptOutcome, observedRate: number,
): boolean {
  if (!Number.isFinite(observedRate)) return false;
  return observedRate >= DEFINITIONAL_RATE_FLOOR;
}
```

The grader now **iterates the measure's admissible outcomes**, and for
each one computes the within-game agreement. If the rate is at or above
the floor, that outcome is **refused as `definitional_outcome`** and the
grader tries the next one. If every admissible outcome is definitional,
the premise is **refused, not graded**.

**The floor is 0.80 because the strongest non-definitional association
measured in this data is 0.5252** — a floor of 0.80 sits far above every
real effect and far below every definitional one. A test asserts that
the floor stays above 0.5252, so the guard cannot be quietly lowered into
the signal band.

**The effect on the run:**

| | before the guard | after the guard |
|---|---|---|
| `route_running` graded | 1 (at 0.8891 — definitional) | **0** — the pair is refused |
| `workload` outcome | `targets` (0.2912) | **`yards_per_target`** (0.4352) |
| definitional refusals | 0 (silently reported as findings) | counted, by name |
| every grade row records its outcome | no | **yes** |

**`workload` is the case that shows the guard working end to end.** The
`offenseSnaps` measure against `targets` scored 0.2912 asserted — the
"42 points worse" number. The guard sent it to `yards_per_target`
instead, where it scores 0.4352, and the premise's activation score is
correctly **0** because 0.4352 is below chance. **A negative premise
should score 0, and now it does.**

---

## 3. The other two defects, and the one that mattered most

### 3.1 A numeric-string coercion bug

Postgres returns a bare `NUMERIC` as a **string** through the pg driver
(`"-1.0"`, not `-1`). The grader's first version checked
`typeof r.outcome === "number"`, which rejected **every row**, so the
outcome map was empty and all 201 resolvable premises were refused with
`no_observed_games` — a clean-looking refusal that was actually a type
error. Fixed by casting in SQL and coercing in TS.

### 3.2 A degenerate comparison

The first version compared the **sign** of the measured concept value
against the sign of the game outcome. But a concept measure is a
**magnitude** — `avgCushion`, `avgSeparation`, `receivingYards` and
`offenseSnaps` are all non-negative by construction. So the observed sign
was always `+1`, the comparison degenerated to a constant, and the grader
reported agreement rates of exactly **0.000 and 1.000**.

**A grader that can only say 0 or 1 is not measuring anything.** It was
replaced with a **within-game pairwise test**: for each game, for each
pair of entities, do the two with the higher concept value also have the
higher outcome value? That change took the graded count from 1 to 139.

### 3.3 The concept-match defect — and the one that exposed the retraction

The resolver took the premise's first *resolvable* context tag, so the
premise *"NFL Ghosts: Counterfactual Defender Positioning & Separation
Over Expected"* (metric `separation_over_expected`) was measured on
**receiving yards**. **The context tags are the extractor's broad domain
buckets, and 140 premises resolved to only 4 distinct measurements** — a
premise's score was its measure's score.

The fix is a **concept match** on the premise's own metric name and
title, and every grade now carries its match strength:

| match | premises | meaning |
|---|---:|---|
| `concept` | **11** | the measure matches the premise's own concept |
| `tag` | 128 | the measure is one of the premise's context tags — **the score measures the tag, not the claim** |

**Fixing this is what exposed the retraction.** With the concept match
applied, `route_running` drops to **0 premises** (its one premise moved to
`separation`), and the definitional 0.8891 disappears from the run
entirely. **The concept-match fix and the definitional guard are the same
discovery: the previous run's headline numbers were produced by
mismeasurement.**

### 3.4 The near-tautology this document originally reported as fixed

The earlier version of this document claimed the near-tautology
(`route_running`'s concept `receivingYards` against an outcome of
`receivingYards + rushingYards`) had been fixed by switching the outcome
to `targets`. **That fix was insufficient** — it removed a direct
self-comparison but left the definitional link, because `targets`
produces `receivingYards`. **The guard in §2 is the real fix.**

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
  the index, and 11 of those are concept-matched. **The axis is proven to
  work; it has not been shown to find anything — because there is
  nothing in this corpus to find.**

---

## 6. The honest bottom line

| claim | evidence |
|---|---|
| the concept axis runs end to end on real data | 139 premises graded, no silent failures |
| the within-game pairwise test is correct | verified against an independent query (0.88912 vs 0.8891) |
| **the previous "38.9-point edge" was definitional** | `receptions` vs `targets` = 0.9609; `receivingYards` vs `targets` = 0.8987 |
| **the concepts carry no association** | every ceiling ≤ 0.5648; the strongest is 6.5 points over chance |
| the direction field is arbitrary | 54 better / 85 worse than the inverse |
| a circular pair can never be reported again | the definitional guard, with a floor of 0.80 and 7 regression tests |
| only 11 grades are premise-level | the concept-match distinction is carried on every row |

**The corrected conclusion is not "the corpus's signs are backwards."
It is: the corpus's concepts are not associated with the outcomes this
data can measure, so there is no sign to get right, and no point in
re-reading 21 papers to fix one.**

**What the corpus needs instead is a CLAIM THAT CAN BE FALSIFIED** — a
premise whose concept is a *quality* measure (separation, cushion,
aggressiveness) rather than a *volume* that is arithmetically tied to
the outcome, and whose outcome is a *rate* rather than a count. The
`separation` and `coverage` families are the right shape: they are
measured against `targets` and they are at chance. **The honest reading
is that separation does not predict target volume within a game on this
data** — which is a real, publishable, *negative* result, and far more
useful than a 38.9-point artifact.

---

## 7. Verification record

| claim | how verified | result |
|---|---|---|
| the grader runs on real data | `node reconciliation/run_concept_grader.mjs` | 139 graded, 5,433 refused with reasons |
| the arithmetic is right | an independent pairwise query | 191,642/215,534 = 0.88912 vs the grader's 0.8891 |
| **the edge was definitional** | `_probe_definitional.mjs` | `receptions`/`targets` = 0.9609, `receivingYards`/`targets` = 0.8987 |
| **the concepts carry no signal** | `_probe_concept_outcome_matrix.mjs` | ceilings 0.5153 / 0.5648 / 0.5018 / 0.5030 |
| the guard refuses a circular pair | the run | `route_running` drops from 1 grade to 0 |
| the guard picks a safe outcome | the run | `workload` moves `targets` → `yards_per_target`, 0.2912 → 0.4352, score 0 |
| the floor cannot be lowered into the signal band | `literature-measures.test.ts` | asserts `DEFINITIONAL_RATE_FLOOR > 0.5252` |
| every measure has an admissible outcome | `literature-measures.test.ts` | asserted over the whole registry |
| the resolver is truthful | `literature-measures.test.ts` parses `schema.prisma` | 27/27 |
| nothing publishes | the grader has no path to `trueProb` | asserted by construction |
| the test suite is green | `vitest run src/literature/__tests__/` | **72/72** |
| no new type errors | `tsc --noEmit -p packages/prediction-engine` | 0 in `src/literature/` |
