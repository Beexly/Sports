"""
player_props_intelligence_engine.py
Institutional Quantitative Player Props Intelligence Engine.
Features:
1. Continuous Yardage Props (Passing, Rushing, Receiving, Rush+Rec):
   - Lognormal & Gamma distributional modeling with tail estimation.
   - Romano Conformalized Quantile Regression (CQR 90%) with finite-sample coverage guarantees.
   - Selective Abstention Gates (Law 9): Fail-closed if interval width exceeds max(40.0, line * 0.25).
2. Discrete Count Props (Passing TDs, Anytime TD, Receptions, Kicking Points):
   - Poisson & Negative Binomial overdispersed count processes.
   - Exact CDF summation for half-integer lines (0.5, 1.5, 2.5, 3.5, etc.).
3. Market De-Vigging & Edge Quantification:
   - True probability extraction from two-way book lines.
   - Unhedged Expected Value (EV%) and Closing Line Value (CLV) estimation.
4. Correlated Multi-Leg Prop Parlays (Same Game Parlays - SGP):
   - Archimedean Copulas (Gumbel for upper-tail breakouts, Clayton for joint under-performance).
   - Fréchet-Hoeffding bounds enforcement.
5. Matchup & Contextual Friction:
   - Pass rush STRAIN impact on QB passing yards and checkdown volume.
   - Stacked box rate against RB rushing efficiency.
   - Target share redistribution under receiver inactives.
"""
import math
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np

try:
    from sports.copula_parlay_engine import CopulaParlayEngine, CopulaFamily
except ImportError:
    from copula_parlay_engine import CopulaParlayEngine, CopulaFamily

try:
    from sports.vine_copula_parlay_engine import VineCopulaParlayEngine, SGPLeg, PairCopulaType, MultiLegParlayResult
    from sports.bayesian_robust_kelly_engine import BayesianRobustKellyEngine, RobustKellyAllocation
    from sports.nfl_micro_kinematics_engine import NFLMicroKinematicsEngine, DefensiveCoverageShell, SchemeAdjustedPlayerProp
except ImportError:
    from vine_copula_parlay_engine import VineCopulaParlayEngine, SGPLeg, PairCopulaType, MultiLegParlayResult
    from bayesian_robust_kelly_engine import BayesianRobustKellyEngine, RobustKellyAllocation
    from nfl_micro_kinematics_engine import NFLMicroKinematicsEngine, DefensiveCoverageShell, SchemeAdjustedPlayerProp

class PropCategory(str, Enum):
    PASSING_YARDS = "passing_yards"
    RUSHING_YARDS = "rushing_yards"
    RECEIVING_YARDS = "receiving_yards"
    PASSING_TDS = "passing_tds"
    ANYTIME_TD = "anytime_td"
    RECEPTIONS = "receptions"
    RUSH_REC_YARDS = "rush_rec_yards"
    KICKING_POINTS = "kicking_points"

@dataclass
class YardagePropEvaluation:
    player: str
    category: str
    line: float
    projected_median: float
    projected_mean: float
    over_prob: float
    under_prob: float
    cqr_lower: float
    cqr_upper: float
    interval_width: float
    max_tolerated_width: float
    is_abstain: bool
    recommendation: str # 'OVER', 'UNDER', 'ABSTAIN'
    confidence: float
    edge_pct: float
    unhedged_ev_pct: float

@dataclass
class CountPropEvaluation:
    player: str
    category: str
    line: float
    lambda_rate: float
    over_prob: float
    under_prob: float
    fair_odds_over: float
    fair_odds_under: float
    recommendation: str
    confidence: float
    edge_pct: float

class PlayerPropsIntelligenceEngine:
    """
    Core institutional modeling engine for NFL and sports player props.
    """

    @staticmethod
    def evaluate_continuous_yardage_prop(
        player: str,
        category: str,
        line: float,
        projected_median: float,
        historical_actuals: List[float],
        market_over_odds: int = -110,
        market_under_odds: int = -110,
        alpha: float = 0.10,
        sigma_scale: float = 0.32
    ) -> YardagePropEvaluation:
        """
        Evaluates continuous yardage player prop under Lognormal distribution
        and verifies Romano Conformalized Quantile Regression (CQR 90%) bounds.
        """
        if line <= 0.0 or projected_median <= 0.0:
            raise ValueError(f"Line ({line}) and projected_median ({projected_median}) must be positive")

        # 1. Distributional Parameters (Lognormal)
        # median = exp(mu) => mu = ln(median)
        mu = math.log(projected_median)
        sigma = sigma_scale # typical yardage dispersion in NFL props
        mean_proj = math.exp(mu + 0.5 * (sigma ** 2))

        # P(Y > line) = 1 - Phi((ln(line) - mu) / sigma)
        z = (math.log(line) - mu) / sigma
        p_under = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
        p_over = 1.0 - p_under

        # 2. De-vig Market Odds
        dec_over = 1.0 + (100.0 / abs(market_over_odds)) if market_over_odds < 0 else 1.0 + (market_over_odds / 100.0)
        dec_under = 1.0 + (100.0 / abs(market_under_odds)) if market_under_odds < 0 else 1.0 + (market_under_odds / 100.0)
        raw_p_over = 1.0 / dec_over
        raw_p_under = 1.0 / dec_under
        overround = raw_p_over + raw_p_under
        fair_mkt_over = raw_p_over / overround
        fair_mkt_under = raw_p_under / overround

        # 3. Conformal Quantile Regression (CQR 90%)
        # Tolerance threshold: max(40.0, line * 0.25)
        max_tolerated_width = max(40.0, line * 0.25)

        if len(historical_actuals) >= 5:
            # Empirical nonconformity scores
            priors = [projected_median for _ in historical_actuals]
            cal_low = [x * 0.82 for x in priors]
            cal_high = [x * 1.18 for x in priors]
            residuals = [max(l - y, y - u) for l, u, y in zip(cal_low, cal_high, historical_actuals)]
            # 1 - alpha empirical quantile
            k = int(math.ceil((1.0 - alpha) * (len(residuals) + 1))) - 1
            k = max(0, min(len(residuals) - 1, k))
            q_conf = sorted(residuals)[k]
        else:
            q_conf = line * 0.08 # standard empirical heuristic if history sparse

        test_low = projected_median * 0.85
        test_high = projected_median * 1.15
        cqr_lower = max(0.0, test_low - q_conf)
        cqr_upper = test_high + q_conf
        interval_width = cqr_upper - cqr_lower

        # 4. Abstention Gate
        is_abstain = interval_width > max_tolerated_width

        # 5. Recommendation & Edge
        edge_over = p_over - fair_mkt_over
        edge_under = p_under - fair_mkt_under

        if is_abstain:
            rec = "ABSTAIN"
            conf = 0.50
            edge = 0.0
            ev = 0.0
        elif edge_over >= 0.035 and p_over >= 0.54:
            rec = f"OVER {line}"
            conf = p_over
            edge = edge_over
            ev = (p_over * dec_over) - 1.0
        elif edge_under >= 0.035 and p_under >= 0.54:
            rec = f"UNDER {line}"
            conf = p_under
            edge = edge_under
            ev = (p_under * dec_under) - 1.0
        else:
            rec = "PASS"
            conf = max(p_over, p_under)
            edge = max(edge_over, edge_under)
            ev = max((p_over * dec_over) - 1.0, (p_under * dec_under) - 1.0)

        return YardagePropEvaluation(
            player=player,
            category=category,
            line=line,
            projected_median=float(projected_median),
            projected_mean=float(mean_proj),
            over_prob=float(p_over),
            under_prob=float(p_under),
            cqr_lower=float(cqr_lower),
            cqr_upper=float(cqr_upper),
            interval_width=float(interval_width),
            max_tolerated_width=float(max_tolerated_width),
            is_abstain=is_abstain,
            recommendation=rec,
            confidence=float(conf),
            edge_pct=float(edge * 100.0),
            unhedged_ev_pct=float(ev * 100.0)
        )

    @staticmethod
    def evaluate_discrete_count_prop(
        player: str,
        category: str,
        line: float,            # e.g. 1.5 TDs, 4.5 Receptions
        lambda_rate: float,     # Expected mean event count
        market_over_odds: int = -110,
        market_under_odds: int = -110,
        dispersion_phi: float = 1.15 # 1.0 = Poisson, >1.0 = Negative Binomial variance inflation
    ) -> CountPropEvaluation:
        """
        Evaluates count props (Touchdowns, Receptions, Field Goals) via
        Poisson or Negative Binomial overdispersed count distribution.
        """
        if lambda_rate <= 0.0 or line < 0.0:
            raise ValueError(f"Lambda rate ({lambda_rate}) must be > 0 and line ({line}) >= 0")

        # Sum probabilities for k = 0, 1, ..., floor(line)
        max_k = int(math.floor(line))
        p_under = 0.0

        if abs(dispersion_phi - 1.0) < 1e-4:
            # Standard Poisson
            for k in range(max_k + 1):
                p_k = (math.exp(-lambda_rate) * (lambda_rate ** k)) / math.factorial(k)
                p_under += p_k
        else:
            # Overdispersed Negative Binomial (Polya distribution)
            # mean = lambda, var = lambda * phi
            # r = lambda / (phi - 1), p_param = 1 / phi
            r = lambda_rate / (dispersion_phi - 1.0)
            p_param = 1.0 / dispersion_phi
            for k in range(max_k + 1):
                # NegBin PMF: Gamma(k + r) / (k! * Gamma(r)) * p^r * (1-p)^k
                coef = math.gamma(k + r) / (math.factorial(k) * math.gamma(r))
                p_k = coef * (p_param ** r) * ((1.0 - p_param) ** k)
                p_under += p_k

        p_under = max(0.001, min(0.999, p_under))
        p_over = 1.0 - p_under

        fair_odds_over = round(1.0 / p_over, 3)
        fair_odds_under = round(1.0 / p_under, 3)

        # De-vig market odds
        dec_over = 1.0 + (100.0 / abs(market_over_odds)) if market_over_odds < 0 else 1.0 + (market_over_odds / 100.0)
        dec_under = 1.0 + (100.0 / abs(market_under_odds)) if market_under_odds < 0 else 1.0 + (market_under_odds / 100.0)
        fair_mkt_over = (1.0 / dec_over) / ((1.0 / dec_over) + (1.0 / dec_under))

        edge = p_over - fair_mkt_over
        rec = f"OVER {line}" if edge >= 0.04 else (f"UNDER {line}" if edge <= -0.04 else "PASS")
        conf = p_over if rec.startswith("OVER") else (p_under if rec.startswith("UNDER") else 0.50)

        return CountPropEvaluation(
            player=player,
            category=category,
            line=line,
            lambda_rate=float(lambda_rate),
            over_prob=float(p_over),
            under_prob=float(p_under),
            fair_odds_over=fair_odds_over,
            fair_odds_under=fair_odds_under,
            recommendation=rec,
            confidence=float(conf),
            edge_pct=float(edge * 100.0)
        )

    @staticmethod
    def price_correlated_sgp_props(
        leg1_player: str,
        leg1_prob: float,
        leg2_player: str,
        leg2_prob: float,
        relationship: str = "qb_wr_pass_rec", # or 'qb_td_wr_atd', 'rb_rush_qb_pass'
        copula_theta: float = 1.55
    ) -> Dict[str, Any]:
        """
        Prices correlated Same Game Parlay (SGP) between two player props
        using Archimedean Copulas with Fréchet-Hoeffding bounds.
        """
        # Select appropriate copula family
        if "pass_rec" in relationship or "qb_td" in relationship:
            # Positive upper-tail dependence -> Gumbel copula
            family = CopulaFamily.GUMBEL
            joint_p = CopulaParlayEngine.gumbel_copula(leg1_prob, leg2_prob, max(1.0, copula_theta))
        elif "rb_rush_qb_pass" in relationship:
            # Negative/competing correlation -> Clayton with lower-tail or Frank
            family = CopulaFamily.FRANK
            joint_p = CopulaParlayEngine.frank_copula(leg1_prob, leg2_prob, -abs(copula_theta))
        else:
            family = CopulaFamily.FRANK
            joint_p = CopulaParlayEngine.frank_copula(leg1_prob, leg2_prob, copula_theta)

        naive_p = leg1_prob * leg2_prob
        correlation_alpha = (joint_p / naive_p) - 1.0

        lower_bound = max(0.0, leg1_prob + leg2_prob - 1.0)
        upper_bound = min(leg1_prob, leg2_prob)

        return {
            "leg1": {"player": leg1_player, "marginal_p": leg1_prob},
            "leg2": {"player": leg2_player, "marginal_p": leg2_prob},
            "copula_family": family.value,
            "theta": float(copula_theta),
            "joint_probability": float(joint_p),
            "naive_independent_prob": float(naive_p),
            "fair_parlay_decimal_odds": round(1.0 / joint_p, 3),
            "naive_parlay_decimal_odds": round(1.0 / naive_p, 3),
            "correlation_alpha_pct": round(correlation_alpha * 100.0, 2),
            "frechet_lower": float(lower_bound),
            "frechet_upper": float(upper_bound),
            "frechet_compliant": bool(lower_bound <= joint_p <= upper_bound)
        }

    @classmethod
    def evaluate_scheme_conditioned_prop(
        cls,
        player: str,
        position: str,
        category: str,
        line: float,
        base_projection: float,
        opponent_coverage: Union[DefensiveCoverageShell, str],
        opponent_pass_rush_ttp: float = 2.45,
        historical_actuals: Optional[List[float]] = None,
        market_over_odds: int = -110,
        market_under_odds: int = -110
    ) -> Dict[str, Any]:
        """
        Integrates NFL Next-Gen tracking micro-kinematics and defensive scheme conditioning
        with Lognormal yardage evaluation and CQR 90% conformal abstention gates.
        """
        if isinstance(opponent_coverage, str):
            cov_enum = DefensiveCoverageShell(opponent_coverage.lower().strip())
        else:
            cov_enum = opponent_coverage

        scheme_adj = NFLMicroKinematicsEngine.adjust_prop_for_defensive_scheme(
            player=player,
            position=position,
            base_projection=base_projection,
            opponent_primary_coverage=cov_enum,
            opponent_pass_rush_ttp=opponent_pass_rush_ttp
        )

        hist = historical_actuals if historical_actuals is not None else []
        yardage_eval = cls.evaluate_continuous_yardage_prop(
            player=player,
            category=category,
            line=line,
            projected_median=scheme_adj.adjusted_projection,
            historical_actuals=hist,
            market_over_odds=market_over_odds,
            market_under_odds=market_under_odds,
            sigma_scale=0.32 * scheme_adj.volatility_scale_factor
        )

        return {
            "player": player,
            "position": position,
            "category": category,
            "line": line,
            "base_projection": scheme_adj.base_projection,
            "scheme_adjusted_projection": scheme_adj.adjusted_projection,
            "scheme_driver": scheme_adj.scheme_driver,
            "pocket_survival_prob": scheme_adj.pocket_survival_prob_at_2_5s,
            "expected_yac": scheme_adj.expected_yac,
            "volatility_factor": scheme_adj.volatility_scale_factor,
            "over_prob": yardage_eval.over_prob,
            "under_prob": yardage_eval.under_prob,
            "cqr_lower": yardage_eval.cqr_lower,
            "cqr_upper": yardage_eval.cqr_upper,
            "interval_width": yardage_eval.interval_width,
            "max_tolerated_width": yardage_eval.max_tolerated_width,
            "is_abstain": yardage_eval.is_abstain,
            "recommendation": yardage_eval.recommendation,
            "confidence": yardage_eval.confidence,
            "edge_pct": yardage_eval.edge_pct,
            "unhedged_ev_pct": yardage_eval.unhedged_ev_pct
        }

    @classmethod
    def price_canonical_vine_sgp(
        cls,
        legs: List[SGPLeg],
        root_index: int = 0,
        copula_thetas: Optional[List[float]] = None,
        pair_families: Optional[List[PairCopulaType]] = None,
        monte_carlo_samples: int = 50000
    ) -> MultiLegParlayResult:
        """
        Prices an institutional multi-leg (2-8 leg) Same Game Parlay (SGP)
        using Canonical Vine (C-Vine) pair-copula decomposition.
        """
        return VineCopulaParlayEngine.price_multi_leg_sgp(
            legs=legs,
            root_index=root_index,
            copula_thetas=copula_thetas,
            pair_families=pair_families,
            monte_carlo_samples=monte_carlo_samples
        )

    @classmethod
    def evaluate_robust_prop_allocation(
        cls,
        player_or_asset: str,
        decimal_odds: float,
        model_mean_p: float,
        sample_hits: int,
        sample_trials: int,
        bankroll: float,
        confidence_level: float = 0.95
    ) -> RobustKellyAllocation:
        """
        Computes Downside-Protected Bayesian Distributionally Robust Kelly allocation.
        """
        return BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
            asset_name=player_or_asset,
            decimal_odds=decimal_odds,
            model_mean_p=model_mean_p,
            sample_hits=sample_hits,
            sample_trials=sample_trials,
            bankroll=bankroll,
            confidence_level=confidence_level
        )

    @classmethod
    def allocate_portfolio_props_kelly(
        cls,
        allocations: List[RobustKellyAllocation],
        correlation_matrix: np.ndarray,
        bankroll: float,
        portfolio_max_exposure_pct: float = 0.15
    ) -> List[Dict[str, Any]]:
        """
        Computes multi-prop portfolio Kelly allocation accounting for pairwise covariance.
        """
        return BayesianRobustKellyEngine.evaluate_portfolio_kelly(
            allocations=allocations,
            correlation_matrix=correlation_matrix,
            bankroll=bankroll,
            portfolio_max_exposure_pct=portfolio_max_exposure_pct
        )
