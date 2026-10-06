# PROVENANCE — qb-behavior / tests / test_name_map_fix.py
# Regression test for the c02 2026-10-02 fix to ProfileEngine._ensure_name_map:
# the old code did df.select(idc, nmc).unique(), collapsing each (id, name) to
# ONE vote — so build_name_map_from_pbp's "most common wins" tied 1-1 between a
# 1-season variant ("Aa.Rodgers") and the 17-season canonical ("A.Rodgers"),
# resolving nondeterministically. The fix counts occurrences per (id, name).
"""Name-map determinism regression test (c02 fix)."""
import os
import sys
import tempfile

import polars as pl

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BUILD_ROOT, "qb-behavior", "src"))

from qb_behavior import ProfileEngine  # noqa: E402


def _pbp_rows(name: str, n: int, season: int) -> pl.DataFrame:
    return pl.DataFrame({
        "season": [season] * n, "week": [1] * n, "season_type": ["REG"] * n,
        "game_id": [f"g{season}"] * n, "play_id": list(range(n)),
        "passer_player_id": ["00-TEST"] * n, "passer_player_name": [name] * n,
        "posteam": ["TST"] * n, "qb_dropback": [1] * n,
        "pass_attempt": [1] * n, "qb_kneel": [0] * n, "qb_spike": [0] * n,
        "qb_scramble": [0] * n, "qb_hit": [0] * n, "sack": [0] * n,
        "interception": [0] * n, "epa": [0.1] * n, "qtr": [1] * n,
        "wp": [0.5] * n, "score_differential": [0] * n,
        "yardline_100": [50] * n, "down": [1] * n, "ydstogo": [10] * n,
    })


class TestNameMapDeterminism:
    def test_rare_variant_never_beats_canonical(self):
        tmp = tempfile.mkdtemp()
        # 17 seasons of "T.Quarterback", 1 season of the variant "Tt.Quarterback"
        for s in range(2008, 2025):
            _pbp_rows("T.Quarterback", 5, s).write_parquet(
                os.path.join(tmp, f"pbp_{s}.parquet"))
        _pbp_rows("Tt.Quarterback", 5, 2025).write_parquet(
            os.path.join(tmp, "pbp_2025.parquet"))
        eng = ProfileEngine(data_dir=tmp)
        eng._ensure_name_map()
        assert eng.name_map.get("00-TEST") == "T.Quarterback"

    def test_deterministic_across_runs(self):
        tmp = tempfile.mkdtemp()
        for s in (2024, 2025):
            _pbp_rows("A.Variant", 5, s).write_parquet(
                os.path.join(tmp, f"pbp_{s}.parquet"))
        names = set()
        for _ in range(3):
            eng = ProfileEngine(data_dir=tmp)
            eng._ensure_name_map()
            names.add(eng.name_map.get("00-TEST"))
        assert names == {"A.Variant"}
