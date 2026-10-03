# Sports OS — Weak Signal Engine

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §4.2 · Component 4
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## Purpose

The Weak Signal Engine monitors Tier-5 community sources for early indicators
that may precede official confirmation: injury chatter, lineup speculation,
rumor clusters, keyword spikes, and sentiment shifts.

Weak signals are never verified facts. They are watchlist inputs that trigger
verification workflows — not outputs that reach users directly.

**The engine's only valid output is a watchlist flag or a verification task.**

---

## What Qualifies as a Weak Signal

A weak signal is any information that:

1. Originates from Tier 5 sources (community, social media, unverified reporters)
2. Has not been confirmed by a Tier 1 or Tier 2 source
3. Relates to an entity in the Sports OS entity graph (player, team, game, market)
4. Meets one or more of the following threshold conditions:

| Condition | Description |
|---|---|
| Mention spike | Unusual increase in mentions of a player or injury term |
| Sentiment shift | Rapid change in community sentiment around a player or team |
| Rumor cluster | Multiple independent community sources repeating the same claim |
| Market correlation | Community chatter coincides with unusual market movement |
| Verification gap | A claim exists in Tier 5 with no Tier 1–3 confirmation after 2+ hours |

---

## Permitted Engine Outputs

The Weak Signal Engine may produce only the following output types.
Every output must be labeled with its source tier and verification status.

### 1. Watchlist Flag
```
Entity: [player/team/game]
Signal type: [mention spike / sentiment shift / rumor cluster / market correlation]
Source tier: 5
First detected: [timestamp]
Last updated: [timestamp]
Verification status: UNVERIFIED
Assigned to: [operator / auto-queue]
```

### 2. Rumor Cluster
```
Cluster ID: [id]
Entities mentioned: [list]
Source count: [n]
Claim summary: [one-sentence neutral description]
Tier 1-2 confirmation: NONE
Market alignment: [YES / NO / UNKNOWN]
Language required: "Community discussion rising — not a confirmed signal"
```

### 3. Contradiction Alert (Tier 5 vs. Tier 1–3)
```
Entity: [player/team/game]
Tier 1-3 claim: [claim + source + timestamp]
Tier 5 claim: [claim]
Conflict type: [status conflict / timeline conflict / identity conflict]
Resolution: PENDING VERIFICATION
```

### 4. Verification Task
```
Task type: Source verification
Priority: [HIGH / MEDIUM / LOW]
Entity: [player/team/game]
Claim to verify: [description]
Tier 5 source: [description]
Verification target: Tier 1 or Tier 2 source
Deadline: [time window]
```

### 5. Market-Correlation Note (cockpit only)
```
Entity: [player/team/game]
Market movement: [line change + direction + speed]
Community signal: [description]
Correlation: [ALIGNED / MISALIGNED / INCONCLUSIVE]
Note: Market movement does not confirm community signal.
```

---

## Forbidden Engine Outputs

The Weak Signal Engine must never produce the following, regardless of
signal strength or volume:

| Forbidden output | Why |
|---|---|
| Verified injury status | Only Tier 1 (official report) can confirm injury status |
| "Inside information" claims | Community sources cannot have verified inside access |
| Public accusations about players or coaches | Unverified Tier 5 claims have no standing as facts |
| Picks or recommendations | Weak signals are never a sufficient evidence base for picks |
| Certainty language | "Confirmed," "breaking," "official," "verified" — all forbidden |
| Public-facing claims | No Tier 5 output reaches a public surface without Tier 1–2 corroboration |

---

## Required Language for All Tier-5 Outputs

Every engine output involving Tier-5 data must use one or more of the
following language patterns. These are not optional stylistic choices —
they are accuracy requirements:

- "Unverified community chatter detected"
- "Community discussion is rising around [entity]"
- "No official confirmation found as of [timestamp]"
- "Treat as watchlist only — requires Tier 1 or Tier 2 verification"
- "This is community discussion, not a confirmed signal"
- "Market movement does / does not align with community chatter"
- "Contradicted by [Tier 1 source] — community claim remains unverified"
- "Needs primary-source verification before any recommendation is made"

**Forbidden substitutes** (must not appear in any Tier-5 output):
- "Sources say" (without named Tier 1–3 attribution)
- "Reports indicate" (without named outlet and reporter)
- "We're hearing" (implies insider access the engine does not have)
- "It looks like" (false confidence)
- Any certainty or probability claim derived solely from community volume

---

## Escalation to Tier 1–2 Verification

When a weak signal meets escalation criteria, the engine must generate a
verification task and route it to the operator queue.

**Escalation criteria** (any one triggers escalation):

| Criterion | Threshold |
|---|---|
| Mention spike duration | Sustained for 30+ minutes |
| Rumor cluster size | 3+ independent Tier-5 sources repeating same claim |
| Market correlation | Line movement of 1.5+ points coincides with chatter |
| Injury term detection | Official injury terminology used in Tier-5 sources |
| Entity criticality | Player is in an active pick's evidence set |

**Escalation action**:
1. Generate a Verification Task (see permitted outputs above)
2. Add entity to the cockpit watchlist
3. Suppress any public output for this entity until Tier 1–2 verification completes
4. Update the Evidence Vault entry (when implemented) with POSSIBLE contradiction flag

---

## What the Engine Does Not Do

- It does not scrape community sources without source-policy approval
- It does not interpret market movement as confirmation of a rumor
- It does not assign confidence scores to Tier-5 claims
- It does not auto-publish any output to a public surface
- It does not send alerts to users based solely on Tier-5 signals

Crawler implementation for Tier-5 sources is **BLOCKED** until source-policy
approval is received per `ACTIVE_AGENT_RELAY.md` BLOCK-7.

---

## Cross-Reference

- Source Hierarchy: `docs/brain/source-hierarchy.md` — Tier-5 definition
- Evidence Vault: `docs/brain/evidence-vault.md` — where verified signals are stored
- Entity Graph: `docs/brain/entity-graph.md` — entity resolution for signal attribution
- Operator Cockpit: `docs/brain/operator-cockpit-governance.md` — where watchlist items surface
- ADR Promotion Checklist: `docs/adr/promotion-publication-checklist.md` — public-safe gate
