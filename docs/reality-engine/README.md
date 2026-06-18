# Reality Engine — Module Index

## What the Reality Engine Is

The Reality Engine is the measurement-first "win-rate truth machine" for the Sports
prediction platform. Its job is not to predict outcomes — that is the heuristic scoring
stack (`scoring.ts`). Its job is to measure whether those predictions have any actual
edge: selection discipline, devig (removing bookmaker margin), calibration (are the
confidence numbers honest?), Closing Line Value (did the market move toward our number
after we acted?), no-bet discipline (are we suppressing bad candidates?), edge-type
learning (what kinds of mispricing do we actually detect?), and backtest proof.

The moat this platform is building is calibration plus proof — not prediction magic.
Any pick can be right for the wrong reasons. The Reality Engine exists to separate
process from luck and to record that separation in a form that holds up to scrutiny.

## The Honest Win-Rate Framing

At standard −110 juice the break-even win rate is **52.38%** (110 / 210). A raw win
rate above 50% does not imply profit. A blended 70% win rate would be fabrication at
any meaningful sample size; no documented long-run sports-betting model sustains that
rate against a vig-adjusted market. The realistic target is sustained calibration above
52.38%, with CLV beat-close rate as the leading indicator of process quality.

See [`docs/path-to-70.md`](../path-to-70.md) for the win-rate strategy of record and
[`docs/adr/001-public-performance-policy.md`](../adr/001-public-performance-policy.md)
for the rules governing what performance claims can be published.

## The Inertness Principle

Every module documented here is implemented but **inert** — weight 0, read-only, and
NOT imported by `scoring.ts` or any live request path. The
`packages/prediction-engine/src/__tests__/inert-edge-modules.guard.test.ts` test
enforces this mechanically: it will fail the build if any K2 module is imported by
the live scoring path.

**Nothing in this directory reaches a published confidence score until:**

1. A `MODEL_VERSION` bump is made in `scoring.ts`.
2. A `CalibrationProposal` document is placed in `docs/calibration-proposals/`.
3. The proposal demonstrates held-out calibrated ECE ≤ raw ECE (i.e., calibration
   genuinely holds on unseen data, not just on the training set).
4. An owner approves and merges the proposal.

This gate exists because an uncalibrated probability is a guess dressed as a number.
Publishing a confidence score derived from an uncalibrated model misleads subscribers.

## Built Modules

| Module doc | Source file | Test file | Status |
|---|---|---|---|
| [edge-type.md](edge-type.md) | `packages/prediction-engine/src/edge-type.ts` | `src/__tests__/edge-type.test.ts` | implemented-inert / weight 0 |
| [pick-autopsy.md](pick-autopsy.md) | `packages/prediction-engine/src/pick-autopsy.ts` | `src/__tests__/pick-autopsy.test.ts` | implemented-inert / weight 0 |
| [sovereign-edge-index.md](sovereign-edge-index.md) | `packages/prediction-engine/src/sovereign-edge-index.ts` | `src/__tests__/sovereign-edge-index.test.ts` | implemented-inert / weight 0 |
| [market-gravity-temporal.md](market-gravity-temporal.md) | `packages/prediction-engine/src/market-gravity-temporal.ts` | `src/__tests__/market-gravity-temporal.test.ts` | implemented-inert / weight 0 |
| [market-lie-detector.md](market-lie-detector.md) | `packages/prediction-engine/src/market-lie-detector.ts` | `src/__tests__/market-lie-detector.test.ts` | implemented-inert / weight 0 |
| [no-bet-observability.md](no-bet-observability.md) | `packages/prediction-engine/src/no-bet-ledger.ts` | `src/__tests__/no-bet-ledger.test.ts` | implemented-inert / weight 0 |
| [backtest.md](backtest.md) | `apps/web/lib/reality/backtest.ts` | `apps/web/lib/reality/__tests__/backtest.test.ts` | implemented-inert (offline-only) |

The inertness guard test:
`packages/prediction-engine/src/__tests__/inert-edge-modules.guard.test.ts`

## What Is Deliberately Not Built Yet

The following capabilities are design-deferred. They are named in the K0 audit and
measurement reports and blocked on owner decisions, data-feed procurement, or schema
approvals — not on implementation effort.

| Capability | Why deferred | K0 reference |
|---|---|---|
| No-Bet DB Ledger (K3) | Requires schema approval + owner gate; must persist rejected markets to settlement before discipline can be proven as alpha | [no-bet-quality-measurement-plan.md](../../reports/reality-engine/no-bet-quality-measurement-plan.md) |
| Market-replay warehouse | Requires a time-series Odds snapshot store beyond what is currently persisted | [data-capture-gap-matrix.md](../../reports/reality-engine/data-capture-gap-matrix.md) |
| News / weather / referee feed ingestion | Rights-gated data feeds; no approved source yet | [edge-type-taxonomy-v1.md](../../reports/reality-engine/edge-type-taxonomy-v1.md) |
| Causal graph (edge-type → outcome attribution) | Requires settled CLV sample ≥ 100 per edge-type bucket before the causal premise can be tested | [workstream-k-activation-audit.md](../../reports/reality-engine/workstream-k-activation-audit.md) |
| CLV validation pipeline (K3) | Requires the closing-line capture to mature and the No-Bet Ledger to exist | [clv-quality-measurement-plan.md](../../reports/reality-engine/clv-quality-measurement-plan.md) |
| Autopsy → learning feedback loop | Requires the K3 No-Bet Ledger + a settled sample ≥ 100 before learning updates are safe | [pick-autopsy-taxonomy-v1.md](../../reports/reality-engine/pick-autopsy-taxonomy-v1.md) |

None of these are omissions. They are named design-deferred capabilities with clear
unlock conditions. Building them before the data and calibration conditions are met
would produce noise that looks like signal.

## Related Doctrine

- [`docs/brain/calibration-feedback-loop.md`](../brain/calibration-feedback-loop.md) — the calibration doctrine this engine serves
- [`docs/brain/market-gravity.md`](../brain/market-gravity.md) — the point-in-time gravity index (complement to market-gravity-temporal)
- [`docs/brain/signal-ledger.md`](../brain/signal-ledger.md) — signal ownership and provenance rules
- [`docs/brain/claim-governance.md`](../brain/claim-governance.md) — rules for what can be published as a performance claim
- [`docs/path-to-70.md`](../path-to-70.md) — win-rate strategy of record
- [`docs/adr/001-public-performance-policy.md`](../adr/001-public-performance-policy.md) — the public performance policy ADR

## K0 Audit and Measurement Reports

- [`reports/reality-engine/workstream-k-activation-audit.md`](../../reports/reality-engine/workstream-k-activation-audit.md)
- [`reports/reality-engine/edge-type-taxonomy-v1.md`](../../reports/reality-engine/edge-type-taxonomy-v1.md)
- [`reports/reality-engine/pick-autopsy-taxonomy-v1.md`](../../reports/reality-engine/pick-autopsy-taxonomy-v1.md)
- [`reports/reality-engine/no-bet-quality-measurement-plan.md`](../../reports/reality-engine/no-bet-quality-measurement-plan.md)
- [`reports/reality-engine/clv-quality-measurement-plan.md`](../../reports/reality-engine/clv-quality-measurement-plan.md)
- [`reports/reality-engine/minimum-viable-win-rate-loop.md`](../../reports/reality-engine/minimum-viable-win-rate-loop.md)
