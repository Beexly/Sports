# Sports OS — Entity Graph

**Status**: Doctrine only. Schema implementation requires approved change proposal.
**Source**: Prompt 1 §4.3 · Component 7
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## Purpose

The Entity Graph is the canonical reference for every named thing in the
Sports OS intelligence world and the relationships between those things.

Every pick, every Brain answer, every evidence item, and every signal ledger
entry resolves to one or more entities in this graph. Without entity resolution,
intelligence cannot be audited, attributed, or calibrated.

**Implementation status**: Proposal. Full schema requires a separate approved
change proposal per `docs/adr/pre-implementation-change-proposal-template.md`.

---

## Canonical Entity Types

### Core Sports Entities

| Entity type | Description | Key attributes |
|---|---|---|
| `player` | An individual athlete | name, team, position, status, sport |
| `team` | A franchise or roster unit | name, league, conference, division, sport |
| `coach` | Head coach or coordinator | name, team, role, tenure_start |
| `coordinator` | Offensive / defensive coordinator | name, team, side, scheme |
| `league` | Governing body | name, sport, season_format |
| `season` | A competitive year | league, year, current_week |
| `game` | A single scheduled contest | home_team, away_team, start_time, venue, status |
| `venue` | Physical location | name, city, surface, capacity, weather_exposure |

### Status and Condition Entities

| Entity type | Description | Key attributes |
|---|---|---|
| `injury` | A documented physical condition | player, body_part, designation, updated_at, source_tier |
| `practice_report` | Official practice participation report | player, status, date, reporter, source_tier |
| `transaction` | Roster move (trade, waiver, signing, release) | player, from_team, to_team, effective_date, source_tier |

### Intelligence Entities

| Entity type | Description | Key attributes |
|---|---|---|
| `article` | A published piece of sports journalism | headline, outlet, reporter, published_at, source_tier |
| `reporter` | A credentialed journalist | name, outlet, beat, verified |
| `source` | A data source entry in the Source Registry | source_id, tier, provider, freshness_ttl |
| `rumor_cluster` | A group of related Tier-5 signals | entities_mentioned, source_count, created_at, resolved_at |

### Market Entities

| Entity type | Description | Key attributes |
|---|---|---|
| `market` | A betting market for a game | game, market_type, opened_at |
| `sportsbook` | A licensed betting operator | name, jurisdiction, tier |
| `line` | A current price point from a sportsbook | market, sportsbook, value, timestamp |
| `prop` | A player or game proposition | player, market_type, line, opened_at |

### Intelligence Pipeline Entities

| Entity type | Description | Key attributes |
|---|---|---|
| `model_output` | A scored or ranked result from the prediction engine | model_version, generated_at, inputs |
| `pick` | A published or draft recommendation | sport, game, pick_type, line, confidence, tier, generated_at, model_version |
| `settlement` | The outcome of a pick | pick_id, result, settled_at, calibration_delta |
| `public_claim` | A claim approved for public display | claim_text, evidence_ids, approved_at, approved_by |

### Fantasy Entities

| Entity type | Description | Key attributes |
|---|---|---|
| `fantasy_league` | A user's fantasy competition | provider_type, scoring_settings, season |
| `fantasy_team` | A team within a fantasy league | league_id, roster |
| `fantasy_roster` | Current player holdings | team_id, players, week |
| `fantasy_player` | A player as a fantasy asset | player_id, ownership, projected_points |
| `fantasy_matchup` | A weekly head-to-head contest | team_a, team_b, week, scoring_period |
| `fantasy_recommendation` | A start/sit/waiver/trade suggestion | player, action, evidence_ids, confidence, generated_at |

---

## Core Relationships

```
player ──────────── belongs_to ──────────── team
player ──────────── has ─────────────────── injury
player ──────────── appears_in ──────────── market
player ──────────── subject_of ──────────── practice_report
player ──────────── subject_of ──────────── transaction
player ──────────── referenced_in ──────── article
player ──────────── referenced_in ──────── rumor_cluster

team ────────────── plays ───────────────── game
team ────────────── employs ─────────────── coach
team ────────────── employs ─────────────── coordinator
team ────────────── plays_at ────────────── venue

coach ───────────── affects ─────────────── scheme
coordinator ─────── defines ─────────────── scheme
scheme ──────────── affects ─────────────── player (usage)
scheme ──────────── affects ─────────────── fantasy_recommendation

game ────────────── has ─────────────────── market
game ────────────── played_at ───────────── venue
market ──────────── has ─────────────────── line (per sportsbook)
line ────────────── belongs_to ──────────── sportsbook

rumor_cluster ───── mentions ────────────── player
rumor_cluster ───── requires ────────────── verification (→ Tier 1–2)
article ─────────── written_by ──────────── reporter
reporter ────────── covers ──────────────── team (beat assignment)

pick ────────────── uses ────────────────── evidence (EvidenceItem[])
pick ────────────── references ──────────── game
pick ────────────── references ──────────── player (if prop)
pick ────────────── references ──────────── market
evidence ────────── supports ────────────── public_claim
settlement ──────── resolves ────────────── pick
settlement ──────── updates ─────────────── calibration

fantasy_roster ──── contains ────────────── fantasy_player
fantasy_player ──── links_to ────────────── player
fantasy_recommendation ── references ────── player
fantasy_recommendation ── uses ──────────── evidence (EvidenceItem[])
```

---

## Entity Resolution Rules

1. **Canonical ID**: Every entity must have a system-assigned canonical ID.
   External IDs (API player IDs, sportsbook codes) are mapped to the canonical ID.

2. **Deduplication**: Multiple references to the same player (by name variant,
   jersey number, or external ID) must resolve to a single canonical `player` entity.

3. **Staleness**: Entities have a `last_verified_at` timestamp. Entities used
   in active picks must be verified fresh before pick publication.

4. **Disambiguation**: Entity names that are ambiguous (e.g., two players with
   the same name) must be resolved by team, sport, and position before use.

5. **Relationship integrity**: A pick may not reference an entity that does not
   exist in the graph. Entity creation precedes pick creation.

---

## Implementation Status

```
// STATUS: PROPOSAL — not implemented.
// Full entity graph schema requires approval via
// docs/adr/pre-implementation-change-proposal-template.md

// Proposed core types:

type EntityId = string; // Canonical system-assigned UUID

type EntityType =
  | "player" | "team" | "coach" | "coordinator"
  | "league" | "season" | "game" | "venue"
  | "injury" | "practice_report" | "transaction"
  | "article" | "reporter" | "source" | "rumor_cluster"
  | "market" | "sportsbook" | "line" | "prop"
  | "model_output" | "pick" | "settlement" | "public_claim"
  | "fantasy_league" | "fantasy_team" | "fantasy_roster"
  | "fantasy_player" | "fantasy_matchup" | "fantasy_recommendation";

type EntityRef = {
  entityType: EntityType;
  entityId: EntityId;
  displayName: string;
  resolvedAt: Date;
  sourceTier: 1 | 2 | 3 | 4 | 5 | 6;
};
```

---

## Dependencies

The Entity Graph is a prerequisite for:
- Evidence Vault (`docs/brain/evidence-vault.md`) — every EvidenceItem references an entity
- Signal Ledger (`docs/brain/signal-ledger.md`) — every ledger event references an entity
- Ask the Brain (`docs/brain/ask-the-brain.md`) — Brain answers resolve entities
- Fantasy War Room (`docs/brain/fantasy-war-room.md`) — fantasy entities extend this graph
- Market Gravity (`docs/brain/market-gravity.md`) — market signals reference game and line entities
- Picks Intelligence (Component 1) — picks reference player, game, and market entities

---

## Cross-Reference

- Source Hierarchy: `docs/brain/source-hierarchy.md` — source tier on every entity observation
- Evidence Vault: `docs/brain/evidence-vault.md` — evidence stored per entity
- Fantasy War Room: `docs/brain/fantasy-war-room.md` — fantasy entity extensions
- Product Ecosystem: `docs/intelligence/product-ecosystem.md` — Component 7
