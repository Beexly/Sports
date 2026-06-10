# 11 — Tier Calibration & the Win-Rate Engine (the "Elite means earned" spec)

> **Status:** Internal spec / founder-gated. INTERNAL ONLY. This doc specifies *how a tier
> label earns its name* and *how realized hit-rate is pushed toward elite and proven honestly*.
> It is the calibration + validation backbone behind the composite architecture in doc 10.
>
> **Scope discipline:** Every claim about *current* code is anchored to a file + line a recon
> agent actually read (see `## Grounding ledger`) or carried as **canonical-clone-grounded**
> where so labelled. Everything marked **PROPOSED** is design, not shipped. Do not let a reader
> conflate the two.
>
> **Author lane:** RESEARCH + DESIGN. No source code, schema, config, env, or package was
> changed to produce this doc, and no live switch is flipped by it. The ≥70% rate is the
> engine's **north-star quality target**, built toward and proven out-of-sample — **never** a
> sub-70% publish filter and never asserted as an earned result. The SiriusXM / Airwave signal
> stays INTERNAL, founder-gated, illustrative; live capture remains legal-gated.
>
> **Reads with:** doc 10 (the composite architecture), doc 12 (the SiriusXM source catalog),
> doc 13 (the build cards), doc 14 (the critic). This doc is the calibration/validation sibling
> of doc 10 and the home of critic fixes **F-8** (Elite anchor as an explicit open item) and
> **F-9** (temporal / out-of-sample validation discipline).

---

## 0. The one-paragraph thesis

A rating is only worth its tier if the tier is **earned, calibrated, and time-honest**. Doc 10
builds the composite; this doc makes its labels *mean something*. Three jobs: (a) resolve the
**Tua case** — a real mislabel risk that is a *calibration/labeling* defect, **not** a hardcoded
roster bug, and lives in the **canonical** clone, not deploy — with a defensible absolute QB tier
rubric and an Elite floor; (b) specify the **tier-calibration framework** (outcome-anchored
thresholds, Brier/reliability monitoring, sample-size shrinkage, isotonic/Platt) so a small
sample can never mint a false "Elite"; (c) specify the **≥70% win-rate engine north star** — the
architecture that could *plausibly* push realized hit-rate toward elite (signal depth incl. the
proprietary Signal layer, ensembling, edge-vs-close/CLV, independent estimators, Kelly/selection
discipline), where we still publish a **real, complete** slate, lead with the strongest plays,
say "no strong play today" honestly, and prove the realized rate **out-of-sample + CLV** rather
than fabricate it. Holding it all together is **F-9 validation discipline**: walk-forward CV, a
frozen-season holdout, and fitting any calibration map on a *disjoint* split — because sports
models leak future information trivially. Flipping any of this live (or a `MODEL_VERSION` bump)
is **founder-gated**.

---

## 1. What EXISTS today vs what is PROPOSED (read this first)

| Capability | Today (deploy clone) | This doc proposes |
|---|---|---|
| Per-pick tier label | `computePickGrade(confidence, edgeScore)` two-input ladder → Elite/Strong/Solid Play + Lean (`types/src/index.ts:106-120`) | Keep it; **anchor the top tier to outcomes** (calibration) + shrinkage so it can't be minted on thin n |
| Player tier band | **Canonical-only** `processGrade` within-position percentile → Elite ≥85 … Risk <40 (`colors.ts:27-33`); **not in deploy** | Add an **absolute Elite floor** + relative-rank annotation (the Tua fix); founder-gated |
| Calibration | Brier + per-bucket reliability, 30-sample gate, **evidence-only, never auto-applies** (`calibration/compute.ts:61,84-169`) | Make it the *backbone*; add isotonic/Platt fit on a **disjoint** split (F-9) |
| Sample-size guard | Publish-layer gates: `MIN_BUCKET_SAMPLE=30` (calibration), ≥25 canonical (public-performance) (`public-performance-policy.ts:47`) | Push shrinkage **into the scoring layer** so n-guards gate the *label*, not just publishing |
| Realized win-rate | **None published** — performance/calibration surface is gated off (`PERFORMANCE_STATS_ENABLED=false`); W/L/push + reliability are computed but unshown | Publish a **real** reliability curve + settled record once sample-gated; never a fabricated rate |
| CLV / closing-line value | **DOES NOT EXIST** (zero grep hits; only `OpeningLine`) | Add `ClosingLine` capture + per-pick CLV — the **early, de-noised** scoreboard |
| Independent probability | `trueEvScore`/`fairProbability` wired but hardcoded `null`; "edge" de-vigs the book's own price (circular) (`scoring.ts:271-278, 394-395`) | A **truly independent** estimate, benchmarked against the close, shadow-first |
| Temporal validation | **Not specified anywhere** | **F-9:** walk-forward CV + frozen-season holdout + disjoint calibration split |
| Slate confidence-tiering | **Does not exist** — nothing ranks/leads the slate by grade; `GateDecision` table read but never written | Lead with Elite/Strong; write real `GateDecision` rows; honest "no strong play today" |

**Bottom line:** the deploy clone already *computes* the honest ingredients (Brier, reliability
buckets, W/L/push, the 25/30-sample gates, the banned-phrase trust registry) but **publishes no
realized rate** and has **no CLV, no temporal-validation rule, and no absolute Elite floor**. The
work is to (1) anchor the labels to outcomes, (2) prove the rate out-of-sample, and (3) never let
a thin sample or a leaky split mint a tier we did not earn.

---

## 2. Design principles (the non-negotiables this doc obeys)

1. **A tier is a promise about a probability.** "Elite" must be honest at the rate "Elite"
   implies. We anchor thresholds to *settled outcomes*, not to within-pool rank alone.
2. **No small sample mints a top tier.** Shrinkage + n-guards mean the top band needs **both** a
   high estimate **and** sufficient evidence (generalizes the existing `MIN_BUCKET_SAMPLE=30` /
   ≥25-canonical gates from the publish layer into the scoring layer).
3. **Relative rank ≠ absolute skill.** A within-position percentile label is *always* populated
   at the top; it must carry an **absolute floor** and a **"graded vs position, this season"**
   annotation so a top-of-a-weak-pool read never reads as an absolute claim. (The Tua fix.)
4. **Prove the rate, never assert it.** Realized hit-rate is reported **out-of-sample**, with
   sample size, a reliability curve, and CLV — or it is not reported at all. The ≥70% target is
   the engineered north star, not a publish filter and never a fact about the product until
   earned.
5. **Time-honest validation or it doesn't count.** Sports data leaks the future trivially. Every
   calibration/accuracy claim is produced under walk-forward / frozen-holdout discipline (§5);
   any calibration map is fit on a split **disjoint** from the one it's reported on.
6. **No autonomous flip.** `canApplyCalibrationAdjustments` is hardcoded `false`
   (`readiness.ts:100,124`). Calibration and validation *collect evidence*; only a human
   `MODEL_VERSION` bump changes the recipe or a label threshold. This doc does not change that.

---

## 3. The Tua case — verdict, evidence, and fix

### 3.1 Verdict (grounded)

> **Tua is mislabeled by a *calibration/labeling* defect, not a code roster bug. The artifact
> lives in the CANONICAL clone, not the deploy clone.**

The founder's sighting — "Tua = Elite, and the engine has him on the Falcons" — was a
**runtime-generated QB ranking from the canonical clone** (`Sports-canonical-2026-06-03`), the
clone that ships the per-player `processGrade`. The **deploy clone** (`C:/Users/Garrett/Sports`,
where the product ships) **has no player `processGrade` and no Tua row at all** — its headline
number is the per-pick `confidence` (`scoring.ts:340-348`), which never names a player tier. So
the sighting cannot be a deploy-clone bug; there is nothing there to produce it.

It is **not a hardcoded-roster bug.** Team assignment comes **live** from nflverse `recent_team`
keyed on the gsis `player_id`; there is **no Falcons assignment written in code**, no hardcoded
roster table mapping Tua → any team. A repo search for a hardcoded team string tied to a player
finds nothing — the team is a *data* value, not a *code* constant.

**Most likely root cause — a misread of a RELATIVE label as an ABSOLUTE tier.** The canonical
`processGrade` is a **pure within-position percentile (0–100)** with **no absolute floor**
(`player-model.ts:172-177`). In a QB pool of only ~24–32 starters, the "Elite" band (≥85
percentile) is **structurally always populated** — *someone* is the top handful every week, by
construction. A genuinely good-but-not-truly-elite QB who sits near the top of a thin or down
pool gets the **same "Elite" chip** an all-time season would earn. The label is *relative*
("top of this position, this week"); it was *read* as *absolute* ("one of the best QBs in
football"). That is the defect: a relative rank wearing an absolute-sounding word.

**Possible secondary cause — a stale/wrong `recent_team` feed value.** The "on the Falcons"
detail is most plausibly explained by the team field, which is a **live feed value**, not code.
If nflverse `recent_team` was stale, mid-trade, or mis-keyed for that `player_id` at read time,
the QB's *team* renders wrong while the *grade* is computed correctly off player metrics. This is
a **data-freshness** question about the feed, not a roster constant to delete.

**Contributing amplifier (canonical, grounded).** `player-model.ts:167-169` coerces a missing
DAKOTA/PACR to `0` *before* percentile ranking. That deflates the pool and **inflates** the
percentile of QBs who *do* have the metric — nudging borderline QBs *across* the 85 line. So the
Elite band is not only always-populated, it's slightly *over*-populated for metric-complete QBs.
(Doc 10 §4.4 carries the same finding; the fix is "drop-missing before ranking," not coerce to 0.)

### 3.2 Evidence ledger (Tua-specific)

| Claim | Basis | Clone |
|---|---|---|
| Deploy clone has no player tier / no Tua row | Headline is per-pick `confidence` only (`scoring.ts:340-348`); zero player-grade surface | deploy |
| The sighting is a `processGrade` output | `processGrade` = within-position percentile 0–100 (`player-model.ts:172-177`) | canonical |
| Team is a live feed value, not a code constant | `recent_team` from nflverse keyed on gsis `player_id`; no hardcoded Falcons string | canonical |
| "Elite" ≥85 band is structurally always populated | Pure percentile, no absolute floor, ~24–32 QB pool | canonical |
| Metric-missing coercion inflates complete QBs | `player-model.ts:167-169` coerces null→0 before ranking | canonical |
| Not independently re-read in this pass | Per repo-root constraint, this docs wave reads the **deploy** clone; canonical claims carried as-cited (consistent with doc 14 §F) | — |

> **Honesty note (carry forward):** these canonical-clone line cites are carried from the doc
> 10/12 recon and doc 14's grounding log; they were **not** independently re-read in this docs
> wave (repo-root constraint = deploy clone). They are labelled canonical-grounded, port-required,
> exactly as the rest of the set does. A future canonical-clone pass should re-read
> `player-model.ts` to close this.

### 3.3 The fix (PROPOSED; founder-gated where it touches the recipe)

Two independent corrections, neither of which is "fix the roster":

1. **Add an ABSOLUTE Elite anchor/floor** (build card **RAT-07**, founder-gated, flips a live
   switch). To wear "Elite," a QB must clear **both** the relative bar (≥85 percentile) **and** an
   **absolute performance bar** (a fixed EPA/CPOE-class threshold; see §3.4). A down year for the
   position can no longer mint "Elite" QBs, because the absolute gate is unmoved by how weak the
   pool is. Gated form **defaults to current behavior** until a founder `MODEL_VERSION` bump.
2. **Verify the live `recent_team` feed value** (data/ops check, *not* a code fix). Confirm the
   nflverse `recent_team` for the affected `player_id` is current (not stale/mid-trade/mis-keyed)
   at read time. If wrong, the fix is a **feed-freshness / keying** correction, **never** a
   hardcoded team override.

Two supporting corrections from doc 10, repeated here because they directly de-inflate the Elite
band: **drop-missing before ranking** (RAT-05; never coerce null→0, `player-model.ts:167-169`)
and **scoring-layer shrinkage** (RAT-06; thin-n estimates regress toward the prior, §4.3).
Together: absolute floor + honest imputation + shrinkage = "Elite" requires a high *absolute*
read, on *complete* data, with *enough* evidence. All **founder-gated** where they touch the
recipe surface; built **gated-form-only** here.

> **Labeling correction that ships with the fix:** every player-band chip carries a
> **"graded vs. position, this season"** annotation (doc 10 §6.3), so a relative percentile can
> **never** be read as an absolute skill claim again — the exact misread that produced the Tua
> sighting. This annotation is safe/additive (no recipe surface) and should ship even ahead of
> the founder-gated floor.

### 3.4 A defensible QB tier rubric — what genuinely separates Elite from High (absolute)

This is the **absolute** bar the Elite floor enforces, *in addition to* the relative ≥85
percentile. It is **internal/proprietary** (the public sees only the band + the human read); the
specific numeric thresholds below are **PROPOSED priors to be validated** (§5), not shipped
constants — and the band cannot be called *calibrated* until each bar is a specific, validated
number (critic **F-8**, logged as an open item in §8).

| QB tier | Relative gate | Absolute gate (proposed prior — VALIDATE before shipping) | What it actually means |
|---|---|---|---|
| **Elite** | ≥85 percentile **and** | EPA/play clearly above league mean (e.g. top-quartile, sustained), **CPOE positive**, sack/pressure-to-sack and turnover-worthy-play rates not in the bottom tier, over a **stable sample** (shrinkage-passed) | A genuinely top-of-league QB on *absolute* play quality, not merely the best of a thin week |
| **High** | ~70–84 percentile | Above-average EPA/CPOE but **short of** the Elite absolute bar, or Elite-level on a sample too thin to clear shrinkage | A good starter; clearly above replacement, not yet absolute-elite |
| **Solid** | ~55–69 | Near league-average efficiency | Average-ish starter |
| **Watch** | ~40–54 | Below-average efficiency or volatile | Risk/volatility flag |
| **Risk** | <40 | Clearly below-replacement on absolute metrics | Avoid / fade context |

**The separator that matters:** Elite vs High is **not** "ranked 1st–5th this week" (relative) —
it is **"clears an absolute EPA/CPOE-class bar on a stable sample"** (absolute + n-guarded). A
top-of-a-weak-pool QB is **High**, not Elite, under this rubric. That single rule is what makes
the Tua mislabel impossible to repeat.

> **Why EPA/CPOE as the anchor:** per-dropback efficiency (EPA/play, CPOE, DAKOTA) is the most
> predictive, least pool-relative measure of QB value (doc 10 §4.5 per-position weighting puts
> Efficiency first for QB) — exactly the right basis for an *absolute* gate. Volume/production
> alone is not an Elite gate (a bad QB on a pass-heavy team can accumulate yards).

---

## 4. Tier-calibration framework

The framework that makes every tier label honest. EXISTS-today pieces are the backbone; the
PROPOSED pieces extend them from the publish layer down into the scoring/labeling layer.

### 4.1 Outcome-anchored thresholds (PROPOSED)

A tier threshold is only legitimate if, **on settled outcomes**, picks in that band actually hit
near the rate the band implies. Procedure:

1. Bucket settled picks by their pre-settlement band (Elite/Strong/Solid/Lean for picks; the
   five player bands for players).
2. Measure each band's **realized** hit-rate / cover-rate with a confidence interval, **out of
   sample** (§5) — never on the data the thresholds were tuned on.
3. A band's threshold is **valid** only if its realized rate is consistent (within CI) with the
   rate the band advertises. If "Elite" doesn't out-hit "Strong" out-of-sample, the boundary is
   **moved** — by a founder `MODEL_VERSION` action, never autonomously.

This makes the ladder **falsifiable**: a tier that doesn't earn its separation gets re-cut, not
defended.

### 4.2 Reliability / Brier monitoring (EXISTS-today, extended)

The deploy clone already computes a **reliability curve** (per-bucket observed-vs-expected) and a
**Brier score** with a 30-sample bucket gate, **evidence-only** (`calibration/compute.ts:61,
84-169`). This is the trust artifact. Extensions (PROPOSED):

- **Brier decomposition** (Murphy: *reliability − resolution + uncertainty*). Reliability tells
  us if the probabilities are honest; resolution tells us if they *discriminate*. A well-calibrated
  but low-resolution model is honest **and useless** — we track both so "calibrated" never hides
  "uninformative."
- **Log loss as the training/penalty objective** — it punishes confident-and-wrong hardest, which
  is exactly the failure a tier ladder must avoid (a confident "Elite" that misses).
- **Leakage budget on the public curve** (critic **F-3**): the reliability curve proves
  **results, not the recipe**. Bucket granularity is chosen coarse enough that the curve **cannot
  be inverted** into the confidence→outcome map, and it is published only at the existing
  **≥25-sample** gate. "Reveals method nothing" was too strong; the correct statement is
  "reveals *results*, not the recipe."

### 4.3 Sample-size guards / shrinkage — so a thin sample can't mint false Elite (PROPOSED)

The mechanism that *structurally* prevents the Tua-class failure. Apply **empirical-Bayes /
James-Stein shrinkage** at the scoring layer (doc 10 roll-up step 5): a player/team/pick with few
settled or few qualifying observations has its sub-score / probability **regressed toward the
population prior** until evidence accumulates. Consequence: **the top tier requires both a high
point estimate and sufficient n.** A QB with two great games does **not** out-rank a QB with a
season of very-good ones.

This generalizes the existing **publish-layer** guards — `MIN_BUCKET_SAMPLE=30`
(`compute.ts:61`) and ≥25 canonical (`public-performance-policy.ts:47`) — **down into the
labeling layer**, so the *label itself* is n-guarded, not just whether we publish a chart. The
Elite **absolute floor** (§3.3) and shrinkage are complementary: the floor stops *weak-pool*
inflation; shrinkage stops *thin-sample* inflation. Both are needed.

### 4.4 Isotonic / Platt post-hoc calibration (PROPOSED, F-9-disciplined)

After the model produces a raw score, a monotone **isotonic regression** (or **Platt** logistic)
map can correct residual mis-calibration so a stated 70% means a realized ~70%. Two hard rules:

1. **Evidence-only, human-gated.** The map is computed and stored as a *proposal*;
   `canApplyCalibrationAdjustments` stays `false` (`readiness.ts:100,124`). Applying it is a
   founder `MODEL_VERSION` action (build card **PRF-02**, flips a live switch, gated-form-only).
2. **Fit on a DISJOINT split (F-9).** The isotonic/Platt map is fit on a split **different** from
   the one it is *reported* on, and never on the frozen holdout (§5). Fitting and evaluating a
   calibration map on the same data is the classic way to manufacture a beautiful, **overfit**
   reliability curve. This rule is mandatory, not optional.

### 4.5 Banned-phrase trust registry (EXISTS-today)

The deploy clone already ships a banned-phrase **trust registry** + a method-leakage gate
(`trust-claims.ts` `INTERNAL_VOCABULARY`, `method-leakage-gate.test.ts`). The calibration surface
inherits it: no tier copy, reliability-curve caption, or "Elite" human-read may use a banned
overclaim ("lock," "guaranteed," "can't lose") or leak internal vocabulary. Calibration honesty
and copy honesty are enforced by the *same* CI gate.

---

## 5. Temporal / out-of-sample VALIDATION discipline (critic fix F-9 — HIGH)

> **This is the load-bearing section the critic flagged as missing (C-4 / F-9, HIGH).** A
> gorgeous reliability curve is worthless if it was produced with future information bleeding into
> the past. Sports models leak the future **trivially** — player form, injuries, weather, and line
> movement are all partly *posterior* to the moment a pick is made. Without an explicit temporal
> protocol, an overfit model looks calibrated and isn't.

### 5.1 Walk-forward (time-series) cross-validation (PROPOSED)

Never use random k-fold on sports data — random folds put *future* games in the *training* set
for *past* predictions, which is leakage. Instead, **walk-forward**:

```
train on weeks 1..k        → predict & score week k+1   (k+1 never seen in fit)
train on weeks 1..k+1      → predict & score week k+2
… roll forward across the season; every test week is strictly in the future of its train set
```

- Each evaluation is **strictly causal**: the model that grades week *n* was fit only on weeks
  `< n`. No feature, normalization statistic, percentile pool, or calibration map may be computed
  using any game at or after the prediction time.
- Percentile **normalization pools** (doc 10 step 2) and **shrinkage priors** (§4.3) are
  recomputed **as-of** each prediction week — using a pool that contains the *future* would leak.
- This is the only honest way to estimate realized hit-rate **before** a full season of true
  out-of-sample results exists.

### 5.2 A frozen-season holdout (PROPOSED)

Permanently fence off the **most-recent complete season** (or a defined recent window) as a
**holdout that is never tuned on** — not for feature selection, not for weight setting, not for
threshold cutting, not for fitting the calibration map. It is touched **once**, at evaluation,
to produce the headline honest number. The moment the holdout informs a design choice, it stops
being a holdout and the headline rate becomes optimistic. Treat "did we peek at the holdout?" as
a tracked integrity question, not an honor-system footnote.

### 5.3 Disjoint calibration split (PROPOSED)

The isotonic/Platt map (§4.4, **PRF-02**) is fit on a split **disjoint** from both (a) the data
it is *reported* on and (b) the frozen holdout. Concretely: fit the map on an earlier window,
report its calibration on a later walk-forward window, and confirm it on the frozen holdout once.
Fitting and reporting on the same split is exactly how a model fakes calibration.

### 5.4 Sample-size honesty for the headline rate (PROPOSED)

Even under perfect temporal hygiene, a realized rate is meaningless without n. We do **not**
publish a headline win-rate until the out-of-sample, walk-forward sample clears a credible bar —
a directional read needs **~200+** settled wagers; a defensible win-rate **headline** needs
**~300–500**. Below that, we publish **CLV** (the early, de-noised proxy, §6.3) and a
**"calibrating — N of M"** label, never a point-estimate rate dressed as final. This reuses the
existing label-until-calibrated posture (`public-performance-policy.ts`).

### 5.5 Validation as a build card (PROPOSED)

This discipline should land as a dedicated **validation card** appended to doc 13 (per doc 13's
own "if 11 adds net-new proposed work, append cards here and dedupe" instruction; see §7):
walk-forward harness + frozen-season holdout register + a CI/acceptance check that **the
calibration map's fit split ≠ its report split ≠ the holdout**. Safe/additive (it builds an
*evaluation* harness; it moves no published number).

---

## 6. The ≥70% win-rate ENGINE NORTH STAR (not a publish filter)

> **Framing, stated plainly:** sustained 70% ATS is **extraordinary**. Breakeven at −110 is
> **52.38%** (110/210); realistic professional ROI is ~1–5% at a **53–58%** win rate. 70% is the
> engine's **engineered quality target** — the thing the architecture is *built toward* and the
> realized rate is *measured against* — **not** a fact about the product and **not** a
> sub-70% refusal filter. We publish a real, complete slate; we prove the rate honestly or we
> don't claim it. (Doc 10 §2.5 and doc 13's safety summary say the same; this section says *how*
> the architecture could plausibly get there.)

### 6.1 The five levers that could push realized hit-rate toward elite

None of these is a magic number; each is a *source of real, orthogonal information* the market
hasn't fully priced. All are **PROPOSED / shadow-first** in the deploy clone.

1. **Signal depth, including the proprietary qualitative Signal layer.** The activated
   quantitative categories (Efficiency, Next Gen, Trenches, Availability — doc 10 §3.1) plus the
   **accountability-weighted Signal layer** (SiriusXM Ch 87 + beat + crowd, capped at 6/100, doc
   10 §3.2, doc 12) give the engine information *orthogonal* to the line. The Signal layer is the
   moat **once proven** — it does **not** exist in the deploy clone yet (zero grep hits), is
   shadow-first, and is **unrealized** until it clears shadow **and** the legal gate. It breaks
   ties and flags what the numbers miss; it never overrides a quantitative read.
2. **Ensembling.** Combine independent estimators (market structure + an efficiency/NGS/trenches
   model + the Signal lean) rather than betting one model. Ensembles reduce variance and rarely
   underperform their best member when the members are genuinely independent — which is why §6.2's
   independence requirement matters.
3. **Edge-vs-close / CLV.** Beating the *opening/early* line and being validated by the *closing*
   line is the **#1 long-run profit proxy** against a near-efficient close (Pinnacle closing lines
   ≈ r² 0.997 with outcomes). CLV is how we know the *process* has edge **before** W/L variance
   resolves (§6.3).
4. **Independent (non-circular) estimators.** Today's "edge" de-vigs the book's **own** consensus
   price (`scoring.ts:271-278`), so "edge vs market" is largely **circular**, and
   `trueEvScore`/`fairProbability` are hardcoded `null` (`scoring.ts:394-395`). A genuine edge
   needs at least one probability estimate built from **non-market** inputs — something orthogonal
   to the line to actually beat the close with (§6.2).
5. **Kelly / selection discipline.** Edge without staking discipline still goes broke. **Fractional
   Kelly** sizing (a fraction of full Kelly, to survive estimation error and variance) and
   **selectivity** — bet only when the independent estimate genuinely diverges from the close —
   convert a modest per-bet edge into compounding bankroll growth and protect against ruin. This
   is a *staking/selection* policy, **not** a "hide sub-70% picks" filter.

### 6.2 Independent estimators, benchmarked against the close (PROPOSED)

An independent estimator is necessary but **not sufficient** — an independent estimate that is
*worse* than the de-vigged line just adds noise (critic **C-6 / F-11**). Therefore the independent
`fairProbability` (build card **WIN-03**) must be:

- **Built from non-market inputs** (the activated Efficiency/Next Gen/Trenches categories, ideally
  a stacked ensemble), so it is genuinely orthogonal to the line.
- **Benchmarked against the closing line** by log loss / Brier-vs-close, **out-of-sample** (§5),
  **shadow-only**, and **promoted only if it beats or complements the close** as measured by CLV.
- Never circular: it may **not** be derived from the same consensus price it is supposed to beat.

### 6.3 CLV — the engine's true, early scoreboard (PROPOSED; biggest single unlock)

CLV / closing-line capture **does not exist anywhere** in the deploy clone (zero grep hits; only
`OpeningLine` exists). It is the single biggest hole for *proving* edge before a large settled
sample accumulates.

- **Build (WIN-01/WIN-02):** capture a `ClosingLine` snapshot per pick alongside the existing
  `OpeningLine`; compute a per-pick CLV (bet-time price vs closing price) and a rolling
  CLV-positive scoreboard.
- **Target:** **>60–65%** of picks CLV-positive over **200+** wagers signals a genuine, repeatable
  edge (sharps run ~75%). This is a *target/benchmark*, not a measured result.
- **Honesty caveats (critic C-5 / F-10) — CLV is gameable if sloppy.** CLV is only meaningful
  against a **fair, liquid closing line at a specified book/market**, and is distorted by limits,
  stale quotes, and *which* book's close you snap. `WIN-01` must specify the **closing reference**
  (e.g. a defined consensus or a sharp book like Pinnacle, fixed in advance) and a
  **stale-quote / limit-down exclusion rule**, or "CLV-positive %" is gameable.
- **Reveal-less:** CLV proves *results* and exposes **nothing** about the recipe — though whether
  to show it publicly vs keep it internal is a founder/positioning call (public CLV reveals the
  beat-the-close framing to competitors).

### 6.4 We still publish a real slate — confidence tiering, honestly (PROPOSED)

The north star does **not** mean "only show picks ≥70%." It means the architecture is built to
*earn* a high rate, and the slate is presented honestly on top of it:

- **Lead with the strongest plays.** Partition the published slate by the quality ladder (doc 10
  §6.3) and **lead with Elite/Strong**. This is **confidence tiering**, not slate-hiding.
- **Say "no strong play today" out loud.** When nothing clears the strong bar, the honest
  empty-state is a feature — a "no Strong play today, here are the leans" banner beside the
  existing copy (`picks/page.tsx:336-340`: "We only publish when the stack earns it…").
- **The floor is data-sufficiency, not win-rate.** The `MIN_PUBLISH_CONFIDENCE=50` /
  `CONSENSUS_MIN_PCT=0.55` gate removes **under-evidenced** picks, **not** *sub-70%* picks
  (`constants.ts:8,26`). The slate stays **real and complete**; the strongest plays simply lead.
- **Write real `GateDecision` rows** (build card **SLATE-01**): today the `GateDecision` audit
  table is **read** by the board but **never written** by production (no `gateDecision.create`/
  `upsert`). Writing real rows makes "no strong play today" an **auditable record**, not a UI
  fallback.

### 6.5 What we will and won't claim

| We WILL | We WON'T |
|---|---|
| Report realized rate **out-of-sample** with n + a reliability curve | Assert a 70% (or any) win-rate as an earned fact before it's proven |
| Publish CLV as the early, de-noised process proof (founder call on public vs internal) | Present CLV computed against an unspecified/gameable close |
| Lead with the strongest plays and say "no strong play today" | Hide a sub-70% slate or imply we only surface winners |
| Call 70% an **engineered north-star target**, with breakeven 52.38% stated plainly | Imply 70% is typical, inevitable, or already achieved |
| Keep the recipe internal; prove results, not method | Leak weights/categories/Signal-lane existence via any public surface |

---

## 7. Reconciliation with the build-card set (doc 13)

Doc 13 was written before this doc existed and explicitly invites reconciliation ("Doc `11-*` was
not yet on disk… if 11 adds net-new proposed work, append cards here and dedupe"). This doc adds
**one genuinely net-new proposed workstream** plus several *clarifications* that map onto existing
cards. Recommended (owner action; **no card file is edited by this docs wave**):

| Doc 11 item | Existing doc 13 card | Action |
|---|---|---|
| Absolute Elite anchor/floor + QB rubric (§3.3, §3.4) | **RAT-07** (founder-gated, flips switch) | **Covered** — RAT-07 is the floor; this doc specifies the *rubric* it enforces. Add the validated EPA/CPOE bar as RAT-07's open acceptance value (F-8). |
| Drop-missing before ranking (§3.3) | **RAT-05** | Covered. |
| Scoring-layer shrinkage (§4.3) | **RAT-06** | Covered. |
| "graded vs position, this season" annotation (§3.3) | **TIER-02** | Covered. |
| Outcome-anchored thresholds + Brier decomposition + leakage budget (§4.1–§4.2) | **PRF-01** | Extends PRF-01; add the F-3 bucket-granularity acceptance note. |
| Isotonic/Platt on a disjoint split (§4.4, §5.3) | **PRF-02** | Extends PRF-02 with the disjoint-split rule. |
| Independent estimator benchmarked vs close (§6.2) | **WIN-03** | Extends WIN-03 (F-11). |
| CLV with specified close + exclusion rule (§6.3) | **WIN-01/WIN-02** | Extends WIN-01 (F-10). |
| Lead-with-strength + real `GateDecision` rows (§6.4) | **SLATE-01** | Covered. |
| **Temporal validation harness (§5): walk-forward + frozen holdout + disjoint-split CI check** | **— none —** | **NET-NEW. Append a `VAL-01` (safe/additive) validation card to doc 13** and dedupe. This is the one genuinely missing card the critic's F-9 implies. |

> **Net-new for doc 13:** exactly **one** card — a `VAL-01` temporal-validation harness
> (safe/additive). Everything else in doc 11 *extends or specifies* an existing card rather than
> duplicating it. Appending and deduping is an **owner action**; this docs wave does not edit the
> card file.

---

## 8. Grounding ledger (every "today" claim → file:line)

| Claim | Anchor | Clone |
|---|---|---|
| Headline number is per-pick `confidence`, summed + clamped + `+10` | `packages/prediction-engine/src/scoring.ts:340-348` | deploy |
| Two-input `computePickGrade`; labels Elite/Strong/Solid Play + Lean | `packages/types/src/index.ts:106-120` | deploy |
| "Edge" de-vigs the book's own consensus (circular); `trueEvScore`/`fairProbability`=null | `scoring.ts:271-278, 394-395` | deploy |
| Calibration: Brier + reliability buckets, 30-sample gate, evidence-only | `apps/web/lib/calibration/compute.ts:61, 84-169` | deploy |
| No auto weight/calibration change (`canApplyCalibrationAdjustments=false`) | `packages/prediction-engine/src/readiness.ts:100,124` | deploy |
| Publish gate: `MIN_PUBLISH=50`, `CONSENSUS_MIN_PCT=0.55` | `packages/prediction-engine/src/constants.ts:8,26` | deploy |
| Public-performance policy: ≥25 canonical, label-until-calibrated, bootstrap excluded | `apps/web/lib/performance/public-performance-policy.ts:47` | deploy |
| Performance/calibration surface gated off (no realized rate published yet) | `PERFORMANCE_STATS_ENABLED=false` (env gate) | deploy |
| CLV / `ClosingLine`: does not exist (only `OpeningLine`) | zero grep hits; `schema.prisma:240` | deploy |
| `GateDecision` read by board, never written | `apps/web/lib/board/state.ts` read; no `gateDecision.create`/`upsert` writer | deploy |
| Banned-phrase trust registry + method-leakage gate | `apps/web/lib/trust-claims.ts`; `apps/web/__tests__/method-leakage-gate.test.ts` | deploy |
| Honest empty-state copy ("We only publish when the stack earns it…") | `apps/web/app/picks/page.tsx:336-340` | deploy |
| Airwave/SiriusXM/pundit absent (Signal layer = port + build, not wiring) | zero grep hits in `C:/Users/Garrett/Sports` | deploy |
| Player `processGrade` = within-position percentile, **no absolute floor**; small pool | `apps/web/lib/intelligence/player-model.ts:172-177` | **canonical** (carried as-cited) |
| null→0 coercion on DAKOTA/PACR before ranking (inflates complete QBs) | `player-model.ts:167-169` | **canonical** (carried as-cited) |
| Team via live nflverse `recent_team` keyed on gsis `player_id`; no hardcoded roster | nflverse feed read; no team-string constant | **canonical** (carried as-cited) |
| Player tier bands Elite ≥85 / High / Solid / Watch / Risk | `apps/web/lib/intelligence/colors.ts:27-33` | **canonical** (carried as-cited) |
| Breakeven 52.38% at −110; Pinnacle close r²≈0.997; pro ROI 1–5% at 53–58% | external research (doc 10 §2.5, §5.2; doc 14 §1c) | research |

> **Canonical-clone caveat (same as doc 14 §F):** the canonical rows above were **not**
> independently re-read in this docs wave — the repo-root constraint scopes this work to the
> **deploy** clone. They are carried as-cited and labelled port-required, consistent with the rest
> of the set. A future canonical pass should re-read `player-model.ts` / `colors.ts` to close §3.2.

---

## 9. Open decisions for the founder (gated, not auto-actioned)

1. **Set the Elite absolute bar (F-8).** The QB Elite floor (§3.4) needs a **specific, validated**
   EPA/CPOE-class threshold before the Elite band can be called *calibrated*. The numbers in §3.4
   are PROPOSED priors, not shipped constants. Validating + setting them is a founder
   `MODEL_VERSION` action (RAT-07).
2. **Verify the live `recent_team` feed.** Data/ops check on the affected `player_id`'s nflverse
   `recent_team` freshness/keying (the "Falcons" detail). If stale/mis-keyed, fix the feed — never
   add a hardcoded team override.
3. **Apply calibration (PRF-02) or keep it evidence-only.** Whether to ever apply the
   isotonic/Platt map is a `MODEL_VERSION` call; `canApplyCalibrationAdjustments` stays `false`
   until then. The disjoint-split discipline (§5.3) is a prerequisite either way.
4. **Build CLV + pick the closing reference (WIN-01/02, F-10).** Highest-leverage honesty + edge
   unlock. Decide the closing-reference book/market and the stale/limit exclusion rule up front;
   build internal first; public CLV display is a separate positioning call.
5. **Promote the independent estimator only if it beats the close (WIN-03, F-11).** Shadow-first;
   promote only on out-of-sample log-loss/Brier-vs-close + CLV evidence.
6. **Publish the realized rate — when, and at what sample (§5.4).** Decide the headline-rate
   sample bar (≥300–500 out-of-sample) and the until-then label posture. Flipping
   `PERFORMANCE_STATS_ENABLED` to surface the real reliability curve / record is a founder call.
7. **Stake policy (§6.1 lever 5).** If/when sizing guidance is ever surfaced, fractional-Kelly
   parameters and selectivity thresholds are internal and founder-set — and are a
   staking/selection policy, **not** a publish filter.
8. **Append `VAL-01` to doc 13 (§7).** Record the one net-new temporal-validation card (or record
   it as descoped) so the build-card set isn't silently incomplete.

---

*End of spec. No code, schema, config, env, or live switch was modified to produce this document.
The ≥70% rate is the engine's engineered north-star quality target, proven out-of-sample + CLV and
reported honestly — never asserted, never a sub-70% publish filter. SiriusXM/Airwave remains
internal, founder-gated, illustrative; live capture stays legal-gated.*
