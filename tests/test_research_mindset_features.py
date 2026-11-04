"""Tests for research_mindset_features.py — pure functions, no network."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from intelligence.vision import research_mindset_features as rmf


# -- trajectory irreversibility -------------------------------------------

def test_irreversibility_zero_for_static_path():
    traj = np.zeros((10, 2))
    assert rmf.trajectory_irreversibility(traj) == pytest.approx(0.0, abs=1e-6)


def test_irreversibility_positive_for_directed_path():
    # A straight line with constant drift is strongly time-asymmetric.
    t = np.linspace(0, 1, 20)
    traj = np.column_stack([t, t])
    val = rmf.trajectory_irreversibility(traj)
    assert val > 0


def test_irreversibility_short_path_returns_zero():
    assert rmf.trajectory_irreversibility(np.zeros((2, 2))) == 0.0


# -- QB cognitive load -----------------------------------------------------

def test_qb_load_counts_defenders_in_scan():
    qb = np.array([0.0, 0.0])
    defs = np.array([[10.0, 0.0], [20.0, 0.0], [500.0, 0.0]])
    out = rmf.qb_cognitive_load(qb, defs, scan_radius_px=100.0)
    assert out["defenders_in_scan"] == 2
    assert out["mot_load"] > 0
    assert out["nearest_defender_px"] == pytest.approx(10.0)


def test_qb_load_zone_void():
    qb = np.array([0.0, 0.0])
    defs = np.array([[10.0, 0.0]])
    zones = {"left": [(0, 0), (50, 0), (50, 50), (0, 50)],
             "right": [(100, 0), (150, 0), (150, 50), (100, 50)]}
    out = rmf.qb_cognitive_load(qb, defs, zone_polygons=zones)
    # left has 1 defender, right has 0 -> right is a void
    assert "right" in out["breached_zones"]
    assert out["zone_void_area_sq_yds"] > 0


# -- BH-FDR ----------------------------------------------------------------

def test_bh_fdr_rejects_clear_signal():
    # One tiny p-value among many nulls.
    p = [0.001, 0.5, 0.6, 0.7, 0.8]
    out = rmf.bh_fdr(p, q=0.10)
    assert out["reject"][0]
    assert out["n_reject"] == 1


def test_bh_fdr_rejects_nothing_when_all_null():
    p = [0.5, 0.6, 0.7, 0.8, 0.9]
    out = rmf.bh_fdr(p, q=0.10)
    assert out["n_reject"] == 0


def test_bh_fdr_empty():
    out = rmf.bh_fdr([], q=0.10)
    assert out["n_reject"] == 0


# -- falsify_feature_matrix ------------------------------------------------

def test_falsify_separates_signal_from_noise():
    rng = np.random.default_rng(0)
    n = 60
    y = np.array([0] * 30 + [1] * 30)
    signal = np.concatenate([rng.normal(0, 1, 30), rng.normal(3, 1, 30)])
    noise = rng.normal(0, 1, n)
    X = np.column_stack([signal, noise])
    out = rmf.falsify_feature_matrix(X, y, ["signal", "noise"], q=0.10)
    assert out["reject"][0] is True
    assert out["reject"][1] is False


def test_falsify_shape_mismatch_raises():
    X = np.zeros((5, 2))
    y = np.zeros(4)
    with pytest.raises(ValueError):
        rmf.falsify_feature_matrix(X, y, ["a", "b"])


# -- disguise collapse hazard (import-gated) ------------------------------

def test_disguise_hazard_runs_if_engine_available():
    pkg = Path(__file__).resolve().parents[1] / "packages" / "galaxy-conformal-ot"
    if pkg.exists() and str(pkg) not in sys.path:
        sys.path.insert(0, str(pkg))
    try:
        from galaxy_conformal_ot import AdversarialSchrodingerActiveHazardEngine  # noqa: F401
    except Exception:
        pytest.skip("galaxy_conformal_ot not importable")
    rng = np.random.default_rng(1)
    pre = rng.normal(0, 1, (11, 2))
    post = pre + rng.normal(0, 2, (11, 2))
    cal = rng.normal(0, 1, 50)
    out = rmf.disguise_collapse_hazard(pre, post, cal)
    assert "composite_hazard_score" in out
    assert "system_regime" in out
    assert out["mean_displacement_px"] > 0
