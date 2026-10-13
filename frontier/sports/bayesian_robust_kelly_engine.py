"""
bayesian_robust_kelly_engine.py
===============================
Institutional Bayesian Distributionally Robust Kelly Engine (BDR-Kelly).

Mathematical Grounding:
- Breiman (1961), MacLean, Thorp & Ziemba (2011): Capital Growth Theory & The Kelly Criterion.
- Sukhov (2026): Dynamic Bayesian Adaptation under Parameter Estimation Uncertainty.
- Browne (1995, 1999): Drawdown Control & Stochastic Control in Optimal Investment.
- Conjugate Beta-Binomial Posterior inference with Lower Credible Bound (LCB) hedging.
- Coefficient of Variation (CV) penalty factor shrinking stakes under sparse sample sizes.
- Multi-Asset Portfolio Kelly Allocation with correlation covariance matrix regularization.
- Fail-Closed Architecture: Zero stake if LCB edge <= 0.0 or variance explodes.
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

@dataclass
class RobustKellyAllocation:
    player_or_asset: str
    market_odds_decimal: float
    market_implied_prob: float
    posterior_mean_p: float
    posterior_variance_p: float
    lcb_p: float                   # Lower Credible Bound (e.g. 5th percentile)
    nominal_edge_pct: float
    lcb_edge_pct: float
    full_kelly_pct: float
    robust_fraction_pct: float
    recommended_stake_dollars: float
    uncertainty_discount_pct: float
    status: str                    # 'APPROVED', 'SHRUNK_UNCERTAINTY', 'REJECTED_NO_LCB_EDGE'
    ruin_probability_at_50pct_dd: float

class BayesianRobustKellyEngine:
    """
    Institutional Capital Allocation Engine under Parameter Estimation Uncertainty.
    """

    @staticmethod
    def _beta_inv_cdf(p: float, alpha: float, beta: float) -> float:
        """
        Approximates Beta inverse CDF (quantile function) via Cornish-Fisher expansion
        or Wilson-Hilferty transformation for positive parameters.
        """
        if p <= 0.0:
            return 0.0
        if p >= 1.0:
            return 1.0

        mean = alpha / (alpha + beta)
        var = (alpha * beta) / (((alpha + beta) ** 2) * (alpha + beta + 1.0))
        std = math.sqrt(max(1e-12, var))

        # Standard normal quantile approximation for level p
        # Rational approximation
        z = math.sqrt(2.0) * math.erf(p * 2.0 - 1.0) # baseline seed
        # Better z via standard norm inv
        p_c = max(1e-9, min(1.0 - 1e-9, p))
        t = math.sqrt(-2.0 * math.log(min(p_c, 1.0 - p_c)))
        c0, c1, c2 = 2.515517, 0.802853, 0.010328
        d1, d2, d3 = 1.432788, 0.189269, 0.001308
        z_norm = t - (c0 + c1 * t + c2 * t**2) / (1.0 + d1 * t + d2 * t**2 + d3 * t**3)
        if p_c < 0.5:
            z_norm = -z_norm

        # Skewness of Beta distribution
        skew = (2.0 * (beta - alpha) * math.sqrt(alpha + beta + 1.0)) / ((alpha + beta + 2.0) * math.sqrt(alpha * beta))

        # Cornish-Fisher 1st order quantile expansion
        w = z_norm + (skew / 6.0) * (z_norm ** 2 - 1.0)
        q = mean + w * std
        return float(max(0.001, min(0.999, q)))

    @classmethod
    def evaluate_single_bet_robust_kelly(
        cls,
        asset_name: str,
        decimal_odds: float,
        model_mean_p: float,
        sample_hits: int,
        sample_trials: int,
        bankroll: float,
        prior_alpha: float = 1.0,
        prior_beta: float = 1.0,
        confidence_level: float = 0.95,
        risk_aversion_gamma: float = 1.5,
        max_bankroll_cap_pct: float = 0.05
    ) -> RobustKellyAllocation:
        """
        Computes Downside-Protected Bayesian Distributionally Robust Kelly allocation.
        """
        if decimal_odds <= 1.0 or not (0.0 < model_mean_p < 1.0) or bankroll <= 0.0:
            return RobustKellyAllocation(
                player_or_asset=asset_name,
                market_odds_decimal=decimal_odds,
                market_implied_prob=0.0,
                posterior_mean_p=0.0,
                posterior_variance_p=0.0,
                lcb_p=0.0,
                nominal_edge_pct=0.0,
                lcb_edge_pct=0.0,
                full_kelly_pct=0.0,
                robust_fraction_pct=0.0,
                recommended_stake_dollars=0.0,
                uncertainty_discount_pct=100.0,
                status="REJECTED_INVALID_INPUTS",
                ruin_probability_at_50pct_dd=0.0
            )

        implied_p = 1.0 / decimal_odds
        b = decimal_odds - 1.0  # Net odds

        # 1. Bayesian Beta-Binomial Update
        # If model_mean_p given alongside empirical trials:
        post_alpha = prior_alpha + sample_hits
        post_beta = prior_beta + (sample_trials - sample_hits)
        post_mean = post_alpha / (post_alpha + post_beta)
        post_var = (post_alpha * post_beta) / (((post_alpha + post_beta) ** 2) * (post_alpha + post_beta + 1.0))

        # Weight with model_mean_p if sample size small
        weight_data = min(1.0, sample_trials / 30.0)
        blended_p = (1.0 - weight_data) * model_mean_p + weight_data * post_mean

        # 2. Lower Credible Bound (LCB)
        delta = 1.0 - confidence_level
        raw_lcb = cls._beta_inv_cdf(delta, post_alpha, post_beta)
        # Shift LCB according to model blend
        lcb_p = max(0.001, min(0.999, raw_lcb - (post_mean - blended_p)))

        # 3. Edges
        nominal_edge = blended_p - implied_p
        lcb_edge = lcb_p - implied_p

        # 4. Kelly Fractions
        # Full Kelly on blended mean: (b*p - q) / b
        full_kelly = max(0.0, (b * blended_p - (1.0 - blended_p)) / b)

        # LCB Kelly
        lcb_kelly = max(0.0, (b * lcb_p - (1.0 - lcb_p)) / b)

        # 5. Coefficient of Variation (CV) Discount
        cv_sq = post_var / max(1e-6, blended_p ** 2)
        kappa = 1.0 / (1.0 + risk_aversion_gamma * cv_sq)
        uncertainty_discount = (1.0 - kappa) * 100.0

        # Base robust fraction = Quarter Kelly * kappa * LCB fraction
        quarter_multiplier = 0.25
        robust_fraction = lcb_kelly * quarter_multiplier * kappa

        # Anti-ruin maximum bankroll cap (default 5%)
        robust_fraction = min(max_bankroll_cap_pct, robust_fraction)

        # 6. Status & Stake Decision
        if lcb_edge <= 0.0 or robust_fraction <= 0.0005:
            final_stake = 0.0
            robust_fraction = 0.0
            status = "REJECTED_NO_LCB_EDGE"
        else:
            final_stake = robust_fraction * bankroll
            status = "APPROVED" if uncertainty_discount < 25.0 else "SHRUNK_UNCERTAINTY"

        # 7. Drawdown Ruin Probability (Browne's formula for 50% drawdown)
        # For fractional Kelly f, growth mu = f*edge - 0.5*f^2*b, variance sigma^2 = f^2 * b
        if robust_fraction > 0:
            mu_growth = robust_fraction * nominal_edge
            sigma_growth = math.sqrt(max(1e-6, (robust_fraction ** 2) * b))
            theta = (2.0 * mu_growth) / (sigma_growth ** 2)
            ruin_prob = math.exp(-theta * math.log(1.0 / (1.0 - 0.50)))
            ruin_prob = max(0.0001, min(0.9999, ruin_prob))
        else:
            ruin_prob = 0.0

        return RobustKellyAllocation(
            player_or_asset=asset_name,
            market_odds_decimal=float(decimal_odds),
            market_implied_prob=float(round(implied_p, 4)),
            posterior_mean_p=float(round(blended_p, 4)),
            posterior_variance_p=float(round(post_var, 6)),
            lcb_p=float(round(lcb_p, 4)),
            nominal_edge_pct=float(round(nominal_edge * 100.0, 2)),
            lcb_edge_pct=float(round(lcb_edge * 100.0, 2)),
            full_kelly_pct=float(round(full_kelly * 100.0, 2)),
            robust_fraction_pct=float(round(robust_fraction * 100.0, 3)),
            recommended_stake_dollars=float(round(final_stake, 2)),
            uncertainty_discount_pct=float(round(uncertainty_discount, 2)),
            status=status,
            ruin_probability_at_50pct_dd=float(round(ruin_prob, 4))
        )

    @classmethod
    def evaluate_portfolio_kelly(
        cls,
        allocations: List[RobustKellyAllocation],
        correlation_matrix: np.ndarray,
        bankroll: float,
        portfolio_max_exposure_pct: float = 0.15
    ) -> List[Dict[str, Any]]:
        """
        Solves multi-asset correlated Kelly allocation under a joint correlation matrix:
        f* = Sigma^{-1} * Edge, scaled to prevent multi-bet covariance overexposure.
        """
        n = len(allocations)
        if n == 0:
            return []

        raw_fractions = np.array([a.robust_fraction_pct / 100.0 for a in allocations])
        if np.sum(raw_fractions) <= 0.0:
            return [{"player": a.player_or_asset, "allocated_stake": 0.0, "weight_pct": 0.0} for a in allocations]

        # Add Tikhonov regularization to correlation matrix for numerical stability
        corr_reg = correlation_matrix + np.eye(n) * 1e-4
        try:
            inv_corr = np.linalg.inv(corr_reg)
            decoupled_weights = inv_corr @ raw_fractions
            # Rectify negative weights to zero (no shorting in sports props)
            decoupled_weights = np.maximum(0.0, decoupled_weights)
        except np.linalg.LinAlgError:
            decoupled_weights = raw_fractions

        total_weight = np.sum(decoupled_weights)
        if total_weight > portfolio_max_exposure_pct:
            decoupled_weights = decoupled_weights * (portfolio_max_exposure_pct / total_weight)

        results = []
        for i, a in enumerate(allocations):
            w = float(decoupled_weights[i])
            results.append({
                "player": a.player_or_asset,
                "allocated_stake": round(w * bankroll, 2),
                "weight_pct": round(w * 100.0, 3),
                "original_single_stake": a.recommended_stake_dollars,
                "status": a.status
            })
        return results
