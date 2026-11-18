"""Wave 46 tests: 66 alphaXiv papers, MemTX/CI/UPA/LEDGER, Picks/7-Props & Stacked MILP DFS."""

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
from gse_engine.governance.revenue_orchestration_and_w11_tnf_readiness import (
    PUBLIC_TOKEN_RESELLER_ENABLED,
    evaluate_gse_6rung_whop_value_ladder_and_tx_tax,
    evaluate_gsi_reseller_quarantine_and_4plane_24x7_cloud_economics,
    evaluate_revenue_and_4plane_orchestration_readiness_suite,
    evaluate_single_slate_credit_trap_vs_30day_clv_pledge,
    evaluate_w11_ind_at_hou_tnf_injury_and_sinkhorn_readiness,
)
from gse_engine.governance.simulation_hold_gate import OperatorSimulationHoldError
from gse_engine.memory.knowledge_continuity_and_gsi_rlvr_flywheel import (
    _FORBIDDEN_ODDS_RE,
    compile_gse_to_gsi_rlvr_training_batch,
)
from gse_engine.observability.walk_forward_ablation import (
    run_weeks1_to_10_walk_forward_ablation,
)
from gse_engine.science.wave46_alphaxiv_66paper_transactional_memory_durable_ci_upa_and_spec_ledger_engine import (  # noqa: E501
    CLINICAL_RUO_ALPHAXIV_W46_SPORTS_WEIGHT,
    WAVE46_GSI_RLVR_TRAJECTORIES,
    evaluate_durable_workflow_ci_safety_and_resonact_pillar,
    evaluate_ledger_spec_growth_consort_and_agentpprof_pillar,
    evaluate_memtx_gatemem_and_use_disuse_memory_pillar,
    evaluate_upa_escrow_conformance_and_human_anchor_pillar,
    evaluate_wave46_alphaxiv_66paper_memory_ci_upa_ledger_suite,
)
from gse_engine.tracking.wave46_causal_picks_combo_props_and_stacked_portfolio_dfs_nfl_engine import (  # noqa: E501
    WAVE46_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w46_game_total_clock_drain_and_1read_shift,
    evaluate_causal_w46_memtx_ftn_and_fieldpos_features,
    evaluate_w46_martingale_and_shortcut_audit,
    evaluate_w46_walk_forward_7props_and_stacked_portfolio_dfs,
    evaluate_wave46_live_honest_ast_equations,
    evaluate_wave46_memtx_picks_7props_and_stacked_dfs_suite,
    run_wave46_66paper_picks_7props_and_stacked_dfs_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_wave46_science_66papers_memtx_durable_ci_upa_and_ledger() -> None:
    """Verify all 4 Wave 46 scientific pillars across 66 unique brand-new preprints."""
    assert CLINICAL_RUO_ALPHAXIV_W46_SPORTS_WEIGHT == 0.0

    pa = evaluate_memtx_gatemem_and_use_disuse_memory_pillar()
    assert int(pa["paper_count"]) == 16
    assert float(pa["unguarded_corrupt_l2"]) > 1.0
    assert float(pa["memtx_corrupt_residue_l2"]) == 0.0
    assert pa["complete_state_recovered"] is True
    assert float(pa["gatemem_leak_rate"]) == 0.0
    assert float(pa["gatemem_authorized_recall"]) == 1.0
    assert float(pa["consolidated_retention_recall"]) > float(pa["fifo_retention_recall"])
    assert pa["collusion_detected"] is True

    pb = evaluate_durable_workflow_ci_safety_and_resonact_pillar()
    assert int(pb["paper_count"]) == 15
    assert pb["safe_upgrade_cleared"] is True
    assert pb["unsafe_replay_halted"] is True
    assert pb["canary_regression_caught"] is True
    assert pb["healthy_release_passed"] is True
    assert pb["resonact_faster_recovery"] is True
    assert pb["ml_ci_tail_predictor_verified"] is True

    pc = evaluate_upa_escrow_conformance_and_human_anchor_pillar()
    assert int(pc["paper_count"]) == 17
    assert float(pc["upa_policy_violation_rate"]) == 0.0
    assert float(pc["escrow_best_utility"]) > 0.80
    assert pc["nonconforming_trace_flagged"] is True
    assert float(pc["human_anchor_containment_rate"]) == 1.0
    assert pc["human_anchor_enforced"] is True

    pd_res = evaluate_ledger_spec_growth_consort_and_agentpprof_pillar()
    assert int(pd_res["paper_count"]) == 18
    assert float(pd_res["ledger_unbacked_recall"]) == 1.0
    assert float(pd_res["ledger_false_verified_rate"]) == 0.0
    assert pd_res["spec_code_divergence_caught"] is True
    assert pd_res["agentpprof_verified"] is True

    sci = evaluate_wave46_alphaxiv_66paper_memory_ci_upa_ledger_suite(REPO_ROOT)
    assert sci["wired"] is True
    assert int(sci["unique_paper_count"]) == 66
    assert int(sci["brand_new_wave46_count"]) == 66
    assert int(sci["cross_wave_overlap_count"]) == 0
    assert float(sci["clinical_ruo_sports_weight"]) == 0.0
    assert sci["real_money_stake_cleared"] is False
    assert float(sci["live_stake_fraction"]) == 0.0
    assert len(str(sci["suite_sha256"])) == 64


def test_wave46_causal_nfl_7props_stacked_dfs_placebo_ast_and_wiring(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify causal W1-10 Picks, 7-Market Props, Stacked L=3 MILP DFS, W11 hold & wiring."""
    with pytest.raises(OperatorSimulationHoldError):
        evaluate_wave46_memtx_picks_7props_and_stacked_dfs_suite(
            away_team="KC", home_team="DEN", as_of_week=11, repo_root=REPO_ROOT
        )

    feat = evaluate_causal_w46_memtx_ftn_and_fieldpos_features(
        as_of_week=10, repo_root=REPO_ROOT
    )
    assert int(feat["max_prior_week_used"]) == 9
    quar = feat["quarantined_metrics_weights"]
    assert len(quar) == 5
    assert all(float(v) == 0.0 for v in quar.values())

    tot = evaluate_causal_w46_game_total_clock_drain_and_1read_shift(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert -1.20 <= float(tot["total_shift_pts"]) <= 1.20

    harmony = evaluate_w46_walk_forward_7props_and_stacked_portfolio_dfs(REPO_ROOT)
    assert int(harmony["slates_evaluated"]) == 9
    assert int(harmony["total_stacked_portfolio_lineups"]) == 27
    assert int(harmony["player_dk_evaluations"]) == 2784
    assert harmony["all_7_prop_markets_beat_naive"] is True
    assert float(harmony["overall_gated_prop_hit_rate"]) > 0.65
    assert float(harmony["overall_tier1_prop_hit_rate"]) > 0.70
    props = harmony["props_7_markets"]
    assert float(props["rush_yds"]["tier1_hit_rate"]) > 0.72
    assert float(props["rec_yds"]["tier1_hit_rate"]) > 0.72
    assert float(props["rush_rec_yds"]["tier1_hit_rate"]) > 0.72
    assert float(props["anytime_td"]["gse_brier"]) < float(props["anytime_td"]["naive_brier"])
    assert float(props["pass_tds_2plus"]["gse_brier"]) < float(
        props["pass_tds_2plus"]["naive_brier"]
    )

    dfs = harmony["dfs_stacked_portfolio_backtest"]
    assert dfs["beats_raw_fppg_mae"] is True
    assert float(dfs["mean_memtx_cash_dk_pts"]) > float(dfs["mean_chalk_dk_pts"])
    assert float(dfs["mean_primary_stack_dk_pts"]) > float(dfs["mean_chalk_dk_pts"])
    assert float(dfs["mean_portfolio3_best_dk_pts"]) > float(dfs["mean_memtx_cash_dk_pts"])
    assert int(dfs["portfolio3_best_beats_chalk_weeks"]) >= 7
    assert dfs["all_game_stacks_verified"] is True
    assert dfs["zero_cap_violations"] is True
    assert float(harmony["max_kkt_harmony_residual"]) < 1e-6

    audit = evaluate_w46_martingale_and_shortcut_audit(REPO_ROOT)
    assert int(audit["games_audited"]) == 147
    assert int(audit["total_games_audited"]) == 148
    assert int(audit["null_placebo_draws"]) == 500
    assert float(audit["margin_empirical_p_value"]) <= 0.05
    assert audit["beats_null_95pct"] is True
    assert float(audit["total_empirical_p_value"]) <= 0.015
    assert audit["total_beats_null_99pct"] is True
    assert float(audit["shortcut_max_output_perturbation"]) == 0.0
    assert audit["shortcut_invariance_verified"] is True

    ast_res = evaluate_wave46_live_honest_ast_equations()
    assert ast_res["zero_fabricated_bindings"] is True
    assert int(ast_res["parsed_evaluated_count"]) == 8
    assert all(e["status"] == "PARSED_EVALUATED" for e in ast_res["equations_evaluated"])

    clean_s = evaluate_wave46_memtx_picks_7props_and_stacked_dfs_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    probe_s = evaluate_wave46_memtx_picks_7props_and_stacked_dfs_suite(
        away_team="KC",
        home_team="DEN",
        as_of_week=10,
        is_indoor=False,
        repo_root=REPO_ROOT,
        shortcut_probe={
            "unverified_agent_memory_poison_write": 999.0,
            "postgame_ftn_charting_future_week_leak": -500.0,
        },
    )
    assert float(clean_s["w46_close_residual_signal"]) == pytest.approx(
        float(probe_s["w46_close_residual_signal"]), abs=1e-12
    )

    monkeypatch.chdir(tmp_path)
    t0 = time.perf_counter()
    _ = evaluate_wave46_alphaxiv_66paper_memory_ci_upa_ledger_suite(REPO_ROOT)
    _ = evaluate_wave46_memtx_picks_7props_and_stacked_dfs_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert (time.perf_counter() - t0) < 0.05

    fb_trk = evaluate_wave46_memtx_picks_7props_and_stacked_dfs_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=tmp_path
    )
    assert fb_trk["wired"] is True
    assert fb_trk["real_money_stake_cleared"] is False

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
    assert verif["wave46_memtx_picks_7props_stacked_dfs_wired"] is True
    assert verif["revenue_orchestration_4plane_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 12.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave46_memtx_picks_7props_stacked_dfs_coupled"]
        is True
    )


def test_wave46_ablation_beats_w45_rlvr_400_and_hygiene() -> None:
    """Verify monotone OOS gains over Wave 45, 376+24=400 RLVR & strict ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0078
    assert float(m["raw_gse_v41_margin_crps"]) < 6.9096
    assert float(m["gse_v41_margin_mae"]) < 9.6467
    assert float(m["gse_v41_total_mae"]) < 10.3050
    assert float(m["gse_v41_total_mae"]) < float(m["closing_market_total_mae"])
    assert float(m["gse_v41_brier"]) <= 0.21917
    assert float(m["overall_ece"]) <= 0.07022
    assert float(w26["rliable_iqm"]) > 0.733430
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench46 = run_wave46_66paper_picks_7props_and_stacked_dfs_benchmark(
        REPO_ROOT, write_artifact=False
    )
    assert bench46["real_money_stake_cleared"] is False
    assert float(bench46["live_stake_fraction"]) == 0.0
    assert float(bench46["clinical_ruo_sports_weight"]) == 0.0
    assert len(str(bench46["benchmark_sha256"])) == 64

    assert len(WAVE46_GSI_RLVR_TRAJECTORIES) == 6
    assert len(WAVE46_TRACKING_RLVR_TRAJECTORIES) == 6
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT, min_target_records=376)
    assert int(rlvr["records_compiled"]) == 376
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
        assert len(lines) == 376
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
    assert int(rlvr["records_compiled"]) + standalone_n == 400

    hygiene_paths = (
        REPO_ROOT / ".licenses" / "alphaxiv_arxiv_wave46_66papers_LICENSE.txt",
        REPO_ROOT
        / "data"
        / "arxiv_2026_11_alphaxiv"
        / (
            "alphaxiv_66paper_persistent_memory_durable_ci_governance"
            "_and_spec_ledger_vault_2026.json"
        ),
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave46_alphaxiv_66paper_transactional_memory_durable_ci_upa_and_spec_ledger_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave46_causal_picks_combo_props_and_stacked_portfolio_dfs_nfl_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "governance"
        / "revenue_orchestration_and_w11_tnf_readiness.py",
        REPO_ROOT
        / "docs"
        / "arxiv-program"
        / "research"
        / "2026-11-18"
        / (
            "deep-research-wave46-alphaxiv-66papers-transactional-memory"
            "-durable-ci-spec-ledger-and-picks-props-dfs.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name


def test_wave46_revenue_ladder_clv_pledge_4plane_cloud_and_gated_w11_tnf() -> None:
    """Verify 6-rung Whop TX tax, CLV pledge math, 4-plane cloud & fail-closed W11 TNF."""
    assert PUBLIC_TOKEN_RESELLER_ENABLED is False

    ladder = evaluate_gse_6rung_whop_value_ladder_and_tx_tax()
    assert ladder["tx_effective_tax_rate"] == pytest.approx(0.066, abs=1e-6)
    assert ladder["decoy_anchor_verified"] is True
    assert ladder["bot_breakeven_verified"] is True

    clv = evaluate_single_slate_credit_trap_vs_30day_clv_pledge()
    assert float(clv["single_slate_trigger_k10"]) > 0.45
    assert float(clv["clv_30day_pledge_trigger_prob"]) < 0.02
    assert float(clv["clv_30day_pledge_revenue_retention"]) > 0.98
    assert clv["clv_pledge_strictly_dominates"] is True

    cloud = evaluate_gsi_reseller_quarantine_and_4plane_24x7_cloud_economics()
    assert cloud["reseller_quarantined_and_4plane_cheaper"] is True
    assert float(cloud["gpu_idle_waste_pct"]) > 85.0
    assert float(cloud["four_plane_pre_credit_mo_usd"]) < 100.0

    with pytest.raises(OperatorSimulationHoldError):
        evaluate_w11_ind_at_hou_tnf_injury_and_sinkhorn_readiness(env_override="")

    w11_ready = evaluate_w11_ind_at_hou_tnf_injury_and_sinkhorn_readiness(env_override="11")
    assert w11_ready["matchup"] == "IND @ HOU"
    assert w11_ready["spread_decision"] == "TRANSPARENT_PASS"
    assert w11_ready["publish_spread_bet"] is False
    assert w11_ready["real_money_stake_cleared"] is False
    assert float(w11_ready["max_kkt_residual"]) < 1e-5
    assert (
        float(w11_ready["ind_sinkhorn_shares"]["jonathan_taylor"])
        > float(w11_ready["ind_sinkhorn_shares"]["depth_flex"])
    )
    assert (
        float(w11_ready["hou_sinkhorn_shares"]["nico_collins"])
        > float(w11_ready["hou_sinkhorn_shares"]["marvin_harrison_jr_dnp"])
    )

    suite = evaluate_revenue_and_4plane_orchestration_readiness_suite()
    assert suite["wired"] is True
    assert suite["w11_default_hold_enforced"] is True
    assert suite["public_token_reseller_enabled"] is False
