# GSE CONSTELLATION WAVE 2
## Formal Intelligence, Causal Learning, Process Conformance, Context Compilation, and Shadow Promotion Directive

**Date:** 2026-07-22  
**Repository:** `Beexly/Sports`  
**Operating mode:** additive-only, delta-only, evidence-first, owner-controlled for irreversible action  
**Primary systems retained:** JARVIS, NOVA, AI Control Plane, CHAIN, ARCHIVE, AUDIT, METER, Genesis Kernel, CONSTELLATION  
**Execution model:** Fable 5 UltraCode for architecture, formal reasoning, concurrency, economics, security, migrations, and adversarial review; Sonnet/local models for bounded implementation after contracts are frozen

---

# 0. Binding instruction

This is a **next-wave delta**, not a replacement plan.

The following prior work remains binding and must not be duplicated, renamed, or rebuilt:

- JARVIS + NOVA Sovereign Intelligence OS;
- CONSTELLATION architecture;
- AI Control Plane PR-A through PR-D;
- Trusted Actor;
- durable checkout attempts;
- settlement evidence and outbox;
- NOVA S1–S3;
- capability governor;
- deterministic convergence inventory;
- Genesis Kernel recovery;
- provider/model registry and call-site inventory;
- Galaxy Agent IR;
- Protocol Composition Firewall;
- AgentBOM;
- Work Arenas;
- compact benchmarks;
- sparse orchestration;
- Artifact Memory and Asset Graph;
- Capability P&L;
- Workflow Distribution Compiler;
- the existing convergence, integration-test, and shadow-operation plan.

The rule is:

> **Consume existing contracts. Add missing leverage. Do not create parallel owners, parallel truth models, parallel dashboards, parallel ledgers, or another wave of generic integration guides.**

Before opening any new implementation PR, the agent must produce a machine-readable delta receipt proving that the proposed unit is not already implemented, in flight, superseded, or owned by another branch.

---

# 1. Current truth and the next real bottleneck

The repository has moved beyond conceptual architecture. Draft implementations now exist for:

- identity and authority;
- durable Stripe intent handling;
- settlement evidence and notification outbox;
- model-transport boundaries;
- AI cost modes;
- invocation, attempt, and attribution ledgers;
- cash reservation;
- credit admission;
- NOVA opportunity, capability, and source contracts;
- deterministic repository convergence tooling;
- the Genesis deterministic plan compiler;
- a typed provider/model registry and deterministic AI call-site inventory.

The remaining bottleneck is not “more agent frameworks.” It is whether the components can be shown to remain correct when:

- hundreds of requests race;
- a process restarts between two writes;
- a provider receives a request but the response is lost;
- cash or credits are almost exhausted;
- data or model behavior drifts;
- the prescribed workflow differs from what actually happened;
- a new provider release changes an interface;
- an agent gains access to a new tool;
- a long-running shadow experiment is inspected repeatedly;
- the coding agent receives too much, too little, or stale context;
- the optimizer discovers a cheaper procedure that is less safe;
- evaluation standards themselves become stale or gameable.

Wave 2 therefore adds **mathematical, causal, operational, and epistemic leverage** around the current architecture.

---

# 2. The new leverage map

| New capability | Existing owner | New value | What it must not become |
|---|---|---|---|
| Formal Invariant Foundry | AUDIT + CHAIN | Proves state-machine and concurrency invariants before code or merge | Another prose architecture document |
| Property/Chaos Conformance | AUDIT | Finds races and partial-failure paths implementation tests miss | Random chaos without reproducible seeds |
| JARVIS Portfolio Solver | JARVIS + METER | Produces feasible work plans under real cash, time, dependency, and WIP constraints | An opaque AI priority score |
| Context Compiler | JARVIS + ARCHIVE + Genesis | Builds deterministic, minimal, current context packs for coding agents | Another vector database or full-repo dump |
| Process Twin | CHAIN + AUDIT | Compares intended workflows with actual execution traces | A second workflow engine |
| Causal Experiment Fabric | PRISM + ASCEND + AUDIT | Separates “correlated with improvement” from “caused improvement” | Automated causal claims from observational data |
| Sequential Evidence Engine | AUDIT | Allows continuous shadow monitoring without invalid repeated peeking | A shortcut around minimum evidence |
| Cognitive SLO / Autonomy Error Budget | METER + AUDIT | Downgrades autonomy when quality, safety, cost, or drift budgets burn | A new autonomy authority |
| Competence Surface | AI Control Plane + AUDIT | Routes by task-specific measured competence, not brand/model hype | A universal model leaderboard |
| Model-Call Elimination Compiler | ASCEND + AI Control Plane | Replaces stable repeated model work with deterministic code when proven | Blind prompt-to-rule conversion |
| Change-to-Test Compiler | NOVA + AUDIT | Converts verified ecosystem changes into targeted compatibility tests | Automatic production mutation |
| Capability Capsules | RELAY + shared policy | Runs approved deterministic tools with no ambient authority | A generic untrusted plugin host on day one |
| Activation Control | JARVIS + CHAIN | Makes shadow/canary/kill-switch state explicit and receipted | Another vendor-specific feature-flag dependency |
| Disclosure Budget | AI Control Plane + RELAY | Measures what data leaves which boundary and why | Logging sensitive content by default |
| Assurance Case Compiler | AUDIT | Turns receipts into customer, partner, grant, and federal evidence packets | Claiming certification or compliance automatically |
| Local Distillation Foundry | PRISM + ASCEND + AUDIT | Converts rights-cleared experience into qualified local continuity | Training on every trace merely because it exists |

No new named council seats are required. These are modules and governed capabilities under existing owners.

---

# 3. Formal Invariant Foundry

## 3.1 Why this is the highest-leverage new layer

The current system contains exactly the kinds of concurrency and ambiguity boundaries that ordinary unit tests routinely miss:

- one invocation must produce no more than one authorized dispatch;
- one budget cannot be reserved beyond its cap;
- one credit balance cannot be concurrently spent twice;
- ambiguous network outcomes must remain financial exposure;
- settlement evidence must not count one retry as multiple corroborations;
- one outbox event must not disappear between domain commit and delivery;
- one owner gate must not be bypassed through a different route;
- one autonomy grant must not survive model, tool, or policy drift beyond its evidence.

These are state-machine properties. They should be written before further activation work as machine-checkable models.

## 3.2 Tooling strategy

Benchmark two complementary approaches:

1. **TLA+ / TLC** for explicit-state checking of finite models.
2. **Apalache** for bounded symbolic checking and inductive-invariant analysis through SMT.

Neither becomes a runtime dependency. Specifications and counterexample receipts live in the repository.

Add **fast-check** to the TypeScript test layer for property-based and model-based implementation conformance. Add **Toxiproxy** only in isolated integration/chaos profiles for deterministic latency, timeout, reset, bandwidth, and connection-loss scenarios.

## 3.3 Initial specifications

Create:

```text
formal/
  ai-invocation/InvocationClaim.tla
  cash-budget/CashReservation.tla
  credit-budget/CreditReservation.tla
  provider-attempt/ProviderAttempt.tla
  checkout/CheckoutAttempt.tla
  settlement/SettlementEpisode.tla
  outbox/TransactionalDelivery.tla
  autonomy/AutonomyGrant.tla
```

Each specification must define:

- state variables;
- initial state;
- legal transitions;
- safety invariants;
- liveness assumptions separately from safety;
- bounded constants used by the checker;
- implementation symbols/PRs the model corresponds to;
- known abstractions and omitted behavior;
- tool/version/checksum;
- model-check receipt hash.

## 3.4 Required safety properties

### Invocation

```text
AtMostOneClaimOwner
AtMostOneExternalDispatchPerAttempt
SameIdDifferentFingerprintNeverExecutes
AmbiguousAttemptStopsFallback
TerminalReplayReturnsSameResultReference
```

### Cash and credits

```text
ReservedPlusSettledNeverExceedsCap
CreditAvailableNeverNegative
AmbiguousExposureNeverAutoReleases
AllScopeReservationsCommitOrRollbackTogether
ProviderIdentityNeverImpliesPayer
```

### Checkout

```text
SameIntentSameFingerprintSameStripeKey
SameIntentDifferentFingerprintConflicts
AmbiguousNetworkOutcomeRetainsKey
CompletedAttemptNeverRegresses
WebhookReplayIsIdempotent
```

### Settlement and delivery

```text
RetryDoesNotCreateCorroboration
OneSourceObservationCountsOnce
ResolvedEpisodeHistoryPersists
DomainCommitCannotLoseOutboxEvent
DeliveryFailureCannotBecomeDelivered
DeadLetterCapCannotBeBypassed
```

### Autonomy

```text
NoSelfApproval
ExpiredGrantCannotExecute
PolicyOrModelDriftInvalidatesGrant
ExternalIrreversibleActionRequiresOwnerReceipt
AuthorityNeverExpandsDuringExecution
```

## 3.5 Implementation conformance

For every formal state transition, create a model-based fast-check command. Generated command sequences should run against:

- pure in-memory reference state;
- repository implementation adapters;
- disposable PostgreSQL where persistence is load-bearing.

When a property fails, fast-check’s minimized counterexample must be preserved as:

```text
reports/formal-counterexamples/<domain>/<receipt-id>.json
```

The coding agent then converts the minimized trace into a permanent regression test.

## 3.6 Chaos matrix

Run deterministic Toxiproxy scenarios at these boundaries:

- application ↔ PostgreSQL;
- application ↔ Stripe test endpoint or local stub;
- control plane ↔ provider adapter stub;
- worker ↔ delivery provider stub;
- source runtime ↔ official-source fixture server.

Fault points:

```text
before request bytes
mid-request
request accepted / response lost
partial response
slow response
connection reset
retry after restart
DB commit succeeded / acknowledgement lost
outbox claimed / worker died
telemetry unavailable
clock skew and lease expiry
```

Every chaos run records its seed and exact toxic configuration.

---

# 4. JARVIS Portfolio Solver

## 4.1 The problem

JARVIS currently has strong deterministic plans and owner gates. It still needs a rigorous way to decide **which feasible combination of work** should be active when cash, credits, owner minutes, model capacity, dependencies, and deadlines conflict.

An LLM should propose objectives, estimates, constraints, and alternatives. It should not be the final feasibility solver.

## 4.2 Solver design

Build an isolated OR-Tools CP-SAT spike behind a GSE-owned interface:

```ts
interface PortfolioOptimizationRequest {
  horizonDays: number;
  workItems: readonly WorkItemCandidate[];
  resourceCapacities: readonly ResourceCapacity[];
  ownerMinuteBudgetByDay: readonly number[];
  cashBudgetMinor: bigint;
  creditPools: readonly CreditCapacitySnapshot[];
  wipCaps: readonly WipCap[];
  hardDependencies: readonly Dependency[];
  mutuallyExclusiveSets: readonly string[][];
  deadlines: readonly Deadline[];
  requiredRiskReviews: readonly ReviewRequirement[];
  objectiveWeights: PortfolioObjectiveWeights;
}

interface PortfolioOptimizationReceipt {
  status: "OPTIMAL" | "FEASIBLE" | "INFEASIBLE" | "UNKNOWN";
  assignments: readonly ScheduledWork[];
  unscheduled: readonly UnscheduledReason[];
  objectiveBreakdown: Record<string, number>;
  hardConstraintResults: readonly ConstraintResult[];
  solverVersion: string;
  modelHash: string;
  timeLimitMs: number;
  generatedAt: string;
}
```

## 4.3 Hard constraints

- prerequisite work precedes dependent work;
- no more than current WIP caps;
- owner decisions require reserved owner minutes;
- no unactivated or expired credits;
- no billable task beyond cash cap;
- no task requiring unavailable credentials;
- no merge/deploy/external action assigned to an agent;
- protected-zone work requires independent review;
- one agent/runtime cannot be scheduled beyond measured capacity;
- deadlines and opportunity half-life are explicit;
- experiments cannot consume production authority.

Hard constraints may never be silently converted into penalties.

## 4.4 Objective dimensions

Optimize a transparent combination of:

- expected first cash;
- expected recurring value;
- loss avoided;
- dependency unlocks;
- owner minutes saved;
- learning value;
- opportunity half-life;
- maintenance cost;
- execution risk;
- reversibility;
- evidence strength.

Return the component values. Do not expose one unexplained “intelligence score.”

## 4.5 Shadow use

Initially, compare the solver’s schedule with the owner/agent schedule. It may not automatically reprioritize live work.

Measure:

- feasibility violations avoided;
- owner minutes predicted versus actual;
- work completed;
- expected versus realized value;
- churn from daily replanning;
- sensitivity to changed assumptions.

Add hysteresis so minor score changes do not constantly reorder the plan.

---

# 5. Context Compiler

## 5.1 Purpose

Premium-model usage is being consumed not only by reasoning, but by repeatedly reconstructing repository context. The next leverage layer is a deterministic **compiler for task-specific context**, not another memory store and not a whole-repository prompt.

Consume:

- #167 convergence inventory;
- #170 Genesis Codebase Twin and plan receipts;
- #171 AI call-site inventory;
- Git history and changed symbols;
- SCIP or TypeScript symbol/reference indexes;
- current PR graph;
- ownership manifest;
- tests and coverage relationships;
- decision and failure receipts;
- current task contract.

## 5.2 Code graph

Benchmark:

- the current TypeScript compiler API;
- SCIP TypeScript indexing;
- Aider-style symbol/reference PageRank.

The compiler should rank context using:

```text
Task relevance
× dependency centrality
× change proximity
× failure/incident relevance
× ownership relevance
× evidence freshness
÷ token cost
```

## 5.3 Context pack

```ts
interface ContextPackManifest {
  packId: string;
  taskId: string;
  repositoryCommit: string;
  baseCommit: string;
  prHeads: readonly PrHeadRef[];
  generatedAt: string;
  compilerVersion: string;
  policyVersion: string;
  tokenBudget: number;
  estimatedTokens: number;
  rootHash: string;
  entries: readonly ContextEntry[];
  omittedCandidates: readonly OmissionReason[];
  staleInputs: readonly string[];
  unresolvedCollisions: readonly string[];
}
```

Every entry includes:

- path and symbol;
- blob hash;
- relevant line range;
- reason included;
- owner;
- dependency edges;
- related tests;
- related decisions/incidents;
- last material change;
- sensitivity/data class.

## 5.4 Content-addressed and incremental

Use content hashes so unchanged context is never re-explained. Produce:

```text
full pack
previous-pack delta
removed entries
new or changed symbols
changed assumptions
changed decisions
```

A downstream model should receive the delta plus stable references when the host supports persistent context.

## 5.5 Acceptance gates

- byte-identical inputs generate byte-identical packs;
- pack never cites a symbol at a different blob hash;
- changed ownership invalidates relevant entries;
- token budget is never exceeded without an explicit overflow result;
- known load-bearing files are present in benchmark tasks;
- irrelevant context is measurably lower than whole-repo or flat grep baselines;
- model task success is equal or better with fewer tokens;
- the compiler records uncertainty rather than claiming completeness after parse failure.

---

# 6. Process Twin and conformance engine

## 6.1 Purpose

CHAIN defines how work should flow. The Process Twin determines how work **actually flowed**.

This is separate from the operational workflow engine. It is an analytical projection over append-only events.

## 6.2 Canonical process event

```ts
interface ProcessEvent {
  eventId: string;
  caseId: string;
  workflowId: string;
  activity: string;
  stateBefore: string | null;
  stateAfter: string;
  actor: TrustedActorRef;
  runId: string;
  taskId?: string;
  observedAt: string;
  recordedAt: string;
  sourceReceiptIds: readonly string[];
  inputFingerprint?: string;
  outputFingerprint?: string;
  authorityReceiptId?: string;
  cashExposureId?: string;
  creditExposureId?: string;
  ownerDecisionId?: string;
  outcome: "SUCCESS" | "FAILED" | "BLOCKED" | "AMBIGUOUS" | "SKIPPED";
}
```

## 6.3 Conformance questions

- Was a required review skipped?
- Did the same task repeat because evidence was lost?
- Was the owner asked before prerequisites were complete?
- Did a workflow enter a state absent from its contract?
- Did a supposedly independent reviewer participate in the original work?
- How long did each handoff wait?
- Which loops consume the most model calls or owner minutes?
- Which tasks repeatedly return from review?
- Which execution variants correlate with better outcomes?

## 6.4 PM4Py posture

PM4Py provides strong process-discovery and conformance concepts, including token replay, alignments, footprints, temporal profiles, and LTL-style checks. Its open-source repository is AGPL-3.0 and offers separate commercial licensing.

Therefore:

- use PM4Py only in an isolated research benchmark unless license review approves product use;
- do not import it into the production application by default;
- keep GSE’s event schema and conformance interface implementation-neutral;
- compare PM4Py results with a small repository-native deterministic checker for required transitions and approval rules.

## 6.5 Outputs

```text
WorkflowFitness
SkippedRequiredStep
UnexpectedStep
RepeatedReworkLoop
FourEyesViolation
TemporalDeviation
OwnerAttentionBottleneck
DeadLetterCluster
UnexplainedStateTransition
```

The Founder OS should show only the highest-value deviations, not a process-mining dashboard dump.

---

# 7. Causal Experiment Fabric and Sequential Evidence Engine

## 7.1 Why ordinary correlation is insufficient

The current system will observe relationships such as:

- local model use coincided with lower cost;
- a new context pack coincided with higher test success;
- a three-agent review coincided with fewer defects;
- an alert coincided with owner action;
- a new pick feature coincided with better calibration.

None proves causation.

## 7.2 Experiment protocol

```ts
interface ExperimentProtocol {
  experimentId: string;
  hypothesis: string;
  causalQuestion: string;
  treatment: TreatmentDefinition;
  control: ControlDefinition;
  unitOfAssignment: string;
  assignmentMethod: "RANDOMIZED" | "SWITCHBACK" | "MATCHED" | "SHADOW_ONLY" | "OBSERVATIONAL";
  primaryMetric: MetricDefinition;
  guardrailMetrics: readonly MetricDefinition[];
  minimumEvidence: MinimumEvidence;
  sequentialMethod?: SequentialMethod;
  causalGraphRef?: string;
  declaredConfounders: readonly string[];
  stoppingRules: readonly StoppingRule[];
  exclusionRules: readonly string[];
  ownerAttentionBudgetMinutes: number;
  cashBudgetMinor: bigint;
  approvedDataUses: readonly string[];
  preregisteredAt: string;
  protocolHash: string;
}
```

## 7.3 DoWhy-style discipline

For observational claims:

1. state the causal graph and assumptions;
2. identify whether the effect is estimable;
3. estimate through an appropriate method;
4. run refutation and sensitivity checks;
5. preserve uncertainty and alternative explanations.

No causal label appears when identification is unsupported.

## 7.4 Continuous shadow monitoring

Ordinary fixed-sample confidence intervals are invalid when an agent repeatedly checks results and stops when they look favorable. Use time-uniform confidence sequences or other explicitly sequential methods for long-running shadow evaluation.

Required status vocabulary:

```text
INSUFFICIENT_EVIDENCE
POSSIBLE_HARM
INCONCLUSIVE
PROMISING_NOT_PROVEN
EFFECT_SUPPORTED_UNDER_ASSUMPTIONS
REFUTED
```

## 7.5 First experiments

1. Context Compiler versus current manual context loading.
2. Local mechanical model versus Sonnet on prequalified task classes.
3. Two-agent builder/reviewer versus one-agent implementation.
4. Solver-generated daily portfolio versus current deterministic queue ordering.
5. Model-call-elimination candidate versus original model path.
6. NOVA change-to-test compiler versus manual compatibility-test selection.

All begin in shadow or isolated worktrees.

---

# 8. Cognitive SLO and Autonomy Error Budget

## 8.1 Cognitive SLO

A service-level objective for an agent capability must include more than uptime.

```ts
interface CognitiveSlo {
  capabilityId: string;
  taskClass: string;
  evaluationWindow: string;
  minimumCorrectness: number;
  minimumGroundedness: number;
  maximumPolicyViolationRate: number;
  maximumUnauthorizedToolRate: number;
  maximumCashLeakageMinor: bigint;
  maximumCreditLeakageMinor: bigint;
  maximumP95LatencyMs: number;
  maximumP95CostMinor: bigint;
  maximumOwnerOverturnRate: number;
  maximumOwnerMinutesPerSuccessfulOutcome: number;
  maximumDriftScore: number;
  requiredCoverage: readonly string[];
  minimumSampleSize: number;
}
```

## 8.2 Error budget

Each autonomy grant consumes an error budget. The system must automatically recommend or enforce a **downgrade** when:

- policy or security violations occur;
- error budget is exhausted;
- input/output distributions drift materially;
- model or tool version changes;
- evaluation coverage becomes stale;
- owner overturn rate rises;
- unexplained cost rises;
- a capability produces an ambiguous irreversible effect.

Downgrade is automatic within current authority. Promotion is not.

## 8.3 Hysteresis

Prevent autonomy from oscillating after one good or bad run:

- downgrade threshold;
- separate higher promotion threshold;
- minimum observation window;
- cooldown after incident;
- mandatory fresh held-out evaluation after model/tool change.

## 8.4 Founder OS output

```text
Capability
Current autonomy level
Evidence window
SLO status
Remaining error budget
Latest drift
Owner overturn rate
Cost per successful outcome
Promotion blocked by
Revocation trigger
```

---

# 9. Competence Surface

## 9.1 Why a model leaderboard is insufficient

No model, framework, or agent is universally best. Competence is conditional on:

- task class;
- repository area;
- tool set;
- context compiler version;
- model version;
- data classification;
- output schema;
- latency and cost boundary;
- reviewer structure.

## 9.2 Competence cell

```ts
interface CompetenceCell {
  subjectType: "MODEL" | "AGENT_ROLE" | "TOOL" | "WORKFLOW" | "SKILL";
  subjectId: string;
  subjectVersion: string;
  taskClass: string;
  contextPolicyVersion: string;
  toolSetHash: string;
  evaluationSuiteId: string;
  attempts: number;
  passAt1: number | null;
  consistencyPassK: number | null;
  brierScore: number | null;
  calibrationError: number | null;
  policyViolationRate: number | null;
  ownerOverturnRate: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  averageTotalCostMinor: bigint | null;
  failureCorrelationCluster?: string;
  observedAt: string;
  expiresAt: string;
}
```

## 9.3 Error correlation

When selecting multiple reviewers, prefer diversity of **failure modes**, not merely different model names.

Measure whether two agents tend to fail on the same cases. A second reviewer with highly correlated errors may add cost without adding assurance.

## 9.4 Routing

The AI Control Plane may use a fresh competence surface to choose among already-policy-admitted candidates. It may not let a competence score override:

- data rights;
- privacy;
- cost mode;
- owner gate;
- capability floor;
- deprecation block;
- missing credit/cash reservation.

---

# 10. Model-Call Elimination Compiler

## 10.1 Purpose

The cheapest, fastest, and most reliable model call is the one that no longer needs a model.

The system should detect tasks where model behavior has stabilized enough to propose deterministic replacement:

- classification with a closed vocabulary;
- normalization;
- extraction with fixed schemas;
- duplicate detection;
- routing from explicit rules;
- static policy checks;
- repeated document formatting;
- repository truth extraction;
- known incident classification.

## 10.2 Candidate contract

```ts
interface DeterminizationCandidate {
  candidateId: string;
  sourceTaskClass: string;
  sourceTraceIds: readonly string[];
  observedAgreementRate: number;
  knownDisagreementClusters: readonly string[];
  proposedReplacementType: "PURE_FUNCTION" | "STATE_MACHINE" | "RULE_SET" | "PARSER" | "LOOKUP";
  proposedArtifactRef: string;
  requiredEvalSuiteId: string;
  expectedModelCallsAvoidedPerMonth: number;
  expectedCashAvoidedMinor: bigint;
  expectedLatencyReductionMs: number;
  rollback: string;
  status: "CANDIDATE" | "SHADOW" | "QUALIFIED" | "REJECTED" | "PROMOTED";
}
```

## 10.3 Promotion gate

- no model-produced rule is accepted without tests;
- held-out and adversarial equivalence pass;
- abstention behavior is preserved;
- deterministic path is shadowed against the model;
- disagreement classes are inspected;
- cost, latency, and maintenance are measured;
- rollback to model path is immediate;
- public/user-facing quality cannot regress.

This becomes a compounding “compute dividend” rather than endless model spend.

---

# 11. NOVA Change-to-Test Compiler

## 11.1 Pipeline

```text
Verified NOVA source receipt
→ material change classification
→ provider/package/protocol/model/program entity
→ Codebase Twin / SCIP dependency blast radius
→ affected task classes and policies
→ targeted compatibility test proposal
→ isolated test generation
→ independent review
→ draft PR or owner packet
```

## 11.2 Change classes

- breaking API;
- deprecation;
- model retirement;
- pricing change;
- quota/limit change;
- terms or data-retention change;
- SDK behavior change;
- security advisory;
- protocol revision;
- credit eligibility change;
- marketplace requirement change.

## 11.3 Required output

```ts
interface ChangeCompatibilityPacket {
  changeReceiptId: string;
  sourceTier: string;
  affectedEntities: readonly string[];
  affectedFilesAndSymbols: readonly SymbolRef[];
  affectedPolicies: readonly string[];
  affectedRevenueOrCostPaths: readonly string[];
  proposedTests: readonly TestProposal[];
  proposedRegistryChanges: readonly RegistryChangeProposal[];
  urgency: string;
  facts: readonly string[];
  inferences: readonly string[];
  unknowns: readonly string[];
  externalActionRequired: boolean;
}
```

NOVA never edits the provider registry directly. It submits a reviewed change packet.

---

# 12. Capability Capsules

## 12.1 Purpose

The capability governor can identify a useful tool, but the system still needs a safer execution form for small deterministic extensions.

Benchmark WebAssembly Component Model/WASI as a capsule format:

- no ambient authority;
- explicit imported host functions;
- portable typed WIT interfaces;
- memory limits;
- time/fuel limits;
- host allowlists;
- no file/network access unless explicitly granted.

## 12.2 Initial scope

Allowed capsule candidates:

- deterministic parsers;
- formatters;
- validators;
- checksum/provenance functions;
- data transformations;
- scoring helpers;
- policy predicates.

Not initial candidates:

- browser control;
- shell access;
- credentialed SaaS tools;
- deployment;
- payment;
- email or social communication;
- arbitrary Python or JavaScript execution;
- self-modifying agents.

## 12.3 Manifest

```ts
interface CapabilityCapsuleManifest {
  capsuleId: string;
  version: string;
  wasmSha256: string;
  witInterfaceHash: string;
  provenanceReceiptId: string;
  sourceLicense: string;
  allowedHostFunctions: readonly string[];
  allowedHosts: readonly string[];
  allowedPaths: readonly string[];
  maximumMemoryBytes: number;
  maximumCpuMs: number;
  maximumOutputBytes: number;
  dataClasses: readonly DataClassification[];
  deterministicExpected: boolean;
  evaluationSuiteId: string;
  rollback: string;
}
```

## 12.4 Benchmark

Compare Wasmtime and Extism in an isolated lab. Record:

- cold start;
- warm call;
- memory overhead;
- host-function enforcement;
- timeout behavior;
- forbidden network/file access;
- deterministic replay;
- language/tooling friction;
- supply-chain/provenance support.

No runtime adoption until a capsule beats the existing pure TypeScript implementation on a real need.

---

# 13. Activation Control

## 13.1 Why env flags are insufficient

The system is accumulating shadow, canary, credit, model, and autonomy gates. Raw environment variables are hard to version, explain, target, audit, and roll back.

Create a GSE-owned activation contract compatible with OpenFeature concepts, initially backed by a signed local/configuration provider.

## 13.2 Activation change set

```ts
interface ActivationChangeSet {
  changeId: string;
  featureKey: string;
  previousVariant: string;
  proposedVariant: string;
  targetingScope: ActivationScope;
  prerequisites: readonly EvidenceRef[];
  ownerDecisionReceiptId: string;
  requestedBy: TrustedActorRef;
  approvedBy: TrustedActorRef;
  effectiveAt: string;
  expiresAt?: string;
  rollbackVariant: string;
  killSwitchKey: string;
  maximumExposure: ExposureLimit;
  monitoringSloIds: readonly string[];
  status: "PROPOSED" | "APPROVED" | "ACTIVE" | "ROLLED_BACK" | "EXPIRED";
}
```

## 13.3 Hooks

Use before/after/error/finally-style hooks for:

- permission validation;
- evidence freshness;
- PII minimization in evaluation context;
- trace/receipt creation;
- exposure counting;
- rollback trigger;
- configuration drift alert.

## 13.4 First flags

```text
nova-source-cycle-shadow
context-compiler-shadow
portfolio-solver-shadow
ai-control-plane-shadow
local-model-shadow
model-call-elimination-shadow
process-conformance-shadow
```

No billable or external action is enabled through these initial variants.

---

# 14. Disclosure Budget and egress ledger

## 14.1 Purpose

Cost is not the only resource consumed by a model or tool call. Every external request may disclose data.

Add a preflight and postflight disclosure receipt:

```ts
interface DisclosureBudgetReceipt {
  receiptId: string;
  taskId: string;
  destinationType: "MODEL_PROVIDER" | "TOOL" | "MCP" | "DATA_SOURCE";
  destinationId: string;
  accountScope?: string;
  region?: string;
  inputDataClasses: readonly DataClassification[];
  includedFields: readonly string[];
  redactedFields: readonly string[];
  transformedFields: readonly string[];
  approximateBytes: number;
  retentionPolicyRef: string;
  trainingUsePolicyRef?: string;
  rightsDecisionId: string;
  purpose: string;
  minimumNecessaryJustification: string;
  authorizedByPolicyVersion: string;
  observedAt: string;
}
```

## 14.2 Controls

- classify before routing;
- redact/minimize before transport;
- use hashes/references instead of content where possible;
- enforce destination and regional constraints;
- no raw prompt/response trace by default;
- compare local-private versus external-free honestly;
- add honeytoken/canary tests in isolated red-team environments;
- no hidden tool-mediated egress.

Founder OS should show high-risk or unexpectedly increasing disclosure, not every routine event.

---

# 15. Assurance Case Compiler

## 15.1 Purpose

The system is producing substantial evidence. That evidence can become commercial leverage when organized as claims, arguments, and receipts.

Build a machine-readable assurance case:

```ts
interface AssuranceClaim {
  claimId: string;
  statement: string;
  scope: string;
  frameworkMappings: readonly FrameworkControlRef[];
  supportingEvidence: readonly EvidenceRef[];
  counterEvidence: readonly EvidenceRef[];
  assumptions: readonly string[];
  status: "UNSUPPORTED" | "PARTIAL" | "SUPPORTED" | "STALE" | "REFUTED";
  evaluatedAt: string;
  evaluatorIndependenceRef: string;
}
```

## 15.2 Initial crosswalks

- NIST AI RMF and Generative AI Profile;
- NIST SSDF 1.1 and AI-specific SP 800-218A;
- current SSDF 1.2 draft as monitored—not final authority;
- OWASP Top 10 for Agentic Applications 2026;
- SLSA 1.2 provenance/source/build concepts;
- internal GSE truth, rights, security, and owner-authority controls.

## 15.3 Honesty boundary

The compiler may say:

```text
Evidence supports control objective X under scope Y as of date Z.
```

It may not say:

```text
GSE is certified, compliant, approved, secure, or government-ready.
```

unless an authorized external authority has established that fact.

## 15.4 Commercial uses

- buyer security packet;
- enterprise procurement packet;
- startup-credit technical packet;
- grant/SBIR technical evidence;
- marketplace review packet;
- partner diligence packet;
- AI Opportunity/Cost/Workflow Audit deliverable;
- agent-governance API or SDK proof.

---

# 16. Local Distillation and Continuity Foundry

## 16.1 Purpose

Local models should improve over time from rights-cleared experience, but not through indiscriminate training.

## 16.2 Dataset admission

Each example needs:

- source and provenance;
- owner/subject consent where required;
- data classification;
- allowed use: retrieval, evaluation, training, redistribution;
- retention;
- teacher model/version;
- task class;
- expected output and grader;
- known failure or correction;
- deduplication fingerprint.

## 16.3 Curriculum

Prioritize examples where:

- local and premium models disagree;
- the local model fails a stable mechanical task;
- the owner corrects a repeatable pattern;
- deterministic validation exists;
- a model call is not yet eliminable but is narrow enough to specialize.

## 16.4 Promotion

```text
baseline
→ candidate fine-tune/LoRA/prompt adapter
→ held-out eval
→ adversarial eval
→ cost/latency/energy measurement
→ shadow execution
→ independent review
→ qualified task classes only
```

No model is promoted globally. Qualification is task-class and hardware specific.

---

# 17. Integration and convergence sequence

## 17.1 Do not interrupt current hardening

The current coding agent should finish its active corrections on #159–#171. New Wave 2 work must avoid editing those branches unless a directly required interface correction belongs there.

## 17.2 New PR sequence

### W2-00 — Delta manifest and plan lock

Create:

```text
reports/constellation-wave2/DELTA_MANIFEST.json
reports/constellation-wave2/CURRENT_PR_GRAPH.json
reports/constellation-wave2/NO_DUPLICATE_RECEIPT.json
```

Prove every proposed module is additive relative to prior master plans and active PRs.

### W2-01 — Seed/parser blocker repair

Fix the pre-existing `packages/db/prisma/seed.ts` syntax issue in a tiny independent PR so #171’s deterministic call-site inventory can become complete.

Do not combine it with AI work.

### W2-02 — Formal specification foundation

Add pure TLA+/Apalache models and model receipts. No production code.

Start with:

- #163 invocation claim;
- #164 cash reservation;
- #166 credit admission/reservation boundary;
- #160 checkout;
- #161 settlement/outbox.

### W2-03 — Property and chaos harness

Add fast-check conformance models and isolated Toxiproxy profile. No normal CI daemon. Run focused chaos in scheduled/manual workflow initially.

### W2-04 — Context Compiler v0

Consume #167, #170, and #171 outputs. Generate deterministic context packs and measure token reduction on historical tasks.

### W2-05 — Process event standard and conformance v0

Define the event contract, adapters for current workflow/AI/outbox traces, and repository-native required-transition checks. PM4Py remains isolated benchmark only.

### W2-06 — JARVIS Portfolio Solver shadow

Build the OR-Tools adapter and deterministic input/output receipt. Compare against historical and current queues without changing them.

### W2-07 — Cognitive SLO and Competence Surface

Build read-only contracts and derived reports from existing eval/trace data. No routing change.

### W2-08 — Sequential shadow evidence

Add preregistered shadow protocols and confidence-sequence calculations for Context Compiler and one low-risk model-routing comparison.

### W2-09 — Change-to-Test Compiler

Consume #169 source change receipts and Context Compiler blast radius. Generate draft tests only.

### W2-10 — Model-Call Elimination candidates

Identify candidate tasks from #171 call sites and traces. Build no replacement until enough measured observations exist.

### W2-11 — Capability Capsule benchmark

Benchmark one deterministic validator in Wasmtime and Extism. Do not create a general plugin marketplace or production host.

### W2-12 — Activation and Disclosure contracts

Pure contracts, local provider, receipts, and tests. No live activation.

### W2-13 — Assurance Case Compiler

Map existing receipts to frameworks and output a truthful internal evidence packet.

### W2-14 — Wave 2 convergence branch

Only after each unit is independently green:

```text
integration/constellation-wave2-shadow-2026-07-22
```

This branch is for cumulative migration rehearsal, integration tests, browser QA, chaos, and shadow operation. It is not a bulk-merge vehicle.

---

# 18. Cumulative integration tests

## IT2-00 — Schema and migration convergence

- apply current `main` migrations;
- apply every candidate migration in intended order;
- run `prisma migrate deploy`;
- compare schema drift;
- rollback through forward-fix rehearsal;
- verify no table/model collisions.

## IT2-01 — Formal-to-code conformance

- model-check specifications;
- run generated command sequences against implementation;
- preserve minimized counterexamples;
- fail if implementation transition is absent from the model or vice versa without an explicit abstraction record.

## IT2-02 — Full invocation/economic path

```text
AiTaskIntent
→ reviewed task policy
→ unique invocation claim
→ provider admission
→ cash or credit reservation
→ exact provider attempt
→ ambiguous/success/failure state
→ reconciliation
→ telemetry and disclosure receipt
```

Test every failure boundary.

## IT2-03 — Credit oversubscription

```text
verified remaining credit = $1.00
100 concurrent requests × $0.02
→ no more than 50 admitted
→ no negative balance
→ ambiguous attempts remain held
```

## IT2-04 — Context correctness

- modify one central symbol;
- ensure context root changes;
- ensure affected tests/owners enter the pack;
- ensure unrelated files do not flood the budget;
- ensure old pack is marked stale.

## IT2-05 — Process conformance

Inject:

- skipped review;
- duplicate retry;
- different-reviewer violation;
- owner prompt before prerequisites;
- repeated dead-letter loop;
- unexpected state transition.

All must be detected and reason-coded.

## IT2-06 — Solver integrity

- impossible schedule returns `INFEASIBLE`, not a relaxed unsafe plan;
- time limit returns `FEASIBLE` or `UNKNOWN` honestly;
- owner-minute and cash constraints remain hard;
- minor input changes do not cause uncontrolled plan churn.

## IT2-07 — Shadow statistics

- repeated peeking does not invalidate evidence method;
- stopping rules are preregistered;
- guardrail harm stops the shadow;
- low sample stays inconclusive;
- no result is relabeled causal without identification.

## IT2-08 — Autonomy decay

- change model version;
- expire eval suite;
- inject drift;
- increase owner overturn rate;
- consume error budget.

The system downgrades or recommends downgrade; it never promotes automatically.

## IT2-09 — Capsule escape attempts

- undeclared host function;
- private-network request;
- forbidden file path;
- memory excess;
- infinite loop;
- oversized output;
- hash mismatch.

Every attempt fails closed with a receipt.

## IT2-10 — Activation rollback

- shadow variant activates only with owner receipt;
- exposure limit reached;
- kill switch fires;
- rollback restores previous variant;
- flag evaluation receipt remains append-only.

## IT2-11 — Assurance traceability

Every supported assurance claim must trace to immutable evidence at exact versions. Removing or staling a receipt downgrades the claim automatically.

---

# 19. Shadow operation sequence

## Shadow 0 — Baseline capture

Duration: enough runs to establish current distributions; do not invent a fixed duration if volume is too low.

Capture:

- task classes;
- context tokens;
- model/provider attempts;
- cash/credit exposure;
- owner minutes;
- review outcomes;
- process variants;
- task success;
- incidents and retries.

## Shadow 1 — Context and process intelligence

Enable only:

- Context Compiler;
- Process Twin;
- Cognitive SLO calculation;
- Competence Surface calculation.

No behavior changes.

## Shadow 2 — Parallel recommendations

Run in parallel:

- current JARVIS ordering;
- Portfolio Solver recommendation;
- current context selection;
- Context Compiler pack;
- current model route;
- candidate route.

Only current production behavior is authoritative.

## Shadow 3 — Internal reversible drafts

Allow qualified agents to:

- create internal work items;
- prepare isolated test patches;
- generate compatibility tests;
- create candidate memories/evals;
- produce draft PRs.

Still prohibit merge, deploy, send, spend, application, publication, account mutation, and production migration.

## Shadow 4 — Promotion packets

For each capability, generate:

```text
baseline
candidate
sample/coverage
quality
cost
latency
policy/safety
owner attention
failure clusters
causal or sequential evidence
rollback
recommended autonomy level
remaining uncertainty
```

Only the owner can approve promotion.

---

# 20. Installation and benchmark discipline

## 20.1 Isolation

Create:

```text
tools/labs/constellation-wave2/
  formal/
  optimization/
  process-conformance/
  causal/
  wasm-capsules/
  chaos/
  context-compiler/
```

Each lab has:

- pinned versions;
- hashes where available;
- license record;
- no production credentials;
- no production network;
- reproducible command;
- benchmark receipt;
- uninstall/rollback instructions.

## 20.2 Candidate installs

### Repository development dependency

- `fast-check`, only after exact version pin, lockfile diff review, and bundle/runtime confirmation that it remains test-only.

### Isolated Python environment

- OR-Tools;
- DoWhy;
- confidence-sequence implementation or repository-native formulas after validation;
- PM4Py benchmark only, with AGPL/commercial-license hold clearly recorded.

### Containers or standalone tools

- TLC/TLA+ tools;
- Apalache;
- Toxiproxy;
- Wasmtime;
- Extism.

### Optional code-index benchmark

- SCIP TypeScript indexer.

No tool becomes a production dependency merely because its benchmark succeeds. Adoption requires a separate change packet comparing maintenance, license, attack surface, performance, and lock-in.

## 20.3 Persistent changes

The agent may install isolated, reversible local lab dependencies. It may not:

- create persistent background services outside the lab;
- open firewall ports beyond local test bindings;
- store credentials;
- connect production accounts;
- enable cloud billing;
- install unreviewed plugins into production agent runtimes.

---

# 21. Premium-usage and token conservation

## Use Fable 5 UltraCode for

- TLA+/state abstraction;
- concurrency invariants;
- cash/credit and ambiguity design;
- causal identification;
- optimizer constraints/objectives;
- authority and security review;
- migration convergence;
- adversarial review of Shadow promotion packets.

## Use Sonnet-class implementation for

- explicit TypeScript contracts;
- adapters;
- deterministic scripts;
- test fixtures;
- integration wiring after architecture freezes.

## Use local models for

- repetitive test generation;
- fixture expansion;
- type/lint repair;
- documentation synchronization;
- context-pack rendering;
- property-test case expansion;
- routine browser QA;
- build-test-repair loops.

## Mandatory token-saving behavior

Before every premium task:

1. load the task contract;
2. load the generated Context Pack or delta;
3. load only affected symbols/tests/decisions;
4. do not load every prior directive;
5. record unresolved questions rather than expanding context blindly;
6. use a premium reviewer to attack the bounded diff, not regenerate the whole solution.

The Context Compiler’s first economic target is to pay for itself through reduced premium context.

---

# 22. Revenue and external leverage

Wave 2 creates additional assets without diverting from first cash:

## Internal-to-service

**AI Workflow Assurance Audit**

- model/provider map;
- cost and credit truth;
- authority and data-egress map;
- process conformance;
- formal invariant inventory;
- shadow/eval plan;
- assurance case.

## Internal-to-product

- Context Compiler API;
- agent Process Twin;
- proof-carrying activation SDK;
- cash/credit exposure engine;
- capability-capsule host;
- agent assurance evidence compiler;
- competence and autonomy error-budget service.

## Partnership/grant/federal leverage

The assurance compiler can package evidence for:

- cloud/startup programs;
- marketplace reviews;
- enterprise security diligence;
- NSF/SBIR technical novelty;
- federal prototype pathways;
- sports-data and technology partners.

These are opportunity hypotheses. No application, partner contact, marketplace submission, or revenue claim occurs without owner action and program-specific verification.

Maintain active WIP:

```text
1 first-cash or launch blocker
1 architecture/correctness repair
1 proof/evaluation lane
```

Wave 2 must reduce—not consume—the founder’s usable capacity.

---

# 23. Immediate coding-agent command

Paste this entire document into the active Fable 5 UltraCode session with the following instruction above it:

```text
Continue from the existing GSE/JARVIS/NOVA/CONSTELLATION work. This is a delta-only next wave.

Do not summarize and stop. Do not reopen completed architecture. Do not rename existing systems. Do not create parallel ledgers, dashboards, memory stores, workflow engines, policy engines, credit models, or agent councils.

First reconcile live GitHub truth and the prior master directives. Build a machine-readable delta manifest proving each new unit is not duplicate, in flight, or owned elsewhere.

Then perform every reversible, currently unblocked engineering task in this order:

1. Fix the isolated Prisma seed parse blocker so the AI call-site inventory can become complete.
2. Add the Formal Invariant Foundry as pure TLA+/Apalache specifications and receipts for invocation, cash, credit, checkout, settlement/outbox, and autonomy.
3. Add fast-check model-conformance tests and an isolated, deterministic Toxiproxy chaos profile.
4. Build Context Compiler v0 from the convergence inventory, Genesis Codebase Twin, call-site inventory, symbol/reference graph, tests, decisions, and ownership. Benchmark task success and token reduction.
5. Define the canonical ProcessEvent and build read-only process-conformance checks. Keep PM4Py isolated behind a license/benchmark gate.
6. Build the OR-Tools JARVIS Portfolio Solver in shadow mode. Hard constraints may never be silently relaxed.
7. Build Cognitive SLO, autonomy error budget, and task-specific Competence Surface read models. No routing or autonomy promotion yet.
8. Add preregistered sequential shadow evaluation and causal-analysis contracts. Never label observational correlation as causal without identification and refutation.
9. Build NOVA Change-to-Test packets that use source receipts and code blast radius to create draft compatibility tests only.
10. Identify Model-Call Elimination candidates; do not promote a deterministic replacement without held-out/adversarial equivalence and shadow proof.
11. Benchmark one deterministic WASI/Wasmtime/Extism capability capsule under strict no-ambient-authority limits.
12. Add pure ActivationChangeSet, DisclosureBudgetReceipt, and AssuranceClaim contracts and tests.
13. Create a cumulative integration branch only after units are independently green. Run migration convergence, formal-to-code conformance, concurrency, chaos, process conformance, shadow statistics, autonomy-decay, capsule-escape, rollback, and assurance-trace tests.
14. Begin shadow operation in the staged order in this directive. No live output or external effect is authoritative.

Use Fable 5 UltraCode on formal abstractions, concurrency, economics, causal inference, security, migrations, and adversarial review. Delegate mechanical implementation only after contracts freeze.

For every unit provide:
- existing asset consumed;
- new delta;
- why it is not duplicate;
- exact owner;
- files and interfaces;
- tests that fail on the prior implementation;
- benchmark or proof receipt;
- rollback;
- agent-owned work;
- owner-only action;
- current truth state.

Do not merge, deploy, apply production migrations, activate billing or credits, send communications, submit applications, publish, connect accounts, install unreviewed production plugins, or mutate production.

Keep going until the only remaining action is genuinely external or irreversible.
```

---

# 24. Required final report

The coding agent must return one consolidated report containing:

1. current `main` SHA;
2. every active PR and dependency edge;
3. delta/no-duplicate receipt;
4. exact new branches and commits;
5. formal specifications and checked invariants;
6. counterexamples found and implementation fixes;
7. property and chaos test results;
8. Context Compiler token/quality benchmark;
9. process-conformance findings;
10. solver feasibility and historical comparison;
11. cognitive SLO and competence coverage;
12. sequential/causal shadow protocol status;
13. change-to-test packets generated;
14. model-call-elimination candidates and projected savings;
15. capability-capsule benchmark;
16. activation/disclosure/assurance evidence;
17. cumulative migration and stack-validation status;
18. exact shadow stage reached;
19. remaining uncertainty and blocked work;
20. owner-ready merge order;
21. owner-only actions;
22. proof that no merge, deployment, production mutation, send, spend, application, publication, or billing activation occurred.

Use exact states:

```text
RESEARCHED
DESIGNED
IMPLEMENTED_ON_DRAFT_BRANCH
CI_GREEN_IN_ISOLATION
FORMALLY_CHECKED_WITH_BOUNDS
STACK_VALIDATED
SHADOW_ACTIVE
PROMOTION_PACKET_READY
MERGED
DEPLOYED
PRODUCTION_VERIFIED
```

Never compress these states into “done.”

---

# 25. Research basis and adoption notes

The following primary or project-maintained sources informed this delta. Revalidate versions before installation.

## Formal verification and testing

- TLA+ / TLC: https://github.com/tlaplus/tlaplus
- Leslie Lamport TLA+ resources: https://lamport.azurewebsites.net/tla/tla.html
- Apalache: https://apalache-mc.org/
- fast-check: https://fast-check.dev/
- Toxiproxy: https://github.com/Shopify/toxiproxy

## Optimization

- Google OR-Tools: https://developers.google.com/optimization
- CP-SAT: https://developers.google.com/optimization/cp/cp_solver
- Scheduling: https://developers.google.com/optimization/scheduling

## Context and code intelligence

- SCIP: https://scip-code.org/
- Aider repository maps: https://aider.chat/docs/repomap.html
- CUE validation: https://cuelang.org/docs/tour/basics/validation/
- CodeQL: https://codeql.github.com/docs/

## Process conformance

- PM4Py: https://github.com/process-intelligence-solutions/pm4py
- PM4Py conformance checking: https://processintelligence.solutions/pm4py/examples/conformance-checking/

## Causal and sequential evidence

- DoWhy: https://www.pywhy.org/dowhy/main/
- Time-uniform confidence sequences: https://arxiv.org/abs/1810.08240
- Off-policy confidence sequences: https://proceedings.mlr.press/v139/karampatziakis21a.html

## Capability isolation

- Wasmtime: https://docs.wasmtime.dev/
- WASI: https://wasi.dev/
- Component Model / WIT: https://component-model.bytecodealliance.org/design/wit.html
- Extism manifest: https://extism.org/docs/concepts/manifest/

## Activation and telemetry

- OpenFeature: https://openfeature.dev/docs/reference/intro/
- OpenFeature hooks: https://openfeature.dev/specification/sections/hooks/
- OpenTelemetry: https://opentelemetry.io/docs/concepts/signals/
- OpenTelemetry feature flag conventions: https://opentelemetry.io/docs/specs/semconv/feature-flags/

## Assurance and supply chain

- NIST AI RMF Generative AI Profile: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence
- NIST SSDF: https://csrc.nist.gov/Projects/ssdf
- OWASP Top 10 for Agentic Applications 2026: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
- SLSA 1.2: https://slsa.dev/spec/v1.2/

---

# 26. Final operating law

> **The next leap is not a larger swarm. It is a system that can prove its critical invariants, solve its resource constraints, compile the minimum correct context, compare intended and actual behavior, learn causally, monitor its own cognitive error budget, eliminate unnecessary model calls, isolate capabilities, and earn promotion through continuous shadow evidence.**

> **NOVA discovers change. JARVIS allocates attention. Genesis compiles feasible plans. The AI Control Plane controls execution economics. CHAIN records the real process. ARCHIVE preserves evidence. AUDIT proves and challenges. METER protects scarce resources. ASCEND improves only through evaluated candidates. The owner retains irreversible authority.**
