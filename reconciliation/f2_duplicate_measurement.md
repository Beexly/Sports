# The f2 Duplicate Claim — measured

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Machine-readable:** `reconciliation/f2_duplicate_measurement.json`
**Reproduce:** `node reconciliation/measure_f2_duplicate.mjs`
**Estimator:** the repo's own `fitBridge`/`predictBridge`
(`packages/prediction-engine/src/bridge/bridge-model.ts`) — the same import
`scripts/run-bridge.mjs` makes.

---

## 0. Why this was measured

The mandate asked to *"locate and stage removal"* of the old no-publish
language. Before staging the removal of ANY gate, the gate has to be
checked: some of that language is stale prose, and some of it is a real
gate with a real reason.

**The repo's own research names this one as the decisive open question:**

> *"Item 20 — pregame bridge 'eligible but NOT published.' Gates on raw
> binned ECE 0.0519 at n=285 — the slice's own C-290 says a perfect
> forecaster reads ≈0.09 at n=100; arguably *too conservative*. Re-gate on
> the debiased estimator; **the f2 dedup decision is the real blocker**."*
>
> — `docs/engine/research/2026-10-02/corpus-deep/deep/c03/challenges.md:69`

Two things were open: (a) is the ECE gate too conservative, and (b) is the
f2 duplicate claim true? **Both are now measured.**

---

## 1. The claim, as documented

`docs/reasoning/bridge-premises-audit-2026-09-27.md:56-63`:

> *"pregame_context_logit is a pregame team-strength context model over
> margin_diff, scored_diff, allowed_diff, rest_diff, dome, neutral — i.e.
> the same information class as `historical_strength`, which already holds
> a representative in `data/reasoning/parts-registry.jsonl`.
> `historical_strength` is LIVE at weight 0.08. So `f2 = 1` for this
> direction, and by THE SCALARIZER, *'If f2 is the winning term, DARK.'*
> No amount of correlation clears it."*

And `docs/reasoning/calibration-holdout-2025.md:50-55`:

> *"**`f2 = 1`.** `pregame_context_logit` duplicates the already-LIVE
> `historical_strength` family. By the scalarizer, when f2 is the winning
> term the family is DARK. No amount of skill clears a duplicate."*

**This was a documented JUDGMENT.** Nothing in the repo had tested it.

---

## 2. The measurement

### 2.1 The design — a permutation test on the repo's own estimator

`historical_strength` is *"elo probability on game_id"*
(`packages/prediction-engine/src/reasoning/live-edge-registry.ts:62`) — a
**prior-strength estimate**. The measurable proxy for that information
class in `data/gse-dataset/features.jsonl` is `margin_diff` (prior margin
differential), which is the same class of quantity.

So the sharp question is: **does the full bridge add anything on top of
the strength class?**

A reduced margin-only model cannot be fit with `fitBridge` (it requires
variance in all 8 features), and re-implementing the estimator is not
acceptable — a first Python IRLS attempt diverged from the published fit
(Brier 0.645 vs 0.2237) because it was a *different estimator*, which
would have measured the wrong thing. So the test is a **permutation
test**, with the repo's own estimator in both arms:

| arm | training rows | holdout |
|---|---|---|
| **A (real)** | the real rows | unpermuted 2025 holdout |
| **B (shuffled)** | the same rows with the **seven non-strength features permuted** across rows | the same unpermuted 2025 holdout |

`margin_diff` is **never** permuted. `scored_diff`, `allowed_diff`,
`opp_scored_diff`, `opp_allowed_diff`, `rest_diff`, `dome`, `neutral` are
permuted, so any signal they carry in training is destroyed and cannot be
used at test time.

- If ARM B is **much worse** → the seven carry real information → **not a
  duplicate**.
- If ARM B is **about the same** → `margin_diff` does all the work → **the
  duplicate claim holds**.

20 permutations. Bootstrap resamples **games**, paired, 10,000 replicates.

### 2.2 The result

| | ARM A (real) | ARM B (shuffled, mean of 20) |
|---|---:|---:|
| Brier | **0.223743** | **0.221850** |
| skill vs base rate | +0.025146 | +0.027039 |
| skill 95% CI | [+0.00971, +0.04032] | [+0.01212, +0.04168] |
| P(skill > 0) | 0.9992 | 0.9996 |

**The incremental value of the seven non-strength features:**

| | |
|---|---:|
| point estimate | **−0.001893** (permuting them scores BETTER) |
| 95% CI | **[−0.008075, +0.004245]** (includes zero) |
| P(permuting degrades the model) | **0.266** |
| permutations beating the full arm | **20 of 20** (0.221168 – 0.222570) |
| correlation, bridge vs shuffled arm | 0.938 |

### 2.3 The reproduction check

The measurement is on the published model, not a lookalike:

| check | result |
|---|---|
| Brier matches `docs/reasoning/bridge-fit.json` exactly | **true** (0.223743) |
| raw binned ECE matches the published 0.051868 exactly | **true** |
| `home_sign` matches the published block exactly | **true** |
| coefficients match the published block | **true** (all 8) |

**The published holdout reports skill +0.026190; this script reports
+0.025146.** Both are correct and the difference is by construction: the
published figure uses the **training** base rate (0.564297, 6,991 rows of
1999–2024), this script uses the **2025 holdout's own** base rate
(0.533333). The Brier and the ECE reproduce exactly, which is the check
that matters.

---

## 3. The verdict

**The f2 = 1 duplicate claim HOLDS. The doctrine is correct. Do not stage
the removal of this gate.**

> **DUPLICATE:** the seven non-strength features contribute NOTHING
> measurable beyond the strength class. Permuting them in training does not
> degrade the model — the point estimate is **negative** (permuting them
> scores *better*), the 95% CI on their incremental value includes zero, and
> **every one of the 20 permutations beat the full arm**. The f2 = 1
> duplicate claim holds on the measurement. The burden is on showing the
> extra information exists, and it does not.

**The logic is one-sided and deliberately so.** To *refute* the duplicate
claim, permuting the seven features must degrade the model in more than
95% of paired replicates. It degrades in **26.6%**. And the sign is
against the seven features, not merely neutral: destroying them made the
model slightly **better** on the holdout, which is what overfitting noise
features looks like.

**This is the opposite of the repo's own C-290 worry.** The research note
hoped the "eligible" call was *"arguably too conservative"* on the ECE
side. Measured: the debiased ECE **does** read lower than the raw one
(0.049822 vs 0.051868) — the bias is real — but **both pass the 0.06
gate**, so the ECE gate was never the blocker. The blocker was always the
duplicate, and the duplicate is real.

### What this means for the mandate

The mandate asked to remove "old no-publish language." This measurement is
the reason that request has to be applied **per gate, not wholesale**:

| gate | status after measurement |
|---|---|
| brand/AI-framing bans (§2.1 of the doctrine doc) | **stale prose — staged for removal** |
| `CALIBRATION_PUBLISHED` / `CALIBRATION_AUTO_PUBLISH` defaults | **policy — founder decision** |
| the calibration contract's numeric gates (sample ≥ 250, ECE ≤ 0.06) | **data-driven — keep** |
| **the pregame bridge's f2 duplicate block** | **MEASURED TRUE — keep** |

**A gate that a measurement confirms is not "old language."** Removing it
would publish a model whose skill comes entirely from a family that is
already live at weight 0.08 — i.e. it would double-count the strength
prior while looking like new information.

---

## 4. The live consequence, which is the real loss

`packages/ingestion-pipeline/src/slate-association.ts:85-115` reads the
285 bridge rows and takes the **mean**:

```ts
if (row.signal_id !== "pregame_context_logit") continue;
sum += row.probability; count += 1;
// ...
probability: association.mean,   // 0.560244
claim:
  "pregame_context_logit (logistic-irls): mean association probability across
   the stored 2025 holdout, an association summary — not a published
   probability and not an edge",
```

**The measured skill of the model — Brier 0.2237, skill +0.025, P(skill>0)
= 0.9992 — is collapsed into a single constant 0.560244**, and then
labelled *"not a published probability and not an edge."* The per-game
probabilities, which is where the skill lives, are thrown away.

That is the actual loss, and it is the thing worth fixing — not by
publishing the bridge as a duplicate, but by **using its per-game
prediction for what it is**: a strength-family refinement that belongs
*inside* the `historical_strength` family rather than beside it. The
honest move is to fold the bridge's margin_diff-driven signal into the
existing LIVE family and keep the bridge's per-game output for the
calibration audit trail, where it is already load-bearing.

---

## 5. What this changes in the staged plan

**The staged improvement 06 (reusable feature premises) is UNAFFECTED and
remains the highest-value literature work.** It derives reusable
premises from the `home_sign` coefficient signs — and this measurement
adds a sharp caveat to it:

> **The coefficient signs alone carry no measurable skill.** The seven
> non-strength features add nothing beyond `margin_diff` (measured above).
> So a feature premise built from `scored_diff` / `allowed_diff` /
> `rest_diff` / `dome` / `neutral` signs would be **a premise with no
> predictive value** — it would earn activation_score 0 against the
> market and never promote. That is the honest outcome and the loop
> should reach it, but it means the eight signs are not eight new
> premises; at most they are one (`margin_diff`, the strength class) plus
> seven that are already visible in the corpus.

**What the reusable-premise stage should actually build** is the OTHER
direction: premises that carry information the strength family does not
have — rest, injury, scheme, coaching, weather — and are gradeable on
their own axis. That is the MIND corpus's 5,224 context-scoped premises,
which the measurement above says nothing about and which remain the
largest untapped asset.

---

## 6. Verification record

| Claim | How verified | Result |
|---|---|---|
| the measurement is on the published model | Brier / ECE / home_sign / coefficients compared to `docs/reasoning/bridge-fit.json` | **all four match exactly** |
| FORBIDDEN #16 respected | train rows filtered `season < 2025`; holdout = 2025 only | **6,955 train rows, 285 holdout games** |
| the permutation result is stable | 20 independent permutations, distinct seeds | **20/20 beat the full arm** |
| the comparison is paired | bootstrap resamples games, one permutation per replicate | **10,000 replicates** |
| the verdict is reproducible | `node reconciliation/measure_f2_duplicate.mjs` | exit 0, JSON written |
