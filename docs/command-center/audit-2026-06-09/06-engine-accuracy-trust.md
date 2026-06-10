# 06 — Engine / Accuracy / Trust audit

> **Lens:** the prediction engine, the GSE Rating / confidence / Edge Index, calibration
> (Brier / reliability / the 30-sample gate), the 70% win-rate *ambition* vs reality, the
> proof surfaces (performance / calibration, gated by `PERFORMANCE_STATS_ENABLED`), the
> no-fake-data guardrails, and the tier-calibration concerns.
>
> **Clones:** `DEPLOY` = `C:/Users/Garrett/Sports` (the launch target). `CANONICAL` =
> `C:/Users/Garrett/Sports-canonical-2026-06-03` (the full platform). Every finding is
> labelled with the clone it lives in. Read-only, doc-only output.
>
> **Reconciles with** the rating R&D set already on disk — `docs/command-center/data-mesh/10`
> (composite architecture), `11` (tier calibration + win-rate engine), `14` (critic). This
> audit AUDITS the *current code state* and confirms / extends those docs from a fresh read;
> it does not re-do the source-mesh research (data-mesh/20-24).

---

## Grade: **B−**

**Honest verdict.** The trust *scaffolding* here is genuinely strong and, in places, better than
most funded competitors: calibration is a real Brier + reliability implementation with a 30-sample
gate that is **evidence-only and can never auto-apply** (`apps/web/lib/calibration/compute.ts:61`,
`packages/prediction-engine/src/readiness.ts:100,124`); the performance surface fails *closed* and
holds back any win-rate until `PERFORMANCE_STATS_ENABLED` is on AND ≥25 canonical settled picks
exist (`apps/web/lib/performance/public-performance-policy.ts:47,61-71`); the per-pick audit
endpoint hard-refuses to leak Kelly/stake, true-EV, or raw payloads (`apps/web/app/api/picks/[id]/audit/route.ts:10-24`);
demo data is gated and always `PENDING` so no fake win-rate can leak
(`packages/db/src/sample-picks.ts:5-12`). The **edge itself, however, is largely circular**: the
"pricing edge" is the book's own de-vigged consensus price compared to the same consensus price,
and the two independent-estimate fields (`trueEvScore`, `fairProbability`) are hardcoded `null`
(`packages/prediction-engine/src/scoring.ts:152-187, 271-278, 393-395`). So today's headline
`confidence` is ~75/100 points of *market structure* plus a thin context layer and a `+10` floor —
a competent **consensus tracker**, not yet an engine with its own edge. The 70% ATS figure is
correctly framed everywhere I read as an *engineered north-star target*, never asserted as fact
(data-mesh/11 §6, §0). The honest path to "elite" is exactly what doc 11 lays out — independent
estimators, CLV capture, out-of-sample/walk-forward validation — none of which exists in code yet.
Two named public surfaces (`Edge Index` / `currentEdgeIndex`, and `GateDecision` rows) are **read
but never written** in production, so they are aliases / empty shells rather than the distinct
quantities their names imply. The B− reflects: trust posture A-grade, edge-reality C-grade.

---

## Findings by severity

### P1 — the engine's "edge" is circular; the two independent-estimate fields are inert

- **Clone:** DEPLOY (and CANONICAL — `scoring.ts` is identical in both; canonical
  `scoring.ts:336-360` mirrors deploy).
- **Evidence:** `packages/prediction-engine/src/scoring.ts:152-187` (`computeEdgeScore`) computes
  `rawEdge = pickedSideFairProb − offeredProb`, where `offeredProb` is
  `americanToImpliedProbability(pickedSideAvgPrice)` and `pickedSideFairProb` is the **vig-removed
  average of the same bookmaker prices** (`scoring.ts:271-278` for spreads). The "fair value" and
  the "offered price" are derived from the *same* consensus quote, so "+X% edge vs market" is
  largely a vig-and-noise artifact, not orthogonal information. The two fields that would carry an
  independent estimate are hardcoded: `trueEvScore: null, fairProbability: null`
  (`scoring.ts:393-395`, repeated at `:558-560, :710-712`).
- **Why it matters:** this is the single biggest gap between "looks like an intelligence engine"
  and "is one." A consensus-tracker can be *calibrated* (honest about its probabilities) yet have
  **no edge to monetize** — it cannot beat the close because it *is* the close. doc 11 §6.1-§6.2
  already names this precisely and it is the correct diagnosis.
- **Recommendation:** FOUNDER-gated build, shadow-first. Land an independent `fairProbability`
  built from **non-market** inputs (the activated Efficiency/Next-Gen/Trenches categories), measured
  vs the closing line by log-loss/Brier out-of-sample, promoted only if it beats/complements the
  close (doc 11 cards WIN-03 / F-11). Until then, keep public copy honest that the number reflects
  *market consensus + context*, not a proprietary probability. **No autonomous flip / no
  `MODEL_VERSION` bump.**

### P1 — `currentEdgeIndex` (the public "Edge Index" 0–100 readout) is never written in production

- **Clone:** DEPLOY.
- **Evidence:** `packages/db/prisma/schema.prisma:216` defines `currentEdgeIndex Float?  //
  public 0-100 readout for every tracked game`. A full-tree read finds it **read** in ~8 places
  (`apps/web/lib/board/state.ts:234,247,260`, `lib/bot-outbox/records.ts:129,168`,
  `lib/board/passes.ts:78,102`, `lib/game-room/load.ts:154`, `lib/studio/load.ts:56`) but **no
  production write** — no `update`/`create`/`upsert` sets it. The only assignments are in
  `__tests__` / `__fixtures__`, and those fixtures **mix scales** incompatibly: `61`, `71`, `66.2`
  (a 0–100 index) vs `3.1`, `2.7`, `0.4` (a raw edge %), which shows there is no single agreed
  definition. In production the field is therefore always `null`, and every read uses the fallback
  `Math.round(pick.edgeScore)` (`board/state.ts:234`) — i.e. the **circular edge component**
  renormalized to 0–100.
- **Why it matters:** the branded "Edge Index" public face is not its own computed quantity; it is
  an alias for the (circular) edge score. A reviewer or customer reading "Edge Index" reasonably
  assumes a distinct, populated metric. This is the same read-but-never-written pattern doc 11 §6.4
  flags for `GateDecision`.
- **Recommendation:** EITHER (a) make `currentEdgeIndex` a real, written quantity with a single
  defined scale and a production writer, OR (b) drop the field and let the public number be the
  honestly-labelled `edgeScore`. Pick one; do not ship a named metric that is permanently null +
  fallback. Decide the scale before any write. Safe/additive either way; no live switch.

### P1 — `GateDecision` audit rows are read by the board but never written (no auditable "no strong play today")

- **Clone:** DEPLOY.
- **Evidence:** `apps/web/lib/board/state.ts` and `lib/board/passes.ts` read gate decisions; the
  R&D critic already grounded that production never calls `gateDecision.create`/`upsert`
  (data-mesh/11 §6.4, ledger row "`GateDecision` read by board, never written"). My read of
  `state.ts:240-260` (the SCORING_NOW / GATED_TODAY branches) is consistent: gated rows are derived
  on the fly from game state, not from a persisted decision record.
- **Why it matters:** the honest "we only publish when the stack earns it" empty-state
  (`apps/web/app/picks/page.tsx:336-340`) is a **UI fallback**, not an **auditable record**. For a
  trust-first product, "why was nothing published" should be a queryable row, not a render-time
  inference.
- **Recommendation:** write real `GateDecision` rows when the slate gates a game (doc 11 card
  SLATE-01). Safe/additive; makes "no strong play today" an audit artifact. No live switch.

### P1 — tier-calibration defect in CANONICAL: `processGrade` is a pure within-position percentile with no absolute floor (the "Tua = Elite" mislabel risk), and missing metrics are coerced to 0 before ranking

- **Clone:** CANONICAL only (DEPLOY has **no** `player-model.ts` — confirmed: the file does not
  exist under `C:/Users/Garrett/Sports`, so the deploy product cannot produce this artifact).
- **Evidence (independently re-read this pass, closing doc 11 §3.2's open item):**
  `Sports-canonical-2026-06-03/apps/web/lib/intelligence/player-model.ts:177` —
  `const processGrade = Math.round(anchorPcts.reduce((s,v)=>s+v,0)/anchorPcts.length)` is a flat
  average of **within-position percentiles** (computed at `:172` via `percentileRanks`). There is
  **no absolute floor**. `colors.ts:27-33` then bands it: `Elite ≥85`, `High 70-84`, … So in a
  ~24-32 QB pool the Elite band (≥85) is **structurally always populated** — someone is top-decile
  every week by construction, regardless of absolute play quality. Compounding it,
  `player-model.ts:166-169` coerces missing `wopr`/`targetShare`/`dakota`/`pacr` to `0` (`?? 0`)
  **before** `percentileRanks`, which deflates the pool and **inflates** the percentile of
  metric-complete players — nudging borderline QBs across the 85 line.
- **Why it matters:** a *relative* rank ("top of this position, this week") wears an *absolute*
  word ("Elite"). This is the exact defect behind the founder's "Tua = Elite, on the Falcons"
  sighting (the team value is a live nflverse `recent_team` read, not a code constant — a separate
  data-freshness question). It is a **labeling/calibration** defect, not a roster bug.
- **Recommendation:** FOUNDER-gated where it touches the recipe (doc 11 cards RAT-05/06/07,
  TIER-02): (1) add an **absolute Elite floor** (a validated EPA/CPOE-class bar) so a weak pool
  can't mint Elite; (2) **drop-missing before ranking** instead of coercing null→0; (3) ship the
  safe/additive **"graded vs position, this season"** annotation now (no recipe surface) so a
  percentile can never again be read as an absolute claim. Defaults to current behavior until a
  founder `MODEL_VERSION` action.

### P2 — Kelly stake module inherits and amplifies the circular edge, and carries an inconsistent version tag

- **Clone:** DEPLOY.
- **Evidence:** `packages/prediction-engine/src/kelly.ts:145-154` re-derives "fair probability" as
  `fairProb = offeredProb + (edgeScore/100 × 0.05)` — i.e. the market's own implied price *plus* a
  normalized version of the already-circular edge. So the stake recommendation is sized off an edge
  that is not independent information. **Mitigant (strength):** the module is **not wired to the
  public API** — `index.ts:45-46` exports it with the comment "not wired to the public API until
  price provenance and policy review are complete," and the audit endpoint explicitly forbids
  surfacing stake values (`audit/route.ts:11,259-261`). It is referenced only by internal surfaces
  (model-court, calibration-training, compliance-scanner) and a test. Separately, `kelly.ts:2` and
  `poisson.ts:2` carry `v6.0.0` header comments while `constants.ts:2` sets `MODEL_VERSION =
  "v5.0.0"` — a cosmetic version drift.
- **Why it matters:** correctly held back today, but if/when stake sizing is ever surfaced it would
  ship a money-adjacent recommendation built on a non-independent probability. The version drift is
  minor but is exactly the kind of thing that erodes confidence in "what model produced this."
- **Recommendation:** keep Kelly gated until an independent `fairProbability` exists (it is the
  correct input for `b·p−q`/b). Money/responsible-gambling surface ⇒ **FOUNDER/LEGAL** sign-off
  before any wiring; never an autonomous flip. Reconcile the `v6.0.0` comments to the real
  `MODEL_VERSION` (or bump deliberately) so version provenance is single-sourced.

### P2 — confidence is a hand-tuned additive sum with a `+10` floor; component caps are unvalidated priors, and a low-resolution model can still read "calibrated"

- **Clone:** DEPLOY (and CANONICAL — identical).
- **Evidence:** `scoring.ts:340-348` sums `consensus + depth + edge + volatility + lineMovement +
  rest + form + dataQuality + h2h + venue + uncertainty + crossMarket + scheduleStress + 10`, then
  `clamp(…,0,100)`. The weights (`constants.ts:23-66`: consensus 30, depth 20, edge 25, etc.) are
  hand-set caps, never fit to outcomes (consistent with `canApplyCalibrationAdjustments:false`).
  The `+10` base means a minimal pick floors near 10 before any signal. Calibration tracks Brier +
  reliability (honesty) but **not resolution/discrimination** — `compute.ts:109-124` computes Brier
  per bucket but no Murphy decomposition.
- **Why it matters:** additive hand-tuned weights are a reasonable v1, but "calibrated" without
  "resolution" can be honest *and* uninformative — the model could be well-calibrated yet barely
  discriminate winners from losers. That is a real trust trap for a product whose pitch is
  *intelligence*.
- **Recommendation:** (research/evidence-only) add Brier **decomposition** (reliability −
  resolution + uncertainty) and log-loss to the calibration surface so "calibrated" can never hide
  "low-resolution" (doc 11 §4.2). Treat the component caps as priors to be validated out-of-sample,
  not facts. No autonomous weight change.

### P2 — no temporal / out-of-sample validation discipline exists in code

- **Clone:** DEPLOY (and CANONICAL).
- **Evidence:** zero grep hits for walk-forward / holdout / disjoint-split machinery; calibration
  reads the most-recent 500 settled picks with no train/test separation
  (`apps/web/lib/calibration/report.ts:36-47`). The calibration map (isotonic/Platt) does not exist
  yet, so there is nothing fit-on-a-leaky-split *today*, but there is also no harness to prevent it
  when it is built.
- **Why it matters:** sports data leaks the future trivially. The moment a realized win-rate or a
  calibration map is produced without walk-forward + a frozen holdout, the headline number becomes
  optimistic. This is the load-bearing prerequisite for *ever* publishing a rate honestly.
- **Recommendation:** before any realized-rate publish or any calibration-map fit, land the
  validation harness (doc 11 §5, card VAL-01): walk-forward CV + frozen-season holdout + a CI check
  that fit-split ≠ report-split ≠ holdout. Safe/additive (builds an *evaluation* harness; moves no
  published number).

### P3 — nested `Sports/Sports/` clone-within-clone with an older, thinner engine is a confusion hazard

- **Clone:** DEPLOY (a second git checkout nested inside it).
- **Evidence:** `C:/Users/Garrett/Sports/Sports/` is its own git repo (`.git` present) whose
  `packages/prediction-engine/src/` lacks `kelly.ts`, `poisson.ts`, and
  `evidence-readiness-matrix.ts` that the top-level deploy engine has, while sharing `MODEL_VERSION
  = "v5.0.0"`. Glob for `**/scoring.ts` returns both `Sports/packages/...` and
  `Sports/Sports/packages/...`.
- **Why it matters:** an editor or a tool can easily touch the wrong, stale engine; it muddies "what
  ships." Pure housekeeping, but it is the kind of thing that turns into a real incident.
- **Recommendation:** confirm `Sports/Sports/` is dead and remove/relocate it (FOUNDER action,
  outside this read-only pass). Not a code change to the live engine.

---

## Strengths (real, grounded)

1. **Calibration is honest and structurally non-vacuous.** `compute.ts` is a genuine Brier +
   per-bucket reliability implementation with `MIN_BUCKET_SAMPLE = 30` (`compute.ts:61`),
   `expectedFromConfidence` clamped to [0.01,0.99], pushes/voids handled, and it emits
   **proposals only** with the note "Calibration is evidence only. Proposals require human review
   and a model-version bump" (`compute.ts:146`). It cannot move a weight.
2. **The no-autonomous-learning boundary is hardcoded and auditable.**
   `readiness.ts:100` — `canApplyCalibrationAdjustments: false` as a *constant* (typed `false`),
   with a long comment that the model may learn only from real settlement outcomes + signal state,
   never from its own prior confidence/reasoning (`readiness.ts:84-93,98-100`). This is exactly the
   "verified-not-assumed / humans gate the recipe" posture the founder asked for.
3. **The performance surface fails closed and refuses premature claims.**
   `public-performance-policy.ts:61-71` blocks on `GATE_OFF_PERFORMANCE_STATS`,
   `INSUFFICIENT_CANONICAL_SAMPLE` (≥25, `:47`), and `ALL_RECENT_PICKS_BOOTSTRAP`; bootstrap picks
   are excluded from the denominator (`:192-197`); the page renders a bootstrap state with **no DB
   query and no track-record claim** when the gate is off (`apps/web/app/performance/page.tsx:108-147`),
   and always shows "Past performance does not guarantee future results."
4. **The per-pick audit endpoint is a best-in-class trust surface.**
   `apps/web/app/api/picks/[id]/audit/route.ts` exposes a forensic chain (pick → signal snapshot →
   source-snapshot **hash prefixes + byte counts**, never raw payloads), fails closed (503/404),
   excludes bootstrap data, tiers FREE→summary / PRO-ELITE→detail, and **explicitly never** exposes
   Kelly/stake, true-EV, or win-rate math (`:10-24,259-261`).
5. **The shadow-first, weight-0 discipline for un-licensed signals is real.**
   `packages/ingestion-pipeline/src/process-sport.ts:70-96` writes every missing context category
   (`PLAYER_AVAILABILITY`, `OFFICIALS`, `VENUE_ENVIRONMENT`, `PACE`, `TEAM_RATES`, …) as
   `trustLevel:0, isBootstrap:true, activationStatus:"BLOCKED_MISSING_SOURCE"` with a plain-English
   "cannot affect confidence" reason. Inactive signals are *visible and inert*, not faked.
6. **No fake win-rate can leak via demo data.** `packages/db/src/sample-picks.ts:5-12` — sample
   picks are gated by `DEMO_PICKS_ENABLED`, "Never active in production," always `result:PENDING`,
   and every UI surface shows a "Sample data" banner.
7. **Method-leakage and banned-phrase gates are wired into CI.**
   `apps/web/__tests__/method-leakage-gate.test.ts` + `apps/web/lib/trust-claims.ts`
   (`INTERNAL_VOCABULARY`) keep engine internals and overclaim language ("lock," "guaranteed") off
   public surfaces, and the test is proven non-vacuous against fixtures.
8. **The 70% target is framed correctly everywhere.** Every doc I read states breakeven 52.38% at
   −110 plainly and calls 70% an *engineered north-star*, never a publish filter and never an earned
   fact (data-mesh/11 §0, §6, §6.5). `MIN_PUBLISH_CONFIDENCE=50` / `CONSENSUS_MIN_PCT=0.55`
   (`constants.ts:8,26`) gate *under-evidenced* picks, not *sub-70%* picks — the slate stays real.

---

## What would move this from B− to A

The B− is "A-grade trust posture wrapped around a C-grade edge." To earn an A, the engine has to
become one — honestly, behind gates. In priority order (all FOUNDER-gated where they touch the
recipe; none is an autonomous flip):

1. **Make the edge non-circular (the keystone).** Ship one independent `fairProbability` built from
   **non-market** inputs (Efficiency / Next-Gen / Trenches), benchmarked vs the closing line by
   log-loss/Brier out-of-sample, **shadow-first**, promoted only if it beats/complements the close
   (doc 11 WIN-03/F-11). Until this exists, the product is a calibrated consensus tracker, not an
   edge engine. *This single item is most of the gap.*

2. **Build CLV / closing-line capture — the early scoreboard.** It does not exist anywhere today
   (only `OpeningLine`). Capture a `ClosingLine` per pick, compute per-pick CLV against a
   **pre-specified** closing reference (e.g. a fixed sharp book) with a stale-quote/limit exclusion
   rule, and track a rolling CLV-positive %. CLV proves *process* edge **before** a large settled
   sample exists (doc 11 §6.3, WIN-01/02/F-10). Public vs internal display is a positioning call.

3. **Land the temporal-validation harness before publishing any rate.** Walk-forward CV +
   frozen-season holdout + a CI assertion that fit-split ≠ report-split ≠ holdout (doc 11 §5,
   VAL-01). Without it, the first realized win-rate you publish is optimistic and the trust story
   inverts.

4. **Close the named-but-empty surfaces.** Give `currentEdgeIndex` a single defined scale + a real
   production writer (or retire the name), and write real `GateDecision` rows so "no strong play
   today" is auditable. Named metrics should be populated quantities, not aliases/fallbacks.

5. **Fix the tier-calibration defect (canonical).** Absolute Elite floor + drop-missing-before-rank
   + the safe "graded vs position, this season" annotation, so a relative percentile can never read
   as absolute skill again (doc 11 §3, RAT-05/06/07, TIER-02). Ship the annotation now; gate the
   floor.

6. **Add resolution to the calibration surface.** Brier decomposition + log-loss so "calibrated"
   can never hide "uninformative" (doc 11 §4.2). Evidence-only.

7. **Validate the component weights out-of-sample.** Treat `constants.ts` caps and the `+10` floor
   as priors; once walk-forward + canonical sample exist, confirm each component's caps and the
   grade thresholds (`GRADE_THRESHOLDS`, `constants.ts:13-18`) actually separate winners
   out-of-sample, and re-cut by a deliberate `MODEL_VERSION` bump if they don't.

8. **Housekeeping that protects the above:** reconcile the `v6.0.0` Kelly/Poisson comments to
   `MODEL_VERSION`, and resolve the nested `Sports/Sports/` stale checkout so there is one
   unambiguous engine.

> **Compliance / posture note.** Items touching money (Kelly), the realized win-rate publish, and
> any live capture of the SiriusXM/Airwave Signal layer remain **FOUNDER / LEGAL-gated and
> illustrative**. Nothing in this audit recommends an autonomous flip, a `MODEL_VERSION` bump, or
> enabling a gated feature. The existing fail-closed posture is the right default and should stay.

---

*Read-only audit. No source, test, config, schema, env, or package file in either clone was
modified. Every "today" claim above is anchored to a file:line a reading actually opened. The
≥70% figure is the engine's engineered north-star target — proven out-of-sample + CLV and reported
honestly — never asserted, never a sub-70% publish filter.*
