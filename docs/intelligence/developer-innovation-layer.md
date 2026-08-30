# Sports OS — Developer / Innovation Layer

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §3.5 · Prompt 4 VS Code / workbench doctrine
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## Purpose

The Developer / Innovation Layer makes Sports OS credible to three audiences:

1. **Builders** — developers who may integrate Sports OS intelligence into their
   own products via a future API
2. **Investors** — stakeholders evaluating the technical depth and defensibility
   of the Sports OS platform
3. **Future partners** — data providers, sports organizations, media companies,
   or analytics firms who may license or co-build with Sports OS

This layer is built through transparency, not marketing. Every methodology page,
source hierarchy explanation, and calibration breakdown builds compounding
credibility that marketing copy cannot replicate.

---

## Operator Workbench Vision

Inspired by VS Code's architecture (command palette, workspace panels, extension
contributions, settings hierarchy, terminal/task/debug surfaces), the Sports OS
operator workbench should eventually feel like a professional intelligence IDE:

| VS Code Concept | Sports OS Translation |
|---|---|
| Command palette | Operator Command Palette — instant access to Brain, research, triage actions |
| Extension contributions | Intelligence Module Registry — pluggable source adapters, research skills |
| Settings / preferences hierarchy | Agent Tool Contracts — per-surface behavior configuration |
| Workspace panels | Cockpit panels — Sources, Calibration, Signal Ledger, Market Twin |
| Terminal / task / debug / log | Brain Observability — agent runs, evidence retrieval, query trace |
| Plugin marketplace | Source Provider Modules — register, inspect, and score data sources |

**Implementation status**: The current cockpit implements a subset of these panels.
The full workbench vision is a multi-phase buildout. Each panel requires its own
approved change proposal before implementation.

---

## Intelligence Module Registry

**Purpose**: A runtime registry of pluggable intelligence modules — source adapters,
research skills, signal processors, and output generators — that can be added,
configured, and scored without modifying core Sports OS logic.

**Existing foundation**: `docs/source-registry-spec.md` defines the Source Registry.
The Intelligence Module Registry extends this concept to all module types.

**Module types**:
- Source adapter (data ingestion from a specific API or feed)
- Research skill (structured research brief generator)
- Signal processor (transforms raw data into Evidence Vault items)
- Output generator (formats Brain answers for specific surfaces)
- Calibration plugin (custom scoring or settlement logic)

**Each module must declare**:
- Module type
- Source tier (for source adapters)
- Input schema
- Output schema
- Freshness TTL
- License and terms
- Allowed-use classification
- Test coverage requirement
- Failure behavior

**Implementation status**: BLOCKED — schema and route changes required.
Proposal must reference `docs/source-registry-spec.md` as the existing foundation.

---

## Future Public Developer Surfaces

All of the following are BLOCKED until the underlying components exist and have
passed internal validation. Do not create any of these routes without approval.

| Surface | Route (proposed) | Prerequisite components |
|---|---|---|
| Source hierarchy page | `/intelligence/source-hierarchy` | Existing source hierarchy doc; low-friction copy work |
| Methodology (expanded) | `/intelligence/how-it-works` | Claim governance, methodology content |
| Calibration transparency | `/intelligence/calibration` | Signal Ledger, 30+ settled picks baseline |
| Entity graph explanation | `/intelligence/entity-graph` | Entity Graph schema and documentation |
| Signal ledger overview | `/intelligence/signal-ledger` | Signal Ledger implementation |
| API documentation | `/docs/api` | Full API implementation, governance, rate limiting |
| Developer examples | `/docs/examples` | API implementation complete |
| Glossary | `/intelligence/glossary` | Content work only — low dependency |

The glossary and source hierarchy page are the lowest-friction entries into
this layer — they require only documentation and copy work, not new schema or routes.

---

## Agent Tool Contracts

Every tool available to an internal agent (research skill, Brain query, source
fetch, calibration run) must have a typed contract:

```ts
// STATUS: PROPOSAL — not implemented.
type AgentToolContract = {
  toolId: string;
  toolType: "research" | "source_fetch" | "brain_query" | "calibration" | "output";
  inputSchema: Record<string, unknown>;   // JSON Schema
  outputSchema: Record<string, unknown>;  // JSON Schema
  requiresApproval: boolean;
  publicSafe: boolean;
  rateLimit?: { maxCallsPerMinute: number };
  failureBehavior: "throw" | "return_empty" | "return_stale";
  auditRequired: boolean;
};
```

**Rule**: No agent tool may be publicly accessible. All agent tooling is
cockpit-internal until an explicit public API is approved and governed.

---

## B2B API Pathway

The future API / B2B layer (Component 15) exposes Sports OS intelligence to
external builders. It is the highest-dependency monetization lane.

**Prerequisites before any B2B API work begins**:
1. Evidence Vault — implemented, tested, stable
2. Entity Graph — implemented, tested, stable
3. Signal Ledger — implemented, tested, stable
4. Claim Governance — implemented, all public claims traceable to evidence
5. Source Transparency — public methodology pages complete
6. API governance — rate limiting, authentication, attribution policy, ToS
7. Lanes 1–2 monetization — operationally stable (business foundation secure)

**API design principles** (for future planning):
- Every API response must carry `sourceTier`, `retrievedAt`, `confidence`, and `publicSafe`
- No API response may fabricate or aggregate data without source attribution
- Rate limiting must be enforced at the API gateway, not at the application layer
- Attribution must be required in ToS for any public display of Sports OS data
- No raw odds redistribution without explicit licensing from The Odds API

---

## Responsible Intelligence Doctrine (Public-Facing)

This is the public statement of what Sports OS is and is not.
It should eventually live at `/responsible-play` (expanded) or
`/intelligence/responsible-intelligence`.

**What Sports OS is**:
- A governed sports intelligence network
- A source-aware, evidence-weighted, auditable system
- A product that shows its work and acknowledges uncertainty
- A platform that tracks model calibration and publishes accountability data

**What Sports OS is not**:
- A guaranteed picks service
- A sharp money insider
- A replacement for your own judgment
- A gambling product
- A tout service

**What Sports OS will never claim**:
- A specific win rate without the calibration data to support it
- "Sharp money is on X" without a specific, verifiable data source
- That any pick is risk-free or guaranteed
- That a rumor is fact without Tier 1 or Tier 2 source confirmation

This doctrine is enforced by:
- `trust-claims.test.ts` — verifies public trust claims are backed by data
- `no-fake-percentages.test.ts` — blocks fabricated win-rate stats
- `brand-voice-vocabulary.test.ts` — blocks casino/hype language
- `public-copy-scanner.test.ts` and `public-copy-scan-strong.test.ts` — scans all routes

---

## Innovation Lab

The Innovation Lab is an internal-only space for prototyping new intelligence
capabilities before they are ready for public surfaces.

**Current lab surfaces** (all cockpit-internal):
- `/cockpit/jarvis/trend` — Jarvis synthesizer trend view
- `/cockpit/calibration` — model calibration cockpit
- `/cockpit/market-twin` — market gravity cockpit
- `/cockpit/agent-runs` — agent run history

**Rule**: No lab surface becomes public without completing the standard
component dependency chain and receiving owner approval. The cockpit is the
sandbox; the public surface is the product.
