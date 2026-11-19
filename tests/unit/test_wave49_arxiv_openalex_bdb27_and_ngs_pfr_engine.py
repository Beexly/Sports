"""Wave 49 arXiv, OpenAlex, Kaggle BDB 2027 & Causal NGS/PFR AdvStats unit & OOS tests."""

from __future__ import annotations

import glob
import hashlib
import json
import re
from pathlib import Path
from typing import Any

import pytest

from gse_engine.compute.corpus_situational_integrator import (
    assert_all_books_pdfs_ig_x_situational_wired,
    compile_all_books_pdfs_ig_x_and_situational_priors,
)
from gse_engine.compute.wave32_unified_sports_situational_live_fusion import (
    evaluate_wave32_unified_sports_situational_live_fusion,
)
from gse_engine.governance.simulation_hold_gate import OperatorSimulationHoldError
from gse_engine.memory.knowledge_continuity_and_gsi_rlvr_flywheel import (
    compile_gse_to_gsi_rlvr_training_batch,
)
from gse_engine.multisport.wave40_universal_sports_metrics_encyclopedia_and_handicap_engine import (  # noqa: E501
    LIVE_STAKE_FRACTION,
    REAL_MONEY_STAKE_CLEARED,
)
from gse_engine.observability.walk_forward_ablation import (
    run_weeks1_to_10_walk_forward_ablation,
)
from gse_engine.science.wave49_arxiv_openalex_bdb27_kinematic_and_conformal_engine import (  # noqa: E501
    CLINICAL_RUO_W49_SPORTS_WEIGHT,
    WAVE49_SCIENCE_RLVR_TRAJECTORIES,
    evaluate_wave49_arxiv_openalex_bdb27_suite,
)
from gse_engine.tracking.wave49_ngs_pfr_advstats_and_bdb27_athletic_engine import (  # noqa: E501
    WAVE49_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w49_game_total_blitz_pressure_and_box_shift,
    evaluate_causal_w49_ngs_pfr_and_bdb27_features,
    evaluate_w49_martingale_and_shortcut_audit,
    evaluate_wave49_live_honest_ast_equations,
    evaluate_wave49_ngs_pfr_and_bdb27_suite,
    run_wave49_bdb27_and_ngs_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\bblo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + r"lo" + r"ck|lo" + r"cked|guarant" + r"eed)\b", re.IGNORECASE
)
_FORBIDDEN_HOME_RE = re.compile(r"Users[\\/]Garrett", re.IGNORECASE)


def _canonical_sha256(payload: dict[str, Any]) -> str:
    body = {k: v for k, v in payload.items() if k != "payload_sha256"}
    return hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def test_wave49_live_vaults_sha256_zero_overlap_and_ascii() -> None:
    """Verify live harvested arXiv, OpenAlex & Kaggle BDB27 vaults and license files."""
    arxiv_dir = REPO_ROOT / "data" / "arxiv_2026_11_alphaxiv"
    w49_arxiv_p = (
        arxiv_dir / "arxiv_wave49_tracking_bdb27_conformal_and_rlvr_vault_2026.json"
    )
    oa_p = (
        REPO_ROOT
        / "data"
        / "openalex_2026_11"
        / "openalex_wave49_sports_biomech_bdb27_and_calibration_vault_2026.json"
    )
    kg_p = (
        REPO_ROOT
        / "data"
        / "kaggle_bdb27"
        / "kaggle_bdb27_live_catalog_and_benchmarks_2026.json"
    )
    for vp in (w49_arxiv_p, oa_p, kg_p):
        assert vp.is_file()
        raw = vp.read_text(encoding="utf-8")
        assert all(ord(ch) <= 127 for ch in raw)
        assert not _FORBIDDEN_HOME_RE.search(raw)

    ax_data: dict[str, Any] = json.loads(w49_arxiv_p.read_text(encoding="utf-8"))
    assert ax_data["payload_sha256"] == _canonical_sha256(ax_data)
    assert int(ax_data["total_unique_papers"]) >= 30
    assert int(ax_data["cross_wave_overlap_count"]) == 0
    w49_ids = {str(p["id"]) for p in ax_data["papers"]}
    assert {"2610.36183", "2609.33664", "2607.00164"}.issubset(w49_ids)

    prior_ids: set[str] = set()
    for p_str in sorted(glob.glob(str(arxiv_dir / "*.json"))):
        p = Path(p_str)
        if p == w49_arxiv_p:
            continue
        prev = json.loads(p.read_text(encoding="utf-8"))
        for v in prev.values():
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, dict) and "id" in item:
                        prior_ids.add(re.sub(r"v\d+$", "", str(item["id"]).strip()))
    assert len(w49_ids & prior_ids) == 0

    oa_data: dict[str, Any] = json.loads(oa_p.read_text(encoding="utf-8"))
    assert oa_data["payload_sha256"] == _canonical_sha256(oa_data)
    assert int(oa_data["total_works"]) >= 45

    kg_data: dict[str, Any] = json.loads(kg_p.read_text(encoding="utf-8"))
    assert kg_data["payload_sha256"] == _canonical_sha256(kg_data)
    assert len(kg_data["compact_csv_artifacts"]) >= 4
    for csv_meta in kg_data["compact_csv_artifacts"]:
        assert (REPO_ROOT / str(csv_meta["repo_relative_path"])).is_file()

    for lic in (
        "arxiv_wave49_api_LICENSE.txt",
        "openalex_wave49_cc0_LICENSE.txt",
        "kaggle_bdb27_cc0_LICENSE.txt",
    ):
        assert (REPO_ROOT / ".licenses" / lic).is_file()


def test_wave49_science_kernels_bdb27_cqr_sinkhorn_rlvr_and_ruo() -> None:
    """Verify all 5 Wave 49 science kernels and hard RUO/stake isolation."""
    assert CLINICAL_RUO_W49_SPORTS_WEIGHT == 0.0
    assert REAL_MONEY_STAKE_CLEARED is False
    assert LIVE_STAKE_FRACTION == 0.0

    sci = evaluate_wave49_arxiv_openalex_bdb27_suite(REPO_ROOT)
    assert sci["all_science_gates_passed"] is True
    assert float(sci["clinical_ruo_w49_sports_weight"]) == 0.0
    assert sci["real_money_stake_cleared"] is False

    bdb = sci["bdb27_lodco_benchmark"]
    assert bdb["kinematic_beats_stopwatch"] is True
    assert float(bdb["kinematic_ridge_rmse"]) < float(bdb["stopwatch_only_rmse"])
    assert float(bdb["kinematic_ridge_pearson_r"]) > float(bdb["stopwatch_only_pearson_r"])

    cqr = sci["arxiv2610_cqr_motion_envelope"]
    assert cqr["coverage_cleared"] is True
    assert float(cqr["oos_2026_empirical_coverage"]) >= 0.85

    sink = sci["arxiv2609_sinkhorn_trench"]
    assert sink["doubly_stochastic_exact"] is True
    assert float(sink["max_marginal_l1_error"]) < 1e-9
    assert sink["entropy_reduction_positive"] is True

    rlvr = sci["arxiv2607_rlvr_brier_rewards"]
    assert rlvr["strict_properness_verified"] is True
    assert float(rlvr["brier_strict_proper_gap"]) > 0.05

    oa = sci["openalex_biomech_ruo"]
    assert oa["all_5_anchors_present"] is True
    assert oa["ruo_quarantine_enforced"] is True


def test_wave49_causal_tracking_aliases_martingale_ast_and_wiring(tmp_path: Path) -> None:
    """Verify causality, LA->LAR normalization, fallback, 500-draw martingale, AST & wiring."""
    w1 = evaluate_causal_w49_ngs_pfr_and_bdb27_features(as_of_week=1, repo_root=REPO_ROOT)
    w10 = evaluate_causal_w49_ngs_pfr_and_bdb27_features(as_of_week=10, repo_root=REPO_ROOT)
    assert int(w1["max_prior_week_used"]) == 0
    assert int(w10["max_prior_week_used"]) <= 9
    assert int(w1["normalized_team_count"]) == 32
    assert int(w10["normalized_team_count"]) == 32
    assert "LAR" in w10["teams"]

    s_la = evaluate_wave49_ngs_pfr_and_bdb27_suite(
        away_team="LA", home_team="SF", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    s_lar = evaluate_wave49_ngs_pfr_and_bdb27_suite(
        away_team="LAR", home_team="SF", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert float(s_la["w49_close_residual_signal"]) == float(s_lar["w49_close_residual_signal"])

    with pytest.raises(OperatorSimulationHoldError):
        evaluate_wave49_ngs_pfr_and_bdb27_suite(
            away_team="KC", home_team="DEN", as_of_week=11, is_indoor=False, repo_root=REPO_ROOT
        )

    fb_s = evaluate_wave49_ngs_pfr_and_bdb27_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=tmp_path
    )
    assert fb_s["wired"] is True
    fb_tot = evaluate_causal_w49_game_total_blitz_pressure_and_box_shift(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=tmp_path
    )
    assert float(fb_tot["total_shift_pts"]) == 0.0

    mart = evaluate_w49_martingale_and_shortcut_audit(REPO_ROOT)
    assert mart["beats_null_95pct"] is True
    assert float(mart["margin_empirical_p_value"]) <= 0.05
    assert mart["total_beats_null_99pct"] is True
    assert float(mart["total_empirical_p_value"]) <= 0.015
    assert float(mart["shortcut_max_output_perturbation"]) == 0.0
    assert mart["shortcut_invariance_verified"] is True

    ast = evaluate_wave49_live_honest_ast_equations()
    assert ast["zero_fabricated_bindings"] is True
    assert int(ast["parsed_evaluated_count"]) == 8

    quar = s_lar["quarantined_metrics_weights"]
    assert len(quar) == 5
    assert all(float(v) == 0.0 for v in quar.values())
    probe = evaluate_wave49_ngs_pfr_and_bdb27_suite(
        away_team="LAR",
        home_team="SF",
        as_of_week=10,
        is_indoor=False,
        repo_root=REPO_ROOT,
        shortcut_probe={k: 123.45 for k in quar},
    )
    assert float(probe["w49_close_residual_signal"]) == float(s_lar["w49_close_residual_signal"])

    w32 = evaluate_wave32_unified_sports_situational_live_fusion(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert w32["wave49_arxiv_openalex_bdb27_and_ngs_pfr_matchups"]["wired"] is True

    priors = compile_all_books_pdfs_ig_x_and_situational_priors(
        "KC",
        "DEN",
        10,
        {},
        None,
        None,
        {"KC": {}, "DEN": {}},
        {},
        {},
        {},
        {},
        {},
        {},
        {"wind_mph": 5.0, "is_indoor": False},
    )
    verif = assert_all_books_pdfs_ig_x_situational_wired(priors)
    assert verif["wave49_arxiv_openalex_bdb27_and_ngs_pfr_wired"] is True


def test_wave49_oos_ablation_beats_w48_rlvr_424_and_hygiene() -> None:
    """Verify OOS monotone improvements over Wave 48, 400+24=424 RLVR & strict hygiene."""
    abl = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = abl["metrics"]
    r26 = abl["wave26_rliable_and_ratchet"]
    floors = r26["wave19_21_floors"]

    assert int(abl["completed_games_evaluated"]) == 147
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0051
    assert float(m["raw_gse_v41_margin_crps"]) < 6.9069
    assert float(m["gse_v41_margin_mae"]) < 9.6415
    assert float(m["gse_v41_total_mae"]) < 10.2730
    assert float(m["gse_v41_brier"]) <= 0.21915
    assert float(m["overall_ece"]) <= 0.07017
    assert float(r26["rliable_iqm"]) > 0.733604
    assert floors["all_floors_held"] is True

    bench49 = run_wave49_bdb27_and_ngs_benchmark(REPO_ROOT, write_artifact=False)
    assert len(str(bench49["benchmark_sha256"])) == 64

    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT, min_target_records=400)
    assert int(rlvr["records_compiled"]) >= 400
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for feed in (
        REPO_ROOT / "data" / "llm" / "gse_gsi_rlvr_220_curriculum_2026.jsonl",
        REPO_ROOT / "brain" / "feeds" / "2026-11-16" / "gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",  # noqa: E501
        REPO_ROOT / "brain" / "feeds" / "2026-11-17" / "gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [ln for ln in feed.read_text(encoding="utf-8").splitlines() if ln.strip()]
        assert len(lines) >= 400

    standalone_p = (
        REPO_ROOT / "brain" / "feeds" / "2026-11-17" / "aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"  # noqa: E501
    )
    standalone_n = sum(1 for ln in standalone_p.read_text(encoding="utf-8").splitlines() if ln.strip())  # noqa: E501
    assert int(rlvr["records_compiled"]) + standalone_n >= 424

    for rec in (*WAVE49_SCIENCE_RLVR_TRAJECTORIES, *WAVE49_TRACKING_RLVR_TRAJECTORIES):
        blob = f"{rec['record_id']} {rec['domain']} {rec['prompt']} {rec['think']}"
        assert not _FORBIDDEN_B_TOKEN_RE.search(blob)
        assert not _FORBIDDEN_CERT_RE.search(blob)

    files_to_scan = [
        REPO_ROOT / "scripts" / "ops" / "harvest_wave49_arxiv_openalex_kaggle_bdb27.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave49_arxiv_openalex_bdb27_kinematic_and_conformal_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave49_ngs_pfr_advstats_and_bdb27_athletic_engine.py",
        REPO_ROOT
        / "brain"
        / "agent-bus"
        / "2026-11-19_wave49_arxiv_openalex_kaggle_bdb27_and_ngs_pfr_engine.json",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-19"
        / "wave49-arxiv-openalex-kaggle-bdb27-and-ngs-pfr-causal-engine.md",
    ]
    for fp in files_to_scan:
        assert fp.is_file()
        txt = fp.read_text(encoding="utf-8")
        assert all(ord(ch) <= 127 for ch in txt), f"Non-ASCII in {fp}"
        assert not _FORBIDDEN_B_TOKEN_RE.search(txt), f"Forbidden b-token in {fp}"
        assert not _FORBIDDEN_CERT_RE.search(txt), f"Forbidden cert token in {fp}"
        assert not _FORBIDDEN_HOME_RE.search(txt), f"Forbidden local path in {fp}"
