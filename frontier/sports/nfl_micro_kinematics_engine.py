"""
nfl_micro_kinematics_engine.py
==============================
NFL Next-Gen Tracking Micro-Kinematics & Defensive Scheme Conditioning Engine.

Mathematical Grounding:
- Expected Points Added (EPA) & Completion Percentage Over Expected (CPOE) interaction.
- Defensive Coverage Shell Distributions: Cover-1 (Man-Free), Cover-2 (Tampa 2), Cover-3 (Single-High), Cover-4 (Quarters), Cover-6 (Split-Field).
- Pocket Survival Analysis: Exponential and Weibull decay models for offensive line protection under pass rush strain.
- Catch-Point Spatial Kinematics: Separation delta (Delta d) logistic regression and Yards After Catch (YAC) acceleration dynamics.
- Scheme-Conditioned Prior Adjustment for Continuous and Discrete Player Props.
"""

import math
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any

class DefensiveCoverageShell(str, Enum):
    COVER_1_MAN = "cover_1_man"        # Single high, man coverage underneath
    COVER_2_TAMPA = "cover_2_tampa"    # Two high safeties, middle hole linebacker
    COVER_3_ZONE = "cover_3_zone"      # Single high, 3-deep zone
    COVER_4_QUARTERS = "cover_4_quarters" # Two high, 4-deep zone
    COVER_6_SPLIT = "cover_6_split"    # Split field (Cover 4 to field, Cover 2 to boundary)
    BLITZ_HEAVY = "blitz_heavy"        # 5+ rushers (Zero or Cover-1 blitz)

@dataclass
class SchemeAdjustedPlayerProp:
    player: str
    position: str                      # 'QB', 'WR1', 'WR2', 'TE', 'RB'
    base_projection: float
    adjusted_projection: float
    mean_adjustment_pct: float
    volatility_scale_factor: float     # Multiplier on lognormal sigma
    scheme_driver: str
    pocket_survival_prob_at_2_5s: float
    expected_yac: float

class NFLMicroKinematicsEngine:
    """
    Next-Gen spatial kinematics and defensive scheme conditioning engine.
    """

    # Baseline league-wide time to pressure (seconds)
    LEAGUE_BASELINE_TTP: float = 2.50

    @classmethod
    def compute_pocket_survival(
        cls,
        time_to_pressure_half_life: float,
        evaluation_time: float = 2.50
    ) -> float:
        """
        Computes survival probability of clean pocket at evaluation_time (default 2.50s)
        using an exponential decay model: S(t) = exp(-lambda * t).
        """
        if time_to_pressure_half_life <= 0.5:
            return 0.05
        decay_lambda = math.log(2.0) / time_to_pressure_half_life
        survival = math.exp(-decay_lambda * evaluation_time)
        return float(max(0.01, min(0.99, survival)))

    @classmethod
    def compute_catch_probability_by_separation(
        cls,
        separation_yards: float,
        target_adot: float
    ) -> Dict[str, float]:
        """
        Computes conditional catch probability and expected YAC based on
        defender separation delta at target arrival:
        P(Catch | sep) = 1 / (1 + exp(-1.8 * (sep - 1.2)))
        """
        sep = max(0.0, float(separation_yards))
        # Logistic catch probability
        p_catch = 1.0 / (1.0 + math.exp(-1.8 * (sep - 1.2)))
        
        # Depth penalty on catch rate
        depth_penalty = max(0.0, (target_adot - 10.0) * 0.015) if target_adot > 10.0 else 0.0
        effective_catch_p = max(0.15, min(0.95, p_catch - depth_penalty))

        # Expected Yards After Catch (YAC)
        # Open field separation > 2.5 yards creates non-linear run-after-catch acceleration
        if sep >= 2.5:
            expected_yac = 3.5 + 1.2 * (sep - 2.5) ** 1.3
        else:
            expected_yac = max(0.5, 3.5 * (sep / 2.5))

        return {
            "separation_yards": float(sep),
            "effective_catch_p": float(round(effective_catch_p, 4)),
            "expected_yac": float(round(expected_yac, 2))
        }

    @classmethod
    def adjust_prop_for_defensive_scheme(
        cls,
        player: str,
        position: str,
        base_projection: float,
        opponent_primary_coverage: DefensiveCoverageShell,
        opponent_pass_rush_ttp: float = 2.45,
        target_share: float = 0.22,
        baseline_adot: float = 8.5
    ) -> SchemeAdjustedPlayerProp:
        """
        Adjusts continuous yardage baseline projection and dispersion for
        opponent defensive coverage scheme and pass rush kinematics.
        """
        pos = position.upper().strip()
        scheme = opponent_primary_coverage
        ttp_half_life = opponent_pass_rush_ttp
        clean_pocket_prob = cls.compute_pocket_survival(ttp_half_life, evaluation_time=2.50)

        # Baseline multiplier and volatility scale
        mult = 1.00
        vol_scale = 1.00
        scheme_driver_desc = f"Primary Coverage: {scheme.value}"

        # 1. Scheme-Specific Multipliers
        if scheme == DefensiveCoverageShell.COVER_1_MAN:
            if pos == "WR1":
                # Alpha receivers against single-high man coverage see high target share and deep shots
                mult *= 1.12
                vol_scale *= 1.18  # High boom-or-bust variance
                scheme_driver_desc += " | Man-Free gives WR1 isolated vertical matchups (+12% yards, +18% var)"
            elif pos == "TE":
                mult *= 0.92
                vol_scale *= 0.95
            elif pos == "RB":
                # Checkdowns suppressed under tight man coverage
                mult *= 0.90

        elif scheme == DefensiveCoverageShell.COVER_2_TAMPA:
            if pos == "WR1":
                # Deep boundary safeties bracket WR1
                mult *= 0.88
                vol_scale *= 0.90
                scheme_driver_desc += " | Cover-2 deep halves bracket boundary WR1 (-12% yards)"
            elif pos in ("TE", "WR2"):
                # Middle seam and underneath soft spots open up
                mult *= 1.18
                vol_scale *= 1.05
                scheme_driver_desc += " | Cover-2 opens middle seam for TE/Slot (+18% yards)"
            elif pos == "RB":
                mult *= 1.05

        elif scheme == DefensiveCoverageShell.COVER_3_ZONE:
            if pos == "WR1":
                mult *= 0.95
            elif pos == "RB":
                # Zone coverage underneath invites frequent checkdowns
                mult *= 1.15
                vol_scale *= 0.92  # Steady low-variance checkdown volume
                scheme_driver_desc += " | Single-High Zone deep drops create underneath checkdown floor (+15% yards)"
            elif pos == "TE":
                mult *= 1.08

        elif scheme == DefensiveCoverageShell.COVER_4_QUARTERS:
            if pos in ("WR1", "WR2"):
                # Quarters prevents all deep explosives
                mult *= 0.91
                vol_scale *= 0.85
                scheme_driver_desc += " | Quarters shell eliminates 20+ yard explosives (-9% yards)"
            elif pos == "RB":
                # Light 2-high safety boxes boost rushing efficiency
                mult *= 1.10
                vol_scale *= 1.05
                scheme_driver_desc += " | 2-high light boxes increase rushing efficiency (+10% yards)"

        elif scheme == DefensiveCoverageShell.BLITZ_HEAVY:
            # Heavy blitzing speeds up throw clock
            if pos == "QB":
                mult *= 0.92
                vol_scale *= 1.25  # High variance (sacks vs quick blitz-beater TDs)
            elif pos == "WR1":
                mult *= 1.10
                vol_scale *= 1.20
            elif pos == "RB":
                mult *= 1.12  # Screen passes and hot routes

        # 2. Pass Rush Pocket Collapse Adjustment
        # If TTP is under 2.30s, pass rush is lethal
        if opponent_pass_rush_ttp < 2.30:
            pressure_deficit = 2.50 - opponent_pass_rush_ttp
            if pos == "QB":
                qb_decay = max(0.75, 1.0 - (pressure_deficit * 0.18))
                mult *= qb_decay
                scheme_driver_desc += f" | Pass rush pressure strain decay (-{round((1.0 - qb_decay)*100, 1)}%)"
            elif pos in ("WR1", "WR2"):
                # Deep routes don't have time to develop
                deep_decay = max(0.80, 1.0 - (pressure_deficit * 0.15))
                mult *= deep_decay
            elif pos == "RB":
                # Checkdowns increase under pressure
                mult *= 1.08

        adjusted_projection = float(round(base_projection * mult, 2))
        mean_adj_pct = float(round((mult - 1.0) * 100.0, 2))

        # Expected YAC calculation
        sep_analysis = cls.compute_catch_probability_by_separation(separation_yards=2.8, target_adot=baseline_adot)
        expected_yac = sep_analysis["expected_yac"]

        return SchemeAdjustedPlayerProp(
            player=player,
            position=pos,
            base_projection=float(base_projection),
            adjusted_projection=adjusted_projection,
            mean_adjustment_pct=mean_adj_pct,
            volatility_scale_factor=float(round(vol_scale, 3)),
            scheme_driver=scheme_driver_desc,
            pocket_survival_prob_at_2_5s=float(round(clean_pocket_prob, 4)),
            expected_yac=float(expected_yac)
        )
