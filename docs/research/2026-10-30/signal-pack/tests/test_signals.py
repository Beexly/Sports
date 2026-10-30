"""Signal tests on real data. Data files live in the pack's data/ dir
(fetched by gse_signal_pack.data on first use); tests skip only when a
source is genuinely absent, never silently."""
import os

import pandas as pd
import pytest

from gse_signal_pack import data, signals

WEEKS = list(range(1, 8))  # the complete-week window of the 2026-10-30 build


@pytest.fixture(scope="module")
def pbp():
    if not os.path.exists(os.path.join(data.DATA_DIR, "play_by_play_2026.csv.gz")):
        pytest.skip("nflverse pbp not downloaded")
    return data.load_pbp(weeks=WEEKS)


@pytest.fixture(scope="module")
def posmap():
    return data.position_map()


@pytest.fixture(scope="module")
def roster():
    return data.load_roster()


def test_red_zone_shares_sum_to_one(pbp, posmap):
    cell = signals.red_zone_expected_td_share(pbp, posmap)
    wide = signals.red_zone_share_wide(cell)
    assert len(wide) == 32
    share_cols = [c for c in wide.columns if c.endswith("_xtd_share")]
    sums = wide[share_cols].sum(axis=1)
    assert ((sums - 1.0).abs() < 1e-6).all()
    assert (wide.rz_opps_faced > 25).all()  # every defense faced a real RZ sample


def test_missed_tackles_endpoints():
    path = data.pfr_defense_adv_path()
    if not os.path.exists(path):
        pytest.skip("PFR defense page not fetched")
    mt = signals.missed_tackles_by_defense(
        open(path, encoding="utf-8", errors="ignore").read())
    assert len(mt) == 32
    assert mt.iloc[0].team == "DET" and mt.iloc[0].mtkl == 12  # post endpoint
    assert mt.iloc[-1].team == "DEN" and mt.iloc[-1].mtkl == 56
    assert set(mt.tail(3).team) == {"PHI", "CLE", "DEN"}       # worst cluster


def test_throwaway_rate_named_qbs(pbp, roster):
    path = data.pfr_passing_adv_path()
    if not os.path.exists(path):
        pytest.skip("PFR passing page not fetched")
    acc = data.parse_pfr_passing_accuracy(
        open(path, encoding="utf-8", errors="ignore").read())
    tw = signals.qb_throwaway_rate(acc, pbp, roster, min_dropbacks=100)
    assert len(tw) >= 20
    by_name = tw.set_index("qb")
    # The post's top group must be the public top group (values diverge;
    # see outputs/03 summary) — all three in the top 6, rates in a sane band.
    for name in ["Bryce Young", "Bo Nix", "Jayden Daniels"]:
        assert by_name.loc[name, "rank"] <= 6
        assert 0.05 < by_name.loc[name, "thawy_per_dropback"] < 0.12


def test_rb_leaderboard_shape_and_count(pbp, posmap):
    rb = signals.rb_rushing_epa(pbp, posmap, min_attempts=45)
    assert len(rb) == 39  # the source chart's stated qualification count
    assert rb.epa_per_att.is_monotonic_decreasing
    assert (rb.att >= 45).all()
    assert rb.iloc[0].epa_per_att > 0.1  # a real rushing offense leads


def test_big_plays_quadrants(pbp):
    bp = signals.big_plays_vs_success(pbp)
    assert len(bp) == 32
    assert set(bp.quadrant.str[:2]) == {"Q1", "Q2", "Q3", "Q4"}
    assert ((bp.success_rate > 0.3) & (bp.success_rate < 0.6)).all()
    assert ((bp.big_play_rate > 0.03) & (bp.big_play_rate < 0.2)).all()


def test_defensive_epa_by_quarter_shape(pbp):
    dq = signals.defensive_epa_by_quarter(pbp)
    assert len(dq) == 32
    for c in ["q1_epa_allowed", "q2_epa_allowed", "q3_epa_allowed",
              "q4_epa_allowed"]:
        assert dq[c].notna().all()
    # League mean EPA/play allowed across defenses is ~0 by construction.
    assert abs(dq.all_q_epa_allowed.mean()) < 0.02
