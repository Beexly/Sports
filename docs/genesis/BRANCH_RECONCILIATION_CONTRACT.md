# Galaxy Genesis — Branch and PR Reconciliation Contract

**Workstream:** `GX-R00`  
**Mode:** inventory, proof, recovery planning, and bounded consolidation  
**Authority:** this contract governs branch/PR cleanup before additional frontier feature work.

## Objective

Account for every useful commit, file, symbol, migration, test, route, flag, model, document, and operational decision across `Beexly/Sports` branches and pull requests, then assign each useful unit to exactly one canonical recovery path.

The goal is not fewer branches for appearance. The goal is **zero invisible work, zero accidental loss, zero duplicate canonical systems, and a main branch whose contents can be proven**.

## Non-negotiable invariants

1. **Improve, do not remove.** Nothing is deleted, closed, or declared obsolete until its unique value is proven absent or assigned elsewhere.
2. **Ahead count is not evidence of missing work.** A squash-merged branch may remain many commits ahead. Determine coverage by patch, tree, symbol, and behavior—not the branch counter.
3. **A merged PR is not proof every later branch commit landed.** Compare the exact merged commit and branch head.
4. **An open PR is not website behavior.** Only current `main` plus verified deployment state represents the shipped product.
5. **No bulk merge of a stale frontier branch.** Recover bounded coherent slices against current `main`.
6. **Every changed unit receives one disposition and one canonical owner.** No useful file or symbol may remain unassigned.
7. **Protected zones require an independent red-team pass:** settlement, CLV, calibration, proof/commitment, rights, entitlements, billing, migrations, public claims, write-once history, production infrastructure.
8. **No branch deletion without a deletion receipt.** The receipt must prove all unique useful changes are merged, deliberately archived, or explicitly rejected with reasons.
9. **No direct production action.** This workstream does not deploy, migrate production, activate providers, modify live billing, broaden rights, or publish externally.
10. **One reconciliation wave at a time.** Inventory comes first; implementation follows the dependency-ordered waves.

## Required live inventory

Enumerate all remote and local refs, including:

- `main`;
- open, closed, merged, draft, and stacked PRs;
- branches with no PR;
- branches whose PR merged before later commits were added;
- stale rebases and original/rebased branch pairs;
- Codex, Claude, ChatGPT, fix, research, docs, adoption, and recovery branches;
- GitHub Actions state attached to each head;
- deployment previews where available.

For each ref record:

```text
ref
headSha
mergeBaseWithMain
commitsAhead
commitsBehind
associatedPrs
prState
mergeMethod
lastUpdated
changedFiles
migrations
protectedZones
ciState
previewState
```

## Required semantic accounting

For every changed file and exported symbol, determine:

```text
unitId
sourceRef
sourceCommit
path
symbolOrArtifact
capability
currentMainEquivalent
comparisonEvidence
uniqueValue
protectedZone
canonicalOwner
recoveryTarget
status
reason
```

Required statuses:

```text
ON_MAIN_EXACT
ON_MAIN_EQUIVALENT
ACTIVE_PR
RECOVER_WHOLE
RECOVER_PARTIAL
REBASE_REQUIRED
OWNER_GATE
SUPERSEDED
ARCHIVE_ONLY
DELETE_AFTER_PROOF
UNKNOWN
```

`SUPERSEDED` is valid only when a newer ref is a demonstrated superset or replacement. `DELETE_AFTER_PROOF` is valid only after a deletion receipt exists.

## Comparison method

Use the strongest available evidence in this order:

1. exact commit ancestry;
2. patch-id or equivalent diff identity;
3. file blob identity;
4. exported symbol and behavioral equivalence;
5. targeted tests and fixtures;
6. documentation and PR descriptions only as leads.

For squash merges, compare branch commits and patches against the merge commit/tree. Do not conclude “missing” merely because the source branch remains ahead.

For branches that changed after their PR merged, separate:

- content included in the merge;
- post-merge unique commits;
- later work already absorbed elsewhere;
- genuinely stranded work.

## Required outputs

Create and maintain:

```text
reports/reconciliation/BRANCH_PR_LEDGER.json
reports/reconciliation/BRANCH_PR_LEDGER.md
reports/reconciliation/FILE_SYMBOL_OWNERSHIP.csv
reports/reconciliation/RECOVERY_WAVES.md
reports/reconciliation/DELETION_RECEIPTS.md
scripts/genesis/audit-work-inventory.mjs
```

The JSON ledger is canonical for machine use. The Markdown report is the founder-facing projection.

The audit script must be read-only. It may use local Git and `gh` when available. It must never merge, close, delete, force-push, deploy, or mutate production.

## Known high-priority reconciliation groups

### Group A — Current guardrail blocker

- PR `#128`, `fix/tools-page-commercial-copy-scan`.
- Purpose: remove a pre-existing false-positive that prevents unrelated branches from obtaining a fully green guardrail result.
- Disposition: independently verify, then land before using red CI counts as branch-quality evidence.

### Group B — Genesis control and kernel

- PR `#125`: complete Genesis canon, manifest, validator, work queue, and commands.
- PR `#126`: alternate/earlier Genesis canon plus the valuable `GENESIS_CONVERGENCE_MAP.md`.
- PR `#127`: shadow-only `packages/genesis-kernel` implementation of GX-000/GG-001.

Required outcome:

- preserve PR #125 as the complete canonical control package;
- absorb every unique, verified asset from #126 into #125 or the implementation ledger, then close #126 only after a preservation receipt;
- rebase/reverify #127 after the guardrail baseline is fixed;
- never retain competing Genesis queues as independent authorities.

### Group C — Active 29-commit frontier branch

- Branch `claude/galaxy-sports-edge-pdcswh`, now draft PR `#129`.
- Contains SportsIR, worldlines, governed playback, Reality Receipts, proof/OTS/MCP, orchestration, weather recovery, Intelligence Watch, hypothesis-to-instrument primitives, source-rights convergence, tests, and an additive migration.

Required outcome: split by capability and protected-zone boundary. Do not merge the branch wholesale.

Candidate slices, subject to live verification:

1. repo-native orchestration and scoped Claude rules;
2. SportsIR + adapters;
3. worldline and bitemporal replay;
4. governed playback and Game Room projection;
5. Reality Receipt and machine-proof extension;
6. OTS/MCP proof surfaces and migration;
7. weather-edge recovery;
8. Intelligence Watch and hypothesis-to-instrument primitives;
9. source-rights registry convergence.

### Group D — Playback overlap

- PR `#112`, `codex/gse-frontier-recovery-2026-07-13`.
- PR `#129` already contains a port of substantial playback code.

Required outcome: compare exact paths, symbols, tests, policy fixes, and post-port commits. Recover only the residual unique value from #112. Do not merge two playback spines.

### Group E — Foundry and research fabric

- PR `#124`: Agent Foundry, Assurance, Resource Radar, and shadow model portfolio router.
- Existing main routing: `model-router.ts`, `provider-dispatch.ts`, `free-lane.ts`, economics/cost layers.
- Existing Genesis kernel: capability vocabulary and plan compiler from #127.

Required outcome: recover PR #124 in bounded slices after #127 establishes the canonical genome. Its portfolio router must consume existing routing layers rather than replace or duplicate them.

### Group F — Security and domain engines

- PR `#123`: per-page Cockpit ADMIN enforcement.
- PR `#121`: Fantasy Engine foundation and rights-gated data plane.
- Branch `claude/fix-metric-source-fixture-alignment`: one-file alignment already represented in #121/#122.

Required outcome: land security hardening early; then rebase the Fantasy Engine with shared helper/fixture conflicts resolved. Mark the one-file branch absorbed only after its exact patch is present in a surviving PR or main.

### Group G — CLV/Pedersen migration lane

- PR `#122`: current rebased recovery.
- PR `#101`: older version, already closed as superseded.
- Branch `claude/clv-decomposition-reland` remains historical evidence until #122 is resolved.

Required outcome: shadow-DB and production-drift-safe validation; preserve write-once measurement and selected-side correctness; no production migration in this workstream.

### Group H — Galaxy Dynasty

- PR `#52`: large, old-base world-graph implementation.

Required outcome: preserve as a source branch and port coherent packages additively into the current semantic kernel when its dependencies are ready. Do not rebase/merge the entire stale branch merely to reduce branch count.

### Group I — Merged but undeleted branches

Examples include the heads associated with merged PRs `#115`–`#120` and earlier consolidated lines.

Required outcome: prove whether each branch head equals the merged PR head and whether any post-merge commits exist. Only then produce deletion receipts. The branch counter alone is not sufficient.

## Recovery-wave law

The first run performs inventory and generates the split plan only. It may open an accounting PR for a no-PR branch and may close an exact superseded PR with clear evidence. It does not merge feature code.

Subsequent waves each recover one coherent capability with:

```text
frozen contract
source refs and commits
canonical destination
collision analysis
protected-zone review
targeted tests
full applicable gates
rollback
recovery receipt
```

## Acceptance criteria

The reconciliation workstream is complete only when:

1. every non-main branch has a ledger entry;
2. every PR has a current disposition;
3. every ahead branch has a PR or explicit archive/supersession record;
4. every changed file/symbol is assigned to one recovery target;
5. all duplicate canonical systems have a convergence ruling;
6. all migrations and protected changes have owner-gated lanes;
7. every branch proposed for deletion has a proof-backed deletion receipt;
8. the remaining open PR set reflects real, bounded work rather than historical clutter;
9. `main` can be described by a machine-generated capability ledger without unsupported claims;
10. no accepted capability has been silently removed.
