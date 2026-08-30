# Prisma Migration Sequence — Specification

**Status:** Operational reference. Updated as migrations land.
**Owner:** Codex executes; Claude reviews dependencies.
**Location:** `packages/db/prisma/migrations/`.

---

## TL;DR

Phases 3-5 add roughly a dozen new Prisma models. Migrations land in a specific order to avoid foreign-key conflicts and to let dependent surfaces ship cleanly. This doc maps the sequence.

Codex follows the order during execution. If a Phase ships its migrations out of order, that's fine — but the dependencies below must hold.

---

## Already shipped (Phase 0-2)

These migrations are live in production. No replay needed.

| Migration | Phase | Adds |
|---|---|---|
| `add_pick_grade` etc. (existing) | pre-2026 | Initial engine schema |
| `add_source_snapshot` | Phase 1 / Evidence Engine | `SourceSnapshot` |
| `add_promotion` | Phase 2 prep | `Promotion`, `SourceCoverageReport` |
| `add_calibration_proposal` | Phase 2 prep | `CalibrationProposal` |
| `add_content_draft` | Phase 2 prep | `ContentDraft`, `ContentSource`, `ContentReview` |
| `add_agent_run_log` | Phase 0/1 | `AgentRunLog` |
| `add_gate_decision` | Phase 2 (DEC-029) | `GateDecision` |

Test count is 1,427 across 115 files post-Phase 2.

---

## Phase 3 migrations (in execution order)

### M-3.1 — Loss Autopsy schema

**Adds:** `LossAutopsy` model, `LossAutopsyStatus` enum, `LossRootCause` enum. `Pick` gains `lossAutopsy LossAutopsy?` back-relation.

**Migration name:** `add_loss_autopsy`

**Dependencies:** None beyond existing `Pick` table.

**Rollback:** Drop the table + enums. No data loss in pre-Phase-3 state.

**Required before:** Loss Room sub-archive (`/performance/losses/*`), Game Room Galaxy Memory slot, Twitter bot post-mortem thread content, Model Journal Friday data pipe (references autopsies).

**Notes:** This migration was queued from `CODEX_PICKUP_2026-05-22_LOSS_AUTOPSY_AND_PROMO_WIRE.md` and deferred through Phase 0/2. Lands as Phase 3 Step 0.

---

### M-3.2 — Pre-mortem persistence

**Adds to `Pick`:**

- `preMortemContent Json?`
- `preMortemAt DateTime?`
- `preMortemVersion String?`

**Migration name:** `add_pick_pre_mortem`

**Dependencies:** None beyond existing `Pick` table.

**Rollback:** Drop the three fields. Existing pre-mortem rendering paths gracefully no-op on absence.

**Required before:** Phase 3 Step 6 pipeline wiring (the builder writes to these fields), Game Room "What Would Change Our Mind" panel.

---

### M-3.3 — Model Journal schema

**Adds:** `ModelJournalEntry` model + `ModelJournalEntryStatus` enum.

**Migration name:** `add_model_journal_entry`

**Dependencies:** None beyond existing `User` table.

**Rollback:** Drop the table + enum. No prior data.

**Required before:** Friday data-pipe worker, Saturday drafting worker, `/cockpit/journal/[entryId]` review UI, `/journal/[slug]` public surface.

---

### M-3.4 — Galaxy Memory (optional denormalized table)

**Decision required before this migration:** does Codex want to materialize `GalaxyMemory` as a table for query performance, or derive from existing tables?

If materialized:

**Adds:** `GalaxyMemory` model per `docs/product/galaxy-memory-persistence-spec.md`.

**Migration name:** `add_galaxy_memory`

**Dependencies:** M-3.1 (LossAutopsy must exist before Memory can FK to it).

**Rollback:** Drop the table. Game Room Memory panel falls back to derived rendering.

If derived (default per spec): no migration needed.

---

## Phase 4 migrations

### M-4.1 — Calibration training schema

**Adds:** `UserPickEstimate`, `UserCalibrationSnapshot`.

**Migration name:** `add_calibration_training`

**Dependencies:** Existing `User` + `Pick` tables.

**Rollback:** Drop both tables.

**Required before:** Pre-show prompt UI, weekly insight job.

---

### M-4.2 — Model Court schema

**Adds:** `ModelCourtCase`.

**Migration name:** `add_model_court_case`

**Dependencies:** Existing `Game` + `User` tables.

**Rollback:** Drop the table.

**Required before:** Phase 4 Step 2 (Model Court conversational layer).

---

### M-4.3 — GitHub Issues for the model schema

**Adds:** `ModelIssue`, `ModelIssueComment`, `ModelIssueUpvote`, `ModelIssueGame`.

**Migration name:** `add_model_issue`

**Dependencies:** Existing `User` + `Game` tables.

**Rollback:** Drop all four tables.

**Required before:** Phase 4 Step 5 (model issues tracker).

---

### M-4.4 — Claude API cost tracking schema

**Adds:** `ClaudeApiCallRecord`, `ClaudeApiBudget`.

**Migration name:** `add_claude_api_cost_tracking`

**Dependencies:** Existing `User` + `Game` tables (optional FKs for attribution).

**Rollback:** Drop both tables.

**Required before:** Claude API wrapper rolls out (`callClaudeWithCostTracking`). Should land EARLY in Phase 4 (or even Phase 3 if Model Journal + Studio are using Claude API materially) to start gathering cost data before budgets bite.

**Recommendation:** Land M-4.4 in Phase 3 even though it's classified Phase 4 — the cost data starts accumulating from day-1 of Studio + Model Journal generation. Update the decision log if this gets pulled forward.

---

## Phase 5 migrations

### M-5.1 — Anti-Galaxy schema

**Adds:** `AntiGalaxyPick`.

**Migration name:** `add_anti_galaxy_pick`

**Dependencies:** Existing `Game` + `Pick` tables (optional FK).

**Rollback:** Drop the table.

**Required before:** Phase 5 Step 2 (anti-Galaxy worker + `/anti-galaxy` page).

---

### M-5.2 — DSL save/share schema

**Adds:** `UserDSLQuery`, `UserDSLQueryStar`, `UserDSLAlert`.

**Migration name:** `add_dsl_queries`

**Dependencies:** Existing `User` table.

**Rollback:** Drop all three.

**Required before:** Phase 5 Step 1 save/share/star functionality, alert runtime.

---

### M-5.3 — B2B API key management schema

**Adds:** `ApiKey`, `ApiKeyUsage`.

**Migration name:** `add_b2b_api_keys`

**Dependencies:** Existing `User` table.

**Rollback:** Drop both.

**Required before:** Phase 5 Step 5 (B2B widgets + API).

---

## Dependency graph (textual)

```
Phase 3:
  M-3.1 (LossAutopsy) ────────┬──> M-3.4 (GalaxyMemory) if materialized
  M-3.2 (Pick.preMortem) ─────┤
  M-3.3 (ModelJournal) ───────┘

Phase 4:
  M-4.4 (ClaudeApiCost) — recommend land early in Phase 3
  M-4.1 (CalibrationTraining)
  M-4.2 (ModelCourtCase)
  M-4.3 (ModelIssue + relations)
  No cross-deps within Phase 4.

Phase 5:
  M-5.1 (AntiGalaxyPick)
  M-5.2 (UserDSLQuery + relations)
  M-5.3 (ApiKey + Usage)
  No cross-deps within Phase 5.
```

---

## Convention

1. **One migration per logical schema addition.** Don't bundle unrelated tables.
2. **Migration names use snake_case with `add_` / `update_` / `remove_` prefix.**
3. **Every migration has a documented rollback path** in the PR description.
4. **Every migration runs `npm run db:generate` immediately after.**
5. **Existing-data migrations** (e.g., backfilling computed fields) ship as separate migrations from schema additions, with explicit data-migration scripts at `packages/db/scripts/`.
6. **Test suite must pass against the migrated schema** before the PR merges.

---

## Stuck-state for migration conflicts

If a Phase 4 migration unexpectedly needs a Phase 5 schema element (or vice versa), the path is:

1. Codex flags in the PR description.
2. Decision log entry: pull the dependent migration forward.
3. The pulled-forward migration ships in the current phase with the entry referencing the original phase assignment.
4. The migration sequence doc is updated to reflect the new order.

Do NOT block on the canonical phase ordering if it would prevent shipping a verified surface. The phase ordering is a heuristic, not a hard constraint.

---

## Open items

- **OPEN-MIG-1:** Should we have a "rehearsal" environment where every migration runs against production-size data before landing in prod? Default: yes for any migration adding indices to an existing table with >100K rows. Smaller tables skip the rehearsal.
- **OPEN-MIG-2:** Should rollbacks include data-archival (snapshot the dropped table's rows) before destructive operations? Default: yes via a `archive_<table_name>_<migration_name>.sql` dump stored at `packages/db/archives/`. Owner can purge after 30 days.
- **OPEN-MIG-3:** Should migrations require manual SQL review before applying in production? Default: yes for any migration that adds an index to a table with >100K rows, or that modifies a foreign-key constraint. Auto-apply for everything else.

---

*Spec authored by Claude. Codex executes. Migration ordering can be tuned per Phase based on dependencies that surface during implementation.*
