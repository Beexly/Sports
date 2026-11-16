"""Unit tests for AgentDB SQLite hybrid vector + lexical bitemporal memory store."""

from __future__ import annotations

from gse_engine.memory.agentdb_store import AgentDbMemoryStore


def test_hybrid_search_ranks_semantic_and_lexical_match_and_enforces_no_lookahead() -> None:
    """Bitemporal `as_of_utc` filter must exclude future-week records completely."""
    store = AgentDbMemoryStore(":memory:")
    try:
        store.upsert(
            "mem_past_snap_count",
            namespace="coach_speak",
            text="Coach stated WR2 is on a 60 percent pitch count after hamstring tweak",
            embedding=[0.9, 0.1, 0.0],
            recorded_utc="2026-11-08T16:00:00Z",
            metadata={"week": 9, "team": "CIN"},
        )
        store.upsert(
            "mem_past_weather",
            namespace="weather",
            text="Heavy crosswind gusting 24 mph expected in Cleveland",
            embedding=[0.1, 0.9, 0.0],
            recorded_utc="2026-11-09T12:00:00Z",
            metadata={"week": 9, "team": "CLE"},
        )
        store.upsert(
            "mem_future_leak",
            namespace="coach_speak",
            text="Future week 11 box score pitch count outcome already settled",
            embedding=[1.0, 0.0, 0.0],
            recorded_utc="2026-11-22T22:00:00Z",
            metadata={"week": 11, "team": "CIN"},
        )

        hits = store.hybrid_search(
            query_embedding=[0.95, 0.05, 0.0],
            query_text="hamstring pitch count",
            as_of_utc="2026-11-15T12:00:00Z",
            top_k=5,
        )

        hit_ids = [h.entry.entry_id for h in hits]
        assert "mem_future_leak" not in hit_ids
        assert hits[0].entry.entry_id == "mem_past_snap_count"
        assert store.stats() == {"coach_speak": 2, "weather": 1}
    finally:
        store.close()
