> **STATUS CORRECTION — 2026-10-28.** "HEAD: c75d2707c" and "Remote == c75d2707c" are superseded.
> HEAD = `a37bdae82cb57b68a9b65a82327905ff84ac4ab1` = `origin/engine/public-baseline-2026-10-24`,
> ahead/behind `0 0`. The sinkhorn wiring this file called "uncommitted" is now committed and pushed
> in `a37bdae82` (sinkhorn.ts, sinkhorn.test.ts, sinkhorn-targets.ts, locked-projection.ts,
> weekly-cadence-orchestrator.ts, verify_engine.py). Verified: 9/9 `locked-projection.test.ts` and
> 18/18 with `belichick-ablation.test.ts`; `src/coach-sim` 7 files / 74 tests per the commit message.

# 2026-10-27 — OCR + Sinkhorn final status

Repo: C:/Users/Garrett/Sports
Branch: engine/public-baseline-2026-10-24
HEAD: c75d2707cbff4aac9ef8aea010e3565c27f649c1 (matches brief)
Remote: refs/heads/engine/public-baseline-2026-10-24 == c75d2707c (local and remote synced; the earlier "push blocked / needs --unshallow" note is stale)

## 1. calibration-map.ts:62 — VERIFIED FIXED IN CODE

File: packages/prediction-engine/src/public-baseline/calibration-map.ts

Current state (read in full, 221 lines):
- Line 51-66: CALIBRATION_KNOTS ends with [0.95, 0.912] and the upper-tail knot [1.0, 0.9655], with a comment documenting that 0.95 is the last measured knot and the 1.0 knot is linear extrapolation past observed support.
- Line 69: `const p = Math.min(1.0, Math.max(0.05, rawProb))` — input clamped to [0.05, 1.0], not [0.95].
- Lines 70-77: piecewise-linear interpolation over the knot domain; fallback returns p.

So the reported defect ("clamps to [0.95], returns 0.95 uncorrected above") no longer describes the code. The knot domain reaches 1.0 and the clamp reaches 1.0. Values above 1.0 clamp to the 1.0 knot and calibrate to 0.9655 instead of collapsing to 0.95.

Tests: `npx vitest run src/public-baseline/calibration-map.test.ts` → 6/6 passed (45 ms). File is not in the dirty set; the fix is already committed.

Residual note: the [1.0, 0.9655] knot is documented as extrapolation, not a measured knot. It should be revisited once graded raw probabilities above 0.95 exist. That is a data-availability gap, not a code defect.

## 2. QB_QUESTIONABLE in TypeScript — VERIFIED

`grep -rn "QB_QUESTIONABLE" packages/prediction-engine/src --include=*.ts` returns hits only in:
- src/gse-pre-seal/injury-operator.ts: comment block (lines 31, 48), const QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947 (line 52), EPA_DROPOFF table row QB_QUESTIONABLE: 0.8106 (line 56), export (line 265).
- src/gse-pre-seal/__tests__/injury-operator.test.ts: assertions on the frozen constant and the derived retention.

`grep -n "EPA_DROPOFF\|epaDropoff\|QB_QUESTIONABLE" src/coach-sim/locked-projection.ts` → no matches. The overlay path does not read the EPA table at all. The Sinkhorn/coach-sim table in src/coach-sim/sinkhorn-targets.ts (line 183) is a 6-role retention table: QB1, RB1, WR1, WR2, TE1, OL. It has no QB_QUESTIONABLE row.

Conclusion: the two EPA tables are separate by design (coach-sim 6-role vs gse-pre-seal 7-role), and nothing cross-checks them. Each is sealed and tested against its own canonical hash. The residual risk is name collision, not a functional cross-check failure: two different tables both called EPA_DROPOFF, each exporting an EPA_DROPOFF_SHA256 constant with a different digest. Nothing in the code compares the two digests. If a future caller assumes one table, the other path silently diverges.

## 3. Sinkhorn wiring into the injury overlay — UNCOMMITTED EDITS PRESENT

Files modified in the working tree (not committed, per instruction to leave edits uncommitted):
- packages/prediction-engine/src/coach-sim/sinkhorn-targets.ts — added SinkhornScaling duals to the solver return, added sinkhornTargetAllocation bridge (source marginal = survivors' raw base shares, demand marginal = coach cost model), updated the module header to state the wiring.
- packages/prediction-engine/src/coach-sim/locked-projection.ts — applyInjuryOverlay now calls sinkhornTargetAllocation(activeHome/activeAway) instead of allocateTargets; docblock updated. Seal checks 0/1/2 untouched.

Verification: targeted run of sinkhorn-targets.test.ts + locked-projection.test.ts → 31/31 passed (earlier this session). Full-suite vitest run was started as a background process; its completion notification had not arrived at the time of writing. Treat full-suite status as pending, not as passed.

Sealed invariants confirmed untouched: assertTauSealed, cadence Merkle recomputation (SEAL CHECK 0), v1.0-only overlay guard, coachMindsetHash recomputation. PROB_PER_POINT remains a single binding at 0.033 in constants.ts.

## 4. "Scheme layer" report from the other agent — NOT VERIFIABLE IN THIS CHECKOUT

Claims checked:
- Commit cffa75a: `git cat-file -t cffa75a` → "Not a valid object name". Not in this repo's history or branches.
- Identifiers scheme.fired, scheme.yardsPerPlay, run_committed, play_action_opportunity, SCHEME_YARDS_PER_EPA, JOINED_PLAYS, SchemeFlagId, centerEpa: no matches in packages/prediction-engine/src or anywhere in the repo's .ts files. Also no matches in C:/Users/Garrett/Downloads .ts/.js/.py files.
- Related but different code does exist: packages/prediction-engine/src/film-features/team-film-features.ts (yardsPerPlayByFormation), apps/web/lib/intelligence/rush-schemes.ts, apps/web/lib/fantasy/scheme.ts. None of these implement the described FTN contrast draw.

Verdict: the pasted scheme-layer module is not present in this checkout. It may live on another branch/fork or exist only as a design document. Its architectural claims (engine layer, not overlay; does not touch Tuesday hash; centered EPA contrast; box tags not product terms) cannot be verified against this repo and should not be cited as verified fact until the file is located and read.

## 5. "31 failed files" OCR re-run — BLOCKED ON MISSING INPUT

No artifact listing 31 failed OCR files was found:
- No file matching *ocr*, *review*fail*, *failed*files* in the repo or in C:/Users/Garrett/Downloads.
- docs/engine/research/2026-10-13/ocr_progress.txt does not exist.
- The "31" figure appears in the GSE Coach Simulation & Audits.docx but not as an enumerated list.

Without the file list, a targeted re-run is not possible. This is a missing-input blocker, not a code defect. Next action requires the list itself or the directory it was generated from.

## 6. Working tree state

45 modified files total. Pre-existing dirt unrelated to this session's work: artifacts/slate/*.eml, brain/feeds/*.jsonl, data/gse-dataset/current/injuries_2026.csv, package-lock.json, and ~20 packages/data-ingestion/src/*.ts files. The only edits from this session are the two coach-sim files above. Nothing was committed. Nothing was pushed.

## Open items

1. Full-suite vitest result (background process) — pending notification.
2. The two EPA tables named EPA_DROPOFF remain uncross-checked. Decide whether to rename one or add a cross-check test.
3. The scheme-layer module: locate the actual file/branch or mark the report unverified.
4. The 31-file OCR list: obtain it before attempting the re-run.
