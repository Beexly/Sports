# CV lane Step 1 verification record — 2026-10-17

This is the in-repo work record for ledger row H-U4 (agent ledger
`docs/ops/AGENT_LEDGER.md`). The step's verification ran on the Neon dev branch
`dev-cv-watch-2026-10`; the bus note carrying the narrative lives at
`outbox/from-hermes/2026-10-17-hermes-cv-step1-verified.md` on Beexly/agent-bus
(commit d6c7c1b) and is mirrored here by reference, because DONE evidence must
resolve inside this repository.

## Scope (founder plan 218d5fdc6, docs/vision/improved-cv-lane-plan-2026-10-17.md, deadline 05:15 CT 2026-10-17)

Step 1 of the plan: apply the watch.* schema to the Neon DEVELOPMENT branch
`dev-cv-watch-2026-10` and prove shadow ingestion. Production stays founder-only.

## What was observed (2026-10-17, ~03:55-04:30 CT)

- Branch `dev-cv-watch-2026-10` already existed (created 00:36 CT by a sibling
  lane, 15 minutes after the founder's plan commit) with the schema already
  applied. I verified rather than re-applied; the apply script is idempotent
  (checks information_schema before issuing any DDL), so a re-run was also safe.
- All 6 tables EXIST on the branch: `watch.games`, `frames`, `tracklets`,
  `field_positions`, `derived_metrics`, `scheduler_runs`.
- Shadow-proof ingestion chain PROVEN inside one transaction that was then
  rolled back: games -> frames (detections JSONB) -> tracklets ->
  field_positions -> derived_metrics -> scheduler_runs. Restore proof on
  `watch.games`: 30 -> 31 -> 30 rows.
- Observed live state: 30 `watch.games` rows (29 scheduled 2026 Week-4 ESPN ids
  including 401872964 PIT@CLE + 1 final 2022091113 TB@DAL 2022 W1 smoke row) and
  3,898 `scheduler_runs` rows — the watch-scheduler cron is live and writing.
- Sibling smoke rows in child tables (3 tracklets, 4 field_positions, 2
  derived_metrics) flagged, not deleted (dev branch).

## Gotchas recorded for Steps 2-6

1. `derived_metrics.segment` is NOT NULL (e.g. 'route', 'post-snap'). Every
   future proof or ingestion payload must include `segment` or the insert fails
   on a not-null violation. Schema shape, not a defect.
2. The plan's literal empty-branch proof query (`watch.games` = 0) can no longer
   be shown since real rows exist; the standing equivalent is
   insert -> count -> rollback -> restore, which passed.

## Boundaries

No model, gate, env flag, or production branch touched. No writes outside the
dev branch; the proof transaction was rolled back. QC: Motif verdict PASS
(agent-bus 2914983, 2026-10-17 05:59 CT), no revision requested; Steps 2-6
remain the following-days slice per the plan.
