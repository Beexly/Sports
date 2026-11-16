"""Arize AX observability & walk-forward out-of-sample calibration gate."""

from __future__ import annotations

from collections.abc import Callable, Iterator, Sequence
from contextlib import contextmanager

import numpy as np

from gse_engine.models import BacktestCalibrationReport

MAX_ALLOWED_ECE = 0.035
MIN_BACKTEST_SAMPLE = 50
MIN_CLV_BEAT_RATE = 0.50


@contextmanager
def trace_engine_stage(stage_name: str) -> Iterator[None]:
    """Wraps an engine execution phase in an OpenTelemetry/Arize span when configured."""
    try:
        from opentelemetry import trace  # type: ignore[import-not-found]

        tracer = trace.get_tracer("gse_engine")
        with tracer.start_as_current_span(f"gse.{stage_name}"):
            yield
    except ImportError:
        yield


def compute_ece(probs: Sequence[float], outcomes: Sequence[int], n_bins: int = 10) -> float:
    """Computes Expected Calibration Error (ECE) over binary outcomes."""
    p = np.asarray(probs, dtype=float)
    y = np.asarray(outcomes, dtype=float)
    if p.size == 0 or p.size != y.size:
        raise ValueError("probs and outcomes must be non-empty and equal length.")

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    total = float(p.size)
    for idx in range(n_bins):
        lo, hi = bin_edges[idx], bin_edges[idx + 1]
        mask = (p >= lo) & (p <= hi if idx == n_bins - 1 else p < hi)
        if not np.any(mask):
            continue
        acc = float(np.mean(y[mask]))
        conf = float(np.mean(p[mask]))
        ece += (float(np.sum(mask)) / total) * abs(acc - conf)
    return round(float(ece), 6)


def evaluate_walk_forward_calibration(
    probs: Sequence[float],
    outcomes: Sequence[int],
    market_probs: Sequence[float],
    max_ece_allowed: float = MAX_ALLOWED_ECE,
    min_sample_size: int = MIN_BACKTEST_SAMPLE,
    on_report: Callable[[BacktestCalibrationReport], None] | None = None,
) -> BacktestCalibrationReport:
    """Evaluates out-of-sample predictions and enforces the stake-unlock safety gate.

    Real-money stake readiness clears ONLY when sample size >= 50, ECE <= 0.035,
    and decided CLV beat rate >= 0.50.
    """
    p = np.asarray(probs, dtype=float)
    y = np.asarray(outcomes, dtype=float)
    m = np.asarray(market_probs, dtype=float)
    if not (p.size == y.size == m.size) or p.size == 0:
        raise ValueError("probs, outcomes, and market_probs must be non-empty and aligned.")

    ece = compute_ece(probs, outcomes)
    brier = round(float(np.mean((p - y) ** 2)), 6)
    decided_mask = p != m
    clv_beat = (
        round(float(np.mean(p[decided_mask] > m[decided_mask])), 6)
        if np.any(decided_mask)
        else 0.0
    )

    cleared = (
        int(p.size) >= min_sample_size
        and ece <= max_ece_allowed
        and clv_beat >= MIN_CLV_BEAT_RATE
    )
    if cleared:
        reason = "Passed walk-forward calibration and CLV gates."
    else:
        reason = (
            f"Stake freeze remains ACTIVE (n={int(p.size)}, ece={ece:.4f}, "
            f"clv_beat={clv_beat:.4f})."
        )

    report = BacktestCalibrationReport(
        sample_size=int(p.size),
        ece=ece,
        brier_score=brier,
        decided_clv_beat_rate=clv_beat,
        max_ece_allowed=max_ece_allowed,
        real_money_stake_cleared=cleared,
        reason=reason,
    )
    if on_report is not None:
        on_report(report)
    return report
