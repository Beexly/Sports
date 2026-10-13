"""
Measured model side for the live props board — (mu, sigma) from game logs.

THE GAP THIS CLOSES
-------------------
`props_live_board.py` joins real de-vigged Pinnacle prices to the props
engine's model side, but the only model distributions in-repo are 21
(player, stat) parameter pairs recovered from a prior board artifact —
parameters that came from a DraftKings edge sheet which exists on NO
branch. For tonight's game the recovered registry overlaps the board in
exactly zero places, so the live board is honestly priced-only: 66 real
prices, 0 model sides.

This module stops waiting for the sheet and MEASURES the parameters.
For each (player, stat) on the board it builds the player's per-game
totals from nflverse play-by-play — the same data path and conventions
as `sgp_correlation_estimator.py` (nflverse-data pbp release, CC-BY 4.0,
local files under `data/nflverse/pbp/`, regular season only) — over the
window 2025 full season + 2026 weeks 1-5, and takes the mean and the
sample standard deviation of the per-game series. The pairs feed the
SAME registry shape `props_live_board` already consumes, so the model
probability and the comparison come from the engine's own distributions
(`prop_discrepancy_engine.fit_for_stat` / `NormalFit`) — this module
contains no probability math of its own.

WHAT A "GAME" IS HERE, STATED PLAINLY
-------------------------------------
A player's game universe is the set of regular-season games in the
window where the player appears in play-by-play in any tracked role
(passer, rusher, receiver, kicker, punt/kickoff returner, touchdown
scorer). Every stat series is taken over that universe, zero-filled
where the stat did not occur in a game he appeared in. This is a
participation proxy: play-by-play has no snap counts, so a player who
was active but never touched the ball (or was never targeted) in a game
leaves no trace and that game is not counted. The bias direction is
known — a low-usage player's mean is biased slightly UP, because his
zero games are the ones most likely to be missing — and the sample
floor below is the guard, not a cure. The limitation rides in the
artifact provenance rather than being smoothed over.

THE SAMPLE FLOOR
----------------
A pair with fewer than MIN_GAMES (4) games in the window is NOT
estimated: status `insufficient_sample`, model side null, the row
states why. A pair whose measured series has zero variance is likewise
withheld (`degenerate_sample`): a distribution with sigma = 0 is a
claim of certainty the data cannot support. Nothing is ever filled
from a prior, a projection site, or a guess.

STAT MAPPING (board stat -> play-by-play derivation, exact)
-----------------------------------------------------------
    pass_yards ....... sum(passing_yards) over plays where passer = player
    pass_attempts .... sum(pass_attempt) as passer
    pass_completions . sum(complete_pass) as passer
    pass_tds ......... sum(pass_touchdown) as passer
    interceptions .... sum(interception) as passer
    rush_yards ....... sum(rushing_yards) over plays where rusher = player
    rush_attempts .... sum(rush_attempt) as rusher
    receiving_yards .. sum(receiving_yards) over plays where receiver = player
    receptions ....... sum(complete_pass) as receiver
    rush_rec_yards ... rush_yards series + receiving_yards series, per game
    tds .............. plays where td_player = player (any scoring play type)
    field_goals ...... plays where kicker = player and field_goal_result = made

Measuring a pair does not force it into the engine: the engine routes
only the families it knows (continuous yardage -> lognormal, counts ->
negative binomial / Poisson). A measured pair for a stat the engine has
no family for (attempts, interceptions, tds, field_goals) stays
priced-only with the engine's own cannot-fit note, and its measurement
is still reported in the artifact's coverage provenance.

STAMPS FROM BIRTH
-----------------
The artifact is the live board's artifact, with the same stamp schema:
top-level `label: "DIAGNOSTIC"`, `is_pick: false`, `is_edge_claim:
false`, `rvc_cleared: false`, and a caveat. A model-versus-market gap
is a DISCREPANCY for study — this module never labels one an edge or a
pick, and no stake sizing exists anywhere in the output.

Usage
-----
    python -m intelligence.props.props_model_side                 # tonight's slate
    python -m intelligence.props.props_model_side --game 1637432964
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Set, Tuple

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from intelligence.props import props_live_board as live_board  # noqa: E402
from intelligence.props.pinnacle_prop_feed import (  # noqa: E402
    NFL_LEAGUE_ID,
    _is_game_matchup,
    fetch_league_matchups,
    fetch_related_markets,
    parse_prop_board,
)

#: Same local layout the correlation estimator uses.
PBP_DIR = REPO_ROOT / "data" / "nflverse" / "pbp"
ROSTER_DIR = REPO_ROOT / "data" / "nflverse" / "rosters"

#: The measurement window: 2025 in full, 2026 weeks 1-5. The cap is a
#: parameter, not an accident of how current the downloaded file is: if
#: the 2026 file later gains week 6+, the window stated here and in the
#: artifact provenance stays the window actually used.
SEASONS: Tuple[int, ...] = (2025, 2026)
WEEK_CAPS: Dict[int, int] = {2026: 5}

#: A (player, stat) pair is estimated only from at least this many games.
MIN_GAMES = 4

#: Play-by-play columns this module reads. Kept explicit so a schema
#: change upstream fails loudly at the read, not silently downstream.
PBP_COLUMNS = [
    "game_id", "game_date", "season_type", "week", "posteam",
    "passer_player_id", "rusher_player_id", "receiver_player_id",
    "kicker_player_id", "punt_returner_player_id",
    "kickoff_returner_player_id", "td_player_id",
    "passing_yards", "pass_touchdown", "receiving_yards", "rushing_yards",
    "complete_pass", "pass_attempt", "rush_attempt", "interception",
    "field_goal_result",
]

#: Roles whose appearance in a game puts that game in a player's universe.
ROLE_ID_COLUMNS = [
    "passer_player_id", "rusher_player_id", "receiver_player_id",
    "kicker_player_id", "punt_returner_player_id",
    "kickoff_returner_player_id", "td_player_id",
]

#: Board stat -> the exact play-by-play derivation (see module docstring).
STAT_DERIVATIONS: Dict[str, str] = {
    "pass_yards": "sum(passing_yards) as passer",
    "pass_attempts": "sum(pass_attempt) as passer",
    "pass_completions": "sum(complete_pass) as passer",
    "pass_tds": "sum(pass_touchdown) as passer",
    "interceptions": "sum(interception) as passer",
    "rush_yards": "sum(rushing_yards) as rusher",
    "rush_attempts": "sum(rush_attempt) as rusher",
    "receiving_yards": "sum(receiving_yards) as receiver",
    "receptions": "sum(complete_pass) as receiver",
    "rush_rec_yards": "rush_yards + receiving_yards, per game",
    "tds": "count of plays where td_player = player",
    "field_goals": "count of plays where kicker = player and field_goal_result = made",
}

MEASURED_PARAMS_SOURCE = (
    "measured: nflverse play-by-play game logs (nflverse-data pbp "
    "release, CC-BY 4.0) — per-game totals over the 2025 regular season "
    "and 2026 regular season weeks 1-5; see sample"
)

MEASURED_CAVEAT = (
    "DIAGNOSTIC ONLY — residual-versus-close has NOT cleared. Rows carry "
    "real de-vigged Pinnacle fair probabilities: market inputs, not picks, "
    "edges, or recommendations. A model side is attached only where a "
    "(mu, sigma) pair was MEASURED for that exact player/market from "
    "nflverse play-by-play game logs (2025 regular season + 2026 regular "
    "season weeks 1-5; minimum 4 games; a game counts when the player "
    "appears in play-by-play in a tracked role — a participation proxy, "
    "no snap data). Everywhere else the model side is null, the row is "
    "priced-only, and the row states why — no model probability, "
    "distribution, or EV is invented for it. A gap between the model "
    "probability and the de-vigged market probability is a discrepancy "
    "for study, not an edge. No stake sizing is emitted while "
    "rvc_cleared is false."
)


# ---------------------------------------------------------------------------
# Loading (the only file/network-adjacent code besides the feed fetchers)
# ---------------------------------------------------------------------------

def load_pbp(season: int, pbp_dir: Path = PBP_DIR) -> pd.DataFrame:
    """
    One season of nflverse play-by-play from the local data path — the
    parquet the estimator reads when present, else its csv.gz sibling
    from the same nflverse-data pbp release.
    """
    parquet = pbp_dir / f"play_by_play_{season}.parquet"
    csv_gz = pbp_dir / f"play_by_play_{season}.csv.gz"
    if parquet.exists():
        df = pd.read_parquet(parquet, columns=PBP_COLUMNS)
    elif csv_gz.exists():
        df = pd.read_csv(csv_gz, usecols=PBP_COLUMNS)
    else:
        raise FileNotFoundError(
            f"no play-by-play for {season} in {pbp_dir}. Download "
            f"play_by_play_{season} from the nflverse-data pbp release "
            "(CC-BY 4.0) into data/nflverse/pbp/."
        )
    df = df.copy()
    df["season"] = season
    return df


def load_roster(season: int, roster_dir: Path = ROSTER_DIR) -> pd.DataFrame:
    path = roster_dir / f"roster_{season}.csv"
    if not path.exists():
        raise FileNotFoundError(
            f"no roster for {season} at {path}. Download roster_{season}.csv "
            "from the nflverse-data rosters release into data/nflverse/rosters/."
        )
    return pd.read_csv(path, usecols=["full_name", "gsis_id", "team", "position"])


# ---------------------------------------------------------------------------
# Name resolution (board full names -> nflverse GSIS ids)
# ---------------------------------------------------------------------------

def resolve_players(
    names: Sequence[str], rosters: Sequence[pd.DataFrame]
) -> Tuple[Dict[str, str], List[str]]:
    """
    Exact full-name match against the rosters, in preference order
    (current season first). A name that maps to more than one distinct
    GSIS id is UNRESOLVED, not guessed: two players share names often
    enough that picking one silently would corrupt every downstream
    number for both. Returns (name -> gsis_id, unresolved names).
    """
    resolved: Dict[str, str] = {}
    unresolved: List[str] = []
    for name in names:
        found: Optional[str] = None
        ambiguous = False
        for roster in rosters:
            hits = roster.loc[roster["full_name"] == name, "gsis_id"].dropna().unique()
            if len(hits) == 1:
                found = str(hits[0])
                break
            if len(hits) > 1:
                ambiguous = True
                break
        if found is not None and not ambiguous:
            resolved[name] = found
        else:
            unresolved.append(name)
    return resolved, unresolved


# ---------------------------------------------------------------------------
# Per-player game logs from play-by-play
# ---------------------------------------------------------------------------

def _role_sums(
    pbp: pd.DataFrame, id_col: str, player_ids: Set[str], agg: Dict[str, Tuple[str, str]]
) -> pd.DataFrame:
    sel = pbp[pbp[id_col].isin(player_ids)]
    if sel.empty:
        return pd.DataFrame(columns=["player_id", "game_id", *agg.keys()])
    out = (
        sel.groupby([id_col, "game_id"])
        .agg(**agg)
        .reset_index()
        .rename(columns={id_col: "player_id"})
    )
    return out


def player_game_logs(pbp: pd.DataFrame, player_ids: Set[str]) -> pd.DataFrame:
    """
    One row per (player, game) in the player's appearance universe, with
    every board stat's per-game total (zero-filled). Regular season only,
    with the per-season week cap applied — the estimator's conventions.
    """
    df = pbp[pbp["season_type"] == "REG"].copy()
    if df.empty:
        return pd.DataFrame(
            columns=["player_id", "game_id", "game_date", "season", "team",
                     *STAT_DERIVATIONS.keys()]
        )
    caps = df["season"].map(WEEK_CAPS)  # NaN where the season is uncapped
    df = df[caps.isna() | (df["week"] <= caps)]

    # The universe: every (player, game) where the player appears in any
    # tracked role. Team/date come from the first role that saw him.
    appearances = []
    for col in ROLE_ID_COLUMNS:
        sub = df[df[col].isin(player_ids)][["game_id", "game_date", "season", "posteam", col]]
        appearances.append(sub.rename(columns={col: "player_id"}))
    universe = (
        pd.concat(appearances, ignore_index=True)
        .drop_duplicates(["player_id", "game_id"])
        .rename(columns={"posteam": "team"})
    )

    logs = universe
    pieces = [
        _role_sums(df, "passer_player_id", player_ids, {
            "pass_yards": ("passing_yards", "sum"),
            "pass_attempts": ("pass_attempt", "sum"),
            "pass_completions": ("complete_pass", "sum"),
            "pass_tds": ("pass_touchdown", "sum"),
            "interceptions": ("interception", "sum"),
        }),
        _role_sums(df, "rusher_player_id", player_ids, {
            "rush_yards": ("rushing_yards", "sum"),
            "rush_attempts": ("rush_attempt", "sum"),
        }),
        _role_sums(df, "receiver_player_id", player_ids, {
            "receiving_yards": ("receiving_yards", "sum"),
            "receptions": ("complete_pass", "sum"),
        }),
    ]
    td_sel = df[df["td_player_id"].isin(player_ids)]
    if not td_sel.empty:
        pieces.append(
            td_sel.groupby(["td_player_id", "game_id"]).size()
            .reset_index(name="tds").rename(columns={"td_player_id": "player_id"})
        )
    fg_sel = df[
        df["kicker_player_id"].isin(player_ids) & (df["field_goal_result"] == "made")
    ]
    if not fg_sel.empty:
        pieces.append(
            fg_sel.groupby(["kicker_player_id", "game_id"]).size()
            .reset_index(name="field_goals").rename(columns={"kicker_player_id": "player_id"})
        )
    for piece in pieces:
        if piece.empty:
            continue
        logs = logs.merge(piece, on=["player_id", "game_id"], how="left")

    for stat in STAT_DERIVATIONS:
        if stat == "rush_rec_yards":
            continue
        if stat not in logs.columns:
            logs[stat] = 0.0
        logs[stat] = logs[stat].fillna(0.0)
    logs["rush_rec_yards"] = logs["rush_yards"] + logs["receiving_yards"]
    return logs.sort_values(["player_id", "game_date", "game_id"]).reset_index(drop=True)


# ---------------------------------------------------------------------------
# The estimator: per (player, stat) -> measured (mu, sigma, n), or a reason
# ---------------------------------------------------------------------------

def estimate_distributions(
    logs: pd.DataFrame,
    pairs: Sequence[Tuple[str, str]],
    resolved: Dict[str, str],
    min_games: int = MIN_GAMES,
) -> Tuple[
    Dict[Tuple[str, str], Dict[str, object]],
    List[Dict[str, object]],
    Dict[Tuple[str, str], str],
]:
    """
    Returns (registry, coverage, missing_notes):

      * registry — the (player_lower, stat) -> params shape
        `props_live_board` consumes, for measured pairs only;
      * coverage — one record per requested pair, measured or not, with
        the sample behind the decision (withheld pairs show the numbers
        that were NOT used, labelled by their status);
      * missing_notes — per-pair priced-only reasons for the board rows.
    """
    registry: Dict[Tuple[str, str], Dict[str, object]] = {}
    coverage: List[Dict[str, object]] = []
    missing_notes: Dict[Tuple[str, str], str] = {}

    by_id: Dict[str, pd.DataFrame] = {
        str(pid): sub for pid, sub in logs.groupby("player_id")
    } if not logs.empty else {}

    for player, stat in pairs:
        key = (player.strip().lower(), stat.strip())
        record: Dict[str, object] = {"player": player, "stat": stat}
        pid = resolved.get(player)
        if pid is None:
            record.update({"status": "player_unresolved", "n_games": 0})
            missing_notes[key] = (
                "priced-only: player could not be resolved to an nflverse "
                "player id by exact roster name match, so no game logs "
                "exist for him here; fair probability is the de-vigged "
                "market price — no EV computed"
            )
            coverage.append(record)
            continue
        if stat not in STAT_DERIVATIONS:
            record.update({"status": "unmappable", "n_games": 0})
            missing_notes[key] = (
                "priced-only: this stat has no nflverse play-by-play "
                "derivation, so no measured distribution exists for it; "
                "fair probability is the de-vigged market price — no EV computed"
            )
            coverage.append(record)
            continue

        sub = by_id.get(pid)
        if sub is None:
            values = np.array([], dtype=float)
            dates: List[str] = []
            seasons: List[int] = []
            teams: List[str] = []
        else:
            sub = sub.sort_values(["game_date", "game_id"])
            values = sub[stat].to_numpy(dtype=float)
            dates = [str(d) for d in sub["game_date"]]
            seasons = sorted({int(s) for s in sub["season"]})
            teams = sorted({str(t) for t in sub["team"]})
        n = int(len(values))
        mu = float(np.mean(values)) if n else None
        sigma = float(np.std(values, ddof=1)) if n >= 2 else None
        record.update({
            "n_games": n,
            "mu": mu,
            "sigma": sigma,
            "first_game_date": dates[0] if dates else None,
            "last_game_date": dates[-1] if dates else None,
            "seasons": seasons,
            "teams": teams,
        })

        if n < min_games:
            record["status"] = "insufficient_sample"
            missing_notes[key] = (
                f"priced-only: measured model withheld — insufficient_sample "
                f"(n={n} games in the 2025 + 2026-weeks-1-5 window, minimum "
                f"{min_games}); fair probability is the de-vigged market "
                "price — no EV computed"
            )
            coverage.append(record)
            continue
        if sigma is None or not np.isfinite(sigma) or sigma <= 0.0:
            record["status"] = "degenerate_sample"
            missing_notes[key] = (
                "priced-only: measured model withheld — degenerate_sample "
                "(the per-game series has zero variance, so no honest "
                "distribution can be fitted); fair probability is the "
                "de-vigged market price — no EV computed"
            )
            coverage.append(record)
            continue

        record["status"] = "measured"
        registry[key] = {
            "mu": mu,
            "sigma": sigma,
            "sheet_game": None,
            "params_source": MEASURED_PARAMS_SOURCE,
            "sample": {
                "n_games": n,
                "first_game_date": record["first_game_date"],
                "last_game_date": record["last_game_date"],
                "seasons": seasons,
                "teams": teams,
                "source": "nflverse play-by-play (nflverse-data pbp release, CC-BY 4.0)",
                "derivation": STAT_DERIVATIONS[stat],
                "estimator": (
                    "mean and sample standard deviation (ddof=1) of "
                    "per-game totals over regular-season games where the "
                    "player appears in play-by-play in a tracked role"
                ),
            },
        }
        coverage.append(record)
    return registry, coverage, missing_notes


def measured_model_provenance(
    coverage: List[Dict[str, object]], min_games: int = MIN_GAMES
) -> Dict[str, object]:
    measured = sum(1 for c in coverage if c["status"] == "measured")
    return {
        "source": (
            "measured from nflverse play-by-play game logs "
            "(nflverse-data pbp release, CC-BY 4.0), local path "
            "data/nflverse/pbp/ — the same path the SGP correlation "
            "estimator reads"
        ),
        "window": "2025 regular season (all weeks) + 2026 regular season weeks 1-5",
        "estimator": (
            "per (player, stat): mean and sample standard deviation "
            "(ddof=1) of per-game totals over regular-season games where "
            "the player appears in play-by-play in a tracked role "
            "(participation proxy — play-by-play carries no snap counts)"
        ),
        "min_games": min_games,
        "pairs_evaluated": len(coverage),
        "pairs_measured": measured,
        "coverage": coverage,
        "note": (
            "pairs not measured carry their status and the sample behind "
            "the decision; withheld pairs' mu/sigma in coverage are the "
            "numbers that were NOT used. Measured pairs for stats the "
            "engine has no distribution family for still price-only — "
            "see the rows' model_note."
        ),
    }


# ---------------------------------------------------------------------------
# CLI (network only via the feed's fetchers)
# ---------------------------------------------------------------------------

def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--league", type=int, default=NFL_LEAGUE_ID)
    parser.add_argument("--game", type=int, default=None,
                        help="single game matchup id (default: all upcoming games)")
    parser.add_argument("--seasons", type=int, nargs="+", default=list(SEASONS))
    parser.add_argument("--min-games", type=int, default=MIN_GAMES)
    parser.add_argument("--out", default=str(live_board.OUTBOX_JSON))
    args = parser.parse_args(argv)

    fetched_at = datetime.now(timezone.utc).isoformat()

    matchups = fetch_league_matchups(args.league)
    games = [m for m in matchups if _is_game_matchup(m)]
    if args.game is not None:
        games = [g for g in games if int(g["id"]) == args.game]
    now = datetime.now(timezone.utc)
    upcoming = []
    for g in games:
        try:
            start = datetime.fromisoformat(str(g.get("startTime")).replace("Z", "+00:00"))
        except ValueError:
            continue
        if start >= now:
            upcoming.append(g)

    game_boards: List[Dict[str, object]] = []
    records: List[dict] = []
    for g in upcoming:
        gid = int(g["id"])
        markets = fetch_related_markets(gid)
        board = parse_prop_board(matchups, markets, gid)
        teams = [p.get("name") for p in g.get("participants") or []]
        game_boards.append(
            {"game_matchup_id": gid, "teams": teams,
             "start_time": g.get("startTime"), **board}
        )
        records.extend(board["records"])  # type: ignore[arg-type]

    # Measure the model side for exactly the pairs the board carries.
    seasons = sorted(args.seasons)
    rosters = [load_roster(s) for s in reversed(seasons)]
    player_names = sorted({str(r["player"]) for r in records})
    resolved, unresolved = resolve_players(player_names, rosters)

    pbp = pd.concat([load_pbp(s) for s in seasons], ignore_index=True)
    logs = player_game_logs(pbp, set(resolved.values()))
    pairs = sorted({(str(r["player"]), str(r["stat"])) for r in records})
    registry, coverage, missing_notes = estimate_distributions(
        logs, pairs, resolved, min_games=args.min_games
    )

    artifact = live_board.build_artifact(
        game_boards, registry, fetched_at,
        missing_notes=missing_notes,
        caveat=MEASURED_CAVEAT,
        model_provenance=measured_model_provenance(coverage, args.min_games),
    )
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(artifact, indent=1), encoding="utf-8")

    c = artifact["counts"]
    print("DIAGNOSTIC live props board — MEASURED model side (residual-versus-close NOT cleared)")
    print(f"  players resolved to nflverse ids: {len(resolved)}/{len(player_names)}"
          + (f" (unresolved: {', '.join(unresolved)})" if unresolved else ""))
    print(f"  (player, stat) pairs evaluated: {len(coverage)}; "
          f"measured: {sum(1 for x in coverage if x['status'] == 'measured')}")
    for g in artifact["games"]:  # type: ignore[attr-defined]
        print(
            f"  {g['teams']} — priced rows: {g['n_priced_rows']}, "
            f"with model: {g['n_rows_with_model']}, priced-only: {g['n_priced_only']}"
        )
    print(
        f"  totals: {c['priced_rows']} priced / {c['rows_with_model']} with model / "
        f"{c['priced_only_rows']} priced-only"
    )

    discrepancies = []
    for g in artifact["games"]:  # type: ignore[attr-defined]
        for row in g["rows_with_model"]:
            discrepancies.append((abs(float(row["comparison"]["model_minus_fair_over"])), row))
    discrepancies.sort(reverse=True)
    if discrepancies:
        print("  largest model-vs-market discrepancies (for study — not edges):")
        for _, row in discrepancies[:5]:
            comp = row["comparison"]
            print(
                f"    {row['player']} {row['stat']} line {row['line']}: "
                f"model P(over) {row['model']['p_over']:.3f} "
                f"(normal basis {row['model']['p_over_normal_basis']:.3f}) vs "
                f"Pinnacle fair {comp['fair_over_shin']:.3f} "
                f"(gap {comp['model_minus_fair_over']:+.3f}, n={row['model']['sample']['n_games']})"
            )
    print(f"  artifact: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
