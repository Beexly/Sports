---
title: "Calibration claims audit — measured against the real settled sample"
date: 2026-09-30
status: AUDIT
auditor: hermes/calibration-audit-2026-09-30
base_commit: 2c156d4dfd9cdd98b1b30e4993aab5706218fe52
verdict: THREE DEFECTS CONFIRMED, ONE OVERCLAIM IN MARKETING COPY
---

# Calibration claims audit

Every number below was measured against the **real settled production sample**,
read from Neon through the read-only role, using the **shipped** engine code
(`isotonicCalibration`, `expectedCalibrationError`, `buildCalibrator`,
`convictionTier` — imported, not reimplemented).

**Reproduce:** `cd apps/web && npx vitest run __tests__/calibration-audit/calibration-claims-audit.test.ts`
— 18 assertions, all passing. The evidence CSVs it reads are committed at
`apps/web/__tests__/calibration-audit/evidence/`.

---

## 0. Population under audit

This is the **exact** pull `loadPublicCalibratorFit()` performs
(`apps/web/lib/calibration/public-confidence.ts:64-88`): settled WIN/LOSS,
published, non-bootstrap, `eligibleForLearning`, `take: 2000` ordered by
`settledAt DESC`, then the C-302 in-play exclusion applied.

| | |
|---|---|
| Rows pulled (`take: 2000`) | **2,000** |
| In-play rows withheld (C-302) | **56** |
| **Rows the shipped calibrator actually fits** | **1,944** (1,122W / 878L) |
| Population base rate | **57.7%** |
| Full settled history (cap removed) | **2,511** fit-eligible rows |

**Scope limit, stated plainly.** `take: 2000` means the production calibrator
fits a *recent* window, not the whole history. Every §1–§4 number below is for
that 1,944-row window because that is what the engine does. §5 shows how much
the answer moves when the cap is removed.

---

## 1. CONFIRMED — "confidence is a score, not a probability" (Defect A)

The claim (`apps/web/lib/calibration/compute.ts:128-141`, restated in
`components/home/calibration-curve.tsx:122-133`): confidence is non-monotone,
overconfident, and its Brier is worse than a no-skill forecast.

Measured on the 1,944-row fit population:

| band | n | claims | realizes | gap |
|---|---|---|---|---|
| 50-54 | 280 | 51.8% | 55.0% | **+3.2** |
| 55-59 | 188 | 56.6% | 48.9% | -7.7 |
| 60-64 | 506 | 61.9% | 61.5% | -0.4 |
| 65-69 | 391 | 66.9% | 55.0% | -11.9 |
| 70-74 | 237 | 71.7% | 57.4% | -14.3 |
| 75-79 | 180 | 77.2% | 64.4% | -12.7 |
| 80-84 | 77 | 82.0% | 53.3% | **-28.8** |
| 85-89 | 54 | 87.1% | 61.1% | -26.0 |
| 90-100 | 31 | 94.0% | 77.4% | -16.6 |

- **Non-monotone: true.** Realized rate climbs to 75-79 (64.4%), drops to 53.3%
  at 80-84, then partially recovers at 90-100 (77.4%, n=31 — thin).
- **Overconfident: 8 of 9 populated bands underdeliver.** The one exception is
  the bottom band (50-54, n=280) which *overdelivers* by 3.2 points. So the
  caveat's spirit is right, but "every band underdelivers" is very nearly
  rather than exactly true. Recorded as measured, not rounded toward the claim.
- **Brier 0.2551 vs 0.2500** for a constant 0.5 — the score is **worse than a
  coin flip** as a probability. The shipped report is sharper still: **BSS
  -0.045** against the base-rate forecast, and ECE sits **outside its own
  calibrated null band** — i.e. real calibration error, not sampling noise.

> **Verdict: the Defect A caveat is accurate and well-worded.** The engine is
> telling the truth about its own score. Do not soften it.

---

## 2. DEFECT — the activation gate is an in-sample test

`buildCalibrator` (`packages/prediction-engine/src/calibration-apply.ts:80-95`)
activates when `calibratedEce <= rawEce`. **Both are computed on the rows the
map was just fitted on.**

| quantity | value |
|---|---|
| raw ECE (data as-is) | **0.0784** |
| calibrated ECE, **in-sample** (what the gate reads) | **~1e-14** |
| calibrated ECE, **5-fold out-of-fold** (honest) | **0.0321** |

An in-sample ECE of 1e-14 is not a measurement — a PAVA fit can always
reproduce its own training labels, so the "improvement" half of the gate
cannot fail. The audit proves this by feeding `buildCalibrator` a deliberately
adversarial sample: it still reports calibrated ECE below raw. **In practice the
gate reduces to a sample-size check.**

The v5.1.0 activation proposal says as much, then reports the honest number
anyway:

> "In-sample calibratedEce is 0.0000, an isotonic overfit artifact; the
> out-of-fold number above is the honest one."
> — `docs/calibration-proposals/2026-06-22-calibration-activation-v5.1.0.md:41-42`

**So the code does not do what its own audit trail prescribes.** The proposal
validated out-of-fold; `buildCalibrator` compares in-sample.

**In fairness to the calibration itself:** out-of-fold ECE **0.0321** vs raw
**0.0784** is a real ~2.4x improvement. On the question v5.1.0 actually asked —
*does mapping raw confidence improve calibration?* — the answer measured today is
**yes**. The defect is in how the gate enforces it, not in whether calibration
helps.

---

## 3. DEFECT — the map publishes a certainty off 14 settled wins

`convictionTier` requires a calibrated probability ≥
`CONVICTION_MIN_PROBABILITY` = **0.65** (`conviction-tier.ts:45`).

The map fitted on the current production sample:

| raw score | calibrated to | rows behind it | clears 0.65? |
|---|---|---|---|
| ≥ 0.50 | 0.5185 | 189 | no |
| ≥ 0.53 | 0.5305 | 279 | no |
| ≥ 0.60 | 0.5812 | 117 | no |
| ≥ 0.61 | 0.5841 | 1,017 | no |
| ≥ 0.75 | 0.5900 | 100 | no |
| ≥ 0.78 | 0.6000 | 175 | no |
| ≥ 0.87 | 0.6792 | 53 | **yes** |
| ≥ 0.95 | **1.0000** | 3 | **yes** |
| ≥ 0.96 | **1.0000** | 6 | **yes** |
| ≥ 0.98 | **1.0000** | 1 | **yes** |
| ≥ 1.00 | **1.0000** | 4 | **yes** |

**The map emits `P(win) = 1.0` — a stated certainty.** Four separate plateaus
reach it, backed by **14 settled wins total**, every one of which won. PAVA
assigns each plateau the weighted mean of its own rows; when a bracket is
perfect, that mean is 1.

- **14 rows.** The repo's own public-curve floor is 30 and the calibration floor
  is 100. A stated certainty below both. (Asserted behaviourally: a 10-row
  bucket comes back `sufficientSample: false` from the shipped bucketing code.)
- **A perfect run cannot support 1.0.** The 95% Wilson lower bound on 14/14 is
  **0.785** — the published 1.0 overstates even its own interval's floor by
  0.215.
- **`convictionTier` will certify on it.** Given raw 100, a SPEAK edge and
  strong CLV history, the shipped function returns `CONVICTION` with
  `expectedWinRate: 1`.

**Severity: high, but latent.** `apps/web/app/api/picks/route.ts:264` only
builds the calibrator when `gates.canApplyCalibrationAdjustments` is true, and
that defaults to **false** (`platform-config.ts:174`). This becomes a live bug
the moment anyone sets `CALIBRATION_ADJUSTMENTS_ENABLED=true` — which is exactly
what the v5.1.0 checklist's open final box invites.

---

## 4. OVERCLAIM — public copy asserts calibration that is switched off

- `apps/web/app/layout.tsx:106` ships the site keyword **`"calibrated betting confidence"`**.
- `apps/web/app/press/page.tsx:26` publishes *"Galaxy Sports Edge publishes a
  calibrated, fully-reasoned signal."*

Neither is gated on the calibrator being active, and it is not:

- `CALIBRATION_ADJUSTMENTS_ENABLED` defaults to **false**
  (`platform-config.ts:174`, read through `readiness.ts:142`).
- The v5.1.0 checklist's last box — setting the flag on Vercel Production — is
  **still unchecked** three months later
  (`2026-06-22-calibration-activation-v5.1.0.md:66`).

So the site markets calibrated confidence while the calibrated path is off and
the public picks route serves the **raw heuristic score** — which §1 measures as
worse than a coin flip.

This is the one place where product marketing is ahead of the engine's own
measured evidence. **Fix:** gate both on the same flag the picks route uses, or
reword to "calibration in development."

---

## 5. DEFECT — the published number is a function of the sampling window

Same code, same underlying picks, different window:

| window | fit rows | plateaus | **top calibrated value** |
|---|---|---|---|
| shipped (`take: 2000`) | 1,944 | 11 | **1.0000** |
| full history (cap removed) | 2,511 | 5 | **0.9231** |

The shipped window excludes older rows, which changes the top of the ladder
from a 13-row 92.3% plateau into a 14-row **100%** certainty. Neither is
meaningful; both are artifacts of which rows the query returned.

**What this means for the audit's own numbers.** They are a measurement of
*this* window on *this* date. §5 is the honest caveat on §1–§4: re-run the test
after the next 2,000 picks settle and the map — and the ceiling in §3 — will
move. The structural defects in §2, §3 and §4 do not depend on the window; the
exact figures do.

---

## 6. CONFIRMED HONEST — what the engine gets right

Checked and **not** defects, recorded so this audit is not read as uniformly
negative:

1. **The Defect A caveat is accurate** (§1) and correctly refuses to call
   confidence a probability. `calibration-curve.tsx` even explains why its
   x-axis reads "confidence score" rather than "predicted."
2. **Push handling is sound.** Pushes are excluded from published win rates
   (`compute.ts:305-320`) with an explicit warning that scoring a push as 0.5
   "reports a genuinely sub-50% bucket as HIGHER than truth."
3. **Thin buckets are withheld.** The 30-row publish floor keeps a 2-pick "100%"
   off the public curve — verified behaviourally in the test suite.
4. **In-play rows are excluded and surfaced** (C-302): 56 rows here, reported
   rather than silently dropped.
5. **The gate fails closed.** Under 100 rows `buildCalibrator` returns an
   identity map flagged `calibrated: false`, and
   `app/cockpit/calibration/page.tsx:157-162` documents the real wiring hazard
   that a raw score must never reach CONVICTION. That reasoning is correct.
6. **Calibration genuinely helps out-of-fold**: 0.0784 → 0.0321 (§2).

---

## 7. Falsification instructions

Every claim above is checkable and will fail loudly if it stops being true.

```bash
cd apps/web
npx vitest run __tests__/calibration-audit/calibration-claims-audit.test.ts
```

To re-measure against fresh data, re-pull the evidence CSVs to the same shape
(`id,p,y,pick_type,model_version,in_play`, with `p = confidence/100` and
`y = 1` for WIN):

```sql
SELECT p.id,
       round(least(greatest(p.confidence,0.0),100.0)/100.0, 6) AS p,
       CASE WHEN p.result='WIN' THEN 1 ELSE 0 END              AS y,
       p."pickType"                                            AS pick_type,
       p."modelVersion"                                        AS model_version,
       (p."generatedAt" >= g."commenceTime")                   AS in_play
FROM picks p
JOIN games g ON g.id = p."gameId"
JOIN pick_signal_snapshots s ON s."pickId" = p.id AND s."eligibleForLearning"
WHERE p.result IN ('WIN','LOSS') AND NOT p."isBootstrap" AND p."isPublished"
ORDER BY p."settledAt" DESC
LIMIT 2000;   -- omit this line for the full-history CSV
```

### What would falsify each finding

| Finding | Falsified if |
|---|---|
| §1 overconfidence | fewer than 8 of 9 populated bands show realized < claims |
| §1 non-monotonicity | the realized rate becomes monotone across all bands |
| §1 no probabilistic skill | Brier beats 0.25, or BSS turns positive |
| §2 in-sample gate defect | in-sample calibrated ECE lands materially above raw ECE |
| §2 calibration helps OOF | mean OOF ECE ≥ raw ECE (0.0784) |
| §3 certainty from 14 wins | the fitted map has no plateau at exactly 1.0 |
| §3 latent severity | prod evidence shows `CALIBRATION_ADJUSTMENTS_ENABLED=true` |
| §5 window instability | the capped and uncapped fits agree on their top value |

---

## 8. Recommended fixes, in priority order

1. **Clamp plateau outputs by support.** In `buildCalibrator`, never publish a
   plateau whose backing sample is below a stated floor (30 matches the public
   curve's own floor). A 14-row bracket must not produce `P(win) = 1.0` — this
   is the highest-value fix and it is small.
2. **Never emit 1.0 or 0.0 from a fitted map.** `clamp01` currently allows it.
   A bounded forecast from a finite sample is the honest form.
3. **Make the gate out-of-fold, or stop implying it validates calibration.**
   Cheapest honest option: rename the field so `calibratedEce` reads as
   in-sample, and display the OOF number beside it on the cockpit page.
4. **Reword the public keyword and press line** to match the flag's real state,
   or wire them to it (§4).
5. **Re-state the sample size** in the Defect A caveat (2,385 → live count),
   ideally computed rather than hardcoded.
6. **Decide the v5.1.0 env flag.** It has been open since 2026-06-22. Leaving it
   open keeps fixes 1-3 latent; closing it as "not yet" makes that explicit.

---

## Provenance

- Base commit `2c156d4df` ("feat(signals): normalize the ten key scales and fit
  real per-key weights (+ type fixes) (#979)").
- Data: Neon project `summer-brook-99380762`, role `hermes_ro` (**read-only**),
  database `neondb`. No connection string was read, printed, or committed.
- Code under audit (imported, not copied):
  `packages/prediction-engine/src/probability-calibration.ts`,
  `calibration-apply.ts`, `conviction-tier.ts`;
  `apps/web/lib/calibration/compute.ts`, `public-confidence.ts`.
- Existing calibration suites re-run unchanged as a regression check:
  `calibration.test.ts` (17), `live-calibration-p.test.ts` (7),
  `market-anchored-calibration-sample.test.ts` (22) — all passing.
- **No typecheck was run or claimed.** TypeScript is not installed in this
  worktree, so no `tsc --noEmit` result is asserted anywhere in this document.
- No merge performed. No gate, schema, migration, or env value changed.