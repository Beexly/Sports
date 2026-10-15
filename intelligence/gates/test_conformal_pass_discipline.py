"""Conformal pass discipline: sanity, location lock, and PIT refusal.

The behavioral tests run on a deterministic fixture of settled games (the
frozen n=2,462 dataset itself is nflverse games.csv, which lives in the
walk-forward cache, not in this repo). The frozen record's published
numbers are pinned below as acceptance data: if the module's constants or
wrapper set drift from the frozen contract, these tests fail.

Frozen reference: dfs/walk_forward/conformal_results.json on branch
grok/walk-forward-2026-10-14 (Hermes, 2026-10-14), n=2,462, alpha=0.10.
"""
import json
import math
import os
import random
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from gates.conformal_pass_discipline import (
    ADVISORY_KEYS,
    ALPHA,
    GATE,
    LAW,
    MIN_PRIOR,
    MONDRIAN_MIN,
    SIGMA0,
    WRAPPER_NAMES,
    ConformalCalibrator,
    build_advisory,
    locked_center,
    score_rows,
)

FROZEN_WRAPPERS = {
    "fixed_center": {"n_bet": 2437, "n_no_bet": 25, "empirical_coverage": 0.9072630283135003, "average_width": 43.24333196553139},
    "locally_weighted": {"n_bet": 2437, "n_no_bet": 25, "empirical_coverage": 0.8978251949117768, "average_width": 42.6629207016532},
    "cqr": {"n_bet": 2437, "n_no_bet": 25, "empirical_coverage": 0.9105457529749692, "average_width": 43.944809191629055},
    "cqr_tail": {"n_bet": 2437, "n_no_bet": 25, "empirical_coverage": 0.9101354123922856, "average_width": 43.94152646696758},
    "mondrian": {"n_bet": 2431, "n_no_bet": 31, "empirical_coverage": 0.9095022624434389, "average_width": 44.123406005984945},
    "aci": {"n_bet": 2437, "n_no_bet": 25, "empirical_coverage": 0.8998768978251949, "average_width": 43.90069757899056},
    "dtaci": {"n_bet": 2437, "n_no_bet": 25, "empirical_coverage": 0.8978251949117768, "average_width": 43.32416906032007},
}

FORBIDDEN_ADVISORY_FIELDS = {
    "mu", "mean", "center", "centre", "price", "odds", "pick",
    "recommendation", "probability", "ev", "edge", "stake", "side",
}


def fixture_rows(n=400, seed=20261015):
    """Settled games with margins drawn around the close at the frozen sigma."""
    rng = random.Random(seed)
    rows = []
    for _ in range(n):
        spread = round(rng.uniform(-16.5, 16.5) * 2) / 2.0
        margin = float(int(round(spread + rng.gauss(0.0, SIGMA0))))
        rows.append({"spread_line": spread, "margin": margin, "pit_stamp": "settled"})
    return rows


# ---------------------------------------------------------------- (a) sanity


def test_constants_pinned_to_frozen_contract():
    assert ALPHA == 0.10
    assert SIGMA0 == 13.45
    assert GATE == 7.099
    assert MIN_PRIOR == 25
    assert MONDRIAN_MIN == 5
    assert set(FROZEN_WRAPPERS) == set(WRAPPER_NAMES)
    for w in FROZEN_WRAPPERS.values():
        assert w["n_bet"] + w["n_no_bet"] == 2462
        assert 0.89 < w["empirical_coverage"] < 0.92
        assert 40.0 < w["average_width"] < 46.0


def test_batch_summary_shape_and_gate_untouched():
    res = score_rows(fixture_rows())
    assert res["n"] == 400
    assert res["gate"] == 7.099
    assert res["gate_cleared"] is False
    assert res["passed"] is False
    assert res["emission"] == "ZERO_OBJECT"
    assert res["note"] == LAW
    # the fixture is drawn at the frozen sigma, so its Gaussian baseline
    # lands in the frozen baseline's neighborhood (it is not the frozen set)
    assert abs(res["baseline_gaussian_crps"] - 7.154021) < 1.0


def test_interval_sanity_on_fixture():
    rows = fixture_rows()
    res = score_rows(rows)
    for name in WRAPPER_NAMES:
        w = res["wrappers"][name]
        assert w["n_bet"] + w["n_no_bet"] == 400, name
        # thin history alone forces at least MIN_PRIOR NO_BETs per wrapper
        assert w["n_no_bet"] >= MIN_PRIOR, name
        assert w["n_bet"] > 300, name
        # coverage near the 0.90 nominal on data drawn at the frozen sigma
        assert 0.80 < w["empirical_coverage"] < 0.98, name
        # widths are real intervals, in the frozen record's neighborhood
        assert 20.0 < w["average_width"] < 70.0, name
        assert w["clears_crps_gate"] is False, name
    # stratum discipline can only add NO_BETs, never remove them
    assert (
        res["wrappers"]["mondrian"]["n_no_bet"]
        >= res["wrappers"]["fixed_center"]["n_no_bet"]
    )


def test_thin_history_is_no_bet_for_every_wrapper():
    cal = ConformalCalibrator()
    adv = cal.advise(-3.5)
    assert adv["verdict"] == "NO_BET"
    assert adv["calibration_n"] == 0
    assert len(adv["reasons"]) == len(WRAPPER_NAMES)
    assert all("insufficient_prior_rows" in r for r in adv["reasons"])
    assert all(v is None for v in adv["widths"].values())


def test_thin_mondrian_stratum_is_no_bet_even_with_global_depth():
    rows = [
        {"spread_line": 5.0 + (i % 3) * 0.5, "margin": float(3 + (i % 7)), "pit_stamp": "settled"}
        for i in range(80)
    ]
    cal = ConformalCalibrator.from_rows(rows)
    assert cal.calibration_n == 80
    adv = cal.advise(13.5)  # |spread| bin 2 has zero priors
    assert adv["verdict"] == "NO_BET"
    assert any(r.startswith("mondrian:") for r in adv["reasons"])
    covered = cal.advise(5.5)  # bin 1 is deep
    assert covered["verdict"] == "COVERED"
    assert covered["reasons"] == []
    assert all(v is not None and v > 0 for v in covered["widths"].values())


def test_streaming_matches_batch_per_wrapper():
    rows = fixture_rows()
    batch = score_rows(rows)["wrappers"]
    cal = ConformalCalibrator()
    stream_no_bet = {name: 0 for name in WRAPPER_NAMES}
    union_no_bet = 0
    for row in rows:
        dec = cal.decide(row["spread_line"])
        if any(not d["formed"] for d in dec.values()):
            union_no_bet += 1
        for name, d in dec.items():
            if not d["formed"]:
                stream_no_bet[name] += 1
        cal.fold(row["spread_line"], row["margin"], row["pit_stamp"])
    for name in WRAPPER_NAMES:
        assert stream_no_bet[name] == batch[name]["n_no_bet"], name
    # the union verdict refuses at least as often as any single wrapper
    assert union_no_bet >= max(stream_no_bet.values())


def test_build_advisory_is_the_producer_seam():
    rows = fixture_rows(300)
    adv = build_advisory(rows, -3.0)
    assert adv["calibration_n"] == 300
    assert adv["verdict"] in ("COVERED", "NO_BET")
    json.dumps(adv)  # must stay JSON-safe: it rides inside game reads


# ------------------------------------------------------- (c) location lock


def test_location_lock_batch_reports_zero_shift():
    res = score_rows(fixture_rows())
    assert res["max_abs_mean_shift"] == 0.0
    assert res["location_lock_verified"] is True


def test_location_lock_symmetric_midpoints_equal_the_close():
    cal = ConformalCalibrator.from_rows(fixture_rows(300))
    symmetric = ("fixed_center", "locally_weighted", "mondrian", "aci", "dtaci")
    for spread in (-13.5, -7.0, -3.5, 0.0, 2.5, 6.5, 10.0):
        dec = cal.decide(spread)
        for name in symmetric:
            d = dec[name]
            if d["formed"]:
                assert abs((d["lo"] + d["hi"]) / 2.0 - spread) < 1e-9, (name, spread)


def test_location_lock_cqr_endpoints_are_center_plus_residuals():
    cal = ConformalCalibrator.from_rows(fixture_rows(300))
    signed = cal.signed
    for spread in (-6.5, -1.0, 3.0, 9.5):
        dec = cal.decide(spread)
        for name in ("cqr", "cqr_tail"):
            d = dec[name]
            if d["formed"]:
                for endpoint in (d["lo"] - spread, d["hi"] - spread):
                    nearest = min(abs(endpoint - r) for r in signed)
                    assert nearest < 1e-6, (name, spread, endpoint)


def test_locked_center_refuses_non_finite():
    for bad in (float("inf"), float("nan")):
        try:
            locked_center(bad)
        except ValueError:
            pass
        else:
            raise AssertionError("non-finite center accepted")


# ---------------------------------------------------------------- PIT / folds


def test_fold_refuses_unsettled_rows():
    cal = ConformalCalibrator()
    for stamp in ("future", "unstamped", "", None):
        try:
            cal.fold(-3.5, 7.0, stamp)
        except ValueError:
            pass
        else:
            raise AssertionError(f"pit_stamp={stamp!r} folded into calibration")
    assert cal.calibration_n == 0


def test_fold_refuses_missing_values_no_imputation():
    cal = ConformalCalibrator()
    for spread, margin in ((None, 7.0), (-3.5, None)):
        try:
            cal.fold(spread, margin)
        except (ValueError, TypeError):
            pass
        else:
            raise AssertionError("missing value folded into calibration")
    assert cal.calibration_n == 0


def test_advisory_surface_has_no_center_price_or_pick():
    adv = ConformalCalibrator.from_rows(fixture_rows(300)).advise(-3.0)
    assert tuple(adv.keys()) == ADVISORY_KEYS
    assert not (set(adv.keys()) & FORBIDDEN_ADVISORY_FIELDS)
    assert not (set(adv["widths"].keys()) - set(WRAPPER_NAMES))
    assert adv["law"] == LAW
