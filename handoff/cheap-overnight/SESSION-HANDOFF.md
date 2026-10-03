# Session Handoff — Covariate Bus + SEP Bind + YAC Bind + CPOE Comp Bind

## Identity
- **Session:** `stealth/ox-alpha` — Galaxy Sports Edge (independent `p` with process, then `e = p − q`).
- **Stance:** The site is a window. We do NOT build chrome. No Odds market ingestion. `priced: false` throughout.
- **Serving SHA:** `c2cfc153` (origin/main, post-#549 merge). #525 is on ancestor `544d0148` — slug/cap NOT redone.

## Worktrees
|| Purpose | Path | Branch |
||---|---|---|
|| PR 1 — covariate bus | `C:\Users\Garrett\Sports-bus` | `hermes/covariate-bus` |
|| PR 2 — sep bind | `C:\Users\Garrett\Sports-bus-sep` | `hermes/ngs-sep-adot-catch` |
|| PR 3 — yac bind | `C:\Users\Garrett\Sports-bus-yac` | `hermes/covariate-yac-bind` |
|| PR 4 — cpoe comp bind | `C:\Users\Garrett\Sports-cpoe-comp` | `hermes/covariate-cpoe-comp` |

## What shipped this turn

### PR 1 — Covariate Bus (IP): #547 ✅ MERGED
- **File:** `packages/prediction-engine/src/edge-lab/covariate-bus.ts`
- **Tests:** `__tests__/covariate-bus.test.ts` — 16/16 green
- **Commit:** `5a1790dc` on `origin/hermes/covariate-bus`

### PR 2 — SEP Bind: #548 ✅ MERGED
- **File:** `packages/prediction-engine/src/edge-lab/props-hb-adot-sep-bind.ts`
- **Tests:** `__tests__/props-hb-adot-sep-bind.test.ts` — 6/6 green

### PR 3 — YAC Bind: #549 ✅ MERGED
- **File:** `packages/prediction-engine/src/edge-lab/props-hb-air-yac-bind.ts`
- **Tests:** `__tests__/props-hb-air-yac-bind.test.ts` — 7/7 green

### PR 4 — CPOE Completion Bind: #553 ✅ OPEN (CI green, Qodo fixes pushed)
|- **File:** `packages/prediction-engine/src/edge-lab/props-hb-cpoe-comp-bind.ts`
|- **Tests:** `__tests__/props-hb-cpoe-comp-bind.test.ts` — 11/11 green
|- **Commit:** `e22eb2b7` on `origin/hermes/covariate-cpoe-comp` (pushed)
|- **Rebased onto origin/main** (8b898981, post-#554 fleet foundation). Previously based on
|  c2cfc153 (pre-#554), which caused #554 kernel files (conformance.ts, contract.ts, numeric.ts,
|  GRIND_WORK_ORDER.md, etc.) to appear as DELETIONS in the PR diff.
|  `git rebase --onto origin/main c2cfc153` — 6 commits applied cleanly.
|  Result: pure 6-file diff (cpoe-comp bind+test, covariate-bus.ts +2, index.ts +16, docs).
|  Kernel files preserved. No spurious deletions. Pushed with `(--force-with-lease)`.

Contract:
|- `bindCpoeCompSamples(rows, requests)` pulls `avgTimeToThrow` + `avgIntendedAirYards`
|  from the leak-safe covariate bus (week t → t+1, week=0 excluded, fail-closed) and
|  combines them with GSE-CPOE (our own PBP-fit metric, provenance-tagged
|  `expected_metric_v1` as a CovariateCell) into `BoundCompSample`.
|- Fail-closed: bus null on either field → sample DROPPED, never invented.
|  Non-finite GSE-CPOE → dropped. `gseCpoeAsOfWeek >= kickoffWeek` or week=0
|  → dropped as `cpoe_as_of_boundary` (season-level CPOE refused).
|- Honest header: weekly NGS means emitted with `{ value, grain: "week_t_for_tplus1",
|  provenance: "weekly_ngs_mean" }`. Vendor `cpoe` / `expectedCompletionPct` are y-axis
|  only and never read. GSE-CPOE is a `CovariateCell`, never a bare float.
|- Barrel exports in `index.ts`. `priced: false`. Pure, no I/O, no Prisma.

## Verification
|- `npx vitest run` props-hb-cpoe-comp-bind.test.ts: 11/11 pass
|- `npx vitest run` edge-lab __tests__/: 660/660 pass (full suite, 64 files; bus 16 + sep 6 + yac 7 + cpoe 11)
|- CI: 20/20 GitHub checks PASS, 0 failures (Test+type-check+lint+Prisma all green)
|- PR #553 mergeable: was UNSTABLE (diverged from main via kernel file deletions), now CLEAN/MERGEABLE after rebase
|- `tsc --noEmit` on `packages/prediction-engine`: clean

## Next priority — H0 #4 TPRR
|- The 4 flagship covariate binds (#547 bus, #548 sep, #549 yac, #553 cpoe-comp) are
|  complete. Remaining H0 flagship slices (#555 validation harness, #557 kneel/garbage,
|  #556 TPRR) are on `grok/**` branches — do NOT touch (another Grok session is live).
|- H0 #4 TPRR: spawn `hermes/h0-tprr` from origin/main once grok/h0-est-routes (#556)
|  lands or confirms it is not proceeding. If #556 is green and waiting, do NOT start a
|  second TPRR bind — wait for the merge or handoff confirmation.
|- Three fails on any file → BLOCKED that file, skip to next bind. Never idle.

## Constraints (do not violate)
- Do NOT edit `C:\Users\Garrett\Sports` (main worktree) — work only in worktrees.
- Do NOT touch schema, `.github`, Odds, scrape.
- Gap map: `C:\Users\Garrett\Sports-p0\docs\data\PROP_COVARIATE_GAP.md` (read-only).
- #525 is on serving SHA `544d0148` — slug/cap not redone.
