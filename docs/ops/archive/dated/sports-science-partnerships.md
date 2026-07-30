# Sports-Science Partnerships — Honesty Layer Strategy

**Status**: internal strategy sketch. Not a status report. Nothing in this
document describes an existing relationship — see §5 NON-CLAIMS.

**Date**: 2026-07-24
**Owner**: UQ / prediction-engine track
**Companion**: `docs/ops/UQ_HANDOFF_2026-07-24.md` §3 (this doc is item 5 of §6)

The thesis in one paragraph: the sports-science vendor market is well served
on *measurement* and poorly served on *epistemics*. Six credible companies
collect excellent data and emit scores, flags, and traffic lights. Almost
none of them ship a defensible statement of how wrong those numbers can be,
and none of them ship a first-class "we decline to call this one" output.
That gap is what `packages/prediction-engine`'s calibration + selective-gate
stack already does for betting edges, and it transfers. The move is to sell
the honesty layer *into* their stack, not to build a competing measurement
product we would lose at.

---

## 0. Sourcing discipline for this document

Everything below describes **categories of capability** — what a product
does, who signs the cheque, where the uncertainty story is thin. Where a
number would normally go (revenue, customer counts, contract values, funding,
churn, model AUC), this document says what would have to be verified instead.
Anything corporate-structural (ownership, acquisitions, current product
naming) is marked **[verify]** because product lines get renamed and
acquired and this document will go stale before the strategy does.

Do not paste any **[verify]** item into an external deck, an email, or a
pitch without re-sourcing it first from the vendor's own current materials.

---

## 1. Competitive teardown

### 1.1 Catapult

**What they actually sell.** Wearable athlete-tracking hardware (GPS/GNSS
plus local positioning, with onboard inertial sensors) worn in training and
competition, paired with a subscription analytics platform; plus a video /
tactical-analysis line acquired over time **[verify current product names and
which acquisitions are in-scope]**. The commercial object is a per-team,
per-season contract bundling vests/pods, the platform seat, and support.

**Who buys it.** Strength & conditioning staff and sports scientists, with
the performance director or head of athletic performance as the signing
authority; increasingly college/university athletic departments and national
federations. The buyer is judged on load management outcomes, not on
statistical rigour.

**Where the uncertainty story is weak.** The headline outputs are derived
composites — total load, high-speed-running distance, acceleration counts,
acute-to-chronic workload ratios — presented as point values against
thresholds or colour bands. Three specific gaps:

1. **Measurement error is not propagated to the displayed metric.** Positional
   error, sampling rate, unit-to-unit variability, and satellite/indoor
   degradation are all real and documented in the sports-science literature,
   but the derived load number a coach sees carries no interval.
2. **Threshold-crossing is presented as a fact, not a probability.** "This
   athlete is in the red zone" is a deterministic statement about a quantity
   that is itself an estimate.
3. **The ACWR family has taken sustained methodological criticism** in the
   peer-reviewed literature (mathematical coupling of numerator and
   denominator, spurious-correlation risk, sensitivity to rolling-window
   choice). A vendor whose UI leans on ratio thresholds inherits that critique.
   **[verify which specific critiques to cite before using externally — cite
   papers, not vibes.]**

**What would need verifying before a pitch**: their current installed base by
tier, whether any of their risk-flavoured outputs are marketed with a
published calibration or validation study, and whether contracts are
per-athlete or per-squad (this determines whether a per-decision honesty
layer is even priceable inside their model).

### 1.2 VALD

**What they actually sell.** Human-measurement hardware plus a cloud platform:
force plates for jump/landing testing, a hamstring/eccentric-strength testing
rig, isometric frames, handheld dynamometry, timing gates, and movement
capture **[verify current device lineup and names]**. The platform aggregates
tests into athlete profiles with normative comparisons drawn from their
cross-customer dataset.

**Who buys it.** Physiotherapists and sports-medicine staff first, S&C second
— plus a meaningful non-sport segment (military, occupational health,
rehabilitation clinics) that buys the same devices for return-to-duty and
return-to-work decisions.

**Where the uncertainty story is weak.** This is the most consequential gap
of the six, because the outputs feed clearance decisions:

1. **Limb-symmetry indices and asymmetry percentages are compared against
   bright-line thresholds** (the "under 10% asymmetry" convention and its
   relatives) without displaying the test-retest error of the measurement.
   An asymmetry of 11% and one of 9% can be the same athlete on two days.
2. **Normative percentiles are point placements.** A percentile derived from
   a reference population is an estimate with sampling error, and the
   reference cohort's composition (sport, level, age, sex) is a matching
   assumption that is rarely surfaced as an uncertainty.
3. **No abstention channel.** A test session with insufficient reps, a bad
   trial, or an athlete outside the normative cohort still yields a placed
   percentile rather than "insufficient basis to place this athlete."

Notably, the underlying literature *does* contain the right concepts —
typical error, smallest worthwhile change, minimal detectable change. The gap
is that these live in papers and not on the screen the physio is looking at.

**What would need verifying**: whether their platform already exposes
typical-error or MDC bands anywhere in the UI (if it does, the pitch changes
from "add this" to "make this the decision object"), and their posture on
customers using outputs for clinical clearance.

### 1.3 Kitman Labs

**What they actually sell.** An athlete-management and data-integration
platform — the system of record that unifies medical records, availability,
training load, wellness questionnaires, and testing data across a club or
league, with analytics layered on top; expanded by acquisition into the
established AMS space **[verify acquisition history and current platform
naming]**. Increasingly sold at the league and federation level, not just the
club level, because the value proposition is standardised data across
entities.

**Who buys it.** Performance directors, heads of medical, and — for the
league-level deals — competition operations and player-health committees.
The league-level buyer is the important one: they are procuring something
that will be used to compare clubs, which raises the evidentiary bar.

**Where the uncertainty story is weak.**

1. **Integration is the sold value; inference is the marketed value.** The
   platform's defensible claim is "one clean record per athlete." The
   marketing gravitates toward injury-risk and availability insight, which is
   a much harder claim and rests on models whose out-of-sample performance is
   not, as far as can be established from public materials, published with
   per-subgroup calibration. **[verify: search for any peer-reviewed or
   preprint validation with their name on it.]**
2. **Low-base-rate arithmetic is not surfaced.** Serious injuries are rare
   events. Any flag with imperfect specificity applied to a rare outcome has
   low positive predictive value, and that arithmetic determines whether a
   flag is actionable. A platform that shows a risk score without showing the
   implied PPV at the operating base rate is letting the buyer draw the wrong
   conclusion.
3. **Cross-club comparability has no stated uncertainty.** If a league uses
   the platform to compare clubs, differences in data-collection practice
   between clubs are a confound that should widen every comparison interval.

### 1.4 Stats Perform

**What they actually sell.** Sports data at scale — event and tracking data
collection, historical archives, distribution feeds, and AI products built on
top of them, sold into media, broadcast, league, team, and betting channels
**[verify current product taxonomy and brand names]**. Their AI outputs
include live win probabilities and derived predictive/pricing products.

**Who buys it.** Broadcasters and media (for on-air graphics and editorial),
betting operators and traders (for pricing and in-play), leagues (for official
data), and teams (for opposition analysis).

**Where the uncertainty story is weak.**

1. **Probabilities are shipped as point numbers.** A live win probability of
   68% is displayed as 68%. There is no interval, no per-state reliability
   diagnostic visible to the consumer, and no statement of what the model's
   empirical coverage was on held-out games in comparable states.
2. **Segment-conditional calibration is where these models break, and it is
   not published.** Aggregate calibration is easy to achieve and easy to
   satisfy while being badly miscalibrated on the segments that matter
   (blowouts, late-game low-leverage states, unusual score differentials,
   lower-tier competitions with sparser training data).
3. **No abstention concept exists in a feed product.** A feed must emit a
   number every tick. That is a real constraint, not a failing — but it means
   the honest-abstention capability cannot be retrofitted into the feed; it
   has to live in a separate decision-support surface.

**Channel conflict to name explicitly.** They sell into betting. That makes
them a partner for the sports-science side of this strategy and a
counterparty on the betting side. Any partnership conversation has to
segregate those, and we should assume they will read our betting-facing work
as competitive.

### 1.5 Zone7

**What they actually sell.** AI injury-risk forecasting as a service: ingest
whatever the club already collects (wearable load, GPS, medical history,
wellness, testing), return per-athlete risk indications over a forward window
**[verify current output format — flags vs scores vs windows]**. This is the
purest "prediction as the product" company of the six.

**Who buys it.** Performance and medical staff at professional clubs, with
sporting-director-level sign-off because the output changes selection and
training decisions.

**Where the uncertainty story is weak.** They are the closest to what we do,
so be precise:

1. **Independent prospective validation is the whole question.** Vendor-run
   or vendor-co-authored retrospective analyses and club case studies are the
   common form of evidence in this category. What a buyer actually needs is a
   pre-registered, prospective, independently-analysed evaluation on a
   held-out season. **[verify what independent validation exists before
   asserting there is none — this is the single most important verification
   item in this document, and asserting a negative we have not checked would
   be exactly the dishonesty this strategy is against.]**
2. **A risk flag is not a probability.** "Elevated risk" is not an object you
   can do decision theory with. You cannot compute an expected cost of acting
   versus not acting from a colour.
3. **Rare-event PPV again, sharper here.** If the product's central claim is
   injury forecasting, the operating point on the risk-coverage curve *is*
   the product. Publishing it — flag rate, hit rate, and the base rate they
   are computed against — is what would settle the argument, and is precisely
   what a calibration layer produces as a byproduct.
4. **No abstention.** An athlete with three weeks of sparse data gets a flag
   on the same footing as one with three seasons of dense data.

**Strategic read.** Zone7 is the hardest partner conversation and the most
valuable one. They have the distribution and the domain relationships; the
honesty layer is the thing that would let them survive a serious independent
audit. Framed as "we make your claims defensible," it is a strengthening
offer. Framed as "your flags are uncalibrated," it is an insult. Frame
matters more here than anywhere else on this list.

### 1.6 Sparta Science

**What they actually sell.** Force-plate scanning that reduces a short
standardised movement protocol to a low-dimensional "movement signature," from
which readiness and injury-risk-flavoured scores are derived; sold as a
scan-and-score system with hardware plus platform **[verify current score
names and product structure]**. Sold beyond sport into military and health
systems.

**Who buys it.** Athletic departments, pro teams, military performance units,
and health-system musculoskeletal programmes.

**Where the uncertainty story is weak.**

1. **A proprietary composite score has unstated construct validity.** When
   several force-time variables are compressed into a small set of named
   components, the mapping from those components to injury outcome is a model,
   and it is a model whose validation should be public if the score is used
   for clearance-adjacent decisions.
2. **Per-scan sample sizes are small.** A handful of jump trials on one day
   is a small sample of a noisy process. Within-session and between-session
   variability should be the dominant term in any displayed change, and a
   "your score went down" message is frequently going to be noise.
3. **Threshold semantics again.** Scores that place an individual into bands
   inherit all the bright-line problems in §1.2.

### 1.7 Cross-cutting pattern

Reading the six together, the same four holes recur:

| Hole | Consequence for the buyer |
|---|---|
| Point estimate, no interval | Cannot distinguish a real change from measurement noise |
| Aggregate-only calibration, no subgroup diagnostics | Model can be fine overall and wrong for the athletes you care about |
| No abstention output | Every case gets a confident answer, including the ones with no basis |
| Validation not recomputable by the buyer | Trust is a vendor assertion, not a checkable fact |

None of these are measurement problems. All four are epistemics problems.
That is the wedge.

---

## 2. The honesty-layer value proposition

We are not proposing to model injury. We are proposing to wrap whatever they
already model in three properties they do not currently have.

### 2.1 Multiprobability intervals, finite-sample valid under exchangeability

`calibration/ivap.ts` and `calibration/cvap.ts` implement inductive and cross
Venn-Abers prediction. For a score `s`, the construction returns a pair
`(p0, p1)` — the isotonic calibration of `s` under each possible label for the
test point — and the interval between them is a multiprobability that is
valid in the finite-sample sense **under exchangeability of the calibration
and test points**, without asymptotics and without distributional assumptions
about the underlying model.

Three things this buys that a confidence-interval-shaped marketing number
does not:

- **It is a statement about the vendor's own model, not a replacement for it.**
  Venn-Abers takes an arbitrary score as input. Their model stays theirs.
- **The width is informative on its own.** A wide interval is the system
  saying "this score is not well determined by the calibration data" — which
  is exactly the region where a coach should not be acting on it.
- **The exchangeability caveat is stateable, and we state it.** Where
  exchangeability fails — a rule change, a new surface, a squad turnover, a
  new sensor generation — the guarantee degrades, and the honest posture is
  to say so and to monitor for it, not to claim more. `conformal/mondrian.ts`
  plus `conformal/sports-taxonomy.ts` exist to make coverage checkable per
  subgroup so that failures show up as a diagnostic instead of a surprise.

### 2.2 Selective prediction / No-Bet as a first-class output

`edge-lab/selective-gate.ts` already treats abstention as a primary output
rather than an error path: the gate fires only when the **lower** endpoint of
the calibrated interval clears the threshold — the model must clear the bar
under its own most skeptical calibrated reading — and the threshold itself is
tuned on a fold disjoint from the evaluation set, with disjointness enforced
in code (`GateSetOverlapError`) rather than asserted in a comment.

The transfer to sports science is direct, and it is the commercially
interesting half of this document.

**Why abstention is a differentiator here specifically.** In the betting
context, a confidently wrong call costs money. In injury risk, load
management, and return-to-play, a confidently wrong call has a human cost and
a professional-liability cost, and it lands on a named person:

- **False positive** — an athlete is held out on a flag that had no real
  basis. Cost: lost availability, lost development, a player who stops
  trusting the system and starts under-reporting symptoms, and a
  performance-staff member who has to defend a decision to a coach with
  nothing better than "the platform said so."
- **False negative** — a confident all-clear precedes an injury. Cost: the
  injury, plus a documented record of a system that said the athlete was fine.
  This is the failure mode that ends careers on the staff side.
- **Abstention** — the system says "I cannot honestly call this one; here is
  why (interval too wide / subgroup under-populated / data too sparse), and
  here is what would narrow it." Cost: the clinician makes the call using
  their own judgement, which is what they were going to do anyway, but now
  without a spurious number anchoring them.

The buyer-facing sentence is: **the system's willingness to say nothing is
what makes it worth listening to when it says something.** A vendor whose
product always produces a number has, by construction, no way to signal the
difference between a strong call and a guess. We do, and it is a checkable
property, not a claim.

There is also a procurement argument. A performance director who has been
burned once by a black-box risk score is a hostile buyer for another one. They
are not a hostile buyer for a layer that explicitly narrows the set of
occasions on which they are asked to trust a model.

### 2.3 The Glass Ledger recomputability property

`edge-lab/ledger-chain.ts`, `ledger-anchor.ts`, and `recompute-verifier.ts`
implement a hash-chained decision ledger with an offline verifier: every
recorded decision can be re-derived from the ledger export alone, chain
integrity is recomputable, and the decision timestamp precedes the outcome by
construction and is checked independently of the append path.

For a sports-science partner this is a *governance* feature, not a
cryptography feature. It answers the three questions that get asked after
something goes wrong:

1. **What did the system actually say, at the time, before the outcome was
   known?** Not what the current model says in hindsight, and not what a
   dashboard renders today after six model updates.
2. **Can anyone else reproduce that from the record, without our cooperation?**
   Yes — that is the point of shipping the verifier rather than an attestation.
3. **Was the record edited?** Any change to any historical entry breaks the
   chain visibly.

This matters more in this market than in betting. Injury decisions get
litigated, get grieved through player associations, and get reviewed by league
medical committees. A partner who can hand a committee a recomputable record
of what was said and when is in a materially different position from one who
can hand over a screenshot. Note also that the recomputability property is
what makes the abstention rate *auditable* — a vendor cannot quietly widen
their abstention criteria after a bad month if every decision is chained.

### 2.4 What we do not offer

Stated here so it never has to be walked back in a meeting: we do not offer a
better injury model, domain expertise in musculoskeletal medicine, a clinical
decision instrument, or any claim that adding calibration makes an
uninformative score informative. Calibration cannot manufacture signal. If
their model has no edge on a subgroup, our layer's honest output is a wide
interval and a high abstention rate on that subgroup — which is useful
information, and is also a result a partner may not want published. Assume
that tension is real and price it into the pilot terms (§4).

---

## 3. White-label / MCP packaging path

The strategic constraint: **be an embedded layer, not a competing product.**
Every one of the six companies in §1 has more sport-domain credibility, more
data, and more distribution than we do. We should never be in a bake-off
against their model. We should be the thing their model is wearing.

### 3.1 What ships

The unit of delivery is small and boring on purpose:

- **In**: their score stream (any real-valued score, no semantics required),
  historical outcome labels for calibration, and a subgroup tag per record.
- **Out**: a multiprobability interval, an act/abstain decision against a
  disjoint-fold-tuned threshold, per-subgroup coverage and width diagnostics,
  and a ledger entry that makes all of the above recomputable.

The stack behind it is already in-repo: `calibration/{pav,ivap,cvap,
aggregation,local-isotonic-patch,multicalib-audit-patch}.ts`,
`conformal/{mondrian,sports-taxonomy,levene-welch}.ts`,
`edge-lab/selective-gate.ts`, and the ledger/verifier trio. Pure TypeScript,
no ML dependencies, which is the reason all three delivery modes below are
actually feasible rather than aspirational.

### 3.2 Three delivery modes, in order of partner-friendliness

**(a) Embedded library — no data egress.** A TypeScript package that runs
inside their infrastructure. Their athlete data never leaves their perimeter.
This kills the single biggest objection in this market (medical data leaving
the club/vendor boundary) before it is raised, and it is only possible because
the stack has no external dependencies and no service calls. Commercially:
licence plus support, revenue does not scale with their usage, which is a
weakness — mitigate with per-seat or per-squad terms rather than per-call.

**(b) Hosted API.** For partners who would rather not vendor code. Scores in,
intervals and decisions out. Requires a data-processing agreement and, for
anything touching athlete health data, a real privacy review — this is the
mode where regulatory exposure is highest and it should not be the first mode
offered.

**(c) MCP server.** Expose the calibration and selective-gate stack as MCP
tools so that a partner's internal analysts, and their own LLM-based tooling,
can call `calibrate_scores`, `coverage_by_subgroup`, `should_abstain`, and
`verify_ledger` as tools from wherever they already work. This is the highest-
leverage packaging for a specific reason: it makes the honesty layer usable
without a platform-integration project. An analyst can point it at a CSV of
last season's scores and outcomes on a Tuesday afternoon and see their own
per-subgroup calibration by Wednesday. That is the shortest path from
curiosity to a number that changes someone's mind. Cross-reference
`docs/ops/CLAUDE_MCP_CONNECTOR_LEVERAGE_2026-07-24.md`.

### 3.3 Branding posture

White-label by default. The output should be able to say "Calibrated
availability confidence" in their UI with their name on it. Two carve-outs
worth negotiating for:

- **A named, linkable methodology page** — the guarantee is worthless if the
  buyer cannot read what it is. This does not have to be our brand; it has to
  be a document with the exchangeability caveat in it.
- **The verifier ships to the end customer, not just to the partner.** If the
  recomputability property (§2.3) is only exercisable by the partner, it is an
  attestation again. This is the one term to hold firm on, because it is the
  only one that is load-bearing for the entire value proposition.

---

## 4. Highest-leverage sequence

Four steps. Each has one gating question that must be answered with evidence,
not opinion, before the next step starts. If a gating question cannot be
answered, the correct action is to stop at that step — an honesty product that
advances through its own gates on vibes is self-refuting.

### Step 1 — Pilot (retrospective, one partner, one dataset)

Take one partner's historical scores plus outcomes for one or more completed
seasons. Run the calibration stack retrospectively. Produce: reliability
diagnostics overall and per subgroup, interval widths, and a risk-coverage
curve showing what accuracy looks like at each abstention rate. Nothing is
deployed; nothing touches a live decision.

Keep it cheap and short. The deliverable is a document, not an integration.

> **Gating question**: *On this partner's own data, does abstaining on the
> widest-interval decile measurably improve the accuracy of the calls that
> remain, relative to their current always-answer operating point?*

If the answer is no, the honesty layer adds nothing here and we should say so
and stop. That outcome is a real possibility and it must be survivable — do
not structure the pilot so that "it didn't help" is a commercial catastrophe.
Fixed-fee retrospective analysis, not success-contingent.

### Step 2 — Public diagnostics

Publish the methodology and a diagnostic format: what calibration curves,
per-subgroup coverage tables, and risk-coverage curves should look like for
any sports-science model, with worked examples on public or synthetic data.
Ship the verifier. Do not name the pilot partner or use their data without
explicit written permission — see §5.

The purpose is not marketing. It is to make the *standard* legible so that a
buyer can ask any vendor for it. We benefit asymmetrically from a market where
buyers ask that question, because our stack answers it by construction and the
§1 companies would have to build it.

> **Gating question**: *Can a competent outsider, given only the published
> materials and the verifier, reproduce our diagnostic numbers on a dataset we
> did not choose for them?*

If not, we have published marketing, not diagnostics, and step 3 is premature.

### Step 3 — API / embedded product

Ship one of the three §3.2 modes with a live partner, in shadow first: the
layer computes intervals and abstention decisions on real data in real time,
those decisions are logged to the ledger, and **nobody acts on them**. Compare
shadow decisions against what the partner actually did. Only after that
comparison is favourable and reviewed does anything become advisory, and
advisory is the ceiling — the layer recommends abstention, a human decides.

This mirrors the SHADOW-default posture in `docs/formal/SRQC_STATUS.md` §4,
and for the same reason: a detection layer that quietly becomes an enforcement
layer is how systems hurt people.

> **Gating question**: *Over a shadow period long enough to contain real
> disagreements, when the layer said abstain and the partner acted anyway,
> what happened — and is that record complete enough that an outside reviewer
> could reach their own conclusion from it?*

Note the second clause. A favourable shadow result with an incomplete record
does not pass this gate.

### Step 4 — Scale

Second and third partners; MCP packaging as the low-friction entry; per-sport
taxonomy expansion in `conformal/sports-taxonomy.ts`.

> **Gating question**: *Does the calibration hold on a second partner's data
> without re-tuning — and if not, is the degradation something our own
> subgroup diagnostics detect before the partner does?*

The second half is the real gate. A layer that needs bespoke tuning per
partner is a consulting business with extra steps; a layer that fails silently
on a new partner is worse than nothing. Detecting our own failure is the
minimum bar for scaling.

---

## 5. NON-CLAIMS

Stated explicitly, in the house style of `docs/formal/SRQC_STATUS.md` §6,
because this document will be read by people who did not write it.

- **No partnership, pilot, contract, conversation, introduction, or
  commercial relationship with any company named in §1 is claimed, implied,
  or in progress.** This document is a strategy sketch written from public
  understanding of a market. It is not a status report, not a pipeline
  document, and not a record of any discussion. If a reader takes away that
  any of these conversations has started, this document has failed.

- **No partner data has been analysed.** Every diagnostic described in §4 is
  a proposed procedure, not a completed one. No pilot has been run, no
  retrospective analysis exists, no risk-coverage curve on any partner's data
  has been produced.

- **No medical or clinical claim is made.** Nothing in this document asserts
  that the calibration or selective-prediction stack predicts injury,
  diagnoses any condition, informs return-to-play clearance, or is fit for any
  clinical purpose. The stack calibrates arbitrary scores; it has no medical
  content whatsoever.

- **Injury and return-to-play modelling would require domain validation that
  has not been done.** Prospective validation on the population of interest,
  clinical-expert review, and evaluation against outcomes defined by domain
  consensus rather than by us. None of that has occurred.

- **Likely regulatory review has not been done and has not been scoped.**
  Software that informs clinical decisions may fall under medical-device
  regulation depending on jurisdiction, intended use, and claims made
  (FDA/SaMD in the US, MDR in the EU, and equivalents elsewhere), and athlete
  health data is regulated personal data under GDPR and its analogues. No
  regulatory analysis, classification assessment, privacy impact assessment,
  or legal review of any of this has been performed. Any step past §4's pilot
  requires that work first, and §4's ordering does not substitute for it.

- **The finite-sample validity claim in §2.1 is conditional and the condition
  is real.** Venn-Abers validity holds under exchangeability of calibration
  and test points. Sports data violates exchangeability routinely — season
  effects, rule changes, roster turnover, sensor generations, changes in how
  a club records anything. The honest posture is that the guarantee degrades
  under drift, that subgroup coverage diagnostics are how we detect it, and
  that neither of those is a proof the guarantee holds on any specific
  partner's data.

- **Nothing in §1 is sourced beyond general public understanding of these
  companies' product categories.** No revenue figure, customer count,
  contract value, funding amount, model performance metric, or internal
  operating number appears in this document, and none should be added without
  a citation. Every **[verify]** marker is an open item, not a completed
  check. In particular, §1.5's observation about independent validation is
  framed as a verification task precisely because asserting an unchecked
  negative about a competitor would be the same failure mode this entire
  strategy is positioned against.

- **No competitor's product is claimed to be defective.** §1 identifies gaps
  in how uncertainty is *communicated* in these product categories. That is
  not a claim that any specific model is inaccurate, and we have run no
  evaluation of any competitor's model.

- **The §3 delivery modes are architecturally feasible, not built.** No
  white-label package, hosted API, or MCP server for this stack exists today.
  The underlying calibration, conformal, selective-gate, and ledger modules do
  exist in `packages/prediction-engine`; the packaging around them does not.
