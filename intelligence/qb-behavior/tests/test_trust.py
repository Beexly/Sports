# PROVENANCE — qb-behavior / tests / test_trust.py
# Tests the trust-target series server (trust.py): point-in-time latest,
# week ordering, top-share CV stability, HHI autocorrelation persistence gate.
# Hermetic: synthetic trust_weekly.csv in tmp_path.
# Research: verified-claims.md TRUST-7/9.
"""Trust-target series unit tests (pure python, synthetic CSV)."""
import csv
import os
import sys

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BUILD_ROOT, "qb-behavior", "src"))

from qb_behavior.situational.trust import TrustSeries

HEADER = ["qb_id", "season", "week", "situation", "targets", "n_recv", "hhi",
          "hhi_lo", "hhi_hi", "n_eff", "top_share", "top2_share",
          "top_recv_id", "top_recv_name", "top_ay_share"]


def _write(tmp_path, rows):
    p = tmp_path / "trust_weekly.csv"
    with open(p, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(HEADER)
        w.writerows(rows)
    return str(tmp_path)


def _row(wk, top_share, hhi=0.2, sit="all"):
    return ["Q1", "2025", str(wk), sit, "30", "5", str(hhi), "0.15", "0.25",
            "5.0", str(top_share), "0.5", "R1", "Recv One", "0.3"]


class TestTrustSeries:
    def test_series_is_week_ordered(self, tmp_path):
        d = _write(tmp_path, [_row(3, 0.4), _row(1, 0.5), _row(2, 0.45)])
        ts = TrustSeries(d)
        weeks = [p["week"] for p in ts.series("Q1", 2025, "all")]
        assert weeks == [1, 2, 3]

    def test_latest_is_point_in_time(self, tmp_path):
        d = _write(tmp_path, [_row(1, 0.5), _row(2, 0.45), _row(3, 0.4)])
        ts = TrustSeries(d)
        assert ts.latest("Q1", 2025, 2, "all")["top_share"] == 0.45
        assert ts.latest("Q1", 2025, 99, "all")["top_share"] == 0.4

    def test_latest_none_when_no_data(self, tmp_path):
        d = _write(tmp_path, [_row(1, 0.5)])
        ts = TrustSeries(d)
        assert ts.latest("Q9", 2025, 5, "all") is None
        assert ts.latest("Q1", 2025, 5, "rz") is None

    def test_top_share_cv(self, tmp_path):
        # constant top_share -> CV 0; varying -> positive
        d = _write(tmp_path, [_row(w, 0.4) for w in (1, 2, 3, 4)])
        ts = TrustSeries(d)
        assert ts.top_share_cv("Q1", 2025, 4, "all") == 0.0
        d = _write(tmp_path, [_row(1, 0.3), _row(2, 0.5), _row(3, 0.4), _row(4, 0.6)])
        ts = TrustSeries(d)
        cv = ts.top_share_cv("Q1", 2025, 4, "all")
        assert cv is not None and cv > 0

    def test_top_share_cv_needs_two_weeks(self, tmp_path):
        d = _write(tmp_path, [_row(1, 0.4)])
        ts = TrustSeries(d)
        assert ts.top_share_cv("Q1", 2025, 1, "all") is None

    def test_hhi_autocorr_persistent_series(self, tmp_path):
        # steadily rising hhi -> high positive autocorrelation
        d = _write(tmp_path, [_row(w, 0.4, hhi=0.15 + 0.02 * w) for w in range(1, 9)])
        ts = TrustSeries(d)
        ac = ts.hhi_autocorr("Q1", 2025, "all")
        assert ac is not None and ac > 0.9

    def test_hhi_autocorr_none_when_short(self, tmp_path):
        d = _write(tmp_path, [_row(1, 0.4), _row(2, 0.45)])
        ts = TrustSeries(d)
        assert ts.hhi_autocorr("Q1", 2025, "all") is None

    def test_missing_file_is_empty_not_crash(self, tmp_path):
        ts = TrustSeries(str(tmp_path))
        assert ts.series("Q1", 2025) == []
