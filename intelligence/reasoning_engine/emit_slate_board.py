"""Slate-level ranked boards: every game on the week's ESPN slate, one call.

Run the two-layer engine per game (Layer 1: ESPN inline de-vigged odds;
Layer 2: ingested signals via bayes.update) and emit one ranked-board document
for the whole slate. This is the default board the doctrine demands: every
game reasoned, every game ranked, withhold/pass as mint actions only.

Usage:
    python intelligence/reasoning_engine/emit_slate_board.py \
        --out intelligence/reasoning_engine/traces/slate-board-<date>.json

Per game, failures degrade to named gaps - a slate never collapses because one
game could not fetch odds or facets.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
INTELLIGENCE = HERE.parent
sys.path.insert(0, str(INTELLIGENCE))
sys.path.insert(0, str(INTELLIGENCE / "qb-behavior" / "src"))

from reasoning import market_priors as mp  # noqa: E402
from reasoning.bayes import update  # noqa: E402
from reasoning.signals import MarketPrior  # noqa: E402
from reasoning_engine.run_game import reason_game  # noqa: E402


def _team_from_name(name: str, side: str) -> str:
    """'Dallas Cowboys at Philadelphia Eagles' -> ('DAL','PHI')-ish keys."""
    part = name.split(side)[0] if side in name else name
    return part.strip()


def slate_games(sport: str = "football/nfl", date_param: str = "") -> list[dict]:
    """(away, home, espn_name, odds_row) per event with odds, else None odds."""
    payload = None
    for base in mp.BASES:
        try:
            payload = mp._fetch(base.format(sport=sport) + date_param)
            break
        except Exception:
            continue
    if payload is None:
        raise RuntimeError("ESPN scoreboard unreachable")
    games: list[dict] = []
    for ev in payload.get("events", []):
        comps = ev.get("competitions", []) or []
        if not comps:
            continue
        comp = comps[0]
        o = (comp.get("odds") or [None])[0]
        competitors = comp.get("competitors") or []
        away = home = ""
        for c in competitors:
            if c.get("homeAway") == "home":
                home = (c.get("team") or {}).get("abbreviation") or ""
            else:
                away = (c.get("team") or {}).get("abbreviation") or ""
        games.append({"espn_name": ev.get("name") or "", "away": away, "home": home, "odds": o})
    return games


def priors_for_game(odds: dict | None, away: str, home: str) -> tuple[list[MarketPrior], list[str]]:
    gaps: list[str] = []
    if not odds:
        return [], ["market priors: no odds row on the slate event"]
    ml = odds.get("moneyline") or {}

    def _amer(obj: dict):
        for k in ("close", "open", "current"):
            raw = (obj.get(k) or {}).get("odds")
            if raw in (None, ""):
                continue
            try:
                return float(raw)
            except (TypeError, ValueError):
                continue
        return None

    h, a = _amer(ml.get("home") or {}), _amer(ml.get("away") or {})
    if not (h and a):
        return [], ["market priors: odds row lacks moneyline prices"]
    try:
        fa, fb, s = mp.devig_two_way(h, a)
    except ValueError as exc:
        return [], [f"market priors: de-vig failed ({exc})"]
    src = (odds.get("provider") or {}).get("name") or "espn-inline"
    return (
        [
            MarketPrior(hypothesis=f"{away}@{home} home win", prior=fa,
                        source=f"espn-inline {src} {h:+.0f}/{a:+.0f} de-vig", note=f"booksum {s:.4f}"),
            MarketPrior(hypothesis=f"{away}@{home} away win", prior=fb,
                        source=f"espn-inline {src} {h:+.0f}/{a:+.0f} de-vig", note=f"booksum {s:.4f}"),
        ],
        gaps,
    )


def run_slate(sport: str = "football/nfl", date_param: str = "") -> dict:
    games = slate_games(sport, date_param)
    now = datetime.now(timezone.utc).isoformat()
    out_games = []
    for g in games:
        priors, pgaps = priors_for_game(g["odds"], g["away"], g["home"])
        doc = reason_game(home=g["home"] or "?", away=g["away"] or "?", market_priors=priors or None)
        doc["gaps"].extend(pgaps)
        out_games.append(doc)
    return {
        "generated_utc": now,
        "sport": sport,
        "games_requested": len(games),
        "games": out_games,
        "note": "every game reasoned and ranked; withhold/pass are mint actions on the board, never silence",
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sport", default="football/nfl")
    ap.add_argument("--date", default="", help="YYYYMMDD slate date param for ESPN")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    date_param = f"?dates={args.date}" if args.date else ""
    board = run_slate(args.sport, date_param)
    out_path = args.out or str(HERE / "traces" / f"slate-board-{datetime.now(timezone.utc).date().isoformat()}.json")
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(board, f, indent=1, default=str)
    ranked = 0
    posterior = 0
    for g in board["games"]:
        rb = g.get("ranked_board") or {}
        if rb.get("candidates"):
            ranked += 1
        if rb.get("bayes_updates"):
            posterior += 1
    print(f"games: {board['games_requested']} | boards emitted: {ranked} | with posteriors: {posterior} -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
