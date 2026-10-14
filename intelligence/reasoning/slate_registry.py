"""Slate registry — the feed-to-game map, harvested from LineStar's own payload.

WHY THIS EXISTS
---------------
The reasoning layer was emitting analyst cards for matchups that do not exist
on the real slate. "DAL@PHI" for Week 6, 2026 was fabricated: the actual Week 6
slate has CAR@PHI and DAL@GB. A card for a phantom fixture "looks good while
wrong" — the single worst failure mode in this repo. This module is the
authority that makes that impossible: it resolves a requested matchup against
the harvested slate and REFUSES with the real opponents named.

WHERE THE DATA COMES FROM
-------------------------
LineStar's anonymous DraftKings API, endpoint GetSalariesV5?periodId=<week>.
The response embeds SalaryContainerJson.Games[], which carries, for EVERY game
in that NFL week: GameId, away/home team + teamId, kickoff UTC, and the full
Vegas line — spread, moneyline both sides, and total — plus a weather slot.

Harvested 2026-10-13: 94 periods (Week 1 2022 -> Week 6 2026, incl. playoff
rounds), 1,268 games. Artifact:
  docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json

WHAT IT GIVES THE ENGINE
------------------------
1. FIXTURE CONFIRMATION. `resolve_fixture(week, away, home)` returns the real
   game or None. No more phantom cards.
2. MARKET PRIORS, EVERY GAME. `fair_probabilities(game)` de-vigs the moneyline
   into an overround-free home/away probability — Layer 1 for any game, not
   just the ones with a Kalshi listing.
3. THE HISTORICAL BACKTEST SET. 1,268 games of market-implied probabilities is
   the calibration ground truth the L1-L5 weighting needs (P3): score the
   engine's posterior against the de-vigged market across every game where a
   line exists.

HONEST LIMITS
-------------
- One sportsbook's line (DraftKings), not a consensus; the vig is real, so the
  de-vig is a MODEL of the fair price, not the fair price.
- Moneyline only for the moneyline de-vig; spread/total are carried verbatim
  and are NOT yet converted to probabilities here.
- The archive covers weeks whose salaries were published; a week with no line
  on a game (null ml) yields no prior rather than a guess.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
ARCHIVE = REPO / "docs" / "data-sources" / "research" / "2026-10-13" / "linestar" / "linestar_slates_by_period.json"

_cache: dict[str, Any] | None = None


def _load() -> dict[str, Any]:
    global _cache
    if _cache is None:
        try:
            _cache = json.loads(ARCHIVE.read_text(encoding="utf-8"))
        except Exception:
            _cache = {}
    return _cache


def weeks() -> list[dict[str, Any]]:
    """Every harvested week, newest first."""
    store = _load()
    out = []
    for pid, v in store.items():
        if "games" in v:
            out.append({"periodId": int(pid), "name": v.get("name"),
                        "start": v.get("start"), "games": v.get("n_games")})
    return sorted(out, key=lambda w: -w["periodId"])


def week(period_id: int) -> dict[str, Any] | None:
    return _load().get(str(period_id))


def games_in_week(period_id: int) -> list[dict[str, Any]]:
    w = week(period_id)
    return (w or {}).get("games") or []


def resolve_fixture(period_id: int, away: str, home: str) -> dict[str, Any] | None:
    """The game dict if `away @ home` is really on that week's slate, else None."""
    a, h = away.upper().strip(), home.upper().strip()
    for gm in games_in_week(period_id):
        if {gm.get("away", "").upper(), gm.get("home", "").upper()} == {a, h}:
            return gm
    return None


def opponent_of(period_id: int, team: str) -> str | None:
    """Who `team` actually plays in this week (the honest answer to a wrong ask)."""
    t = team.upper().strip()
    for gm in games_in_week(period_id):
        if gm.get("away", "").upper() == t:
            return gm.get("home", "").upper()
        if gm.get("home", "").upper() == t:
            return gm.get("away", "").upper()
    return None


def _ml_to_prob(ml: Any) -> float | None:
    try:
        ml = float(ml)
    except (TypeError, ValueError):
        return None
    if ml == 0:
        return None
    return 100.0 / (ml + 100.0) if ml > 0 else abs(ml) / (abs(ml) + 100.0)


def fair_probabilities(game: dict[str, Any]) -> dict[str, Any]:
    """De-vig the moneyline. Returns named gaps instead of guessing."""
    pa, ph = _ml_to_prob(game.get("ml_away")), _ml_to_prob(game.get("ml_home"))
    if pa is None or ph is None:
        return {
            "ok": False,
            "gap": f"no moneyline for {game.get('matchup')} "
                   f"(away {game.get('ml_away')}, home {game.get('ml_home')})",
        }
    s = pa + ph
    return {
        "ok": True,
        "matchup": game.get("matchup"),
        "gameId": game.get("gameId"),
        "fair_away": round(pa / s, 4),
        "fair_home": round(ph / s, 4),
        "overround": round(s - 1, 4),
        "spread": {"away": game.get("spread_away"), "home": game.get("spread_home")},
        "total": game.get("total"),
        "source": "LineStar/DraftKings moneyline, de-vigged",
    }


def week_market_board(period_id: int) -> list[dict[str, Any]]:
    """Every game in the week with its de-vigged fair probabilities."""
    return [fair_probabilities(gm) for gm in games_in_week(period_id)]


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser(description="Slate registry CLI")
    ap.add_argument("--week", type=int, default=None)
    ap.add_argument("--team", type=str, default=None, help="print who this team plays")
    ap.add_argument("--list", action="store_true")
    args = ap.parse_args()

    if args.list:
        for w in weeks()[:20]:
            print(f"  {w['periodId']}  {w['name']:<20} {w['games']} games  start {str(w['start'])[:19]}")
        return 0

    pid = args.week or weeks()[0]["periodId"]
    if args.team:
        opp = opponent_of(pid, args.team)
        gm = next((g for g in games_in_week(pid) if args.team.upper() in (g.get("away"), g.get("home"))), None)
        print(f"{args.team} plays {opp} in {week(pid).get('name')}")
        if gm:
            print(" ", json.dumps(fair_probabilities(gm), indent=1))
        return 0

    print(f"{week(pid).get('name')} (period {pid}) — {len(games_in_week(pid))} games")
    for row in week_market_board(pid):
        if row.get("ok"):
            print(f"  {row['matchup']:<18} fair {row['fair_away']:.4f}/{row['fair_home']:.4f} "
                  f"| total {row['total']} | spread {row['spread']['away']}/{row['spread']['home']} "
                  f"| overround {row['overround']:.4f}")
        else:
            print(f"  {row['gap']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
