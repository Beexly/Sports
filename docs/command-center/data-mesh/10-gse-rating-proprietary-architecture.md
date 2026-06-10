# 10 — The GSE Rating: Proprietary Composite Architecture

> **Status:** Internal spec / founder-gated. INTERNAL ONLY — this document describes the
> recipe. The recipe is proprietary. Nothing in this file may be paraphrased onto a public
> surface beyond what the "Reveal-less Public Contract" section explicitly authorizes.
>
> **Scope discipline:** Every claim about *current* code is anchored to a file + line that a
> recon agent actually read (see `## Grounding ledger`). Everything marked **PROPOSED** is
> design, not shipped. Do not let a reader conflate the two.
>
> **Author lane:** This is RESEARCH + DESIGN. No source code, schema, config, or env was
> changed to produce it. No live switch is flipped by this doc. The SiriusXM / Airwave signal
> stays INTERNAL, founder-gated, illustrative; live capture remains legal-gated.

---

## 0. The one-paragraph thesis

There are **two artifacts** that the word "GSE Rating" has been used for, and they live in
**different clones**. This doc unifies them into one proprietary scoring doctrine and then
specifies the design that pushes toward the founder's "most intelligent engine of 2026"
mandate.

1. **The per-pick `confidence` (0–100)** — the headline number the *deploy* clone
   (`C:/Users/Garrett/Sports`) actually ships today. It is a deterministic weighted sum of
   **market + schedule/rest + ATS-form** components, clamped 0–100, surfaced publicly as the
   **Edge Index**. *This is what production scores right now.*
   (`packages/prediction-engine/src/scoring.ts:340-348`)
2. **The per-player `processGrade` (0–100)** — a within-position percentile composite that
   lives only in the *canonical* clone (`Sports-canonical-2026-06-03`,
   `apps/web/lib/intelligence/player-model.ts`). *This is not deployed.*

The **GSE Rating** as a brand is **one 0–100 number with a tier and a human read**. The
architecture below specifies a single composite doctrine that subsumes both: a hierarchical,
category-weighted, percentile-normalized, calibration-gated 0–100 score, with a **qualitative
Signal layer** (SiriusXM Ch 87 + beat report + web/Reddit aggregate) that **no competitor
ships** — built reveal-less by design, and honest about the gap between today and the target.

---

## 1. What EXISTS today vs what is PROPOSED (read this first)

| Capability | Today (deploy clone) | This doc proposes |
|---|---|---|
| Headline 0–100 number | `confidence`, market-derived weighted sum + `+10` base (`scoring.ts:340-348`) | Re-home it as the **GSE Rating composite** with explicit category tree |
| Public 0–100 readout | **Edge Index** = `Game.currentEdgeIndex` (`schema.prisma:216`), read with fallback `Math.round(pick.edgeScore)` (`board/state.ts:234`) | Keep Edge Index as the *public face*; GSE Rating composite is the internal engine behind it |
| Category inputs that feed the number | **market only + thin schedule/rest + ATS form** | Add Production, Efficiency, Next Gen, Trenches, Availability, Environment, **Signal** as *weighted, gated, shadow-first* categories |
| Production / Efficiency / NGS / Trenches | **NOT in the formula** — shadow-only, `trustLevel:0`, `weight:0`, `BLOCKED_MISSING_SOURCE` (`process-sport.ts:70-96`) | Activate as weighted estimators behind per-category gates |
| Qualitative pundit / Airwave / Reddit signal | **DOES NOT EXIST in deploy clone** (zero grep hits); exists inert in canonical (`airwave/grade.ts`) and **does not feed any Rating** | Add as a distinct, gated, low-weight **Signal layer** estimator |
| Tiers | `PickTier=FREE/PREMIUM` (paywall, conf≥70) + `PickGrade=ELITE/STRONG/SOLID/LEAN` quality ladder (`types/src/index.ts:106-114`) | Unify under one public tier ladder; keep paywall separate |
| Calibration | Brier + reliability buckets, 30-sample gate, **evidence-only, never auto-applies** (`calibration/compute.ts:146`) | Make calibration the *backbone* of "Elite means earned" |
| CLV / closing-line value | **DOES NOT EXIST** (zero grep hits anywhere) | Add as the engine's true scoreboard — the single biggest honesty + edge unlock |

**Bottom line:** today's number is ~75/100 points of *market structure* with a thin context
layer and a `+10` floor. The richer categories are *plumbed but inert*. The work is to
activate them honestly, behind gates, calibration-first — never by faking a number we did not
earn.

---

## 2. Design principles (the non-negotiables this architecture obeys)

1. **One number, one tier, one human read — in public. Recipe stays internal.** Public proves
   *results*; never *method*. (Enforced today by `method-leakage-gate.test.ts` +
   `trust-claims.ts` `INTERNAL_VOCABULARY`.)
2. **Calibration over accuracy.** A rating that implies a probability must be honest at that
   probability. We train/penalize toward calibration, publish a reliability curve, and never
   let a small sample mint a false "Elite." (Research: Brier/Murphy decomposition; the deploy
   clone already gates calibration proposals behind `MIN_BUCKET_SAMPLE=30`,
   `compute.ts:61-62`.)
3. **Shadow-first, gate-second, weight-third.** A new category enters at `weight:0`, logs its
   would-be contribution, and is measured against settled outcomes *before* a human bumps
   `MODEL_VERSION` to give it weight. (This is exactly the existing shadow-evidence pattern,
   `process-sport.ts:70-96` — we are extending it, not inventing it.)
4. **No autonomous weight change.** `canApplyCalibrationAdjustments` is a hardcoded `false`
   (`readiness.ts:100,124`). Calibration *collects evidence*; only a human `MODEL_VERSION`
   bump changes the recipe. This doc does not change that.
5. **70% ATS is the engineered north-star, not a publish filter.** Breakeven at −110 is
   **52.38%**; sustained 70% ATS is extraordinary. We build toward it and report the *realized*
   rate truthfully with its sample size and calibration curve. The data-sufficiency floor
   (`MIN_PUBLISH_CONFIDENCE=50`, `CONSENSUS_MIN_PCT=0.55`) removes *under-evidenced* picks, not
   *sub-70%* picks. The slate stays real and complete; the strongest plays lead.
6. **Reveal-less by construction.** Percentile normalization + hierarchical sub-scores +
   non-linear roll-up + an undisclosed final mapping makes the (inputs → score) system
   under-determined from any finite public sample. The moat is structural, not just policy.

---

## 3. The category tree (the proprietary composite)

The GSE Rating is a **hierarchical composite**: raw inputs → **sub-scores** → **categories** →
**0–100 Rating**. Hierarchy is what makes it both *interpretable* (category bars) and
*reveal-less* (the public never sees within-category weights). This mirrors how ESPN FPI is
built ("not a single regression model… so many layers") and the OECD composite-indicator
playbook.

### 3.1 The eight categories + weights (seven quantitative + one Signal)

Weights below are the **PROPOSED target allocation** for a fully-activated NFL game/player
Rating. They sum to 100. Each is a *category cap*; within a category, correlated inputs are
PCA/correlation-pruned into one sub-score so no underlying signal triple-counts (the central
composite-indicator trap). **Today only Market is live at weight; the rest are shadow (weight
0) until gated on.**

| # | Category | Target weight | One-line RATIONALE | Status today |
|---|---|---:|---|---|
| 1 | **Market Structure** | **28** | The closing/consensus line is a near-perfect probability estimate (Pinnacle r²≈0.997). We must respect it as the prior, not pretend to beat it blindly. | **LIVE** (consensus 30 / depth 20 / edge 25 caps, `constants.ts:23-66`) |
| 2 | **Production** | **14** | Volume + box outcomes (yards, TDs, touches, target share, WOPR) are the floor of "is this player/team actually doing it." | Shadow-only / inert |
| 3 | **Efficiency** | **16** | Per-play quality (EPA/play, success rate, DAKOTA, PACR, CPOE) separates real from empty production — the part the market under-prices fastest. | Shadow-only / inert |
| 4 | **Next Gen / Tracking** | **10** | Air yards, separation, pressure-to-sack, time-to-throw, xYAC — orthogonal signal the line often hasn't fully priced; this is where genuine edge lives. | Not present in deploy clone |
| 5 | **Trenches / Protection** | **10** | Games are won at the line: pass-block/run-block win rate, pressure rate allowed, adjusted line yards. High predictive value, low public attention. | Not present in deploy clone |
| 6 | **Availability** | **8** | Injury/inactive/snap-share reality. A correct injury read *before* the close is one of the few legal information edges over the market. | Shadow-only (`PLAYER_AVAILABILITY`, `trustLevel:0`) |
| 7 | **Environment / Matchup** | **8** | Rest, schedule density, travel, weather, pace, officials, venue, opponent-adjusted matchup. Secondary but real fatigue/context proxies. | **PARTIAL LIVE** (rest/schedule/H2H/venue form) |
| 8 | **Signal (qualitative)** | **6** | The proprietary moat: accountability-weighted human intelligence (Ch 87 + beat + crowd) the market structure cannot capture. Capped low on purpose. | **DOES NOT EXIST** — proposed |

> **Why these weights.** Market gets the plurality but **not** a majority — a deliberate
> departure from "we just re-derive the line." Efficiency > Production because per-play quality
> is more predictive and less priced. Next Gen + Trenches together (20) are the orthogonal-edge
> core. Signal is capped at 6 because it is the least falsifiable input and must *never*
> dominate a quantitative read — it breaks ties and flags what the numbers miss, it does not
> override them.

### 3.2 The Signal layer — three DISTINCT sub-inputs

The Signal category (cap **6**) is itself a hierarchy of three independently-weighted,
independently-rights-gated lanes. They are kept structurally separate because each carries a
different reliability tier, rights posture, and failure mode. *(The canonical clone already
models these as separate lanes — `siriusxm-context`, `beat-reporter-mesh`, and a described
social/crowd lane — so the separation is structural, not just conceptual.)*

> **The single Signal denominator chain (canonical — docs 10 and 12 share this one chain):**
> **Signal = 6 of the 100 Rating points → SiriusXM lane = 3 of those 6 → Beat = 2 of 6 →
> Web/Reddit aggregate = 1 of 6.** The sub-weights below (3 / 2 / 1) are *shares of the 6*. A
> given Ch 87 *show's* weight is then a **share of SiriusXM's 3** — the per-show percentages in
> doc 12 §2.2 (FF Morning 18%, Elite 14%, …) are percentages **of that 3**, not a second budget.
> Enforced invariant: realized SiriusXM contribution ≤ 3 and total Signal ≤ 6 of the 100 Rating
> points, regardless of per-show shares.

| Signal sub-input | Sub-weight (of 6) | Source lane | What it contributes | Gating |
|---|---:|---|---|---|
| **SiriusXM Ch 87** (Fantasy Sports Radio) | **3** | `siriusxm-context` (satellite, licensed) | Accountability-weighted expert lean on a player/matchup, de-noised through the pundit ledger | `AIRWAVE_ENABLED` **+** `AIRWAVE_SIRIUSXM_LEGAL_ACK` **+** proposed `AIRWAVE_RATING_INPUT_ENABLED` |
| **Beat report** | **2** | `beat-reporter-mesh` (licensed, manual-review) | Local-beat ground truth: practice participation, role/usage notes, coach signals | `AIRWAVE_ENABLED` + manual review |
| **Web / Reddit aggregate** | **1** | proposed `crowd-aggregate` lane (net-new adapter) | Directional crowd-sentiment lean, lowest trust, smallest weight | proposed flag; **net-new build** |

**Critical honesty notes on Signal (grounded):**
- In the **deploy clone**, Airwave/SiriusXM/pundit code **does not exist at all** (zero grep
  hits). Productizing Signal there is a **port + build**, not a wiring of something present.
- In the **canonical clone**, Airwave is fully built but **inert**: capture is founder-gated
  (`AIRWAVE_ENABLED`), satellite is additionally legal-gated (`AIRWAVE_SIRIUSXM_LEGAL_ACK`),
  doctrine is **paraphrase-only / no audio archive / fictional personas until founded**
  (`airwave/types.ts:10-24`), and **no Airwave signal feeds any Rating today** — its only
  consumer is a media-dashboard status read (`media/control-plane.ts:81`).
- The **honest unit** for Signal is **not** raw takes. It is, per subject/entity, the
  **accountability-weighted aggregate of that lane's settled, falsifiable claims**, reusing the
  existing pundit `accountabilityIndex` (`airwave/grade.ts:23-34`). A loud low-index pundit
  contributes ≈0 by design. This is the integrity property the moat leans on.
- The **web/Reddit aggregate adapter does not exist** in either clone (the social lane is
  described but "no social sentiment score is live"). It is net-new.

---

## 4. How sub-scores roll up into the 0–100 GSE Rating

### 4.1 The roll-up pipeline (PROPOSED, calibration-first)

```
raw inputs
  └─ (1) IMPUTE      missing input → drop from its sub-score (never coerce null→0; see §4.4)
  └─ (2) NORMALIZE   each input → percentile/rank within its peer pool (reveal-less, outlier-robust)
  └─ (3) DE-CORRELATE PCA / correlation-prune a category's inputs into ONE sub-score
  └─ (4) SUB-SCORE   category sub-score ∈ [0,1]
  └─ (5) SHRINK      empirical-Bayes / James-Stein pull toward prior when sample is thin (§4.3)
  └─ (6) WEIGHT+ROLL category weights (§3.1) combine sub-scores
                     → geometric-leaning aggregation so one spiked category can't fake "Elite"
  └─ (7) MAP         monotone, undisclosed map to 0–100  ← the GSE Rating
  └─ (8) CALIBRATE   reliability check vs settled outcomes; evidence-only, human-gated
```

- **Normalization = percentile/rank.** Discards the raw cardinal value, so the public "82nd
  percentile" leaks nothing about the underlying metric or its weight. Robust to outliers.
- **Aggregation = geometric-leaning, not pure additive.** Pure additive lets one spiked
  category fully compensate a hole; geometric partially penalizes imbalance, so "Elite"
  requires *all-round* quality. This is a deliberate value judgment and stays internal.
- **The final 0–100 map is monotone but undisclosed.** Combined with percentile inputs and
  hierarchical sub-scores, an outsider observing (inputs → score) on any finite public sample
  faces an under-determined system. *That is the reverse-engineering defense.*

### 4.2 Today's actual roll-up (GROUNDED — what ships now)

The deploy clone's headline number is the SPREAD `confidence`
(`scoring.ts:340-348`), a flat weighted **sum** (not yet geometric), clamped 0–100:

```
confidence = clamp(
  consensusScore + depthScore + edgeComponentScore + volatilityPenalty +
  lineMovementScore + restAdvantageScore + historicalFormScore + dataQualityPenalty +
  headToHeadScore + venueFormScore + uncertaintyPenalty + crossMarketScore +
  scheduleStressScore + 10,   // +10 baseline added to EVERY pick
  0, 100)
```

Component caps (`constants.ts:23-66`): Consensus **30**, Market Depth **20**, Pricing Edge
**25**, Line Movement **±15**, Volatility **−15**, H2H **±5**, Venue **±5**, Uncertainty
**−8**, Cross-market **−3/+4**, Schedule Stress **±5**; overall ATS form **±10** (defined in
`game-context.ts`). TOTAL and MONEYLINE use reduced subsets (`scoring.ts:521-527`,
`:660-667`).

**Gap to close:** this is additive (not geometric), market-dominated (~75/100), and carries a
flat `+10` floor — i.e. the *current* roll-up is the §4.1 pipeline with steps 2–6 collapsed to
"market only." The architecture work is to flesh out 2–6 per category, shadow-first.

### 4.3 Shrinkage — so a small sample can never mint a false "Elite" (PROPOSED)

The mandate's explicit guard. Apply empirical-Bayes / James-Stein shrinkage at step (5): a
player/team/pick with few settled or few qualifying observations gets its sub-score **regressed
toward the population prior** until evidence accumulates. Consequence: the top tier requires
**both** a high point estimate **and** sufficient n. This generalizes the existing publish
gates (`MIN_BUCKET_SAMPLE=30` in calibration, `MIN_CANONICAL_DEFAULT=25` in public-performance
policy) from the *publishing* layer down into the *scoring* layer.

> Directly fixes the canonical-clone calibration flaw the recon surfaced: `processGrade` is a
> pure within-pool percentile with **no absolute floor**, so the "Elite" band (≥85) is
> *structurally always populated* — the #1 QB scores ~100 regardless of whether he is
> absolutely elite. Shrinkage + an **absolute anchor floor** on the Elite band (e.g. a fixed
> EPA/CPOE bar in addition to the ≥85 percentile) stops a down year for a position from minting
> "Elite" QBs.

### 4.4 The null→0 coercion bug (GROUNDED, canonical clone)

`player-model.ts:167-169` coerces a missing DAKOTA/PACR to `0` *before* percentile ranking,
which deflates the pool and inflates the percentile of QBs who *do* have the metric — nudging
borderline QBs across the 85 line. The architecture mandates **step (1): a missing input drops
out of its sub-score** (as the model's own docstring already promises), never coerces to 0.
*(Recommendation only; no code changed here.)*

### 4.5 Per-position weighting (PROPOSED)

The category tree is *position-aware*: the same eight categories, re-weighted per role, because
what predicts QB value ≠ what predicts OL value.

| Position | Heaviest categories | Rationale |
|---|---|---|
| **QB** | Efficiency (EPA/CPOE/DAKOTA) > Production > Next Gen (air yards) | QB value is per-dropback quality, not volume |
| **WR/TE** | Next Gen (separation, target share, WOPR) > Production > Efficiency | Opportunity + separation drive receiving value |
| **RB** | Production (touches) + Trenches (the line in front) > Efficiency | RB output is heavily line-dependent |
| **OL** | Trenches/Protection (PBWR/RBWR, pressure allowed) dominates | The unit *is* the trenches category |
| **Team/game (picks)** | Market + Environment/Matchup + Efficiency | Game-level ATS is market-anchored, matchup-adjusted |

Per-position weight vectors are **internal constants** (like the existing `WEIGHTS`/
`ANCHORS.QB`), never published.

### 4.6 Per-matchup adjustment (PROPOSED)

After the base Rating, apply a bounded **matchup delta**: the subject's category sub-scores are
adjusted by the *opponent's* complementary sub-scores (e.g. a WR's Next Gen score is nudged by
the opposing secondary's coverage grade; a pass-rush Trenches score is nudged by the opposing
OL's protection grade). The delta is **capped** (proposed ±X internal) so matchup context
*tilts* but never *overturns* the base read — preserving calibration. This is the structural
home for opponent-adjustment that FPI describes ("adjusted for… opponent strength").

---

## 5. The "elite engine of 2026" ambition — where this beats competitors (kept honest)

### 5.1 The moat: an accountability-weighted qualitative Signal layer that NO competitor ships

ESPN FPI/QBR and PFF are purely quantitative. None of them ingest **broadcast/expert
intelligence as a falsifiable, accountability-scored input**. The GSE Signal layer does — and
does it with integrity:
- Every pundit/source carries an `accountabilityIndex` earned on **settled, falsifiable**
  claims (`airwave/grade.ts`). Unfalsifiable takes score nothing.
- A claim only moves the Rating in proportion to its source's *earned* track record and stated
  confidence. Loud-but-wrong → ≈0 weight, automatically.
- Capped at 6/100, shadow-first, gate-stacked. It *finds what the numbers miss and breaks
  ties*; it never overrides a quantitative read.

**This is the proprietary edge:** a defensible, legally-careful pipeline that turns Ch 87 +
beat + crowd chatter into a *bounded, calibrated, accountability-weighted* number — something
no public rating product attempts.

### 5.2 The honest edge thesis: beat the *opening* line, respect the *closing* line

The research is unambiguous: the closing line is near-perfectly efficient (Pinnacle r²≈0.997;
favorite-longshot bias vanishes by close). So we **cannot** claim to out-think the close by
re-deriving it. The edge must be **orthogonal, faster information** the close hasn't priced yet
— exactly what Next Gen + Trenches + Availability + Signal provide. The proof we had real
information is **Closing Line Value (CLV)**.

### 5.3 CLV — the engine's true scoreboard (PROPOSED; biggest single unlock)

**Grounded gap:** CLV / closing-line capture **does not exist anywhere** in the deploy clone
(zero grep hits); only `OpeningLine` exists, used for line-movement and ATS settlement. This is
the **single biggest hole** for *proving* sustained edge before a large settled sample
accumulates.

- **Build:** capture a `ClosingLine` snapshot per pick (alongside the existing `OpeningLine`)
  and compute a per-pick CLV (bet-time price vs closing price).
- **Target:** >60–65% of picks CLV-positive over 200+ wagers signals a genuine, repeatable edge
  (sharps run ~75%).
- **Why it matters:** CLV de-noises results — you can know the *process* has edge **before** the
  variance of W/L resolves and long before the 300–500-bet bar a credible win-rate headline
  needs.
- **Reveal-less:** CLV is a *results* proof that exposes **nothing** about the recipe — though
  whether to show it publicly vs keep it internal is a founder/positioning call (it does reveal
  the beat-the-close framing to competitors).

### 5.4 Independent estimators, not circular edge (PROPOSED)

**Grounded flaw:** today's "edge" de-vigs the book's *own* consensus price
(`scoring.ts:271-278`), so "edge vs market" is largely **circular**; `trueEvScore` and
`fairProbability` are wired but hardcoded `null` (`scoring.ts:392-393`). The architecture
requires at least one **truly independent probability estimate** (from the activated
Efficiency/Next Gen/Trenches categories, ideally a stacked ensemble) so the model has something
*orthogonal* to the line to beat the close with — then measured by CLV.

### 5.5 Calibration is the trust artifact, not the accuracy number

We publish a **reliability curve** (already computed: `calibration/compute.ts:84-148`, Brier +
per-bucket observed-vs-expected) as the public honesty proof. It reveals method nothing while
proving the number means what it says. Train/penalize with log loss (punishes confident-wrong
hardest); post-hoc isotonic/Platt on a held-out split; never auto-apply (human `MODEL_VERSION`
gate stays).

---

## 6. Reveal-less public contract — exactly what is public vs gated

### 6.1 The public contract (three things only)

A consumer sees **exactly**:
1. **The number** — the public **Edge Index** (0–100), the face of the GSE Rating.
2. **The tier** — one label (see §6.3).
3. **The human read** — a plain-language sentence on *what it means and why it matters*, with
   **zero** internal vocabulary, weights, constants, or category math.

Nothing else. No weights, no normalization constants, no aggregation function, no category
sub-weights, no "Ch 87 is an input."

### 6.2 Public vs gated map (GROUNDED to current entitlements)

| Item | FREE / public | PRO | ELITE | Source |
|---|:--:|:--:|:--:|---|
| Edge Index (public 0–100) | ✅ `canSeeEdgeScore` | ✅ | ✅ | `types/src/index.ts:88-100` |
| Data-quality score | ✅ always public | ✅ | ✅ | `index.ts:42` |
| Pick selection + human read | ✅ | ✅ | ✅ | board / `picks/page.tsx` |
| Tier label | ✅ | ✅ | ✅ | `PICK_GRADE_LABELS` |
| Reliability curve / settled record (when gated on) | ✅ results-proof | ✅ | ✅ | `performance/page.tsx`, `public-performance-policy.ts` |
| Raw `confidence` number | ❌ | ✅ `canSeeConfidence` | ✅ | `index.ts:93` |
| Line movement | ❌ | ✅ | ✅ | `index.ts:94` |
| Factor breakdown (per-category bars) | ❌ | ✅ `canSeeFactorBreakdown` | ✅ | `index.ts:95` |
| Category **weights / constants / aggregation formula** | ❌ | ❌ | ❌ | **NEVER** — `methodology/page.tsx:35` |
| "Signal layer exists / Ch 87 is an input / its weight" | ❌ | ❌ | ❌ | **NEVER** |
| CLV (if shown at all) | founder call | — | — | proposed |

### 6.3 The public tier ladder (reconcile the inconsistency)

**Grounded inconsistency to resolve:** three ladders currently coexist and partially disagree —
`PickTier` FREE/PREMIUM (paywall, `scoring.ts:355`), `computePickGrade(confidence, edgeScore)`
two-input quality ladder (`types/src/index.ts:106-114`), and a **second, divergent**
single-input `gradeForConfidence` table (`packages/brand/src/grades.ts`). The founder-brief
labels "Elite/High/Solid/Risk" do **not** exist in the deploy clone; the live labels are
**Elite Play / Strong Play / Solid Play / Lean**.

**PROPOSED resolution — one public quality ladder, one separate paywall gate:**
- **Quality tier (public):** `Elite · Strong · Solid · Lean` — keep the **two-input**
  `computePickGrade` (confidence **and** edge) as the source of truth; **deprecate the divergent
  single-input `brand/src/grades.ts` table** to remove the inconsistency (founder-gated change).
- **Paywall gate (orthogonal):** FREE/PREMIUM stays a *separate* axis (conf≥70), never conflated
  with quality. A pick can be high quality and still gated by tier.
- For a **player** Rating, the public band names map cleanly: `Elite ≥85 · High 70–84 · Solid
  55–69 · Watch 40–54 · Risk <40` (canonical `colors.ts:27-33`), **with** the §4.3 absolute
  floor on Elite and a **relative-rank annotation** ("graded vs. position, this season") so a
  percentile rank never reads as an absolute claim.

---

## 7. The FREE / PRO / ELITE value gradient (depth sold, method never)

The gradient sells **depth and timeliness**, never **method**. Every tier sees a *real*,
*complete* slate; higher tiers see *more resolution* on the same honest number.

| | **FREE** | **PRO** | **ELITE** |
|---|---|---|---|
| **Promise** | "See the number you can trust." | "See the why behind the number." | "See it first, and see everything." |
| The Edge Index + tier + human read | ✅ | ✅ | ✅ |
| Daily pick limit | 1/day (`dailyPickLimit`, `index.ts:98`) | unlimited | unlimited |
| Raw confidence number | ❌ | ✅ | ✅ |
| Per-category factor bars (Production / Efficiency / Trenches…) — **bars only, no weights** | ❌ | ✅ | ✅ |
| Line movement + market structure detail | ❌ | ✅ | ✅ |
| Reliability curve + settled record (results proof) | ✅ headline | ✅ full | ✅ full |
| CLV trend (if surfaced) | ❌ | ❌ | ✅ |
| Real-time alerts | ❌ | ❌ | ✅ `canGetAlerts` (`index.ts:97`) |
| Signal-layer *existence* / weights / aggregation formula | **NEVER** | **NEVER** | **NEVER** |

**The invariant:** the jump from FREE→PRO→ELITE is **more depth on the same truthful number**
(breakdown bars, line context, alerts, CLV) — it is **never** "we'll show you the recipe."
Method opacity is identical at every tier; only resolution and speed scale.

---

## 8. Slate behavior — leading with strength, honestly (PROPOSED)

The Rating feeds slate presentation. Today nothing ranks/leads the slate by grade; the
`GateDecision` audit table is **read** by the board but **never written** by production code
(no `gateDecision.create`/`upsert` exists). PROPOSED:
- Partition the published slate by the §6.3 quality tier; **lead with Elite/Strong**.
- Write real `GateDecision` rows (status + `reasonCode`) so the board's existing GATED/PUBLISHED
  lanes light up and "no Strong play today" becomes an **auditable record**, not just a UI
  fallback.
- Keep the conf<50 / consensus<0.55 floor as a **data-sufficiency** filter — explicitly **not**
  a sub-70% win-rate refusal. The honest empty-state copy already exists
  (`picks/page.tsx:336-340`: "We only publish when the stack earns it…"). A "no Strong play
  today, here are the leans" banner slots beside it.

---

## 9. Grounding ledger (every "today" claim → file:line a recon agent read)

| Claim | Anchor |
|---|---|
| Headline number is per-pick `confidence`, summed + clamped + `+10` base | `packages/prediction-engine/src/scoring.ts:340-348` |
| Component caps (Consensus 30 / Depth 20 / Edge 25 / etc.) | `packages/prediction-engine/src/constants.ts:23-66` |
| `MODEL_VERSION=v5.0.0`, `PREMIUM=70`, `MIN_PUBLISH=50`, `CONSENSUS_MIN=0.55` | `constants.ts:2-8,82` |
| Contextual sub-scores (line move / rest / form / H2H / venue / schedule / uncertainty / data-quality) | `packages/prediction-engine/src/game-context.ts:30-44, 58-725` |
| Production/Efficiency/NGS/Trenches NOT in formula; 8 categories shadow-only, `trustLevel:0`, `weight:0`, `BLOCKED_MISSING_SOURCE` | `packages/ingestion-pipeline/src/process-sport.ts:70-96`; `scoring.ts:79-96` |
| `computePickGrade(confidence, edgeScore)` two-input ladder | `packages/types/src/index.ts:106-114` |
| Divergent single-input grade table (inconsistency) | `packages/brand/src/grades.ts:3-37` |
| Entitlements (FREE sees Edge Index + data-quality; confidence/breakdown gated; alerts ELITE) | `packages/types/src/index.ts:88-100` |
| Public number = Edge Index `currentEdgeIndex`, read with fallback `round(edgeScore)` | `packages/db/prisma/schema.prisma:216`; `apps/web/lib/board/state.ts:234` |
| Methodology page publishes 10 factors + 3-step stack, withholds weights/constants/aggregation | `apps/web/app/methodology/page.tsx:15-41` |
| Reveal-less is test-enforced | `apps/web/__tests__/method-leakage-gate.test.ts`; `apps/web/lib/trust-claims.ts` |
| Calibration: Brier + reliability buckets, 30-sample gate, evidence-only | `apps/web/lib/calibration/compute.ts:61-62, 84-169, 146` |
| No auto weight change (`canApplyCalibrationAdjustments=false`) | `packages/prediction-engine/src/readiness.ts:100,124` |
| Public-performance policy: ≥25 canonical, bootstrap excluded | `apps/web/lib/performance/public-performance-policy.ts:47` |
| CLV / closing line: **does not exist anywhere** (only `OpeningLine`) | (zero grep hits; `OpeningLine` model) |
| "Edge" de-vigs the book's own consensus (circular); `trueEvScore`/`fairProbability`=null | `scoring.ts:271-278, 392-393` |
| `GateDecision` read by board, never written | `apps/web/lib/board/state.ts:144`, `board/passes.ts:58`; no writer |
| Airwave/SiriusXM/pundit absent from deploy clone | (zero grep hits in `C:/Users/Garrett/Sports`) |
| Airwave built-but-inert in canonical; pundit signal feeds NO Rating | canonical `airwave/grade.ts:23-34`, `media/control-plane.ts:81`; `rating-why.ts:24-42` |
| Player `processGrade` = within-position percentile, no absolute floor; small capped pool | canonical `player-model.ts:172-177, 75, 142` |
| null→0 coercion on DAKOTA/PACR | canonical `player-model.ts:167-169` |
| Player tier bands Elite/High/Solid/Watch/Risk | canonical `apps/web/lib/intelligence/colors.ts:27-33` |

---

## 10. Open decisions for the founder (gated, not auto-actioned)

1. **Which artifact is the GSE Rating brand** — the picks `confidence` (what deploys) or the
   player `processGrade` (richer, canonical-only)? This doc unifies the doctrine but they are
   different code artifacts in different clones; productizing the player Rating in the deploy
   clone is a **port**, not a config flip.
2. **Activate categories** — each of Production/Efficiency/NGS/Trenches/Availability/Signal is a
   shadow→gated→weighted promotion requiring a data source, a shadow-measurement period, and a
   human `MODEL_VERSION` bump. Sequence + go/no-go is a founder call.
3. **Build CLV** — net-new `ClosingLine` capture. Highest-leverage honesty + edge unlock. Build
   internal first; public CLV display is a separate positioning call.
4. **Resolve the grade-ladder inconsistency** — deprecate `brand/src/grades.ts` in favor of the
   two-input `computePickGrade` (founder-gated change; touches the recipe surface).
5. **Signal layer go-live** — requires the Airwave port into the deploy clone **plus**
   `AIRWAVE_ENABLED` + `AIRWAVE_SIRIUSXM_LEGAL_ACK` (media-attorney sign-off) **plus** a new
   `AIRWAVE_RATING_INPUT_ENABLED` gate, run shadow-first. The web/Reddit aggregate adapter is
   net-new. None of this is flipped by this doc.
6. **Elite absolute floor** — add a fixed absolute anchor to the Elite band so a relative
   percentile can't mint false "Elite" in a down year for a position. Touches the recipe;
   founder-gated.

---

*End of spec. No code, schema, config, env, or live switch was modified to produce this
document. SiriusXM/Airwave remains internal, founder-gated, illustrative; live capture stays
legal-gated.*
