# Optimizer Calibration Audit — P11-03

**AUDIT TYPE:** READ-ONLY calibration audit of the DFS lineup optimizer. No code was modified.
**AUDITED FILES:**
- `apps/web/lib/fantasy/dfs-optimizer.ts` (solver engine, current branch)
- `apps/web/components/fantasy/dfs-optimizer.tsx` (DFS UI component)
- `apps/web/components/fantasy/optimizer-workspace.tsx` (tabbed workspace shell)
- `apps/web/lib/fantasy/dfs-optimizer.test.ts` (solver test suite)
- Supporting: `apps/web/lib/fantasy/dfs-slate.ts`, `apps/web/lib/integrations/dfs.ts`, `apps/web/lib/integrations/providers.ts`, `apps/web/lib/integrations/projections.ts`, `apps/web/lib/fantasy/lineup.ts`, `apps/web/lib/fantasy/competitive-baseline.ts`

---

## Item 3 — The `claude/dfs-optimizer-edge` branch finding (TOP, per task instruction)

**FINDING (CONFIRMED, CRITICAL):** The task brief states that a "more advanced DFS optimizer built on branch `claude/dfs-optimizer-edge`" exists and was "left UNPUSHED and gated pending the owner's decision." This is **confirmed true**, and the current branch's optimizer is **neither the same code nor an older version of it** — it is a separate, more recent rewrite.

The branch exists as a checked-out worktree at `C:/Users/Garrett/Sports-dfs-optimizer-edge` (git top-level confirmed to that path, so it is safely isolated from `C:\Users\Garrett\Sports`). It tracks `remotes/origin/claude/dfs-optimizer-edge`.

**Three distinct optimizer versions across the two branches:**

| Version | Where | Approach | Status |
|---|---|---|---|
| **Heuristic** (random multi-start + steepest-ascent hill-climb + swap-in stack fixup) | `claude/dfs-optimizer-edge` @ `8874f174` era, original `dfs-optimizer.ts` | Approximate; randomized; "fast enough to run in the browser" | **NOT in current branch** |
| **Exact DP v1** (0/1-knapsack DP, branch-and-bound team pruning, deterministic) | Current branch HEAD `c179a781` `apps/web/lib/fantasy/dfs-optimizer.ts` | Provably optimal; deterministic (no `Math.random`) | **LIVE in current branch** |
| **Exact DP v2** (k-best, diversePool, lateSwap/Swaptimize, minStack, FLEX symmetry breaking, slot pinning, admissible per-position bounds, greedy warm-start) | `claude/dfs-optimizer-edge` @ `8874f174` `apps/web/lib/fantasy/dfs-exact.ts` + `dfs-exact.test.ts` (7.4 KB) | Provably-optimal exact solver, stronger than v1 | **NEVER MERGED into current branch** |

**Concrete evidence:**
- `git log --oneline` on the current branch for `apps/web/lib/fantasy/dfs-optimizer.ts` shows the most recent change is `c179a781` ("feat: Glass Ledger + Edge Engine"). The two branches share the parent `1958278a` ("feat(fantasy): DFS slate provider seam").
- `git diff` between the two branches on `dfs-optimizer.ts` confirms they DIFFER: the edge version contains `buildRandom` (uses `Math.random`), `hillClimb`, `enforceStack`, and an `optimizeOne(..., restarts=60, ...)` signature; the current version contains `solveExact`, `stackBounds`, `buildSlotSpace`, and `optimizeOne(opts, decay, slate)`. They are fundamentally different algorithms, not versioned duplicates.
- On the edge branch, commit `8874f174` ("feat(fantasy): max-out DFS engines — k-best, diverse pool, late-swap, minStack, correlation v2") introduces `apps/web/lib/fantasy/dfs-exact.ts` (387 lines) and `apps/web/lib/fantasy/dfs-exact.test.ts` (7477 bytes) — **these files do NOT exist in the current branch** (`ls` returns "No such file or directory" for `dfs-exact.ts`, `dfs-exact.test.ts`, `dfs-correlation.ts`, `dfs-correlation.test.ts`, `dfs-optimizer-edge.ts`, `dfs-optimizer-edge.test.ts`).
- The edge-branch `8874f174` commit message states it is "push/PR founder-gated" and "still gated to the illustrative slate" — i.e., the advanced solver was deliberately held back pending an owner decision.

**Interpretation / recommendation:** The owner is aware of the `claude/dfs-optimizer-edge` branch and its advanced exact solver, and has not merged it. The current branch does NOT contain the edge-branch optimizer; it contains its own exact-DP rewrite (`c179a781`). There is **no regression** — the current branch's solver is itself exact and provably optimal (see Item 2). The gap is that the *even more advanced* v2 features (k-best distinct lineups, late-swap re-optimization of unplayed slots, diverse exposure pools replacing random restarts, FLEX symmetry breaking) live only on the unmerged edge branch. This is a real **owner-gated** decision item (merge vs. keep divergent), surfaced here as required by the task. **No code action taken** — this is a READ-ONLY audit and merging is explicitly owner-gated.

---

## Item 1 — Data inputs consumed

**VERDICT: FAIRLY CLEAR (illustrative by design; live path is gated, not wired)**

The optimizer consumes a slate of `DfsPlayer` records (`salary`, `proj`, `floor`, `ceiling`, `own`) plus roster rules (`DFS_SLOTS`, `SALARY_CAP`) from `apps/web/lib/fantasy/dfs-slate.ts`.

**Two input paths:**
1. **Default / illustrative** — `DFS_SLATE` in `dfs-slate.ts` is a hard-coded, clearly-labelled fictional slate (comment: "Fictional players, real team codes, illustrative numbers"). `activeDfsSlate()` in `apps/web/lib/integrations/dfs.ts` returns `DFS_SLATE` unless a live provider is both registered AND env-configured.
2. **Live (gated)** — `activeDfsSlate(env)` calls `resolveDfsSlateProvider(env)`, which returns the live provider only when `isConfigured("dfs", env)` is true (requires `DFS_PROVIDER` env var set — `apps/web/lib/integrations/providers.ts` line 36: `"dfs"`, envVar `DFS_PROVIDER`, note "A licensed DFS slate feed (contracted provider, never the forbidden DK hidden endpoint)"). Otherwise it returns `ILLUSTRATIVE_DFS`.
3. **User CSV import** — `apps/web/components/fantasy/dfs-optimizer.tsx` imports `DkImportPanel` and threads an imported slate through `onImport(players)` → `setSlate(players)` → `run(players)`. So a user can drop a real DraftKings CSV and the optimizer runs **exact** on those salaries/projections immediately.

**Key correctness property:** the live path requires BOTH a registered provider AND an env flag (same founder-gate pattern as projections/pick'em). There is no path where a half-configured feed silently produces fabricated numbers — it either degrades to the labelled illustrative slate or the user's imported CSV. No silent fabrication risk found.

**Caveat (not a defect, a gate):** the live DFS feed is not wired in this branch (no `DFS_PROVIDER` implementation registered). The optimizer math is sound against any well-formed slate; correctness of *real-world outputs* depends on the licensed feed the founder injects. This matches `competitive-baseline.ts` line 73: "Optimizer math and DraftKings CSV import exist; projections/ownership are modeled until licensed feeds are wired."

**Evidence:** `apps/web/lib/integrations/dfs.ts` (lines 35-48: `resolveDfsSlateProvider`/`activeDfsSlate`); `apps/web/lib/integrations/providers.ts` (line 36: `envVar: "DFS_PROVIDER"`); `apps/web/components/fantasy/dfs-optimizer.tsx` (lines 15, 45-47: `DkImportPanel`/`onImport`).

---

## Item 2 — Test coverage quality (assert real constraint logic, not "runs without throwing")

**VERDICT: STRONG on the solver engine; WEAK on the UI components**

**Solver engine — `apps/web/lib/fantasy/dfs-optimizer.test.ts` (310 lines, 14 tests):**

This is a **high-quality, genuinely constraining** test suite — it does NOT just check "runs without throwing":

- **Brute-force oracle** (`bruteForceBest`, lines 59-71): exhaustively enumerates every legal 9-player lineup (`combinations(pool, DFS_SLOTS.length)` = 14-choose-9 = 2,002 combos on `POOL_CLEAR`) and computes the true optimum independently (re-implements `objValRef`, never imports the module under test's `objVal`). `assertExactOptimum` (lines 74-92) asserts **value equality** (`toBeCloseTo(bfValue, 6)`) AND **set membership** (`bfKeys` must `Contain` the DP's lineup key) — i.e., it proves the DP is *optimal*, not just feasible.
- **Constraint logic assertions, not smoke checks:**
  - Stack validity: `stackSatisfied` + `assertExactOptimum(..., requireStack=true)` (lines 167-184) — including a test where the highest-bound team is cap-infeasible (`qz`/`wz` fixture), proving the branch-and-bound pruning does not skip the true optimum.
  - FLEX cross-position competition (lines 136-148): asserts the stronger TE wins FLEX over a weaker RB — real roster constraint logic.
  - Slot-feasibility: `slotsValid` (lines 12-14) checks each position/FLEX against `DFS_SLOTS`.
  - Infeasibility handling: asserts `null` when no TE exists (lines 150-154) and when even the cheapest lineup exceeds cap (lines 156-159).
- **Determinism (not incidental):** `expect(src).not.toMatch(/Math\.random/)` (lines 255-258) — statically asserts no RNG in the solver. Plus `is deterministic — identical output across repeated runs` tests at both small and 600-player scale (lines 161-165, 304-309).
- **Scale/CI safety:** a 600-player exact solve asserted to complete in `<10s` (line 301) with the complexity budget documented in the module header (~5.8×10^7 DP cells). The test itself generates a deterministic pseudo-random pool without `Math.random`.
- **Exposure accounting:** `reports per-player usage as an exact fraction of lineups generated` (lines 246-253) — arithmetic verification, not "looks right."
- **Behavioral assertions:** cash vs GPP tradeoffs (lines 211-216), lock/exclude respect (lines 198-203), QB-stack enforcement (lines 205-209).

**UI components — NO tests exist:**
- `apps/web/components/fantasy/dfs-optimizer.tsx`: `ls` confirms no test file. `grep` found zero references to `dfs-optimizer.test`, `lineup-optimizer.test`, `optimizer-workspace.test`, or `lineup.test`. The component contains real logic — the `DkImportPanel` CSV parser, the `Math.min(100, ...)` salary-cap meter (which guards `left < 0` to paint alert color), the exposure `pct` rendering, and the `generateLineups` invocation from `run()`. None of this is covered by an automated test.
- `apps/web/components/fantasy/optimizer-workspace.tsx`: thin tabbed shell (lines 33-81) but still asserts `canUseFantasyFull = false` defaults fail-closed (line 31 comment + line 36 default). Uncovered by tests.

**Verdict nuance:** The *optimizer math* (the highest-risk, hardest-to-reason-about surface) is very well tested with a real correctness oracle. The *UI wiring* (CSV import parsing, cap-meter math, exposure rendering, fail-closed defaults) is not. The gap is in component-level coverage, not engine coverage.

**Evidence:** `apps/web/lib/fantasy/dfs-optimizer.test.ts` (full file, 310 lines); filesystem search returning no test files for the three `.tsx` components.

---

## Item 4 — Silent degradation (plausible-but-suboptimal or empty output without explanation)

**VERDICT: PARTIAL — one real silent-degradation path, one acceptable null return**

**Path A — `generateLineups` early-exit (real, silent):**

`apps/web/lib/fantasy/dfs-optimizer.ts` line 430 (`if (!lu) break; // exhausted: no more unique, feasible lineups under current pressure`). When the requested `count` of unique lineups cannot be produced (locks/excludes/overexposure conspire to exhaust the feasible set), generation **stops early and returns fewer lineups than requested**, with no error:

```ts
// line 430
if (!lu) break; // exhausted: no more unique, feasible lineups under current pressure
```

**How the UI handles it:** `apps/web/components/fantasy/dfs-optimizer.tsx` line 156:
```tsx
{!result?.lineups.length && <div className="surface-card p-6 text-sm text-ion-1">No lineup fits the constraints. Loosen your locks or excludes.</div>}
```
This message **only** shows when `lineups` is empty (length 0). When generation returns, say, 2 of a requested 5 (the partial case), the UI silently renders just those 2 — it does not show "3 more could not be generated" or explain *why*. A user requesting 5 lineups and getting 2 has no signal that the optimizer hit a feasibility wall versus a UI bug.

**Path B — `optimizeOne` returns `null` (acceptable):**

`optimizeOne` returns `null` when no legal lineup exists for the pool/locks/excludes (lines 320, 329, 356, 224). This is the documented, intentional null contract — `assertExactOptimum`'s test (lines 150-159) proves null is returned for genuinely infeasible pools (no TE at all; cap exceeded). Returning null for "no solution exists" is correct behavior, not silent degradation.

**Verdict:** Path B is not a defect. Path A is a genuine silent-degradation finding: a partial lineup set is returned without explanation, and the UI's "No lineup fits" message only fires for the all-zero case, so a *partial* result is indistinguishable from success. A narrow fix would be to surface a "X more lineups could not be generated" notice when `lineups.length < count`. **READ-ONLY audit — fix not applied; recorded as a finding.**

**Evidence:** `apps/web/lib/fantasy/dfs-optimizer.ts` line 430 (break condition) and `generateLineups` return (line 445); `apps/web/components/fantasy/dfs-optimizer.tsx` line 156 (UI message only on empty).

---

## Summary table

| Item | Verdict | Evidence |
|---|---|---|
| 1. Data inputs | Fairly clear — illustrative-by-default, live gated via `DFS_PROVIDER`, user CSV import available | `dfs.ts` lines 35-48; `providers.ts` line 36; `dfs-optimizer.tsx` lines 15, 45-47 |
| 2. Test quality | Strong on solver (brute-force oracle, determinism, real constraints); no tests on UI components | `dfs-optimizer.test.ts` lines 59-92, 255-258, 292-301; filesystem search for `*.test.tsx` |
| 3. Edge branch optimizer | CONFIRMED — advanced exact solver (k-best, lateSwap, diversePool) on unmerged branch `claude/dfs-optimizer-edge`; current branch has its own exact DP, NOT older code; merge is owner-gated | `git diff` between branches; `git log` on `dfs-optimizer.ts`; `8874f174` `dfs-exact.ts`/`dfs-exact.test.ts` present on edge branch only |
| 4. Silent degradation | One real path: `generateLineups` returns partial results without notice (UI only explains the all-empty case); `optimizeOne` returning null is acceptable | `dfs-optimizer.ts` line 430; `dfs-optimizer.tsx` line 156 |
