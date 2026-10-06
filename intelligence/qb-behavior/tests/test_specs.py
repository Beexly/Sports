# PROVENANCE — qb-behavior / tests / test_specs.py
# Tests c02's SplitSpec implementations against c01's protocol
# (qb_behavior/splits.py: name, dimensions, compute(frame) -> dict) and
# against apply_split() with the real ProfileEngine on a tiny fixture season.
# Research: qb-behavior/README.md ("Interface contract with c02").
"""SplitSpec protocol conformance tests."""
import os
import sys

import polars as pl
import pytest

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BUILD_ROOT, "qb-behavior", "src"))
sys.path.insert(0, BUILD_ROOT)

from qb_behavior.situational import specs as S  # noqa: E402
from qb_behavior.splits import apply_split  # noqa: E402


def _frame(n=40) -> pl.DataFrame:
    return pl.DataFrame({
        "qb_hit": [1 if i % 3 == 0 else 0 for i in range(n)],
        "sack": [1 if i % 11 == 0 else 0 for i in range(n)],
        "qtr": [(i % 4) + 1 for i in range(n)],
        "score_differential": [-7 if i % 2 else 7 for i in range(n)],
        "yardline_100": [80 - i for i in range(n)],
        "down": [(i % 4) + 1 for i in range(n)],
        "ydstogo": [10 - (i % 9) for i in range(n)],
        "game_seconds_remaining": [1800 - i * 30 for i in range(n)],
        "pass_attempt": [0 if i % 11 == 0 else 1 for i in range(n)],
        "interception": [1 if i % 17 == 0 else 0 for i in range(n)],
        "epa": [0.1 * (i % 5 - 2) for i in range(n)],
        "receiver_player_id": [f"R{i % 5}" for i in range(n)],
        "air_yards": [float(i % 25) for i in range(n)],
    })


class TestProtocolConformance:
    @pytest.mark.parametrize("spec", list(S.SPLIT_SPECS.values()),
                             ids=list(S.SPLIT_SPECS.keys()))
    def test_protocol_shape(self, spec):
        # c01's SplitSpec is a non-runtime Protocol: check structural
        # conformance (name / dimensions / compute), not isinstance.
        assert isinstance(spec.name, str) and spec.name
        assert isinstance(spec.dimensions, tuple) and spec.dimensions
        assert callable(spec.compute)
        out = spec.compute(_frame(20))
        assert isinstance(out, dict) and out

    def test_registry_covers_contract_splits(self):
        # README: situational split matrices + trust-target splits
        assert "pressure_floor" in S.SPLIT_SPECS
        assert "int_situational" in S.SPLIT_SPECS
        assert "trust_situation" in S.SPLIT_SPECS


class TestPressureFloorSplit:
    def test_cells_sum_to_frame(self):
        out = S.PressureFloorSplit().compute(_frame(60))
        assert out[("0",)]["n"] + out[("1",)]["n"] == 60

    def test_sensitivity_is_clean_minus_pressured(self):
        out = S.PressureFloorSplit().compute(_frame(60))
        c0, c1 = out[("0",)], out[("1",)]
        sens = out[("sensitivity",)]["sens_epa_floor"]
        assert sens == pytest.approx(c0["epa_mean"] - c1["epa_mean"])
        assert out[("sensitivity",)]["clean_epa_baseline"] == pytest.approx(c0["epa_mean"])

    def test_se_nonnegative(self):
        out = S.PressureFloorSplit().compute(_frame(60))
        assert out[("sensitivity",)]["sens_se"] >= 0

    def test_empty_frame(self):
        out = S.PressureFloorSplit().compute(_frame(0))
        assert out[("0",)]["n"] == 0 and out[("1",)]["n"] == 0
        assert out[("sensitivity",)]["sens_epa_floor"] is None


class TestINTSituationalSplit:
    def test_cell_counts_match_manual(self):
        f = _frame(60)
        out = S.INTSituationalSplit().compute(f)
        total_n = sum(v["n"] for v in out.values())
        total_w = sum(v["w"] for v in out.values())
        n_att = f.filter(pl.col("pass_attempt") == 1).height
        n_int = int(f.filter(pl.col("pass_attempt") == 1)["interception"].sum())
        assert total_n == n_att and total_w == n_int

    def test_cell_key_shape(self):
        out = S.INTSituationalSplit().compute(_frame(60))
        import re
        for k in out:
            assert re.fullmatch(r"p[01]_q[1-4]_s[0-2]_z[0-2]_d[0-3]", k[0]), k


class TestTrustSituationSplit:
    def test_all_covers_everything(self):
        f = _frame(50)
        out = S.TrustSituationSplit().compute(f)
        assert out[("all",)]["n"] == 50
        assert sum(out[("all",)]["targets"].values()) == 50

    def test_situations_are_subsets(self):
        out = S.TrustSituationSplit().compute(_frame(50))
        for s in ("rz", "third", "twomin", "trailing", "press"):
            assert out[(s,)]["n"] <= out[("all",)]["n"]


class TestMarginalSplits:
    def test_down_distance_covers_frame(self):
        out = S.DownDistanceSplit().compute(_frame(60))
        assert sum(v["n"] for v in out.values()) == 60

    def test_field_zone_covers_frame(self):
        out = S.FieldZoneSplit().compute(_frame(60))
        assert sum(v["n"] for v in out.values()) == 60

    def test_script_covers_frame(self):
        out = S.ScriptSplit().compute(_frame(60))
        assert sum(v["n"] for v in out.values()) == 60

    def test_quarter_covers_frame(self):
        out = S.QuarterSplit().compute(_frame(60))
        assert sum(v["n"] for v in out.values()) == 60


class TestApplySplitIntegration:
    def test_apply_split_runs_on_engine_frame(self, tmp_path):
        # tiny synthetic pbp season through the REAL engine filters
        from qb_behavior import ProfileEngine
        n = 30
        pbp = pl.DataFrame({
            "season": [2026] * n, "week": [1] * n, "season_type": ["REG"] * n,
            "game_id": ["g1"] * n, "play_id": list(range(n)),
            "passer_player_id": ["Q1"] * n, "passer_player_name": ["Test QB"] * n,
            "posteam": ["TST"] * n,
            "qb_dropback": [1] * n, "pass_attempt": [1] * n,
            "qb_kneel": [0] * n, "qb_spike": [0] * n, "qb_scramble": [0] * n,
            "qb_hit": [1 if i % 4 == 0 else 0 for i in range(n)],
            "sack": [0] * n, "interception": [0] * n, "epa": [0.1] * n,
            "qtr": [1] * n, "wp": [0.5] * n,
            "score_differential": [0] * n, "yardline_100": [50] * n,
            "down": [1] * n, "ydstogo": [10] * n,
            "receiver_player_id": ["R1"] * n,
        })
        d = tmp_path / "pbp"
        d.mkdir()
        pbp.write_parquet(d / "pbp_2026.parquet")
        eng = ProfileEngine(data_dir=str(d), auto_name_map=False,
                            name_map={"Q1": "Test QB"})
        res = apply_split(eng, "Q1", 2026, S.PressureFloorSplit())
        assert res["split"] == "pressure_floor"
        assert res["n"] == n
        assert res["result"][("0",)]["n"] + res["result"][("1",)]["n"] == n
