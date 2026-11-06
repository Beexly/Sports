from __future__ import annotations

import hashlib
import json
import pathlib

from intelligence.routing.zero_waste_model_router import (
    TaskTier,
    get_cloud_credit_lanes_summary,
    route_zero_waste_task,
)
from scripts.eval.gse_livebench_harness import verify_frozen_bank
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


def test_frozen_intelligence_scale_bank_and_leaderboard() -> None:
    manifest, bank = verify_frozen_bank()
    assert manifest["frozen_before_first_run"] is True
    assert manifest["total_questions"] == 486
    assert manifest["forecasting_questions_n"] == 436
    assert manifest["forecasting_wins"] == 232
    assert manifest["forecasting_losses"] == 204
    assert manifest["published_cohort_n"] == 83
    assert manifest["published_cohort_wins"] == 54
    assert manifest["published_cohort_losses"] == 29
    assert manifest["general_reasoning_questions_n"] == 50
    assert manifest["hand_typed_probabilities_count"] == 0
    assert manifest["all_timestamps_strictly_pre_event"] is True

    # Verify harness SHA-256 matches the freeze manifest (harness never edited after results seen)
    harness_path = REPO_ROOT / "scripts" / "eval" / "gse_livebench_harness.py"
    assert hashlib.sha256(harness_path.read_bytes()).hexdigest() == manifest["harness_sha256"]

    lb_path = REPO_ROOT / "data" / "audits" / "gse_livebench_question_bank_and_leaderboard_2026_11_06.json"
    lb = json.loads(lb_path.read_text(encoding="utf-8"))
    assert lb["freeze_verification"]["sha256_match"] is True
    assert lb["general_reasoning_evaluation"]["verified_correct"] == 50
    assert lb["general_reasoning_evaluation"]["total_questions"] == 50
    assert lb["cohort_breakdowns"]["all_436_pre_gate_candidates_live_brain_calibrated"]["brier_score"] < (
        lb["cohort_breakdowns"]["all_436_pre_gate_candidates_market_devig"]["brier_score"]
    )
    assert lb["cohort_breakdowns"]["published_83_official_card_live_brain_calibrated"]["brier_score"] < (
        lb["cohort_breakdowns"]["published_83_official_card_market_devig"]["brier_score"]
    )


def test_job2_intelligence_foundations_artifact() -> None:
    found_path = REPO_ROOT / "data" / "audits" / "stealth_skeleton_intelligence_foundations_2026_11_06.json"
    assert found_path.exists()
    found = json.loads(found_path.read_text(encoding="utf-8"))
    assert len(found["job_2_arxiv_papers"]) == 10
    assert len(found["job_2_kaggle_and_openalex_datasets"]) == 6
    assert len(found["job_2_graduate_monographs"]) == 10
    assert len(found["honest_gap_audit"]) == 4


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
