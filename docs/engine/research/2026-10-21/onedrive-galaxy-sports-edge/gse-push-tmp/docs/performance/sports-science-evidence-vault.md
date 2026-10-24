# Sports OS — Sports Science Evidence Vault

**Status**: Doctrine. Defines the sports science evidence tier within the Evidence Vault.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/performance/player-performance-intelligence.md` — consumer of this vault
- `docs/performance/biomechanics-modality-taxonomy.md` — modality classifications
- `docs/performance/sports-science-licensing-policy.md` — licensing rules
- `docs/brain/calibration-feedback-loop.md` — settlement calibration
- `docs/audit/final-wave-source-risk-register.md` — source risk classification

---

## Purpose

The Sports Science Evidence Vault is a proposed sub-vault within the Sports OS
Evidence Vault system that would hold verified, licensed, and timestamped
sports science data items. These items represent physical, biomechanical,
and performance-tracking evidence that can be attached to picks or Brain
answers to provide an additional intelligence dimension beyond odds-based signals.

This document defines the vault's structure, admission criteria, expiry rules,
tier classification, and governance. The vault is **not yet implemented**.

---

## Source Evidence from Line Audit

Wave 3 audit identified the following evidence categories and repositories:

**Official / T1 evidence types**:
- Official league injury designations (IR, Q, D, O, DNP) — structured feeds
- Official pitch tracking (Statcast) — public endpoint with rate limits
- Official player tracking (Next Gen Stats, Second Spectrum) — requires enrollment

**Licensed / T2 evidence types**:
- Trackman pitch data (commercial license required)
- Rapsodo radar data (commercial license required)
- Hawkeye tracking data (league partnership required)
- Wearable GPS data (team partnership required)

**Research / T3–T4 (internal context only)**:
- OpenBiomechanics Project (OBP) — research license, no commercial redistribution
- Driveline Baseball R&D datasets — research license, no commercial use
- Sports Reference databases — editorial use permitted, bulk scraping prohibited
- PitchingNinja / similar community-aggregated databases — T5, forbidden as evidence

**Line audit finding**: No single open-source repository provides production-ready,
commercially licensable sports science data. Every high-signal source requires
independent license verification before Evidence Vault admission.

---

## User Value

- Users who see a pick supported by performance evidence receive a richer,
  more transparent explanation of the reasoning.
- Evidence Drawer entries become more specific — not just "odds suggest X"
  but "velocity trend over last 5 starts (Statcast) supports X."
- Trust in the platform increases when evidence is traceable, dated, and
  source-attributed — not speculative.

---

## Operator Value

- Operator can build a defensible claim record: every published inference
  has an evidence chain in the vault.
- Regulatory and legal exposure decreases because no claims are fabricated.
- The vault serves as an audit log: if a pick is challenged, the operator
  can produce the exact evidence items that backed it.

---

## Current Sports OS Fit

The current Evidence Vault (schema: `packages/db/prisma/schema.prisma`) does
not have a dedicated sports science evidence type. Adding one requires:
- New Prisma model (`SportsScienceEvidence`) — Zone 3 approval required
- New Evidence Vault ingestion job — Zone 3 approval required
- New license verification step in the Source Acquisition Mesh

No sports science evidence types may be added without satisfying all
approval gates in Section 11.

---

## Public / Private Boundary

| Evidence type | Public display | Private (internal only) |
|---|---|---|
| Official injury designation (T1) | Yes — with freshness timestamp | Raw feed payload |
| Statcast aggregate pitch metrics | Yes (T2, licensed endpoint) | Raw data query |
| Biomechanics research signals | NEVER | All values |
| GPS/wearable physical load | NEVER | All values |
| Academic research datasets | NEVER | All values |
| T5/T6 community performance opinion | NEVER admitted | — |

Public display of evidence is limited to T1 and T2 sources. T3/T4 sources
are internal context only and may never appear in user-facing evidence
attributions.

---

## Data Required

### Admission checklist for each evidence item:

```
Source ID: [Source Acquisition Mesh registry ID]
Source tier: [T1 | T2 | T3 | T4]
License verified: [YES | NO — blocks admission if NO for T1/T2 public use]
License type: [Official program | Commercial API | Research (restricted)]
Commercial use permitted: [YES | NO]
Evidence type: [see modality taxonomy]
Modality: [physical | radar | tracking | video | health]
Metric name: [specific field name]
Metric value: [number]
Metric unit: [unit string]
Athlete ID: [official league player ID]
Evidence date: [ISO 8601 UTC]
TTL hours: [freshness window]
Expiry date: [evidence date + TTL]
Source URL or endpoint: [internal reference only — never public]
```

---

## Source Quality Rules

### T1 admission (official league)
- Source must be an official league data program
- Structured data format (JSON/CSV/XML) — no HTML scraping
- Must include official player ID mapping
- TTL: 4 hours for injury reports, 24 hours for performance metrics
- No commercial license required (public program data)

### T2 admission (licensed provider)
- Written commercial license on file with owner
- License permits: ingestion, derivation, internal inference
- License prohibits: redistribution of raw data
- TTL: per provider contract — default 24 hours
- Source ID must appear in Source Acquisition Mesh with `ADMITTED` status

### T3 admission (internal context only)
- Research license reviewed and documented
- `publicCitation: false` flag mandatory
- Never surfaces in Evidence Drawer or public pick explanations
- Used only for internal model context — not prediction evidence

### T4 admission (blocked from evidence use)
- Community-aggregated, editorial, or manually curated sources
- May not be used as evidence items in the vault
- May be referenced in operator-written editorial (with disclosure)

### T5/T6 (permanently forbidden)
- No sports science evidence item may originate from a T5 or T6 source
- Any T5/T6 item discovered in the vault is a P1 incident

---

## Output Schema (Proposal — Not Yet Implemented)

```typescript
// PROPOSAL ONLY — requires Zone 3 approval before schema modification

interface SportsScienceEvidenceItem {
  id: string;                    // UUID
  sourceId: string;              // Source Acquisition Mesh ID
  sourceTier: 'T1' | 'T2' | 'T3';
  licenseVerified: boolean;      // false = blocked from public citation
  commercialUsePermitted: boolean;
  modality: ScienceModality;
  evidenceType: string;          // Specific evidence type within modality
  athleteId: string;             // Official league player ID
  athleteName: string;           // Public display only — do not use for inference
  sport: string;
  season: string;
  metricName: string;
  metricValue: number;
  metricUnit: string;
  rawPayloadHash: string;        // SHA-256 of raw data — for audit, not storage
  evidenceDate: string;          // ISO 8601 UTC
  ttlHours: number;
  expiresAt: string;             // ISO 8601 UTC — enforced by scheduler
  status: 'ACTIVE' | 'STALE' | 'EXPIRED' | 'REVOKED';
  publicCitation: boolean;       // false for T3, always false for unlicensed
  inferencePurposeOnly: boolean; // true = internal only, never user-facing
  createdAt: string;
}

type ScienceModality =
  | 'physical'     // Force plate, GPS, wearable
  | 'radar'        // Pitch velocity, bat speed, ball flight
  | 'tracking'     // Player positioning, speed, acceleration
  | 'video'        // Play classification, movement efficiency
  | 'health';      // Injury status, participation cap, conditioning flag
```

---

## Forbidden Claims

No agent or operator may:
- Cite a T3/T4 source as primary evidence in any public pick explanation
- Publish biomechanics metric values without a verified T2 commercial license
- Claim "our model incorporates biometric data" without a verified wearable
  data license
- Reference OBP, Driveline, or academic research datasets in public content
- Present stale evidence items (TTL exceeded) as current
- Use AI-generated performance summaries as evidence items

---

## Licensing / Security Risks

| Risk | Severity | Mitigation |
|---|---|---|
| OBP or Driveline data used commercially | P0 | License gate at Evidence Vault admission |
| Raw biometric values in API response | P0 | Strip at serialization layer |
| Expired evidence item cited as current | P1 | TTL enforced by scheduled expiry job |
| License revoked mid-integration | P1 | 48-hour removal protocol |
| T5 speculation presented as T2 evidence | P0 | Source tier validation at admission |
| Academic dataset license violated | P1 | Owner + legal review before admission |

---

## MVP Path

**MVP scope** (requires owner approval before any implementation):
1. Add `SportsScienceEvidenceItem` schema type (Zone 3)
2. Implement injury status ingestion from official league feeds (T1)
3. TTL enforcement job for sports science evidence items
4. Evidence Drawer sports science tier (PRO/ELITE only)

**NOT in MVP**:
- Biomechanics modality
- Radar / tracking modality
- Video / play classification modality
- Any T2 commercial provider integrations (separate approval cycle per provider)

---

## Future Version

**V2**: T2 performance tracking (Statcast, Next Gen Stats) with license on file
**V3**: Biomechanics modality (force plate, GPS) with team/league partnership
**V4**: Video play classification integration with prediction engine weighting

---

## Validation Requirements

A task is NOT complete until:
- All admitted evidence items have `licenseVerified: true` for T1/T2
- All T3 items have `publicCitation: false` and `inferencePurposeOnly: true`
- TTL enforcement scheduler is running and tested
- Stale evidence items are excluded from Evidence Drawer display
- No biometric raw values appear in any API response payload
- P0 test: attempting to admit a T5 source fails with documented rejection

---

## Approval Gates

| Action | Approving party |
|---|---|
| Adding `SportsScienceEvidenceItem` schema type | Owner |
| Admitting any T2 performance data provider | Owner + legal license review |
| Reducing TTL windows for any evidence type | Owner |
| Making any T3 evidence item publicly citable | NEVER |
| Ingesting academic dataset in any form | Owner + legal review |

---

## Codex Audit Requirements

1. Confirm no `SportsScienceEvidenceItem` with `publicCitation: true` exists
   where `sourceTier` is T3 or lower
2. Confirm TTL enforcement runs on schedule and marks expired items `EXPIRED`
3. Confirm no raw biomechanics or wearable data appears in API response payloads
4. Confirm all admitted T2 sources have a corresponding license record
5. Report any OBP or Driveline admission without a commercial license as P0
