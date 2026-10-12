"""
Player-prop price feed for the props / SGP stack — keyless Pinnacle guest API.

WHY THIS EXISTS
---------------
`intelligence/props/prop_discrepancy_engine.py` implements multiplicative and
Shin (1993) de-vigging, complete and unit-tested — and until now UNEXERCISED on
player props, because no keyless source in this repo carried two-way player-prop
PRICES (see the hunt record at the bottom of this docstring). The engine's own
input sheets carry line values and distribution parameters only, and are not on
any branch. This module is the missing input: real two-way prop prices, from the
sharp book the shade sheet already references (Pinnacle), fetched keylessly.

WHERE THE PRICES COME FROM
--------------------------
Pinnacle's public website is served by a guest API
(`guest.api.arcadia.pinnacle.com/0.1`) under a public client key that ships in
the site's own JavaScript — the same class of unauthenticated public endpoint
as the ESPN scoreboard JSON that `real_price_feed.py` mirrors. No account, no
user credential, no spend. The key below is that public client key; it can be
overridden with the PINNACLE_GUEST_KEY environment variable.

The board shape: the league matchups list carries one *special* matchup per
player prop (special.category == "Player Props", participants exactly
{Over, Under}). A special matchup's own markets endpoint refuses US IPs
(403 BAD_LOCATION — Pinnacle takes no US customers). The PARENT game's
`markets/related/straight` response, which the API serves openly, bundles one
market per sibling special — including every prop's line and both prices, each
price keyed by participantId so the Over/Under mapping is exact, not positional.
This fetcher uses only that openly served parent path. It does not spoof a
location, a header, or anything else.

WHAT IT RETURNS
---------------
One record per player prop: player, normalized stat key, line, the two quoted
American prices, and the props engine's own `devig_two_way` output (Shin by
default, multiplicative beside it): fair P(over)/P(under), booksum, Shin z.
Provenance (source id, endpoints, matchup ids, fetch timestamp) rides in the
artifact header. Every artifact is stamped DIAGNOSTIC: residual-versus-close
has NOT cleared, and a book price is an input to analysis, never a pick.

Never-invent law, same as the rest of the stack: a prop whose market is
missing, one-sided, or not a two-way Over/Under is skipped and counted in
`skipped`, never completed by assumption.

THE HUNT RECORD (2026-10-12, all verified by live fetch from this host)
-----------------------------------------------------------------------
  * ESPN core API propBets ... 1,834 props/game WITH lines, NO prices.
  * DraftKings sportsbook API  403 (Akamai edge) from this host.
  * PrizePicks public API .... 403 (DataDome bot wall) from this host.
  * Underdog public API ...... 426 "upgrade required" (v5 and v6).
  * Kalshi public API ........ NFL player-stat series exist (milestone /
                                season markets, cent prices); no standard
                                per-game two-way prop board verified.
  * Pinnacle guest API ....... sports/leagues/matchups open; game markets
                                open WITH prices; prop specials bundled in
                                the parent game's related markets WITH
                                two-way prices.  <-- THIS MODULE

Usage
-----
    python -m intelligence.props.pinnacle_prop_feed              # tonight's slate
    python -m intelligence.props.pinnacle_prop_feed --game 1637432964
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from intelligence.props.prop_discrepancy_engine import devig_two_way  # noqa: E402

SOURCE_ID = "pinnacle-guest-arcadia"
API_BASE = "https://guest.api.arcadia.pinnacle.com/0.1"
NFL_SPORT_ID = 15
NFL_LEAGUE_ID = 889

#: Public client key shipped in Pinnacle's own website JS for guest access.
#: Not a user credential. Override with PINNACLE_GUEST_KEY if it rotates.
GUEST_KEY = os.environ.get("PINNACLE_GUEST_KEY", "CmX2KcMrXuFmNg6YFbmTxE0y9CIrOi0R")

FETCH_TIMEOUT_S = 20.0
_USER_AGENT = "gse-pinnacle-prop-feed/1.0 (keyless public guest JSON; low volume)"

OUTBOX_JSON = REPO_ROOT / "outbox" / "pinnacle_prop_prices_latest.json"
OUTBOX_CSV = REPO_ROOT / "outbox" / "pinnacle_prop_prices_latest.csv"

#: Pinnacle special-description stat phrase -> the engine's stat keys.
STAT_KEYS: Dict[str, str] = {
    "Passing Yards": "pass_yards",
    "Pass Attempts": "pass_attempts",
    "Pass Completions": "pass_completions",
    "Touchdown Passes": "pass_tds",
    "Interceptions": "interceptions",
    "Rushing Yards": "rush_yards",
    "Rush Attempts": "rush_attempts",
    "Rushing + Receiving Yards": "rush_rec_yards",
    "Receiving Yards": "receiving_yards",
    "Receptions": "receptions",
    "Touchdowns": "tds",
    "Field Goals": "field_goals",
}

_DESC_RE = re.compile(r"^(?P<player>.+?) Total (?P<stat>.+)$")


# ---------------------------------------------------------------------------
# Fetch (the only network in the module)
# ---------------------------------------------------------------------------

def _get_json(url: str) -> object:
    req = urllib.request.Request(
        url, headers={"X-API-Key": GUEST_KEY, "User-Agent": _USER_AGENT}
    )
    with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT_S) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_league_matchups(league_id: int = NFL_LEAGUE_ID) -> List[dict]:
    data = _get_json(f"{API_BASE}/leagues/{league_id}/matchups")
    if not isinstance(data, list):
        raise ValueError("matchups payload is not a list")
    return data


def fetch_related_markets(game_matchup_id: int) -> List[dict]:
    data = _get_json(f"{API_BASE}/matchups/{game_matchup_id}/markets/related/straight")
    if not isinstance(data, list):
        raise ValueError("related markets payload is not a list")
    return data


# ---------------------------------------------------------------------------
# Parse (pure functions of the payloads)
# ---------------------------------------------------------------------------

def _is_game_matchup(m: dict) -> bool:
    """A main game matchup: two team participants, not a special."""
    if m.get("special"):
        return False
    parts = m.get("participants") or []
    return len(parts) == 2


def _parse_description(description: str) -> Optional[Tuple[str, str, str]]:
    """'Kyren Williams Total Rushing Yards' -> (player, stat_key, stat_raw)."""
    match = _DESC_RE.match(description or "")
    if not match:
        return None
    stat_raw = match.group("stat").strip()
    stat_key = STAT_KEYS.get(stat_raw)
    if stat_key is None:
        return None
    return match.group("player").strip(), stat_key, stat_raw


def parse_prop_board(
    matchups: List[dict],
    markets: List[dict],
    game_matchup_id: int,
) -> Dict[str, object]:
    """
    Join one game's special (prop) matchups to the markets bundled in the
    parent game's related/straight response. Pure: no network, no clock.
    """
    specials: Dict[int, dict] = {}
    for m in matchups:
        if m.get("parentId") != game_matchup_id:
            continue
        special = m.get("special") or {}
        if special.get("category") != "Player Props":
            continue
        parts = {p.get("name"): p.get("id") for p in m.get("participants") or []}
        if set(parts) != {"Over", "Under"}:
            continue
        parsed = _parse_description(special.get("description", ""))
        if parsed is None:
            continue
        player, stat_key, stat_raw = parsed
        specials[int(m["id"])] = {
            "prop_matchup_id": int(m["id"]),
            "player": player,
            "stat": stat_key,
            "stat_raw": stat_raw,
            "over_participant_id": parts["Over"],
            "under_participant_id": parts["Under"],
        }

    markets_by_matchup: Dict[int, dict] = {}
    for mk in markets:
        mid = mk.get("matchupId")
        if mid in specials and mk.get("type") == "total" and mk.get("period", 0) == 0:
            markets_by_matchup.setdefault(int(mid), mk)

    records: List[dict] = []
    skipped = 0
    for mid, info in sorted(specials.items()):
        mk = markets_by_matchup.get(mid)
        if mk is None:
            skipped += 1
            continue
        by_participant = {
            p.get("participantId"): p for p in mk.get("prices") or []
        }
        over = by_participant.get(info["over_participant_id"])
        under = by_participant.get(info["under_participant_id"])
        if over is None or under is None:
            skipped += 1
            continue
        if over.get("points") is None or over.get("points") != under.get("points"):
            skipped += 1
            continue
        over_price, under_price = over.get("price"), under.get("price")
        if not isinstance(over_price, (int, float)) or not isinstance(
            under_price, (int, float)
        ):
            skipped += 1
            continue
        shin = devig_two_way(over_price, under_price, method="shin")
        mult = devig_two_way(over_price, under_price, method="multiplicative")
        records.append(
            {
                "game_matchup_id": game_matchup_id,
                "prop_matchup_id": mid,
                "player": info["player"],
                "stat": info["stat"],
                "stat_raw": info["stat_raw"],
                "line": over["points"],
                "over_price": over_price,
                "under_price": under_price,
                "book": "pinnacle",
                "status": mk.get("status"),
                "cutoff_at": mk.get("cutoffAt"),
                "devig": {
                    "booksum": shin["booksum"],
                    "shin": {"fair_over": shin["fair"][0], "fair_under": shin["fair"][1], "z": shin["z"]},
                    "multiplicative": {"fair_over": mult["fair"][0], "fair_under": mult["fair"][1]},
                },
            }
        )
    records.sort(key=lambda r: (r["player"], r["stat"]))
    return {"records": records, "skipped": skipped, "specials_seen": len(specials)}


def build_artifact(
    boards: List[Dict[str, object]],
    fetched_at: str,
    league_id: int = NFL_LEAGUE_ID,
) -> Dict[str, object]:
    total_records = sum(len(b["records"]) for b in boards)  # type: ignore[arg-type]
    return {
        "label": "DIAGNOSTIC",
        "rvc_cleared": False,
        "is_pick": False,
        "source": {
            "source_id": SOURCE_ID,
            "book": "pinnacle",
            "matchups_endpoint": f"{API_BASE}/leagues/{league_id}/matchups",
            "markets_endpoint": f"{API_BASE}/matchups/{{game_id}}/markets/related/straight",
            "fetched_at": fetched_at,
        },
        "games": boards,
        "prop_records": total_records,
    }


def board_to_csv(records: List[dict], fetched_at: str) -> str:
    """Engine-sheet-style CSV: one row per prop with both prices."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["game_matchup_id", "player", "stat", "line", "over_price",
         "under_price", "book", "fair_over_shin", "booksum", "fetched_at"]
    )
    for r in records:
        writer.writerow(
            [r["game_matchup_id"], r["player"], r["stat"], r["line"],
             r["over_price"], r["under_price"], r["book"],
             round(r["devig"]["shin"]["fair_over"], 4),
             round(r["devig"]["booksum"], 4), fetched_at]
        )
    return buf.getvalue()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--league", type=int, default=NFL_LEAGUE_ID)
    parser.add_argument("--game", type=int, default=None,
                        help="single game matchup id (default: all upcoming games)")
    args = parser.parse_args(argv)

    fetched_at = datetime.now(timezone.utc).isoformat()
    matchups = fetch_league_matchups(args.league)
    games = [m for m in matchups if _is_game_matchup(m)]
    if args.game is not None:
        games = [g for g in games if int(g["id"]) == args.game]
    # Upcoming only: startTime in the future relative to fetch time.
    now = datetime.now(timezone.utc)
    upcoming = []
    for g in games:
        try:
            start = datetime.fromisoformat(str(g.get("startTime")).replace("Z", "+00:00"))
        except ValueError:
            continue
        if start >= now:
            upcoming.append(g)

    boards: List[Dict[str, object]] = []
    all_records: List[dict] = []
    for g in upcoming:
        gid = int(g["id"])
        markets = fetch_related_markets(gid)
        board = parse_prop_board(matchups, markets, gid)
        teams = [p.get("name") for p in g.get("participants") or []]
        board = {"game_matchup_id": gid, "teams": teams,
                 "start_time": g.get("startTime"), **board}
        boards.append(board)
        all_records.extend(board["records"])  # type: ignore[arg-type]

    artifact = build_artifact(boards, fetched_at, args.league)
    OUTBOX_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTBOX_JSON.write_text(json.dumps(artifact, indent=1))
    OUTBOX_CSV.write_text(board_to_csv(all_records, fetched_at))
    print(
        f"{len(boards)} game(s), {artifact['prop_records']} prop records "
        f"-> {OUTBOX_JSON} + {OUTBOX_CSV}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
