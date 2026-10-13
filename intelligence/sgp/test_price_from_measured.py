"""
Tests for the measured-correlation -> copula-engine adapter.

Run:
    python -m pytest intelligence/sgp/test_price_from_measured.py -o pythonpath=.
"""

from __future__ import annotations

import json

import numpy as np
import pytest

from intelligence.sgp.price_from_measured_correlations import (
    EXPECTED_LEG_ORDER,
    build_legs,
    load_measured,
    main,
)


def test_leg_order_matches_the_estimator():
    """
    The adapter and the estimator must agree on leg order. If they drift, each
    marginal is paired with the wrong column of the correlation matrix and the
    engine returns a plausible, meaningless number -- the worst failure mode in
    the set, because nothing crashes.
    """
    from intelligence.props.sgp_correlation_estimator import LEG_NAMES

    assert EXPECTED_LEG_ORDER == LEG_NAMES


def test_load_measured_rejects_a_reordered_matrix(tmp_path):
    """A reordered leg list must raise, not silently mispair."""
    p = tmp_path / "sgp_correlations.json"
    p.write_text(
        json.dumps(
            {
                "leg_names": list(reversed(EXPECTED_LEG_ORDER)),
                "matrix": np.eye(4).tolist(),
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="leg order mismatch"):
        load_measured(p)


def test_load_measured_missing_file_names_the_fix(tmp_path):
    with pytest.raises(FileNotFoundError, match="sgp_correlation_estimator"):
        load_measured(tmp_path / "nope.json")


def test_build_legs_returns_four_legs_with_matching_labels():
    legs = build_legs()
    assert len(legs) == 4
    assert all(leg.label for leg in legs), "every leg must carry a label"
    # the condition must actually discriminate on a plausible value range
    for leg in legs:
        assert leg.hit_mask(np.array([0.0, 1e9])).tolist() in ([False, True], [True, False])


def test_end_to_end_prices_from_the_committed_matrix():
    """
    The committed artifact must be usable by the engine: PSD, right shape, and a
    joint that is NOT the product of its marginals (that difference is the whole
    reason the copula exists).
    """
    from intelligence.sgp.sgp_copula_engine import price_sgp

    try:
        corr, _ = load_measured(__import__("pathlib").Path(
            "data/snapshots/sgp_correlations.json"
        ))
    except FileNotFoundError:
        pytest.skip("measured correlations not present on this checkout")

    assert corr.shape == (4, 4)
    result = price_sgp(legs=build_legs(), correlation=corr, n_draws=20_000, seed=7)
    assert 0.0 < result.true_joint < 1.0
    assert 0.0 < result.independent_joint < 1.0
    # positively correlated legs must price ABOVE independence
    assert result.true_joint > result.independent_joint
    # and the lift must agree with the two joints it is derived from
    assert result.correlation_lift == pytest.approx(
        (result.true_joint - result.independent_joint) / result.independent_joint, rel=1e-6
    )
    assert result.repaired_correlation is False, "the measured matrix is PSD; no repair should occur"


def test_main_runs_without_a_book_price_and_claims_no_alpha(capsys):
    try:
        rc = main([])
    except FileNotFoundError:
        pytest.skip("measured correlations not present on this checkout")
    out = capsys.readouterr().out
    assert rc == 0
    assert "No book price supplied" in out
    assert "measured" in out.lower()
