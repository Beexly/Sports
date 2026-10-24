# GSE Drive Review — Nemotron Platforms Slice

**Source**: G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26  
**Live Intelligence Branch**: `motif/gse-intelligence-build-2026-10-02` (HEAD `531b39a`, current checkout in `C:\Users\Garrett\Sports-wt-intel`)  
**Date**: 2026-10-02

---

## Slice Summary

| Target | Type | Commit / Ref | Status |
|--------|------|--------------|--------|
| `sports-intelligence-os-phase-9-ci` | Git ref file (197 B) | `335311d1774509e7c282205b70aa3047c57de20b` (fetch origin main) | Not in branch atlas |
| `sports-prediction-platform-6F7Wa` | Git ref file (212 B) | `d693ecf34f2c6e21d8f6adab450fc0c0c926edc7` (created from `refs/remotes/origin/claude/sports-prediction-platform-6F7Wa`) | **Duplicate of below** |
| `sports-prediction-platform-6F7Wa (1)` | Git ref file (165 B) | `d43e24a96c6bf9ffb97f8e9d77aba67367376394` (fetch --all --prune) | **Duplicate** — same tree as above |

**Verdict**: `sports-prediction-platform-6F7Wa (1)` is a fast-forward fetch of `sports-prediction-platform-6F7Wa` — same tree. **Skipped as duplicate.**

---

## Source Branch Intelligence

### 1. `claude/sports-prediction-platform-6F7Wa` (from branch atlas)
- **Commit**: `d43e24a` (2026-04-22)
- **Message**: "feat: add Privacy Policy and Terms of Service pages"
- **Inferred Purpose**: Platform landing build adding legal pages (Privacy Policy, Terms of Service). Touches web legal pages only.
- **Status**: **Stale** (~5 months old), almost certainly merged or abandoned.
- **Module Surface**: Web legal pages only — no engine, signal, calibration, or intelligence modules.

### 2. `sports-intelligence-os-phase-9-ci`
- **Commit**: `335311d1774509e7c282205b70aa3047c57de20b`
- **Branch Atlas**: **Not present** — not one of the 224 keyword-matched branches in the Sports repo.
- **Likely Location**: Separate repo (not in 17 Beexly repos cataloged) or a branch filtered out by keyword matching.
- **Module Surface**: **Unknown** — no file tree available in GSE folder; only git ref file exists.

---

## Live Intelligence Branch (`motif/gse-intelligence-build-2026-10-02`)

**Current Modules** (tracked in `intelligence/`):
```
intelligence/
├── audit/              # heldout_check, paired audit
├── calibration/        # calibration gates, rows, manifests
├── coaching/           # vintage data, coaching signals
├── combining/          # model combination logic
├── context/            # tau_wire, DataContext
├── contracts/          # data contracts
├── doctrine/           # engine doctrines
├── engines/            # prediction engines
├── gates/              # manifest_check, heldout_check, calibration gates
├── integration/        # integration tests
├── kernels/            # core kernels
├── newregime/          # new regime detection
├── providers/          # data providers (injury_gate, etc.)
├── qb/                 # QB models
├── qb-behavior/        # QB behavioral models
├── ratings/            # team/player ratings
├── reasoning/          # reasoning layer
├── reasoning_engine/   # reasoning engine (emit_slate, traces)
├── research/           # research corpus
├── signals/            # signal definitions
├── staking/            # Kelly/staking logic
├── tests/              # test suites
├── trust/              # trust gates
├── trust-signals/      # trust signal extractors
└── host_ledger.json    # two-host ledger
```

**Key Wires Closed Since Build** (per GSE-REPO-INTELLIGENCE.md):
- Wire 9: tau → DataContext (`intelligence/context/tau_wire.py`)
- Wire 5: held-out checker (`intelligence/gates/heldout_check.py`)
- Wire 4: manifest enforcer (`intelligence/gates/manifest_check.py`)
- Wire 6: paired audit (`intelligence/audit/paired.py`)
- Wire 12: two-host ledger (`intelligence/host_ledger.json`)
- Wire 16: injury gate (`intelligence/providers/injury_gate.py`)

---

## Delta Analysis — Modules Not in Live Branch

### From `claude/sports-prediction-platform-6F7Wa`
- **No intelligence modules** — branch only contains web legal pages (Privacy Policy, Terms of Service).
- **Nothing feeds a directional premise or fail-closed refusal** for the prediction engine.

### From `sports-intelligence-os-phase-9-ci`
- **Module surface unknown** — branch not in branch atlas, no file tree in GSE folder.
- **Git ref only** — 197-byte reference file; actual tree not extracted.
- **Risk**: If this branch contains Phase 9 CI pipeline code (calibration gates, walk-forward harness, leakage tests), those modules would be **high-value candidates** for directional premises:
  - Leakage/temporal-safety machinery (GSE Weak Point #1)
  - Walk-forward calibration harness with as-of fencing
  - LeakageGate keyword scan / hard-fail on season overlap
  - Pre-committed evaluation bar with frozen test season + OOS season
  - Per-artifact JSON receipts with input hashes

**Without the file tree, cannot confirm or deny presence of these modules.**

---

## Queued Items (Max 5)

1. **Extract `sports-intelligence-os-phase-9-ci` tree** — Clone Beexly/Sports at `335311d` and diff `intelligence/` against live branch. Priority: HIGH (may contain leakage gate + walk-forward harness).
2. **Verify `claude/sports-prediction-platform-6F7Wa` merge status** — Check if legal pages landed in main; if so, no further action.
3. **Catalog Phase 9 CI artifacts** — If source branch has `test_asof_no_leakage.py`, `LeakageGate`, or `as_of_datetime` fencing, port to live branch before trusting any calibration result.
4. **Cross-ref with GSE Weak Point #1** — "No leakage/temporal-safety machinery while walk-forward calibration is running." Phase 9 CI is the prime candidate for the missing harness.
5. **Audit license hygiene** — If Phase 9 CI imports GPL/AGPL deps (e.g., `yfpy`), fail-closed refusal required per GSE Weak Point #9.

---

## Notes

- **Restrictive license**: Learn only — do not copy code from external repos without clearance.
- **No invented probabilities** — All assessments based on observed commit messages, branch atlas, and GSE-REPO-INTELLIGENCE.md.
- **No second bridge-model.ts or from-bridge.ts recommended** — Current wiring uses `intelligence/context/tau_wire.py` + `host_ledger.json`.
- **0-byte files**: None encountered in live branch; git ref files in GSE folder are non-zero (165–212 B).