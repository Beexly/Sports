"""
nfl_fourth_down_engine.py
Ben Baldwin 4th-Down Decision Engine.
Implements the decision-tree expected value and win-probability model:
1. Fourth-down conversion probability estimation via logistic distance modeling.
2. Field goal make probability curve conditioned on kick distance.
3. Net expected points (EP) and win probability (WP) across:
   - Branch A: Go for it (Conversion vs Turnover on Downs)
   - Branch B: Field Goal attempt (Make vs Miss)
   - Branch C: Punt (Net punt distance / pin inside 20)
4. Recommendation policy with strict statistical edge thresholding.
"""
import math
from dataclasses import dataclass
from typing import Dict, Optional, Tuple
import numpy as np

@dataclass
class FourthDownDecision:
    recommendation: str # 'GO_FOR_IT', 'FIELD_GOAL', 'PUNT'
    ev_go: float
    ev_fg: float
    ev_punt: float
    best_ev: float
    net_go_advantage: float # ev_go - max(ev_fg, ev_punt)
    conv_prob: float
    fg_make_prob: float
    strength: str # 'STRONG', 'LEAN', 'TOSS_UP'

class NFLFourthDownEngine:
    """
    Quantitative 4th-down decision modeling engine.
    """
    def __init__(self):
        from sports.nfl_ep_wp_engine import NFLExpectedPointsEngine, NFLWinProbabilityEngine
        self.ep_engine = NFLExpectedPointsEngine()
        self.wp_engine = NFLWinProbabilityEngine()

    @staticmethod
    def estimate_conversion_probability(ydstogo: float) -> float:
        """
        Empirical logistic curve for 4th down conversion:
        P(conv) = 1 / (1 + exp(0.38 * ydstogo - 1.10))
        4th & 1: ~67.3%
        4th & 2: ~58.4%
        4th & 5: ~31.0%
        4th & 10: ~9.1%
        """
        z = 0.38 * max(0.5, ydstogo) - 1.10
        return float(1.0 / (1.0 + math.exp(z)))

    @staticmethod
    def estimate_fg_make_probability(yardline_100: float) -> float:
        """
        FG distance = yardline_100 + 17 yards.
        P(make) = 1 / (1 + exp(0.12 * (dist - 44.0)))
        """
        dist = yardline_100 + 17.0
        if dist < 20.0:
            return 0.99
        if dist > 65.0:
            return 0.05
        z = 0.12 * (dist - 44.0)
        return float(1.0 / (1.0 + math.exp(z)))

    def evaluate_decision(
        self,
        yardline_100: float,      # 1 to 99 yards from opponent endzone
        ydstogo: float,           # Yards to 1st down or TD
        half_seconds: float = 900.0
    ) -> FourthDownDecision:
        """
        Computes expected points for all 3 tactical branches.
        """
        p_conv = self.estimate_conversion_probability(ydstogo)
        p_fg = self.estimate_fg_make_probability(yardline_100)

        # 1. Branch A: Go For It
        # Conversion state:
        new_ydl = max(1.0, yardline_100 - ydstogo)
        ep_conv = self.ep_engine.predict_next_score_probabilities(
            yardline_100=new_ydl, down=1, ydstogo=min(10.0, new_ydl), half_seconds_remaining=half_seconds
        ).expected_points

        # Failed conversion state: Opponent takes over on downs at 100 - yardline_100
        opp_ydl_fail = max(1.0, 100.0 - yardline_100)
        opp_ep_fail = self.ep_engine.predict_next_score_probabilities(
            yardline_100=opp_ydl_fail, down=1, ydstogo=min(10.0, opp_ydl_fail), half_seconds_remaining=half_seconds
        ).expected_points
        ep_fail = -opp_ep_fail # Inverted because opponent has ball

        ev_go = p_conv * ep_conv + (1.0 - p_conv) * ep_fail

        # 2. Branch B: Field Goal Attempt
        # Make: 3 points scored - opponent touchback drive EP (~0.80)
        ep_fg_make = 3.0 - 0.80
        # Miss: Opponent takes over at spot of kick (yardline + 7) or own 20
        opp_ydl_miss = max(20.0, 100.0 - (yardline_100 + 7.0))
        opp_ep_miss = self.ep_engine.predict_next_score_probabilities(
            yardline_100=opp_ydl_miss, down=1, ydstogo=10.0, half_seconds_remaining=half_seconds
        ).expected_points
        ep_fg_miss = -opp_ep_miss

        # Only evaluate FG if within reasonable distance (<= 45 yardline, <= 62 yard FG)
        if yardline_100 <= 45:
            ev_fg = p_fg * ep_fg_make + (1.0 - p_fg) * ep_fg_miss
        else:
            ev_fg = -5.0 # Unviable kick distance

        # 3. Branch C: Punt
        # Net punt distance ~40 yards, clamped to opponent 10 if near endzone
        opp_ydl_punt = max(10.0, min(80.0, 100.0 - (yardline_100 - 40.0))) if yardline_100 > 40 else 80.0
        opp_ep_punt = self.ep_engine.predict_next_score_probabilities(
            yardline_100=opp_ydl_punt, down=1, ydstogo=10.0, half_seconds_remaining=half_seconds
        ).expected_points
        ev_punt = -opp_ep_punt

        # Determine optimal tactical branch
        best_ev = max(ev_go, ev_fg, ev_punt)
        net_go_adv = ev_go - max(ev_fg, ev_punt)

        if best_ev == ev_go:
            rec = "GO_FOR_IT"
            adv = net_go_adv
        elif best_ev == ev_fg:
            rec = "FIELD_GOAL"
            adv = ev_fg - max(ev_go, ev_punt)
        else:
            rec = "PUNT"
            adv = ev_punt - max(ev_go, ev_fg)

        if adv > 0.60:
            strength = "STRONG"
        elif adv > 0.20:
            strength = "LEAN"
        else:
            strength = "TOSS_UP"

        return FourthDownDecision(
            recommendation=rec,
            ev_go=float(ev_go),
            ev_fg=float(ev_fg),
            ev_punt=float(ev_punt),
            best_ev=float(best_ev),
            net_go_advantage=float(net_go_adv),
            conv_prob=float(p_conv),
            fg_make_prob=float(p_fg),
            strength=strength
        )
