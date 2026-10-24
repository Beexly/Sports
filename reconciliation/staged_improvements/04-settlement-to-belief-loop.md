# STAGED-IMPROVEMENT 4 — The settlement→belief loop (INV-06)

**Changes a published number?** YES — but only via weights that are earned,
not via a hardcoded change.
**Risk:** medium. This is the stage that makes every other stage real.
**Files:** `packages/prediction-engine/src/literature/literature-retrieval.ts`
(stages b, c), `apps/web/lib/settlement/free-path-snapshot.ts` (stage a,
already done on the audit branch).

---

## Why

Nothing on `main` updates a weight, a premise score, or an edge strength
from a settled result.

| Question | Answer | Evidence |
|---|---|---|
| Does settlement update a signal weight? | **NO** | `grep -n 'weight' packages/prediction-engine/src/settlement.ts` → no matches |
| Is `post-settlement-work` a belief update? | **NO** | `packages/ingestion-pipeline/src/post-settlement-work.ts` is a work-queue: `enqueuePostSettlementWork` (:125), `markPostSettlementWorkDone` (:173), `markPostSettlementWorkFailed` (:255), `cancelPostSettlementWork` (:227) |
| Does anything update a premise score? | **NO on main** | `lit.residual` / `lit.premise_score` exist only on the audit branch's Neon dev branch |
| Does the corpus shift reach `trueProb`? | **seam only, weight 0** | `packages/prediction-engine/src/ranking-prob.ts:56-58` — `corpusWeight` defaults to 0.0 |

## Stage (a) — write residuals — **BUILT on the audit branch**

`applyResidualFeedback`
(`packages/prediction-engine/src/literature/literature-retrieval.ts:290`),
hooked at `apps/web/lib/settlement/free-path-snapshot.ts` via
`apps/web/lib/literature/literature-residual-bridge.ts`.

Measured: 72 residuals from **real** settled outcomes (43 correct), 28
premises graded.

**The scoring rule, and why it is Brier skill and not binary correctness.**
A premise with no numeric claim is graded at 0.5 — an explicit "I do not
know". Against a binary outcome, |0.5 − 0| = 0.5 is NOT < 0.5, so such a
premise is scored *incorrect every time* under a binary rule. Every such
premise therefore earned activation_score 0 forever and could never be
promoted.

**Measured on the first real run: 48 graded, 0 correct, MAE exactly
0.50000, max activation_score 0.** The loop ran and the score could not
move.

The fix is Brier skill against the 0.25 uninformed baseline:

```
brier_i  = residual_i²
mse      = mean(brier_i)
skill    = 0.25 − mse          (> 0 means better than chance)
score    = max(0, skill) × min(n / 5, 1)
```

A premise predicting 0.85 that is right 85% of the time gets mse 0.1275 and
skill +0.12. A premise saying "0.5, I don't know" gets mse 0.25 and skill 0
— it carries no information and earns no weight, which is correct.

## Stage (b) — update EDGE strength — NOT BUILT

`lit.causal_edge` has `effect_estimate` and `support_n`, but nothing
recomputes them from residuals. `retireFailedEdges`
(`packages/prediction-engine/src/literature/literature-causal.ts`) only
retires edges whose test FAILED; it does not strengthen the ones that PASS.

**Design.** Beside `applyResidualFeedback`, add
`updateEdgeStrengthsFromResiduals(db)`:
for each promoted edge, recompute `effect_estimate` as the mean residual
of its activated premises and `support_n` as the graded count; and apply a
shrinkage factor toward the prior so a single graded premise cannot move
an edge.

**The shrinkage must be explicit.** A promoted edge with support_n = 1
should not carry the same weight as one with support_n = 40.

## Stage (c) — a KNOWABILITY score — NOT BUILT

The mandate names "knowability scores". No such field exists anywhere in
the repo. It is a new concept: *how much of this outcome was knowable in
advance?*

**Construction.** `knowability = 1 − mse(premise_residuals)`, which is
already computable from `lit.residual`. It is bounded in [0, 1] by
construction (mse ≤ 0.25 for probability claims in [0,1] with binary
outcomes).

**Where it belongs.** A new column on `lit.premise_score`, and a
game-level aggregate on a new `lit.game_knowability` table.

## The honest limit — and it is the whole point

**72 residuals over 2 games is not a trend.** The measured
`residuals_improved: true` (MAE 0.4522 → 0.4431) is noise with a
favourable sign, and the second half contains more bridge premises
(0.5-prior), which have smaller residuals by construction.

**8 premises were promoted. 8 intervention tests ran. All 8 were
INCONCLUSIVE** — no premise has 8+ graded residuals yet.

**So the promotion gate is the arithmetic that turns this machinery into
belief: N ≥ 500 settled games and ΔBrier ≥ 0.002 on a pre-registered
holdout** (`packages/prediction-engine/src/reasoning/corpus-evaluator.ts:26-29`).
Until that pre-registration is actually run and passed, `corpusWeight` stays
0 and the corpus changes nothing downstream.

**Staging a promotion gate that has not been run is the exact failure the
repo's own doctrine warns about.** The gate is written; the run is not
done. That is the honest state and it should be reported as such.

## Acceptance

- [ ] A premise's activation score is monotone in its Brier skill and
      0 for an uninformative premise.
- [ ] `corpusWeight` remains 0 until a pre-registration artifact with
      N≥500 and ΔBrier≥0.002 exists. **Assert this in a test.**
- [ ] Edge strength updates are shrunk by support count.
- [ ] The knowability score is bounded in [0,1] and is not reported as
      "accuracy".
