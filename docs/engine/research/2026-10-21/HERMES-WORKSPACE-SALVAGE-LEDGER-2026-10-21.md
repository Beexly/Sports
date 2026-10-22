# Hermes workspace salvage ledger 2026-10-21

Generated: 2026-10-22T03:02:30Z
Copied files: 2083
Skipped: 1117
Secret redactions applied: 27

SQLite exports are table counts only. Message bodies, .env files, credential filenames, and binaries were not copied.

## SQLite

```json
{
  "state.db": {
    "path": "C:\\Users\\Garrett\\AppData\\Local\\hermes\\state.db",
    "tables": {
      "async_delegations": 51,
      "compression_locks": 6,
      "conversation_generations": 0,
      "delivery_obligations": 29,
      "gateway_heartbeats": 9,
      "gateway_hygiene_state": 0,
      "gateway_routing": 83,
      "hosted_room_events": 0,
      "hosted_room_links": 0,
      "hosted_room_peer_reservations": 0,
      "hosted_room_policy_cursors": 0,
      "hosted_room_policy_events": 0,
      "hosted_room_policy_publications": 0,
      "hosted_room_policy_threads": 0,
      "hosted_room_policy_transcript": 0,
      "hosted_room_policy_transcript_state": 0,
      "hosted_room_policy_watermarks": 0,
      "hosted_room_remote_runs": 0,
      "hosted_room_retired_ids": 0,
      "hosted_room_revoked_grants": 0,
      "hosted_rooms": 0,
      "messages": 725940,
      "messages_fts": 725940,
      "messages_fts_config": 2,
      "messages_fts_data": 105664,
      "messages_fts_docsize": 725946,
      "messages_fts_idx": 28747,
      "messages_fts_trigram": 265910,
      "messages_fts_trigram_config": 2,
      "messages_fts_trigram_data": 59589,
      "messages_fts_trigram_docsize": 265910,
      "messages_fts_trigram_idx": 21497,
      "runtime_epoch": 1,
      "schema_version": 1,
      "session_admissions": 216,
      "session_model_usage": 3837,
      "session_turn_leases": 2,
      "sessions": 2506,
      "state_meta": 344,
      "system_prompts": 724,
      "worker_executions": 0,
      "worker_receipts": 0
    }
  },
  "verification_evidence.db": {
    "path": "C:\\Users\\Garrett\\AppData\\Local\\hermes\\verification_evidence.db",
    "tables": {
      "meta": 1,
      "verification_events": 125,
      "verification_state": 700
    }
  },
  "kanban.db": {
    "path": "C:\\Users\\Garrett\\AppData\\Local\\hermes\\kanban\\kanban.db",
    "error": "missing"
  }
}
```

## Worktrees

- main @ 65d3303147e5 path=C:/Users/Garrett/Sports
- feat/trueprob-calibration-boundary @ 93113cd0355a path=C:/Users/Garrett/Sports/.worktrees/calib-boundary
- fix/consensus-claim-binder-ab @ 427bcedb25fd path=C:/Users/Garrett/Sports/.worktrees/consensus-claim-ab
- claude/fix-go-live-runbook @ 64cc14b7041e path=C:/Users/Garrett/Sports-625-check
- hermes/continuity-real-2026-10-17b @ ba175a93ac42 path=C:/Users/Garrett/Sports-continuity2
- hermes/2026-09-18-flash @ 521aa9e1b7a2 path=C:/Users/Garrett/Sports-flash-0918
- hermes/injury-evidence-2026-10-17b @ 35de57568c0d path=C:/Users/Garrett/Sports-injury2
- hermes/c375-testwall-2026-10-20 @ 9d28ae68de34 path=C:/Users/Garrett/Sports-live
- hermes/ncaaf-calibration-2026-09-04 @ c9e5ecddde9e path=C:/Users/Garrett/Sports-ncaaf-cal
- claude/sports-prediction-launch-rtiexc-r2 @ 3910b07d9139 path=C:/Users/Garrett/Sports-round2
- wire/emission-ranking-2026-10-17 @ 4924334a36a5 path=C:/Users/Garrett/Sports-worktrees/emit-wire
- tmp/rev989 @ 5f0af48bba26 path=C:/Users/Garrett/Sports-wt-989
- audit/reconciliation-2026-10-20 @ 5190664fda9c path=C:/Users/Garrett/Sports-wt-audit-20261020
- hermes/c368-typecheck-fix-2026-10-20 @ 8fd737382163 path=C:/Users/Garrett/Sports-wt-c368
- research/engine-plan-2026-10-03 @ 3420f4facd58 path=C:/Users/Garrett/Sports-wt-engineplan
- hermes/g06-fail-closed-2026-10-16 @ 974e312ee4db path=C:/Users/Garrett/Sports-wt-g06
- verify/gse-live-0930 @ a239f5c83474 path=C:/Users/Garrett/Sports-wt-gselive
- motif/gse-intelligence-build-2026-10-02 @ 1758cfa0dc4f path=C:/Users/Garrett/Sports-wt-intel
- hermes/book-pick-verdict-gate @ 9466fb6291e6 path=C:/Users/Garrett/Sports-wt-pick-gate
- feat/picks-db-surfaces @ 88dd619fb17b path=C:/Users/Garrett/Sports-wt-picks-db-surfaces

## Skip reasons

- suffix: 1067
- oversize: 37
- dest-exists: 12
- missing-root: 1

## Measured SQLite named counts (read-only, no message bodies)

- state.db sessions: 2506
- state.db messages: 725940
- state.db system_prompts: 724
- state.db async_delegations: 51
- state.db delivery_obligations: 29
- verification_events: 125
- verification_state: 700
- kanban.db tasks: 3, task_events: 39, task_attachments: 1
- Plan path kanban/kanban.db was missing. Counts are from C:/Users/Garrett/AppData/Local/hermes/kanban.db.
- Plan figures 2503/725843/723 were stale against this measurement.
