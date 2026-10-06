# PROVENANCE — qb-behavior / tests / test_provider.py
# Tests the c02 provider (situational/provider.py): ABC conformance,
# pressure-split unparking (no DataGapError when sourced; DataGapError when
# the QB is unknown), floor guards (n_press<100 -> NULL + data_gap), honest
# data_gap notes, and verification statuses.
# Hermetic: synthetic CSVs in tmp_path. No network, no pbp.
# Research: integration/providers.py (ABC); verified-claims.md PRESS-2 (guards).
"""Provider contract tests (pure python, synthetic CSVs)."""
import csv
import os
import sys

import pytest

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BUILD_ROOT, "qb-behavior", "src"))
sys.path.insert(0, BUILD_ROOT)

from integration.providers import DataGapError, QBBehaviorProvider  # noqa: E402
from integration.types import Verification  # noqa: E402
from qb_behavior.situational.provider import SituationalQBProvider  # noqa: E402

WEEKLY_HEADER = ["qb_id", "name", "team", "season", "week", "db", "epa",
                 "cpoe_pbp", "adot", "deep_rate_20", "scramble_rate", "p2s_eb",
                 "n_clean", "n_press", "epa_clean", "epa_press", "var_clean",
                 "var_press", "sens_epa_floor", "sens_se", "clean_epa_baseline",
                 "int_n_clean", "int_att_clean", "int_n_press", "int_att_press"]
TRUST_HEADER = ["qb_id", "season", "week", "situation", "targets", "n_recv",
                "hhi", "hhi_lo", "hhi_hi", "n_eff", "top_share", "top2_share",
                "top_recv_id", "top_recv_name", "top_ay_share"]
CELLS_HEADER = ["scope", "id", "season_key", "cell", "n", "w"]


def _weekly_row(qb="Q1", week=3, n_press=150, **kw):
    r = dict(zip(WEEKLY_HEADER, [
        qb, "Test QB", "TST", "2026", str(week), "120", "0.15", "2.5", "8.5",
        "0.12", "0.06", "0.19", "300", str(n_press), "0.25", "-0.15", "0.8",
        "0.9", "0.40", "0.09", "0.25", "2", "280", "3", "120"]))
    r.update(kw)
    return [r[h] for h in WEEKLY_HEADER]


def _trust_row(qb="Q1", week=3, sit="all", top_share=0.35, hhi=0.2):
    return [qb, "2026", str(week), sit, "30", "5", str(hhi), "0.15", "0.25",
            "5.0", str(top_share), "0.55", "R1", "Recv One", "0.3"]


def _fixture_dir(tmp_path, weekly_rows, trust_rows, cell_rows):
    d = str(tmp_path)
    for name, header, rows in (("qb_weekly.csv", WEEKLY_HEADER, weekly_rows),
                              ("trust_weekly.csv", TRUST_HEADER, trust_rows),
                              ("int_cells.csv", CELLS_HEADER, cell_rows)):
        with open(os.path.join(d, name), "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(header)
            w.writerows(rows)
    return d


@pytest.fixture()
def prov(tmp_path):
    weekly = [_weekly_row(week=w) for w in (1, 2, 3)]
    trust = [_trust_row(week=w, sit=s) for w in (1, 2, 3) for s in ("all", "third", "rz")]
    cells = [("L", "NFL", "2026_w3", "p0_q1_s1_z1_d0", 500, 9),
             ("T", "TST", "2026_w3", "p0_q1_s1_z1_d0", 120, 2),
             ("Q", "Q1", "2026_w3", "p0_q1_s1_z1_d0", 100, 1),
             ("L", "NFL", "2026_w3", "p1_q1_s1_z1_d0", 200, 6),
             ("T", "TST", "2026_w3", "p1_q1_s1_z1_d0", 80, 3),
             ("Q", "Q1", "2026_w3", "p1_q1_s1_z1_d0", 60, 2)]
    d = _fixture_dir(tmp_path, weekly, trust,
                     [[s, i, k, c, str(n), str(x)] for s, i, k, c, n, x in cells])
    return SituationalQBProvider(d)


class TestProviderContract:
    def test_implements_abc(self, prov):
        assert isinstance(prov, QBBehaviorProvider)

    def test_get_qb_profile_fields(self, prov):
        p = prov.get_qb_profile("Q1", 3, 2026)
        assert p.qb_id == "Q1" and p.name == "Test QB" and p.team == "TST"
        assert p.epa_per_dropback == pytest.approx(0.15)
        assert p.scramble_rate == pytest.approx(0.06)
        assert p.adot == pytest.approx(8.5)
        assert p.target_hhi == pytest.approx(0.2)
        assert p.trust_target_share_3rd == pytest.approx(0.35)
        assert p.verification == Verification.COMPUTED

    def test_first_read_rate_is_gap_not_zero(self, prov):
        p = prov.get_qb_profile("Q1", 3, 2026)
        assert p.first_read_rate is None
        assert p.data_gap and "first_read_rate" in p.data_gap

    def test_unknown_qb_raises_data_gap(self, prov):
        with pytest.raises(DataGapError) as e:
            prov.get_qb_profile("Q9", 3, 2026)
        assert e.value.track == "qb_behavior"

    def test_point_in_time_week(self, prov):
        p = prov.get_qb_profile("Q1", 2, 2026)
        assert p.week == 2  # request echoed; data served is latest <= 2

    def test_future_week_serves_latest_with_gap_note(self, prov):
        p = prov.get_qb_profile("Q1", 9, 2026)
        assert p.data_gap and "through week 3" in p.data_gap


class TestPressureSplitsUnparked:
    def test_splits_served_not_parked(self, prov):
        s = prov.get_pressure_splits("Q1", 3, 2026)
        assert s.qb_id == "Q1"
        assert s.verification == Verification.COMPUTED
        assert s.int_rate_clean is not None and s.int_rate_pressure is not None
        assert 0 <= s.int_rate_clean <= 1 and 0 <= s.int_rate_pressure <= 1

    def test_epa_splits_with_enough_pressured_dropbacks(self, prov):
        s = prov.get_pressure_splits("Q1", 3, 2026)
        assert s.epa_per_dropback_clean == pytest.approx(0.25)
        assert s.epa_per_dropback_pressure == pytest.approx(-0.15)

    def test_floor_guard_nulls_epa_below_100(self, tmp_path):
        weekly = [_weekly_row(week=3, n_press=40)]
        d = _fixture_dir(tmp_path, weekly, [], [])
        p = SituationalQBProvider(d)
        s = p.get_pressure_splits("Q1", 3, 2026)
        assert s.epa_per_dropback_clean is None
        assert s.epa_per_dropback_pressure is None
        assert "100" in (s.data_gap or "")

    def test_data_gap_names_the_floor(self, prov):
        s = prov.get_pressure_splits("Q1", 3, 2026)
        assert "pressure_floor" in (s.data_gap or "")

    def test_unknown_qb_raises(self, prov):
        with pytest.raises(DataGapError):
            prov.get_pressure_splits("Q9", 3, 2026)


class TestExtras:
    def test_int_situational(self, prov):
        out = prov.get_int_situational(
            "Q1", 2026, 3,
            {"pressured": 0, "qtr": 1, "score_differential": 0,
             "yardline_100": 40, "down": 1, "ydstogo": 10})
        assert out["cell"] == "p0_q1_s1_z1_d0"
        assert out["level"] == "qb"
        assert 0 < out["rate"] < 0.1

    def test_trust_series(self, prov):
        s = prov.get_trust_series("Q1", 2026, "all")
        assert [p["week"] for p in s] == [1, 2, 3]

    def test_sensitivity_triple(self, prov):
        out = prov.get_sensitivity("Q1", 3, 2026)
        assert out["sensitivity_epa_floor"] == pytest.approx(0.40)
        assert out["clean_epa_baseline"] == pytest.approx(0.25)
        assert out["sens_se"] == pytest.approx(0.09)
