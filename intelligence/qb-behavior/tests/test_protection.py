# PROVENANCE — qb-behavior / tests / test_protection.py
# Tests Protection Stress math (build_protection_stress.ols_fit) and the
# runtime server (protection.py): OLS residual structure, null guards
# (<3 games; pool<32), analyst-only note. Hermetic.
# Research: verified-claims.md PRESS-3/4/5 (formula, guards, usage bar).
"""Protection Stress unit tests (pure python)."""
import csv
import os
import sys

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BUILD_ROOT, "qb-behavior", "src"))
sys.path.insert(0, os.path.join(BUILD_ROOT, "qb-behavior", "build"))

from qb_behavior.situational.protection import ProtectionStressIndex  # noqa: E402

HEADER = ["team", "season", "week", "games", "dropbacks", "press_rate_allowed",
          "blitz_rate_faced", "expected_rate", "stress", "alpha", "beta",
          "t_beta", "fit_n", "null_reason"]


def _row(team="PIT", week=4, games=4, stress=0.03, null_reason=""):
    return [team, "2026", str(week), str(games), "140", "0.32", "0.25",
            "0.29", str(stress), "0.2", "0.36", "2.1", "128", null_reason]


class TestProtectionServer:
    def _dir(self, tmp_path, rows):
        with open(tmp_path / "protection_stress.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(HEADER)
            w.writerows(rows)
        return str(tmp_path)

    def test_get_latest_le_week(self, tmp_path):
        d = self._dir(tmp_path, [_row(week=3, stress=0.02), _row(week=4, stress=0.03)])
        psi = ProtectionStressIndex(d)
        out = psi.get("PIT", 2026, 4)
        assert out["stress"] == 0.03 and out["week"] == 4
        out = psi.get("PIT", 2026, 9)
        assert out["stress"] == 0.03  # latest <= week

    def test_null_when_never_observed(self, tmp_path):
        d = self._dir(tmp_path, [_row()])
        psi = ProtectionStressIndex(d)
        assert psi.get("CLE", 2026, 4) is None

    def test_null_reason_surfaced(self, tmp_path):
        d = self._dir(tmp_path, [_row(week=2, games=2, stress="", null_reason="games<3")])
        psi = ProtectionStressIndex(d)
        out = psi.get("PIT", 2026, 2)
        assert out["stress"] is None
        assert out["null_reason"] == "games<3"

    def test_analyst_only_note(self, tmp_path):
        d = self._dir(tmp_path, [_row()])
        psi = ProtectionStressIndex(d)
        out = psi.get("PIT", 2026, 4)
        assert "analyst" in out["note"].lower()
        assert out["verification"] == "COMPUTED"

    def test_missing_file_is_empty(self, tmp_path):
        psi = ProtectionStressIndex(str(tmp_path))
        assert psi.get("PIT", 2026, 4) is None


class TestOLSMath:
    def test_residual_structure(self):
        import numpy as np
        from qb_behavior.situational.protection import ols_fit
        x = np.array([0.2, 0.25, 0.3, 0.35])
        y = 0.1 + 0.5 * x
        a, b, t_b = ols_fit(x, y)
        assert abs(a - 0.1) < 1e-9 and abs(b - 0.5) < 1e-9
        assert t_b > 10  # perfect line -> huge t-stat
        # degenerate x -> slope 0, intercept = mean
        a, b, t_b = ols_fit(np.array([0.3, 0.3, 0.3]), np.array([0.2, 0.3, 0.4]))
        assert b == 0.0 and abs(a - 0.3) < 1e-9
