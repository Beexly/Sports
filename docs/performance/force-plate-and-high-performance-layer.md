# Sports OS — Force Plate and High-Performance Layer

**Status**: Doctrine. Governs physical performance and wearable data types.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/performance/biomechanics-modality-taxonomy.md` — Physical / Kinetic modality
- `docs/performance/sports-science-evidence-vault.md` — vault admission rules
- `docs/performance/sports-science-licensing-policy.md` — licensing constraints
- `docs/performance/player-performance-intelligence.md` — consumer layer

---

## Purpose

The Force Plate and High-Performance Layer governs Sports OS's approach to
physical load monitoring data: force plate output, GPS wearable metrics,
heart rate variability (HRV), inertial measurement unit (IMU) data, and
similar physiological / kinetic signals. These represent the deepest layer
of athlete performance intelligence — and the most legally and ethically
complex.

This layer is **V3+ only**. No implementation is approved at any current
phase. This document exists to establish governance rules and prevent any
premature, unlicensed, or privacy-violating use of these data types.

---

## Source Evidence from Line Audit

Wave 3 audit reviewed:

**Force plate systems**: AMTI, Kistler, Bertec — standard laboratory-grade
force plate manufacturers. Output formats: CSV, BDF (BioDataFile), analog
voltage time-series. Used in research labs and elite team facilities.

**GPS wearables**: Catapult Sports (ClearSky GNSS, Vector GPS vest), STATSports
(APEX), StatSports — primary commercial providers for team GPS. Output: CSV
exports from team portal, JSON API for commercial accounts. Data includes:
total distance, max velocity, acceleration/deceleration count, high-speed
running distance, PlayerLoad™ metric.

**IMU / inertial**: Xsens MVN (full-body suit), Delsys Trigno — used in
clinical and research contexts for precise joint angle and segment movement.
Output: BVH, C3D, proprietary binary formats.

**OpenBiomechanics Project (OBP)**:
- Public repository of collected force plate and motion capture data
- Covers pitching, overhead athlete mechanics, lower extremity landing
- License: Creative Commons BY 4.0 for data, MIT for code
- **Commercial use restriction**: The CC BY 4.0 license permits commercial
  use BUT requires attribution. However, Driveline Baseball (co-publisher
  of OBP) imposes additional commercial restrictions on derivative work
  used in commercial prediction or advisory products. Their terms must be
  reviewed and written agreement obtained before any commercial use.

**Driveline Baseball R&D**:
- Published research datasets including force plate, Rapsodo, and motion
  capture data from their lab
- Available on GitHub and their public research portal
- **Commercial use**: Driveline's posted terms prohibit commercial use of
  their research data without written license agreement. This applies to
  their independently published datasets, not OBP-hosted data.

---

## User Value

When properly licensed (V3+):
- Picks involving pitchers in high-pitch-count situations can reference
  workload flags derived from GPS load metrics (team GPS data, licensed).
- Fantasy content can discuss "physical load trajectory" as a qualifier
  for roster decisions (with appropriate sourcing and TTL).
- Evidence Drawer can surface "workload concern flagged — based on licensed
  team GPS data" as a pick modifier.

**Users will NOT see**:
- Individual athlete biometric values
- Force plate curves or joint torque values
- GPS coordinates or movement paths
- HRV or physiological data of any kind

---

## Operator Value

- Physical load data represents a genuine competitive advantage when properly
  licensed — most public sports analytics has no access to team GPS or
  force plate data.
- Strict governance (this document) prevents legal liability from unauthorized
  athlete data use.
- Clear "V3+ only" designation prevents premature implementation that
  would require expensive remediation.

---

## Current Sports OS Fit

**Zero current fit.** No wearable, force plate, or GPS data infrastructure
exists in the current codebase. This layer is fully prospective.

Implementation would require:
- Team or league partnership agreements (no technical substitute)
- Prisma schema additions for physical performance evidence (Zone 3)
- New ingestion adapters (Zone 3)
- Athlete consent framework (legal requirement)
- Data minimization architecture (no raw biometric storage)

---

## Public / Private Boundary

| Data type | Public display | Restriction |
|---|---|---|
| "Workload flag raised (licensed GPS)" | PRO/ELITE — aggregate signal only | No specific load values |
| Force plate-derived injury risk flag | NEVER public — internal only | Requires team/league partnership |
| HRV / physiological indicators | NEVER — legally restricted | Athlete consent required |
| GPS coordinates or movement paths | NEVER | Privacy violation |
| Physical load trend signal | PRO/ELITE — aggregate only, with disclosure | Never individual session data |
| OBP-derived research signals | NEVER public | Research license — no commercial redistribution |

---

## Data Required

### GPS / Wearable (commercial path — V3+):

```
Partnership type: Team contract + Catapult/STATSports commercial license
Data access: Team portal API (per-team account)
Data fields (aggregates only):
  - player_id (team internal — mapped to official league ID)
  - session_date
  - total_distance_m
  - high_speed_running_distance_m
  - max_velocity_mps
  - player_load_units
  - accel_decel_count
Prohibited fields: GPS coordinates, heart rate, HRV, raw acceleration time-series
Consent: Athlete consent framework required (team or league level)
Retention: 90-day active window; no long-term biometric storage
Attribution: Never public — internal signal generation only
```

### Force Plate (research path — internal only):

```
Source: OBP (CC BY 4.0 + Driveline written commercial agreement)
Data format: CSV, C3D processed aggregates
Use: Internal research context only — NOT pick evidence
Public citation: NEVER
Retention: Research session only — not persisted in production vault
```

---

## Source Quality Rules

| Source | Tier | Admission condition |
|---|---|---|
| Licensed team GPS (Catapult/STATSports) | T2 | Commercial license + team partnership + athlete consent |
| OBP force plate data (commercial use) | T3 | Written Driveline commercial agreement required |
| OBP force plate data (research/context) | T3 | CC BY 4.0 compliant, internal only, no public citation |
| Driveline R&D datasets | T3 | Written commercial agreement required for any production use |
| Academic wearable studies | T3 | Research license review; internal only |
| Community-shared biometric data | T5 | PERMANENTLY FORBIDDEN |
| Athlete-posted wearable data (social media) | T5 | PERMANENTLY FORBIDDEN |

---

## Output Schema (Proposal — V3+, Not Yet Implemented)

```typescript
// PROPOSAL ONLY — V3+, requires Zone 3 approval and league/team partnership

interface PhysicalLoadSignal {
  signalId: string;
  modality: 'physical';
  sourceId: string;             // Source Acquisition Mesh ID
  sourceType: 'team_gps' | 'wearable' | 'force_plate' | 'imu';
  sourceTier: 'T2' | 'T3';
  licenseVerified: boolean;
  athleteConsentOnFile: boolean; // Required: true before any storage
  teamPartnershipActive: boolean;
  athleteId: string;
  sport: string;
  metricName: string;
  metricValue: number;
  metricUnit: string;
  aggregationWindow: string;
  sessionDate: string;           // Date of session — NOT timestamp (too precise)
  ttlHours: number;              // 72h max for workload signals
  expiresAt: string;
  status: 'ACTIVE' | 'STALE' | 'EXPIRED';
  publicCitation: false;         // Literal false — physical signals are NEVER public
  inferencePurposeOnly: true;    // Literal true — internal evidence only
}
```

Note: `publicCitation` is permanently `false` and `inferencePurposeOnly` is
permanently `true` for this modality. These are not configuration options.

---

## Forbidden Claims

- "Biometric data shows..." — never, regardless of licensing
- Any force plate metric value in any public content
- Any GPS coordinate or high-speed running distance value publicly
- "Our model uses athlete wearable data" without an active team/league partnership
- OBP or Driveline data cited as commercial-grade evidence
- Athlete health signals sourced from social media or community forums
- Physical load signals without TTL or freshness disclosure
- Any claim that implies real-time biometric monitoring

---

## Licensing / Security Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Athlete biometric data without consent | P0 — legal/ethical | Consent framework required before any ingestion |
| OBP commercial use without Driveline agreement | P0 | License gate blocks admission |
| GPS coordinates stored in production database | P0 | Data minimization — aggregates only |
| Biometric data appearing in error logs | P0 | Strip PII from all error outputs |
| Team partnership revoked | P1 | 48-hour data removal protocol |
| HRV or heart rate data ingested | P0 | Permanently blocked — health data restriction |
| Athlete data sold or transferred | P0 — contractual/legal | Strict data use limitation covenant |

---

## Athlete Consent and Privacy Requirements

Physical performance data from wearable systems is subject to athlete
consent requirements that vary by jurisdiction and collective bargaining
agreement:

- NFL: NFLPA collective bargaining agreement governs player tracking data
  consent and data use restrictions
- MLB: MLBPA agreement governs biometric data use
- NBA: NBPA agreement governs player data
- Individual athletes in non-unionized sports: Individual consent required

**No wearable data integration may begin without a written determination
from the owner's legal counsel on the applicable consent framework.**

This is not a standard privacy policy matter — it is a labor law matter
that varies by league. The operator cannot self-certify compliance.

---

## MVP Path

**MVP**: Not applicable. This modality is V3+ only and has no MVP path.

**V3 entry gate** (all required before any implementation):
1. Owner approves V3 scope
2. Legal review of applicable CBA consent requirements
3. Written team or league partnership agreement
4. Written Catapult or STATSports commercial license
5. Data minimization architecture review (no raw biometrics)
6. Athlete consent framework operational

If any gate is unresolved, the modality does not proceed.

---

## Validation Requirements

- No PhysicalLoadSignal with `publicCitation: true` — this should be a
  compile-time constant or schema constraint, not a runtime check
- No raw biometric fields (HRV, GPS coordinates, heart rate) in any database model
- All physical evidence items have 72-hour maximum TTL enforced
- Consent status checked before any evidence item creation
- OBP/Driveline admission gate test: attempting to admit without commercial
  license returns a documented rejection

---

## Approval Gates

| Action | Approving party |
|---|---|
| Any physical performance data implementation | Owner |
| CBA consent framework determination | Owner + legal counsel |
| Team/league partnership negotiation | Owner |
| OBP commercial use agreement | Owner + legal + Driveline written agreement |
| Any biometric data admission | BLOCKED — requires all gates above |

---

## Codex Audit Requirements

1. Confirm no GPS coordinate, HRV, or heart rate fields exist in any
   Prisma model or database table
2. Confirm no force plate or wearable data ingestion adapter exists
3. Confirm no OBP or Driveline data present in the Evidence Vault
4. Confirm PhysicalLoadSignal type (if ever created) enforces
   `publicCitation: false` at the schema level
5. Report any physical performance data found in the codebase without
   confirmed legal/consent framework as P0
