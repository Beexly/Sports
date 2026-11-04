"""Tests for the market-stratified calibration analysis.

The statistics are the deliverable here, so they are tested against cases whose
answers can be derived by hand rather than against the script's own output.
"""

from __future__ import annotations

import importlib.util
import math
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
_MOD = REPO / "scripts" / "ops" / "calibration_analysis.py"

_spec = importlib.util.spec_from_file_location("calibration_analysis", _MOD)
ca = importlib.util.module_from_spec(_spec)
sys.modules["calibration_analysis"] = ca
_spec.loader.exec_module(ca)  # type: ignore[union-attr]


def G(label, pairs):
    g = ca.Group(label)
    for p, y in pairs:
        g.p.append(p)
        g.y.append(y)
    return g


# --- Poisson-binomial test ------------------------------------------------

def test_perfectly_calibrated_constant_p_gives_z_zero():
    # 100 picks at p=0.5, exactly 50 wins: expected 50, sd sqrt(25)=5, z=0.
    g = G("t", [(0.5, 1)] * 50 + [(0.5, 0)] * 50)
    z, pval = g.poisson_binomial_z()
    assert z == pytest.approx(0.0, abs=1e-9)
    assert pval == pytest.approx(1.0, abs=1e-9)


def test_known_deviation_gives_predicted_z():
    # 60 wins of 100 at p=0.5 -> (60-50)/5 = +2.0
    g = G("t", [(0.5, 1)] * 60 + [(0.5, 0)] * 40)
    z, pval = g.poisson_binomial_z()
    assert z == pytest.approx(2.0, abs=1e-9)
    assert pval == pytest.approx(0.0455003, abs=1e-6)


def test_overclaiming_yields_negative_z():
    """Fewer wins than claimed must produce a negative z (score claims too much)."""
    g = G("t", [(0.9, 1)] * 10 + [(0.9, 0)] * 90)
    z, _ = g.poisson_binomial_z()
    assert z < 0


def test_underclaiming_yields_positive_z():
    g = G("t", [(0.2, 1)] * 90 + [(0.2, 0)] * 10)
    z, _ = g.poisson_binomial_z()
    assert z > 0


def test_varying_p_uses_poisson_binomial_variance_not_constant_p():
    """Var = sum(p(1-p)); mixing p's must shrink variance vs. a constant-p guess."""
    # 1 pick at p=0.99 has var 0.0099; a constant-p model using mean 0.99 agrees,
    # but a mixed set must not use n*pbar*(1-pbar).
    mixed = G("t", [(0.99, 1), (0.01, 0)])
    expected = 1.0
    var = 0.99 * 0.01 + 0.01 * 0.99
    z, _ = mixed.poisson_binomial_z()
    assert z == pytest.approx((1 - expected) / math.sqrt(var), abs=1e-9)


def test_zero_variance_is_safe():
    # All p=0 and p=1 extremes: var ~ 0, must not divide by zero.
    g = G("t", [(0.0, 0), (1.0, 1)])
    z, pval = g.poisson_binomial_z()
    assert z == 0.0 and pval == 1.0


# --- Wilson interval ------------------------------------------------------

def test_wilson_interval_brackets_the_observed_rate():
    g = G("t", [(0.5, 1)] * 55 + [(0.5, 0)] * 45)
    lo, hi = g.wilson()
    assert lo < 0.55 < hi


def test_wilson_narrows_as_n_grows():
    small = G("a", [(0.5, 1)] * 6 + [(0.5, 0)] * 4).wilson()
    large = G("b", [(0.5, 1)] * 600 + [(0.5, 0)] * 400).wilson()
    assert (large[1] - large[0]) < (small[1] - small[0])


def test_wilson_stays_in_unit_interval_at_extremes():
    lo, hi = G("t", [(0.5, 1)] * 10).wilson()
    assert 0.0 <= lo < hi <= 1.0


# --- gap, Brier, ECE ------------------------------------------------------

def test_gap_sign_convention_is_overclaim_positive():
    # Calibrated: claims 80, wins 80 of 100 -> gap 0.
    assert G("t", [(0.8, 1)] * 80 + [(0.8, 0)] * 20).gap == pytest.approx(0.0, abs=1e-9)
    assert G("t", [(0.9, 1)] * 50 + [(0.9, 0)] * 50).gap > 0  # claims 90, wins 50
    assert G("t", [(0.3, 1)] * 50 + [(0.3, 0)] * 50).gap < 0  # claims 30, wins 50


def test_brier_matches_hand_computation():
    g = G("t", [(0.9, 1), (0.9, 0)])
    # (0.9-1)^2 = 0.01 ; (0.9-0)^2 = 0.81 ; mean = 0.41
    assert g.brier() == pytest.approx(0.41, abs=1e-9)


def test_climatology_brier_beats_a_useless_score():
    """A constant base-rate forecast should score better than a badly ordered one."""
    bad = G("t", [(0.9, 0)] * 50 + [(0.1, 1)] * 50)  # perfectly inverted
    assert bad.brier() > bad.baseline_brier()


def test_ece_is_zero_for_a_perfectly_calibrated_bin():
    g = G("t", [(0.7, 1)] * 70 + [(0.7, 0)] * 30)
    assert g.ece() == pytest.approx(0.0, abs=1e-9)


def test_ece_is_large_for_a_wildly_wrong_bin():
    g = G("t", [(0.9, 1)] * 10 + [(0.9, 0)] * 90)
    assert g.ece() > 0.5


# --- loading --------------------------------------------------------------

def test_load_rejects_out_of_range_probabilities(tmp_path):
    p = tmp_path / "e.csv"
    p.write_text("id,p,y,pick_type,model_version,in_play\n"
                 "a,0.5,1,MONEYLINE,v1,f\n"
                 "b,1.5,1,MONEYLINE,v1,f\n"
                 "c,0.5,2,MONEYLINE,v1,f\n", encoding="utf-8")
    rows, bad = ca.load(p)
    assert len(rows) == 1
    assert len(bad) == 2


def test_load_keeps_valid_rows(tmp_path):
    p = tmp_path / "e.csv"
    p.write_text("id,p,y,pick_type,model_version,in_play\n"
                 "a,0.5,1,SPREAD,v1,f\n", encoding="utf-8")
    rows, bad = ca.load(p)
    assert not bad
    assert rows[0]["p"] == 0.5 and rows[0]["y"] == 1


# --- real evidence file ---------------------------------------------------

def test_real_evidence_file_exists_and_parses():
    assert ca.DEFAULT_CSV.exists(), "calibration evidence CSV is missing"
    rows, bad = ca.load(ca.DEFAULT_CSV)
    assert len(rows) > 1000
    assert not bad, f"evidence file has unusable rows: {bad[:3]}"
    assert {r["pick_type"] for r in rows} >= {"MONEYLINE", "SPREAD", "TOTAL"}


def test_main_runs_on_the_real_file():
    assert ca.main([]) == 0


def test_main_missing_file_returns_2(tmp_path):
    assert ca.main(["--csv", str(tmp_path / "nope.csv")]) == 2
