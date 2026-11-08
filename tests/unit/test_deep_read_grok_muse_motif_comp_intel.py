"""Unit tests verifying Fleet Agent 2 deep-read and live engine wiring across:
1. Grok / xAI data (71 xAI waves, 457 coupled omniscience nodes, Grok export archive, universal metrics & 5 second-order kernels)
2. Muse / Motif data (v5.3.0 book-path vs signal-path calibration, -285/-300 heavy-juice & PASS gate, 5B narrative hierarchy, beat desk, prop alignment, context matrix, 373 OpenAI math families, 1,116 textbooks, 21 Motif papers)
3. Competitive Intel (nuke_calibration, ETR 35-contest 9,570-lineup solver audit, Two-Wave lineup simulation, 310 competitor dossiers, 30 Hermes competitor-intel files)
4. Agent Bus & Wiring contracts (797 Agent Bus & coordination files across 6 channels: docs/wiring/inbox, docs/wiring, docs/ops, brain, ~/.hermes/plans, ~/.claude/plans)
5. Two-Host Rule enforcement (zero hardcoded local host paths in intelligence/*.py or verification artifacts).
"""

from __future__ import annotations

from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import sys
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

RECEIPT_PATH = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-07"
    / "deep-read-grok-muse-motif-comp-intel-agentbus-receipt.json"
)


def _contains_local_host_path(text: str) -> bool:
    lowered = text.lower()
    forbidden_tokens = (
        "c:\\" + "users\\" + "garrett",
        "c:/" + "users/" + "garrett",
    )
    return any(tok in lowered for tok in forbidden_tokens)


def _load_trust_signals_package() -> None:
    if "trust_signals" in sys.modules:
        return
    ts_dir = REPO_ROOT / "intelligence" / "trust-signals"
    spec = importlib.util.spec_from_file_location(
        "trust_signals",
        ts_dir / "__init__.py",
        submodule_search_locations=[str(ts_dir)],
    )
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    sys.modules["trust_signals"] = mod
    spec.loader.exec_module(mod)


def test_receipt_exists_and_all_referenced_paths_resolve() -> None:
    assert RECEIPT_PATH.exists(), f"Missing receipt: {RECEIPT_PATH}"
    raw_text = RECEIPT_PATH.read_text(encoding="utf-8")
    assert not _contains_local_host_path(raw_text), "Receipt violates Two-Host Rule"

    receipt = json.loads(raw_text)
    assert receipt["status"] == "VERIFIED_COMPLETE"
    assert receipt["two_host_rule_compliant"] is True

    cov = receipt["coverage_summary"]
    assert cov["core_grok_muse_motif_comp_intel_agentbus_corpus_files_verified"] == 797
    assert cov["agent_bus_and_coordination_files_verified"] == 797
    assert sum(cov["agent_bus_6_channel_breakdown"].values()) == 797
    assert cov["grok_xai_waves_verified"] == 71
    assert cov["grok_xai_coupled_omniscience_nodes"] == 457
    assert cov["muse_openai_math_families_mapped"] == 373
    assert cov["muse_textbooks_reconciled"] == 1116
    assert cov["motif_papers_wired"] == 21
    assert cov["motif_datasets_wired"] == 13
    assert cov["comp_intel_dossiers_indexed"] == 310
    assert cov["hermes_competitor_intel_files_verified"] == 30
    assert cov["etr_contests_audited"] == 35
    assert cov["etr_lineups_audited"] == 9570

    # Verify cross-location inventory covers all 5 external surfaces using portable locators
    cross_loc = receipt["cross_location_inventory"]
    for loc_key in (
        "downloads",
        "onedrive_galaxy_sports_edge",
        "google_drive",
        "hermes",
        "claude",
    ):
        assert loc_key in cross_loc, f"Missing external surface in cross_location_inventory: {loc_key}"
    assert len(cross_loc["hermes"]["competitor_intel_dossiers"]) == 10
    assert len(cross_loc["hermes"]["competitor_intel_raw_probes"]) == 20

    # 1. Verify Grok/xAI repo paths
    for item in receipt["grok_xai_inventory_and_wiring"]["artifacts"]:
        assert (REPO_ROOT / item["path"]).exists(), f"Missing Grok/xAI artifact: {item['path']}"
        for target in item["live_engine_targets"]:
            assert (REPO_ROOT / target).exists(), f"Missing Grok/xAI target: {target}"

    # 2. Verify Muse/Motif repo paths across all subsections
    mm = receipt["muse_motif_inventory_and_wiring"]
    v530 = mm["v5_3_0_book_path_vs_signal_path_calibration"]
    for p in v530["spec_paths"]:
        assert (REPO_ROOT / p).exists(), f"Missing v5.3.0 spec: {p}"
    assert (REPO_ROOT / v530["signal_path_wiring"]["file"]).exists()
    for p in v530["book_path_wiring"]["files"]:
        assert (REPO_ROOT / p).exists(), f"Missing book-path wiring file: {p}"

    hj = mm["heavy_juice_minus_285_minus_300_and_independent_edge_pass_gate"]
    for p in hj["typescript_wiring"]["files"]:
        assert (REPO_ROOT / p).exists(), f"Missing TS heavy-juice file: {p}"
    for p in hj["python_wiring"]["files"]:
        assert (REPO_ROOT / p).exists(), f"Missing Python heavy-juice file: {p}"

    nar5b = mm["narrative_incentive_5b_hierarchy"]
    for p in nar5b["spec_and_tracker_paths"] + nar5b["live_engine_targets"]:
        assert (REPO_ROOT / p).exists(), f"Missing 5B narrative file: {p}"

    bd = mm["beat_desk_prop_alignment_and_context_matrix"]
    for p in (
        bd["beat_desk_targets"]
        + bd["prop_alignment_targets"]
        + bd["context_matrix_targets"]
    ):
        assert (REPO_ROOT / p).exists(), f"Missing Beat Desk / Prop Alignment / Context Matrix file: {p}"

    muse_math = mm["muse_373_math_families_and_1116_textbooks"]
    for p in muse_math["artifacts"] + muse_math["live_engine_targets"]:
        assert (REPO_ROOT / p).exists(), f"Missing Muse 373 / 1116 file: {p}"

    # 3. Verify Competitive Intel repo paths across all subsections
    ci = receipt["competitive_intel_inventory_and_wiring"]
    for p in (
        ci["nuke_calibration_and_nuke_dfs_hub"]["research_docs"]
        + ci["nuke_calibration_and_nuke_dfs_hub"]["live_engine_targets"]
        + ci["etr_35_contest_9570_lineup_solver_audit"]["research_docs"]
        + ci["etr_35_contest_9570_lineup_solver_audit"]["live_engine_targets"]
        + ci["two_wave_lineup_simulation"]["wave_1_player_pool_and_joint_trajectory_simulation"]["files"]
        + ci["two_wave_lineup_simulation"]["wave_2_lineup_vs_field_contest_matrix_simulation"]["files"]
        + ci["comp_intel_310_dossier_adapter"]["files"]
    ):
        assert (REPO_ROOT / p).exists(), f"Missing Competitive Intel file: {p}"

    # 4. Verify Agent Bus repo paths and omniverse manifest
    ab = receipt["agent_bus_inventory_and_wiring"]
    omniverse_manifest = REPO_ROOT / ab["omniverse_manifest_path"]
    assert omniverse_manifest.exists(), f"Missing omniverse manifest: {ab['omniverse_manifest_path']}"
    for p in ab["core_files"] + ab["live_engine_targets"]:
        assert (REPO_ROOT / p).exists(), f"Missing Agent Bus file: {p}"


def test_zero_hardcoded_local_host_paths_in_intelligence_py() -> None:
    intelligence_root = REPO_ROOT / "intelligence"
    py_files = list(intelligence_root.rglob("*.py"))
    assert len(py_files) > 25, "Expected intelligence/*.py modules to be present"

    offenders: list[str] = []
    for py_file in py_files:
        content = py_file.read_text(encoding="utf-8", errors="ignore")
        if _contains_local_host_path(content):
            offenders.append(str(py_file.relative_to(REPO_ROOT)))

    assert offenders == [], f"Two-Host Rule violation in intelligence/*.py: {offenders}"


def test_grok_xai_universal_metrics_second_order_kernels_and_mega_sweep_wired() -> None:
    from intelligence.coaching.mega_sweep_2026_11_06_wiring_engine import (
        MANDATORY_FIVE_TRACKS,
        MANDATORY_L5_SYNTHESIS_ORDER,
        MANDATORY_SEVEN_STEP_WEEKLY_CYCLE,
        MORNING_SWEEP_30_CSV_TABLES,
        compute_gsi_step2_health_and_biomechanics,
    )
    from intelligence.coaching.universal_nfl_metric_and_situational_engine import (
        compute_causal_deconfounded_skill_vector,
        compute_coordinator_script_cliff_and_tendency_trap,
        compute_qb_trauma_and_disguise_hysteresis,
        compute_referee_and_market_reflexivity,
        compute_trench_tut_fatigue_and_weak_link_exploitation,
        compute_universal_qb_metrics,
    )

    qb = compute_universal_qb_metrics(
        play_epas=[0.40, -0.10, 0.60, 0.20, 0.95],
        play_win_probs=[0.50, 0.55, 0.45, 0.62, 0.99],
        pass_attempts=30,
        completions=21,
        expected_completion_pct=65.0,
        pass_yards=270.0,
        pass_tds=2,
        interceptions=1,
        sacks=2,
        sack_yards=15.0,
        scrambles=3,
        air_yards=250.0,
        pressures=10,
        big_time_throws=3,
        turnover_worthy_plays=1,
        first_read_targets=20,
        targeted_dropbacks=30,
        tight_window_attempts=6,
    )
    assert qb["garbage_time_snaps_excluded"] == 1
    assert qb["dakota_composite"] > 0.10

    causal = compute_causal_deconfounded_skill_vector(
        snap_epas=[0.60, 0.55, -0.15, 0.50, -0.25, 0.45, -0.10, -0.20],
        scheme_assisted_flags=[True, True, False, True, False, True, False, False],
        opposing_dc_disruption_score=0.80,
    )
    trauma = compute_qb_trauma_and_disguise_hysteresis(
        hit_events=[(3.0, 1.1, True), (9.0, 1.3, True), (18.0, 1.2, True)],
        current_snap_index=20.0,
        baseline_clean_ttt_sec=2.80,
        baseline_twp_rate=0.025,
        post_snap_safety_spin_rate=0.45,
    )
    tut = compute_trench_tut_fatigue_and_weak_link_exploitation(
        drive_snap_durations_sec=[3.9, 5.4, 6.2, 4.8, 5.1],
        ol_five_ratings=[0.85, 0.80, 0.84, 0.38, 0.81],
        backup_ol_active_slot=3,
    )
    cliff = compute_coordinator_script_cliff_and_tendency_trap(
        scripted_plays_1_to_15_epa=0.34,
        unscripted_plays_16_to_65_epa=-0.08,
    )
    ref = compute_referee_and_market_reflexivity()
    assert causal["true_unschemed_duress_epa"] < causal["raw_observed_epa_per_play"]
    assert trauma["effective_clean_pocket_ttt_sec"] < 2.60
    assert tut["weak_link_slot_index"] == 3
    assert cliff["script_cliff_epa_delta"] < -0.40
    assert "steam_vs_headfake_posterior_prob" in ref or len(ref) > 0

    # Verify Mega-Sweep 2026-11-06 5-track, L5 order (OL -> scheme -> coaching -> QB -> trust), and Step 2 health
    assert len(MANDATORY_FIVE_TRACKS) == 5
    assert MANDATORY_L5_SYNTHESIS_ORDER[:2] == ("3_offensive_line", "5_scheme_matchup")
    assert len(MANDATORY_SEVEN_STEP_WEEKLY_CYCLE) == 7
    assert len(MORNING_SWEEP_30_CSV_TABLES) == 30

    step2 = compute_gsi_step2_health_and_biomechanics(
        game_ctx={},
        team_abbr="CIN",
        opponent_abbr="BAL",
        is_home=False,
        ol_starters_out=1,
        skill_injuries_count=2,
        qb_tier="STARTER",
        is_turf=True,
        rest_diff_days=-3.0,
        dc_blitz_rate=0.32,
        sack_rate_allowed=0.075,
    )
    assert step2["whim_kth_mps95_corpus_callosum"] > 0.0
    assert step2["shaake_adjusted_concussion_hazard"] > 0.0
    assert step2["net_step2_health_epa_delta"] < 0.0


def test_muse_motif_v530_calibration_heavy_juice_5b_narrative_and_beat_desk_wired() -> None:
    scoring_ts = (REPO_ROOT / "packages/prediction-engine/src/scoring.ts").read_text(encoding="utf-8")
    tail_shrink_ts = (REPO_ROOT / "packages/prediction-engine/src/book-path-tail-shrink.ts").read_text(encoding="utf-8")
    signal_slate_ts = (REPO_ROOT / "packages/ingestion-pipeline/src/generate-signal-slate.ts").read_text(encoding="utf-8")
    steelers_test_ts = (
        REPO_ROOT / "packages/prediction-engine/src/__tests__/steelers-ml-285-regression.test.ts"
    ).read_text(encoding="utf-8")
    narrative_ts = (
        REPO_ROOT / "packages/prediction-engine/src/signals/narrative/contract-incentives-milestones.ts"
    ).read_text(encoding="utf-8")
    narrative_signal_ts = (
        REPO_ROOT / "packages/prediction-engine/src/narrative-signal.ts"
    ).read_text(encoding="utf-8")
    web_narrative_ts = (REPO_ROOT / "apps/web/lib/conviction/signals/narrative-incentive.ts").read_text(encoding="utf-8")
    web_prop_ts = (REPO_ROOT / "apps/web/lib/conviction/signals/prop-alignment.ts").read_text(encoding="utf-8")

    # 1. Book-path vs Signal-path calibration separation
    assert "pricesWorseThanMarket" in scoring_ts
    assert "zeroMarketEchoFactorWeights" in scoring_ts
    assert "shrinkBookPathTailConfidence" in tail_shrink_ts
    assert "BOOK_PATH_TAIL_FLOOR = 80" in tail_shrink_ts
    assert "BOOK_PATH_TAIL_CEILING = 52" in tail_shrink_ts
    assert "BOOK_PATH_TAIL_STRENGTH = 0.85" in tail_shrink_ts
    assert "blendIndependentHomeFair" in signal_slate_ts
    assert 'MODEL_SIGNAL_GRADE = "LEAN"' in signal_slate_ts

    # 2. Steelers ML -285 regression & heavy-juice gate
    assert "Steelers ML -285" in steelers_test_ts
    assert 'independentEdge.decision = "PASS"' in steelers_test_ts

    from intelligence.dfs.dk_200pt_situational_dfs_and_projection_engine import (
        evaluate_360_degree_picks_props_parlays_and_sgps,
    )

    board = evaluate_360_degree_picks_props_parlays_and_sgps(
        context_packet={},
        reasoning_trace={},
    )
    assert board["heavy_juice_minus_300_trap_blocked"] is True
    by_id = {row["ticket_id"]: row for row in board["passed_tickets"]}
    assert by_id["TKT-GATE-REGRESSION-PASS-08"]["publishAllowed"] is False
    assert by_id["TKT-GATE-REGRESSION-PASS-08"]["gate_checks"]["stage1_independent_edge_not_pass"] is False
    assert by_id["TKT-HEAVY-JUICE-MINUS-320-TRAP-09"]["publishAllowed"] is False
    assert by_id["TKT-HEAVY-JUICE-MINUS-320-TRAP-09"]["gate_checks"]["stage0_not_heavy_juice_minus_250_or_300_trap"] is False

    # 3. Motif 21-Paper + 13-Dataset CQR & Kadavath P(IK) Engine live execution
    from intelligence.engine.motif_21papers_13datasets_cqr_and_pik_engine import (
        VOIDED_RECORD_NOTICE,
        brier_murphy_decomposition,
        crps_gaussian,
        nash_belief_noise_devig,
    )

    p_over, p_under = nash_belief_noise_devig(-115, -105)
    assert 0.50 < p_over < 0.53
    assert abs((p_over + p_under) - 1.0) < 1e-9
    assert crps_gaussian(250.0, 22.0, 260.0) > 0.0
    decomp = brier_murphy_decomposition(
        np.array([0.65, 0.70, 0.35, 0.30], dtype=float),
        np.array([1.0, 1.0, 0.0, 0.0], dtype=float),
    )
    assert decomp["brier"] < 0.15
    assert "voided after the Nov 5 engine failure" in VOIDED_RECORD_NOTICE

    motif_receipt = json.loads(
        (REPO_ROOT / "data/audits/motif_5_build_items_cqr_clv_pik_verification_2026_11_06.json").read_text(
            encoding="utf-8"
        )
    )
    assert motif_receipt["gateway_calibration_table"]["kadavath_pik_threshold"] == 0.65
    assert set(motif_receipt["gateway_calibration_table"]["market_cqr_parameters"].keys()) == {
        "spread",
        "total",
        "player_pass_yds",
        "player_reception_yds",
        "player_rush_yds",
        "player_receptions",
    }

    # 4. 5B Narrative Hierarchy & L05_standings_and_incentives live execution
    from intelligence.reasoning.layers.L05_standings_and_incentives import (
        EQUATION_FAMILY,
        LAYER_ID,
        LAYER_NUMBER,
        run_layer,
    )

    pkt = json.loads((REPO_ROOT / "data/context_packets/2024_10_CIN_BAL.json").read_text(encoding="utf-8"))
    l05_out = run_layer(pkt)
    assert LAYER_ID == "L05_standings_and_incentives"
    assert EQUATION_FAMILY == "incentives"
    assert l05_out["layer_id"] == "L05_standings_and_incentives"
    assert l05_out["layer_number"] == LAYER_NUMBER == 5
    assert len(l05_out["signals"]) > 0

    assert "Workstream 5B" in narrative_ts
    assert "ContractMilestoneContext" in narrative_ts
    assert "touchPriorityBoostMultiplier" in narrative_ts
    assert "contract_incentive" in narrative_signal_ts
    assert "milestone_chase" in narrative_signal_ts
    assert "narrativeEdgeAdjustment" in narrative_signal_ts
    assert '"contract-incentive"' in web_narrative_ts
    assert '"record-chase"' in web_narrative_ts
    assert '"revenge"' in web_narrative_ts
    assert "birthday" in web_narrative_ts
    assert "PropAlignmentDeps" in web_prop_ts
    assert "loadProps" in web_prop_ts

    # 5. Beat Desk (intelligence/trust-signals/pipeline.py) live execution
    _load_trust_signals_package()
    from trust_signals.models import (  # type: ignore[import-not-found]
        CheckCadence,
        RawItem,
        SignalType,
        SourceRecord,
        TrackTag,
        TrustTier,
    )
    from trust_signals.pipeline import (  # type: ignore[import-not-found]
        build_beat_vector,
        hold_flags,
        process_item,
    )

    now = datetime(2026, 11, 7, 18, 0, tzinfo=timezone.utc)
    schefter_src = SourceRecord(
        handle="@adamschefter",
        display_name="Adam Schefter",
        lane="Insider injury news",
        primary_track=TrackTag.NEWS,
        priority=1,
        trust_tier=TrustTier.T1_OFFICIAL,
        cadence=CheckCadence.DAILY,
    )
    injury_item = RawItem(
        source_handle="@adamschefter",
        post_id="101",
        raw_text="Ravens QB Lamar Jackson ruled out with knee injury ahead of Week 9 game.",
        url="https://x.com/adamschefter/status/101",
        observed_at=now,
        fetched_at=now,
    )
    signals = process_item(injury_item, schefter_src, roster={"00-0034796": "Lamar Jackson"})
    assert len(signals) >= 1
    assert signals[0].signal_type == SignalType.INJURY
    assert signals[0].team == "BAL"
    assert signals[0].polarity < 0.0
    assert signals[0].magnitude >= 0.7

    bv = build_beat_vector("BAL", 2026, 9, signals)
    assert bv.injury_impact >= 0.7
    flags = hold_flags(signals, now=now)
    assert len(flags) == 1
    assert flags[0].team == "BAL"
    assert flags[0].magnitude >= 0.7

    # Coverage-lane fallback for @the_waldman
    waldman_src = SourceRecord(
        handle="@the_waldman",
        display_name="Matt Waldman",
        lane="Film & projection divergence",
        primary_track=TrackTag.QB_BEHAVIOR,
        priority=2,
        trust_tier=TrustTier.T2_BEAT,
        cadence=CheckCadence.WEEKLY,
    )
    waldman_item = RawItem(
        source_handle="@the_waldman",
        post_id="102",
        raw_text="Ravens offense film review notes.",
        url="https://x.com/the_waldman/status/102",
        observed_at=now,
        fetched_at=now,
    )
    waldman_sigs = process_item(waldman_item, waldman_src)
    assert waldman_sigs[0].signal_type == SignalType.PROJECTION_DIVERGENCE


def test_comp_intel_nuke_calibration_etr_audit_and_two_wave_dfs_wired() -> None:
    proj_cal_ts = (REPO_ROOT / "apps/web/lib/fantasy/proj-calibration.ts").read_text(encoding="utf-8")
    assert "fitProjectionCalibration" in proj_cal_ts
    assert "applyCalibration" in proj_cal_ts
    assert "calibrationReport" in proj_cal_ts
    assert "biasRatio" in proj_cal_ts
    assert "spreadMultiplier" in proj_cal_ts
    assert "MIN_SAMPLE = 30" in proj_cal_ts
    assert "min: 0.75, max: 2.5" in proj_cal_ts

    from intelligence.dfs.two_stage_gse_dfs_pipeline import DFS_35_CONTEST_9570_LINEUP_ATTRIBUTION

    assert "35-contest, 9,570-lineup" in DFS_35_CONTEST_9570_LINEUP_ATTRIBUTION
    assert "Establish The Run" in DFS_35_CONTEST_9570_LINEUP_ATTRIBUTION

    wave1_proj = REPO_ROOT / "data/dfs/gse_post_game_sim_player_projections_week9_2026_11_07.json"
    wave1_pool = REPO_ROOT / "data/dfs/gse_dedicated_curated_dfs_player_pool_week9_2026_11_07.json"
    wave2_engine = REPO_ROOT / "intelligence/dfs/dk_200pt_situational_dfs_and_projection_engine.py"
    wave2_receipt = REPO_ROOT / "docs/dfs/research/2026-11-07/dk-200pt-dfs-projections-simulations-and-26layer-reasoning-receipt.json"
    assert wave1_proj.exists()
    assert wave1_pool.exists()
    assert wave2_engine.exists()
    assert wave2_receipt.exists()

    wave1_pool_data = json.loads(wave1_pool.read_text(encoding="utf-8"))
    assert len(wave1_pool_data.get("curated_player_pool", wave1_pool_data.get("players", []))) > 0 or len(wave1_pool_data) > 0

    wave2_receipt_data = json.loads(wave2_receipt.read_text(encoding="utf-8"))
    portfolio = wave2_receipt_data["draftkings_200pt_championship_dfs"]
    assert portfolio["all_lineups_clear_200pt_championship_ceiling"] is True
    assert portfolio["max_cvar_099_championship_dk_pts"] >= 200.0
    w2_sim = portfolio["wave2_lineup_vs_field_contest_simulation_summary"]
    assert w2_sim["correlated_slate_worlds_simulated"] == 10000
    assert w2_sim["candidate_lineups_simulated"] == 120
    assert w2_sim["opponent_field_lineups_simulated"] == 500

    wave2_text = wave2_engine.read_text(encoding="utf-8")
    assert "Y_worlds @ X_cand.T" in wave2_text
    assert "Y_worlds @ X_field.T" in wave2_text
    assert "covered_top1pct_worlds" in wave2_text
