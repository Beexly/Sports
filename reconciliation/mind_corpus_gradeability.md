# The MIND Corpus — what is actually gradeable, measured

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Corpus:** `packages/prediction-engine/data/MIND_CORPUS_3000.jsonl` (5,149 records)
**Generator:** this document's numbers come from
`reconciliation/_census_mind_gradeability.py`
**Why this document exists:** the previous cycle proved the promotion gate
cannot be cleared (0 premises qualify, because the 285 probability-typed
premises are game-scoped and the 5,224 context-scoped ones have no
probability claim). This document answers the question that decides what
happens next: **on what axis CAN the context-scoped corpus be graded?**

---

## 0. The finding in one paragraph

**The MIND corpus is a corpus of CONCEPTS, not of NUMBERS.** The numeric
claim on 99.2% of its records is **study metadata**, not a game quantity —
a year, a sample size, a count of traffic intervals in a driving-behaviour
paper. But the corpus's **concept name, context tags, and influence
direction are present and complete on 100% of records.** So the corpus is
**not** unusable — it is gradeable on a different axis than the one the
loop currently uses, and the fix is a **measure resolver**, not a corpus
rewrite.

---

## 1. The numbers are mostly not game quantities

Every MIND record has a `numeric_claim: {value, unit, metric}`. Measured
over all 5,149 records:

| metric | unit | records |
|---|---|---:|
| `situational_game_unit` | `count` | 1,724 |
| *(null)* | *(null)* | 1,636 |
| `statistical_parameter` | `coefficient` | 962 |
| `temporal_epoch` | `year` | 601 |
| `empirical_sample_size` | `samples` | 98 |
| `performance_ratio` | `multiplier_or_threshold` | 89 |
| a specific named metric | a sports unit | **39** |

**Only 39 of 5,149 records (0.8%) carry a specifically-named metric on a
sports unit** (the script's `specifically_named_metric_on_sports_unit`). The rest are placeholders — generic names the extractor
assigned because it could not determine what the number measured.

**And the papers are not all about football.** Bucketed by whether the
title/quote is about NFL football at all:

| bucket | records | share |
|---|---:|---:|
| placeholder metric, NFL-related | 2,089 | 40.6% |
| **no numeric claim at all** | 1,636 | 31.8% |
| placeholder metric, **not football** | 1,385 | 26.9% |
| game-level NFL quantity | **22** | **0.4%** |
| sports unit, not NFL | 17 | 0.3% |

Real examples of the 26.9%:

| title | the "numeric claim" |
|---|---|
| *"Emotional driving: Reference-dependent emotions and risky driving behavior after sporting events"* | `{value: 10, unit: "count", metric: "situational_game_unit"}` — **10-minute traffic intervals** |
| *"Focal Loss Analysis of Peripapillary Nerve Fiber Layer Reflectance for Glaucoma Diagnosis"* | `{value: 4, unit: "count", metric: "situational_game_unit"}` — **4 layers of the retina** |

**Grading "10" or "4" against an NFL game is a category error**, and the
loop is right to refuse them. That refusal is what `skipped_no_probability_claim`
is measuring.

### The same finding in the live index

| `lit.premise.source` | n | has a number | **probability-gradeable** |
|---|---:|---:|---:|
| `ResearchSynthesis` | 2,314 | 1,945 | **0** |
| `Pinnacle` | 911 | 911 | **0** |
| `arXiv` | 905 | 205 | **0** |
| `Statrankings` | 407 | 85 | **0** |
| `AcademicLiterature` | 343 | 272 | **0** |
| `bridge_premise` | 285 | 285 | **285** |
| `Kaggle` | 269 | 95 | **0** |
| `discovered_*` (the 75 the engine invented) | 75 | **0** | **0** |

**285 of 5,509 premises (5.2%) are probability-gradeable.** The other
94.8% have a number that is not a probability — and, per §1, mostly not a
game quantity either.

---

## 2. But the CONCEPT is present and complete

This is the part that makes the corpus worth keeping. Measured over all
5,149 records:

| field | present |
|---|---:|
| `principle_or_feature` (the named concept) | **5,149 / 5,149** |
| `applicable_contexts` (87 distinct tags) | **5,149 / 5,149** |
| `influence_direction` | **5,149 / 5,149** |
| `evidence_quote` | **5,149 / 5,149** |
| `domain` (17 distinct) | **5,149 / 5,149** |
| `claim_type` | **5,149 / 5,149** |
| `numeric_claim` | 3,513 / 5,149 |
| `how_it_influences` | **0 / 5,149** |

**100% of records name a concept and carry context tags and a
direction.** The concept names are specific and useful:

> *"Kinematic Route Separation & Receiver Velocity Trajectory"* —
> contexts `['tracking', 'route_running', 'separation', 'props_receiving']`
>
> *"Pathwise In-Game Win Probability & Blown-Lead Reversion"* —
> contexts `['win_probability', 'epa', 'game_state', 'live_odds']`

**That is a gradeable assertion.** "Route separation predicts receiving
production, positively" is a claim about a quantity that exists in
`next_gen_stats.avgSeparation` and `player_game_stats.receivingYards`.
**It just is not a probability, so the current loop cannot score it.**

---

## 3. Which contexts are measurable from the database today

87 context tags. **14 have a measure surface that exists today**; the
rest do not. The measure surfaces were verified against
`packages/db/prisma/schema.prisma` — every model and every column cited
below was confirmed present.

| context tag | tag-pairs | measure surface (verified) |
|---|---:|---|
| `workload` | 409 | `player_game_stats` snap counts |
| `acwr` | 409 | `player_game_stats` + `team_game_efficiency` (a **workload proxy** — acwr itself is not a column) |
| `injuries` | 408 | `injury` (name, status, date) → injury count per team |
| `depth_chart` | 408 | `depth_chart_entry.depthRank` |
| `route_running` | 352 | `next_gen_stats` + `player_game_stats.receivingYards` |
| `separation` | 352 | `next_gen_stats.avgSeparation` (`:3036`), `.cpoe` (`:3031`) |
| `props_receiving` | 352 | `player_game_stats.targets` (`:2800`), `.targetShare` (`:2801`), `.receivingYards` (`:2802`) |
| `tracking` | 351 | `next_gen_stats` + the vision parquet |
| `interceptions` | 153 | `player_game_stats.interceptions` |
| `coverage` | 152 | `next_gen_stats.coverage` |
| `live_odds` | 85 | odds snapshots |
| `epa` | 85 | `team_game_efficiency.offEpaPerPlay` (`:2953`), `.offSuccess` (`:2954`), `.defEpaPerPlay` (`:2955`), `.defSuccess` (`:2956`) |
| `game_state` | 84 | `signals` / live game state |
| `rest` | 79 | `games.restDaysHome` / `restDaysAway` |

**Coverage: 3,679 of 17,927 premise-tag pairs (20.5%) sit on a context
that is measurable today.**

**The three biggest tags are the least useful**: `metric_specification`,
`player_evaluation`, and `situational_game_unit` each appear on 3,274
records — and they are **the placeholder metric names themselves**, not
real contexts. Together they are 9,822 of the 17,927 tag-pairs (54.8%)
and they measure nothing. **Excluding those three, coverage is
3,679 / 8,105 = 45.4%** — nearly half the *real* context tags sit on a
measure that exists today.**

**The unmeasurable 73 tags are a clean, prioritised list of what to
build.** Grouped:

| group | tags | what it needs |
|---|---|---|
| **market/pricing** (17 tags) | `elo`, `historical_spread`, `line_movement`, `clv`, `steam`, `public_bias`, `ticket_handle_split`, `market_total`, `market_spread`, `public_ticket_pct`, `public_handle_pct`, `vig`, `edge_threshold` | odds snapshots — **partly exist**; the de-vigged price family |
| **game-plan** (18) | `motion`, `play_action`, `sack`, `trench`, `pass_rush`, `ol_continuity`, `two_high`, `dpi`, `deep_passing`, `passing_efficiency`, `pass_discipline`, `play_calling`, `down_and_distance`, `receiver_burst`, `leverage`, `penalties`, `fourth_down`, `fourth_quarter` | the `ftn.*` and `vision_*` signal families — **partly exist** |
| **context/environment** (12) | `fatigue`, `schedule`, `time_zone`, `circadian`, `crowd_noise`, `home_field`, `altitude`, `weather`, `wind`, `temperature`, `venue`, `travel` | the 32-row venue table + a weather surface |
| **coaching/people** (5) | `coach_aggressiveness`, `coaching`, `quarterback`, `false_starts` | `qb-behavior` / coaching surfaces |
| **DFS/fantasy** (5) | `fantasy`, `dfs`, `stacking`, `gpp`, `cash_game` | a DFS projection surface — **probably out of scope** |
| **singletons** (16) | `copula`, `sgp`, `parlay`, `tail_risk`, `win_probability`, `point_differential`, `team_ratings`, `turnovers`, `drive_momentum`, `passing_accuracy`, `combine`, `correction`, `correlation`, `correlation_matrix`, `psd_repair`, `injury_hazard` | each needs its own surface |

---

## 4. What this means for the design

### 4.1 The current residual axis is the wrong axis for 94.8% of the corpus

The loop grades a premise by comparing its `numeric_value` to a binary
game outcome. That works only for a premise that asserts a **probability**.
**285 premises qualify. 5,224 do not.**

The right axis for a concept premise is:

> **measure the concept's quantity in a real game; compare the premise's
> claimed DIRECTION against what actually happened.**

Not "did the premise say 0.85 and did the side win" but:

> *"Route separation predicts receiving production, positively."* →
> For each game with a WR on the field: compute the WR's average
> separation and his receiving yards. Did the higher-separation WR
> produce more? **The premise is supported if the sign agrees, across
> games.***

That is **a correlation claim graded on its own axis**, which is exactly
what the corpus's `claim_type` field says it is:

| `claim_type` | records | share |
|---|---:|---:|
| `theoretical` | 4,445 | 86.3% |
| `correlational` | 517 | 10.0% |
| `causal` | 187 | 3.6% |

**86% of the corpus is `theoretical`** — a mechanism with no stated
effect size. **Those are not gradeable as directional claims either**,
because a theory asserts a mechanism, not a sign. **The gradeable
population is the 704 `correlational` + `causal` records (13.7%)**, and
within those, only the ones whose contexts are measurable.

### 4.2 So the real, buildable population is much smaller than 5,224

| filter | count |
|---|---:|
| MIND records | 5,149 |
| …with a numeric claim | 3,513 |
| …that is a game-level NFL quantity | **22** |
| …`claim_type` in {correlational, causal} | **704** |
| …**and** at least one measurable context | **128** (18.2% of 704) |
| …**and** a specific named metric (not a placeholder) | **4** |

**The honest number is 128 premises, and 4 with a fully-specified
assertion today.** Not 5,224.

Everything else is **citable knowledge with no evaluable assertion** —
still worth having (it grounds the reasoning and it is retrievable), but
it is **not** "living fuel" in the sense the mandate means, and it can
never earn weight or promote to an edge.

**The 128 is the buildable population, and it is enough to prove the
mechanism.** 128 premises graded on their own axis, across 14 measured
contexts, with a support threshold and a sign-agreement rate, is a
complete, honest, closed loop — and it is the same loop that already
works for the 285 probability-typed premises, on a different axis.

**The 4 is the number that says "the corpus needs work."** Four premises
with a specific metric AND a measurable context AND a correlational or
causal claim type. That is the population a re-extraction pass would
grow, and it is the measure of how much is left on the table.

### 4.3 This is a corpus-quality finding, and it should be staged as one

The corpus's `numeric_claim` field was produced by an extractor that
assigned a **placeholder** whenever it could not identify the measured
quantity. **39 of 5,149 got a real one.** A re-extraction pass that reads
`evidence_quote` and the paper's own metric names could recover a
specific metric for a large share of the 4,089 placeholder records — the
quote mentions a unit-ish word in 27.7% of them, and the concept name is
present on 100%.

**But that is a corpus-construction project, not a wiring change**, and
it is the single highest-leverage remaining work on the literature side:
it is what would turn 39 gradeable premises into thousands.

---

## 5. What is therefore worth building, in order

| # | stage | what it closes | size |
|---|---|---|---|
| 1 | **A measure resolver**: `context tag → (table, column, aggregation)` for the 14 measurable tags, plus the grader that compares a premise's direction against the observed association | makes **128** premises gradeable on their own axis | small — 14 mappings |
| 2 | **Extend the residual schema** to carry the premise's own axis: `observed_value`, `expected_value`, `metric`, rather than a binary `actual` | the loop can score a concept premise | small — one table |
| 3 | **Grade `correlational`/`causal` premises directionally**, with a support threshold (≥ N games) and a sign-agreement rate | a real promotion path that does not need probabilities | medium |
| 4 | **Re-extract `numeric_claim.metric`** from the evidence quotes for the 4,089 placeholder records | turns 39 gradeable into potentially thousands | large — a corpus pass |
| 5 | **Build the missing context surfaces** (market/pricing, game-plan, environment) for the 73 unmeasurable tags | the rest of the corpus | large, but a clean prioritised list |

**Stage 1 is the highest value per line of code in the entire literature
programme**, because 14 mappings make 128 premises gradeable, and the
grading machinery (activation, residual, scorecard, promotion, demotion,
intervention test) **already exists and is now honest** after the six
defects fixed in the previous cycle.

---

## 6. What this does NOT change

- **The f2 measurement stands.** The bridge is a duplicate as a separate
  family and a better estimator of the strength class. Nothing here
  touches that.
- **The six honesty defects stay fixed.** The grading machinery is now
  correct: premises are graded against the game they assert about, support
  counts distinct games, promotion reconciles in both directions, and a
  retired edge retires its tests.
- **The literature retrieval machinery works.** 5,509 premises indexed
  under HNSW, 60 real retrieval events, 781 activations, p50 77ms, and
  **75 premises the engine invented from the raw corpus with no human
  writing them.** That is the doctrine's "Reflect & refine" step
  working.

## 7. The honest summary

**The corpus is 5,149 citable records. The gradeable population is 128
premises (4 with a fully-specified assertion).** The gap is not the
corpus's size — it is that the extractor recorded **what the paper said**
rather than **what the number measured**, and 99.2% of the numbers it did
record are study metadata.

**The 128 is enough to close the loop; the 4 is the measure of what a
re-extraction pass would unlock.**

**That is a fixable corpus problem, and it is now precisely specified:**
re-extract the metric, and grade the concept on its own axis.

---

## 8. Verification record

| Claim | How verified | Result |
|---|---|---|
| the metric distribution | full scan of 5,149 records' `numeric_claim.metric` | 6 placeholders + 39 specific |
| the football-relevance split | regex over title + evidence_quote | 2,089 / 1,385 / 22 |
| the field-presence table | scan of all 5,149 records | 100% for concept/context/direction/quote/domain |
| the 14 measure surfaces | `grep` against `packages/db/prisma/schema.prisma` | every model and column present, with line numbers |
| the index-level table | `lit.premise` grouped by source on the live dev branch | 285 of 5,509 probability-gradeable |
| the claim_type split | full scan | 4,445 / 517 / 187 |
| the tag-coverage arithmetic | 3,679 of 17,927 premise-tag pairs | 20.5% overall, **45.4%** excluding the three placeholder-metric tags |
| the gradeable population | filtered on `claim_type` x measurable-context x named-metric | **704 -> 128 -> 4** |
