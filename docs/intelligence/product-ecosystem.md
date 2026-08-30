# Sports OS — Product Ecosystem

**Status**: Doctrine only. Implementation requires owner approval.
**Source**: Prompt 1 §3
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## Overview

Sports OS is a governed sports intelligence network with 15 ecosystem components.
The components are layered: data intake at the base, intelligence processing in
the middle, and user-facing surfaces at the top. No component should be built
before the components below it in the dependency chain are operational.

```
────────────────────────────────────────────────────────
  USER-FACING SURFACES
  [1] Picks Intelligence    [2] Fantasy Intelligence
  [3] Sports Research Brain [4] Weak Signal / Rumor Radar
  [12] Public Trust/Methodology  [13] Developer/Innovation
  [14] AI-Search/GEO        [15] Future API / B2B
────────────────────────────────────────────────────────
  INTELLIGENCE PROCESSING
  [9] Market Gravity        [10] Operator Cockpit
  [11] Research Lab         [8] Signal Ledger
────────────────────────────────────────────────────────
  INTELLIGENCE CORE
  [6] Evidence Vault        [7] Entity Graph
  [5] Source Acquisition Mesh / [4] Weak Signal Engine
────────────────────────────────────────────────────────
```

---

## Component 1 — Picks Intelligence

**Purpose**: Provide betting-adjacent decision intelligence with explainability,
confidence, risk, source freshness, market context, model disagreement, and
settlement accountability.

**Required outputs per pick**:
- Pick or watchlist status
- Signal rationale
- Supporting evidence (source-backed)
- Weakening evidence
- Odds / line context
- Risk and volatility note
- Confidence breakdown (0–100)
- Model version
- Source freshness timestamp
- Settlement and calibration feedback post-game

**Tier access**:
- Free: 1 pick/day, no confidence score
- Pro: all picks, confidence scores, line movement
- Elite: all Pro + early access, analytics, alerts

**Forbidden**:
- Fake picks
- Unsupported picks
- Public certainty language
- Unsupported win-rate claims
- Unverified sharp-money claims
- Performance stats from fewer than 30 settled picks per model version

**Dependencies**: Evidence Vault, Signal Ledger, Source Acquisition Mesh

---

## Component 2 — Fantasy Intelligence

**Purpose**: Premium fantasy decision support powered by the same Brain
infrastructure as picks. Provider-agnostic.

**Use cases**:
- Start / sit recommendations
- Waiver wire adds
- Trade evaluation
- Injury risk assessment
- Usage trend analysis
- Role change detection
- Matchup context
- Weather and venue context
- Scheme / coordinator change impact
- League scoring customization

**Required distinction**: Fantasy recommendation must separate verified player
status, role/usage evidence, matchup data, coach/scheme context, weak-signal
chatter, market signal, and uncertainty. These categories must not be blended
into a single opaque recommendation.

**Provider-agnostic entities** (defined in `docs/brain/fantasy-war-room.md`):
FantasyLeague · FantasyTeam · FantasyRoster · FantasyPlayer · FantasyMatchup ·
FantasyTransaction · FantasyScoringSettings · FantasyRecommendation

**Dependencies**: Evidence Vault, Entity Graph, Source Acquisition Mesh

---

## Component 3 — Sports Research Brain

**Purpose**: Source-backed Q&A and research output for operators and, eventually,
premium users. Every answer is traceable to evidence.

**Example questions**:
- Where is this player in injury rehab?
- What coach changes happened this offseason?
- What offensive scheme changes matter for this NFL team?
- What is this batter's hard-hit trend?
- Why did this strikeout prop move?
- Is this rumor real or community noise?

**Required answer fields** (see `docs/brain/ask-the-brain.md` for full schema):
- Direct answer
- Confidence level (LOW / MEDIUM / HIGH)
- Evidence used
- Source quality
- What changed
- Supporting signals
- Weakening signals
- Missing data
- Market context
- Fantasy and pick implication
- Public-safe status
- Last updated timestamp

**Launch sequence**: internal cockpit only → limited public beta → public launch
(only after claim governance and source transparency pass validation)

**Dependencies**: Evidence Vault, Entity Graph, Signal Ledger, Claim Governance

---

## Component 4 — Weak Signal / Rumor Radar

**Purpose**: Monitor community chatter, Reddit/forums, comments, local rumors,
keyword spikes, injury terms, player mentions, sentiment shifts, and
market-adjacent noise.

**Critical rule**: Weak signals are never verified facts.

**Permitted outputs**:
- Watchlist flags
- Rumor clusters
- Contradiction alerts
- Verification tasks
- Market-correlation notes

**Forbidden outputs**:
- Verified injury claims
- Inside-information claims
- Public accusations
- Unsupported picks
- Public certainty

**Required language for weak-signal output**:
- "Unverified chatter increased"
- "Community discussion is rising"
- "No official confirmation found"
- "Treat as watchlist only"
- "Needs primary-source verification"
- "Contradicted by official source"
- "Market movement does / does not align with chatter"

**Dependencies**: Source Acquisition Mesh (Tier 5 intake), Entity Graph

---

## Component 5 — Source Acquisition Mesh

**Purpose**: Governed intake from APIs, licensed feeds, official sources,
trusted secondary sources, market data, and weak-signal sources.

Each source requires:
- Source type and owner
- Retrieval method
- Terms / licensing notes
- Freshness TTL (see `docs/adr/source-freshness-and-deploy-readiness-guide.md`)
- Reliability score
- Allowed use
- Public-safe use
- Citation / display rule
- Contradiction behavior
- Review requirement

**Implementation status**: BLOCKED — crawler/scraper implementation requires
source-policy approval per Prompt 1 §1. See BLOCKED items in
`reports/agent-handoffs/ACTIVE_AGENT_RELAY.md`.

---

## Component 6 — Evidence Vault

**Purpose**: Store observed facts, source observations, claims, rumors, and
signals with full metadata.

**Core type** (proposal — not implemented; see `docs/brain/evidence-vault.md`):

```ts
// STATUS: PROPOSAL — not implemented.
// Implementation requires schema approval via
// docs/adr/pre-implementation-change-proposal-template.md
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

**Implementation status**: BLOCKED — schema change required. See BLOCK-1 in relay file.

---

## Component 7 — Entity Graph

**Purpose**: Canonical reference for all named entities in the Sports OS world
and their relationships.

**Canonical entity types**: player · team · coach · coordinator · league · season ·
game · venue · weather · injury · practice report · transaction · market ·
sportsbook · prop · line · fantasy league · fantasy team · fantasy roster ·
article · reporter · source · rumor cluster · model output · pick · settlement ·
public claim

**Core relationships**:
- player → belongs to team
- player → has injury
- player → appears in market
- market → belongs to game
- line → belongs to sportsbook
- coach → affects scheme
- scheme → affects usage
- usage → affects fantasy projection
- rumor → mentions player
- rumor → requires verification
- pick → uses evidence
- evidence → supports claim
- settlement → updates calibration

**Implementation status**: Proposal. Full spec in `docs/brain/entity-graph.md`.

---

## Component 8 — Signal Ledger

**Purpose**: Track every pick, recommendation, answer, and public claim from
birth to outcome. Full lifecycle audit trail.

**Ledger events**: question asked · source searched · evidence retrieved ·
entity resolved · odds captured · line movement detected · model score generated ·
confidence assigned · risk assigned · explanation generated · public gate checked ·
human review completed · answer/pick published or withheld · settlement recorded ·
calibration updated

**Implementation status**: BLOCKED — schema change required. See BLOCK-2 in relay file.

---

## Component 9 — Market Gravity

**Purpose**: Composite market intelligence synthesizing line movement, book
disagreement, and market pressure into a structured signal.

**Inputs**: opening line · current line · movement size · movement speed ·
sportsbook disagreement · timing relative to news · injury/news correlation ·
public pressure proxy · liquidity proxy · model disagreement · historical closing
movement · volatility

**Outputs**: market pressure score · volatility warning · movement explanation ·
confidence adjustment · risk adjustment · watch/lean/pick/avoid classification

**Forbidden**: Do not claim sharp money unless supported by specific data.

---

## Component 10 — Operator Cockpit

**Purpose**: Internal mission control answering these questions for operators:
What does the Brain know? What is stale? What changed? What is contradicted?
What is rumor only? What is verified? What is public-safe? What requires human
review? What is bootstrap-only? What is canonical? What should be researched
next? What should not be published?

**Rule**: Use existing cockpit route structure. Enhance additively only.
No cockpit route may be made public without owner approval.

**Current cockpit routes** (all internal-only, require authentication):
see `docs/adr/public-cockpit-boundary-and-gate-integrity-contract.md`

---

## Component 11 — Research Lab

**Purpose**: Internal research workspace for structured sports intelligence briefs.

**Brief types**: injury timeline · player context · game context · prop market ·
fantasy decision · coach/scheme change · rumor triage · market movement ·
content/SEO · competitor/product research

---

## Component 12 — Public Trust / Methodology Layer

**Purpose**: Make Sports OS trustworthy, citeable, and defensible.

**Must explain publicly**:
- How source quality is ranked
- How freshness is handled
- How rumors are separated from facts
- How confidence differs from risk
- How public claims are approved
- How performance is tracked
- How model calibration works
- What the system will not claim

**Current implementation**: `/methodology` route exists. Expansion requires
Claim Governance (Component — `docs/brain/claim-governance.md`) to be in place first.

---

## Component 13 — Developer / Innovation Layer

**Purpose**: Make Sports OS credible to builders, investors, and future partners.

**Future public surfaces** (all blocked until Components 6–10 are operational):
- Methodology pages (expanded)
- Source hierarchy page
- Freshness rules page
- Entity graph explanation
- Signal ledger schema
- Model calibration approach
- Claim governance
- Responsible intelligence doctrine
- API documentation
- Developer examples

See `docs/intelligence/developer-innovation-layer.md` for full doctrine.

---

## Component 14 — AI-Search / GEO Visibility Layer

**Purpose**: Make Sports OS discoverable and citeable by AI answer engines
and traditional search.

See `docs/intelligence/ai-search-geo-strategy.md` for full strategy.

**Requirements**: stable URLs · entity clarity · updated-at timestamps ·
source transparency · structured answer blocks · schema markup ·
methodology pages · glossary pages · non-hype language · topical authority clusters

---

## Component 15 — Future API / B2B Intelligence Layer

**Purpose**: Eventually expose Sports OS intelligence to external builders
and enterprise partners via a governed API.

**Prerequisites**: Components 3–10 must be operational. API governance,
rate limiting, licensing, and attribution rules must all be in place.

See `docs/intelligence/developer-innovation-layer.md` for the B2B pathway.

---

## Dependency Map

```
[5] Source Mesh ──────────────────────────────────────┐
[4] Weak Signal Engine ────────────────────────────┐  │
                                                   ↓  ↓
[6] Evidence Vault ◄── required by ──────────── [3][1][2]
[7] Entity Graph   ◄── required by ──────────── [3][1][2]
[8] Signal Ledger  ◄── required by ──────────── [3][1]
[10] Claim Gov.    ◄── required by ──────────── [3][12]
[9] Market Gravity ◄── feeds into ─────────────── [1]
[10] Cockpit ◄──── gates all internal-only surfaces
[12] Methodology ◄─ required before [13][14][15] launch
[13][14][15] ◄───── all depend on [3][6][7][8][10][12]
```

Do not build surfaces that depend on components that do not yet exist.
