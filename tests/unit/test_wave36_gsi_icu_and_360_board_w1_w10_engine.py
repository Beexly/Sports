"""Wave 36 unit tests: GSI MIMIC-IV ICU / glenohumeral & GSE W1-10 360-board engine."""

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
    CLINICAL_RUO_ICU_SPORTS_WEIGHT,
    WAVE36_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_glenohumeral_throwing_mechanics,
    evaluate_gsi_mimic_iv_icu_critical_care_early_warning,
    evaluate_wave36_gsi_icu_and_throwing_suite,
)
from gse_engine.tracking import (
    WAVE36_TRACKING_RLVR_TRAJECTORIES,
    evaluate_360_board_full_w2_w10_player_kicker_idp_oos,
    evaluate_causal_w36_team_and_officials_features,
    evaluate_contract_year_5b_incentive_audit,
    evaluate_wave36_360_board_matchup_suite,
    evaluate_wave36_live_honest_ast_equations,
    run_wave36_gsi_icu_and_360_board_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_gsi_mimic_iv_icu_hypoxia_and_glenohumeral_chain(tmp_path: Path) -> None:
    """Verify MIMIC-IV 668,862-row Shock Index, Hill cliff, Baxley E-process & shoulder chain."""
    icu = evaluate_gsi_mimic_iv_icu_critical_care_early_warning(REPO_ROOT)
    assert icu["clean_checkout_fallback"] is False
    assert icu["adr0003_rule_in_only_doctrine"] is True
    assert float(icu["clinical_ruo_sports_weight"]) == 0.0
    assert CLINICAL_RUO_ICU_SPORTS_WEIGHT == 0.0
    assert int(icu["icu_stays_count"]) == 140
    assert int(icu["chartevents_total_rows"]) == 668862
    assert int(icu["icd_diagnoses_count"]) == 4506
    assert int(icu["hypoxic_events_spo2_lt92"]) == 453
    assert int(icu["compensated_shock_stays_si_ge090"]) >= 100
    assert int(icu["hypotensive_stays_map_lt65"]) >= 90
    assert int(icu["baxley_rule_in_stays_e_ge20"]) >= 50
    assert float(icu["hill_hypoxia_cliff_ratio"]) > 3.5

    icu_fb = evaluate_gsi_mimic_iv_icu_critical_care_early_warning(tmp_path)
    assert icu_fb["clean_checkout_fallback"] is True
    assert int(icu_fb["icu_stays_count"]) == 0
    assert float(icu_fb["hill_hypoxia_cliff_ratio"]) > 3.5

    glen = evaluate_gsi_glenohumeral_throwing_mechanics(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    assert int(glen["surgical_prior_cases_count"]) == 19
    assert float(glen["away"]["glenohumeral_internal_rotation_torque_ratio"]) >= 1.0
    assert 0.80 <= float(glen["away"]["deep_pass_velocity_retention_mult"]) <= 1.0
    assert 0.85 <= float(glen["away"]["high_pitch_q4_accuracy_mult"]) <= 1.0


def test_gse_w1_w10_progression_officials_st_contracts_and_360_oos() -> None:
    """Verify W1-10 PBP/FTN progressions, 17 referee crews, contracts 5B, ASTs & 5-suite OOS."""
    causal_tm = evaluate_causal_w36_team_and_officials_features(
        as_of_week=10, repo_root=REPO_ROOT
    )
    assert int(causal_tm["pbp26_snaps_available"]) == 26246
    assert int(causal_tm["ftn26_snaps_available"]) == 25310
    assert int(causal_tm["referee_crews_indexed"]) >= 15
    assert float(causal_tm["league_mean_penalty_yds_per_game"]) > 80.0
    for tm in ("KC", "DEN", "CIN", "BUF"):
        assert tm in causal_tm["teams"]
        assert -1.0 < float(causal_tm["teams"][tm]["read2_progression_epa"]) < 1.0
        assert 0.0 <= float(causal_tm["teams"][tm]["ol_clean_sack_rate"]) <= 0.25

    oos360 = evaluate_360_board_full_w2_w10_player_kicker_idp_oos(REPO_ROOT)
    assert int(oos360["max_week_evaluated"]) == 10
    assert int(oos360["total_oos_evaluations"]) >= 4500
    assert oos360["all_5_suites_beat_naive"] is True
    for key in (
        "qb_passing_yards_w2_w10",
        "rb_rushing_yards_w2_w10",
        "wr_te_receiving_yards_w2_w10",
        "kicker_total_points_w2_w10",
        "idp_tackles_combined_w2_w10",
    ):
        assert oos360[key]["beats_naive"] is True
        assert oos360[key]["weeks_evaluated"] == [2, 3, 4, 5, 6, 7, 8, 9, 10]
    assert int(oos360["idp_half_sack_events_count"]) >= 500

    contracts = evaluate_contract_year_5b_incentive_audit(REPO_ROOT)
    assert int(contracts["otc_contracts_rows"]) == 31893
    assert contracts["agents_5b_backtest_or_cut_gate"] == "LOGGED_EVIDENCE_ONLY"
    assert float(contracts["live_spread_weight"]) == 0.0

    ast36 = evaluate_wave36_live_honest_ast_equations()
    assert int(ast36["parsed_evaluated_count"]) == 6
    assert ast36["zero_fabricated_bindings"] is True
    for eq in ast36["equations_evaluated"]:
        assert eq["status"] == "PARSED_EVALUATED"


def test_wave36_cwd_invariance_warm_sla_spine_wiring_and_wk11_hold(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify CWD independence, <0.05s warm SLA, Stage-2/3 wiring & Week 11 hold."""
    monkeypatch.chdir(tmp_path)
    _ = evaluate_wave36_gsi_icu_and_throwing_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    _ = evaluate_wave36_360_board_matchup_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )

    t0 = time.perf_counter()
    g_w = evaluate_wave36_gsi_icu_and_throwing_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    m_w = evaluate_wave36_360_board_matchup_suite(
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
    assert verif["wave36_gsi_icu_and_360_board_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 20.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave36_gsi_icu_and_360_board_coupled"] is True
    )

    with pytest.raises(OperatorSimulationHoldError):
        run_all_sports_unified_situational_simulation_suite(
            n_worlds=100, seed=20261117, nfl_historical_week=11
        )


def test_wave36_ablation_improvement_rlvr_286_and_hygiene() -> None:
    """Verify 147-game OOS gains over Wave 35, 262+24 RLVR zero-odds & ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) <= 7.0750
    assert float(m["gse_v41_margin_mae"]) <= 9.7430
    assert float(m["gse_v41_brier"]) <= 0.21967
    assert float(m["overall_ece"]) <= 0.07082
    assert float(w26["fwl_partial_slope"]) >= 1.4112
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench36 = run_wave36_gsi_icu_and_360_board_benchmark(REPO_ROOT, write_artifact=False)
    assert bench36["real_money_stake_cleared"] is False
    assert float(bench36["live_stake_fraction"]) == 0.0
    assert len(bench36["benchmark_sha256"]) == 64

    assert len(WAVE36_GSI_RLVR_TRAJECTORIES) == 3
    assert len(WAVE36_TRACKING_RLVR_TRAJECTORIES) == 7
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 262
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 262
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
    assert int(rlvr["records_compiled"]) + standalone_n >= 286

    hygiene_paths = (
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave36_gsi_icu_hemodynamic_hypoxia_and_shoulder_kinetic_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave36_360_board_officials_special_teams_progression_and_idp_engine.py",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-17"
        / (
            "deep-research-wave36-gsi-icu-hemodynamic-early-warning"
            "-and-gse-360-board-w1-w10-engine.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
