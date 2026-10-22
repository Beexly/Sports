# Person Universe Model

As of: 2026-06-09

## Player Categories

active roster, inactive game-day players, starters, backups/depth players, practice squad, injured reserve, PUP, NFI, suspended, exempt, reserve/futures, waived/released, free agent, retired, unsigned draft pick, rookie, undrafted free agent, international pathway, temporary elevations, emergency QB.

## Football Staff Categories

owner/front office if public, general manager, assistant GM, personnel executives, head coach, offensive/defensive/special teams coordinators, position coaches, assistant coaches, quality control coaches, analysts if public, strength and conditioning staff if public, athletic trainers if public, medical staff only if officially/publicly listed, equipment/scouting/football operations staff if publicly listed.

## Privacy Rule

Only collect staff data that is publicly listed in official or professional sources. Do not infer private staff, personal details, health information, home location, age, family, or anything unrelated to public professional role.

| Entity | Purpose | Core Fields | Visibility |
| --- | --- | --- | --- |
| Person | Canonical public person record for players and staff. | canonical_person_id, names, public identifiers, display flags | private/internal IDs public-safe display only |
| PlayerProfile | NFL player-specific public facts. | person_id, height, weight, college, experience, draft info, public bio fields | public if evidence-backed |
| StaffProfile | Coach/staff professional public profile. | person_id, role family, public team role, source notes | public only if officially/professionally listed |
| Team | Canonical NFL club identity. | team_id, current abbreviation, aliases, historical abbreviations, official URLs | public |
| TeamMembership | Person-team relationship over time. | person_id, team_id, membership_type, start/end, evidence_ids | public current summary, full evidence internal |
| RosterSnapshot | Team roster at a point in time. | team_id, source_id, fetched_at, source_updated_at, raw_hash, record_count | internal |
| StaffSnapshot | Team staff listing at a point in time. | team_id, source_id, fetched_at, raw_hash, record_count | internal |
| JerseyAssignment | Jersey number facts and conflicts. | person_id, team_id, number, status, effective dates, evidence_ids | public if confident |
| PositionAssignment | Position and position group facts. | person_id, team_id, normalized_position, source_position, confidence | public if confident |
| StatusAssignment | Roster/availability status. | person_id, team_id, normalized_status, effective dates, evidence_ids | public if confident |
| DepthChartAssignment | Depth role/rank from a named source. | team_id, person_id, position_group, rank, role, evidence | public only if sourced and qualified |
| Transaction | Roster/staff movement event. | person_id, team_id, old_team_id, new_team_id, old_status, new_status, transaction_type, effective_date | public summary if confirmed |
| SourceEvidence | Fact-level proof record. | source_id, url, fetched_at, raw_value, normalized_value, parser_version | internal; public only simplified |
| ConflictRecord | Disagreement between current sources. | fact_type, person_id, values, evidence_ids, severity, owner, resolution | internal |
| ConfidenceScore | Fact-level 0-100 score. | fact_id, score, inputs, truth_status | internal; public status/freshness only |
| VerificationRun | Roster truth audit run. | run_id, started_at, completed_at, source statuses, errors, changed counts | internal |
| ValidationError | Deploy/nightly data quality finding. | rule_id, severity, entity, evidence, suggested action | internal |

