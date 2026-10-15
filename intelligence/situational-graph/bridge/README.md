# Reasoning Bridge v1 — census C-224

Branch: `motif/bridge-model-2026-10-15` (off main `9a989b3`).
Assembled from: the C-224 census record (Comprehensive Architecture Audit,
Drive 2026-10-07, via the follow-on census pass), the 47-signal registry
(`intelligence/signals/registry.json`), and situational graph v1
(`motif/situational-graph-v1-2026-10-15` @ `db0ef37`).

## What this is

The **bridge**: it converts stamped context scalars from registered signals
into **directional premises** for the Layer 2 reasoning layer — the piece
the audit called the missing link ("forty-seven registered signals
produc[e] descriptive context… yet [the pipeline] lacks a functional bridge
model to map these scalars into directional premises"), and the ingestion
ledger's #1 no-home-yet build ("every other reasoning surface multiplies
through this").

A premise is a reasoning artifact:

```
{premise_id, game, subject, kind, direction, magnitude_band,
 confidence_class, statement, evidence[], as_of,
 trace{rule_id, rule_version, registered_signals[]}}
```

It is **not a model output**: no probability, no pick, no score, no CRPS
claim, and nothing here feeds emission. The module enforces the situational
graph's fence in both directions — any input or output carrying a
`probability` / `pick` / `crps` / `emission`-shaped key at any depth is
refused, fail-closed. `emission_state` stays `ZERO_OBJECT`.

## Divergence from the audit text (recorded, not hidden)

The audit's premise shape was `{outcome, probability, sample_count,
homeSign}` — it asked for directional win *probabilities*. The fleet's
Reasoning-Engine Doctrine (2026-10-15) supersedes that shape: premises
carry direction, a magnitude band, a confidence class, evidence links and
an as-of stamp — never a probability (a probability in a premise is an
emission wearing a premise's clothes). This build follows the audit on
**function** (registered scalars in, directional premises out, the
reasoning-trace requirement below) and the doctrine on **shape**.

Separately: this package is Python, beside the graph it consumes, and is
**not** `packages/prediction-engine/src/bridge/bridge-model.ts`. That file
already exists on main and is a different construct — a logistic-IRLS
probability model over eight team-stat features (the pregame context
bridge, census C-125). It consumes no registered-signal scalars and emits
exactly the probability this layer forbids. The name collision is the
census's, recorded here so nobody conflates the two.

## The trace rule

From the audit: slate generation rejects "any selection that lacks an
active, positive reasoning trace." Implemented as `select_premises()`: a
premise is selectable only if its evidence list is non-empty and every
cited edge exists in the source graph. Untraceable premises are refused
with reasons, never silently passed. The builder additionally refuses to
emit any premise it cannot trace.

## PIT discipline

`build_premises(graph, rules, read_at)` consumes only edges visible at
`read_at` (the graph's `visible_at` semantics: `as_of` null, or
`as_of <= read_at`). A future-stamped edge is excluded **and named** in the
output's `pit_excluded` list. The premise constructor re-enforces the rule:
a future-stamped evidence edge raises `BridgeRefusal`. When the graph
package is importable, the bridge uses its `visible_at` /
`FORBIDDEN_VALUE_KEYS` directly; otherwise it uses byte-equal mirrors
(pinned by test).

## Magnitude bands are not effect sizes

Bands band the scalar's own extremity (days of rest differential; feet
above the graph's own 4,000 ft threshold), per the versioned tables in
`rules.json`. No band encodes a fitted win effect and no premise claims
one.

## Rules v1 (rules.json)

| rule | scalar | registered signals (crosswalk) |
|---|---|---|
| rest_differential | `rest_diff_home_minus_away` (days) | nfl_short_week_road_deficit, nfl_age_conditioned_rest (partial) |
| altitude_exposure | elevation − threshold (ft) | nfl_high_altitude_fatigue |
| altitude_short_week_composite | elevation + visitor rest | nfl_high_altitude_fatigue, nfl_short_week_road_deficit |
| short_week_game_context | both teams' rest days | nfl_short_week_road_deficit |
| coaching_continuity | changed_this_season + tenure span | nfl_coaching_tendencies (partial) |

The crosswalk is partial by honesty: most registered NFL-signal evaluators
read env keys with zero production writers or return null (registry.json's
own evidence), so their scalars have no stamped home yet. The graph edges
above are the first stamped homes for the situational subset. Everything
the graph marks `honest_empty` (injury burden, weather, authored reads)
propagates to the premise document's `not_consumed` list with its reason —
the bridge never invents a premise over missing facts.

## Worked example

Input: `inputs/2026-week06-sea-at-den.graph.json` — byte-identical copy of
the graph v1 instance (sha256
`f0f223133591468968bdd711a76f17987cca7fb3a574ff8ab25e65964ab2d875`,
source branch `motif/situational-graph-v1-2026-10-15` @ `db0ef37`).
Read at 2026-10-15 (gameday):

```
python3 bridge.py --graph inputs/2026-week06-sea-at-den.graph.json \
    --read-at 2026-10-15 --out instances/2026-week06-sea-at-den.premises.json
# premises: 5 | not_consumed: 13 | pit_excluded: 0
```

The five SEA@DEN premises: altitude exposure on SEA (STRONG, AGAINST_AWAY);
altitude+short-week composite friction on SEA (STRONG, FRICTION — recorded
as variance/friction, not a mean shift); rest level (NEUTRAL); both teams
short-week game context (NEUTRAL, MODERATE); DEN defensive continuity
(WEAK, FAVORS_HOME). No injury premise exists — the injury input is
unstamped, and the bridge says so instead of inventing one.

## Tests

```
python3 -m pytest tests/test_bridge.py   # 16 tests
```

Traceability (every premise cites real edges; `as_of` = latest evidence
stamp), PIT (future-stamped edge named + unconsumed; constructor refusal;
earlier read sees strictly less), fence (probability/pick keys rejected at
depth, in and out; fence set byte-equal to graph.py's), determinism
(byte-identical rebuilds), honest-empty propagation, input immutability.
