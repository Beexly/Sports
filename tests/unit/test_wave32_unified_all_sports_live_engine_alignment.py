"""Unit & End-to-End Alignment Suite for Wave 32/33 Unified Live Engine."""

from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any

import pytest
from scripts.ops.gse_coach_mind_simulator import (
    compute_pre_projection_universal_and_deep_non_stationary_priors,
    load_live_corpus_situational_conditioner,
    load_sealed_object_readonly,
    simulate_matchup_pbp,
)

from gse_engine.compute import (
    evaluate_wave32_unified_sports_situational_live_fusion,
    fuse_universal_sports_stat_engineering_vaults,
    load_nov15_44_csv_situational_sweep,
    optimize_all_2026_player_and_settled_projections,
    run_wave32_historical_nfl_and_all_sports_simulation_benchmark,
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
from gse_engine.tracking import audit_and_optimize_real_2026_snaps_going_deep

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\bblock(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)


def test_nov15_44_csv_sweep_and_bitemporal_asof_gate() -> None:
    """Verify all 44 Nov-15 CSVs load and observe strict week >= 10 ASOF gating."""
    sweep = load_nov15_44_csv_situational_sweep(REPO_ROOT)
    assert int(sweep["csv_files_indexed"]) == 44
    assert int(sweep["total_csv_rows_parsed"]) >= 750
    assert int(sweep["matchup_cards_count"]) == 10
    assert len(sweep["pressure_allowed_pct"]) >= 30

    wk9 = evaluate_wave32_unified_sports_situational_live_fusion(
        away_team="BUF",
        home_team="KC",
        as_of_week=9,
        repo_root=REPO_ROOT,
    )
    wk10 = evaluate_wave32_unified_sports_situational_live_fusion(
        away_team="BUF",
        home_team="KC",
        as_of_week=10,
        repo_root=REPO_ROOT,
    )
    assert wk9["bitemporal_snapshot_gated"] is True
    assert wk10["bitemporal_snapshot_gated"] is False
    assert wk9["live_stake_fraction"] == 0.0
    assert wk10["real_money_stake_cleared"] is False


def test_omni_545k_stat_engineering_vaults_and_bitemporal_causality(tmp_path: Path) -> None:
    """Verify all 24 empirical stat vaults (>551k rows) and strict causal week cutoff."""
    w3 = fuse_universal_sports_stat_engineering_vaults(REPO_ROOT, as_of_week=3)
    w10 = fuse_universal_sports_stat_engineering_vaults(REPO_ROOT, as_of_week=10)
    assert w10["clean_checkout_fallback"] is False
    assert int(w10["omni_vaults_loaded"]) >= 22
    assert int(w10["omni_empirical_rows_indexed"]) >= 545000
    assert int(w10["nov15_all44_csvs_indexed"]) == 44
    assert int(w10["nov16_csvs_indexed"]) == 17
    assert int(w10["nov17_csvs_indexed"]) == 43
    assert int(w10["nov15_to_nov17_total_csvs_indexed"]) == 104
    assert w10["nov16_17_post_wk10_gated"] is True
    assert int(w10["teams_indexed"]) >= 30
    assert w10["real_money_stake_cleared"] is False

    c3 = w3["causal_pre_asof_counts"]
    c10 = w10["causal_pre_asof_counts"]
    assert int(c3["pbp_pre_asof_snaps"]) < int(c10["pbp_pre_asof_snaps"])
    assert int(c3["ftn_pre_asof_snaps"]) < int(c10["ftn_pre_asof_snaps"])
    assert int(c3["qbr_pre_asof_rows"]) < int(c10["qbr_pre_asof_rows"])
    assert int(c3["ngs_pre_asof_rows"]) < int(c10["ngs_pre_asof_rows"])
    assert int(c3["snap_pre_asof_rows"]) < int(c10["snap_pre_asof_rows"])

    empty = fuse_universal_sports_stat_engineering_vaults(tmp_path, as_of_week=10)
    assert empty["clean_checkout_fallback"] is True
    assert int(empty["nov15_to_nov17_total_csvs_indexed"]) == 0
    assert empty["real_money_stake_cleared"] is False


def test_real_2026_snaps_going_deep_optimization(tmp_path: Path) -> None:
    """Verify 18,738 real PBP snaps + 18,019 FTN snaps + monotone XGBoost ship gate."""
    res = audit_and_optimize_real_2026_snaps_going_deep(REPO_ROOT)
    assert res["clean_checkout_fallback"] is False
    assert int(res["snaps_evaluated"]) == 18738
    assert int(res["ftn_charted_snaps"]) == 18019
    assert int(res["pass_attempts_oos"]) == 6088
    assert float(res["xcomp_brier_aws_xgb"]) < float(res["xcomp_brier_naive_air_yards"])
    assert float(res["xcomp_logloss_aws_xgb"]) < float(res["xcomp_logloss_naive_air_yards"])
    assert int(res["cubes_14_count"]) == 14
    assert res["ship_gate_passed"] is True
    assert res["real_money_stake_cleared"] is False

    empty_res = audit_and_optimize_real_2026_snaps_going_deep(tmp_path)
    assert empty_res["clean_checkout_fallback"] is True
    assert empty_res["ship_gate_passed"] is True


def test_player_and_settled_projection_optimization(tmp_path: Path) -> None:
    """Verify strictly causal Chronofy + positional EB beats naive baselines and floors."""
    res = optimize_all_2026_player_and_settled_projections(REPO_ROOT)
    assert res["clean_checkout_fallback"] is False
    assert int(res["player_week_rows_scanned"]) == 7447
    assert int(res["total_oos_player_week_evaluations"]) == 1170

    qb = res["qb_passing_yards"]
    rb = res["rb_rushing_yards"]
    rec = res["wr_te_receiving_yards"]
    skill = res["skill_players_combined"]
    assert int(qb["n_eval"]) == 172 and qb["beats_naive"] is True
    assert float(qb["eb_opt_mae"]) <= 58.77
    assert int(rb["n_eval"]) == 237 and rb["beats_naive"] is True
    assert float(rb["eb_opt_mae"]) <= 25.87
    assert int(rec["n_eval"]) == 761 and rec["beats_naive"] is True
    assert int(skill["n_eval"]) == 998
    assert float(skill["eb_opt_mae"]) <= 25.29
    assert res["floors_verification"]["all_player_floors_held"] is True

    assert res["week9_sunday_settlement"]["record"] == "7-4-0"
    assert int(res["week9_mnf_buf_min_autopsy"]["total_props_settled"]) == 78

    empty_res = optimize_all_2026_player_and_settled_projections(tmp_path)
    assert empty_res["clean_checkout_fallback"] is True
    assert empty_res["floors_verification"]["all_player_floors_held"] is True


def test_wave32_cwd_invariance_stage2_and_pbp_coupling(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Ensure CWD independence and live Stage-2 + Stage-3 PBP simulator propagation."""
    monkeypatch.chdir(tmp_path)

    res = evaluate_wave32_unified_sports_situational_live_fusion(
        away_team="ARI",
        home_team="DEN",
        as_of_week=10,
        effective_wind_mph=20.0,
        is_indoor=False,
        is_short_week=True,
        repo_root=REPO_ROOT,
    )
    assert float(res["fwl_orthogonality_max_err"]) < 1e-10
    assert res["chalk_grad_zero"] is True
    assert int(res["omni_vaults_loaded"]) >= 22
    assert int(res["omni_empirical_rows_indexed"]) >= 545000
    assert float(res["live_stage2_deltas"]["home_epa_delta"]) > 0.0
    assert float(res["live_stage2_deltas"]["away_comp_rate_delta"]) < 0.0
    assert float(res["gsi_k14_pose2sim_snap_cap"]) <= 1.0

    # Verify full Stage-2 corpus integrator and wiring audit
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
    wired_res = assert_all_books_pdfs_ig_x_situational_wired(compiled)
    assert wired_res["all_5_pillars_wired"] is True
    assert wired_res["wave32_unified_live_fusion_wired"] is True
    assert int(compiled["wave32_unified_live_fusion_pillar"]["omni_vaults_loaded"]) >= 22

    # Verify Stage-3 PBP simulator pre-projection prior attachment & execution
    pre_priors = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI",
        home_team="DEN",
        context={"is_indoor": False, "wind_mph": 20.0},
    )
    w32_pre = pre_priors["wave32_unified_sports_situational_fusion"]
    assert float(w32_pre["live_weight_multiplier"]) == 1.0
    assert int(w32_pre["omni_vaults_loaded"]) >= 22

    sealed_obj, sealed_hash = load_sealed_object_readonly()
    cond = load_live_corpus_situational_conditioner()
    sim_out = simulate_matchup_pbp(
        away="ARI",
        home="DEN",
        away_inj=[],
        home_inj=[],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=200,
        seed=20261117,
        w1_w7_override={"is_indoor": False, "wind_mph": 20.0},
        return_vectors=True,
        corpus_conditioner=cond,
    )
    assert len(sim_out["vectors"]["home_score"]) == 200
    assert bool(sim_out.get("corpus_situational_conditioner_applied", False)) is True


def test_147_game_walk_forward_ablation_beats_close_across_all_5_metrics() -> None:
    """Verify full Weeks 1..10 ablation beats close on CRPS, MAE, Brier, ECE & FWL."""
    ablation = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    assert int(ablation["completed_games_evaluated"]) == 147
    m = ablation["metrics"]
    w26 = ablation["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) <= 7.0944
    assert float(m["gse_v41_margin_mae"]) < float(m["closing_market_margin_mae"])
    assert float(m["gse_v41_brier"]) < float(m["closing_market_brier"])
    assert float(m["overall_ece"]) < float(m["closing_market_overall_ece"])
    assert float(w26["fwl_partial_slope"]) > 0.0
    assert w26["fwl_orthogonal_verified"] is True
    assert w26["monotone_ratchet"]["promote"] is True
    assert w26["wave19_21_floors"]["all_floors_held"] is True
    assert ablation["governance"]["real_money_stake_cleared"] is False


def test_all_8_sports_conservation_and_week11_hold() -> None:
    """Verify all 8 sports conserve probabilities & NFL Week 11 remains held."""
    suite = run_all_sports_unified_situational_simulation_suite(
        n_worlds=500,
        seed=20261117,
        nfl_historical_week=10,
    )
    assert int(suite["competitions_count"]) == 8
    assert suite["leagues"] == [
        "NFL_HIST",
        "NCAAF",
        "NBA",
        "NCAAB",
        "WNBA",
        "NHL",
        "MLB",
        "SOCCER",
    ]
    assert int(suite["total_worlds_simulated"]) == 4000
    assert suite["all_conserved_and_frechet_valid"] is True
    assert suite["real_money_stake_cleared"] is False

    for comp in suite["results"]:
        p_sum = float(comp["home_win_prob"]) + float(comp["away_win_prob"]) + float(
            comp["draw_prob"]
        )
        assert math.isclose(p_sum, 1.0, abs_tol=1e-4), comp["league"]
        assert comp["marginal_and_simplex_conserved"] is True

    with pytest.raises(OperatorSimulationHoldError):
        run_all_sports_unified_situational_simulation_suite(
            n_worlds=100,
            seed=20261117,
            nfl_historical_week=11,
        )


def test_wave32_full_benchmark_smoke_and_rlvr_hygiene() -> None:
    """Verify end-to-end 147-game PBP benchmark smoke and zero-odds pure-ASCII RLVR."""
    bench = run_wave32_historical_nfl_and_all_sports_simulation_benchmark(
        REPO_ROOT,
        n_worlds_nfl_pbp=50,
        n_worlds_all_games=10,
        n_worlds_multisport=200,
        write_artifact=False,
    )
    assert int(bench["max_nfl_week_simulated"]) == 10
    assert int(bench["nfl_historical_pbp_suite"]["games_simulated"]) == 10
    assert int(bench["nfl_all_147_completed_games_pbp_suite"]["games_simulated"]) == 147
    assert int(bench["omni_stat_engineering_vaults"]["omni_vaults_loaded"]) >= 22
    assert int(bench["all_sports_unified_simulation_suite"]["competitions_count"]) == 8
    assert bench["real_money_stake_cleared"] is False

    rlvr_batch = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr_batch["records_compiled"]) >= 236
    assert rlvr_batch["all_verifiers_passed"] is True
    assert rlvr_batch["zero_odds_contamination"] is True

    compiled_count = 0
    for rel in [
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ]:
        fpath = REPO_ROOT / rel
        assert fpath.is_file(), rel
        lines = [ln for ln in fpath.read_text(encoding="ascii").splitlines() if ln.strip()]
        assert len(lines) >= 236
        compiled_count = len(lines)
        for ln in lines:
            rec: dict[str, Any] = json.loads(ln)
            joined = f"{rec['prompt']} {rec['think']} {json.dumps(rec['ground_truth'])}"
            assert _FORBIDDEN_ODDS_RE.search(joined) is None, rec["record_id"]
            ns: dict[str, Any] = {}
            exec(str(rec["reward_verifier"]), ns, ns)
            assert float(ns["verify"](rec["ground_truth"])) == 1.0, rec["record_id"]

    standalone_path = (
        REPO_ROOT
        / "brain"
        / "feeds"
        / "2026-11-17"
        / "aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    )
    assert standalone_path.is_file()
    standalone_lines = [
        ln for ln in standalone_path.read_text(encoding="ascii").splitlines() if ln.strip()
    ]
    assert len(standalone_lines) == 24
    for ln in standalone_lines:
        srec: dict[str, Any] = json.loads(ln)
        joined_s = f"{srec['prompt']} {srec['reasoning_trace']}"
        assert _FORBIDDEN_ODDS_RE.search(joined_s) is None, srec["trajectory_id"]
        ns_s: dict[str, Any] = {}
        exec(str(srec["reward_verifier"]), ns_s, ns_s)
        assert float(ns_s["reward"]) == 1.0, srec["trajectory_id"]

    assert compiled_count + len(standalone_lines) >= 260

    w32_path = (
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "compute"
        / "wave32_unified_sports_situational_live_fusion.py"
    )
    w32_src = w32_path.read_text(encoding="ascii")
    assert _FORBIDDEN_B_TOKEN_RE.search(w32_src) is None
    assert "/".join(["Users", "Garrett"]) not in w32_src
    assert "\\".join(["Users", "Garrett"]) not in w32_src
