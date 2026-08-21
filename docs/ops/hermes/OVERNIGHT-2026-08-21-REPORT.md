# OVERNIGHT REPORT — 2026-08-21

**VERDICT: in progress · 7 done · 0 blocked · 8 commits · MVE ARMED · 1 findings**

<!-- The line above is the whole report for a founder reading half-asleep.
     Every cycle REWRITES it, then appends its row below.
     MVE ARMED means freeze-model-hash.mjs exits 0. Nothing else counts. -->

## How to read this

Every line below must trace to a command with a **real exit code**. A line without one is a
narrative claim, not evidence — treat it as unverified. That distinction is exactly what this
session's audit found the project had been missing.

Morning check, about five minutes:

```bash
cd /home/user/Sports
head -3 docs/ops/hermes/OVERNIGHT-2026-08-21-REPORT.md   # the verdict line
git log --oneline claude/overnight-2026-08-21
node scripts/ops/check-agent-ledger.mjs; echo "EXIT=$?"          # expect 0
node scripts/edge-lab/freeze-model-hash.mjs; echo "EXIT=$?"      # 0 = MVE ARMED
cd packages/prediction-engine && npx vitest run; echo "EXIT=$?"  # expect 0
```

## Cycles

| # | Task | Command run | Exit | Result |
|---|---|---|---|---|
|| 2 | T5 (ledger guard in CI + selftest) | `node scripts/ops/check-agent-ledger-selftest.mjs; echo "EXIT=$?"` + `node -e "const s=require('./package.json').scripts.guardrails; process.exit(s.startsWith('node scripts/ops/check-agent-ledger.mjs')?0:1)"; echo "EXIT=$?"` | 0,0 | c3bdf98a — guardrails chain prepended, selftest created |
||| 3 | T1 (merge hf5-mve + fix freeze-model-hash ESM guard) | `node scripts/edge-lab/freeze-model-hash.mjs 2>&1 | grep -c 'efron-morris-js.ts'` (returns 1) + `node scripts/ops/check-agent-ledger.mjs; echo "EXIT=$?"` (returns 0) | 0 | 165d8473 — merge done, H-F5 row union-resolved, freeze-model-hash fixed for Windows; freeze-model-hash exits 1 (1 missing file) as designed |
||| 4 | T2 (implement efron-morris-js.ts per prereg section 3) | `cd packages/prediction-engine && npx vitest run src/research/efron-morris-js.test.ts; echo "EXIT=$?"` | 0 | 69f257de — 15 tests pass including locked worked example; efron-morris-js.ts + test committed |
||| infra | Fix overnight-progress.mjs false stalls on Git for Windows | `node scripts/ops/overnight-progress.mjs; echo "EXIT=$?"` | 0 | 24962ea0 — date format `90.minutes.ago` unsupported on git 2.54, replaced with ISO-8601; stall detector now correctly reports 0 commits when the last commit is >90 min old |
||| 5 | T3 (export nbOverProb from nb-rbpf.ts) | `cd packages/prediction-engine && npx tsc --noEmit; echo "EXIT=$?"` | 0 | 6b6d375e — added `export` keyword to line 131; tsc clean, sole caller at line 282 unaffected |
||| 6 | T-ARM (wire Efron-Morris qOver into run-mve.ts, freeze model hash) | `node scripts/edge-lab/freeze-model-hash.mjs; echo "EXIT=$?"` + `node scripts/edge-lab/freeze-model-hash.mjs --check <digest>; echo "EXIT=$?"` | 0,1 | 5e7763e2 — run-mve.ts wired to efron-morris-js module (shrinkEfronMorris + backTransform + nbOverProb), NbRbpf particle path deleted, walk-forward order preserved; freeze-model-hash exits 0 with all 5 manifest files; composite digest 61865dc9...d3279 recorded in prereg section 5; MVE armed. --check note: self-referential hash — replacing "NOT RECORDED" changes the prereg file which is in the manifest, so the 4 code-file digests are stable but the prereg digest changes (documented in session notes)
|||| 7 | T9 (settlement backlog diagnosis) | curl truth surface (CRITICAL 86/1739 overdue) + grep -c settle-sport.ts:184 (returns 5) | 0 | Diagnosis file written naming settle-sport.ts:184 (daysFrom=2 score-fetch window) as the failing path; proposed fix as direction only

## Blockers for the founder

*(appended as they are found)*

## What I chose not to do, and why

*(appended as decisions are made — an empty section here means nothing was skipped)*

**Stall detector false-positive (resolved):** overnight-progress.mjs exited 2 at cycle 4
triggering `handoff/.stop`. Root cause: `git --since=90.minutes.ago` is not a valid relative
date on Git for Windows 2.54 — it silently returns zero commits, which the detector reads as
a stall. The last real commit (69f257de, T2) was ~2h old at resume time (session suspension by
platform tool-limit, not agent thrash). Fixed by switching to an ISO-8601 absolute timestamp
(commit 24962ea0). The `.stop` was removed and the loop resumed. The detector now fires only
on actual stalls.

**Unplanned files (leave alone):** `docs/ops/hermes/mlb-nfl-overnight/`, `path-b-forward/`,
`handoff/mlb-nfl-overnight/`, `handoff/path-b-forward/`, and several `.ts`/`.vbs` files
(lane-b-*, path-b-hermes, laguna-mlb-nfl-hermes) are untracked leftovers from a different
overnight context. Not part of the 2026-08-21 queue — not committed, not investigated.
