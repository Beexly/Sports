# CODEX / CODING-AGENT EXECUTION HANDOFF

## NOVA AI Opportunity Intelligence, Founder OS, GSE Integration, and Revenue Continuation

**Repository:** `Beexly/Sports`  
**Branch:** `codex/nova-ai-opportunity-engine-2026-07-21`  
**Draft PR:** `#146`  
**Canonical product:** Galaxy Sports Edge (`GSE`)  
**Canonical company:** Galaxy Sports Network (`GSN`)  
**Agent:** NOVA  
**Operating posture:** internal, evidence-first, zero-cash by default, owner-controlled external action

---

## 1. Your mandate

Take the current branch from a broad deterministic NOVA foundation to a verified, coherent, internally usable GSE operating layer.

Do not restart the project. Do not replace GSE. Do not create a disconnected concept application. Do not read this document as proof that the branch is healthy. Verify the branch, code, tests, routes, and current repository state directly.

The immediate job is to:

1. establish branch truth;
2. repair branch-caused defects;
3. make the founder operating surface usable inside the GSE cockpit;
4. preserve every requirement, discovery, capability, and owner boundary in typed contracts;
5. implement the smallest production-safe persistence and scheduling slice only after the branch is green;
6. prepare first-cash and cost-avoidance paths without taking external actions;
7. leave reproducible evidence and a compact handoff.

The standard is not “many files” or “autonomous-looking.” The standard is verified leverage: less founder attention, lower cash cost, faster safe execution, better decisions, and measurable outcomes.

---

## 2. Non-negotiable operating boundaries

NOVA and every subagent remain unable to:

- install a discovered package, plugin, model, MCP server, or repository automatically;
- execute discovered code;
- send messages, submit forms, apply to programs, create marketplace listings, or contact third parties;
- accept terms or contracts;
- make purchases, activate billing, connect payout accounts, or use billable fallback under a zero-cash or credits-only policy;
- publish, merge, deploy, or mutate production;
- share data, train models, license data, or redistribute third-party expression without explicit rights review;
- change governance or production scoring weights;
- approve its own output;
- count discovery, eligibility, an application, an award maximum, an estimate, an invoice, or an unpaid balance as cash revenue.

Internal deterministic preparation, read-only research against approved public sources, local tests, draft artifacts, and evidence capture are allowed within the existing policy contracts.

If a new implementation creates an external or irreversible effect, stop and route it to an owner decision.

---

## 3. Start here: establish repository truth

Run this before modifying code:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git merge-base HEAD origin/main
git log --oneline --decorate -20
git diff --stat origin/main...HEAD
```

Confirm that you are on:

```text
codex/nova-ai-opportunity-engine-2026-07-21
```

Then run the lowest-cost evidence ladder:

```bash
npm ci
npm run db:generate
npm run nova:test
npm run nova:runtime:test
npm run lint --workspace=apps/web
npm run typecheck --workspace=apps/web
npm run guard:trust
```

Then run repository gates:

```bash
npm run lint
npm run typecheck
npm test
npm run guardrails
npm run build
```

Do not merge or deploy. PR `#146` remains draft until the branch-wide evidence supports review readiness.

### Failure classification

Classify every failure as exactly one of:

- `BRANCH_CAUSED`
- `BASE_BRANCH_EXISTING`
- `ENVIRONMENTAL`
- `STALE_TEST_OR_FIXTURE`
- `UNKNOWN_NEEDS_REPRODUCTION`

For every branch-caused failure, record:

- failing command;
- file and line;
- root cause;
- smallest coherent repair;
- validation command;
- evidence created;
- whether the repair changes public behavior, rights, money truth, or authority.

Do not hide failures by weakening tests, broad allowlists, disabling rules, or relabeling implemented behavior.

---

## 4. Current branch map

### 4.1 Deterministic opportunity engine

Primary directory:

```text
apps/web/lib/opportunity-engine/
```

Core modules include:

- `types.ts` — opportunity, evidence, economics, risk, lifecycle, and outcome contracts;
- `evidence.ts` — evidence strength and claim separation;
- `scoring.ts` — deterministic opportunity scoring;
- `policy.ts` — authority, rights, security, cash, and review gates;
- `experiment.ts` — bounded experiment contracts;
- `pipeline.ts` — deterministic cycle orchestration;
- `change-detection.ts` — material-change detection;
- `learning.ts` — measured outcomes and calibration without automatic weight changes;
- `lifecycle.ts` — sequential opportunity and money-state transitions;
- `monetization.ts` — proof and metrics for monetization lanes;
- `training-rights.ts` — model, data, benchmark, and redistribution rights gates.

Do not bypass these contracts in new UI, persistence, workers, APIs, or tools.

### 4.2 Source intelligence

Primary modules:

- `source-registry.ts`
- `source-schedule.ts`
- `source-adapters.ts`
- `source-fetch.ts`
- `source-monitor.ts`
- `change-detection.ts`

Scripts:

- `scripts/nova/source-doctor.mjs`
- `scripts/nova/source-worker.mjs`
- `scripts/nova/run-cycle.mjs`
- `scripts/nova/run-cycle.ps1`
- `scripts/nova/change-intelligence.mjs`
- `scripts/nova/install-windows-task.ps1`

The autonomous source path is limited to approved, credential-free, metadata-oriented public sources. Manual program pages remain manual unless their access, terms, and normalization contract are explicitly approved.

### 4.3 Agent and subagent governance

Primary modules:

- `apps/web/lib/jarvis/nova-agent.ts`
- `apps/web/lib/opportunity-engine/nova-agent.ts`
- `apps/web/lib/opportunity-engine/nova-subagents.ts`

NOVA is not yet entitled to production persistence, external execution, or canonical council status merely because its profile exists.

### 4.4 Platform, marketplace, credit, and income maps

Primary modules:

- `platform-ecosystems.ts`
- `platform-ecosystems-extended.ts`
- `personal-ai-income.ts`

Keep these economically separate:

- GSN company revenue;
- GSE product revenue;
- personal contract or participant income;
- prizes and bounties;
- startup credits and grants;
- cost avoidance;
- distribution without native payment;
- negotiated partnerships without a public payout commitment.

### 4.5 Founder Operating System

Primary modules:

- `founder-command.ts`
- `founder-work-seed.ts`
- `requirements-traceability.ts`

Internal UI:

- `/cockpit/nova`
- `/cockpit/nova/founder`

Navigation:

- `apps/web/app/cockpit/layout.tsx`
- `apps/web/components/cockpit/cockpit-command-palette.tsx`

The founder queue limits active work to:

- one revenue implementation;
- two experiments;
- one urgent risk response;
- five daily decisions.

Do not remove these limits to make the system appear more active.

### 4.6 Capability inventory and plugin governor

Data:

- `data/nova/ai-capability-inventory-2026-07-21.json`
- `data/nova/ai-capability-inventory-additions-2026-07-21.json`

Code:

- `capability-inventory.ts`
- `capability-governor.ts`

Captured inventory now accounts for:

- 195 Claude plugins;
- 1,925 nested Claude plugin skills;
- 46 Claude connectors across connected, reconnect-required, and unavailable states;
- 12 personal Claude skills;
- 26 ChatGPT apps/connectors visible in the captured runtime;
- 14 installed ChatGPT skill-pack skills;
- 293 total capability records.

The newest addition contributes:

- 110 Claude plugins;
- 1,243 nested skills.

These are user-reported inventory records, not runtime verification, security approval, quality proof, or permission to invoke them.

### 4.7 User-supplied discovery intake

Data:

- `data/nova/user-supplied-source-intake.json`

Code:

- `source-intake.ts`

The intake preserves:

- 11 Instagram posts/reels as canonical discovery locators;
- 17 HubSpot newsletter redirects as domain, length, line, and SHA-256 metadata only.

Recipient-specific tracking URLs are not retained. No claim has been promoted to verified evidence. Resolve privately and replace material claims with primary sources.

### 4.8 Requirements traceability

Data:

- `data/nova/requirements-traceability-2026-07-21.json`

Code:

- `requirements-traceability.ts`

This ledger maps 22 requirements to code, tests, state, and next action. Treat it as the completeness gate. If you change scope, update the traceability ledger and its tests in the same commit.

---

## 5. Exact execution order

### Phase 0 — Branch convergence and evidence repair

#### What

Make the current branch green or produce a precise, reproducible list of remaining failures.

#### Why

Persistence, scheduling, marketplace work, or model integration built on a failing branch multiplies ambiguity and rework.

#### When

Immediately. No later phase begins first.

#### How

1. Run focused tests, runtime tests, web lint, web typecheck, and trust gate.
2. Download retained diagnostics from `NOVA Verification` when a GitHub run fails.
3. Fix branch-caused defects in small commits.
4. Run full repository CI, tests, guardrails, and build.
5. Review the entire PR diff for stale statements, duplicated contracts, unsupported claims, and hidden authority expansion.
6. Update PR `#146` to reflect observed truth.

#### Done when

- focused NOVA tests pass;
- deterministic runtime tests pass;
- web and repository lint pass;
- web and repository typecheck pass;
- Prisma validation passes;
- workspace tests pass or every non-branch failure is independently reproduced on `main`;
- all guardrails pass;
- production build passes;
- PR description matches the code;
- the PR remains draft unless the owner separately authorizes review-state change.

---

### Phase 1 — Founder OS browser and route validation

#### What

Validate `/cockpit/nova` and `/cockpit/nova/founder` as real internal GSE surfaces.

#### Why

The user asked for NOVA to improve personal execution inside GSE, not merely exist as TypeScript contracts.

#### When

After Phase 0 focused gates are green.

#### How

1. Confirm both routes are covered by cockpit route and nav tests.
2. Run authenticated browser QA at desktop and mobile widths.
3. Verify keyboard navigation through the cockpit command palette.
4. Verify the page renders current counts from the capability and source ledgers.
5. Check empty, partial, and large-data states.
6. Confirm `robots` and admin access remain internal.
7. Confirm no raw tracking link, private data, or owner-only secret renders.

#### Done when

- no browser console errors;
- no hydration errors;
- no inaccessible headings, labels, focus traps, or contrast failures in the new surfaces;
- the page shows what, why, when, how, completion evidence, agent work, and owner work;
- all displayed truth states match source contracts.

---

### Phase 2 — Additive persistence design

#### What

Design and implement the smallest durable NOVA persistence slice.

#### Why

A scheduled intelligence system cannot learn, deduplicate, age evidence, preserve receipts, or measure outcomes from process memory alone.

#### When

Only after Phase 0 and Phase 1 pass.

#### Required additive entities

Use current repository naming and conventions. Do not create these exact names blindly if equivalent models already exist. First audit Prisma and existing JARVIS, resource-intelligence, integrity, source, task, memory, and audit models.

The durable model must cover these concepts:

1. `NovaRun`
   - stable run id;
   - start/end time;
   - trigger;
   - mode;
   - code/version fingerprint;
   - policy version;
   - source counts;
   - error counts;
   - cost and model-use summary;
   - external actions taken = zero unless a future separately authorized mode exists.

2. `NovaSourceSnapshot`
   - source id;
   - observation time;
   - content fingerprint;
   - normalized metadata only;
   - status;
   - conditional request metadata;
   - failure state;
   - rights and terms review state;
   - no raw-body retention unless separately approved.

3. `NovaChangeEvent`
   - event class;
   - materiality;
   - prior/current fingerprint;
   - evidence references;
   - contradiction and uncertainty state;
   - review route;
   - deduplication key.

4. `NovaOpportunity`
   - typed candidate payload;
   - lifecycle state;
   - money state;
   - project fit;
   - deterministic score and scoring version;
   - rights/security status;
   - owner attention estimate;
   - active/held/archive disposition.

5. `NovaEvidenceReceipt`
   - fact, inference, assumption, contradiction, or unknown;
   - source reference;
   - observed/published time;
   - claim supported;
   - directness;
   - freshness;
   - rights status;
   - immutable audit metadata.

6. `NovaExperiment`
   - hypothesis;
   - baseline;
   - budget;
   - owner approval state;
   - metrics;
   - kill criteria;
   - rollback;
   - isolated execution receipt.

7. `NovaOutcome`
   - measured result;
   - revenue, savings, cost, time, quality, and rollback outcomes;
   - evidence references;
   - calibration input;
   - no automatic policy mutation.

8. `FounderDecision`
   - work item id;
   - daily rank;
   - owner minutes requested and used;
   - decision;
   - blocker;
   - evidence;
   - completion state.

9. `FounderAutopsy`
   - plan/completion;
   - blockers;
   - revenue;
   - cash avoided;
   - model spend;
   - lessons;
   - next-day corrections;
   - memory candidate state.

10. `CapabilityEvaluation`
    - capability id and version;
    - task class;
    - exact skill files inspected;
    - permissions requested;
    - context tokens/size;
    - latency;
    - cash cost;
    - repair count;
    - outcome;
    - retain/hold/reject recommendation.

11. `CreditProgramState`
    - discovered;
    - eligibility unverified;
    - eligible;
    - applied;
    - approved;
    - activated;
    - balance;
    - consumed;
    - expired;
    - covered services;
    - expiration;
    - cash displaced;
    - post-credit exit cost.

#### Persistence constraints

- additive migrations only;
- tenant/user boundary explicit;
- admin-only read access for founder surfaces;
- idempotent upsert keys;
- transaction boundaries around run, snapshot, change, and receipt writes;
- scheduler lock and duplicate-run prevention;
- retention policy documented;
- PII, credentials, tokens, full source bodies, private communications, and confidential employment/legal material excluded;
- indexes justified by actual query paths;
- migration tested on a disposable database;
- rollback or forward-fix plan documented.

---

### Phase 3 — Scheduled read-only source operation

#### What

Wire a production-safe, read-only source monitor with receipts.

#### Why

NOVA is valuable only when it detects material changes reliably, cheaply, and with lower noise than manual monitoring.

#### When

After the persistence slice passes migration and transaction tests.

#### How

1. Preserve the allowlisted source registry as canonical.
2. Use due-time and priority scheduling.
3. Acquire a scheduler lock.
4. Fetch only supported metadata without credentials.
5. Enforce HTTPS, host allowlists, redirect rules, content-type rules, byte ceilings, timeouts, and backoff.
6. Normalize, fingerprint, discard raw bodies, and persist receipts.
7. Detect changes deterministically.
8. Route urgent security, deprecation, terms, price, limit, eligibility, and credit events.
9. Create draft review packets.
10. Take zero external action.

#### Required metrics

- source success rate;
- source latency;
- stale source count;
- failure streak;
- bytes read;
- events emitted;
- duplicate events avoided;
- later reviewer-confirmed precision;
- false-positive rate;
- owner attention generated;
- cost by source and run.

---

### Phase 4 — Resolve the 28 user-supplied discoveries

#### What

Resolve the 11 Instagram and 17 newsletter items into verified opportunities, dismissed signals, duplicates, inaccessible records, or rights holds.

#### Why

Founder discoveries should become structured intelligence without lowering evidence or privacy standards.

#### When

After the source-intake ledger and focused tests are green. This can run before production scheduling if performed as a bounded manual research job.

#### How

For each item:

1. identify the subject, product, program, release, offer, or workflow;
2. find the canonical destination or first-party source;
3. capture publication and observation time;
4. separate source statements from inference;
5. review current terms, rights, cost, eligibility, and expiry where relevant;
6. map GSE, GSN, NOVA, XXX, Lumera, or personal fit;
7. assign a final disposition;
8. preserve no recipient-specific tracking token;
9. copy no media and train on no media without rights clearance.

Final dispositions:

- `PROMOTE_PRIMARY_EVIDENCE`
- `SECONDARY_SIGNAL_ONLY`
- `DUPLICATE`
- `STALE`
- `INACCESSIBLE`
- `RIGHTS_HOLD`
- `NO_PROJECT_FIT`
- `OWNER_REVIEW`

---

### Phase 5 — Local coding continuity lane

#### What

Create a local model/runtime lane so subscription exhaustion slows development but does not halt bounded mechanical work.

#### Why

Premium reasoning should be spent on architecture, security, data rights, economics, migrations, and adversarial review rather than repetitive edits and test loops.

#### When

After Phase 0 branch convergence and before another premium quota cycle is consumed by mechanical work.

#### Required sequence

1. Capture hardware truth:
   - operating system;
   - CPU;
   - RAM;
   - GPU and VRAM;
   - free disk;
   - virtualization status;
   - current runtimes.
2. Select one local runtime.
3. Select one model appropriate to measured hardware.
4. Install only after owner approval.
5. Create isolated Git worktrees.
6. Deny secrets, payments, deployment, external communication, and production access.
7. Give the local agent one bounded task with explicit tests.
8. Independently review its diff.
9. Measure success, duration, context size, retries, repairs, and premium tokens avoided.
10. Retain the route only if outcome evidence supports it.

#### Model-role policy

- **Fable / highest-reasoning model:** architecture, migration design, security review, rights, economic truth, adversarial audit, final convergence.
- **Sonnet-class implementation model:** bounded implementation after contracts and tests are explicit.
- **Local coding model:** repetitive edits, fixtures, narrow refactors, documentation, test loops, and deterministic transformations.

Do not use an autonomous loop merely because a plugin exists. `Ralph loop`, `Self improving agent`, `Autoresearch agent`, `Agenthub`, `Superpowers`, and similar candidates remain held until exact files, permissions, stop conditions, and rollback behavior are inspected.

---

### Phase 6 — First-cash AI Opportunity, Cost, and Workflow Audit

#### What

Build the first fixed-scope sellable service using the NOVA method.

#### Why

A service can create customer and cash evidence before a marketplace application or SaaS product has proven demand.

#### Buyer job

For a small business, creator, operator, or professional team:

> Identify wasted AI/software spend, missed credits and program benefits, risky workflows, duplicated tools, automation opportunities, and the smallest implementation sequence with evidence, cost, rights, and owner-action boundaries.

#### Required deliverables

- intake questionnaire;
- current tool/subscription inventory;
- workflow map;
- data and rights inventory;
- cost baseline;
- opportunity ledger;
- risk register;
- credit/program eligibility ledger;
- ranked recommendation packet;
- 30-day implementation roadmap;
- stop/retain/replace decisions;
- evidence appendix;
- one-page executive summary.

#### Internal code to build

- typed audit input;
- deterministic audit normalization;
- evidence receipt format;
- opportunity and cost scoring;
- generated draft report;
- redaction checks;
- acceptance checklist;
- sample anonymized output;
- fulfillment receipt.

#### Owner-only actions

- approve the public claims;
- approve price and payment method;
- create or verify marketplace accounts;
- send outreach or submit profiles;
- accept contracts;
- conduct client calls;
- make final client-facing judgment.

Personal contract income must remain separate from GSN product revenue.

---

### Phase 7 — Observability and evaluation

#### What

Instrument NOVA and founder workflows before increasing autonomy.

#### Why

Without telemetry, the system cannot distinguish useful intelligence from stale retrieval, repeated work, false alerts, context waste, cost drift, or silent permission expansion.

#### Local-first schema

Capture:

- run id;
- task class;
- source and tool calls;
- model and route;
- input/output size;
- latency;
- retries;
- errors;
- cash cost;
- owner minutes;
- evidence created;
- opportunity disposition;
- experiment and outcome linkage;
- redaction version;
- policy version.

#### Candidate trials

Use the capability governor. Do not load the whole observability catalog.

Initial source-inspection candidates:

1. Langfuse
2. SigNoz
3. Honeycomb

Held comparison candidates include Grafana Cloud MCP, Grafana Assistant, PostHog, and ClickHouse. PostHog is a massive captured bundle and must be inspected progressively rather than loaded wholesale.

Compare:

- privacy and redaction;
- self-hosting or free path;
- vendor lock-in;
- data model fit;
- context overhead;
- maintenance;
- exportability;
- cost after free limits;
- ease of removal.

No vendor is selected by plugin count or popularity alone.

---

### Phase 8 — Read-only NOVA ChatGPT app

#### What

Build a dedicated MCP-backed ChatGPT app for NOVA.

#### Why

A chat-native read surface improves founder access and creates a future distribution path while preserving GSE as the canonical evidence system.

#### Preconditions

- stable read models;
- authentication and admin boundary;
- privacy review;
- typed bounded outputs;
- production hosting plan;
- current official Apps SDK documentation reviewed at implementation time.

#### Initial tool surface

Use one job per tool and keep all tools read-only:

- `get_nova_daily_brief`
- `search_nova_opportunities`
- `get_nova_opportunity`
- `list_nova_source_changes`
- `get_nova_evidence_packet`
- `get_credit_program_truth`
- `get_founder_decision_queue`
- `get_capability_route`
- `get_nova_health`

Each tool must:

- have explicit input and output schemas;
- declare read-only, non-destructive, closed-world annotations accurately;
- return only necessary structured content;
- exclude credentials, private source bodies, personal legal/employment data, customer secrets, and internal-only diagnostics not required by the user;
- state freshness and evidence state;
- take no external action.

#### Widget

Build one responsive evidence/decision widget after data tools work. Prefer a decoupled data/render architecture. Include exact CSP domains and no wildcard network access.

#### Validation

- static contract review;
- `/mcp` health check;
- MCP Inspector;
- ChatGPT developer-mode test through HTTPS;
- idempotency and retry tests;
- five positive and three negative review cases;
- privacy, CSP, permission, unsupported-query, and stale-data tests.

Do not claim that ChatGPT supplies native payment for the digital app unless current first-party platform documentation supports that exact claim.

---

### Phase 9 — Portable Agent Skills package

#### What

Package the verified NOVA workflows as a vendor-neutral skill contract with thin wrappers for Claude, ChatGPT/Codex, Copilot, and Grok Build.

#### Why

NOVA should travel across environments without duplicating canonical logic or stuffing every conversation with the full repository.

#### Canonical skills

- source triage;
- primary-evidence verification;
- opportunity review;
- credit truth;
- cost routing;
- plugin inspection;
- experiment design;
- founder daily brief;
- nightly autopsy;
- handoff generation.

#### Context-loading rule

1. mission and authority;
2. current truth and task contract;
3. architecture and relevant schema;
4. task-relevant code and tests;
5. prior decisions and measured outcomes;
6. full repository only when the task requires it.

Every vendor wrapper remains secondary to the canonical contract. Vendor-specific capabilities are adapters, not the source of truth.

---

## 6. Plugin and connector operating policy

### 6.1 Do not activate all 195 plugins

The inventory is a map, not a default prompt payload. Loading all plugins or skill bundles would create:

- context dilution;
- overlapping instructions;
- contradictory workflows;
- hidden tool permissions;
- higher latency;
- more difficult debugging;
- supply-chain exposure;
- false confidence from quantity.

For one task, select no more than three capabilities:

- one primary executor or researcher;
- one independent validator when justified;
- one domain specialist only when the task requires it.

### 6.2 Current provisional routes

These are candidates for inspection, not automatic invocation.

#### Repository implementation

- `Commit commands`
- `Engineering`
- `Code simplifier`

Use `PR review toolkit` as an independent review candidate after implementation.

#### Pull-request review

- `PR review toolkit`
- `Commit commands`

Hold unknown-author or third-party reviewers until inspected.

#### Product UI

- `Frontend design`
- `Figma`
- `A11y audit` after inspection

#### Observability

- `Langfuse`
- `SigNoz`
- `Honeycomb`

#### AWS architecture and credits

- `AWS Startup Advisor`
- `Aws core`
- `Aws amplify`

Use official AWS-authored packs first. Infrastructure work still requires owner approval for installation, credentials, billing, deployment, or account mutation.

#### Security

Candidate inspections:

- `42crunch api security testing`
- `Auth0`
- `Vanta`
- `Security guidance`

Security tooling never receives secrets or production access by default.

#### First-cash service

Candidate inspections:

- `Small Business`
- `Commercial skills`
- `Sales`
- `Pitch Agent`

No candidate can send outreach, create accounts, accept contracts, or transact.

### 6.3 Mandatory holds

Hold until dedicated inspection:

- massive bundles, including `Ecc` and `Posthog`;
- autonomous-loop or self-modifying candidates;
- unknown-author packs;
- scraping/extraction tools;
- deployment and infrastructure tools;
- external communication and CRM tools;
- financial, cap-table, payment, and grant-action tools;
- legal and compliance judgment tools.

A captured author label is not source verification. Read exact files, requested permissions, executable hooks, network behavior, data retention, and update mechanism before use.

---

## 7. Internal API and UI continuation

After persistence is approved, prefer internal read APIs before adding new UI logic directly against Prisma.

Candidate internal routes:

```text
GET /api/cockpit/nova/brief
GET /api/cockpit/nova/opportunities
GET /api/cockpit/nova/opportunities/:id
GET /api/cockpit/nova/changes
GET /api/cockpit/nova/evidence/:id
GET /api/cockpit/nova/credits
GET /api/cockpit/nova/capabilities
GET /api/cockpit/nova/requirements
GET /api/cockpit/nova/health
GET /api/cockpit/nova/autopsies
```

Requirements:

- admin authentication;
- strict response schemas;
- bounded pagination;
- no private raw source content;
- freshness and evidence labels;
- no write side effects in GET handlers;
- no client-side secrets;
- no direct external calls from React rendering;
- tests for unauthorized, empty, stale, partial, and failure states.

Do not create write APIs until a specific internal job requires them and its idempotency, authorization, audit, and rollback contracts are explicit.

---

## 8. Testing ladder

Use this order to reduce wasted time:

1. static contract review;
2. focused unit tests for changed modules;
3. focused NOVA suite;
4. lint for changed workspace;
5. typecheck for changed workspace;
6. deterministic runtime tests;
7. trust and rights guardrails;
8. Prisma validation and disposable migration test;
9. integration tests;
10. authenticated browser QA;
11. full workspaces tests;
12. production build;
13. changed-file review;
14. clean-room reproduction when a milestone claims readiness.

Do not use a broad full-suite failure as a substitute for the smallest reproducible failing test.

### Required new test classes

For persistence and workers, add:

- idempotent rerun;
- duplicate scheduler invocation;
- partial source failure;
- stale evidence;
- source removal;
- contradictory sources;
- oversized response;
- redirect to unapproved host;
- retention and redaction;
- invalid lifecycle jump;
- invalid money-state jump;
- concurrent owner decision;
- transaction rollback;
- expired credit;
- cost overrun;
- no primary payout evidence;
- rights revoked after prior approval;
- plugin route with massive or self-modifying candidate;
- zero-cash mode with attempted billable fallback.

---

## 9. Model and token economy

Every task record should include:

- task class;
- required judgment level;
- expected context size;
- local/Sonnet/Fable route;
- expected tool calls;
- cash budget;
- owner minutes;
- escalation condition;
- outcome evidence.

Use the highest-reasoning model only where a weaker route creates material risk:

- architecture boundaries;
- migration and transaction design;
- security and privacy;
- legal/rights interpretation;
- economic truth;
- multi-system convergence;
- adversarial review;
- final release judgment.

Use bounded implementation models or local models for:

- mechanical edits;
- explicit test implementation;
- fixtures;
- typed adapters;
- formatting;
- documentation synchronization;
- narrow refactors;
- repetitive validation loops.

A model route is retained only after measured task outcomes. Do not infer superiority from model branding or token cost.

---

## 10. Owner-only decision queue

Do not block internal work on these decisions until the next material external action, but surface them clearly:

1. approve installation of a local runtime and model;
2. approve public positioning and price for the first-cash audit service;
3. choose or approve a payment method;
4. approve and personally send outreach or applications;
5. approve account creation, identity verification, tax, banking, or payout setup;
6. approve startup-program submissions and accept terms;
7. approve production hosting, secrets, deployment, and billing;
8. approve data sharing, licensing, model training, or media reuse;
9. approve public ChatGPT app submission and privacy policy;
10. approve merge and deploy after verification.

Present each owner decision as:

- decision required;
- why now;
- options;
- recommended option;
- cost;
- downside;
- reversibility;
- exact next click or action;
- evidence attached.

---

## 11. Commit discipline

Use small coherent commits. Suggested sequence:

```text
fix(nova): resolve focused verification failures
fix(nova): resolve web lint and typecheck failures
fix(nova): align cockpit route coverage and browser behavior
feat(nova): add additive persistence models and migrations
feat(nova): persist source-cycle receipts and change events
feat(nova): expose internal read models and APIs
feat(nova): persist founder briefs and autopsies
feat(nova): add local-first telemetry and evaluation
feat(nova): package first-cash audit generator
feat(nova): scaffold read-only ChatGPT app
feat(nova): add portable skill contract and compatibility fixtures
chore(nova): update traceability, current truth, and handoff evidence
```

Do not combine schema, public copy, unrelated UI, model routing, external integrations, and broad refactors into one opaque commit.

---

## 12. Definition of completion for this coding-agent session

The session is complete only when it produces:

1. exact starting and ending commit hashes;
2. clean or explicitly explained Git status;
3. commands run and outcomes;
4. branch-caused failures repaired or a reproducible unresolved list;
5. focused NOVA test count and result;
6. lint and typecheck result;
7. guardrail result;
8. Prisma and migration result if touched;
9. browser QA result if UI touched;
10. build result;
11. files changed and why;
12. requirements traceability updated;
13. current-truth documentation updated;
14. no external actions taken;
15. no merge or deployment unless separately authorized;
16. owner decisions listed separately from coding work;
17. next smallest verified task.

Use this final report format:

```markdown
# NOVA Execution Report

## Repository state
- Workspace:
- Branch:
- Starting HEAD:
- Ending HEAD:
- Git status:

## Work completed
- ...

## Evidence
| Gate | Command | Result | Receipt |
|---|---|---|---|

## Defects found and repaired
| Severity | Root cause | Files | Validation |
|---|---|---|---|

## Current truth
- Implemented:
- Wired:
- Proven:
- Still unwired:

## Economic truth
- Realized revenue:
- Personal income:
- Activated credits:
- Cash avoided:
- Model/tool spend:

## Owner-only decisions
- ...

## Risks and deferred work
- ...

## Next smallest verified task
- ...
```

---

## 13. Final instruction

Continue autonomously through internal, reversible, evidence-producing work. Do not stop at the first failure. Diagnose it. Reduce it to the smallest reproducible cause. Repair what the branch caused. Record what the base branch or environment caused. Preserve rights, privacy, money truth, and owner authority.

Do not confuse motion with progress. Do not confuse a plugin with a capability, a model with judgment, a program maximum with an asset, a draft with distribution, an invoice with cash, or a large architecture with leverage.

Leave the repository easier to reason about, cheaper to operate, safer to extend, and closer to verified customer or cash evidence than you found it.
