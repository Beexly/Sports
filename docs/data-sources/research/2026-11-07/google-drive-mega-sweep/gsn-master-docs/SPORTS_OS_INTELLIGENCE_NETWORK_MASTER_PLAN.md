# Sports OS Intelligence Network — Master Architecture Plan

Status: controlling architecture doctrine assembled from R&D Batches 0–6. This is a planning/control artifact only. It does not implement code, change routes, change schema, add dependencies, weaken gates, or expose internal systems publicly.

## 0. Baseline Lock

Sports OS is the product of record. The current app structure, public route structure, cockpit route structure, trust gates, feature flags, calibration logic, and no-fake-data doctrine are preserved.

The uploaded projects are reference systems. They are not architecture replacements. Their role is to teach patterns that can be translated into additive Sports OS improvements.

The current direction is:

Sports OS is a governed sports intelligence network that turns fragmented sports data, market movement, source evidence, weak signals, model outputs, and uncertainty into decision-ready insight.

The Brain is the intelligence core, but it is not the whole product.

The ecosystem includes:

1. Picks Intelligence
2. Fantasy Intelligence
3. Sports Research Brain
4. Weak Signal / Rumor Radar
5. Source Acquisition Mesh
6. Evidence Vault
7. Entity Graph
8. Signal Ledger
9. Market Gravity
10. Operator Cockpit
11. Research Lab
12. Public Trust / Methodology Layer
13. Developer / Innovation Layer
14. AI-search / GEO Visibility Layer
15. Future API / B2B Intelligence Layer

## 1. Non-Negotiable Constraints

Do not rebuild the app.

Do not rename routes.

Do not migrate architecture.

Do not replace the current Sports repo structure.

Do not weaken feature flags, public gates, tests, or trust rules.

Do not fabricate data, picks, odds, injuries, rumors, performance, testimonials, or readiness.

Do not expose internal Brain tools publicly.

Do not create public Ask-the-Brain routes until source governance, evidence vault, claim governance, and internal Q&A validation exist.

Do not treat Reddit, forums, fan boards, community chatter, comments, or rumor threads as verified fact.

Do not imply inside information.

Do not claim sharp money unless supported by specific, legitimate data.

Do not add dependencies without explicit approval.

Do not add schema changes without explicit approval.

Do not copy uploaded repo code blindly.

Do not import GPL/AGPL or license-sensitive code without legal review.

Do not use sportsbook/tout/casino certainty language such as locks, guaranteed, sure thing, risk-free, easy money, free money, cannot lose, or verified track record unless explicitly approved and legally supported.

## 2. Product Thesis

Sports OS should become the intelligence layer between fragmented sports reality and decision-ready insight.

Sports reality is messy: official injury reports, team announcements, beat writer comments, coach-speak, Reddit rumors, forum speculation, line movement, player usage changes, scheme shifts, weather, venue effects, fantasy panic, model disagreement, outdated articles, AI-generated junk, and market overreaction.

Sports OS wins by classifying that chaos into clear categories:

- verified fact
- source observation
- trusted report
- market signal
- weak signal
- rumor
- community chatter
- model output
- confidence
- volatility
- risk
- public claim
- recommendation
- settlement
- calibration impact

The moat is not AI picks. The moat is source-aware, evidence-weighted, time-sensitive, auditable sports intelligence.

## 3. Product Ecosystem

### 3.1 Picks Intelligence

Purpose: provide betting-adjacent decision intelligence with explainability, confidence, risk, source freshness, market context, model disagreement, and settlement accountability.

Required outputs:

- pick or watchlist status
- signal rationale
- supporting evidence
- weakening evidence
- odds/line context
- risk/volatility note
- confidence breakdown
- model version
- source freshness
- settlement/calibration feedback

Forbidden:

- fake picks
- unsupported picks
- public certainty
- unsupported win-rate claims
- unverified sharp-money claims
- public performance from bootstrap/canonical-insufficient samples

### 3.2 Fantasy Intelligence

Purpose: premium fantasy decision support powered by the same Brain infrastructure as picks.

Use cases:

- start/sit
- waiver adds
- trade evaluation
- injury risk
- usage trends
- role changes
- matchup context
- weather/venue context
- scheme/coordinator changes
- league scoring customization

Required distinction:

Fantasy recommendation must separate verified player status, role/usage evidence, matchup data, coach/scheme context, weak-signal chatter, market signal, and uncertainty.

### 3.3 Sports Research Brain

Purpose: source-backed Q&A and research output.

Example questions:

- Where is this player in injury rehab?
- What coach changes happened this offseason?
- What offensive scheme changes matter for this NFL team?
- What is this batter's hard-hit trend?
- Why did this strikeout prop move?
- Is this rumor real or just community noise?

Every answer must include:

- direct answer
- confidence
- evidence used
- source quality
- what changed
- supporting signals
- weakening signals
- missing data
- market context
- fantasy/pick implication
- public-safe status
- last updated

### 3.4 Operator Cockpit

Purpose: internal mission control. It should answer:

- What does the Brain know?
- What is stale?
- What changed?
- What is contradicted?
- What is rumor only?
- What is verified?
- What is public-safe?
- What requires human review?
- What is bootstrap-only?
- What is canonical?
- What should be researched next?
- What should not be published?

Use existing cockpit route structure. Enhance additively.

### 3.5 Developer / Innovation Layer

Purpose: make Sports OS credible to builders, investors, and future partners.

Future public surfaces:

- methodology pages
- source hierarchy
- freshness rules
- entity graph explanation
- signal ledger schema
- model calibration approach
- claim governance
- responsible intelligence doctrine
- API documentation
- developer examples

### 3.6 Public Methodology / Trust Layer

Purpose: make Sports OS trustworthy, citeable, and defensible.

Must explain:

- how source quality is ranked
- how freshness is handled
- how rumors are separated from facts
- how confidence differs from risk
- how public claims are approved
- how performance is tracked
- how model calibration works
- what the system will not claim

### 3.7 AI Search / GEO Layer

Purpose: make Sports OS discoverable and citeable by AI answer engines and traditional search.

Requires:

- stable URLs
- entity clarity
- updated-at timestamps
- source transparency
- structured answer blocks
- schema markup where appropriate
- methodology pages
- glossary pages
- non-hype language
- topical authority clusters

## 4. Intelligence Architecture

### 4.1 Source Acquisition Mesh

Purpose: governed intake from APIs, licensed feeds, official sources, trusted secondary sources, market data, and weak-signal sources.

Source tiers:

| Tier | Name | Examples | Public Use |
|---|---|---|---|
| 1 | Official / Primary | league APIs, team injury reports, transaction logs, gamebooks | can support facts when fresh |
| 2 | Licensed / Structured | odds APIs, stats feeds, fantasy APIs | can support structured claims if license allows |
| 3 | Trusted Secondary | verified beat writers, reputable analysts, major sports outlets | can support contextual claims with attribution |
| 4 | Market Signals | line movement, book disagreement, prop movement, volatility | can support market-context claims |
| 5 | Community / Weak Signal | Reddit, forums, comments, fan boards | watchlist only unless verified elsewhere |
| 6 | Synthetic / AI / Low Trust | AI summaries, scraper spam, low-quality aggregators | never source of truth |

Each source needs:

- source type
- source owner
- retrieval method
- terms/licensing notes
- freshness TTL
- reliability score
- allowed use
- public-safe use
- citation/display rule
- contradiction behavior
- review requirement

### 4.2 Weak Signal Engine

Purpose: monitor community chatter, Reddit/forums, comments, local rumors, keyword spikes, injury terms, player mentions, sentiment shifts, and market-adjacent noise.

Critical rule: Weak signals are not verified facts.

The engine may produce:

- watchlist flags
- rumor clusters
- contradiction alerts
- verification tasks
- market-correlation notes

It must not produce:

- verified injury claims
- inside-information claims
- public accusations
- unsupported picks
- public certainty

Weak-signal output should use language such as:

- unverified chatter increased
- community discussion is rising
- no official confirmation found
- treat as watchlist only
- needs primary-source verification
- contradicted by official source
- market movement does/does not align with chatter

### 4.3 Entity Graph

Canonical entities:

- player
- team
- coach
- coordinator
- league
- season
- game
- venue
- weather
- injury
- practice report
- transaction
- market
- sportsbook
- prop
- line
- fantasy league
- fantasy team
- fantasy roster
- article
- reporter
- source
- rumor cluster
- model output
- pick
- settlement
- public claim

Core relationships:

- player belongs to team
- player has injury
- player appears in market
- market belongs to game
- line belongs to sportsbook
- coach affects scheme
- scheme affects usage
- usage affects fantasy projection
- rumor mentions player
- rumor requires verification
- pick uses evidence
- evidence supports claim
- settlement updates calibration

### 4.4 Evidence Vault

Purpose: store observed facts, source observations, claims, rumors, and signals with metadata.

Required metadata:

- source
- source tier
- entity
- retrieved_at
- observed_at
- published_at
- valid_until
- freshness TTL
- confidence
- public-safe status
- contradiction status
- source quality
- summary
- raw reference
- allowed use
- claim linkage
- human-reviewed flag

Minimum conceptual type:

```ts
type EvidenceItem = {
  id: string;
  sourceId: string;
  sourceTier: 1 | 2 | 3 | 4 | 5 | 6;
  entityType: string;
  entityId: string;
  claimType: string;
  observedAt: Date;
  publishedAt?: Date;
  retrievedAt: Date;
  validUntil?: Date;
  sourceQuality: "OFFICIAL" | "LICENSED" | "TRUSTED_SECONDARY" | "MARKET" | "WEAK_SIGNAL" | "LOW_TRUST";
  confidence: number;
  publicSafe: boolean;
  summary: string;
  contradictionStatus: "NONE" | "POSSIBLE" | "CONFLICTED";
  humanReviewed: boolean;
};
```

### 4.5 Signal Ledger

Purpose: track every pick, recommendation, answer, and public claim from birth to outcome.

Ledger events:

- question asked
- source searched
- evidence retrieved
- entity resolved
- odds captured
- line movement detected
- model score generated
- confidence assigned
- risk assigned
- explanation generated
- public gate checked
- human review completed
- answer/pick published or withheld
- settlement recorded
- calibration updated

### 4.6 Market Gravity

Purpose: composite market intelligence.

Inputs:

- opening line
- current line
- movement size
- movement speed
- sportsbook disagreement
- timing relative to news
- injury/news correlation
- public pressure proxy if available
- liquidity proxy if available
- model disagreement
- historical closing movement
- volatility

Outputs:

- market pressure score
- volatility warning
- movement explanation
- confidence adjustment
- risk adjustment
- watch/lean/pick/avoid classification

Forbidden: do not claim sharp money unless supported by specific data.

### 4.7 Ask the Brain

Purpose: structured Q&A powered by Evidence Vault, Entity Graph, Source Hierarchy, Signal Ledger, and Research Skills.

Launch sequence:

1. internal cockpit-only first
2. limited public beta later
3. public launch only after claim governance and source transparency pass validation

Required answer structure:

```ts
type BrainAnswer = {
  answer: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  confidenceReasons: string[];
  sourcesUsed: Array<{ sourceId: string; tier: number; observedAt: string; publicSafe: boolean }>;
  whatChanged: string[];
  supportingSignals: string[];
  weakeningSignals: string[];
  missingData: string[];
  marketContext?: string;
  fantasyImpact?: string;
  pickImpact?: string;
  publicSafeStatus: "SAFE" | "NEEDS_REVIEW" | "INTERNAL_ONLY";
  lastUpdated: string;
};
```

### 4.8 Fantasy War Room

Purpose: premium fantasy decision surface.

Capabilities:

- start/sit
- waiver adds
- trade evaluation
- injury risk
- matchup analysis
- role/usage trend
- coach/scheme context
- weather
- playoff schedule
- league scoring customization

Provider-agnostic fantasy entities:

- FantasyLeague
- FantasyTeam
- FantasyRoster
- FantasyPlayer
- FantasyMatchup
- FantasyTransaction
- FantasyScoringSettings
- FantasyRecommendation

### 4.9 Research Lab

Purpose: internal research workspace for structured sports intelligence briefs.

Brief types:

- injury timeline
- player context
- game context
- prop market
- fantasy decision
- coach/scheme change
- rumor triage
- market movement
- content/SEO
- competitor/product research

### 4.10 Claim Governance

Purpose: every public claim maps to evidence.

For each public claim, define:

- claim text
- route/surface
- source support
- freshness
- risk level
- allowed wording
- forbidden wording
- review date
- reviewer
- public-safe status

## 5. Design Experience System

Design standard:

Sports OS should feel like Bloomberg discipline, F1 telemetry, NASA mission control, Apple restraint, sports-native clarity, and a premium intelligence network.

Avoid:

- sportsbook clutter
- casino green
- cheap neon
- crypto-dashboard noise
- generic SaaS cards
- fake AI sparkle
- excessive glassmorphism
- overanimated sci-fi
- hype copy

Signature components:

- Brain Answer Card
- Evidence Drawer
- Signal Stack
- Market Gravity Meter
- Rumor Radar Card
- Player Intelligence File
- Pick Provenance Timeline
- Source Health Panel
- Contradiction Alert
- Brain Confidence Meter
- Fantasy War Room Card
- Slate Command View
- Public Methodology Block

Design principle:

One cinematic brand layer. Many disciplined data layers.

## 6. Batch Extraction Summary

### Batch 0 — Inventory

45 uploaded ZIPs were de-duplicated into 33 unique archive groups. The archive set contains agent systems, crawling/research systems, analytics/telemetry systems, workflow/skill systems, mature engineering references, and fantasy/sports references.

### Batch 1 — Agent / Skill Systems

Dominant extraction: repeatable, skill-based, approval-aware, testable operator workflow.

Sports OS translation:

- internal skills before public agent tools
- review queues before publication
- evidence packs before claims
- smoke tests before readiness claims
- source hierarchy before answer generation
- structured answer schemas before public Q&A
- memory/run history before autonomous cycles
- human approval before publishing, betting, messaging, or mutating production

### Batch 2 — Crawling / Research / Source Acquisition

Dominant extraction: source acquisition should be multi-channel but governed by source hierarchy, freshness TTL, extraction confidence, and allowed-use rules.

Sports OS translation:

- Source Acquisition Mesh
- Weak Signal Engine
- Evidence Vault
- source freshness and failure states
- Reddit/forum/community chatter as watchlist-only weak signal

### Batch 3 — Analytics / Telemetry / Lifecycle

Dominant extraction: Brain Observability.

Sports OS translation:

- event ledgers
- user/question telemetry
- answer history
- source failure tracking
- lifecycle analytics
- claim review status
- cockpit command center analytics

### Batch 4 — Mature Engineering / API / Design / Model Governance

Dominant extraction: typed contracts, compatibility discipline, CI/release rigor, design-system documentation, model governance, API ergonomics, and provenance timelines.

Sports OS translation:

- schema discipline
- typed Brain contracts
- model version governance
- compatibility checks
- release gates
- design component doctrine

### Batch 5 — Fantasy / Sports Expansion

Dominant extraction: Fantasy Intelligence is a major adjacent product lane, not a side feature.

Sports OS translation:

- Fantasy War Room
- provider-agnostic fantasy entities
- start/sit, trade, waiver, injury, usage, matchup, scheme-change workflows

### Batch 6 — Product + Design Synthesis

Dominant extraction: Sports OS should feel like a premium intelligence network, not a sportsbook, tout site, generic AI chatbot, or SaaS dashboard.

Sports OS translation:

- Brain Answer Card
- Evidence Drawer
- Signal Stack
- Rumor Radar
- Market Gravity
- Player Intelligence File
- Pick Provenance Timeline
- Source Health Panel
- layered confidence

## 7. Implementation Sequence

### Phase 0: R&D Extraction

Complete uploaded-project pattern register and repeatable process for every new ZIP wave.

### Phase 1: Architecture Docs Only

Create docs under docs/intelligence/, docs/brain/, docs/skills/, and docs/design/.

Required docs:

- docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md
- docs/intelligence/product-ecosystem.md
- docs/intelligence/design-experience-system.md
- docs/intelligence/ai-search-geo-strategy.md
- docs/intelligence/monetization-lanes.md
- docs/intelligence/developer-innovation-layer.md
- docs/brain/source-hierarchy.md
- docs/brain/weak-signal-engine.md
- docs/brain/entity-graph.md
- docs/brain/evidence-vault.md
- docs/brain/signal-ledger.md
- docs/brain/ask-the-brain.md
- docs/brain/market-gravity.md
- docs/brain/fantasy-war-room.md
- docs/brain/research-lab.md
- docs/brain/claim-governance.md
- docs/brain/operator-cockpit-governance.md
- docs/design/experience-system.md
- docs/design/signature-components.md
- docs/design/public-product-language.md
- docs/skills/source-audit.md
- docs/skills/rumor-triage.md
- docs/skills/injury-context-research.md
- docs/skills/scheme-change-research.md
- docs/skills/fantasy-decision-research.md
- docs/skills/prop-market-research.md
- docs/skills/public-claim-audit.md
- docs/skills/market-gravity-review.md
- docs/skills/brain-answer-review.md

### Phase 2: Operator Skills

Create repeatable skill documents for source audit, rumor triage, injury research, fantasy research, prop research, market gravity, public claim audit, and scheme change research.

### Phase 3: Evidence Schema Proposal

Draft schema proposal only. Do not implement until approved.

### Phase 4: Evidence Vault MVP

After approval, implement internal-only evidence storage.

### Phase 5: Source Hierarchy and Source Health

Enhance existing cockpit source surfaces. Preserve route structure.

### Phase 6: Signal Ledger MVP

Add pick/answer lineage internally.

### Phase 7: Internal Ask the Brain

Cockpit-only, source-backed Q&A.

### Phase 8: Fantasy War Room MVP

Internal/premium feature design, then limited implementation.

### Phase 9: Public Brain Beta

Limited public Q&A with strict source transparency and refusal rules.

### Phase 10: Developer/Methodology Layer

Public trust pages, methodology, source hierarchy, calibration, GEO strategy.

## 8. Validation Rules Before Any Implementation

Before implementation:

1. Show branch.
2. Show git status.
3. Inspect open PRs.
4. List files to touch.
5. Explain why each file is touched.
6. Confirm no route changes.
7. Confirm no schema changes unless approved.
8. Confirm no dependency changes.
9. Confirm no weakened gates.
10. Confirm no copied external code.
11. Confirm no public exposure of internal Brain tools.

Run:

```bash
npm run db:generate
npm run lint
npm run typecheck
npm run test
npm run test:smoke
npm run build
```

If validation fails:

- capture exact error
- diagnose root cause
- fix only if safe
- rerun
- document unresolved blockers honestly

## 9. Final Quality Bar

The result should feel like the architecture doctrine for a serious sports intelligence company.

No generic advice.

No startup fluff.

No fake certainty.

No casino language.

No unsupported claims.

No architecture migration.

No public agent exposure.

No code copying.

No AI theater.

Every recommendation must improve:

- product intelligence
- source discipline
- decision quality
- user trust
- model accountability
- fantasy utility
- picks explainability
- cockpit usefulness
- technical durability
- creative differentiation
- AI-search visibility
- revenue readiness
- operational clarity
