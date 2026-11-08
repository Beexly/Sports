"""Unit tests for RuView AgentDB Memory Patterns & AgentDB Vector Search (`agentdb_memory_and_vector_engine.py`)."""

from __future__ import annotations

from intelligence.memory.agentdb_memory_and_vector_engine import (
    LearningPluginSuite,
    compute_embedding,
    create_agentdb_adapter,
    execute_agentdb_nfl_suite,
    quantize_vector,
)


def test_agentdb_vector_search_quantization_mmr_and_hybrid_filters() -> None:
    emb = compute_embedding("CIN at BAL trench pressure rate", dimension=64)
    assert len(emb) == 64

    b_q = quantize_vector(emb, "binary")
    s_q = quantize_vector(emb, "scalar")
    p_q = quantize_vector(emb, "product")
    assert b_q["compression_ratio"] == 32.0
    assert s_q["compression_ratio"] == 4.0
    assert p_q["compression_ratio"] == 32.0

    report = execute_agentdb_nfl_suite()
    assert report["status"] == "PASS"
    assert len(report["cosine_mmr_retrieval"]["results"]) == 3
    assert report["cosine_mmr_retrieval"]["synthesized_context"]["matched_count"] == 3
    assert report["euclidean_retrieval_count"] == 2
    assert report["dot_retrieval_count"] == 2
    assert len(report["hybrid_search_results"]) == 1
    assert report["hybrid_search_results"][0]["metadata"]["windMph"] == 18.0


def test_agentdb_memory_hierarchy_consolidation_and_all_9_learning_plugins() -> None:
    report = execute_agentdb_nfl_suite()
    assert report["hierarchy_summary"]["immediate_count"] == 2
    assert report["hierarchy_summary"]["longTerm_count"] == 1
    assert report["consolidation"]["pruned_patterns"] == 1
    assert report["consolidation"]["remaining_patterns"] == 3

    learning = report["learning_plugins"]
    assert learning["plugins_executed"] == 9
    for plugin_name in LearningPluginSuite.PLUGIN_NAMES:
        assert plugin_name in learning["plugin_results"]
        assert learning["plugin_results"][plugin_name]["status"] == "EXECUTED"


def test_agentdb_lru_cache_hit() -> None:
    adapter = create_agentdb_adapter(dimension=32, cache_size=16)
    adapter.insert_pattern("nfl", "Baltimore Ravens simulated zone blitz on 3rd and medium")
    r1 = adapter.retrieve_with_reasoning("Baltimore Ravens simulated zone blitz", domain="nfl", k=1)
    assert r1["cache_hit"] is False
    r2 = adapter.retrieve_with_reasoning("Baltimore Ravens simulated zone blitz", domain="nfl", k=1)
    assert r2["cache_hit"] is True
