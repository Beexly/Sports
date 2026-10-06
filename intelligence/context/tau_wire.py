"""Tau observation for DataContext. The stamp stays until the served table is the walk-forward table."""
from __future__ import annotations

TAU_STAMP = "point fit — not pre-kickoff. 2026 unit cells pool in-season weeks."


def tau_observation(team: str, tau_hat: float, fallback_level: str | None) -> dict:
    return {
        f"coaching.{team}.tau_hat": float(tau_hat),
        f"coaching.{team}.tau_stamp": TAU_STAMP,
        "fallback_level": fallback_level,
    }
