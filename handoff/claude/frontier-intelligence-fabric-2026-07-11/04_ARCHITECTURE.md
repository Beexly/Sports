# 04 — Architecture

Two diagrams. The first is validated against code (CURRENT). The second is the
program's destination (TARGET) — nothing in it is claimed as built.

## CURRENT — governed decision spine (validated 2026-07-11)

```mermaid
flowchart LR
  subgraph Sources
    ODDS[The Odds API<br/>approved_api]
    RIGHTS[Scraping Clearance Engine<br/>rights-gated sources]
  end
  ODDS --> ING[Ingestion runs<br/>packages/ingestion-pipeline]
  RIGHTS --> ING
  ING --> ENGINE[Prediction engine<br/>sealed method]
  ENGINE --> GATE[GateDecision<br/>SCORING / PUBLISHED / GATED]
  GATE --> RECEIPTS[PickProofReceipt<br/>frozen pre-kickoff]
  RECEIPTS --> SLATE[SlateCommitment<br/>slate root]
  GATE --> SETTLE[Settlement + CLV grading<br/>settle-sport.ts]
  SETTLE --> PUBLIC[Public proof projection<br/>/engine /proof /verify /clv /performance<br/>method-opaque, CI-enforced]
  subgraph Cockpit [Jarvis cockpit — deterministic, owner-gated]
    REG[Capability registry]
    COUNCIL[Agent Council 23 seats<br/>no autonomy]
    TASKS[CockpitTask / CockpitDecision<br/>AgentHandoff / SubagentRun]
    MEM[Memory store — built,<br/>not activated owner-gated]
  end
  SETTLE --> Cockpit
  GATE --> Cockpit
```

Key invariant: everything public is an outcome or a commitment; the method
never crosses the projection boundary (pinned in `sealed-engine.test.ts`).

## TARGET — Galaxy Intelligence Fabric (design only)

```mermaid
flowchart TB
  JARVIS[Jarvis control plane<br/>policy · routing · approvals · cost · audit]
  JARVIS --> TRUTH[Truth & Evidence plane<br/>sources, snapshots, rights, knowability]
  JARVIS --> GENOME[Decision Genome plane<br/>candidates, dissent, aperture, replay]
  JARVIS --> EXEC[Agent & Execution plane<br/>manifests, routes, sandboxes, artifacts]
  JARVIS --> LEARN[Memory & Learning plane<br/>episodes, doctrine, calibration outcomes]
  JARVIS --> MEDIA[Experience & Media plane<br/>public proof, GSN, studio]
  JARVIS --> GOV[Governance & Economics plane<br/>license, privacy, budget, claims]
```

The program's chain (each arrow already exists or is being built behind flags):

```
approved source → snapshot → evidence/claim → candidate ledger → Decision
Genome → dissent → aperture → sealed receipt → result → calibration →
reviewable memory → improved route/policy
```

## Workstream placement

| Workstream | Plane | Module |
|---|---|---|
| A Truth reconciliation | Governance | registry/docs/tests (done) |
| B R&D Radar | Governance + Truth | `lib/resource-intelligence/radar/` |
| C Agent Foundry | Agent & Execution | `lib/agent-foundry/` |
| D Setup Assurance | Governance | `lib/assurance/` |
| E Model Router (shadow) | Agent & Execution | `lib/ai-routing/` |
