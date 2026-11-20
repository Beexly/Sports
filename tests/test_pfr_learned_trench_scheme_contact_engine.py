"""
Unit, 32-team derived-priors hygiene, bounds, and exact swap-symmetry tests for
`pfr_learned_trench_scheme_contact_engine.py` (Stream 15O).
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from intelligence.coaching.pfr_learned_trench_scheme_contact_engine import (
    PRIORS_PATH,
    evaluate_learned_trench_scheme_contact_matchup,
    load_learned_trench_scheme_contact_priors,
    normalize_nfl_team,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_pfr_derived_priors_cover_32_teams_with_zero_raw_player_dumps() -> None:
    assert PRIORS_PATH.is_file(), f"Missing derived priors artifact: {PRIORS_PATH}"
    raw_txt = PRIORS_PATH.read_text(encoding="utf-8")
    # Pure 7-bit ASCII & zero raw player names
    assert all(ord(c) < 128 for c in raw_txt)
    for sample_name in ("Dak Prescott", "Jahmyr Gibbs", "Nakobe Dean", "Jaxon Smith-Njigba"):
        assert sample_name not in raw_txt

    payload = json.loads(raw_txt)
    assert payload["team_count"] == 32
    assert len(payload["teams"]) == 32
    assert payload["license_and_provenance"]["xls_files_scanned"] >= 39
    assert payload["license_and_provenance"]["bundle_csvs_scanned"] >= 25
    assert payload["license_and_provenance"]["gapfill_csvs_scanned"] >= 3

    loaded = load_learned_trench_scheme_contact_priors()
    assert loaded["available"] is True
    assert loaded["team_count"] == 32

    scalar_keys = (
        "off_pocket_protection_z",
        "off_qb_accuracy_discipline_z",
        "off_scheme_pa_rpo_rate_z",
        "off_run_trench_contact_z",
        "def_pressure_havoc_z",
        "def_coverage_tackling_z",
        "penalty_discipline_z",
    )
    for tm, prof in loaded["teams"].items():
        assert len(tm) in (2, 3)
        for k in scalar_keys:
            v = float(prof[k])
            assert math.isfinite(v)
            assert -3.0 <= v <= 3.0
        dvp = prof["def_pos_vulnerability_z"]
        for k in ("vs_qb_z", "vs_rb_z", "vs_wr_z", "vs_te_z"):
            v = float(dvp[k])
            assert math.isfinite(v)
            assert -3.0 <= v <= 3.0


def test_stream_15o_aliases_and_exact_swap_symmetry() -> None:
    assert normalize_nfl_team("lvr") == "LV"
    assert normalize_nfl_team("nwe") == "NE"
    assert normalize_nfl_team("wsh") == "WAS"
    assert normalize_nfl_team("jac") == "JAX"
    assert normalize_nfl_team("lar") == "LA"

    ab = evaluate_learned_trench_scheme_contact_matchup("IND", "HOU", {"is_indoor": True, "wind_mph": 0.0})
    ba = evaluate_learned_trench_scheme_contact_matchup("HOU", "IND", {"is_indoor": True, "wind_mph": 0.0})
    alias_ab = evaluate_learned_trench_scheme_contact_matchup("IND", "HST", {"is_indoor": True, "wind_mph": 0.0})

    assert ab == alias_ab
    assert abs(ab["stream_15o_net_trench_contact_diff"] + ba["stream_15o_net_trench_contact_diff"]) < 1e-6

    for ka, kh in (
        ("stream_15o_away_trench_protection_edge", "stream_15o_home_trench_protection_edge"),
        ("stream_15o_away_contact_yac_edge", "stream_15o_home_contact_yac_edge"),
        ("stream_15o_away_scheme_accuracy_edge", "stream_15o_home_scheme_accuracy_edge"),
        ("stream_15o_away_penalty_discipline_edge", "stream_15o_home_penalty_discipline_edge"),
    ):
        assert abs(ab[ka] - ba[kh]) < 1e-6
        assert abs(ab[kh] - ba[ka]) < 1e-6

    assert -0.030 <= ab["stream_15o_away_trench_protection_edge"] <= 0.030
    assert -0.030 <= ab["stream_15o_away_contact_yac_edge"] <= 0.030
    assert -0.030 <= ab["stream_15o_away_scheme_accuracy_edge"] <= 0.030
    assert -0.020 <= ab["stream_15o_away_penalty_discipline_edge"] <= 0.020
    assert ab["away_pos_vulnerability"] == ba["home_pos_vulnerability"]
    assert ab["home_pos_vulnerability"] == ba["away_pos_vulnerability"]


def test_stream_15o_neutral_fallback_for_unknown_teams() -> None:
    res = evaluate_learned_trench_scheme_contact_matchup("ZZZ", "YYY")
    assert res["stream_15o_away_trench_protection_edge"] == 0.0
    assert res["stream_15o_home_trench_protection_edge"] == 0.0
    assert res["stream_15o_net_trench_contact_diff"] == 0.0
