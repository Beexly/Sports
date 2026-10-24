# T13 -- Proximal Negative-Control Identification on the Unbreakable Bow-Arc

**Status:** implemented, pinned, verified, pushed.
**Branch:** `audit/reconciliation-2026-10-20`
**Spec:** *Frontier GSE 50k-Signal Causal Reasoning Engine* -- Table 5 (T13), §6.3

---

## 1. The spec's requirement, verbatim

Table 5, T13:

> Proximal Negative-Control Identification on Unbreakable Bow-Arc: When X -> Y, X <-> Y has
> 0 mediators on X -> Y, verifies RKHS Fredholm bridge solver recovers E[Y | do(X=x)] via
> proxies (Z, W) when kappa(K_WZ) <= 50 and refuses when ill-posed.

§6.3, the mechanism the spec requires:

> When runShpitserPearlID returns FAIL_HEDGE on an intervention A = a ... and ID-EnablingEdges
> finds ZERO OBSERVED MEDIATORS on A -> Y to break the hedge, proximal-bridge-id.ts invokes
> Nonparametric Proximal Causal Inference. Selecting a Treatment-Inducing Negative-Control
> Proxy Z and an Outcome-Inducing Negative-Control Proxy W satisfying W ... A | (U, X) and
> W ... Z | (A, U, X), the engine solves the Fredholm integral equation of the first kind for
> the outcome bridge function h(a, W, X) via Tikhonov-regularized RKHS regression.

Two requirements, not one: the **recovery** (when the bridge is well-posed) and the
**refusal** (when it is not). A gate that only checks the first would let the engine publish
the effect of a bridge that could not be inverted.

## 2. What already existed, and what did not

| Artifact | Before this work | Note |
|---|---|---|
| `src/causal/proximal-bridge-id.ts` | existed | 57 KB, the RKHS Fredholm solver |
| `src/causal/__tests__/proximal-bridge-id.test.ts` | existed | 20+ tests, solver in isolation |
| `src/causal/causal-claim-gate.ts` -> `runProximalAttempt` | existed | the route was already wired |
| **the bow-arc scenario** | **absent** | no test built the spec's graph |
| **the PR-blocking gate** | **absent** | T13 was named in the spec and unpinned |
| **the mutation sweep** | **absent** | nothing proved the gate was load-bearing |

The existing solver suite tests the solver on a linear-Gaussian proximal problem. It never
builds the graph the spec names, never goes through the gate, and never checks that the
bow-arc refusal and the proximal admission are the same decision seen from two sides.

So the gap was not the algorithm. It was that **the route was never exercised end to end, and
never pinned.** A gate that can be deleted without any test noticing is a gate that is not there.

## 3. What was built

### 3.1 `packages/prediction-engine/test/proximal-bridge-id.t13.spec.ts` (new, 5 tests)

The spec's scenario, driven through the **gate** rather than the solver:

- **the graph** -- `X -> Y` with `X <-> Y`, and nothing between them. The bow-arc is
  unbreakable for the ordinary route because the only edge that could break the hedge is
  `X -> Y` itself, and no mediator can occupy it.
- **the data** -- `A = 0.8U + 0.6X + e`, `Z = 0.9U + e`, `W = 0.9U + e`,
  `Y = beta*A + gamma*U + 0.3X + e`, with `beta = 0.6`. A linear bridge `h(a,w,x)` exists
  exactly with `t1 = beta`, so the well-posed case has a **right answer to recover**. That is
  what makes the recovery assertion mean anything.
- **the ill-posed twin** -- `Z = A + 1e-4*e` replaces the proxy, making the instrument Gram
  matrix singular and driving the Fredholm condition number past 50. Nothing else changes, so
  the **only** difference between admitting and refusing is the conditioning of the bridge.

| # | Test | Asserts |
|---|---|---|
| 1 | bow-arc with 0 mediators refused on the ordinary path | `publishable=false`, `nonIdentifiableHedge`, `ASSOCIATION_ONLY`, `hedge_count=1`, no mediator activated |
| 2 | the SAME bow-arc published CAUSAL by the proximal g-formula | `publishable=true`, `CAUSAL`, `formula_class=PROXIMAL_BRIDGE`, `ate` within 0.15 of 0.6 **and** closer to truth than the naive OLS slope |
| 3 | an ill-posed bridge is refused, and the verdict says why | `admitted=false`, `PROXIMAL_CONDITION_NUMBER_EXCEEDS_LIMIT`, the limit is in the reason, **and the verdict's own prose names the proximal route** |
| 4 | the SAME graph with and without proxies gives DIFFERENT verdicts | refuses without, publishes with -- so the difference is the proxies, not a different identification problem |
| 5 | a too-small proximal dataset is refused through the gate | `PROXIMAL_SAMPLE_TOO_SMALL`, not a silent downgrade |

Test 2 asserts the **naive slope is biased** as well as that the bridge is unbiased. Without
that, a gate that returned the confounded slope would pass.

### 3.2 `packages/prediction-engine/reconciliation/_mutation_sweep_t13_proximal.mjs` (new)

Five mutations, each required to make a named test stop passing:

| Phase | Mutation | Named test |
|---|---|---|
| 1 | the proximal solver is never run | the bow-arc is published CAUSAL by the proximal g-formula |
| 2 | the formula is mislabelled `BACKDOOR_G_FORMULA` | the bow-arc is published CAUSAL by the proximal g-formula |
| 2 | an ill-posed bridge is published anyway | the proximal route REFUSES on an ill-posed bridge |
| 2 | the proximal refusal is dropped from the reason | the proximal route REFUSES on an ill-posed bridge |
| 2 | the sample-size floor is not enforced | a too-small proximal dataset is refused |

**The sweep uses the JSON reporter and asks "did the named test PASS?"** -- not the verbose
reporter's `x file > describe > it` shape, which does not match. The FCI sweep's first
version used the verbose shape and reported NOT PINNED for every rule while every rule was in
fact pinned. A sweep that cannot detect anything is worse than no sweep.

**Two of the five mutations initially survived, and both were real defects in the first
version of the test, not in the sweep:**

1. *The refusal swallowed.* The mutation dropped the `proximalNote` -- the prose the verdict
   uses to say "the proximal route was tried and declined" -- while leaving the structured
   `proximal_attempt` field intact. The test asserted only the structured field, so the prose
   loss was invisible. But the prose is the channel a human reader sees, and without it a
   caller cannot distinguish "we tried and the condition number was 40,000" from "we declined
   to try". The test now asserts `verdict.reason` as well.
2. *The sample-size floor.* The mutation was aimed at the gate; the floor lives in the
   **solver** (`proximal-bridge-id.ts:875`). The sweep now restores every mutated file
   individually, so a mutation to the solver cannot be undone by restoring the gate.

### 3.3 `packages/prediction-engine/test/causal-engine.mutation-v3.spec.ts` (modified, +49)

T13 is now a **PR-blocking** gate, alongside T9/T10/T11/T11b/T11c/T12:

- the T13 sweep exits 0;
- the sweep **actually ran its rounds** -- an exit code alone proves nothing, so the output is
  asserted to contain its phase banner and its baseline line, and to be free of
  `STILL PASSED`;
- the T13 gate file **exercises the spec's scenario** -- asserted on the source itself, so a
  gate rewritten to test a chain instead of a bow-arc would fail here.

## 4. Verification (all measured, this session)

| Check | Result |
|---|---|
| tsc | **64 errors, identical to baseline; 0 in any touched file** |
| prediction-engine full suite | **985 files passed / 2 skipped (987); 7,608 passed / 4 skipped (7,612); exit 0** (was 7,602 -- +6 new) |
| T13 gate file | 5/5 pass |
| T13 mutation sweep | **exit 0 -- 5/5 mutations detected; baseline all 5 pass** |
| class-A coverage guard | 114 read sites, 0 gaps, exit 0 |
| threshold auditor (honesty checker) | exit 0, self-test passes |
| source tree after the sweep | byte-identical (`git status` shows only the 3 intended files) |

## 5. Not done

- **No differential oracle.** `pcalg` and R are not available here, so the proximal solver was
  read against the spec and the module's own documentation, not run against a reference
  implementation. This is the same gap as the one recorded for T11.
- **The `kappa(K_WZ) <= 50` boundary itself is not pinned at the boundary.** The sweep proves
  the floor is enforced and that an ill-posed bridge is refused. It does not prove the
  threshold fires at exactly 50 and not at 49. The auditor is a place to start, not a
  substituted proof.
- **The solver's own unit suite is unchanged.** `proximal-bridge-id.test.ts` was read, not
  modified. Its coverage of the solver in isolation remains what it was.
- **T14, T15, T16 have no gates.** T15's `no-raw-ngs-fence.ts` and T13's module exist in the
  repo; neither has a PR-blocking gate. The same treatment T13 just received is the obvious
  next piece of work.
- **The Neon production deploy, the settlement loop, and the dashboard regeneration are
  untouched.**

## 6. Files

| File | Status |
|---|---|
| `packages/prediction-engine/test/proximal-bridge-id.t13.spec.ts` | new -- 5 tests, the spec's scenario through the gate |
| `packages/prediction-engine/reconciliation/_mutation_sweep_t13_proximal.mjs` | new -- 5 mutations, JSON-reporter detection |
| `packages/prediction-engine/test/causal-engine.mutation-v3.spec.ts` | modified -- T13 added as a PR-blocking gate (+49) |

No source file under `src/` was changed. This work adds a gate; it does not alter the
engine's behaviour.
