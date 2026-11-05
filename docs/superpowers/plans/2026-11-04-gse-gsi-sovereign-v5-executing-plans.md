# GSE & GSI Sovereign v5.0 Master Plan — Executing-Plans Run

Source: user invocation 2026-11-04 (superpowers:executing-plans) with full Master Plan text in the user message. Branch: hermes/overnight-2026-11-03-corpus (e09a66140). Worktree: C:/c/wt-week8-forensic. Mirror: C:/Users/Garrett/Sports.

## Claimed state (to verify, not assume)
- 8/8 Zero-Orphan GSE Vitest (zero-orphan-engine-audit 3 + teb-avalanche-braid-overlay 5)
- 11/11 Marketing Science Vitest (marketing-science-conversion-engine 7 + purge-stale-packages 4)
- 10/10 Bare-Metal C++20 STM32H7 SRAM/Cycle Kernel Tests (embedded_kernel_tests)
- 45/45 Python Theorem 4 + Kafka/Flink + CTE Tests (packages/galaxy-conformal-ot/tests)
- 5/5 20-Hour Shift Tracks (run_overnight_20h_hermes_opencode_nvidia_openrouter_shift.py --track N, Track 1-5)
- Committed and pushed to origin/hermes/overnight-2026-11-03-corpus (e09a66140)
- Synced into C:/Users/Garrett/Sports

## Tasks
### Task 1: Verify 8/8 Zero-Orphan Vitest
Run: npx vitest run packages/prediction-engine/src/__tests__/zero-orphan-engine-audit.test.ts packages/prediction-engine/src/__tests__/teb-avalanche-braid-overlay.test.ts --reporter=basic
Expected: 2 files passed, 8 tests passed.

### Task 2: Verify 11/11 Marketing Science Vitest
Run: npx vitest run apps/web/__tests__/marketing-science-conversion-engine.test.ts apps/web/__tests__/purge-stale-packages.test.ts --reporter=basic
Expected: 2 files passed, 11 tests passed.

### Task 3: Verify 10/10 C++20 Kernel
Build: g++ -std=c++20 -O2 -fno-exceptions -fno-rtti -I packages/galaxy-conformal-ot/embedded packages/galaxy-conformal-ot/embedded/gsi_embedded_braid_kernel.cpp packages/galaxy-conformal-ot/embedded/gsi_cte_viscoelastic_waveguide_kernel.cpp packages/galaxy-conformal-ot/embedded/tests/embedded_kernel_tests.cpp -o embedded_kernel_tests.exe
Run: ./embedded_kernel_tests.exe
Expected: ALL 10 BARE-METAL EMBEDDED & 5-DOMAIN TESTS PASSED, exit 0, SRAM 20769 / 262144 bytes.

### Task 4: Verify 45/45 Python Theorem 4
Run: python -m pytest packages/galaxy-conformal-ot/tests/ -v
Expected: 45 passed.

### Task 5: Verify 5/5 Shift Tracks
Run: python scripts/ops/run_overnight_20h_hermes_opencode_nvidia_openrouter_shift.py --track N for N=1..5, and --run-all-tracks-now
Expected: exit 0, artifacts in data/engine/ and docs/predictions/research/2026-11-05/

### Task 6: Verify sync/push state and compile_proposal
Check: git log e09a66140, git ls-remote origin hermes/overnight-2026-11-03-corpus, files in C:/Users/Garrett/Sports, python docs/engine/research/2026-11-04/submission/compile_proposal.py --validate-only (path may differ; find correct path)
Expected: remote SHA matches local, Sports files present (tracked or untracked with status noted), compile_proposal exit 0.

## Global Constraints
- NEVER publish/suggest any Week 9 pick/prop/SGP without 5-Stage GSE Engine + full-game snap-by-snap JEV sim (per hard doctrine). Verification only; no new pick publication in this run.
- Confidence formatting: 84/100, never %.
- Official ledger: 16-5 (76.2%), +10.45u — cite as is, do not invent.
- Test-first for any code change; watch RED then GREEN.
- Commit + push after fixes; restore generated timestamp-only diffs if unintended.

## Interfaces / Pre-flight
- Vitest counts match test files on disk (see Task 1/2).
- C++ test 10 uses 1000 iterations, not 100000 (see Task 3).
- Orchestrator argparse: verify --track support (see Task 5).
- Python async tests require pytest-asyncio (see Task 4).
