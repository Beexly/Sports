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

## B. ACTIVE continuous signals — 31, weighted, tested, and MUTED

Every one has: a real `evaluate`, a real `trustWeight` (0.06–0.14), a
unit test, and **no effect on any published number**.

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

- **Wired end-to-end:** 10 probability-path signals + 9 context terms. **Exceptions:** 31 muted (§B), 3 config-dark (§E), 6 DARK families (§D).
- **Weighted with rationale:** 10/10 probability signals; context terms carry `WEIGHTS.*` constants. **Gap:** `HEAD_TO_HEAD_COMPONENT_MAX` and `VENUE_FORM_COMPONENT_MAX` are declared and never read — `game-context.ts` hardcodes 5/3.
- **Tested:** yes, though market depth and volatility penalty are only asserted `>= 0` / `<= 0`; zeroing either would leave the suite green.
- **Demonstrated in a trace:** all 10, across three real traces.
- **Honest:** §B and §E are **not** honest today. §C and §D are.

## Next, in order

1. Each continuous signal declares `homeSign`, or is marked inactive. Nothing else in this list unblocks 31 signals.
2. Mark the §E families DARK-with-gate explicitly rather than leaving them silently inert.
3. Strengthen the depth/volatility assertions from `>= 0` to a real nonzero fixture.
4. Give `restAdvantageScore` and `historicalFormScore` `FactorBreakdown` fields; `grounding.ts` cannot currently list them as components.