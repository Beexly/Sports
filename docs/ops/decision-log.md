# Decision Log

Append-only operating log for Galaxy Sports Edge autonomous work.

## 2026-05-22 - Phase 2 API Slice Starts With Board State

- Decision: implement `/api/board/state`, `/api/board/passes`, and `/api/calibration` before deeper schema work.
- Rationale: the Phase 1 homepage already exposes Gate Cam, Pass List, and Live Calibration surfaces. These contracts let the UI move from static preview data toward real, bootstrap-safe data without breaking existing public shapes.
- Alternatives considered: start with a `GateDecision` schema migration first. Deferred because the current repo already has enough `Game`, `Pick`, and sample-pick structure to establish public API contracts safely.

