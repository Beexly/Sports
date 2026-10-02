"""Footballonomics mean-field fourth down. Equations only. Missing inputs raise.

Source: Pelechrinis, arXiv:1601.04302, equations (4) and (5).

    E[P+] = 6 * s_4conv ** ((100 - l) / 29)
    E[P-] = 3 * s_fg + (3 * delta_pi_fg + 6 * delta_pi_td)
    E[P]  = E[P+] - E[P-]

29 is the paper's stated average drive length, not a length fitted here.
delta_pi is measured on our play-by-play against the rule touchback spot.
A bin under the minimum count stays withheld. This is not a fourth-down
recommendation.
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


def _bin_name(value: int, width: int) -> str:
    lo = (int(value) // width) * width
    return f"{lo}-{lo + width - 1}"


def net_from_measurement(
    table: dict,
    offense_yards_to_goal: int,
    kick_distance: int,
    conversion_rate: float,
) -> dict[str, object]:
    """Apply equations (4) and (5) to a measured bin. Missing bins raise.

    A failed fourth down at offense_yards_to_goal hands the opponent the ball
    at their own yard line equal to that distance. Their yards-to-goal is
    100 minus that distance. The paper's l is yards already covered.
    """
    if not 1 <= int(offense_yards_to_goal) <= 99:
        raise FourthDownGap(f"{PAPER}: offense yards to goal {offense_yards_to_goal} has no bin")
    opponent_ytg = 100 - int(offense_yards_to_goal)
    wanted = _bin_name(opponent_ytg, 10)
    row = next((b for b in table.get("downs_bins", []) if b.get("bin_yards_to_goal") == wanted), None)
    if row is None or row.get("status") != "measured":
        raise FourthDownGap(f"{PAPER}: delta_pi bin {wanted} is withheld")
    kick_bin = _bin_name(int(kick_distance), 5)
    fg = next((b for b in table.get("field_goal_bins", []) if b.get("kick_distance") == kick_bin), None)
    if fg is None or fg.get("status") != "measured" or fg.get("make_rate") is None:
        raise FourthDownGap(f"{PAPER}: field-goal bin {kick_bin} is withheld")
    # l is yards from the offense's own goal.
    field_l = 100 - int(offense_yards_to_goal)
    out = net_benefit(
        conversion_rate,
        field_l,
        float(fg["make_rate"]),
        float(row["delta_pi_fg"]),
        float(row["delta_pi_td"]),
    )
    out["offense_yards_to_goal"] = int(offense_yards_to_goal)
    out["opponent_start_bin"] = wanted
    out["kick_bin"] = kick_bin
    out["delta_pi_n"] = row["n"]
    out["field_goal_n"] = fg["n"]
    out["note"] = "Measured inputs in the paper's equation. Not a go-for-it call."
    return out
