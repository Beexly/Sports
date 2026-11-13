# Pulse — ingestion run killers closed (2026-11-13 00:30 CT)

Two defects were failing production ingestion runs. Neither was the grader.

1. **Open payment circuit relabelled a live ESPN board.** When the Odds API circuit
   was open, `oddsProviderTag` was overwritten with `paid-circuit-open` even though the
   keyless path had already supplied events. `isEspnPrimary` then read false and the
   upstream-timestamp freshness gate demanded a `last_update` ESPN rows never carry:
   every row parsed Invalid, `unparseableTimestamps == rows`, and the run failed
   "Upstream odds are stale". 31 NCAAF and 43 NCAAB FAILED runs in 48h. The tag is now
   claimed only when no board was sourced.

2. **Mint-side supersede hit `pickSettlementEvent.pickId @unique`.** A slot holder
   voided, re-opened and voided again still owns its event row; `create()` threw P2002,
   rolled back the mint transaction and marked the run FAILED four seconds in, before
   any odds fetch. Hourly on `basketball_nba`. Now an upsert that resets the row to
   PENDING so the outbox re-announces the current void. The paid settle lane in
   `settle-sport.ts` had the same `create()` and got the same fix.

**Tests:** process-sport 88/88 (new regression fails without the tag fix),
supersede-unpublished-pick 4/4, settle-sport 66/66, full ingestion-pipeline 1579 passed.

**Live:** `2c7377837` on `origin/main`; production deploy READY at that commit
(`dpl_cgMH8UJdvKmQHnm5ssEeY9zcxVKo`). The docs-only follow-up is correctly skipped by
the ignored build step.

**Settlement drain re-verified first:** 84 published PENDING, 0 overdue past 6h,
704 `free-backfill` events in the last 24h.
