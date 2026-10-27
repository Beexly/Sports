#!/usr/bin/env python3
"""
Hawkes regime classifier for the steam / injury event stream.

EXTERNAL EVIDENCE STREAM ONLY. This module does not write the candidate
baseline and never touches the week-2026-W44 seal. It reads event timestamps
that the poller already stores and logs the fitted regime alongside them.

Model
-----
    lambda(t) = mu + sum_{t_i < t} alpha * exp(-beta * (t - t_i))

The branching ratio n = alpha / beta measures criticality:
    n -> 1  self-exciting (moves cascade)
    n -> 0  memoryless (Poisson-like)

Estimation is maximum likelihood with a closed-form compensator, optimized by
multi-start Nelder-Mead. On short windows the MLE of n is biased low; the value
is usable for regime classification, not for a precise numerical n.
"""

from __future__ import annotations

import json
import math
import sqlite3
from pathlib import Path

import numpy as np
from scipy.optimize import minimize

DB_PATH = Path("C:/Users/Garrett/Downloads/circa_observations.db")
OUT_PATH = Path("C:/Users/Garrett/Sports/docs/ops/hawkes-regime-2026-10-26.json")


# --------------------------------------------------------------------------
# Simulation (Ogata thinning)
# --------------------------------------------------------------------------

def simulate_hawkes(mu: float, alpha: float, beta: float, T: float, seed: int = 0) -> np.ndarray:
    """Ogata thinning simulation of a univariate exponential Hawkes process."""
    rng = np.random.default_rng(seed)
    events: list[float] = []
    t = 0.0
    while t < T:
        lam = mu + alpha * sum(math.exp(-beta * (t - ti)) for ti in events)
        dt = rng.exponential(1.0 / max(lam, 1e-8))
        t += dt
        if t >= T:
            break
        lam_new = mu + alpha * sum(math.exp(-beta * (t - ti)) for ti in events)
        if rng.random() < lam_new / max(lam, 1e-12):
            events.append(t)
    return np.array(events)


# --------------------------------------------------------------------------
# Log-likelihood (vectorized recursion)
# --------------------------------------------------------------------------

def hawkes_loglik(params: np.ndarray, events: np.ndarray, T: float) -> float:
    """
    Negative log-likelihood. The compensator integral has a closed form:

        int_0^T lambda(t) dt = mu*T + (alpha/beta) * sum_i (1 - exp(-beta*(T-t_i)))

    A_i = sum_{j<i} exp(-beta*(t_i - t_j)) is computed by the recursion
        A_i = exp(-beta*(t_i - t_{i-1})) * (1 + A_{i-1})
    """
    mu, alpha, beta = params
    if mu <= 0 or alpha <= 0 or beta <= 0 or alpha >= beta:
        return float("inf")
    if len(events) == 0:
        return mu * T  # negative loglik = mu*T when no events

    A = np.zeros(len(events))
    for i in range(1, len(events)):
        A[i] = math.exp(-beta * (events[i] - events[i - 1])) * (1.0 + A[i - 1])

    lam = mu + alpha * A
    if np.any(lam <= 0):
        return float("inf")

    ll = float(np.sum(np.log(lam)))
    ll -= (alpha / beta) * float(np.sum(1.0 - np.exp(-beta * (T - events))))
    ll -= mu * T
    return -ll


# --------------------------------------------------------------------------
# Fit (multi-start Nelder-Mead)
# --------------------------------------------------------------------------

def fit_hawkes(events: np.ndarray, T: float, starts: int = 8, seed: int = 0) -> dict:
    if len(events) < 5:
        return {
            "mu": None, "alpha": None, "beta": None, "n": None,
            "half_life_s": None, "regime": "insufficient_events",
            "events": int(len(events)),
        }

    rng = np.random.default_rng(seed)
    best = None
    for _ in range(starts):
        x0 = np.array([
            rng.uniform(0.01, 1.0),
            rng.uniform(0.01, 0.9),
            rng.uniform(0.1, 2.0),
        ])
        res = minimize(hawkes_loglik, x0, args=(events, T), method="Nelder-Mead",
                       options={"maxiter": 5000, "xatol": 1e-6, "fatol": 1e-8})
        if best is None or res.fun < best.fun:
            best = res

    mu, alpha, beta = (float(x) for x in best.x)
    n = alpha / beta if beta > 0 else float("nan")
    half_life = math.log(2.0) / beta if beta > 0 else float("nan")
    regime = "self_exciting" if n >= 0.3 else "memoryless"
    return {
        "mu": round(mu, 6),
        "alpha": round(alpha, 6),
        "beta": round(beta, 6),
        "n": round(n, 6),
        "half_life_s": round(half_life, 2),
        "regime": regime,
        "events": int(len(events)),
        "neg_loglik": round(float(best.fun), 4),
    }


# --------------------------------------------------------------------------
# Real event loader (poller DB)
# --------------------------------------------------------------------------

def load_steam_events(db_path: Path = DB_PATH) -> tuple[np.ndarray, float]:
    """
    Read move timestamps from the poller DB.

    Primary source: sharp_moves.ts (one row per detected move).
    Fallback: derive change timestamps from odds_snapshots when a (game, book,
    market) series has more than one distinct curr_line.
    """
    if not db_path.exists():
        return np.array([]), 0.0

    conn = sqlite3.connect(db_path)
    rows = list(conn.execute("select ts from sharp_moves order by ts"))
    ts = [r[0] for r in rows]

    if not ts:
        # Derive from snapshot changes.
        series = list(conn.execute(
            "select game_id, sportsbook, market, group_concat(ts || '|' || curr_line, '~') "
            "from odds_snapshots group by game_id, sportsbook, market"
        ))
        for _, _, _, blob in series:
            points = []
            for pair in str(blob).split("~"):
                if "|" not in pair:
                    continue
                t, line = pair.split("|", 1)
                try:
                    points.append((t, float(line)))
                except ValueError:
                    continue
            points.sort()
            for i in range(1, len(points)):
                if points[i][1] != points[i - 1][1]:
                    ts.append(points[i][0])

    conn.close()
    if not ts:
        return np.array([]), 0.0

    # Parse ISO timestamps to seconds from the first event.
    def parse(t: str) -> float:
        from datetime import datetime
        return datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp()

    epochs = sorted(parse(t) for t in ts)
    t0 = epochs[0]
    events = np.array([e - t0 for e in epochs])
    duration = (epochs[-1] - t0) if len(epochs) > 1 else 0.0
    # A single event has no observable window; give the fit a nominal window so
    # it reports insufficient_events rather than dividing by zero.
    return events, max(duration, 1.0)


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main() -> dict:
    # Synthetic validation: known n = 0.6.
    true = {"mu": 0.2, "alpha": 0.6, "beta": 1.0}
    sim = simulate_hawkes(**true, T=200, seed=0)
    sim_fit = fit_hawkes(sim, T=200, seed=0)

    events, T = load_steam_events()
    real_fit = fit_hawkes(events, T=T, seed=0)

    out = {
        "model": "univariate exponential Hawkes",
        "branching_ratio": "n = alpha / beta",
        "synthetic_validation": {
            "true_n": true["alpha"] / true["beta"],
            "recovered": sim_fit,
            "note": "short-window MLE is biased low; regime classification only",
        },
        "real_steam_series": {
            "source": str(DB_PATH),
            "events": int(len(events)),
            "window_s": round(T, 2),
            "fit": real_fit,
            "note": (
                "fewer than 5 events: estimator returns insufficient_events and "
                "does not claim a regime"
                if real_fit["regime"] == "insufficient_events"
                else "regime classified from real poller events"
            ),
        },
        "sealed_center": "untouched — external evidence stream only",
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, indent=2), encoding="utf-8")
    return out


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
