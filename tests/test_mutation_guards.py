from __future__ import annotations

import importlib
import json
import os
from pathlib import Path

import numpy as np
import pytest

import scripts.ops.gse_coach_mind_simulator as sim
import scripts.ops.pbp_conservation_coupling as pcc
from scripts.ops.week8_forensic_kernels import enforce_route_snap_participation_gate

ROOT = Path(__file__).resolve().parents[1]


def test_couple_conserved_pbp_uses_pbp_as_is():
    rng = np.random.default_rng(7)
    static = rng.normal(0, 5, 176)
    pbp = rng.normal(50, 5, 176)
    out = pcc.couple_conserved_pbp(static, pbp)
    assert np.allclose(out, pbp)
    assert out is not pbp


def test_couple_conserved_pbp_falls_back_to_static():
    static = np.arange(10, dtype=np.float64)
    pbp = np.zeros(10) + 1.0
    assert np.allclose(pcc.couple_conserved_pbp(static, pbp), static)


def test_couple_conserved_pbp_rejects_shape_mismatch():
    with pytest.raises(ValueError):
        pcc.couple_conserved_pbp(np.zeros(5), np.zeros(7))


def test_low_route_player_blocked_from_play():
    g = enforce_route_snap_participation_gate(0.10, 0.12)
    assert g["eligible"] is False
    assert g["decision"] == "PASS_LOW_PARTICIPATION"
    g2 = enforce_route_snap_participation_gate(0.68, 0.62)
    assert g2["eligible"] is True


def test_publishable_joint_is_worlds_mean():
    card = json.loads((ROOT / "data" / "engine" / "mnf_chi_sea_360_locked_card_2026_11_02.json").read_text(encoding="utf-8"))
    assert "1.075" not in json.dumps(card)


def test_comp_base_unaffected_by_biomech_flag():
    for flag in ("0", "1"):
        os.environ["ENABLE_BIOMECH_KINETIC_TRANSLATION_V1"] = flag
        importlib.reload(sim)
        assert sim.derive_comp_base(0.62) == 0.62
    os.environ["ENABLE_BIOMECH_KINETIC_TRANSLATION_V1"] = "0"
