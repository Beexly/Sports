"""
galaxy_conformal_ot.kinematic_workload_hazard
============================================
Module 4: Distributed-Lag Non-Linear Workload Modeling (DLNM) and
Kinetic Collision Impulse Survival Hazard Functions for Musculoskeletal Health.

Quantifies cumulative kinematic mechanical fatigue and non-linear injury hazard curves.
"""

from typing import Dict, List, Optional, Union
import numpy as np


def compute_acwr_ratio(
    acute_workload: float,
    chronic_workload: float,
    unweighted_floor: float = 1.0
) -> float:
    """
    Compute Acute-to-Chronic Workload Ratio (ACWR):
    ACWR = acute_load / max(chronic_load, floor).
    
    Clinical safe zone: [0.8, 1.3]. Danger zone: > 1.5.
    """
    safe_chronic = max(chronic_workload, unweighted_floor)
    return float(acute_workload / safe_chronic)


def distributed_lag_kinematic_workload(
    workload_series: Union[List[float], np.ndarray],
    lag_weights: Optional[np.ndarray] = None,
    decay_lambda: float = 0.12
) -> float:
    """
    Distributed-Lag Workload Accumulation (DLNM):
    Cumulative load = sum_{l=0}^{L-1} w(l) * load_{t-l}
    
    arXiv:2005.09024: 10-game/interval rolling distributed lag with exponential decay.
    """
    series = np.asarray(workload_series, dtype=np.float64)
    length = series.shape[0]
    
    if lag_weights is not None:
        weights = np.asarray(lag_weights, dtype=np.float64)
        weights = weights / np.sum(weights)
    else:
        # Exponential fatigue decay weights
        lags = np.arange(length)
        weights = np.exp(-decay_lambda * lags)
        weights = weights / np.sum(weights)
        
    return float(np.sum(series * weights))


def evaluate_injury_survival_hazard(
    acwr: float,
    kinetic_impulse_kj: float,
    baseline_hazard: float = 0.012
) -> Dict[str, Union[float, str]]:
    """
    Compute Non-Linear Cox Proportional Hazard Rate:
    h(t) = h0 * exp(beta1 * (ACWR - 1.0)^2 + beta2 * kinetic_impulse)
    """
    # Non-linear quadratic penalty for ACWR deviation outside the sweet spot [0.8, 1.3]
    acwr_deviation = max(0.0, acwr - 1.15) if acwr > 1.15 else max(0.0, 0.95 - acwr)
    acwr_exponent = 3.2 * (acwr_deviation ** 2)
    
    # Kinetic momentum impulse penalty (trench pocket collision physics)
    kinetic_exponent = 0.18 * max(0.0, kinetic_impulse_kj - 5.0)
    
    # Clip the exponent so extreme ACWR / impulse values cannot overflow exp().
    hazard_multiplier = float(np.exp(min(acwr_exponent + kinetic_exponent, 50.0)))
    instant_hazard = float(baseline_hazard * hazard_multiplier)
    
    # Categorical clinical risk tier
    if instant_hazard > 0.08:
        tier = "CRITICAL_INJURY_HAZARD"
    elif instant_hazard > 0.035:
        tier = "ELEVATED_FATIGUE_STRAIN"
    else:
        tier = "OPTIMAL_LOAD_ZONE"
        
    return {
        "acwr": acwr,
        "kinetic_impulse_kj": kinetic_impulse_kj,
        "hazard_multiplier": hazard_multiplier,
        "instant_hazard_rate": instant_hazard,
        "clinical_risk_tier": tier
    }


class KinematicHazardModel:
    """Integrated Biomechanical Workload and Kinetic Fatigue Survival Model."""
    
    def __init__(self, window_size: int = 10, decay_lambda: float = 0.12):
        self.window_size = window_size
        self.decay_lambda = decay_lambda
        
    def assess_athlete_state(
        self,
        recent_7day_load: float,
        rolling_28day_history: List[float],
        last_event_kinetic_impulse: float
    ) -> Dict[str, Union[float, str]]:
        """Assess acute workload, chronic baseline, ACWR, and instant structural hazard."""
        chronic_load = float(np.mean(rolling_28day_history)) if rolling_28day_history else recent_7day_load
        acwr = compute_acwr_ratio(recent_7day_load, chronic_load)
        
        hazard = evaluate_injury_survival_hazard(
            acwr=acwr,
            kinetic_impulse_kj=last_event_kinetic_impulse
        )
        return hazard
