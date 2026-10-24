# Sports OS — Fantasy War Room

**Status**: Doctrine only. Schema implementation is BLOCKED pending approval.
**Source**: Prompt 1 §4.8 · Component 2
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Block reference**: BLOCK-3 in `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md`

---

## Purpose

Fantasy Intelligence provides premium fantasy sports decision support powered
by the same Brain infrastructure as picks. It is provider-agnostic: it does
not depend on ESPN, Yahoo, Sleeper, or any specific fantasy platform API.
It works from the canonical entity graph.

Fantasy decisions are governed by the same evidence standards as picks.
A start/sit recommendation without source-backed evidence is not permitted.

**Implementation status**: BLOCKED — Fantasy entity schema requires
separate approval. Provider integration requires additional source-policy
review.

---

## Use Cases

| Decision type | Description |
|---|---|
| Start / Sit | Should I start this player in my lineup this week? |
| Waiver wire | Should I add this player from waivers? At what FAAB price? |
| Trade evaluation | Is this trade favorable, fair, or unfavorable? |
| Injury risk assessment | How likely is this player to miss time or play limited snaps? |
| Usage trend analysis | Is this player's role growing, stable, or declining? |
| Role change detection | Did a coordinator change or injury shift this player's role? |
| Matchup context | How does this player's strengths match up against this defense? |
| Weather and venue | Does weather or venue materially affect this player's projection? |
| Scheme change impact | How does the new OC's scheme affect this WR's target share? |
| League scoring customization | How do PPR / half-PPR / standard scoring settings affect rankings? |

---

## Provider-Agnostic Entity Layer

Fantasy Intelligence uses a provider-agnostic entity layer that maps
from the canonical entity graph. Users provide their roster context;
Sports OS provides the intelligence layer without needing API access
to their specific fantasy platform.

### Fantasy Entity Types (PROPOSAL)

```typescript
// STATUS: PROPOSAL — not implemented.
// Implementation requires schema approval via
// docs/adr/pre-implementation-change-proposal-template.md
// Fantasy entities extend the core Entity Graph.

type FantasyLeague = {
  id: string;
  providerType: "espn" | "yahoo" | "sleeper" | "nfl" | "custom" | "unknown";
  sport: string;
  scoringSettings: FantasyScoringSettings;
  season: string;
  teamCount: number;
};

type FantasyTeam = {
  id: string;
  leagueId: string;
  ownerId?: string;              // User ID if this is the user's team
  roster: FantasyRoster;
};

type FantasyRoster = {
  teamId: string;
  week: number;
  players: FantasyPlayer[];
  injuredReserve: FantasyPlayer[];
};

type FantasyPlayer = {
  id: string;
  playerId: string;              // Links to canonical player entity
  ownership: number;             // 0–100 percent ownership in league
  projectedPoints: number;
  projectedPointsSource: "licensed_feed" | "internal_model";
  adp?: number;                  // Average draft position (if relevant)
};

type FantasyMatchup = {
  id: string;
  leagueId: string;
  teamAId: string;
  teamBId: string;
  week: number;
  scoringPeriodStart: Date;
  scoringPeriodEnd: Date;
};

type FantasyScoringSettings = {
  format: "ppr" | "half_ppr" | "standard" | "custom";
  customRules?: Record<string, number>; // Stat: points multiplier
};

type FantasyTransaction = {
  id: string;
  leagueId: string;
  type: "add" | "drop" | "trade" | "waiver";
  playersIn: string[];           // Player IDs added to user's team
  playersOut: string[];          // Player IDs removed from user's team
  faabBid?: number;              // FAAB bid amount for waiver adds
  executedAt: Date;
};

type FantasyRecommendation = {
  id: string;
  playerId: string;
  action: "start" | "sit" | "add" | "drop" | "trade_for" | "trade_away";
  confidence: number;            // 0–100
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  rationale: string;             // Plain-language recommendation explanation
  evidenceIds: string[];         // Links to EvidenceVault items
  weakeningSignals: string[];    // What could undermine this recommendation
  generatedAt: Date;
  modelVersion: string;
  publicSafe: boolean;
};
```

---

## Required Evidence Separation

Fantasy recommendations must separate their evidence into distinct,
clearly labeled categories. An opaque "this player is a good start" with
no evidence breakdown is forbidden.

| Evidence category | Required separation |
|---|---|
| Verified player status | Official injury designation, practice status (Tier 1) |
| Role and usage evidence | Snap counts, target share, carry share (Tier 2 licensed) |
| Matchup data | Defensive rankings, coverage schemes, historical splits (Tier 2–3) |
| Coach and scheme context | Coordinator changes, scheme tendencies (Tier 1–3) |
| Weak-signal chatter | Community speculation — labeled as unverified, cockpit-only |
| Market signal | DFS ownership, betting line implications — labeled as market context |
| Uncertainty | What data is missing or unclear |

Each category must be labeled in the recommendation output. Categories
must not be blended into a single undifferentiated "analysis" block.

---

## Fantasy Recommendation Constraints

**Permitted**:
- Start/sit recommendations with full evidence breakdown
- Waiver wire adds with confidence level and rationale
- Trade evaluation with supporting evidence on both sides
- Usage trend analysis with Tier 2 source citation
- Injury risk notes with Tier 1 source when available

**Forbidden**:
- Recommendations based solely on Tier-5 community chatter
- Certainty language ("he will score," "guaranteed points")
- DFS lineup-specific advice that implies inside knowledge
- Recommendations that omit weakening signals
- Any recommendation where the evidence tier is lower than Tier 3
  without explicit disclosure

---

## Provider-Agnostic Design Principle

Fantasy Intelligence does not:
- Require API access to ESPN, Yahoo, Sleeper, or any specific platform
- Import live roster data without user-provided context
- Auto-connect to any external fantasy service without explicit approval

Users provide:
- Their league's scoring settings
- Their current roster (player names or IDs)
- The specific decision they need help with

Sports OS provides:
- The underlying sports intelligence (injury status, usage trends, matchup data)
- The recommendation with full evidence breakdown

This design keeps Fantasy Intelligence legally clean and operationally
independent of any single platform's availability or API terms.

---

## Implementation Prerequisites

Before Fantasy War Room can be implemented:

1. Entity Graph schema must be approved and implemented (FantasyPlayer links to player)
2. Evidence Vault must be operational (recommendations reference EvidenceItems)
3. Signal Ledger must be operational (recommendation lifecycle events)
4. Provider-agnostic entity layer schema must be approved (this document)
5. Scoring settings customization schema must be approved
6. Source coverage for usage statistics (Tier 2 licensed stats feed) must be confirmed

---

## Cross-Reference

- Entity Graph: `docs/brain/entity-graph.md` — base entity types extended here
- Evidence Vault: `docs/brain/evidence-vault.md` — evidence for every recommendation
- Ask the Brain: `docs/brain/ask-the-brain.md` — Brain infrastructure shared with picks
- Source Hierarchy: `docs/brain/source-hierarchy.md` — Tier 1–2 required for recommendations
- Weak Signal Engine: `docs/brain/weak-signal-engine.md` — Tier-5 chatter handling
