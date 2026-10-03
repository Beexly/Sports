# Sports OS — Player Performance Intelligence

**Status**: Doctrine. Specifies the Player Performance Intelligence layer.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/performance/sports-science-evidence-vault.md` — evidence sourcing
- `docs/performance/biomechanics-modality-taxonomy.md` — modality definitions
- `docs/performance/radar-and-tracking-data-layer.md` — tracking data inputs
- `docs/performance/sports-science-licensing-policy.md` — licensing constraints
- `docs/brain/source-hierarchy.md` — source tier integration
- `docs/brain/picks-intelligence.md` — downstream pick consumption

---

## Purpose

Player Performance Intelligence is a proposed Sports OS layer that would
synthesize structured biomechanics, tracking, and physical performance data
to produce calibrated signals about player health, capability trajectory,
and situational readiness. These signals supplement the existing odds-based
prediction engine with an additional evidence dimension.

This document defines the scope, source requirements, public/private
boundaries, and governance rules for this layer. The layer is **not yet
implemented**. No code may be written without following the approval gates
in Section 11.

---

## Source Evidence from Line Audit

Wave 3 audit covered sports science and player performance repositories
including biomechanics research libraries, tracking data specifications,
force plate output formats, and radar/Statcast tooling. Key findings:

- Player performance signals exist across four distinct modalities: physical
  metrics (force plate, GPS), radar/tracking (pitch velocity, bat speed,
  player positioning), video (play classification, movement efficiency),
  and external health indicators (official injury reports, participation caps).
- No single open-source repository provides a complete, commercially licensable
  player performance pipeline. All high-signal sources require a separate
  commercial license for production use.
- The highest-quality structured data comes from official league tracking programs
  (Statcast, Second Spectrum, Next Gen Stats) — all requiring paid program
  enrollment or academic partnerships that do not extend to commercial sports
  intelligence products without explicit written agreement.
- Open biomechanics repositories (OpenSim, BiomechanicsToolkit, OBP, Driveline R&D)
  are available for research but carry restrictions on commercial redistribution
  and inference use. See `docs/performance/sports-science-licensing-policy.md`.

---

## User Value

When this layer is active and properly sourced:
- Users receive pick explanations that reference not just odds movement but
  verifiable performance-trend context (e.g., "pitcher velocity down 1.2 mph
  over the last three starts — per official Statcast data").
- Fantasy intelligence users receive early signals on player trajectory before
  standard injury reports reflect them.
- Evidence Drawer entries become richer, with traceable performance-tier evidence.

**What users will NOT see**:
- Fabricated performance statistics
- Claims sourced from community speculation or social media
- Injury assertions not backed by T1/T2 data
- Confidence scores based on thin performance evidence alone

---

## Operator Value

- Pick content quality improves when performance context is available alongside
  odds context.
- Compliance liability decreases because claims are traceable to licensed sources.
- The operator gains a defensible "data advantage" narrative that separates
  Galaxy Sports Edge from tout services that manufacture performance claims.

---

## Current Sports OS Fit

The current prediction engine (`packages/prediction-engine/`) uses odds-line
data from The Odds API as its primary signal. Player performance data is not
currently ingested. Adding this layer would require:

1. New data-ingestion adapters in `packages/data-ingestion/`
2. New Evidence Vault evidence types in the schema
3. New signal weighting logic in the prediction engine
4. New UI disclosure patterns for performance-sourced evidence

All four of these are **Zone 3 actions** requiring owner approval before any
implementation work begins.

---

## Public / Private Boundary

| Content type | Public | Private |
|---|---|---|
| Pick card with performance context (e.g., "velocity trend supports this angle") | PRO/ELITE only | Raw performance metric values |
| Evidence Drawer — performance evidence tier | PRO/ELITE only | Source query parameters |
| "This pick uses Statcast data" attribution | YES | Underlying data payload |
| Player injury status (from T1 official report) | YES (with freshness disclosure) | — |
| Biomechanics metrics from licensed provider | NEVER public — internal evidence only | All metric values |
| Force plate / GPS / tracking raw data | NEVER public | All raw data |

---

## Data Required

### Minimum viable (T2 licensed):
- Official pitch tracking (Statcast/Baseball Savant) for MLB context
- Official player tracking (Next Gen Stats) for NFL context
- Injury report feeds (official league sources, T1)

### Enrichment (T2 licensed, separately):
- Radar data (Trackman, Rapsodo) — requires commercial license
- Force plate / GPS wearable data — available only through league or team partnerships
- Second Spectrum (NBA) — requires license or academic partnership

### Never admissible without commercial license:
- OBP (Open Biomechanics Project) data for commercial inference
- Driveline Baseball R&D data for commercial use
- Any academic dataset that restricts commercial use

---

## Source Quality Rules

| Tier | Applies to | Use |
|---|---|---|
| T1 | Official league injury reports, official tracking programs | Public pick evidence (with attribution) |
| T2 | Licensed tracking providers (Statcast via API, Next Gen Stats) | Pick evidence, Evidence Drawer |
| T3 | Third-party performance aggregators with documented methodology | Internal context only — never primary evidence |
| T4 | Aggregated public stats (Baseball Reference, Pro Football Reference) | Internal context only — editorial citations, never primary pick evidence |
| T5 | Community performance opinion (social media, forums, tout sites) | FORBIDDEN as evidence |
| T6 | AI-generated performance summaries | FORBIDDEN as evidence |

Performance data sourced below T2 may NOT be cited in any public pick
explanation. It may be used as a weak signal internally, but must be
disclosed as T3/T4 context with explicit uncertainty acknowledgment.

---

## Output Schema (Proposal — Not Yet Implemented)

```typescript
// PROPOSAL ONLY — requires Zone 3 approval before any implementation

interface PerformanceSignal {
  playerId: string;           // Official league player ID
  playerName: string;         // Public display name
  sport: string;              // 'MLB' | 'NFL' | 'NBA' | 'NHL'
  signalType: PerformanceSignalType;
  metricName: string;         // e.g., 'pitch_velocity_mph', 'yards_after_contact'
  metricValue: number;
  metricUnit: string;
  trendDirection: 'up' | 'down' | 'flat' | 'volatile';
  trendWindow: string;        // e.g., 'last_7_days', 'last_3_starts'
  sourceId: string;           // Evidence Vault source registry ID
  sourceTier: 'T1' | 'T2' | 'T3' | 'T4';
  evidenceDate: string;       // ISO 8601 — MUST be fresh
  ttlHours: number;           // Freshness window
  licenseVerified: boolean;   // false blocks public citation
  confidenceWeight: number;   // 0.0–1.0 weight in prediction scoring
}

type PerformanceSignalType =
  | 'velocity_trend'
  | 'injury_status'
  | 'workload_flag'
  | 'tracking_efficiency'
  | 'physical_readiness';
```

---

## Forbidden Claims

No agent or operator may publish:
- "Player X is healthy" without a T1 official injury report
- Specific metric values (velocity, force, speed) without T1/T2 sourcing
- "Our model uses biometric data" without a verified biometric data license
- Win probability claims citing player performance without a ≥30 settled
  pick calibration window with the performance dimension active
- Any claim suggesting injury speculation based on social media or community sources
- Performance claims about individual athletes sourced only from T5/T6

---

## Licensing / Security Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Using OBP or Driveline data commercially without license | P0 | Block at ingestion gate; license verification required before any data enters Evidence Vault |
| Attributing performance claims to wrong source | P1 | All Evidence Vault entries carry source ID + license status |
| Biometric data appearing in logs | P0 | No raw biometric values in response payloads or error logs |
| Player injury speculation from unverified source | P1 | T1 lock on all injury status claims |
| Academic data used in commercial product | P1 | License verification step before Evidence Vault admission |

---

## MVP Path

**MVP scope** (requires owner approval):
1. Ingest official league injury report feeds (T1) into the Evidence Vault
2. Surface injury status in pick explanations with freshness disclosure
3. Add `injury_status` as a PerformanceSignal type with proper TTL
4. No biomechanics, radar, or force plate data at MVP

**MVP does NOT include**:
- Velocity/tracking data (requires separate license)
- Force plate or GPS data (requires team/league partnership)
- Any open biomechanics repository data

---

## Future Version

**V2** (after MVP is validated):
- Statcast integration for MLB pitch/bat tracking (T2 licensed)
- Next Gen Stats for NFL player tracking (T2 licensed)
- Evidence Drawer performance tier with tier badge

**V3** (after V2 calibration period):
- Multi-sport performance comparison
- Workload flag system (pitch count trends, snap count trends)
- Performance-weighted confidence scoring

---

## Validation Requirements

A task is NOT complete until:
- All performance data ingestion uses verified T1/T2 sources only
- No raw metric values appear in any public API response payload
- Evidence Vault entries for performance signals carry `licenseVerified: true`
- Claim governance scanner covers all performance-derived pick text
- TTL enforcement is active for all performance evidence items
- Tests cover: stale evidence blocked, unlicensed source blocked, T5/T6 blocked

---

## Approval Gates

| Action | Approving party |
|---|---|
| Beginning any implementation work on this layer | Owner |
| Adding a new performance data provider to the Evidence Vault | Owner + legal license review |
| Publishing any pick that cites performance data | Operator (review) |
| Lowering TTL window for performance evidence | Owner |
| Using academic datasets in production | Owner + legal review (commercial license required) |

---

## Codex Audit Requirements

1. Confirm no performance data ingestion adapter exists without a documented
   license in the Source Acquisition Mesh
2. Confirm no performance metric values appear in any public API response
3. Confirm all performance evidence types have TTL enforcement
4. Confirm claim governance scanner covers performance-derived content
5. Report any OBP or Driveline data in the pipeline without a written
   commercial license as P0
