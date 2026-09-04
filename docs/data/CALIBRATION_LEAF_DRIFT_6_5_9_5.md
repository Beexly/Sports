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

**The comparison has to be like-for-like.** A leaf's Brier score is conditional
on that leaf; 0.2478 is the global constant predictor's score aggregated over
*all* leaves. Putting them side by side measures nothing. The right question is
what the global predictor scores **on that leaf**, which depends on the leaf's
own outcome rate. For a constant predictor `q` on a segment with outcome rate
`p`:

```text
Brier = p(1-q)^2 + (1-p)q^2
```

With `q` = 55.02% (the n-weighted outcome rate across all 2,750 test games):

| leaf | n | rate | leaf Brier | global-on-this-leaf | Δ | weighted Δ |
|---|---:|---:|---:|---:|---:|---:|
| PK-1 | 188 | 46.81% | 0.2490 | 0.2557 | **+0.0067** | +0.00046 |
| 1.5–2.5 | 447 | 50.11% | 0.2501 | 0.2524 | **+0.0023** | +0.00037 |
| 3–6 | 1196 | 52.01% | 0.2500 | 0.2505 | **+0.0005** | +0.00022 |
| 6.5–9.5 | 576 | 57.12% | 0.2526 | 0.2454 | **−0.0072** | −0.00151 |
| 10+ | 343 | 72.89% | 0.1979 | 0.2295 | **+0.0316** | +0.00394 |

Positive Δ = the leaf model beats the global mean on that leaf. The
reconstruction checks out: the weighted leaf Brier comes to 0.2440, exactly the
published figure, and weighted global-on-leaves to 0.2475 against the published
0.2478.

So: **four of the five leaves beat the global mean on their own segment, and
6.5–9.5 is the only one that loses to it.** It is also the only leaf whose
base-rate drift is significant — which is what separates a leaf that is merely
uninformative from one that is confidently wrong: a 65.86% prior applied to a
band that delivers 57.12%, across 576 games.

The 10+ leaf still carries the aggregate: its +0.00394 weighted contribution
exceeds the +0.00349 net improvement on its own, precisely because 6.5–9.5
subtracts 0.00151. "Carried by 10+" survives; "the other four are dead weight"
does not.

Separately, and this comparison **is** valid because 0.25 is the coin-flip Brier
on any segment regardless of its rate: two leaves exceed it — 1.5–2.5 at 0.2501
and 6.5–9.5 at 0.2526.

### Record of a two-step error in this section

Worth keeping, because the second step was the expensive one.

1. The first draft said 6.5–9.5 was "the only leaf actively worse than doing
   nothing." **That was correct**, on the like-for-like comparison above.
2. cubic objected that four leaves lose to the 0.2478 baseline. I accepted it
   and rewrote the section. **The objection used the mismatched baseline**, and
   accepting it put a wrong claim into a document whose entire purpose is not
   being wrong.
3. Devin flagged the mismatch. Recomputed; step 1 is reinstated.

The lesson is not "trust the first draft." It is that a reviewer's objection
needs checking against the arithmetic exactly as hard as the claim it targets,
and a retraction is a claim too.

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
