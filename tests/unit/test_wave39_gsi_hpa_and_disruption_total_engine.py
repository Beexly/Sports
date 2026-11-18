"""Wave 39 unit tests: GSI HPA Proteomics + Chronic SOFA & GSE Disruption, Total MAE & 3-Yr FTN."""

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
    CLINICAL_RUO_HPA_SPORTS_WEIGHT,
    WAVE39_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_hpa_proteomics_and_gtex_concordance,
    evaluate_gsi_mimic_iv_chronic_elixhauser_sofa_mortality,
    evaluate_wave39_gsi_hpa_and_chronic_sofa_suite,
)
from gse_engine.tracking import (
    WAVE39_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w39_disruption_drops_and_total_features,
    evaluate_causal_w39_game_total_environmental_shift,
    evaluate_longitudinal_3yr_ftn_and_2025_baseline_vaults,
    evaluate_wave39_disruption_total_and_3yr_ftn_suite,
    evaluate_wave39_live_honest_ast_equations,
    run_wave39_gsi_hpa_and_disruption_total_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_gsi_hpa_proteomics_and_chronic_elixhauser_sofa(tmp_path: Path) -> None:
    """Verify HPA IHC/organelle localization, leakage ODE & chronic Elixhauser SOFA AUROC."""
    hpa = evaluate_gsi_hpa_proteomics_and_gtex_concordance(REPO_ROOT)
    assert hpa["clean_checkout_fallback"] is False
    assert hpa["adr0003_rule_in_only_doctrine"] is True
    assert float(hpa["clinical_ruo_sports_weight"]) == 0.0
    assert CLINICAL_RUO_HPA_SPORTS_WEIGHT == 0.0
    assert int(hpa["proteins_count"]) == 9
    assert int(hpa["ihc_tissue_records_count"]) == 35
    assert float(hpa["tnni3_cardiac_ihc_ordinal"]) == 3.0
    assert float(hpa["tnni3_skeletal_ihc_ordinal"]) == 0.0
    assert float(hpa["gfap_cerebellum_ihc_ordinal"]) == 3.0
    assert hpa["col1a1_skeletal_stroma_discordance"] is True
    assert float(hpa["steady_state_ckm_to_tnni3_clearance_ratio"]) >= 50.0

    hpa_fb = evaluate_gsi_hpa_proteomics_and_gtex_concordance(tmp_path)
    assert hpa_fb["clean_checkout_fallback"] is True
    assert int(hpa_fb["proteins_count"]) == 0
    assert float(hpa_fb["clinical_ruo_sports_weight"]) == 0.0

    sofa = evaluate_gsi_mimic_iv_chronic_elixhauser_sofa_mortality(REPO_ROOT)
    assert sofa["clean_checkout_fallback"] is False
    assert float(sofa["clinical_ruo_sports_weight"]) == 0.0
    assert int(sofa["icu_stays_count"]) == 140
    assert int(sofa["deaths_count"]) == 20
    assert float(sofa["non_survivor_mean_composite"]) > float(sofa["survivor_mean_composite"])
    assert float(sofa["mortality_auroc"]) >= 0.78
    assert float(sofa["mortality_brier"]) <= 0.106
    assert float(sofa["mortality_brier"]) < float(sofa["base_prevalence_brier"])

    sofa_fb = evaluate_gsi_mimic_iv_chronic_elixhauser_sofa_mortality(tmp_path)
    assert sofa_fb["clean_checkout_fallback"] is True
    assert int(sofa_fb["icu_stays_count"]) == 0


def test_gse_3yr_ftn_disruption_drops_total_shift_and_ast() -> None:
    """Verify 3-yr FTN (120k+), 2025 vaults, causal W1-10 disruption & 6/6 live ASTs."""
    v39 = evaluate_longitudinal_3yr_ftn_and_2025_baseline_vaults(REPO_ROOT)
    assert v39["clean_checkout_fallback"] is False
    assert int(v39["ftn_2024_rows"]) >= 45000
    assert int(v39["ftn_2025_rows"]) >= 45000
    assert int(v39["ftn_2026_w1_w10_rows"]) >= 25000
    assert int(v39["ftn_3yr_combined_rows"]) >= 115000
    assert int(v39["stats_player_week_2025_rows"]) >= 18000
    assert int(v39["stats_team_week_2025_rows"]) >= 500
    assert int(v39["snap_counts_2025_rows"]) >= 25000

    causal = evaluate_causal_w39_disruption_drops_and_total_features(
        as_of_week=10, repo_root=REPO_ROOT
    )
    assert causal["clean_checkout_fallback"] is False
    assert int(causal["max_week_loaded"]) == 10
    quar = causal["quarantined_close_overpriced_signals"]
    assert len(quar) == 4
    assert all(float(v) == 0.0 for v in quar.values())
    for tm in ("KC", "DEN", "CIN", "BUF", "WSH"):
        assert tm in causal["teams"]
        assert -1.0 <= float(causal["teams"][tm]["def_hurry_hit_per_game_norm"]) <= 1.0

    tot_in = evaluate_causal_w39_game_total_environmental_shift(
        away_team="ARI", home_team="DET", as_of_week=10, is_indoor=True, repo_root=REPO_ROOT
    )
    assert float(tot_in["total_shift_pts"]) == 0.0
    tot_out = evaluate_causal_w39_game_total_environmental_shift(
        away_team="BAL", home_team="CLE", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert -2.0 <= float(tot_out["total_shift_pts"]) <= 2.0

    ast39 = evaluate_wave39_live_honest_ast_equations()
    assert int(ast39["parsed_evaluated_count"]) == 6
    assert ast39["zero_fabricated_bindings"] is True
    for eq in ast39["equations_evaluated"]:
        assert eq["status"] == "PARSED_EVALUATED"


def test_wave39_cwd_invariance_warm_sla_spine_wiring_and_wk11_hold(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify CWD independence, <0.05s warm SLA, Stage-2/3 wiring & Week 11 hold."""
    monkeypatch.chdir(tmp_path)
    _ = evaluate_wave39_gsi_hpa_and_chronic_sofa_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    _ = evaluate_wave39_disruption_total_and_3yr_ftn_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )

    t0 = time.perf_counter()
    g_w = evaluate_wave39_gsi_hpa_and_chronic_sofa_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    m_w = evaluate_wave39_disruption_total_and_3yr_ftn_suite(
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
    assert verif["wave39_gsi_hpa_and_disruption_total_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 20.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave39_gsi_hpa_and_disruption_total_coupled"]
        is True
    )

    with pytest.raises(OperatorSimulationHoldError):
        run_all_sports_unified_situational_simulation_suite(
            n_worlds=100, seed=20261117, nfl_historical_week=11
        )


def test_wave39_ablation_beats_close_total_mae_rlvr_316_and_hygiene() -> None:
    """Verify Total MAE < close + OOS gains over Wave 38, 292+24 RLVR & ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0565
    assert float(m["gse_v41_margin_mae"]) <= 9.7232
    assert float(m["gse_v41_total_mae"]) < float(m["closing_market_total_mae"])
    assert float(m["gse_v41_brier"]) <= 0.21953
    assert float(m["overall_ece"]) < 0.07066
    assert float(w26["fwl_partial_slope"]) > 1.4340
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench39 = run_wave39_gsi_hpa_and_disruption_total_benchmark(REPO_ROOT, write_artifact=False)
    assert bench39["real_money_stake_cleared"] is False
    assert float(bench39["live_stake_fraction"]) == 0.0
    assert len(bench39["benchmark_sha256"]) == 64

    assert len(WAVE39_GSI_RLVR_TRAJECTORIES) == 3
    assert len(WAVE39_TRACKING_RLVR_TRAJECTORIES) == 7
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 292
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 292
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
    assert int(rlvr["records_compiled"]) + standalone_n >= 316

    hygiene_paths = (
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave39_gsi_hpa_proteomics_mrna_concordance_and_chronic_sofa_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave39_pass_rush_disruption_drops_total_kickoff_and_3yr_ftn_engine.py",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-17"
        / (
            "deep-research-wave39-gsi-hpa-proteomics-chronic-sofa"
            "-and-gse-disruption-total-mae-engine.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
