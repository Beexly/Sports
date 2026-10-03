# Sports OS — Biomechanics Modality Taxonomy

**Status**: Doctrine. Classification reference for all biomechanics data types.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/performance/sports-science-evidence-vault.md` — evidence vault structure
- `docs/performance/sports-science-licensing-policy.md` — per-modality licensing
- `docs/performance/radar-and-tracking-data-layer.md` — radar modality detail
- `docs/performance/force-plate-and-high-performance-layer.md` — physical modality detail
- `docs/performance/play-classification-layer.md` — video modality detail

---

## Purpose

The Biomechanics Modality Taxonomy defines all categories of sports science
and biomechanical data that Sports OS may encounter, evaluate, or ingest.
Each modality has a distinct data format, licensing pattern, evidence tier
ceiling, and set of use cases within the Sports OS intelligence pipeline.

This taxonomy is the reference document for:
- Evaluating new sports science data providers
- Classifying evidence items in the Sports Science Evidence Vault
- Determining which modalities require what level of licensing
- Guiding future implementation decisions in the performance intelligence layer

No modality may be implemented without satisfying the licensing and approval
requirements specific to that modality (see Section 8).

---

## Source Evidence from Line Audit

Wave 3 audit reviewed biomechanics tooling across five primary categories.
Key findings by modality:

**Physical / kinetic**: OpenSim, BiomechanicsToolkit (BTK), ezc3d — open-source
motion capture analysis tools. Strong community but research-license artifacts.
C3D format is the dominant kinematic data format in clinical/research contexts.

**Radar / ball-flight**: Trackman, Rapsodo, FlightScope — commercial products
with proprietary formats. Some public Statcast/Baseball Savant data available
through official program with rate-limited API.

**Positional tracking**: Second Spectrum (NBA), Next Gen Stats (NFL), Statcast
(MLB), ChyronHego TRACAB (soccer) — all require league program enrollment or
commercial license.

**Video / computer vision**: YOLO-based player detection, OpenPose, MediaPipe —
open research tools. Commercial sports applications exist (Hudl, Catapult) but
require licensing for commercial use of their outputs.

**Wearable / physiological**: Catapult Sports, STATSports, Whoop (team) —
team or league partnership required; individual athlete consent required.

---

## Modality Registry

### Modality 1 — Physical / Kinetic

**What it measures**: Forces, torques, accelerations, joint angles, and
movement efficiency in 3D space.

**Common data formats**: C3D (motion capture), force plate CSV, IMU JSON,
OpenSim STO/MOT, GRF (ground reaction force) output.

**Primary sources**:
- Research: OpenBiomechanics Project (OBP), Driveline R&D, academic labs
- Commercial: Vicon, Motion Analysis, AMTI force plates
- Wearable: Catapult GPS, STATSports APEX

**Evidence tier ceiling**: T3 (research) / T2 (commercial wearable with license)

**Sports OS use case**: Internal context only. Never primary pick evidence.
Potential signal for workload flags and training-load monitoring (V3+).

**Commercial license required**: YES for any wearable or clinical system.
OBP and Driveline data may not be used commercially without written agreement.

**Admission gate**: License verification + `inferencePurposeOnly: true` flag.

---

### Modality 2 — Radar / Ball-Flight

**What it measures**: Pitch velocity, spin rate, spin axis, release point,
bat speed, exit velocity, launch angle, ball flight trajectory.

**Common data formats**: Statcast CSV/API (MLB), Trackman CSV, Rapsodo JSON,
FlightScope XML.

**Primary sources**:
- T1: Baseball Savant (Statcast public endpoint — rate limited, no commercial
  redistribution)
- T2: Trackman commercial API (requires license)
- T2: Rapsodo commercial API (requires license)
- Research: Driveline Baseball public datasets (research only)

**Evidence tier ceiling**: T1 (public Statcast aggregate endpoint) /
T2 (licensed radar provider)

**Sports OS use case**: Pitch velocity trend for starting pitcher matchup
context (MLB). Bat speed / exit velocity for batter form signals.
Both require T2 license for any commercial product use.

**Commercial license required**: YES for Trackman/Rapsodo/FlightScope.
Statcast public aggregate endpoint — commercial use terms require review.

**Admission gate**: License verification per provider. Statcast: legal review
of Baseball Savant's commercial terms before any production ingestion.

---

### Modality 3 — Positional Tracking

**What it measures**: Player locations, speed, acceleration, distance covered,
zone entry/exit, formation, spacing metrics.

**Common data formats**: TRACAB format (soccer), Next Gen Stats JSON (NFL),
Second Spectrum JSON (NBA), Statcast player tracking CSV/API (MLB).

**Primary sources**:
- T1: Next Gen Stats (NFL) — official program, restricted distribution
- T1: Second Spectrum (NBA) — official league partner, commercial license required
- T1: Statcast player tracking (MLB) — official, research access varies
- T2: TRACAB (global soccer) — commercial license
- T2: Hawkeye (tennis, cricket) — commercial license

**Evidence tier ceiling**: T1 (official league program) / T2 (licensed provider)

**Sports OS use case**: Player load/availability signals, position-specific
efficiency metrics for matchup context. Requires league data program enrollment
or commercial license before any ingestion.

**Commercial license required**: YES for all sources above.

**Admission gate**: League program enrollment agreement + written commercial
license + owner approval.

---

### Modality 4 — Video / Computer Vision

**What it measures**: Play classification, player movement quality, release
mechanics, swing mechanics, tactical pattern recognition.

**Common data formats**: Video MP4/H.264, pose estimation JSON (OpenPose/
MediaPipe), object detection annotation JSON (COCO format), Hudl Sportscode
output.

**Primary sources**:
- Research: OpenPose, MediaPipe (open-source inference tools — models are
  open, commercial use of outputs requires review)
- Commercial: Hudl, Catapult Video, Coach's Eye — commercial license required
- Community: YouTube coaching breakdown content — editorial reference only,
  never evidence

**Evidence tier ceiling**: T2 (commercial video analytics with license) /
T3 for research-tool outputs

**Sports OS use case**: Play classification for game-script context (see
`docs/performance/play-classification-layer.md`). Mechanical efficiency signals
for pitcher/batter form at V3+.

**Commercial license required**: YES for any commercial video analytics platform.
Open-source inference tools (MediaPipe, OpenPose) require review of commercial
use terms for output data.

**Admission gate**: License verification + operator review of each processed
video clip for rights compliance.

---

### Modality 5 — Health / Participation Status

**What it measures**: Official injury designations, participation limitations,
practice participation, conditioning flags.

**Common data formats**: Official injury report text, participation reports
(NFL Wednesday/Thursday/Friday), NBA injury reports (official portal),
MLB IL designations.

**Primary sources**:
- T1: Official league injury reports (NFL.com, NBA.com, MLB.com)
- T1: Official injury report wires (AP, Reuters feed of official designations)
- T3: Beat reporter injury updates (context only, not primary evidence)
- T5: Twitter/social speculation — FORBIDDEN as evidence

**Evidence tier ceiling**: T1

**Sports OS use case**: Primary use. Injury status is the most actionable
performance signal and the one most integrated into existing odds movement.
This modality is MVP-ready once official feed ingestion is implemented.

**Commercial license required**: NO for public official reports. Wire
service feeds (AP, Reuters) require subscription.

**Admission gate**: Source must be official league report or official wire
service. Beat reporter mentions are T3 — internal context only.

---

## Cross-Modality Rules

1. **Modality mixing**: When a pick explanation combines signals from multiple
   modalities, every modality cited must independently meet its tier floor.
   A T1 injury report cannot elevate a T3 biomechanics signal to public citation.

2. **Attribution precision**: Each public claim must name the exact modality
   and source. "Performance data suggests..." is not sufficient.
   "Statcast velocity data (T1, last 5 starts) suggests..." is compliant.

3. **Freshness per modality**: TTL windows differ by modality. An injury
   status has a 4-hour TTL. A velocity trend over last 5 starts has a 24-hour
   TTL. A positional tracking season aggregate has a 7-day TTL. These are
   defaults — owner may tighten, never loosen without documented justification.

4. **No modality fabrication**: Claiming "biomechanics data indicates..." when
   no biomechanics data license is active is a P0 fabrication violation under
   Rule U5 (No Fabrication).

---

## Forbidden Claims by Modality

| Modality | Forbidden claim type |
|---|---|
| Physical / kinetic | Any public citation without T2 commercial license |
| Radar / ball-flight | Velocity/spin claims without Statcast/licensed provider |
| Positional tracking | "Our model uses tracking data" without league enrollment |
| Video / computer vision | "We analyze his mechanics" without licensed video analytics |
| Health / participation | Injury status speculation without T1 official designation |

---

## Licensing / Security Risks

| Risk | Severity | Mitigation |
|---|---|---|
| OBP/Driveline commercial use without license | P0 | Block at Evidence Vault admission |
| Motion capture data with athlete identity leaked | P0 | Strip PII before vault storage |
| Video content used without rights | P1 | Operator review on every clip |
| Statcast commercial use terms violated | P1 | Legal review before production ingestion |
| Academic modality data used commercially | P1 | License verification step |

---

## MVP Path

**Phase 1 (MVP — approval required)**: Health / Participation Status modality only.
Official league injury reports via T1 feed. No biomechanics, radar, tracking, or video.

**Phase 2 (post-MVP)**: Radar modality — Statcast public aggregate endpoint
after legal review of commercial terms.

**Phase 3+**: All remaining modalities require separate owner approval cycles.

---

## Validation Requirements

A task is NOT complete until:
- Every admitted evidence item has its modality field populated with one of
  the five modality types defined in this document
- No modality-less evidence items exist in the vault
- License status is stored per modality per source
- Evidence Drawer displays modality as part of source attribution

---

## Approval Gates

| Action | Approving party |
|---|---|
| Activating any modality beyond Health/Participation | Owner |
| Adding a new provider to an existing modality | Owner + legal license review |
| Using video content for mechanical analysis | Owner + rights review |
| Mixing T1 and T3 signals in a single pick explanation | Forbidden — no approval path |

---

## Codex Audit Requirements

1. Confirm all SportsScienceEvidenceItem records have a valid modality field
2. Confirm no physical/kinetic or video evidence items exist without a T2 license
3. Confirm health/participation items reference official league sources only
4. Confirm TTL is modality-appropriate (4h injury, 24h performance, 7d seasonal)
5. Report any evidence item with modality but without `licenseVerified: true` as P1
