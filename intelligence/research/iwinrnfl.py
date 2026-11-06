"""iWinRNFL coefficients, copied from the paper. Not a published probability.

Source: Pelechrinis, arXiv:1704.00197v3, Table 1. Standardized logistic
regression. Intercept is 0. The paper standardizes the inputs and does not
print the means and standard deviations in the extracted text. Without those
constants, applying the coefficients to a raw play is not the paper's model.
home_win_probability() refuses.
"""
from __future__ import annotations

from typing import Mapping

PAPER = "1704.00197v3"
INTERCEPT = 0.0

# Table 1. Standardized coefficients. Stars were significance marks, not values.
COEFS: dict[str, float] = {
    "possession_team_home": -0.88,
    "score_differential": 1.41,
    "home_timeouts": 0.06,
    "away_timeouts": -0.06,
    "ball_possession_time": -0.46,
    "time_lapsed": 0.43,
    "rating_differential": 1.72,
    "down_1": -0.39,
    "down_2": -0.29,
    "down_3": -0.20,
    "down_4": -0.05,
    "field_position": -0.41,
    "yards_to_go": 0.07,
    "possession_home_x_down_1": 0.65,
    "possession_home_x_down_2": 0.47,
    "possession_home_x_down_3": 0.30,
    "possession_home_x_down_4": 0.08,
    "possession_home_x_field_position": 1.05,
    "possession_home_x_yards_to_go": -0.18,
    "time_lapsed_x_rating_differential": -0.65,
    "time_lapsed_x_score_differential": 2.88,
}


class StandardizationMissing(Exception):
    """The paper's coefficients are for standardized inputs. The constants are not in the extract."""


def linear_predictor(standardized: Mapping[str, float]) -> float:
    missing = [name for name in COEFS if name not in standardized]
    if missing:
        raise StandardizationMissing(
            "missing standardized inputs: " + ", ".join(missing)
        )
    total = INTERCEPT
    for name, coef in COEFS.items():
        total += coef * float(standardized[name])
    return total


def home_win_probability(raw_play: Mapping[str, float] | None = None) -> float:
    """Refuse. Raw plays are not standardized, and the constants were not printed."""
    raise StandardizationMissing(
        f"{PAPER}: Table 1 coefficients are standardized. Means and standard "
        "deviations were not in the extracted paper. No win probability is emitted."
    )
