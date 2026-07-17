# GX-000 — First Build Contract
## Codebase Twin v0 + Metacortex Plan Compiler v0

**Execution mode:** one bounded Claude Code workstream.

**Production behavior:** unchanged.

**Default branch action:** create a new implementation branch from current `main`; do not merge.

# 1. Mission

Build the smallest complete, tested vertical slice proving that Galaxy can:

1. inspect its existing implementation before inventing another subsystem;
2. represent available capabilities through one canonical contract;
3. compile one Intelligence Contract into multiple candidate execution plans;
4. reject invalid plans through hard policy constraints;
5. choose the best remaining plan using deterministic utility rules;
6. explain selected and rejected plans in a stable Plan Receipt;
7. remain shadow-only with no production consumer.

This is the foundation for every later Genesis workstream.

# 2. No-question rule

Do not ask the founder questions.

Resolve implementation details from:

- current `main`;
- `CLAUDE.md`;
- existing package patterns;
- PR #124, #112 and #52 assets;
- current tests and guardrails;
- conservative reversible defaults.

When a genuinely owner-reserved decision blocks one portion, record an `OWNER_GATE`, omit that portion and complete all non-blocked requirements.

# 3. Context budget

Read only:

1. `CLAUDE.md`
2. `GENESIS_START_HERE.md`
3. `docs/genesis/DECISIONS.md`
4. this file
5. these current surfaces and their direct dependencies:
   - root `package.json`
   - current workspace package conventions
   - model router / provider dispatch / free lane / model economics
   - source rights registry and clearance boundary
   - guardrail entry points
   - Agent Foundry / Resource Radar / Assurance / shadow model router when present on current main or PR #124
   - governed playback/evidence-envelope types when present on current main or PR #112
   - Galaxy world graph only far enough to identify reusable capability metadata from PR #52

Do not read all markdown files. Use narrow symbol and path search.

# 4. Establish current reality

Run and retain concise results:

```bash
git status --short
git branch --show-current
git log -5 --oneline
git remote -v
```

Then inspect:

```bash
gh pr view 124 --json state,isDraft,mergeable,headRefName,baseRefName,commits,files 2>/dev/null || true
gh pr view 112 --json state,isDraft,mergeable,headRefName,baseRefName,commits,files 2>/dev/null || true
gh pr view 52  --json state,isDraft,mergeable,headRefName,baseRefName,commits,files 2>/dev/null || true
```

If GitHub CLI is unavailable, use local refs and repository evidence. Do not stop.

Classify relevant assets:

```text
ALREADY_ON_MAIN
RECOVER_WHOLE
RECOVER_PARTIAL
EXTEND_EXISTING
SUPERSEDED
OWNER_GATE
IRRELEVANT_TO_GX_000
```

Record the classification in the completion receipt and a compact implementation note.

# 5. Protected-zone boundary

GX-000 must not change:

- settlement or grading;
- CLV formulas, sign or population;
- calibration thresholds;
- MODEL_VERSION;
- pick generation;
- source permissions;
- public claims;
- public routes;
- entitlements;
- Stripe;
- production environment variables;
- Prisma schema or migrations;
- deployment configuration;
- live feature flags.

If implementation unexpectedly requires one of these, the design is wrong for v0. Redesign it as a pure shadow/read-only layer.

# 6. Canonical implementation location

Choose one canonical location after inspecting current architecture.

Preferred order:

1. Extend an existing canonical package when PR #124 or current main already owns the capability vocabulary.
2. Otherwise create a focused workspace package, provisionally `packages/genesis-kernel`.
3. Do not put canonical domain logic inside a page or route.

The final receipt must state why the selected location is canonical and which duplicate location was deliberately avoided.

# 7. Required domain contracts

The exact syntax may follow repository conventions, but the semantics are fixed.

## 7.1 Capability descriptor

```typescript
type GenesisCapability = {
  id: string;
  version: string;
  kind:
    | "SOURCE"
    | "TRANSFORM"
    | "DERIVED_MEASUREMENT"
    | "MODEL"
    | "SIMULATION"
    | "AGENT"
    | "HUMAN_REVIEW"
    | "PROOF"
    | "RENDERER";
  purpose: string;
  owner: string;
  implementationState: CapabilityState;
  inputs: readonly TypeRef[];
  outputs: readonly TypeRef[];
  executionProfiles: readonly ExecutionProfile[];
  policy: CapabilityPolicy;
  economics: CapabilityEconomics;
  uncertaintyEffect?: UncertaintyEffect;
  tests: readonly string[];
  provenance: CapabilityProvenance;
};
```

Required state vocabulary:

```text
DOCTRINE_ONLY
SPECIFIED
TYPED_ONLY
IMPLEMENTED_PURE
IMPLEMENTED_PERSISTED
SHADOW_ONLY
FOUNDER_GATED
LIVE_INTERNAL
LIVE_PUBLIC
STRANDED_BRANCH
SUPERSEDED
UNKNOWN
```

## 7.2 Intelligence Contract

```typescript
type IntelligenceContract = {
  contractId: string;
  version: string;
  question: string;
  requiredOutputs: readonly OutputRequirement[];
  temporalCutoff: TemporalCutoff;
  evidencePolicy: EvidencePolicy;
  privacy: PrivacyPolicy;
  uncertainty: UncertaintyPolicy;
  proof: ProofRequirement;
  budget: ResourceBudget;
  audience: AudienceClass;
};
```

## 7.3 Candidate plan

```typescript
type CandidatePlan = {
  planId: string;
  contractId: string;
  nodes: readonly PlanNode[];
  edges: readonly PlanEdge[];
  assumptions: readonly Assumption[];
  hardConstraintResults: readonly ConstraintResult[];
  estimate: PlanEstimate;
};
```

## 7.4 Plan receipt

```typescript
type PlanReceipt = {
  receiptVersion: string;
  plannerVersion: string;
  generatedAt: string;
  repositoryCommit: string;
  codebaseTwinHash: string;
  contractHash: string;
  selectedPlan: CandidatePlan | null;
  rejectedPlans: readonly RejectedPlan[];
  decision:
    | "SELECTED"
    | "ABSTAINED"
    | "NO_VALID_PLAN"
    | "OWNER_GATE";
  proofObligations: readonly ProofObligation[];
  receiptHash: string;
};
```

# 8. Codebase Twin v0

## 8.1 Required snapshot contents

The v0 snapshot must identify at least:

- repository commit;
- workspace packages;
- relevant capability owners;
- model surfaces and provider routes;
- source-rights and clearance boundary;
- relevant feature flags;
- guardrails;
- tests supporting the mapped capabilities;
- implementation-state evidence;
- relevant PR asset summaries when accessible.

## 8.2 Required seed capabilities

Map a bounded set from actual repository evidence, not fabricated capabilities:

1. Anthropic/direct Claude generation path.
2. Bedrock or Vertex provider path when present.
3. Cerebras free-lane path when present.
4. existing model router.
5. source clearance / rights check.
6. an existing deterministic prediction or evidence capability.
7. human review / draft-only boundary.
8. Agent Foundry or Resource Radar capability when recovered from #124.

When a capability is not on current main, represent it as `STRANDED_BRANCH` with branch/PR provenance; do not import it silently.

## 8.3 Collision report

Detect and report at least:

- two systems making the same routing decision;
- one docs claim whose implementation state cannot be supported;
- one stranded capability overlapping planned work;
- one canonical extension point GX-000 should use.

A report may conclude that no collision exists for a category, but it must show the evidence checked.

# 9. Metacortex Plan Compiler v0

## 9.1 Required example contract

Use a safe internal research question such as:

```text
Produce a source-grounded internal game brief from already-vetted evidence,
within a bounded cost and latency budget, without public publication,
using only capabilities currently eligible for shadow or active internal use.
```

Do not use real picks or live data. Use deterministic fixture evidence.

## 9.2 Required candidate plans

Construct at least four candidates from real mapped capability classes:

### Candidate A — approved direct path

Structured vetted evidence → current approved model route → compliance scan → draft output.

### Candidate B — cheaper eligible path

Structured vetted evidence → validated/allowlisted cheaper lane → compliance scan → draft output.

If the cheaper lane is not actually active or validated for the fixture surface, mark the correct status and enforce it.

### Candidate C — policy-invalid path

Include a deliberately invalid candidate, such as:

- unapproved source;
- public output without review;
- local model not activated;
- privacy-incompatible remote execution.

It must be rejected regardless of low cost or high nominal quality.

### Candidate D — abstention / human review

When no model path satisfies the evidence or policy constraints, route to human review or abstention.

## 9.3 Hard constraints

At minimum:

- capability implementation state permits the requested use;
- source/evidence rights permit the purpose;
- temporal cutoff is satisfied;
- privacy policy is satisfied;
- public output requires the existing review/publication boundary;
- cost and latency do not exceed contract ceilings;
- required output type is produced;
- no capability with `DOCTRINE_ONLY`, `SUPERSEDED` or unapproved `STRANDED_BRANCH` state executes.

## 9.4 Deterministic utility

After hard constraints pass, rank valid candidates using a transparent deterministic function covering:

- expected output quality class;
- source/evidence quality;
- uncertainty reduction;
- cost;
- latency;
- resilience/fallback;
- local/privacy benefit;
- operational complexity.

The formula must be named, documented and testable. It is a v0 planning heuristic, not a scientific claim.

## 9.5 Required planner behavior

- identical inputs produce identical semantic plan and receipt hashes;
- `generatedAt` is excluded from semantic hashing;
- changing only cost may select a semantically equivalent cheaper plan;
- changing a hard policy invalidates a plan rather than merely lowering its score;
- no valid candidate produces `NO_VALID_PLAN` or a governed human-review plan;
- the receipt explains every rejection;
- the planner has no execution side effects.

# 10. CLI or script surface

Add repository-native commands, names adjusted to conventions:

```text
npm run genesis:scan
npm run genesis:plan
npm run test:genesis
```

Expected behavior:

- `genesis:scan` emits a deterministic Codebase Twin summary and collision report.
- `genesis:plan` compiles the fixture contract and prints/writes a Plan Receipt.
- generated runtime output goes under an ignored temp/report path unless a small deterministic golden fixture is intentionally committed.

Do not add an always-running service.

# 11. Required tests

At minimum:

## Twin tests

1. identical fixture repository inputs → identical snapshot hash;
2. capability state is derived from supplied evidence, not optimistic default;
3. stranded PR capability remains non-executable;
4. collision report identifies duplicate or overlapping ownership;
5. secrets and environment values are never captured.

## Planner tests

6. policy-invalid cheapest candidate never wins;
7. unapproved source candidate is rejected;
8. temporal-cutoff violation is rejected;
9. privacy-incompatible execution is rejected;
10. valid cheaper equivalent wins when quality floor is satisfied;
11. no valid plan yields governed abstention;
12. selected and rejected plans appear in the receipt;
13. semantic hash is stable across timestamps and object-key order;
14. a semantic contract or capability change changes the hash;
15. planner functions make no network, DB or model call.

## Integration / structural tests

16. no production call site imports the planner;
17. no public route is added;
18. no Prisma change exists;
19. current model and source guardrails remain intact;
20. package exports and workspace commands work from a clean install.

# 12. Verification sequence

During development, run only focused tests.

At completion run:

```bash
npm run test:genesis
npm run typecheck
npm run lint
npm run guardrails
npm run build
git diff --check
```

If the full suite is required by current repository law, run it once after focused tests are green. Redirect verbose output to files and report concise totals/failures.

# 13. Independent review

Use one independent read-only verification pass after implementation.

Review specifically for:

- accidental production integration;
- duplicate Agent Foundry or Resource Radar;
- policy represented as a soft score;
- optimistic capability status;
- unstable hashing;
- hidden time dependence;
- secret capture;
- stale PR assumptions;
- public route, schema or feature-flag changes;
- overclaiming completion of later Genesis systems.

# 14. Documentation updates

Update only compact Genesis state:

- implementation status for GX-000;
- actual canonical paths;
- recovered/extended assets;
- known limitations;
- next unblocked workstream.

Do not rewrite all prior R&D documents.

# 15. Git and PR behavior

- Work on a dedicated branch.
- Never push directly to `main`.
- Create or update one draft PR.
- PR title should identify `GX-000` and `shadow-only`.
- PR body must state zero production behavior change and list verification evidence.
- Do not merge.

# 16. Explicit exclusions

Do not implement:

- full SportsIR;
- full Hub Genome;
- full Agent Civilization;
- external research crawling;
- equality saturation;
- DBSP/differential runtime;
- OPA/Cedar deployment;
- Dafny integration;
- conformal prediction;
- model evaluation or fine-tuning;
- Dynasty simulation;
- dynamic UI;
- public cockpit surface;
- production execution.

Those are later workstreams. v0 proves the common contract.

# 17. Completion receipt

Return no more than 1,200 words:

```text
BASELINE
ASSET CLASSIFICATION
CANONICAL LOCATION
IMPLEMENTATION
CODEBASE TWIN CONTENTS
PLAN COMPILER BEHAVIOR
COLLISIONS / CONVERGENCE
PROTECTED-ZONE DISPOSITION
TESTS AND GATES
BRANCH / DRAFT PR
OWNER GATES
KNOWN LIMITS
NEXT WORKSTREAM
TOKEN-DISCIPLINE RECEIPT
```

The token receipt lists:

- files deliberately read;
- major directories deliberately not scanned;
- subagents used;
- commands run;
- why GX-000 was the maximum-leverage safe slice.

Stop after the receipt.
