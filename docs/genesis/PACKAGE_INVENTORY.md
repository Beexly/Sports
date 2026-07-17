# Galaxy Genesis — Package Inventory and Agent Loading Map

This file tells coding and research agents where every kind of information lives and what **not** to read by default.

## Primary commands

```text
/gse-autopilot continue
/genesis-next GX-000
/genesis-reconcile inventory
```

Use `/gse-autopilot continue` as the normal campaign entrypoint. It continues the repository's live current queue through review, code, improvement, independent review, polish, verification, ledger updates, commit and push. It transitions to reconciliation only after the active queue is genuinely drained.

Use `/genesis-next` for one explicitly selected dependency-ordered Genesis implementation workstream.

Use `/genesis-reconcile` only after the queue-drain gate passes, or for a narrowly requested emergency accounting/verification pass. It handles branches, PRs, commits, migrations, and duplicate systems that may be stranded, stale, superseded, or unaccounted for.

## Queue-first continuous execution

| File | Purpose | Read when |
|---|---|---|
| `docs/genesis/CONTINUOUS_EXECUTION_CONTRACT.md` | campaign law for preserving and draining the current queue before reconciliation | every autonomous continuation campaign |
| `.claude/commands/gse-autopilot.md` | token-efficient continuous conductor | run with `continue`, `status`, or `verify` |

The campaign loop is:

```text
REVIEW
→ FREEZE CONTRACT
→ CODE
→ TARGETED VERIFY
→ INDEPENDENT REVIEW
→ IMPROVE
→ POLISH
→ FINAL VERIFY
→ UPDATE LEDGERS
→ COMMIT / PUSH / PR
→ SELECT NEXT
→ CONTINUE
```

Historical plans provide intent and dependencies. Live code, Git state, active tasks, tests, and queue ledgers determine what is actually next.

## First-run mandatory files

| File | Purpose |
|---|---|
| `CLAUDE.md` | repository law and current project constraints |
| `docs/genesis/CONTINUOUS_EXECUTION_CONTRACT.md` | queue-first campaign law |
| current branch/workstream contract and compact frontier ledgers | live execution state |
| `GENESIS_START_HERE.md` | Genesis package entrypoint |
| `docs/genesis/DECISIONS.md` | binding Genesis decisions |
| `docs/genesis/CANON_MANIFEST.json` | machine-readable lookup for only the systems involved |

Do not load the complete canon during a normal implementation campaign.

## Branch and PR reconciliation

| File | Purpose | Read when |
|---|---|---|
| `docs/genesis/BRANCH_RECONCILIATION_CONTRACT.md` | exhaustive rules, outputs, statuses, proof and deletion-receipt requirements | after the queue-drain gate, or for a narrowly requested reconciliation unit |
| `docs/genesis/BRANCH_RECONCILIATION_SEED.md` | current snapshot of known dispositions and recovery order | first reconciliation run; refresh every fact from live Git/GitHub state |
| `.claude/commands/genesis-reconcile.md` | token-efficient reconciliation conductor | run with `inventory`, `next`, a PR number, branch name or `verify` |

A branch counter is never enough to prove work is missing or safe to delete. The reconciliation contract requires commit, patch, blob, symbol, behavior and test evidence.

## Completeness and preservation

| File | Purpose | Read when |
|---|---|---|
| `docs/genesis/COMPLETE_CANON.md` | preserves every accepted system from the full R&D program | completeness dispute, supersession, architecture collision, or new program design |
| `docs/genesis/ORIGIN_SOURCE_MAP.md` | maps every founding repository, platform and research family into Galaxy | touching an origin, provider, tool, model hub, source or external ecosystem |
| `docs/genesis/CANON_MANIFEST.json` | system IDs, status, dependencies, canonical docs and workstreams | every workstream, but query only matching entries |
| `docs/genesis/PACKAGE_INVENTORY.md` | this loading map | agent orientation only |

## Execution and architecture

| File | Purpose |
|---|---|
| `docs/genesis/WORK_QUEUE.md` | dependency-ordered Genesis implementation authority |
| `docs/genesis/META_COMPILER_SPEC.md` | Metacortex destination architecture |
| `docs/genesis/CODEBASE_TWIN_SPEC.md` | repository semantic twin architecture |
| `docs/genesis/FIRST_BUILD_CONTRACT.md` | bounded GX-000 vertical slice |
| `docs/genesis/CONTINUOUS_EXECUTION_CONTRACT.md` | multi-workstream queue-drain and continuation law |
| `.claude/commands/gse-autopilot.md` | queue-first autonomous campaign command |
| `.claude/commands/genesis-next.md` | token-efficient single-workstream implementation command |
| `.claude/commands/genesis-reconcile.md` | token-efficient stranded-work accounting and recovery command |

## Research modules

| File | Region |
|---|---|
| `docs/genesis/EXPANSION_ATLAS.md` | atlas index and governing rules |
| `docs/genesis/atlas/01-intelligence-and-science.md` | Metacortex, incremental reality, policy, verification, uncertainty, scientific discovery, model mechanisms, data economics |
| `docs/genesis/atlas/02-data-process-world-and-privacy.md` | weak supervision, process intelligence, complex dynamics, Human Twin, World Foundry, sandbox and local-first |
| `docs/genesis/atlas/03-provenance-causality-product-and-epistemics.md` | authenticity, causal transport, measurement, living evidence, comprehension, incentives and argument graphs |
| `docs/genesis/atlas/04-evolution-verification-and-human-ai.md` | sequential decisions, strategic populations, open-endedness, synthesis, runtime verification, unlearning and human-AI complementarity |
| `docs/genesis/atlas/05-metrology-context-execution-and-resilience.md` | assumptions, metrology, context compilation, plan superoptimization, hardware compilation, resilience, drift, observability and cybernetics |
| `docs/genesis/atlas/06-cloud-supply-chain-and-institutional-intelligence.md` | multi-cloud, intelligence BOM, supply-chain security, secure collaboration, quality diversity and institutional sports systems |

## Providers and platforms

| File | Purpose |
|---|---|
| `docs/genesis/CLOUD_CAPABILITY_MESH.md` | provider-neutral AWS, Google, Microsoft, Hugging Face, local and edge capability contract |
| `docs/genesis/PLATFORM_ECOSYSTEM_MAP.md` | NVIDIA, Cloudflare, Ray, KServe, Temporal, MLflow, Iceberg, lakeFS, Feast and other precise candidates |

## Research sources

| File | Purpose |
|---|---|
| `docs/genesis/SOURCE_LEDGER.md` | original primary research foundations |
| `docs/genesis/SOURCE_LEDGER_EXTENDED.md` | compiler, cloud, agent, metrology, resilience, provenance, context, local-first, cybernetic and consistency research added in the expansion pass |

## Deterministic fixtures

| File | Purpose |
|---|---|
| `docs/genesis/fixtures/capability-candidates.example.json` | bounded capability candidates for GX-000 |
| `docs/genesis/fixtures/internal-brief.contract.json` | safe internal Intelligence Contract fixture |

## Agent loading algorithm

```text
1. inspect live branch, worktrees, uncommitted work, tasks and PR state
2. identify the active or next dependency-ready queue item
3. read only compact current-state ledgers and its frozen contract
4. query CANON_MANIFEST.json only for affected systems and dependencies
5. inspect exact code, tests, history and reusable branch assets
6. freeze one bounded implementation contract
7. review → code → test → independent review → improve → polish
8. run final applicable gates
9. update queue/state/decision/recovery ledgers and receipts
10. commit, push and update the correct PR
11. immediately select the next dependency-ready queue item
12. only after the queue-drain gate, run reconciliation inventory and recovery waves
13. stop only at a genuine hard boundary
```

## Completeness rule

A new accepted system is incomplete until it has:

- a Canon Manifest entry;
- a canonical document;
- dependency links;
- an honest status;
- a workstream or explicit research/owner-gate disposition;
- origin and provenance when externally derived.

A workstream is incomplete until it has:

- a frozen contract;
- implementation and targeted tests;
- independent review and confirmed-finding repair;
- relevant polish;
- final verification evidence;
- ledger updates;
- commit, push, PR/accounting state and receipt.

A branch or PR is unaccounted for until it has:

- a live ledger entry;
- a semantic diff against current `main`;
- ownership for every unique useful unit;
- an explicit recovery, archive, supersession or deletion-after-proof disposition.

## Context rule

The package is intentionally large enough to preserve ambition and modular enough to avoid charging every coding session for that ambition.

The archive is loaded only when needed. Live task state, active contracts, compact ledgers, the manifest, reconciliation ledger and exact code evidence drive normal work.
