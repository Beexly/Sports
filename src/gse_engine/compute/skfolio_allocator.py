"""Ledoit-Wolf covariance-shrunk & CVaR-capped portfolio Kelly sizing (skfolio)."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CandidateBetTicket:
    """Single candidate ticket with probability, decimal odds, and PnL scenarios."""

    ticket_id: str
    game_id: str
    win_prob: float
    decimal_odds: float
    return_scenarios: tuple[float, ...] = ()


@dataclass(frozen=True, slots=True)
class PortfolioAllocation:
    """R&D allocation weight vs gate-protected live stake fraction per ticket."""

    ticket_id: str
    rd_weight: float
    live_stake_fraction: float
    standalone_kelly: float


@dataclass(frozen=True, slots=True)
class SkfolioPortfolioReport:
    """Shrinkage-adjusted portfolio Kelly summary with R&D/live gate separation."""

    allocations: tuple[PortfolioAllocation, ...]
    shrinkage_intensity: float
    portfolio_cvar_95: float
    total_rd_weight: float
    total_live_stake: float
    calibration_adjustments_enabled: bool


def _standalone_kelly(win_prob: float, decimal_odds: float) -> float:
    p = max(0.001, min(0.999, win_prob))
    b = max(1e-6, decimal_odds - 1.0)
    raw = (p * b - (1.0 - p)) / b
    return max(0.0, raw)


def _sample_covariance(series_a: Sequence[float], series_b: Sequence[float]) -> float:
    n = min(len(series_a), len(series_b))
    if n < 2:
        return 0.0
    mean_a = sum(series_a[:n]) / n
    mean_b = sum(series_b[:n]) / n
    cov = sum((series_a[i] - mean_a) * (series_b[i] - mean_b) for i in range(n)) / (n - 1)
    return cov


def allocate_skfolio_kelly_portfolio(
    tickets: Sequence[CandidateBetTicket],
    fractional_kelly: float = 0.25,
    max_total_exposure: float = 0.05,
    shrinkage: float = 0.25,
    max_cvar_95_loss: float = 0.03,
    calibration_adjustments_enabled: bool = False,
) -> SkfolioPortfolioReport:
    """Sizes multi-ticket R&D Kelly weights via Ledoit-Wolf shrinkage and CVaR cap."""
    if not 0.0 <= shrinkage <= 1.0:
        raise ValueError("shrinkage must fall in [0.0, 1.0].")
    if not 0.0 < fractional_kelly <= 1.0:
        raise ValueError("fractional_kelly must fall in (0.0, 1.0].")
    if max_total_exposure < 0.0:
        raise ValueError("max_total_exposure must be non-negative.")

    if not tickets:
        return SkfolioPortfolioReport(
            allocations=(),
            shrinkage_intensity=shrinkage,
            portfolio_cvar_95=0.0,
            total_rd_weight=0.0,
            total_live_stake=0.0,
            calibration_adjustments_enabled=calibration_adjustments_enabled,
        )

    k = len(tickets)
    kellys = [_standalone_kelly(t.win_prob, t.decimal_odds) for t in tickets]

    # Build covariance matrix with sample variance floor and same-game fallback correlation.
    cov: list[list[float]] = [[0.0] * k for _ in range(k)]
    for i in range(k):
        for j in range(k):
            t_i = tickets[i]
            t_j = tickets[j]
            if i == j:
                var = _sample_covariance(t_i.return_scenarios, t_i.return_scenarios)
                if var <= 1e-6:
                    p = max(0.01, min(0.99, t_i.win_prob))
                    b = max(0.05, t_i.decimal_odds - 1.0)
                    var = max(0.05, p * (b**2) + (1.0 - p))
                cov[i][j] = var
            else:
                raw_cov = _sample_covariance(t_i.return_scenarios, t_j.return_scenarios)
                if raw_cov == 0.0 and t_i.game_id == t_j.game_id:
                    std_i = math.sqrt(max(1e-6, cov[i][i]))
                    var_j = _sample_covariance(t_j.return_scenarios, t_j.return_scenarios)
                    std_j = math.sqrt(max(0.05, var_j))
                    raw_cov = 0.55 * std_i * std_j
                # Apply Ledoit-Wolf shrinkage toward the diagonal covariance target.
                cov[i][j] = (1.0 - shrinkage) * raw_cov

    # Marginal risk penalty = row sum of positive shrunk covariance exposure.
    raw_weights: list[float] = []
    for i in range(k):
        row_risk = cov[i][i] + sum(max(0.0, cov[i][j]) for j in range(k) if j != i)
        scale = cov[i][i] / max(1e-6, row_risk)
        raw_weights.append(kellys[i] * fractional_kelly * scale)

    total_raw = sum(raw_weights)
    cap_factor = 1.0
    if total_raw > max_total_exposure and total_raw > 0.0:
        cap_factor = max_total_exposure / total_raw

    rd_weights = [round(w * cap_factor, 6) for w in raw_weights]

    # Estimate empirical 95% CVaR across shared scenario indices if available.
    scenario_len = min((len(t.return_scenarios) for t in tickets), default=0)
    cvar_95 = 0.0
    if scenario_len >= 5:
        portfolio_returns = [
            sum(rd_weights[i] * tickets[i].return_scenarios[s] for i in range(k))
            for s in range(scenario_len)
        ]
        portfolio_returns.sort()
        tail_count = max(1, math.ceil(0.05 * len(portfolio_returns)))
        mean_tail = sum(portfolio_returns[:tail_count]) / tail_count
        cvar_95 = max(0.0, -mean_tail)
        if cvar_95 > max_cvar_95_loss and cvar_95 > 0.0 and max_cvar_95_loss > 0.0:
            cvar_scale = max_cvar_95_loss / cvar_95
            rd_weights = [round(w * cvar_scale, 6) for w in rd_weights]
            cvar_95 = round(max_cvar_95_loss, 6)

    allocations = tuple(
        PortfolioAllocation(
            ticket_id=tickets[i].ticket_id,
            rd_weight=rd_weights[i],
            live_stake_fraction=rd_weights[i] if calibration_adjustments_enabled else 0.0,
            standalone_kelly=round(kellys[i], 6),
        )
        for i in range(k)
    )
    total_rd = round(sum(a.rd_weight for a in allocations), 6)
    total_live = round(sum(a.live_stake_fraction for a in allocations), 6)

    return SkfolioPortfolioReport(
        allocations=allocations,
        shrinkage_intensity=shrinkage,
        portfolio_cvar_95=round(cvar_95, 6),
        total_rd_weight=total_rd,
        total_live_stake=total_live,
        calibration_adjustments_enabled=calibration_adjustments_enabled,
    )
