# RD20-08: Autopsy and Calibration Mode

Status: R&D handoff
Priority: P1
Horizon: Trust loop
Owner mode: Model QA + content

## Strategic Thesis

The product should publicly and internally learn from outcomes. Autopsy mode explains what happened, what the model believed, what changed, and what should be calibrated.

## Why This Matters Now

Most pick products hide misses. A transparent autopsy loop makes trust compound and creates strong recurring content.

## Competitor Pressure

Tout sites sell wins. GSE should sell accountability and model learning without premature performance claims.

## Current Repo Anchors

- docs/brain/calibration-feedback-loop.md
- docs/product/ledger-and-loss-room-spec.md
- docs/calibration-proposals/FROZEN.md

## External Sources

- [nflverse](https://nflverse.nflverse.com/) - Open NFL historical data ecosystem for modeling and replay.
- [W3C PROV Overview](https://www.w3.org/TR/prov-overview/) - Provenance vocabulary and interchange model for source lineage.
- [Amplitude mastering retention](https://amplitude.com/books/mastering-retention/current-user-retention) - Retention analysis through activation and habit-forming behaviors.

## Product Surfaces

- Loss Room
- weekly autopsy
- model journal
- calibration cockpit
- public methodology page

## Data Inputs

- published output snapshot
- settlement result
- closing context where approved
- source state at publication
- postgame stats
- model version

## R&D Questions

- What can be public before sample-size gates?
- Which autopsy categories are useful?
- How do we avoid hindsight bias?
- How are source reliability scores adjusted?

## MVP Plan

1. Autopsy taxonomy
2. fixture autopsy cards
3. sample-size gate rules
4. public/private copy variants

## V1 Plan

1. Settled-output autopsy records
2. model journal route
3. cockpit calibration queue
4. source reliability deltas

## V2 / Moat Plan

1. Historical replay
2. source/factor attribution analysis
3. automated draft autopsy summaries with human review
4. calibration dashboards

## Claude Build Tasks

1. RD20-08-01: Define AutopsyRecord schema and categories
2. RD20-08-02: Map current LossAutopsy/GateDecision docs into new model
3. RD20-08-03: Write sample-size gated public copy rules
4. RD20-08-04: Create fixture autopsy markdown examples
5. RD20-08-05: Add acceptance tests for no premature win-rate claims

## Acceptance Criteria

- Autopsy references original publication snapshot
- Hindsight is labeled separately from pregame evidence
- Public performance claims stay gated
- Every calibration proposal is human-reviewed

## Risk Register

- Cherry-picking
- performance claims too early
- automated weight changes
- copy drifting into apology or hype

## Metrics To Track

- autopsy page return rate
- trust survey score
- calibration proposal count
- source reliability updates

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
