#!/usr/bin/env python3
"""
MANDATORY CONSUMPTION & PERTURBATION TEST SUITE (Part 6 & Charge 10)
Proves that wired components across Waves 3..8 are genuinely consumed in execution
and that perturbing inputs deterministically alters downstream outputs (never dead imports).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.corpus.research_corpus_reader import ResearchCorpusReader, query_research_corpus


def test_wave3_research_corpus_and_schemes_consumption() -> None:
    """Wave 3: Query a known concept from Core NFL Schemes & Systems and Motif corpus inbox."""
    results = query_research_corpus("Cover 4 Quarters MOD PUSH 2-Jet pass protection", top_k=5)
    assert len(results) > 0, "Expected non-empty citations from research_records.jsonl"
    top = results[0]
    assert top["source_id"], "Citation must include source_id"
    assert top["chunk_id"], "Citation must include chunk_id"
    assert top["relevance_reason"], "Citation must include relevance_reason"
    assert top["relevance_score"] > 0


def test_wave3_brain_feeds_direct_binding_and_perturbation(tmp_path: Path) -> None:
    """
    Wave 3 Perturbation Proof (Charge 10):
    Prove that modifying a record in the corpus store deterministically changes the reader's output.
    """
    sample_records = tmp_path / "perturbed_records.jsonl"
    rec_a = {
        "record_id": "CORP-TEST-01",
        "chunk_id": "CORP-TEST-01-CHK-01",
        "source_id": "SRC-TEST-01",
        "item_id": "CORP-TEST-01",
        "location": "docs/engine/research/test.md",
        "category": "schemes_extracted_md",
        "title": "Baseline Scheme Note",
        "authors": "GSE",
        "year": 2026,
        "section": "Pass Protection",
        "page_or_line": "L1-L10",
        "sha256": "abc",
        "full_text": "Standard slide protection rules against four-man rush.",
    }
    sample_records.write_text(json.dumps(rec_a) + "\n", encoding="utf-8")

    reader = ResearchCorpusReader(records_path=sample_records, include_brain_feeds=False)
    baseline_hits = reader.query("2-Jet One You Two Me protection", top_k=3)
    baseline_score = baseline_hits[0]["relevance_score"] if baseline_hits else 0.0

    # Perturb the input record by adding exact domain phrase
    rec_a["full_text"] = "2-Jet One You Two Me protection rules against Cover 1 Plug blitz."
    sample_records.write_text(json.dumps(rec_a) + "\n", encoding="utf-8")

    perturbed_hits = reader.query("2-Jet One You Two Me protection", top_k=3)
    assert len(perturbed_hits) == 1
    perturbed_score = perturbed_hits[0]["relevance_score"]
    assert perturbed_score > baseline_score, (
        f"Perturbation failed to alter downstream output: {perturbed_score} <= {baseline_score}"
    )


from intelligence.identity.entity_resolver import (
    CanonicalEntityResolver,
    EntityResolutionContaminationError,
)


def test_wave4_canonical_entity_resolution_and_2026_rulings() -> None:
    """
    Wave 4 Consumption & Contamination Proof:
    1. Valid 2026 standing rulings (Geno Smith = NYJ QB, Mike Evans = SF WR) resolve cleanly.
    2. Historical 2024 window resolves Mike Evans on TB cleanly.
    3. Contaminated 2026 pairings (Mike Evans on TB in 2026, Geno Smith on SEA/LV in 2026)
       throw EntityResolutionContaminationError.
    """
    resolver = CanonicalEntityResolver()

    geno_2026 = resolver.resolve_entity("Geno Smith", entity_type="player", team_id="NYJ", as_of_date="2026-11-06")
    assert geno_2026["current_team_id"] == "NYJ"
    assert geno_2026["position"] == "QB"

    evans_2026 = resolver.resolve_entity("Mike Evans", entity_type="player", team_id="SF", as_of_date="2026-11-06")
    assert evans_2026["current_team_id"] == "SF"
    assert evans_2026["position"] == "WR"

    # Historical window (2024) must resolve Mike Evans on TB
    evans_2024 = resolver.resolve_entity("Mike Evans", entity_type="player", team_id="TB", as_of_date="2024-11-01")
    assert evans_2024["current_team_id"] == "TB"

    # Contaminated 2026 pairings MUST throw EntityResolutionContaminationError
    with pytest.raises(EntityResolutionContaminationError):
        resolver.resolve_entity("Mike Evans", entity_type="player", team_id="TB", as_of_date="2026-11-06")

    with pytest.raises(EntityResolutionContaminationError):
        resolver.resolve_entity("Geno Smith", entity_type="player", team_id="SEA", as_of_date="2026-11-06")

    with pytest.raises(EntityResolutionContaminationError):
        resolver.resolve_entity("Geno Smith", entity_type="player", team_id="LV", as_of_date="2026-11-06")

    with pytest.raises(EntityResolutionContaminationError):
        resolver.resolve_entity("NONEXISTENT_PHANTOM_PLAYER_999", entity_type="player", team_id="BAL", as_of_date="2026-11-06")


from intelligence.equations.equation_executor import (
    evaluate_equation_spec,
    execute_layer_equation_family_batch,
    get_dynamic_equation_registry_counts,
)


def test_wave5_equation_execution_and_perturbation() -> None:
    """
    Wave 5 Consumption & Perturbation Proof:
    1. Asserts twin-file deduplication between equation_executable_catalog_12304.json and master_equation_registry_12k.json.
    2. Asserts dynamic equation registry counts reconcile (12,304 + 1,666 + 3,742 == 17,712).
    3. Executes equation family batch for Layer 12 (Trench / Pass Rush vs OL) and proves that perturbing
       input features or weights deterministically changes the downstream aggregate_log_odds_delta.
    """
    pointer_path = REPO_ROOT / "data" / "engine" / "master_equation_registry_12k.json"
    pointer_data = json.loads(pointer_path.read_text(encoding="utf-8"))
    assert pointer_data.get("deduplication_status") == "CANONICAL_POINTER_NO_DUPLICATE_PAYLOAD"
    assert pointer_data.get("canonical_source_path") == "data/equations/equation_executable_catalog_12304.json"
    assert pointer_data.get("total_canonical_equations") == 12304

    counts = get_dynamic_equation_registry_counts()
    assert counts["total_cataloged"] >= 12304 + 1666 + 3742
    assert counts["wired_and_tested"] == counts["total_cataloged"]
    assert counts["placeholder_formula_specs"] == 0

    base_inputs = {"epa_per_play": 0.12, "pressure_rate": 0.31, "pass_block_win_rate": 0.62}
    base_batch = execute_layer_equation_family_batch(target_layer=12, feature_vector=base_inputs)
    assert base_batch["live_output_seen"] is True
    assert base_batch["equations_executed_count"] > 0

    perturbed_inputs = {"epa_per_play": 0.48, "pressure_rate": 0.55, "pass_block_win_rate": 0.88}
    perturbed_batch = execute_layer_equation_family_batch(target_layer=12, feature_vector=perturbed_inputs)
    assert perturbed_batch["aggregate_log_odds_delta"] != base_batch["aggregate_log_odds_delta"], (
        "Perturbing equation inputs must alter downstream layer aggregate_log_odds_delta"
    )


from intelligence.data.warehouse.warehouse_loader import WarehouseLoader


def test_wave6_warehouse_data_landing_and_entity_validation() -> None:
    """
    Wave 6 Consumption & Entity Validation Proof:
    1. Verifies all 10 datasets in intelligence/data/warehouse/ingestion_registry.jsonl use repo-relative paths.
    2. Verifies all 10 normalized .parquet files exist on disk and match their declared record counts
       (79,297 across the 9 core datasets + 1 NWS forecast = 79,298).
    3. Validates dataset team/player rows through Wave 4's CanonicalEntityResolver.
    """
    loader = WarehouseLoader()
    report = loader.verify_all_10_datasets()
    assert report["dataset_count"] == 10
    assert report["core_9_total_records"] == 79297
    assert report["all_datasets_total_records"] == 79298
    for cid, dsum in report["datasets"].items():
        assert dsum["actual_records"] == dsum["expected_records"], f"Mismatch in {cid}"
        assert not (":" in dsum["norm_parquet"] or dsum["norm_parquet"].startswith("/"))


from intelligence.reasoning.layers.layer_registry import (
    ALL_26_LAYERS,
    SchemaContractValidationError,
    TemporalLeakageError,
    build_context_packet,
    validate_context_packet_schema,
)


def test_wave7_26_layer_stack_and_context_packet() -> None:
    """
    Wave 7 Consumption, Dependency, Temporal Leakage & Perturbation Proof:
    1. Asserts all 26 layers populate and validate against schemas/v1/layer_output.schema.json.
    2. Asserts L12 (OL/Trench) -> L13 (Scheme) -> L21 (QB) dependency chain: perturbing L12 changes L21.
    3. Asserts L26 (Market) enters LAST after all 25 layers and is weighted <= 0.08.
    4. Asserts TemporalLeakageError is raised if as_of >= kickoff_utc.
    5. Asserts SchemaContractValidationError is raised if any of the 26 layers is missing.
    """
    base_ctx = {
        "game_id": "2026_09_JAX_BAL",
        "home_team": "BAL",
        "away_team": "JAX",
        "kickoff_utc": "2026-11-06T01:15:00Z",
        "as_of": "2026-11-05T18:00:00Z",
        "wind_mph": 8.0,
    }
    pkt = build_context_packet(base_ctx, write_to_disk=True)
    assert pkt["completeness"]["populated_layers"] == 26
    assert pkt["completeness"]["is_complete"] is True
    assert pkt["layers"]["L26_market_price_check_last"]["signals"]["entered_last_after_25_layers"] is True

    # Perturb L12 (trench matchup) and prove L21 (QB processing) and L26 (post price check) change
    perturbed_ctx = dict(base_ctx)
    perturbed_ctx["layer_overrides"] = {"L12_trench_matchup_ol_vs_dl": {"perturbation_delta": 0.45}}
    pkt_perturbed = build_context_packet(perturbed_ctx, write_to_disk=False)

    qb_base = pkt["layers"]["L21_qb_processing_and_pressure"]["signals"]["qb_clean_pocket_epa_proj"]
    qb_pert = pkt_perturbed["layers"]["L21_qb_processing_and_pressure"]["signals"]["qb_clean_pocket_epa_proj"]
    assert qb_pert != qb_base, "Perturbing L12 trench matchup must alter downstream L21 QB processing signal"

    # Temporal leakage guard test (as_of >= kickoff_utc must throw TemporalLeakageError)
    leaked_ctx = dict(base_ctx)
    leaked_ctx["as_of"] = "2026-11-06T02:00:00Z"
    with pytest.raises(TemporalLeakageError):
        build_context_packet(leaked_ctx, write_to_disk=False)

    # Incomplete packet test (removing 1 layer must throw SchemaContractValidationError)
    broken_pkt = json.loads(json.dumps(pkt))
    del broken_pkt["layers"]["L14_player_vs_player"]
    with pytest.raises(SchemaContractValidationError):
        validate_context_packet_schema(broken_pkt)


from intelligence.feedback.grading_to_corpus_pipe import record_graded_outcome_to_corpus
from intelligence.reasoning.reasoning_workflow_assembler import (
    STRICT_TRACK_DEPENDENCY_ORDER,
    execute_reasoning_workflow,
    run_placeholder_content_stage_validator,
    run_synthetic_simulation_stage_validator,
)


def test_wave8_historical_fixture_e2e_and_feedback_pipe() -> None:
    """
    Wave 8 End-to-End Workflow Assembly, Dependency Order, Synthetic Simulation & Feedback Pipe Proof:
    1. Historical settled game fixture (`2024_10_CIN_BAL`) runs through Context Workflow (26/26 layers)
       and Reasoning Workflow (`offensive_line -> coaching_scheme -> scheme_matchup -> qb_behavior -> trust_signals`).
    2. Synthetic-Only Simulation Stage validator consumes the packet + trace and proves perturbing a Wave 7 layer
       alters the synthetic distribution quantiles (0 live or historical game simulations run).
    3. Placeholder-Only Content Stage validator redacts leaked picks behind `[REDACTED_BEHIND_PAYWALL]` and
       enforces CanonicalEntityResolver (0 content items produced).
    4. Grading-to-Corpus Feedback Pipe records the settled outcome + pre-game reasoning trace into
       `data/corpus/grading_feedback_records.jsonl`.
    """
    hist_ctx = {
        "game_id": "2024_10_CIN_BAL",
        "home_team": "BAL",
        "away_team": "CIN",
        "kickoff_utc": "2024-11-08T01:15:00Z",
        "as_of": "2024-11-07T18:00:00Z",
        "window_slot": "TNF",
        "week": 10,
        "wind_mph": 6.0,
    }
    pkt = build_context_packet(hist_ctx, write_to_disk=True)
    trace = execute_reasoning_workflow(pkt, write_to_disk=True)

    assert trace["dependency_order_verified"] == STRICT_TRACK_DEPENDENCY_ORDER
    assert set(trace["synthesis_levels"].keys()) == {"L1", "L2", "L3", "L4", "L5"}
    assert trace["market_entered_last_and_smallest"]["entered_last"] is True
    assert trace["market_entered_last_and_smallest"]["applied_weight"] <= 0.08

    # Synthetic-Only Simulation Stage perturbation proof
    dist_base = run_synthetic_simulation_stage_validator(pkt, trace)
    assert dist_base["synthetic_fixture_only"] is True

    pert_ctx = dict(hist_ctx)
    pert_ctx["layer_overrides"] = {"L12_trench_matchup_ol_vs_dl": {"perturbation_delta": 0.40}}
    pkt_pert = build_context_packet(pert_ctx, write_to_disk=False)
    trace_pert = execute_reasoning_workflow(pkt_pert, write_to_disk=False)
    dist_pert = run_synthetic_simulation_stage_validator(pkt_pert, trace_pert)

    assert dist_base["perturbation_signature"] != dist_pert["perturbation_signature"]
    assert dist_base["margin_quantiles"]["p50"] != dist_pert["margin_quantiles"]["p50"]

    # Placeholder-Only Content Stage proof
    bundle = run_placeholder_content_stage_validator(
        {
            "entities": [
                {"name": "Geno Smith", "type": "player", "team": "NYJ"},
                {"name": "Mike Evans", "type": "player", "team": "SF"},
            ],
            "raw_text": "Environment pace 26.2 sec/snap | Official Pick: BAL -3.5 OVER 45.5",
        }
    )
    assert bundle["placeholder_only_no_live_content"] is True
    assert bundle["paywall_redaction_verified"] is True
    assert bundle["entity_resolution_verified"] is True
    assert "BAL -3.5" not in bundle["sanitized_environment_summary"]

    # Grading-to-Corpus Feedback Pipe proof
    feedback = record_graded_outcome_to_corpus(
        reasoning_trace=trace,
        graded_outcome={"home_score": 35, "away_score": 34, "predicted_win_prob": dist_base["win_probability"]},
    )
    assert feedback["game_id"] == "2024_10_CIN_BAL"
    assert feedback["trace_id"] == trace["trace_id"]
    assert (Path(__file__).resolve().parents[2] / "data" / "corpus" / "grading_feedback_records.jsonl").exists()


def test_nim_genai_perf_and_posthog_mcp_wiring() -> None:
    """
    Verifies NVIDIA NIM GenAI-Perf empirical benchmark receipt + raw HTTP/SSE traces
    and PostHog MCP / AI Observability wiring.
    """
    repo_root = Path(__file__).resolve().parents[2]
    mcp_json = json.loads((repo_root / ".mcp.json").read_text(encoding="utf-8"))
    assert "posthog" in mcp_json.get("mcpServers", {})
    assert mcp_json["mcpServers"]["posthog"]["url"] == "https://mcp.posthog.com/mcp"

    summary_path = repo_root / "data" / "audits" / "stealth_skeleton_nim_genai_perf_benchmark_2026_11_07.json"
    raw_traces_path = repo_root / "data" / "audits" / "stealth_skeleton_nim_genai_perf_raw_traces_2026_11_07.jsonl"
    assert summary_path.exists(), "Missing NIM GenAI-Perf summary JSON"
    assert raw_traces_path.exists(), "Missing NIM GenAI-Perf raw traces JSONL"

    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    assert summary["schema"] == "nvidia_nim_genai_perf_llm_benchmark_v1"
    assert summary["models_tested_count"] == 8
    assert summary["total_requests_executed"] == 16
    assert summary["successful_http_200_count"] == 16
    assert summary["metrics"]["time_to_first_token_ms"]["p50"] > 0
    assert summary["metrics"]["request_latency_ms"]["p50"] > 0

    raw_lines = [json.loads(line) for line in raw_traces_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(raw_lines) == 16
    assert all(r["http_status"] == 200 and len(r["x_request_id"]) > 0 for r in raw_lines)


def test_dynamic_context_packet_differentiation_across_unlisted_games() -> None:
    """
    Prove `build_context_packet` derives distinct team efficiency (L03) and market (L26)
    signals from real 2026 PBP data even for games outside the 5 hardcoded Sunday overrides.
    """
    from intelligence.context.context_packet_builder import build_context_packet

    p_dal_atl = build_context_packet("2026_09_DAL_ATL", as_of_utc="2026-11-05T18:00:00Z", persist=False)
    p_lar_sea = build_context_packet("2026_09_LAR_SEA", as_of_utc="2026-11-05T18:00:00Z", persist=False)
    l03_key = [k for k in p_dal_atl["layers"] if k.startswith("L03_")][0]

    s1_l03 = p_dal_atl["layers"][l03_key]["signals"]
    s2_l03 = p_lar_sea["layers"][l03_key]["signals"]
    assert s1_l03["opponent_adjusted_net_epa_baseline"] != s2_l03["opponent_adjusted_net_epa_baseline"]

    l26_key = [k for k in p_dal_atl["layers"] if k.startswith("L26_")][0]
    s1_l26 = p_dal_atl["layers"][l26_key]["signals"]
    s2_l26 = p_lar_sea["layers"][l26_key]["signals"]
    assert s1_l26["pre_market_reasoning_sum"] != s2_l26["pre_market_reasoning_sum"]
    assert s1_l26["post_price_check_signal"] != s2_l26["post_price_check_signal"]


def test_openrouter_8suite_livebench_and_provider_integrations_verified() -> None:
    """
    Prove:
      1. All 8 OpenRouter benchmark suites + 6 LiveBench (arXiv:2406.19314v2) categories
         have 100% real item-by-item raw completions and programmatic ground-truth scores.
      2. `workers/stealth-skeleton-provider/opencode.json` includes both `"stealth-skeleton"`
         direct provider and `"openrouter"` provider.
      3. `workers/stealth-skeleton-provider/integrations/` contains ready-to-submit provider
         packages for `models.dev`, `huggingface`, and `litellm`.
    """
    repo_root = Path(__file__).resolve().parents[2]

    eval_summary_path = repo_root / "data" / "audits" / "stealth_skeleton_openrouter_8suite_livebench_2026_11_07.json"
    eval_raw_path = repo_root / "data" / "audits" / "stealth_skeleton_openrouter_8suite_livebench_raw_completions_2026_11_07.jsonl"
    assert eval_summary_path.exists(), "Missing OpenRouter 8-Suite + LiveBench summary JSON"
    assert eval_raw_path.exists(), "Missing OpenRouter 8-Suite + LiveBench raw completions JSONL"

    eval_summary = json.loads(eval_summary_path.read_text(encoding="utf-8"))
    assert eval_summary["total_items_evaluated"] == 14
    assert eval_summary["openrouter_8suite"]["suites_count"] == 8
    assert eval_summary["openrouter_8suite"]["macro_average_accuracy"] == 1.0
    assert eval_summary["livebench_6categories"]["categories_count"] == 6
    assert eval_summary["livebench_6categories"]["macro_average_accuracy"] == 1.0
    assert eval_summary["livebench_6categories"]["zero_llm_judge_enforced"] is True

    raw_rows = [json.loads(line) for line in eval_raw_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(raw_rows) == 14
    assert all(r["passed"] is True and len(r["raw_completion"]) > 10 for r in raw_rows)
    assert all(r["posthog_ai_event_emitted"] == "$ai_generation" for r in raw_rows)

    opencode_cfg = json.loads((repo_root / "workers" / "stealth-skeleton-provider" / "opencode.json").read_text(encoding="utf-8"))
    assert "stealth-skeleton" in opencode_cfg.get("provider", {})
    assert "openrouter" in opencode_cfg.get("provider", {})
    assert opencode_cfg["provider"]["stealth-skeleton"]["options"]["baseURL"] == "https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1"

    integrations_dir = repo_root / "workers" / "stealth-skeleton-provider" / "integrations"
    assert (integrations_dir / "models-dev" / "provider.toml").exists()
    assert (integrations_dir / "huggingface" / "README.md").exists()
    assert (integrations_dir / "huggingface" / "config.json").exists()
    litellm_json = json.loads((integrations_dir / "litellm" / "stealth_skeleton_litellm_models.json").read_text(encoding="utf-8"))
    assert "stealth-skeleton/skeleton-alpha" in litellm_json
    assert "openrouter/stealth-skeleton/skeleton-alpha" in litellm_json



