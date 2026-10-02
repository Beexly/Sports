"""Kernels abstain. They do not invent a market, a form number, or a shell."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from kernels.three import KernelGap, kernel_01_market_strength, kernel_02_form, kernel_03_shell
from reasoning_engine.facets import epa_facets


def test_market_and_shell_stay_gaps():
    try:
        kernel_01_market_strength(None, {"targets": 8})
    except KernelGap as exc:
        assert exc.kernel == "01"
    else:
        raise AssertionError("missing market strength must gap")
    try:
        kernel_03_shell(None, {"targets": 8})
    except KernelGap as exc:
        assert "league rate" in exc.reason
    else:
        raise AssertionError("missing shell must gap")


def test_cle_facets_are_not_collapsed_into_form():
    facet = epa_facets("CLE", 2026, before_week=4)
    form = kernel_02_form(facet)
    assert form["form"] is None
    assert form["pass_epa"] == 11.91
    assert form["rush_epa"] == -21.279
    assert form["turnover_epa"] == -16.008
    assert form["weight"] is None
    assert form["pass_epa"] + form["rush_epa"] != form["form"]
