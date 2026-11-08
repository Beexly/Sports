#!/usr/bin/env python3
"""
Unit & Integration Tests for `bojieli_ai_agent_book_and_multi_agent_patterns_engine.py`
======================================================================================
Tests all 10 chapters, 93 companion projects, and 23 external repos of `bojieli/ai-agent-book`
(`AI-Agents-in-Depth-tr.pdf`), all 12 chapters of `bojieli/ai-infra-book`, all 15 Multi-Agent
Design Patterns from `bsbodden/design-patterns-for-multi-agent-systems`, the 4-Tier Hybrid
Memory Architecture (`mindstudio.ai` + `RRbtskowjSY` + `xsPf8MkdMx8`), the `arXiv:1204.1581`
AUML/MDA MAS meta-model, the `Introductory_Chapter_Computer_Simulation.pdf` DEVS/Monte Carlo
verifier, the GSE Two-Wave 200+ Point DraftKings DFS Workflow, and Two-Host Rule compliance.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path

import pytest

from intelligence.multi_agent_and_hybrid_memory.bojieli_ai_agent_book_and_multi_agent_patterns_engine import (
    BOJIELI_10_CHAPTERS_CATALOG,
    BOJIELI_23_EXTERNAL_REPOS_CATALOG,
    BOJIELI_93_EXPERIMENTS_SUMMARY,
    BOJIELI_AI_INFRA_12_CHAPTERS_CATALOG,
    BSBODDEN_15_MULTI_AGENT_PATTERNS_CATALOG,
    COMPUTER_SIMULATION_6_TEXTBOOKS_CATALOG,
    RECEIPT_PATH,
    REPO_ROOT,
    AumlMdaMultiAgentMetaModel,
    BlackboardContractNetCriticOrchestrator,
    DiscreteEventMonteCarloVerifier,
    FourTierHybridMemoryArchitecture,
    GoapAction,
    compute_ai_infra_roofline_and_five_data_movement_metrics,
    inspect_local_downloads_pdfs_and_online_sources,
    run_bojieli_multi_agent_hybrid_memory_and_200pt_dfs_engine,
)


@pytest.fixture(scope="module")
def full_engine_receipt() -> dict:
    return run_bojieli_multi_agent_hybrid_memory_and_200pt_dfs_engine(
        game_id="2024_10_CIN_BAL",
        write_receipt=True,
    )


def test_catalogs_and_local_downloads_pdfs_inspection() -> None:
    assert len(BOJIELI_10_CHAPTERS_CATALOG) == 10
    assert [c["chapter"] for c in BOJIELI_10_CHAPTERS_CATALOG] == list(range(1, 11))
    assert [c["companion_experiments_count"] for c in BOJIELI_10_CHAPTERS_CATALOG] == [
        4,
        9,
        12,
        8,
        13,
        14,
        13,
        19,
        9,
        7,
    ]
    assert BOJIELI_93_EXPERIMENTS_SUMMARY["documented_companion_projects_badge_count"] == 93
    assert BOJIELI_93_EXPERIMENTS_SUMMARY["chapter_project_table_sum"] == 108
    assert len(BOJIELI_23_EXTERNAL_REPOS_CATALOG) == 23
    assert len(BOJIELI_AI_INFRA_12_CHAPTERS_CATALOG) == 12
    assert len(BSBODDEN_15_MULTI_AGENT_PATTERNS_CATALOG) == 15
    assert len(COMPUTER_SIMULATION_6_TEXTBOOKS_CATALOG) == 6

    audit = inspect_local_downloads_pdfs_and_online_sources()
    assert audit["ai_agents_in_depth_pdf"]["page_count"] == 390
    assert audit["ai_agents_in_depth_pdf"]["chapters_verified"] == 10
    assert audit["ai_agents_in_depth_pdf"]["toc_entries_count"] == 293
    assert audit["ai_agents_in_depth_pdf"]["level1_toc_headings_count"] == 12
    assert audit["introductory_chapter_computer_simulation_pdf"]["page_count"] == 5
    assert audit["introductory_chapter_computer_simulation_pdf"]["cited_textbooks_count"] == 6
    assert audit["introductory_chapter_computer_simulation_pdf"]["author_verified_in_text"] is True
    assert len(audit["youtube_and_blog_sources_verified"]) == 4


def test_four_tier_hybrid_memory_architecture_and_edge_cases() -> None:
    mem = FourTierHybridMemoryArchitecture(embedding_dim=32)

    # 1. Edge case: empty query & unknown entity recall should never crash or contaminate
    empty_recall = mem.hybrid_recall(query="", entity_id="UNKNOWN_ENTITY", top_k=3)
    assert empty_recall["curated_entity_card"] is None
    assert empty_recall["retrieved_episodic_chunks"] == []
    assert empty_recall["cross_entity_contamination_count"] == 0

    # 2. Tier 1: Working Memory snap checkpointing & status bar compression
    for s in range(1, 8):
        ckpt = mem.checkpoint_working_snap_state(
            thread_id="thread::test_game",
            snap_index=s,
            game_state={"qtr": 1, "down": 1, "epa_delta": 0.25 * s},
            compress_after_snaps=4,
        )
    assert ckpt["total_snaps_logged"] == 7
    assert ckpt["active_window_snaps"] == 4
    assert ckpt["agent_status_bar"]["compressed_snaps_count"] == 3
    assert ckpt["kv_cache_prefix_hit_ratio"] > 0.70

    # 3. Tier 2 & Tier 3: Episodic capture + Curated Entity conflict resolution + Entity isolation
    mem.capture_episodic_transcript(
        session_id="s1",
        thread_id="thread::test_game",
        agent_id="BeatAgent",
        entity_id="PLAYER_A",
        raw_text="Player A declined route expansion on Tuesday.",
        topics=["role", "routes"],
        sentiment_or_regime="LIMITED",
        importance_score=0.6,
    )
    card_v1 = mem.upsert_curated_entity_memory(
        entity_id="PLAYER_A",
        category="role",
        fact_key="status",
        fact_value="LIMITED_ROLE",
        source_session_id="s1",
    )
    assert card_v1["facts"]["role"]["status"]["conflict_resolved"] is False

    # Contradictory/updated state in session s2 must supersede s1 and log revision history
    mem.capture_episodic_transcript(
        session_id="s2",
        thread_id="thread::test_game",
        agent_id="BeatAgent",
        entity_id="PLAYER_A",
        raw_text="Player A promoted to full WR1 alpha role on Friday.",
        topics=["role", "routes", "WR1"],
        sentiment_or_regime="ALPHA_WR1",
        importance_score=0.95,
    )
    card_v2 = mem.upsert_curated_entity_memory(
        entity_id="PLAYER_A",
        category="role",
        fact_key="status",
        fact_value="FULL_WR1_ALPHA",
        source_session_id="s2",
    )
    assert card_v2["facts"]["role"]["status"]["value"] == "FULL_WR1_ALPHA"
    assert card_v2["facts"]["role"]["status"]["conflict_resolved"] is True
    assert len(card_v2["revision_history"]) == 1
    assert card_v2["revision_history"][0]["old_value"] == "LIMITED_ROLE"

    # Separate entity PLAYER_B must never leak into PLAYER_A's recall
    mem.capture_episodic_transcript(
        session_id="s3",
        thread_id="thread::other_game",
        agent_id="WeatherAgent",
        entity_id="PLAYER_B",
        raw_text="Player B plays in 30mph blizzard conditions.",
        topics=["weather", "blizzard"],
        sentiment_or_regime="SUPPRESSED",
        importance_score=0.99,
    )
    recall_a = mem.hybrid_recall(query="WR1 alpha role routes", entity_id="PLAYER_A", top_k=5)
    assert recall_a["cross_entity_contamination_count"] == 0
    assert len(recall_a["retrieved_episodic_chunks"]) == 2
    assert all(c["entity_id"] == "PLAYER_A" for c in recall_a["retrieved_episodic_chunks"])
    assert recall_a["curated_memory_injected_first"] is True

    # 4. Semantic synonym recall with zero shared surface tokens
    recall_b_synonym = mem.hybrid_recall(
        query="gale snowstorm precipitation clawback",
        entity_id="PLAYER_B",
        top_k=3,
    )
    assert len(recall_b_synonym["retrieved_episodic_chunks"]) == 1
    assert recall_b_synonym["retrieved_episodic_chunks"][0]["dense_similarity"] > 0.50

    # 5. Tier 4: Progressive disclosure of procedural skills
    skills = mem.discover_procedural_tools("Wave 2 200 point contest simulation CVaR_0.99", top_k=2)
    assert len(skills) == 2
    assert skills[0]["disclosure_level"] == "FULL_PROGRESSIVE_DISCLOSURE"
    assert "progressive_payload" in skills[0]


def test_goap_astar_planner_contract_net_and_critic_loop() -> None:
    orch = BlackboardContractNetCriticOrchestrator()

    # Verify GOAP A* finds exact 7-action minimum cost 0.75 path and ignores expensive shortcuts
    plan = orch.plan_goap_astar_path("RawSlateInput", "Verified200PtPortfolio")
    assert plan["actions_count"] == 7
    assert abs(plan["total_cost"] - 0.75) < 1e-6
    assert plan["admissible_heuristic_verified"] is True
    assert "UnconditionedNaiveDirectSim" not in plan["action_sequence"]
    assert "UncuratedFullSlateMilpSolve" not in plan["action_sequence"]

    # Edge case: cyclic graph with positive-cost back-edges terminates cleanly without looping
    orch_cyclic = BlackboardContractNetCriticOrchestrator()
    orch_cyclic.goap_actions.append(
        GoapAction("CyclicBackEdge", "ReasoningOverlayReady", "RawSlateInput", 0.05, "Cycle back-edge")
    )
    cyclic_plan = orch_cyclic.plan_goap_astar_path("RawSlateInput", "Verified200PtPortfolio")
    assert cyclic_plan["actions_count"] == 7
    assert abs(cyclic_plan["total_cost"] - 0.75) < 1e-6

    # Edge case: zero-cost or negative-cost action raises ValueError
    orch_zero = BlackboardContractNetCriticOrchestrator()
    orch_zero.goap_actions.append(
        GoapAction("ZeroCostInvalid", "RawSlateInput", "SituationalContextReady", 0.0, "Invalid zero cost")
    )
    with pytest.raises(ValueError, match="strictly positive finite action costs"):
        orch_zero.plan_goap_astar_path("RawSlateInput", "Verified200PtPortfolio")

    orch_neg = BlackboardContractNetCriticOrchestrator()
    orch_neg.goap_actions.append(
        GoapAction("NegCostInvalid", "RawSlateInput", "SituationalContextReady", -0.10, "Invalid negative cost")
    )
    with pytest.raises(ValueError, match="strictly positive finite action costs"):
        orch_neg.plan_goap_astar_path("RawSlateInput", "Verified200PtPortfolio")

    # Edge case: unreachable goal state raises RuntimeError
    with pytest.raises(RuntimeError, match="No valid GOAP path"):
        orch.plan_goap_astar_path("RawSlateInput", "NonExistentGoalState")

    # Edge case: Contract-Net rejects a lineup that violates the $50,000 cap or < 200 DK pts
    bad_lineups = [
        {
            "lineup_id": 99,
            "archetype": "OVER_CAP_INVALID",
            "total_salary": 51200,
            "cvar_099_championship_dk_pts": 215.0,
            "joint_p99_shootout_dk_pts": 205.0,
            "wave2_lineup_vs_field_simulation": {"sim_contest_roi_pct": 120.0},
        },
        {
            "lineup_id": 100,
            "archetype": "SUB_200_INVALID",
            "total_salary": 49800,
            "cvar_099_championship_dk_pts": 188.5,
            "joint_p99_shootout_dk_pts": 182.0,
            "wave2_lineup_vs_field_simulation": {"sim_contest_roi_pct": 10.0},
        },
    ]
    cnet_bad = orch.run_contract_net_bidding(bad_lineups)
    assert cnet_bad["contracts_awarded"] == 0
    assert all(a["award_status"] == "REJECTED" for a in cnet_bad["awards"])


def test_concurrent_multi_thread_blackboard_and_hybrid_memory_safety() -> None:
    mem = FourTierHybridMemoryArchitecture(embedding_dim=32)
    orch = BlackboardContractNetCriticOrchestrator()

    def _worker(i: int) -> int:
        mem.checkpoint_working_snap_state(
            thread_id="thread::concurrent_game",
            snap_index=i,
            game_state={"qtr": 1, "down": 1, "epa_delta": 0.05 * i},
            compress_after_snaps=6,
        )
        mem.capture_episodic_transcript(
            session_id=f"sess-{i}",
            thread_id="thread::concurrent_game",
            agent_id=f"WorkerAgent-{i}",
            entity_id=f"ENTITY_{i % 4}",
            raw_text=f"Concurrent observation {i} on injury and route share.",
            topics=["injury", "route"],
            importance_score=0.8,
        )
        mem.upsert_curated_entity_memory(
            entity_id=f"ENTITY_{i % 4}",
            category="status",
            fact_key="step",
            fact_value=f"VAL_{i}",
            source_session_id=f"sess-{i}",
        )
        return orch.write_blackboard(f"key_{i}", {"val": i}, f"WorkerAgent-{i}")

    n_tasks = 24
    with ThreadPoolExecutor(max_workers=8) as pool:
        versions = list(pool.map(_worker, range(1, n_tasks + 1)))

    assert sorted(versions) == list(range(1, n_tasks + 1))
    assert orch.blackboard["version"] == n_tasks
    assert len(orch.blackboard["state_history"]) == n_tasks
    assert len(mem.episodic_transcripts) == n_tasks
    assert sorted(t.recency_index for t in mem.episodic_transcripts) == list(range(1, n_tasks + 1))
    for e_idx in range(4):
        recall_e = mem.hybrid_recall("injury route share", entity_id=f"ENTITY_{e_idx}", top_k=10)
        assert recall_e["cross_entity_contamination_count"] == 0
        assert len(recall_e["retrieved_episodic_chunks"]) == 6


def test_auml_mda_arxiv_1204_1581_and_discrete_event_simulation_verifier() -> None:
    auml = AumlMdaMultiAgentMetaModel()
    # Heavy-juice -320 trap -> ReactiveAgent triggers firewall, CognitiveAgent Decide() returns PASS
    blocked = auml.execute_auml_agent_hierarchy(
        market_odds_american=-320,
        post_devig_ev=-0.04,
        wind_mph=28.0,
        cvar_099_dk_pts=245.0,
    )
    assert blocked["Decide_output"] == "PASS"
    assert blocked["communicative_envelope"]["reactive_firewall_block"] is True
    assert blocked["communicative_envelope"]["adaptive_regime"] == "WEATHER_SUPPRESSOR_L1_ACTIVE"
    assert blocked["communicative_envelope"]["rational_200pt_cleared"] is True

    # Clean price -110 with +4.5% post-devig EV -> Decide() returns PUBLISH
    approved = auml.execute_auml_agent_hierarchy(
        market_odds_american=-110,
        post_devig_ev=0.045,
        wind_mph=4.0,
        cvar_099_dk_pts=245.0,
    )
    assert approved["Decide_output"] == "PUBLISH"
    assert approved["communicative_envelope"]["reactive_firewall_block"] is False
    assert approved["communicative_envelope"]["adaptive_regime"] == "CLEAN_ENVIRONMENT"

    # Discrete-Event & Monte Carlo Verifier (Introductory_Chapter_Computer_Simulation.pdf)
    verifier = DiscreteEventMonteCarloVerifier()
    sim_res = verifier.verify_devs_state_transitions_and_monte_carlo_convergence(
        num_worlds=10000,
        snaps_per_game=175,
        seed=42,
    )
    assert sim_res["status"] == "PASS"
    assert sim_res["total_snap_evaluations"] == 1750000
    assert sim_res["devs_clock_monotonic_verified"] is True
    assert sim_res["simplex_conservation_verified"] is True
    assert sim_res["variance_reduction_verified"] is True

    # AI-Infra Roofline & 5 Data-Movement metrics (bojieli/ai-infra-book)
    infra = compute_ai_infra_roofline_and_five_data_movement_metrics()
    assert infra["ai_infra_chapters_wired"] == 12
    assert infra["prefill_is_compute_bound_and_decode_is_memory_bound"] is True
    assert len(infra["five_data_movement_answers" if "five_data_movement_answers" in infra else "five_data_movement_questions"]) == 5


def test_end_to_end_two_wave_projections_and_200pt_dfs_workflow(full_engine_receipt: dict) -> None:
    assert full_engine_receipt["status"] == "PASS"
    assert RECEIPT_PATH.exists()
    persisted = json.loads(RECEIPT_PATH.read_text(encoding="utf-8"))
    assert persisted["digest_sha256"] == full_engine_receipt["digest_sha256"]

    summary = full_engine_receipt["gse_two_wave_projections_and_200pt_dfs_summary"]
    assert summary["l26_market_entered_last_weight_le_0_08"] is True
    assert summary["heavy_juice_minus_300_trap_blocked"] is True
    assert summary["pass_discipline_verified"] is True
    assert summary["wave1_total_slate_players_projected"] == 225
    assert summary["wave1_curated_dfs_pool_size"] == 119
    assert summary["wave1_rejected_traps_count"] == 106
    assert summary["wave1_curated_dfs_pool_size"] + summary["wave1_rejected_traps_count"] == 225
    assert summary["wave2_total_lineup_world_evaluations"] == 6200000
    assert summary["all_3_lineups_clear_200pt_championship_target"] is True
    assert summary["max_cvar_099_championship_dk_pts"] >= 200.0
    assert summary["max_joint_p99_shootout_dk_pts"] >= 200.0

    for lu in summary["lineups"]:
        assert lu["valid_dk_9_slot_roster"] is True
        assert lu["total_salary"] <= 50000
        assert lu["cvar_099_championship_dk_pts"] >= 200.0
        assert lu["joint_p99_shootout_dk_pts"] >= 200.0

    # Verify strict multi-run idempotency & deterministic digest invariance (zero compounding drift)
    second_run = run_bojieli_multi_agent_hybrid_memory_and_200pt_dfs_engine(
        game_id="2024_10_CIN_BAL",
        write_receipt=False,
    )
    assert second_run["status"] == "PASS"
    assert second_run["digest_sha256"] == full_engine_receipt["digest_sha256"]
    assert (
        second_run["gse_two_wave_projections_and_200pt_dfs_summary"]["wave1_curated_dfs_pool_size"]
        == 119
    )
    assert (
        second_run["gse_two_wave_projections_and_200pt_dfs_summary"]["max_cvar_099_championship_dk_pts"]
        == summary["max_cvar_099_championship_dk_pts"]
    )


def test_two_host_rule_zero_hardcoded_local_user_paths() -> None:
    """
    Verifies that zero committed `.py` files under `intelligence/` contain literal
    local host user paths.
    """
    forbidden_substrings = [
        "C:\\Users\\" + "Garrett",
        "c:\\users\\" + "garrett",
        "C:/Users/" + "Garrett",
        "/Users/" + "Garrett",
    ]
    intel_dir = REPO_ROOT / "intelligence"
    violations = []
    for py_file in intel_dir.rglob("*.py"):
        text = py_file.read_text(encoding="utf-8", errors="replace")
        for bad in forbidden_substrings:
            if bad in text:
                violations.append(f"{py_file.relative_to(REPO_ROOT)} contains {bad}")
    assert violations == [], f"Two-Host Rule violations found: {violations}"
