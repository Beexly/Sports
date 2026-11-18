"""Wave 40 unit tests: Universal 10-Sport Metrics Encyclopedia, Handicaps & NFL NGS Engine."""

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
from gse_engine.multisport import (
    UNIVERSAL_SPORTS_METRICS_REGISTRY,
    WAVE40_MULTISPORT_RLVR_TRAJECTORIES,
    evaluate_cfb_nba_golf_mma_metrics_suite,
    evaluate_mlb_statcast_barrel_and_pitch_arsenal,
    evaluate_nhl_special_teams_ppp_and_penalty_play,
    evaluate_soccer_corner_kicks_and_asian_handicap,
    evaluate_tennis_markov_game_and_set_handicaps,
    evaluate_wave40_universal_multisport_metrics_suite,
    query_universal_sport_metric,
    run_all_sports_unified_situational_simulation_suite,
)
from gse_engine.observability.walk_forward_ablation import (
    run_weeks1_to_10_walk_forward_ablation,
)
from gse_engine.tracking import (
    WAVE40_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w40_ngs_and_ftn_features,
    evaluate_ngs_2025_2026_w1_w10_vaults,
    evaluate_wave40_live_honest_ast_equations,
    evaluate_wave40_ngs_ftn_and_universal_metrics_suite,
    run_wave40_ngs_and_universal_metrics_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_wave40_universal_metrics_encyclopedia_and_10sport_calculators(tmp_path: Path) -> None:
    """Verify 284-metric 10-sport encyclopedia, aliases, MLB/Soccer/NHL/Tennis/CFB/NBA engines."""
    assert len(UNIVERSAL_SPORTS_METRICS_REGISTRY) >= 265
    sports_present = {m.sport for m in UNIVERSAL_SPORTS_METRICS_REGISTRY}
    assert sports_present == {
        "NFL",
        "NCAAF",
        "NBA",
        "NCAAB_WNBA",
        "MLB",
        "SOCCER",
        "NHL",
        "TENNIS",
        "GOLF_PGA",
        "MMA_UFC",
    }

    expected_queries = [
        ("barrel percentage", "MLB", "mlb_barrel_pct"),
        ("corner kicks", "SOCCER", "soccer_corner_kicks_pg"),
        ("asian handicap", "SOCCER", "soccer_asian_handicap"),
        ("penalty play points", "NHL", "nhl_power_play_points"),
        ("shorthanded points", "NHL", "nhl_shorthanded_points"),
        ("handicaps for tennis", "TENNIS", "tennis_game_handicap"),
        ("tennis set handicap", "TENNIS", "tennis_set_handicap"),
        ("dominance ratio", "TENNIS", "tennis_dominance_ratio"),
        ("cpoe", "NFL", "nfl_cpoe"),
        ("havoc rate", "NCAAF", "cfb_havoc_rate"),
        ("efg%", "NBA", "nba_efg_pct"),
        ("strokes gained approach", "GOLF_PGA", "pga_sg_app"),
        ("takedown defense", "MMA_UFC", "ufc_td_def"),
    ]
    for q_txt, q_sport, exp_id in expected_queries:
        res = query_universal_sport_metric(q_txt, sport=q_sport, repo_root=REPO_ROOT)
        assert res["found"] is True
        assert res["metric_id"] == exp_id

    mlb = evaluate_mlb_statcast_barrel_and_pitch_arsenal(repo_root=REPO_ROOT)
    assert mlb["clean_checkout_fallback"] is False
    assert int(mlb["qualified_batters_count"]) == 251
    assert int(mlb["teams_count"]) == 30
    assert 12.0 <= float(mlb["batter_barrel_pct"]) <= 14.0
    assert float(mlb["pitcher_fip"]) > 0.0
    assert float(mlb["pitcher_csw_pct"]) > 20.0
    mlb_fb = evaluate_mlb_statcast_barrel_and_pitch_arsenal(repo_root=tmp_path)
    assert mlb_fb["clean_checkout_fallback"] is True

    soc = evaluate_soccer_corner_kicks_and_asian_handicap(repo_root=REPO_ROOT)
    assert soc["clean_checkout_fallback"] is False
    assert int(soc["epl_matches_sample_n"]) == 380
    assert int(soc["epl_clubs_count"]) == 20
    assert float(soc["expected_total_corners"]) > 7.0
    ah025 = soc["asian_handicaps_home"]["ah_minus_0_25"]
    ah_sum = (
        float(ah025["win_prob"])
        + float(ah025["half_win_prob"])
        + float(ah025["push_prob"])
        + float(ah025["half_loss_prob"])
        + float(ah025["loss_prob"])
    )
    assert abs(ah_sum - 1.0) < 1e-4

    nhl = evaluate_nhl_special_teams_ppp_and_penalty_play(repo_root=REPO_ROOT)
    assert nhl["clean_checkout_fallback"] is False
    assert int(nhl["nhl_teams_count"]) == 32
    assert 0.0 < float(nhl["skater_prob_1plus_ppp"]) < 1.0
    assert 0.0 < float(nhl["pk_skater_prob_1plus_shp"]) < 1.0

    ten = evaluate_tennis_markov_game_and_set_handicaps(
        tour="ATP", surface="Hard", best_of=3, repo_root=REPO_ROOT
    )
    assert ten["clean_checkout_fallback"] is False
    assert int(ten["atp_top100_count"]) == 100
    assert int(ten["wta_top100_count"]) == 100
    assert abs(float(ten["pmf_total_mass"]) - 1.0) < 1e-9
    assert (
        abs(float(ten["player_a_match_win_prob"]) + float(ten["player_b_match_win_prob"]) - 1.0)
        < 1e-4
    )
    assert float(ten["player_a_dominance_ratio"]) > 1.0
    assert 0.0 < float(ten["set_handicaps"]["a_minus_1_5"]) < 1.0
    gh3 = ten["game_handicaps"]["-3.0"]
    assert (
        abs(float(gh3["win_prob"]) + float(gh3["push_prob"]) + float(gh3["loss_prob"]) - 1.0) < 1e-4
    )

    cfb_nba = evaluate_cfb_nba_golf_mma_metrics_suite(repo_root=REPO_ROOT)
    assert cfb_nba["clean_checkout_fallback"] is False
    assert int(cfb_nba["nba_teams_count"]) == 30
    assert int(cfb_nba["cfb_fbs_teams_count"]) >= 130
    cfb_nba_fb = evaluate_cfb_nba_golf_mma_metrics_suite(repo_root=tmp_path)
    assert cfb_nba_fb["clean_checkout_fallback"] is True


def test_wave40_nfl_ngs_w1_w10_causality_quarantine_and_ast(tmp_path: Path) -> None:
    """Verify NFL NGS (<=W10, zero Week-0), 5 quarantined headlines & 8/8 ASTs."""
    vault = evaluate_ngs_2025_2026_w1_w10_vaults(REPO_ROOT)
    assert vault["clean_checkout_fallback"] is False
    assert vault["zero_post_w10_leakage"] is True
    assert vault["zero_week0_aggregate_leakage"] is True
    assert int(vault["ngs_passing_2026_w1_w10_rows"]) >= 250
    assert int(vault["ngs_rushing_2026_w1_w10_rows"]) >= 250
    assert int(vault["ngs_receiving_2026_w1_w10_rows"]) >= 600

    vault_fb = evaluate_ngs_2025_2026_w1_w10_vaults(tmp_path)
    assert vault_fb["clean_checkout_fallback"] is True
    assert int(vault_fb["ngs_passing_rows"]) == 0

    causal = evaluate_causal_w40_ngs_and_ftn_features(as_of_week=10, repo_root=REPO_ROOT)
    assert causal["clean_checkout_fallback"] is False
    assert int(causal["max_prior_week_used"]) == 9
    quar = causal["quarantined_ngs_weights"]
    assert len(quar) == 5
    assert all(float(v) == 0.0 for v in quar.values())
    for tm in ("KC", "DEN", "CIN", "BUF", "WAS", "WSH"):
        assert tm in causal["teams"]
        assert -1.0 <= float(causal["teams"][tm]["def_box_discipline_norm"]) <= 1.0
        assert -1.0 <= float(causal["teams"][tm]["ngs_rec_cushion_norm"]) <= 1.0

    ast40 = evaluate_wave40_live_honest_ast_equations()
    assert int(ast40["parsed_evaluated_count"]) == 8
    assert ast40["zero_fabricated_bindings"] is True
    for eq in ast40["equations_evaluated"]:
        assert eq["status"] == "PARSED_EVALUATED"


def test_wave40_cwd_invariance_warm_sla_spine_wiring_and_wk11_hold(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify CWD independence, <0.05s warm SLA, Stage-2/3 wiring & Week 11 hold."""
    monkeypatch.chdir(tmp_path)
    _ = evaluate_wave40_universal_multisport_metrics_suite(REPO_ROOT)
    _ = evaluate_wave40_ngs_ftn_and_universal_metrics_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )

    t0 = time.perf_counter()
    ms_w = evaluate_wave40_universal_multisport_metrics_suite(REPO_ROOT)
    trk_w = evaluate_wave40_ngs_ftn_and_universal_metrics_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    assert (time.perf_counter() - t0) < 0.05
    assert ms_w["wired"] is True
    assert trk_w["wired"] is True

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
        env_cfg={"is_indoor": False, "wind_mph": 12.0},
    )
    verif = assert_all_books_pdfs_ig_x_situational_wired(compiled)
    assert verif["wave40_ngs_and_universal_metrics_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 12.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave40_ngs_and_universal_metrics_coupled"]
        is True
    )

    with pytest.raises(OperatorSimulationHoldError):
        run_all_sports_unified_situational_simulation_suite(
            n_worlds=100, seed=20261117, nfl_historical_week=11
        )


def test_wave40_ablation_beats_w39_rlvr_328_and_hygiene() -> None:
    """Verify OOS gains over Wave 39, 304+24 RLVR & strict pure-ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0545
    assert float(m["raw_gse_v41_margin_crps"]) < 6.9563
    assert float(m["gse_v41_margin_mae"]) <= 9.7230
    assert float(m["gse_v41_total_mae"]) <= 10.4024
    assert float(m["gse_v41_total_mae"]) < float(m["closing_market_total_mae"])
    assert float(m["gse_v41_brier"]) <= 0.21952
    assert float(m["overall_ece"]) <= 0.07064
    assert float(w26["fwl_partial_slope"]) > 1.4366
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench40 = run_wave40_ngs_and_universal_metrics_benchmark(REPO_ROOT, write_artifact=False)
    assert bench40["real_money_stake_cleared"] is False
    assert float(bench40["live_stake_fraction"]) == 0.0
    assert len(bench40["benchmark_sha256"]) == 64

    assert len(WAVE40_MULTISPORT_RLVR_TRAJECTORIES) == 5
    assert len(WAVE40_TRACKING_RLVR_TRAJECTORIES) == 7
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 304
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 304
        for ln in lines:
            rec: dict[str, Any] = json.loads(ln)
            joined = f"{rec['prompt']} {rec['think']} {json.dumps(rec['ground_truth'])}"
            assert _FORBIDDEN_ODDS_RE.search(joined) is None, rec["record_id"]

    standalone = REPO_ROOT / "brain/feeds/2026-11-17/aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    standalone_n = len(
        [ln for ln in standalone.read_text(encoding="ascii").splitlines() if ln.strip()]
    )
    assert int(rlvr["records_compiled"]) + standalone_n >= 328

    hygiene_paths = (
        REPO_ROOT / "data" / "multisport" / "universal_sports_baseline_stats_vault_2026.json",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "multisport"
        / "wave40_universal_sports_metrics_encyclopedia_and_handicap_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave40_ngs_separation_ryoe_cpoe_and_ftn_qb_fault_engine.py",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-17"
        / (
            "deep-research-wave40-universal-multisport-metrics-encyclopedia"
            "-tennis-handicaps-and-ngs-engine.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
