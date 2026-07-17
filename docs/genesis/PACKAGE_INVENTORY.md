# Galaxy Genesis — Package Inventory and Agent Loading Map

This file tells coding and research agents where every kind of information lives and what **not** to read by default.

## Primary commands

```text
/genesis-next GX-000
/genesis-reconcile inventory
```

Use `/genesis-next` for one dependency-ordered Genesis implementation workstream.

Use `/genesis-reconcile` when branches, PRs, commits, migrations, or duplicate systems may be stranded, stale, superseded, or unaccounted for. Reconciliation takes priority over new frontier feature work when invisible work is detected.

## First-run mandatory files

| File | Purpose |
|---|---|
| `CLAUDE.md` | repository law and current project constraints |
| `GENESIS_START_HERE.md` | package entrypoint and current mission |
| `docs/genesis/FIRST_BUILD_CONTRACT.md` | exact GX-000 implementation contract |
| `docs/genesis/DECISIONS.md` | binding Genesis decisions |
| `docs/genesis/CANON_MANIFEST.json` | machine-readable lookup for GX-000 systems and dependencies |

Do not load the complete canon during a normal GX-000 run.

## Branch and PR reconciliation

| File | Purpose | Read when |
|---|---|---|
| `docs/genesis/BRANCH_RECONCILIATION_CONTRACT.md` | exhaustive rules, outputs, statuses, proof and deletion-receipt requirements | any branch/PR inventory, cleanup, recovery, supersession, close, merge-order or deletion decision |
| `docs/genesis/BRANCH_RECONCILIATION_SEED.md` | current snapshot of known dispositions and recovery order | first reconciliation run; refresh every fact from live Git/GitHub state |
| `.claude/commands/genesis-reconcile.md` | token-efficient reconciliation conductor | run with `inventory`, `next`, a PR number, branch name or `verify` |

A branch counter is never enough to prove work is missing or safe to delete. The reconciliation contract requires commit, patch, blob, symbol, behavior and test evidence.

## Completeness and preservation

| File | Purpose | Read when |
|---|---|---|
| `docs/genesis/COMPLETE_CANON.md` | preserves every accepted system from the full day of R&D | completeness dispute, supersession, architecture collision, or new program design |
| `docs/genesis/ORIGIN_SOURCE_MAP.md` | maps every founding repository, platform and research family into Galaxy | touching an origin, provider, tool, model hub, source or external ecosystem |
| `docs/genesis/CANON_MANIFEST.json` | system IDs, status, dependencies, canonical docs and workstreams | every workstream, but query only matching entries |
| `docs/genesis/PACKAGE_INVENTORY.md` | this loading map | agent orientation only |

## Execution and architecture

| File | Purpose |
|---|---|
| `docs/genesis/WORK_QUEUE.md` | dependency-ordered implementation authority |
| `docs/genesis/META_COMPILER_SPEC.md` | Metacortex destination architecture |
| `docs/genesis/CODEBASE_TWIN_SPEC.md` | repository semantic twin architecture |
| `docs/genesis/FIRST_BUILD_CONTRACT.md` | bounded GX-000 vertical slice |
| `.claude/commands/genesis-next.md` | token-efficient implementation command |
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
1. determine whether the task is implementation or reconciliation
2. for reconciliation, read only the reconciliation contract + seed + exact live refs
3. for implementation, identify workstream ID
4. query CANON_MANIFEST.json by workstream
5. collect direct system IDs and dependencies
6. read binding decisions
7. read active build contract
8. read only canonical docs for those IDs
9. inspect current code, tests, Git and PR evidence
10. freeze one implementation or recovery contract
11. execute and verify one slice
12. update manifest/ledger/status/receipts
13. stop
```

## Completeness rule

A new accepted system is incomplete until it has:

- a Canon Manifest entry;
- a canonical document;
- dependency links;
- an honest status;
- a workstream or explicit research/owner-gate disposition;
- origin and provenance when externally derived.

A branch or PR is unaccounted for until it has:

- a live ledger entry;
- a semantic diff against current `main`;
- ownership for every unique useful unit;
- an explicit recovery, archive, supersession or deletion-after-proof disposition.

## Context rule

The package is intentionally large enough to preserve ambition and modular enough to avoid charging every coding session for that ambition.

The archive is loaded only when needed. The manifest, active contract, reconciliation ledger and exact code evidence drive normal work.
