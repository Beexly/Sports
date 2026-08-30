# Sports OS — Research Lab

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §3.3 · Component 11
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## Purpose

The Research Lab is Sports OS's internal workspace for structured sports
intelligence briefs. Operators use the lab to produce systematic research
outputs that inform picks, Brain answers, and content decisions.

The Research Lab is cockpit-only. No lab output reaches a public surface
without going through the full pick or Brain answer publication gate.

---

## Research Brief Types

The lab supports 10 structured brief types. Each type has a defined
input set, output structure, and evidence standard.

### 1. Injury Timeline Brief

**Purpose**: Reconstruct the full timeline of a player's injury — mechanism,
diagnosis, treatment, rehab milestones, and return probability.

**Required inputs**:
- Player entity ID
- Injury entity ID (if exists)
- Date range for evidence search

**Required outputs**:
- Incident date and mechanism (Tier 1 source required)
- Official diagnosis (Tier 1 or Tier 2 required)
- Rehab milestones and current status (Tier 1 preferred)
- Return timeline (Tier 1 or Tier 3 with caveat)
- Market reaction to injury news
- Fantasy and pick implication

---

### 2. Player Context Brief

**Purpose**: Full current-state profile of a player — role, usage, status,
scheme fit, and relevant recent events.

**Required inputs**: Player entity ID, sport, current week

**Required outputs**:
- Current team and depth chart position (Tier 1)
- Recent snap counts / usage percentage (Tier 2)
- Recent target share / carry share (Tier 2, if applicable)
- Injury status and practice designation (Tier 1)
- Coordinator scheme fit notes (Tier 1–3)
- Recent performance trend (Tier 2)
- Weakening signals (if any)

---

### 3. Game Context Brief

**Purpose**: Pre-game intelligence package for a specific matchup.

**Required inputs**: Game entity ID, target date

**Required outputs**:
- Current line and movement summary (Tier 2)
- Key injury designations for both teams (Tier 1)
- Weather and venue context (Tier 2)
- Head-to-head historical context (Tier 2–3)
- Scheme matchup notes (Tier 1–3)
- Market pressure summary (Market Gravity output)
- Confidence and risk classification

---

### 4. Prop Market Brief

**Purpose**: Deep research on a specific player proposition market.

**Required inputs**: Player entity ID, prop type, current line

**Required outputs**:
- Historical performance vs. this prop line (Tier 2)
- Matchup context for this prop type (Tier 2–3)
- Recent usage trend (Tier 2)
- Current line vs. implied probability
- Market movement summary (Tier 2)
- Key supporting and weakening signals
- Confidence level with rationale

---

### 5. Fantasy Decision Brief

**Purpose**: Start/sit/waiver/trade research for a specific fantasy decision.

**Required inputs**: Player entity ID, decision type, league scoring format

**Required outputs**: Per the Fantasy War Room spec (`docs/brain/fantasy-war-room.md`) —
evidence must be separated into verified status, usage, matchup, scheme, and market
categories. No opaque combined analysis.

---

### 6. Coach / Scheme Change Brief

**Purpose**: Assess the intelligence impact of a coaching or coordinator change.

**Required inputs**: Team entity ID, previous and new staff entity IDs

**Required outputs**:
- Personnel changes confirmed (Tier 1)
- New coordinator's historical scheme tendencies (Tier 2–3)
- Projected usage impact on key players (Tier 2–3 with appropriate confidence)
- Pick and fantasy implications
- Timeline: when the new scheme is expected to be installed

---

### 7. Rumor Triage Brief

**Purpose**: Evaluate a Tier-5 rumor and determine its verification status.

**Required inputs**: Rumor cluster ID (from Weak Signal Engine)

**Required outputs**: Per the Weak Signal Engine spec (`docs/brain/weak-signal-engine.md`) —
verification status, Tier 1–2 corroboration check result, market alignment check,
recommended action (verify / watchlist / dismiss), and required language for any output.

---

### 8. Market Movement Brief

**Purpose**: Explain a material line movement and assess its intelligence value.

**Required inputs**: Market entity ID, movement event timestamp

**Required outputs**:
- Movement size and speed (Tier 2)
- Timing vs. known news events (Tier 1–3 correlation check)
- Book agreement / disagreement (Tier 2)
- Corroborating Tier 1–3 information (if any)
- Market Gravity classification (WATCH / LEAN / PICK / AVOID)
- Forbidden: any unverified sharp-money claim

---

### 9. Content / SEO Brief

**Purpose**: Research brief for a planned article or methodology page.

**Required inputs**: Topic, target URL, target audience

**Required outputs**:
- Key claims the article will make (must be evidence-backed)
- Source tiers available for each claim
- Any claims that cannot be sourced (flag for removal or caveat)
- GEO anchor opportunities (stable URLs, structured answer blocks)
- Forbidden language check (must pass public-copy scanner)
- Proposed updated-at timestamp format

---

### 10. Competitor / Product Research Brief

**Purpose**: Intelligence on competing sports analytics or picks products.

**Required inputs**: Competitor name or URL

**Required outputs**:
- Public product description and positioning (Tier 3)
- Claims they make publicly (with source quality assessment)
- Gaps relative to Sports OS responsible intelligence positioning
- No fabricated competitive intelligence — all claims must be sourced

---

## Research Lab Governance

**Cockpit-only rule**: Research Lab is accessible to operators only.
No lab surface may be made public without completing the standard component
dependency chain and receiving owner approval.

**Output destination**: Lab outputs feed into:
- Pick rationale (via Evidence Vault)
- Brain answer construction
- Content pipeline (via Content / SEO brief)
- Operator watchlist (via Rumor Triage)

Lab outputs are not standalone products — they are inputs to governed
publishing workflows.

**Evidence standard**: Every lab brief must meet the same evidence
standards as a Brain answer. Confidence levels and source tiers must
be declared. Weakening signals must be included.

---

## Cross-Reference

- Ask the Brain: `docs/brain/ask-the-brain.md` — Brain infrastructure shared with lab
- Weak Signal Engine: `docs/brain/weak-signal-engine.md` — Rumor Triage brief inputs
- Fantasy War Room: `docs/brain/fantasy-war-room.md` — Fantasy Decision brief spec
- Market Gravity: `docs/brain/market-gravity.md` — Market Movement brief inputs
- Operator Cockpit: `docs/brain/operator-cockpit-governance.md` — lab access gate
- GEO Strategy: `docs/intelligence/ai-search-geo-strategy.md` — Content brief requirements
