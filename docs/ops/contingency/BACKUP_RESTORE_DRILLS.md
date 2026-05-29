# Backup & Restore Drills

How Galaxy's data is backed up, how restores are rehearsed, and what
RPO/RTO targets the platform commits to.

## What is backed up

| Source | Mechanism | Frequency | Retention |
|---|---|---|---|
| PostgreSQL (primary) | Managed provider PITR + nightly full snapshot | Continuous WAL + 1/day | 35 days PITR, 90 days snapshots |
| Redis (BullMQ queues) | AOF + RDB snapshot | Every 15 min | 7 days |
| Audit logs (telemetry, gate decisions, autopsies) | Append-only to S3-compatible store | Streaming | 365 days |
| Model artifacts (pick versions, scoring snapshots) | Object storage with versioning | On generation | Forever |
| Static assets (OG images, screenshots) | CDN cache + origin | On generation | Forever |

## RPO / RTO targets

| Tier | RPO (max data loss) | RTO (max downtime) |
|---|---|---|
| Picks / gate decisions | 0 min (WAL-streamed) | 30 min |
| User accounts / entitlements | 5 min | 1 h |
| Telemetry | 15 min (acceptable loss) | 4 h |
| Static assets | 0 (regen from source) | 2 h |

## Drill procedure (quarterly)

### Drill 1 — Picks table point-in-time restore

1. Pick a random point in the last 35 days.
2. Restore to a staging database.
3. Verify: (a) row counts match audit log expectations, (b) most-recent published pick reproduces, (c) no `modelVersion="v5.0.0-seed"` rows leak into production-flagged state.
4. Record: restore time, verification time, any discrepancies.

### Drill 2 — Full DB restore from snapshot

1. Take last night's snapshot.
2. Restore to fresh PG instance.
3. Bring up app pointing at restored DB.
4. Run smoke: `/today`, `/picks`, `/no-bet`, `/room/[gameId]` (one known good gameId).
5. Verify TrustStrip renders, EvidenceCard renders, no errors.
6. Tear down.
7. Record restore-to-smoke time.

### Drill 3 — Redis loss simulation

1. Flush Redis on staging.
2. Verify: queue workers retry, BullMQ delayed jobs are reseeded by next cron tick.
3. No user-facing impact expected — measure it.

### Drill 4 — Audit log replay

1. Pick a 24-hour window.
2. Replay telemetry events from S3 into a staging telemetry sink.
3. Verify the replay produces the expected aggregate counts.
4. This validates that the audit log is the source of truth for product analytics.

## Drill failure handling

If a quarterly drill fails:
1. Halt the drill, do NOT modify production.
2. Open SEV-2 in `INCIDENT_RESPONSE_MATRIX.md`.
3. Root-cause the gap.
4. Re-drill after fix lands.

## Forbidden actions during drills

- Never restore into production from a drill snapshot
- Never test destructive paths (`DROP TABLE`, `TRUNCATE`) on shared staging
- Never copy real PII into a drill environment without scrubbing
