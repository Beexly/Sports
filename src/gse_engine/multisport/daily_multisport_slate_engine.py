"""365-Day Multi-Sport Daily Slate Engine with BC-ACI and CopulaCPTS.

Implements:
1. Bias-Corrected Adaptive Conformal Inference (BC-ACI, arXiv:2412.19318).
2. Copula Conformal Prediction (CopulaCPTS) for correlated multi-leg pricing.
3. Vectorized 10,000-world simulators for NBA, NCAAB, NHL, and Global Soccer.
4. Keyless ESPN scoreboard ingestion with deterministic offline fallback and
   pure 7-bit ASCII XX/100 confidence card generation (live_stake_fraction=0.0).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import urllib.error
import urllib.request
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from numpy.typing import NDArray

ESPN_SCOREBOARD_ENDPOINTS: dict[str, str] = {
    "NBA": "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
    "NHL": "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
    "NCAAB": (
        "https://site.api.espn.com/apis/site/v2/sports/"
        "basketball/mens-college-basketball/scoreboard"
    ),
    "SOCCER": "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
}

_LEAGUE_ALIASES: dict[str, str] = {
    "NBA": "NBA",
    "NCAAB": "NCAAB",
    "CBB": "NCAAB",
    "MENS-COLLEGE-BASKETBALL": "NCAAB",
    "NHL": "NHL",
    "SOCCER": "SOCCER",
    "EPL": "SOCCER",
    "UCL": "SOCCER",
    "ENG.1": "SOCCER",
}


@dataclass(frozen=True, slots=True)
class BcAciState:
    """State for Bias-Corrected Adaptive Conformal Inference (arXiv:2412.19318).

    Attributes:
        alpha: Target miscoverage rate (1 - coverage).
        gamma: ACI step size controlling quantile adaptation speed.
        q_halfwidth: Current symmetric half-width around the bias-corrected center.
        bias_center: Online exponential moving average of signed residuals.
        beta: Learning rate for online bias center tracking.
        updates: Count of calibration updates applied.
    """

    alpha: float = 0.10
    gamma: float = 0.05
    q_halfwidth: float = 1.0
    bias_center: float = 0.0
    beta: float = 0.12
    updates: int = 0

    def __post_init__(self) -> None:
        """Validate BC-ACI hyperparameters."""
        if not 0.0 < self.alpha < 1.0:
            raise ValueError(f"alpha must be in (0, 1), got {self.alpha}")
        if self.gamma <= 0.0:
            raise ValueError(f"gamma must be > 0, got {self.gamma}")
        if self.q_halfwidth <= 0.0:
            raise ValueError(f"q_halfwidth must be > 0, got {self.q_halfwidth}")
        if not 0.0 < self.beta <= 1.0:
            raise ValueError(f"beta must be in (0, 1], got {self.beta}")


@dataclass(frozen=True, slots=True)
class CopulaLegSpec:
    """Single leg specification for CopulaCPTS multi-leg pricing.

    Attributes:
        athlete_or_side: Player, team, or side identifier.
        market: Market descriptor (e.g., points, total, moneyline, shots).
        prob: Marginal win probability in [0, 1].
        latent_z: Optional pre-computed normal z-score threshold.
    """

    athlete_or_side: str
    market: str
    prob: float
    latent_z: float | None = None


def predict_bc_aci_band(state: BcAciState, raw_mean: float) -> tuple[float, float, float]:
    """Compute the bias-corrected prediction center and conformal interval.

    Args:
        state: Current BC-ACI state.
        raw_mean: Unadjusted point prediction.

    Returns:
        Tuple of ``(adjusted_center, lower, upper)``.
    """
    adjusted_center = float(raw_mean + state.bias_center)
    lower = float(adjusted_center - state.q_halfwidth)
    upper = float(adjusted_center + state.q_halfwidth)
    return (adjusted_center, lower, upper)


def update_bc_aci_interval(
    state: BcAciState,
    prediction: float,
    observed: float,
) -> BcAciState:
    """Update online bias center and conformal half-width after observing an outcome.

    Uses the BC-ACI update:
    1. Evaluate miss indicator against ``[prediction + bias_center - q, + q]``.
    2. Track signed residual ``observed - prediction`` via EMA with rate ``beta``.
    3. Update ``q_halfwidth`` via ACI step ``gamma * (alpha - miss)`` scaled by
       ``max(1.0, state.q_halfwidth)`` so convergence holds across arbitrary unit scales
       while preserving zero expected drift at exact ``P(miss) == alpha``.

    Args:
        state: Prior BC-ACI state.
        prediction: Unadjusted point prediction issued prior to outcome.
        observed: Realized scalar observation.

    Returns:
        Updated immutable ``BcAciState``.
    """
    _, lower, upper = predict_bc_aci_band(state, prediction)
    miss = 1.0 if (observed < lower or observed > upper) else 0.0
    signed_residual = float(observed - prediction)
    new_bias = (1.0 - state.beta) * state.bias_center + state.beta * signed_residual
    aci_step = state.gamma * (state.alpha - miss)
    scale = max(1.0, state.q_halfwidth)
    new_q = max(1e-6, state.q_halfwidth - scale * aci_step)
    return BcAciState(
        alpha=state.alpha,
        gamma=state.gamma,
        q_halfwidth=float(new_q),
        bias_center=float(new_bias),
        beta=state.beta,
        updates=state.updates + 1,
    )


def _norm_cdf_vec(x: NDArray[np.float64]) -> NDArray[np.float64]:
    """Compute standard normal CDF via vectorized Abramowitz-Stegun 7.1.26 erf."""
    z = x / math.sqrt(2.0)
    sign = np.sign(z)
    ax = np.abs(z)
    t = 1.0 / (1.0 + 0.3275911 * ax)
    poly = (
        ((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t
        + 0.254829592
    ) * t
    erf_val = sign * (1.0 - poly * np.exp(-(ax * ax)))
    cdf = 0.5 * (1.0 + erf_val)
    return np.clip(cdf, 1e-12, 1.0 - 1e-12).astype(np.float64)


def _norm_ppf_scalar(prob: float) -> float:
    """Compute inverse standard normal CDF via bisection on math.erf."""
    p = min(max(prob, 1e-9), 1.0 - 1e-9)
    lo, hi = -8.0, 8.0
    inv_sqrt2 = 1.0 / math.sqrt(2.0)
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        cdf = 0.5 * (1.0 + math.erf(mid * inv_sqrt2))
        if cdf < p:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def _clamp_correlation_cholesky(rho_matrix: Sequence[Sequence[float]]) -> NDArray[np.float64]:
    """Project a correlation matrix to symmetric PSD with unit diagonal and Cholesky factor."""
    mat = np.asarray(rho_matrix, dtype=np.float64)
    if mat.ndim != 2 or mat.shape[0] != mat.shape[1]:
        raise ValueError(f"rho_matrix must be square, got shape {mat.shape}")
    k = mat.shape[0]
    if k == 0:
        raise ValueError("rho_matrix must be non-empty")

    sym = 0.5 * (mat + mat.T)
    eigvals, eigvecs = np.linalg.eigh(sym)
    eigvals_clamped = np.maximum(eigvals, 1e-6)
    psd = (eigvecs * eigvals_clamped) @ eigvecs.T
    diag_sqrt = np.sqrt(np.maximum(np.diag(psd), 1e-12))
    corr = psd / np.outer(diag_sqrt, diag_sqrt)
    np.fill_diagonal(corr, 1.0)
    corr = np.clip(corr, -0.999, 0.999)
    np.fill_diagonal(corr, 1.0)

    jitter = 1e-9
    for _ in range(6):
        try:
            chol: NDArray[np.float64] = np.linalg.cholesky(corr + jitter * np.eye(k))
            return chol
        except np.linalg.LinAlgError:
            jitter *= 10.0
    return np.eye(k, dtype=np.float64)


def _prob_to_american_odds(prob: float) -> int:
    """Convert probability in (0, 1) to integer American odds."""
    p = min(max(prob, 1e-4), 1.0 - 1e-4)
    if p >= 0.5:
        return int(-round(100.0 * p / (1.0 - p)))
    return int(round(100.0 * (1.0 - p) / p))


def price_copula_conformal_sgp(
    legs: Sequence[CopulaLegSpec],
    rho_matrix: Sequence[Sequence[float]],
    book_decimal_odds: float | None = None,
    *,
    n_worlds: int = 10000,
    seed: int = 20261116,
    df: float | None = None,
) -> dict[str, Any]:
    """Price a multi-leg SGP using Gaussian or Student-t CopulaCPTS simulation.

    Args:
        legs: Sequence of leg specs with marginal probabilities.
        rho_matrix: ``k x k`` latent correlation matrix matching ``len(legs)``.
        book_decimal_odds: Optional sportsbook decimal price (> 1.0) for edge math.
        n_worlds: Number of Monte Carlo copula worlds.
        seed: Deterministic RNG seed.
        df: Optional Student-t degrees of freedom; ``None`` uses Gaussian copula.

    Returns:
        Dictionary with ``joint_sim_prob``, ``indep_prob``, ``correlation_lift``,
        ``fair_american_odds``, ``fair_decimal_odds``, ``net_edge``, and metadata.
    """
    if len(legs) == 0:
        raise ValueError("legs must be non-empty")
    if n_worlds <= 0:
        raise ValueError(f"n_worlds must be > 0, got {n_worlds}")
    if book_decimal_odds is not None and book_decimal_odds <= 1.0:
        raise ValueError(f"book_decimal_odds must be > 1.0, got {book_decimal_odds}")

    k = len(legs)
    chol = _clamp_correlation_cholesky(rho_matrix)
    if chol.shape[0] != k:
        raise ValueError(
            f"rho_matrix dimension {chol.shape[0]} does not match {k} legs"
        )

    probs = np.array([min(max(float(leg.prob), 0.0), 1.0) for leg in legs], dtype=np.float64)
    rng = np.random.default_rng(seed)
    normals = rng.standard_normal((n_worlds, k)) @ chol.T

    if df is not None and df > 0.0:
        chi2 = rng.chisquare(df, size=(n_worlds, 1))
        t_draws = normals / np.sqrt(chi2 / df)
        ranks = np.argsort(np.argsort(t_draws, axis=0), axis=0)
        u_draws: NDArray[np.float64] = (ranks.astype(np.float64) + 0.5) / float(n_worlds)
    else:
        u_draws = _norm_cdf_vec(normals)

    joint_hits = np.all(u_draws <= probs[None, :], axis=1)
    joint_sim_prob = float(np.clip(np.mean(joint_hits), 0.0, 1.0))
    indep_prob = float(np.clip(math.prod(probs.tolist()), 0.0, 1.0))
    correlation_lift = (
        float(joint_sim_prob / indep_prob) if indep_prob > 1e-12 else 1.0
    )
    fair_american_odds = _prob_to_american_odds(joint_sim_prob)
    fair_decimal_odds = (
        float(1.0 / joint_sim_prob) if joint_sim_prob > 1e-12 else float("inf")
    )

    net_edge: float | None = None
    expected_value_roi: float | None = None
    if book_decimal_odds is not None:
        book_implied = 1.0 / float(book_decimal_odds)
        net_edge = float(joint_sim_prob - book_implied)
        expected_value_roi = float(joint_sim_prob * float(book_decimal_odds) - 1.0)

    leg_summary = [
        {
            "athlete_or_side": leg.athlete_or_side,
            "market": leg.market,
            "prob": float(probs[idx]),
            "latent_z": (
                float(leg.latent_z)
                if leg.latent_z is not None
                else float(_norm_ppf_scalar(float(probs[idx])))
            ),
        }
        for idx, leg in enumerate(legs)
    ]

    return {
        "n_worlds": int(n_worlds),
        "n_legs": int(k),
        "copula_family": "student_t" if (df is not None and df > 0.0) else "gaussian",
        "joint_sim_prob": joint_sim_prob,
        "indep_prob": indep_prob,
        "correlation_lift": correlation_lift,
        "fair_american_odds": fair_american_odds,
        "fair_decimal_odds": fair_decimal_odds,
        "net_edge": net_edge,
        "expected_value_roi": expected_value_roi,
        "u_shape": (int(n_worlds), int(k)),
        "legs": leg_summary,
    }


def _poisson_pmf_vec(lam: float, max_goals: int) -> NDArray[np.float64]:
    """Compute Poisson PMF over ``0..max_goals`` using log-gamma stability."""
    lam_safe = max(1e-6, float(lam))
    ks = np.arange(max_goals + 1, dtype=np.float64)
    log_fact = np.array([math.lgamma(float(k) + 1.0) for k in range(max_goals + 1)])
    log_p = ks * math.log(lam_safe) - lam_safe - log_fact
    out: NDArray[np.float64] = np.asarray(np.exp(log_p), dtype=np.float64)
    return out


def build_dixon_coles_pmf(
    lambda_home: float,
    lambda_away: float,
    *,
    rho_dc: float = -0.10,
    max_goals: int = 10,
) -> NDArray[np.float64]:
    """Build and normalize the Dixon-Coles low-scoring bivariate Poisson PMF.

    Applies the Dixon-Coles (1997) tau dependence correction on ``(0,0)``,
    ``(0,1)``, ``(1,0)``, and ``(1,1)`` and normalizes the truncated grid so the
    joint PMF sums exactly to ``1.0``.

    Args:
        lambda_home: Expected home goal intensity.
        lambda_away: Expected away goal intensity.
        rho_dc: Dixon-Coles low-score correlation parameter.
        max_goals: Grid truncation limit per side.

    Returns:
        Normalized 2D array of shape ``(max_goals + 1, max_goals + 1)``.
    """
    lh = max(0.05, float(lambda_home))
    la = max(0.05, float(lambda_away))
    rho_min = -1.0 / max(1.0, lh * la)
    rho_max = min(1.0 / max(1.0, lh), 1.0 / max(1.0, la), 0.95)
    rho = min(max(float(rho_dc), rho_min), rho_max)

    p_home = _poisson_pmf_vec(lh, max_goals)
    p_away = _poisson_pmf_vec(la, max_goals)
    pmf = np.outer(p_home, p_away)

    pmf[0, 0] *= max(0.0, 1.0 - lh * la * rho)
    pmf[0, 1] *= max(0.0, 1.0 + lh * rho)
    pmf[1, 0] *= max(0.0, 1.0 + la * rho)
    pmf[1, 1] *= max(0.0, 1.0 - rho)

    pmf = np.maximum(pmf, 0.0)
    total_mass = float(np.sum(pmf))
    if total_mass <= 0.0:
        raise ValueError("Dixon-Coles PMF total mass must be positive")
    return (pmf / total_mass).astype(np.float64)


def _normalize_league(league: str) -> str:
    """Normalize sport/league aliases to NBA, NCAAB, NHL, or SOCCER."""
    key = league.strip().upper()
    if key not in _LEAGUE_ALIASES:
        raise ValueError(
            f"Unsupported league '{league}'. Expected one of NBA, NCAAB, NHL, SOCCER."
        )
    return _LEAGUE_ALIASES[key]


def _simulate_basketball_10k(
    norm_league: str,
    home_team: str,
    away_team: str,
    *,
    home_rating: float | None,
    away_rating: float | None,
    spread_line: float | None,
    total_line: float | None,
    pace_factor: float,
    three_pt_rate_home: float,
    three_pt_rate_away: float,
    home_b2b: bool,
    away_b2b: bool,
    home_rest_days: int,
    away_rest_days: int,
    bc_aci_state: BcAciState | None,
    n_worlds: int,
    rng: np.random.Generator,
) -> dict[str, Any]:
    """Simulate NBA or NCAAB via possession-pace Gamma-Normal correlated scoring."""
    is_nba = norm_league == "NBA"
    base_pace = 99.5 if is_nba else 68.5
    pace_shape = 160.0 if is_nba else 110.0
    default_spread = -3.5
    default_total = 226.5 if is_nba else 144.5

    eff_spread = default_spread if spread_line is None else float(spread_line)
    eff_total = default_total if total_line is None else float(total_line)

    if home_rating is not None and away_rating is not None:
        base_ortg_home = float(home_rating)
        base_ortg_away = float(away_rating)
    else:
        implied_home_pts = 0.5 * (eff_total - eff_spread)
        implied_away_pts = 0.5 * (eff_total + eff_spread)
        base_ortg_home = 100.0 * implied_home_pts / base_pace
        base_ortg_away = 100.0 * implied_away_pts / base_pace

    b2b_penalty = 2.6 if is_nba else 2.2
    rest_diff = max(-2, min(2, home_rest_days - away_rest_days))
    ortg_home = (
        base_ortg_home
        - (b2b_penalty if home_b2b else 0.0)
        + 0.45 * rest_diff
    )
    ortg_away = (
        base_ortg_away
        - (b2b_penalty if away_b2b else 0.0)
        - 0.45 * rest_diff
    )

    b2b_pace_drag = 1.0 - (0.012 if home_b2b else 0.0) - (0.012 if away_b2b else 0.0)
    pace_mean = max(50.0, base_pace * pace_factor * b2b_pace_drag)
    poss_vec = rng.gamma(shape=pace_shape, scale=pace_mean / pace_shape, size=n_worlds)

    base_sigma = 10.2 if is_nba else 11.4
    sigma_home = base_sigma * (1.0 + 0.45 * (three_pt_rate_home - 0.35))
    sigma_away = base_sigma * (1.0 + 0.45 * (three_pt_rate_away - 0.35))

    bias_shift = 0.0
    if bc_aci_state is not None:
        ref_halfwidth = 16.5 if is_nba else 13.5
        aci_scale = min(1.75, max(0.75, bc_aci_state.q_halfwidth / ref_halfwidth))
        sigma_home *= aci_scale
        sigma_away *= aci_scale
        bias_shift = bc_aci_state.bias_center * 0.5

    corr_chol = np.array([[1.0, 0.0], [0.18, math.sqrt(1.0 - 0.18**2)]], dtype=np.float64)
    z_pair = rng.standard_normal((n_worlds, 2)) @ corr_chol.T
    eff_home = ortg_home + sigma_home * z_pair[:, 0]
    eff_away = ortg_away + sigma_away * z_pair[:, 1]

    raw_home = np.maximum(40.0, poss_vec * (eff_home / 100.0) + bias_shift)
    raw_away = np.maximum(40.0, poss_vec * (eff_away / 100.0) + bias_shift)
    home_scores = np.rint(raw_home).astype(np.float64)
    away_scores = np.rint(raw_away).astype(np.float64)

    tied = home_scores == away_scores
    if np.any(tied):
        n_ties = int(np.sum(tied))
        ot_home_edge = 1.0 / (1.0 + math.exp(-0.08 * (ortg_home - ortg_away)))
        ot_base = rng.poisson(10.5 if is_nba else 8.5, size=n_ties).astype(np.float64)
        ot_margin = rng.integers(1, 7, size=n_ties).astype(np.float64)
        home_wins_ot = rng.random(n_ties) < ot_home_edge
        home_scores[tied] += ot_base + np.where(home_wins_ot, ot_margin, 0.0)
        away_scores[tied] += ot_base + np.where(home_wins_ot, 0.0, ot_margin)

    total_scores = home_scores + away_scores
    home_win_prob = float(np.mean(home_scores > away_scores))
    away_win_prob = float(np.mean(away_scores > home_scores))
    spread_home_cover_prob = float(np.mean((home_scores + eff_spread) > away_scores))
    over_prob = float(np.mean(total_scores > eff_total))
    under_prob = float(np.mean(total_scores < eff_total))

    return {
        "league": norm_league,
        "home_team": home_team,
        "away_team": away_team,
        "n_worlds": int(n_worlds),
        "mean_home": float(np.mean(home_scores)),
        "mean_away": float(np.mean(away_scores)),
        "mean_total": float(np.mean(total_scores)),
        "std_home": float(np.std(home_scores)),
        "std_away": float(np.std(away_scores)),
        "std_total": float(np.std(total_scores)),
        "home_win_prob": home_win_prob,
        "away_win_prob": away_win_prob,
        "draw_prob": 0.0,
        "spread_line": eff_spread,
        "spread_home_cover_prob": spread_home_cover_prob,
        "total_line": eff_total,
        "over_prob": over_prob,
        "under_prob": under_prob,
        "fatigue_delta_home": float(-(b2b_penalty if home_b2b else 0.0) + 0.45 * rest_diff),
        "fatigue_delta_away": float(-(b2b_penalty if away_b2b else 0.0) - 0.45 * rest_diff),
    }


def _simulate_nhl_10k(
    home_team: str,
    away_team: str,
    *,
    home_rating: float | None,
    away_rating: float | None,
    spread_line: float | None,
    total_line: float | None,
    pace_factor: float,
    home_b2b: bool,
    away_b2b: bool,
    bc_aci_state: BcAciState | None,
    n_worlds: int,
    rng: np.random.Generator,
) -> dict[str, Any]:
    """Simulate NHL via bivariate Poisson + overtime/shootout resolution."""
    eff_spread = -1.5 if spread_line is None else float(spread_line)
    eff_total = 6.0 if total_line is None else float(total_line)

    lam_home = 3.15 if home_rating is None else max(0.8, float(home_rating))
    lam_away = 2.85 if away_rating is None else max(0.8, float(away_rating))
    lam_home = max(0.8, lam_home * pace_factor - (0.22 if home_b2b else 0.0))
    lam_away = max(0.8, lam_away * pace_factor - (0.22 if away_b2b else 0.0))

    if bc_aci_state is not None:
        lam_home = max(0.8, lam_home + 0.25 * bc_aci_state.bias_center)
        lam_away = max(0.8, lam_away + 0.25 * bc_aci_state.bias_center)

    lam_shared = min(0.28, 0.25 * min(lam_home, lam_away))
    shared_goals = rng.poisson(lam_shared, size=n_worlds).astype(np.float64)
    reg_home = shared_goals + rng.poisson(max(0.1, lam_home - lam_shared), size=n_worlds)
    reg_away = shared_goals + rng.poisson(max(0.1, lam_away - lam_shared), size=n_worlds)

    final_home = reg_home.astype(np.float64)
    final_away = reg_away.astype(np.float64)

    tied = final_home == final_away
    if np.any(tied):
        n_ties = int(np.sum(tied))
        ot_home_prob = (lam_home + 0.08) / (lam_home + lam_away + 0.12)
        home_wins_ot = rng.random(n_ties) < ot_home_prob
        final_home[tied] += np.where(home_wins_ot, 1.0, 0.0)
        final_away[tied] += np.where(home_wins_ot, 0.0, 1.0)

    total_scores = final_home + final_away
    home_win_prob = float(np.mean(final_home > final_away))
    away_win_prob = float(np.mean(final_away > final_home))
    puckline_home_cover_prob = float(np.mean((final_home + eff_spread) > final_away))
    over_prob = float(np.mean(total_scores > eff_total))
    under_prob = float(np.mean(total_scores < eff_total))

    return {
        "league": "NHL",
        "home_team": home_team,
        "away_team": away_team,
        "n_worlds": int(n_worlds),
        "mean_home": float(np.mean(final_home)),
        "mean_away": float(np.mean(final_away)),
        "mean_total": float(np.mean(total_scores)),
        "std_home": float(np.std(final_home)),
        "std_away": float(np.std(final_away)),
        "std_total": float(np.std(total_scores)),
        "home_win_prob": home_win_prob,
        "away_win_prob": away_win_prob,
        "draw_prob": 0.0,
        "regulation_tie_prob": float(np.mean(tied)),
        "spread_line": eff_spread,
        "puckline_home_cover_prob": puckline_home_cover_prob,
        "spread_home_cover_prob": puckline_home_cover_prob,
        "total_line": eff_total,
        "over_prob": over_prob,
        "under_prob": under_prob,
    }


def _simulate_soccer_10k(
    home_team: str,
    away_team: str,
    *,
    home_rating: float | None,
    away_rating: float | None,
    spread_line: float | None,
    total_line: float | None,
    pace_factor: float,
    rho_dc: float,
    red_card_prob: float,
    bc_aci_state: BcAciState | None,
    n_worlds: int,
    rng: np.random.Generator,
) -> dict[str, Any]:
    """Simulate Global Soccer via Dixon-Coles bivariate Poisson + red-card/stoppage tail."""
    eff_spread = -0.5 if spread_line is None else float(spread_line)
    eff_total = 2.5 if total_line is None else float(total_line)

    lam_home = 1.52 if home_rating is None else max(0.25, float(home_rating))
    lam_away = 1.18 if away_rating is None else max(0.25, float(away_rating))
    lam_home = max(0.25, lam_home * pace_factor)
    lam_away = max(0.25, lam_away * pace_factor)

    if bc_aci_state is not None:
        lam_home = max(0.25, lam_home + 0.15 * bc_aci_state.bias_center)
        lam_away = max(0.25, lam_away + 0.15 * bc_aci_state.bias_center)

    max_goals = 10
    pmf = build_dixon_coles_pmf(lam_home, lam_away, rho_dc=rho_dc, max_goals=max_goals)
    pmf_sum = float(np.sum(pmf))
    flat_pmf = pmf.ravel()
    sampled_idx = rng.choice(flat_pmf.size, size=n_worlds, p=flat_pmf)
    home_goals = (sampled_idx // (max_goals + 1)).astype(np.float64)
    away_goals = (sampled_idx % (max_goals + 1)).astype(np.float64)

    rc_p = min(max(float(red_card_prob), 0.0), 0.5)
    red_events = rng.random(n_worlds)
    home_red = red_events < (0.5 * rc_p)
    away_red = (red_events >= (0.5 * rc_p)) & (red_events < rc_p)
    if np.any(home_red):
        away_goals[home_red] += rng.poisson(0.42, size=int(np.sum(home_red))).astype(np.float64)
    if np.any(away_red):
        home_goals[away_red] += rng.poisson(0.48, size=int(np.sum(away_red))).astype(np.float64)

    stoppage_home = rng.binomial(1, 0.045, size=n_worlds).astype(np.float64)
    stoppage_away = rng.binomial(1, 0.038, size=n_worlds).astype(np.float64)
    home_goals += stoppage_home
    away_goals += stoppage_away

    total_scores = home_goals + away_goals
    home_win_prob = float(np.mean(home_goals > away_goals))
    draw_prob = float(np.mean(home_goals == away_goals))
    away_win_prob = float(np.mean(away_goals > home_goals))
    over_prob = float(np.mean(total_scores > eff_total))
    under_prob = float(np.mean(total_scores < eff_total))
    btts_prob = float(np.mean((home_goals > 0.0) & (away_goals > 0.0)))

    return {
        "league": "SOCCER",
        "home_team": home_team,
        "away_team": away_team,
        "n_worlds": int(n_worlds),
        "mean_home": float(np.mean(home_goals)),
        "mean_away": float(np.mean(away_goals)),
        "mean_total": float(np.mean(total_scores)),
        "std_home": float(np.std(home_goals)),
        "std_away": float(np.std(away_goals)),
        "std_total": float(np.std(total_scores)),
        "home_win_prob": home_win_prob,
        "draw_prob": draw_prob,
        "away_win_prob": away_win_prob,
        "spread_line": eff_spread,
        "spread_home_cover_prob": float(np.mean((home_goals + eff_spread) > away_goals)),
        "total_line": eff_total,
        "over_prob": over_prob,
        "under_prob": under_prob,
        "btts_prob": btts_prob,
        "dixon_coles_pmf_sum": pmf_sum,
    }


def simulate_multisport_matchup_10k(
    league: str,
    home_team: str = "HOME",
    away_team: str = "AWAY",
    *,
    home_rating: float | None = None,
    away_rating: float | None = None,
    spread_line: float | None = None,
    total_line: float | None = None,
    pace_factor: float = 1.0,
    three_pt_rate_home: float = 0.39,
    three_pt_rate_away: float = 0.39,
    home_b2b: bool = False,
    away_b2b: bool = False,
    home_rest_days: int = 2,
    away_rest_days: int = 2,
    bc_aci_state: BcAciState | None = None,
    rho_dc: float = -0.10,
    red_card_prob: float = 0.08,
    n_worlds: int = 10000,
    seed: int = 20261116,
) -> dict[str, Any]:
    """Run a vectorized 10,000-world simulation for NBA, NCAAB, NHL, or SOCCER.

    Args:
        league: Target league (``NBA``, ``NCAAB``, ``NHL``, ``SOCCER`` or alias).
        home_team: Home team name or code.
        away_team: Away team name or code.
        home_rating: Optional league-specific offensive expectation.
        away_rating: Optional league-specific offensive expectation.
        spread_line: Optional home spread / puckline / Asian handicap.
        total_line: Optional game total line.
        pace_factor: Tempo multiplier (> 0).
        three_pt_rate_home: Basketball 3PT attempt rate for home variance scaling.
        three_pt_rate_away: Basketball 3PT attempt rate for away variance scaling.
        home_b2b: Whether home side is on a back-to-back.
        away_b2b: Whether away side is on a back-to-back.
        home_rest_days: Days since home team's prior game.
        away_rest_days: Days since away team's prior game.
        bc_aci_state: Optional BC-ACI state for bias centering and dispersion scaling.
        rho_dc: Dixon-Coles low-score dependence parameter for soccer.
        red_card_prob: Total match red-card probability for soccer tail modeling.
        n_worlds: Monte Carlo worlds (default 10,000).
        seed: Deterministic RNG seed.

    Returns:
        Dictionary with conserved marginal means (``mean_total == mean_home + mean_away``),
        win/draw/cover/total probabilities, and simulation metadata.
    """
    if n_worlds <= 0:
        raise ValueError(f"n_worlds must be > 0, got {n_worlds}")
    if pace_factor <= 0.0:
        raise ValueError(f"pace_factor must be > 0, got {pace_factor}")

    norm_league = _normalize_league(league)
    rng = np.random.default_rng(seed)

    if norm_league in {"NBA", "NCAAB"}:
        return _simulate_basketball_10k(
            norm_league,
            home_team,
            away_team,
            home_rating=home_rating,
            away_rating=away_rating,
            spread_line=spread_line,
            total_line=total_line,
            pace_factor=pace_factor,
            three_pt_rate_home=three_pt_rate_home,
            three_pt_rate_away=three_pt_rate_away,
            home_b2b=home_b2b,
            away_b2b=away_b2b,
            home_rest_days=home_rest_days,
            away_rest_days=away_rest_days,
            bc_aci_state=bc_aci_state,
            n_worlds=n_worlds,
            rng=rng,
        )
    if norm_league == "NHL":
        return _simulate_nhl_10k(
            home_team,
            away_team,
            home_rating=home_rating,
            away_rating=away_rating,
            spread_line=spread_line,
            total_line=total_line,
            pace_factor=pace_factor,
            home_b2b=home_b2b,
            away_b2b=away_b2b,
            bc_aci_state=bc_aci_state,
            n_worlds=n_worlds,
            rng=rng,
        )
    return _simulate_soccer_10k(
        home_team,
        away_team,
        home_rating=home_rating,
        away_rating=away_rating,
        spread_line=spread_line,
        total_line=total_line,
        pace_factor=pace_factor,
        rho_dc=rho_dc,
        red_card_prob=red_card_prob,
        bc_aci_state=bc_aci_state,
        n_worlds=n_worlds,
        rng=rng,
    )


def _offline_fallback_fixtures(date_str: str) -> dict[str, list[dict[str, Any]]]:
    """Return deterministic offline fixtures across all four leagues for CI/offline runs."""
    return {
        "NBA": [
            {
                "event_id": "offline-nba-1",
                "league": "NBA",
                "home_team": "BOS",
                "away_team": "NYK",
                "start_time_utc": f"{date_str}T00:30:00Z",
                "spread_line": -4.5,
                "total_line": 225.5,
                "home_rating": 118.4,
                "away_rating": 113.2,
                "home_b2b": False,
                "away_b2b": True,
                "odds_available": True,
                "source": "offline_fallback",
            },
            {
                "event_id": "offline-nba-2",
                "league": "NBA",
                "home_team": "OKC",
                "away_team": "DEN",
                "start_time_utc": f"{date_str}T01:00:00Z",
                "spread_line": -5.0,
                "total_line": 229.5,
                "home_rating": 117.8,
                "away_rating": 112.4,
                "home_b2b": False,
                "away_b2b": False,
                "odds_available": True,
                "source": "offline_fallback",
            },
        ],
        "NHL": [
            {
                "event_id": "offline-nhl-1",
                "league": "NHL",
                "home_team": "FLA",
                "away_team": "TOR",
                "start_time_utc": f"{date_str}T00:00:00Z",
                "spread_line": -1.5,
                "total_line": 6.0,
                "home_rating": 3.35,
                "away_rating": 2.75,
                "home_b2b": False,
                "away_b2b": True,
                "odds_available": True,
                "source": "offline_fallback",
            },
            {
                "event_id": "offline-nhl-2",
                "league": "NHL",
                "home_team": "EDM",
                "away_team": "VGK",
                "start_time_utc": f"{date_str}T02:00:00Z",
                "spread_line": -1.5,
                "total_line": 6.5,
                "home_rating": 3.45,
                "away_rating": 2.95,
                "home_b2b": False,
                "away_b2b": False,
                "odds_available": True,
                "source": "offline_fallback",
            },
        ],
        "NCAAB": [
            {
                "event_id": "offline-ncaab-1",
                "league": "NCAAB",
                "home_team": "DUKE",
                "away_team": "KU",
                "start_time_utc": f"{date_str}T01:00:00Z",
                "spread_line": -3.5,
                "total_line": 146.5,
                "home_rating": 112.0,
                "away_rating": 106.5,
                "home_b2b": False,
                "away_b2b": False,
                "odds_available": True,
                "source": "offline_fallback",
            },
            {
                "event_id": "offline-ncaab-2",
                "league": "NCAAB",
                "home_team": "UCONN",
                "away_team": "GONZ",
                "start_time_utc": f"{date_str}T02:30:00Z",
                "spread_line": -2.5,
                "total_line": 148.5,
                "home_rating": 111.2,
                "away_rating": 107.8,
                "home_b2b": False,
                "away_b2b": False,
                "odds_available": True,
                "source": "offline_fallback",
            },
        ],
        "SOCCER": [
            {
                "event_id": "offline-soccer-1",
                "league": "SOCCER",
                "home_team": "ARS",
                "away_team": "CHE",
                "start_time_utc": f"{date_str}T19:45:00Z",
                "spread_line": -0.5,
                "total_line": 2.5,
                "home_rating": 1.72,
                "away_rating": 1.08,
                "home_b2b": False,
                "away_b2b": False,
                "odds_available": True,
                "source": "offline_fallback",
            },
            {
                "event_id": "offline-soccer-2",
                "league": "SOCCER",
                "home_team": "LIV",
                "away_team": "MCI",
                "start_time_utc": f"{date_str}T20:00:00Z",
                "spread_line": -0.5,
                "total_line": 2.5,
                "home_rating": 1.64,
                "away_rating": 1.36,
                "home_b2b": False,
                "away_b2b": False,
                "odds_available": True,
                "source": "offline_fallback",
            },
        ],
    }


def _to_ascii(text: str) -> str:
    """Force pure 7-bit ASCII representation."""
    return text.encode("ascii", errors="replace").decode("ascii")


def _safe_float(value: Any) -> float | None:
    """Convert numeric or string spread/total values safely."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_espn_events(
    league: str,
    payload: Mapping[str, Any],
    max_fixtures: int = 4,
) -> list[dict[str, Any]]:
    """Parse ESPN public scoreboard JSON into normalized fixture dictionaries."""
    events = payload.get("events", [])
    if not isinstance(events, list):
        return []

    parsed: list[dict[str, Any]] = []
    for event in events[:max_fixtures]:
        if not isinstance(event, Mapping):
            continue
        comps = event.get("competitions", [])
        if not isinstance(comps, list) or not comps:
            continue
        comp = comps[0]
        if not isinstance(comp, Mapping):
            continue
        competitors = comp.get("competitors", [])
        if not isinstance(competitors, list):
            continue

        home_team = "HOME"
        away_team = "AWAY"
        for entry in competitors:
            if not isinstance(entry, Mapping):
                continue
            team_info = entry.get("team", {})
            if not isinstance(team_info, Mapping):
                continue
            abbr = str(
                team_info.get("abbreviation")
                or team_info.get("shortDisplayName")
                or team_info.get("displayName")
                or "TEAM"
            )
            side = str(entry.get("homeAway", "")).lower()
            if side == "home":
                home_team = _to_ascii(abbr)
            elif side == "away":
                away_team = _to_ascii(abbr)

        odds_list = comp.get("odds", [])
        spread_line: float | None = None
        total_line: float | None = None
        odds_available = False
        if isinstance(odds_list, list) and odds_list and isinstance(odds_list[0], Mapping):
            odds0 = odds_list[0]
            spread_line = _safe_float(odds0.get("spread"))
            total_line = _safe_float(odds0.get("overUnder"))
            odds_available = spread_line is not None or total_line is not None

        parsed.append(
            {
                "event_id": _to_ascii(str(event.get("id", f"{league}-{len(parsed) + 1}"))),
                "league": league,
                "home_team": home_team,
                "away_team": away_team,
                "start_time_utc": _to_ascii(str(event.get("date", ""))),
                "spread_line": spread_line,
                "total_line": total_line,
                "home_rating": None,
                "away_rating": None,
                "home_b2b": False,
                "away_b2b": False,
                "odds_available": odds_available,
                "source": "espn_live",
            }
        )
    return parsed


def _fetch_espn_league_fixtures(
    league: str,
    date_str: str,
    timeout_sec: float,
) -> list[dict[str, Any]]:
    """Fetch fixtures for a single league from keyless ESPN scoreboard API."""
    base_url = ESPN_SCOREBOARD_ENDPOINTS[league]
    compact_date = date_str.replace("-", "")
    url = f"{base_url}?dates={compact_date}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "gse-multisport-engine/1.0"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    payload = json.loads(raw)
    if not isinstance(payload, Mapping):
        return []
    return _parse_espn_events(league, payload)


def _derive_fixture_play(
    fixture: Mapping[str, Any],
    sim: Mapping[str, Any],
    n_worlds: int,
    seed: int,
) -> dict[str, Any]:
    """Select highest-signal market lean, BC-ACI band, and CopulaCPTS SGP preview."""
    league = str(fixture["league"])
    home_team = str(fixture["home_team"])
    away_team = str(fixture["away_team"])

    candidates: list[tuple[str, str, float]] = [
        ("Moneyline", f"{home_team} ML", float(sim["home_win_prob"])),
        ("Moneyline", f"{away_team} ML", float(sim["away_win_prob"])),
        ("Total", f"OVER {sim['total_line']}", float(sim["over_prob"])),
        ("Total", f"UNDER {sim['total_line']}", float(sim["under_prob"])),
    ]
    if "spread_home_cover_prob" in sim:
        candidates.append(
            (
                "Puckline" if league == "NHL" else "Spread",
                f"{home_team} {sim['spread_line']:+.1f}",
                float(sim["spread_home_cover_prob"]),
            )
        )
    if league == "SOCCER":
        candidates.append(("1X2 Draw", f"{away_team}@{home_team} DRAW", float(sim["draw_prob"])))

    best_market, best_sel, best_prob = max(candidates, key=lambda item: item[2])
    confidence_score = int(min(74, max(42, round(best_prob * 100.0))))
    confidence_label = f"{confidence_score}/100"

    default_hw = 14.0 if league in {"NBA", "NCAAB"} else (1.8 if league == "NHL" else 1.2)
    aci_state = BcAciState(q_halfwidth=default_hw, bias_center=0.0)
    aci_center, aci_low, aci_high = predict_bc_aci_band(aci_state, float(sim["mean_total"]))

    total_leg_prob = float(sim["over_prob"])
    if best_market == "Total" and best_sel.startswith("UNDER"):
        total_leg_label = best_sel
        total_leg_prob = float(sim["under_prob"])
        rho_val = -0.18 if league == "SOCCER" else 0.22
    else:
        total_leg_label = f"OVER {sim['total_line']}"
        rho_val = 0.28 if league in {"NBA", "NCAAB"} else 0.34

    side_leg_prob = float(sim["home_win_prob"])
    sgp_preview = price_copula_conformal_sgp(
        legs=[
            CopulaLegSpec(
                athlete_or_side=f"{home_team} ML",
                market="Moneyline",
                prob=side_leg_prob,
            ),
            CopulaLegSpec(
                athlete_or_side=total_leg_label,
                market="Total",
                prob=total_leg_prob,
            ),
        ],
        rho_matrix=[[1.0, rho_val], [rho_val, 1.0]],
        n_worlds=n_worlds,
        seed=seed,
    )

    decision = "MODEL_LEAN_PAPER_ONLY" if confidence_score >= 55 else "PASS"

    return {
        "league": league,
        "event_id": str(fixture["event_id"]),
        "matchup": f"{away_team} @ {home_team}",
        "home_team": home_team,
        "away_team": away_team,
        "start_time_utc": str(fixture.get("start_time_utc", "")),
        "source": str(fixture.get("source", "offline_fallback")),
        "odds_available": bool(fixture.get("odds_available", False)),
        "recommended_market": best_market,
        "recommended_selection": best_sel,
        "model_prob": best_prob,
        "fair_american_odds": _prob_to_american_odds(best_prob),
        "confidence_score": confidence_score,
        "confidence_label": confidence_label,
        "decision": decision,
        "real_money_stake_cleared": False,
        "live_stake_fraction": 0.0,
        "bc_aci_band": {
            "adjusted_center": aci_center,
            "lower": max(0.0, aci_low),
            "upper": aci_high,
        },
        "simulation": dict(sim),
        "sgp_preview": sgp_preview,
    }


def render_multisport_daily_card(slate: Mapping[str, Any]) -> str:
    """Render a pure 7-bit ASCII XX/100 confidence card with zero live stake.

    Args:
        slate: Output dictionary produced by ``fetch_live_multisport_slate``.

    Returns:
        7-bit ASCII markdown string.
    """
    date_str = str(slate.get("date", "2026-11-16"))
    plays = list(slate.get("plays", []))
    source_summary = str(slate.get("source", "offline_fallback"))

    lines: list[str] = [
        f"# MULTI-SPORT DAILY SLATE CARD ({date_str})",
        "",
        "## Governance & Safety Contract",
        "* Leagues Covered: NBA, NHL, NCAAB, SOCCER (EPL/UCL)",
        "* Methodology: BC-ACI (arXiv:2412.19318) + CopulaCPTS + 10,000-World Vectorized Sim",
        f"* Data Source: {source_summary}",
        f"* real_money_stake_cleared: {slate.get('real_money_stake_cleared', False)}",
        f"* live_stake_fraction: {float(slate.get('live_stake_fraction', 0.0)):.1f}",
        "* Confidence Scale: XX/100 (Empirical simulation score; never percent confidence)",
        "",
        "---",
        "",
        "## Ranked Multi-Sport Plays (Sorted by XX/100 Confidence)",
        "",
        (
            "| Rank | League | Matchup | Market | Selection | Model Prob | Fair Odds | "
            "Confidence | BC-ACI Total Band | Decision | Stake |"
        ),
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]

    for idx, play in enumerate(plays, start=1):
        band = play["bc_aci_band"]
        band_str = f"{band['adjusted_center']:.2f} [{band['lower']:.2f}, {band['upper']:.2f}]"
        odds_int = int(play["fair_american_odds"])
        odds_str = f"+{odds_int}" if odds_int > 0 else str(odds_int)
        lines.append(
            f"| {idx} | {play['league']} | {play['matchup']} | {play['recommended_market']} | "
            f"{play['recommended_selection']} | {play['model_prob']:.4f} | {odds_str} | "
            f"{play['confidence_label']} | {band_str} | {play['decision']} | 0.0u |"
        )

    lines.extend(["", "---", "", "## Simulation & CopulaCPTS SGP Previews", ""])
    for play in plays:
        sim = play["simulation"]
        sgp = play["sgp_preview"]
        sgp_odds = int(sgp["fair_american_odds"])
        sgp_odds_str = f"+{sgp_odds}" if sgp_odds > 0 else str(sgp_odds)
        lines.extend(
            [
                f"### [{play['league']}] {play['matchup']} ({play['source']})",
                (
                    f"* 10,000-World Means: Away {sim['mean_away']:.2f} + Home "
                    f"{sim['mean_home']:.2f} = Total {sim['mean_total']:.2f}"
                ),
                (
                    f"* Outcome Probs: Home {sim['home_win_prob']:.4f} | "
                    f"Away {sim['away_win_prob']:.4f} | Draw {sim['draw_prob']:.4f}"
                ),
                (
                    f"* CopulaCPTS 2-Leg Preview: joint_sim_prob={sgp['joint_sim_prob']:.4f}, "
                    f"indep_prob={sgp['indep_prob']:.4f}, "
                    f"correlation_lift={sgp['correlation_lift']:.3f}x, "
                    f"fair_odds={sgp_odds_str}"
                ),
                "",
            ]
        )

    return _to_ascii("\n".join(lines).strip() + "\n")


def fetch_live_multisport_slate(
    *,
    date_str: str = "2026-11-16",
    timeout_sec: float = 4.0,
    offline: bool = False,
    n_worlds: int = 10000,
    seed: int = 20261116,
) -> dict[str, Any]:
    """Ingest live keyless ESPN scoreboards (or deterministic offline fixtures) and simulate.

    Args:
        date_str: Slate date in ``YYYY-MM-DD`` format.
        timeout_sec: Network timeout per ESPN league request.
        offline: When True, bypasses network calls and uses deterministic offline fixtures.
        n_worlds: Monte Carlo simulation worlds per fixture.
        seed: Base RNG seed.

    Returns:
        Structured daily slate dictionary with ``fixtures``, ranked ``plays``,
        governance flags (``real_money_stake_cleared=False``, ``live_stake_fraction=0.0``),
        and ``card_markdown``.
    """
    fallback_by_league = _offline_fallback_fixtures(date_str)
    all_fixtures: list[dict[str, Any]] = []
    league_sources: dict[str, str] = {}

    for league in ("NBA", "NHL", "NCAAB", "SOCCER"):
        fetched: list[dict[str, Any]] = []
        if not offline:
            try:
                fetched = _fetch_espn_league_fixtures(league, date_str, timeout_sec)
            except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError):
                fetched = []

        if fetched:
            all_fixtures.extend(fetched)
            league_sources[league] = "espn_live"
        else:
            all_fixtures.extend(fallback_by_league[league])
            league_sources[league] = "offline_fallback"

    plays: list[dict[str, Any]] = []
    for idx, fixture in enumerate(all_fixtures):
        digest = hashlib.sha256(f"{seed}:{fixture['event_id']}:{idx}".encode("ascii")).digest()
        fixture_seed = int.from_bytes(digest[:4], "big")
        sim = simulate_multisport_matchup_10k(
            league=str(fixture["league"]),
            home_team=str(fixture["home_team"]),
            away_team=str(fixture["away_team"]),
            home_rating=fixture.get("home_rating"),
            away_rating=fixture.get("away_rating"),
            spread_line=fixture.get("spread_line"),
            total_line=fixture.get("total_line"),
            home_b2b=bool(fixture.get("home_b2b", False)),
            away_b2b=bool(fixture.get("away_b2b", False)),
            n_worlds=n_worlds,
            seed=fixture_seed,
        )
        plays.append(_derive_fixture_play(fixture, sim, n_worlds=n_worlds, seed=fixture_seed + 17))

    plays.sort(key=lambda item: (item["confidence_score"], item["model_prob"]), reverse=True)
    if all(src == "espn_live" for src in league_sources.values()):
        overall_source = "espn_live"
    elif "espn_live" in league_sources.values():
        overall_source = "mixed_espn_and_offline"
    else:
        overall_source = "offline_fallback"

    slate: dict[str, Any] = {
        "date": date_str,
        "source": overall_source,
        "league_sources": league_sources,
        "leagues": ["NBA", "NHL", "NCAAB", "SOCCER"],
        "n_worlds": int(n_worlds),
        "real_money_stake_cleared": False,
        "live_stake_fraction": 0.0,
        "fixtures": all_fixtures,
        "plays": plays,
    }
    slate["card_markdown"] = render_multisport_daily_card(slate)
    return slate


def main(argv: Sequence[str] | None = None) -> int:
    """CLI entrypoint for generating the multi-sport daily confidence card."""
    parser = argparse.ArgumentParser(
        description="365-Day Multi-Sport BC-ACI + CopulaCPTS Daily Slate Engine"
    )
    parser.add_argument(
        "--out",
        default="data/cards/multisport_daily_card_2026_11_16.md",
        help="Output path for the generated 7-bit ASCII daily card.",
    )
    parser.add_argument(
        "--date",
        default="2026-11-16",
        help="Target slate date (YYYY-MM-DD).",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Use deterministic offline fixtures without hitting ESPN endpoints.",
    )
    parser.add_argument(
        "--n-worlds",
        type=int,
        default=10000,
        help="Number of Monte Carlo worlds per matchup.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=20261116,
        help="Deterministic base RNG seed.",
    )
    args = parser.parse_args(argv)

    slate = fetch_live_multisport_slate(
        date_str=args.date,
        offline=args.offline,
        n_worlds=args.n_worlds,
        seed=args.seed,
    )
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(str(slate["card_markdown"]), encoding="ascii")
    print(
        f"Wrote {out_path} | plays={len(slate['plays'])} | source={slate['source']} | "
        f"live_stake_fraction={slate['live_stake_fraction']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
