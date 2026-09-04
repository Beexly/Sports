# The 6.5–9.5 calibration leaf drift is not sampling noise

Hermes flagged this in H-N6 and left it without an owner or an explanation. This
characterises it. **No behaviour is changed by this document** — no gate flipped,
no `MODEL_VERSION` bump, no calibration constant touched.

## Source

`docs/data/MARKET_CALIBRATION_2026-09-04-reproduction.txt`, lines 43–51 —
variable-based calibration, train on seasons ≤ 2015, evaluate 2016–2025. Each
leaf's training-period base rate is compared against what actually happened in
the test period.

## 1. The drift is not explained by sampling noise

| leaf | n (test) | train base | test actual | Δ (pp) | z | p (2-sided) | leaf Brier |
|---|---:|---:|---:|---:|---:|---:|---:|
| PK-1 | 188 | 46.81% | 46.81% | +0.00 | 0.00 | 1.00 | 0.2490 |
| 1.5–2.5 | 447 | 50.94% | 50.11% | −0.83 | −0.35 | 0.73 | 0.2501 |
| 3–6 | 1196 | 50.00% | 52.01% | +2.01 | +1.39 | 0.16 | 0.2500 |
| **6.5–9.5** | **576** | **65.86%** | **57.12%** | **−8.74** | **−4.42** | **9.7e−06** | **0.2526** |
| 10+ | 343 | 74.43% | 72.89% | −1.54 | −0.65 | 0.51 | 0.1979 |

`z` is against the training base rate with `SE = sqrt(p(1−p)/n)`. Bonferroni
across the five leaves gives p = 4.9e−05 for 6.5–9.5, so this is not the
one-in-twenty you expect from testing five things.

Stated precisely: **under this test, a deviation this large is very unlikely to
arise from sampling variation alone.** That is what a p-value licenses. It is not
proof that no chance process produced it.

## 2. A uniform league-wide drift is rejected

The obvious mechanism is a league-wide decline in home-field advantage, which
would shift every leaf by roughly the same amount. The per-leaf tests in §1 do
**not** settle this — they compare each leaf against its own training rate and
never test the leaves against each other. Two reviewers (CodeRabbit, cubic)
flagged that gap independently and were right to. So here is the test that
actually addresses it.

**Cochran's Q**, H0 = all five leaves share one common drift, weights `1/var_i`:

```text
common-drift estimate   -1.46 pp
Cochran's Q             19.57 on 4 df
heterogeneity p         6.07e-04
I²                      79.6%
```

H0 is rejected. About 80% of the cross-leaf variation is real heterogeneity
rather than sampling error, so the leaves are not moving together.

**Contrast, 6.5–9.5 against the other four pooled:**

```text
others pooled Δ         +0.59 pp  (SE 1.05)
6.5-9.5 Δ               -8.74 pp  (SE 1.98)
z = -4.17               p = 3.03e-05
```

The other four leaves collectively did not drift; 6.5–9.5 did, and the
difference between them is significant on its own.

Conclusion, now earned rather than asserted: **a uniform league-wide shift does
not fit these data.** The effect is concentrated in the 6.5–9.5 band and the
mechanism is unexplained. No mechanism is invented here.

**What this does NOT establish**, because the heading of this section previously
overstated it and CodeRabbit was right to flag it: Q tests one null — that the
five leaf drifts share a single common value. Rejecting it does not rule out a
league-wide effect. A league-wide component can coexist with leaf-specific ones,
and Q cannot separate the two. The claim that survives is the narrow one: the
leaves did not move together, and 6.5–9.5 moved most.

## 3. Why it matters

**The per-leaf value comparison is OPEN. Do not assert it either way.**

What is established, straight from the run: the per-leaf test n, outcome rate
and leaf Brier in §1, and a weighted leaf Brier of **0.2440** against a single
global mean of **0.2478**, so the leaf model beats the global mean **in
aggregate** by 0.0038.

**Against the 0.25 coin-flip line, no leaf is distinguishably worse, and the
only significant result is that 10+ is better.** Comparing a leaf's Brier to
0.25 is valid arithmetic — 0.25 is the coin-flip Brier on any segment
regardless of its rate — but a point estimate is not a verdict. Taking the
paired per-observation difference `d = (q−y)² − (0.5−y)²`, with `q` the leaf's
forecast and `p` its outcome rate:

| leaf | n | Brier | mean d | SE | 95% CI | verdict |
|---|---:|---:|---:|---:|---|---|
| PK-1 | 188 | 0.2490 | −0.00102 | 0.00232 | [−0.0056, +0.0035] | not distinguishable |
| 1.5–2.5 | 447 | 0.2501 | +0.00007 | 0.00044 | [−0.0008, +0.0009] | not distinguishable |
| 3–6 | 1196 | 0.2500 | 0.00000 | 0.00000 | — | not distinguishable |
| 6.5–9.5 | 576 | 0.2526 | +0.00257 | 0.00654 | [−0.0103, +0.0154] | not distinguishable |
| 10+ | 343 | 0.1979 | −0.05216 | 0.01173 | [−0.0751, −0.0292] | **better than coin flip** |

An earlier version of this section said "two leaves exceed the coin-flip line",
and the version before that called 6.5–9.5 "the only clear one". Both were point
estimates dressed as findings. 6.5–9.5's interval spans zero comfortably at
n=576. Devin caught it.

What is NOT established is **which individual leaves beat the global predictor
on their own segment.** A leaf's Brier is conditional on that leaf, so it cannot
be set against the global predictor's all-leaf aggregate of 0.2478. The
like-for-like question is what the global predictor scores *on that leaf*, which
requires the constant the predictor actually emits. `scripts/analytics/replay-calibration.ts:439`
fits that constant as the mean of the **training** set (seasons ≤ 2015),
evaluated on test:

```text
brierOf(testAll, () => trainAll.reduce((s, x) => s + x.y, 0) / trainAll.length)
```

That training mean is not printed anywhere in the reproduction output, and
inverting the published 0.2478 for it admits two roots (≈0.5323 and ≈0.5681) and
is unstable to rounding at the fourth decimal. So the per-leaf verdict is **not
recoverable from what has been published.**

To settle it: print the training-set mean and `n_train` per leaf from
`replay-calibration.ts`, then compute each leaf's global baseline as
`p_test(1−q_train)² + (1−p_test)q_train²`. Until that is run, any claim of the
form "N leaves beat the global mean" is unsupported, in either direction.

The 6.5–9.5 leaf's standing does **not** depend on this. It is the only leaf
whose base-rate drift is significant, and that is what separates a leaf that is
merely uninformative from one that is confidently wrong: a 65.86% prior applied
to a band that delivers 57.12%, across 576 games.

### Record of a three-step error in this section

Kept in full, because the shape of it is the lesson.

1. The first draft said 6.5–9.5 was "the only leaf actively worse than doing
   nothing."
2. cubic objected that four leaves lose to the 0.2478 baseline. I accepted it
   and rewrote the section — **without checking the objection's arithmetic.**
3. Devin flagged that the objection used a mismatched baseline. I recomputed
   with `q` = the **test** outcome rate, reinstated step 1, and published a
   table of per-leaf deltas.
4. Devin flagged again: the predictor is fitted on the **training** mean, not
   the test mean (line 439 above). My recomputation used the wrong constant, so
   that table was wrong too.

Three assertions, three different wrong answers, each one more confident than
the last because each came with more arithmetic attached. The correct move —
available at every step — was to say the data does not settle it. That is what
this section now says.

A retraction is a claim. A recomputation is a claim. Both need the same standard
of evidence as the thing they replace.

## 4. Recommendation (not applied)

Until the mechanism is understood, the 6.5–9.5 leaf should not be used as a
calibration prior — collapse it into a neighbouring band or fall back to the
global mean for that range. That is a calibration-behaviour change gated by
`CALIBRATION_ADJUSTMENTS_ENABLED` and the model-freeze guard, so it is the
owner's call and an owner's edit, not an agent's.

## 5. Limits of the numbers above

- **The training base rate is treated as fixed.** Every `z` here, including the
  −4.42 and the Cochran's Q weights, uses `SE = sqrt(p_train(1−p_train)/n_test)`
  and ignores estimation error in `p_train` itself. That makes |z| **optimistic**
  and the reported p-values **lower-bound approximations**. The reproduction file
  does not print the training-side count, so a proper two-proportion test cannot
  be run from it. Get `n_train` per leaf and re-run before quoting these figures
  anywhere load-bearing.
- Whether the corrected p-values would still clear a chosen threshold cannot be
  stated until both `n_train` and that threshold are fixed. The direction of the
  bias is known; its size is not.

## 6. What would explain it

Testable next steps, cheapest first:

1. **Split the band.** 6.5, 7, 7.5, 8, 8.5, 9, 9.5 are not one thing. The key
   number 7 (a touchdown) behaves differently from 8.5. If the drift concentrates
   on one or two hooks, that is the finding.
2. **Split by season.** A step change (a rule change, 2020 empty stadiums) looks
   different from a gradual slope, and distinguishes them cleanly.
3. **Get `n_train` per leaf** and redo §1 and §2 as proper two-proportion tests.
