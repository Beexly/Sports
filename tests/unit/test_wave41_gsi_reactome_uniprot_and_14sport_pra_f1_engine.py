"""Wave 41 unit tests: GSI Reactome/UniProt Kinetics, 14-Sport F1/NBA PRA & NFL Engine."""

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
    UNIVERSAL_14SPORT_METRICS_REGISTRY,
    UNIVERSAL_SPORTS_METRICS_REGISTRY,
    WAVE41_14SPORT_EXTENSION_METRICS,
    WAVE41_MULTISPORT_RLVR_TRAJECTORIES,
    evaluate_f1_stint_degradation_and_undercut_window,
    evaluate_nba_pra_negbin_copula_propsim,
    evaluate_wave41_14sport_and_copula_propsim_suite,
    query_14sport_universal_metric,
)
from gse_engine.observability.walk_forward_ablation import (
    run_weeks1_to_10_walk_forward_ablation,
)
from gse_engine.science import (
    CLINICAL_RUO_REACTOME_UNIPROT_SPORTS_WEIGHT,
    WAVE41_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_mimic_iv_prolonged_icu_los_and_triage,
    evaluate_gsi_reactome_pathways_and_uniprot_stokes_einstein,
    evaluate_wave41_gsi_reactome_uniprot_and_icu_los_suite,
)
from gse_engine.tracking import (
    WAVE41_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w41_pocket_security_and_kr_features,
    evaluate_wave41_live_honest_ast_equations,
    evaluate_wave41_pocket_security_kr_and_14sport_suite,
    run_wave41_gsi_reactome_and_14sport_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_wave41_gsi_reactome_uniprot_stokes_einstein_and_icu_los(tmp_path: Path) -> None:
    """Verify Reactome v98 pathways, UniProt Stokes-Einstein monotonicity & MIMIC first-24h LOS."""
    assert CLINICAL_RUO_REACTOME_UNIPROT_SPORTS_WEIGHT == 0.0

    ru = evaluate_gsi_reactome_pathways_and_uniprot_stokes_einstein(REPO_ROOT)
    assert ru["clean_checkout_fallback"] is False
    assert float(ru["clinical_ruo_sports_weight"]) == 0.0
    assert ru["reactome_database_version"] == "98"
    assert int(ru["identifiers_not_found"]) == 0
    assert int(ru["reactome_pathways_found_total"]) == 178
    assert int(ru["uniprot_proteins_count"]) == 9
    assert ru["diffusivity_strictly_monotone"] is True
    assert float(ru["tnni3_over_col5a1_diffusivity_ratio"]) > 1.9
    assert float(ru["mitf_metabolism_fdr"]) < 0.05

    ru_fb = evaluate_gsi_reactome_pathways_and_uniprot_stokes_einstein(tmp_path)
    assert ru_fb["clean_checkout_fallback"] is True

    los = evaluate_gsi_mimic_iv_prolonged_icu_los_and_triage(REPO_ROOT)
    assert los["clean_checkout_fallback"] is False
    assert float(los["clinical_ruo_sports_weight"]) == 0.0
    assert int(los["icu_stays_count"]) == 140
    assert int(los["prolonged_los_ge_4d_count"]) == 41
    assert float(los["prolonged_los_auroc"]) >= 0.74
    assert float(los["prolonged_los_brier"]) < float(los["base_prevalence_brier"])

    los_fb = evaluate_gsi_mimic_iv_prolonged_icu_los_and_triage(tmp_path)
    assert los_fb["clean_checkout_fallback"] is True


def test_wave41_14sport_encyclopedia_f1_undercut_and_nba_pra_copula(tmp_path: Path) -> None:
    """Verify 356-metric / 14-sport encyclopedia, F1 undercut & NBA PRA Student-t copula."""
    assert len(UNIVERSAL_SPORTS_METRICS_REGISTRY) == 284
    assert len({m.sport for m in UNIVERSAL_SPORTS_METRICS_REGISTRY}) == 10
    assert len(WAVE41_14SPORT_EXTENSION_METRICS) == 72
    assert len(UNIVERSAL_14SPORT_METRICS_REGISTRY) == 356
    assert len({m.sport for m in UNIVERSAL_14SPORT_METRICS_REGISTRY}) == 14

    for q_txt, q_sport, exp_id in (
        ("undercut delta", "MOTORSPORTS", "f1_undercut_pit_delta_s"),
        ("jabs landed", "BOXING", "boxing_jabs_landed_per_round"),
        ("kast", "ESPORTS", "esports_kast_pct"),
        ("net run rate", "CRICKET_RUGBY", "cricket_net_run_rate"),
        ("ruck speed", "CRICKET_RUGBY", "rugby_ruck_speed_sec"),
    ):
        res = query_14sport_universal_metric(q_txt, sport=q_sport, repo_root=REPO_ROOT)
        assert res["found"] is True
        assert res["metric_id"] == exp_id
        assert int(res["sports_covered_count"]) == 14

    f1 = evaluate_f1_stint_degradation_and_undercut_window()
    assert float(f1["fresh_rubber_lap_s"]) < float(f1["fuel_corrected_cur_lap_s"])
    assert int(f1["optimal_stint_pit_lap"]) > 10
    assert 0.0 < float(f1["undercut_overtake_prob"]) < 1.0

    pra = evaluate_nba_pra_negbin_copula_propsim()
    assert pra["copula_family"] == "student_t_df5_negbin"
    assert int(pra["copula_df"]) == 5
    assert float(pra["pts_variance_to_mean_ratio"]) > 1.0
    assert float(pra["empirical_corr_pts_ast"]) > 0.20
    assert 0.0 < float(pra["p_over_copula"]) < 1.0

    ms_fb = evaluate_wave41_14sport_and_copula_propsim_suite(tmp_path)
    assert ms_fb["clean_checkout_fallback"] is True


def test_wave41_nfl_causal_pocket_security_kr_quarantine_and_ast(tmp_path: Path) -> None:
    """Verify causal W1-10 stats_team_week, 5 quarantined metrics, 8/8 AST & W11+ hold."""
    causal = evaluate_causal_w41_pocket_security_and_kr_features(as_of_week=10, repo_root=REPO_ROOT)
    assert causal["clean_checkout_fallback"] is False
    assert int(causal["max_prior_week_used"]) == 9
    quar = causal["quarantined_box_weights"]
    assert len(quar) == 5
    assert all(float(v) == 0.0 for v in quar.values())
    for tm in ("KC", "DEN", "CIN", "BUF", "WAS", "WSH"):
        assert tm in causal["teams"]
        assert -1.0 <= float(causal["teams"][tm]["def_int_rate_norm"]) <= 1.0
        assert -1.0 <= float(causal["teams"][tm]["kickoff_return_fieldpos_norm"]) <= 1.0

    assert (
        evaluate_causal_w41_pocket_security_and_kr_features(as_of_week=10, repo_root=tmp_path)[
            "clean_checkout_fallback"
        ]
        is True
    )

    ast41 = evaluate_wave41_live_honest_ast_equations()
    assert int(ast41["parsed_evaluated_count"]) == 8
    assert ast41["zero_fabricated_bindings"] is True
    for eq in ast41["equations_evaluated"]:
        assert eq["status"] == "PARSED_EVALUATED"

    with pytest.raises(OperatorSimulationHoldError):
        evaluate_causal_w41_pocket_security_and_kr_features(as_of_week=11, repo_root=REPO_ROOT)
    with pytest.raises(OperatorSimulationHoldError):
        evaluate_wave41_pocket_security_kr_and_14sport_suite(as_of_week=11, repo_root=REPO_ROOT)


def test_wave41_cwd_invariance_warm_sla_and_stage2_3_wiring(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify CWD independence, <0.05s warm SLA & Stage-2/3 corpus/sim spine wiring."""
    monkeypatch.chdir(tmp_path)
    _ = evaluate_wave41_gsi_reactome_uniprot_and_icu_los_suite(repo_root=REPO_ROOT)
    _ = evaluate_wave41_14sport_and_copula_propsim_suite(REPO_ROOT)
    _ = evaluate_wave41_pocket_security_kr_and_14sport_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )

    t0 = time.perf_counter()
    gsi_w = evaluate_wave41_gsi_reactome_uniprot_and_icu_los_suite(repo_root=REPO_ROOT)
    ms_w = evaluate_wave41_14sport_and_copula_propsim_suite(REPO_ROOT)
    trk_w = evaluate_wave41_pocket_security_kr_and_14sport_suite(
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
    assert verif["wave41_pocket_security_and_14sport_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 12.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave41_gsi_reactome_and_14sport_coupled"]
        is True
    )


def test_wave41_ablation_beats_w40_rlvr_340_and_hygiene() -> None:
    """Verify OOS gains over Wave 40, 316+24=340 RLVR & strict pure-ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0402
    assert float(m["raw_gse_v41_margin_crps"]) < 6.9420
    assert float(m["gse_v41_margin_mae"]) < 9.6987
    assert float(m["gse_v41_total_mae"]) <= 10.4024
    assert float(m["gse_v41_total_mae"]) < float(m["closing_market_total_mae"])
    assert float(m["gse_v41_brier"]) <= 0.21942
    assert float(m["overall_ece"]) <= 0.07054
    assert float(w26["rliable_iqm"]) > 0.732431
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench41 = run_wave41_gsi_reactome_and_14sport_benchmark(REPO_ROOT, write_artifact=False)
    assert bench41["real_money_stake_cleared"] is False
    assert float(bench41["live_stake_fraction"]) == 0.0
    assert float(bench41["clinical_ruo_sports_weight"]) == 0.0
    assert len(bench41["benchmark_sha256"]) == 64

    assert len(WAVE41_GSI_RLVR_TRAJECTORIES) == 3
    assert len(WAVE41_MULTISPORT_RLVR_TRAJECTORIES) == 3
    assert len(WAVE41_TRACKING_RLVR_TRAJECTORIES) == 6
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 316
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 316
        for ln in lines:
            rec: dict[str, Any] = json.loads(ln)
            joined = f"{rec['prompt']} {rec['think']} {json.dumps(rec['ground_truth'])}"
            assert _FORBIDDEN_ODDS_RE.search(joined) is None, rec["record_id"]

    standalone = REPO_ROOT / "brain/feeds/2026-11-17/aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    standalone_n = len(
        [ln for ln in standalone.read_text(encoding="ascii").splitlines() if ln.strip()]
    )
    assert int(rlvr["records_compiled"]) + standalone_n >= 340

    hygiene_paths = (
        REPO_ROOT / "data" / "science" / "reactome_uniprot_gsi_pathway_and_mass_atlas_2026.json",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave41_gsi_reactome_pathway_uniprot_stokes_einstein_and_icu_los_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "multisport"
        / "wave41_f1_pit_strategy_nba_pra_copula_and_14sport_expansion.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave41_pocket_ball_security_kickoff_return_swarm_and_14sport_engine.py",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-18"
        / (
            "deep-research-wave41-gsi-reactome-uniprot-and-14sport"
            "-f1-nba-pra-pocket-security-engine.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
