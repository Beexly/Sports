from __future__ import annotations

import json
import pathlib

from intelligence.routing.zero_waste_model_router import (
    TaskTier,
    get_cloud_credit_lanes_summary,
    route_zero_waste_task,
)
from scripts.eval.gse_livebench_harness import run_gse_livebench_harness
from scripts.ops.reconcile_1116_textbook_and_muse_audits import reconcile_all_muse_gaps

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]


def test_zero_waste_router_alibaba_deepinfra_posthog_and_stealth_skeleton() -> None:
    lanes = get_cloud_credit_lanes_summary()
    assert "alibaba_cloud_model_studio" in lanes
    assert "deepinfra_coach_brain" in lanes
    assert "posthog_zero_waste_governor" in lanes
    assert "stealth_skeleton_provider" in lanes
    assert lanes["posthog_zero_waste_governor"]["project_id"] == "516325"
    assert lanes["posthog_zero_waste_governor"]["traces_sample_rate"] == 0.1
    assert lanes["stealth_skeleton_provider"]["schema_version"] == "2.4"

    r_alibaba = route_zero_waste_task("opendots_code_gen", TaskTier.TIER_1D_ALIBABA_MODEL_STUDIO)
    assert r_alibaba["is_zero_cost"] is True
    assert "dashscope-intl.aliyuncs.com" in r_alibaba["endpoint"]

    r_deepinfra = route_zero_waste_task("coach_tendency_synthesis", TaskTier.TIER_1E_DEEPINFRA_COACH_BRAIN)
    assert r_deepinfra["is_zero_cost"] is True
    assert "api.deepinfra.com" in r_deepinfra["endpoint"]

    r_stealth = route_zero_waste_task("equation_trace_verify", TaskTier.TIER_1F_STEALTH_SKELETON_OPENROUTER)
    assert r_stealth["is_zero_cost"] is True
    assert "gse/stealth-skeleton-alpha" in r_stealth["endpoint"]


def test_gse_livebench_harness_19_rules_and_leaderboard() -> None:
    res = run_gse_livebench_harness()
    assert res["status"] == "VERIFIED_LIVE"
    assert res["doctrine_19_rule_gate"]["rules_passed"] == 19
    assert res["doctrine_19_rule_gate"]["cfb_constants_accepted"] is True
    assert res["doctrine_19_rule_gate"]["nfl_sigma_13_36_under_cfb_key_refused"] is True
    assert abs(res["forecastbench_reference"]["nfl_std_normal_crps_z0"] - 0.233694977) < 1e-8
    assert res["official_new_engine_verified_ledger"]["record"] == "62-23-1"
    assert len(res["evaluated_questions"]) == 4


def test_reconcile_1116_textbooks_and_all_muse_gaps() -> None:
    res = reconcile_all_muse_gaps()
    assert res["status"] == "ALL_GAPS_CLOSED_AND_VERIFIED"
    tb = res["textbook_1116_reconciliation"]
    assert tb["muse_open_textbook_items"] == 881
    assert tb["unique_google_drive_books_extracted"] == 197
    assert tb["quantitative_math_reference_books"] == 38
    assert tb["total_verified_books_and_textbooks"] == 1116
    assert tb["exact_1116_match"] is True
    assert res["openai_math_comparator_closure"]["total_yaml_pairs_reconciled"] == 208


def test_openrouter_v2_4_schema_artifact_present() -> None:
    schema_path = REPO_ROOT / "data" / "audits" / "openrouter_provider_monitor_schema_v2_4.json"
    assert schema_path.exists()
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    assert schema["openapi"] == "3.1.0"
    assert "ModelDocumentV2" in schema["components"]["schemas"]
