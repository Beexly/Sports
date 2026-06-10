# 13 — Build Cards: Proprietary GSE Rating + Airwave/SiriusXM Signal

> **Source docs:** This card set turns the **PROPOSED** work in
> `10-gse-rating-proprietary-architecture.md` and
> `12-siriusxm-ch87-source-catalog-and-ingestion.md` into discrete, sequenced,
> testable build cards. (Doc `11-*` has since landed; its only genuinely net-new
> proposed work — the temporal out-of-sample validation harness — was appended
> here as **`VAL-01`** and deduped. Everything else in doc 11 *extends or
> specifies* an existing card rather than duplicating it.)
>
> **Author lane:** RESEARCH + DOC only. No source/test/config/package file was
> changed to produce these cards. Each card is **safe/additive** OR explicitly
> **founder-gated / legal-gated**. Cards that flip a live switch are marked and
> are to be built in **gated-form-only** (wire the consumer, leave the flag off).
>
> **Reveal-less invariant (every card):** category weights, the aggregation
> function, shrinkage priors, anchor floors, per-position vectors, the matchup
> cap, and the very existence of the Signal/SiriusXM lane are PROPRIETARY +
> INTERNAL. Public surfaces prove **results** (record/calibration/CLV), never
> **method**. The machine-readable cards are in the sibling
> `13-build-cards-proprietary-rating-airwave.jsonl`.

---

## Counts

- **Total cards:** 30
- **Category breakdown:** rating-core **8**, tier-calibration **4**,
  winrate-engine **4** (incl. `VAL-01`), siriusxm-signal **7**, beat-signal **1**,
  aggregate-signal **2**, reveal-less **2**, proof **2**.
- **Gating breakdown:** none (safe/additive) **16**, founder-gated **11**,
  legal-gated **3**.
- **`VAL-01` (doc 11 §5, critic fix F-9, safe/additive):** temporal out-of-sample
  validation harness — walk-forward CV + frozen-season holdout + disjoint
  calibration split, so realized-rate proof can't leak future info. `PRF-02` and
  `WIN-03` should consume its split discipline rather than fitting in-sample.
- **Cards that flip a live switch (build the gated form only):** `RAT-07`
  (Elite anchor floor — MODEL_VERSION), `PRF-02` (apply calibration adjustment —
  MODEL_VERSION), `TIER-01` (recipe-surface ladder change), `SXM-02`/`SXM-07`
  (Rating-input gate + blend — MODEL_VERSION), `SXM-04`/`SXM-05`/`SXM-06`
  (satellite capture/grade/lean — legal-gated), `BEAT-01`/`AGG-01`/`AGG-02`
  (Signal lanes — founder-gated).

---

## Dedupe ledger (vs existing `docs/command-center` + `docs/research`)

Scanned: the 120-card R&D world-model queue
(`docs/research/claude-build-queue/BUILD-001..120` + `build-queue.jsonl`) and the
7-line `docs/command-center/build-queue/real-app-build-queue.jsonl`. That queue is
generic and **source-provenance-focused**; it does **not** specify the proprietary
composite mechanics, the reveal-less enforcement, or the SiriusXM Rating-input
lane. Overlaps handled by **reference, not re-implementation**:

| Existing card | What it covers | How this set dedupes |
|---|---|---|
| **BUILD-032** — Closing line value tracker w/ provider license flags | The *provider-license plumbing* + source flags for closing lines (no per-pick CLV math) | `WIN-01` adds the **ClosingLine snapshot wiring**; `WIN-02` adds the **per-pick CLV computation + scoreboard**. BUILD-032 stays the upstream license gate — not re-implemented. |
| **BUILD-018** — Game-state win-prob + calibration report | A win-prob engine with a calibration report | `PRF-01`/`PRF-02` add the **reliability-curve-as-public-trust-artifact** + **evidence-only log-loss/isotonic** (different surface: public proof + scoring-layer, not a new WP model). |
| **BUILD-081** — Analog-to-real calibration report | Comparing analog ratings to outcomes | Subsumed by `PRF-01` (public reliability curve) + `RAT-06` (scoring-layer shrinkage). No new card duplicates it. |
| **BUILD-075** — Original GSE rating schema (no EA assets) | A vague "original schema, no trademarks" placeholder | **Superseded** by `RAT-01..09` which specify the actual category tree, roll-up, shrinkage, anchor floor, per-position vectors, matchup delta. |
| **BUILD-095..104** — News/source/beat-writer intelligence (incl. **BUILD-099** beat-writer reliability) | Generic source-intelligence + beat-writer reliability scoring without copying protected text | `BEAT-01` **reuses BUILD-099** as the reliability input and only adds the **Rating-estimator wiring + Signal sub-weight** — it does not build a second reliability tracker. SiriusXM/crowd lanes (`SXM-*`, `AGG-*`) are net-new and absent from that queue. |

No card here duplicates an existing one; each either references the upstream card
as a dependency or supersedes a vague placeholder with the grounded design.

---

## Sequencing overview

```
RAT-01 (brand/doctrine ADR, founder)
  ├─ RAT-02 (category weights, shadow 0) ──┬─ RAT-03 (rollup 1-4) ─┬─ RAT-04 (aggregate+map)
  │                                        │                      ├─ RAT-06 (shrinkage) ─ RAT-07 (Elite anchor, founder)
  │                                        │                      └─ RAT-08 (per-position) / RAT-09 (matchup delta)
  │                                        └─ WIN-03 (independent estimator)
  ├─ TIER-01 (ladder reconcile, founder) ─ TIER-02 (player bands) / SLATE-01 (GateDecision rows)
  └─ RLS-01 (method-leakage gate) ─ RLS-02 (value gradient)

RAT-05 (null->0 fix)        — independent
WIN-01 (ClosingLine) ─ WIN-02 (CLV scoreboard) ─ WIN-03 ; PRF-01 (reliability curve) ─ PRF-02 (calib apply, founder)

SXM-01 (port Airwave, inert) ─ SXM-02 (rating-input gate) ─ SXM-03 (show catalog)
  └─ SXM-04 (capture, legal) ─ SXM-05 (grade, legal) ─ SXM-06 (shadow lean, legal) ─ SXM-07 (blend, founder+MODEL_VERSION)
BEAT-01 (beat lane) / AGG-01 (crowd lane) ─ AGG-02 (three-lane Signal composite)
```

---

## Cards by category

### rating-core (8)

- **RAT-01** *(founder-gated)* — Reconcile the GSE Rating brand to a single
  composite doctrine (ADR). Picks deploy `confidence` vs canonical `processGrade`;
  flags the canonical→deploy **port** as a prerequisite. No constants touched.
- **RAT-02** *(safe)* — Encode the seven category weights (Market 28 … Signal 6)
  as **internal** constants at effective **weight 0** (shadow). Live confidence
  output asserted byte-identical.
- **RAT-03** *(safe)* — Roll-up steps 1–4: drop-missing impute → percentile
  normalize → de-correlate → sub-score. Pure, tested, **shadow-only**.
- **RAT-04** *(safe)* — Geometric-leaning aggregation + monotone undisclosed
  0–100 map = shadow GSE Rating composite. Penalizes imbalance vs additive.
- **RAT-05** *(safe)* — Fix canonical `null→0` percentile coercion
  (`player-model.ts:167-169`): drop-missing before ranking.
- **RAT-06** *(safe)* — Empirical-Bayes / James-Stein shrinkage at the scoring
  layer (step 5): thin samples pull toward prior; top tier needs estimate **and** n.
- **RAT-08** *(safe)* — Per-position weight vectors (QB/WR/TE/RB/OL/team) as
  internal constants. Never published.
- **RAT-09** *(safe)* — Bounded per-matchup adjustment delta: opponent
  complementary sub-scores nudge within a cap; tilts, never overturns.

### tier-calibration (4)

- **RAT-07** *(founder-gated — flips live switch)* — Absolute anchor floor on the
  Elite band so a relative percentile can't mint false Elite in a down year.
  Gated form defaults to current behavior until a MODEL_VERSION bump.
- **PRF-02** *(founder-gated — flips live switch)* — Train/penalize with log loss
  + held-out isotonic/Platt as **evidence only**; `canApplyCalibrationAdjustments`
  stays `false`. Apply = founder MODEL_VERSION.
- **TIER-01** *(founder-gated — recipe surface)* — Keep two-input
  `computePickGrade`; deprecate the divergent single-input `brand/src/grades.ts`;
  keep FREE/PREMIUM paywall as a separate orthogonal axis.
- **TIER-02** *(safe)* — Player public bands (Elite ≥85 … Risk <40) with the
  absolute Elite floor + a "graded vs position, this season" annotation.

### winrate-engine (3)

- **WIN-01** *(safe)* — Capture a `ClosingLine` snapshot per pick (the grounded
  gap: only `OpeningLine` exists). Additive migration; depends on BUILD-032 for
  provider license flags.
- **WIN-02** *(safe)* — Compute per-pick **CLV** + the rolling CLV-positive
  scoreboard (target >60–65% over 200+). De-noises results before W/L variance.
- **WIN-03** *(safe)* — Produce a **truly independent** `fairProbability` from
  non-market sub-scores (today it's circular + hardcoded `null`). Shadow; measured
  by CLV.

### proof (2)

- **PRF-01** *(safe)* — Publish the **reliability curve** (Brier +
  observed-vs-expected) as the public trust artifact, gated on the existing ≥25
  sample policy. Reveals method nothing.
- **SLATE-01** *(safe)* — Write real `GateDecision` rows (status + reasonCode) so
  GATED/PUBLISHED lanes light up; partition the slate by quality tier, lead with
  Elite/Strong. The conf<50 / consensus<0.55 floor stays a **data-sufficiency**
  filter — explicitly **not** a sub-70% win-rate refusal.

### reveal-less (2)

- **RLS-01** *(safe)* — Extend the method-leakage gate + `INTERNAL_VOCABULARY` to
  the new composite vocabulary; hard CI gate fails the build on any leak.
- **RLS-02** *(safe)* — FREE/PRO/ELITE gradient = more **depth on the same
  number** (bars without weights at PRO; CLV + alerts at ELITE), method opacity
  identical at every tier; Signal-lane existence stays NEVER at all tiers.

### siriusxm-signal (7)

- **SXM-01** *(founder-gated)* — **Port** Airwave from canonical into deploy
  (zero grep hits today), inert behind `AIRWAVE_ENABLED`; only fictional demo
  personas render; `redact.ts` strips `sourceClipRef` (leak = compile error).
- **SXM-02** *(founder-gated — flips live switch)* — Add the third
  `AIRWAVE_RATING_INPUT_ENABLED` gate; default-off → lane is shadow-only.
- **SXM-03** *(founder-gated)* — Encode the web-verified Ch 87 catalog +
  provisional L1 shares; **exclude "Establish the Run"** (unverified on 87); mark
  FTN slot unconfirmed; re-verify at launch.
- **SXM-04** *(legal-gated)* — Schedule-bounded Ch 87 capture pointer, temp-only
  + deleted post-extraction; held unless `AIRWAVE_ENABLED` **and**
  `AIRWAVE_SIRIUSXM_LEGAL_ACK`. Prove on free YouTube/podcast feeds **first**.
- **SXM-05** *(legal-gated)* — Transcribe → extract → grade **paraphrased**
  `PunditClaim`s (paraphrase-by-contract, no verbatim leaves the store); operator
  review before any public state.
- **SXM-06** *(legal-gated)* — Shadow-log the bounded per-entity
  **accountability-weighted** lean (low-index host → ~0); **not blended**.
- **SXM-07** *(founder-gated — flips live switch)* — Gated blend into the Rating
  at the Signal/SiriusXM cap (≤6/≤3); founder + MODEL_VERSION; never overrides
  market structure.

### beat-signal (1)

- **BEAT-01** *(founder-gated)* — Beat-report lane as an **independent**
  estimator (fastest factual status), distinct from SiriusXM, Signal sub-weight 2;
  **reuses BUILD-099** for reliability rather than duplicating it. Shadow-first.

### aggregate-signal (2)

- **AGG-01** *(founder-gated)* — Net-new web/Reddit **crowd-aggregate** adapter
  (no social score is live in either clone); lowest trust, sub-weight 1, approved
  sources only, no disallowed-surface scraping. Shadow-first.
- **AGG-02** *(founder-gated)* — Combine the three Signal lanes (3/2/1 = cap 6)
  as **independent estimators never collapsed at ingest**; total Signal ≤6/100,
  breaks ties / flags what numbers miss, never dominates. Shadow until per-lane
  founder gates open.

---

## Safety summary

- **15 cards are safe/additive** (shadow-only, internal constants, additive
  migrations, public *results* surfaces). None changes the published number.
- **11 cards are founder-gated**; of those, **5 flip a live switch** (`RAT-07`,
  `PRF-02`, `SXM-02`, `SXM-07`, and `TIER-01` as a recipe-surface change) and are
  to be built **gated-form-only** with the flag off and the go-live documented as
  a founder MODEL_VERSION action.
- **3 cards are legal-gated** (`SXM-04/05/06`): satellite capture/grade/lean stay
  inert until media-attorney sign-off on the Airwave legal checklist
  (source terms, copyright, right-of-publicity, paraphrase-only). The recommended
  path proves the product on **free YouTube/podcast feeds first**; satellite
  capture and named-scorecard publishing go last.
- No card publishes a win-rate/accuracy number we have not earned. The 70% ATS
  target is the engine's engineered **north-star quality target**, not a publish
  filter; the slate stays real and complete, with the strongest plays leading and
  the realized rate + sample + reliability curve reported honestly.

*End. No code, schema, config, env, or live switch was modified to produce this
document. SiriusXM/Airwave remains internal, founder-gated, illustrative; live
capture stays legal-gated.*
