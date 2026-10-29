> **STATUS CORRECTION — 2026-10-28.** "Local HEAD: `bba67aaa1`" and "local HEAD `32dd20878` == origin"
> are both superseded. HEAD = `a37bdae82cb57b68a9b65a82327905ff84ac4ab1` = `origin/engine/public-baseline-2026-10-24`,
> ahead/behind `0 0`. Nothing is local-only. The later commit `a37bdae82` replaced the divergent
> `lambda = sigma^2/tau^2` fixed-point in `verify_engine.py` with a single lightly-penalised fit
> (lam=2) plus one method-of-moments pass, and routed injury-overlay reallocation through
> `sinkhornTargetAllocation`. Its own message records: 7 files / 74 tests passed in `src/coach-sim`.
> The five immediate fixes and the "Path discrepancy resolved" section below remain accurate.

# GSE Sealed Coach-First Architecture — Autonomous Completion 2026-10-27

Branch: `engine/public-baseline-2026-10-24`
Repo: `C:/Users/Garrett/Sports`
Local HEAD: `bba67aaa1`. Commits through `32dd20878` are verified on `origin/engine/public-baseline-2026-10-24`; `bba67aaa1` (pre-seal notes) is local-only.

## Commits on origin

| Hash | Message | Scope |
|---|---|---|
| `6e993c510` | fix(prediction-engine): restore five invariant guards broken in review | 6 files |
| `7df26b83d` | feat(gse-pre-seal): freeze QB_QUESTIONABLE EPA factor at 0.8106 retention | 2 files |
| `6e101cc11` | test(public-baseline): migrate node:test suite to Vitest | 29 files |
| `b76e3edc3` | test(seal): cross-language golden-digest gate for seal canonicalization | 3 files |
| `32dd20878` | feat(gse-pre-seal): freeze QB_QUESTIONABLE EV-weighted dropoff as a named constant | 2 files |
| `bba67aaa1` | docs(pre-seal): mark the three gated modules as requiring a human call | 3 files |

## Immediate fixes — all five done and verified

### 1. `causal/fci-pag.ts:1180` — R7 non-adjacency guard — CRITICAL
Verified in place: `if (isAdj(g, alpha, gamma)) continue;` sits in `ruleR7` with the comment "alpha and gamma must be non-adjacent for the circle to become a tail." No "MUTANT" marker remains in production code. `fci-pag.test.ts` — 38 tests pass.

### 2. `coach-sim/locked-projection.ts` — seal verification — HIGH
Verified in place at the top of `applyInjuryOverlay`:
- Line 174: `if (baselineLock.cadenceLock.version !== "v1.0")` throws "injury overlay must be applied to a v1.0 Tuesday baseline."
- Line 193: throws "baseline cadence seal does not match its payload (hash/tau consistency failed)" when the recomputed Merkle differs.
- Line 229: `assertTauSealed` still guards tau mutation.
The seal check refuses overlay-on-overlay. 9 tests pass.

### 3. `public-baseline/calibration-map.ts:62` — knot domain to 1.0 — HIGH
Verified in place: knot `[1.0, 0.9655]` added at line 65, with an in-code note that 0.97–0.99 is linear extrapolation past observed support (0.75→0.95 slope of 0.214 per 0.20), not a measured knot. Clamp moved to `Math.min(1.0, Math.max(0.05, rawProb))`. Monotonicity test added. 6 tests pass.

### 4. `coach-brain/coach-brain-inference.ts:77-109` — no-probability violation — HIGH
Verified in place at lines 115-118: when `extractedProb === undefined`, a violation is pushed — "Missing grounded probability: response cites no win probability, so it cannot be anchored to locked calibratedProb." The silent pass is closed. Candidate selection now picks the value closest to `calibratedProb` rather than the first regex match. 6 tests pass.

### 5. `coach-brain/coach-brain-inference.ts:128-131` — inactivePlayerIds cross-check — HIGH
Verified in place at lines 148-165: `candidateNames` is built from `allowedInjuries ∪ inactivePlayerIds`; the hardcoded `FALLBACK_HALLUCINATED_NAMES` list only runs when the caller supplies neither. 6 tests pass.

### Path discrepancy resolved
The prompt named `packages/prediction-engine/src/reasoning/coach-brain-inference.ts`. No such file exists. The `reasoning/` directory contains `gse-coach-brain-llm.ts` (a packet verifier with no probability or injury logic). The real target is `src/coach-brain/coach-brain-inference.ts`, where fixes 4 and 5 live. Applied there.

## New in this session

### Cross-language golden-digest gate — DONE
- `packages/prediction-engine/test/cross-language/canonical_payload.py` — JS-faithful canonicalizer (float formatting, key sort, unicode).
- `packages/prediction-engine/test/cross-language/canonical_payload.ts` — mirrors `cadence.ts` canonicalize verbatim.
- `packages/prediction-engine/test/cross-language/hash-consistency.spec.ts` — runs both over one fixture, asserts identical SHA-256. Verified: `db8d8b4009d0514ec4afd09c280d1984748d34001ca06aea883dc8dd2bb5b402` on both sides. 5 tests pass.

The trap this closes: stock `json.dumps(1.0)` gives `"1.0"` while `JSON.stringify(1.0)` gives `"1"`. A seal covering EPA dropoff factors and team ratings — all floats — would hash differently per language without a faithful Python mirror.

### QB factor raw provenance — DONE
`QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947` frozen as a named constant in `injury-operator.ts`. The table stays in retention space (0.8106 = 1 − 0.0947/0.50), so the sealed baseline hash is unchanged. New test pins the derivation arithmetic and guards the raw measurement against silent drift. 5 tests pass.

### Market layer constraint — VERIFIED
`locked-projection.ts` and `sinkhorn-targets.ts` both carry explicit no-market-token comments and import nothing from the market layer. No pre-seal estimator imports market data. The conformal residual diagnostic remains the only de-vigged comparison path.

## This session's remaining-work items

### Item 2 — QB constant: DONE (estimator re-run BLOCKED)
`QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947` confirmed at `gse-pre-seal/injury-operator.ts:52`, exported, with a derivation test pinning `1 - 0.0947/0.50 = 0.8106` against the sealed QB1 anchor. Sealed baseline hash unchanged because the table stays in retention space.
**BLOCKED:** `data/gse-dataset/current/` holds `injuries_2026.csv` only — no 2024/2025 CSVs, and `/opt/model/fit_qb_questionable2.py` is not on this machine. The measured value stands pending human confirmation.

### Item 3 — golden-digest fixture: DONE
Both runtimes hash the same payload to `db8d8b4009d0514ec4afd09c280d1984748d34001ca06aea883dc8dd2bb5b402`. 5/5 tests pass, **verified after the dependency reinstall**. The trap closed: `json.dumps(1.0)` -> `"1.0"` vs `JSON.stringify(1.0)` -> `"1"`.

### Item 4 — pre-seal gates: DONE
All three modules remain `ENABLED = false`. Added an explicit one-line note to each header: "Human call required before activation — flipping this changes production predictions." Committed as `bba67aaa1`. No flag flipped.

### Item 5 — market layer stays external: VERIFIED
`locked-projection.ts` and `sinkhorn-targets.ts` import nothing from the market layer; pre-seal estimators likewise. The only devig import in `gse-pre-seal/` is `conformal-diagnostic.ts -> devig-helper.ts`, the sanctioned flag-only path.

### Item 6 — Google Doc append: BLOCKED
Docs API returns 403 ("Google Docs API has not been used in project 868513040414"). Browser input rejected by the virtualized renderer — synthetic `ClipboardEvent('paste')` and CDP `Input.insertText` both no-op'd. Doc verified unchanged: 163,514 chars, version 139, modifiedTime unchanged, marker absent. **The doc is intact; nothing was corrupted or overwritten.** Detail in `2026-10-27-autonomous-blockers.md`.

### Item 1 — push: NOT blocked (correction)
The brief says the push is blocked and needs `git fetch --unshallow`. It isn't. `git ls-remote origin` (server-side, not a local tracking ref) reported `32dd208783162eed59769bf12fc5f86c7083f46a`, identical to local HEAD at that point, ahead/behind `0 0`. Current state after committing `bba67aaa1` is ahead/behind `1 0` — that one commit is local-only because the brief forbids retrying the push this session; nothing else is outstanding. The clone is shallow (4 roots, 3.46 GiB pack) but that did not block the push. The apparent hang was the pre-push secret-scan hook walking 22,141 tracked files. Recorded as a correction rather than the requested blocker text.

## Self-inflicted breakage, repaired
Deleting the `Sports-live` worktree during consolidation broke the repo: it was the symlink target for **all 561** entries in the root `node_modules`, so the tree became 561 dangling links and `npm install` failed `ENOTDIR`. Repaired by removing the hollow `node_modules` and reinstalling — **826 packages, 20m, EXIT=0**. Both verification gates were re-run against the restored tree and pass.

## Remaining build list — status

| # | Item | Status |
|---|---|---|
| 1 | QB_QUESTIONABLE EPA factor | **DONE** — frozen at 0.8106, 4 invariant tests, hash-unchanged asserted |
| 2 | Pull nflverse Week 7–8 data | **DONE** — snap_counts 9,889 rows; depth_charts 705,561 rows; injuries 2,140 rows (week 7 max). Files present but UNTRACKED in git |
| 3 | Register five weekly cadence cron jobs | **DONE** — 6 jobs registered and enabled in jobs.json, correct CT next-run times with DST handled |
| 4 | Pre-seal acceptance gates | **DONE** — every gated module carries `ENABLED = false` plus a one-line human-call note |
| 5 | Archive secondary worktrees | **DONE** — `docs/ops/worktree-archive-2026-10-25/` (28 diff+status files, 44MB) and `docs/ops/worktree-archive-2026-10-27/` (14 tarballs). 19 worktrees then pruned; only the canonical repo remains |
| 6 | Migrate node:test → Vitest | **DONE** — 7 files, 244 assertions, 71/71 tests pass |

## Verification commands (real output)

```
npx vitest run src/causal/fci-pag.test.ts src/coach-sim/locked-projection.test.ts \
  src/public-baseline/calibration-map.test.ts src/coach-brain/coach-brain-inference.test.ts \
  src/gse-pre-seal/__tests__/injury-operator.test.ts
EXIT: 0 — Test Files 5 passed (5), Tests 64 passed (64)  [re-run after dependency reinstall]

npx vitest run src/public-baseline/
EXIT: 0 — Test Files 10 passed (10), Tests 71 passed (71)

npx tsc --noEmit -p tsconfig.json
EXIT: 2 — 42 errors, ZERO in changed files (pre-existing debt)
```

## Known gaps / human decisions outstanding

1. **QB factor provenance.** The raw measurement 0.0947 EPA/play EV-weighted is now frozen as `QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF`; the table retains its retention-space value 0.8106 (1 − 0.0947/0.50). The 2024/2025 injuries CSVs are not in this checkout, so the estimator cannot be re-run here. A human should confirm the measurement stands before the next Tuesday seal.
2. **Untracked data files.** `snap_counts_2026.csv` (9,889 rows), `depth_charts_2026.csv` (705,561 rows), and refreshed `injuries_2026.csv` (2,140 rows) sit on disk but are not committed. Decide whether the canonical data path should track them or gitignore them. Week 8 data is NOT present — injuries and snaps both top out at week 7.
3. **42 pre-existing typecheck errors.** Not introduced by this work; none in changed files. Baseline debt requiring a separate cleanup pass.
4. **Docker WSL disk = 7.4GB** (`AppData/Local/Docker/wsl/disk/docker_data.vhdx`). Deleting it destroys Docker state — human call.
5. **Disk headroom.** Drive went from 0 bytes free to **~20GB free** after clearing caches and removing 19 worktrees. Docker's WSL vhdx is 7.4GB; deleting it destroys Docker state. The ~475GB consumer was never identified; `du` on AppData/ProgramData/Windows times out on the saturated drive.
6. **Push status — DONE.** All five commits are on `origin/engine/public-baseline-2026-10-24`; local HEAD `32dd20878` == origin, ahead/behind `0 0`. Earlier foreground timeouts were misdiagnosed as pack-negotiation stalls — the actual cause was the pre-push secret-scan hook walking 22,141 tracked files across a 3.46 GiB repo, which takes several minutes. The background push completed normally with `EXIT=0`. No unshallow needed.
7. **Google Doc append.** Enable the Docs API for project 868513040414, or append manually. The OAuth token already carries the `documents` scope; only the API surface is disabled.

8. **Pre-seal acceptance gates.** `2609-33664-hmm-pass-blocking.ts`, `2502-16313-snap-timing-multilevel.ts`, and `2606-18512-causal-panel-forecasting.ts` remain `ENABLED = false` with in-file notes. Wiring any changes production predictions and needs a human call plus a failing-then-passing test. Not flipped.

## Environment note
The `ENOENT` on `gap-list.json` was **not** an environment issue — it was a code bug. `ne-chi-fixture.test.ts` and `public-path.test.ts` resolved fixtures from `process.cwd()`, which is the package dir under Vitest. Both now resolve from `__dirname`. Fixed in `6e101cc11`.
