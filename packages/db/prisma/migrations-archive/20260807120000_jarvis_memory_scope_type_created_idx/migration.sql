-- JarvisMemoryEvent durable readers (I3 free-spine + jarvis-history).
-- Query shape:
--   WHERE scope = ? AND memory_type = 'episodic'
--   ORDER BY created_at DESC
--   LIMIT 1..96
--
-- Planned index-only / index-scan path (no Sort):
--   Index Scan Backward on jarvis_memory_events_scope_type_created_idx
--   Index Cond: (scope = $1 AND memory_type = 'episodic')
--
-- Keep existing single-column indexes (memory_state, memory_type, scope,
-- created_at) until EXPLAIN ANALYZE on production-like volume proves them
-- unused. Do NOT unique-constrain scope — table is append-only by design.
--
-- Partial indexes deferred: system scopes (free-spine / history) are not yet
-- large enough to justify per-scope indexes; one general composite is enough.
-- Idempotency JSON expression index deferred until recordMemoryEvent is hot.
--
-- Additive, non-unique, online-safe (no data rewrite).

CREATE INDEX "jarvis_memory_events_scope_type_created_idx"
  ON "jarvis_memory_events" ("scope", "memory_type", "created_at" DESC);
