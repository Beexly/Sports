"""Week 9 (11/08/2026) DraftKings full-slate GPP portfolio run.

Inputs are the REAL DraftKings salary export `DKSalaries (2).csv`
(570 rows, 11 games, slate identity verified as Week 9 by
`verify_dk_salaries_slate_identity`).

PROJECTION PROVENANCE — read before trusting any number below:
Player projections are anchored to DraftKings' own `AvgPointsPerGame`
season average. The per-position stat-line decomposition in
`_decompose_player` is a FIXED, documented split used only so the
simulator has component fields to draw from; it is not a fitted model and
it carries no independent forecasting claim. The stochastic structure
(NegBin TDs, Gamma yardage, Student-t copula, DK milestones) is the part
that is actually modelled.

This script produces a RESEARCH ARTIFACT. It is not a published play set:
per GSE publication doctrine, nothing here may be surfaced to a customer
until it has passed the full 5-stage engine and the snap-by-snap JEV
simulation gate.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.ops.dfs_stochastic_milp_optimizer import (  # noqa: E402
    GSEFullSlateSimulator,
    build_default_covariance_bonus_matrix,
    evaluate_newell_tiered_gpp_expected_payout,
    optimize_dfs_portfolio,
    select_submodular_marginal_win_portfolio,
    simulate_dirichlet_multinomial_field,
    verify_dk_salaries_slate_identity,
)

SCORABLE = {"QB", "RB", "WR", "TE", "DST"}


def _decompose_player(row: pd.Series) -> dict:
    """Split a DK season average into simulator component fields.

    Fixed per-position shares; residual is absorbed by the position's
    primary yardage stat so the deterministic expectation reproduces
    DraftKings' own average.
    """
    pos = row["Position"]
    proj = max(0.0, float(row["AvgPointsPerGame"]))

    if pos == "QB":
        td, rush, ints = 1.4, 28.0, 0.75
        fixed = 4.0 * td + 0.10 * rush - ints
        pass_yds = max(50.0, (proj - fixed) / 0.04)
        return dict(proj_td=td, proj_pass_yds=pass_yds, proj_rush_yds=rush,
                    proj_rec_yds=0.0, proj_receptions=0.0, proj_fpts=proj)

    if pos in ("WR", "TE") or (pos == "RB"):
        if pos == "RB":
            rec, rec_yds, td = 3.0, 22.0, 0.60
            fixed = 1.0 * rec + 0.10 * rec_yds + 6.0 * td
            rush_yds = max(0.5, (proj - fixed) / 0.10)
            return dict(proj_td=td, proj_pass_yds=0.0, proj_rush_yds=rush_yds,
                        proj_rec_yds=rec_yds, proj_receptions=rec, proj_fpts=proj)
        rec, td = (4.5, 0.40) if pos == "WR" else (3.8, 0.30)
        fixed = 1.0 * rec + 6.0 * td
        rec_yds = max(5.0, (proj - fixed) / 0.10)
        return dict(proj_td=td, proj_pass_yds=0.0, proj_rush_yds=0.0,
                    proj_rec_yds=rec_yds, proj_receptions=rec, proj_fpts=proj)

    # DST
    return dict(proj_td=0.0, proj_pass_yds=0.0, proj_rush_yds=0.0,
                proj_rec_yds=0.0, proj_receptions=0.0, proj_fpts=proj)


def build_slate(csv_path: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    raw = pd.read_csv(csv_path)
    raw = raw[raw["Position"].isin(SCORABLE)].copy()
    raw["Salary"] = pd.to_numeric(raw["Salary"], errors="coerce")
    raw = raw[raw["Salary"].fillna(0) >= 2000]
    raw = raw.drop_duplicates(subset=["ID"])

    game_info = raw["Game Info"].astype(str)
    away, home = game_info.str.extract(r"^(\w+)@(\w+)", expand=True)[0], game_info.str.extract(r"^(\w+)@(\w+)", expand=True)[1]
    raw["away"], raw["home"] = away, home

    rows = []
    for _, r in raw.iterrows():
        team = str(r["TeamAbbrev"])
        opp = r["home"] if team == r["away"] else r["away"]
        comp = _decompose_player(r)
        rows.append({
            "name": str(r["Name"]),
            "position": str(r["Position"]),
            "team": team,
            "opponent": opp,
            "game_id": f'{r["away"]}@{r["home"]}',
            "salary": int(r["Salary"]),
            "projection": round(float(r["AvgPointsPerGame"]), 3),
            "role": "",
            **{k: float(v) for k, v in comp.items()},
        })
    players = pd.DataFrame(rows).reset_index(drop=True)

    games = (
        players.groupby("game_id", as_index=False)
        .agg(away=("team", "first"))
        .assign(wind_mph=0.0)
    )
    return players, games


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=r"C:/Users/Garrett/Downloads/DKSalaries (2).csv")
    ap.add_argument("--sims", type=int, default=10000)
    ap.add_argument("--opponents", type=int, default=5000)
    ap.add_argument("--lineups", type=int, default=20)
    ap.add_argument("--out-json", default=str(ROOT / "data/engine/week9_gpp_portfolio_2026_11_08.json"))
    args = ap.parse_args()

    ident = verify_dk_salaries_slate_identity(args.csv)
    if not ident["is_week9_live_file"]:
        raise SystemExit(f"REFUSING: {args.csv} is not a Week 9 slate: {ident}")

    players, games = build_slate(args.csv)
    sim = GSEFullSlateSimulator(players, games, num_sims=args.sims, seed=42, copula_nu=4)
    fpts, cov = sim.simulate_slate()

    mu = fpts.mean(axis=0)
    sd = fpts.std(axis=0)
    opt_df = players.copy().rename(columns={"name": "player"})
    opt_df["projection"] = mu

    bonuses = build_default_covariance_bonus_matrix(opt_df)
    portfolio = optimize_dfs_portfolio(
        opt_df, num_lineups=args.lineups, max_overlap=5, salary_cap=50000.0,
        min_teams=3, require_qb_stack=True, require_bring_back=True,
        covariance_bonuses=bonuses,
    )

    name_to_idx = {n: i for i, n in enumerate(players["name"])}
    lineup_scores = np.vstack([
        fpts[:, [name_to_idx[p] for p in lu["player"]]].sum(axis=1)
        for lu in portfolio
    ])

    # Adversarial field: binary roster matrix (num_opponents x k_players).
    field = simulate_dirichlet_multinomial_field(players, num_opponents=args.opponents, seed=42)
    opp_totals = field.astype(np.float64) @ mu  # each opponent's roster value at simulated means
    win_threshold = float(np.percentile(opp_totals, 99.0)) if opp_totals.size else 0.0

    sub = select_submodular_marginal_win_portfolio(
        scenario_lineup_scores=lineup_scores.T,
        winning_threshold=win_threshold,
        k_portfolio_size=min(20, len(portfolio)),
    )

    # Per-lineup win probability against the 99th-percentile field threshold.
    lineup_win_prob = (lineup_scores > win_threshold).mean(axis=1)

    # Newell tiered payout is priced on a single representative lineup's own
    # distribution, not on the max across lineups.
    best_i = int(np.argmax(lineup_win_prob))
    tiers = [(150.0, 25.0), (170.0, 80.0), (190.0, 250.0), (210.0, 1000.0)]
    payout = evaluate_newell_tiered_gpp_expected_payout(
        lineup_mean_pts=float(lineup_scores[best_i].mean()),
        lineup_std_pts=float(lineup_scores[best_i].std()),
        tier_thresholds_and_marginal_prizes=tiers,
    )

    out = {
        "slate": ident,
        "players_scored": int(len(players)),
        "games": int(players["game_id"].nunique()),
        "sims": args.sims,
        "opponent_rosters": args.opponents,
        "win_threshold_p99": round(win_threshold, 2),
        "simulated_mean_pts": round(float(mu.mean()), 2),
        "simulated_max_pts": round(float(fpts.max()), 2),
        "portfolio_size": len(portfolio),
        "submodular": {k: (round(v, 4) if isinstance(v, float) else v) for k, v in sub.items()
                       if isinstance(v, (int, float, str, list))},
        "newell_payout": {k: (round(v, 4) if isinstance(v, float) else v) for k, v in payout.items()},
        "best_lineup_index": best_i + 1,
        "lineups": [
            {
                "index": i + 1,
                "win_prob_vs_p99_field": round(float(lineup_win_prob[i]), 4),
                "salary": int(lu["salary"].sum()),
                "proj_sum": round(float(lu["projection"].sum()), 2),
                "teams": sorted(set(lu["team"])),
                "players": lu[["player", "position", "team", "opponent", "salary", "projection"]]
                .round({"projection": 2}).to_dict("records"),
            }
            for i, lu in enumerate(portfolio)
        ],
        "provenance": "projections anchored to DraftKings AvgPointsPerGame; per-position decomposition fixed and documented in run_week9_gpp_portfolio.py; RESEARCH ARTIFACT, not a published play set",
    }
    Path(args.out_json).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out_json).write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in out.items() if k != "lineups"}, indent=2))
    print(f"wrote {args.out_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
