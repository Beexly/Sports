# Sports OS — Model Benchmark Lab

**Status**: Doctrine. Defines benchmark methodology for all predictive models.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/models/answer-eval-benchmark-lab.md` — AI content generation eval (distinct scope)
- `docs/models/ragflow-governance.md` — RAG model governance
- `docs/performance/sports-science-evidence-vault.md` — evidence inputs
- `docs/brain/calibration-feedback-loop.md` — calibration loop
- `docs/brain/picks-intelligence.md` — pick output requirements

---

## Purpose

The Model Benchmark Lab defines the evaluation framework for Sports OS's
**predictive models** — specifically the prediction engine that scores picks,
ranks confidence, and integrates evidence signals. This is distinct from
`docs/models/answer-eval-benchmark-lab.md`, which evaluates AI content
generation (Claude API outputs).

This document covers:
- How prediction models are benchmarked before deployment
- What constitutes a meaningful performance threshold
- How to prevent overfit claims (the "our model hits at 68%" problem)
- How model versions are compared against each other
- What invalidates a benchmark result

No model version may be promoted to production without passing all benchmarks
defined here.

---

## Source Evidence from Line Audit

Wave 3 audit reviewed sports prediction benchmarking practices across:

**Open sports prediction repositories**:
- nflgame, nfldb, nflscrapR (R), nflfastR — NFL play-by-play with expected
  points and win probability models
- pybaseball (Python) — Statcast wrangling; WOBA, FIP, and advanced pitching
  metrics with benchmarked formulas
- Expected Points Added (EPA), Win Probability Added (WPA) — NFL analytics
  community standards with documented methodology
- Sports-reference Pythagorean win expectation — baseball expected wins

**Key finding**: Credible sports models are benchmarked against:
1. A documented time-period split (training vs. holdout)
2. Baseline comparators (naive model, market consensus, random)
3. Long-run calibration (not just point accuracy — confidence calibration)
4. Sample size sufficiency (minimum picks before claiming a win rate)

Benchmarks that lack time-series splits, compare to no baseline, or
run on insufficient samples are not credible and must not be cited publicly.

---

## User Value

- Users know that the "confidence score" on a pick reflects a model that
  has been tested against historical data, not reverse-engineered to look good.
- Published win rates are always bound to a specific model version, time
  window, and minimum sample — never abstract claims.
- When a model version is updated, users can see what changed and why.

---

## Operator Value

- Operator can defend any published performance claim with a specific
  benchmark record.
- Model versions are auditable: if picks from version X underperform,
  the operator can diagnose which component changed.
- Prevents the "our model hits at 68%" trap that creates legal and brand risk
  when the claim cannot be substantiated.

---

## Current Sports OS Fit

The current prediction engine (`packages/prediction-engine/`) scores picks
based on odds-line logic and confidence scoring. The calibration feedback
loop (`docs/brain/calibration-feedback-loop.md`) defines how settlement data
recalibrates the model. The Model Benchmark Lab adds a formal evaluation gate
that must be passed before any model version change reaches production.

No standalone benchmark runner exists yet. Implementation of a benchmark
runner would be a Zone 2 action (new additive module, no existing file modification).

---

## Benchmark Framework

### Dimension 1 — Prediction Accuracy

**What it measures**: Over a holdout period (never training data), what
percentage of picks with confidence ≥ 60 won vs. lost?

**Required splits**:
- Training window: at least 1 full season of historical odds + results
- Holdout window: at least 1 full season NOT included in training
- Production window: rolling real-time, evaluated after each 30-pick batch

**Baseline comparators** (all required):
- Naive model: Always pick the favorite
- Market model: Follow closing line (consensus)
- Prior model version: Direct head-to-head

**Pass condition**: New model must outperform or match prior model version
on the holdout set. If it underperforms the naive "always pick favorite"
baseline, it is REJECTED regardless of absolute win rate.

---

### Dimension 2 — Confidence Calibration

**What it measures**: When the model assigns confidence 70, do approximately
70% of those picks win? When it assigns 80, do 80% win?

**Method**: Calibration curve — plot predicted confidence vs. actual win rate
in 10-point buckets (50–59, 60–69, 70–79, 80–89, 90–100).

**Pass condition**: No bucket deviates from predicted by more than ±15
percentage points over a minimum 30-pick sample per bucket.

**Why this matters**: A model that shows "90% confidence" picks winning
at 52% is miscalibrated — the confidence score is meaningless. Miscalibrated
models are not permitted in production.

---

### Dimension 3 — Sample Sufficiency

**What it measures**: Whether the pick volume is sufficient to make any
statistical claim about performance.

**Minimum thresholds**:
- Reporting any win rate publicly: ≥ 30 settled picks, same model version,
  same time window
- Reporting by sport: ≥ 30 picks per sport per model version
- Reporting by pick type: ≥ 30 picks per type (spread, moneyline, total)
- Claiming "this model hits at X%": ≥ 100 settled picks, same version,
  same window

**Enforcement**: The compliance scanner must block any content that claims
a win rate below the applicable minimum sample threshold.

---

### Dimension 4 — Robustness Against Edge Cases

**What it measures**: Model behavior when evidence is thin, stale, or
contradictory.

**Test cases**:
- Thin evidence: Only T4 sources available — does model correctly flag LOW confidence?
- Stale evidence: T1 source TTL exceeded — does model block the pick or flag WITHHELD?
- Contradictory signals: Odds move against model prediction — does model acknowledge?
- Missing data: Key player injury report not yet filed — does model withhold or disclose?

**Pass condition**: 100% of edge case scenarios produce appropriate
uncertainty handling. Any case where the model produces a confident pick
from insufficient evidence is a FAIL.

---

### Dimension 5 — Version Comparison

**What it measures**: Whether a new model version represents a real improvement
or is within margin of noise.

**Method**: A/B comparison on the same holdout set using:
- Brier score (probability forecasting accuracy)
- Log loss (calibration-sensitive)
- Win rate delta (simple accuracy)
- Confidence calibration delta (bucket-level)

**Pass condition**: New version must show statistically meaningful improvement
(p < 0.05 on holdout set over 100+ picks) on at least one dimension while
not meaningfully regressing on any other. If the improvement is within noise,
the prior version is retained.

---

## Benchmark Scorecard

```
Model Version: [version string — e.g., v1.2.0-2026-05]
Benchmark date: [ISO date]
Evaluator: [Operator name]
Training window: [start date – end date]
Holdout window: [start date – end date]
Total holdout picks: [N]

Dimension 1 — Prediction Accuracy
  Win rate (all picks): [%]
  Win rate vs. naive baseline: [+X% | -X%]
  Win rate vs. market model: [+X% | -X%]
  Win rate vs. prior version: [+X% | -X%]
  Pass/Fail: [PASS | FAIL]

Dimension 2 — Confidence Calibration
  Worst-case bucket deviation: [±X pp]
  Pass/Fail: [PASS if ≤ ±15pp | FAIL]

Dimension 3 — Sample Sufficiency
  Total settled picks: [N]
  Min per-sport: [N]
  Min per-type: [N]
  Pass/Fail: [PASS if all ≥ 30 | FAIL]

Dimension 4 — Edge Case Robustness
  Edge case scenarios run: [N]
  Failures (confident pick from insufficient evidence): [N]
  Pass/Fail: [PASS if 0 failures | FAIL]

Dimension 5 — Version Comparison (if applicable)
  Prior version: [version string]
  Brier score delta: [+X = better | -X = worse]
  Log loss delta: [+X = better]
  Meaningful improvement: [YES | NO]
  Pass/Fail: [PASS | FAIL | N/A — first version]

OVERALL: [PASS — all dimensions passed | FAIL — [list failing dimensions]]
Deployment recommendation: [APPROVED | REJECTED — [reason]]
```

---

## Forbidden Actions

- Do NOT deploy a model version without a completed scorecard
- Do NOT lower a pass threshold to make a failing model pass
- Do NOT claim a win rate without meeting the minimum sample thresholds
- Do NOT use training data as the holdout dataset (data leakage)
- Do NOT compare against a cherry-picked baseline
- Do NOT suppress a dimension from the scorecard because it would fail
- Do NOT report a model version's performance over a hand-selected favorable window

---

## Licensing / Security Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Holdout data accidentally included in training | P1 | Strict time-split enforcement |
| Win rate claim before minimum sample reached | P1 | Compliance scanner enforcement |
| Benchmark scorecard not stored with model version | P1 | Codex audit requirement |
| External party manipulates benchmark inputs | P1 | Benchmark inputs signed and locked |
| AI-generated evaluation outputs used as sole measurement | P0 | Human evaluation required for Dimension 4 |

---

## MVP Path

**MVP**: Implement the Dimension 3 (sample sufficiency) check as a gate
in the compliance scanner — this prevents premature win rate claims.
This is the highest-leverage near-term benchmark control.

**V2**: Implement Dimension 1 and 2 (prediction accuracy + calibration)
with a holdout evaluation runner as a new additive package
(`packages/prediction-engine/benchmark/`).

**V3**: Automate Dimension 5 (version comparison) as a CI check when a
new model version is committed.

---

## Future Version

**Long-term**: Real-time calibration dashboard in the Operator Cockpit
showing live confidence calibration curves as picks settle.

---

## Validation Requirements

A task is NOT complete until:
- Every production model version has a completed benchmark scorecard
- Scorecard is stored alongside model version metadata
- Compliance scanner enforces minimum sample thresholds before any
  win rate claim is published
- Benchmark holdout window does not overlap with training window
- At least one human has reviewed Dimension 4 edge case results

---

## Approval Gates

| Action | Approving party |
|---|---|
| Promoting any new model version to production | Owner (after scorecard review) |
| Lowering any benchmark threshold | Owner (documented justification required) |
| Publishing any win rate claim | Operator (compliance scanner must clear first) |
| Adding a new benchmark dimension | Operator |
| Removing a benchmark dimension | Owner (may not remove if only gate for a claim type) |

---

## Codex Audit Requirements

1. Confirm every deployed model version has a completed benchmark scorecard
   stored in the repository
2. Confirm compliance scanner enforces minimum 30-pick sample before any
   win rate claim reaches a user
3. Confirm no win rate claims appear in any public content without a model
   version and time window citation
4. Confirm holdout evaluation data is not used in model training
5. Report any model version in production without a scorecard as P1
