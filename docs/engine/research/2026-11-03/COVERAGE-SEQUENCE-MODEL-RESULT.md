# Coverage Sequence Model — First Real Signal (BDB 2025, Week 1)

**Run:** `scripts/ops/train_coverage_sequence.py --weeks 1 --folds 3 --epochs 6`
**Model:** `intelligence/vision/coverage_sequence_model.py`
**Output:** `cov_seq.json`
**Data:** BDB 2025 tracking, week 1 — 4,510,415 tracking rows, 1,210 plays matched,
65,774 non-null `pff_defensiveCoverageAssignment` labels across 19 classes,
8,176 defender rows per horizon.

## Result

| Horizon | Accuracy | Macro F1 | Majority baseline | Delta vs majority |
|---|---|---|---|---|
| pre_snap | **0.3404** | 0.2403 | 0.2006 | **+0.1398** |
| through_throw | **0.4044** | 0.3125 | 0.2006 | **+0.2038** |
| through_arrival | **0.4155** | 0.3273 | 0.2006 | **+0.2149** |

**Post-snap gain (through_throw − pre_snap): +0.0640**

## Why this matters

The prior tabular/aggregate-feature model scored **0.1978 / 0.1627 / 0.1829** on the
same three horizons — *below* the 0.2006 majority baseline at every horizon. That path
was dead. This sequence model, over full trajectories (`60` timesteps × `10` features),
clears the baseline by 14–21 points and improves monotonically as the snap unfolds.

That monotone improvement is the substantive finding: coverage assignment carries real
post-snap information. The pre-snap model is not guessing the majority class; it is
reading pre-snap alignment and personnel. The +6.4 points gained after the throw means
route development genuinely disambiguates the label.

## Per-class behaviour (through_arrival)

Strong: `3M` 0.668, `3L` 0.619, `MAN` 0.597, `3R` 0.613, `4IL` 0.430, `HOL` 0.412, `HCL` 0.408.

Near-zero: `PRE` 0.000, `4OL` 0.005, `DF` 0.023, `4OR` 0.053.

These dead classes are rare-label problems, not model-capacity problems. `PRE` and `4OL`
almost certainly have a handful of examples in week 1. Macro F1 (0.3273) sits well below
accuracy (0.4155), which is the same imbalance showing up in the aggregate.

## Caveats — read before quoting these numbers

- **Single week.** Week 1 only. Coverage shells are opponent- and scheme-dependent; one
  week cannot establish a general capability floor. The 3-fold split is within-week, so
  folds share teams. This is a *within-week* generalisation estimate, not a season one.
- **Sequence truncation.** Sequences are capped at `max_len=60` timesteps. Long
  developing plays are cut, which likely suppresses the deep-shot classes (`DF`, `FL`, `FR`).
- **Log was corrupted by a duplicate run.** Two identical training processes were launched
  3 minutes apart, both writing the same log and the same output JSON. The newer duplicate
  (PID 17221) was killed; PID 17025 completed and its JSON is authoritative. The *log file*
  is interleaved garbage — quote the JSON, never the log.
- **Class imbalance untouched.** No reweighting, no resampling. The near-zero classes are
  reported as-is rather than hidden.
- **Not yet compared against a same-split tabular control.** The tabular numbers come from a
  separate earlier run. A clean apples-to-apples comparison needs the tabular model rerun on
  the identical 3 folds. That is the next calibration step, not a finished claim.

## Next steps this result justifies

1. Rerun the tabular model on the identical folds to make the comparison defensible.
2. Extend to weeks 1–8 to test whether the signal holds across opponents.
3. Address class imbalance (class weights or focal loss) for `PRE`, `4OL`, `DF`.
4. Raise `max_len` or add per-play padding masks for long developing plays.
