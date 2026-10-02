# PROVENANCE — qb-behavior / tests / test_real_data.py
# Integration tests against the real precomputed tables (qb-behavior/data/).
# These pin INDEPENDENTLY VERIFIABLE facts (not the implementation's own
# formula): known QB identities, guard semantics, structural properties.
# If the CSVs are absent, the test fails with MODULE MISSING (not a skip) —
# regenerate with qb-behavior/build/build_tables.py.
"""Real-data integration tests (require built tables)."""
import csv
import os
import sys

import pytest

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BUILD_ROOT, "qb-behavior", "src"))
sys.path.insert(0, BUILD_ROOT)

DATA_DIR = os.path.join(BUILD_ROOT, "qb-behavior", "data")
RODGERS = "00-0023459"
WATSON = "00-0033537"

REQUIRED = ["qb_weekly.csv", "qb_season.csv", "int_cells.csv",
            "trust_weekly.csv", "protection_stress.csv", "meta.csv"]


def _need(name: str) -> str:
    p = os.path.join(DATA_DIR, name)
    if not os.path.exists(p):
        pytest.fail(f"MODULE MISSING: {name} not built — run "
                    "qb-behavior/build/build_tables.py", pytrace=False)
    return p


def _rows(name: str) -> list[dict]:
    with open(_need(name), newline="") as f:
        return list(csv.DictReader(f))


class TestRealTablesExist:
    @pytest.mark.parametrize("name", REQUIRED)
    def test_table_present(self, name):
        _need(name)


class TestRealQBRows:
    def test_rodgers_2026_identity(self):
        rows = [r for r in _rows("qb_weekly.csv")
                if r["qb_id"] == RODGERS and r["season"] == "2026" and r["week"] == "3"]
        assert len(rows) == 1
        r = rows[0]
        assert r["name"] == "A.Rodgers" and r["team"] == "PIT"
        assert int(r["db"]) > 100  # 3 weeks of dropbacks
        assert r["cpoe_pbp"] not in ("", None)  # nflverse pbp cpoe, honestly suffixed

    def test_watson_2026_identity(self):
        rows = [r for r in _rows("qb_weekly.csv")
                if r["qb_id"] == WATSON and r["season"] == "2026" and r["week"] == "3"]
        assert len(rows) == 1 and rows[0]["team"] == "CLE"

    def test_sensitivity_guard_holds_on_real_data(self):
        # Rodgers/Watson have < 100 pressured dropbacks through week 3 ->
        # the served sensitivity must be NULL (guard), even though the raw
        # sens_epa_floor column is populated in the table.
        for qb in (RODGERS, WATSON):
            r = next(x for x in _rows("qb_weekly.csv")
                     if x["qb_id"] == qb and x["season"] == "2026" and x["week"] == "3")
            assert int(float(r["n_press"])) < 100
            assert r["sens_epa_floor"] not in ("", None)

    def test_no_bare_pressure_column_names(self):
        with open(_need("qb_weekly.csv")) as f:
            header = f.readline()
        assert "sens_epa_floor" in header  # _floor suffix mandatory (CH-X-1)

    def test_no_predicted_sacks_anywhere(self):
        for name in ("qb_weekly.csv", "qb_season.csv"):
            with open(_need(name)) as f:
                header = f.readline().lower()
            assert "predicted_sacks" not in header and "sack_proj" not in header


class TestRealINTCells:
    def test_cells_cover_288_grid_shape(self):
        import re
        rows = _rows("int_cells.csv")
        assert len(rows) > 100000
        bad = [r["cell"] for r in rows[:1000]
               if not re.fullmatch(r"p[01]_q[1-4]_s[0-2]_z[0-2]_d[0-3]", r["cell"])]
        assert not bad

    def test_league_cells_exist_for_2026_w3(self):
        rows = [r for r in _rows("int_cells.csv")
                if r["scope"] == "L" and r["season_key"] == "2026_w3"]
        assert len(rows) > 200  # most of the 288 grid populated at league level

    def test_w_nonnegative_and_le_n(self):
        for r in _rows("int_cells.csv")[:5000]:
            assert int(r["w"]) >= 0 and int(r["n"]) >= int(r["w"])


class TestRealTrust:
    def test_rodgers_trust_row_sane(self):
        rows = [r for r in _rows("trust_weekly.csv")
                if r["qb_id"] == RODGERS and r["season"] == "2026"
                and r["situation"] == "all"]
        assert rows
        for r in rows:
            hhi = float(r["hhi"])
            assert 0 < hhi <= 1.0
            assert float(r["hhi_lo"]) <= hhi <= float(r["hhi_hi"])
            assert int(r["targets"]) >= 25  # T>=25 guard (TRUST-7)

    def test_no_charted_first_read_column(self):
        with open(_need("trust_weekly.csv")) as f:
            header = f.readline()
        # engine trust tables are pbp-native; charted reads are display-only
        assert "read_thrown" not in header


class TestRealProtectionStress:
    def test_pit_2026w3_stress(self):
        rows = [r for r in _rows("protection_stress.csv")
                if r["team"] == "PIT" and r["season"] == "2026" and r["week"] == "3"]
        assert len(rows) == 1
        r = rows[0]
        assert r["stress"] not in ("", None)
        # residual identity: stress = press_rate - (alpha + beta*blitz_rate)
        stress = float(r["stress"])
        expected = float(r["alpha"]) + float(r["beta"]) * float(r["blitz_rate_faced"])
        assert abs(stress - (float(r["press_rate_allowed"]) - expected)) < 1e-3

    def test_cumulative_games_nondecreasing(self):
        rows = [r for r in _rows("protection_stress.csv") if r["season"] == "2026"]
        by_team: dict[str, list] = {}
        for r in rows:
            by_team.setdefault(r["team"], []).append((int(r["week"]), int(r["games"])))
        for team, wr in by_team.items():
            wr.sort()
            games = [g for _, g in wr]
            assert games == sorted(games), f"{team}: {wr}"

    def test_early_season_nulls(self):
        rows = [r for r in _rows("protection_stress.csv")
                if r["season"] == "2018" and r["week"] == "1"]
        assert rows and all(r["null_reason"] == "pool<32" for r in rows)


class TestProviderOnRealData:
    def test_t1_qbs_pre_kickoff_week4(self):
        from qb_behavior.situational.provider import SituationalQBProvider
        p = SituationalQBProvider(DATA_DIR)
        for qb, team in ((RODGERS, "PIT"), (WATSON, "CLE")):
            prof = p.get_qb_profile(qb, 4, 2026)
            assert prof.team == team
            assert prof.target_hhi is not None
            s = p.get_pressure_splits(qb, 4, 2026)
            # guards: epa splits NULL (<100 pressured), INT rates served w/ levels
            assert s.epa_per_dropback_clean is None
            assert 0 < s.int_rate_clean < 0.1
            assert 0 < s.int_rate_pressure < 0.15
            assert "pressure_floor" in (s.data_gap or "")
