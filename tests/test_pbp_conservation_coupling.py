"""The Week 8 autopsy bugs that were still live after cf6b65272."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OPS = ROOT / "scripts" / "ops"
sys.path.insert(0, str(OPS))

from pbp_conservation_coupling import (
    couple_conserved_pbp,
    degraded_jev_lineup_evaluation,
    live_jev_confidence,
    showdown_salary_floor,
)

ROOT = Path(__file__).resolve().parents[1]
GPP = ROOT / "scripts" / "ops" / "run_full_dk_bitemporal_gpp.py"


def test_conserved_pbp_is_not_rescaled_to_static_mean():
    static = np.full(8, 80.0)
    pbp = np.array([10.0, 20.0, 30.0, 40.0, 15.0, 25.0, 35.0, 45.0])
    out = couple_conserved_pbp(static, pbp)
    assert np.allclose(out, pbp)
    assert abs(float(np.mean(out)) - float(np.mean(static))) > 20.0


def test_short_pbp_sample_keeps_static_draws():
    static = np.full(4, 12.0)
    pbp = np.array([0.0, 1.0, 0.5, 0.2])
    assert np.allclose(couple_conserved_pbp(static, pbp), static)


def test_jev_miss_does_not_stamp_lock_or_86():
    ev = degraded_jev_lineup_evaluation("zay flowers named by user")
    assert ev["jev_status"] == "DEGRADED_UNVERIFIED"
    assert ev["publish_allowed"] is False
    assert ev["lineup_verdict"] == "PASS_FRAGILE"
    assert ev["confidence_int"] is None
    assert ev["confidence_display"] == "UNVERIFIED"
    assert "LOCK" not in ev["lineup_verdict"]
    assert live_jev_confidence(0.2, 0.2, 0.9) < 72


def test_showdown_floor_rejects_25000():
    assert showdown_salary_floor(25000) == 48000
    assert showdown_salary_floor(24000) == 48000
    assert showdown_salary_floor(49000) == 49000


def test_gpp_source_no_longer_has_the_three_autopsy_bugs():
    text = GPP.read_text(encoding="utf-8")
    assert "scale_y" not in text
    assert "scale_ry" not in text
    assert "min_salary=25000" not in text
    assert "min_salary=24000" not in text
    assert "stack_coh = 0.86" not in text
    body = text.split("def evaluate_lineup_with_jev")[1].split("def solve_showdown_dk_lineup")[0]
    assert 'verdict = "LOCK_TOURNAMENT_ALPHA"' not in body
    assert "deterministic_fallback" not in body
    assert "stack_coh = 0.86" not in body
