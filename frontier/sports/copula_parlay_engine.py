"""
copula_parlay_engine.py
Archimedean Copula and Correlated Same Game Parlay (SGP) Pricing Engine.
Implements:
1. Clayton Copula (asymmetric lower-tail dependence).
2. Frank Copula (radially symmetric dependence across the joint support).
3. Gumbel Copula (asymmetric upper-tail dependence for joint breakout props).
4. Fréchet-Hoeffding bounds enforcement on all joint evaluations.
5. Correlated parlay fair odds and bookmaker mispricing edge detection.
"""
import math
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple, Union
import numpy as np

class CopulaFamily(str, Enum):
    CLAYTON = "clayton"
    FRANK = "frank"
    GUMBEL = "gumbel"
    INDEPENDENT = "independent"

@dataclass
class ParlayPricingResult:
    joint_prob: float
    fair_decimal_odds: float
    naive_independent_prob: float
    naive_decimal_odds: float
    correlation_alpha: float # (joint_prob / naive_prob) - 1.0
    frechet_lower: float
    frechet_upper: float
    frechet_compliant: bool
    copula_family: str
    theta: float

class CopulaParlayEngine:
    """
    Quantitative Same Game Parlay (SGP) engine pricing multi-leg dependencies.
    """

    @staticmethod
    def clayton_copula(u: float, v: float, theta: float) -> float:
        """
        Clayton copula: C(u, v) = (u^(-theta) + v^(-theta) - 1)^(-1/theta)
        Valid for theta > 0. Exhibits strong lower-tail dependence.
        """
        if theta <= 0.0:
            raise ValueError(f"Clayton copula parameter theta must be > 0, got {theta}")
        u_c = float(max(1e-12, min(1.0, u)))
        v_c = float(max(1e-12, min(1.0, v)))

        val = (u_c ** (-theta)) + (v_c ** (-theta)) - 1.0
        if val <= 0.0:
            return 0.0
        c_val = val ** (-1.0 / theta)
        # Clamp to Fréchet bounds
        lower = max(0.0, u_c + v_c - 1.0)
        upper = min(u_c, v_c)
        return float(max(lower, min(upper, c_val)))

    @staticmethod
    def frank_copula(u: float, v: float, theta: float) -> float:
        """
        Frank copula: C(u, v) = -1/theta * ln(1 + (exp(-theta*u) - 1)(exp(-theta*v) - 1) / (exp(-theta) - 1))
        Valid for theta != 0. Symmetric dependence across distribution.
        """
        if abs(theta) < 1e-9:
            # Independent limit as theta -> 0
            return float(u * v)
        u_c = float(max(1e-12, min(1.0, u)))
        v_c = float(max(1e-12, min(1.0, v)))

        num = (math.expm1(-theta * u_c)) * (math.expm1(-theta * v_c))
        den = math.expm1(-theta)
        inside = 1.0 + (num / den)
        inside = max(1e-15, inside)

        c_val = -(1.0 / theta) * math.log(inside)
        lower = max(0.0, u_c + v_c - 1.0)
        upper = min(u_c, v_c)
        return float(max(lower, min(upper, c_val)))

    @staticmethod
    def gumbel_copula(u: float, v: float, theta: float) -> float:
        """
        Gumbel copula: C(u, v) = exp( - [ (-ln u)^theta + (-ln v)^theta ]^(1/theta) )
        Valid for theta >= 1.0. Exhibits strong upper-tail dependence (e.g. QB yards & WR yards).
        """
        if theta < 1.0:
            raise ValueError(f"Gumbel copula parameter theta must be >= 1.0, got {theta}")
        u_c = float(max(1e-12, min(1.0 - 1e-12, u)))
        v_c = float(max(1e-12, min(1.0 - 1e-12, v)))

        term = ((-math.log(u_c)) ** theta) + ((-math.log(v_c)) ** theta)
        c_val = math.exp(-(term ** (1.0 / theta)))
        lower = max(0.0, u_c + v_c - 1.0)
        upper = min(u_c, v_c)
        return float(max(lower, min(upper, c_val)))

    @classmethod
    def price_two_leg_parlay(
        cls,
        prob_leg1: float,
        prob_leg2: float,
        family: CopulaFamily = CopulaFamily.GUMBEL,
        theta: float = 1.5
    ) -> ParlayPricingResult:
        """
        Evaluates joint probability, fair decimal odds, and correlation edge over naive book odds.
        """
        if not (0.0 <= prob_leg1 <= 1.0 and 0.0 <= prob_leg2 <= 1.0):
            raise ValueError("Leg probabilities must be in [0, 1]")

        f_lower = max(0.0, prob_leg1 + prob_leg2 - 1.0)
        f_upper = min(prob_leg1, prob_leg2)
        naive_prob = prob_leg1 * prob_leg2

        if family == CopulaFamily.CLAYTON:
            joint = cls.clayton_copula(prob_leg1, prob_leg2, theta)
        elif family == CopulaFamily.FRANK:
            joint = cls.frank_copula(prob_leg1, prob_leg2, theta)
        elif family == CopulaFamily.GUMBEL:
            joint = cls.gumbel_copula(prob_leg1, prob_leg2, theta)
        elif family == CopulaFamily.INDEPENDENT:
            joint = naive_prob
        else:
            raise ValueError(f"Unsupported copula family: {family}")

        compliant = (f_lower - 1e-9 <= joint <= f_upper + 1e-9)

        fair_odds = 1.0 / max(1e-12, joint)
        naive_odds = 1.0 / max(1e-12, naive_prob)
        corr_alpha = (joint / max(1e-12, naive_prob)) - 1.0

        return ParlayPricingResult(
            joint_prob=joint,
            fair_decimal_odds=fair_odds,
            naive_independent_prob=naive_prob,
            naive_decimal_odds=naive_odds,
            correlation_alpha=corr_alpha,
            frechet_lower=f_lower,
            frechet_upper=f_upper,
            frechet_compliant=compliant,
            copula_family=family.value,
            theta=theta
        )
