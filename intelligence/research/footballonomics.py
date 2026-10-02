"""Footballonomics mean-field fourth down. Equations only. Missing inputs raise.

Source: Pelechrinis, arXiv:1601.04302, equations (4) and (5).

    E[P+] = 6 * s_4conv ** ((100 - l) / 29)
    E[P-] = 3 * s_fg + (3 * delta_pi_fg + 6 * delta_pi_td)
    E[P]  = E[P+] - E[P-]

29 is the paper's stated average drive length, not a length fitted here.
delta_pi is the increase versus a touchback. It is not in the extract as a
table. Net benefit refuses until that input is measured on our play-by-play.
This is not a fourth-down recommendation.
"""
from __future__ import annotations

PAPER = "1601.04302"
DRIVE_YARDS = 29.0
DRIVE_SOURCE = "paper stated average drive length, not fitted on this book"


class FourthDownGap(Exception):
    pass


def gamma(field_position_l: float) -> float:
    """Yards still to cover, divided by the paper's 29-yard drive."""
    if field_position_l < 0 or field_position_l > 100:
        raise FourthDownGap(f"{PAPER}: field position {field_position_l} is outside 0-100")
    return (100.0 - field_position_l) / DRIVE_YARDS


def expected_benefit(conversion_rate: float, field_position_l: float) -> float:
    if not 0.0 <= conversion_rate <= 1.0:
        raise FourthDownGap(f"{PAPER}: conversion rate {conversion_rate} is not a probability")
    return 6.0 * (conversion_rate ** gamma(field_position_l))


def expected_cost(field_goal_rate: float, delta_pi_fg: float | None, delta_pi_td: float | None) -> float:
    if delta_pi_fg is None or delta_pi_td is None:
        raise FourthDownGap(
            f"{PAPER}: delta_pi versus a touchback was not measured. "
            "The paper's figures are not a substitute."
        )
    if not 0.0 <= field_goal_rate <= 1.0:
        raise FourthDownGap(f"{PAPER}: field-goal rate {field_goal_rate} is not a probability")
    return 3.0 * field_goal_rate + (3.0 * delta_pi_fg + 6.0 * delta_pi_td)


def net_benefit(
    conversion_rate: float,
    field_position_l: float,
    field_goal_rate: float,
    delta_pi_fg: float | None,
    delta_pi_td: float | None,
) -> dict[str, object]:
    benefit = expected_benefit(conversion_rate, field_position_l)
    cost = expected_cost(field_goal_rate, delta_pi_fg, delta_pi_td)
    return {
        "paper": PAPER,
        "equation": "E[P+] - E[P-]",
        "expected_benefit": benefit,
        "expected_cost": cost,
        "net": benefit - cost,
        "drive_yards": DRIVE_YARDS,
        "drive_source": DRIVE_SOURCE,
        "weight": None,
        "weight_status": "withheld",
        "publishes_pick": False,
        "note": "Mean-field identity from the paper. Not a go-for-it call.",
    }
