# GSE eval preregistration template (measurement-first)

Source pattern: @datasciencebrain 2026-09-11 ("Not the pipeline. The measurement." — Start Here / action board): write the success criterion into code BEFORE running anything, commit it so the goalposts can't move, publish the failures anyway, exact tests not vibes, validity gates that can void your own results. This template makes it a GSE habit.

Copy this file per experiment. Fill it, commit it, THEN run.

```markdown
# Eval preregistration — <experiment name> — <date>

## Hypothesis (one sentence)
<e.g. TimesFM-3 zero-shot beats the naive seasonal baseline on daily site-traffic forecasting.>

## Dataset (frozen)
- Source: <table/query + row count>
- Train/cutoff: <dates> | Test window: <dates> — no peeking past the cutoff.

## Success criterion (written before running; this is the contract)
- Primary metric: <e.g. scaled MAE / CLV sign rate / calibration ECE>
- Threshold: <e.g. "beats baseline by ≥5% relative">
- Sample size: n=<...> fixed in advance.

## Validity gates (any one voids the result, including a win)
- [ ] No train/test leakage (cutoff respected)
- [ ] Baseline is the real incumbent, not a strawman
- [ ] No threshold tuning after seeing the answer
- [ ] Exact test used (McNemar / binomial / paired), p reported

## Kill rule
<If the criterion is not met at n, the experiment dies. No "one more tweak.">

## Results (filled after)
- Outcome: MET / NOT MET
- Numbers: <...>
- Published anyway: yes (a failing number is proof the threshold wasn't tuned)
```

Applies to: TimesFM-3 eval, the prop-prompt pack validation, any new metric from the benchmark lane. The engine-benchmark standing rule already demands this discipline — this is the form.
