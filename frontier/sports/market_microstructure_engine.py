"""
Market Microstructure & Adversarial Execution Engine (MME)
==========================================================
Grounded in:
- "Deep Research Equation Extraction (3).docx" Part VII (Market Microstructure & CLV)
- Almgren-Chriss Square-Root Market Impact Dynamics: Delta P = eta * sigma * (Q / V)^0.5
- Schreiber (2000) Transfer Entropy for Sharp Money Lead-Lag Detection
- Continuous-time HJB Microstructure-Penalized Kelly Allocation
- Strictly fail-closed with finite boundary guarantees.
"""

import math
from typing import Dict, List, Optional, Tuple, Any

class MarketMicrostructureEngine:
    """
    Advanced sports betting market microstructure engine handling CLV,
    market impact estimation, transfer entropy, and microstructure-aware Kelly sizing.
    """

    DEFAULT_IMPACT_ETA: float = 0.15 # Market impact coefficient
    DEFAULT_IMPACT_EXPONENT: float = 0.50 # Square-root law

    @classmethod
    def compute_clv(cls, bet_odds: float, closing_odds: float) -> Dict[str, float]:
        """
        Computes Closing Line Value (CLV) in decimal and log-odds space.
        Fail-closed to 0.0 if odds non-positive or non-finite.
        """
        if bet_odds <= 1.0 or closing_odds <= 1.0 or not (math.isfinite(bet_odds) and math.isfinite(closing_odds)):
            return {"clv_decimal": 0.0, "clv_log_odds": 0.0, "edge_percent": 0.0}

        clv_decimal = (bet_odds / closing_odds) - 1.0
        
        # Implied probabilities (fair, no-vig baseline approximation)
        p_bet = 1.0 / bet_odds
        p_close = 1.0 / closing_odds
        
        # Log-odds difference
        logit_bet = math.log(p_bet / (1.0 - p_bet))
        logit_close = math.log(p_close / (1.0 - p_close))
        clv_log_odds = logit_close - logit_bet  # Positive if closing prob increased (market moved towards bet)

        return {
            "clv_decimal": float(clv_decimal),
            "clv_log_odds": float(clv_log_odds),
            "edge_percent": float(clv_decimal * 100.0)
        }

    @classmethod
    def estimate_market_impact(
        cls,
        order_size: float,
        daily_volume: float,
        volatility: float = 0.05,
        eta: float = DEFAULT_IMPACT_ETA,
        psi: float = DEFAULT_IMPACT_EXPONENT
    ) -> Dict[str, float]:
        """
        Calculates price slippage / market impact via Square-Root Law:
        Delta P = eta * volatility * (order_size / daily_volume)^psi
        """
        if order_size <= 0.0 or daily_volume <= 0.0 or volatility <= 0.0:
            return {"slippage_prob": 0.0, "effective_price_decay": 0.0}

        participation_rate = min(1.0, order_size / daily_volume)
        delta_p = eta * volatility * (participation_rate ** psi)
        delta_p = max(0.0, min(0.20, delta_p)) # Cap impact at 2000 bps

        return {
            "order_size": float(order_size),
            "daily_volume": float(daily_volume),
            "participation_rate": float(participation_rate),
            "slippage_prob": float(delta_p),
            "retained_edge_multiplier": float(max(0.0, 1.0 - (delta_p * 5.0)))
        }

    @classmethod
    def compute_transfer_entropy(
        cls,
        source_series: List[int],
        target_series: List[int],
        k: int = 1
    ) -> float:
        """
        Computes discrete Transfer Entropy T_{X -> Y}:
        T_{X -> Y} = sum p(y_{t+1}, y_t, x_t) * log2( p(y_{t+1} | y_t, x_t) / p(y_{t+1} | y_t) )
        Quantifies directed information flow from sharp order flow (X) to line movements (Y).
        """
        n = len(source_series)
        if n != len(target_series) or n < 10:
            return 0.0

        joint_counts: Dict[Tuple[int, int, int], int] = {}
        target_hist_counts: Dict[Tuple[int, int], int] = {}
        source_target_counts: Dict[Tuple[int, int], int] = {}
        target_t_counts: Dict[int, int] = {}

        total_transitions = n - 1
        for t in range(total_transitions):
            y_next = target_series[t + 1]
            y_curr = target_series[t]
            x_curr = source_series[t]

            triplet = (y_next, y_curr, x_curr)
            joint_counts[triplet] = joint_counts.get(triplet, 0) + 1

            pair_yx = (y_curr, x_curr)
            source_target_counts[pair_yx] = source_target_counts.get(pair_yx, 0) + 1

            pair_yy = (y_next, y_curr)
            target_hist_counts[pair_yy] = target_hist_counts.get(pair_yy, 0) + 1

            target_t_counts[y_curr] = target_t_counts.get(y_curr, 0) + 1

        te = 0.0
        for (y_next, y_curr, x_curr), count in joint_counts.items():
            p_joint = count / total_transitions
            p_y_next_given_y_x = count / source_target_counts[(y_curr, x_curr)]
            p_y_next_given_y = target_hist_counts[(y_next, y_curr)] / target_t_counts[y_curr]

            if p_y_next_given_y_x > 0.0 and p_y_next_given_y > 0.0:
                te += p_joint * math.log2(p_y_next_given_y_x / p_y_next_given_y)

        return float(max(0.0, te))

    @classmethod
    def hjb_microstructure_kelly_stake(
        cls,
        model_prob: float,
        market_odds: float,
        order_size: float,
        daily_volume: float,
        murphy_res_ratio: float,
        bankroll: float,
        gamma_risk_aversion: float = 2.0,
        fractional_multiplier: float = 0.25
    ) -> Dict[str, Any]:
        """
        Computes dynamic HJB Microstructure-Penalized Kelly allocation:
        f* = max(0, f_base * murphy_res_ratio - market_impact_penalty) * fractional_multiplier
        where market_impact_penalty accounts for order book depletion.
        Fail-closed if probability invalid or negative edge.
        """
        if not (0.0 < model_prob < 1.0 and market_odds > 1.0 and bankroll > 0.0):
            return {"stake": 0.0, "fraction": 0.0, "reason": "INVALID_INPUTS", "approved": False}

        # Market implied probability (decimal odds: b = odds - 1)
        b = market_odds - 1.0
        q = 1.0 - model_prob
        
        # Base Kelly: (b*p - q) / b
        numerator = (b * model_prob) - q
        if numerator <= 0.0:
            return {"stake": 0.0, "fraction": 0.0, "reason": "NEGATIVE_EDGE", "approved": False}

        raw_kelly = numerator / b

        # Scale by Murphy resolution (0 to 1)
        res_scaled_kelly = raw_kelly * max(0.0, min(1.0, murphy_res_ratio))

        # Market impact deduction
        impact = cls.estimate_market_impact(order_size, daily_volume)
        slippage = impact["slippage_prob"]
        impact_penalty = (slippage / max(0.01, model_prob)) * 0.5
        
        adjusted_kelly = max(0.0, res_scaled_kelly - impact_penalty)
        final_fraction = (adjusted_kelly / gamma_risk_aversion) * fractional_multiplier
        # Maximum hard cap at 5% of bankroll for anti-ruin defense
        final_fraction = min(0.05, final_fraction)
        dollar_stake = final_fraction * bankroll

        if dollar_stake < 1.0 or final_fraction <= 0.0:
            return {
                "stake": 0.0,
                "fraction": 0.0,
                "reason": "STAKE_BELOW_THRESHOLD_OR_IMPACT_EXHAUSTED",
                "approved": False
            }

        return {
            "stake": float(dollar_stake),
            "fraction": float(final_fraction),
            "raw_kelly": float(raw_kelly),
            "adjusted_kelly": float(adjusted_kelly),
            "slippage_impact": float(slippage),
            "approved": True
        }
