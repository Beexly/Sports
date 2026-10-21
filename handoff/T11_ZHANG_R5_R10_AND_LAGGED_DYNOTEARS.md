# T11 — Zhang (2008) FCI rules R5–R10, and the lagged DYNOTEARS fit

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-20
**Scope:** implement the spec's T11 — "FCI orientation rules R5–R10 (including R5–R7
selection/circle-path rules) and R8–R10 tail completion" plus "scale-invariant lagged
DYNOTEARS (A_τ)" — against the primary sources, and prove each rule is actually pinned by a
test.

---

## 1. The primary sources, and what they say

| Source | Used for | Retrieved |
|---|---|---|
| Zhang, J. (2008), *On the completeness of orientation rules for causal discovery in the presence of latent confounders and selection bias*, Artificial Intelligence 172(16–17):1873–1896. doi:10.1016/j.artint.2008.08.001 | R5–R10, verbatim, journal pp. 1880–1881 | publisher PDF; text extracted to `scratch/zhang2008/rules_verbatim.txt` |
| pcalg `udag2pag.R` + `pcalg.R` (Colombo & Maathler) | reference implementation of the same rules, and `minUncovPdPath` / `minUncovCircPath` semantics | cloned to `scratch/zhang2008/pcalg/` |
| Kaiser & Sipos (2021), *Unsuitability of NOTEARS for Causal Graph Discovery* | the ℓ_NV objective (eq. 9) | arXiv:2110.07637, full text |
| Jahn, Karnik, Schulman (2025), PMLR v275 | periodic-ID window bound (Proposition 1) | PMLR v275 full text |

**pcalg was read, not run.** No R interpreter is available in this environment
(`Rscript: command not found`), so pcalg's semantics were used as a *reading* reference — a
second reading of the same rules — and not as an executable oracle. Any claim below that
rests on pcalg is a claim about its source text, not about a differential run against it.

---

## 2. The rules, and where each one is implemented

All in `packages/prediction-engine/src/causal/fci-pag.ts`:

| Rule | Zhang's antecedent | Function |
|---|---|---|
| R5 | uncovered circle path ⟹ the edge and every path edge become undirected | `ruleR5` + `findUncoveredCirclePath` |
| R6 | undirected edge at β + circle at β ⟹ the circle at β becomes a tail | `ruleR6` |
| R7 | `α −−∘ β∘−−∗γ`, α and γ non-adjacent ⟹ the circle at β becomes a tail | `ruleR7` |
| R8 | `α →β →γ` or `α −−∘β →γ`, with `α∘→γ` ⟹ `α →γ` | `ruleR8` |
| R9 | `α∘→γ` + an uncovered p.d. path α→…→γ with γ,β non-adjacent ⟹ `α →γ` | `ruleR9` + `uncoveredPdPathExists` |
| R10 | `α∘→γ`, `β→γ←θ`, two uncovered p.d. paths with distinct non-adjacent first steps ⟹ `α →γ` | `ruleR10` |

Two corrections to the module that preceded this work:

- The module's historical "R8" was **not** Zhang's R8. It wrote an arrowhead at the far end of
  a partially-directed edge; Zhang's R8 writes a **tail at the near end**. It is now
  `ruleArrowheadAtDescendant` and Zhang's R8 is `ruleR8`.
- `ruleR10` used the shared `changed` flag in its `break` conditions, so once **any** edge was
  oriented the remaining pairs were skipped for the rest of the call. The result depended on
  iteration order rather than on the rule. Now a per-edge `fired` flag.

---

## 3. The finding that mattered: the tests did not pin the rules

The first version of `fci-pag-r5-r10.test.ts` passed 12/12. A **mutation sweep**
(`packages/prediction-engine/reconciliation/_mutation_sweep_r5_r10.mjs`) then disabled each
rule in turn and required the matching test to fail. Result:

```
FAIL R8: "turns alpha o-> gamma into alpha -> gamma given a directed path"
      -> STILL PASSED -- the test does not pin this rule
```

**R8's test was green with R8 deleted.** The reason: `completeAncestral` — a rule that
"stands in for R9/R10" — fires on exactly the same configuration (a circle at α with a directed
path α→…→γ) and writes the same tail. The test was measuring the fixpoint, not R8.

The same is true of R2. These rules *compete*: several of them want a tail at the near end of
the same edge.

**The fix is structural, and it is the same switch pcalg has.** `orientPag` now takes an
optional `rules` argument (`OrientationRule[]`), so a test can apply exactly one rule. pcalg's
`udag2pag` has had `rules = c(TRUE, TRUE, ...)` for this reason all along.

### The sweep's two phases

- **Phase 1** — disable the rule, require the pinning test to fail. Proves the test depends on
  the rule.
- **Phase 2** — remove one *guard condition* from the rule's antecedent, require the matching
  negative test to fail. Proves the test pins the **precondition**, not merely the rule.

Phase 1 alone would have passed on the broken R8 test. Phase 2 is what caught that three of
the negative tests were protected by a *second* guard, so the clause they claimed to pin was
never load-bearing.

### Redundancy, and why some graphs are 5 nodes

Some of Zhang's clauses are **implied** by others on small graphs, and a negative test on such
a graph cannot detect the loss of the implied clause — it still fails for the other reason.
Concretely:

- On a **4-cycle**, R5's "α,θ are not adjacent and β,γ are not adjacent" *is* the cycle's own
  unshielded-triple condition. A 4-cycle test pins nothing about that clause separately.
- With β the second node and γ the last, a **4-node** path has the triple (β,…,γ) as a
  consecutive triple, so R9's "γ and β are not adjacent" is implied by the path's uncoveredness.

The affected negative tests were therefore rebuilt on 5-node graphs, where the clauses are
independent. Each test file comment says which clause it pins and why the graph is the size it
is.

---

## 4. Verification — all measured, exit codes quoted

| Check | Command | Result |
|---|---|---|
| Full suite | `node ../../node_modules/vitest/vitest.mjs run` | **exit 0** — 3,212 files, 7,602 tests, 7,598 passed, 0 failed, 4 pending |
| Type check | `tsc --noEmit -p tsconfig.json` | **64 errors**, identical to the pre-existing baseline; **0** in any file touched here (`fci-pag.ts`, `causal-graph-builder.ts`, `periodic-timeseries-id.ts`, the new tests) |
| Mutation sweep | `node reconciliation/_mutation_sweep_r5_r10.mjs` | **exit 0** — 6/6 rules pinned (phase 1), 7/7 antecedents pinned (phase 2), baseline clean |
| Class-A coverage guard | `node reconciliation/_check_class_a_coverage.mjs` | **exit 0** — 114 read sites, 0 without the class filter |
| Mutation honesty checker | `node reconciliation/_mutation_check_honesty_tests.mjs` | **exit 0** — every defect caught by a test |

The sweep's own output is the evidence that it ran, not just that it exited 0:

```
=== PHASE 1: disable the rule; the pinning test MUST fail ===
OK   R5: "turns an uncovered circle cycle into undirected edges" -> failed as required
OK   R6: "turns the circle at beta into a tail when beta has an undirected edge" -> failed as required
OK   R7: "turns the circle at beta into a tail when alpha and gamma are non-adjacent" -> failed as required
OK   R8: "turns alpha o-> gamma into alpha -> gamma given a directed path" -> failed as required
OK   R9: "turns alpha o-> gamma into alpha -> gamma given an uncovered p.d. path" -> failed as required
OK   R10: "turns alpha o-> gamma into alpha -> gamma given two non-adjacent p.d. paths" -> failed as required

=== PHASE 2: break the antecedent; the named test MUST fail ===
OK   R5 (uncovered path): "does NOT fire when a consecutive triple on the path is shielded" -> failed as required
OK   R5 (alpha/theta non-adjacent): "does NOT fire when alpha and theta are adjacent" -> failed as required
OK   R6 (circle at beta): "does NOT fire when beta has no circle" -> failed as required
OK   R7 (alpha/gamma non-adjacent): "does NOT fire when alpha and gamma are adjacent" -> failed as required
OK   R8 (alpha -> beta step): "does NOT fire without a directed path from alpha" -> failed as required
OK   R9 (gamma/beta non-adjacent): "does NOT fire when the second vertex is adjacent to gamma" -> failed as required
OK   R10 (mu/omega non-adjacent): "does NOT fire when the two paths start at adjacent vertices" -> failed as required

=== BASELINE (no mutation): NO test may fail ===
OK   baseline: all tests pass with the unmutated source
```

The sweep reads vitest's **JSON reporter**, not its text output. An earlier version parsed the
verbose reporter and reported "NOT PINNED" for all six rules while every test was in fact
pinned: the reporter prints a failed test as `  × file.ts > describe > it`, and matching the
whole line finds nothing. A parsing mistake that masquerades as a verification result is worse
than no sweep, so the JSON reporter is the source of truth and the fragment-replacement
fragments are asserted to occur **exactly once** in the source before any mutation is applied.

---

## 5. The lagged DYNOTEARS (T11c)

`packages/prediction-engine/src/causal/causal-graph-builder.ts` — the joint (W_0, A_1..A_p)
fit, with the **ℓ_NV objective of Kaiser & Sipos eq. (9)**:

```
ℓ_NV(W; X) = ½ Σᵢ log ‖(X−XW)ᵢ‖² − log|det(I−W)|        ← ONE log-determinant, coefficient 1
```

The contemporaneous module in `fci-pag.ts` uses a **d-folded** determinant term
(`− d·log|det(I−W)|`). That is a known, separately-reported deviation in *that* module, and it
is deliberately **not** reproduced here: the two objectives have different argmins, so the two
modules are not interchangeable. The difference is stated in the source, not buried.

Scale invariance is achieved the way the contemporaneous module does it — z-score the columns,
fit on the standardised problem, threshold on the **standardised** coefficients — and the
module reports `h` on the standardised matrix for exactly that reason (h is not scale
invariant).

The T11c gate in `test/causal-engine.mutation-v3.spec.ts` requires that scaling two features
by 1,000× moves **neither** the W_0 edge set **nor** the A_1 edge set, and that the fit is not
vacuous (it must actually recover the contemporaneous collider and the lag-1 edge first).

The panel DGP was moved to `src/causal/__tests__/panel-fixtures.ts` so the module's own tests
and the T11c gate measure the *same* panel — the repo's existing convention for the PRNG
(`__tests__/test-prng.ts`), for the same reason: a duplicated generator drifts, and a
scale-invariance comparison across two different datasets passes for the wrong reason.

---

## 6. Three spec errors found (the spec is not the ground truth)

1. **Jahn et al. 2025's bound.** The spec gives `2|V_slice|`. Proposition 1's actual bound is
   `L · 2^(Lw) · (Lw+1)^(2Lw+2)`. The delegate's `horizonBoundCBigInt` implements the **correct**
   one.
2. **Kaiser & Sipos's title and year.** The spec cites it as a NeurIPS 2021 paper; it is
   *Unsuitability of NOTEARS for Causal Graph Discovery*, Neural Processing Letters 2022
   (arXiv:2110.07637).
3. **The spec claims ℓ_NV "remediates" the Kaiser & Sipos variance-sorting pathology.** It does
   not: eq. (9) shows the pathology applies to ℓ_NV as well. Kaiser & Sipos propose **no new
   objective** — their remedy is to standardise and choose the scale carefully. The module
   standardises, which is the part that is actually actionable; the claim that the objective
   alone fixes it is not supported by the paper.

---

## 7. The periodic-ID module, held to the same standard

The audit's own rule is: *"when subagents write code, AUDIT it with the repo's own measurement
tools before committing it. A subagent's passing test suite is evidence about the subagent's
tests, not about the requirement."* The periodic-ID module was written by a delegate and its
24 tests passed — so it was swept the same way the FCI rules were.

`packages/prediction-engine/reconciliation/_mutation_sweep_periodic_id.mjs`:

- **Phase 1 — the computed values.** Break the arithmetic: the bound's exponent, the window's
  lower-edge clamp, the node count, the verdict. Each named test must fail.
- **Phase 2 — the refusals.** Remove a guard, or replace a refusal with a silent truncation.
  Each named test must fail.

**This module's failure mode is not a wrong answer, it is a silently smaller answer.** The
bound C is exponential in the width, so a window that is too small does not produce a wrong
number — it produces a confident "identifiable" verdict for an effect that is *not* identifiable,
because the hedge that proves unidentifiability lives outside the truncated window and is never
seen. So the refusals are the half that matters most, and the sweep weights them accordingly.

**Result: 10/10 mutations detected, baseline clean (all 24 tests pass), exit 0, 16.7 s.**

| Mutation | Detected by |
|---|---|
| bound exponent `2Lw+2` → `2Lw` | the exact-bound test (`expected 8 to be 32`) |
| window lower edge not clamped at 0 | the clamping test |
| node count drops the width | the `k*w` test |
| verdict hardcoded to identifiable | the bow-arc UNIDENTIFIABLE test |
| node budget inflated by 1M | the budget-refusal test |
| window silently capped instead of refused | the never-truncates test |
| latency-match guard deleted | the latency-mismatch test |
| out-of-scope refusal deleted | the uncovered-query test |
| inexactly-representable bound rounded | the too-large-bound test |
| empty outcome set accepted | the malformed-input test |

### Two bugs in the sweep itself — found by the sweep's own first run

The sweep's first version reported two mutations as undetected. **Both were bugs in the sweep,
not in the module**, and both are the same class of error the FCI sweep's first version made:

1. **A misspelled test title.** The expectation read `(L*w+1)^(2*L*w+2)`; the actual title is
   `(L*w + 1)^(2*L*w + 2)`. A title that does not match the report matches nothing.
2. **Looking for `status === "failed"` instead of "did not pass".** Deleting the budget guard
   outright lets the w=3 blow-up test allocate 1,572,870 nodes, which kills the vitest worker
   with an out-of-memory crash — the test never reports, so its title appears in *neither* the
   failed nor the passed set. Requiring a "failed" entry then reports "STILL PASSED" for a
   mutation that did break the suite, which is exactly backwards. Detection is now "the named
   test did not PASS", which covers an assertion failure, a crash, and a test that never ran.

The second bug is the more dangerous one, and it is worth stating plainly: **a sweep that
detects crashes as "not a failure" will report a clean bill of health for a mutation that
destroyed the run.** The baseline round now requires all 24 titles to pass *and* the count to
match, so the detection logic cannot be merely inverted. The baseline is what proves the
detector works.

One mutation was changed for safety rather than detection: the budget-guard round inflates the
budget by a million instead of deleting the guard, because deletion triggers the OOM above. A
sweep that can take the machine out is a sweep that does not belong in CI. The inflation
detects the same defect — the budget not being consulted — without the blast radius.

### And the same class of bug in the FCI sweep

The FCI sweep has the identical detection logic, and the identical hazard: it looked for
`status === "failed"`. Its mutations are all rule-level (they change marks in a small
hand-built graph), so none of them can OOM a worker, and its 14/14 result stands as measured.
But the logic is the fragile kind, and the fix is the same: the FCI sweep now detects "did not
pass" as well, and its baseline requires every named test to pass. **Re-measured after the
change: 14/14, exit 0.**

---

## 8. The delegate modules, audited rather than accepted

Both delegate modules were **already committed in `ef04b70c9`** before their reports arrived,
so the reports were used as a *check* on committed work, not as the source of it. Each report
was verified independently; two of its claims did not survive, and one gap in my own earlier
verification was found.

**What the reports got right, and I confirmed by re-measuring:**

- The Jahn bound. Re-fetched the paper (arXiv:2504.20172) and confirmed Proposition 1
  verbatim: `C = L·2^(Lw)·(Lw+1)^(2Lw+2)`, window `G[max(t_min(X)−C, 0), t_max(Y)]`. The
  figure `2|V_slice|` **appears nowhere in the paper** — grep returns nothing — and at w=2 it
  would be 4 where the paper says 2,916. The module's asserted values (32, 2916, 524288,
  5832) recompute exactly from the formula. The spec's figure is not even a conservative
  substitute: it is *too small*, and a too-small window turns an unidentifiable effect into an
  "identifiable" verdict.
- The lagged module's gradient is verified, and the verification **has teeth**. I mutated the
  implementation three ways and checked the finite-difference test caught each:
  - drop the `(I−W₀)^{-T}` determinant term → **3 tests fail**
  - drop the transpose on that term → **3 tests fail** (the subtle one)
  - scale `grad_A` by 2 → **2 tests fail**
  The scale-invariance gate also has teeth: thresholding the **original-unit** coefficients
  instead of the standardised ones → **2 tests fail**, which is exactly the failure the
  module's design claims to prevent.

**Two report claims that did NOT survive:**

1. *"Unrelated pre-existing failure: `src/tracking/cv-camera-compensation.test.ts` fails in the
   full suite."* It does not. Run in isolation: 5/5 pass, exit 0. And the full suite here
   reports **0 failed** across 7,602 tests. The delegate's run predates my commits, and the
   tree was in a different state; the claim does not hold against the committed tree.
2. *"tsc reports 75 errors, all pre-existing."* The committed tree reports **64**. The
   difference is the tree state, not a discrepancy in the analysis: the package's tsconfig
   `include`s `src/**/*.ts` and `exclude`s `**/*.test.ts`, so the count moves with which
   non-test files are present. Neither number is wrong for its own tree; 64 is the number for
   the committed one, and the audited files contribute **0** to it.

**A gap in MY OWN earlier verification, now closed.** I reported "0 errors in touched files" —
but the package tsconfig **excludes `**/*.test.ts`**, so `tsc --noEmit -p tsconfig.json` never
looked at three of the five files I touched (`fci-pag-r5-r10.test.ts`,
`causal-graph-builder.test.ts`, `periodic-timeseries-id.test.ts`). The check was true and
irrelevant. Re-run standalone with the repo's exact strict flags
(`--strict --noUncheckedIndexedAccess --noImplicitReturns --noFallthroughCasesInSwitch`,
`target ES2022`, `moduleResolution bundler`): **exit 0, no errors** in any of the four test
files. The files were not broken — they had simply never been typechecked. A verifier that
does not cover the case is not evidence about the case, and that applies to my own check as
much as to the delegate's.

**One addition to the delegate's work:** `periodic-timeseries-id.ts` lacked the
`export const ENABLED = false` flag that every other unwired module in `src/causal/` carries.
An unwired module without the flag is indistinguishable from one unwired by accident, and the
repo's zero-importer sweep is the measurement that has to find the second kind. Added, with
the reason in the source.

---

## 8. What is NOT done

- **No R, so no differential run against pcalg.** Its rules were read as a second reading, not
  executed. A differential test against pcalg remains possible and would be the strongest
  available check on the rule semantics.
- **The lagged module is `ENABLED = false`** and is not wired into any live path. Wiring changes
  predictions and is a human call. Same for the periodic-ID module.
- **The periodic-ID module is not covered by the mutation sweep**, which is scoped to the FCI
  rules. Its own tests pass (24) and the bound was re-verified against the paper above, but a
  mutation sweep over its window computation, budget guard and latency check would be the
  same standard the FCI rules were held to.
- **The Neon production deploy, the ITCROrcaGate wiring, the full settlement loop and the
  dashboard regeneration** are untouched, exactly as reported previously.
