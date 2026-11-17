"""Wave 34 unit tests for Combine trenches, age curves, cognition, bioenergetics & x-sport."""

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

from gse_engine.biometrics import (
    WAVE34_RLVR_TRAJECTORIES,
    build_all32_combine_trench_and_roster_biometrics,
    evaluate_bioenergetic_nutrition_environment_state,
    evaluate_cross_sport_metric_transfers,
    evaluate_qb_neuro_cognitive_processing,
    evaluate_wave34_holistic_matchup_biometrics_and_science,
    explain_books_and_equations_to_projection_chain,
    fit_empirical_position_age_curves,
    run_wave34_holistic_biometrics_all32_benchmark,
)
from gse_engine.compute.corpus_situational_integrator import (
    assert_all_books_pdfs_ig_x_situational_wired,
    compile_all_books_pdfs_ig_x_and_situational_priors,
)
from gse_engine.compute.wave32_unified_sports_situational_live_fusion import (
    evaluate_wave32_unified_sports_situational_live_fusion,
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

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\bblock(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)


def test_combine_all32_trench_report_and_am_gm_inequality(tmp_path: Path) -> None:
    """Verify 8,968 Combine profiles link across 32 rosters and satisfy Eager AM-GM."""
    trench = build_all32_combine_trench_and_roster_biometrics(REPO_ROOT)
    assert int(trench["combine_rows_indexed"]) == 8968
    assert int(trench["anthropometric_sample_rows_indexed"]) == 510
    assert int(trench["rosters_loaded"]) == 32
    assert int(trench["total_active_athletes_scanned"]) == 2553
    assert int(trench["combine_matched_athletes"]) >= 1650
    assert len(trench["teams"]) == 32
    assert len(trench["ol_strength_ranking_top5"]) == 5
    assert len(trench["dl_bend_ranking_top5"]) == 5

    for tm, row in trench["teams"].items():
        assert float(row["ol_strength_harmonic_weak_link"]) <= float(
            row["ol_strength_arith"]
        ) + 1e-9, tm
        assert float(row["ol_lateral_agility_harmonic"]) <= float(
            row["ol_lateral_agility_arith"]
        ) + 1e-9, tm

    # Clean-checkout fallback must also build all 32 teams without error
    fallback = build_all32_combine_trench_and_roster_biometrics(tmp_path)
    assert int(fallback["rosters_loaded"]) == 0
    assert len(fallback["teams"]) == 32


def test_empirical_position_age_curves_and_dl_combine_sign() -> None:
    """Verify RB speed decays earlier while DL strength & QB cognition progress longer."""
    curves = fit_empirical_position_age_curves(REPO_ROOT)
    assert curves["clean_checkout_fallback"] is False
    assert curves["rb_burst_declines_with_age"] is True
    assert curves["dl_strength_peaks_older_than_rb"] is True
    assert curves["qb_cognition_improves_with_tenure"] is True
    assert float(curves["dl_combine_bench_vs_pressure_corr"]) > 0.0
    assert float(curves["dl_combine_cone_vs_pressure_corr"]) < 0.0


def test_qb_neuro_cognition_and_bioenergetics_altitude_acoustics() -> None:
    """Verify causal QB starter IDs, Hick-Hyman latency & Mile-High/short-week/dB physics."""
    mahomes = evaluate_qb_neuro_cognitive_processing(
        qb_team="KC", opp_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    nix = evaluate_qb_neuro_cognitive_processing(
        qb_team="DEN", opp_team="KC", as_of_week=10, repo_root=REPO_ROOT
    )
    assert mahomes["qb_name"] == "Patrick Mahomes"
    assert nix["qb_name"] == "Bo Nix"
    assert float(mahomes["hick_hyman_read_latency_ms"]) < float(
        nix["hick_hyman_read_latency_ms"]
    )
    assert float(mahomes["cognitive_processing_index"]) > float(
        nix["cognitive_processing_index"]
    )

    # Strictly causal weak < 10 has fewer FTN snaps than week 10
    w3 = evaluate_qb_neuro_cognitive_processing(
        qb_team="KC", opp_team="DEN", as_of_week=3, repo_root=REPO_ROOT
    )
    assert int(w3["ftn_causal_snaps"]) < int(mahomes["ftn_causal_snaps"])

    den_short = evaluate_bioenergetic_nutrition_environment_state(
        away_team="KC",
        home_team="DEN",
        away_rest_days=4.0,
        home_rest_days=7.0,
        circadian_hours=-1.0,
    )
    assert float(den_short["venue_altitude_ft"]) == 5280.0
    assert 0.80 <= float(den_short["venue_po2_ratio"]) <= 0.86
    assert float(den_short["altitude_carry_boost_yds"]) > 3.0
    assert float(den_short["away_glycogen_fraction"]) < float(
        den_short["home_glycogen_fraction"]
    )
    assert float(den_short["away_silent_count_ol_delay_ms"]) > 0.0
    assert float(den_short["away_silent_count_pressure_lift"]) > 0.0


def test_cross_sport_transfers_and_books_equations_crosswalk() -> None:
    """Verify 4 cross-sport physical transfers & 503-book / 109k-AST projection audit."""
    xfer = evaluate_cross_sport_metric_transfers(
        qb_arm_velocity_mph=59.0,
        spin_rpm=640.0,
        effective_wind_mph=4.0,
        wr_cone_sec=6.82,
        cb_cone_sec=7.02,
        dl_rotation_size=9,
        motion_rate=0.58,
        rest_hours=168.0,
    )
    assert int(xfer["transfers_count"]) == 4
    assert float(xfer["mlb_to_nfl_accuracy_edge"]) > 0.0
    assert float(xfer["soccer_to_nfl_separation_edge"]) > 0.0
    assert float(xfer["nhl_to_nfl_pass_rush_freshness_edge"]) > 0.0
    assert float(xfer["nba_spacing_gravity_to_nfl_epa_edge"]) > 0.0

    chain = explain_books_and_equations_to_projection_chain(REPO_ROOT)
    assert int(chain["total_complete_books_mapped"]) == 503
    assert int(chain["parsed_valid_asts_executable_ceiling"]) >= 109000
    assert int(chain["legacy_template_equations_quarantined"]) == 21419
    assert chain["all_six_domains_load_bearing"] is True
    assert len(chain["projection_lever_crosswalk"]) == 6


def test_cwd_invariance_stage2_warm_sla_and_multisport_coupling(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify CWD invariance, <0.25s warm SLA, Stage-2 pillars, and multi-sport suite."""
    monkeypatch.chdir(tmp_path)
    # Cold call warms caches cleanly
    _ = evaluate_wave34_holistic_matchup_biometrics_and_science(
        away_team="ARI", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    t0 = time.perf_counter()
    w34_warm = evaluate_wave34_holistic_matchup_biometrics_and_science(
        away_team="ARI", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    warm_elapsed = time.perf_counter() - t0
    assert warm_elapsed < 0.05
    assert w34_warm["wired"] is True
    assert w34_warm["real_money_stake_cleared"] is False

    w32 = evaluate_wave32_unified_sports_situational_live_fusion(
        away_team="ARI",
        home_team="DEN",
        as_of_week=10,
        effective_wind_mph=20.0,
        is_indoor=False,
        is_short_week=True,
        repo_root=REPO_ROOT,
    )
    assert w32["waves_unified_span"] == "Waves_20_to_34_plus_AWS_NGS_GoingDeep"
    assert w32["wave34_holistic_biometrics"]["wired"] is True

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
    assert verif["wave34_holistic_biometrics_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 20.0}
    )
    assert pre_p["trajectory_conditioners"]["wave34_holistic_biometrics_coupled"] is True
    assert pre_p["wave34_holistic_biometrics"]["wired"] is True

    suite = run_all_sports_unified_situational_simulation_suite(
        n_worlds=250, seed=20261117, nfl_historical_week=10
    )
    xfer_ov = suite["sabermetric_pitch_control_overlay"]["wave34_cross_sport_transfers"]
    assert int(xfer_ov["transfers_count"]) == 4

    with pytest.raises(OperatorSimulationHoldError):
        run_all_sports_unified_situational_simulation_suite(
            n_worlds=100, seed=20261117, nfl_historical_week=11
        )


def test_wave34_ablation_all32_benchmark_rlvr_266_and_hygiene() -> None:
    """Verify 147-game OOS close-beating, all-32 benchmark, 242+24 RLVR & source hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) <= 7.0895
    assert float(m["gse_v41_margin_mae"]) < float(m["closing_market_margin_mae"])
    assert float(m["gse_v41_brier"]) < float(m["closing_market_brier"])
    assert float(m["overall_ece"]) < float(m["closing_market_overall_ece"])
    assert float(w26["fwl_partial_slope"]) > 1.40
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench34 = run_wave34_holistic_biometrics_all32_benchmark(REPO_ROOT, write_artifact=False)
    assert bench34["real_money_stake_cleared"] is False
    assert len(bench34["benchmark_sha256"]) == 64

    assert len(WAVE34_RLVR_TRAJECTORIES) == 6
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) == 242
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in [
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ]:
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) == 242
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
    assert 242 + standalone_n == 266

    w34_src = (
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "biometrics"
        / "wave34_holistic_combine_cognition_bioenergetics_crosssport_engine.py"
    ).read_text(encoding="ascii")
    assert _FORBIDDEN_B_TOKEN_RE.search(w34_src) is None
    assert "/".join(["Users", "Garrett"]) not in w34_src
    assert "\\".join(["Users", "Garrett"]) not in w34_src
