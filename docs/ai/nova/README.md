# NOVA — AI Opportunity Intelligence & Venture Engine

NOVA is GSE's governed, zero-cash-first AI ecosystem intelligence layer. It watches approved official sources, records deterministic evidence, detects consequential changes, maps them into a review pipeline, and retains append-only run history without installing, executing, merging, deploying, publishing, purchasing, applying, or contacting anyone.

## Current truth status

| Layer | Status |
|---|---|
| Opportunity/evidence/policy domain foundation | Implemented on the NOVA branch; focused tests exist |
| Official source registry | Implemented; sources default disabled/candidate |
| Static registry validation | Implemented |
| Bounded source polling | Implemented as local Node worker |
| Hard per-source timeout | Implemented through child-process termination |
| Snapshot and change detection | Implemented for release JSON, RSS/Atom metadata, CISA KEV, and structured-page hashes |
| Append-only local runs/events/briefs | Implemented under `.nova-runtime/` |
| Zero-cash deterministic cycle | Implemented; no LLM required |
| Windows scheduled-task scripts | Implemented; preview-only unless owner runs `-Install` and confirms |
| NOVA GSE agent contract | Implemented with `DESIGNED` status and no external authority |
| Canonical council registry entry | Not yet wired; status must not be overstated |
| Production database persistence | Not yet wired |
| Production cron | Not yet wired |
| Cockpit review UI | Not yet wired |
| Automatic integration, install, merge, deploy, publish, spend, applications, or outreach | Prohibited |

## Files

- `data/nova/official-source-registry.json` — official-source candidates and collection policy.
- `scripts/nova/source-doctor.mjs` — registry validation and bounded live source diagnosis.
- `scripts/nova/source-worker.mjs` — isolated one-source worker.
- `scripts/nova/change-intelligence.mjs` — deterministic deltas, urgency routing, and candidate economics.
- `scripts/nova/run-cycle.mjs` — budgeted, append-only local autonomous cycle.
- `scripts/nova/run-cycle.ps1` — Windows logging wrapper.
- `scripts/nova/install-windows-task.ps1` — guarded scheduled-task preview/installer.
- `apps/web/lib/jarvis/nova-agent.ts` — governed GSE agent and subagent authority contract.
- `docs/ai/nova/NOVA_PHASE_2_AUTONOMOUS_INTELLIGENCE_DIRECTIVE_2026-07-21.md` — complete implementation and acceptance directive.

## Validate without network

```powershell
node --test scripts/nova/nova-intelligence.test.mjs
node scripts/nova/source-doctor.mjs
node scripts/nova/run-cycle.mjs --dry-run
```

Static mode validates policy and selects due sources without making a network request or changing local state.

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

The default cycle rotates through at most 12 due sources, uses at most 12 requests and 12 MiB of response data, and has no model/API inference dependency.

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

PowerShell presents a confirmation prompt. The task runs as the current user with limited privileges, ignores overlapping runs, stops after ten minutes, and writes only under `.nova-runtime/`.

## Evidence promotion

A candidate source does not become operational evidence merely because its URL appears in the registry.

1. Registry contract validates.
2. Live request satisfies HTTPS, hostname, redirect, timeout, content-type, and byte rules.
3. First successful fetch establishes a baseline and emits no change.
4. A second successful observation marks the source `OBSERVATION_READY` in local state.
5. Item feeds emit only new or updated canonical items; feed-window disappearance is not treated as deprecation.
6. Structured pages require the same changed summary in two observations before emitting a page delta.
7. Every event retains source, snapshot, parser, timing, hash, and routing evidence.

## Model use

Models are optional downstream analysts. Deterministic collection and evidence truth do not depend on Claude, Codex, OpenAI, Bedrock, Vertex, Groq, Cerebras, or a local LLM.

When model-assisted analysis is later enabled:

- local or explicitly zero-cash lanes run first;
- no silent billable fallback is allowed in zero-cash mode;
- model output is an interpretation, never source evidence;
- model claims must link back to captured primary evidence;
- provider, model, tokens, estimated cost, fallback reason, and billing pool must be recorded.

## Production promotion gates

Do not mark NOVA `DRAFT_ONLY`, register it as a canonical council seat, or enable production scheduling until all of the following exist:

- reviewed persistence contract and migration;
- idempotent production run ledger;
- concurrency lock and stale-run detection;
- source activation review;
- cockpit review queue;
- owner-decision packets;
- alert suppression and incident behavior;
- cost mode enforcement;
- complete CI, guardrail, typecheck, test, and production-build evidence.
