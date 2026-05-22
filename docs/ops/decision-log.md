# Decision Log

Append-only operating log for Galaxy Sports Edge autonomous work.

## 2026-05-22 - Phase 2 API Slice Starts With Board State

- Decision: implement `/api/board/state`, `/api/board/passes`, and `/api/calibration` before deeper schema work.
- Rationale: the Phase 1 homepage already exposes Gate Cam, Pass List, and Live Calibration surfaces. These contracts let the UI move from static preview data toward real, bootstrap-safe data without breaking existing public shapes.
- Alternatives considered: start with a `GateDecision` schema migration first. Deferred because the current repo already has enough `Game`, `Pick`, and sample-pick structure to establish public API contracts safely.

## 2026-05-22 - Phase 2 Shared Loaders Before More Surfaces

- Decision: extract board state, pass list, and public calibration data into shared server loaders under `apps/web/lib/**`.
- Rationale: route handlers and public pages need the same bootstrap-safe data contracts. Shared loaders avoid importing API `GET` handlers inside server components and give future homepage, board, Game Room, and widget work a stable internal boundary.
- Alternatives considered: keep page-to-route imports until Phase 3. Rejected because it would make the next OS surfaces depend on HTTP-shaped route modules rather than typed read-model functions.

## 2026-05-22 - Correlation Foundation Starts As Typed Query Contract

- Decision: begin the cross-sport correlation engine with a typed query schema and validator, without adding database tables yet.
- Rationale: Phase 2 needs a backend foundation, while saved queries and share/star behavior belong to the later UI phase. A pure contract lets us lock public aggregate gates and sample-size rules before introducing migrations.
- Alternatives considered: add saved-query tables now. Deferred until the Phase 4/5 product surface needs persistence and entitlement gates.

## 2026-05-22 - Gate Decisions Use A Separate Append-Only Table

- Decision: add `GateDecision` as a separate table related to `Game` and optionally `Pick`, instead of extending `Pick` with nullable gate columns.
- Rationale: Gate Cam and Pass List need a history of scoring, published, and gated decisions. A separate table preserves multiple evaluations per game, keeps existing pick semantics stable, and gives bootstrap-era decisions an explicit `isBootstrap` flag.
- Rollback path: drop `gate_decisions` foreign keys and indexes, drop the `gate_decisions` table, then drop the `GateDecisionStatus` enum. No existing production table is rewritten by this migration.
- Alternatives considered: extend `Pick` with pass reasons. Rejected because many evaluated games never become picks, and the pass ledger should not require fake pick rows.
