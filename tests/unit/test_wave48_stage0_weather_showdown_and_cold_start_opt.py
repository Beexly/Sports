"""Wave 48 tests: Unmined Vaults, Real 32-Team Hydration, Showdown MILP & 4.86x Speedup."""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

import numpy as np
import pytest

from gse_engine.compute.corpus_situational_integrator import (
    assert_all_books_pdfs_ig_x_situational_wired,
    compile_all_books_pdfs_ig_x_and_situational_priors,
)
from gse_engine.compute.dfs_optimizer import (
    SALARY_CAP,
    SHOWDOWN_SLOTS,
    solve_showdown_cpt_duplication_aware_milp,
)
from gse_engine.compute.wave32_unified_sports_situational_live_fusion import (
    evaluate_wave32_unified_sports_situational_live_fusion,
)
from gse_engine.governance.simulation_hold_gate import OperatorSimulationHoldError
from gse_engine.memory.knowledge_continuity_and_gsi_rlvr_flywheel import (
    _FORBIDDEN_ODDS_RE,
    compile_gse_to_gsi_rlvr_training_batch,
)
from gse_engine.observability.walk_forward_ablation import (
    run_weeks1_to_10_walk_forward_ablation,
)
from gse_engine.tracking.wave48_stage0_weather_sentiment_trade_and_showdown_engine import (
    CLINICAL_RUO_W48_SPORTS_WEIGHT,
    CROSS_SPORT_SOCCER_CONTRACT_NFL_WEIGHT,
    LIVE_WIN_PROB_SENTIMENT_WEIGHT,
    WAVE48_TRACKING_RLVR_TRAJECTORIES,
    audit_unmined_weather_sentiment_contract_and_stage0_vaults,
    evaluate_causal_w48_early_down_motion_4man_and_rz_features,
    evaluate_causal_w48_game_total_obv_stop_divisional_and_weather_shift,
    evaluate_w48_martingale_and_shortcut_audit,
    evaluate_w48_walk_forward_hydrated_spine_and_showdown,
    evaluate_wave48_live_honest_ast_equations,
    evaluate_wave48_stage0_weather_sentiment_and_showdown_suite,
    run_wave48_stage0_weather_showdown_benchmark,
)
from gse_engine.workflows.unified_reasoning_simulation_projection_spine import (
    evaluate_vault_hydrated_unified_spine_matchup,
    hydrate_causal_matchup_context_from_vaults,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_wave48_showdown_cpt_duplication_aware_milp_and_vault_hydration() -> None:
    """Verify Showdown 1.5x CPT + 5 FLEX MILP & real 32-team vault-hydrated Unified Spine."""
    rng = np.random.default_rng(20261118)
    names = [
        "QB Home",
        "WR1 Home",
        "TE1 Home",
        "RB1 Home",
        "K Home",
        "QB Away",
        "WR1 Away",
        "RB1 Away",
        "TE1 Away",
        "WR2 Away",
        "K Away",
    ]
    pos = ["QB", "WR", "TE", "RB", "K", "QB", "WR", "RB", "TE", "WR", "K"]
    teams = ["KC", "KC", "KC", "KC", "KC", "DEN", "DEN", "DEN", "DEN", "DEN", "DEN"]
    sals = [10800, 9600, 6400, 7400, 4400, 9800, 8800, 7200, 5200, 4000, 4200]
    means = [22.0, 17.5, 11.5, 13.8, 8.2, 19.8, 15.6, 13.2, 9.6, 8.8, 7.6]
    scen = np.clip(
        np.asarray(means)[None, :] + rng.normal(0.0, 3.5, size=(120, len(names))),
        1.0,
        45.0,
    ).tolist()

    sd_cash = solve_showdown_cpt_duplication_aware_milp(
        mode="cash",
        names=names,
        positions=pos,
        teams=teams,
        salaries=sals,
        mean_projections=means,
        scenario_pts_matrix=scen,
    )
    assert sd_cash["zero_cap_violations"] is True
    assert int(sd_cash["total_salary"]) <= SALARY_CAP  # type: ignore[arg-type]
    assert len(list(sd_cash["flex_names"])) + 1 == SHOWDOWN_SLOTS  # type: ignore[arg-type]

    sd_port: list[dict[str, object]] = []
    prior_pres: list[list[int]] = []
    for _ in range(3):
        sol = solve_showdown_cpt_duplication_aware_milp(
            mode="gpp_unique",
            names=names,
            positions=pos,
            teams=teams,
            salaries=sals,
            mean_projections=means,
            scenario_pts_matrix=scen,
            prior_lineup_vectors=prior_pres if prior_pres else None,
            max_player_overlap=4,
            min_salary_used=47_600,
            max_salary_used=49_400,
            enforce_qb_cpt_stack=True,
        )
        assert sol["zero_cap_violations"] is True
        assert 47_600 <= int(sol["total_salary"]) <= 49_400  # type: ignore[arg-type]
        assert 600 <= int(sol["salary_left"]) <= 2400  # type: ignore[arg-type]
        if str(sol["captain_position"]) == "QB":
            assert int(sol["qb_cpt_same_team_pass_catchers"]) >= 1  # type: ignore[arg-type]
            assert int(sol["opp_bringback_count"]) >= 1  # type: ignore[arg-type]
        prior_pres.append(list(sol["presence_binary"]))  # type: ignore[arg-type]
        sd_port.append(sol)

    for i in range(len(prior_pres)):
        for j in range(i + 1, len(prior_pres)):
            ov = sum(a * b for a, b in zip(prior_pres[i], prior_pres[j], strict=True))
            assert ov <= 4

    with pytest.raises(OperatorSimulationHoldError):
        hydrate_causal_matchup_context_from_vaults("IND", "HOU", as_of_week=11, repo_root=REPO_ROOT)

    sea_lv = evaluate_vault_hydrated_unified_spine_matchup(
        "SEA", "LV", as_of_week=10, n_worlds=500, repo_root=REPO_ROOT
    )
    assert sea_lv["hydrated_from_vaults"] is True
    assert sea_lv["qb_away_name"] == "Drew L."
    assert float(sea_lv["max_world_conservation_residual"]) == 0.0
    assert int(sea_lv["orphaned_non_simulated_projections"]) == 0

    buf_min = evaluate_vault_hydrated_unified_spine_matchup(
        "BUF", "MIN", as_of_week=9, n_worlds=500, repo_root=REPO_ROOT
    )
    assert buf_min["hydrated_from_vaults"] is True
    assert float(buf_min["max_world_conservation_residual"]) == 0.0
    sd_b = buf_min["stage4_derived_outputs"]["dfs"]["showdown"]
    assert sd_b["showdown_zero_cap_violations"] is True
    assert int(sd_b["gpp_salary_left_range"][0]) >= 600
    assert int(sd_b["gpp_salary_left_range"][1]) <= 2400


def test_wave48_vault_audit_causal_signals_wf_showdown_martingale_and_wiring(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify Wave 48 unmined vaults, causal signals, 18g Showdown WF, 500 placebo & ASTs."""
    assert CLINICAL_RUO_W48_SPORTS_WEIGHT == 0.0
    assert LIVE_WIN_PROB_SENTIMENT_WEIGHT == 0.0
    assert CROSS_SPORT_SOCCER_CONTRACT_NFL_WEIGHT == 0.0

    with pytest.raises(OperatorSimulationHoldError):
        evaluate_wave48_stage0_weather_sentiment_and_showdown_suite(
            away_team="KC", home_team="DEN", as_of_week=11, repo_root=REPO_ROOT
        )

    va = audit_unmined_weather_sentiment_contract_and_stage0_vaults(REPO_ROOT)
    assert va["clean_checkout_fallback"] is False
    kw = va["kaggle_weather_zone1"]
    hs = va["hf_twitter_sentiment_zone2"]
    hc = va["hf_contracts_zone1_quarantine"]
    s0 = va["trades_and_stage0_truth_2026_w10"]
    assert int(kw["total_games"]) == 14371
    assert int(kw["modern_2010_plus_games"]) == 4363
    assert float(kw["wind_15mph_total_delta_pts"]) < -5.0
    assert float(kw["cold_wind_total_delta_pts"]) < -6.0
    assert int(hs["raw_rows"]) == 5171
    assert int(hs["valid_roberta_rows"]) == 5153
    assert int(hs["quarantined_malformed_rows"]) == 18
    assert float(hs["live_win_prob_weight"]) == 0.0
    assert hs["chalk_firewall_zero_true_grad"] is True
    assert int(hc["contract_rows"]) == 1000
    assert int(hc["nfl_gsis_overlap"]) == 0
    assert float(hc["nfl_live_weight"]) == 0.0
    assert int(s0["trades_2026_count"]) == 63
    assert int(s0["confirmed_qb1_count"]) == 32
    assert int(s0["excluded_players_union_count"]) == 241
    assert s0["sea_qb1_sanitized"] == "Drew L."

    feat = evaluate_causal_w48_early_down_motion_4man_and_rz_features(
        as_of_week=10, repo_root=REPO_ROOT
    )
    assert int(feat["max_prior_week_used"]) == 9
    quar = feat["quarantined_metrics_weights"]
    assert len(quar) == 5
    assert all(float(v) == 0.0 for v in quar.values())

    tot = evaluate_causal_w48_game_total_obv_stop_divisional_and_weather_shift(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert -1.20 <= float(tot["total_shift_pts"]) <= 1.20

    wf_sd = evaluate_w48_walk_forward_hydrated_spine_and_showdown(REPO_ROOT)
    assert int(wf_sd["games_evaluated"]) == 18
    assert int(wf_sd["total_worlds_simulated"]) == 18000
    assert wf_sd["all_hydrated_from_vaults"] is True
    assert float(wf_sd["max_world_conservation_residual"]) == 0.0
    assert int(wf_sd["total_orphaned_projections"]) == 0
    assert wf_sd["zero_cap_violations"] is True
    assert wf_sd["all_showdown_gpp_in_anti_dupe_band"] is True
    assert wf_sd["all_qb_cpt_stacks_compliant"] is True
    assert int(wf_sd["max_portfolio_overlap"]) <= 4
    cs_tel = wf_sd["cold_start_vectorization_telemetry"]
    assert float(cs_tel["speedup_factor"]) >= 4.0
    assert int(cs_tel["sha256_exact_matches"]) == 6

    audit = evaluate_w48_martingale_and_shortcut_audit(REPO_ROOT)
    assert int(audit["games_audited"]) == 147
    assert int(audit["total_games_audited"]) == 148
    assert int(audit["null_placebo_draws"]) == 500
    assert float(audit["margin_empirical_p_value"]) <= 0.05
    assert audit["beats_null_95pct"] is True
    assert float(audit["total_empirical_p_value"]) <= 0.015
    assert audit["total_beats_null_99pct"] is True
    assert float(audit["shortcut_max_output_perturbation"]) == 0.0
    assert audit["shortcut_invariance_verified"] is True

    ast_res = evaluate_wave48_live_honest_ast_equations()
    assert ast_res["zero_fabricated_bindings"] is True
    assert int(ast_res["parsed_evaluated_count"]) == 8
    assert all(e["status"] == "PARSED_EVALUATED" for e in ast_res["equations_evaluated"])

    clean_s = evaluate_wave48_stage0_weather_sentiment_and_showdown_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    probe_s = evaluate_wave48_stage0_weather_sentiment_and_showdown_suite(
        away_team="KC",
        home_team="DEN",
        as_of_week=10,
        is_indoor=False,
        repo_root=REPO_ROOT,
        shortcut_probe={
            "raw_short_yardage_3rd4th_sr": 999.0,
            "unfiltered_soccer_contract_crossjoin_probe": -850.0,
        },
    )
    assert float(clean_s["w48_close_residual_signal"]) == pytest.approx(
        float(probe_s["w48_close_residual_signal"]), abs=1e-12
    )

    monkeypatch.chdir(tmp_path)
    t0 = time.perf_counter()
    _ = evaluate_wave48_stage0_weather_sentiment_and_showdown_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert (time.perf_counter() - t0) < 0.05

    fb_s = evaluate_wave48_stage0_weather_sentiment_and_showdown_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=tmp_path
    )
    assert fb_s["wired"] is True
    assert fb_s["real_money_stake_cleared"] is False

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
    assert verif["wave48_stage0_weather_sentiment_showdown_wired"] is True

    w32 = evaluate_wave32_unified_sports_situational_live_fusion(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert w32["wave48_stage0_weather_sentiment_and_showdown_matchups"]["wired"] is True


def test_wave48_ablation_beats_w46_rlvr_412_and_hygiene() -> None:
    """Verify monotone OOS gains over Wave 46, 388+24=412 RLVR & strict ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0063
    assert float(m["raw_gse_v41_margin_crps"]) < 6.9082
    assert float(m["gse_v41_margin_mae"]) < 9.6442
    assert float(m["gse_v41_total_mae"]) < 10.2970
    assert float(m["gse_v41_total_mae"]) < float(m["closing_market_total_mae"])
    assert float(m["gse_v41_brier"]) <= 0.21916
    assert float(m["overall_ece"]) <= 0.07021
    assert float(w26["rliable_iqm"]) > 0.733476
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench48 = run_wave48_stage0_weather_showdown_benchmark(REPO_ROOT, write_artifact=False)
    assert bench48["real_money_stake_cleared"] is False
    assert float(bench48["live_stake_fraction"]) == 0.0
    assert float(bench48["clinical_ruo_sports_weight"]) == 0.0
    assert float(bench48["live_win_prob_sentiment_weight"]) == 0.0
    assert float(bench48["cross_sport_soccer_contract_nfl_weight"]) == 0.0
    assert len(str(bench48["benchmark_sha256"])) == 64

    assert len(WAVE48_TRACKING_RLVR_TRAJECTORIES) == 6
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT, min_target_records=388)
    assert int(rlvr["records_compiled"]) >= 388
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
        "data/llm/gse_gsi_rlvr_220_curriculum_2026.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 388
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
    assert int(rlvr["records_compiled"]) + standalone_n >= 412

    hygiene_paths = (
        REPO_ROOT / "src" / "gse_engine" / "compute" / "dfs_optimizer.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "workflows"
        / "unified_reasoning_simulation_projection_spine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave48_stage0_weather_sentiment_trade_and_showdown_engine.py",
        REPO_ROOT
        / "brain"
        / "agent-bus"
        / "2026-11-18_wave48_real_roster_spine_showdown_milp_vaults_and_speedup.json",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-18"
        / "wave48-real-roster-hydration-showdown-milp-unmined-vaults-and-cold-start-opt.md",
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
