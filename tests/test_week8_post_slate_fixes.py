"""Week 8 forensic replay. Imports the production functions and executes them.

Wired equation ids exercised here: EQ-NOV02-070 EQ-NOV02-075 EQ-NOV02-076.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
OPS = ROOT / "scripts" / "ops"
sys.path.insert(0, str(OPS))
sys.path.insert(0, str(ROOT))

from gse_coach_mind_simulator import (
    conserved_receiving_worlds,
    guard_duplicate_injury_reallocation,
    load_sealed_object_readonly,
    simulate_matchup_pbp,
)
from gse_injury_overlay_v2 import reallocate_injury_usage
from mind_guardian_daemon import guard_publication_override
from run_jev_10k_prop_boxscore_sampler import evaluate_prop_vector
from week8_forensic_kernels import (
    apply_zero_inflation_quantiles,
    block_inactive_player,
    can_override_gate_decision,
    compute_empirical_bayes_shrunk_projection,
    participation_hurdle_probability,
)
from run_full_dk_bitemporal_gpp import exposure_count_cap, solve_dk_slate
from pbp_conservation_coupling import (
    couple_conserved_pbp,
    degraded_jev_lineup_evaluation,
    live_jev_confidence,
    showdown_salary_floor,
)


def test_empirical_bayes_shrinks_small_sample_outliers():
    brissett = compute_empirical_bayes_shrunk_projection(
        20.18, 2, 11.0, snap_share=0.55, route_share=0.0, target_share=0.0,
    )
    assert brissett["shrunk_mean"] < 20.18
    assert brissett["shrunk_mean"] < 16.0
    assert brissett["weight"] < 0.5

    bateman_q = apply_zero_inflation_quantiles(
        {"p10": 4.2, "p25": 6.1, "p50": 8.4, "p85": 14.0, "p95": 18.0},
        target_share=0.08,
        participation_prob=participation_hurdle_probability(0.22, 0.40, 0.08),
    )
    assert bateman_q["p10"] == 0.0
    assert bateman_q["p50"] < 8.4


def test_ownership_penalty_crushes_fragile_chalk():
    slate = solve_dk_slate(
        [
            {"name": "Zay Flowers", "salary": 6300, "proj": 14.0, "q85": 18.0, "q25": 4.0, "ownership": 0.26, "fragility": 0.80, "gp": 7},
            {"name": "Jonathan Taylor", "salary": 9800, "proj": 22.0, "q85": 28.0, "q25": 16.0, "ownership": 0.18, "fragility": 0.12, "gp": 7, "anchor": True},
            {"name": "Jauan Jennings", "salary": 4500, "proj": 12.0, "q85": 18.0, "q25": 8.0, "ownership": 0.09, "fragility": 0.20, "gp": 6},
        ],
        "GPP_20MAX",
    )
    by_name = {p["name"]: p for p in slate["players"]}
    assert by_name["Zay Flowers"]["max_lineups"] <= 2
    assert by_name["Jonathan Taylor"]["max_lineups"] == exposure_count_cap("ANCHOR_BELLCOW", 20)
    assert by_name["Jauan Jennings"]["max_lineups"] == exposure_count_cap("LEVERAGE_CORE", 20)
    assert by_name["Jonathan Taylor"]["exposure_role"] == "ANCHOR_BELLCOW"
    assert by_name["Jauan Jennings"]["exposure_role"] == "LEVERAGE_CORE"


def test_pbp_conservation_exact():
    worlds = conserved_receiving_worlds(100)
    assert len(worlds["WR1"]) == 100
    for w in range(100):
        total = sum(worlds[k][w] for k in worlds)
        assert abs(total - (80 + (w % 17) * 3)) < 1e-4


def test_injury_reallocation_idempotent():
    shares = {"WR1": 0.4, "WR2": 0.35, "TE1": 0.25}
    usage = reallocate_injury_usage({}, shares, shares)
    assert usage["_injury_reallocation_applied"] is True
    with pytest.raises(RuntimeError, match="Duplicate injury reallocation detected"):
        reallocate_injury_usage(usage, shares, shares)
    with pytest.raises(RuntimeError, match="Duplicate injury reallocation detected"):
        guard_duplicate_injury_reallocation(usage)


def test_immutable_gate_blocks_311pm_sycophancy_reversal():
    ledger = {
        "game_id": "2026_08_DAL_DEN",
        "market_type": "TOTAL",
        "selection": "OVER",
        "line": 50.5,
        "model_prob": 0.46,
        "market_prob_devig": 0.51,
        "decision": "PASS",
    }
    user_pressure = {"line": 50.5, "market_prob_devig": 0.51, "user_text": "give the full bet card"}
    assert can_override_gate_decision(ledger, user_pressure) is False
    ind = {
        "game_id": "2026_08_IND",
        "market_type": "SPREAD",
        "selection": "IND -14.5",
        "line": -14.5,
        "model_prob": 0.41,
        "market_prob_devig": 0.48,
        "decision": "PASS",
    }
    assert can_override_gate_decision(ind, {"line": -14.5, "marketProbDevig": 0.48, "userText": "full card"}) is False
    moved = {
        "line": 52.5,
        "market_prob_devig": 0.51,
        "market_or_roster_delta_proof": {"verified": True},
    }
    assert can_override_gate_decision(ledger, moved) is True


def test_inactive_players_hard_blocked():
    for name in ("Richie James", "Isaiah Likely", "Trey Benson", "Jalen McMillan"):
        blocked = block_inactive_player(name, "Out", 0, projection=11.4)
        assert blocked["proj"] == 0.0
        assert blocked["publishAllowed"] is False
        assert blocked["reason"] == "BLOCKED_INACTIVE_OR_OUT_PLAYER"


def test_roster_identity_and_track4_kernels():
    from week8_forensic_kernels import (
        assert_2026_roster_identity_integrity,
        barber_weighted_conformal_interval,
        fourth_down_brill_summary,
        validate_pbp_structural_missingness,
    )
    assert_2026_roster_identity_integrity([{"name": "Geno Smith", "team": "NYJ"}])
    try:
        assert_2026_roster_identity_integrity([{"name": "Mike Evans", "team": "TB"}])
    except ValueError as exc:
        assert "stale roster identity" in str(exc)
    else:
        raise AssertionError("TB Evans must raise")
    validate_pbp_structural_missingness([
        {"game_id": "g", "drive": 1, "qtr": 1, "play_type": "run", "game_seconds_remaining": 3500},
        {"game_id": "g", "drive": 1, "qtr": 1, "play_type": "pass", "air_epa": 0.4, "game_seconds_remaining": 3480},
    ])
    try:
        validate_pbp_structural_missingness([
            {"game_id": "g", "drive": 1, "qtr": 1, "play_type": "run", "air_epa": 1.0, "game_seconds_remaining": 10},
        ])
    except ValueError as exc:
        assert "air_epa" in str(exc)
    else:
        raise AssertionError("run air_epa must raise")
    interval = barber_weighted_conformal_interval(10.0, 14.0, [-1.0, 0.0, 1.0, 2.0])
    assert interval["low"] < 10.0
    assert interval["high"] > 14.0
    summary = fourth_down_brill_summary([0.0, 0.01, 0.05])
    assert summary["reason"] == "OBSERVED"
    assert abs(summary["fourth_down_statistically_distinct_rate"] - (1 / 3)) < 1e-9
    empty = fourth_down_brill_summary([])
    assert empty["fourth_down_wp_gap_mean"] is None


def test_guardian_ledger_refuses_text_override(tmp_path):
    ledger = tmp_path / "gate_decision_ledger.jsonl"
    record = {
        "game_id": "2026_08_DAL_DEN",
        "market_type": "TOTAL",
        "selection": "OVER",
        "line": 50.5,
        "model_prob": 0.46,
        "market_prob_devig": 0.51,
        "raw_edge": -0.05,
        "decision": "PASS",
        "reason_codes": ["NO_EDGE"],
    }
    allowed = guard_publication_override(record, {"line": 50.5, "market_prob_devig": 0.51, "user_text": "give the full bet card"}, ledger)
    assert allowed is False
    assert ledger.is_file()
    assert "PASS" in ledger.read_text(encoding="utf-8")


def test_simulate_matchup_pbp_conserves_yards_and_tds_without_gaussian_loop():
    import os
    import numpy as np
    from week8_forensic_kernels import enforce_route_snap_participation_gate

    sealed_obj, digest = load_sealed_object_readonly("/opt/model/sealed_baseline.json")
    res = simulate_matchup_pbp("CAR", "GB", [], [], sealed_obj, digest, n_sims=64, seed=20261102, return_vectors=True)
    vecs = res["vectors"]
    assert "home_pass_tds" in vecs and "away_pass_tds" in vecs
    assert "home_wr1_tds" in vecs and "away_wr1_tds" in vecs
    assert np.all(vecs["home_wr1_yds"] <= vecs["home_pass_yds"] + 1e-6)
    assert np.all(vecs["home_wr1_tds"] <= vecs["home_pass_tds"] + 1e-6)
    assert res["fourth_down_wp_gap_mean"] is not None
    assert res["fourth_down_statistically_distinct_rate"] is not None
    assert res["fourth_down_reason"] == "OBSERVED"

    # Participation hurdle gate blocks low-route/low-snap depth players (e.g., Devontez Walker, Drew Sample)
    walker_gate = enforce_route_snap_participation_gate(route_share=0.0, snap_share=0.0)
    assert walker_gate["eligible"] is False
    assert walker_gate["decision"] == "PASS_LOW_PARTICIPATION"
    sample_gate = enforce_route_snap_participation_gate(route_share=0.22, snap_share=0.38)
    assert sample_gate["eligible"] is False
    starter_gate = enforce_route_snap_participation_gate(route_share=0.78, snap_share=0.82)
    assert starter_gate["eligible"] is True
    assert starter_gate["decision"] == "PLAY_ELIGIBLE"

    os.environ["ENABLE_BIOMECH_KINETIC_TRANSLATION_V1"] = "1"
    try:
        res_bio = simulate_matchup_pbp("CAR", "GB", [], [], sealed_obj, digest, n_sims=32, seed=20261102)
        assert "biomech_kinetic_overlay" in res_bio
        assert res_bio["biomech_kinetic_overlay"]["cleat_turf_slip"] > 0.0
    finally:
        os.environ.pop("ENABLE_BIOMECH_KINETIC_TRANSLATION_V1", None)


def test_evaluate_prop_vector_returns_platform_variance_and_quantiles():
    import numpy as np

    rng = np.random.default_rng(42)
    vec = rng.gamma(shape=3.0, scale=22.0, size=500)
    card = evaluate_prop_vector("GB", "Christian Watson", "WR1", "Receiving Yards", 58.5, vec)
    assert "platformVariance" in card and "platformVariances" in card
    assert "platformQuantiles" in card
    assert set(card["platformVariances"].keys()) == {"DK", "FD", "UD"}
    assert card["platformVariances"]["DK"] > card["platformVariances"]["FD"] > 0


def test_pbp_conservation_coupling_and_jev_degraded_and_showdown_floor():
    import numpy as np

    static_draws = np.array([18.0, 20.0, 22.0, 24.0], dtype=np.float64)
    pbp_draws = np.array([10.0, 12.0, 14.0, 16.0], dtype=np.float64)
    coupled = couple_conserved_pbp(static_draws, pbp_draws)
    assert np.allclose(coupled, pbp_draws)
    assert coupled is not pbp_draws

    low_pbp = np.array([1.0, 1.5, 2.0, 1.5], dtype=np.float64)
    assert np.allclose(couple_conserved_pbp(static_draws, low_pbp), static_draws)
    assert np.allclose(couple_conserved_pbp(static_draws, np.array([])), static_draws)

    degraded = degraded_jev_lineup_evaluation("jev offline")
    assert degraded["jev_status"] == "DEGRADED_UNVERIFIED"
    assert degraded["publish_allowed"] is False
    assert degraded["publishAllowed"] is False
    assert degraded["lineup_verdict"] == "PASS_FRAGILE"
    assert degraded["confidence_int"] is None

    assert live_jev_confidence(0.20, 0.25, 0.80) == 22
    assert live_jev_confidence(0.85, 0.80, 0.15) == 83

    assert showdown_salary_floor(25000) == 48000
    assert showdown_salary_floor(None) == 48000
    assert showdown_salary_floor(49200) == 49200

    with pytest.raises(ValueError, match="draw shape"):
        couple_conserved_pbp(static_draws, np.array([1.0, 2.0], dtype=np.float64))


def test_top_level_aliases_and_hurdle_non_negative_proj():
    from week8_forensic_kernels import (
        degraded_jev_publication_block,
        empirical_bayes_shrink,
        evaluate_parlay_conjunction,
        hurdle_non_negative_proj,
    )

    eb = empirical_bayes_shrink(18.0, 3, 10.0)
    assert eb["shrunk_mean"] < 18.0
    assert hurdle_non_negative_proj(0.85, 0.80, 12.0, route_share=0.75, snap_share=0.80) > 0.0
    assert hurdle_non_negative_proj(0.85, 0.80, 12.0, route_share=0.15, snap_share=0.20) == 0.0
    deg = degraded_jev_publication_block("offline")
    assert deg["publish_allowed"] is False and deg["publishAllowed"] is False
    conj = evaluate_parlay_conjunction(
        [{"publishAllowed": True, "decision": "SPEAK"}], 0.44, 0.36
    )
    assert conj["publishAllowed"] is True



