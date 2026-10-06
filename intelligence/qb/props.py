# PROVENANCE — gse-intelligence-build / qb / props.py
# Implements SYS-23 — INT prop pricing rule (kicker-defense-props) + the
# hard veto on individual-player sack props.
#
# Research: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md §SYS-23
#   (source: props/research/2026-09-25/kicker-defense-props-methodology.md
#    :85,95,112-113,130-134).
#
# DATA BASIS: the INT formula and both worked examples are the file's own
# arithmetic (no dataset needed). The team-sack "forced rates" use
# clearly-labeled illustrative league-average placeholders — the research
# supplies the veto and the method, not team-specific rates.

"""Prop pricing: INT expectation (SYS-23) and the sack-prop veto."""

import math

from .common import INT_COMPLETION_CONVERSION


class IndividualSackPropVeto(Exception):
    """Raised whenever an individual-player sack projection is requested.

    Hard veto from kicker-defense-props-methodology.md: individual sack props
    have negative predictive value — pressure→sack R² < 0.005. Pricing them
    from pressure rate manufactures edge that is not there. Team sacks only,
    from forced rates.
    """


def int_projection(worthy_int_rate=0.0366, expected_dropbacks=27.0,
                   completion_rate=INT_COMPLETION_CONVERSION):
    """Expected interceptions: E[INT] = worthy-INT rate × expected dropbacks
    × completion conversion (SYS-23).

    Data basis: the file's own formula and worked examples — no dataset.
    Defaults are the Allen example: 3.66% × 27.0 × 52.3% = 0.517 (≈ 0.5 at
    one decimal, as the file reports). The Goff example (1.44% × 34.2 × 52.3%)
    evaluates to 0.258, which the file reports as 0.3 — i.e. one-decimal
    rounding, documented here rather than silently "fixed".

    Returns a float (expected INTs, Poisson mean for the game).
    """
    return float(worthy_int_rate * expected_dropbacks * completion_rate)


def int_projection_detail(worthy_int_rate=0.0366, expected_dropbacks=27.0,
                          completion_rate=INT_COMPLETION_CONVERSION):
    """int_projection plus Poisson tail probabilities for line shopping.

    Returns dict with the expectation and P(≥1), P(≥2), P(≥3) under a
    Poisson(lambda) game model — the tail view a prop desk needs against the
    market's implied line (SYS-23 acceptance gate: Poisson deviance vs the
    market, adopt iff deviance improves ≥5%).
    """
    lam = int_projection(worthy_int_rate, expected_dropbacks, completion_rate)
    p_ge = lambda k: 1.0 - sum(
        math.exp(-lam) * lam ** j / math.factorial(j) for j in range(k))
    return {
        "method": "worthy_int_rate_x_dropbacks_x_completion",
        "worthy_int_rate": float(worthy_int_rate),
        "expected_dropbacks": float(expected_dropbacks),
        "completion_rate": float(completion_rate),
        "expected_ints": lam,
        "p_at_least_1": p_ge(1),
        "p_at_least_2": p_ge(2),
        "p_at_least_3": p_ge(3),
        "data_basis": "SYS-23 formula; Poisson game model (assumption, not research)",
    }


def individual_sack_projection(player_name):
    """ALWAYS raises IndividualSackPropVeto — individual sack props are
    unprojectable (pressure→sack R² < 0.005, negative predictive value).

    Data basis: the veto is the research finding itself (kicker-defense-props
    methodology, same file as SYS-23). There is no dataset that makes this
    projectable; the correct output is refusal, not a number.
    """
    raise IndividualSackPropVeto(
        "Individual-player sack props have negative predictive value "
        f"(pressure→sack R² < 0.005). Refusing to project {player_name!r}: "
        "team sacks only, from forced rates (see team_sack_projection)."
    )


# Illustrative league-average placeholders for the forced-rates method.
# These are NOT research numbers — the research supplies the veto and the
# method only. Labeled as placeholders everywhere they surface.
_FORCED_RATES_DEFAULTS = {
    "expected_dropbacks": 34.5,     # placeholder: league-average dropbacks/game
    "pressure_rate": 0.225,         # placeholder: pressures per dropback
    "forced_sack_per_pressure": 0.28,  # placeholder: FORCED conversion —
    # sacks per pressure at the team level (a forced rate, not a player trait)
}


def team_sack_projection(team_abbr, expected_dropbacks=None,
                         pressure_rate=None, forced_sack_per_pressure=None):
    """Expected team sacks from forced rates (SYS-23).

    E[team sacks] = expected dropbacks × team pressure rate
                    × forced sack-per-pressure conversion.

    The conversion is a *forced* rate — what the defense forces at the team
    level — never a player-specific pressure→sack rate (that path is vetoed:
    R² < 0.005). Data basis: method from the research; numeric defaults are
    illustrative league-average placeholders, labeled as such.
    """
    d = _FORCED_RATES_DEFAULTS
    db = d["expected_dropbacks"] if expected_dropbacks is None else expected_dropbacks
    pr = d["pressure_rate"] if pressure_rate is None else pressure_rate
    conv = (d["forced_sack_per_pressure"] if forced_sack_per_pressure is None
            else forced_sack_per_pressure)
    return {
        "method": "forced_rates",
        "team": str(team_abbr),
        "expected_dropbacks": float(db),
        "pressure_rate": float(pr),
        "forced_sack_per_pressure": float(conv),
        "expected_sacks": float(db * pr * conv),
        "veto_note": ("individual-player sack rates are vetoed "
                      "(pressure→sack R² < 0.005); this uses team-level "
                      "forced rates only"),
        "data_basis": ("SYS-23 method; numeric defaults are illustrative "
                       "league-average placeholders, not research numbers"),
    }
