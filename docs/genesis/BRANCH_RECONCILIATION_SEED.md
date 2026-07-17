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
3. **PR #126 preserved and closed as a competing control package.**
   - Its unique convergence map is archived in PR #125 at `docs/genesis/archive/GENESIS_CONVERGENCE_MAP_2026-07-17.md`.
   - Its canon and queue are superseded by PR #125's complete canon, manifest, and dependency-ordered work queue.
   - The source branch and PR history remain available for forensic comparison.

## Current main baseline

At this snapshot, `main` points to settlement/CI hardening from merged PR #119 and already includes the merged Glass Ledger / Edge Engine program from PR #120 plus merged PRs #115–#118.

Merged branch counters may remain nonzero because GitHub used squash merges or the source branch contains later commits. Verify exact head coverage before branch deletion.

## Current open-work disposition seed

| PR / branch | Seed disposition | Reason and next action |
|---|---|---|
| **#128** `fix/tools-page-commercial-copy-scan` | `RECOVER_WHOLE` / merge-first candidate | One comment-only false-positive fix. It blocks the full guardrail job on current main and contaminates CI interpretation for every other PR. Independently verified CI is green; land first. |
| **#127** `genesis/gx-000-codebase-twin-plan-compiler` | `ACTIVE_PR` | Canonical shadow kernel for GX-000/GG-001. Rebase after #128, rerun all gates, diagnose its remaining workspace-test failure, review deterministic plan semantics, then founder decision. |
| **#125** `research/galaxy-genesis-metacortex-2026-07-17` | `ACTIVE_PR` / canonical control package | Complete canon, manifest, validators, work queue, implementation and reconciliation commands. It now contains the unique #126 convergence map archive. Do not call it runtime implementation. |
| **#126** `chatgpt/galaxy-genesis-orchestrator` | `SUPERSEDED` / closed after preservation | All three files accounted for: canon and queue are supersets in #125; convergence map archived exactly in #125. Branch retained until deletion receipt. |
| **#129** `claude/galaxy-sports-edge-pdcswh` | `RECOVER_PARTIAL` across multiple waves | Active 29-commit SportsIR/playback/proof stack. Split by capability and protected-zone boundary; never merge whole. |
| **#123** `claude/cockpit-page-auth-rebased` | `RECOVER_WHOLE` / security lane | Per-page ADMIN checks and source-scan enforcement. Rebase on fixed main, verify all current Cockpit pages including newer ones, land before large Cockpit feature PRs. |
| **#121** `claude/fantasy-engine-foundation-rebased` | `REBASE_REQUIRED` then domain review | Substantial glass-box Fantasy Engine and rights-gated MLB plane. Trademark rename is complete. Resolve shared admin helper and fixture alignment after #123/#128. |
| **#124** `claude/frontier-superset-rebased` | `RECOVER_PARTIAL` after #127 | Agent Foundry, Assurance, Resource Radar and shadow router. Split and adapt to the canonical Capability Genome and existing provider/model routers. |
| **#122** `claude/clv-decomposition-reland-rebased` | `OWNER_GATE` / protected migration lane | Additive nullable columns and migrations, write-once CLV dispersion, Pedersen aggregate. Requires current-main rebase, shadow DB/drift proof and red-team review. No production migration here. |
| **#112** `codex/gse-frontier-recovery-2026-07-13` | `RECOVER_PARTIAL` | Strong governed playback branch, but substantial spine is already ported into #129. Diff residual unique work only; preserve owner-ruling fixes. |
| **#52** `claude/gracious-albattani-f63wx1` | `ARCHIVE_ONLY` now; future additive ports | Galaxy Dynasty world graph on a stale base. Preserve all unique systems, then port bounded packages when Genesis semantic dependencies are ready. |
| `claude/fix-metric-source-fixture-alignment` | `DELETE_AFTER_PROOF` candidate | One-file patch appears in #121/#122. Prove exact patch absorption before deletion. |
| `claude/clv-decomposition-reland` | historical / `DELETE_AFTER_PROOF` candidate | Old source for closed #101. Keep until #122 settles and no unique patch remains. |
| `chatgpt/galaxy-genesis-orchestrator` | historical / `DELETE_AFTER_PROOF` candidate | Source branch for closed #126. Keep until PR #125 lands and archive/content parity is re-verified. |
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
   - #125 `GX-*` is canonical implementation authority;
   - closed #126 `GG-*` is preserved historical input;
   - #129 frontier `W*` maps into the canonical queue.
   - One capability is built once.

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
R0  Land #128 to restore trustworthy CI baseline
R1  Rebase and independently verify #123 Cockpit authorization
R2  Rebase and independently verify #127 Genesis shadow kernel
R3  Verify #125 preserved #126 fully; PR #126 is now closed
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
