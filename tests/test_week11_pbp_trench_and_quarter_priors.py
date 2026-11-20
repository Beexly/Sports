from __future__ import annotations

import json
import math
from pathlib import Path

from scripts.ops.build_week11_pbp_trench_and_quarter_priors import (
    DEFAULT_OUT_PATH,
    DEFAULT_ROSTER_PATH,
    normalize_name,
)

ROOT = Path(__file__).resolve().parents[1]


def _walk_numbers(obj):
    if isinstance(obj, dict):
        for v in obj.values():
            yield from _walk_numbers(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _walk_numbers(v)
    elif isinstance(obj, float):
        yield obj


def test_feature_store_has_all_32_teams_and_bounded_rates():
    assert DEFAULT_OUT_PATH.exists(), f"Missing generated feature store: {DEFAULT_OUT_PATH}"
    raw = DEFAULT_OUT_PATH.read_text(encoding="utf-8")
    assert raw.isascii(), "Feature store must be pure 7-bit ASCII"

    store = json.loads(raw)
    assert store["teams_count"] == 32
    teams = store["teams"]
    assert len(teams) == 32

    for val in _walk_numbers(store):
        assert not math.isnan(val) and not math.isinf(val)

    for tm, tdata in teams.items():
        off = tdata["offense_trench"]
        dfn = tdata["defense_trench"]
        qsp = tdata["quarter_and_script_splits"]

        for key in (
            "dropback_sack_rate_allowed",
            "qb_hit_plus_sack_rate_allowed",
            "scramble_rate_allowed",
            "explosive_pass_rate_20p_allowed",
            "explosive_rush_rate_10p_allowed",
            "rush_stuff_rate_allowed",
            "third_down_conversion_rate_off",
            "red_zone_td_rate_off",
        ):
            assert 0.0 <= off[key] <= 1.0, f"{tm} {key}={off[key]}"

        for key in (
            "dropback_sack_rate_generated",
            "qb_hit_plus_sack_rate_generated",
            "third_down_conversion_rate_def",
            "red_zone_td_rate_def",
        ):
            assert 0.0 <= dfn[key] <= 1.0, f"{tm} {key}={dfn[key]}"

        for key in ("neutral_pass_rate", "trailing_8p_pass_rate", "leading_8p_rush_rate"):
            assert 0.0 <= qsp[key] <= 1.0, f"{tm} {key}={qsp[key]}"
        assert 15.0 <= qsp["neutral_sec_per_snap"] <= 45.0

        for pl in tdata["active_starter_shares"]:
            assert pl["player_gp"] >= 1
            for skey in (
                "target_share_1q",
                "target_share_1h",
                "target_share_full",
                "carry_share_1q",
                "carry_share_1h",
                "carry_share_full",
                "redzone_touch_share",
            ):
                assert 0.0 <= pl[skey] <= 1.0, f"{tm} {pl['player']} {skey}={pl[skey]}"

    # Pin verified IND & HOU Weeks 1-10 trench numbers
    assert abs(teams["IND"]["offense_trench"]["dropback_sack_rate_allowed"] - 0.071) < 0.002
    assert abs(teams["IND"]["offense_trench"]["qb_hit_plus_sack_rate_allowed"] - 0.1776) < 0.002
    assert abs(teams["HOU"]["offense_trench"]["dropback_sack_rate_allowed"] - 0.0484) < 0.002
    assert abs(teams["HOU"]["defense_trench"]["dropback_sack_rate_generated"] - 0.0917) < 0.002


def test_stage0_excluded_players_never_leak_into_active_shares():
    store = json.loads(DEFAULT_OUT_PATH.read_text(encoding="utf-8"))
    roster = json.loads(DEFAULT_ROSTER_PATH.read_text(encoding="utf-8"))
    excluded_norm = {
        normalize_name(item["name"])
        for item in roster.get("excluded_players", [])
        if item.get("name")
    }
    assert len(excluded_norm) >= 10

    emitted_players = set()
    for tdata in store["teams"].values():
        for pl in tdata["active_starter_shares"]:
            emitted_players.add(normalize_name(pl["player"]))

    leaked = emitted_players & excluded_norm
    assert not leaked, f"Stage 0 excluded players leaked into active shares: {leaked}"
