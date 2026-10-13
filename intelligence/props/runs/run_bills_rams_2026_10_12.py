"""
Exact runner for the priced Bills-Rams SGP run recorded in
`intelligence/props/runs/2026-10-12-bills-rams.md`.

This is the script that produced the priced numbers in that record. It was
missing from the original PR; this file closes that gap so the run is
reproducible from committed artifacts alone — no price, line, or marginal is
hardcoded here.

Inputs (both committed, both read at run time)
--------------------------------------------
  * `data/snapshots/kambi_props_bills_rams_2026-10-12.json` — the Kambi
    (operator `rsiuspa`, BetRivers PA) bet-offer payload for eventId
    1028813042. Legs are selected from the payload by eventId, market
    (criterion englishLabel), and participant.
  * `data/snapshots/sgp_correlations.json` — the measured same-team 4x4
    correlation matrix (1,088 team-games, 2024-2025). Its `leg_names` order
    is asserted, not trusted, for the same reason
    `intelligence/sgp/price_from_measured_correlations.py` asserts it.

Chain
-----
  1. Two-sided legs: Shin de-vig via
     `intelligence/props/prop_discrepancy_engine.py::devig_two_way(...,
     method="shin")` on the American prices, Over side first.
  2. Anytime-TD legs: CAVEAT — Kambi's "Touchdown Scorer" market is Yes-only;
     there is no No price anywhere in the payload to de-vig against. The
     marginal is therefore the RAW implied probability of the Yes price
     (vig-inclusive, an upper bound on the fair probability). The team joints
     inherit that direction through this one leg. See the run record.
  3. Each team's 4 legs are priced SEPARATELY with
     `intelligence/sgp/sgp_copula_engine.py::price_sgp`: Gaussian copula,
     the measured 4x4 matrix, Bernoulli marginals (a leg hits iff its
     copula uniform u <= p), 50,000 draws, seed 20261012. Because
     `price_sgp` seeds its own RNG per call, each team is simulated from
     the same seeded draw sequence; team order does not affect the result.
  4. The independence baseline printed by `price_sgp` is the product of the
     SIMULATED leg frequencies from that same simulation (not the analytic
     product of the input marginals) — that is what the run record's
     "Independence product" column reports.

Expected output (verified 2026-10-12)
---------------------------------------
    Los Angeles Rams: joint 0.1769, independence 0.0571
    Buffalo Bills:    joint 0.1314, independence 0.0384

Usage
-----
    python intelligence/props/runs/run_bills_rams_2026_10_12.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT))

from intelligence.props.prop_discrepancy_engine import (  # noqa: E402
    american_to_implied,
    devig_two_way,
)
from intelligence.sgp.sgp_copula_engine import Leg, Marginal, price_sgp  # noqa: E402

SNAPSHOT_PATH = REPO_ROOT / "data" / "snapshots" / "kambi_props_bills_rams_2026-10-12.json"
CORRELATION_PATH = REPO_ROOT / "data" / "snapshots" / "sgp_correlations.json"

EVENT_ID = 1028813042
N_DRAWS = 50_000
SEED = 20261012

#: Must match the measured matrix's leg order (asserted at load time).
EXPECTED_LEG_ORDER = ["qb_pass_yards", "qb_pass_tds", "wr_rec_yards", "wr_anytime_td"]

#: Market (Kambi criterion englishLabel) per leg, in matrix order.
MARKETS = {
    "qb_pass_yards": "Total Passing Yards by the Player - Including Overtime",
    "qb_pass_tds": "Total Touchdown Passes Thrown by the Player - Including Overtime",
    "wr_rec_yards": "Total Receiving Yards by the Player - Including Overtime",
    "wr_anytime_td": "Touchdown Scorer",
}

#: (team label, QB, top WR) — the two players per team who carry the four
#: matrix legs, in the run record's team order.
TEAMS = [
    ("Los Angeles Rams", "Matthew Stafford", "Puka Nacua"),
    ("Buffalo Bills", "Josh Allen", "Khalil Shakir"),
]


class BernoulliMarginal(Marginal):
    """Bernoulli(p) leg marginal: the simulated value is 1.0 iff u <= p."""

    def __init__(self, p: float, name: str = "bernoulli"):
        if not 0.0 <= p <= 1.0:
            raise ValueError(f"Bernoulli p out of range: {p}")
        self.p = float(p)
        self.name = name

    def quantile(self, u: np.ndarray) -> np.ndarray:
        return (np.asarray(u, dtype=float) <= self.p).astype(float)


def load_offers(path: Path) -> List[dict]:
    blob = json.loads(path.read_text(encoding="utf-8"))
    offers = [o for o in blob["payload"]["betOffers"] if o.get("eventId") == EVENT_ID]
    if not offers:
        raise ValueError(f"no bet offers for eventId {EVENT_ID} in {path}")
    return offers


def find_outcomes(offers: List[dict], market: str, participant: str) -> List[dict]:
    """Outcomes for one (market, participant) pair, taken only from the payload."""
    for offer in offers:
        if offer["criterion"]["englishLabel"] != market:
            continue
        outcomes = [o for o in offer["outcomes"] if o.get("participant") == participant]
        if outcomes:
            return outcomes
    raise ValueError(f"market {market!r} / participant {participant!r} not in snapshot")


def price_leg(offers: List[dict], leg_name: str, participant: str) -> Tuple[float, str]:
    """
    Return (marginal, human-readable leg description) for one leg, derived
    entirely from the snapshot prices.
    """
    outcomes = find_outcomes(offers, MARKETS[leg_name], participant)

    if leg_name == "wr_anytime_td":
        yes = next(o for o in outcomes if o["type"] == "OT_YES")
        yes_price = int(yes["oddsAmerican"])
        # Caveat (also in the module docstring): this market is Yes-only in
        # the payload — no No side exists to de-vig against — so the
        # marginal is the raw implied probability of the Yes price.
        marginal = american_to_implied(yes_price)
        return marginal, f"{participant} anytime TD @ {yes_price:+d} (Yes-only, raw implied)"

    by_type = {o["type"]: o for o in outcomes}
    over, under = by_type["OT_OVER"], by_type["OT_UNDER"]
    line = over["line"] / 1000.0  # Kambi stores lines x1000
    over_price, under_price = int(over["oddsAmerican"]), int(under["oddsAmerican"])
    devig = devig_two_way(over_price, under_price, method="shin")
    marginal = float(devig["fair"][0])  # Over side first
    desc = f"{participant} over {line} @ {over_price:+d}/{under_price:+d} (Shin de-vig)"
    return marginal, desc


def load_correlation(path: Path) -> np.ndarray:
    blob = json.loads(path.read_text(encoding="utf-8"))
    order = list(blob["leg_names"])
    if order != EXPECTED_LEG_ORDER:
        raise ValueError(
            f"leg order mismatch: matrix wrote {order}, this runner expects "
            f"{EXPECTED_LEG_ORDER}. Pairing marginals against the wrong columns "
            "would produce a plausible and meaningless number."
        )
    return np.array(blob["matrix"], dtype=float)


def main() -> int:
    offers = load_offers(SNAPSHOT_PATH)
    corr = load_correlation(CORRELATION_PATH)

    print("Bills-Rams priced SGP run (Kambi snapshot + measured correlations)")
    print(f"  snapshot   : {SNAPSHOT_PATH.name} (eventId {EVENT_ID}, {len(offers)} bet offers)")
    print(f"  correlation: {CORRELATION_PATH.name} (measured 4x4, leg order asserted)")
    print(f"  copula     : gaussian  draws {N_DRAWS:,}  seed {SEED}")
    print()

    for team, qb, wr in TEAMS:
        players = {"qb_pass_yards": qb, "qb_pass_tds": qb, "wr_rec_yards": wr, "wr_anytime_td": wr}
        marginals: List[float] = []
        legs: List[Leg] = []
        print(f"{team}")
        for leg_name in EXPECTED_LEG_ORDER:
            marginal, desc = price_leg(offers, leg_name, players[leg_name])
            marginals.append(marginal)
            legs.append(Leg(BernoulliMarginal(marginal), lambda v: v > 0.5, desc))
            print(f"  {leg_name:>14}: {desc} -> marginal {marginal:.4f}")

        result = price_sgp(
            legs=legs,
            correlation=corr,
            copula="gaussian",
            n_draws=N_DRAWS,
            seed=SEED,
        )
        print(f"  joint fair probability (copula): {result.true_joint:.4f} (+/- {result.joint_std_error:.4f})")
        print(
            "  independence baseline (simulated-frequency product, same simulation): "
            f"{result.independent_joint:.4f}"
        )
        print(f"  lift vs independence: {result.correlation_lift:+.2%}")
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
