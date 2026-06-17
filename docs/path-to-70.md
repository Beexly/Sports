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
