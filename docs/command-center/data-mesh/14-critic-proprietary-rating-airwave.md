# 14 — Adversarial Critic: Proprietary GSE Rating + Airwave/SiriusXM Signal

> **Role:** Adversarial red-team audit of docs `10-gse-rating-proprietary-architecture.md`,
> `12-siriusxm-ch87-source-catalog-and-ingestion.md`, and the `13-build-cards-*` pair
> (`.md` + `.jsonl`). The job is to break these docs on five axes — fabrication, recipe
> leak, live-switch safety, honesty of the 70% north star, and completeness — then issue a
> verdict + prioritized fix list.
>
> **Note on the doc set:** there is **no `11-*` file** in
> `docs/command-center/data-mesh/`. Doc 13 already discloses this ("Doc `11-*` was not yet
> on disk when this was written"). The audit therefore covers 10, 12, 13(.md/.jsonl). The
> absence of 11 is **honestly disclosed**, not hidden — see Completeness §C.
>
> **Author lane:** RESEARCH + DOC only. No source/test/config/package/env file was changed.
> This critic flips no live switch. Every "current-code" judgment below was re-verified by
> reading the cited file in the deploy clone (`C:/Users/Garrett/Sports`); my independent
> grounding checks are logged in §F.

---

## Verdict: **GO-WITH-FIXES**

The three substantive docs are, to an unusual degree, **honest and grounded**. I independently
re-read 16 of the load-bearing code citations and **every one matched** (§F). The SiriusXM
lineup is web-cited with explicit per-row confidence and self-corrects the founder's own
brief (drops "Establish the Run," flags FTN as unconfirmed). The reveal-less posture is
coherent and the 70% framing is handled correctly in the prose. No fabrication, no recipe
leak, and no un-gated live switch rose to a NO-GO.

It is **GO-WITH-FIXES** rather than clean GO because there are a **small number of real
defects** — three weight-arithmetic / consistency errors, one Signal-cap collision that could
become a recipe-leak vector if mishandled, a couple of places where confidence language is
softer than the evidence, and meaningful completeness gaps (no `11`, no leakage budget for the
reliability curve, no holdout/temporal-validation discipline spelled out). None are
disqualifying; all are fixable in-doc without touching code.

---

## 1. FABRICATION audit

**Finding: No fabrication detected.** Every category below was checked.

### 1a. SiriusXM show/time claims — all cited, confidence-tagged, and caveated

The Ch 87 catalog (doc 12, Part 1) is the highest fabrication-risk surface and it is handled
**correctly**:

- Every row carries a **Source** column and a **Confidence** tier (HIGH / MEDIUM / LOW-MEDIUM).
- The doc explicitly **down-corrects the brief's own window** ("brief framed 5a–11p; verified
  live programming closer to 7a–11p") rather than rubber-stamping it.
- It refuses to assert what it cannot certify: FTN slot marked **UNCONFIRMED** (Thu-1pm listing
  vs Sat-9am launch release, both cited); Fantasy Life flagged as possibly seasonal; precise
  midday clock times flagged as re-verify-at-launch.
- It **kills a likely fabrication at the source**: "Establish the Run — NOT VERIFIED on Ch 87…
  do not list it," correctly reasoning it was acquired by FanDuel. Doc 13 (`SXM-03`) carries
  that exclusion into the build card. This is the single best honesty move in the set.
- Ten source URLs are listed (doc 12 lines 92–102).

**Residual risk (not fabrication, but a trap for the next agent):** several MEDIUM-confidence
slots are stated as specific clock times (e.g. "Elite Sports ~2–5pm," "RotoBaller Radio
~7:00am") that the doc's own caveat says it **cannot certify**. The prose is honest, but a
downstream reader skimming the table could mistake a MEDIUM time for fact. **Fix F-7.**

### 1b. Current-code claims (weights / tiers / Tua) — all grounded; I re-verified

I independently re-read the deploy clone for the load-bearing claims. **All matched** (full log
in §F). Specifically:

- The headline confidence formula and `+10` floor: matches `scoring.ts:340-348` **exactly**.
- Component caps (Consensus 30 / Depth 20 / Edge 25 / LineMove 15 / Volatility −15 / H2H 5 /
  Venue 5 / Uncertainty −8 / Cross-market −3/+4 / Schedule 5): match `constants.ts:23-66`.
- `MODEL_VERSION=v5.0.0`, `PREMIUM=70`, `MIN_PUBLISH=50`, `CONSENSUS_MIN_PCT=0.55`: match
  `constants.ts:2,7,8,26`.
- Two-input `computePickGrade(confidence, edgeScore)`: matches `types/src/index.ts:106-114`,
  labels "Elite/Strong/Solid Play + Lean" (`PICK_GRADE_LABELS:116-120`).
- The **divergent single-input** `gradeForConfidence`: confirmed real and genuinely divergent
  at `brand/src/grades.ts:32-37` (keys off confidence only, thresholds 85/75/65/50; no edge
  input). The inconsistency the docs flag is real.
- Entitlements (FREE sees Edge Index + data-quality; confidence/line/breakdown gated to PRO+;
  alerts ELITE; FREE dailyPickLimit 1): match `types/src/index.ts:88-100`.
- Calibration `MIN_BUCKET_SAMPLE=30`, evidence-only: matches `compute.ts:61`.
- `canApplyCalibrationAdjustments: false`: matches `readiness.ts:100,124`.
- `trueEvScore: null`, `fairProbability: null` (the "circular edge" honesty point): matches
  `scoring.ts:394-395`.
- CLV / `ClosingLine` **does not exist** anywhere in code (my grep: zero hits outside docs);
  `OpeningLine` model exists (`schema.prisma:240`). Claim accurate.
- `gateDecision.create|upsert` **never written** (my grep: zero hits). Claim accurate.
- Public number = `currentEdgeIndex` "public 0-100 readout" (`schema.prisma:216`). Accurate.
- Methodology page publishes the factor list + 3-step stack but states "weights, constants,
  and aggregation formula stay proprietary" (`methodology/page.tsx:35`). Accurate.
- **Airwave / SiriusXM / pundit absent from the deploy clone:** my repo-wide grep for
  `airwave|siriusxm|pundit|ch 87` returned **only the four data-mesh docs — zero code files.**
  The docs' central "must be ported, not wired" premise is verified.

> **"Tua" check:** The brief flags a specific risk of an invented "Tua's team/tier" claim. **No
> doc in this set names Tua, any player's current team, or any player's current tier.** There is
> nothing to fabricate here because the docs correctly stay at the architecture layer and never
> assert a live player rating. This is the right call — flagged as a *strength*, not a gap.

### 1c. Win-rate / accuracy numbers — none asserted as earned

No doc states a realized win rate or accuracy figure as a fact about the product. Every number
in the 70%/CLV neighborhood is framed as a **target** or a **research benchmark** with its
source:
- "70% ATS… extraordinary vs 52.38% breakeven" — breakeven math is correct (−110 ⇒ 110/210 =
  0.5238) and is labeled the engineered north-star, not a claim (doc 10 §2.5, §5).
- "CLV-positive >60–65% over 200+ … sharps run ~75%" — labeled a target + an external benchmark,
  not a measured result (doc 10 §5.3).
- "Pinnacle r²≈0.997" — cited as research about closing-line efficiency, used to argue we
  *cannot* beat the close, i.e. used **against** over-claiming. Good.

**One soft spot (not fabrication, but tighten):** the "~75/100 points of market structure"
shorthand (doc 10 §1, §4.2; doc 12 §2.1) is an *approximation* of the live caps (Consensus 30 +
Depth 20 + Edge 25 = 75 of the positive-cap budget), stated as if precise. It's directionally
true but the real sum of all caps isn't 100 (penalties are negative, several context caps exist,
and there's a flat +10). Label it "≈75 of the positive market caps" to avoid implying a clean
75/100 decomposition. **Fix F-6.**

---

## 2. RECIPE-LEAK audit

**Finding: No recipe leak in the proposed public surface.** The public contract is disciplined.
Two structural risks to harden.

What the public surface exposes (doc 10 §6.1, §7; doc 12 §3.6): **the number (Edge Index), one
tier label, a plain human read, and — when sample-gated — a reliability curve / settled record.**
Explicitly **NEVER** public: category weights, normalization constants, the aggregation function,
shrinkage priors, anchor floors, per-position vectors, the matchup cap, and the **existence** of
the Signal/SiriusXM lane. Doc 13 `RLS-01` extends the existing `method-leakage-gate.test.ts` +
`INTERNAL_VOCABULARY` to fail CI if any of that new vocabulary reaches a client bundle or public
DTO. This is the correct enforcement model and it is grounded in a real, already-passing test
surface (verified `methodology/page.tsx:35` posture).

**Leak risk L-1 (MEDIUM) — the reliability curve is a method side-channel.** Docs 10 §5.5 and
13 `PRF-01` publish a per-confidence-bucket observed-vs-expected reliability curve as the public
trust artifact and assert it "reveals method nothing." That's **slightly too strong.** A bucketed
calibration curve does leak *something*: the bucket edges, the implied confidence distribution,
and — across enough settled samples — the shape of the confidence→outcome mapping. It does **not**
leak weights or categories, so this is not a recipe leak in the protected sense. But "reveals
nothing" should become "reveals **results**, not the recipe — and is published only at the
existing ≥25-sample gate, with bucket granularity chosen so it cannot be inverted into the
confidence map." **Fix F-3.**

**Leak risk L-2 (LOW, latent) — per-category factor bars at PRO.** Doc 10 §7 and doc 13 `RLS-02`
sell "per-category bars (values, no weights)" at PRO+. Showing a *named* category bar (e.g. a
"Trenches" bar) is itself a partial recipe disclosure: it confirms the category exists and is an
input. The docs are aware (they keep weights off the bars) but should add the explicit rule that
**bar values are percentile/normalized outputs, never raw inputs or weighted contributions**, and
that the Signal/SiriusXM lane **never appears as a named bar at any tier** (doc 10 §7 already says
this for Signal; make it an explicit `RLS-02` acceptance test). **Fix F-4.**

**No leak found** in: the JSONL acceptance criteria (every `RAT-*`/`SXM-*` card asserts
"not exported to any client bundle" / "server-only" / "method-leakage test passes"); the tier
map (doc 10 §6.2 marks weights/constants/aggregation and "Signal layer exists" as ❌ at **all**
tiers incl. ELITE); the SiriusXM design (doc 12 §3.6 keeps lane existence internal).

---

## 3. LIVE-SWITCH SAFETY audit

**Finding: Every live-switch item is correctly gated. No un-gated deploy/flip/capture.**

I cross-checked each switch-flipping action against its stated gate:

| Live action | Doc location | Gate stated | Correct? |
|---|---|---|---|
| Activate any category weight (>0) | 10 §2.3, 13 `RAT-02` | shadow weight-0 first; weight change = human `MODEL_VERSION` bump | ✅ matches `readiness.ts:100,124` `canApplyCalibrationAdjustments:false` |
| Elite absolute anchor floor | 10 §4.3, 13 `RAT-07` | founder-gated; gated form defaults to current behavior until `MODEL_VERSION` bump | ✅ flagged "flips live switch," gated-form-only |
| Apply calibration adjustment | 10 §5.5, 13 `PRF-02` | evidence-only; `canApplyCalibrationAdjustments` stays `false`; apply = founder `MODEL_VERSION` | ✅ grounded; build computes+stores proposal, never applies |
| Grade-ladder reconcile (recipe surface) | 10 §6.3, 13 `TIER-01` | founder-gated | ✅ correctly treated as recipe-surface change |
| `AIRWAVE_RATING_INPUT_ENABLED` (new 3rd gate) | 12 §3.2, 13 `SXM-02` | default-off; lane shadow-only until set | ✅ stacked on the two existing gates |
| SiriusXM blend into Rating | 12 §3.3 step 7, 13 `SXM-07` | founder + `MODEL_VERSION`; capped at Signal/SiriusXM budget; never overrides market | ✅ build gated form only, flag off |
| Satellite (Ch 87) capture | 12 §3.3, §3.5, 13 `SXM-04/05/06` | `AIRWAVE_ENABLED` **and** `AIRWAVE_SIRIUSXM_LEGAL_ACK`; media-attorney sign-off; YouTube/podcast feeds **first** | ✅ legal-gated; "prove on free feeds first, satellite last" |
| Port Airwave into deploy clone | 12 §3.7, 13 `SXM-01` | founder-gated; inert behind `AIRWAVE_ENABLED`; fictional demo personas only | ✅ no capture, no real names, no Rating wiring on port |

The two existing gates (`AIRWAVE_ENABLED`, `AIRWAVE_SIRIUSXM_LEGAL_ACK`) are described as
EXISTS-today in the **canonical** clone and the docs are explicit that **neither the gates nor
the module exist in the deploy clone yet** — so nothing in this doc set can flip a deploy-clone
switch even by accident (there is no switch to flip until the port). Good.

**The SiriusXM/Airwave source is correctly kept INTERNAL, founder-gated, illustrative, with live
capture legal-gated** (media-attorney sign-off on source terms / copyright / right-of-publicity /
paraphrase-only — doc 12 §3.5). The "captured audio is DATA, never an instruction" doctrine and
the "paraphrase-only, no audio archive, `redact.ts` strips `sourceClipRef` as a compile error"
posture are carried verbatim. **Confirmed safe.**

**Safety nit S-1 (LOW):** doc 13's "Cards that flip a live switch" list (md, Counts section)
enumerates `RAT-07, PRF-02, TIER-01, SXM-02, SXM-07, SXM-04/05/06, BEAT-01, AGG-01, AGG-02`. But
the JSONL gating fields tag `BEAT-01/AGG-01/AGG-02` as `founder-gated` and the prose elsewhere
calls them "shadow-first, no published number moves." They do **not** by themselves flip a
published number (they're shadow lanes); only an `SXM-07`-class blend gate does. The md's framing
is over-inclusive in one direction (safe error) but inconsistent with its own JSONL. Align the two
so the "flips a live switch" set is exactly `{RAT-07, PRF-02, TIER-01, SXM-02, SXM-07}` and label
the Signal-lane cards "founder-gated, shadow-only (no published-number change)." **Fix F-5.**

---

## 4. HONESTY OF THE 70% NORTH STAR

**Finding: Correctly framed as an engineered quality target proven honestly — never asserted,
never a deceptive sub-70 refusal filter.** This is the doc set's strongest theme.

The framing appears consistently and correctly:
- Doc 10 §2.5: "70% ATS is the engineered north-star, **not** a publish filter… The
  data-sufficiency floor (`MIN_PUBLISH_CONFIDENCE=50`, `CONSENSUS_MIN_PCT=0.55`) removes
  *under-evidenced* picks, **not** *sub-70%* picks. The slate stays real and complete."
- Doc 13 (md Safety summary): "No card publishes a win-rate/accuracy number we have not earned.
  The 70% ATS target is the engine's engineered north-star quality target, not a publish filter."
- Doc 13 `SLATE-01` acceptance: "The data-sufficiency floor is documented as **not** a win-rate
  filter." Grounded against the real conf<50 / consensus<0.55 gate (`constants.ts:8,26`) and the
  honest empty-state copy already in `picks/page.tsx`.

The proof path is honest: realized rate is to be reported **with sample size and a reliability
curve**, CLV is positioned as the **early, de-noised** scoreboard (so the engine can show process
edge *before* the 300–500-bet variance resolves), and shrinkage (`RAT-06`) + the Elite anchor
floor (`RAT-07`) exist specifically so a small sample **cannot mint a false "Elite."** That is the
opposite of a deceptive filter — it's a mechanism to *avoid* over-claiming.

**Honesty nit H-1 (LOW) — one place the framing slips toward implying inevitability.** Doc 10 §5
is titled "where this beats competitors" and §5.1 states the Signal layer is a moat "no competitor
ships." That's a *design* claim about a feature that **does not exist in the deploy clone yet**
(zero grep hits) and is shadow-first/unproven against outcomes. The doc is technically careful
(everything is marked PROPOSED), but the section *header* and the word "beats" read as present-
tense competitive fact. Soften to "**where this is designed to beat** competitors **once proven**"
and add a one-line reminder that the moat is **unrealized until the Signal lane clears shadow +
the legal gate**. **Fix F-2.**

**No instance found** of: an asserted win rate; a "we only publish 70%+" refusal; a number
presented as earned that isn't; or a sub-70 slate being hidden. The breakeven math is right and
is used to *bound* the claim, not inflate it.

---

## 5. COMPLETENESS — what's missing to make the Rating genuinely elite + calibrated

The architecture is strong on **reveal-less structure** and **honest gating** but thin on
**validation discipline** and has three concrete arithmetic/structure defects.

### Defects (fix before build — these are wrong as written)

- **C-1 (HIGH) — Signal sub-weights don't fit the Signal cap cleanly, and two docs disagree.**
  Doc 10 §3.2 sets the three Signal lanes at **SiriusXM 3 / Beat 2 / Crowd 1 = 6**, i.e. the lanes
  are stated **in points of the 6-point Signal cap**. Doc 12 §2.2 sets *intra-SiriusXM show
  shares* as **percentages of the L1 (SiriusXM) budget** (FF Morning 18%, Elite 14%, … summing to
  ~100% of L1). These are two different denominators (points-of-Rating vs percent-of-L1) and the
  build cards (`SXM-07` "cap ≤6/≤3", `AGG-02` "3/2/1 = cap 6") mix them. The math is reconcilable
  but **never stated as a single hierarchy**, so a builder could double-apply or collide them.
  **Fix:** state one explicit chain — *Signal category = 6 of 100 → SiriusXM lane = 3 of 6 →
  per-show % is a share of that 3.* Add an acceptance test that the realized SiriusXM contribution
  ≤3 and total Signal ≤6 regardless of per-show shares. **Fix F-1 (top priority).**

- **C-2 (MEDIUM) — category weights sum to 100 but the doc lists EIGHT rows under "seven
  categories."** Doc 10 §3.1 header says "seven categories + weights" but the table has **eight**
  numbered rows (Market 28, Production 14, Efficiency 16, NextGen 10, Trenches 10, Availability 8,
  Environment 8, Signal 6 = 100). It's eight categories summing to 100; the prose says seven.
  Cosmetic but it's the central table of the whole architecture and `RAT-02`'s acceptance test
  ("CATEGORY_WEIGHTS sums to 100") will pass while the **count** in the doc is wrong. **Fix:**
  call it "eight categories (seven quantitative + one Signal)" or fold an existing pair. **Fix F-1.**

- **C-3 (LOW) — `processGrade` Elite-band flaw is well-diagnosed but the fix is under-specified.**
  Doc 10 §4.3–§4.4 correctly identifies that canonical `processGrade` is a pure within-pool
  percentile with no absolute floor (so the ≥85 "Elite" band is *structurally always populated*)
  and that `player-model.ts:167-169` coerces null→0 before ranking. The proposed fixes (absolute
  anchor floor + drop-missing) are right in *direction* but the anchor's actual bar ("e.g. a fixed
  EPA/CPOE bar") is left as a placeholder. That's acceptable for a design doc, but the **Elite
  band cannot be called calibrated until the anchor bar is a specific, validated number** — flag it
  as an explicit open item, not a detail. (These are canonical-clone observations; I did not
  re-read the canonical clone here, so they remain as-cited, not independently re-verified — see
  §F note.) **Fix F-8.**

### Missing pieces (needed for "genuinely elite + calibrated")

- **C-4 (HIGH) — no temporal / out-of-sample validation discipline is specified.** The docs lean
  on calibration (Brier, reliability buckets, log loss, isotonic/Platt) and shrinkage, which is
  excellent, but **nowhere mandate walk-forward / time-series cross-validation or a frozen holdout
  by season**. Sports models leak future information trivially (player form, injuries, line
  movement). Without an explicit "train on weeks 1..k, test on k+1; never tune on the holdout"
  rule, a great-looking reliability curve can still be overfit. **Add a validation card:**
  walk-forward evaluation, a permanently-frozen most-recent-season holdout, and a rule that the
  isotonic/Platt map (`PRF-02`) is fit on a *different* split than the one it's reported on.
  **Fix F-9.**

- **C-5 (MEDIUM) — CLV is positioned as the scoreboard but its honesty caveats are thin.** Doc 10
  §5.3 is right that CLV de-noises results, but CLV is only meaningful against a **fair, liquid
  closing line at the same book/market** and is **distorted by limits, stale quotes, and which
  book's close you snap.** `WIN-01/WIN-02` capture a `ClosingLine` and compute CLV but don't
  specify *which* close (consensus? Pinnacle? the bet book?) or how steam/limit-down quotes are
  excluded. Without that, "CLV-positive %" is gameable. **Specify the closing reference + a
  stale/limit exclusion rule** in `WIN-01`. **Fix F-10.**

- **C-6 (MEDIUM) — the independent estimator (`WIN-03`) has no benchmark to beat.** Doc 10 §5.4 /
  `WIN-03` correctly fix the *circular edge* (today's edge de-vigs the book's own consensus;
  `fairProbability:null` confirmed at `scoring.ts:395`) by demanding a non-market probability. But
  "independent" isn't enough — an independent estimator that's worse than the de-vigged line adds
  noise. **Require `WIN-03` to be evaluated against the closing line as the benchmark (log loss /
  Brier vs close), shadow-only, and only promoted if it beats or complements the close** measured
  by CLV. **Fix F-11.**

- **C-7 (LOW) — correlation/double-counting across *categories* is handled within a category but
  not across them.** Doc 10 §4.1 step 3 de-correlates inputs *inside* a category (PCA/prune), but
  Production, Efficiency, NextGen, and Trenches are themselves heavily correlated *across*
  categories (EPA correlates with success rate correlates with air-yards-driven WOPR…). Pure
  category-weighting can still triple-count a single underlying signal. **Add a cross-category
  decorrelation / hierarchical-shrinkage note**, or state explicitly that category caps are set
  *assuming* residual cross-correlation and are deliberately conservative. **Fix F-12.**

- **C-8 (LOW) — doc `11` is absent.** Doc 13 honestly flags it and says "if 11 adds net-new
  proposed work, append cards here and dedupe." That's the right posture, but the build-card set,
  the dedupe ledger, and this critic are all **provisional on a missing input**. Not a defect in
  these docs — but the program owner must either produce 11 or record that 11 was descoped, so the
  card set isn't silently incomplete. **Fix F-13 (owner action, not a doc edit).**

---

## 6. Prioritized fix list

| # | Sev | Axis | Fix |
|---|---|---|---|
| **F-1** | HIGH | Completeness | Reconcile the Signal hierarchy to one chain (Signal = 6/100 → SiriusXM = 3/6 → per-show % is a share of that 3) **and** fix the "seven vs eight categories" count in doc 10 §3.1. Add acceptance test: SiriusXM ≤3, total Signal ≤6 regardless of per-show shares. (C-1, C-2) |
| **F-9** | HIGH | Completeness | Add a temporal-validation card: walk-forward CV, frozen most-recent-season holdout, isotonic/Platt fit on a split disjoint from the one it's reported on. (C-4) |
| **F-2** | MED | Honesty | Re-tense doc 10 §5: "designed to beat … once proven"; add the explicit reminder the Signal moat is **unrealized** until it clears shadow + the legal gate. (H-1) |
| **F-3** | MED | Recipe leak | Downgrade "reliability curve reveals method nothing" → "reveals results, not recipe"; fix bucket granularity so the curve can't be inverted into the confidence map; keep the ≥25-sample gate. (L-1) |
| **F-10** | MED | Completeness | In `WIN-01`, specify the closing reference book/market for CLV + a stale-quote/limit-down exclusion rule. (C-5) |
| **F-11** | MED | Completeness | `WIN-03` must be benchmarked against the closing line (log loss/Brier vs close), shadow-only, promoted only if it beats/complements the close per CLV. (C-6) |
| **F-4** | LOW | Recipe leak | Make it an `RLS-02` acceptance test that PRO factor bars are normalized outputs (never raw inputs/weighted contributions) and the Signal/SiriusXM lane is **never** a named bar at any tier. (L-2) |
| **F-5** | LOW | Live-switch | Align doc 13 md ↔ jsonl: the "flips a live switch" set is exactly `{RAT-07, PRF-02, TIER-01, SXM-02, SXM-07}`; label `BEAT-01/AGG-01/AGG-02` "founder-gated, shadow-only (no published-number change)." (S-1) |
| **F-6** | LOW | Fabrication | Replace "~75/100 points of market structure" with "≈75 of the positive market caps" to avoid implying a clean 75/100 decomposition. (§1c) |
| **F-7** | LOW | Fabrication | In doc 12 Part 1 tables, visually mark MEDIUM-confidence clock times as "(slot unverified)" inline so a skimmer can't read a MEDIUM time as fact. (§1a) |
| **F-8** | LOW | Completeness | Flag the Elite **absolute anchor bar** (EPA/CPOE value) as an explicit open item: the Elite band is not "calibrated" until that number is specified + validated. (C-3) |
| **F-12** | LOW | Completeness | Add a cross-category decorrelation note (or state category caps are deliberately conservative re: residual cross-correlation). (C-7) |
| **F-13** | — | Process | Owner: produce doc `11` or record it as descoped; the card set + dedupe ledger are provisional on it. (C-8) |

**Build-readiness:** The 15 "safe/additive" cards (shadow-only constants, additive migrations,
public *results* surfaces) are safe to scaffold as written **after F-1** (the Signal-cap chain
must be unambiguous before any `SXM-*`/`AGG-*` card is coded). The 11 founder-gated and 3
legal-gated cards must remain **gated-form-only** (consumer wired, flag off) exactly as the docs
already specify. Nothing here authorizes flipping a switch.

---

## F. Independent grounding log (what I re-verified, this audit)

Every row below I re-read in the deploy clone (`C:/Users/Garrett/Sports`) for this critic.
**All matched the docs' claims.**

| Doc claim | File:line I read | Result |
|---|---|---|
| Confidence = summed components + `+10`, clamp 0-100 | `packages/prediction-engine/src/scoring.ts:340-348` | ✅ exact |
| Component caps (30/20/25/15/−15/5/5/−8/−3/+4/5) | `packages/prediction-engine/src/constants.ts:23-66` | ✅ exact |
| `MODEL_VERSION=v5.0.0`, PREMIUM=70, MIN_PUBLISH=50, CONSENSUS_MIN=0.55 | `constants.ts:2,7,8,26` | ✅ |
| Two-input `computePickGrade`; labels Elite/Strong/Solid Play + Lean | `packages/types/src/index.ts:106-120` | ✅ |
| Divergent single-input `gradeForConfidence` (real inconsistency) | `packages/brand/src/grades.ts:32-37` | ✅ confirmed divergent |
| Entitlements (Edge Index public; confidence/line/breakdown PRO+; alerts ELITE; FREE limit 1) | `packages/types/src/index.ts:88-100` | ✅ |
| Calibration `MIN_BUCKET_SAMPLE=30`, evidence-only | `apps/web/lib/calibration/compute.ts:61` | ✅ |
| `canApplyCalibrationAdjustments: false` | `packages/prediction-engine/src/readiness.ts:100,124` | ✅ |
| `trueEvScore:null`, `fairProbability:null` (circular edge) | `scoring.ts:394-395` | ✅ |
| CLV / `ClosingLine` does not exist; `OpeningLine` exists | grep (zero hits); `packages/db/prisma/schema.prisma:240` | ✅ |
| `gateDecision.create\|upsert` never written | grep (zero hits) | ✅ |
| Public number = `currentEdgeIndex` 0-100 | `schema.prisma:216` | ✅ |
| Methodology page: framework public, weights/constants/aggregation proprietary | `apps/web/app/methodology/page.tsx:15-41` | ✅ |
| Airwave/SiriusXM/pundit absent from deploy clone | grep `airwave\|siriusxm\|pundit\|ch 87` → only the 4 data-mesh docs, zero code | ✅ |

**Not independently re-verified (carried as-cited from the docs, flagged honestly):** the
**canonical-clone** claims — `processGrade` within-pool percentile + no absolute floor
(`player-model.ts:172-177`), the null→0 coercion (`player-model.ts:167-169`), Airwave doctrine /
gates / `redact.ts` / `grade.ts` weights, and the player band thresholds (`colors.ts:27-33`). I
audited the **deploy** clone only (per the brief's repo-root constraint). The docs themselves label
every canonical claim as canonical-clone-grounded and PORT-required, so this is a scoping boundary,
not a gap — but a future pass should re-read the canonical clone to close C-3.

---

*End of critic. No source, schema, config, env, or live switch was modified to produce this
document. SiriusXM/Airwave remains internal, founder-gated, illustrative; live capture stays
legal-gated.*
