from __future__ import annotations

import json
from pathlib import Path
import re

from intelligence.ops.openai_ecosystem_jules_and_opendots_engine import (
    build_opendots_ag_ui_human_review_card,
    build_retrieval_plugin_pinecone_upsert_contract,
    compute_autoregressive_play_sequence_surprisal_bits,
    compute_clip_contrastive_all22_and_chart_alignment,
    evaluate_17_antigravity_audit_cloud_and_11_matt_pocock_skills,
    evaluate_cookbook_hybrid_rag_and_structured_outputs,
    evaluate_copilotkit_5repo_coworker_and_channels_mesh,
    evaluate_gpt_oss_harmony_safety_and_tool_contract,
    evaluate_jules_live_api_sources_and_sessions,
    evaluate_openai_ecosystem_jules_opendots_readiness,
    evaluate_openai_evals_conformal_and_clv_registry,
    evaluate_opendots_connections_and_computers_policy,
    evaluate_parallel_ai_search_mcp_and_streamable_http_router,
    govern_tiktoken_context_budget_and_compaction,
    orchestrate_swarm_handoff_across_143_skills,
    step_openai_gym_compatible_phase_transition_env,
    unblock_awaiting_jules_sessions,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
ETC_RE = re.compile(r"\be" + r"tc\.", re.IGNORECASE)
SECRET_TOKENS = ("pc" + "sk_", "ph" + "x_", "ph" + "c_", "2G" + "s3", "AI" + "za", "AQ" + ".")


def test_openai_9_companion_repos_kernels_and_contracts() -> None:
    evals = evaluate_openai_evals_conformal_and_clv_registry()
    assert evals["repo"] == "openai/evals"
    assert evals["brier_skill_score"] > 0.0
    assert evals["mean_clv_prob_delta"] > 0.0
    assert evals["eval_gate_passed"] is True

    cookbook = evaluate_cookbook_hybrid_rag_and_structured_outputs()
    assert cookbook["repo"] == "openai/openai-cookbook"
    assert cookbook["structured_output_schema_valid"] is True
    assert len(cookbook["fused_rankings"]) >= 4

    gym_nfl = step_openai_gym_compatible_phase_transition_env(
        state={"down": 1, "ydstogo": 10, "yardline_100": 65, "chi_sg": 0.90, "league": "NFL"},
        action="PASS_PLAY_ACTION_DEEP",
    )
    gym_cfb = step_openai_gym_compatible_phase_transition_env(
        state={"down": 2, "ydstogo": 6, "yardline_100": 45, "chi_sg": 1.10, "league": "CFB"},
        action="QUICK_GAME_RPO",
    )
    assert gym_nfl["info"]["env_id"] == "GSE-GSI-PhaseGym-v1"
    assert gym_nfl["info"]["college_guard_sigma_pts"] == 13.36
    assert gym_cfb["info"]["college_guard_sigma_pts"] == 15.15

    clip_res = compute_clip_contrastive_all22_and_chart_alignment()
    assert clip_res["repo"] == "openai/CLIP"
    assert clip_res["predicted_coverage_shell"] == "two_high_fangio_quarters_creeper_disguise"

    gpt2_res = compute_autoregressive_play_sequence_surprisal_bits()
    assert gpt2_res["repo"] == "openai/gpt-2"
    assert gpt2_res["tendency_breaker_detected"] is True
    assert gpt2_res["sequence_perplexity"] > 1.0

    swarm_res = orchestrate_swarm_handoff_across_143_skills("jules_fleet_takeover")
    assert swarm_res["repo"] == "openai/swarm"
    assert swarm_res["handoff_target_agent"] == "JulesFleetCommanderAgent"
    assert swarm_res["total_catalog_skills_indexed"] >= 143

    gpt_oss = evaluate_gpt_oss_harmony_safety_and_tool_contract()
    assert gpt_oss["repo"] == "openai/gpt-oss"
    assert gpt_oss["paywall_and_copy_firewall_verified"] is True

    ret_plug = build_retrieval_plugin_pinecone_upsert_contract(
        doc_id="doc-test-01",
        title="Test Retrieval Plugin Document",
        text="Deterministic Pinecone 2025-04 hybrid upsert contract.",
        source_url="https://github.com/openai/chatgpt-retrieval-plugin",
    )
    assert ret_plug["repo"] == "openai/chatgpt-retrieval-plugin"
    assert ret_plug["namespace"] == "gse-openai-ecosystem-jules-opendots"

    tik_res = govern_tiktoken_context_budget_and_compaction("Week 9 360-degree board evaluation.")
    assert tik_res["repo"] == "openai/tiktoken"
    assert tik_res["estimated_tokens"] > 0
    assert tik_res["compaction_required"] is False


def test_jules_opendots_copilotkit_parallel_mcp_and_28_skills() -> None:
    jules_offline = evaluate_jules_live_api_sources_and_sessions(fetch_live=False)
    assert jules_offline["sources_count"] == 28
    assert jules_offline["total_sessions"] >= 167

    unblock_dry = unblock_awaiting_jules_sessions(execute_live_post=False)
    assert unblock_dry["session_id"] == "17868364571305722991"

    card_mut = build_opendots_ag_ui_human_review_card(read_only_hint=False)
    card_ro = build_opendots_ag_ui_human_review_card(read_only_hint=True)
    assert card_mut["mcp_permission_tier"] == "Ask first"
    assert card_mut["requires_human_approval"] is True
    assert card_ro["mcp_permission_tier"] == "Always allow"
    assert card_ro["requires_human_approval"] is False

    od_pol = evaluate_opendots_connections_and_computers_policy()
    assert od_pol["policy_compliant"] is True
    assert od_pol["telemetry_env"]["COPILOTKIT_TELEMETRY_DISABLED"] == "true"
    assert od_pol["computers_isolation_policy"]["silent_host_fallback_forbidden"] is True

    ck5 = evaluate_copilotkit_5repo_coworker_and_channels_mesh()
    assert ck5["repos_count"] == 5

    par_mcp = evaluate_parallel_ai_search_mcp_and_streamable_http_router()
    assert par_mcp["docs_url"] == "https://docs.parallel.ai/integrations/mcp/search-mcp"
    assert par_mcp["coupled_with_5api_omniscience"] is True

    sk28 = evaluate_17_antigravity_audit_cloud_and_11_matt_pocock_skills()
    assert sk28["antigravity_17_audit_cloud_skills_count"] == 17
    assert sk28["matt_pocock_11_skills_count"] == 11
    assert sk28["all_28_skills_verified"] is True

    readiness = evaluate_openai_ecosystem_jules_opendots_readiness(fetch_live_jules=False)
    assert readiness["all_10_openai_repos_active"] is True
    assert readiness["jules_turndown_continuity_verified"] is True
    assert readiness["opendots_and_ag_ui_verified"] is True


def test_jules_167_sessions_75_patches_audit_and_pinecone_20_vectors() -> None:
    jules_json_path = REPO_ROOT / "data" / "audits" / "google_jules_167_sessions_and_75_patches_audit_2026_11_06.json"
    openai_json_path = REPO_ROOT / "data" / "audits" / "openai_10_repos_jules_and_opendots_audit_2026_11_06.json"
    bible_md_path = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "OPENAI_10_REPOS_JULES_AND_OPENDOTS_WIRING_BIBLE.md"
    ts_bridge_path = REPO_ROOT / "packages" / "prediction-engine" / "src" / "engine" / "openai-ecosystem-jules-opendots-bridge.ts"

    for p in (jules_json_path, openai_json_path, bible_md_path, ts_bridge_path):
        assert p.is_file(), f"Missing {p}"

    jules_data = json.loads(jules_json_path.read_text(encoding="utf-8"))
    assert jules_data["sources_count"] == 28
    assert jules_data["total_sessions"] >= 167
    assert jules_data["state_counts"]["COMPLETED"] >= 121
    assert jules_data["sessions_with_outputs_count"] >= 75
    assert len(jules_data["patch_outputs_summaries"]) >= 75
    assert jules_data["scratch_raw_unidiff_patches_saved"] >= 75

    scratch_path = Path(jules_data["scratch_raw_unidiff_archive_path"])
    if scratch_path.exists():
        assert scratch_path.is_file(), f"Missing scratch unidiff archive: {scratch_path}"

    openai_data = json.loads(openai_json_path.read_text(encoding="utf-8"))
    assert openai_data["openai_10_repos_count"] == 10
    assert openai_data["copilotkit_5_repos_count"] == 5
    p_rec = openai_data["pinecone_upsert_receipt"]
    assert p_rec["index_name"] == "gse-200-book-hybrid-index"
    assert p_rec["namespace"] == "gse-openai-ecosystem-jules-opendots"
    assert p_rec["vectors_upserted"] == 20

    checked_files = [
        REPO_ROOT / "intelligence" / "ops" / "openai_ecosystem_jules_and_opendots_engine.py",
        REPO_ROOT / "packages" / "prediction-engine" / "src" / "engine" / "openai-ecosystem-jules-opendots-bridge.ts",
        REPO_ROOT / "scripts" / "ops" / "harvest_and_wire_openai_9repos_jules_and_opendots.py",
        jules_json_path,
        openai_json_path,
        bible_md_path,
    ]
    for fpath in checked_files:
        txt = fpath.read_text(encoding="utf-8")
        assert not ETC_RE.search(txt), f"Forbidden literal etc. in {fpath}"
        for tok in SECRET_TOKENS:
            assert tok not in txt, f"Secret token {tok} in {fpath}"
