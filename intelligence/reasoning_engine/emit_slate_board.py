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

try:
    from reasoning.analyst import emit_card  # the analyst layer (Move 1)
except Exception:  # analyst is additive; never block the board over it
    emit_card = None


def _team_from_name(name: str, side: str) -> str:
    """'Dallas Cowboys at Philadelphia Eagles' -> ('DAL','PHI')-ish keys."""
    part = name.split(side)[0] if side in name else name
    return part.strip()


def _nfl_week_to_period(week: int) -> int:
    """NFL week number -> LineStar periodId (the analyst's --week contract).

    The slate registry is keyed by periodId (412 = week 6, 2026). emit_card's
    fixture guard resolves through that registry, so an unmapped week number
    (6) finds no period 6, refuses every real fixture, and stamps REFUSED on
    all cards. Resolution: exact periodId hit wins; else the registry week
    whose `name` carries 'Week <n>'; else the week passes through unchanged
    and the caller's fixture guard degrades to a named gap, not a crash.
    """
    try:
        from reasoning.slate_registry import weeks as _weeks
    except Exception:
        try:
            from slate_registry import weeks as _weeks  # type: ignore
        except Exception:
            return week
    ws = _weeks() or []
    for w in ws:
        if w.get("periodId") == week:
            return week  # already a periodId
    for w in ws:
        name = str(w.get("name") or "").lower()
        if name.startswith(f"week {week}") or name.startswith(f"Week {week}".lower()):
            try:
                return int(w["periodId"])
            except (KeyError, TypeError, ValueError):
                continue
    return week


def slate_games(sport: str = "football/nfl", query: str = "") -> tuple[list[dict], int, int, list[str]]:
    """(games, week, season, byes) — games is (away, home, espn_name, odds_row) per event.

    `query` is a raw ESPN scoreboard query string. Two forms matter:
      * "?week=N&seasontype=2"  -> the FULL week slate (all Thu-Mon games) and the
        payload carries `season` + `week.teamsOnBye`.
      * "?dates=YYYYMMDD"       -> only the games on that date, and the payload has
        NO `season` key at all, so the season must be supplied or it comes back 0.

    The slate's week/season travel with the games. reason_game() defaults to
    week=4, so leaving this unstamped made the board reason a week-4 team state
    (epa_facets before_week=4, ol_state week 4) against whatever slate ESPN
    actually served, and stamped every game_id "w4" regardless of the real week.
    """
    payload = None
    for base in mp.BASES:
        try:
            payload = mp._fetch(base.format(sport=sport) + query)
            break
        except Exception:
            continue
    if payload is None:
        raise RuntimeError("ESPN scoreboard unreachable")
    week = int(((payload.get("week") or {}).get("number")) or 0)
    season = int(((payload.get("season") or {}).get("year")) or 0)
    byes = [
        t.get("abbreviation") or ""
        for t in ((payload.get("week") or {}).get("teamsOnBye") or [])
    ]
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
    return games, week, season, byes


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


def run_slate(sport: str = "football/nfl", query: str = "", week: int | None = None,
              season: int | None = None) -> dict:
    games, slate_week, slate_season, byes = slate_games(sport, query)
    # reason_game() defaults to week=4; stamp the slate's real week so the Layer 2
    # facets (epa_facets before_week, ol_state) line up with the Layer 1 odds.
    wk = int(week) if week else slate_week
    # "?dates=" payloads carry no `season` key, so fall back explicitly and say so
    # on the board rather than silently reasoning a season 0.
    gaps: list[str] = []
    if season:
        sn = int(season)
    elif slate_season:
        sn = slate_season
    else:
        sn = 2026
        gaps.append("season: not carried by the ESPN payload; defaulted to 2026")
    now = datetime.now(timezone.utc).isoformat()
    out_games = []
    cards = 0
    for g in games:
        priors, pgaps = priors_for_game(g["odds"], g["away"], g["home"])
        doc = reason_game(home=g["home"] or "?", away=g["away"] or "?", week=wk, season=sn,
                          market_priors=priors or None)
        # The per-game doc comes from reason_game() and carries only game_id, so a
        # consumer reading the board could not name the teams without parsing the id.
        # Stamp the slate's own away/home back onto the record - the board is the
        # product surface and it should be self-describing.
        doc["away"] = g["away"] or "?"
        doc["home"] = g["home"] or "?"
        doc["matchup"] = f"{g['away'] or '?'}@{g['home'] or '?'}"
        doc["gaps"].extend(pgaps)
        # Move 1: every game gets an analyst card alongside the ranked board.
        # emit_card's --week contract is a LineStar periodId (412 = week 6),
        # NOT the NFL week number. Passing the raw week (wk) makes the
        # fixture guard look up "period 6" in a registry keyed 407..412,
        # refuse every real game, and stamp all 14 cards REFUSED. Map first.
        if emit_card is not None and g["home"] and g["away"] and g["home"] != "?" and g["away"] != "?":
            try:
                period_id = _nfl_week_to_period(wk)
                card_path, card_meta = emit_card(g["home"], g["away"],
                                                 date=datetime.now(timezone.utc).date().isoformat(),
                                                 week=period_id)
                doc["analyst_card"] = {"path": str(card_path), "thesis": card_meta["thesis"],
                                       "conviction": card_meta["conviction"],
                                       "domains": card_meta["domains"], "facts": card_meta["facts"]}
                cards += 1
            except Exception as exc:
                doc["gaps"].append(f"analyst card: failed ({type(exc).__name__}: {exc})")
        out_games.append(doc)
    return {
        "generated_utc": now,
        "sport": sport,
        "week": wk,
        "season": sn,
        "byes": [b for b in byes if b],
        "games_requested": len(games),
        "cards_emitted": cards,
        "games": out_games,
        "gaps": gaps,
        "note": "every game reasoned and ranked; withhold/pass are mint actions on the board, never silence",
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sport", default="football/nfl")
    ap.add_argument("--date", default="", help="YYYYMMDD slate date param for ESPN (one day only)")
    ap.add_argument("--week", type=int, default=None,
                    help="week number. Without --date this ALSO drives the fetch "
                         "(?week=N&seasontype=2 -> the full week slate + byes); "
                         "with --date it only stamps the week")
    ap.add_argument("--season", type=int, default=None,
                    help="force the season (default: read from the ESPN payload)")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    if args.date:
        query = f"?dates={args.date}"
    elif args.week:
        query = f"?week={args.week}&seasontype=2"
    else:
        query = ""
    board = run_slate(args.sport, query, week=args.week, season=args.season)
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
    print(f"games: {board['games_requested']} | boards: {ranked} | cards: {board.get('cards_emitted', 0)} | posteriors: {posterior} -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
