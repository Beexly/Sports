# Sports OS — Ask the Brain

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §4.7 · Component 3
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## Purpose

The Sports Research Brain (Ask the Brain) is Sports OS's source-backed
question-answering and research system. It produces structured, evidence-cited
answers to sports intelligence questions for operators and, eventually,
premium users.

Every Brain answer is traceable to evidence. Every answer states its
confidence level. Every answer states what would weaken it.
No Brain answer fabricates data or implies certainty it cannot support.

**Launch sequence**: Internal cockpit only → limited public beta →
public launch. Public launch requires claim governance and source
transparency validation. The Brain is cockpit-only until those gates pass.

---

## Example Questions the Brain Answers

- Where is this player in injury rehabilitation?
- What offensive scheme changes happened for this team this offseason?
- What is this batter's hard-hit percentage trend over the last 30 games?
- Why did this strikeout prop line move 1.5 points in the last 4 hours?
- Is this injury rumor from Reddit confirmed by any official source?
- What is this receiver's target share trend since the WR1 went on IR?
- What do the advanced metrics say about this team's pass defense vs. slot receivers?

---

## BrainAnswer Schema (Required Fields)

Every Brain answer must populate all of the following fields before it
may be shown to any user on any surface. An answer with missing required
fields is withheld.

```typescript
// STATUS: PROPOSAL — schema for documentation purposes.
// Full implementation requires Evidence Vault, Entity Graph, and Signal
// Ledger to be in place. Ask the Brain is cockpit-only until those exist.

type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";
type PublicSafeStatus = "PUBLIC_SAFE" | "COCKPIT_ONLY" | "WITHHELD";

type BrainAnswer = {
  // Identity
  answerId: string;
  question: string;
  askedAt: Date;
  answeredAt: Date;
  modelVersion: string;

  // Core answer
  directAnswer: string;          // 1–3 sentence direct response
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;       // 0–100

  // Evidence
  evidenceUsed: EvidenceRef[];   // References to EvidenceVault items
  sourceQuality: "OFFICIAL" | "LICENSED" | "TRUSTED_SECONDARY" | "MARKET" | "WEAK_SIGNAL" | "MIXED";
  highestSourceTier: 1 | 2 | 3 | 4 | 5 | 6;
  lowestSourceTier: 1 | 2 | 3 | 4 | 5 | 6;

  // Context
  whatChanged: string;           // What is different vs. prior state (or "No change detected")
  supportingSignals: string[];   // Evidence that strengthens the answer
  weakeningSignals: string[];    // Evidence that contradicts or weakens the answer
  missingData: string[];         // What data would improve confidence if available

  // Market context
  marketContext?: string;        // Relevant line or market observation (optional)

  // Implications
  fantasyImplication?: string;   // Relevance for fantasy decisions (optional)
  pickImplication?: string;      // Relevance for betting picks (optional)

  // Publication control
  publicSafeStatus: PublicSafeStatus;
  publicSafeReason?: string;     // Why withheld or cockpit-only, if not public safe

  // Freshness
  lastUpdated: Date;             // When the evidence was last refreshed
  staleAt?: Date;                // When this answer should be re-verified
};

type EvidenceRef = {
  evidenceId: string;
  sourceTier: 1 | 2 | 3 | 4 | 5 | 6;
  sourceLabel: string;           // Display-safe source name
  retrievedAt: Date;
};
```

---

## Required Answer Fields — Human-Readable Description

Every answer presented to any user must include:

| Field | What it contains | Required on public surface |
|---|---|---|
| Direct answer | 1–3 sentences directly responding to the question | ✅ Yes |
| Confidence level | LOW / MEDIUM / HIGH with brief rationale | ✅ Yes |
| Evidence used | Source tier and source label for each piece of evidence | ✅ Yes (tier label minimum) |
| Source quality | Overall quality classification of the evidence set | ✅ Yes |
| What changed | What is new or different since the last check | ✅ Yes |
| Supporting signals | What strengthens the answer | ✅ Yes |
| Weakening signals | What could undermine the answer | ✅ Yes |
| Missing data | What data would improve the answer | ✅ Yes |
| Last updated | When evidence was last verified | ✅ Yes |
| Public-safe status | Whether this answer may appear publicly | N/A (internal gate) |
| Market context | Relevant line or market movement | Optional |
| Fantasy implication | Start/sit or roster relevance | Optional |
| Pick implication | Bet relevance | Optional |

---

## Confidence Level Definitions

| Level | Meaning |
|---|---|
| `HIGH` | Multiple Tier 1–2 sources agree, no material weakening signals, recent verification |
| `MEDIUM` | Tier 1–3 sources present, some weakening signals exist, or data is approaching TTL |
| `LOW` | Only Tier 3–4 sources, significant weakening signals, or data is stale / unverifiable |

Confidence level must never be set higher than the available evidence supports.
`HIGH` confidence on Tier-4-only evidence is forbidden.

---

## Public Safety Gate

Before any Brain answer may appear on a public or premium surface:

1. `publicSafeStatus` must be `PUBLIC_SAFE`
2. `highestSourceTier` must be 1, 2, or 3 (Tier 4 requires market-context caveat)
3. `weakeningSignals` must be displayed alongside the answer — never omitted
4. The answer must pass the public-copy scanner
5. The answer must not contain any forbidden language (casino, guaranteed, locked, etc.)
6. Claim governance must be in place (Component 12) before any public answers are published

---

## What the Brain Does Not Do

- It does not fabricate evidence items
- It does not assign `HIGH` confidence without Tier 1–2 corroboration
- It does not omit weakening signals to make an answer appear stronger
- It does not imply insider access or sharp-money confirmation
- It does not answer questions with Tier-5-only evidence on any user surface
- It does not produce pick recommendations directly — picks flow through
  Component 1 (Picks Intelligence) with the Brain as one input

---

## Launch Sequence

```
Phase 1: Internal cockpit only
  - Brain answers visible to operators only
  - Full BrainAnswer schema required even for internal use
  - Human review required for any answer used in a public pick rationale

Phase 2: Limited public beta (gated)
  - Select Elite users may query the Brain
  - All answers carry visible confidence, sources, and weakening signals
  - Claim governance must be fully operational before this phase

Phase 3: Public launch
  - Available to Pro and Elite subscribers
  - Public-copy scanner and brand-voice tests must pass for every answer template
  - Minimum 30 settled picks per model version before any accuracy claim is shown
  - Source transparency pages (/intelligence/source-hierarchy, /intelligence/how-it-works)
    must be live before public launch
```

---

## Cross-Reference

- Evidence Vault: `docs/brain/evidence-vault.md` — all evidence referenced in BrainAnswer
- Entity Graph: `docs/brain/entity-graph.md` — entities resolved in every answer
- Signal Ledger: `docs/brain/signal-ledger.md` — answer lifecycle events
- Market Gravity: `docs/brain/market-gravity.md` — market context input
- Claim Governance: `docs/brain/claim-governance.md` — public-safe approval requirement
- Operator Cockpit: `docs/brain/operator-cockpit-governance.md` — internal-only gate
