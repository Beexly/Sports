# Sports OS — Intelligence Routing

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §3–4 · Cross-cutting
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/intelligence/product-ecosystem.md` — 15-component dependency map
- All `docs/brain/` files — component-level doctrine referenced here

---

## Purpose

Intelligence Routing describes how a question, signal, or claim moves through
the Sports OS intelligence network — from intake to output. It is the wiring
diagram in prose and schema form.

CC-1 documented each of the 15 components individually. This document describes
how they interact: what flows between them, in what order, and under what rules.

No component is an island. Every output is downstream of multiple inputs.
Understanding the routing layer is prerequisite to building any component
correctly — because a component built in isolation, without awareness of what
feeds it and what it feeds, will break at the integration boundary.

---

## The Three Flow Types

All intelligence in Sports OS follows one of three fundamental flow patterns:

```
FLOW 1 — SIGNAL INTAKE (bottom-up)
  External world → Source Acquisition Mesh → Evidence Vault
  → Entity Graph → Signal Ledger → [processing components]
  → [user-facing surfaces]

FLOW 2 — QUERY RESPONSE (request-driven)
  User/operator question → Research Lab / Ask the Brain
  → Entity Graph + Evidence Vault + Signal Ledger
  → Claim Governance → Output surface

FLOW 3 — SETTLEMENT FEEDBACK (top-down)
  Game outcome (Tier 1/2) → Pick Settlement → Signal Ledger
  → Calibration Feedback Loop → Prediction Engine + Source Mesh
```

These flows are not sequential stages in a pipeline — they run continuously
and in parallel. A signal being ingested in Flow 1 at 10:00 AM coexists with
a query being answered in Flow 2 and a settlement being processed in Flow 3.

---

## Flow 1 — Signal Intake (Bottom-Up)

This is how raw information from the world becomes usable intelligence.

### Stage 1A — Source Acquisition

**Component**: Source Acquisition Mesh (Component 5)
**Doctrine**: `docs/brain/source-acquisition-mesh.md`

- The Mesh polls registered sources at their configured update frequency
- Only registered, licensed, healthy sources are polled
- Fetch results are stamped with `retrievedAt` timestamp
- Unhealthy sources (DEGRADED, STALE, UNAVAILABLE) are flagged — their
  data is not forwarded until health recovers
- Tier 5 (community) signals enter a separate cockpit-only stream
  and never mix with the main evidence pipeline

**Output**: Raw source payload + source metadata (tier, health, retrievedAt)

### Stage 1B — Evidence Normalization

**Component**: Evidence Vault (Component 6)
**Doctrine**: `docs/brain/evidence-vault.md`

- Raw payload is parsed into a normalized `EvidenceItem`
- Each item receives: sourceId, sourceTier, entityType, entityId, claimType,
  observedAt, retrievedAt, validUntil (calculated from TTL), confidence,
  publicSafe flag
- Contradiction check: if a new item contradicts an existing item of
  equal or lower tier on the same claim, the new item is marked
  POSSIBLE_CONTRADICTION and flagged for review
- If the new item is Tier 1 and contradicts a prior Tier 1 item on the same
  claim: flag as CONFLICTED, raise operator alert
- Items that pass normalization are written to the Evidence Vault

**Output**: Normalized EvidenceItems in the vault, with freshness and
contradiction status

### Stage 1C — Entity Resolution

**Component**: Entity Graph (Component 7)
**Doctrine**: `docs/brain/entity-graph.md`

- Every EvidenceItem references one or more canonical entities
- Entity resolution maps the evidence to the correct Entity Graph node
  (player, team, game, market, injury, etc.)
- If an entity is referenced but not in the graph → a new graph node is
  created and flagged NEW_ENTITY for operator review
- Relationships between entities are updated (e.g., new injury entity
  linked to player entity, player entity linked to game entity)

**Output**: Evidence items linked to canonical entity nodes;
entity graph relationships updated

### Stage 1D — Signal Ledger Entry

**Component**: Signal Ledger (Component 8)
**Doctrine**: `docs/brain/signal-ledger.md`

- Every EvidenceItem that is successfully normalized and entity-resolved
  generates a SIGNAL_RECEIVED ledger event
- The ledger event records: evidenceId, sourceId, entityIds affected,
  claimType, retrievedAt, tier, freshness, contradictionStatus
- The Signal Ledger is append-only — events are never deleted or modified

**Output**: SIGNAL_RECEIVED event in the ledger

### Stage 1E — Market Gravity Calculation

**Component**: Market Gravity (Component 9)
**Doctrine**: `docs/brain/market-gravity.md`

- Triggered when Tier 4 (market) evidence arrives for a game
- Market Gravity synthesizes: opening line, current line, movement size,
  movement speed, book disagreement, implied probability shift
- Produces: market pressure score, volatility warning, movement explanation,
  confidence adjustment recommendation, risk adjustment recommendation
- Market Gravity output is an input to picks and Brain answers — it is not
  a surface in itself

**Output**: MarketGravitySignal per game, updated on each Tier 4 refresh

### Stage 1F — Weak Signal Processing

**Component**: Weak Signal Engine (Component 4)
**Doctrine**: `docs/brain/weak-signal-engine.md`

- Runs in a separate stream from the main evidence pipeline
- Monitors registered Tier 5 channels for keyword and sentiment spikes
- When a threshold is crossed: creates a WeakSignalAlert in the cockpit
- Every WeakSignalAlert triggers a Tier 1 verification check:
  is there any Tier 1/2 corroboration for this claim?
  - If yes → the Tier 1 evidence enters Flow 1A as normal
  - If no → alert stays cockpit-only; it never enters the evidence vault
- Tier 5 signals that are not corroborated after 30 minutes are marked EXPIRED

**Output**: WeakSignalAlerts in the cockpit (never in the evidence vault or
on public surfaces)

---

## Flow 2 — Query Response (Request-Driven)

This is how a user or operator question becomes an answered, sourced,
claim-governed response.

### Stage 2A — Question Intake

**Component**: Ask the Brain (Component 3) or Research Lab (Component 11)
**Doctrine**: `docs/brain/ask-the-brain.md`, `docs/brain/research-lab.md`

**Ask the Brain** handles structured Q&A — "What is this player's injury
status?", "Why did this line move?"

**Research Lab** handles operator-authored research briefs — deeper, longer-form
structured intelligence documents

- Question is parsed to extract: sport, league, entities mentioned, claim types
  being asked about
- The question enters the query router (Stage 2B)
- Research Lab briefs are operator-initiated and follow the same routing

### Stage 2B — Entity and Evidence Retrieval

**Components**: Entity Graph (7) + Evidence Vault (6)

- Extracted entities are resolved against the Entity Graph
- All EvidenceItems linked to those entities are retrieved from the vault
- Evidence is filtered by: freshness (within TTL), tier, publicSafe flag
  (filtered by surface type — cockpit vs. public), contradiction status

**Output**: A ranked evidence set for the query, with freshness and tier metadata

### Stage 2C — Market Context Injection

**Component**: Market Gravity (9)

- If the query touches a game-related entity, the current MarketGravitySignal
  for that game is injected into the evidence set
- Market context is labeled "MARKET_SIGNAL" — not treated as evidence of fact
- Market Gravity is supporting context, not a primary evidence source

**Output**: Evidence set + market gravity context

### Stage 2D — Answer Construction

**Component**: Ask the Brain (3) / Research Lab (11)

- Evidence is ranked by tier, freshness, and relevance to the question
- The BrainAnswer or ResearchBrief is constructed:
  - Summary of what the evidence says
  - Confidence level (LOW / MEDIUM / HIGH) — not a numeric score for Brain answers
  - Stated weaknesses: what would change this answer
  - Evidence citations: every claim has a sourceId and tier citation
  - What is NOT known: gaps in evidence explicitly stated
- Model output (Claude API) is used for prose construction only — it is Tier 6
  and does NOT constitute evidence

**Output**: Draft BrainAnswer or ResearchBrief

### Stage 2E — Claim Governance Check

**Component**: Claim Governance (Component 12 / `docs/brain/claim-governance.md`)

- Draft output is scanned for forbidden claim types:
  - Sharp money claims without Tier 1/2 data
  - Certainty language ("confirmed", "guaranteed")
  - Injury status claims without Tier 1 backing
  - Fabricated specificity (exact stats not in evidence)
- Stale evidence check: any Tier 1/2 item beyond its TTL marks the
  answer with FRESHNESS_WARN
- publicSafe check: if the surface is public, any cockpit-only evidence
  is excluded from the displayed answer
- If governance passes → answer is approved
- If governance fails → answer is WITHHELD with a failure reason

**Output**: Approved or WITHHELD answer with governance status

### Stage 2F — Signal Ledger Entry

**Component**: Signal Ledger (8)

- If approved: ANSWER_PUBLISHED ledger event
- If withheld: ANSWER_WITHHELD ledger event with reason
- The Signal Ledger records every answer — approved and withheld alike

**Output**: ANSWER_PUBLISHED or ANSWER_WITHHELD event in ledger

### Stage 2G — Surface Delivery

**Component**: Operator Cockpit (10) or user-facing surface

- Approved answers are delivered to the appropriate surface
- Cockpit: full answer including Tier 5 context, contradiction flags,
  staleness warnings, governance notes
- Public surface: publicSafe content only, with freshness disclosure,
  source tier labels, confidence level, weaknesses stated
- Elite surface: full PRO content + early access + alerts

---

## Flow 3 — Settlement Feedback (Top-Down)

This is how game outcomes flow back into the system to improve future picks.

### Stage 3A — Settlement Trigger

**Source**: Tier 1 or Tier 2 confirmation of game outcome

- System polls for game completion confirmation after expected game-end time
- Trigger condition: Tier 1/2 source confirms final score
- If no confirmation within 6 hours: SETTLEMENT_PENDING flag on all active
  picks for that game; operator alert raised

### Stage 3B — Pick Settlement

**Component**: Picks Intelligence (Component 1)
**Doctrine**: `docs/brain/picks-intelligence.md`

- Each active pick for the game is evaluated against the confirmed result
- Pick status is updated: WIN, LOSS, PUSH, or VOID
- Settlement record is immutable — no post-settlement changes

**Output**: Settled pick records

### Stage 3C — Ledger Settlement Event

**Component**: Signal Ledger (8)

- SETTLEMENT_RECORDED event written for each pick
- Event includes: pickId, modelVersion, settlementResult, confidenceAtPublication,
  settlementSource (sourceId + tier)

**Output**: SETTLEMENT_RECORDED events in ledger

### Stage 3D — Calibration Feedback

**Component**: Calibration Feedback Loop (cross-cutting)
**Doctrine**: `docs/brain/calibration-feedback-loop.md`

- Calibration accuracy is calculated: was the confidence band appropriate?
- Evidence chain quality signal is generated: did the evidence point correctly?
- Source quality signals are generated for each source in the pick's evidence chain

**Output**: CalibrationSignal + EvidenceChainQualitySignal + SourceQualitySignals

### Stage 3E — Source Reliability Update

**Component**: Source Acquisition Mesh (5)
**Doctrine**: `docs/brain/source-acquisition-mesh.md`

- Source reliability scores are updated based on SourceQualitySignals
- Scores are bounded (±5 per event) and smoothed over 30-pick rolling window

**Output**: Updated source reliability scores in registry

### Stage 3F — Model Accuracy Update

**Component**: Prediction engine (current implementation)

- Win/loss record for the model version is updated
- If this is the 30th, 50th, or 100th settled pick → metrics report generated
- Calibration check is run if a 50-pick window is complete

**Output**: Updated model version accuracy metrics

---

## Routing Constraints

### Data Must Not Flow Backwards Across Tier Boundaries

Tier 5 content cannot be injected into the Tier 1/2 evidence stream.
Tier 6 (model output) cannot be cited as evidence in any answer.
Weak signals stay in their separate stream unless promoted by Tier 1 verification.

### Settlement Must Not Rewrite Evidence

Post-settlement calibration updates source reliability and model accuracy —
it does NOT modify historical evidence items. The historical record is immutable.

### Public Surfaces See Only publicSafe Content

Every evidence item carries a `publicSafe` flag. The routing layer enforces
this at Stage 2E. The flag is set at evidence normalization (Stage 1B) based
on the source tier and content type. The flag cannot be overridden at the
surface level — only at the evidence vault.

### Cockpit Sees More, But Is Still Governed

The Operator Cockpit receives full evidence including Tier 5 alerts,
contradiction flags, staleness warnings, and withheld answers with failure reasons.
The cockpit is not ungoverned — it operates under
`docs/brain/operator-cockpit-governance.md`. Operators cannot use the cockpit
to bypass claim governance or publish withheld content.

### No Component Builds a Surface Before Its Dependencies Exist

From `docs/intelligence/product-ecosystem.md` dependency map:
- Do not build Picks Intelligence evidence chain display before Evidence Vault
  and Signal Ledger are operational
- Do not build public Ask-the-Brain before Claim Governance and source
  transparency validation exist
- Do not build AI-Search / Developer / B2B layers before Components 6–12
  are operational

---

## Routing Summary Table

| Input | Entry component | Key processing stages | Final output |
|---|---|---|---|
| Licensed API data (Tier 2) | Source Mesh → Evidence Vault | Normalize → Entity resolve → Ledger | Evidence item in vault |
| Official feed (Tier 1) | Source Mesh → Evidence Vault | Same as above + contradiction check | Evidence item, possible alert |
| Community signal (Tier 5) | Weak Signal Engine | Keyword threshold → Verification check | Cockpit alert only |
| Market data (Tier 4) | Source Mesh → Market Gravity | Pressure calc → Confidence adjustment | MarketGravitySignal |
| User question | Ask the Brain | Entity resolve → Evidence retrieve → Govern → Deliver | Approved or withheld answer |
| Operator research brief | Research Lab | Same as user question + operator authoring | Research brief in cockpit |
| Game final result | Settlement trigger | Pick settle → Ledger → Calibrate → Source update | Settlement record + calibration |
