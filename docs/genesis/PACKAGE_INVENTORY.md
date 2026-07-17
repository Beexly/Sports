# Galaxy Genesis — Package Inventory and Agent Loading Map

This file tells coding and research agents where every kind of information lives and what **not** to read by default.

## One command

```text
/genesis-next GX-000
```

## First-run mandatory files

| File | Purpose |
|---|---|
| `CLAUDE.md` | repository law and current project constraints |
| `GENESIS_START_HERE.md` | package entrypoint and current mission |
| `docs/genesis/FIRST_BUILD_CONTRACT.md` | exact GX-000 implementation contract |
| `docs/genesis/DECISIONS.md` | binding Genesis decisions |
| `docs/genesis/CANON_MANIFEST.json` | machine-readable lookup for GX-000 systems and dependencies |

Do not load the complete canon during a normal GX-000 run.

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
| `.claude/commands/genesis-next.md` | token-efficient orchestration command |

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
1. identify workstream ID
2. query CANON_MANIFEST.json by workstream
3. collect direct system IDs and dependencies
4. read binding decisions
5. read active build contract
6. read only canonical docs for those IDs
7. inspect current code, tests, Git and PR evidence
8. freeze one implementation contract
9. code and verify one slice
10. update manifest/status/receipts
11. stop
```

## Completeness rule

A new accepted system is incomplete until it has:

- a Canon Manifest entry;
- a canonical document;
- dependency links;
- an honest status;
- a workstream or explicit research/owner-gate disposition;
- origin and provenance when externally derived.

## Context rule

The package is intentionally large enough to preserve ambition and modular enough to avoid charging every coding session for that ambition.

The archive is loaded only when needed. The manifest, contract and exact code evidence drive normal implementation.
