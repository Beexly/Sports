# Galaxy Codebase Twin — Specification

## 1. Purpose

The Codebase Twin is a deterministic, queryable representation of the repository and its surrounding delivery state.

It exists because Galaxy is already too large for safe implementation by folder browsing and memory alone.

The Twin should let a coding agent answer, before editing:

- Does this capability already exist?
- Which file is canonical?
- Which alternatives are stale, shadow-only, doctrine-only or stranded in a branch?
- Which routes, models, sources, policies and tests depend on this symbol?
- Which protected zones could the change affect?
- What is the smallest coherent file set?
- What proof is required before completion?

## 2. Twin objects

```text
RepositorySnapshot
Commit
Branch
PullRequestAsset
Package
Module
Symbol
Import
Export
Route
ApiEndpoint
DatabaseModel
DatabaseField
Migration
SourceAdapter
RightsFence
EvidenceType
ModelSurface
ModelProvider
Agent
Skill
Capability
FeatureFlag
EnvironmentVariable
Policy
Guardrail
TestSuite
TestCase
DocumentationClaim
Workstream
RuntimeEvidence
DeploymentEvidence
```

## 3. Core relationships

```text
Module IMPORTS Module
Module DEFINES Symbol
Symbol REFERENCES Symbol
Route LOADS Module
Route EXPOSES Field
Route REQUIRES Entitlement
SourceAdapter PASSES_THROUGH RightsFence
SourceAdapter PRODUCES EvidenceType
ModelSurface ROUTES_THROUGH ModelProvider
Agent USES Skill
Skill DECLARES Capability
Capability IMPLEMENTED_BY Symbol
Capability TESTED_BY TestCase
Capability GATED_BY FeatureFlag
Policy ENFORCED_BY Guardrail
DocumentationClaim CLAIMS CapabilityState
PullRequestAsset ADDS_OR_MODIFIES Capability
Migration CHANGES DatabaseModel
RuntimeEvidence SUPPORTS_OR_CONTRADICTS DocumentationClaim
```

## 4. Capability state vocabulary

Every capability receives one canonical state:

```text
DOCTRINE_ONLY
SPECIFIED
TYPED_ONLY
SCAFFOLDED
IMPLEMENTED_PURE
IMPLEMENTED_PERSISTED
SHADOW_ONLY
FOUNDER_GATED
LIVE_INTERNAL
LIVE_PUBLIC
DEGRADED
SUPERSEDED
STRANDED_BRANCH
RETIRED
UNKNOWN
```

The state must be supported by evidence, not inferred from optimistic prose.

## 5. Extraction layers

### Layer A — Git and repository structure

Collect:

- current commit;
- tracked files;
- package boundaries;
- workspaces;
- file hashes;
- recent commits;
- branches and relevant PR metadata when available.

### Layer B — syntax and symbol graph

Initial implementation should reuse the TypeScript compiler API or existing repository tooling when sufficient. A future precise index may use a language-agnostic code-intelligence protocol or incremental parser.

Extract:

- definitions;
- imports and exports;
- call sites;
- route handlers;
- server/client boundaries;
- environment-variable reads;
- feature-flag checks;
- public field selections;
- model and provider calls;
- source fetches;
- policy checks.

### Layer C — data and schema graph

Extract:

- Prisma models and fields;
- indexes and relations;
- migration order;
- write-once values;
- population filters;
- serialization contracts;
- API payload types.

### Layer D — trust and policy graph

Extract references to:

- `checkClearance` and rights snapshots;
- source rights registry;
- entitlement gates;
- public-readiness gates;
- claim and commercial-copy scanners;
- draft-only enforcement;
- model freeze;
- secret scans;
- migration rules;
- owner-only actions.

### Layer E — verification graph

Map:

- tests to symbols and capabilities;
- guardrails to protected behavior;
- integration tests to infrastructure;
- browser/accessibility tests to routes;
- committed reports to exact code and data revisions.

### Layer F — documentation and history

Parse declarations such as:

```text
BUILT
NOT BUILT
SHADOW
WIRED
DOCTRINE ONLY
OWNER GATED
NEXT
DEPRECATED
```

Then compare them against code evidence.

## 6. Canonical queries

The v0 and later Twin should support questions such as:

```text
capability("model routing")
implementationsOf("evidence playback")
publicRoutesExposing("confidence")
sourceFetchesWithout("checkClearance")
modelCallsBypassing("provider-dispatch")
featuresClaimedBuiltWithoutTests()
featuresImplementedButUnreachable()
flagsWithNoConsumer()
consumerPathsFor("Pick.confidence")
migrationsTouching("Pick")
protectedZonesFor(files)
smallestTestSetFor(files)
prsOverlapping(capability)
docsContradictingCode()
```

## 7. Collision detector

A collision is not merely duplicate text. It includes:

- multiple canonical types for the same concept;
- duplicate formulas with diverging semantics;
- separate routers making the same decision;
- a new package recreating an existing shadow capability;
- a doc calling one module canonical while production uses another;
- two feature flags governing the same behavior;
- multiple source registries;
- app-level and package-level implementations of the same math;
- a branch asset that supersedes planned new work.

Every finding records:

```text
collisionId
capability
artifacts
semanticSimilarity
behavioralDifference
risk
recommendedCanonicalOwner
safeDisposition
supportingEvidence
```

## 8. Impact compiler

Given a proposed contract or file change, the Twin emits:

```text
Direct files
Transitive dependents
Data and schema dependencies
Routes affected
Protected zones
Required policies
Relevant tests
Potential branch/PR overlap
Documentation requiring update
Owner gates
```

This becomes the coding agent’s scope boundary.

## 9. Determinism and incrementality

A snapshot must have a stable hash for identical inputs.

```text
snapshotHash = hash(
  commit
  extractorVersion
  normalized object graph
  external PR snapshot identifiers
)
```

A later incremental implementation should update only changed files and affected graph regions.

## 10. Honesty rules

- A document is not proof of implementation.
- A type is not proof of persistence.
- A UI is not proof of a live data path.
- A passing unit test is not proof of production deployment.
- A merged commit is not proof of an applied migration.
- A generated report is not proof of a current run unless its inputs and revision are recorded.
- An open PR is an asset, not current behavior.

## 11. Security and privacy

The Twin stores structural facts, not secrets.

It must not persist:

- environment values;
- credentials;
- raw private payloads;
- user records;
- licensed data bodies;
- hidden model prompts unless separately approved.

It may store secret **names** and policy references.

## 12. v0 boundary

The first version should map only the surfaces required by `GX-000`:

- packages and modules;
- relevant capabilities;
- model routes/providers;
- source rights gates;
- feature flags;
- guardrails;
- tests;
- docs claims;
- PR #124, #112 and #52 asset summaries when available.

It should be designed for extension, not pretend to be complete.

## 13. First consumer

The first consumer is the Metacortex Plan Compiler.

Before generating a plan, it asks the Twin:

- which capabilities already exist;
- what their implementation state is;
- which policies and tests govern them;
- whether the plan would duplicate or bypass canonical infrastructure.

No public UI is required for v0. A deterministic JSON/Markdown report and pure query API are sufficient.
