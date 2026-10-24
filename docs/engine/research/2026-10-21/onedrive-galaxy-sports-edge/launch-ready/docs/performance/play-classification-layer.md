# Sports OS — Play Classification Layer

**Status**: Doctrine. Governs video-derived play classification intelligence.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/performance/biomechanics-modality-taxonomy.md` — Video / Computer Vision modality
- `docs/performance/sports-science-evidence-vault.md` — evidence vault admission
- `docs/media/media-studio-workflow.md` — media production rules
- `docs/media/youtube-automation-boundaries.md` — video content restrictions
- `docs/audit/piracy-malware-do-not-use-register.md` — copyright violations

---

## Purpose

The Play Classification Layer governs Sports OS's approach to deriving
intelligence signals from video and computer-vision-based play analysis.
This includes automated play classification (run/pass, zone/man, pitch type),
movement quality scoring, and tactical pattern recognition.

Video-derived signals represent a high-value intelligence source used by
professional sports analytics teams. They also carry the highest complexity
of rights, copyright, and ethical use restrictions in the Sports OS taxonomy.

This layer is **V3+ only** for ML-driven classification. A limited editorial
version (human-reviewed play notes) is possible at earlier phases. This
document governs both.

---

## Source Evidence from Line Audit

Wave 3 audit reviewed:

**Open computer vision tools**:
- YOLO (YOLOv8 by Ultralytics): Object detection — MIT license for the
  model, commercial use allowed, but input video must be rights-cleared.
- OpenPose (CMU): Pose estimation — non-commercial academic license.
  Commercial use prohibited without Carnegie Mellon license agreement.
- MediaPipe (Google): Pose/hand/face estimation — Apache 2.0 license.
  Commercial use of outputs generally permitted; video rights issue remains.
- detectron2 (Meta): Segment/detect — Apache 2.0 license. Same video
  rights concern applies.

**Commercial sports video analytics**:
- Hudl: Video platform and analytics suite — commercial license, team
  accounts, no API for external commercial use of analysis outputs.
- Catapult Video (formerly SportsTec): Similar to Hudl — team accounts only.
- InStat: Scouting database — subscription access, data use restricted to
  internal purposes, no redistribution.

**Broadcast video rights**:
- NFL: Broadcast rights held by CBS, Fox, NBC, ESPN/ABC. Game film rights
  held by NFL Films. No open access for computer vision analysis.
- MLB: Similar structure. Baseball Savant provides limited authorized clips.
- NBA: Content guidelines allow limited highlight embeds; raw game video
  analysis is rights-restricted.

**Key finding**: The computer vision tools themselves are mostly open-source.
The blocking factor is the input video — broadcast game footage is copyrighted.
Running YOLO or MediaPipe on NFL broadcast footage without a license agreement
is a copyright violation, not just a ToS issue.

---

## User Value

When play classification operates properly (editorial path, near-term):
- Game-script context can be surfaced without fabrication: "This team has
  run-heavy on first-and-10 in the second half of close games (operator-reviewed
  play notes, Week 1–12)."
- Player matchup angles can be enriched with human-reviewed play-type data.

When ML-driven classification is licensed (V3+):
- Automated pace-of-play flags, target separation analysis, route efficiency
  scores can supplement odds-based picks.

**Users will NOT see**:
- AI-generated play analysis sourced from unlicensed video
- Claims about specific plays without sourcing
- Specific video clips that would infringe broadcast rights

---

## Operator Value

- Editorial play classification (human-reviewed) can begin without ML
  and without licensing risk.
- Establishes a disciplined foundation that prevents copyright liability
  when ML capabilities are added.
- Clear separation between "what the operator observed from a licensed
  source" vs. "what a model inferred from unlicensed footage."

---

## Current Sports OS Fit

No play classification infrastructure exists. The editorial path (human-entered
play notes via the Operator Cockpit) is feasible with no schema changes beyond
adding a `PlayNote` evidence type. This is the only near-term path.

ML-driven classification requires:
- Broadcast video license agreements (league-level)
- ML inference infrastructure separate from the Next.js app
- Zone 3 approval for schema and infrastructure additions

---

## Play Classification Types

### Editorial (human-reviewed — earlier phases possible)

| Classification | Description | Source |
|---|---|---|
| Formation | Personnel grouping, formation type | Operator-entered, operator-reviewed |
| Game script | Run/pass tendency in specific down/distance/score context | Operator-entered from licensed source |
| Matchup flag | Specific coverage scheme vs. target pattern | Operator-entered from licensed source |
| Pace of play | Plays per minute in specific game situations | Operator-entered from licensed stats |

All editorial classifications must be operator-entered with source citation
and subject to the same claim governance rules as pick content.

### ML-Derived (V3+, license required for video)

| Classification | Description | License requirement |
|---|---|---|
| Pass/run classification | Predicted play type from formation | Broadcast video license |
| Route classification | Route type by receiver from tracking | Tracking license (Next Gen Stats) |
| Coverage classification | Man/zone/bracket from player positions | Tracking license |
| Pitch type classification | Fastball/slider/curve from ball flight | Radar license (Statcast/Trackman) |
| Swing type classification | Contact/power/protective from bat speed | Radar + video license |

---

## Public / Private Boundary

| Content type | Public | Restriction |
|---|---|---|
| Editorial game-script note (operator-sourced) | PRO/ELITE — with source attribution | Operator must cite licensed source |
| ML-derived route efficiency score | NEVER public until V3 licensed | Raw tracking data: internal only |
| Play type tendency aggregate | PRO/ELITE (licensed tracking only) | No raw tracking coordinates |
| Video clip in published content | Only authorized/licensed clips | Broadcast footage: NEVER without license |
| OpenPose/MediaPipe analysis of broadcast footage | NEVER | Copyright violation |

---

## Data Required

### Editorial path (near-term):

```
Source: Operator observation from licensed provider (e.g., licensed stats subscription)
Format: Structured operator-entered note
Required fields:
  - game_id (official league game identifier)
  - play_type (from allowed classification types)
  - context (down, distance, score differential, quarter)
  - source_citation (specific source the operator reviewed)
  - observation_date (ISO 8601)
  - operator_id (who entered this)
Claim governance: Required — editorial notes surface in pick content
TTL: 7 days for game-specific notes; 30 days for season-trend notes
```

### ML path (V3+):

```
Video source: Licensed broadcast footage (requires league agreement)
OR: Official tracking data (requires NGS/Second Spectrum license)
Model: YOLO/MediaPipe (Apache 2.0) or commercial (licensed)
Output: Classification labels + confidence scores (NOT video frames)
Storage: Labels and scores only — NOT video frames, NOT frame extracts
Retention: Season active window; no off-season video retention
Rights: Broadcast rights license must cover "analysis and derivative works"
```

---

## Source Quality Rules

| Source | Tier | Admission condition |
|---|---|---|
| Licensed broadcast footage (official program) | T2 | League agreement covering analysis use |
| Official tracking data (NGS/2nd Spectrum) | T1/T2 | Program enrollment + license |
| Operator-entered editorial notes (licensed source) | T3 | Operator cites specific licensed source |
| Open tracking data (public aggregate stats) | T3 | Editorial context only — no ML training |
| Unlicensed broadcast footage | FORBIDDEN | Copyright violation |
| Community video clips (YouTube, social media) | FORBIDDEN | Copyright and rights violation |
| Re-encoded broadcast clips | FORBIDDEN | Copyright violation regardless of encoding |

---

## Forbidden Claims

- "Our AI watched the game and..." — implies unlicensed video analysis
- Any claim about specific plays without citing a licensed source
- Using OpenPose/MediaPipe on broadcast video without broadcast license
- Game film analysis without NFL Films or league equivalent agreement
- "Route tree efficiency score" without active tracking license
- Play tendency claims from social media or community-aggregated sources
- AI-generated play notes without operator review and source citation

---

## Licensing / Security Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Running CV model on unlicensed broadcast footage | P0 | Block at ingestion; video source must be licensed |
| OpenPose commercial use without CMU license | P1 | Use MediaPipe or YOLO instead; review commercial terms |
| Community video clips ingested | P0 | URL allowlist for authorized sources only |
| Frame-level video stored in database | P1 | Labels and scores only — no frames |
| Editorial notes citing unlicensed sources | P1 | Operator must provide verifiable source citation |
| ML model training on copyrighted game footage | P0 | Training data licensing required separately |

---

## MVP Path

**Editorial MVP** (no ML, requires schema addition — Zone 3):
1. Add `PlayNote` evidence type to Evidence Vault schema
2. Add operator-entered editorial play note interface in Cockpit
3. Surface editorial notes as evidence context in pick explanations (PRO/ELITE)
4. All notes subject to claim governance scanner

**NOT in editorial MVP**:
- Any ML model
- Any video processing
- Any automated play detection

**ML V3** (requires broadcast license + tracking license + owner approval):
- Fully separate approval cycle from editorial MVP

---

## Future Version

**V2 (editorial enrichment)**: Cockpit play note entry with structured templates
**V3 (tracking-derived)**: NGS/Second Spectrum route/coverage classification via licensed API
**V4 (video-derived)**: Licensed broadcast footage analysis with rights clearance

---

## Validation Requirements

A task is NOT complete until:
- All editorial play notes have a verifiable source citation
- No video frames are stored in any database model
- ML classification labels include source tier and license status
- Claim governance scanner covers all play-derived pick content
- URL allowlist for authorized video sources is implemented and tested
- P0 test: attempting to ingest an unlicensed video URL fails with rejection

---

## Approval Gates

| Action | Approving party |
|---|---|
| Adding `PlayNote` schema type (editorial MVP) | Owner |
| Any ML video classification implementation | Owner + legal (broadcast license required) |
| Using OpenPose commercially | Owner + CMU license review |
| Training any model on game footage | Owner + legal (training data license required) |
| Publishing picks that cite play classification | Operator review |

---

## Codex Audit Requirements

1. Confirm no video frames or frame extracts are stored in any database table
2. Confirm all video source URLs in the codebase are from an authorized allowlist
3. Confirm OpenPose is not used in any production path (non-commercial license)
4. Confirm editorial play notes surface claim governance scanner
5. Report any unlicensed video source URL in the ingestion pipeline as P0
