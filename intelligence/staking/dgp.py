# PROVENANCE — gse-intelligence-build / staking / dgp.py
# Seeded synthetic NFL pick/outcome simulator for staking research backtests.
# Implements the HONESTY RULE: no real bankroll/pick history exists in this
# sandbox, so all backtests run on a research-grounded synthetic DGP whose
# calibration is documented below. The sizing MACHINERY (Kelly fractions,
# 1203 stop-loss PDE scaling, 1213 redundancy screen, 1749 alpha-governor,
# 2143 two-layer CVaR) is the real implementation; the DATA is synthetic.
#
# Research grounding for the DGP parameters:
# - Edge distribution (mean ~3.5%, sd ~2%): representative of a calibrated
#   +EV engine's published-pick edge after the abstention gate; the engine only
#   publishes picks with estimated edge > EDGE_FLOOR (SYS-06 abstention stack).
# - Edge-estimation noise (sd ~3% on win probability): the estimation-error
#   problem the 1749 ledger flags as untouched (§10) and the 0626 ledger
#   (Kelly under probability uncertainty) studies. Winner's-curse selection on
#   estimated edge is modeled explicitly (publish iff estimated edge > floor).
# - Pick probabilities in [0.35, 0.65]: spread/moneyline pick band.
# - 6 picks/week x 36 weeks: two NFL seasons (2024-2025) of weekly slates.
# Source docs:
#   ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md (SYS-05, SYS-19, SYS-20)
#   ~/workspace/corpus-intelligence/deep/c10/syntheses.md (Pipeline 3, S1)
#   ~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/
#     1203-kelly-growth-optimal-with-stop-loss.md
#     1749-numeraire-property-drawdown-constrained-growth-optimal.md

"""Seeded synthetic pick/outcome DGP for staking backtests (synthetic data)."""

import numpy as np

# --- DGP calibration (documented assumptions, not measurements) ----------------
PICKS_PER_WEEK = 6
WEEKS_PER_BACKTEST = 36          # two 18-week NFL seasons (2024-2025 window)
PROB_LO, PROB_HI = 0.35, 0.65    # spread/ML pick probability band
EDGE_MEAN = 0.035                # mean true probability-edge of published picks
EDGE_SD = 0.020                  # dispersion of true edge across picks
EST_NOISE_SD = 0.030             # engine win-prob estimation noise (sd)
EDGE_FLOOR = 0.01                # publish gate: estimated edge must exceed 1%
MAX_STAKE_FRac = 0.05            # sanity cap on any single-pick stake fraction
KELLY_FRACTION = 0.25            # SHIPPED fractional Kelly (SESSION_2:60,64; never kappa=1)


def simulate_picks(seed, n_weeks=WEEKS_PER_BACKTEST, picks_per_week=PICKS_PER_WEEK):
    """Generate one backtest panel of picks.

    Returns a list of weeks; each week is a list of pick dicts with keys:
      p_true  - true win probability (unknown to the sizer)
      p_hat   - engine's estimated win probability (noisy)
      q       - market-implied win probability (de-vigged)
      odds    - decimal odds offered (1/q)
      edge_true - true probability edge p_true - q
      edge_hat  - estimated probability edge p_hat - q
      win     - realized outcome (Bernoulli(p_true))
    Only picks with edge_hat > EDGE_FLOOR are published (abstention gate).
    """
    rng = np.random.default_rng(seed)
    weeks = []
    for _ in range(n_weeks):
        week = []
        for _ in range(picks_per_week):
            p_true = float(rng.uniform(PROB_LO, PROB_HI))
            edge_true = float(rng.normal(EDGE_MEAN, EDGE_SD))
            q = min(max(p_true - edge_true, 0.02), 0.98)
            p_hat = min(max(p_true + rng.normal(0.0, EST_NOISE_SD), 0.02), 0.98)
            edge_hat = p_hat - q
            if edge_hat <= EDGE_FLOOR:
                continue  # abstained: no publishable edge (SYS-06 discipline)
            week.append({
                "p_true": p_true,
                "p_hat": p_hat,
                "q": q,
                "odds": 1.0 / q,
                "edge_true": edge_true,
                "edge_hat": edge_hat,
                "win": bool(rng.random() < p_true),
            })
        weeks.append(week)
    return weeks


def apply_pick(bankroll, stake_frac, pick):
    """Apply one pick's realized P&L to a bankroll (sequential settlement)."""
    f = min(max(stake_frac, 0.0), MAX_STAKE_FRac)
    if pick["win"]:
        return bankroll * (1.0 + f * (pick["odds"] - 1.0))
    return bankroll * (1.0 - f)


def kelly_fraction(p_hat, odds):
    """Fractional-Kelly inputs: full-Kelly fraction for decimal odds.

    f* = (p*o - 1)/(o - 1) = (p - q)/(1 - q) with q = 1/o (1360/0835).
    Returns 0 for non-positive estimated edge (never bet without edge:
    the 1631 hard exclusion — sizing starts from edge, never from volatility).
    """
    q = 1.0 / odds
    if p_hat <= q:
        return 0.0
    return (p_hat - q) / (1.0 - q)
