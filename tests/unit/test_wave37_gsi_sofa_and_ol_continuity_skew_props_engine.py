"""Wave 37 unit tests: GSI 6-organ SOFA/MTU & GSE OL continuity, rest, pedigree & skew props."""

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
    CLINICAL_RUO_SOFA_SPORTS_WEIGHT,
    WAVE37_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_mimic_iv_6organ_sofa_and_mortality_network,
    evaluate_gsi_mtu_collagen_surface_rest_mechanics,
    evaluate_wave37_gsi_sofa_and_mtu_suite,
)
from gse_engine.tracking import (
    WAVE37_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w37_ol_continuity_rest_and_trench_features,
    evaluate_skewness_debiased_prop_tail_backtest,
    evaluate_wave37_live_honest_ast_equations,
    evaluate_wave37_ol_continuity_and_prop_tail_suite,
    run_wave37_gsi_sofa_and_ol_continuity_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_gsi_mimic_iv_6organ_sofa_and_mtu_collagen_mechanics(tmp_path: Path) -> None:
    """Verify 6-organ Vincent SOFA, Sepsis-3 lactate/CSD AUROC/Brier & MTU collagen dynamics."""
    sofa = evaluate_gsi_mimic_iv_6organ_sofa_and_mortality_network(REPO_ROOT)
    assert sofa["clean_checkout_fallback"] is False
    assert sofa["adr0003_rule_in_only_doctrine"] is True
    assert float(sofa["clinical_ruo_sports_weight"]) == 0.0
    assert CLINICAL_RUO_SOFA_SPORTS_WEIGHT == 0.0
    assert int(sofa["icu_stays_count"]) == 140
    assert int(sofa["deaths_count"]) == 20
    assert float(sofa["non_survivor_mean_sofa"]) > float(sofa["survivor_mean_sofa"])
    assert int(sofa["septic_shock_stays_count"]) >= 30
    assert int(sofa["qsofa_ge2_stays_count"]) >= 90
    assert float(sofa["mortality_auroc"]) >= 0.74
    assert float(sofa["mortality_brier"]) < float(sofa["base_prevalence_brier"])

    sofa_fb = evaluate_gsi_mimic_iv_6organ_sofa_and_mortality_network(tmp_path)
    assert sofa_fb["clean_checkout_fallback"] is True
    assert int(sofa_fb["icu_stays_count"]) == 0
    assert float(sofa_fb["clinical_ruo_sports_weight"]) == 0.0

    mtu = evaluate_gsi_mtu_collagen_surface_rest_mechanics(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    assert 0.70 <= float(mtu["away"]["mtu_strain_energy_ratio"]) <= 1.60
    assert 0.92 <= float(mtu["away"]["explosive_cut_retention_mult"]) <= 1.04
    assert 0.92 <= float(mtu["home"]["q4_trench_anchor_retention_mult"]) <= 1.04


def test_gse_w1_w10_ol_continuity_pedigree_skew_props_and_ast() -> None:
    """Verify 8 hydrated <=W10 datasets, OL continuity, trench stuff, pedigree & skew prop tail."""
    causal = evaluate_causal_w37_ol_continuity_rest_and_trench_features(
        as_of_week=10, repo_root=REPO_ROOT
    )
    assert causal["clean_checkout_fallback"] is False
    assert int(causal["max_week_loaded"]) == 10
    hc = causal["hydrated_counts"]
    assert int(hc["roster_weekly_2026_w1_w10"]) >= 20000
    assert int(hc["depth_charts_2026_w1_w10"]) >= 500000
    assert int(hc["stats_team_week_2026_w1_w10"]) == 300
    assert int(hc["espn_qbr_week_through_2026_w10"]) >= 10000
    assert int(hc["espn_qbr_season_through_2025"]) >= 1500
    assert int(hc["draft_picks_1980_2026"]) >= 12000
    assert int(hc["trades_through_2026_w10"]) >= 4500
    assert int(hc["schedules_games_through_2026_w10"]) >= 7000

    quar = causal["quarantined_close_overpriced_signals"]
    assert len(quar) == 4
    assert all(float(v) == 0.0 for v in quar.values())
    for tm in ("KC", "DEN", "CIN", "BUF", "WSH"):
        assert tm in causal["teams"]
        assert 0.0 <= float(causal["teams"][tm]["ol_5man_continuity_jaccard"]) <= 1.0
        assert 0.0 < float(causal["teams"][tm]["active_draft_pedigree_index"]) <= 1.0

    prop_bt = evaluate_skewness_debiased_prop_tail_backtest(REPO_ROOT)
    assert prop_bt["clean_checkout_fallback"] is False
    assert int(prop_bt["total_prop_rows_audited"]) == 1067
    assert int(prop_bt["rec_n"]) == 659
    assert float(prop_bt["rec_eb_skew_brier"]) < float(prop_bt["rec_gauss_brier"])
    assert float(prop_bt["rec_eb_skew_bias"]) < float(prop_bt["rec_gauss_bias"])
    assert int(prop_bt["pass_n"]) == 393
    assert float(prop_bt["pass_eb_deb_brier"]) < float(prop_bt["pass_raw_brier"])
    assert prop_bt["improves_both_rec_and_pass_brier"] is True

    ast37 = evaluate_wave37_live_honest_ast_equations()
    assert int(ast37["parsed_evaluated_count"]) == 6
    assert ast37["zero_fabricated_bindings"] is True
    for eq in ast37["equations_evaluated"]:
        assert eq["status"] == "PARSED_EVALUATED"


def test_wave37_cwd_invariance_warm_sla_spine_wiring_and_wk11_hold(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify CWD independence, <0.05s warm SLA, Stage-2/3 wiring & Week 11 hold."""
    monkeypatch.chdir(tmp_path)
    _ = evaluate_wave37_gsi_sofa_and_mtu_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    _ = evaluate_wave37_ol_continuity_and_prop_tail_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )

    t0 = time.perf_counter()
    g_w = evaluate_wave37_gsi_sofa_and_mtu_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    m_w = evaluate_wave37_ol_continuity_and_prop_tail_suite(
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
    assert verif["wave37_gsi_sofa_and_ol_continuity_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 20.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave37_gsi_sofa_and_ol_continuity_coupled"]
        is True
    )

    with pytest.raises(OperatorSimulationHoldError):
        run_all_sports_unified_situational_simulation_suite(
            n_worlds=100, seed=20261117, nfl_historical_week=11
        )


def test_wave37_ablation_improvement_rlvr_296_and_hygiene() -> None:
    """Verify 147-game OOS gains over Wave 36, 272+24 RLVR zero-odds & ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0700
    assert float(m["gse_v41_margin_mae"]) < 9.7360
    assert float(m["gse_v41_brier"]) < 0.21963
    assert float(m["overall_ece"]) < 0.07077
    assert float(w26["fwl_partial_slope"]) > 1.4180
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench37 = run_wave37_gsi_sofa_and_ol_continuity_benchmark(REPO_ROOT, write_artifact=False)
    assert bench37["real_money_stake_cleared"] is False
    assert float(bench37["live_stake_fraction"]) == 0.0
    assert len(bench37["benchmark_sha256"]) == 64

    assert len(WAVE37_GSI_RLVR_TRAJECTORIES) == 3
    assert len(WAVE37_TRACKING_RLVR_TRAJECTORIES) == 7
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 272
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 272
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
    assert int(rlvr["records_compiled"]) + standalone_n >= 296

    hygiene_paths = (
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave37_gsi_sofa_sepsis_organ_network_and_mtu_collagen_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave37_ol_continuity_rest_stuff_pedigree_and_skew_props_engine.py",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-17"
        / (
            "deep-research-wave37-gsi-sofa-sepsis-mortality"
            "-and-gse-ol-continuity-skew-props-engine.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
