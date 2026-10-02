# PROVENANCE — qb-behavior / tests / test_eb_ladder.py
# Tests the INT EB-shrinkage ladder (serve.py): M=25, league->team->QB,
# null floors (n<30 back-off; QB pressure cells need >=100 pooled pressured
# dropbacks). Hermetic: synthetic cells injected directly, no CSVs.
# Research: verified-claims.md SIT-5 (c02-r36 denoised-rate auditor precedent).
"""EB ladder unit tests (pure python, synthetic cells)."""
import os
import sys

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BUILD_ROOT, "qb-behavior", "src"))

from qb_behavior.situational.serve import M_EB, SituationalStore


def _store_with(cells: dict, season_rows: dict | None = None) -> SituationalStore:
    st = SituationalStore.__new__(SituationalStore)
    st.data_dir = ""
    st.weekly, st.season, st.cells, st.meta = {}, season_rows or {}, cells, {}
    return st


def _mkrow(**kw):
    r = {"qb_id": "Q1", "name": "Test QB", "team": "TST", "season": "2025",
         "week": "18", "n_press": "200"}
    r.update(kw)
    return r


class TestEBLadder:
    CELL = "p0_q1_s1_z1_d0"

    def test_qb_level_served_with_enough_data(self):
        # league 2/100, team 3/100, qb 5/100 -> shrunk toward parents
        cells = {
            ("L", "NFL", "2025", self.CELL): (100, 2),
            ("T", "TST", "2025", self.CELL): (100, 3),
            ("Q", "Q1", "2025", self.CELL): (100, 5),
        }
        st = _store_with(cells)
        out = st.int_rate("Q1", "TST", "2025", self.CELL)
        assert out["level"] == "qb"
        # hand-computed ladder
        rL = (2 + M_EB * 0.01867) / (100 + M_EB)
        rT = (3 + M_EB * rL) / (100 + M_EB)
        rQ = (5 + M_EB * rT) / (100 + M_EB)
        assert abs(out["rate"] - rQ) < 1e-9
        assert out["n"] == 100

    def test_backoff_to_team_below_30(self):
        cells = {
            ("L", "NFL", "2025", self.CELL): (100, 2),
            ("T", "TST", "2025", self.CELL): (100, 3),
            ("Q", "Q1", "2025", self.CELL): (20, 1),
        }
        st = _store_with(cells)
        out = st.int_rate("Q1", "TST", "2025", self.CELL)
        assert out["level"] == "team"

    def test_backoff_to_league_when_team_thin(self):
        cells = {
            ("L", "NFL", "2025", self.CELL): (100, 2),
            ("T", "TST", "2025", self.CELL): (10, 0),
            ("Q", "Q1", "2025", self.CELL): (10, 0),
        }
        st = _store_with(cells)
        out = st.int_rate("Q1", "TST", "2025", self.CELL)
        assert out["level"] == "league"

    def test_empty_cells_shrink_to_baseline(self):
        st = _store_with({})
        out = st.int_rate("Q1", "TST", "2025", self.CELL)
        assert out["level"] == "league"
        assert abs(out["rate"] - 0.01867) < 1e-9

    def test_pressure_cell_needs_100_pressured_dropbacks(self):
        cell = "p1_q4_s0_z2_d3"
        cells = {
            ("L", "NFL", "2025", cell): (500, 10),
            ("T", "TST", "2025", cell): (200, 5),
            ("Q", "Q1", "2025", cell): (100, 4),
        }
        # pool pressured dropbacks = 50 < 100 -> back off even though n_qb=100
        season_rows = {("Q1", 2025): {"n_press": "50"}}
        st = _store_with(cells, season_rows)
        out = st.int_rate("Q1", "TST", "2025", cell)
        assert out["level"] == "team"
        # with 150 pooled pressured dropbacks -> qb level
        season_rows = {("Q1", 2023): {"n_press": "60"}, ("Q1", 2024): {"n_press": "60"},
                       ("Q1", 2025): {"n_press": "60"}}
        st = _store_with(cells, season_rows)
        out = st.int_rate("Q1", "TST", "2025", cell)
        assert out["level"] == "qb"

    def test_clean_cell_no_pressure_guard(self):
        cells = {
            ("L", "NFL", "2025", self.CELL): (100, 2),
            ("T", "TST", "2025", self.CELL): (100, 3),
            ("Q", "Q1", "2025", self.CELL): (100, 5),
        }
        st = _store_with({}, {})  # no season rows -> 0 pooled pressured
        st.cells = cells
        out = st.int_rate("Q1", "TST", "2025", self.CELL)  # p0 cell
        assert out["level"] == "qb"


class TestMarginals:
    def test_marginal_sums_p_cells(self):
        cells = {
            ("L", "NFL", "2025", "p0_q1_s1_z1_d0"): (100, 2),
            ("L", "NFL", "2025", "p0_q2_s1_z1_d0"): (100, 4),
            ("L", "NFL", "2025", "p1_q1_s1_z1_d0"): (50, 3),
            ("Q", "Q1", "2025", "p0_q1_s1_z1_d0"): (80, 1),
            ("Q", "Q1", "2025", "p1_q1_s1_z1_d0"): (40, 2),
        }
        st = _store_with(cells)
        m0 = st.int_rate_marginal("Q1", "TST", "2025", 0)
        assert m0["n"] == 80 and m0["level"] == "qb"
        m1 = st.int_rate_marginal("Q1", "TST", "2025", 1)
        # n_qb=40 >= 30 but pooled pressured dropbacks = 0 < 100 -> team/league
        assert m1["level"] in ("team", "league")

    def test_season_key_for_2026(self):
        assert SituationalStore.season_key_for(2025, 18) == "2025"
        assert SituationalStore.season_key_for(2026, 3, 3) == "2026_w3"

    def test_season_key_caps_at_latest_week(self):
        # requesting week 9 with data through week 3 -> 2026_w3, never 2026_w9
        assert SituationalStore.season_key_for(2026, 9, 3) == "2026_w3"
        assert SituationalStore.season_key_for(2026, 2, 3) == "2026_w2"
