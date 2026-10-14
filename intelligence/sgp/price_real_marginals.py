"""REAL-marginal SGP pricing — the measured-dependence engine gets real inputs.

Two verified pieces existed and had never been connected with real per-player
inputs:

  * intelligence/sgp/sgp_copula_engine.py — prices an SGP from a correlation
    matrix (26 tests, PSD-repair, gaussian/student-t/clayton).
  * docs/props/research/2026-10-13/sgp_correlations.json — the MEASURED
    dependence matrix from 1,088 team-games (qb_yds~wr_yds rho=0.699).
  * intelligence/sgp/price_from_measured_correlations.py — wired the two, but
    with ILLUSTRATIVE hardcoded marginals.

THIS module replaces the illustrative marginals with REAL per-player
game-level distributions from the current-season nflverse play-by-play
(2026, weeks 1-5), shrunk toward position priors because n<=5 games:

  marginal(player) = lognormal(mean = w*player_mean + (1-w)*position_mean,
                               sd   = sqrt(w*player_var + (1-w)*position_var))
  w = gp / (gp + 3)   # Bayesian shrinkage, k=3 games

and prices a same-game QB/WR parlay against that measured matrix.

HONESTY (inherited and kept):
  - No book price is invented. With --book-prob absent, the output is the
    model joint vs its own independence control — the SIZE of the
    independence error, never an edge claim.
  - The correlation matrix is from 2024-25 team-games; marginals from 2026.
    That season split is stated in the output, not hidden: dependence is
    assumed stable across seasons, which is an ASSUMPTION with tier ASSUMED.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import List, Optional

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from intelligence.sgp.sgp_copula_engine import (  # noqa: E402
    Leg,
    LogNormalMarginal,
    PoissonMarginal,
    is_psd,
    price_sgp,
)

CORR = REPO / "docs" / "props" / "research" / "2026-10-13" / "sgp_correlations.json"
PBP = REPO / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet"
OUT = REPO / "docs" / "props" / "research" / "2026-10-14" / "real-marginal-sgp.json"

SHRINK_K = 3.0  # games of shrinkage toward the position pool


def _pool_stats(values: pd.Series) -> tuple[float, float]:
    v = values.dropna()
    return float(v.mean()), float(v.std(ddof=1) if len(v) > 1 else 40.0)


def player_marginals(qb_id: str, wr_id: str) -> dict | None:
    pbp = pd.read_parquet(PBP, columns=[
        "game_id", "passer_player_id", "passer_player_name", "receiver_player_id",
        "receiver_player_name", "passing_yards", "receiving_yards",
        "pass_touchdown", "complete_pass"])
    # QB game-level
    qb = pbp[pbp.passer_player_id == qb_id]
    if not len(qb):
        return None
    qbg = qb.groupby("game_id").agg(yds=("passing_yards", "sum"),
                                    tds=("pass_touchdown", "sum"))
    all_qb_g = pbp[pbp.passer_player_id.notna()].groupby(
        ["passer_player_id", "game_id"]).agg(yds=("passing_yards", "sum"),
                                             tds=("pass_touchdown", "sum"))
    pool_q_yds, pool_q_sd = _pool_stats(all_qb_g["yds"])
    w = len(qbg) / (len(qbg) + SHRINK_K)
    q_mean = w * qbg["yds"].mean() + (1 - w) * pool_q_yds
    q_sd = math.sqrt(w * (qbg["yds"].var(ddof=1) or pool_q_sd ** 2) + (1 - w) * pool_q_sd ** 2)
    q_td_rate = float(qbg["tds"].mean())  # per-game TD count
    pool_q_td, _ = _pool_stats(all_qb_g["tds"])
    q_td_rate = w * q_td_rate + (1 - w) * max(pool_q_td, 0.5)

    # WR game-level
    wr = pbp[pbp.receiver_player_id == wr_id]
    if not len(wr):
        return None
    wrg = wr.groupby("game_id").agg(yds=("receiving_yards", "sum"))
    all_wr_g = pbp[pbp.receiver_player_id.notna()].groupby(
        ["receiver_player_id", "game_id"]).agg(yds=("receiving_yards", "sum"))
    pool_w_yds, pool_w_sd = _pool_stats(all_wr_g["yds"])
    w2 = len(wrg) / (len(wrg) + SHRINK_K)
    r_mean = w2 * wrg["yds"].mean() + (1 - w2) * pool_w_yds
    r_sd = math.sqrt(w2 * (wrg["yds"].var(ddof=1) or pool_w_sd ** 2) + (1 - w2) * pool_w_sd ** 2)
    # WR TD rate: receptions * per-reception TD rate (few games => noisy count)
    rec_g = wr.groupby("game_id")["complete_pass"].sum()
    td_per_rec = wr["pass_touchdown"].sum() / max(wr["complete_pass"].sum(), 1)
    wr_td_rate = float(rec_g.mean() * td_per_rec)
    pool_wr_td = float(pbp[pbp.receiver_player_id.notna()]
                       .groupby(["receiver_player_id", "game_id"])["complete_pass"]
                       .sum().mean() * 0.055)  # league TD-per-catch ~5.5%
    wr_td_rate = w2 * wr_td_rate + (1 - w2) * pool_wr_td

    return {
        "qb": {"id": qb_id, "games": len(qbg),
               "yards_mean": round(q_mean, 1), "yards_sd": round(q_sd, 1),
               "td_rate": round(q_td_rate, 2)},
        "wr": {"id": wr_id, "games": len(wrg),
               "yards_mean": round(r_mean, 1), "yards_sd": round(r_sd, 1),
               "td_rate": round(wr_td_rate, 2)},
        "shrinkage_k": SHRINK_K,
    }


def build_legs(m: dict, qb_line: float, wr_line: float) -> List[Leg]:
    return [
        Leg(LogNormalMarginal(mean=m["qb"]["yards_mean"], sd=m["qb"]["yards_sd"]),
            lambda v, L=qb_line: v > L, f"QB passing yards over {qb_line}"),
        Leg(PoissonMarginal(lam=max(m["qb"]["td_rate"], 0.2)),
            lambda v: v > 0.5, "QB passing TD over 0.5"),
        Leg(LogNormalMarginal(mean=m["wr"]["yards_mean"], sd=m["wr"]["yards_sd"]),
            lambda v, L=wr_line: v > L, f"WR receiving yards over {wr_line}"),
        Leg(PoissonMarginal(lam=max(m["wr"]["td_rate"], 0.1)),
            lambda v: v > 0.5, "WR anytime TD"),
    ]


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Price an SGP with REAL per-player marginals")
    p.add_argument("--qb-id", required=True, help="gsis id, e.g. 00-0033077 (D.Prescott)")
    p.add_argument("--wr-id", required=True, help="gsis id, e.g. 00-0036358 (C.Lamb)")
    p.add_argument("--qb-line", type=float, default=250.5)
    p.add_argument("--wr-line", type=float, default=75.5)
    p.add_argument("--copula", default="gaussian", choices=["gaussian", "student-t", "clayton"])
    p.add_argument("--draws", type=int, default=50_000)
    p.add_argument("--seed", type=int, default=20261014)
    p.add_argument("--book-prob", type=float, default=None)
    args = p.parse_args(argv)

    blob = json.loads(CORR.read_text(encoding="utf-8"))
    order = list(blob["leg_names"])
    corr = __import__("numpy").array(blob["matrix"], dtype=float)

    m = player_marginals(args.qb_id, args.wr_id)
    if m is None:
        print(f"player not found: {args.qb_id} / {args.wr_id}")
        return 1
    qb_name = {"00-0033077": "D.Prescott"}.get(args.qb_id, args.qb_id)
    wr_name = {"00-0036358": "C.Lamb"}.get(args.wr_id, args.wr_id)

    print("SGP priced from REAL per-player marginals x MEASURED dependence")
    print(f"  QB: {qb_name} {m['qb']}  (n={m['qb']['games']} games, shrink k={SHRINK_K})")
    print(f"  WR: {wr_name} {m['wr']}  (n={m['wr']['games']} games)")
    print(f"  dependence: 2024-25 measured matrix, {blob['n_team_games']} team-games, "
          f"PSD={is_psd(corr)}")
    print(f"  ASSUMPTION (tier ASSUMED): dependence stable across seasons")

    legs = build_legs(m, args.qb_line, args.wr_line)
    result = price_sgp(legs=legs, correlation=corr, copula=args.copula,
                       n_draws=args.draws, seed=args.seed,
                       book_price_prob=args.book_prob)
    print()
    print(result.summary())

    out = {
        "generated_by": "intelligence/sgp/price_real_marginals.py",
        "qb": m["qb"], "wr": m["wr"],
        "qb_line": args.qb_line, "wr_line": args.wr_line,
        "copula": args.copula, "correlation_source": str(CORR.relative_to(REPO)),
        "correlation_n_team_games": blob["n_team_games"],
        "result": result.__dict__ if hasattr(result, "__dict__") else str(result),
        "honesty": "marginals REAL (2026 pbp, shrunk n<=5); dependence MEASURED "
                   "(2024-25); no book price = no edge claim",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1, default=str), encoding="utf-8")
    print(f"\nlanded: {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
