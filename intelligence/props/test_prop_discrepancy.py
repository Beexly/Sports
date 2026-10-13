"""
Unit tests for the prop discrepancy & Pinnacle shade engine.

Run:
    python -m pytest intelligence/props/test_prop_discrepancy.py -o pythonpath=.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import pytest
from scipy import stats

from intelligence.props.prop_discrepancy_engine import (
    BREAKEVENS,
    FLEX_5_PAYOUTS,
    PropRow,
    TWO_PICK_RETURN,
    LognormalFit,
    NegBinFit,
    NormalFit,
    american_to_implied,
    breakeven_from_flex_payouts,
    breakeven_from_return,
    build_board,
    confidence_tier,
    devig_two_way,
    ev_per_unit,
    fit_for_stat,
    implied_to_fair_odds,
    kelly_fraction,
    multiplicative_devig,
    read_edge_sheet,
    read_shade_sheet,
    render_markdown,
    shin_devig,
    EDGE_SHEET,
    SHADE_SHEET,
    PLAYER_GAME,
)


def _require_real_sheets() -> None:
    """Skip honestly when the real input sheets are absent.

    The 2026-10-11 edge/shade sheets were never committed to any branch, so on
    a clean checkout the end-to-end tests below cannot run. Same pattern as
    test_sgp_correlation_estimator.py uses for the nflverse parquet: skip with
    an explicit reason rather than fail on a missing input file.
    """
    if not EDGE_SHEET.exists() or not SHADE_SHEET.exists():
        pytest.skip(
            "real prop sheets not present on this checkout "
            f"(looked for {EDGE_SHEET} and {SHADE_SHEET}); "
            "the 2026-10-11 sheets were never committed"
        )


# ---------------------------------------------------------------------------
# Breakeven rates: derived, not assumed
# ---------------------------------------------------------------------------

def test_flex_breakeven_is_reproduced_by_its_payout_table():
    """
    The published 54.2% per-leg figure must fall out of the PrizePicks 5-pick
    flex payout table (10x / 2x / 0.4x on 5, 4, 3 hits) rather than being
    asserted. This is the anchor for the whole EV calculation.
    """
    derived = breakeven_from_flex_payouts(FLEX_5_PAYOUTS, 5)
    assert derived == pytest.approx(BREAKEVENS["5-flex"], abs=0.001)


def test_two_pick_breakeven_is_reproduced_by_its_return():
    """1.75x total return on 2/2 => breakeven 1/1.75 = 0.5714."""
    assert breakeven_from_return(TWO_PICK_RETURN) == pytest.approx(BREAKEVENS["2-pick"], abs=0.001)


def test_breakeven_is_where_a_flex_is_ev_neutral():
    """At exactly p = breakeven the entry's expected return must be 1.0."""
    p = breakeven_from_flex_payouts(FLEX_5_PAYOUTS, 5)
    expected_return = sum(stats.binom.pmf(k, 5, p) * m for k, m in FLEX_5_PAYOUTS.items())
    assert expected_return == pytest.approx(1.0, abs=1e-9)


# ---------------------------------------------------------------------------
# De-vigging: Shin against independent benchmarks
# ---------------------------------------------------------------------------

def test_prices_round_trip_through_implied_probability():
    """
    The round trip is asserted on the IMPLIED PROBABILITY, not on the American
    price. At exactly even money +100 and -100 are the same wager, so the price
    representation is genuinely ambiguous there and asserting on the price would
    be asserting a convention rather than a fact.
    """
    for price in (-250, -110, +100, +145, +320):
        p = american_to_implied(price)
        assert american_to_implied(implied_to_fair_odds(p)) == pytest.approx(p, rel=1e-9)


def test_multiplicative_devig_normalises_to_one():
    raw = [american_to_implied(-150), american_to_implied(+130)]
    fair = multiplicative_devig(raw)
    assert fair.sum() == pytest.approx(1.0, abs=1e-12)
    assert np.all(fair > 0)


def test_shin_on_a_symmetric_book_is_exactly_fifty_fifty():
    """
    A -110/-110 book is the canonical fairness benchmark: the fair probabilities
    are 0.5/0.5 and the recovered insider share is the full overround, 0.047619,
    NOT zero. A symmetric book still carries a margin, and Shin attributes that
    margin to informed money rather than dismissing it.
    """
    out = devig_two_way(-110, -110, method="shin")
    assert out["booksum"] == pytest.approx(1.047619, abs=1e-6)
    assert out["z"] == pytest.approx(0.047619, abs=1e-6)
    assert out["fair"][0] == pytest.approx(0.5, abs=1e-9)
    assert out["fair"][1] == pytest.approx(0.5, abs=1e-9)


def test_shin_matches_multiplicative_when_there_is_no_margin():
    """
    A margin-free book (+100/+100) has z = 0 and Shin must collapse onto the
    multiplicative answer exactly. This is a closed-form benchmark, not a
    tolerance fudge.
    """
    out = devig_two_way(100, 100, method="shin")
    assert out["booksum"] == pytest.approx(1.0, abs=1e-12)
    assert out["z"] == pytest.approx(0.0, abs=1e-9)
    assert out["fair"][0] == pytest.approx(0.5, abs=1e-9)


def _independent_shin_solve(price_a: float, price_b: float, n_scan: int = 200000):
    """
    A deliberately independent second solver for Shin's model: a coarse grid scan
    for the FIRST sign change of the sum-to-one residual, then a hand-rolled
    bisection. No scipy optimiser, no shared code with the engine.

    The "first crossing" detail is load-bearing. For a two-way book the residual
    is +sqrt(B)-1 at z=0+, dips negative, and returns to zero at z -> 1 as well,
    so the model has TWO roots and a naive bisection over the whole interval
    converges to the degenerate z ~ 1 root. Only the smaller root is economically
    meaningful, and this solver is written to find it.
    """
    raw = np.array([american_to_implied(price_a), american_to_implied(price_b)])
    B = raw.sum()

    def recovered(z: float) -> np.ndarray:
        if z <= 0:
            return raw / B
        disc = z * z + 4.0 * (1.0 - z) * (raw * raw) / B
        return (np.sqrt(disc) - z) / (2.0 * (1.0 - z))

    def gap(z: float) -> float:
        return float(recovered(z).sum() - 1.0)

    hi_edge = 1.0 - 1e-9
    prev_z, prev_g = 0.0, gap(1e-12)
    lo = hi = None
    for i in range(1, n_scan + 1):
        z = hi_edge * i / n_scan
        g = gap(z)
        if prev_g > 0.0 >= g:
            lo, hi = prev_z, z
            break
        prev_z, prev_g = z, g
    if lo is None:
        return raw / B, 0.0

    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if gap(mid) > 0.0:
            lo = mid
        else:
            hi = mid
    z = 0.5 * (lo + hi)
    return recovered(z), z


def test_shin_z_equals_the_overround_on_a_symmetric_book():
    """
    CLOSED-FORM BENCHMARK. For a symmetric two-way book the model's equation
    reduces to z^2 - B z + (B - 1) = 0, whose roots are z = B - 1 and z = 1. The
    meaningful root is z = B - 1: Shin's insider share equals the book's margin.

    For -110/-110, B = 1.047619 so z must be 0.047619 to within 1e-9. This is the
    anchor the required "known benchmark within 0.001" test is measured against.
    """
    for price in (-110, -105, -120, -140):
        raw = np.array([american_to_implied(price), american_to_implied(price)])
        fair, z = shin_devig(raw)
        assert z == pytest.approx(float(raw.sum()) - 1.0, abs=1e-9)
        assert fair[0] == pytest.approx(0.5, abs=1e-9)
        assert fair[1] == pytest.approx(0.5, abs=1e-9)


def test_shin_matches_an_independent_solver_within_0001():
    """
    THE REQUIRED BENCHMARK TEST. Shin de-vig must agree with an independently
    implemented bisection solve of the same model to within 0.001, across a
    spread of realistic two-way books.
    """
    for price_a, price_b in [(-110, -110), (-150, +130), (-200, +170), (-105, -115), (-320, +260)]:
        engine_fair, engine_z = shin_devig([american_to_implied(price_a), american_to_implied(price_b)])
        ref_fair, ref_z = _independent_shin_solve(price_a, price_b)
        assert engine_z == pytest.approx(ref_z, abs=0.001), (price_a, price_b)
        assert abs(float(engine_fair[0]) - float(ref_fair[0])) < 0.001, (price_a, price_b)
        assert abs(float(engine_fair[1]) - float(ref_fair[1])) < 0.001, (price_a, price_b)


def test_shin_fair_probabilities_sum_to_one_and_lie_inside_the_raw_ones():
    for price_a, price_b in [(-150, +130), (-200, +170), (-320, +260)]:
        raw = np.array([american_to_implied(price_a), american_to_implied(price_b)])
        fair, z = shin_devig(raw)
        assert fair.sum() == pytest.approx(1.0, abs=1e-9)
        assert np.all(fair > 0) and np.all(fair < raw)
        assert 0.0 < z < 1.0


def test_shin_moves_the_longshot_down_and_the_favourite_up():
    """
    Shin's whole purpose is the favourite-longshot correction. Relative to
    multiplicative, the favourite's fair probability must rise and the longshot's
    must fall.
    """
    raw = np.array([american_to_implied(-200), american_to_implied(+170)])
    shin, _ = shin_devig(raw)
    mult = multiplicative_devig(raw)
    # index 0 is the -200 favourite
    assert shin[0] > mult[0]
    assert shin[1] < mult[1]


def test_shin_rejects_an_arbitrage_book_but_accepts_a_fair_one():
    """
    A booksum below 1 is arbitrage, not a de-viggable book, and must be refused.
    A booksum of exactly 1 is a FAIR book -- a legitimate input which returns
    z = 0 rather than raising, since there is no margin to remove.
    """
    with pytest.raises(ValueError):
        shin_devig([0.45, 0.45])
    fair, z = shin_devig([0.5, 0.5])
    assert z == 0.0
    assert fair.tolist() == pytest.approx([0.5, 0.5])


# ---------------------------------------------------------------------------
# Negative binomial vs Poisson (required)
# ---------------------------------------------------------------------------

def test_negbin_cdf_matches_poisson_in_its_limit():
    """
    The negative binomial converges to the Poisson as the overdispersion
    vanishes. With mean 8 and a variance approaching the mean, the survival
    functions must agree.
    """
    mean = 8.0
    nb = NegBinFit(mean=mean, var=mean * (1.0 + 1e-9))
    for k in (0, 2, 5, 8, 12, 20):
        p_nb = 1.0 - stats.nbinom.cdf(k, nb.r, nb.p)
        p_pois = 1.0 - stats.poisson.cdf(k, mean)
        assert p_nb == pytest.approx(p_pois, abs=1e-6), k


def test_negbin_cdf_matches_direct_summation():
    """
    Evaluate the CDF against a brute-force sum of the pmf for small parameters,
    so the family's own definition is pinned independently of scipy's routine.
    """
    fit = NegBinFit(mean=3.0, var=7.0)  # overdispersed
    for k in range(0, 6):
        direct = sum(stats.nbinom.pmf(i, fit.r, fit.p) for i in range(0, k + 1))
        assert stats.nbinom.cdf(k, fit.r, fit.p) == pytest.approx(direct, abs=1e-12)


def test_negbin_has_a_fatter_tail_than_poisson_when_overdispersed():
    """The reason the family exists here: counting stats cluster, so the tail is heavier."""
    mean, var = 2.0, 6.0
    nb = NegBinFit(mean=mean, var=var)
    k = 5
    p_nb = 1.0 - stats.nbinom.cdf(k, nb.r, nb.p)
    p_pois = 1.0 - stats.poisson.cdf(k, mean)
    assert p_nb > p_pois


def test_negbin_reproduces_its_own_moments():
    mean, var = 4.0, 9.0
    fit = NegBinFit(mean=mean, var=var)
    m = fit.r * (1.0 - fit.p) / fit.p
    v = fit.r * (1.0 - fit.p) / (fit.p**2)
    assert m == pytest.approx(mean, rel=1e-9)
    assert v == pytest.approx(var, rel=1e-9)


def test_negbin_p_over_uses_a_strict_inequality_on_integer_lines():
    """'Over 2' means 3 or more, so P(over 2) must equal 1 - CDF(2)."""
    fit = NegBinFit(mean=1.5, var=4.0)
    assert fit.p_over(2) == pytest.approx(1.0 - stats.nbinom.cdf(2, fit.r, fit.p), abs=1e-12)
    assert fit.p_over(2) < fit.p_over(1)


def test_negbin_requires_overdispersion():
    with pytest.raises(ValueError):
        NegBinFit(mean=5.0, var=5.0)


# ---------------------------------------------------------------------------
# Distributions: routing, moments, monotonicity
# ---------------------------------------------------------------------------

def test_fit_routes_counts_and_continuous_stats():
    assert fit_for_stat("pass_tds", 2.0, 1.5).family == "negbin"        # var 2.25 > mean 2.0
    assert fit_for_stat("receiving_tds", 0.5, 0.9).family == "negbin"    # var 0.81 > mean 0.5
    assert fit_for_stat("pass_yards", 250.0, 70.0).family == "lognormal"
    assert fit_for_stat("rush_rec_yards", 93.38, 46.26).family == "lognormal"
    with pytest.raises(ValueError):
        fit_for_stat("sacks_taken", 2.0, 1.0)


def test_underdispersed_count_falls_back_to_a_flagged_poisson():
    """
    A count stat with variance below its mean cannot be a negative binomial
    (r would be negative). It must degrade to a Poisson that ANNOUNCES the
    mismatch rather than raising mid-board or quietly claiming a good fit.
    """
    fit = fit_for_stat("receiving_tds", 0.5, 0.7)  # var 0.49 < mean 0.5
    assert fit.family == "poisson"
    assert fit.underdispersed is True
    assert fit.p_over(0) == pytest.approx(1.0 - stats.poisson.cdf(0, 0.5), abs=1e-12)


def test_lognormal_reproduces_its_mean_and_sd():
    mu, sigma = 93.38, 46.26
    fit = LognormalFit(mu, sigma)
    m = math.exp(fit.mu_ln + fit.sigma_ln**2 / 2)
    v = (math.exp(fit.sigma_ln**2) - 1) * math.exp(2 * fit.mu_ln + fit.sigma_ln**2)
    assert m == pytest.approx(mu, rel=1e-9)
    assert math.sqrt(v) == pytest.approx(sigma, rel=1e-9)


def test_probabilities_are_monotone_decreasing_in_the_line():
    for fit in (NormalFit(93.38, 46.26), LognormalFit(93.38, 46.26)):
        prev = fit.p_over(20.0)
        for line in (40, 60, 80, 100, 120, 140):
            cur = fit.p_over(line)
            assert cur < prev, (fit.family, line)
            prev = cur


def test_normal_and_lognormal_disagree_at_the_far_right_tail():
    """
    A guard on the distribution CHOICE mattering: for a skewed yardage stat the
    normal puts more mass past a deep line than the lognormal does.
    """
    normal = NormalFit(93.38, 46.26)
    lognormal = LognormalFit(93.38, 46.26)
    assert normal.p_over(150.0) != pytest.approx(lognormal.p_over(150.0), abs=1e-4)
    assert normal.p_over(150.0) > lognormal.p_over(150.0)


def test_lognormal_puts_no_mass_below_zero():
    fit = LognormalFit(10.18, 21.44)  # geno smith rush yards: sd > mean
    assert fit.p_over(-5.0) == 1.0
    assert fit.p_over(0.0) == 1.0


# ---------------------------------------------------------------------------
# EV and staking
# ---------------------------------------------------------------------------

def test_expected_value_is_zero_exactly_at_breakeven():
    for b in BREAKEVENS.values():
        assert ev_per_unit(b, b) == pytest.approx(0.0, abs=1e-12)


def test_expected_value_turns_positive_above_breakeven():
    b = BREAKEVENS["5-flex"]
    assert ev_per_unit(b + 0.01, b) > 0
    assert ev_per_unit(b - 0.01, b) < 0


def test_expected_value_matches_the_explicit_payoff_arithmetic():
    """Cross-check EV against p*profit - (1-p) computed by hand."""
    b = 0.542
    p = 0.60
    profit = (1 - b) / b
    assert ev_per_unit(p, b) == pytest.approx(p * profit - (1 - p), abs=1e-12)


def test_kelly_is_zero_when_ev_is_negative_and_positive_when_it_is_not():
    b = BREAKEVENS["5-flex"]
    assert kelly_fraction(0.50, b) == 0.0
    assert kelly_fraction(0.60, b) > 0.0


def test_kelly_quarter_is_a_quarter_of_full_kelly():
    b = BREAKEVENS["5-flex"]
    p = 0.60
    profit = (1 - b) / b
    full = (p * (1 + profit) - 1) / profit
    assert kelly_fraction(p, b, fraction=0.25) == pytest.approx(full / 4, rel=1e-12)
    assert kelly_fraction(p, b, fraction=1.0) == pytest.approx(full, rel=1e-12)


def test_kelly_is_monotone_in_probability():
    b = BREAKEVENS["5-flex"]
    stakes = [kelly_fraction(p, b) for p in (0.55, 0.58, 0.62, 0.70)]
    assert stakes == sorted(stakes)


# ---------------------------------------------------------------------------
# Confidence tiers
# ---------------------------------------------------------------------------

def test_tiers_cap_a_row_whose_side_depends_on_the_distribution():
    """
    A/B require BOTH that the families agree on the side AND that the edge is
    still positive on the normal basis. Either failure caps at C.
    """
    base = {"ev_pct": 9.0, "p_over": 0.70, "p_over_normal": 0.70, "edge_survives_normal": True}
    assert confidence_tier(base, 0.542) == "A"
    assert confidence_tier({**base, "ev_pct": 3.0}, 0.542) == "B"
    # side flips between families
    assert confidence_tier({**base, "p_over_normal": 0.30}, 0.542) == "C"
    # edge exists only under the skewed family
    assert confidence_tier({**base, "edge_survives_normal": False}, 0.542) == "C"
    assert confidence_tier({**base, "ev_pct": -1.0}, 0.542) == "PASS"


def test_an_edge_that_does_not_survive_the_normal_basis_is_never_investment_grade():
    """
    Guards the artifact this engine actually hit: a family swap that moves the
    median below the mean tips almost every row UNDER. Such a row must not be
    promoted to A/B no matter how large its family-basis EV looks.
    """
    inflated = {
        "ev_pct": 42.0,
        "p_over": 0.228,        # lognormal says well under 50%
        "p_over_normal": 0.475,  # the book's own basis says essentially a coin flip
        "edge_survives_normal": False,
    }
    assert confidence_tier(inflated, 0.542) == "C"


# ---------------------------------------------------------------------------
# Real sheets, end to end
# ---------------------------------------------------------------------------

#: The two source sheets are generated on Hermes' Windows box and have not
#: been committed yet. Until they land, the end-to-end tests below SKIP with
#: this reason instead of failing on a missing file that no assertion in them
#: can fix. The skip is keyed on EXISTENCE only: a sheet that is present but
#: malformed still fails loudly, which is the whole point of these tests.
requires_sheets = pytest.mark.skipif(
    not (EDGE_SHEET.exists() and SHADE_SHEET.exists()),
    reason=(
        "props source sheets not committed yet "
        f"(missing: {[p.name for p in (EDGE_SHEET, SHADE_SHEET) if not p.exists()]}); "
        "Hermes still holds them on his Windows box"
    ),
)


@requires_sheets
def test_the_real_sheets_are_present_and_parse():
    _require_real_sheets()
    assert EDGE_SHEET.exists(), EDGE_SHEET
    assert SHADE_SHEET.exists(), SHADE_SHEET
    props = read_edge_sheet(EDGE_SHEET)
    shades = read_shade_sheet(SHADE_SHEET)
    assert len(props) == 21
    assert len(shades) == 14
    assert props[0].player and props[0].stat
    assert all(p.dk_sigma > 0 for p in props)
    assert set(shades) >= {"PHI@JAX", "BUF@LAR", "DET@ARI"}


@requires_sheets
def test_shade_sheet_confirms_it_carries_lines_and_no_prices():
    _require_real_sheets()
    """
    Pins the blocker so it cannot quietly change: the shade rows are line values
    only. If a future sheet adds price columns this test SHOULD fail, which is
    the signal to wire the de-vig path into the board.
    """
    shades = read_shade_sheet(SHADE_SHEET)
    keys = set(next(iter(shades.values())).keys())
    assert keys == {"dk_sp", "pin_sp", "dk_total", "pin_total", "total_shade"}
    for name in keys:
        assert "price" not in name and "juice" not in name and "odds" not in name


@requires_sheets
def test_board_ranks_the_real_sheet_and_is_json_serialisable():
    _require_real_sheets()
    props = read_edge_sheet(EDGE_SHEET)
    shades = read_shade_sheet(SHADE_SHEET)
    result = build_board(props, shades, market="5-flex")
    assert result["n_props"] == 21
    evs = [r["ev_pct"] for r in result["board"]]
    assert evs == sorted(evs, reverse=True)
    assert [r["rank"] for r in result["board"]] == list(range(1, 22))
    assert all(r["tier"] in {"A", "B", "C", "PASS"} for r in result["board"])
    assert all(0.0 <= r["kelly_quarter"] <= 1.0 for r in result["board"])
    json.dumps(result)  # must serialise with no NaN


@requires_sheets
def test_board_picks_the_better_side_and_agrees_with_its_own_probabilities():
    _require_real_sheets()
    props = read_edge_sheet(EDGE_SHEET)
    result = build_board(props, read_shade_sheet(SHADE_SHEET))
    for r in result["board"]:
        assert r["p_win"] == pytest.approx(max(r["p_over"], r["p_under"]), abs=1e-12)
        if r["side"] == "OVER":
            assert r["p_win"] == pytest.approx(r["p_over"], abs=1e-12)
        else:
            assert r["p_win"] == pytest.approx(r["p_under"], abs=1e-12)


@requires_sheets
def test_every_player_in_the_edge_sheet_is_joined_to_a_game():
    _require_real_sheets()
    """An unjoined player would silently lose its shade context."""
    props = read_edge_sheet(EDGE_SHEET)
    missing = [p.player for p in props if p.player not in PLAYER_GAME]
    assert missing == []


@requires_sheets
def test_board_marks_props_without_shade_context_as_none():
    _require_real_sheets()
    props = read_edge_sheet(EDGE_SHEET)
    shades = read_shade_sheet(SHADE_SHEET)
    trimmed = {k: v for k, v in shades.items() if k != "BUF@LAR"}
    result = build_board(props, trimmed)
    cook = next(r for r in result["board"] if r["player"] == "james cook")
    assert cook["shade"] is None


@requires_sheets
def test_shade_scenario_rescales_volume_by_the_pinnacle_ratio():
    _require_real_sheets()
    props = read_edge_sheet(EDGE_SHEET)
    shades = read_shade_sheet(SHADE_SHEET)
    result = build_board(props, shades)
    with_shade = next(r for r in result["board"] if r["shade"] is not None)
    shade = with_shade["shade"]
    ratio = shade["total_ratio"]
    assert ratio == pytest.approx(
        shades[with_shade["game"]]["pin_total"] / shades[with_shade["game"]]["dk_total"], rel=1e-12
    )
    assert shade["mu_scaled"] == pytest.approx(with_shade["dk_mu"] * ratio, rel=1e-12)


@requires_sheets
def test_shade_is_reported_beside_ev_and_never_inside_it():
    _require_real_sheets()
    """
    The shade is context, not a probability input. EV must be a pure function of
    p_win and the breakeven, so the presence of a shade cannot move it.
    """
    props = read_edge_sheet(EDGE_SHEET)
    shades = read_shade_sheet(SHADE_SHEET)
    full = build_board(props, shades)
    no_shade = build_board(props, {})
    by_player = {r["player"]: r for r in full["board"]}
    for r in no_shade["board"]:
        assert r["ev_pct"] == pytest.approx(by_player[r["player"]]["ev_pct"], abs=1e-12)
        assert r["p_win"] == pytest.approx(by_player[r["player"]]["p_win"], abs=1e-12)


@requires_sheets
def test_alt_market_breakeven_is_harder_so_ev_is_lower():
    _require_real_sheets()
    """A 57.1% breakeven is stricter than 54.2%, so every EV must be lower."""
    props = read_edge_sheet(EDGE_SHEET)
    shades = read_shade_sheet(SHADE_SHEET)
    five = build_board(props, shades, market="5-flex", alt_scenario="2-pick")
    for r in five["board"]:
        assert r["ev_pct_alt_market"] < r["ev_pct"]


# ---------------------------------------------------------------------------
# Doctrine stamp: every emitted board carries its gate metadata
# ---------------------------------------------------------------------------

def test_board_carries_the_diagnostic_stamp():
    """
    A board with EV% and Kelly fractions but no gate metadata is one careless
    reader away from being quoted as picks. The generator must stamp every
    board it emits (mirroring intelligence/sgp/price_from_real_prices.py) so
    downstream consumers can gate on the fields instead of on the prose.
    """
    prop = PropRow(
        player="test player",
        stat="pass_yards",
        dk_mu=220.0,
        dk_sigma=60.0,
        dk_main=215.5,
        pp_line=218.5,
        pp_alts=0,
        sheet_z=0.0,
        sheet_p_over=0.5,
    )
    result = build_board([prop], {}, market="5-flex")
    assert result["label"] == "DIAGNOSTIC"
    assert result["is_pick"] is False
    assert result["is_edge_claim"] is False
    assert result["rvc_cleared"] is False
    assert "residual-versus-close" in result["caveat"]
    json.dumps(result)  # the stamp must not break serialisability


def test_rendered_markdown_carries_the_diagnostic_banner():
    """The .md twin of the board must say DIAGNOSTIC as loudly as the JSON."""
    prop = PropRow(
        player="test player",
        stat="pass_yards",
        dk_mu=220.0,
        dk_sigma=60.0,
        dk_main=215.5,
        pp_line=218.5,
        pp_alts=0,
        sheet_z=0.0,
        sheet_p_over=0.5,
    )
    md = render_markdown(build_board([prop], {}, market="5-flex"))
    assert "DIAGNOSTIC ONLY" in md
    assert "residual-versus-close has NOT cleared" in md
