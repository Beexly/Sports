# Experiment Engine Standard — Galaxy Sports Edge

## Purpose

Galaxy runs experiments to **improve decision quality and clarity**, not
to maximize betting volume. Every experiment is owned, hypothesized,
metric-bounded, guardrailed, and reversible.

## Architecture

```
apps/web/lib/experiments/
├── experiments.ts   # typed registry + validation
├── variants.ts      # deterministic bucket-based assignment
├── metrics.ts       # pure metric computation helpers
└── guardrails.ts    # invariants every experiment must respect
```

## Each experiment declares

1. **Hypothesis** — a single testable sentence.
2. **Primary metric** — telemetry event + direction + expected lift.
3. **Guardrails** — telemetry events with `maxRegression` and `blocking` flag.
4. **Risk class** — low / medium / high. High requires a blocking guardrail.
5. **Surfaces** — which routes are touched.
6. **Success condition** — concrete shipping criterion.
7. **Rollback condition** — concrete kill-switch criterion.
8. **Owner** — a single named person accountable.

## Hard rules

- `confusion.*` and `restraint.*` events **cannot** be primary metrics.
  They are guardrails. Pushing them down is failure.
- Every experiment touching `picks` or `today` must include
  `restraint.responsible_play_followed` as a guardrail.
- Every experiment touching `no-bet` or `parlay-mri` must include
  `restraint.disclosure_shown` as a guardrail.
- High-risk experiments must include at least one **blocking** guardrail.
- Experiments are append-only once `status` moves to `running`.

## Forbidden experiments (no metric justifies them)

See `FORBIDDEN_EXPERIMENT_PATTERNS` in `guardrails.ts`. Examples:

- `scarcity-countdown` — manufactures urgency.
- `bandwagon-social-proof` — implies consensus to drive action.
- `hide-no-bet-list` — suppresses restraint disclosure.
- `obscure-tier-locks` — hides paywall before compare.
- `default-larger-stake` — nudges stake-up by default.
- `remove-responsible-play-link` — removes compliance disclosure.

## Assignment

Variant assignment is deterministic from `(experimentId, subjectBucket)`.
No per-user assignment record is stored. The same subject-bucket always
sees the same variant for a given experiment.

## Statistics

`minimumSampleSize(baselineRate, mde)` returns the floor at α=0.05,
power=0.8 for a proportion test. Experiments below this floor cannot
ship — the result is undecidable.

## Review cadence

- Weekly: status review of running experiments.
- Per-experiment: pre-launch policy check via `checkPolicies()`.
- Quarterly: review the forbidden patterns list. Owner-only amendments.
