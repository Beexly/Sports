from __future__ import annotations

import importlib
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]


def test_odds_fixture_is_wellformed():
    snap = json.loads((ROOT / "tests" / "fixtures" / "odds_fixture.json").read_text(encoding="utf-8"))
    assert snap["lines"]["chi_ml"]["odds"] == 142


def test_stale_odds_gate():
    gen = importlib.import_module("scripts.ops.run_chi_sea_mnf_360_board_review")
    with pytest.raises(gen.StaleOddsError):
        gen.load_odds_snapshot(
            ROOT / "tests" / "fixtures" / "odds_fixture.json",
            now="2100-01-02T00:00:00-06:00",
            max_age_hours=6,
        )


def test_card_schema_and_stakes(tmp_path):
    out = tmp_path / "card.json"
    tele = tmp_path / "tele.json"
    env = dict(
        os.environ,
        MNF_ODDS_FILE=str(ROOT / "tests" / "fixtures" / "odds_fixture.json"),
        MNF_CARD_OUT=str(out),
        MNF_TELEMETRY_OUT=str(tele),
    )
    subprocess.run([sys.executable, "scripts/ops/run_chi_sea_mnf_360_board_review.py"], env=env, cwd=ROOT, check=True)
    card = json.loads(out.read_text(encoding="utf-8"))
    assert card["personal_40_dollar_dk_card"]["total_staked_usd"] == 40.0
    assert len(card["personal_40_dollar_dk_card"]["tickets"]) == 6
    assert [t["slot"] for t in card["personal_40_dollar_dk_card"]["tickets"]] == [1, 2, 3, 4, 5, 6]


def test_spread_ml_model_p_is_devig(tmp_path):
    out = tmp_path / "card.json"
    tele = tmp_path / "tele.json"
    env = dict(
        os.environ,
        MNF_ODDS_FILE=str(ROOT / "tests" / "fixtures" / "odds_fixture.json"),
        MNF_CARD_OUT=str(out),
        MNF_TELEMETRY_OUT=str(tele),
    )
    subprocess.run([sys.executable, "scripts/ops/run_chi_sea_mnf_360_board_review.py"], env=env, cwd=ROOT, check=True)
    card = json.loads(out.read_text(encoding="utf-8"))
    gen = importlib.import_module("scripts.ops.run_chi_sea_mnf_360_board_review")
    d = gen.devig_two_way(-105, -115)
    m = gen.devig_two_way(142, -170)
    t2, t5 = [t for t in card["personal_40_dollar_dk_card"]["tickets"] if t["slot"] in (2, 5)]
    assert t2["model_p"] == pytest.approx(d[0], abs=1e-6)
    assert t5["model_p"] == pytest.approx(m[0], abs=1e-6)
    assert abs(t2["edge_pct"]) < 0.05
    assert abs(t5["edge_pct"]) < 0.05


def test_joint_equals_worlds_mean(tmp_path):
    out = tmp_path / "card.json"
    tele = tmp_path / "tele.json"
    env = dict(
        os.environ,
        MNF_ODDS_FILE=str(ROOT / "tests" / "fixtures" / "odds_fixture.json"),
        MNF_CARD_OUT=str(out),
        MNF_TELEMETRY_OUT=str(tele),
    )
    subprocess.run([sys.executable, "scripts/ops/run_chi_sea_mnf_360_board_review.py"], env=env, cwd=ROOT, check=True)
    card_text = out.read_text(encoding="utf-8")
    assert "1.075" not in card_text
    card = json.loads(card_text)
    audit = card["sgp_conjunction_audit"]
    assert audit["joint_sim_prob"] == pytest.approx(audit["raw_joint_sim_p"], abs=1e-9)


def test_joint_from_worlds_helper():
    gen = importlib.import_module("scripts.ops.run_chi_sea_mnf_360_board_review")
    a = np.array([True, False, True, True])
    b = np.array([True, True, False, True])
    assert gen.joint_from_worlds(a, b) == pytest.approx(np.mean(a & b))


def test_kalif_raymond_lateral_scrimmage_gate():
    from scripts.ops.week8_forensic_kernels import recommend_scrimmage_over_receiving_prop

    gate = recommend_scrimmage_over_receiving_prop(
        player_name="Kalif Raymond",
        raw_rec_over_prob=0.7288,
        behind_los_screen_or_jet_share=0.22,
        rush_attempt_share=0.06,
        scrimmage_yards_prop_available=True,
    )
    assert gate["pure_rec_yds_publish_allowed"] is False
    assert gate["preferred_market"] == "rush_plus_rec_yards"
    assert gate["decision"] == "BLOCK_PURE_REC_YDS_USE_SCRIMMAGE"
    assert gate["adjusted_rec_over_prob"] < gate["raw_rec_over_prob"]
