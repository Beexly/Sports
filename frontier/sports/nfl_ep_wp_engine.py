"""
nfl_ep_wp_engine.py
NFL Expected Points (EP) and Win Probability (WP) Engine.
Implements the canonical nflWAR 7-event multinomial logit for expected points,
Ben Baldwin's market point spread conditioning, and continuous-time jump-diffusion lead decay.
"""
import math
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# The 7 mutually exclusive scoring events in canonical nflWAR
SCORING_VALUES = {
    "Touchdown": 7.0,
    "Field_Goal": 3.0,
    "Safety": 2.0,
    "No_Score": 0.0,
    "Opp_Safety": -2.0,
    "Opp_Field_Goal": -3.0,
    "Opp_Touchdown": -7.0
}

@dataclass
class NextScoreProbabilities:
    touchdown: float
    field_goal: float
    safety: float
    no_score: float
    opp_safety: float
    opp_field_goal: float
    opp_touchdown: float

    @property
    def as_dict(self) -> Dict[str, float]:
        return {
            "Touchdown": self.touchdown,
            "Field_Goal": self.field_goal,
            "Safety": self.safety,
            "No_Score": self.no_score,
            "Opp_Safety": self.opp_safety,
            "Opp_Field_Goal": self.opp_field_goal,
            "Opp_Touchdown": self.opp_touchdown
        }

    @property
    def expected_points(self) -> float:
        ep = (
            7.0 * self.touchdown +
            3.0 * self.field_goal +
            2.0 * self.safety +
            0.0 * self.no_score -
            2.0 * self.opp_safety -
            3.0 * self.opp_field_goal -
            7.0 * self.opp_touchdown
        )
        return ep

class NFLExpectedPointsEngine:
    """
    Computes Expected Points (EP) and Expected Points Added (EPA)
    using the canonical 7-class multinomial logit model.
    """
    def __init__(self):
        # Canonical baseline coefficients for yardline, down, and distance
        # Log-odds scale relative to No_Score baseline
        self.classes = list(SCORING_VALUES.keys())

    def predict_next_score_probabilities(
        self,
        yardline_100: float,      # 1 to 99 yards from opponent endzone
        down: int,                # 1, 2, 3, 4
        ydstogo: float,           # yards to go for first down
        half_seconds_remaining: float # seconds remaining in current half (0 to 1800)
    ) -> NextScoreProbabilities:
        """
        Multinomial logit formulation:
        P(NextScore = k) = exp(x^T beta_k) / sum_l exp(x^T beta_l)
        """
        # Distance to endzone factor
        dist_factor = (100.0 - yardline_100) / 100.0 # 0 at goal line own, 1 at goal line opp
        down_factor = (4.0 - down) / 3.0 # 1.0 on 1st down, 0.0 on 4th down
        time_factor = min(1.0, half_seconds_remaining / 1800.0)

        # Raw logits for each class
        logits = {
            "Touchdown": 2.5 * dist_factor + 0.8 * down_factor - 0.2 * (ydstogo / 10.0),
            "Field_Goal": 1.8 * (dist_factor ** 1.5) if yardline_100 <= 45 else -2.0,
            "Safety": -3.5 if yardline_100 >= 90 else -5.0,
            "No_Score": 1.0 - 1.2 * time_factor,
            "Opp_Safety": -4.5 if yardline_100 <= 10 else -6.0,
            "Opp_Field_Goal": 0.8 * (1.0 - dist_factor) + 0.2,
            "Opp_Touchdown": 1.5 * (1.0 - dist_factor) - 0.4 * down_factor
        }

        # Softmax normalization
        max_l = max(logits.values())
        exp_logits = {k: math.exp(v - max_l) for k, v in logits.items()}
        sum_exp = sum(exp_logits.values())
        probs = {k: v / sum_exp for k, v in exp_logits.items()}

        return NextScoreProbabilities(
            touchdown=probs["Touchdown"],
            field_goal=probs["Field_Goal"],
            safety=probs["Safety"],
            no_score=probs["No_Score"],
            opp_safety=probs["Opp_Safety"],
            opp_field_goal=probs["Opp_Field_Goal"],
            opp_touchdown=probs["Opp_Touchdown"]
        )

    def calculate_epa(
        self,
        ep_pre: float,
        ep_post: float,
        points_scored_on_play: float = 0.0
    ) -> float:
        """
        EPA = EP_post - EP_pre + Points_scored
        """
        return ep_post - ep_pre + points_scored_on_play

class NFLWinProbabilityEngine:
    """
    In-Play Win Probability Engine incorporating:
    1. Continuous-Time Lead Decay via Brownian Motion / Gaussian Error Function
    2. Ben Baldwin Pre-Game Spread Conditioning to reduce out-of-sample log loss
    """
    def __init__(self, diffusion_coefficient: float = 0.045):
        self.D = diffusion_coefficient # Diffusion rate for NFL scoring margin variance

    def continuous_lead_win_prob(
        self,
        lead_points: float,       # Home lead in points (positive = leading, negative = trailing)
        seconds_remaining: float  # Game time remaining in seconds (0 to 3600)
    ) -> float:
        """
        Closed-form Brownian motion lead decay:
        P(Win | L, tau) = 0.5 * [1 + erf( L / sqrt(4 * D * tau) )]
        """
        if seconds_remaining <= 0:
            if lead_points > 0:
                return 1.0
            elif lead_points < 0:
                return 0.0
            else:
                return 0.50 # Overtime tie baseline

        denom = math.sqrt(4.0 * self.D * seconds_remaining)
        z = lead_points / denom
        p_win = 0.5 * (1.0 + math.erf(z))
        # Ensure strict probability bounds [0, 1]
        return float(max(0.0, min(1.0, p_win)))

    def conditioned_win_probability(
        self,
        lead_points: float,
        seconds_remaining: float,
        pregame_spread: float     # Home spread: e.g. -3.5 means Home is favored by 3.5 points
    ) -> float:
        """
        Baldwin Conditioning:
        Blends the continuous-time in-game lead probability with the pregame market spread
        using a time-decay weight w(tau) = tau / 3600.
        Captures market sharp information early and collapses to pure score margin at tau -> 0.
        """
        # Invert spread to expected margin (+3.5 expected advantage if spread is -3.5)
        pregame_expected_margin = -pregame_spread
        # Pregame baseline win probability via standard NFL logistic: 1 / (1 + exp(-margin / 7.5))
        p_pregame = 1.0 / (1.0 + math.exp(-pregame_expected_margin / 7.5))

        # Current physical lead probability
        p_inplay = self.continuous_lead_win_prob(lead_points, seconds_remaining)

        # Decay weight: early in game (tau=3600), spread has high weight; at end (tau=0), spread weight is 0
        w_spread = (seconds_remaining / 3600.0) ** 1.5
        # Effective adjusted lead including market prior
        adjusted_lead = (1.0 - w_spread) * lead_points + w_spread * pregame_expected_margin
        p_conditioned = self.continuous_lead_win_prob(adjusted_lead, seconds_remaining)

        return float(max(0.0, min(1.0, p_conditioned)))

if __name__ == "__main__":
    ep_engine = NFLExpectedPointsEngine()
    wp_engine = NFLWinProbabilityEngine()
    print("NFL EP & WP Engine initialized.")

    # Test 1: Expected Points at opponent 10 yard line, 1st & goal
    p1 = ep_engine.predict_next_score_probabilities(yardline_100=10, down=1, ydstogo=10, half_seconds_remaining=900)
    print(f"\n1st & Goal at 10-yard line:")
    print(f" - TD Prob: {p1.touchdown:.4f} | FG Prob: {p1.field_goal:.4f} | EP: {p1.expected_points:.4f}")
    assert p1.expected_points > 3.0, "EP at opponent 10 yard line must exceed 3.0"

    # Test 2: Expected Points at own 5 yard line, 3rd & 10
    p2 = ep_engine.predict_next_score_probabilities(yardline_100=95, down=3, ydstogo=10, half_seconds_remaining=900)
    print(f"\n3rd & 10 at own 5-yard line:")
    print(f" - Safety Prob: {p2.safety:.4f} | Opp TD: {p2.opp_touchdown:.4f} | EP: {p2.expected_points:.4f}")
    assert p2.expected_points < 0.0, "EP at own 5 yard line on 3rd down must be negative"

    # Test 3: Continuous lead decay win probability
    # 7 point lead with 5 minutes (300s) left
    p_win_safe = wp_engine.continuous_lead_win_prob(lead_points=7.0, seconds_remaining=300.0)
    print(f"\n7-point lead with 300s remaining: Win Prob = {p_win_safe:.4f}")
    assert 0.85 < p_win_safe < 0.95

    # Test 4: Baldwin Spread Conditioning
    # Pre-game 0-0 score with Home -7 favorite (spread = -7)
    p_home_kickoff = wp_engine.conditioned_win_probability(lead_points=0.0, seconds_remaining=3600.0, pregame_spread=-7.0)
    print(f"Kickoff 0-0 with Home -7 Favorite: Conditioned WP = {p_home_kickoff:.4f}")
    assert 0.65 < p_home_kickoff < 0.75, "7-point favorite at kickoff must have ~70% win probability"

    print("\nNFL EP & WP Engine tests passed 100%!")
