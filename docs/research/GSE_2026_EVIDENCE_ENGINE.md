# GSE Evidence & Reasoning Architecture (Workstream D)

**Status:** Internal design doc. Narrative companion to the typed contract
`apps/web/lib/gse/evidence-engine.ts`.
**Scope:** How Galaxy Sports Edge (GSE) turns model output into a defensible,
auditable *case* — and how that case generalizes the Signal Courtroom primitive
(`apps/web/lib/courtroom/courtroom.ts`) to every decision the product touches.
**Audience:** Engineers and decision-design reviewers. Not user-facing copy.

> One sentence: a recommendation is not a number, it is an argument that has
> survived its own cross-examination — and we keep the transcript.

---

## A. Why evidence over vibes

A confidence badge is a compression so lossy it becomes a lie. "78%" tells the
user *that* the system is sure but never *why*, never *what it weighed*, and
never *what would change its mind*. Three failure modes follow:

1. **Unfalsifiable confidence.** A number with no attached falsifier cannot be
   wrong in any way the user can check before the outcome lands. By then it is
   too late to act on the reasoning.
2. **Hidden fragility.** Two recommendations can share a confidence value while
   one rests on five independent corroborations and the other on a single stale
   feed. The badge erases the difference that actually matters.
3. **No learning loop.** If we never recorded the reasoning, a graded loss
   teaches us nothing — we cannot tell a bad process that got unlucky from a
   good process that was wrong.

The Evidence Engine replaces the badge with a **structured case**: a claim, the
evidence for it, the counter-evidence against it, the falsifiers that would
invalidate it, and a verdict that *can* be NO-PLAY. The number still exists, but
it is a *derived summary* of the case, not the case itself. We grade the
thinking, not the scoreboard.

This is a deliberate inversion of the usual ML product pattern. Most systems
treat the model score as the answer and the explanation as decoration bolted on
after. Here the **argument is the product** and the score is the decoration.

---

## B. The core objects

The typed contract defines six first-class objects. Each is immutable once
written; updates create new versions and preserve the old (see §G, Truth
Maintenance). Field names below mirror the TypeScript contract.

### B.1 `Claim`

The proposition under examination. Stated in plain language, falsifiable in
principle, scoped to one decision.

| Field | Meaning |
|---|---|
| `id` | Stable identifier; survives re-evaluation. |
| `statement` | The proposition in plain language. Must be falsifiable. |
| `subject` | What it is about (a player, a line, a trade, a content claim, a source). |
| `decisionType` | Which courtroom template applies (see §E). |
| `horizon` | The window in which it resolves (this slate, this week, this season). |
| `createdAt` / `modelVersion` | Provenance: when, and by which engine version. |
| `status` | `open` · `supported` · `contested` · `retired` · `superseded`. |

**Lifecycle.** A claim is born `open`, accrues evidence to become `supported` or
`contested`, and is `retired` when its horizon passes or `superseded` when a new
version replaces it. A retired claim is never deleted — it is the audit trail.

A good claim is **specific enough to be wrong**. "Home side has an edge" is a
mood; "Home −3.5 is mispriced versus the closing number by ≥0.8 points" is a
claim, because a closing number can prove it wrong.

### B.2 `Evidence`

A unit of support *for* the claim. Every piece of evidence must answer: where
did this come from, how fresh is it, and how much does it move the case?

| Field | Meaning |
|---|---|
| `id` | Stable identifier. |
| `claimId` | The claim this supports. |
| `summary` | Plain-language statement of what the evidence shows. |
| `source` | Named origin: an estimator, a market read, a source class, a model. |
| `sourceClass` | `model` · `market` · `structured-data` · `derived-signal` · `external-reference`. |
| `freshness` | Timestamp + staleness band (`current` · `aging` · `stale`). |
| `independence` | Whether this corroborates *independently* or shares inputs with other evidence. |
| `strength` | `low` · `moderate` · `high` — how much it moves the case. |
| `confidence` | The evidence's own reliability, separate from how much it moves the case. |
| `capturedAt` | Point-in-time capture; never mutated after the fact. |

**Source requirement.** No anonymous evidence. Every piece names its origin and
its `sourceClass`. Evidence with `sourceClass: external-reference` must carry an
attribution that propagates to derived outputs (consistent with the scraping
rights posture in CLAUDE.md).

**Freshness requirement.** Evidence carries its own clock. A `stale` band does
not disqualify evidence automatically, but it *caps* the strength it can
contribute and is surfaced as a risk. No silent reliance on old reads.

**Independence requirement.** Two pieces of evidence drawn from the same upstream
feed are *one* piece wearing two hats. The engine tracks `independence` so that
correlated evidence is not double-counted — the single most common way a case
looks stronger than it is.

**Confidence requirement.** `strength` (how much it moves the case) is distinct
from `confidence` (how much we trust the evidence itself). A high-strength,
low-confidence piece is a flag for review, not a green light.

### B.3 `CounterEvidence`

A unit *against* the claim. Structurally a sibling of `Evidence` — same fields —
but it lives on the prosecution's side of the ledger and is never optional.

The contract enforces an **adversarial floor**: a claim with zero
`CounterEvidence` is not "strong," it is *under-examined*, and is treated as
such by the scorers. If the engine cannot find the counter-case, that is itself
a finding ("no disconfirming read available — confidence capped").

### B.4 `Falsifier`

A pre-registered condition that, if observed, would invalidate the claim. This
is the object that makes the whole architecture honest: it is named *before* the
outcome, so it cannot be rationalized away after.

| Field | Meaning |
|---|---|
| `id` / `claimId` | Identity and link. |
| `condition` | The observable that would break the claim. |
| `observable` | Whether we can actually check it before the horizon closes. |
| `triggered` | Set true if the condition is later observed. |
| `effect` | What happens to the verdict if triggered (downgrade path). |

A falsifier that cannot be observed before the decision locks is recorded but
flagged `observable: false` — it teaches us post-hoc but cannot guide action.
The best falsifiers are *checkable in the action window*.

### B.5 `Verdict`

The output of the case. Reuses the courtroom verdict vocabulary exactly so the
two systems speak one language: `PLAY` · `WATCHLIST` · `NO-BET` · `FRAGILE EDGE`.
(In non-betting templates these read as `ACT` · `MONITOR` · `NO-PLAY` ·
`FRAGILE`; same semantics, see §E.)

| Field | Meaning |
|---|---|
| `value` | One of the four verdict values. |
| `confidenceBand` | `Lean` · `Moderate` · `Strong` — qualitative, never a fabricated percentage. |
| `rationale` | The one-paragraph synthesis of why the case lands here. |
| `whatWouldChange` | The single change that flips the verdict. |
| `fragility` | The decision-fragility score (see §C). |
| `decidedAt` / `modelVersion` | Provenance. |

### B.6 The three scorers

The contract exposes three pure functions. They are deterministic given inputs,
which is what makes verdicts auditable and testable.

- **`scoreEvidenceStrength(evidence, counterEvidence)`** — nets corroboration
  against disconfirmation, *discounting for correlated (non-independent)
  evidence* and *capping stale contributions*. Returns a 0–100 strength.
- **`scoreRecommendationConfidence(claim, evidence, counterEvidence, falsifiers)`**
  — folds evidence strength, the weight of live counter-evidence, and the number
  of *observable, untriggered* falsifiers into a calibrated confidence band. More
  open falsifiers → lower band, not higher.
- **`scoreDecisionFragility(verdict, falsifiers, evidence)`** — how few shocks
  break the case. A high-confidence verdict resting on one un-checkable falsifier
  is *fragile*; the score surfaces that even when confidence is high. This is the
  number that separates "strong" from "strong but brittle."

Confidence and fragility are **orthogonal axes**. The product must show both. A
recommendation can be high-confidence and high-fragility at once — that pairing
is exactly the trap a confidence badge hides.

---

## C. The reasoning trace

Every verdict ships with a trace — the chain that turns raw inputs into a
recommendation. Five stages, each recorded:

```
inputs  →  features  →  model output  →  evidence review  →  recommendation
```

1. **Inputs.** Raw structured data: odds, lines, schedule, roster status,
   line-movement history. Each input carries its own freshness stamp. Structured
   odds/line data is the source of truth (per CLAUDE.md); the model never
   invents a fact.
2. **Features.** Derived signals computed from inputs (rest/travel deltas,
   consensus spread vs. market, public-pressure read). Each feature records which
   inputs it consumed — so a stale input taints every feature downstream, and the
   trace shows it.
3. **Model output.** The estimator's raw read: a direction, a magnitude, an
   uncertainty. This is a *witness*, not a verdict. It is one piece of evidence
   among several, not the answer.
4. **Evidence review.** Model output and features are assembled into `Evidence`
   and `CounterEvidence`, scored for strength, independence, and freshness. The
   adversarial floor is enforced here. Falsifiers are registered.
5. **Recommendation.** The three scorers run; a `Verdict` is produced with its
   confidence band, fragility, rationale, and `whatWouldChange`.

The trace is the artifact that makes a loss *educational*: replaying it tells us
whether a bad outcome came from bad inputs, a bad feature, an over-weighted
witness, or an un-checked falsifier that fired. (See §G for how contradictions
feed back in.)

---

## D. How this generalizes the Signal Courtroom

The Signal Courtroom (`apps/web/lib/courtroom/courtroom.ts`) already encodes the
doctrine for a single domain — sports betting signals. Its `CourtroomBrief`
holds a `claim`, `prosecution` and `defense` argument arrays, `falsifiers`,
`risks`, a `verdict` (`PLAY | WATCHLIST | NO-BET | FRAGILE EDGE`), a qualitative
`confidence` band, a `freshness` note, and a `whatWouldChange` field.

The Evidence Engine is the **same shape, lifted to a generic decision** and given
machinery the brief lacks:

| Signal Courtroom | Evidence Engine generalization |
|---|---|
| `claim: string` | `Claim` object — typed subject, decisionType, horizon, status, versioning. |
| `defense: Argument[]` | `Evidence[]` — adds sourceClass, freshness band, independence, confidence. |
| `prosecution: Argument[]` | `CounterEvidence[]` — same enrichment; adversarial floor enforced. |
| `falsifiers: string[]` | `Falsifier[]` — adds observability, trigger state, downgrade effect. |
| `verdict` + `confidence` | `Verdict` object — adds fragility score + provenance. |
| `whatWouldChange: string` | Promoted to a verdict field, derived from the active falsifiers. |
| (implicit weighting) | Three pure scorers make strength/confidence/fragility explicit and testable. |

Naming note: the courtroom uses `prosecution` (against the bet) / `defense` (for
the bet). The Evidence Engine uses `CounterEvidence` (against the claim) /
`Evidence` (for the claim). They map one-to-one; the engine's names are
domain-neutral so the same object serves a trade, a draft pick, or a content
claim. An existing `CourtroomBrief` can be losslessly lifted into an evidence
case, and an evidence case can be rendered back as a brief for the cockpit.

The verdict vocabulary is shared verbatim so a `NO-BET` in the sports surface and
a `NO-PLAY` in the product surface are the *same honest answer* — the most
important thing the system can ever say.

---

## E. Ten reusable courtroom templates

Each `decisionType` ships a template: the claim shape, the evidence types that
matter, the counter-evidence that must be sought, the falsifiers to pre-register,
and — non-negotiable — the path to **No-Play / Watchlist**. A template is a
checklist the engine fills, not a script that forces a verdict.

### 1. Player recommendation (start/sit, target)
- **Claim shape:** "Player X is a top-tier play at position P this window because their projected role exceeds market expectation."
- **Key evidence:** usage/role trend, matchup quality, projection vs. consensus, health status, recent independent corroboration.
- **Key counter-evidence:** role volatility, weather/pace suppression, the projection's reliance on one stale source, public over-exposure.
- **Falsifiers:** role downgraded before lock; key dependency (e.g., teammate) returns; weather flips. (observable in-window).
- **No-Play / Watchlist:** WATCHLIST while health is `questionable`; NO-PLAY if the edge rests entirely on one un-corroborated projection.

### 2. Lineup construction
- **Claim shape:** "This lineup configuration maximizes expected value within the rule constraints."
- **Key evidence:** correlation structure, leverage vs. field, salary efficiency, projection independence across slots.
- **Key counter-evidence:** over-stacking correlated risk, chalk exposure, single point of failure in a pivotal slot.
- **Falsifiers:** a pivotal slot is ruled out; ownership read inverts; a correlated game's total moves against the build.
- **No-Play / Watchlist:** MONITOR until late news clears; NO-PLAY if the build's edge collapses to one correlated bet.

### 3. Draft pick
- **Claim shape:** "At this slot, Player X is the highest-value available pick given roster need and replacement level."
- **Key evidence:** value-over-replacement, positional scarcity, durability history, range-of-outcomes vs. next-best.
- **Key counter-evidence:** injury/age risk, scheme fit uncertainty, a thin comparison set, recency bias in the ranking.
- **Falsifiers:** a higher-value player slides; the need is filled by an earlier pick; medical flag surfaces.
- **No-Play / Watchlist:** MONITOR (consider trade-down) if value is thin; NO-PLAY on the *reach* if VOR does not clear the next tier.

### 4. Trade evaluation
- **Claim shape:** "This trade improves expected roster value net of what is surrendered."
- **Key evidence:** rest-of-season value delta, schedule/role context, positional balance, both sides' independence of valuation.
- **Key counter-evidence:** giving up a scarce position, buying high on recency, counterparty information asymmetry.
- **Falsifiers:** an injury to the acquired asset; a role change that erases the gain; a better offer surfaces.
- **No-Play / Watchlist:** MONITOR pending news; NO-PLAY if the value delta is inside the noise of the projections.

### 5. Waiver / pickup
- **Claim shape:** "Adding Player X (at this bid) yields more value than the roster spot's current occupant."
- **Key evidence:** opportunity change (injury ahead of them), usage spike, schedule, bid efficiency vs. budget.
- **Key counter-evidence:** flash-in-the-pan sample, committee risk, the displaced player's residual value.
- **Falsifiers:** the blocked starter returns; usage reverts to baseline; a cheaper equivalent is available.
- **No-Play / Watchlist:** MONITOR a speculative add; NO-PLAY on an over-bid that exceeds the opportunity's expected value.

### 6. Bet / no-bet (the canonical case)
- **Claim shape:** "Selection S is mispriced versus the closing number by a measurable margin."
- **Key evidence:** independent estimators agreeing on direction, schedule edge, line-movement *not* driven by public surge, calibration history.
- **Key counter-evidence:** heavy public exposure (value may be priced), an injury status upstream of the edge, thin closing-line history.
- **Falsifiers:** questionable status downgraded to OUT; number moves past a threshold on public action; book consensus breaks against the thesis.
- **No-Play / Watchlist:** WATCHLIST while a falsifier is live; **NO-BET** when nothing independent survives cross-examination. (Mirrors the live `ILLUSTRATIVE_BRIEF`.)

### 7. Content claim (publish / hold)
- **Claim shape:** "This statement in a draft article is supported by current, real data and is safe to publish."
- **Key evidence:** the structured data backing the stat, its freshness stamp, a second corroborating source, prior calibration of similar claims.
- **Key counter-evidence:** the stat derives from a stale or single source; the phrasing implies certainty the data does not support; banned-phrase risk.
- **Falsifiers:** the underlying number revises; the source is reclassified; the claim trips the trust-claims scanner.
- **No-Play / Watchlist:** HOLD (Watchlist) pending a second source; NO-PLAY (do not publish) if the claim is data-backed only by an unattributed read. No fabricated stats (per CLAUDE.md).

### 8. Source dispute (trust this feed?)
- **Claim shape:** "Source F is reliable enough to act on for this decision class."
- **Key evidence:** historical agreement with ground truth, freshness/uptime, rights status (approved class), independence from other feeds.
- **Key counter-evidence:** recent divergence from consensus, gaps/latency, ambiguous rights status, correlation with an already-trusted feed.
- **Falsifiers:** a measurable error episode; a rights reclassification to `permission_required` or stricter; a sustained latency breach.
- **No-Play / Watchlist:** MONITOR a candidate feed in shadow mode; NO-PLAY (do not ingest) if rights are not in an approved class. Aligns to the source-rights registry.

### 9. Revenue experiment (ship the pricing/packaging test?)
- **Claim shape:** "This experiment will improve the target metric without harming trust or retention."
- **Key evidence:** prior similar tests, segment sizing, guardrail-metric baselines, a pre-registered success threshold.
- **Key counter-evidence:** under-powered sample, novelty effect, a guardrail (churn, refund) at risk, the named-ladder pricing constraints.
- **Falsifiers:** a guardrail metric breaches; the effect is inside the confidence interval; a segment is harmed.
- **No-Play / Watchlist:** MONITOR a small ramp; NO-PLAY if the test risks the founding-member grandfathering or trips a trust guardrail.

### 10. Product launch (ship the feature?)
- **Claim shape:** "This feature is ready and will improve the user's decision quality without adding cognitive load or risk."
- **Key evidence:** passing tests/types/build (per the loop protocol), usability signal, a measured load reduction, a rollback plan.
- **Key counter-evidence:** untested critical paths, an added always-on alert (fatigue risk), a server-side enforcement gap, accessibility/contrast regressions.
- **Falsifiers:** a critical test is found missing; a paywall enforced only on the frontend; a contrast/states regression.
- **No-Play / Watchlist:** MONITOR behind a flag; NO-PLAY (block launch) if any hard stop fails — tests, types, build, or a server-side enforcement gap.

A template never *forces* PLAY. Its highest purpose is to make the **No-Play case
easy to reach honestly**.

---

## F. Intellectual influences (and what each contributes)

The architecture is a synthesis, not an invention. Each tradition contributes a
specific mechanism:

- **Legal argument structure.** The claim → evidence → counter-evidence →
  verdict spine, and the adversarial requirement that the counter-case be argued
  in good faith. The "burden of proof" maps to the adversarial floor: a claim
  with no rebuttal is not proven, it is unexamined.
- **Intelligence analysis — Analysis of Competing Hypotheses (ACH).** Evidence is
  evaluated by how well it *discriminates between* hypotheses, not just by how
  much it supports the favored one. Diagnostic evidence (consistent with one
  hypothesis, inconsistent with rivals) is weighted above merely consistent
  evidence. This is why independence is a first-class field.
- **Bayesian updating.** Confidence is a posterior, not a slogan. New evidence
  shifts a band; correlated evidence shifts it less than its face value;
  base rates (calibration history) anchor the prior. We update, we do not overwrite
  (§G).
- **Red-teaming.** The CounterEvidence side is a structural red team. The engine
  is required to attack its own claim before endorsing it — and to record the
  attack even when the claim survives.
- **Scientific falsification (Popper).** A claim earns standing only if it is
  falsifiable. The `Falsifier` object operationalizes this: pre-registered,
  ideally observable in the action window, with a defined downgrade effect.
- **Forecasting calibration (the Tetlock/Brier tradition).** Verdicts are scored
  against outcomes over time; bands are tuned to match realized frequencies.
  "Strong" must *mean* something measured, or it means nothing. (Calibration data
  is partial in this container and treated as `(uncertain)` until back-tested.)

---

## G. Truth maintenance

The system's promise is that it never silently rewrites its own history. When new
evidence contradicts an existing claim, the engine follows a strict protocol —
implemented as append-only, modeled loosely on a Truth Maintenance System.

1. **Preserve the old claim.** The prior `Claim` and its evidence set are *never*
   deleted or edited in place. They are marked `superseded`, with a pointer to the
   successor. The old transcript stands.
2. **Record the contradiction.** A `Contradiction` record links the new evidence
   to the claim it undermines: what was believed, what arrived, and why they
   conflict. Contradictions are themselves evidence about the *process*.
3. **Update confidence, do not overwrite it.** The new confidence band is computed
   from the full evidence set including the contradiction. The change is a
   transition (`Strong → Moderate`), recorded with its cause — not a value
   silently swapped.
4. **Show what changed.** Every superseding event yields a diff the user (and the
   audit) can read: which evidence was added, which was demoted, which falsifier
   fired, and how the verdict moved. `whatWouldChange` becomes `whatDidChange`.
5. **Propagate downstream.** If a superseded claim fed a feature or another claim
   (§C), the dependents are re-opened for review rather than left dangling on a
   retracted premise.

Why this matters: a system that quietly updates a number when reality disagrees
is indistinguishable, from the outside, from a system that was never wrong. The
whole value of "we grade the thinking" depends on the thinking being *kept*. A
loss with a preserved, contradicted trace is the single most valuable artifact
the system produces — it is how the process improves without pretending it was
always right.

---

## H. Invariants (enforced by the contract and its tests)

- Every `Verdict` derives from at least one `Evidence` **and** the engine's
  attempt at `CounterEvidence`; a zero-rebuttal case caps confidence.
- Every `Evidence` carries `source`, `sourceClass`, and a `freshness` band; stale
  evidence cannot contribute high strength.
- Every `Claim` carries a `Falsifier` set; at least one should be `observable` in
  the action window, or the verdict is flagged fragile.
- Confidence is a qualitative band (`Lean | Moderate | Strong`), **never** a
  fabricated track-record percentage.
- Verdicts include `NO-BET` / `NO-PLAY` as a first-class, honorable outcome.
- Superseded claims are preserved; contradictions are recorded; nothing is
  silently rewritten.
- No fabricated data, sources, or stats. Unestablished quantities are marked
  `(uncertain)` and excluded from the calibrated bands until back-tested.

---

## I. Open questions / next work

- **Calibration back-test.** The confidence bands need empirical tuning against
  settled outcomes; this is `(uncertain)` until the calibration pipeline runs on
  real settled history.
- **Independence estimation.** Detecting shared upstream inputs across feeds is
  heuristic today; a formal dependency graph (from the decision ontology) would
  make the discount exact rather than approximate.
- **Falsifier observability automation.** Auto-classifying which falsifiers are
  checkable in-window is partly manual; tying it to the data-reliability layer's
  freshness signals would close the loop.
- **Cross-template evidence reuse.** A source-dispute verdict should automatically
  adjust the confidence of every downstream template that relied on that source.
  The plumbing exists conceptually; wiring it through is next-sprint work.
