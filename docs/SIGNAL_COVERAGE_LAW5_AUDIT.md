# GSE signal coverage — Law 5 audit

Generated from the engine's own registry and the real scorer, not from prose.
Companion tests that recompute these numbers:
`packages/ingestion-pipeline/src/signal-vote-audit.test.ts` (voting) and
`packages/prediction-engine/src/__tests__/{reasoning-trace,market-echo-factor-weight-spread,calibration-seam-threading}.test.ts` (traces and weights).

**The five, per signal (Law 5):** wired · weighted · tested · demonstrated in a
trace · honest about what it does.

---

## HEADLINE — the finding that matters

**31 of 41 signals carry `activationStatus: "ACTIVE"` and cannot move a published
probability.**

`applyContinuousSignalTilt` (`continuous-signal-tilt.ts:98-105`) refuses any
continuous value whose `metadata.homeSign` is absent. A scalar with no declared
direction cannot tell you which side it favors, so the engine refuses rather
than guesses — that refusal is correct and must stay strict (Law 6).

**No registry signal declares one.** `homeSign` appears in neither
`signal-registry-definitions.ts` nor `signal-registry-extensions.ts`. Every
signal ends `return { value, capturedAt, metadata: { ...res } }`.

So the registry reads 41 ACTIVE while the continuous path votes 0. Measured:
`canVote: 0`. This is not a drift toward metrics; it is the opposite failure —
the registry's own labels overstate what the engine does.

**Fixing this means each signal declaring which way its own value points, or
being marked inactive.** Guessing a sign from the metric's name would be
fabrication. Not done here; recorded as the top open item.

---

## A. Signals that reach a pick (probability path) — 10

These emit `homeFairProb`, so they are blended by `assessEdge` into `trueProb`.

| Signal | Family | Weight | Trace | Note |
|---|---|---|---|---|
| prefetched_exchange | MARKET | 1.0 | yes | |
| kalshi | MARKET | 1.0 | yes | |
| espn_powerindex | EFFICIENCY | 0.8 | yes | rights-cleared check |
| clubelo | EFFICIENCY | 0.9 | yes | |
| poisson_dixon_coles | EFFICIENCY | 1.0 | yes | sport-gated |
| skellam_cover | EFFICIENCY | 1.0 | yes | SPREAD only, NHL |
| mlb_standings | EFFICIENCY | 0.75 | yes | MLB only |
| elo | EFFICIENCY | 0.9 | yes | |
| nfl_epa_adj | EFFICIENCY | 1.0 | yes | NFL only |
| nfl_redzone_te_leverage | EFFICIENCY | 0.10 | yes | |

All 10 are weighted, and every one appears in the reasoning traces.

## B. Continuous signals — WAS: 31 weighted, tested, and MUTED. NOW: FIXED.

> **Superseded by "§B resolved" at the end of this document.** The table below is
> kept as the record of what was true when measured. As of 2026-10-01 all 23
> remaining ACTIVE continuous signals declare a `homeSign` and a `neutralValue`,
> and the 9 stub evaluators are `SHADOW_ONLY`. `REFUSED_UNSIGNED` went 31 → 0.

Every one has: a real `evaluate`, a real `trustWeight` (0.06–0.14), a
unit test, and — at the time of measurement — **no effect on any published number**.

Families: SITUATIONAL 13 · MICROCLIMATE 5 · NARRATIVE 3 (of 4) · TRENCHES 1 (of 2)
· LUCK 1 (of 2) · EFFICIENCY 7.

Refusal is honest and correct; the *label* is not. They are neither DARK-with-a-gate
nor live — they sit in the gap between, which is the one state the Law 5 list
does not permit.

## C. Honest non-voters — correctly declared

| Signal | Status | Reason |
|---|---|---|
| nfl_contract_incentives | BLOCKED_MISSING_SOURCE | no source |
| nfl_cognitive_load_fatigue | BLOCKED_MISSING_SOURCE | no source |
| nfl_beat_desk_corroboration | BLOCKED_MISSING_SOURCE | no source |
| nfl_trench_pass_block_win_rate | BLOCKED_MISSING_SOURCE | no source |
| nfl_luck_fumble_regression | BLOCKED_MISSING_SOURCE | no source |
| polymarket_gamma_internal | SHADOW_ONLY | shadow, weight 0.5 |

These satisfy Law 5 honestly: inactive, weighted, and the surface says so.

## D. DARK families — implemented, validated, never called

Per the brief these stay DARK until their honesty gate passes. Not turned on to
improve a coverage count.

| Family | Module | Callers outside tests |
|---|---|---|
| Weather / altitude | `signals-bridge.ts` (4 kernels) | 0 |
| Officials | `referee-crew-tendencies.ts` | 0 |
| Coaching | `coaching-tendencies.ts` | 0 |
| Injury | `bio/injury-trajectory.ts` | 0 |
| Travel / timezone | `rest-travel.ts` | 0 |
| Narrative | no source exists | 0 |

The validation layer is paid for; only call sites are missing.

## E. Config-dark: weighted, tested, and structurally inert in production

**`ATS form`, `venue form`, and `head-to-head`** are gated on
`gates.canUseDerivedHistory`, default `false`
(`platform-config.ts:165`, `DERIVED_MODEL_HISTORY_ENABLED`).
`process-sport.ts:1161-1170` yields `[null,null,null,null,null]`; the engine reads
every score as 0.

That is **three of seven in-scope context families**, with weights (±5/±10),
tests, and reasoning clauses all still in place.

**Not flipped here.** The gate is deliberately fail-closed — its own comment says
"engine treats as 0 (neutral, no historical bias)" — and turning it on injects
bootstrap-era derived history into published picks. That is a governance call
about data provenance, not a wiring task. Recorded as DARK-with-gate.

---

## Fixed in this branch

**GAP-1 — the market-echo guard was ineffective on SPREAD.** Two independent
audits found it; verified by reading both call sites and pinned RED before the fix.

`scoring.ts:655` computed the zeroed `marketEchoFactors`; line 715 spread the
**un-zeroed** `contextFactors` and discarded it. SPREAD is the only scorer that
can emit a cross-market factor, so the one path where the guard mattered was the
one path that skipped it. A SPREAD pick advertised `Cross-Market Alignment` at
weight 4 / impact "positive" while the term contributed 0 to the sum — an
overstated factor claim. **Confidence was never affected.**

TOTAL never applied the guard at all; it was safe only because
`computeCrossMarketScore` gates on `marketType === "SPREAD"`. All three scorers
now spread the zeroed copy, so the paths agree rather than relying on a gate
elsewhere (Law 4).

Also fixed: `edge-engine.ts` clamped an out-of-range calibrator into range
instead of refusing it, so a broken map returning 4.2 published `trueProb 1.0`.

---

## Reconciliation, per the five

- **Wired end-to-end:** 10 probability-path signals + 9 context terms + 23 continuous signals that now declare a direction. **Exceptions:** 10 `SHADOW_ONLY` stubs, 3 config-dark (§E), 6 DARK families (§D).
- **Weighted with rationale:** 10/10 probability signals; context terms carry `WEIGHTS.*` constants. **Gap:** `HEAD_TO_HEAD_COMPONENT_MAX` and `VENUE_FORM_COMPONENT_MAX` are declared and never read — `game-context.ts` hardcodes 5/3.
- **Tested:** yes, though market depth and volatility penalty are only asserted `>= 0` / `<= 0`; zeroing either would leave the suite green.
- **Demonstrated in a trace:** all 10 probability-path, across three real traces.
- **Honest:** §B is now honest (directions declared, stubs demoted). §E remains **not** honest — silently inert, neither live nor gated.

---

## §B resolved — the 31 muted signals, wired (2026-10-01, verified)

The measurement above found 31 ACTIVE continuous signals that could not vote.
**That gap is closed.** Three distinct defects, each proven before and after:

**1. No signal declared a direction.** `applyContinuousSignalTilt` refuses any
continuous value that does not say which side it favors. `SignalDefinition` gained
`homeSign`, and all 23 remaining ACTIVE continuous signals now declare one —
derived by reading each evaluator's own semantics, never guessed from the signal's
name. Each carries a comment stating the reasoning.

**2. Signals read fields their evaluators never return.** 21 signals extracted
`(res as { edge?: number }).edge`. A cast to an invented type compiles, so the
`?? 0` fallback fired silently and those signals emitted nothing forever. The real
result interfaces were read and each repointed to the field that exists —
`spreadPointAdjustment`, `expectedMarginAdjustment`, `adjustedAdot`,
`offensiveEpaAdjustment`, and so on.

**3. Multipliers were not normalized.** `neutralValue` is new and load-bearing.
Several signals return ratios (`passingYardsMultiplier`, `fatigueMultiplier`) whose
"no effect" value is `1.0`, not `0`. Since `tanh(1.0) = +0.76`, an un-normalized
multiplier tilts home ~2.7% **for saying nothing at all** — the engine inventing a
view out of arithmetic. `neutralValue` makes "no effect" mean no effect regardless
of units.

**9 signals relabelled SHADOW_ONLY.** Their evaluators are stubs returning `null`
on every call ("ingested dynamically per play context"). ACTIVE was a coverage
claim the code did not support. They stay registered and go ACTIVE in one line
when real per-play ingestion calls them.

### Before / after, measured by `signal-vote-audit.test.ts`

| Measure | Before | After |
|---|---|---|
| ACTIVE continuous signals | 31 | 23 (9 stubs demoted, honestly) |
| `REFUSED_UNSIGNED` | 31 | **0** |
| Muted but weighted | 31 | **0** |

### Proof by execution — `signal-vote-live.test.ts`

Declarations are necessary, not sufficient. Four tests run the real tilt function:

- an unsigned signal is **still refused** (the law survives the declarations)
- a multiplier at `neutralValue` produces **zero** tilt — the tanh(1.0) trap
- a declared sign moves probability **the way it says**
- **every** ACTIVE continuous signal is silent at its own neutral value

The last is the important one: it catches any signal whose neutral point is
declared wrong, which is precisely the class of bug a sign declared by eye
introduces.

### The input side — also fixed

`REFUSED_UNSIGNED: 0` only proved the signals *could* vote. They still received
nothing: `generate-signal-slate.ts` passed `env: process.env` to the tilt, and
every evaluator reads DEFENSIVE_PLAYS / REST_DAYS / WIND_MPH from `ctx.env`.
Process env holds none of those, so a correctly wired signal abstained anyway.

`signal-game-context.ts` derives a real per-game context from TeamGameLog. Its
three rules:

1. **Derive, never invent.** A field the engine cannot establish is ABSENT, the
   evaluator returns null, the signal abstains. Absent data producing abstention
   is correct; absent data producing a plausible-looking default is not.
2. **No lookahead.** Rates are pulled with `gameDate < kickoff`, never "most
   recent N". The run cache is keyed on (team, kickoff DAY), so it can never
   serve a later game an earlier game's truth — pinned by a test that supplies
   two different realities for one team on two dates and requires both back.
3. **Bootstrap rows are dropped.** `isBootstrap` rows are synthetic early-season
   filler; mixing them into a rate manufactures precision that is not there. The
   surviving sample size is reported so thin windows stay visible.

Tested for the failure that actually matters — confidently wrong data entering a
published probability — rather than for coverage: no lookahead, no bootstrap
contamination, abstention below a 5-game minimum, abstention without a league
benchmark, and a clean fail-closed on a data-layer throw.

### The schedule family — also live now

The SITUATIONAL family still abstained after the first two commits, and not for
a missing source: `context-enrichment.ts` has always written restDays,
back-to-back, schedule density and opening lines to `Game`. The slate query just
never selected those columns. They are now selected and passed through.

Proven end to end: a road team on 4 days rest against a rested home team yields
raw spread penalty −2.25, log-odds tilt −0.0377, adjusted probability 0.4998.

Note for the next reader: the evaluators are written from ONE team perspective
(`IS_ROAD_TEAM` = is the evaluated team the visitor). Both REST_DAYS and
OPP_REST_DAYS come from the same two columns seen from opposite sides. Inverting
that would silently flip every situational signal, so the mapping is stated in
code and pinned from both sides in the tests.

### What this still does NOT do — and why each is correct, not merely unfinished

| Family | Blocked on | Why abstaining is right |
|---|---|---|
| MICROCLIMATE (wind, altitude, temp, turf) | **No source exists.** No weather, venue, stadium or park model in the schema at all. | There is nothing to read. Building a weather table to make these fire would be inventing the data they claim to measure. |
| LUCK (turnover luck) | `TeamGameLog` carries scores, not fumble/interception columns. | Needs a pbp-backed source. The field names are declared in the context builder so the gap is visible. |
| Offense / special teams (age, OL, QB) | Roster-age, QB-age and personnel columns do not exist. | Same as MICROCLIMATE: no source, so no signal. |
| 9 SHADOW_ONLY stubs (officials, coaching, redzone, trench, contract) | Their real evaluators exist and are unit-tested, but they take PER-PLAY context: `refereeName`, `crewFlagsPerGame`, `down`/`distance`, `coachAggressivenessScore`. None of that is in the schema or on the Game row. | Verified: exactly one caller each, and it is the index barrel — never the product. The stub's `return null` is the honest answer for a game-level slate with no play-level feed. ACTIVE when per-play ingestion exists. |

The distinction that matters: a signal blocked by an UNSELECTED column is a bug
and was treated as one (that was the schedule family). A signal blocked by a
column that DOES NOT EXIST is DARK-for-missing-source, and the honest move is to
say so rather than manufacture a table.

`SignalContextCache` removes the N+1 the per-game rate lookup would otherwise
cause across a slate of 80 fixtures.

## Next, in order

1. Populate per-play ingestion context so the 23 wired continuous signals actually fire in production. The declarations are in place; the inputs are not.
2. Mark the §E families DARK-with-gate explicitly rather than leaving them silently inert.
3. Strengthen the depth/volatility assertions from `>= 0` to a real nonzero fixture.
4. Give `restAdvantageScore` and `historicalFormScore` `FactorBreakdown` fields; `grounding.ts` cannot currently list them as components.
5. Replace the `nfl_wr1_vacated_target_efficiency` local placeholder with the upstream WR1 redistributor.