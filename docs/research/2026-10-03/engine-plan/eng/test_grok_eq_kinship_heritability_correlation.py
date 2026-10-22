"""Fail-closed tests for kinship_heritability_correlation."""
from __future__ import annotations

import sys
from pathlib import Path

# allow import from sibling
sys.path.insert(0, str(Path(__file__).resolve().parent))

from grok_eq_kinship_heritability_correlation import kinship_heritability_correlation


def test_valid_product():
    assert kinship_heritability_correlation(0.5, 0.25) == 0.125
    assert kinship_heritability_correlation(1.0, 1.0) == 1.0
    assert kinship_heritability_correlation(0.0, 0.5) == 0.0


def test_none_inputs():
    assert kinship_heritability_correlation(None, 0.25) is None
    assert kinship_heritability_correlation(0.5, None) is None


def test_out_of_bounds():
    assert kinship_heritability_correlation(1.1, 0.25) is None
    assert kinship_heritability_correlation(0.5, -0.1) is None
    assert kinship_heritability_correlation(0.5, 1.1) is None


def test_non_finite():
    assert kinship_heritability_correlation(float("nan"), 0.25) is None
    assert kinship_heritability_correlation(0.5, float("inf")) is None
    assert kinship_heritability_correlation("bad", 0.25) is None
