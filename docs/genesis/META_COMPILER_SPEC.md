# Galaxy Metacortex — Meta-Compiler Specification

## 1. Purpose

The Metacortex converts an Intelligence Contract into a deterministic, policy-valid, proof-carrying execution plan.

It is not an autonomous production executor in v0. It is a planner and evaluator.

The same contract should be capable of targeting multiple execution arrangements without changing its meaning:

- database query;
- streaming incremental computation;
- statistical model;
- neural model;
- causal analysis;
- historical replay;
- simulation;
- edge inference;
- federated or confidential computation;
- human review;
- combinations of these.

## 2. Core design principle

Treat intelligence work like a query optimizer treats computation:

1. define semantics;
2. enumerate valid equivalent plans;
3. reject plans that violate hard constraints;
4. estimate cost, latency, uncertainty and information gain;
5. select a plan;
6. preserve why every alternative was rejected;
7. re-optimize when the world changes.

Unlike a database optimizer, the Metacortex must also reason about:

- source independence;
- rights and permitted purpose;
- privacy and data residency;
- temporal availability;
- epistemic and aleatoric uncertainty;
- model and data lineage;
- human authority;
- causal status;
- proof obligations;
- user comprehension.

## 3. Inputs

### 3.1 Intelligence Contract

```typescript
type IntelligenceContract = {
  contractId: string;
  version: string;
  question: string;
  outputSchema: OutputRequirement[];
  scope: EntityScope;
  temporalCutoff: TemporalCutoff;
  trigger?: TriggerPolicy;
  decisionContext?: DecisionContext;
  requiredEvidence?: EvidenceRequirement[];
  permittedEvidence?: EvidencePolicy;
  privacy: PrivacyPolicy;
  uncertainty: UncertaintyPolicy;
  proof: ProofRequirement;
  budget: ResourceBudget;
  deadline?: string;
  retention: RetentionPolicy;
  audience: AudienceClass;
};
```

### 3.2 World snapshot

The bitemporal state available at planning time:

- entities;
- observations;
- evidence freshness;
- source health;
- active branches;
- model states;
- user and audience entitlements;
- device and infrastructure capabilities.

### 3.3 Capability Genome

Candidate sources, models, transforms, simulations, agents, devices, human workflows and proof systems.

### 3.4 Codebase Twin

The current implementation surface:

- canonical modules;
- existing capability owners;
- tests;
- feature flags;
- routes;
- data paths;
- rights fences;
- model and agent routers;
- branch and PR assets;
- stated versus actual implementation status.

### 3.5 Constitution and policies

Machine-evaluable constraints for rights, privacy, security, temporal integrity, claims, entitlements and authority.

## 4. Plan Intermediate Representation

The Plan IR is conceptually inspired by portable compute-plan formats, but it is sports-intelligence specific.

```typescript
type IntelligencePlan = {
  planId: string;
  contractId: string;
  semanticsHash: string;
  worldSnapshotHash: string;
  nodes: PlanNode[];
  edges: PlanEdge[];
  hardConstraints: ConstraintEvaluation[];
  assumptions: Assumption[];
  unresolvedQuestions: UnresolvedQuestion[];
  expectedOutputs: OutputBinding[];
  estimatedCost: CostEstimate;
  estimatedLatency: LatencyEstimate;
  expectedInformationGain?: number;
  expectedDecisionImpact?: number;
  robustness: RobustnessEstimate;
  proofObligations: ProofObligation[];
  fallbackPlanIds: string[];
  abstention: AbstentionPolicy;
};
```

### 4.1 Plan node classes

```text
SOURCE_PROBE
SOURCE_ACQUIRE
RIGHTS_CHECK
ENTITY_RESOLVE
TEMPORAL_ALIGN
TRANSFORM
DERIVED_MEASUREMENT
RETRIEVE
MODEL_INFER
STATISTICAL_ESTIMATE
CAUSAL_ESTIMATE
SYMBOLIC_DISCOVERY
PROCESS_DISCOVERY
SIMULATE
BRANCH
MERGE_BRANCHES
CALIBRATE
CONFORMALIZE
ROBUST_DECISION
HUMAN_REVIEW
POLICY_CHECK
PROOF_COMMIT
PROJECT_AUDIENCE
RENDER
NOTIFY
PERSIST
ABSTAIN
```

Every node declares:

- input and output SportsIR types;
- capability identity and revision;
- deterministic or stochastic behavior;
- temporal semantics;
- rights transformation;
- privacy transformation;
- resource envelope;
- expected uncertainty change;
- failure states;
- proof output;
- required authority.

### 4.2 Edges

Edges carry typed objects, not opaque strings.

```text
DATA
EVIDENCE
CONTROL
BRANCH
PROOF
POLICY
FEEDBACK
```

## 5. Compilation pipeline

### Stage 1 — Parse intent

Natural language, DSL or visual input is converted to the canonical contract. Ambiguity that changes the output contract is preserved as an explicit unresolved field rather than guessed away.

### Stage 2 — Type and semantic checking

Validate:

- entity scope;
- time semantics;
- units;
- output types;
- privacy class;
- evidence requirements;
- causal language;
- audience projection;
- decision action.

### Stage 3 — Resolve existing capability ownership

Query the Codebase Twin before creating a plan. Determine whether the required function already exists, is shadow-only, doctrine-only, stranded in a branch, duplicated or absent.

### Stage 4 — Build dependency graph

Decompose the desired output into required observations, transformations, measurements, models, uncertainty operations and proof obligations.

### Stage 5 — Generate candidate plans

Generate multiple semantically equivalent or explicitly alternative plans.

Examples:

```text
Official API → deterministic transform → current engine
Licensed dataset → local model → conformal interval
On-device embedding → server reranker
Historical replay → causal estimator
Dynasty simulation → real-world transfer check
Human review instead of unsupported model inference
```

### Stage 6 — Rewrite and simplify

Apply safe equivalence rules:

- push rights checks before acquisition;
- push audience projection before expensive generation when outputs are not entitled;
- reuse already-computed canonical measurements;
- combine identical source probes;
- remove transformations that cancel;
- use an approved derived measurement instead of repeating its raw pipeline;
- choose local processing when it satisfies the same semantics and privacy policy;
- replace a premium model with a validated cheaper equivalent;
- split progressive outputs from later expensive refinements.

Every rewrite must preserve declared semantics and produce an explanation.

### Stage 7 — Hard-policy elimination

Reject any candidate violating:

- source rights or permitted purpose;
- privacy or residency;
- temporal cutoff;
- evidence independence requirements;
- model activation status;
- security or sandbox policy;
- user entitlement;
- public-claim policy;
- human approval requirements;
- production-change restrictions.

A hard-policy rejection cannot be overcome by utility score.

### Stage 8 — Estimate plan utility

Candidate utility may include:

```text
expected uncertainty reduction
expected decision loss avoided
probability result changes the decision
source independence gain
model error-diversity gain
reusability
privacy benefit
resilience benefit
user comprehension benefit

minus

monetary cost
latency
energy
compute
operational complexity
license burden
security exposure
cold-start cost
maintenance burden
```

The weights depend on the contract, not one global formula.

### Stage 9 — Robust decision analysis

The selected plan must indicate whether its output is stable across:

- current epistemic branches;
- plausible probability distributions;
- source or model removal;
- defined distribution shifts;
- measurement uncertainty;
- latency in unresolved evidence.

Possible results:

```text
ROBUST_ACTION
ROBUST_WATCH
ROBUST_ABSTENTION
BRANCH_DEPENDENT
MORE_INFORMATION_REQUIRED
NO_VALID_PLAN
```

### Stage 10 — Plan Receipt

Emit a deterministic receipt containing:

- contract and version;
- world snapshot and temporal cutoff;
- selected plan;
- candidate plans;
- policy evaluations;
- rejected alternatives and reasons;
- cost and uncertainty estimates;
- assumptions;
- unresolved dependencies;
- capability revisions;
- proof obligations;
- planner version;
- plan hash.

### Stage 11 — Incremental re-optimization

A plan can be invalidated by:

- new evidence;
- source staleness;
- rights change;
- model degradation;
- device capability change;
- cost change;
- user entitlement change;
- deadline proximity;
- branch collapse;
- code or capability revision.

Only affected plan regions should be reconsidered.

## 6. Deep-uncertainty behavior

The planner must not force one probability where the knowledge state only supports a set.

Supported representations should eventually include:

- point probability with calibration record;
- interval probability;
- conformal prediction set;
- credal / ambiguity set;
- weighted world branches;
- unweighted admissible branches;
- unknown.

The decision layer should support:

- expected utility when justified;
- minimax loss;
- minimax regret;
- distributionally robust optimization;
- threshold stability;
- value of waiting;
- value of information;
- abstention.

## 7. Active sensing and experiment design

When a decision is unstable, the planner identifies the observation or experiment with the highest expected information value under budget and deadline.

Candidate actions may be:

- obtain another independent source;
- wait for an official report;
- add a modality;
- run a higher-fidelity model;
- retrieve analogous historical cases;
- run a targeted simulation;
- request human review;
- do nothing because the information will arrive too late or cannot change the decision.

## 8. Execution placement

Equivalent plan nodes may target:

```text
BROWSER
MOBILE
DESKTOP
LOCAL_SERVER
EDGE_NODE
CLOUD_JOB
DEDICATED_ENDPOINT
CONFIDENTIAL_ENCLAVE
FEDERATED_PARTICIPANT
HUMAN_OPERATOR
```

Placement considers privacy, data residency, hardware, latency, energy, cost and authority.

## 9. Capability sandbox

External or generated capabilities should eventually expose typed component interfaces and explicit permissions:

```text
filesystem: none | read paths | write paths
network: deny | allowlisted domains
secrets: named references only
database: none | read projection | bounded writes
external actions: none | declared actions
compute: cpu/gpu/memory/time ceilings
```

The planner may not infer ambient authority from the host process.

## 10. Verification obligations

Protected plan rules should eventually have machine-checkable specifications.

High-priority proof obligations:

- temporal cutoff is preserved through every node;
- prohibited evidence cannot reach an output;
- audience projection cannot expose gated fields;
- one source origin cannot masquerade as independent corroboration;
- plan rewrites preserve output semantics;
- abstention occurs when no valid plan exists;
- selected-side identity is stable;
- plan hash changes on any semantic change;
- rejected candidates cannot execute.

## 11. v0 implementation boundary

The first implementation includes:

- typed contract;
- typed capability descriptors;
- plan candidate generation for a bounded example;
- hard-constraint evaluation;
- deterministic cost/utility ranking;
- selected plan plus rejected alternatives;
- stable plan hash;
- no side effects;
- no production consumer.

It does not include:

- equality-saturation dependency;
- distributed execution;
- model calls;
- source calls;
- schema migration;
- dynamic UI generation;
- automatic promotion;
- causal inference engine;
- production routing.

The architecture allows these later without demanding them now.
