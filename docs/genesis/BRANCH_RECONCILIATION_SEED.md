# Galaxy Genesis — Branch Reconciliation Seed

**Snapshot:** 2026-07-17  
**Purpose:** starting evidence for `GX-R00`; the coding agent must refresh every fact from live Git/GitHub state before acting.

This file is not a substitute for the generated ledger. It prevents the first reconciliation pass from rediscovering already-proven relationships.

## Immediate actions already completed

1. **Draft PR #129 opened** for `claude/galaxy-sports-edge-pdcswh`.
   - At opening: 29 commits ahead of `main`, 0 behind, 128 changed files.
   - Purpose: make the previously PR-less frontier stack visible and reviewable.
   - Boundary: accounting container only; split before merge.
2. **PR #101 closed as superseded** by PR #122.
   - Historical branch remains until #122 is resolved and a deletion receipt exists.

## Current main baseline

At this snapshot, `main` points to settlement/CI hardening from merged PR #119 and already includes the merged Glass Ledger / Edge Engine program from PR #120 plus merged PRs #115–#118.

Merged branch counters may remain nonzero because GitHub used squash merges or the source branch contains later commits. Verify exact head coverage before branch deletion.

## Current open-work disposition seed

| PR / branch | Seed disposition | Reason and next action |
|---|---|---|
| **#128** `fix/tools-page-commercial-copy-scan` | `RECOVER_WHOLE` / merge-first candidate | One comment-only false-positive fix. It blocks the full guardrail job on current main and contaminates CI interpretation for every other PR. Independently verify, then land first. |
| **#127** `genesis/gx-000-codebase-twin-plan-compiler` | `ACTIVE_PR` | Canonical shadow kernel for GX-000/GG-001. Rebase after #128, rerun all gates, review deterministic plan semantics, then founder decision. |
| **#125** `research/galaxy-genesis-metacortex-2026-07-17` | `ACTIVE_PR` / canonical control package | Complete canon, manifest, validator, work queue and commands. Incorporate reconciliation contract and unique #126 assets. Do not call it runtime implementation. |
| **#126** `chatgpt/galaxy-genesis-orchestrator` | `RECOVER_PARTIAL` then `SUPERSEDED` | Preserve `GENESIS_CONVERGENCE_MAP.md` and any unique queue decisions in #125/current ledger. Close only after exact preservation proof. |
| **#129** `claude/galaxy-sports-edge-pdcswh` | `RECOVER_PARTIAL` across multiple waves | Active 29-commit SportsIR/playback/proof stack. Split by capability and protected-zone boundary; never merge whole. |
| **#123** `claude/cockpit-page-auth-rebased` | `RECOVER_WHOLE` / security lane | Per-page ADMIN checks and source-scan enforcement. Rebase on fixed main, verify all current Cockpit pages including newer ones, land before large Cockpit feature PRs. |
| **#121** `claude/fantasy-engine-foundation-rebased` | `REBASE_REQUIRED` then domain review | Substantial glass-box Fantasy Engine and rights-gated MLB plane. Trademark rename is complete. Resolve shared admin helper and fixture alignment after #123/#128. |
| **#124** `claude/frontier-superset-rebased` | `RECOVER_PARTIAL` after #127 | Agent Foundry, Assurance, Resource Radar and shadow router. Split and adapt to the canonical Capability Genome and existing provider/model routers. |
| **#122** `claude/clv-decomposition-reland-rebased` | `OWNER_GATE` / protected migration lane | Additive nullable columns and migrations, write-once CLV dispersion, Pedersen aggregate. Requires current-main rebase, shadow DB/drift proof and red-team review. No production migration here. |
| **#112** `codex/gse-frontier-recovery-2026-07-13` | `RECOVER_PARTIAL` | Strong governed playback branch, but substantial spine is already ported into #129. Diff residual unique work only; preserve owner-ruling fixes. |
| **#52** `claude/gracious-albattani-f63wx1` | `ARCHIVE_ONLY` now; future additive ports | Galaxy Dynasty world graph on a stale base. Preserve all unique systems, then port bounded packages when Genesis semantic dependencies are ready. |
| `claude/fix-metric-source-fixture-alignment` | `DELETE_AFTER_PROOF` candidate | One-file patch appears in #121/#122. Prove exact patch absorption before deletion. |
| `claude/clv-decomposition-reland` | historical / `DELETE_AFTER_PROOF` candidate | Old source for closed #101. Keep until #122 settles and no unique patch remains. |
| merged PR branches #115–#120 | `DELETE_AFTER_PROOF` candidates | Verify source head equals the merged PR head and has no later unique commits. Squash merge means “ahead” is not missing-work evidence. |

## Proven architecture collisions

1. **Source-rights registry duplication**
   - canonical: `apps/web/lib/scraping/source-rights-registry.ts`
   - duplicate: `apps/web/lib/source-rights/source-rights-registry.ts`
   - #129 contains a convergence attempt.
   - Treat as a protected rights slice; red-team before landing.

2. **Model/provider routing overlap**
   - `model-router.ts`: model tier by surface;
   - `provider-dispatch.ts`: Anthropic/Bedrock/Vertex execution;
   - `free-lane.ts`: narrow Cerebras lane;
   - cost/economics layers;
   - #124 shadow portfolio router.
   - Preserve layering. The portfolio router must call or advise the existing stack, not become another execution sink.

3. **Capability vocabulary multiplication**
   - Jarvis capabilities;
   - Agent OS registry;
   - Resource Intelligence dispositions;
   - #124 skill manifests;
   - #127 Genesis Capability Genome.
   - One canonical genome; existing systems become adapters/projections.

4. **Parallel program queues**
   - #125 `GX-*`;
   - #126 `GG-*`;
   - #129 frontier `W*`.
   - Ruling: #125 queue and manifest are implementation authority; map other queues into it. One capability is built once.

5. **Playback overlap**
   - #112 and #129 share `intelligence-playback` lineage.
   - Keep one canonical spine and port residual consumer/proof features deliberately.

6. **Proof overlap**
   - main has Glass Ledger/machine proof;
   - #129 adds Reality Receipt, OTS and MCP proof surfaces;
   - #122 adds Pedersen aggregate fields.
   - Extend one Proof Fabric; do not establish separate public truth systems.

## Recommended recovery order

```text
R0  Verify and land #128 to restore trustworthy CI baseline
R1  Rebase and independently verify #123 Cockpit authorization
R2  Rebase and independently verify #127 Genesis shadow kernel
R3  Consolidate #125 + unique #126 control package; close #126 after receipt
R4  Generate exhaustive branch/PR ledger and file-symbol ownership map
R5  Split #129 into bounded recovery PRs
R6  Rebase/recover #121 Fantasy Engine
R7  Recover #124 Foundry/Radar/Assurance into the Genesis genome
R8  Compare #112 vs #129; recover residual playback value
R9  Validate #122 in the protected migration lane
R10 Preserve and later port #52 Dynasty packages
R11 Delete only branches with completed deletion receipts
```

This order may change only when fresh repository evidence demonstrates a stronger dependency or urgent correctness/security defect.
