# Model Promotion Gate — Frozen Contract (Fable, FV-track)

**Status:** FROZEN — ready for Sonnet implementation
**Supersedes:** the DEC-062-declined `laughing-wozniak-gyryjx` promoter (task #75)
**Protected zones:** MODEL_VERSION, CLV, calibration, public claims — every invariant below is a required test, not guidance.

## Why the declined promoter could never work, and what this fixes

DEC-062 found the recovered champion/challenger promoter was structurally fake:
`computeClvMean()` returned `0.5` for every input, and the champion-vs-challenger
Brier comparison read the same field for both sides, so `brierImprovement` was
identically `0` — **it could never promote anything**, and its tests asserted the
tautology. The deep failure was architectural, not a typo: the harness trusted
model-adjacent self-reports instead of recomputing from persisted ground truth,
so a stub was indistinguishable from a working implementation.

This contract inverts that failure into safety properties. Every pathology of the
declined branch becomes a named test the new gate must pass (§5).

## 1. Decision being made

Challenger model K may replace champion C for a market family iff K's
out-of-sample predictive quality exceeds C's **with sufficient evidence**, on the
**same events**, under **leak-free walk-forward evaluation**, with
**pre-registered** parameters — and the actual switch remains **founder-applied**
(the gate outputs eligibility, never flips MODEL_VERSION itself).

## 2. Leg 1 — paired calibration superiority (Brier differential)

For every settled event *i* in the registered window where both models emitted a
pre-lock probability: `d_i = (p_C,i − y_i)² − (p_K,i − y_i)²` (positive = K
better). Pairing on identical events removes game-difficulty confounding and is
the main power win over the declined design.

**Test:** empirical-Bernstein lower confidence bound (non-asymptotic, valid at
every n, variance-adaptive — deliberately NOT a t-test, so the guarantee does not
lean on CLT in an adversarial/audit setting):

```
LCB(δ) = d̄ − s_d·√(2·ln(2/δ)/n) − 7·ln(2/δ)/(3(n−1))
```

**Pass iff** `LCB(0.05) > δ_prac` with practical-significance floor
`δ_prac = 0.002` Brier points, and `n ≥ N_min = 500` paired settled events
(power: detecting μ_d = 0.005 at s_d ≈ 0.08 needs n ≈ 700; the floor is an
eligibility precondition, the LCB does the real work).

## 3. Leg 2 — CLV non-inferiority (market-anchored)

Challenger runs in the existing shadow lane (Workstream E router), its would-be
picks locked at the same timestamps and graded by the SAME settlement/CLV
pipeline as production picks. Pick sets differ between models, so this leg is
unpaired: reuse `welchCompare` (prediction-engine) one-sided:

**Pass iff** `H0: μ_CLV,K ≤ μ_CLV,C − ε` is rejected at 0.05 with `ε = 5 bps`,
and both sides have ≥ 100 graded shadow/production CLV picks in-window.

**Promotion rule: Leg 1 AND Leg 2.** A challenger that improves calibration but
materially degrades closing-line value is rejected. (CLV-superior-but-
calibration-flat challengers are a founder-judgment case, never auto-promoted.)

## 4. Leg 3 — procedural integrity

- Window, market family, N_min, δ_prac, ε **pre-registered in the §5 trials
  registry before the window opens**. One evaluation per challenger per window.
- m concurrent challengers ⇒ Bonferroni δ/m on both legs.
- Walk-forward only: every p was emitted and persisted before its event locked
  (PickSignalSnapshot discipline); the harness rejects any window containing
  post-lock predictions.
- Post-promotion hysteresis: a new champion is immune from evaluation until 200
  further settled picks (anti-flapping burn-in).

## 5. Anti-DEC-062 invariants — each a REQUIRED test

1. **Identity fixed point:** K ≡ C ⇒ every d_i = 0, LCB < δ_prac, NOT_ELIGIBLE.
   (The declined branch's hidden tautology, inverted into a safety assertion.)
2. **Oracle promotes:** K = outcome oracle (p_K = y) ⇒ ELIGIBLE. Proves the
   harness CAN promote — kills the "can never promote" failure class outright.
3. **Placebo rejects:** K = C + zero-mean seeded noise ⇒ eligibility rate ≤ δ
   across seeded runs (property test, seeded PRNG per repo convention).
4. **No self-reports, structurally:** the harness input type accepts only
   row-level persisted records (snapshot probabilities, settlement outcomes,
   pipeline-graded CLV). It computes every aggregate itself. A hardcoded
   `computeClvMean` is unrepresentable, not merely discouraged.
5. **Replayable decision:** each evaluation appends a PromotionDecision record
   (window hash, all stats, code revision, verdict) to the hash-chain ledger;
   `recompute.ts` must re-derive the verdict from persisted rows byte-for-byte.
6. **Founder gate:** output is ELIGIBLE / NOT_ELIGIBLE + evidence. MODEL_VERSION
   changes remain owner-applied, consistent with standing repo doctrine.

## 6. Implementation map (Sonnet)

`packages/prediction-engine/src/promotion/` — pure evaluator (`pairedBrierLcb`,
`clvNonInferiority` over `welchCompare`, `evaluatePromotion` composing the three
legs), types for row-level inputs, PromotionDecision serialization. Tests: §5's
six invariants + EB-bound unit tests against hand-computed fixtures. No wiring
into live scoring, no cron, no UI — evaluator + ledger record only. Dark until a
founder registers the first trial window.
