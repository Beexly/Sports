---
modelVersion: v5.2.8
status: PROPOSED
date: 2026-09-15
owner_decision_required: true
supersedes: none (v5.2.7 stays frozen; the 2026-09-05 market-anchored display doc remains the honesty baseline and its Shin swap stays withdrawn)
---

# Market-anchored shrinkage display probability (v5.2.8)

**Status: PROPOSED.** This is the C-366 / D5 scorecard row for one number:

> **w = 0.10.** Published win probability becomes
> `p = market + 0.10 · (model − market)`

on every book-priced two-way pick that already carries `marketFairProb`. It is
calibration, not edge. It does **not** bump `MODEL_VERSION` in this row:
`scripts/guardrails/model-freeze.mjs` stays green on v5.2.7. On a **passing
real-export scorecard** (D20), Hermes opens a separate `model-version` PR
carrying the `IMPLEMENTED` flip and the `MODEL_VERSION` v5.2.8 diff; the
founder merges it.

## 1. The proposal

| field | value |
|---|---|
| weight **w** | **0.10** (D5 sweet spot; band 0.05–0.15) |
| formula | `p = marketFairProb + w · (modelProb − marketFairProb)` |
| holdout | **PICKS-H1** (`generatedAt >= 2026-08-01`, settled, published, non-founder) |
| keep rule (§4.2) | ΔBrier < 0 AND P(better) ≥ 0.75 vs `marketFairProb` on identical rows |
| football subset | NFL + NCAAF must be non-negative for D20 |
| kill line (pre-registered) | validate-era ΔBrier ≥ 0 or P(better) < 0.75 on PICKS-H1 |

Selection, side, Edge Index, factor trail and ranking law are untouched. Only
the displayed probability is shrunk 90% toward the price. `confidence` stays a
0–100 selection score and is never rendered as a percent.

## 2. Scorecard (C-366 run 2026-09-15T22:28:26Z)

**Source: committed C-362 fixture** (`packages/verifier/fixtures/picks-h1.json`,
n=33 with `modelProb`). A real `verifier/picks-h1.json` export does **not**
exist on this branch, so the frozen-holdout confirmation is **NOT RUN**.
`docs/factors/A2.yaml` is `BLOCKED` on that export — the fixture must not
CANDIDATE or DEAD the factor.

Attachment: [`evidence/2026-09-15-a2-shrinkage-scorecard.json`](evidence/2026-09-15-a2-shrinkage-scorecard.json)
(sha256 of export `c72b0938…76640f`; runner `scripts/factors/A2.mjs` via
`packages/verifier` `duel`/`scorecard`).

### Primary w = 0.10 vs market (identical rows)

| arm | n | Brier | log-loss |
|---|---|---|---|
| shrunk candidate | 33 | **0.23549** | 0.66302 |
| market (`marketFairProb`) | 33 | **0.23222** | 0.65634 |
| Δ (cand − mkt) | | **+0.00327** | +0.00668 |

- **P(better) = 0.036** (paired bootstrap, 1000 resamples, seed 20260915)
- Paired ΔBrier CI95 **[−0.00007, +0.00661]**, SE 0.00170, MDE80 0.00477
- Outcome Wilson 95%: 17/33 = 51.5% [35.2, 67.5]

### Football subset (NFL+NCAAF) at w = 0.10

| arm | n | Brier | Δ | P(better) |
|---|---|---|---|---|
| shrunk candidate | 18 | 0.24116 | **−0.00122** | 0.691 |
| market | 18 | 0.24238 | | |

Football is non-negative on this smoke (Δ < 0) but P(better) 0.691 < 0.75.

### Context

| arm | n | Brier | Δ vs market | P(better) |
|---|---|---|---|---|
| raw model (w=1, unshrunk) | 33 | 0.27477 | **+0.04255** | 0.006 |

The fixture model is overconfident by construction (historical versions must
score worse than market). Shrinkage collapses most of that damage (Δ +0.043 →
+0.003) without beating the price on this synthetic sample. **That is not a
kill of F18.** F18 measured on ~540 real ad-hoc-holdout rows: shrunk Brier
**0.20818 vs market 0.20905** at w=0.10 (LAST_PLAN §1 fact 2, D5).

### w-grid (fixture smoke, ΔBrier cand − market)

| w | 0.05 | 0.06 | 0.07 | 0.08 | 0.09 | **0.10** | 0.11 | 0.12 | 0.13 | 0.14 | 0.15 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Δ | +0.00161 | +0.00194 | +0.00227 | +0.00260 | +0.00293 | **+0.00327** | +0.00361 | +0.00395 | +0.00429 | +0.00464 | +0.00499 |

Monotone in w on the fixture (more model weight → worse), as expected when the
model has no orthogonal signal. On real data F18 reported a shallow interior
optimum near 0.10 across the same band.

## 3. Real-export scorecard — NOT RUN

DoD for the D20 keep:

```
# writes verifier/picks-h1.json (calibration-metrics cron; agents never touch the DB)
npx tsx scripts/factors/A2.mjs
# then: A2.yaml flips BLOCKED → CANDIDATE|DEAD on the real numbers
# and this section is replaced by that scorecard
```

Acceptance for the later `model-version` PR (not this row):

```
A2.yaml status CANDIDATE
  AND primary w=0.10 ΔBrier < 0 AND P(better) ≥ 0.75 on real PICKS-H1
  AND football subset ΔBrier ≥ 0 (D20)
node scripts/guardrails/model-freeze.mjs   # still exit 0 on v5.2.7 until the bump PR
```

A failing real scorecard keeps this document PROPOSED and A2.yaml DEAD, with
the number. That is the decision the kill line already made.

## 4. Why w = 0.10 and not a fitted weight

D5 freezes 0.10 before the frozen-split run. Fitting w on PICKS-H1 would turn
the holdout into training data (F19). The band 0.05–0.15 is the pre-registered
sensitivity check, not a search. Calibration, not edge: the claim is "the
displayed probability scores better than the price," never "we beat the
closing line."

## 5. What this does NOT do

- Does **not** bump `MODEL_VERSION` (stays v5.2.7; freeze guard OK on this row).
- Does not open `CALIBRATION_ADJUSTMENTS_ENABLED`, `PERFORMANCE_STATS`,
  `LIVE_BOARD`, or any gate.
- Does not re-grade history or change receipt minting.
- Does not claim an edge, a win rate, or a beat-close rate (C-32).
- Does not replace the 2026-09-05 proportional-de-vig display honesty; it
  composes with it (`market` below is that same receipt fair).

## 6. Next (separate row, founder merge)

1. Real `verifier/picks-h1.json` lands → re-run `scripts/factors/A2.mjs`.
2. If the keep rule passes: flip this doc to `IMPLEMENTED`, bump
   `MODEL_VERSION` to v5.2.8, open the `model-version` PR with the scorecard.
3. If it fails: leave PROPOSED, A2.yaml DEAD, number on the public table.
