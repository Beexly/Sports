# Takeover build loop — CI cluster progress record (2026-11-05)

Compares baseline main run `41954063959` (`d9da718d2`) against each cluster merge.
Baseline test job: 32 files / 42 tests failed. File-level failing sets were
extracted from the raw CI logs (` FAIL ` per-file result lines) and diffed.

## Merged PRs

| PR | Cluster | Merge commit | Files fixed (vs baseline) | New failures |
|----|---------|--------------|---------------------------|--------------|
| #1237 | ci/fantasy-cluster-2026-11-04 | 5901ff6d1 | 5 | 0 |
| #1236 | ci/public-cluster-2026-11-04 | d9da718d2 (already in baseline) | — | — |
| #1235 | ci/logic-cluster-2026-11-04 | ca924e45e | — | — |

## #1237 detail (verified)

- Post-merge run `42012340073` / job `127194216755`: test job summary `Test Files: 27 failed | 1295 passed | 3 skipped (1325)`.
- Baseline job `127004594923`: summary `Test Files: 32 failed | 1290 passed | 3 skipped (1325)`.
- Failing-set diff (extracted from logs):
  - **Fixed (in baseline, not post):** `data-first-public-surfaces`, `dfs-honesty-contract`, `dfs-page-entitlement`, `fantasy-competitive-baseline`, `fantasy-real-data-surface` — 5 files.
  - **Regressions (in post, not baseline):** none.
- Extraction counts: 28 unique paths post vs summary 27 (one path appears in a neighbor's failure-reason line, not as its own failed file — expected one-off noise); 33 unique paths baseline vs summary 32 (same reason).

## Remaining wall (main, not green)

- 27 files / 32 tests still failing on main after this merge; those failures also
  existed on baseline. The merge did not create any of them.
- Includes the known `periodic-timeseries-id` Node-20 flake (fails on baseline too).
- Cluster triage continues per branch in `ci/` — next merges follow the same
  extract-diff-verify loop.

Next merges follow the same extract-diff-verify loop. Related branches:
`backup/all-local-commits-2026-10-21` (repo) and the `cadence-v2.0` pipeline
(`git -C C:/Users/Garrett/Sports log origin/main --grep cadence`).
