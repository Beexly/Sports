"""
Same-game leg correlation estimator.

WHY THIS EXISTS
---------------
`intelligence/colab/run_monte_carlo.py` prices same-game parlays through a
Gaussian copula, and the copula needs a correlation matrix. Until now that matrix
was hand-set and labelled ILLUSTRATIVE, because nothing in the repo estimated
same-game leg dependence from data. A price calculator whose dependency structure
is invented is not a model of a market.

This script estimates the matrix from real plays. It reads nflverse play-by-play
(CC-BY 4.0, the repo's legal foundation for this class of work), aggregates to
player-game level, and measures the pairwise co-movement of the four legs a real
SGP is built from:

    QB passing yards, QB passing TDs, WR receiving yards, WR anytime TD

WHAT IT MEASURES, AND WHAT IT DOES NOT
--------------------------------------
It measures CO-MOVEMENT BETWEEN TEAMMATES IN THE SAME GAME — the dependence a
book either ignores or approximates with a linear heuristic when it prices a
same-game parlay.

It does NOT:
* claim these are the correlations a book uses (it publishes none);
* adjust for opponent, weather, or game script (those are separate features);
* treat a correlation as causal. Two legs moving together is a fact about the
  joint distribution, not a mechanism.

A binary leg (anytime TD) is correlated against a continuous leg with the
point-biserial coefficient, which is the Pearson coefficient computed with the
0/1 series left as-is — stated explicitly because the interpretation differs from
a correlation between two continuous legs.

Usage
-----
    python intelligence/props/sgp_correlation_estimator.py
    python intelligence/props/sgp_correlation_estimator.py --seasons 2024 2025 --min-games 8
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
PBP_DIR = REPO_ROOT / "data" / "nflverse" / "pbp"
OUT_JSON = REPO_ROOT / "data" / "snapshots" / "sgp_correlations.json"

#: The four legs of the sample parlay, in the order the Monte Carlo runner uses.
LEG_NAMES = ["qb_pass_yards", "qb_pass_tds", "wr_rec_yards", "wr_anytime_td"]


@dataclass
class CorrelationReport:
    seasons: List[int]
    n_games: int
    n_team_games: int
    min_games: int
    leg_names: List[str]
    matrix: List[List[float]]
    pair_samples: Dict[str, int]
    notes: List[str]
    #: Own-team legs against the opposing team's legs. Empty when no cross pairs
    #: could be formed. Same leg order as `matrix`.
    cross_matrix: List[List[float]] = field(default_factory=list)
    cross_samples: Dict[str, int] = field(default_factory=dict)
    #: 8x8 joint matrix across both teams ([own x4, opp x4]) and its smallest
    #: eigenvalue. Empty when no cross pairs could be formed.
    joint_matrix: List[List[float]] = field(default_factory=list)
    joint_min_eigenvalue: Optional[float] = None


def load_season(season: int) -> Optional[pd.DataFrame]:
    path = PBP_DIR / f"play_by_play_{season}.parquet"
    if not path.exists():
        return None
    cols = [
        "game_id", "season_type", "week", "posteam", "defteam",
        "passer_player_name", "receiver_player_name",
        "passing_yards", "pass_touchdown", "receiving_yards",
        "complete_pass", "rush_attempt", "pass_attempt",
    ]
    # NOTE: this nflverse release carries pass_touchdown / rush_touchdown as
    # PER-PLAY BOOLEANS, not the aggregate passing_tds / receiving_tds columns
    # some documentation implies. Summing the boolean over a player's plays is
    # the count. Verified against the parquet schema before use rather than
    # assumed from the column name.
    df = pd.read_parquet(path, columns=cols)
    return df


def player_game_table(df: pd.DataFrame) -> pd.DataFrame:
    """
    One row per (game, team, player) with the four leg quantities.

    Passing legs are attributed to the passer; receiving legs to the receiver.
    Regular season only: preseason and postseason have different usage patterns
    and pooling them would put two regimes in one correlation.
    """
    reg = df[df["season_type"] == "REG"]

    qb = (
        reg.dropna(subset=["passer_player_name"])
        .groupby(["game_id", "posteam", "passer_player_name"], as_index=False)
        .agg(qb_pass_yards=("passing_yards", "sum"), qb_pass_tds=("pass_touchdown", "sum"))
        .rename(columns={"passer_player_name": "player"})
    )
    qb["role"] = "QB"

    wr = (
        reg.dropna(subset=["receiver_player_name"])
        .groupby(["game_id", "posteam", "receiver_player_name"], as_index=False)
        .agg(wr_rec_yards=("receiving_yards", "sum"), wr_rec_tds=("pass_touchdown", "sum"))
        .rename(columns={"receiver_player_name": "player"})
    )
    wr["role"] = "WR"

    both = qb.merge(wr, on=["game_id", "posteam", "player"], how="outer")
    both["role"] = both["role_x"].fillna(both["role_y"])
    both = both.drop(columns=["role_x", "role_y"])
    both["wr_anytime_td"] = (both["wr_rec_tds"].fillna(0) > 0).astype(float)
    return both


def primary_pairs(players: pd.DataFrame) -> pd.DataFrame:
    """
    For each team-game: the primary QB and that team's leading receiver.

    The primary QB is the one with the most passing yards in that game (a
    handoff or an injury game has two, and the leader is the one the game's
    production belongs to). The leading receiver is by receiving yards, which is
    the leg a same-game parlay is actually built on.
    """
    qbs = players.dropna(subset=["qb_pass_yards"]).copy()
    qbs = qbs.sort_values("qb_pass_yards", ascending=False).drop_duplicates(["game_id", "posteam"])

    wrs = players.dropna(subset=["wr_rec_yards"]).copy()
    wrs = wrs.sort_values("wr_rec_yards", ascending=False).drop_duplicates(["game_id", "posteam"])

    pairs = qbs[["game_id", "posteam", "player", "qb_pass_yards", "qb_pass_tds"]].merge(
        wrs[["game_id", "posteam", "player", "wr_rec_yards", "wr_anytime_td"]],
        on=["game_id", "posteam"],
        suffixes=("_qb", "_wr"),
    )
    return pairs


def pair_correlation(a: np.ndarray, b: np.ndarray) -> float:
    """Pearson (equivalently point-biserial when one series is 0/1)."""
    if len(a) < 3:
        return float("nan")
    sa, sb = np.std(a), np.std(b)
    if sa == 0.0 or sb == 0.0:
        return float("nan")
    return float(np.corrcoef(a, b)[0, 1])


def cross_team_pairs(pairs: pd.DataFrame) -> pd.DataFrame:
    """
    Opposing-side legs: this team's QB against the OTHER team's leading receiver.

    A real same-game parlay mixes both teams, and the two sides are not
    independent. The mechanism is mostly game script and clock: a game where one
    offence sustains long drives takes possessions away from the other, so the
    cross-side coefficients can carry a sign the same-side ones cannot. Measuring
    them separately is the difference between modelling a game and modelling two
    offences that happen to share a stadium.

    Self-joins the team-game table on game_id and keeps only pairs where the two
    sides differ.
    """
    left = pairs[["game_id", "posteam", "qb_pass_yards", "qb_pass_tds", "wr_rec_yards", "wr_anytime_td"]]
    right = pairs[["game_id", "posteam", "qb_pass_yards", "qb_pass_tds", "wr_rec_yards", "wr_anytime_td"]]
    merged = left.merge(right, on="game_id", suffixes=("_own", "_opp"))
    return merged[merged["posteam_own"] != merged["posteam_opp"]]


def joint_block(cross: pd.DataFrame) -> Tuple[List[List[float]], float]:
    """
    The 8x8 joint correlation matrix across BOTH teams, and its smallest
    eigenvalue.

    Columns are [own x4, opp x4], aligned row-wise on the same ordered team-game
    pair, so this is a straight correlation matrix of eight series -- not an
    assembly of blocks. Building it by concatenating the two 4x4 side estimates
    would be wrong for a subtle reason: the same-side matrix is estimated over
    team-game rows, while the cross block is estimated over ORDERED PAIRS, so the
    two halves would be computed over different row sets and the concatenation
    need not be PSD even when each half looks fine.

    Returning the min eigenvalue rather than a boolean is deliberate: a small
    negative value is a finite-sample artefact worth seeing, and a large one is a
    real problem, and a caller cannot tell those apart from True/False.
    """
    k = len(LEG_NAMES)
    veins = [f"{n}_own" for n in LEG_NAMES] + [f"{n}_opp" for n in LEG_NAMES]
    cols = np.column_stack([cross[v].to_numpy(float) for v in veins])
    # A zero-variance column (possible in a small or degenerate sample) makes
    # corrcoef divide by zero and emit RuntimeWarning for every entry in that
    # row. The result is NaN and is handled below, so the warning carries no
    # information a caller can act on -- suppressed at the source rather than
    # filtered out of the test output, where it would mask real warnings.
    with np.errstate(invalid="ignore", divide="ignore"):
        cm = np.corrcoef(cols, rowvar=False)
    cm = np.nan_to_num(cm, nan=0.0, posinf=0.0, neginf=0.0)
    np.fill_diagonal(cm, 1.0)
    ev = float(np.linalg.eigvalsh(cm).min())
    return cm.tolist(), ev


def _matrix_from_columns(
    cols: Dict[str, np.ndarray], unit_diagonal: bool = True
) -> Tuple[List[List[float]], Dict[str, int], List[str]]:
    """
    Pairwise coefficients for one leg ordering.

    `unit_diagonal=True` for a same-side correlation matrix (corr(x, x) = 1 by
    definition). For a CROSS-side block the diagonal is a real measurement —
    corr(own leg i, opposing leg i) — and forcing it to 1.0 would erase the most
    interesting number in the table, so it is computed like any other entry.

    Returns (matrix, pair_samples, degenerate_pairs). A pair whose correlation
    is undefined (a constant series, or fewer than 3 observations) is written
    as 0.0 in the matrix — there is no other number to write — and its name is
    returned in `degenerate_pairs` so the caller can put the assumption in the
    report's notes. A silent 0.0 would read as measured independence.
    """
    k = len(LEG_NAMES)
    matrix = [[0.0] * k for _ in range(k)]
    pair_samples: Dict[str, int] = {}
    degenerate_pairs: List[str] = []
    for i in range(k):
        for j in range(k):
            if i == j and unit_diagonal:
                matrix[i][j] = 1.0
                continue
            a, b = cols[LEG_NAMES[i]], cols[LEG_NAMES[j]]
            r = pair_correlation(a, b)
            if not np.isfinite(r):
                degenerate_pairs.append(f"{LEG_NAMES[i]}~{LEG_NAMES[j]}")
            matrix[i][j] = 0.0 if not np.isfinite(r) else r
            pair_samples[f"{LEG_NAMES[i]}~{LEG_NAMES[j]}"] = int(len(a))
    return matrix, pair_samples, degenerate_pairs


def estimate(seasons: List[int], min_games: int = 8) -> CorrelationReport:
    notes: List[str] = []
    frames = []
    for s in seasons:
        df = load_season(s)
        if df is None:
            notes.append(f"season {s}: play-by-play not present at {PBP_DIR.name}/play_by_play_{s}.parquet")
            continue
        pg = player_game_table(df)
        pg["season"] = s
        frames.append(pg)

    if not frames:
        raise FileNotFoundError(
            f"no play-by-play found in {PBP_DIR}. Download from nflverse-data "
            "(pbp release) — CC-BY 4.0."
        )

    players = pd.concat(frames, ignore_index=True)
    pairs = primary_pairs(players)

    n_games = int(pairs["game_id"].nunique())
    n_team_games = int(len(pairs))
    notes.append(
        "primary QB = most passing yards in the team-game; leading receiver = most "
        "receiving yards. One observation per team-game, both teams included."
    )
    notes.append(
        "regular season only; preseason and postseason excluded so two usage "
        "regimes are not pooled into one correlation."
    )
    notes.append(
        "anytime TD is 0/1, so its coefficients are point-biserial: numerically "
        "Pearson, but they answer 'does the continuous leg separate the scorers'."
    )

    cols = {
        "qb_pass_yards": pairs["qb_pass_yards"].to_numpy(float),
        "qb_pass_tds": pairs["qb_pass_tds"].to_numpy(float),
        "wr_rec_yards": pairs["wr_rec_yards"].to_numpy(float),
        "wr_anytime_td": pairs["wr_anytime_td"].to_numpy(float),
    }
    matrix, pair_samples, degenerate_pairs = _matrix_from_columns(cols)
    for pair_name in degenerate_pairs:
        notes.append(
            f"degenerate pair {pair_name}: the correlation is undefined (a "
            "constant series or fewer than 3 observations), so it is written "
            "as 0.0. That 0.0 is an ASSUMED independence, not a measurement."
        )

    # Cross-side (opposing team) coefficients, measured separately.
    #
    # Built from BOTH orderings of every distinct team pair, so each side
    # contributes its own version of all four legs and entry [i][j] is genuinely
    # corr(own leg i, opposing leg j). Getting this wrong is easy and silent: if
    # only own-QB and opp-WR columns are supplied, [0][0] compares a series with
    # itself and reads exactly 1.0000, and the whole block comes back
    # indistinguishable from a same-side matrix.
    cross = cross_team_pairs(pairs)
    cross_matrix: List[List[float]] = []
    cross_samples: Dict[str, int] = {}
    joint_matrix: List[List[float]] = []
    joint_min_ev: Optional[float] = None
    if len(cross) > 0:
        own_cols = {
            "qb_pass_yards": cross["qb_pass_yards_own"].to_numpy(float),
            "qb_pass_tds": cross["qb_pass_tds_own"].to_numpy(float),
            "wr_rec_yards": cross["wr_rec_yards_own"].to_numpy(float),
            "wr_anytime_td": cross["wr_anytime_td_own"].to_numpy(float),
        }
        opp_cols = {
            "qb_pass_yards": cross["qb_pass_yards_opp"].to_numpy(float),
            "qb_pass_tds": cross["qb_pass_tds_opp"].to_numpy(float),
            "wr_rec_yards": cross["wr_rec_yards_opp"].to_numpy(float),
            "wr_anytime_td": cross["wr_anytime_td_opp"].to_numpy(float),
        }
        k = len(LEG_NAMES)
        cross_matrix = [[0.0] * k for _ in range(k)]
        for i in range(k):
            for j in range(k):
                r = pair_correlation(own_cols[LEG_NAMES[i]], opp_cols[LEG_NAMES[j]])
                if not np.isfinite(r):
                    notes.append(
                        f"degenerate pair own_{LEG_NAMES[i]}~opp_{LEG_NAMES[j]}: "
                        "the correlation is undefined (a constant series or "
                        "fewer than 3 observations), so it is written as 0.0. "
                        "That 0.0 is an ASSUMED independence, not a measurement."
                    )
                cross_matrix[i][j] = 0.0 if not np.isfinite(r) else r
                cross_samples[f"own_{LEG_NAMES[i]}~opp_{LEG_NAMES[j]}"] = int(len(cross))
        # The block is symmetric because the row set contains both orderings of
        # every team pair, so corr(own i, opp j) and corr(own j, opp i) range over
        # the same set of pairs. Assert it rather than assume it: a non-zero
        # asymmetry means the pairing is wrong, not that the NFL is asymmetric.
        cm = np.array(cross_matrix, dtype=float)
        asym = float(np.max(np.abs(cm - cm.T)))
        if asym > 1e-9:
            notes.append(
                f"WARNING: the cross-side block is asymmetric by {asym:.6f}. The row "
                "set contains both orderings of every team pair, so it must be "
                "symmetric; treat this as a pairing bug, not a finding."
            )
        # The diagonal is corr(own leg i, opposing leg i) -- a real measurement.
        # If any of them comes back exactly 1.0 the columns are degenerate and the
        # block is not measuring what it claims.
        diag = [cross_matrix[i][i] for i in range(k)]
        if any(abs(d - 1.0) < 1e-9 for d in diag):
            notes.append(
                f"WARNING: cross-side diagonal contains an exact 1.0 ({diag}); the "
                "own and opposing columns for that leg are the same series and the "
                "block is degenerate."
            )
        notes.append(
            f"cross-side block: entry [i][j] = corr(own leg i, opposing leg j) over "
            f"{len(cross)} ordered team-game pairs. It is a cross-correlation block, "
            "not a correlation matrix: its diagonal is a real measurement "
            "(corr(own leg i, opposing leg i)), not 1, and PSD applies to the joint "
            "matrix assembled from both sides, not to this block alone."
        )

        joint_matrix, joint_min_ev = joint_block(cross)
        if joint_min_ev < -1e-8:
            notes.append(
                f"WARNING: the JOINT 8x8 matrix is not PSD (min eigenvalue "
                f"{joint_min_ev:.6f}). It is reported as measured; a copula spanning "
                "both teams must repair it before use and say so."
            )
        else:
            notes.append(
                f"joint 8x8 matrix across both teams is PSD (min eigenvalue "
                f"{joint_min_ev:.6f}); usable as-is."
            )

    # Guard: a matrix with a negative eigenvalue is not a usable correlation
    # matrix, and a copula would silently repair it. Report it instead.
    ev = np.linalg.eigvalsh(np.array(matrix, dtype=float))
    if float(ev.min()) < -1e-8:
        notes.append(
            f"WARNING: the estimated matrix is not PSD (min eigenvalue {float(ev.min()):.6f}). "
            "It is reported as measured; a consumer must repair it before use and say so."
        )
    else:
        notes.append(f"matrix is PSD (min eigenvalue {float(ev.min()):.6f}); usable as-is.")

    if n_team_games < min_games:
        notes.append(
            f"WARNING: only {n_team_games} team-games, below the requested minimum of "
            f"{min_games}. Coefficients are unstable at this sample size."
        )

    return CorrelationReport(
        seasons=list(seasons),
        n_games=n_games,
        n_team_games=n_team_games,
        min_games=min_games,
        leg_names=list(LEG_NAMES),
        matrix=matrix,
        pair_samples=pair_samples,
        notes=notes,
        cross_matrix=cross_matrix,
        cross_samples=cross_samples,
        joint_matrix=joint_matrix,
        joint_min_eigenvalue=joint_min_ev,
    )


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Same-game leg correlation estimator")
    p.add_argument("--seasons", type=int, nargs="+", default=[2024, 2025])
    p.add_argument("--min-games", type=int, default=8)
    p.add_argument("--out", default=str(OUT_JSON))
    args = p.parse_args(argv)

    report = estimate(args.seasons, min_games=args.min_games)

    print("Same-game leg correlation estimator — nflverse play-by-play")
    print(f"  seasons      : {report.seasons}")
    print(f"  games        : {report.n_games}")
    print(f"  team-games   : {report.n_team_games} (one observation each)")
    print()
    print("  correlation matrix (legs in this order):")
    for name in report.leg_names:
        print(f"    {name}")
    print()
    header = "".join(f"{n[:14]:>16}" for n in report.leg_names)
    print(f"{'':>18}{header}")
    for i, name in enumerate(report.leg_names):
        row = "".join(f"{report.matrix[i][j]:>16.4f}" for j in range(len(report.leg_names)))
        print(f"{name:>18}{row}")
    print()
    for n in report.notes:
        print(f"  note: {n}")

    if report.cross_matrix:
        print()
        print("  CROSS-SIDE block (entry [i][j] = corr(own leg i, opposing leg j);")
        print("  symmetric by construction, diagonal is a measurement not 1):")
        print(f"{'':>18}{header}")
        for i, name in enumerate(report.leg_names):
            row = "".join(f"{report.cross_matrix[i][j]:>16.4f}" for j in range(len(report.leg_names)))
            print(f"{name:>18}{row}")
        cm = np.array(report.cross_matrix, dtype=float)
        print(f"  cross diagonal (own vs opposing, same leg): "
              + ", ".join(f"{report.leg_names[i]}={cm[i][i]:.4f}" for i in range(len(report.leg_names))))

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(asdict(report), indent=2), encoding="utf-8")
    print()
    print(f"  wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
