"""
Wire REAL prices into the measured-correlation SGP engine.

THE GAP THIS CLOSES
-------------------
The chain estimator -> adapter -> engine was real except at its inputs:

  * `price_from_measured_correlations.build_legs()` hardcodes ILLUSTRATIVE
    marginals (a generic QB at 245.5 +/- 42, etc.) tied to no game, no market,
    and no date — so every run priced the same fictional game;
  * no book price was ever supplied, so the engine's book comparison never ran;
  * the props engine's de-vig (multiplicative + Shin) had never seen a real
    two-way price, because its sheets carry lines without juice.

`intelligence/props/real_price_feed.py` now supplies the real prices — the
keyless ESPN/Galaxy path (registry ``galaxy-espn-inline``), DraftKings prices
relayed inline by ESPN, fetched live for the current slate. This runner is the
wiring:

  1. fetch the current NFL slate's real prices (or read a captured payload);
  2. de-vig every complete two-way market with the props engine's own code —
     the first real exercise of that de-vig;
  3. for each upcoming game, price the canonical 4-leg QB/WR stack per team
     with the MEASURED correlation matrix, the leg volume rescaled by the
     team's implied team total from the real spread + total;
  4. emit a provenance-stamped projections artifact (JSON).

THE SCALING COEFFICIENT, STATED OPENLY
--------------------------------------
The canonical legs describe a league-average environment. A team's implied
team total from the real prices (pure arithmetic: (total -/+ spread) / 2) says
how far tonight's environment sits from that average, so leg means/SDs/lambdas
are rescaled by

    ratio = implied_team_total / REFERENCE_TEAM_TOTAL

with REFERENCE_TEAM_TOTAL = 22.6 points, the 2024-25 league-average team
score. This is a modelling coefficient, not a measurement — the same device,
with the same disclosure rule, as `shade_scenario` in the props engine: the
UNSCALED price is reported beside the scaled one, never folded into it, so the
coefficient's whole influence is visible in the artifact. The leg THRESHOLDS
(250.5 / 1.5 / 75.5 / 0.5) do not move: they are the product being priced, and
a fixed stack honestly has a different fair price in a 54.5-total game than in
a 38-total game. The DEPENDENCE is measured (1,088 team-games, 2024-25); the
marginal locations are price-anchored by the mechanism above; nothing else is
claimed.

WHAT THIS DOES NOT DO
---------------------
No book SGP price exists on the keyless path, so no alpha / edge is claimed —
the engine's book comparison stays empty, exactly as the adapter's honesty
notes require. Every record is labelled DIAGNOSTIC: residual-versus-close has
NOT cleared, so nothing here is a pick, an edge, or a recommendation.

Usage
-----
    python intelligence/sgp/price_from_real_prices.py
    python intelligence/sgp/price_from_real_prices.py --from-file payload.json
    python intelligence/sgp/price_from_real_prices.py --out outbox/sgp.json
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

from intelligence.props.prop_discrepancy_engine import implied_to_fair_odds  # noqa: E402
from intelligence.props.real_price_feed import (  # noqa: E402
    SCOREBOARD_URL,
    SOURCE_ID,
    fetch_scoreboard,
    slate_records,
    utc_now_iso,
)
from intelligence.sgp.price_from_measured_correlations import (  # noqa: E402
    EXPECTED_LEG_ORDER,
    load_measured,
)
from intelligence.sgp.sgp_copula_engine import (  # noqa: E402
    Leg,
    LogNormalMarginal,
    PoissonMarginal,
    price_sgp,
)

CORRELATION_PATH = REPO_ROOT / "data" / "snapshots" / "sgp_correlations.json"
DEFAULT_OUT = REPO_ROOT / "outbox" / "sgp_projections_latest.json"

#: The environment the canonical legs describe: 2024-25 league-average points
#: per team per game. A stated constant, not a measurement from this run —
#: see the module docstring for how it is used and disclosed.
REFERENCE_TEAM_TOTAL = 22.6

#: The canonical leg stack, mirrored from build_legs() in
#: price_from_measured_correlations (same order as EXPECTED_LEG_ORDER).
#: A drift-guard test pins these to build_legs() so the two cannot separate
#: silently: (kind, center, spread, threshold, label)
BASELINE_LEGS = [
    ("lognormal", 245.5, 42.0, 250.5, "Passing yards (QB) over 250.5"),
    ("poisson", 1.80, None, 1.5, "Passing TDs (QB) over 1.5"),
    ("lognormal", 74.5, 25.0, 75.5, "Receiving yards (WR) over 75.5"),
    ("poisson", 0.40, None, 0.5, "Anytime TD (WR)"),
]


def scaled_legs(team_total: float) -> List[Leg]:
    """
    The canonical 4 legs with volume rescaled to a team's implied team total.

    ratio == 1.0 reproduces build_legs() exactly. Yardage means and SDs scale
    together (constant coefficient of variation); counting lambdas scale
    directly. Thresholds never scale — they are the product being priced.
    """
    ratio = float(team_total) / REFERENCE_TEAM_TOTAL
    legs: List[Leg] = []
    for kind, center, spread, threshold, label in BASELINE_LEGS:
        if kind == "lognormal":
            marginal = LogNormalMarginal(mean=center * ratio, sd=spread * ratio)
        else:
            marginal = PoissonMarginal(lam=center * ratio)
        legs.append(Leg(marginal, lambda v, t=threshold: v > t, label))
    return legs


def _price_block(legs: List[Leg], corr: np.ndarray, draws: int, seed: int) -> dict:
    result = price_sgp(legs=legs, correlation=corr, copula="gaussian",
                       n_draws=draws, seed=seed)
    return {
        "fair_probability": result.true_joint,
        "fair_american": round(implied_to_fair_odds(result.true_joint)),
        "independent_probability": result.independent_joint,
        "correlation_lift": result.correlation_lift,
        "joint_std_error": result.joint_std_error,
        "z_vs_independent": result.z_score,
        "leg_probabilities": result.leg_probabilities,
        "repaired_correlation": result.repaired_correlation,
    }


def price_game(record: dict, corr: np.ndarray, draws: int, seed: int) -> dict:
    """
    Attach per-team SGP fair prices to one game record (mutates nothing —
    returns a new dict). Teams are priced off their implied team totals;
    the unscaled control (ratio 1.0, the adapter's canonical legs) rides
    beside each scaled price, per the shade-disclosure rule.
    """
    out = dict(record)
    totals = record.get("implied_team_totals") or {}
    stacks = {}
    for side, abbr_key in (("home", "home_abbr"), ("away", "away_abbr")):
        team_total = totals.get(side)
        if team_total is None:
            continue
        abbr = record.get(abbr_key, side)
        scaled = _price_block(scaled_legs(team_total), corr, draws, seed)
        # Common random numbers: the control runs on the SAME seed, so the
        # scaled-vs-control difference is the scaling coefficient's effect
        # alone, not that effect plus two independent Monte Carlo noises.
        control = _price_block(scaled_legs(REFERENCE_TEAM_TOTAL), corr, draws, seed)
        stacks[abbr] = {
            "team_total_implied_by_real_prices": team_total,
            "volume_ratio_vs_reference": team_total / REFERENCE_TEAM_TOTAL,
            "legs": [label for *_x, label in BASELINE_LEGS],
            "scaled": scaled,
            "unscaled_control": control,
        }
    out["sgp_stacks"] = stacks
    return out


def build_artifact(records: List[dict], corr: np.ndarray, corr_blob: dict,
                   fetched_at: str, draws: int, seed: int) -> dict:
    games = []
    for i, record in enumerate(records):
        if record.get("state") != "pre":
            games.append({**record, "sgp_stacks": {},
                          "skip_reason": f"game state is {record.get('state')}, not pre"})
        elif not record.get("complete_prices"):
            games.append({**record, "sgp_stacks": {},
                          "skip_reason": "incomplete real prices — never completed by assumption"})
        else:
            games.append(price_game(record, corr, draws, seed + 1000 * i))
    return {
        "label": "DIAGNOSTIC",
        "is_pick": False,
        "is_edge_claim": False,
        "rvc_cleared": False,
        "caveat": (
            "DIAGNOSTIC ONLY — residual-versus-close has NOT cleared. These are "
            "model fair prices for a canonical QB/WR stack, not picks, edges, or "
            "recommendations. No book SGP price exists on the keyless path, so no "
            "alpha is claimed."
        ),
        "generated_at": fetched_at,
        "provenance": {
            "prices": {
                "source_id": SOURCE_ID,
                "endpoint": SCOREBOARD_URL,
                "provider_reported_by_espn": sorted(
                    {g.get("provider") for g in records if g.get("provider")}
                ),
                "fetched_at": fetched_at,
            },
            "correlations": {
                "path": "data/snapshots/sgp_correlations.json",
                "leg_order": EXPECTED_LEG_ORDER,
                "n_team_games": corr_blob.get("n_team_games"),
                "seasons": corr_blob.get("seasons"),
            },
            "engine": {
                "module": "intelligence/sgp/sgp_copula_engine.py (price_sgp, gaussian copula)",
                "draws": draws,
                "seed": seed,
                "reference_team_total": REFERENCE_TEAM_TOTAL,
            },
        },
        "games": games,
    }


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Price slate SGP stacks from real keyless prices")
    p.add_argument("--correlations", default=str(CORRELATION_PATH))
    p.add_argument("--from-file", default=None,
                   help="read a captured ESPN scoreboard payload instead of fetching live")
    p.add_argument("--dates", default=None, help="ESPN YYYYMMDD filter for the live fetch")
    p.add_argument("--draws", type=int, default=50_000)
    p.add_argument("--seed", type=int, default=20261012)
    p.add_argument("--out", default=str(DEFAULT_OUT))
    args = p.parse_args(argv)

    corr, blob = load_measured(Path(args.correlations))

    if args.from_file:
        payload = json.loads(Path(args.from_file).read_text(encoding="utf-8"))
        fetched_at = utc_now_iso()
    else:
        payload = fetch_scoreboard(args.dates)
        fetched_at = utc_now_iso()

    records = slate_records(payload, fetched_at=fetched_at)
    artifact = build_artifact(records, corr, blob, fetched_at, args.draws, args.seed)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(artifact, indent=2), encoding="utf-8")

    priced = [g for g in artifact["games"] if g.get("sgp_stacks")]
    print(f"DIAGNOSTIC SGP projections (residual-versus-close NOT cleared)")
    print(f"  slate games: {len(records)}  priced: {len(priced)}")
    for g in priced:
        for abbr, stack in g["sgp_stacks"].items():
            s = stack["scaled"]
            print(f"  {g['name']} — {abbr} stack: fair {s['fair_probability']:.4f} "
                  f"({s['fair_american']:+d}), lift {s['correlation_lift']:+.1%}, "
                  f"team total {stack['team_total_implied_by_real_prices']:.1f}")
    print(f"  artifact: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
