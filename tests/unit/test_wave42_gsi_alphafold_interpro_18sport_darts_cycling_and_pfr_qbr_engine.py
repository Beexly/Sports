"""Wave 42 unit tests: GSI AlphaFold/InterPro, ICU Trajectory, 18-Sport & NFL PFR/QBR."""

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
from gse_engine.multisport.wave40_universal_sports_metrics_encyclopedia_and_handicap_engine import (  # noqa: E501
    UNIVERSAL_SPORTS_METRICS_REGISTRY,
)
from gse_engine.multisport.wave41_f1_pit_strategy_nba_pra_copula_and_14sport_expansion import (  # noqa: E501
    UNIVERSAL_14SPORT_METRICS_REGISTRY,
)
from gse_engine.multisport.wave42_darts_markov_cycling_wbal_and_18sport_expansion import (  # noqa: E501
    UNIVERSAL_18SPORT_METRICS_REGISTRY,
    WAVE42_18SPORT_EXTENSION_METRICS,
    WAVE42_MULTISPORT_RLVR_TRAJECTORIES,
    evaluate_cycling_skiba_wbal_and_climb_tt,
    evaluate_darts_501_markov_leg_and_handicap,
    evaluate_wave42_18sport_darts_and_cycling_suite,
    query_18sport_universal_metric,
)
from gse_engine.observability.walk_forward_ablation import (
    run_weeks1_to_10_walk_forward_ablation,
)
from gse_engine.science.wave42_gsi_alphafold_interpro_proteolysis_and_icu_trajectory_engine import (  # noqa: E501
    CLINICAL_RUO_ALPHAFOLD_INTERPRO_SPORTS_WEIGHT,
    WAVE42_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_alphafold_disorder_interpro_and_proteolysis,
    evaluate_gsi_mimic_iv_dynamic_trajectory_sofa_mortality,
    evaluate_wave42_gsi_alphafold_interpro_and_trajectory_suite,
)
from gse_engine.tracking.wave42_pfr_advstats_qbr_two_high_yac_and_total_pace_engine import (  # noqa: E501
    WAVE42_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w42_game_total_accuracy_adot_shift,
    evaluate_causal_w42_pfr_advstats_and_qbr_features,
    evaluate_wave42_live_honest_ast_equations,
    evaluate_wave42_pfr_advstats_qbr_and_18sport_suite,
    run_wave42_gsi_alphafold_and_18sport_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_wave42_gsi_alphafold_interpro_proteolysis_and_icu_trajectory(tmp_path: Path) -> None:
    """Verify AlphaFold disorder/proteolysis ODE & MIMIC-IV dynamic trajectory AUROC >= 0.80."""
    assert CLINICAL_RUO_ALPHAFOLD_INTERPRO_SPORTS_WEIGHT == 0.0

    af_ip = evaluate_gsi_alphafold_disorder_interpro_and_proteolysis(REPO_ROOT)
    assert af_ip["clean_checkout_fallback"] is False
    assert float(af_ip["clinical_ruo_sports_weight"]) == 0.0
    assert af_ip["real_money_stake_cleared"] is False
    assert float(af_ip["live_stake_fraction"]) == 0.0
    assert int(af_ip["proteins_count"]) == 9
    assert int(af_ip["arxiv_citations_count"]) >= 10
    assert af_ip["high_disorder_warning_genes"] == [
        "COL1A1",
        "COL5A1",
        "MAPT",
        "NEFL",
        "PPARGC1A",
    ]
    assert float(af_ip["ckm_plddt"]) == pytest.approx(94.81, abs=0.05)
    assert float(af_ip["mapt_plddt"]) == pytest.approx(49.22, abs=0.05)
    assert af_ip["ckm_gt_mapt_half_life"] is True
    assert float(af_ip["ckm_to_mapt_half_life_ratio"]) > 3.0

    af_fb = evaluate_gsi_alphafold_disorder_interpro_and_proteolysis(tmp_path)
    assert af_fb["clean_checkout_fallback"] is True

    traj = evaluate_gsi_mimic_iv_dynamic_trajectory_sofa_mortality(REPO_ROOT)
    assert traj["clean_checkout_fallback"] is False
    assert float(traj["clinical_ruo_sports_weight"]) == 0.0
    assert int(traj["icu_stays_count"]) == 140
    assert int(traj["deaths_count"]) == 20
    assert float(traj["mortality_auroc"]) >= 0.80
    assert float(traj["mortality_brier"]) < 0.098
    assert float(traj["mortality_brier"]) < float(traj["base_prevalence_brier"])

    traj_fb = evaluate_gsi_mimic_iv_dynamic_trajectory_sofa_mortality(tmp_path)
    assert traj_fb["clean_checkout_fallback"] is True


def test_wave42_18sport_428_metrics_darts_markov_and_cycling_wbal(tmp_path: Path) -> None:
    """Verify 428-metric / 18-sport encyclopedia, Darts 501 Markov & Cycling Skiba W'-bal."""
    assert len(UNIVERSAL_SPORTS_METRICS_REGISTRY) == 284
    assert len({m.sport for m in UNIVERSAL_SPORTS_METRICS_REGISTRY}) == 10
    assert len(UNIVERSAL_14SPORT_METRICS_REGISTRY) == 356
    assert len({m.sport for m in UNIVERSAL_14SPORT_METRICS_REGISTRY}) == 14
    assert len(WAVE42_18SPORT_EXTENSION_METRICS) == 72
    assert len(UNIVERSAL_18SPORT_METRICS_REGISTRY) == 428
    assert len({m.sport for m in UNIVERSAL_18SPORT_METRICS_REGISTRY}) == 18

    suite_ms = evaluate_wave42_18sport_darts_and_cycling_suite(REPO_ROOT)
    probes = suite_ms["new_sport_probe_resolutions"]
    for q_txt, q_sport, probe_k in (
        ("sideout percentage", "VOLLEYBALL_HANDBALL", "volleyball_sideout"),
        ("7m penalty conversion", "VOLLEYBALL_HANDBALL", "handball_7m"),
        ("w prime balance", "TRACK_SWIMMING_CYCLING", "cycling_wbal"),
        ("three dart average", "DARTS_SNOOKER_TABLETENNIS", "darts_3da"),
        ("faceoff win percentage", "LACROSSE_AFL", "lax_faceoff"),
    ):
        res = query_18sport_universal_metric(q_txt, sport=q_sport, repo_root=REPO_ROOT)
        assert res["found"] is True
        assert res["metric_id"] == probes[probe_k]
        assert int(res["sports_covered_count"]) == 18
        assert int(res["total_registry_metrics"]) == 428

    darts = evaluate_darts_501_markov_leg_and_handicap()
    assert float(darts["pmf_total_mass"]) == pytest.approx(1.0, abs=1e-6)
    assert float(darts["visit_pmf_mass_a"]) == pytest.approx(1.0, abs=1e-6)
    assert float(darts["player_a_hold_of_throw_prob"]) > float(
        darts["player_a_break_of_throw_prob"]
    )
    assert 0.5 < float(darts["player_a_match_win_prob"]) < 1.0

    cyc = evaluate_cycling_skiba_wbal_and_climb_tt()
    assert float(cyc["time_saved_by_wbal_pacing_s"]) > 0.0
    assert float(cyc["optimal_variable_time_s"]) < float(cyc["iso_power_time_s"])
    assert float(cyc["min_w_bal_optimal_joules"]) >= 500.0

    ms_fb = evaluate_wave42_18sport_darts_and_cycling_suite(tmp_path)
    assert ms_fb["clean_checkout_fallback"] is True


def test_wave42_nfl_causal_pfr_qbr_total_shift_quarantine_and_ast(tmp_path: Path) -> None:
    """Verify causal W1-10 PFR advstats/QBR, total shift, 5 quarantined metrics & 8/8 AST."""
    causal = evaluate_causal_w42_pfr_advstats_and_qbr_features(as_of_week=10, repo_root=REPO_ROOT)
    assert causal["clean_checkout_fallback"] is False
    assert int(causal["max_prior_week_used"]) == 9
    quar = causal["quarantined_metrics_weights"]
    assert len(quar) == 5
    assert all(float(v) == 0.0 for v in quar.values())
    for tm in ("KC", "DEN", "CIN", "BUF", "LAR", "LA", "WAS", "WSH"):
        assert tm in causal["teams"]
        assert -1.0 <= float(causal["teams"][tm]["def_yac_umbrella_norm"]) <= 1.0
        assert -1.0 <= float(causal["teams"][tm]["rec_tipped_int_reversion_norm"]) <= 1.0
        assert -1.0 <= float(causal["teams"][tm]["qbr_sack_epa_preservation_norm"]) <= 1.0

    assert (
        evaluate_causal_w42_pfr_advstats_and_qbr_features(as_of_week=10, repo_root=tmp_path)[
            "clean_checkout_fallback"
        ]
        is True
    )

    tot = evaluate_causal_w42_game_total_accuracy_adot_shift(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert -1.65 <= float(tot["total_shift_pts"]) <= 1.65

    ast42 = evaluate_wave42_live_honest_ast_equations()
    assert int(ast42["parsed_evaluated_count"]) == 8
    assert ast42["zero_fabricated_bindings"] is True
    for eq in ast42["equations_evaluated"]:
        assert eq["status"] == "PARSED_EVALUATED"

    with pytest.raises(OperatorSimulationHoldError):
        evaluate_causal_w42_pfr_advstats_and_qbr_features(as_of_week=11, repo_root=REPO_ROOT)
    with pytest.raises(OperatorSimulationHoldError):
        evaluate_wave42_pfr_advstats_qbr_and_18sport_suite(as_of_week=11, repo_root=REPO_ROOT)


def test_wave42_cwd_invariance_warm_sla_and_stage2_3_wiring(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify CWD independence, <0.05s warm SLA & Stage-2/3 corpus/sim spine wiring."""
    monkeypatch.chdir(tmp_path)
    _ = evaluate_wave42_gsi_alphafold_interpro_and_trajectory_suite(repo_root=REPO_ROOT)
    _ = evaluate_wave42_18sport_darts_and_cycling_suite(REPO_ROOT)
    _ = evaluate_wave42_pfr_advstats_qbr_and_18sport_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )

    t0 = time.perf_counter()
    gsi_w = evaluate_wave42_gsi_alphafold_interpro_and_trajectory_suite(repo_root=REPO_ROOT)
    ms_w = evaluate_wave42_18sport_darts_and_cycling_suite(REPO_ROOT)
    trk_w = evaluate_wave42_pfr_advstats_qbr_and_18sport_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    assert (time.perf_counter() - t0) < 0.05
    assert gsi_w["wired"] is True
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
    assert verif["wave42_pfr_qbr_and_18sport_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 12.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave42_gsi_alphafold_and_18sport_coupled"]
        is True
    )


def test_wave42_ablation_beats_w41_rlvr_352_and_hygiene() -> None:
    """Verify OOS gains over Wave 41, 328+24=352 RLVR & strict pure-ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0298
    assert float(m["raw_gse_v41_margin_crps"]) < 6.9316
    assert float(m["gse_v41_margin_mae"]) < 9.6800
    assert float(m["gse_v41_total_mae"]) < 10.4024
    assert float(m["gse_v41_total_mae"]) < float(m["closing_market_total_mae"])
    assert float(m["gse_v41_brier"]) < 0.21934
    assert float(m["overall_ece"]) < 0.07047
    assert float(w26["rliable_iqm"]) > 0.732818
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench42 = run_wave42_gsi_alphafold_and_18sport_benchmark(REPO_ROOT, write_artifact=False)
    assert bench42["real_money_stake_cleared"] is False
    assert float(bench42["live_stake_fraction"]) == 0.0
    assert float(bench42["clinical_ruo_sports_weight"]) == 0.0
    assert len(bench42["benchmark_sha256"]) == 64

    assert len(WAVE42_GSI_RLVR_TRAJECTORIES) == 3
    assert len(WAVE42_MULTISPORT_RLVR_TRAJECTORIES) == 3
    assert len(WAVE42_TRACKING_RLVR_TRAJECTORIES) == 6
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 328
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 328
        for ln in lines:
            rec: dict[str, Any] = json.loads(ln)
            joined = f"{rec['prompt']} {rec['think']} {json.dumps(rec['ground_truth'])}"
            assert _FORBIDDEN_ODDS_RE.search(joined) is None, rec["record_id"]

    standalone = REPO_ROOT / "brain/feeds/2026-11-17/aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    standalone_n = len(
        [ln for ln in standalone.read_text(encoding="ascii").splitlines() if ln.strip()]
    )
    assert int(rlvr["records_compiled"]) + standalone_n >= 352

    hygiene_paths = (
        REPO_ROOT
        / "data"
        / "science"
        / "alphafold_interpro_gsi_structural_disorder_atlas_2026.json",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave42_gsi_alphafold_interpro_proteolysis_and_icu_trajectory_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "multisport"
        / "wave42_darts_markov_cycling_wbal_and_18sport_expansion.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave42_pfr_advstats_qbr_two_high_yac_and_total_pace_engine.py",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-18"
        / (
            "deep-research-wave42-gsi-alphafold-interpro-icu-trajectory"
            "-18sport-darts-cycling-and-nfl-pfr-qbr-engine.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
