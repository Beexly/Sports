# STAGED-IMPROVEMENT 6 — Reusable feature premises (unlock the promotion gate)

**Changes a published number?** Not yet. It **unblocks** the promotion
gate so that a later stage can.
**Risk:** LOW-MEDIUM. No new data source; it re-derives from records
already in the index.
**Files:** `packages/prediction-engine/src/literature/literature-index-builder.ts`
(new export), `scripts/literature/build-index.cjs` (emit the new
premises), `reconciliation/schema_literature.sql` (no change needed —
`source_ref` and `applicable_contexts` already carry what is required).

---

## Why — the promotion gate cannot be cleared as things stand

This was measured, not assumed. The promotion gate requires
`graded >= 3` **distinct games** and `activation_score > 0`.

**The index holds two kinds of premise, and neither can clear it:**

| kind | count | probability-typed? | distinct games possible | clears the gate? |
|---|---|---|---|---|
| bridge (game-scoped) | 285 | **yes** (`probability`) | **1** — it asserts about one named game | **no** |
| MIND / research (context-scoped) | 5,224 | **no** — units are `count` 1,724 / `NULL` 1,711 / `coefficient` 963 / `year` 601 / `samples` 98 / … | many | **no — not gradeable on a win/loss axis** |

**Measured consequence:** 295 residuals collapse to **38 distinct
(premise, game) claims**, `graded` maxes at **1**, and **zero** premises
qualify. 16 edges were promoted under the old row-counting rule and have
since been correctly retired.

The MIND corpus asserts things like *"a rest advantage of one day is
worth about a point"* and *"ACWR above 1.3 precedes a load-management
event"*. Those are claims about **magnitudes**, not win probabilities.
Grading a `coefficient: 0.42` premise against a binary cover is a
category error — the loop already refuses to do it
(`skipped_no_probability_claim`).

**So the gap is not code. The corpus as it exists cannot produce a
promoted edge.**

---

## The two ways forward

### Path A — grade context-scoped premises on their own axis

Each context-scoped premise has a *target metric* implied by its unit
(`points`, `count`, `samples`, `coefficient`). Grading it means comparing
its claim against **that quantity observed in a real game**, not against
a win/loss.

**Requires:** the residual table to carry the premise's target metric
rather than a binary outcome, and a metric-resolution step that can look
up "the rest-adjusted margin for game X" or "the injury-days for team Y
in week W".

**This is the larger change.** It is also the most faithful reading of
"Layer 2 is living fuel": a premise about rest should be checked against
the rest-adjusted margin, not against the cover.

**Cost estimate:** a new target-metric resolver per unit family, a
`lit.residual` shape change (add `target_value`, `target_metric`),
and a scoring rule per unit family. **Do not attempt this before Path B
lands** — Path B is a prerequisite for the gate to be reachable at all,
and it is far cheaper.

### Path B — promote the bridge model's coefficient signs (RECOMMENDED FIRST)

**Every one of the 285 bridge records already carries the reusable
content.** The raw record is:

```json
{
  "game_id": "2025_01_DAL_PHI",
  "signal_id": "pregame_context_logit",
  "outcome": "home",
  "probability": 0.8507281977552686,
  "sample_count": 6955,
  "method": "logistic-irls",
  "home_sign": {
    "margin_diff": 1, "scored_diff": 1, "allowed_diff": 1,
    "opp_scored_diff": 1, "opp_allowed_diff": 1,
    "rest_diff": 1, "dome": -1, "neutral": -1
  }
}
```

**The `probability` is a one-off fitted value for one game — not
reusable. The `home_sign` block IS reusable:** it is the sign of each
feature's coefficient in a logistic model fitted over 6,955 samples.

A reusable feature premise would assert: *"when the margin differential
favours the home side, the home side wins more often than the base rate
says."* That is gradeable against **any** game — which is exactly what
reaches 3+ distinct games.

**And it is the mechanism the doctrine asks for.** The mandate's core
complaint is that the engine reasons over "static weighted planes"
rather than over "every available signal". A coefficient-sign premise
with a measured effect is a **causal factor with evidence**, not a
weight.

---

## What changes

### 1. Derive feature premises from the bridge records

New export in `literature-index-builder.ts`:

```ts
export interface FeaturePremiseInput {
  readonly feature: string;      // e.g. "margin_diff"
  readonly sign: 1 | -1;         // the coefficient's sign
  readonly method: string;       // "logistic-irls"
  readonly sampleCount: number;  // 6955
}

export function bridgeFeatureToPremise(rec: Record<string, unknown>): PremiseInput[]
```

Each produces a premise like:

| field | value |
|---|---|
| `premise_key` | `bridge_feature:margin_diff:+1` |
| `source` | `bridge_feature` |
| `source_ref` | `margin_diff` |
| `title` | `margin_diff has a positive coefficient in the pregame_context_logit model` |
| `domain` | `model_premise` |
| `claim_type` | `model_fit` |
| `numeric_value` | `null` (the sign is the claim, not a magnitude) |
| `numeric_unit` | `sign` |
| `numeric_metric` | `margin_diff` |
| `influence_direction` | `positive` / `negative` |
| `evidence_quote` | `Fitted by logistic-irls on n=6955; coefficient sign +1` |
| `applicable_contexts` | `["pregame_context_logit", "margin_diff"]` |

**The numeric_value is deliberately null.** The claim is a direction,
not a probability — and this is what makes the **grade-on-own-axis**
work the general case needs: a sign premise is graded by whether the
feature's observed direction matched the outcome's direction, not by
comparing a magnitude to a binary.

### 2. Grade a sign premise against the game

For a game with a known result, a sign premise asserts:

> "feature F, with coefficient sign S, moved the outcome toward side X."

Grade it by computing the feature's observed direction for that game and
comparing it to the coefficient's sign, then comparing the resulting
direction to what actually happened. **This needs the feature values,
which live in `data/gse-dataset/` (the same nflverse-derived dumps the
bridge model was fitted on).**

**This is the real work of this stage**, and it is a feature-value
resolver, not a schema change.

### 3. The honest gate for THIS kind of premise

A sign premise is a **model claim about a coefficient**, and the honest
measure is not Brier against a binary. It is:

```
support   = distinct games the feature was observed in
direction = did the feature's observed sign agree with the outcome?
weight    = (agreement_rate - 0.5) * min(support / MIN_SUPPORT, 1)
```

**A sign premise with 3 games and 2 agreements gets weight 0.067.** It
must earn its way up like everything else. **The kill line is the same
one: `maxBrierScoreVsMarket 0.250`, `minSettledSample 100`.**

### 4. Do NOT let these premises move `trueProb` yet

A feature premise carries a *direction*, not a magnitude. Without a
calibrated effect size it cannot shift a probability honestly. So these
premises:

- are retrievable and gradeable (they build up support and effect size);
- are promoted to causal edges when they clear the gate;
- are eligible for the intervention test;
- **but contribute 0 to `trueProb` until their effect size is measured
  against the market** (which is STAGED-IMPROVEMENT 4's job).

**This mirrors the existing gate discipline:** the corpus evaluator runs
its modules but `corpusWeight` stays 0 until the promotion gate passes.

---

## Acceptance

- [ ] Every one of the 8 `home_sign` features becomes a premise, with
      `numeric_value = null` and `numeric_unit = 'sign'`.
- [ ] A sign premise is gradeable: it records agreement/disagreement per
      game, and `graded` counts DISTINCT GAMES.
- [ ] A sign premise that disagrees more often than chance earns
      `activation_score = 0` (clipped, never negative).
- [ ] Sign premises with < 3 distinct games cannot be promoted.
- [ ] A sign premise contributes **0** to `trueProb` until its effect size
      is measured against the market.
- [ ] The `unitIsProbability` guard in the residual loop is **not**
      widened to include `sign` — a sign premise is graded by direction,
      through its own code path, not by the binary path.
- [ ] Tests: a premise with 2 games and 2 agreements is NOT promoted; 3
      games and 3 agreements IS.
