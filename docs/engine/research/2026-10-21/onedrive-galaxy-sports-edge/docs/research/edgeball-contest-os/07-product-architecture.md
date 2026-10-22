# Product Architecture

As of: 2026-06-09

## Entities

| Entity | Fields | Surface |
| --- | --- | --- |
| Contest | id, format, version, status, eligibility_mode, prize_mode, rules_version, scoring_policy_id, starts_at, ends_at | Public/admin |
| ContestSeason | contest_id, sport, season, weeks, playoff_weeks, stat_provider | Admin/ops |
| DraftRoom | id, contest_id, pod_id, timer_mode, pick_clock, status | Public beta |
| DraftPick | draft_room_id, pick_no, manager_id, player_id, source_snapshot_id, risk_snapshot | Private/public limited |
| EdgeTeam | contest_id, manager_id, roster_id, pod_id, archetype_id | Public/private |
| RosterSlot | team_id, player_id, position, drafted_at, status | Public/private |
| WeeklyScore | team_id, week, auto_lineup, score, rank, stat_corrections | Public/private |
| RiskLadder | team_id, week, volatility_score, durability_score, no_bet_signal, explanation_public | Public reveal-less |
| FriendHistoryImport | owner_id, source_type, years, consent_status, anonymization_mode, deleted_at | Private |
| ManagerArchetype | history_import_id, manager_hash, archetype, tendencies, rivalry_edges | Private/shareable with consent |
| GhostManager | history_import_id, ghost_id, simulated_strategy, display_name_mode | Private/sandbox |
| Receipt | contest_id, team_id, week, claim, source_snapshot_id, freshness, public_private_boundary | Trust surface |
| Autopsy | week, team_id, what_changed, what_was_wrong, what_to_learn, method_safe_copy | Trust/editorial |
| Leaderboard | contest_id, scope, scoring_mode, guardrail_policy_id | Public with guardrails |
| ContestAuditLog | actor, action, entity, before, after, reason, timestamp | Admin only |

## Event Taxonomy

- contest_landing_viewed
- edgeball_rules_viewed
- contest_join_started
- contest_join_completed
- draft_room_opened
- draft_pick_made
- draft_queue_updated
- risk_overlay_viewed
- friend_history_import_started
- friend_history_import_completed
- friend_history_deleted
- rivalry_pod_viewed
- ghost_manager_viewed
- weekly_autopsy_viewed
- receipt_viewed
- leaderboard_viewed
- side_quest_joined
- support_dispute_opened
- scoring_correction_viewed
- sponsor_offer_viewed

## Admin Controls

- contest status: draft, lab, private_beta, sponsor_pending, legal_pending, disabled
- rules version lock
- scoring correction tool
- audit log viewer
- data deletion workflow
- eligibility gate placeholder
- no-live-prizes kill switch

## Rollback

EdgeBall Lab should be feature-flagged, fake-data-first, and removable by disabling routes/components/events without touching billing, payments, or production customer data.
