# Galaxy Genesis — Dependency Queue

Status: implementation queue. Each workstream must produce one verified vertical slice and stop.

## Selection law

Choose the highest-leverage unblocked workstream by:

```text
priority = user value
         + proof value
         + reuse across future systems
         + recovery of existing assets
         + risk retired
         - implementation cost
         - duplication risk
         - protected-zone risk
```

Do not begin later work because it is more exciting. Recover existing code, branches, schemas and tests before creating replacements.

## Program spine

### GG-000 — Genesis convergence map

Goal: map current implementation into the Genesis architecture and prevent duplicate systems.

Inspect current main, open PRs, branches and repository artifacts for:

- Evidence and Reality Receipt work;
- SportsIR and temporal-state work;
- Galaxy Twin and Dynasty Studio;
- Agent Foundry and model routing;
- source and rights registries;
- prompt and model evaluations;
- resource discovery and R&D radar;
- data ingestion, edge-lab and experiment infrastructure;
- Hugging Face or local-model doctrine;
- stranded branches and superseded proposals.

Deliverables:

- `docs/frontier/GENESIS_CONVERGENCE_MAP.md`;
- canonical-system-to-existing-symbol table;
- duplicate and conflict map;
- recover/reuse/replace decisions;
- dependency graph for GG-001 onward;
- no production behavior change.

Acceptance:

- every claimed existing capability cites exact files and symbols;
- every missing capability is distinguished from doctrine-only scaffolding;
- no system is marked absent without targeted repository search;
- no broad full-docs scan unless targeted evidence is insufficient.

### GG-001 — Universal Capability Genome v0

Goal: implement the smallest canonical representation for external and internal capabilities.

Required objects:

- capability identity and exact revision;
- artifact type;
- origin and lineage;
- inputs and outputs;
- SportsIR mapping references;
- rights, privacy and security states;
- evaluation and failure references;
- cost, latency and hardware envelopes;
- dependencies, substitutes and complements;
- lifecycle state and rollback metadata.

Deliverables:

- one package-level type/schema module in the architecture selected by GG-000;
- stable deterministic identity/hash;
- validation functions;
- lifecycle transition rules;
- golden tests;
- one adapter projecting an existing repository capability into the Genome;
- no live external artifact download.

Acceptance:

- invalid lifecycle transitions fail closed;
- missing rights/security state cannot masquerade as approved;
- exact revisions are mandatory for reproducible artifacts;
- serialization is deterministic;
- existing registries are adapted rather than duplicated.

### GG-002 — Research Cortex v0

Goal: turn one Capability Gap into a structured, reviewable research mission.

Required objects:

- CapabilityGap;
- ResearchClaim;
- Evidence/replication relationship;
- CandidateCapability;
- ResearchImpactDiff;
- uncertainty and disagreement state.

First vertical slice:

- accept one typed gap;
- search only approved internal candidate registries or static fixtures;
- produce candidate capabilities with lineage and impact;
- preserve disagreement and missing evidence;
- emit no automated adoption decision.

Acceptance:

- citations and replications are not treated as independent by default;
- candidate popularity cannot determine promotion;
- unsupported claims remain unresolved;
- output includes what evidence would change the conclusion.

### GG-003 — Causal Constitution v0

Goal: compile scientific and temporal invariants into executable checks.

Minimum invariants:

- no future information in historical evaluation;
- no causal label without assumptions and refutation evidence;
- no model output promoted to source observation;
- no duplicated source origins counted independently;
- no silent evaluation-population mutation;
- no post-result benchmark selection.

Deliverables:

- machine-readable rules;
- rule evaluator;
- violation receipt;
- adversarial fixtures proving each rule bites;
- integration into the relevant existing guardrail/eval chain.

Acceptance:

- each rule has a plant test that fails before enforcement and passes after;
- violations identify exact object, rule and evidence;
- rules are additive to current trust doctrine and do not weaken it.

### GG-004 — Negative Knowledge v0

Goal: prevent Galaxy and coding agents from rediscovering known failures.

Deliverables:

- NegativeKnowledge schema;
- linkage to capabilities, experiments, PRs and workstreams;
- resurrection-trigger semantics;
- targeted search API;
- initial population from existing failure reports and reverted work;
- tests proving failed approaches surface during relevant planning.

Acceptance:

- a failed approach is not silently recommended as novel;
- resurrection requires a materially changed prerequisite;
- sensitive details remain internal.

### GG-005 — Galaxy Combine v0

Goal: create one evaluation contract usable by models, agents, datasets and tools.

Divisions:

- truth discipline;
- temporal integrity;
- sports competence;
- operational quality;
- portfolio value;
- rights and security eligibility.

First vertical slice:

- one incumbent capability;
- one challenger fixture;
- one task family;
- deterministic scorecard;
- promotion recommendation remains advisory/shadow-only.

Acceptance:

- hard eligibility gates are distinct from scored dimensions;
- unique failure coverage is measured separately from standalone score;
- the result records exact revisions and test cases;
- no production router changes.

### GG-006 — Red Queen Laboratory v0

Goal: implement a reproducible adversarial research loop.

First vertical slice:

```text
hypothesis
→ proposed mechanism
→ experiment contract
→ skeptic challenge
→ adversarial case
→ replication result
→ constitutional judgment
→ product-value disposition
```

Acceptance:

- agents cannot approve their own result;
- failed hypotheses and counterexamples are preserved;
- benchmark/evaluator changes create new revisions;
- no generated research claim reaches public surfaces.

### GG-007 — Galaxy Multiverse v0

Goal: represent observed, epistemic and intervention worlds without duplicating the truth store.

First vertical slice:

- fork one governed historical game state;
- vary one declared intervention;
- retain shared ancestry;
- compute a semantic diff;
- label simulated output clearly;
- emit a replayable receipt.

Acceptance:

- observed and synthetic facts cannot be confused;
- branch ancestry and intervention are explicit;
- historical replay respects knowledge-time cutoffs.

### GG-008 — Proof Fabric v0

Goal: produce a portable Reality Receipt for one existing governed output.

Receipt includes:

- data/source references;
- code revision;
- model/capability revisions;
- temporal cutoff;
- computation identity;
- audience/rights projection;
- output hash;
- verification status.

Acceptance:

- receipt is deterministic for identical inputs;
- private/raw inputs are not leaked;
- verification can detect tampering;
- receipt integrates existing proof/envelope infrastructure.

### GG-009 — Science-to-Product Compiler v0

Goal: convert one validated internal instrument into a build-ready product contract.

Deliverables:

- SportsIR projection;
- API schema;
- failure and unavailable states;
- UI component plan;
- entitlement and rights projection;
- evaluation and monitoring contract;
- Reality Receipt extension;
- coding-agent acceptance tests.

Acceptance:

- no coding agent must invent the science, metric definition, rights or failure behavior;
- generated package remains reviewable and versioned;
- no automatic public deployment.

## Parallel expansion lanes

These remain nested under the program spine and may proceed only when their dependencies exist.

### Neural Foundry / Hugging Face

- HF Hub Genome and webhook impact analysis;
- model/dataset/Space rights and security firewall;
- Galaxy Combine sports benchmark library;
- Latent Sports Atlas;
- time-series shadow league;
- multimodal scene laboratory;
- adapter constellation;
- edge/browser model lane;
- private/public Galaxy Hugging Face organization.

### Research networks

- OpenAlex/Semantic Scholar/OpenReview adapters;
- paper, author, institution, dataset and replication graph;
- cross-domain concept translation;
- research-change impact notifications;
- patent and standards intelligence.

### World Foundry / Dynasty Studio

- paired intervention worlds;
- causal sensitivity scenarios;
- adversarial model worlds;
- synthetic tracking and event streams;
- sim-to-real transfer evaluation;
- Academy and playable research challenges.

### Private federation

- participant data-use contracts;
- federated evaluation and training;
- confidential-compute attestation;
- secure aggregation;
- privacy budgets and revocation;
- cohort comparison without raw-data centralization.

### Edge Swarm

- capability negotiation;
- browser/mobile/desktop execution;
- private local retrieval and Bias Mirror;
- user-owned footage analysis;
- progressive escalation based on uncertainty.

### Interface Compiler

- approved Galaxy component vocabulary;
- Intelligence Contract to component plan;
- evidence, rights and entitlement-aware projections;
- accessibility and reduced-motion invariants;
- Product Twin feedback and promotion of reusable patterns.

### Agent Civilization

- Agent Genome;
- separate role, capability and authority;
- MCP/A2A gateway contracts;
- branch-based self-improvement;
- hidden evaluations and evaluator evolution;
- token, tool and context efficiency scoring.

### Epistemic Contribution Network

- calibrated forecasts and measurements;
- marginal contribution and error independence;
- research bounties;
- negative-result credit;
- external benchmark submissions;
- reputation and compute/API rewards without requiring speculative tokens.

## Session protocol

Every coding session must:

1. inspect current main and open work;
2. select one unblocked workstream;
3. freeze its contract before editing;
4. recover existing assets;
5. implement one vertical slice;
6. run targeted tests, then applicable final gates once;
7. independently verify;
8. update this queue and the convergence map;
9. prepare a branch/PR receipt;
10. stop.

Final receipt:

```text
BASELINE
WORKSTREAM
FROZEN CONTRACT
RECOVERED ASSETS
IMPLEMENTATION
PROTECTED-ZONE DISPOSITION
TESTS AND GUARDRAILS
BRANCH / PR
OWNER GATES
QUEUE UPDATE
NEXT RECOMMENDED WORKSTREAM
TOKEN-DISCIPLINE RECEIPT
```
