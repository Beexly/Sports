# NOVA — AI Opportunity Intelligence & Venture Engine

NOVA is GSE's governed, zero-cash-first AI ecosystem intelligence layer. It monitors approved official sources, records deterministic evidence, detects consequential changes, maps them into bounded review and experiment pipelines, and helps the founder decide what to do, why, when, and how without acquiring external authority.

NOVA does not install, execute, merge, deploy, publish, purchase, apply, send, accept terms, connect payout accounts, train models, share data, or mutate production automatically.

## Current truth status

| Layer | Status |
|---|---|
| Opportunity, evidence, policy, economics, lifecycle, experiment, and learning foundation | Implemented on the NOVA branch; focused tests exist |
| Official source registry | Implemented with explicit enabled, manual, candidate, terms, rights, and prohibited-capture states |
| Static registry validation | Implemented |
| Bounded credential-free source polling | Implemented as local Node worker |
| Timeout, redirect, content-type, byte, and failure controls | Implemented |
| Snapshot and material-change detection | Implemented for supported normalized source types |
| Append-only local runs, events, and briefs | Implemented under `.nova-runtime/` |
| Zero-cash deterministic cycle | Implemented; no LLM required |
| Windows scheduled-task scripts | Implemented; preview-only unless the owner runs `-Install` and confirms |
| NOVA GSE agent contract | Implemented with `DESIGNED` status and no external authority |
| NOVA cockpit page | Implemented at `/cockpit/nova`; authenticated browser validation remains required |
| Founder Operating System | Implemented at `/cockpit/nova/founder`; persistence and browser validation remain required |
| Founder daily brief, WIP limits, model-role policy, memory layers, and nightly autopsy contracts | Implemented deterministically |
| User-supplied source intake | Implemented for 11 Instagram and 17 privacy-sensitive newsletter discoveries; no verified claims created |
| Claude and ChatGPT capability inventory | Implemented for 293 captured capability records |
| Claude plugin inventory | Implemented for 195 plugins and 1,925 nested skills, including 110 newly supplied plugins |
| Plugin selection and supply-chain governor | Implemented; maximum three inspection candidates per task; no auto-activation |
| Requirements-to-code traceability | Implemented for 22 requirements |
| Personal AI income registry | Implemented as a separate personal earned-income lane, not GSN revenue |
| Canonical council registry entry | Not yet wired; status must not be overstated |
| Production database persistence | Not yet wired |
| Production cron or durable worker | Not yet wired |
| Durable JARVIS decision queue and review receipts | Not yet wired |
| Local coding-continuity runtime | Coding-ready but owner installation and benchmark are pending |
| First-cash audit offer | Coding-ready; public claims, price, payment, outreach, and contracts remain owner-gated |
| Read-only ChatGPT app | Coding-ready; MCP server, widget, hosting, privacy, and submission work remain pending |
| Portable Agent Skills package | Coding-ready; canonical contract and compatibility fixtures remain pending |
| Automatic integration, install, merge, deploy, publish, spend, applications, outreach, data sharing, or model training | Prohibited |

## Primary files

### Doctrine and coding-agent handoff

- `docs/ai/nova/NOVA_AI_OPPORTUNITY_ENGINE_2026-07-21.md` — operating doctrine and architecture.
- `docs/ai/nova/NOVA_PHASE_2_AUTONOMOUS_INTELLIGENCE_DIRECTIVE_2026-07-21.md` — implementation and acceptance directive.
- `docs/ai/nova/CODEX_NOVA_EXECUTION_HANDOFF_2026-07-21.md` — exact coding-agent execution order, boundaries, schema targets, tests, and handoff format.
- `data/nova/requirements-traceability-2026-07-21.json` — requirement, implementation state, code references, tests, and next action.

### Sources and local runtime

- `data/nova/official-source-registry.json` — official-source candidates and collection policy.
- `scripts/nova/source-doctor.mjs` — registry validation and bounded live source diagnosis.
- `scripts/nova/source-worker.mjs` — isolated one-source worker.
- `scripts/nova/change-intelligence.mjs` — deterministic deltas, urgency routing, and candidate economics.
- `scripts/nova/run-cycle.mjs` — budgeted append-only local cycle.
- `scripts/nova/run-cycle.ps1` — Windows logging wrapper.
- `scripts/nova/install-windows-task.ps1` — guarded scheduled-task preview and installer.

### Opportunity, founder, and capability contracts

- `apps/web/lib/opportunity-engine/` — deterministic engine and NOVA domain modules.
- `apps/web/lib/jarvis/nova-agent.ts` — governed GSE agent authority contract.
- `apps/web/lib/opportunity-engine/founder-command.ts` — daily brief, WIP, model lanes, and nightly autopsy.
- `apps/web/lib/opportunity-engine/founder-work-seed.ts` — complete what, why, when, how, proof, agent, and owner work records.
- `apps/web/lib/opportunity-engine/capability-inventory.ts` — normalized Claude and ChatGPT capability inventory.
- `apps/web/lib/opportunity-engine/capability-governor.ts` — bounded task routing and supply-chain holds.
- `apps/web/lib/opportunity-engine/source-intake.ts` — privacy-safe discovery intake.
- `apps/web/lib/opportunity-engine/requirements-traceability.ts` — executable completeness contract.

### Captured data

- `data/nova/ai-capability-inventory-2026-07-21.json` — initial Claude and ChatGPT inventory capture.
- `data/nova/ai-capability-inventory-additions-2026-07-21.json` — 110 additional Claude plugins and 1,243 skills.
- `data/nova/user-supplied-source-intake.json` — 28 discovery items with tracking-safe metadata.

## Validate without network

```powershell
npm run nova:test
npm run nova:runtime:test
npm run nova:doctor
npm run nova:cycle:dry
npm run lint --workspace=apps/web
npm run typecheck --workspace=apps/web
npm run guard:trust
```

`nova:cycle:dry` validates policy and selects due sources without making a network request or changing local state.

## Run one controlled live source

```powershell
node scripts/nova/run-cycle.mjs `
  --source openai-node-releases `
  --max-sources 1 `
  --request-budget 1 `
  --byte-budget 1048576
```

A source failure is recorded as `FAILED_CLOSED`. It is not silently retried through another host or interpreted as evidence that a product is unavailable.

## Run the zero-cash local cycle

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\nova\run-cycle.ps1
```

The default cycle rotates through a bounded number of due sources, enforces request and byte budgets, and has no model or paid-inference dependency.

Runtime outputs remain untracked:

```text
.nova-runtime/
  state.json
  events/YYYY-MM-DD.jsonl
  runs/nova-*.json
  briefs/nova-*.json
  logs/nova-cycle-YYYY-MM-DD.log
```

## Preview Windows scheduling

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\nova\install-windows-task.ps1
```

The command above only prints the proposed task. It does not install anything.

After inspecting the preview, explicit installation is:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\nova\install-windows-task.ps1 `
  -Install
```

PowerShell presents a confirmation prompt. The task runs as the current user with limited privileges, ignores overlapping runs, stops after the configured ceiling, and writes only under `.nova-runtime/`.

## Evidence promotion

A candidate source does not become operational evidence merely because its URL appears in the registry.

1. Registry contract validates.
2. Live request satisfies HTTPS, hostname, redirect, timeout, content-type, and byte rules.
3. First successful fetch establishes a baseline and emits no change.
4. Repeated compatible observations establish observation readiness.
5. Item feeds emit only new or updated canonical items; feed-window disappearance is not automatically a deprecation.
6. Structured pages require stable normalization and repeated evidence before promotion.
7. Every event retains source, snapshot, parser, timing, hash, rights, and routing evidence.
8. Social posts and recipient-specific newsletter links remain discovery-only until replaced by primary evidence.

## Capability selection

Inventory is not approval. Availability, code, permissions, terms, and quality can change.

For one task, NOVA selects no more than three inspection candidates and prefers one primary capability plus an independent reviewer. Massive bundles, autonomous loops, self-modifying skills, unknown authors, scraping, deployment, external communication, financial actions, and legal judgment remain held until dedicated inspection.

Current provisional routes are encoded in `capability-governor.ts` and tested. They do not grant execution authority.

## Model use

Models are optional downstream analysts. Deterministic collection and evidence truth do not depend on Claude, Codex, OpenAI, Bedrock, Vertex, Groq, Cerebras, or a local LLM.

When model-assisted analysis is enabled:

- local or explicitly zero-cash lanes run first for mechanical work;
- no silent billable fallback is allowed in zero-cash or credits-only mode;
- model output is an interpretation, never source evidence;
- model claims link back to captured primary evidence;
- provider, model, tokens, cost, fallback reason, and billing pool are recorded;
- architecture, security, rights, migrations, economic truth, and final convergence receive the strongest available reviewed reasoning;
- repetitive implementation and test loops use the lowest-cost route that has measured adequate outcomes.

## Production promotion gates

Do not mark NOVA `DRAFT_ONLY`, register it as a canonical council seat, or enable production scheduling until all of the following exist:

- reviewed additive persistence contract and migration;
- idempotent production run ledger;
- concurrency lock and stale-run detection;
- source activation review;
- durable cockpit review queue;
- owner-decision packets;
- alert suppression and incident behavior;
- cost-mode enforcement;
- privacy and retention review;
- focused and repository-wide CI, guardrail, typecheck, test, browser, migration, and production-build evidence.
