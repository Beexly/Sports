"""
Wire the MEASURED same-game correlations into the copula engine and price a parlay.

WHY THIS EXISTS
---------------
Two verified pieces existed in this repo and had never been connected:

  * `intelligence/props/sgp_correlation_estimator.py` measures same-game leg
    dependence from nflverse play-by-play and writes
    `data/snapshots/sgp_correlations.json`.
  * `intelligence/sgp/sgp_copula_engine.py` prices a parlay from a correlation
    matrix (`price_sgp`), and repairs a non-PSD input rather than crashing.

The engine had 26 passing tests and had never been handed a matrix estimated from
data. This is the adapter, so the chain is estimator -> engine -> price and the
number that comes out is built on measured dependence.

WHAT THIS DOES NOT DO
---------------------
It does not invent a book price. With no SGP price ingested anywhere, the output
is the model's own joint probability against its own independence control — which
measures the SIZE of the independence error, not an edge against a book. Supply
`--book-prob` to price against a real de-vigged number when one exists.

Usage
-----
    python intelligence/sgp/price_from_measured_correlations.py
    python intelligence/sgp/price_from_measured_correlations.py --book-prob 0.04
    python intelligence/sgp/price_from_measured_correlations.py --copula student-t
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List, Optional

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from intelligence.sgp.sgp_copula_engine import (  # noqa: E402
    Leg,
    LogNormalMarginal,
    PoissonMarginal,
    is_psd,
    price_sgp,
)

CORRELATION_PATH = REPO_ROOT / "data" / "snapshots" / "sgp_correlations.json"

#: Must match LEG_NAMES in the estimator, in the same order. Asserted at load
#: time rather than trusted: a silent reorder would pair each leg's marginal
#: with the wrong column of the correlation matrix and produce a plausible
#: number that means nothing.
EXPECTED_LEG_ORDER = ["qb_pass_yards", "qb_pass_tds", "wr_rec_yards", "wr_anytime_td"]


def load_measured(path: Path) -> tuple[np.ndarray, dict]:
    if not path.exists():
        raise FileNotFoundError(
            f"{path} not found. Run intelligence/props/sgp_correlation_estimator.py first."
        )
    blob = json.loads(path.read_text(encoding="utf-8"))
    order = list(blob["leg_names"])
    if order != EXPECTED_LEG_ORDER:
        raise ValueError(
            f"leg order mismatch: estimator wrote {order}, this adapter expects "
            f"{EXPECTED_LEG_ORDER}. Pairing marginals against the wrong columns "
            "would produce a plausible and meaningless number."
        )
    return np.array(blob["matrix"], dtype=float), blob


def build_legs() -> List[Leg]:
    """
    The four legs, in the estimator's order.

    Marginals are the same ones the Monte Carlo runner uses so the two paths are
    comparable; they are ILLUSTRATIVE inputs (a line and a spread per leg), while
    the DEPENDENCE between them is now measured. That split is stated in the
    output rather than left for the reader to assume.
    """
    return [
        Leg(LogNormalMarginal(mean=245.5, sd=42.0), lambda v: v > 250.5, "Passing yards (QB) over 250.5"),
        Leg(PoissonMarginal(lam=1.80), lambda v: v > 1.5, "Passing TDs (QB) over 1.5"),
        Leg(LogNormalMarginal(mean=74.5, sd=25.0), lambda v: v > 75.5, "Receiving yards (WR) over 75.5"),
        Leg(PoissonMarginal(lam=0.40), lambda v: v > 0.5, "Anytime TD (WR)"),
    ]


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Price an SGP from measured correlations")
    p.add_argument("--correlations", default=str(CORRELATION_PATH))
    p.add_argument("--copula", default="gaussian", choices=["gaussian", "student-t", "clayton"])
    p.add_argument("--draws", type=int, default=50_000)
    p.add_argument("--seed", type=int, default=20261012)
    p.add_argument("--book-prob", type=float, default=None,
                   help="de-vigged book probability for the parlay, if one exists")
    args = p.parse_args(argv)

    corr, blob = load_measured(Path(args.correlations))

    print("SGP priced from MEASURED same-game correlations")
    print(f"  source     : {Path(args.correlations).name}")
    print(f"  provenance : {blob.get('n_team_games')} team-games, seasons {blob.get('seasons')}")
    print(f"  copula     : {args.copula}  draws {args.draws:,}")
    print()
    print("  correlation matrix as measured (repaired by the engine only if not PSD):")
    for i, name in enumerate(EXPECTED_LEG_ORDER):
        row = "".join(f"{corr[i][j]:>10.4f}" for j in range(len(EXPECTED_LEG_ORDER)))
        print(f"    {name:>16}{row}")
    print(f"  PSD as measured: {is_psd(corr)}")

    legs = build_legs()
    result = price_sgp(
        legs=legs,
        correlation=corr,
        copula=args.copula,
        n_draws=args.draws,
        seed=args.seed,
        book_price_prob=args.book_prob,
    )

    print()
    print(result.summary())
    print()
    print("  NOTE: the marginals (line, spread per leg) are ILLUSTRATIVE; the")
    print("  DEPENDENCE is measured. The lift below is the size of the independence")
    print("  error, not an edge against a book.")
    if args.book_prob is None:
        print("  No book price supplied, so no alpha is claimed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
