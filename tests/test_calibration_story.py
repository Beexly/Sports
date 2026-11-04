"""Tests for the calibration stakeholder artifacts.

The economics are the part most likely to be quietly wrong — a first draft
reported `wins - n` as "net units", which is not a P&L quantity at all. These
tests pin the arithmetic to hand-computed values.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
_MOD = REPO / "scripts" / "ops" / "calibration_story.py"

_spec = importlib.util.spec_from_file_location("calibration_story", _MOD)
cs = importlib.util.module_from_spec(_spec)
sys.modules["calibration_story"] = cs
_spec.loader.exec_module(cs)  # type: ignore[union-attr]


def rows(*specs):
    """specs: (pick_type, n_wins, n_losses, p)"""
    out = []
    for t, w, l, p in specs:
        out += [{"t": t, "p": p, "y": 1}] * w
        out += [{"t": t, "p": p, "y": 0}] * l
    return out


# --- constants ------------------------------------------------------------

def test_break_even_matches_standard_juice():
    # -110/-110 pays 100 on 110 staked -> 0.5238
    assert cs.BREAK_EVEN == pytest.approx(0.52381, abs=1e-5)
    assert cs.PAYOUT == pytest.approx(100 / 110)


# --- economics ------------------------------------------------------------

def test_net_units_matches_hand_computation():
    """60 wins, 40 losses at -110: 60*(100/110) - 40 = +14.5454..."""
    e = cs.economics(rows(("MONEYLINE", 60, 40, 0.6)))
    ml = e["MONEYLINE"]
    assert ml["net_units"] == pytest.approx(60 * (100 / 110) - 40, abs=0.05)
    assert ml["net_units"] == pytest.approx(14.5, abs=0.05)


def test_net_units_is_not_wins_minus_total():
    """Regression: the first draft printed (wins - n), which is always <= 0
    and contradicts a positive ROI. Net units must be positive here."""
    e = cs.economics(rows(("MONEYLINE", 60, 40, 0.6)))
    assert e["MONEYLINE"]["net_units"] > 0
    assert e["MONEYLINE"]["net_units"] != 60 - 100


def test_roi_per_unit_is_net_over_stake_count():
    e = cs.economics(rows(("SPREAD", 40, 60, 0.6)))
    # 40*(100/110) - 60 = -23.636 ; /100 = -0.2364
    assert e["SPREAD"]["roi_per_unit"] == pytest.approx(-0.23636, abs=1e-4)


def test_break_even_win_rate_gives_zero_roi():
    """52.38 wins of 100 is exactly break-even."""
    e = cs.economics(rows(("TOTAL", 524, 476, 0.55)))
    assert e["TOTAL"]["roi_per_unit"] == pytest.approx(0.0, abs=3e-3)


def test_edge_pts_measures_against_break_even_not_zero():
    # economics() rounds reported figures to 4dp for display, so compare at
    # that precision rather than demanding full float agreement.
    e = cs.economics(rows(("TOTAL", 55, 45, 0.55)))
    assert e["TOTAL"]["edge_pts"] == pytest.approx(0.55 - cs.BREAK_EVEN, abs=1e-4)


def test_all_aggregates_every_market():
    data = rows(("MONEYLINE", 70, 30, 0.7), ("SPREAD", 40, 60, 0.6))
    e = cs.economics(data)
    assert e["ALL"]["n"] == 200
    assert e["ALL"]["wins"] == 110
    total_net = e["MONEYLINE"]["net_units"] + e["SPREAD"]["net_units"]
    assert e["ALL"]["net_units"] == pytest.approx(total_net, abs=0.15)


def test_empty_market_is_omitted_not_crashed():
    e = cs.economics(rows(("MONEYLINE", 5, 5, 0.6)))
    assert "SPREAD" not in e
    assert "ALL" in e


# --- high-confidence exposure --------------------------------------------

def test_high_confidence_respects_the_threshold():
    data = rows(("SPREAD", 5, 5, 0.85), ("SPREAD", 5, 5, 0.60))
    hi = cs.high_confidence(data, 0.80)
    assert hi["SPREAD"]["n"] == 10
    assert hi["SPREAD"]["share_of_market"] == pytest.approx(0.5)


def test_high_confidence_reports_claimed_and_realized():
    data = rows(("MONEYLINE", 8, 2, 0.90))
    hi = cs.high_confidence(data, 0.80)["MONEYLINE"]
    assert hi["claimed"] == pytest.approx(0.90)
    assert hi["realized"] == pytest.approx(0.80)


def test_market_with_no_high_confidence_picks_is_omitted():
    hi = cs.high_confidence(rows(("TOTAL", 5, 5, 0.55)), 0.80)
    assert "TOTAL" not in hi


# --- bands ----------------------------------------------------------------

def test_bands_partition_every_pick():
    data = rows(("SPREAD", 1, 1, 0.55), ("SPREAD", 1, 1, 0.65),
                ("SPREAD", 1, 1, 0.75), ("SPREAD", 1, 1, 0.85))
    b = cs.bands(data)["SPREAD"]
    assert sum(x["n"] for x in b) == 8


def test_band_at_exactly_one_is_included():
    """p=1.0 must land in the top band, not fall through the upper edge."""
    b = cs.bands(rows(("MONEYLINE", 4, 0, 1.0)))["MONEYLINE"]
    assert sum(x["n"] for x in b) == 4
    assert b[-1]["band"].startswith("90")


# --- real evidence + artifact --------------------------------------------

def test_real_file_loads():
    r = cs.load()
    assert len(r) > 1000
    assert {x["t"] for x in r} >= {"MONEYLINE", "SPREAD", "TOTAL"}


def test_chart_is_written(tmp_path):
    png = tmp_path / "c.png"
    cs.chart(cs.load(), png)
    assert png.exists() and png.stat().st_size > 10_000


def test_main_writes_chart_and_json(tmp_path):
    assert cs.main(["--out", str(tmp_path)]) == 0
    assert (tmp_path / "calibration-reliability-by-market.png").exists()
    assert (tmp_path / "calibration-story-data.json").exists()
