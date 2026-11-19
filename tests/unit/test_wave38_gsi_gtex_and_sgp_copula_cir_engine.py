"""Wave 38 unit tests: GSI GTEx v10 + Schrodinger OT & GSE Pre-Snap, Copula, CIR & EB-LCB."""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

import pytest
from scripts.ops.gse_coach_mind_simulator import (
    compute_pre_projection_universal_and_deep_non_stationary_priors,
)

from gse_engine.compute.corpus_situational_integrator import (
    assert_all_books_pdfs_ig_x_situational_wired,
    compile_all_books_pdfs_ig_x_and_situational_priors,
)
from gse_engine.governance.simulation_hold_gate import OperatorSimulationHoldError
from gse_engine.memory.knowledge_continuity_and_gsi_rlvr_flywheel import (
    _FORBIDDEN_ODDS_RE,
    compile_gse_to_gsi_rlvr_training_batch,
)
from gse_engine.multisport.daily_multisport_slate_engine import (
    run_all_sports_unified_situational_simulation_suite,
)
from gse_engine.observability.walk_forward_ablation import (
    run_weeks1_to_10_walk_forward_ablation,
)
from gse_engine.science import (
    CLINICAL_RUO_GTEX_SPORTS_WEIGHT,
    WAVE38_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_gtex_v10_tissue_transcriptomic_partition,
    evaluate_gsi_schrodinger_bridge_cellular_recovery,
    evaluate_wave38_gsi_gtex_and_schrodinger_suite,
)
from gse_engine.tracking import (
    WAVE38_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w38_heavy_box_clutch_and_front_continuity,
    evaluate_presnap_run_concept_and_coverage_shell_matrix,
    evaluate_student_t_sgp_copula_and_cir_promotion_gate,
    evaluate_wave38_live_honest_ast_equations,
    evaluate_wave38_presnap_sgp_copula_and_cir_suite,
    run_wave38_gsi_gtex_and_sgp_copula_cir_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_gsi_gtex_v10_selectivity_and_schrodinger_bridge(tmp_path: Path) -> None:
    """Verify GTEx v10 54-tissue selectivity, ADR-0003 RUO isolation & Sinkhorn convergence."""
    gtex = evaluate_gsi_gtex_v10_tissue_transcriptomic_partition(REPO_ROOT)
    assert gtex["clean_checkout_fallback"] is False
    assert gtex["adr0003_rule_in_only_doctrine"] is True
    assert float(gtex["clinical_ruo_sports_weight"]) == 0.0
    assert CLINICAL_RUO_GTEX_SPORTS_WEIGHT == 0.0
    assert int(gtex["tissues_count"]) == 54
    assert int(gtex["genes_count"]) == 7
    assert int(gtex["records_count"]) == 378
    assert float(gtex["actn3_skeletal_to_cardiac_ratio"]) >= 2000.0
    assert float(gtex["tnni3_cardiac_to_skeletal_ratio"]) >= 900.0
    assert float(gtex["mapt_brain_to_fibroblast_ratio"]) >= 350.0

    gtex_fb = evaluate_gsi_gtex_v10_tissue_transcriptomic_partition(tmp_path)
    assert gtex_fb["clean_checkout_fallback"] is True
    assert int(gtex_fb["records_count"]) == 0
    assert float(gtex_fb["clinical_ruo_sports_weight"]) == 0.0

    sb = evaluate_gsi_schrodinger_bridge_cellular_recovery(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    assert len(sb["states"]) == 5
    for side in ("away", "home"):
        assert float(sb[side]["sinkhorn_l1_marginal_error"]) < 1e-6
        assert 0.93 <= float(sb[side]["fast_twitch_power_retention_mult"]) <= 1.04
        assert 0.93 <= float(sb[side]["mitochondrial_q4_stamina_mult"]) <= 1.04


def test_gse_presnap_matrix_front_continuity_copula_cir_and_ast() -> None:
    """Verify BDB25+91k participation matrix, causal signals, t4 SGP copula, CIR & ASTs."""
    mx = evaluate_presnap_run_concept_and_coverage_shell_matrix(REPO_ROOT)
    assert mx["clean_checkout_fallback"] is False
    assert int(mx["bdb25_plays_count"]) >= 16000
    assert int(mx["participation_2024_count"]) >= 45000
    assert int(mx["participation_2025_count"]) >= 45000
    assert int(mx["participation_combined_count"]) >= 90000
    assert int(mx["players_master_count"]) >= 24000
    assert float(mx["coverage_shell_epa"]["Cover-1"]) > float(mx["coverage_shell_epa"]["Quarters"])

    causal = evaluate_causal_w38_heavy_box_clutch_and_front_continuity(
        as_of_week=10, repo_root=REPO_ROOT
    )
    assert causal["clean_checkout_fallback"] is False
    assert int(causal["max_week_loaded"]) == 10
    quar = causal["quarantined_close_overpriced_signals"]
    assert len(quar) == 4
    assert all(float(v) == 0.0 for v in quar.values())
    for tm in ("KC", "DEN", "CIN", "BUF", "WSH"):
        assert tm in causal["teams"]
        assert 0.0 <= float(causal["teams"][tm]["def_front5_continuity_jaccard"]) <= 1.0

    cc = evaluate_student_t_sgp_copula_and_cir_promotion_gate(REPO_ROOT)
    assert cc["clean_checkout_fallback"] is False
    assert int(cc["total_copula_pairs_evaluated"]) >= 5000
    assert cc["all_3_archetypes_beat_independence_brier"] is True
    assert float(cc["archetypes"]["wr_rec_yds_and_receptions"]["student_t4_upper_tail_lambda_u"]) > 0.45  # noqa: E501
    assert float(cc["archetypes"]["qb_pass_and_rb_rush_yds_neg_script"]["kendall_tau"]) < 0.0
    assert cc["cir_time_holdout"]["improves_brier_and_bias"] is True
    assert cc["promotion_gates"]["identity_fixed_point"]["eligible"] is False
    assert cc["promotion_gates"]["unregularized_cir_gate"]["eligible"] is False
    assert cc["promotion_gates"]["oracle_sanity_gate"]["eligible"] is True

    ast38 = evaluate_wave38_live_honest_ast_equations()
    assert int(ast38["parsed_evaluated_count"]) == 6
    assert ast38["zero_fabricated_bindings"] is True
    for eq in ast38["equations_evaluated"]:
        assert eq["status"] == "PARSED_EVALUATED"


def test_wave38_cwd_invariance_warm_sla_spine_wiring_and_wk11_hold(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify CWD independence, <0.05s warm SLA, Stage-2/3 wiring & Week 11 hold."""
    monkeypatch.chdir(tmp_path)
    _ = evaluate_wave38_gsi_gtex_and_schrodinger_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    _ = evaluate_wave38_presnap_sgp_copula_and_cir_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )

    t0 = time.perf_counter()
    g_w = evaluate_wave38_gsi_gtex_and_schrodinger_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    m_w = evaluate_wave38_presnap_sgp_copula_and_cir_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    assert (time.perf_counter() - t0) < 0.05
    assert g_w["wired"] is True
    assert m_w["wired"] is True

    compiled = compile_all_books_pdfs_ig_x_and_situational_priors(
        away_team="ARI",
        home_team="DEN",
        week=10,
        merged_game_context={},
        stage1a_receipt=None,
        stage1b_receipt=None,
        pbp_ftn_32={},
        x_and_ig_360_charting={},
        full_repo_situational={},
        gdrive_onedrive_overlay={},
        uncompressed_25k_bridge={},
        x_layer2_overlay={},
        q1_to_q51_registry={},
        env_cfg={"is_indoor": False, "wind_mph": 20.0},
    )
    verif = assert_all_books_pdfs_ig_x_situational_wired(compiled)
    assert verif["wave38_gsi_gtex_and_sgp_copula_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 20.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave38_gsi_gtex_and_sgp_copula_coupled"]
        is True
    )

    with pytest.raises(OperatorSimulationHoldError):
        run_all_sports_unified_situational_simulation_suite(
            n_worlds=100, seed=20261117, nfl_historical_week=11
        )


def test_wave38_ablation_improvement_rlvr_306_and_hygiene() -> None:
    """Verify 147-game OOS gains over Wave 37, 282+24 RLVR zero-odds & ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0610
    assert float(m["gse_v41_margin_mae"]) < 9.7260
    assert float(m["gse_v41_brier"]) < 0.21956
    assert float(m["overall_ece"]) < 0.07070
    assert float(w26["fwl_partial_slope"]) > 1.4260
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench38 = run_wave38_gsi_gtex_and_sgp_copula_cir_benchmark(REPO_ROOT, write_artifact=False)
    assert bench38["real_money_stake_cleared"] is False
    assert float(bench38["live_stake_fraction"]) == 0.0
    assert len(bench38["benchmark_sha256"]) == 64

    assert len(WAVE38_GSI_RLVR_TRAJECTORIES) == 3
    assert len(WAVE38_TRACKING_RLVR_TRAJECTORIES) == 7
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 282
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 282
        for ln in lines:
            rec: dict[str, Any] = json.loads(ln)
            joined = f"{rec['prompt']} {rec['think']} {json.dumps(rec['ground_truth'])}"
            assert _FORBIDDEN_ODDS_RE.search(joined) is None, rec["record_id"]

    standalone = (
        REPO_ROOT / "brain/feeds/2026-11-17/aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    )
    standalone_n = len(
        [ln for ln in standalone.read_text(encoding="ascii").splitlines() if ln.strip()]
    )
    assert int(rlvr["records_compiled"]) + standalone_n >= 306

    hygiene_paths = (
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave38_gsi_gtex_transcriptomics_and_schrodinger_bridge_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave38_presnap_scheme_def_continuity_sgp_copula_and_cir_engine.py",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-17"
        / (
            "deep-research-wave38-gsi-gtex-schrodinger-bridge"
            "-and-gse-presnap-sgp-copula-cir-engine.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
