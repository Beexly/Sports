#!/usr/bin/env python3
"""
scripts/ops/build_week10_game_boards.py

Generate the per-game DraftKings 360 matchup boards (schema
gse_360_matchup_board_v1) that the connected workflow's Stage 0/Stage 5 consume,
for every remaining Week 10 game. Source: ESPN Core API provider-100 (DraftKings)
propBets — the same keyless path refresh_live_dk_odds_and_props.py uses (bypasses
the direct DK IP block). Athlete -> team resolved via the ESPN athlete + teams API.

Output: data/engine/week10_{away}_{home}_dk_full_board_2026_11_06.json
Props match the verified NE@DET board: {athlete, team, position, market, line,
open_line, has_price}. has_price reflects whether DK over/under juice is present.

Resume-safe: skips games that already have a board unless --force.
Fail-closed: a game with zero fetched props is recorded as failed (exit 1).
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RE_AMERICAN_ODDS = re.compile(r"^[+-]?\d{3,4}$")
BOVADA_COUPON_URL = "https://www.bovada.lv/services/sports/event/coupon/events/A/description/football/nfl?marketFilterId=def&preMatchOnly=true&lang=en"
BOVADA_EVENT_V2_PREFIX = "https://www.bovada.lv/services/sports/event/v2/events/A/description"
BOVADA_TEAM_NORM = {"LA": "LAR", "WAS": "WSH"}
BOVADA_MARKET_MAP = {
    "total passing yards": "Total Passing Yards (incl. overtime)",
    "total completions": "Total Pass Completions (incl. overtime)",
    "total pass completions": "Total Pass Completions (incl. overtime)",
    "total passing attempts": "Total Passing Attempts (incl. overtime)",
    "total passing touchdowns": "Total Passing Touchdowns (incl. overtime)",
    "total interceptions thrown": "Total Passing Interceptions (incl. overtime)",
    "total passing interceptions": "Total Passing Interceptions (incl. overtime)",
    "total rushing yards": "Total Rushing Yards (incl. overtime)",
    "total rush attempts": "Total Carries (incl. overtime)",
    "total carries": "Total Carries (incl. overtime)",
    "total receiving yards": "Total Receiving Yards (incl. overtime)",
    "total receptions": "Total Receptions (incl. overtime)",
    "total rushing & receiving yards": "Total Rushing Plus Receiving Yards (incl. overtime)",
    "total rushing and receiving yards": "Total Rushing Plus Receiving Yards (incl. overtime)",
    "total rushing plus receiving yards": "Total Rushing Plus Receiving Yards (incl. overtime)",
    "total field goals made": "Total Field Goals Made (incl. overtime)",
    "total kicking points": "Total Kicking Points (incl. overtime)",
    "total extra points made": "Total Extra Points Made (incl. overtime)",
    "total tackles & assists": "Total Tackles Plus Assists (incl. overtime)",
    "total tackles + assists": "Total Tackles Plus Assists (incl. overtime)",
    "total tackles plus assists": "Total Tackles Plus Assists (incl. overtime)",
}


def _match_key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", _norm_name(name))


def _american_implied(am: int) -> float:
    return (-am / (-am + 100.0)) if am < 0 else (100.0 / (am + 100.0))


def _choose_bovada_rung(rungs: dict[float, dict[str, int]], prefer_line: float | None = None) -> tuple[float, int, int] | None:
    if not rungs:
        return None
    if prefer_line is not None:
        for h, ou in rungs.items():
            if abs(h - prefer_line) <= 0.05 and "O" in ou and "U" in ou:
                return h, ou["O"], ou["U"]
    best_h = None
    best_dist = 999.0
    for h, ou in rungs.items():
        if "O" not in ou or "U" not in ou:
            continue
        po = _american_implied(ou["O"])
        pu = _american_implied(ou["U"])
        p_fair = po / max(po + pu, 1e-9)
        dist = abs(p_fair - 0.50)
        if dist < best_dist:
            best_dist = dist
            best_h = h
    if best_h is None:
        return None
    return best_h, rungs[best_h]["O"], rungs[best_h]["U"]


def fetch_bovada_coupon_index() -> list[dict]:
    try:
        d = fetch_json(BOVADA_COUPON_URL, timeout=20)
        events: list[dict] = []
        for grp in d if isinstance(d, list) else []:
            events.extend(grp.get("events") or [])
        return events
    except Exception as e:
        print(f"  [WARN] Bovada coupon fetch failed: {e}", flush=True)
        return []


def fetch_bovada_event_props(bovada_link: str) -> dict[tuple[str, str], dict]:
    """Fetch genuine two-sided Over/Under prop rungs from Bovada v2 API."""
    if not bovada_link:
        return {}
    url = f"{BOVADA_EVENT_V2_PREFIX}{bovada_link}?lang=en"
    try:
        arr = fetch_json(url, timeout=20)
    except Exception as e:
        print(f"  [WARN] Bovada event fetch failed ({bovada_link}): {e}", flush=True)
        return {}
    out: dict[tuple[str, str], dict] = {}
    for item in arr if isinstance(arr, list) else []:
        for ev in (item.get("events") or [item]):
            for dg in (ev.get("displayGroups") or []):
                for m in (dg.get("markets") or []):
                    if m.get("key") != "2W-OU":
                        continue
                    per = ((m.get("period") or {}).get("abbreviation") or "").upper()
                    if per != "G":
                        continue
                    desc = str(m.get("description") or "").strip()
                    mt = re.match(r"^(.*?)\s+-\s+(.+?)\s*\(([A-Z]{2,4})\)\s*$", desc)
                    if not mt:
                        continue
                    prefix = re.sub(r"\s+o/u$", "", mt.group(1).strip().lower()).strip()
                    canon_mkt = BOVADA_MARKET_MAP.get(prefix)
                    if not canon_mkt:
                        continue
                    ath_name = mt.group(2).strip()
                    tm_raw = mt.group(3).strip().upper()
                    tm = BOVADA_TEAM_NORM.get(tm_raw, tm_raw)
                    rungs: dict[float, dict[str, int]] = {}
                    for o in (m.get("outcomes") or []):
                        side = str(o.get("type") or "").upper()
                        if side not in ("O", "U"):
                            continue
                        price = o.get("price") or {}
                        h_raw = price.get("handicap")
                        am = _parse_american_odds(price.get("american"))
                        if h_raw is None or am is None:
                            continue
                        try:
                            h_val = float(h_raw)
                        except (TypeError, ValueError):
                            continue
                        rungs.setdefault(h_val, {})[side] = am
                    valid_rungs = {h: ou for h, ou in rungs.items() if "O" in ou and "U" in ou}
                    if not valid_rungs:
                        continue
                    key = (_match_key(ath_name), canon_mkt)
                    existing = out.get(key)
                    if existing is None:
                        out[key] = {"athlete": ath_name, "team": tm, "rungs": valid_rungs}
                    else:
                        existing["rungs"].update(valid_rungs)
    return out


def _parse_american_odds(raw: object) -> int | None:
    """Parse genuine two-sided American odds without inventing synthetic juice."""
    if raw is None or isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        val = int(round(raw))
        return val if abs(val) >= 100 else None
    text = str(raw).strip().upper()
    if not text:
        return None
    if text in {"EVEN", "EV"}:
        return 100
    if RE_AMERICAN_ODDS.match(text):
        val = int(text)
        return val if abs(val) >= 100 else None
    return None

REPO_ROOT = Path(__file__).resolve().parents[2]
WEEK = 10
BOARD_DATE_SUFFIX = "2026_11_06"
UA = {"User-Agent": "Mozilla/5.0"}

# The 14 full-game markets present on the verified NE@DET board.
BOARD_MARKETS = (
    "Total Passing Yards (incl. overtime)",
    "Total Pass Completions (incl. overtime)",
    "Total Passing Attempts (incl. overtime)",
    "Total Passing Touchdowns (incl. overtime)",
    "Total Passing Interceptions (incl. overtime)",
    "Total Rushing Yards (incl. overtime)",
    "Total Carries (incl. overtime)",
    "Total Receiving Yards (incl. overtime)",
    "Total Receptions (incl. overtime)",
    "Total Rushing Plus Receiving Yards (incl. overtime)",
    "Total Field Goals Made (incl. overtime)",
    "Total Kicking Points (incl. overtime)",
    "Total Extra Points Made (incl. overtime)",
    "Total Tackles Plus Assists (incl. overtime)",
)


def fetch_json(url: str, timeout: int = 20):
    req = urllib.request.Request(url, headers=UA)
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8"))


def _norm_name(name: str) -> str:
    n = str(name).strip().lower()
    for suf in (" jr.", " sr.", " iii", " ii"):
        n = n.replace(suf, "")
    return n.replace(".", "").replace("'", "").strip()


def stage0_excluded() -> set[str]:
    """Authoritative Stage-0 exclusion set (require_week), normalized."""
    sys.path.insert(0, str(REPO_ROOT))
    from scripts.ops.preflight_live_roster_injury_gate import require_week
    cfg = require_week(WEEK)
    out: set[str] = set()
    for ep in cfg.get("excluded_players", []):
        nm = ep.get("name") if isinstance(ep, dict) else str(ep)
        if nm:
            out.add(_norm_name(nm))
    return out


def team_id_map() -> dict[str, str]:
    d = fetch_json("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=50")
    out = {}
    for grp in d.get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", []):
        t = grp.get("team", {})
        out[str(t.get("id"))] = t.get("abbreviation", "")
    return out


def athlete_info(ref: str, tid_map: dict[str, str]) -> dict:
    try:
        d = fetch_json(ref, timeout=15)
        team_ref = (d.get("team") or {}).get("$ref", "")
        team_id = team_ref.rstrip("/").split("/")[-1].split("?")[0] if team_ref else ""
        return {
            "name": d.get("displayName") or d.get("fullName") or "Unknown",
            "position": (d.get("position") or {}).get("abbreviation", ""),
            "team": tid_map.get(team_id, ""),
        }
    except Exception:
        return {"name": "Unknown", "position": "", "team": ""}


def fetch_event_propbets(ev_id: str) -> list[dict]:
    items: list[dict] = []
    page = 1
    while True:
        url = (f"https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{ev_id}"
               f"/competitions/{ev_id}/odds/100/propBets?limit=1000&page={page}")
        try:
            d = fetch_json(url, timeout=25)
        except Exception as e:
            if page == 1:
                print(f"  [WARN] no propBets for {ev_id}: {e}", flush=True)
            break
        batch = d.get("items", [])
        items.extend(batch)
        if page >= d.get("pageCount", 1) or not batch:
            break
        page += 1
    return items


def _infer_pos_for_market(mkt: str) -> str:
    low = mkt.lower()
    if "passing" in low or "completions" in low or "interceptions" in low:
        return "QB"
    if "rushing" in low or "carries" in low:
        return "RB"
    if "field goals" in low or "kicking" in low or "extra points" in low:
        return "PK"
    if "tackles" in low:
        return "LB"
    return "WR"


def build_board(
    ev_id: str,
    away: str,
    home: str,
    tid_map: dict[str, str],
    excluded: set[str],
    bovada_link: str = "",
) -> dict:
    raw = fetch_event_propbets(ev_id)
    bovada_props = fetch_bovada_event_props(bovada_link)
    by_key: dict[tuple, dict] = {}
    refs: set[str] = set()
    all_markets: set[str] = set()
    for it in raw:
        t_name = (it.get("type") or {}).get("name", "")
        all_markets.add(t_name)
        if t_name not in BOARD_MARKETS:
            continue
        ref = (it.get("athlete") or {}).get("$ref", "")
        cur = it.get("current") or {}
        target = (cur.get("target") or {}).get("value")
        if not ref or target is None:
            continue
        refs.add(ref)
        over = (cur.get("over") or {}).get("alternateDisplayValue")
        under = (cur.get("under") or {}).get("alternateDisplayValue")
        over_am = _parse_american_odds(over)
        under_am = _parse_american_odds(under)
        key = (ref, t_name)
        if key not in by_key:
            by_key[key] = {
                "ref": ref, "market": t_name, "line": float(target),
                "open_line": float(((it.get("open") or {}).get("target") or {}).get("value") or target),
                "has_price": bool(over_am is not None and under_am is not None),
                "over_american": over_am,
                "under_american": under_am,
                "price_source": "ESPN DraftKings" if (over_am is not None and under_am is not None) else None,
            }
    info: dict[str, dict] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        futs = {pool.submit(athlete_info, r, tid_map): r for r in refs}
        for f in concurrent.futures.as_completed(futs):
            info[futs[f]] = f.result()
    pos_by_match = {_match_key(v["name"]): v["position"] for v in info.values() if v.get("position")}
    matched_bovada_keys: set[tuple[str, str]] = set()
    props = []
    for (ref, t_name), v in by_key.items():
        a = info.get(ref, {"name": "Unknown", "position": "", "team": ""})
        if a["team"] not in (away, home):
            continue
        if _norm_name(a["name"]) in excluded:
            continue
        line_val = v["line"]
        open_val = v["open_line"]
        over_am = v["over_american"]
        under_am = v["under_american"]
        has_price = v["has_price"]
        price_source = v["price_source"]
        if not has_price:
            b_key = (_match_key(a["name"]), t_name)
            b_entry = bovada_props.get(b_key)
            if b_entry:
                chosen = _choose_bovada_rung(b_entry["rungs"], prefer_line=line_val)
                if chosen is not None:
                    b_line, b_over, b_under = chosen
                    line_val = float(b_line)
                    over_am = int(b_over)
                    under_am = int(b_under)
                    has_price = True
                    price_source = "Bovada Live v2 Two-Sided"
                    matched_bovada_keys.add(b_key)
        props.append({
            "athlete": a["name"], "team": a["team"], "position": a["position"],
            "market": t_name, "line": line_val, "open_line": open_val,
            "has_price": has_price,
            "over_american": over_am,
            "under_american": under_am,
            **({"price_source": price_source} if price_source else {}),
        })
    for b_key, b_entry in bovada_props.items():
        if b_key in matched_bovada_keys:
            continue
        if b_entry["team"] not in (away, home):
            continue
        if _norm_name(b_entry["athlete"]) in excluded:
            continue
        chosen = _choose_bovada_rung(b_entry["rungs"], prefer_line=None)
        if chosen is None:
            continue
        b_line, b_over, b_under = chosen
        canon_mkt = b_key[1]
        all_markets.add(canon_mkt)
        props.append({
            "athlete": b_entry["athlete"],
            "team": b_entry["team"],
            "position": pos_by_match.get(b_key[0]) or _infer_pos_for_market(canon_mkt),
            "market": canon_mkt,
            "line": float(b_line),
            "open_line": float(b_line),
            "has_price": True,
            "over_american": int(b_over),
            "under_american": int(b_under),
            "price_source": "Bovada Live v2 Two-Sided",
        })
    props.sort(key=lambda p: (p["team"], p["athlete"], p["market"]))
    priced_count = sum(1 for p in props if p.get("has_price"))
    return {
        "schema": "gse_360_matchup_board_v1",
        "matchup": f"{away} @ {home}",
        "week": WEEK,
        "market_type_count": len(all_markets),
        "props_count": len(props),
        "priced_props_count": priced_count,
        "props": props,
        "provenance": {
            "source": "ESPN Core API provider-100 (DraftKings) propBets + Bovada Live v2 Two-Sided Odds",
            "event_id": ev_id,
            "bovada_link": bovada_link or None,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generator": "build_week10_game_boards.py",
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", default="", help="Comma-separated AWAY@HOME filters")
    args = ap.parse_args()

    sb = json.loads((REPO_ROOT / "data" / "engine" / "espn_2026_week10_scoreboard.json").read_text(encoding="utf-8"))
    tid_map = team_id_map()
    excluded = stage0_excluded()
    print(f"team id map: {len(tid_map)} teams | Stage-0 excluded: {len(excluded)} names", flush=True)
    bovada_events = fetch_bovada_coupon_index()
    bovada_link_map: dict[str, str] = {
        str(ev.get("description") or "").strip().lower(): str(ev.get("link") or "")
        for ev in bovada_events
        if ev.get("description") and ev.get("link")
    }
    now = datetime.now(timezone.utc)
    games = []
    for ev in sb.get("events", []):
        comp = (ev.get("competitions") or [{}])[0]
        cs = comp.get("competitors") or []
        home_team = next((c for c in cs if c.get("homeAway") == "home"), {}).get("team", {})
        away_team = next((c for c in cs if c.get("homeAway") == "away"), {}).get("team", {})
        home = home_team.get("abbreviation", "")
        away = away_team.get("abbreviation", "")
        date_str = ev.get("date", "")
        try:
            kickoff = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            continue
        if (away, home) == ("NE", "DET"):
            continue  # Munich 08:30 AM CST game is sealed
        if kickoff <= now:
            continue  # already started (e.g. WSH@NYG Thursday)
        desc_key = f"{away_team.get('displayName', '')} @ {home_team.get('displayName', '')}".strip().lower()
        bov_link = bovada_link_map.get(desc_key, "")
        games.append((str(ev["id"]), away, home, bov_link))
    if args.only:
        wanted = {tuple(x.strip().split("@")) for x in args.only.split(",") if x.strip()}
        games = [g for g in games if (g[1], g[2]) in wanted]
    print(f"Week {WEEK} boards to build: {len(games)} games (bovada links matched: {sum(1 for g in games if g[3])})", flush=True)

    failures = []
    built = 0
    for ev_id, away, home, bov_link in games:
        out = REPO_ROOT / "data" / "engine" / f"week{WEEK}_{away.lower()}_{home.lower()}_dk_full_board_{BOARD_DATE_SUFFIX}.json"
        if out.is_file() and not args.force:
            print(f"[{away}@{home}] SKIP board exists", flush=True)
            built += 1
            continue
        try:
            board = build_board(ev_id, away, home, tid_map, excluded, bovada_link=bov_link)
            if board["props_count"] == 0:
                raise RuntimeError("zero props fetched")
            out.write_text(json.dumps(board, indent=2), encoding="utf-8")
            print(
                f"[{away}@{home}] DONE {board['props_count']} props ({board['priced_props_count']} priced), "
                f"{board['market_type_count']} market types -> {out.name}",
                flush=True,
            )
            built += 1
        except Exception as e:
            print(f"[{away}@{home}] FAILED: {e}", file=sys.stderr, flush=True)
            failures.append(f"{away}@{home}: {e}")
    print(f"\nBOARD BUILD: {built}/{len(games)} games, {len(failures)} failures", flush=True)
    if failures:
        print("REFUSE_PROJECTION: " + "; ".join(failures), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())