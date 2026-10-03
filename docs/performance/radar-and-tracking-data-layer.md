# Sports OS — Radar and Tracking Data Layer

**Status**: Doctrine. Defines radar and positional tracking data governance.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/performance/biomechanics-modality-taxonomy.md` — Modalities 2 and 3
- `docs/performance/sports-science-evidence-vault.md` — vault admission
- `docs/performance/sports-science-licensing-policy.md` — licensing requirements
- `docs/brain/source-hierarchy.md` — T1/T2 source standards
- `docs/source-providers/commercial-crawling-approval-gate.md` — crawling gate

---

## Purpose

The Radar and Tracking Data Layer governs how Sports OS would acquire, store,
and use radar-derived ball-flight data (pitch velocity, exit velocity, spin rate)
and positional tracking data (player speed, acceleration, zone coverage) as
evidence signals in the prediction and content pipeline.

These data types represent the highest-quality non-official performance signal
available for baseball, football, basketball, and soccer analytics. They are
also among the most commercially sensitive — almost all production-quality
sources require paid enrollment or license.

This document is **doctrine only**. No radar or tracking data ingestion is
currently implemented. This layer requires Zone 3 approval before any
implementation begins.

---

## Source Evidence from Line Audit

Wave 3 audit findings on radar and tracking repositories:

**Statcast (MLB)**:
- Public endpoint at Baseball Savant (`savant.baseball` / `baseballsavant.mlb.com`)
- Aggregate metrics available via `pybaseball` (Python wrapper) — research tool
- Commercial use of scraped data: requires legal review of MLB's terms
- Official commercial data program: MLB Data Delivery via MLBAM — requires
  commercial license agreement
- Rate limits on public endpoint apply; production scraping without license
  is a ToS risk

**Trackman**:
- Proprietary pitch radar system; CSV/API output for licensed customers
- No public data endpoint
- Commercial license required; no open-access path

**Rapsodo**:
- Similar to Trackman; used widely in amateur/college settings
- Some data published publicly by Driveline (research context)
- Commercial use of Driveline-published Rapsodo data: prohibited without
  written Driveline commercial agreement

**Next Gen Stats (NFL)**:
- Official NFL tracking data program
- Public aggregate stats available at `ngs.nfl.com`
- Raw tracking data (RFID chip positions): not publicly available
- Commercial license required for production use beyond aggregate display

**Second Spectrum (NBA)**:
- Official NBA tracking partner
- No public raw data endpoint
- Requires NBA data program enrollment + Second Spectrum commercial license

**TRACAB (soccer)**:
- Commercial positional tracking system used in top leagues
- No public data endpoint
- Requires league + ChyronHego TRACAB commercial license

**OpenPose / MediaPipe / YOLO**:
- Open-source computer vision tools for pose estimation and object detection
- Models available under Apache/MIT licenses
- Using these tools to extract tracking data from broadcast video: copyright
  and broadcasting rights issue — not just a licensing issue

---

## User Value

When radar/tracking data is properly licensed and integrated:
- Pick explanations for MLB games can reference actual velocity trends
  over a pitcher's last 5 starts (not estimated, not speculative).
- NFL picks can reference actual route tree coverage efficiency from
  tracking data (with appropriate disclosure).
- Users receive the kind of evidence depth that separates professional
  sports analytics from tout-service picks.

**What users will NOT see** regardless of licensing:
- Raw tracking data values or coordinates
- Individual athlete GPS coordinates or movement paths
- Velocity values from unlicensed sources

---

## Operator Value

- Defensible evidence chain: every velocity or tracking claim can be traced
  to a specific licensed source with a timestamped evidence record.
- Operator can market "powered by Statcast" or "powered by Next Gen Stats"
  only after the corresponding official program enrollment is active.
- No fabricated performance claims = no legal exposure from false attribution.

---

## Current Sports OS Fit

The current prediction engine uses odds data only. Radar/tracking integration
is a future Phase 2+ capability. The current schema has no `PerformanceSignal`
model. Adding this layer requires:

- New Prisma schema types (Zone 3 — owner approval)
- New data-ingestion adapters in `packages/data-ingestion/` (Zone 3)
- New Evidence Vault evidence type registration (Zone 3)
- Commercial license agreements (owner + legal)

---

## Public / Private Boundary

| Data type | Display | Restriction |
|---|---|---|
| Aggregate velocity trend (T1 official program) | PRO/ELITE with source attribution | Raw pitch-by-pitch coordinates: internal only |
| Player position aggregate (T1 program) | PRO/ELITE with source attribution | Raw RFID/GPS coordinates: internal only |
| Spin rate / launch angle aggregate | PRO/ELITE with source attribution | Commercial license required |
| Driveline or OBP-derived radar signals | NEVER public | No commercial use without license |
| Community-scraped tracking data | NEVER | T5 source — forbidden from vault |

---

## Data Required

### For Radar (MLB — Statcast path):

```
Source: MLB official data delivery program (MLBAM)
License type: Commercial license agreement
Endpoint: Official MLBAM data delivery API (not Baseball Savant scrape)
Data format: JSON (structured pitch-level data)
Fields to ingest: pitcher_id, game_date, release_speed, release_spin_rate,
                  pfx_x, pfx_z, plate_x, plate_z, type, events
TTL: 24 hours for current-season aggregate metrics
Storage: Derived aggregates only — not raw pitch coordinates
Attribution: "Statcast data via MLB official data delivery"
```

### For Tracking (NFL — Next Gen Stats path):

```
Source: NFL Next Gen Stats official data program
License type: Commercial license agreement
Endpoint: Official NFL NGS API (not public website scrape)
Data format: JSON
Fields to ingest: player_id, week, position, avg_separation, route_efficiency,
                  target_rate, snap_count_pct
TTL: 7 days for weekly aggregate
Storage: Aggregates per player per week — not raw frame-level tracking data
Attribution: "Next Gen Stats data, official NFL data program"
```

---

## Source Quality Rules

| Source | Tier | Admission condition |
|---|---|---|
| Official MLBAM radar delivery | T1 | Commercial license + program enrollment |
| Statcast public aggregate endpoint | T2 | Legal review of commercial terms — do not ingest before review |
| Trackman commercial API | T2 | Commercial license agreement |
| Rapsodo commercial API | T2 | Commercial license agreement |
| NFL NGS official program | T1 | Commercial license + program enrollment |
| Second Spectrum (NBA) | T2 | Commercial license + Second Spectrum agreement |
| Baseball Savant scrape without license | FORBIDDEN | ToS risk — blocked |
| Driveline public datasets | T3 | Internal context only — research license, no commercial use |
| OBP radar data | T3 | Internal context only — no commercial use |
| Community-aggregated radar | T5 | Permanently forbidden from vault |

---

## Output Schema (Proposal — Not Yet Implemented)

```typescript
// PROPOSAL ONLY — Zone 3 approval required before any implementation

interface RadarSignal {
  signalId: string;
  modality: 'radar';
  sourceId: string;             // Source Acquisition Mesh ID
  sourceTier: 'T1' | 'T2';
  licenseVerified: boolean;
  athleteId: string;            // Official league player ID
  sport: 'MLB' | 'NFL' | 'NBA' | 'NHL' | 'SOCCER';
  metricName: string;           // e.g., 'avg_fastball_velocity_mph'
  metricValue: number;
  metricUnit: string;
  aggregationWindow: string;    // e.g., 'last_5_starts', 'week_12', 'season_2026'
  trendDirection: 'up' | 'down' | 'flat' | 'volatile' | 'insufficient_data';
  sampleSize: number;           // Number of events in aggregation
  evidenceDate: string;         // ISO 8601 UTC
  ttlHours: number;
  expiresAt: string;
  status: 'ACTIVE' | 'STALE' | 'EXPIRED';
  publicCitation: boolean;
}

interface TrackingSignal {
  signalId: string;
  modality: 'tracking';
  sourceId: string;
  sourceTier: 'T1' | 'T2';
  licenseVerified: boolean;
  athleteId: string;
  sport: string;
  metricName: string;           // e.g., 'avg_separation_yards', 'route_efficiency_pct'
  metricValue: number;
  metricUnit: string;
  aggregationWindow: string;
  evidenceDate: string;
  ttlHours: number;
  expiresAt: string;
  status: 'ACTIVE' | 'STALE' | 'EXPIRED';
  publicCitation: boolean;
}
```

---

## Forbidden Claims

- "Velocity data indicates..." without an active T1/T2 radar license
- "Tracking data shows..." without an active T1/T2 tracking license
- Any velocity or spin rate specific value without T1/T2 source
- "We use Statcast data" before official MLBAM commercial program enrollment
- "Sharp bettors are following velocity trends" — forbidden per claim governance
  rules regardless of data source
- Any radar/tracking value that is fabricated, estimated, or sourced from
  community aggregation

---

## Licensing / Security Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Baseball Savant scraped without license | P0 | Block all unofficial MLB data ingestion |
| Driveline data used commercially | P0 | License gate at vault admission |
| Raw pitch coordinates stored and leaked | P1 | Store aggregates only; no raw coordinates |
| Athlete GPS positions exposed | P0 | Never store raw positions; aggregates only |
| License revoked mid-season | P1 | 48-hour data removal protocol |
| OBP radar data in commercial product | P0 | Permanent block — research license only |

---

## MVP Path

No radar or tracking data at MVP. MVP is limited to Health/Participation modality.

**Phase 2 (post-MVP)**: Statcast public aggregate endpoint after legal review.
If review finds commercial terms prohibit production use, escalate to owner
for MLBAM commercial program enrollment decision.

**Phase 3**: NFL NGS and NBA Second Spectrum (both require commercial program
enrollment and are significant cost commitments — owner decision required).

---

## Future Version

**V2**: Statcast MLB + velocity trend signal in pick explanations
**V3**: NFL NGS + NBA Second Spectrum with multi-sport tracking context
**V4**: Soccer (TRACAB) + automated anomaly detection on tracking signals

---

## Validation Requirements

- All radar/tracking evidence items have `licenseVerified: true`
- Aggregation window is stored and displayed (never claim "real-time" without it)
- No raw coordinate or pitch-level data in any response payload
- Stale evidence excluded from Evidence Drawer
- Driveline/OBP data admission blocked by ingestion gate test

---

## Approval Gates

| Action | Approving party |
|---|---|
| Any radar or tracking ingestion implementation | Owner |
| MLBAM commercial program enrollment | Owner + legal |
| NFL NGS commercial program enrollment | Owner + legal |
| NBA Second Spectrum license | Owner + legal |
| Citing radar/tracking data in any public pick | Operator review after license confirmed |

---

## Codex Audit Requirements

1. Confirm no `packages/data-ingestion/` adapter targets Baseball Savant,
   Trackman, Rapsodo, or any radar source without a documented license
2. Confirm no raw pitch coordinates or GPS positions are stored or returned
3. Confirm all tracking/radar evidence items have TTL enforcement
4. Confirm no community-aggregated tracking data admitted to vault
5. Report any unlicensed radar or tracking adapter as P0
