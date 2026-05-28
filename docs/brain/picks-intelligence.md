# Sports OS — Picks Intelligence

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §3 · Component 1
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/brain/evidence-vault.md` — evidence chain backing each pick
- `docs/brain/signal-ledger.md` — full lifecycle audit trail
- `docs/brain/entity-graph.md` — canonical entities referenced in picks
- `docs/brain/market-gravity.md` — market signal inputs
- `docs/brain/claim-governance.md` — what language is and is not permitted
- `docs/brain/calibration-feedback-loop.md` — how settlements recalibrate confidence
- `docs/intelligence/product-ecosystem.md` — component dependency map

---

## Purpose

Picks Intelligence is the primary user-facing output of the Sports OS intelligence
network. It translates structured odds data, source evidence, market signals,
model scoring, and risk assessment into a formatted pick — a decision-ready
intelligence package that a user can act on, question, and audit.

A pick is NOT a guaranteed winner. A pick is NOT a tout's endorsement.
A pick is a structured, evidence-backed, confidence-scored, risk-annotated
intelligence output with full provenance — the system's best current read
of a specific game situation, stated as such.

Every pick carries a paper trail. Every pick can be challenged. Every pick is
settled against reality and its confidence score is recalibrated accordingly.

---

## What a Pick Is

A pick is a structured intelligence output with these mandatory components:

```typescript
// STATUS: PROPOSAL — for documentation purposes only.
// Full implementation requires Evidence Vault, Signal Ledger, and Entity Graph.
// Schema changes require owner approval.

type PickTier = "FREE" | "PRO" | "ELITE";
type PickConfidence = number; // 0–100, calibrated against settled picks
type PickRisk = "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
type PickStatus = "ACTIVE" | "SETTLED_WIN" | "SETTLED_LOSS" | "PUSH" | "VOID" | "WITHHELD";

type Pick = {
  // Identity
  pickId: string;
  sport: string;
  league: string;
  gameId: string;        // references Entity Graph Game entity
  generatedAt: Date;
  modelVersion: string;

  // The call
  pickType: "SPREAD" | "MONEYLINE" | "TOTAL" | "PROP" | "WATCHLIST";
  side: string;          // human-readable: "Chiefs -3.5", "OVER 47.5", etc.
  line: string;          // exact line at time of generation
  oddsContext: string;   // odds at time of generation, displayed as context

  // Intelligence
  confidence: PickConfidence;  // 0–100; must be calibrated, never invented
  risk: PickRisk;
  tier: PickTier;        // access gate — free/pro/elite
  evidenceChain: EvidenceChainSummary;
  weaknesses: string[];  // what would weaken this pick — required, never empty
  marketContext: MarketContextSummary;

  // Provenance
  sourcesFreshnessAt: Date;    // oldest Tier 1/2 source used
  publicSafe: boolean;
  publicSafeCheckedAt: Date;

  // Settlement
  status: PickStatus;
  settledAt?: Date;
  settlementResult?: "WIN" | "LOSS" | "PUSH" | "VOID";
  calibrationImpact?: CalibrationImpact;
};
```

---

## Evidence Chain — Required Structure

Every pick must carry an evidence chain. A pick with an empty or incomplete
evidence chain is withheld.

```typescript
// STATUS: PROPOSAL — not implemented.

type EvidenceChainSummary = {
  primaryEvidence: EvidenceRef[];    // Tier 1 and Tier 2 items
  supportingEvidence: EvidenceRef[]; // Tier 3 items
  marketEvidence: EvidenceRef[];     // Tier 4 items
  weakSignals: EvidenceRef[];        // Tier 5 items — shown in cockpit only
  contradictions: EvidenceRef[];     // items that weaken the pick
  minimumTier: 1 | 2 | 3;           // lowest tier used to make the call
  freshestAt: Date;
  stalestAt: Date;
  allFresh: boolean;                 // false if any Tier 1/2 item exceeds TTL
};

type EvidenceRef = {
  evidenceId: string;
  sourceTier: 1 | 2 | 3 | 4 | 5;
  summary: string;
  retrievedAt: Date;
  validUntil: Date;
};
```

**Minimum evidence requirements by pick type**:

| Pick type | Minimum Tier 1/2 items | Minimum total evidence items |
|---|---|---|
| SPREAD | 1 | 3 |
| MONEYLINE | 1 | 2 |
| TOTAL | 1 | 2 |
| PROP | 2 | 4 |
| WATCHLIST | 0 | 1 (any tier) |

A pick that does not meet minimum requirements is set to `WITHHELD` status.
A pick on `WATCHLIST` does not carry a directional call — it flags a situation
for monitoring only.

---

## Confidence Score — Rules

The confidence score (0–100) measures how strongly the evidence supports the
pick direction. It is NOT a win probability. It is NOT a guarantee.

**Calibration rule**: Confidence scores must be calibrated against settled
picks for the same model version. A model version cannot claim a confidence
score range it has not yet earned through settlement data.

**Floor rules**:
- New model versions start with confidence capped at 70 until 30 picks are
  settled. This is a hard cap, not a soft recommendation.
- A model version with fewer than 10 settled picks cannot surface confidence
  scores on any public surface.

**Score bands**:

| Band | Label | Meaning |
|---|---|---|
| 80–100 | Strong | Evidence is deep, fresh, consistent. Contradictions are weak. |
| 65–79 | Moderate | Evidence is solid. Some contradictions or freshness gaps. |
| 50–64 | Lean | Evidence points in a direction but is incomplete or mixed. |
| 35–49 | Watchlist | Signal exists but evidence is thin. Directional call not warranted. |
| 0–34 | Withheld | Evidence is too thin or too contradictory for publication. |

A score below 50 must not surface as a directional pick on any public surface.
It may appear in the cockpit as a watchlist item with a THIN_EVIDENCE flag.

---

## Risk Annotation — Required

Every pick carries a risk annotation. Risk is distinct from confidence.
High confidence can co-exist with high risk (e.g., thin-market props, injury-
adjacent plays, weather-affected games).

**Risk factors** (any present triggers at least MODERATE risk):
- Injury status of a key player is Tier 3 only (no Tier 1 confirmation)
- Game-time decision on a starter
- Line has moved significantly since evidence was retrieved
- Weather forecast is uncertain
- Model disagreement is above 15 confidence points
- No Tier 1 source retrieved in last 4 hours for a game-day pick

**Risk factor composition** (VERY_HIGH triggers):
- Any two HIGH risk factors simultaneously
- Injury status is Tier 5 only
- Stale Tier 1 data (exceeds TTL) with no refresh available

---

## Tier Access Gate

The tier gate is enforced server-side only. Frontend display is gated downstream
of the API response — the response does not carry the gated field for unauthorized
tiers.

| Field | FREE | PRO | ELITE |
|---|---|---|---|
| Pick direction | ✅ (1/day max) | ✅ | ✅ |
| Confidence score | ❌ | ✅ | ✅ |
| Evidence chain summary | ❌ | ✅ | ✅ |
| Risk annotation | ❌ | ✅ | ✅ |
| Market context | ❌ | ✅ | ✅ |
| Weaknesses | ❌ | ✅ | ✅ |
| Early access (pre-line-open) | ❌ | ❌ | ✅ |
| Analytics dashboard | ❌ | ❌ | ✅ |
| Alerts | ❌ | ❌ | ✅ |

**Free tier rules**:
- One pick per day maximum. This is a server-side count, not a frontend gate.
- The pick shown is selected by highest confidence + freshest evidence.
- No confidence score is shown. No evidence chain is shown.
- The pick direction and line are shown.
- A freshness timestamp is shown: "Based on data as of [timestamp]".

---

## What a Pick Cannot Claim

These claims are forbidden on all surfaces (public, premium, and cockpit)
regardless of evidence:

- "Lock" or "guaranteed winner"
- "Risk-free" or "free money" or "easy money"
- "Sure thing" or "cannot lose"
- "Sharp money is on [side]" — unless supported by specific Tier 1/2 data,
  not inferred from line movement alone
- A specific win rate ("we go 68% on totals") — unless backed by at least
  30 settled picks at that model version with verifiable settlement data
- "Verified inside information" — ever
- "Our model knows something the market doesn't" — this phrasing implies
  privileged access that does not exist
- Any claim that implies the system has access to non-public information

**Approved confidence language** (for pick copy only):
- "The evidence points toward …"
- "Market movement and source data lean …"
- "Based on available Tier 1–2 sources, …"
- "This situation carries [LOW / MODERATE / HIGH] uncertainty"
- "Confidence: [N]/100 — see evidence chain"
- "What would weaken this: [list]"

---

## Settlement and Accountability

Every pick is settled after game completion. The settlement record is
permanent and immutable. A pick cannot be deleted, retroactively modified,
or voided except by the PUSH or VOID rules below.

**Settlement rules**:

| Outcome | Status | Calibration |
|---|---|---|
| Pick direction correct | SETTLED_WIN | Positive calibration signal |
| Pick direction incorrect | SETTLED_LOSS | Negative calibration signal |
| Line exactly ties | PUSH | Neutral — excluded from calibration |
| Game cancelled / postponed | VOID | Excluded from calibration |

**What settlement enables**:
- Public settlement record available to all tiers
- Calibration feedback sent to the prediction engine (see
  `docs/brain/calibration-feedback-loop.md`)
- Model version accuracy tracking updated
- Evidence quality signals updated (did the evidence correctly predict outcome?)

**Forbidden post-settlement behaviors**:
- Changing a pick's direction after the game starts
- Reclassifying a LOSS as a PUSH without Tier 1 settlement confirmation
- Retroactively voiding a pick to avoid a loss on the public record

---

## Public Surface Requirements

Before any pick appears on a public surface:

1. Evidence chain has been validated (all required fields populated)
2. All Tier 1/2 evidence is within TTL
3. Confidence score meets the minimum for publication (≥50 for directional picks)
4. Claim governance check has passed (no forbidden language)
5. Model version has at least 10 settled picks (or confidence is capped at 70)
6. Pick has been written to the Signal Ledger with a PUBLISHED event

If any gate fails, the pick status is set to WITHHELD.
A WITHHELD pick appears in the cockpit with the failure reason.
A WITHHELD pick does not appear on any public or premium surface.

---

## Performance Tracking

Sports OS tracks model accuracy publicly. Performance claims are governed:

- Win rate is calculated only from SETTLED_WIN and SETTLED_LOSS records
  (PUSH and VOID are excluded from numerator and denominator)
- Win rate is displayed as "[W]W–[L]L" with a timestamp of the range
- Win rate may not be projected forward ("at this rate…")
- Win rate is displayed per model version — versions are not blended
- Win rate requires at least 30 settled picks per model version before
  public display
- The trailing window (last 30, last 50, last 100 picks) is displayed —
  not a career aggregate

---

## Dependency Requirements

Picks Intelligence requires the following components before full operation:

| Component | Required for |
|---|---|
| Evidence Vault (Component 6) | Evidence chain storage and retrieval |
| Entity Graph (Component 7) | Canonical game, player, team entity resolution |
| Signal Ledger (Component 8) | Full lifecycle audit trail |
| Source Acquisition Mesh (Component 5) | Source registration and health scoring |
| Claim Governance (Component 12) | Language validation before publication |
| Market Gravity (Component 9) | Market signal inputs |

Until Evidence Vault and Signal Ledger schemas are approved and implemented,
the picks surface operates in its current form without Brain-layer evidence chain
display. Evidence chain display is a PRO/ELITE feature gated on those components.
