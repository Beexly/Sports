"""
Live props board — Pinnacle prices joined to the props engine, honestly.

THE GAP THIS CLOSES
-------------------
Until now the two halves of the props stack never met on real data:

  * `prop_discrepancy_engine.py` fits model distributions and ranks a board
    by EV — but its input sheet
    (`docs/props/research/2026-10-11/edge_sheet_pp_vs_dk_v2.csv`, DraftKings
    distribution parameters per player/stat) exists on NO branch, so the
    board it emits is built from a sheet only Hermes' machine has seen, and
    its de-vig code had no prices to exercise it;
  * `pinnacle_prop_feed.py` fetches real two-way Pinnacle prop prices
    keylessly and de-vigs them with the engine's own `devig_two_way` — but
    nothing joined those prices to the engine's model side.

This module is the join. Every board row carries the REAL de-vigged
Pinnacle fair probability with full provenance (book, fetch time, line,
both quoted prices, booksum, Shin z). The model side is attached only
where an in-repo model distribution exists for that exact player/market.

THE MODEL REGISTRY, AND ITS PROVENANCE
--------------------------------------
The sheet itself is absent from every branch. What IS in-repo is the
engine's own prior board artifact, `outbox/props_ev_board_latest.json`,
which was built from that sheet and carries each row's (dk_mu, dk_sigma).
`load_model_registry` recovers the parameter pairs from that artifact —
21 player/stat pairs, all from the Week 6 slate the sheet described. That
provenance rides in the artifact header; recovered parameters are the
sheet's values as the engine itself recorded them, not new estimates.

THE HONEST SHAPE OF TONIGHT'S BOARD
-----------------------------------
For tonight's game (BUF @ LAR) the join is EMPTY, and this module says so
rather than fixing it: the only registry pair on either roster is James
Cook, and only for `rush_rec_yards` — a combined market Pinnacle does not
post for him tonight (it posts rush and receiving separately). Combining
the two separate markets into a synthetic combined fair probability would
require a joint-distribution assumption invented on the spot, so it is not
done. Every other player/market on tonight's board has no in-repo model
distribution at all.

So tonight's board is what the data supports: 66 priced rows, 0 with a
model side, 66 priced-only. A priced-only row carries the de-vigged fair
probability, `model: null`, `comparison: null`, and a per-row note.
Rows WITHOUT a model probability are excluded from EV ranking by
construction — there is no EV without a model probability, and none is
invented. When a registry pair does match, the row gets the engine's
fitted distribution (family + normal basis, per the engine's family-swap
falsifier) and EVs computed at the actually quoted Pinnacle prices.

STAMPS FROM BIRTH
-----------------
Same schema as the SGP artifact (`intelligence/sgp/price_from_real_prices.py`):
top-level `label: "DIAGNOSTIC"`, `is_pick: false`, `is_edge_claim: false`,
`rvc_cleared: false`, and a `caveat`. No Kelly or stake field is emitted
anywhere while `rvc_cleared` is false — this module never computes one.

Usage
-----
    python -m intelligence.props.props_live_board            # tonight's slate
    python -m intelligence.props.props_live_board --game 1637432964
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from intelligence.props.pinnacle_prop_feed import (  # noqa: E402
    API_BASE,
    NFL_LEAGUE_ID,
    SOURCE_ID as PINNACLE_SOURCE_ID,
    _is_game_matchup,
    fetch_league_matchups,
    fetch_related_markets,
    parse_prop_board,
)
from intelligence.props.prop_discrepancy_engine import (  # noqa: E402
    NormalFit,
    fit_for_stat,
)

MODEL_BOARD_DEFAULT = REPO_ROOT / "outbox" / "props_ev_board_latest.json"
OUTBOX_JSON = REPO_ROOT / "outbox" / "props_live_board_latest.json"

#: Why a row has no model side when the registry simply has no entry.
NO_MODEL_NOTE = (
    "priced-only: no in-repo model distribution for this player/market "
    "(the engine's edge sheet is not on any branch); fair probability is "
    "the de-vigged market price, not a model output — no EV computed"
)

CAVEAT = (
    "DIAGNOSTIC ONLY — residual-versus-close has NOT cleared. Rows carry "
    "real de-vigged Pinnacle fair probabilities: market inputs, not picks, "
    "edges, or recommendations. A model side is attached only where an "
    "in-repo model distribution exists for that exact player/market; "
    "everywhere else the model side is null and the row is priced-only — "
    "no model probability, distribution, or EV is invented for it. Model "
    "parameters, where present, are recovered from the engine's prior "
    "board artifact (built from the 2026-10-11 DraftKings edge sheet); "
    "the sheet itself is not on any branch. No stake sizing is emitted "
    "while rvc_cleared is false."
)


# ---------------------------------------------------------------------------
# Model registry (recovered from the engine's prior board artifact)
# ---------------------------------------------------------------------------

def load_model_registry(path: Path) -> Dict[Tuple[str, str], Dict[str, object]]:
    """
    (player_lower, stat) -> {mu, sigma, sheet_game} from a prior engine
    board artifact (`outbox/props_ev_board_latest.json` shape).

    A missing file is an empty registry, not an error: the board then runs
    priced-only, which is a legitimate state and is reported as such. A
    present-but-unparseable file raises — silently treating corrupt model
    parameters as absent would hide exactly the failure this stack exists
    to surface.
    """
    if not path.exists():
        return {}
    blob = json.loads(path.read_text(encoding="utf-8"))
    registry: Dict[Tuple[str, str], Dict[str, object]] = {}
    for row in blob.get("board", []):
        key = (str(row["player"]).strip().lower(), str(row["stat"]).strip())
        registry[key] = {
            "mu": float(row["dk_mu"]),
            "sigma": float(row["dk_sigma"]),
            "sheet_game": row.get("game"),
        }
    return registry


# ---------------------------------------------------------------------------
# EV at a quoted price (no breakeven table, no stake sizing)
# ---------------------------------------------------------------------------

def decimal_odds(american: float) -> float:
    """Total return multiple of an American price (stake included)."""
    if american > 0:
        return 1.0 + american / 100.0
    if american < 0:
        return 1.0 + 100.0 / abs(american)
    raise ValueError(f"not a valid American price: {american}")


def ev_at_price(p_model: float, american: float) -> float:
    """Expected profit per unit staked at the quoted price, given a model prob."""
    return p_model * decimal_odds(american) - 1.0


# ---------------------------------------------------------------------------
# The join
# ---------------------------------------------------------------------------

def _model_block(
    params: Dict[str, object], stat: str, line: float,
    over_price: float, under_price: float, fair_over: float,
) -> Tuple[Optional[dict], Optional[dict], Optional[str]]:
    """
    Fit the engine's distributions to recovered (mu, sigma) and compare
    against the de-vigged book probability at the SAME (Pinnacle) line.

    Returns (model, comparison, note). On an unfittable stat family the
    model side degrades to (None, None, note) — reported, never coerced.
    """
    mu, sigma = float(params["mu"]), float(params["sigma"])
    try:
        fit = fit_for_stat(stat, mu, sigma)
    except ValueError as exc:
        return None, None, f"priced-only: in-repo distribution parameters exist but the engine cannot fit this stat family ({exc})"
    normal = NormalFit(mu, sigma)

    p_over = float(fit.p_over(line))
    p_under = float(fit.p_under(line))
    p_over_n = float(normal.p_over(line))
    p_under_n = 1.0 - p_over_n

    ev_over = ev_at_price(p_over, over_price)
    ev_under = ev_at_price(p_under, under_price)
    ev_over_n = ev_at_price(p_over_n, over_price)
    ev_under_n = ev_at_price(p_under_n, under_price)

    if ev_over >= ev_under:
        side, ev_best = "OVER", ev_over
    else:
        side, ev_best = "UNDER", ev_under
    if ev_over_n >= ev_under_n:
        side_n, ev_best_n = "OVER", ev_over_n
    else:
        side_n, ev_best_n = "UNDER", ev_under_n

    params_source = params.get("params_source") or (
        "outbox/props_ev_board_latest.json — the engine's prior board "
        "artifact, built from docs/props/research/2026-10-11/"
        "edge_sheet_pp_vs_dk_v2.csv (DraftKings distribution "
        "parameters); the sheet itself is not on any branch"
    )
    model = {
        "mu": mu,
        "sigma": sigma,
        "family": fit.family,
        "p_over": p_over,
        "p_under": p_under,
        "p_over_normal_basis": p_over_n,
        "params_source": params_source,
        "sheet_game": params.get("sheet_game"),
    }
    if params.get("sample") is not None:
        # Measured-parameter entries (props_model_side.py) carry the
        # sample their (mu, sigma) was estimated from; recovered sheet
        # parameters have no sample to carry.
        model["sample"] = params["sample"]
    comparison = {
        "fair_over_shin": fair_over,
        "model_minus_fair_over": p_over - fair_over,
        "side_by_family_ev": side,
        "ev_pct_family_basis": ev_best * 100.0,
        "side_by_normal_ev": side_n,
        "ev_pct_normal_basis": ev_best_n * 100.0,
        "families_agree_on_side": side == side_n,
        # The engine's falsifier: an edge that exists only under the
        # swapped family is a property of the swap, not of the market.
        "edge_survives_normal": bool(ev_best_n > 0),
    }
    return model, comparison, None


def build_board_rows(
    records: List[dict],
    registry: Dict[Tuple[str, str], Dict[str, object]],
    fetched_at: str,
    game_label: Optional[str] = None,
    missing_notes: Optional[Dict[Tuple[str, str], str]] = None,
) -> Tuple[List[dict], List[dict]]:
    """
    Join feed records to the model registry. Returns (rows_with_model,
    priced_only_rows). Pure: no network, no clock.

    `missing_notes` optionally overrides the priced-only reason per
    (player_lower, stat) — a caller whose registry comes from a different
    source than the recovered sheet (e.g. measured game-log distributions)
    states its own reasons; pairs it does not name keep NO_MODEL_NOTE.
    """
    with_model: List[dict] = []
    priced_only: List[dict] = []
    for rec in records:
        devig = rec["devig"]
        row: Dict[str, object] = {
            "player": rec["player"],
            "stat": rec["stat"],
            "stat_raw": rec.get("stat_raw"),
            "game": game_label,
            "line": rec["line"],
            "book": rec["book"],
            "over_price": rec["over_price"],
            "under_price": rec["under_price"],
            "fair_over": devig["shin"]["fair_over"],
            "fair_under": devig["shin"]["fair_under"],
            "fair_over_multiplicative": devig["multiplicative"]["fair_over"],
            "booksum": devig["booksum"],
            "shin_z": devig["shin"]["z"],
            "provenance": {
                "book": rec["book"],
                "source_id": PINNACLE_SOURCE_ID,
                "fetched_at": fetched_at,
                "game_matchup_id": rec["game_matchup_id"],
                "prop_matchup_id": rec["prop_matchup_id"],
                "market_status": rec.get("status"),
                "cutoff_at": rec.get("cutoff_at"),
            },
            "model": None,
            "comparison": None,
            "model_note": None,
        }
        key = (str(rec["player"]).strip().lower(), str(rec["stat"]).strip())
        params = registry.get(key)
        if params is None:
            row["model_note"] = (missing_notes or {}).get(key, NO_MODEL_NOTE)
            priced_only.append(row)
            continue
        model, comparison, note = _model_block(
            params, rec["stat"], float(rec["line"]),
            float(rec["over_price"]), float(rec["under_price"]),
            float(devig["shin"]["fair_over"]),
        )
        if model is None:
            row["model_note"] = note
            priced_only.append(row)
            continue
        row["model"] = model
        row["comparison"] = comparison
        with_model.append(row)

    with_model.sort(
        key=lambda r: float(r["comparison"]["ev_pct_family_basis"]),  # type: ignore[index]
        reverse=True,
    )
    for i, r in enumerate(with_model, start=1):
        r["ev_rank"] = i
    priced_only.sort(key=lambda r: (str(r["player"]), str(r["stat"])))
    return with_model, priced_only


def build_artifact(
    game_boards: List[Dict[str, object]],
    registry: Dict[Tuple[str, str], Dict[str, object]],
    fetched_at: str,
    model_board_path: Path = MODEL_BOARD_DEFAULT,
    missing_notes: Optional[Dict[Tuple[str, str], str]] = None,
    caveat: Optional[str] = None,
    model_provenance: Optional[Dict[str, object]] = None,
) -> Dict[str, object]:
    games: List[dict] = []
    n_priced = n_model = 0
    for gb in game_boards:
        teams = gb.get("teams") or []
        # " vs ", not " @ ": the feed's participant order is not asserted
        # to be away/home, and the label must not claim a direction the
        # source did not state.
        label = " vs ".join(str(t) for t in teams) if teams else None
        with_model, priced_only = build_board_rows(
            gb["records"], registry, fetched_at, game_label=label,  # type: ignore[arg-type]
            missing_notes=missing_notes,
        )
        n_priced += len(with_model) + len(priced_only)
        n_model += len(with_model)
        games.append(
            {
                "game_matchup_id": gb["game_matchup_id"],
                "teams": teams,
                "start_time": gb.get("start_time"),
                "specials_seen": gb.get("specials_seen"),
                "skipped_by_feed": gb.get("skipped"),
                "n_priced_rows": len(with_model) + len(priced_only),
                "n_rows_with_model": len(with_model),
                "n_priced_only": len(priced_only),
                "rows_with_model": with_model,
                "priced_only_rows": priced_only,
            }
        )
    if model_provenance is None:
        model_provenance = {
            "source": str(model_board_path.relative_to(REPO_ROOT))
            if model_board_path.is_relative_to(REPO_ROOT)
            else str(model_board_path),
            "recovered_pairs": len(registry),
            "note": (
                "(player, stat) -> (dk_mu, dk_sigma) recovered from the "
                "engine's prior board artifact; the underlying edge sheet "
                "is not on any branch"
            ),
        }
    return {
        "label": "DIAGNOSTIC",
        "is_pick": False,
        "is_edge_claim": False,
        "rvc_cleared": False,
        "caveat": CAVEAT if caveat is None else caveat,
        "generated_at": fetched_at,
        "provenance": {
            "prices": {
                "source_id": PINNACLE_SOURCE_ID,
                "book": "pinnacle",
                "matchups_endpoint": f"{API_BASE}/leagues/{{league_id}}/matchups",
                "markets_endpoint": f"{API_BASE}/matchups/{{game_id}}/markets/related/straight",
                "fetched_at": fetched_at,
                "devig": "intelligence/props/prop_discrepancy_engine.devig_two_way (Shin; multiplicative beside it)",
            },
            "model_distributions": model_provenance,
            "engine": {
                "module": "intelligence/props/props_live_board.py",
                "price_feed": "intelligence/props/pinnacle_prop_feed.py",
                "distributions": "intelligence/props/prop_discrepancy_engine.py (fit_for_stat, NormalFit)",
            },
        },
        "counts": {
            "priced_rows": n_priced,
            "rows_with_model": n_model,
            "priced_only_rows": n_priced - n_model,
        },
        "games": games,
    }


# ---------------------------------------------------------------------------
# CLI (the only network path, via the feed's fetchers)
# ---------------------------------------------------------------------------

def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--league", type=int, default=NFL_LEAGUE_ID)
    parser.add_argument("--game", type=int, default=None,
                        help="single game matchup id (default: all upcoming games)")
    parser.add_argument("--model-board", default=str(MODEL_BOARD_DEFAULT),
                        help="prior engine board artifact to recover model parameters from")
    parser.add_argument("--out", default=str(OUTBOX_JSON))
    args = parser.parse_args(argv)

    fetched_at = datetime.now(timezone.utc).isoformat()
    registry = load_model_registry(Path(args.model_board))

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
    for g in upcoming:
        gid = int(g["id"])
        markets = fetch_related_markets(gid)
        board = parse_prop_board(matchups, markets, gid)
        teams = [p.get("name") for p in g.get("participants") or []]
        game_boards.append(
            {"game_matchup_id": gid, "teams": teams,
             "start_time": g.get("startTime"), **board}
        )

    artifact = build_artifact(game_boards, registry, fetched_at, Path(args.model_board))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(artifact, indent=1), encoding="utf-8")

    c = artifact["counts"]
    print("DIAGNOSTIC live props board (residual-versus-close NOT cleared)")
    print(f"  model distributions recovered in-repo: {len(registry)}")
    for g in artifact["games"]:
        print(
            f"  {g['teams']} — priced rows: {g['n_priced_rows']}, "
            f"with model: {g['n_rows_with_model']}, priced-only: {g['n_priced_only']}"
        )
    print(
        f"  totals: {c['priced_rows']} priced / {c['rows_with_model']} with model / "
        f"{c['priced_only_rows']} priced-only"
    )
    print(f"  artifact: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
