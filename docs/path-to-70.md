# The Path to a Proven 70% Tier

How Galaxy moves from the ~55% practical ceiling of "good handicapping" to a **70% win-rate
tier that is calibrated and provable** — and why "proven" is the word that makes us first in class,
not "70%".

> Status: strategy of record. Grounded in the engine as it exists today (file paths cited inline).
> The model-changing steps below are **founder-gated `MODEL_VERSION` decisions** — this document
> sequences them; it does not flip them.

---

## 1. The honest math (read this first)

Win rate is computed as `wins / (wins + losses)`, pushes excluded
(`apps/web/lib/performance/public-performance-policy.ts`, `packages/prediction-engine/src/performance-analytics.ts`).

- At standard **−110** odds, break-even is **52.38%**.
- The best documented long-run sports bettors sustain roughly **55–57%** against the spread.
- A **blended** 70% win rate across all published picks is **not a real-world outcome**. Claiming it
  would (a) read as fabricated to the sharp audience we are built for, and (b) violate our own trust
  guardrails (`scripts/guardrails/trust-gate.mjs`, gated performance stats).

**Therefore "70%" only means something honest in one of two framings:**

1. **Calibrated confidence tier** — a top tier where a pick labeled ~70% *actually wins ~70%* of the
   time, measured over a real settled sample and shown as a reliability curve. This is the north star.
2. **Structural bet-type selection** — e.g. heavy moneyline favorites cash ~70%+ by nature, but at
   low/negative ROI. Useful for honest framing ("70% of our ML plays cash"), never as a profit claim.

Win rate is a function of **what you choose to grade**. The lever is *selection + calibration*, not
prediction magic.

---

## 2. What "first in class" actually means

Not the biggest number — **the only number that is calibrated and auditable.** Practically nobody in
this market publishes a reliability diagram next to their record. We can, because the proof machinery
already exists:

- **Calibration curve** (realized win rate per confidence bucket) — `performance-analytics.ts → calibrationCurve()`
- **CLV** (did we beat the close — the leading indicator of genuine edge) — `clv.ts`, `clv-capture.ts`
- **Edge-significance** (Monte-Carlo permutation test: is the hit rate beyond chance?) — `edge-significance.ts`
- **Proof-of-record** (tamper-evident Merkle commitment at lock time) — `proof-of-record.ts`

First-in-class claim, stated honestly: *"Our high-conviction tier is calibrated to ~70% and every pick
in it is timestamped, CLV-graded, and independently verifiable."*

---

## 3. The engine is already built for this (most of it is switched off on purpose)

| Capability | File | Status today |
|---|---|---|
| Confidence score (0–100) | `scoring.ts`, `constants.ts` | **Live** — but heuristic (a weighted component sum), not yet a calibrated probability |
| Publish gate | `scoring.ts` (`MIN_PUBLISH_CONFIDENCE = 50`) | **Live** |
| Consensus / depth filters | `scoring.ts` (`CONSENSUS_MIN_PCT = 0.55`, `MIN_BOOKMAKERS = 2`) | **Live** |
| Independent edge engine (Poisson + Kalshi must agree) | `edge-engine.ts` (`SPEAK_EDGE = 0.025`) | **Built, surfaced, NOT priced into confidence** (founder-gated) |
| Probability calibration (isotonic/PAVA, Brier, ECE) | `probability-calibration.ts` | **Built, disabled** (`readiness.ts` → `canApplyCalibrationAdjustments: false`) |
| Calibration drift monitor | `calibration-drift.ts` (alert ≥ 0.05 Brier delta) | **Computed**, not yet wired to auto-action |
| Edge significance test | `edge-significance.ts` | **Computed** |
| CLV grading | `clv.ts`, `clv-capture.ts` | **Live-capable** |
| Public performance gating | `public-performance-policy.ts` (`MIN_CANONICAL_DEFAULT = 25`, `MIN_SETTLED_PICKS_FOR_LEARNING` default 100) | **Live** |
| Proof-of-record (Merkle) | `proof-of-record.ts` | **Live-capable** |

The powerful levers (calibration application, edge pricing) sit behind explicit `MODEL_VERSION` bumps
by design: changing the model is a human decision, never a silent one.

---

## 4. The staged path (each step is a founder-gated switch, in order)

Every step lists: the lever, where it lives, the gate, the effect on **realized** win rate, and the
**proof** it produces. None should be flipped without a `MODEL_VERSION` bump and a human sign-off.

**Step 0 — Accumulate an honest sample.** Keep ingesting + scoring + settling. Public stats stay gated
until ≥ `MIN_SETTLED_PICKS_FOR_LEARNING` canonical (non-bootstrap) picks have settled
(`public-performance-policy.ts`). *Proof: nothing claimed yet — this is the foundation.*

**Step 1 — Calibrate confidence → probability.** Turn the heuristic score into a true `P(win)` via the
isotonic/PAVA mapping already built in `probability-calibration.ts`; gate flips `canApplyCalibrationAdjustments`
through a `MODEL_VERSION` bump. *Effect: "70%" starts meaning 70%. Proof: reliability curve + ECE/Brier.*

**Step 2 — Price the independent edge engine into selection.** Only publish when independent estimators
(Poisson model + Kalshi exchange) **agree** with a real edge (`edge-engine.ts`, `SPEAK_EDGE = 0.025`).
Today the result rides along but does not move confidence. *Effect: removes "the market grading itself"
picks → raises realized hit rate on what's published. Proof: CLV beat-rate should rise in lockstep.*

**Step 3 — Define & publish the conviction tier.** A pick enters the **70% tier** only if it clears all
of: calibrated `P ≥ ~0.65–0.70` **and** edge decision = `SPEAK` **and** a positive CLV track on that
segment. This is a deliberately smaller, higher-hit-rate slate. *Effect: the honest 70% tier. Proof:
per-tier calibration curve.*

**Step 4 — Prove it in public.** Ship the reliability diagram (realized win rate per confidence bucket,
from `calibrationCurve()`), the CLV beat-rate (`summarizeClv()`), the edge-significance p-value, and the
Merkle proof links — all on one page. *Effect: the differentiator. Honest empty state until the sample exists.*

**Step 5 — Keep improving (the process you asked for).** Monthly loop: drift monitor (`calibration-drift.ts`)
→ recalibrate (PAVA) → re-test significance → **human-gated** `MODEL_VERSION` bump if warranted. Suspend
any sport/market whose calibration drifts; resume when it recovers (segment selection via `calibrationCurve()`).

This maps directly onto the named ladder in `CLAUDE.md`:
**FOUNDING → PROVEN (≥100 settled + published calibration) → ESTABLISHED (≥500 settled + verified CLV ≥ 52.4%) → AUTHORITY (multi-season ROI).**

---

## 5. What we will NOT do

- ❌ Print a blended 70% headline (fabricated; trips guardrails; kills credibility with sharps).
- ❌ Flip model levers autonomously — calibration application and edge pricing are `MODEL_VERSION`
  decisions for a human (`readiness.ts`).
- ❌ Count no-action (`PASS`) as wins, cherry-pick by hindsight, or retro-grade — architecturally blocked
  (proof-of-record commits at lock time; bootstrap picks excluded from the canonical record).

---

## 6. Concrete next steps (safe + additive, ready to wire)

1. **`convictionTier()` selection module** in `packages/prediction-engine` — pure, tested, gated OFF by
   default. Given a calibrated probability, an edge decision, and CLV history, it classifies a pick into
   honest conviction tiers with expected win-rate bands. Changes no live behavior; ready to wire at the
   next `MODEL_VERSION` bump. *(This doc's companion PR.)*
2. **Reliability-diagram surface** — a public proof page driven by `calibrationCurve()` showing realized
   win rate per confidence bucket, with the honest empty state until the sample clears the gate.

The number we chase is **calibration error → 0**. Win rate follows from honest selection; the 70% tier is
the visible result, and the proof is the moat.

---

## 7. Activation checklist for Step 1 (calibration) — what "turn it on" actually requires

> **Status as of 2026-09-02.** Steps 3 and 4 below were completed in `v5.1.0`
> (`docs/calibration-proposals/2026-06-22-calibration-activation-v5.1.0.md`): the gate is the env flag
> `CALIBRATION_ADJUSTMENTS_ENABLED` (default `false`, `platform-config.ts`) and `MODEL_VERSION` is now
> `v5.2.7`, each bump backed by a proposal under `docs/calibration-proposals/` and checked by
> `scripts/guardrails/model-freeze.mjs`. What remains is Step 1 (the sample) and the founder's flip.

The engine is built and tested (`calibration-apply.ts` → `buildCalibrator`). It is **self-suppressing**:
with no settled sample it is a labeled-uncalibrated identity passthrough, so it is already safe to wire.
Going live is deliberately gated — every `MODEL_VERSION` bump needs an audit trail under
`docs/calibration-proposals/` (enforced by `scripts/guardrails/model-freeze.mjs` + `FROZEN.md`) to keep
historical confidence numbers honest. Activation order (each is one reviewable commit):

1. **Have the sample.** ≥ `MIN_SETTLED_PICKS_FOR_LEARNING` (100) settled, canonical, learning-eligible picks,
   and `apps/web/lib/ops/calibration-eligibility.ts` reporting GREEN for 3 consecutive runs
   (`brier ≤ 0.22`, `ece ≤ 0.05`, `murphyReliability ≤ 0.05`). Until then activation is inert by design —
   do not force it and never lower a floor.
2. **Fit & validate offline.** `npm run export:settled-picks` (real `DATABASE_URL`) exports every
   non-bootstrap settled pick (`result != PENDING`, `settledAt != null`, `isBootstrap = false`) — that
   raw export is **not** the fit sample as-is: it still carries non-learning-eligible rows (no filter on
   `PickSignalSnapshot.eligibleForLearning`) and non-binary outcomes (`PUSH`/`VOID`, not just `WIN`/`LOSS`).
   Before fitting, filter the export to canonical, learning-eligible, published, non-bootstrap picks whose
   `result` is `WIN` or `LOSS` (drop `PUSH`/`VOID` — they carry no binary calibration label). Only then run
   `buildCalibrator` over the filtered (confidence/100, outcome) pairs. Use a **time-ordered hold-out**, not
   a random split: `timeHoldoutSplit` (`packages/prediction-engine/src/probability-calibration.ts`) sorts by
   timestamp ascending and cuts at `trainFraction` (default 0.7 — earliest 70% settled = train, latest 30% =
   test). Fit the isotonic map on `train` only, then compute `isActive` and `calibratedEce <= rawEce` on the
   untouched `test` partition — never in-sample, and never on the unfiltered export. Approve activation only
   on the `test`-partition numbers. `npm run calibration:offline` rehearses the same math on a synthetic
   fixture without a database.
3. **Audit trail (done for every bump so far; required again for the next).** Bump `MODEL_VERSION` in
   `constants.ts` AND record it as a `CalibrationProposal` (status `IMPLEMENTED`) or a
   `docs/calibration-proposals/<slug>.md` with the observation + change that justified it.
4. **Gate (done in v5.1.0).** `canApplyCalibrationAdjustments` reads `CALIBRATION_ADJUSTMENTS_ENABLED`;
   `readiness-gate-enforcement.test.ts` pins the default-off behaviour.
5. **Wire & display.** Feed the calibrated probability into the conviction tier and the public reliability
   diagram. New picks carry the new `MODEL_VERSION`; prior picks keep theirs (no retroactive relabeling).

Flipping `CALIBRATION_ADJUSTMENTS_ENABLED` (and `PERFORMANCE_STATS_ENABLED`) is the founder's audited
decision. Step 1 (the data) is the real gate; everything else is ready and waiting on it.

---

## 8. First measurement against the plan (2026-09-04)

> Added after the first real replay of the frozen model over settled history. Nothing
> in sections 1-7 is retracted — §1's framing survives contact with data, and §1.2
> in particular was measured almost exactly. What follows is the evidence this
> strategy has been waiting on, including the part that makes Step 1 harder than
> "fit isotonic and flip the gate".

Source: `docs/data/NFL_REPLAY_CALIBRATION_2026-09-04.md`. nflverse `games.csv`,
CC-BY-4.0 (*Data via nflverse (nflverse-data), licensed CC BY 4.0*), 1999-2025 REG,
6,967 games, 15,939 settled picks, 0 lookahead errors. Produced by the dry-run
backfill after the spread-sign fix — before that fix every SPREAD pick was on the
wrong team, so no earlier number is usable.

### §1 was right

```
SPREAD      n= 6778   48.86%  CI [47.67%, 50.05%]  ROI -6.53%
TOTAL       n= 6868   49.49%  CI [48.31%, 50.67%]  ROI -5.44%
MONEYLINE   n= 2001   76.71%  CI [74.81%, 78.51%]  ROI -1.96%
all picks   n=15647   52.70%  CI [51.92%, 53.48%]  ROI -5.48%
```

**§1.2 predicted the moneyline result before we measured it** — *"heavy moneyline
favorites cash ~70%+ by nature, but at low/negative ROI… never as a profit claim."*
Measured: **76.71% cash rate at −1.96% ROI.** The doc's caution was correct and is
now quantified rather than asserted.

**§1's warning about a blended headline is also confirmed, and sharper than stated.**
The blended 52.70% is not merely unimpressive — it is an *artifact of averaging
markets priced differently*. Moneyline wins pay ~0.29 units, spread/total wins pay
~0.91, so counting them equally lifts the blended *rate* above the 52.38%
break-even while the money runs the other way. **The honest single number is ROI:
−5.48% per unit staked.**

### The part that changes the plan

§1.1 sets the north star as a calibrated confidence tier where a pick labelled ~70%
wins ~70%. The replay says the raw signal that tier would be built on does not
currently rank outcomes at all:

```
confidence 70-79   n= 3770   48.33%  ROI -7.52%     <- the PREMIUM side of the paywall
confidence 65-69   n= 9693   49.47%  ROI -5.46%     <- the FREE side
```

Higher confidence, worse result. The gap is **not** statistically significant
(two-proportion z = −1.19, p = 0.235), so "premium picks are worse" is not a
supported claim and must not be made. What is supported is narrower and still
serious: **across 13,463 picks there is no evidence the paywalled picks outperform
the free ones, and the point estimate leans the wrong way.**

Two limits on that finding, both recorded in the source doc: the replay pins the
edge component of confidence (it prices both sides at −110, so `rawEdge` is a
constant), meaning only the market-independent drivers are being tested; and for the
same reason the **Edge Index and the ELITE/STRONG/SOLID/LEAN ladder cannot be
evaluated here at all** — every pick grades `LEAN` as an artifact, not a defect.

**Consequence for §7.** Step 1 is described as gated on *data*. The data now exists
for NFL, and it says the input to calibration is closer to noise than to a
mis-scaled probability. Isotonic regression re-maps a monotone signal; it cannot
manufacture ranking that is not there. So the honest reading is that Step 1 needs a
**discrimination** result — evidence that some published field separates winners
from losers — before Step 2's recalibration is meaningful. `calibrationCurve()` will
happily fit a flat curve and report a small ECE on a signal with no resolution.

### The edge hunt, so it is on the record

Eleven market shapes tested for a segment that clears break-even
(`scripts/analytics/replay-breakdown.ts`): favourite/underdog, four spread-magnitude
bands, over/under, four total bands. **Zero cleared break-even on the Wilson lower
bound.** Best was `TOTAL <=40` at 50.49% (lower bound 48.14%, ROI −3.57%). At eleven
hypotheses roughly one would be expected to clear by chance; none did, so no
multiple-comparison correction is even required.

### What this does not say

Everything above is measured **against the closing line** — the hardest available
benchmark — with synthetic book depth. Entry equals close by construction, so every
pick grades `MATCHED_CLOSE` and **CLV is structurally unmeasurable here**. §2 is
right that CLV is the leading indicator of genuine edge; this corpus cannot test it.
An operation betting into earlier, softer numbers is a different measurement, and the
open/close archive that would settle it is the outstanding data gap
(`docs/data/CFB_SOURCE_DECISION_2026-09-04.md` §2).

The ladder in §4 is unaffected: FOUNDING → PROVEN still requires ≥100 settled picks
and a published calibration curve, and backfilled picks are `isBootstrap=true` and
excluded from the canonical record. This measurement informs the strategy; it does
not advance the ladder.
