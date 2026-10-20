# STAGED-IMPROVEMENT 8 — A measure resolver: grade context premises on their own axis

**Changes a published number?** No, at first. It makes **128 premises
gradeable** that currently cannot be graded at all, which is the
prerequisite for a promotion path that does not need probabilities.
**Risk:** LOW-MEDIUM. New grading axis, new columns, no change to any
existing gate.
**Files:** a new `packages/prediction-engine/src/literature/literature-measures.ts`,
a new `lit.residual` shape, and the residual-grading loop.

---

## 0. Why — the corpus has concepts, not numbers, and the loop wants numbers

**Measured (`reconciliation/mind_corpus_gradeability.md`):**

| | |
|---|---:|
| MIND records | 5,149 |
| with a specific metric on a sports unit | **39** (0.8%) |
| with a game-level NFL quantity | **22** (0.4%) |
| with a concept name + context tags + direction | **5,149 (100%)** |
| `claim_type` in {correlational, causal} | **704** |
| …**and** a measurable context | **128** |
| …**and** a specific named metric | **4** |

**And on the live index: 285 of 5,509 premises (5.2%) are
probability-gradeable.** The other 94.8% have a number that is not a
probability — and mostly not a game quantity either. The corpus's
`numeric_claim` recorded **what the paper said** (a year, a sample size,
a count of traffic intervals in a driving-behaviour paper) rather than
**what the number measured**.

**But the corpus's CONCEPT is complete on 100% of records.** A premise
like *"Kinematic Route Separation & Receiver Velocity Trajectory"* with
contexts `['tracking','route_running','separation','props_receiving']` and
direction `positive` is a **gradeable assertion** — it just is not a
probability, so the current loop cannot score it.

**This stage adds the axis that can score it.**

---

## 1. The grading axis

**Today** (probability axis):

```
residual = actual(1 or 0) - predicted(0..1)
```

**This stage** (concept axis):

```
For a premise P with concept C, direction D, and a measure M:
  For each game g where M is observable:
    observed = M(g)                       # the concept's quantity
    expected = P.numeric_claim.value      # may be null
    agreement = sign(observed) == D
  aggregate: support = |games|, agreement_rate = agreements / support
  activation_score = max(0, (agreement_rate - 0.5) * 2) * min(support / MIN_SUPPORT, 1)
```

**The measure must be stated in the premise's own unit.** A premise whose
metric is `separation` and whose direction is `positive` is checked
against a *separation* measurement, not against a win/loss.

**Why `agreement_rate - 0.5`:** a directional premise asserts a sign, and
a coin flip agrees half the time. So the skill is the excess over 0.5,
scaled by support. **A premise that agrees exactly half the time earns
zero — the same Brier-skill logic the probability axis already uses**
(`literature-retrieval.ts:346-363`).

**A premise with `direction = 'conditional'` is not gradeable this way.**
The MIND corpus has them (e.g. *"Pathwise In-Game Win Probability &
Blown-Lead Reversion"*, direction `conditional`). A conditional premise
needs its condition evaluated first — **and 0 of 5,149 records carry a
`parsed_threshold_value`**, so no conditional premise can be evaluated
today. **They are excluded, and the exclusion is recorded, not silent.**

---

## 2. The 14 measures

Every context tag with a measure surface that exists today. **Every model
and column below was verified present in
`packages/db/prisma/schema.prisma` on 2026-10-20.**

| context tag | measure | surface (verified) |
|---|---|---|
| `workload` | snaps played | `player_game_stats` |
| `acwr` | acute-chronic workload ratio | `player_game_stats` + `team_game_efficiency` — **a workload PROXY; acwr itself is not a column** |
| `injuries` | injury count for a team | `injury` (name, status, date) |
| `depth_chart` | depth rank | `depth_chart_entry.depthRank` |
| `route_running` | route yards / targets | `player_game_stats.receivingYards`, `.targets` |
| `separation` | average separation | `next_gen_stats.avgSeparation` (`:3036`), `.cpoe` (`:3031`) |
| `props_receiving` | target share | `player_game_stats.targets` (`:2800`), `.targetShare` (`:2801`), `.receivingYards` (`:2802`) |
| `tracking` | tracking-derived rate | `next_gen_stats` + the vision parquet |
| `interceptions` | interceptions | `player_game_stats.interceptions` |
| `coverage` | coverage | `next_gen_stats.coverage` |
| `live_odds` | live price | odds snapshots |
| `epa` | EPA per play | `team_game_efficiency.offEpaPerPlay` (`:2953`), `.offSuccess` (`:2954`), `.defEpaPerPlay` (`:2955`), `.defSuccess` (`:2956`) |
| `game_state` | live game state | `signals` |
| `rest` | rest days | `games.restDaysHome` / `restDaysAway` |

**A premise may carry several context tags.** The measure resolver picks
the **first tag with a measure**, in a **declared priority order**, and
records which tag it used. A premise whose tags are ALL unmeasurable is
**not gradeable** and is skipped with a counted reason.

**A premise whose measure needs a side (home vs away) is measured for the
side the direction refers to.** `influence_direction` in the corpus is
`positive`/`negative`/`conditional` — **not** home/away. So a premise
like *"Route separation predicts receiving production, positively"* is a
claim about a **within-team association**: for each player, does higher
separation go with more receiving production? **That is a player-level
correlation, and it is gradeable without a game outcome at all** — which
is a genuinely different and useful thing to measure.

**Which is why this stage's measure is player-level wherever the concept
is player-level.** The corpus's contexts split cleanly into
player-level (`separation`, `route_running`, `props_receiving`,
`depth_chart`, `workload`, `tracking`, `interceptions`, `coverage`) and
team-level (`epa`, `injuries`, `rest`, `live_odds`, `game_state`).

---

## 3. What changes

### 3.1 A measure registry

New: `packages/prediction-engine/src/literature/literature-measures.ts`.

```ts
export interface MeasureSpec {
  readonly contextTag: string;
  /** The DB surface that produces the measure. */
  readonly grain: string;
  /** Player-level or team-level: which granularity the association runs at. */
  readonly level: "player" | "team";
  /** true when higher observed values mean "more of the concept". */
  readonly higherIsMore: boolean;
  /** How many distinct games are needed before the measure is trusted. */
  readonly minSupport: number;
}
```

**14 entries.** Each names the table, the column, the aggregation, and
the direction convention. **The registry is data, not code** — a measure
can be added without touching the grader.

### 3.2 A second residual shape, in the same table

`lit.residual` currently carries `predicted`, `actual`, `residual` (all
doubles, all on the probability axis). The concept axis needs to record
**what was measured, against what, and on which axis.**

Rather than a second table, add columns:

```sql
ALTER TABLE lit.residual
  ADD COLUMN IF NOT EXISTS axis          text NOT NULL DEFAULT 'probability',
  ADD COLUMN IF NOT EXISTS observed_value double precision,
  ADD COLUMN IF NOT EXISTS expected_value double precision,
  ADD COLUMN IF NOT EXISTS measure_grain  text,
  ADD COLUMN IF NOT EXISTS measure_tag    text;
```

`axis` is `'probability'` or `'concept'`. **The existing probability-axis
rows are unchanged** — the default keeps them valid, and the migration is
idempotent.

**A `residual` double is meaningless on the concept axis** (there is no
subtraction), so on the concept axis `residual` is the **agreement
indicator** (+1 / −1) and `observed_value` / `expected_value` carry the
magnitudes. That is stated in the schema comment so a future reader does
not subtract them.

### 3.3 The grader

New: `gradeConceptPremises(db, premises, games)` — for each premise with
a resolvable measure:

1. resolve the measure from the premise's context tags (priority order);
2. pull the observed values for the games where that measure exists;
3. compute the association between the observed value and the premise's
   expected value (or the concept's own expected sign);
4. write one `lit.residual` row per game with `axis = 'concept'`;
5. record the support.

**The concept-axis scorecard is a separate aggregation** and must not be
mixed with the probability-axis one. `lit.premise_score` currently
computes `activation_score` from `residual * residual` (a Brier term).
**On the concept axis the score is `(agreement_rate - 0.5) * 2 *
min(support / MIN_SUPPORT, 1)`.** The scorecard query must therefore
branch on `axis`, and the two branches must never be summed.

### 3.4 The promotion gate must know which axis it is on

The gate is currently `graded >= 3` distinct games + `activation_score >
0` + a non-null `numeric_value`. On the concept axis:

- `graded` still counts **distinct games** (the fix from the previous
  cycle);
- `activation_score` comes from the concept branch;
- **the `numeric_value IS NOT NULL` requirement is dropped**, because a
  concept premise may have no number at all — which is the case for
  **5,110 of 5,149** MIND records.

**A concept premise promoted to a causal edge gets an effect estimate
that is the measured association** — the same honesty fix applied to the
probability axis last cycle (where `effect_estimate` had been the
premise's own claim).

---

## 4. The honesty rules this stage must not break

1. **A concept premise with `direction = 'conditional'` is not gradeable.**
   0 of 5,149 records carry a threshold. Excluded, and counted.
2. **A premise whose measure is missing is not gradeable.** No default,
   no substitution, no "assume the average".
3. **A measure that is a PROXY must be labelled as one.** The `acwr`
   measure is a workload proxy, not ACWR. The registry's `grain` field
   records it, and the residual row carries it.
4. **Support threshold before any weight.** A premise graded on 2 games
   earns nothing. `minSupport` is per-measure and defaults to 8.
5. **The two axes never mix.** The scorecard branches on `axis`; the
   promotion gate branches on `axis`.
6. **A concept premise contributes 0 to `trueProb` until its effect size
   is measured against the market.** Same gate as the probability axis.

---

## 5. Acceptance

- [ ] 14 measures in the registry, each naming a table, a column, an
      aggregation, a level, and a direction convention. **Each is
      verified against `schema.prisma` by a test that reads the schema
      and asserts the table and column exist.**
- [ ] A measure can be ADDED by adding a registry entry — no grader
      change. Asserted by a test that adds a fake measure.
- [ ] The `lit.residual` migration is idempotent and leaves the existing
      probability-axis rows valid and unchanged.
- [ ] The scorecard query BRANCHES on `axis`: the probability branch
      uses `residual*residual`, the concept branch uses the agreement
      rate. **A test asserts the two branches are not summed.**
- [ ] The promotion gate drops the `numeric_value IS NOT NULL`
      requirement for the concept axis, and only for that axis.
- [ ] A `conditional`-direction premise is excluded and COUNTED, not
      silently skipped.
- [ ] A premise with an unresolvable measure is excluded and COUNTED.
- [ ] A concept premise with fewer than `minSupport` games earns
      `activation_score = 0`.
- [ ] The `acwr` measure is labelled a proxy in the registry AND in every
      residual row it produces.
- [ ] **Measured end to end:** the grader runs over the 128 gradeable
      premises and reports how many were graded, how many were excluded
      and why, and the resulting support distribution. The report is
      written to `reconciliation/concept_axis_coverage.json`.
- [ ] A concept premise contributes **0** to any published number.
      Asserted by a test.
- [ ] **A promoted concept edge carries a measured association as its
      `effect_estimate`,** never the premise's own claim. Asserted.
