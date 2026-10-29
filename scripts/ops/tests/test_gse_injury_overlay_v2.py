"""
TDD suite for gse_injury_overlay_v2.py.

Invariants under test:
  1. ``apply_epa_dropoff`` never mutates its inputs and returns a new dict.
  2. A missing role falls back to factor 1.0.
  3. Factors outside [EPA_FACTOR_MIN, EPA_FACTOR_MAX] raise ValueError.
  4. The sealed EPA table is detectable when edited mid-week (SHA-256 mismatch).
  5. Sinkhorn satisfies both marginals and reports its residual.
  6. ``injury_overlay`` reports mass loss explicitly and stays sum-to-one after
     ``normalize_shares``.
  7. ``injury_overlay`` returns fresh objects; the caller's dicts are untouched.
"""

import copy
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    import gse_injury_overlay_v2 as gio
except ImportError:
    import gse_injury_overlay as gio


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #

PLAYERS = ["WR1_A", "WR2_B", "WR3_C", "TE1_D"]
PRE = {"WR1_A": 0.40, "WR2_B": 0.25, "WR3_C": 0.20, "TE1_D": 0.15}
POST = {"WR1_A": 0.00, "WR2_B": 0.40, "WR3_C": 0.35, "TE1_D": 0.25}
ROLES = {"WR1_A": "WR1", "WR2_B": "WR1", "WR3_C": "WR2", "TE1_D": "TE1"}


def _cost():
    return gio.role_cost_matrix(PLAYERS, ROLES)


# --------------------------------------------------------------------------- #
# 1-2. immutability + missing role
# --------------------------------------------------------------------------- #


def test_apply_epa_dropoff_does_not_mutate_inputs():
    shares = dict(POST)
    roles = dict(ROLES)
    table = dict(gio.EPA_DROPOFF)
    shares_before = copy.deepcopy(shares)
    roles_before = copy.deepcopy(roles)
    table_before = copy.deepcopy(table)

    out = gio.apply_epa_dropoff(shares, roles, table)

    assert shares == shares_before, "input shares were mutated"
    assert roles == roles_before, "input role_of was mutated"
    assert table == table_before, "input table was mutated"
    assert out is not shares, "returned the same object instead of a new dict"
    assert out["WR2_B"] == pytest.approx(0.40 * 0.82)


def test_missing_role_falls_back_to_one():
    out = gio.apply_epa_dropoff(
        {"UNKNOWN_X": 0.5}, {"UNKNOWN_X": "K1"}, gio.EPA_DROPOFF
    )
    assert out["UNKNOWN_X"] == pytest.approx(0.5)

    out2 = gio.apply_epa_dropoff({"NO_ROLE_Y": 0.5}, {}, gio.EPA_DROPOFF)
    assert out2["NO_ROLE_Y"] == pytest.approx(0.5)


def test_missing_role_in_table_falls_back_to_one():
    out = gio.apply_epa_dropoff({"Z": 0.25}, {"Z": "PUNTER"}, gio.EPA_DROPOFF)
    assert out["Z"] == pytest.approx(0.25)


# --------------------------------------------------------------------------- #
# 3. bounds checking
# --------------------------------------------------------------------------- #


def test_factor_above_max_raises():
    bad = dict(gio.EPA_DROPOFF)
    bad["WR1"] = 1.35
    with pytest.raises(ValueError, match="outside the sealed bounds"):
        gio.apply_epa_dropoff({"WR2_B": 0.4}, {"WR2_B": "WR1"}, bad)


def test_factor_below_min_raises():
    bad = dict(gio.EPA_DROPOFF)
    bad["RB1"] = 0.31
    with pytest.raises(ValueError, match="outside the sealed bounds"):
        gio.apply_epa_dropoff({"RB1_X": 0.2}, {"RB1_X": "RB1"}, bad)


def test_validate_epa_table_rejects_non_finite():
    bad = dict(gio.EPA_DROPOFF)
    bad["TE1"] = float("nan")
    with pytest.raises(ValueError, match="not finite"):
        gio.validate_epa_table(bad)


# --------------------------------------------------------------------------- #
# 4. sealed-table hash
# --------------------------------------------------------------------------- #


def test_sealed_table_hash_is_stable():
    assert gio.EPA_DROPOFF_SHA256 == gio.validate_epa_table(gio.EPA_DROPOFF)
    assert len(gio.EPA_DROPOFF_SHA256) == 64


def test_modified_table_breaks_hash():
    edited = dict(gio.EPA_DROPOFF)
    edited["WR1"] = 0.80  # plausible but not the sealed value
    with pytest.raises(ValueError, match="hash mismatch"):
        gio.validate_epa_table(edited, expected_hash=gio.EPA_DROPOFF_SHA256)


# --------------------------------------------------------------------------- #
# 5. Sinkhorn marginals + residual
# --------------------------------------------------------------------------- #


def test_sinkhorn_hits_both_marginals():
    P, info = gio.sinkhorn_with_info(
        [PRE[p] for p in PLAYERS], [POST[p] for p in PLAYERS], _cost()
    )
    row_sums = [sum(row) for row in P]
    col_sums = [sum(P[i][j] for i in range(len(PLAYERS))) for j in range(len(PLAYERS))]

    for got, want in zip(row_sums, [PRE[p] for p in PLAYERS]):
        assert got == pytest.approx(want, abs=1e-4)
    for got, want in zip(col_sums, [POST[p] for p in PLAYERS]):
        assert got == pytest.approx(want, abs=1e-4)

    assert info["row_residual"] < 1e-4
    assert info["col_residual"] < 1e-4
    assert info["converged"] == 1.0
    assert info["iterations"] >= 1


def test_sinkhorn_rejects_dimension_mismatch():
    with pytest.raises(ValueError, match="dimension mismatch"):
        gio.sinkhorn_with_info([0.5, 0.5], [1.0], [[0.0, 1.0], [1.0, 0.0]])


def test_sinkhorn_rejects_negative_marginals():
    with pytest.raises(ValueError, match="non-negative"):
        gio.sinkhorn_with_info([-0.1, 1.1], [0.5, 0.5], [[0.0, 1.0], [1.0, 0.0]])


# --------------------------------------------------------------------------- #
# 6-7. full overlay
# --------------------------------------------------------------------------- #


def test_injury_overlay_reports_mass_loss():
    report = gio.injury_overlay(PRE, POST, ROLES, _cost(), PLAYERS)

    assert report["total_mass_before"] == pytest.approx(1.0, abs=1e-4)
    assert report["total_mass_after"] < report["total_mass_before"]
    assert report["mass_loss"] == pytest.approx(
        report["total_mass_before"] - report["total_mass_after"]
    )
    assert report["mass_loss"] > 0.10, "expected a meaningful EPA dropoff"
    assert sum(report["normalized_shares"].values()) == pytest.approx(1.0)
    assert report["sinkhorn"]["converged"] == 1.0
    assert report["epa_table_sha256"] == gio.EPA_DROPOFF_SHA256


def test_injury_overlay_does_not_mutate_caller_dicts():
    pre = dict(PRE)
    post = dict(POST)
    roles = dict(ROLES)
    pre_b, post_b, roles_b = copy.deepcopy(pre), copy.deepcopy(post), copy.deepcopy(roles)

    gio.injury_overlay(pre, post, roles, _cost(), PLAYERS)

    assert pre == pre_b
    assert post == post_b
    assert roles == roles_b


def test_injury_overlay_logs_role_factor_and_shares():
    report = gio.injury_overlay(PRE, POST, ROLES, _cost(), PLAYERS)
    entry = next(e for e in report["log"] if e["player"] == "WR2_B")
    assert entry["role"] == "WR1"
    assert entry["factor"] == pytest.approx(0.82)
    assert entry["post_share"] == pytest.approx(entry["pre_share"] * 0.82)


def test_injured_player_keeps_zero_share():
    report = gio.injury_overlay(PRE, POST, ROLES, _cost(), PLAYERS)
    assert report["feasible_shares"]["WR1_A"] == pytest.approx(0.0, abs=1e-9)
    assert report["effective_shares"]["WR1_A"] == pytest.approx(0.0, abs=1e-9)


# --------------------------------------------------------------------------- #
# loader
# --------------------------------------------------------------------------- #


def test_load_injury_file_roundtrip(tmp_path):
    path = tmp_path / "injury.json"
    payload = {"injured": ["WR1_A"], "pre_shares": PRE, "role_of": ROLES}
    path.write_text(json.dumps(payload), encoding="utf-8")

    data = gio.load_injury_file(str(path))
    assert set(data) == {"injured", "pre_shares", "role_of"}
    assert data["injured"] == ["WR1_A"]


def test_load_injury_file_missing_keys(tmp_path):
    path = tmp_path / "injury.json"
    path.write_text(json.dumps({"injured": []}), encoding="utf-8")
    with pytest.raises(ValueError, match="missing keys"):
        gio.load_injury_file(str(path))


# --------------------------------------------------------------------------- #
# cost matrix helper
# --------------------------------------------------------------------------- #


def test_role_cost_matrix_shape_and_diagonal():
    C = _cost()
    n = len(PLAYERS)
    assert len(C) == n and all(len(row) == n for row in C)
    assert all(C[i][i] == 0.0 for i in range(n))
    # WR1_A and WR2_B share role WR1 -> same-role cost
    assert C[0][1] == pytest.approx(0.0)
    # WR1 vs TE1 -> cross position
    assert C[0][3] == pytest.approx(1.0)
    # symmetry
    for i in range(n):
        for j in range(n):
            assert C[i][j] == pytest.approx(C[j][i])


def test_normalize_shares_raises_on_zero_total():
    with pytest.raises(ValueError, match="non-positive total"):
        gio.normalize_shares({"a": 0.0, "b": 0.0})


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
