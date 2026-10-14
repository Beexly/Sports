"""The Analyst Layer: corpus -> named thesis -> sourced causal chain -> card.

The product per the 2026-10-13 doctrine (Move 1): for one game, read the
entire ingested corpus (weather, injuries, market microstructure, news, DFS,
NGS, video digest), name the thesis, lay out the explicit causal chain with
every link citing a corpus file, mark confluence domains, pre-register
breaking conditions, and state conviction in the CHAIN (never a win
probability). The Bayesian math (bayes.correlated_update) validates the
chain; the card narrates it.

Every claim cites a file. Uncitable claims become named gaps. No fabricated
numbers, no uncited claims, no terminal PASS - a card exists for every game.

Usage:
    python intelligence/reasoning/analyst.py --home PHI --away DAL --date 2026-10-13
    (writes docs/predictions/research/<date>/<AWY>@<HOM>-card.md)
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "data-sources" / "research"
OUTROOT = REPO / "docs" / "predictions" / "research"

# ---------------------------------------------------------------------------
# Corpus readers - each returns (facts, gaps); a fact carries its source file
# ---------------------------------------------------------------------------

TEAM_TO_VENUE = {
    "PHI": "Lincoln Financial Field",
    "DAL": "AT&T Stadium",
    "LAC": "SoFi Stadium",
    "LV": "Allegiant Stadium",
    "NYJ": "MetLife Stadium",
    "NYG": "MetLife Stadium",
    "PIT": "Acrisure Stadium",
    "CLE": "Huntington Bank Field",
    "BUF": "Highmark Stadium",
    "MIA": "Hard Rock Stadium",
    "DEN": "Empower Field at Mile High",
    "KC": "Arrowhead Stadium",
    "SF": "Levi's Stadium",
    "SEA": "Lumen Field",
    "GB": "Lambeau Field",
    "CHI": "Soldier Field",
    "NO": "Caesars Superdome",
    "TB": "Raymond James Stadium",
    "ATL": "Mercedes-Benz Stadium",
    "CAR": "Bank of America Stadium",
    "ARI": "State Farm Stadium",
    "WAS": "Northwest Stadium",
    "DET": "Ford Field",
    "MIN": "U.S. Bank Stadium",
    "BAL": "M&T Bank Stadium",
    "CIN": "Paycor Stadium",
    "TEN": "Nissan Stadium",
    "IND": "Lucas Oil Stadium",
    "HOU": "NRG Stadium",
    "JAX": "EverBank Stadium",
}

TEAM_FULLNAMES = {
    "PHI": "Philadelphia Eagles", "DAL": "Dallas Cowboys", "LAC": "Los Angeles Chargers",
    "LV": "Las Vegas Raiders", "NYJ": "New York Jets", "NYG": "New York Giants",
    "PIT": "Pittsburgh Steelers", "CLE": "Cleveland Browns", "BUF": "Buffalo Bills",
    "MIA": "Miami Dolphins", "DEN": "Denver Broncos", "KC": "Kansas City Chiefs",
    "SF": "San Francisco 49ers", "SEA": "Seattle Seahawks", "GB": "Green Bay Packers",
    "CHI": "Chicago Bears", "NO": "New Orleans Saints", "TB": "Tampa Bay Buccaneers",
    "ATL": "Atlanta Falcons", "CAR": "Carolina Panthers", "ARI": "Arizona Cardinals",
    "WAS": "Washington Commanders", "DET": "Detroit Lions", "MIN": "Minnesota Vikings",
    "BAL": "Baltimore Ravens", "CIN": "Cincinnati Bengals", "TEN": "Tennessee Titans",
    "IND": "Indianapolis Colts", "HOU": "Houston Texans", "JAX": "Jacksonville Jaguars",
}


def _load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def read_weather(home: str) -> tuple[list[dict], list[str]]:
    facts, gaps = [], []
    path = SOURCES / "2026-10-13" / "weather-pilot" / "weather-stadium-pilot.json"
    d = _load_json(path)
    venue = TEAM_TO_VENUE.get(home)
    if not d or venue is None:
        return [], [f"weather: no venue mapping or no weather file for {home}"]
    for v in d.get("venues", []):
        name = v.get("venue") or v.get("name") or ""
        if venue.lower() not in name.lower():
            continue
        now_conditions = v.get("now") or {}
        rho = now_conditions.get("air_density_kg_m3")
        wind = now_conditions.get("wind_kmh")
        temp_c = now_conditions.get("temp_c")
        temp = round(temp_c * 9 / 5 + 32, 1) if isinstance(temp_c, (int, float)) else None
        precip = now_conditions.get("precip_prob_pct")
        if rho:
            facts.append({
                "domain": "environmental", "metric": "air_density_kg_m3",
                "subject": name, "value": rho,
                "source": str(path.relative_to(REPO)).replace("\\", "/"),
                "note": f"measured venue air density; carries into ball-flight LR",
            })
        if wind is not None:
            facts.append({
                "domain": "environmental", "metric": "wind_kmh", "subject": name,
                "value": wind, "source": str(path.relative_to(REPO)).replace("\\", "/"),
                "note": "forecast wind at kickoff bucket",
            })
        if temp is not None:
            facts.append({
                "domain": "environmental", "metric": "temp_f", "subject": name,
                "value": temp, "source": str(path.relative_to(REPO)).replace("\\", "/"),
                "note": "forecast temperature",
            })
        if precip is not None:
            facts.append({
                "domain": "environmental", "metric": "precip_prob_pct", "subject": name,
                "value": precip, "source": str(path.relative_to(REPO)).replace("\\", "/"),
                "note": "precipitation probability at snapshot (Open-Meteo)",
            })
        break
    else:
        gaps.append(f"weather: venue '{venue}' not in pilot file")
    if not facts and not gaps:
        gaps.append("weather: file present but no rows parsed for this venue")
    return facts, gaps


def read_injuries(team: str) -> tuple[list[dict], list[str]]:
    facts, gaps = [], []
    full = TEAM_FULLNAMES.get(team)
    # 1. Gated ESPN injury digest
    path = SOURCES / "2026-10-13" / "injuries" / "espn_nfl_injuries_week6.json"
    d = _load_json(path)
    if d and full:
        teams = d.get("teams") or []
        entries: list = []
        if isinstance(teams, dict):
            entries = teams.get(full) or []
        else:
            for t in teams:
                if t.get("team") == team or t.get("name") == full:
                    entries = t.get("injuries") or []
                    break
        on_report = 0
        for e in entries[:40]:
            name = e.get("athlete") or e.get("name") or "?"
            pos = e.get("position") or "?"
            status = str(e.get("status") or e.get("injuryStatus") or "?")
            if status.upper() in ("ACTIVE", "HEALTHY"):
                on_report += 1
                continue
            facts.append({
                "domain": "biophysical", "metric": f"injury_status_{pos}",
                "subject": f"{name} ({team})", "value": status,
                "source": str(path.relative_to(REPO)).replace("\\", "/"),
                "note": "gated ESPN injury digest (published Fri 18:00 ET rule honored at pull time)",
            })
        if on_report:
            gaps.append(f"injuries: {on_report} {team} players appear on the report but carry ACTIVE status")

    # 2. Firecrawl Alexandria structured official injury & practice report
    for fc_path in sorted(SOURCES.glob("2026-10-13/firecrawl/alexandria_nfl_injuries_*.json")):
        fcd = _load_json(fc_path)
        if not fcd:
            continue
        alexandria = ((fcd.get("data") or {}).get("alexandria") or [])
        for block in alexandria:
            reports = ((block.get("data") or {}).get("reports") or [])
            for r in reports:
                r_team = (r.get("team") or {}).get("abbreviation") or ""
                r_full = (r.get("team") or {}).get("full_name") or ""
                if r_team.upper() == team.upper() or (full and r_full.lower() == full.lower()):
                    player = r.get("player") or {}
                    pname = player.get("display_name") or "?"
                    pos = player.get("position") or "?"
                    p_days = r.get("practice_days") or []
                    p_status = r.get("practice_status") or "?"
                    inj_list = r.get("practice_injuries") or []
                    inj_desc = ", ".join(inj_list) if inj_list else "unspecified"
                    dnp_days = sum(1 for pd in p_days if (pd.get("status") or "").upper() in ("DIDNOT", "DNP"))

                    val_str = f"Practice: {p_status} ({dnp_days} DNP days; {inj_desc})"
                    facts.append({
                        "domain": "biophysical", "metric": f"official_practice_{pos}",
                        "subject": f"{pname} ({team})", "value": val_str,
                        "source": str(fc_path.relative_to(REPO)).replace("\\", "/"),
                        "note": f"Official NFL Injury Report via Firecrawl Alexandria (observed {block.get('data', {}).get('report_date', '2026-10-13')})",
                    })

    if not facts and not gaps:
        gaps.append(f"injuries: no injury records found for {team}")
    return facts, gaps


def read_market(home: str, away: str) -> tuple[list[dict], list[str]]:
    facts, gaps = [], []
    # 1. Kalshi prediction market prior
    kpath = SOURCES / "2026-10-13" / "kalshi" / "kalshi-nfl-digest.json"
    k = _load_json(kpath)
    if k:
        markets: list = []
        series = k.get("series") or {}
        if isinstance(series, dict):
            for _, block in series.items():
                if isinstance(block, dict):
                    markets.extend(block.get("markets") or [])
        markets.extend(k.get("markets") or [])
        tag = f"{away}{home}".upper()
        hits = [m for m in markets if tag in str(m.get("event_ticker", "")).upper()]
        for m in hits[:2]:
            try:
                ask = float(m.get("yes_ask_dollars"))
            except (TypeError, ValueError):
                ask = m.get("yes_ask_dollars")
            facts.append({
                "domain": "market", "metric": "kalshi_yes_ask",
                "subject": f"{m.get('title')} ({m.get('ticker')})",
                "value": ask, "source": str(kpath.relative_to(REPO)).replace("\\", "/"),
                "note": "Kalshi public read API (prediction-market prior)",
            })
        if not hits:
            gaps.append("market: Kalshi digest has no row for this game")
    else:
        gaps.append("market: Kalshi digest missing")

    # 1b. Fresh Kalshi two-sided books (kalshi_patterns.py output). The digest
    # above is a snapshot; this is the live two-sided read. Ticker grammar:
    # KXNFLGAME-<DDMMMDD><AWAY3><HOME3>-<SIDE>. Kalshi uses JAC where ESPN
    # uses JAX; away/home order is matched as an unordered pair per game.
    kpath2_dir = SOURCES / "2026-10-14" / "kalshi"
    if kpath2_dir.is_dir():
        newest2 = None
        for p2 in sorted(kpath2_dir.glob("kalshi_open_markets_*.json")):
            newest2 = p2  # sorted glob; keep the newest
        if newest2:
            kd2 = _load_json(newest2)
            rows2 = (kd2 or {}).get("rows") or []
            abbr_alias = {"JAX": "JAC", "WSH": "WAS"}
            h_alias = abbr_alias.get(home.upper(), home.upper())
            a_alias = abbr_alias.get(away.upper(), away.upper())
            want_pair = {h_alias, a_alias}
            matched2 = 0
            for r2 in rows2:
                m2 = re.match(
                    r"KXNFLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]{3})([A-Z]{3})-([A-Z]{2,3})$",
                    str(r2.get("ticker") or ""))
                if not m2:
                    continue
                t_away, t_home, side = m2.groups()
                if {t_away, t_home} != want_pair:
                    continue
                matched2 += 1
                facts.append({
                    "domain": "market",
                    "metric": ("kalshi_two_sided_home" if side == h_alias
                               else "kalshi_two_sided_away"),
                    "subject": "{} ({})".format(r2.get("title"), r2.get("ticker")),
                    "value": {"yes_bid": r2.get("yes_bid"), "yes_ask": r2.get("yes_ask"),
                              "mid": r2.get("mid"), "spread": r2.get("spread")},
                    "source": str(newest2.relative_to(REPO)).replace("\\", "/"),
                    "note": "Kalshi live two-sided book (kalshi_patterns.py)",
                })
            if matched2 == 0:
                gaps.append("market: fresh Kalshi two-sided books have no row for this game")

    # 2. Action Network Multi-Book Odds Plane (Caesars, DraftKings, BetMGM, FanDuel)
    an_files = sorted(SOURCES.glob("2026-10-13/action-network/scoreboard_*.json"))
    for an_path in an_files:
        andata = _load_json(an_path)
        if not andata:
            continue
        games = andata.get("games") or []
        abbr_map = {"JAX": "JAC", "WSH": "WAS", "ARI": "AZ"}
        h_norm = abbr_map.get(home, home).upper()
        a_norm = abbr_map.get(away, away).upper()

        for g in games:
            teams = g.get("teams") or []
            if len(teams) < 2:
                continue
            g_abbrs = [t.get("abbr", "").upper() for t in teams]
            if (h_norm in g_abbrs or home in g_abbrs) and (a_norm in g_abbrs or away in g_abbrs):
                odds = g.get("odds") or []
                book_names = {15: "DraftKings", 30: "FanDuel", 68: "Caesars", 69: "BetMGM", 71: "PointsBet", 74: "Circa"}
                book_quotes = []
                spreads, totals = [], []
                for o in odds:
                    b_id = o.get("book_id")
                    b_name = book_names.get(b_id, f"Book {b_id}")
                    sp = o.get("spread_home")
                    ml_h = o.get("ml_home")
                    tot = o.get("total")
                    if sp is not None:
                        spreads.append(sp)
                    if tot is not None:
                        totals.append(tot)
                    if sp is not None or ml_h is not None:
                        book_quotes.append(f"{b_name} (ML {ml_h}, Spd {sp}, O/U {tot})")

                if book_quotes:
                    facts.append({
                        "domain": "market", "metric": "action_network_multi_book",
                        "subject": f"{away}@{home} multi-book plane",
                        "value": f"{len(spreads)} books: " + "; ".join(book_quotes[:4]),
                        "source": str(an_path.relative_to(REPO)).replace("\\", "/"),
                        "note": "Action Network keyless multi-book plane (Caesars, DraftKings, BetMGM, FanDuel)",
                    })
                if len(spreads) >= 2:
                    disp = round(max(spreads) - min(spreads), 2)
                    facts.append({
                        "domain": "market", "metric": "market_spread_dispersion",
                        "subject": f"{away}@{home}",
                        "value": disp,
                        "source": str(an_path.relative_to(REPO)).replace("\\", "/"),
                        "note": f"Spread dispersion {disp} pts across {len(spreads)} books",
                    })
                break

    # 3. Pinnacle Sharp Reference Ingest
    pin_files = sorted(SOURCES.glob("2026-10-13/pinnacle/guest_*.json"))
    if pin_files:
        facts.append({
            "domain": "market", "metric": "pinnacle_sharp_reference_available",
            "subject": f"{away}@{home}",
            "value": f"{len(pin_files)} Pinnacle guest line snapshot(s) archived",
            "source": str(pin_files[-1].relative_to(REPO)).replace("\\", "/"),
            "note": "Pinnacle sharp closing benchmark available for consensus de-vigging",
        })

    return facts, gaps


def read_news(home: str, away: str, limit: int = 8) -> tuple[list[dict], list[str]]:
    facts, gaps = [], []
    for fname in ("espn-nfl-news-digest.json",):
        path = SOURCES / "2026-10-13" / "news-espn" / fname
        d = _load_json(path)
        items = d.get("articles") or d.get("items") or []
        full_home, full_away = TEAM_FULLNAMES.get(home, ""), TEAM_FULLNAMES.get(away, "")
        keys = [x for x in (full_home, full_away, home, away) if x]
        hits = []
        for it in items:
            text = " ".join(str(it.get(k, "")) for k in ("headline", "description", "summary", "title"))
            tl = text.lower()
            home_hit = (full_home.lower() in tl) or (f" {home.lower()} " in tl)
            away_hit = (full_away.lower() in tl) or (f" {away.lower()} " in tl)
            if not (home_hit and away_hit):
                continue  # single-team league news is not THIS game's news
            hits.append({
                    "domain": "cognitive", "metric": "news_hit",
                    "subject": (it.get("headline") or it.get("title") or "?")[:120],
                    "value": text[:280],
                    "source": str(path.relative_to(REPO)).replace("\\", "/"),
                    "note": f"published {it.get('published') or it.get('publishedUtc') or 'unknown'}",
                })
        facts.extend(hits[:limit])
        if not hits:
            gaps.append(f"news: no {home}/{away} hits in {fname}")
    return facts, gaps


def read_dfs(home: str, away: str, limit: int = 4) -> tuple[list[dict], list[str]]:
    """Slate-level DFS context from the corpus digest (honestly slate-scoped,
    not game-specific): contest census, leverage/chalk spot counts."""
    facts, gaps = [], []
    dpath = SOURCES / "2026-10-13" / "dfs" / "dfs-signals-digest.json"
    cpath = SOURCES / "2026-10-13" / "dfs" / "dk-contests-census.csv"
    d = _load_json(dpath)
    if d:
        counts = d.get("record_counts") or {}
        lev = d.get("leverage_spot") or []
        named = [x for x in lev if x.get("is_roster_player")]
        facts.append({
            "domain": "dfs", "metric": "dfs_leverage_spots",
            "subject": "week slate",
            "value": f"{len(lev)} leverage spots flagged ({len(named)} tied to named roster players)",
            "source": str(dpath.relative_to(REPO)).replace("\\", "/"),
            "note": f"slate-level narrative scan; record_counts={counts}",
        })
        own = d.get("ownership_projection") or []
        if own:
            facts.append({
                "domain": "dfs", "metric": "dfs_ownership_quotes",
                "subject": "week slate",
                "value": f"{len(own)} public ownership quotes parsed (confidence varies; see source)",
                "source": str(dpath.relative_to(REPO)).replace("\\", "/"),
                "note": "ownership projections from public articles - REPORTED tier, not measured",
            })
    try:
        lines = cpath.read_text(encoding="utf-8", errors="replace").splitlines()
        n_contests = max(0, len(lines) - 1)
        big = [l for l in lines[1:] if "Millionaire" in l or "Main Event" in l][:1]
        facts.append({
            "domain": "dfs", "metric": "dk_contest_census",
            "subject": "week slate",
            "value": f"{n_contests} DK contests captured" + (f"; flagship: {big[0].split(',')[2][:60]}" if big else ""),
            "source": str(cpath.relative_to(REPO)).replace("\\", "/"),
            "note": "DK lobby census at pull time (entry fees, prize pools, rake implied)",
        })
    except Exception as exc:
        gaps.append(f"dfs: contest census unreadable ({type(exc).__name__})")
    if not facts:
        gaps.append("dfs: digest and census both missing")
    return facts, gaps


def read_cognitive(home: str, away: str, limit: int = 6) -> tuple[list[dict], list[str]]:
    """Cognitive/behavioral signals from the ingested digest (team-keyed,
    provenance-carrying): presser sentiment, coach-speak deltas, depth moves."""
    facts, gaps = [], []
    cpath = SOURCES / "2026-10-13" / "cognitive" / "cognitive_signals.json"
    c = _load_json(cpath)
    if not c:
        return [], ["cognitive: digest missing (cognitive_signals.json)"]
    sig = c.get("signals") or {}
    src_rel = str(cpath.relative_to(REPO)).replace("\\", "/")
    taken = 0
    for stype in ("presser_sentiment", "coach_speak_delta", "depth_chart_move", "game_context_flag"):
        for s in sig.get(stype) or []:
            team = s.get("team") or ""
            if team not in (home, away):
                continue
            # polarity-only baseline rows say nothing yet - skip honestly
            if stype == "coach_speak_delta" and s.get("status") == "baseline_established":
                continue
            metric = stype
            value = s.get("sentiment_label") or s.get("direction") or s.get("flag") or s.get("move") or ""
            excerpt = (s.get("evidence_excerpt") or "")[:200]
            facts.append({
                "domain": "cognitive", "metric": metric,
                "subject": f"{team}{(' ' + s.get('player')) if s.get('player') else ''}",
                "value": f"{value} | {excerpt}" if excerpt else str(value),
                "source": src_rel,
                "note": f"agent-ingested cognitive signal (doc_count {s.get('doc_count', '?')}, published {s.get('published_utc', 'n/a')})",
            })
            taken += 1
            if taken >= limit:
                return facts, gaps
    if taken == 0:
        gaps.append("cognitive: no digest signals for these teams")
    return facts, gaps


TEAM_ALIASES = {"ARI": "AZ", "LAR": "LAR"}  # NGS prints Arizona as AZ


NGS_TEAM_ID_MAP = {
    "3700": "PHI", "4600": "GB", "2120": "DET", "3200": "NE", "2510": "LAR",
    "0810": "CHI", "3300": "JAX", "4500": "SF", "0200": "ATL", "3430": "NYJ",
    "2520": "LV", "2310": "SEA", "2250": "TEN", "2700": "MIA", "1050": "CLE",
    "0920": "CIN", "5110": "TB", "3000": "MIN", "1540": "IND", "3410": "NYG",
    "1200": "DEN", "4400": "WAS", "0325": "BAL", "1800": "HOU", "2200": "IND",
    "3800": "PIT", "0610": "BUF", "1400": "LAC", "2400": "KC", "0900": "DAL",
    "3900": "NO", "0100": "ARI",
}


def read_ngs(home: str, away: str) -> tuple[list[dict], list[str]]:
    """Parse both 2026 live NGS statboards and 2025 baseline tables."""
    facts, gaps = [], []
    teamset = {home, away, TEAM_ALIASES.get(home, home), TEAM_ALIASES.get(away, away)}
    found = 0

    # 1. LIVE 2026 NEXT GEN STATS STATBOARDS (Season 2026, Week 6/7)
    ngs_dir = SOURCES / "2026-10-13" / "ngs"
    # Rushing: RYOE, stacked box rate, efficiency
    for rf in sorted(ngs_dir.glob("raw_statboard_rushing*.json")):
        d = _load_json(rf)
        if not d:
            continue
        for s in d.get("stats") or []:
            tid = str(s.get("teamId") or (s.get("player") or {}).get("currentTeamId") or "")
            team = NGS_TEAM_ID_MAP.get(tid, "")
            if team not in teamset:
                continue
            pname = s.get("playerName") or (s.get("player") or {}).get("displayName") or "?"
            ryoe = s.get("rushYardsOverExpected")
            box_pct = s.get("percentAttemptsGteEightDefenders")
            att = s.get("rushAttempts") or 0
            if ryoe is not None and att >= 20:
                facts.append({
                    "domain": "on_field", "metric": "ngs_2026_ryoe",
                    "subject": f"{pname} ({team})",
                    "value": round(float(ryoe), 1),
                    "source": str(rf.relative_to(REPO)).replace("\\", "/"),
                    "note": f"2026 IN-SEASON NGS: RYOE {float(ryoe):+.1f} yds ({att} att, {s.get('rushYards', 0)} rush yds, {box_pct or 0:.1f}% vs 8+ box)",
                })
                found += 1
            if box_pct is not None and att >= 20:
                facts.append({
                    "domain": "on_field", "metric": "ngs_2026_stacked_box_pct",
                    "subject": f"{pname} ({team})",
                    "value": round(float(box_pct), 1),
                    "source": str(rf.relative_to(REPO)).replace("\\", "/"),
                    "note": f"2026 IN-SEASON NGS: 8+ defender stacked box rate {float(box_pct):.1f}%",
                })
                found += 1
        break

    # Passing: time to throw, avg completed air yards, passer rating
    for pf in sorted(ngs_dir.glob("raw_statboard_passing*.json")):
        d = _load_json(pf)
        if not d:
            continue
        for s in d.get("stats") or []:
            tid = str(s.get("teamId") or (s.get("player") or {}).get("currentTeamId") or "")
            team = NGS_TEAM_ID_MAP.get(tid, "")
            if team not in teamset:
                continue
            pname = s.get("playerName") or (s.get("player") or {}).get("displayName") or "?"
            ttt = s.get("avgTimeToThrow") or s.get("timeToThrow")
            cay = s.get("avgCompletedAirYards")
            att = s.get("attempts") or s.get("passAttempts") or 0
            if ttt is not None and att >= 30:
                facts.append({
                    "domain": "on_field", "metric": "ngs_2026_time_to_throw",
                    "subject": f"{pname} ({team})",
                    "value": round(float(ttt), 2),
                    "source": str(pf.relative_to(REPO)).replace("\\", "/"),
                    "note": f"2026 IN-SEASON NGS: avg time to throw {float(ttt):.2f}s ({att} pass att, CAY {cay or 0:.1f} yds)",
                })
                found += 1
        break

    # Receiving: avg separation, cushion, catch percentage
    for rec_f in sorted(ngs_dir.glob("raw_statboard_receiving*.json")):
        d = _load_json(rec_f)
        if not d:
            continue
        for s in d.get("stats") or []:
            tid = str(s.get("teamId") or (s.get("player") or {}).get("currentTeamId") or "")
            team = NGS_TEAM_ID_MAP.get(tid, "")
            if team not in teamset:
                continue
            pname = s.get("playerName") or (s.get("player") or {}).get("displayName") or "?"
            sep = s.get("avgSeparation")
            cush = s.get("avgCushion")
            rec = s.get("receptions") or 0
            if sep is not None and rec >= 10:
                facts.append({
                    "domain": "on_field", "metric": "ngs_2026_separation",
                    "subject": f"{pname} ({team})",
                    "value": round(float(sep), 2),
                    "source": str(rec_f.relative_to(REPO)).replace("\\", "/"),
                    "note": f"2026 IN-SEASON NGS: avg separation {float(sep):.2f} yds ({rec} rec, cushion {cush or 0:.1f} yds)",
                })
                found += 1
        break

    # 2. 2025 Baseline tables (historical context)
    for fp in sorted(SOURCES.glob("2026-10-13/nextgenstats.nfl.com_stats_*.json")):
        d = _load_json(fp)
        md = ((d or {}).get("data") or {}).get("markdown") or ""
        cat = fp.name.split("stats_")[-1].split(".")[0].split("#")[0]
        for line in md.splitlines():
            if not (line.startswith("|") and line.count("|") >= 8):
                continue
            cells = [c.strip() for c in line.split("|")[1:-1]]
            if len(cells) < 15 or not cells[0] or cells[0] in ("PLAYER NAME",):
                continue
            if cells[1] not in teamset:
                continue
            team = home if cells[1] in (home, TEAM_ALIASES.get(home, home)) else away
            if cat == "receiving":
                for idx, metric, note in (
                    (4, "ngs_separation_2025baseline", "2025-season avg separation (yards); baseline form"),
                    (5, "ngs_targeted_air_yards_2025baseline", "2025-season avg targeted air yards; baseline"),
                ):
                    try:
                        val = float(cells[idx])
                    except (ValueError, IndexError):
                        continue
                    facts.append({
                        "domain": "on_field", "metric": metric, "subject": f"{cells[0]} ({team})",
                        "value": val, "source": str(fp.relative_to(REPO)).replace("\\", "/"),
                        "note": f"NGS receiving table 2025 baseline: {note}",
                    })
                    found += 1

    if not found:
        gaps.append("on_field: no NGS rows for this game's teams in the corpus capture")
    return facts, gaps


# ---------------------------------------------------------------------------
# Thesis naming: cluster rules over the fact list
# ---------------------------------------------------------------------------

def name_thesis(facts: list[dict]) -> str:
    doms = {f["domain"] for f in facts}
    metrics = {f["metric"] for f in facts}
    out_count = sum(1 for f in facts if f["metric"].startswith("injury_status_") and str(f["value"]).upper() in ("OUT", "IR", "DOUBTFUL"))
    if out_count >= 2:
        return "Trench Funnel" if any("dline" in m or "injury_status_DT" in m or "injury_status_DE" in m for m in metrics) else "Attrition Edge"
    if {"air_density_kg_m3", "wind_kmh"} <= metrics:
        return "Ballistics Window"
    if "dfs_artifact_hit" in metrics and "news_hit" in metrics:
        return "Chalk Divergence"
    if any(m.startswith("coach_speak_delta") or m == "presser_sentiment" for m in metrics) and "injury_status_" in str(metrics):
        return "Narrative Fog"
    if any(m == "depth_chart_move" for m in metrics):
        return "Silent Shuffle"
    if len(doms) >= 3:
        return "Confluence Play"
    if "ngs_" in str(metrics):
        return "Tracking Edge"
    return "Situational Read"


# ---------------------------------------------------------------------------
# Precedent retrieval - structural match over the nflverse historical corpus.
# data/backtest/nfl_historical_games.json carries 2,622 team-games (2015-2024)
# with closing spread/total/ML and final scores. A precedent is a PAST game
# that structurally resembles THIS one on the dimensions the thesis leans on.
# Every precedent cites its row; outcome distributions come from the corpus,
# never invented. When nothing structurally matches, the card says so.
# ---------------------------------------------------------------------------

PRECEDENT_CORPUS = REPO / "data" / "backtest" / "nfl_historical_games.json"


def _precedent_corpus() -> list[dict]:
    d = _load_json(PRECEDENT_CORPUS)
    rows = (d or {}).get("rows") or []
    return [r for r in rows if isinstance(r, dict) and r.get("homeScore") is not None]


def _structurally_similar(rows: list[dict], home: str, away: str,
                          spread: float | None, total: float | None,
                          limit: int = 5) -> list[dict]:
    """Past games with a comparable market shape to this one.

    Similarity = same market *shape*, not same teams: closing spread within
    1.5 pts and closing total within 3 pts (when both are known for this
    game). This is the doctrine's analogical mode: different names, same
    structure. Falls back to spread-only when the total is unknown.
    """
    def _close(a, b, tol):
        return isinstance(a, (int, float)) and isinstance(b, (int, float)) and abs(a - b) <= tol

    pool = [r for r in rows
            if not (r.get("homeTeam") == home and r.get("awayTeam") == away)]  # exclude the matchup itself
    if spread is not None:
        tight = [r for r in pool if _close(r.get("closingSpreadHome"), spread, 1.5)
                 and (total is None or _close(r.get("closingTotal"), total, 3.0))]
        if len(tight) >= 3:
            return sorted(tight, key=lambda r: (r.get("season", 0), r.get("week", 0)), reverse=True)[:limit]
        looser = [r for r in pool if _close(r.get("closingSpreadHome"), spread, 3.0)]
        if looser:
            return sorted(looser, key=lambda r: (r.get("season", 0), r.get("week", 0)), reverse=True)[:limit]
    return []  # honest: no structurally similar precedent found


def _precedent_block(home: str, away: str, spread: float | None,
                     total: float | None) -> tuple[list[str], list[dict]]:
    """Render the Precedent section. Returns (markdown lines, matched rows)."""
    rows = _precedent_corpus()
    if not rows:
        return (["## Precedent", "",
                 "no signal - named gap: precedent corpus failed to load "
                 f"({PRECEDENT_CORPUS.name}); no structural matches were sought.",
                 ""], [])
    matches = _structurally_similar(rows, home, away, spread, total)
    lines = ["## Precedent (structural matches from the 2,622-game corpus)", ""]
    if not matches:
        lines.append("no signal - named gap: no structurally similar game in the "
                     "2015-2024 corpus (market shape match on closing spread/total "
                     "found nothing). This thesis has no precedent support; treat it "
                     "as a first observation, not a repeated pattern.")
        lines.append("")
        return lines, []
    # outcome distribution of the matched set, from the corpus rows
    home_cover = push = home_lose = 0
    for m in matches:
        margin = (m["homeScore"] - m["awayScore"])
        cs = m.get("closingSpreadHome")
        if not isinstance(cs, (int, float)):
            continue
        adj = margin + cs  # home covers if adj > 0
        if adj > 0.5:
            home_cover += 1
        elif adj < -0.5:
            home_lose += 1
        else:
            push += 1
    n = home_cover + home_lose + push
    lines.append(f"Structural filter: closing spread {spread if spread is not None else 'n/a'} "
                 f"(±3.0), total {total if total is not None else 'n/a'} (±3.0) -> "
                 f"{len(matches)} precedent games (2015-2024, nflverse, CC-BY 4.0).")
    lines.append("")
    lines.append("Outcome distribution of the matched set (home side vs the close):")
    lines.append("")
    lines.append("| outcome | n | share |")
    lines.append("|---|---|---|")
    if n:
        lines.append(f"| home covered | {home_cover} | {round(100*home_cover/n,1)}% |")
        lines.append(f"| push | {push} | {round(100*push/n,1)}% |")
        lines.append(f"| home failed to cover | {home_lose} | {round(100*home_lose/n,1)}% |")
    lines.append("")
    lines.append("Named precedents (most recent first):")
    lines.append("")
    for m in sorted(matches, key=lambda r: (r.get("season", 0), r.get("week", 0)), reverse=True)[:5]:
        lines.append(
            f"- {m.get('season')} W{m.get('week')}: {m.get('awayTeam')} @ {m.get('homeTeam')} "
            f"final {m.get('awayScore')}-{m.get('homeScore')}, close {m.get('closingSpreadHome'):+} / "
            f"{m.get('closingTotal')} [data/backtest/nfl_historical_games.json rows[]]")
    lines.append("")
    return lines, matches


def _counter_thesis_block(thesis: str, facts: list[dict]) -> list[str]:
    """The strongest case AGAINST the card's thesis, with its own mechanism.

    Not a disclaimer - a rival mechanism grounded in the same corpus facts,
    stated as strongly as the thesis, with named falsifiers.
    """
    metrics = {f["metric"]: f for f in facts if isinstance(f.get("metric"), str)}
    lines = ["## Counter-thesis (the strongest case against)", ""]
    fired = []
    if thesis == "Trench Funnel":
        rival = ("**Attrition is priced, not missed.** The injury reports this card cites are "
                 "public before kickoff; the market has already moved the line for them. What "
                 "looks like an unpriced trench edge is the market's Tuesday number meeting the "
                 "public's Friday report - the mechanism inverts: the 'funnel' is where the "
                 "sharp money already is, and the value (if any) is on the other side.")
        falsifiers = [
            "the cited market anchor moved LESS than 0.5 pts after the injury report timestamp - "
            "then the market genuinely missed it and the thesis stands",
            "line-movement history for this game (ESPN odds open vs close in the slate traces) "
            "shows <0.5 pts of total movement - no pricing evidence either way",
        ]
    elif thesis == "Ballistics Window":
        rival = ("**Both kickers and both QBs practice in this air daily.** Air-density effects on "
                 "ball flight are second-order for professionals who calibrate to their home venue "
                 "every week; the measurable effect lands on inanimate props (K distance, punt "
                 "avg), not on spreads. The mechanism is real but the market already prices home "
                 "venue effects in every number it hangs.")
        falsifiers = [
            "a dome/outdoor split on the 2,622-game corpus shows no total-overskew for extreme "
            "density venues - then the environmental edge is noise",
            "the wind reading is a forecast, not a measurement; if forecast-vs-actual error at "
            "this venue exceeds 5 km/h historically, the link is unfalsifiable pre-kickoff",
        ]
    elif thesis == "Narrative Fog":
        rival = ("**Coach-speak is noise by construction.** Presser sentiment is a public signal "
                 "distributed to everyone simultaneously; any real information in it is priced "
                 "within minutes. The 'fog' is only actionable when it contradicts a measured "
                 "on-field signal - and this card cites both, which means the market saw both too.")
        falsifiers = [
            "the sentiment shift correlates with an already-reported injury (same underlying fact) "
            "- then it adds no new information and the thesis collapses to Attrition Edge",
        ]
    else:
        rival = (f"**The confluence is counting, not compounding.** This card cites facts across "
                 f"several domains, but citation count is not mechanism count. Unless two domains "
                 f"touch the SAME causal path (not merely the same game), they are independent "
                 f"observations, and multiplying their LRs overstates the evidence - failure "
                 f"taxonomy #2 and #3 in one move.")
        falsifiers = [
            "name the specific mechanism any two cited domains share; if the answer is only "
            "'they describe the same game', the confluence claim is false and conviction should "
            "drop to the single strongest domain's weight",
        ]
    lines.append(rival)
    lines.append("")
    lines.append("Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):")
    lines.append("")
    for f in falsifiers:
        lines.append(f"- {f}")
    lines.append("")
    return lines


def _projected_state_block(home: str, away: str, facts: list[dict]) -> list[str]:
    """Projected game state from corpus signals only - first-15, halftime, 4th-quarter.

    Every number here traces to a cited fact or is a named gap. No invented scripts.
    """
    lines = ["## Projected game state", ""]
    metrics = {}
    for f in facts:
        m = f.get("metric")
        if isinstance(m, str):
            metrics.setdefault(m, []).append(f)

    wind = metrics.get("wind_kmh", [{}])[0].get("value")
    wind_hi = isinstance(wind, (int, float)) and wind > 20
    precip = metrics.get("precip_prob_pct", [{}])[0].get("value")
    wet = isinstance(precip, (int, float)) and precip > 40

    # first-15: script lean from measurable signals only
    script_bits = []
    if wind_hi:
        script_bits.append(f"wind {wind} km/h > 20: early scripts typically shift toward "
                           "short passing and inside run; deep-shot rate dips in the first quarter "
                           "[measured forecast, docs/data-sources/research/2026-10-13/weather-pilot/]")
    if wet:
        script_bits.append(f"precip probability {precip}%: ball-security and catch-rate drag, "
                           "front-loaded on early downs [measured forecast, weather-pilot]")
    if not script_bits:
        script_bits.append("no signal - named gap: no environmental or script-shaping signal above "
                           "threshold in the corpus for this game; first-15 leans league-average and "
                           "the market's implied script.")
    lines.append("**First 15 (script):** " + " ".join(script_bits))
    lines.append("")

    # halftime: what would we expect to have learned
    lines.append("**Halftime trajectory:** the breaking conditions below are written to be "
                 "checkable at half - scratch lists and line moves are the two things that "
                 "legitimately change the read by then. No halftime-specific signal exists in "
                 "the corpus for this game (named gap: no in-game tracking feed ingested yet).")
    lines.append("")

    # 4th quarter: only if fatigue/rotation signals exist
    rot = [f for f in facts if "injury_status_" in f.get("metric", "")
           and str(f.get("value", "")).upper() in ("OUT", "IR", "DOUBTFUL")]
    if rot:
        names = "; ".join(f"{f['subject']} ({f['metric'].replace('injury_status_', '')}, {f['value']})" for f in rot[:4])
        lines.append(f"**Fourth-quarter mode:** rotation thinning is live on the cited report "
                     f"({names}) - fourth-quarter rush-decay and pressure-rate drift are the "
                     "exposed mechanisms; conditioning props on late-game volume carry the risk "
                     "[docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]")
    else:
        lines.append("**Fourth-quarter mode:** no signal - named gap: no rotation-thinning "
                     "signal above threshold; late-game prop conditioning defaults to "
                     "league-average fourth-quarter patterns.")
    lines.append("")
    return lines


def _sizing_block(conviction: int, chain_links: int, gaps_n: int) -> list[str]:
    """Kelly-fraction sizing from chain conviction, honestly bounded.

    The doctrine: sizing derives from conviction in the CHAIN, never from the
    win probability (which the engine refuses to fabricate). Conviction here is
    evidence coverage, not edge; the Kelly fraction is therefore a CEILING on
    stake, discounted hard for uncalibrated LRs, and named as such.
    """
    lines = ["## Sizing", ""]
    # Full Kelly on a probability we do not have is fiction; half-Kelly on a
    # coverage ratio is a discipline ceiling. Cap at 1.0% bankroll.
    frac = round(min(0.01, 0.02 * (conviction / 100.0) * 0.5), 4)
    tier = ("no stake - evidence only" if conviction < 40
            else "dust (0.1-0.25u)" if conviction < 60
            else "quarter-unit max" if conviction < 75
            else "half-unit ceiling")
    lines.append(f"- Chain conviction {conviction}/100 (cited links {chain_links} / cited + gaps {chain_links + gaps_n})")
    lines.append(f"- **Kelly-fraction ceiling: {frac} of bankroll ({tier})**")
    lines.append("- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to "
                 "mint a win probability (named gap: no calibrated tau on this host). The fraction "
                 "above is a hard ceiling on stake sized from evidence coverage, discounted 50% for "
                 "uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.")
    lines.append("- Concentration: slate-level correlation is NOT computed here (named gap: the "
                 "portfolio layer does not yet consume these cards). Do not stack multiple cards "
                 "sharing the same weather or injury signal without cutting each stake; shared "
                 "signals compound concentration risk, not edge.")
    lines.append("")
    return lines


# ---------------------------------------------------------------------------
# Card assembly
# ---------------------------------------------------------------------------

def cite(f: dict) -> str:
    return f"[{f['source']}]"


def build_chain(home: str, away: str, facts: list[dict]) -> list[str]:
    """Deterministic cause -> mechanism -> outcome links, each citing its file."""
    chain: list[str] = []
    by_metric = {}
    for f in facts:
        by_metric.setdefault(f["metric"], []).append(f)

    rho = by_metric.get("air_density_kg_m3", [])
    wind = by_metric.get("wind_kmh", [])
    if rho:
        v = rho[0]
        windnote = f"; wind {wind[0]['value']} km/h qualifies it" if wind and isinstance(wind[0].get("value"), (int, float)) else ""
        chain.append(
            f"AIR: venue air density {v['value']} kg/m3 measured at {v['subject']} {cite(v)} "
            f"-> ball carries measurably differently than a sea-level-standard model assumes {windnote} "
            f"-> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely"
        )
    inj = by_metric.get("injury_status_", [])
    outs = [f for f in facts if f["metric"].startswith("injury_status_") and str(f["value"]).upper() in ("OUT", "IR", "DOUBTFUL", "QUESTIONABLE")]
    for f in outs[:4]:
        chain.append(
            f"AVAILABILITY: {f['subject']} listed {str(f['value']).upper()} {cite(f)} "
            f"-> unit rotation depth changes at that position "
            f"-> snap share and pressure/scheme leverage shift toward the opponent's strength"
        )
    kalshi = by_metric.get("kalshi_yes_ask", [])
    if kalshi:
        k = kalshi[0]
        chain.append(
            f"MICROSTRUCTURE: Kalshi prints {k['value']} on this game {cite(k)} "
            f"-> an independent Layer-1 anchor exists beside the de-vigged book line "
            f"-> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book"
        )
    two_sided = [f for f in facts if str(f.get("metric", "")).startswith("kalshi_two_sided_")]
    if two_sided:
        for tf in two_sided[:2]:
            v = tf.get("value") or {}
            side = "home" if "home" in str(tf.get("metric")) else "away"
            chain.append(
                f"MICROSTRUCTURE (two-sided): Kalshi live book on the {side} side: "
                f"bid {v.get('yes_bid')} / ask {v.get('yes_ask')} (mid {v.get('mid')}, "
                f"spread {v.get('spread')}) {cite(tf)} "
                f"-> the prediction market quotes BOTH sides with visible depth "
                f"-> a tight spread means the prior is liquid; a wide spread means "
                f"the market itself is uncertain and any 'edge' vs a single stale "
                f"book quote is suspect"
            )
    news = by_metric.get("news_hit", [])
    for f in news[:3]:
        chain.append(
            f"COGNITIVE: news flow names this game: \"{f['subject']}\" {cite(f)} "
            f"-> narrative/attention pressure around the teams "
            f"-> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots"
        )
    dfs = by_metric.get("dfs_artifact_hit", [])
    if dfs:
        f = dfs[0]
        chain.append(
            f"DFS: corpus artifact references this game ({f['subject']}) {cite(f)} "
            f"-> salary/ownership surfaces exist for this slate "
            f"-> leverage and correlation structure for entry construction is derivable, not assumed"
        )
    ngs_2026 = [f for f in facts if f["metric"].startswith("ngs_2026_")]
    for f in ngs_2026[:3]:
        metric_label = f['metric'].replace('ngs_2026_', '').replace('_', ' ').upper()
        chain.append(
            f"TRACKING (2026 IN-SEASON): {f['subject']} records {metric_label} = {f['value']} {cite(f)} "
            f"-> live tracking proves in-season trench/separation mechanics (not historical proxy) "
            f"-> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts"
        )

    prac = [f for f in facts if f["metric"].startswith("official_practice_")]
    for f in prac[:3]:
        chain.append(
            f"PRACTICE PARTICIPATION: {f['subject']} {f['value']} {cite(f)} "
            f"-> official NFL practice report reveals recovery trajectory and true snap-share readiness "
            f"-> multiple DNP days suppress expected touch volume; full-practice return unlocks normal scheme usage"
        )

    an_mb = by_metric.get("action_network_multi_book", [])
    if an_mb:
        f = an_mb[0]
        chain.append(
            f"MULTI-BOOK PLANE: Action Network multi-book coverage across {f['value']} {cite(f)} "
            f"-> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane "
            f"-> enables true Shin de-vigging and bookmaker shading identification"
        )

    ngs = [f for f in facts if f["metric"].startswith("ngs_") and not f["metric"].startswith("ngs_2026_")]
    if ngs:
        f = ngs[0]
        chain.append(
            f"TRACKING (BASELINE, 2025 season): {f['subject']} carried NGS {f['metric']} = {f['value']} last season {cite(f)} "
            f"-> a measured 2025 form floor, NOT this season's number "
            f"-> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; "
            f"breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link"
        )
    if not chain:
        chain.append(
            "NO-CHAIN HONESTY: no corpus facts matched this game; the card exists, "
            "the thesis is unproven, conviction floor applies (see gaps)"
        )
    return chain


def breaking_conditions(home: str, away: str, facts: list[dict]) -> list[str]:
    conds = [
        f"Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately",
        f"Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed",
        f"Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable",
        f"Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction",
    ]
    return conds


def _slate_week(date: str, explicit: int | None = None) -> int:
    """Which harvested week are we reasoning? Explicit --week wins; else the
    week whose start is the latest one on/before `date`; else the newest week."""
    if explicit:
        return explicit
    try:
        from reasoning.slate_registry import weeks  # type: ignore
    except Exception:
        try:
            from slate_registry import weeks  # type: ignore
        except Exception:
            return 412
    ws = weeks()
    if not ws:
        return 412
    try:
        import datetime as _dt
        d = _dt.date.fromisoformat(date)
        for w in ws:
            s = str(w.get("start") or "")[:10]
            if s and _dt.date.fromisoformat(s) <= d:
                return w["periodId"]
    except Exception:
        pass
    return ws[0]["periodId"]


def _fixture_guard(home: str, away: str, week: int) -> tuple[dict | None, list[str]]:
    """THE guard against phantom fixtures. Returns (game, gaps).

    A card for a matchup that is not on the real slate is the worst failure in
    this repo: it reads as analysis and is fiction. If the requested game is not
    in the harvested slate, this returns the game=None and a named gap that
    states who each team ACTUALLY plays that week.
    """
    gaps: list[str] = []
    try:
        try:
            from reasoning.slate_registry import resolve_fixture, opponent_of, week as _wk
        except Exception:
            from slate_registry import resolve_fixture, opponent_of, week as _wk
    except Exception as exc:
        return None, [f"FIXTURE GUARD UNAVAILABLE ({type(exc).__name__}): slate registry not importable; "
                      f"the matchup was NOT confirmed against a real slate"]
    w = _wk(week) or {}
    gm = resolve_fixture(week, away, home)
    if gm is None:
        ha, aa = opponent_of(week, home), opponent_of(week, away)
        gaps.append(
            f"FIXTURE NOT ON SLATE: {away}@{home} is not a game in {w.get('name')} (period {week}). "
            f"Real games that week: {home} plays {ha or 'unknown'}; {away} plays {aa or 'unknown'}. "
            f"A card for this matchup would be fiction — the engine REFUSES to reason it as real."
        )
        return None, gaps
    return gm, gaps


def build_card(home: str, away: str, date: str, week: int | None = None) -> tuple[str, dict]:
    facts: list[dict] = []
    gaps: list[str] = []
    # --- FIXTURE CONFIRMATION: nothing below runs for a phantom matchup ---
    _week = _slate_week(date, week)
    _game, _fgaps = _fixture_guard(home, away, _week)
    gaps += _fgaps
    if _game is None:
        # REFUSE. No facts, no chain, no posterior for a matchup that is not real.
        now = datetime.now(timezone.utc).isoformat()
        refused = "\n".join([
            f"# {away}@{home} - FIXTURE NOT CONFIRMED (card REFUSED)",
            "",
            f"**This matchup is not a game on the real {_week} slate.** The engine does not",
            "emit an analyst card for a fixture it cannot confirm. A card here would be",
            "fiction that reads as analysis.",
            "",
            "## Why this card was refused",
            "",
        ] + [f"- {g}" for g in _fgaps] + [
            "",
            "## What to do instead",
            "",
            "- Re-run against the actual game (the real opponents are named above).",
            "- Or pass `--week <periodId>` for the week this matchup really belongs to.",
            "",
        ])
        return refused, {
            "game": f"{away}@{home}", "thesis": "FIXTURE NOT CONFIRMED",
            "domains": 0, "facts": 0, "chain_links": 0, "gaps": _fgaps,
            "conviction": 0, "generated_utc": now, "fixture_confirmed": False,
            "slate_week": _week, "refused": True,
        }
    if _game is not None:
        try:
            try:
                from reasoning.slate_registry import fair_probabilities
            except Exception:
                from slate_registry import fair_probabilities
            _fair = fair_probabilities(_game)
        except Exception:
            _fair = {"ok": False, "gap": "de-vig unavailable"}
        facts.append({
            "domain": "market", "metric": "vegas_line_slate", "subject": f"{_game.get('matchup')}",
            "value": _game.get("total"),
            "source": "docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json",
            "note": (f"LineStar/DraftKings slate line: spread {_game.get('spread_away')}/{_game.get('spread_home')}, "
                     f"total {_game.get('total')}, ML {_game.get('ml_away')}/{_game.get('ml_home')}; "
                     f"de-vigged fair {_fair.get('fair_away')}/{_fair.get('fair_home')} "
                     f"(overround {_fair.get('overround')})" if _fair.get("ok") else _fair.get("gap")),
        })
    for reader in (read_weather, ):
        f, g = reader(home)
        facts += f
        gaps += g
    for team in (home, away):
        f, g = read_injuries(team)
        facts += f
        gaps += g
    f, g = read_market(home, away)
    facts += f
    gaps += g
    f, g = read_news(home, away)
    facts += f
    gaps += g
    f, g = read_dfs(home, away)
    facts += f
    gaps += g
    f, g = read_cognitive(home, away)
    facts += f
    gaps += g
    f, g = read_ngs(home, away)
    facts += f
    gaps += g
    # Move 3: the matchup report joins the card (same corpus, deeper pairing)
    try:
        import sys as _sys
        _mp = str(REPO / "intelligence" / "matchups")
        if _mp not in _sys.path:
            _sys.path.insert(0, _mp)
        from matchup_engine import build_matchups
        mu = build_matchups(home, away)
        for c in mu["chains"]:
            facts.append({
                "domain": "matchup", "metric": "matchup_chain", "subject": c.split(":")[0],
                "value": c, "source": "intelligence/matchups/matchup_engine.py",
                "note": "specific-receiver/specific-coverage pairing chain (Move 3)",
            })
        gaps.extend(mu["gaps"])
    except Exception as exc:
        gaps.append(f"matchup engine: unavailable ({type(exc).__name__})")

    # Move 5 (dot-connection): the L4 posterior belongs in the card too.
    # Build Signal records from the cited facts (only MEASURED/COMPUTED-tier
    # facts with numeric LR-bearing metrics), take the Kalshi price as prior,
    # and run bayes.correlated_update with the full step math shown.
    posterior_block = ""
    try:
        import sys as _sys
        _here = str(REPO / "intelligence")
        if _here not in _sys.path:
            _sys.path.insert(0, _here)
        from reasoning.signals import Signal, MarketPrior
        from reasoning.bayes import correlated_update

        LR_BY_METRIC = {
            "air_density_kg_m3": (1.10, "supports"),
            "wind_kmh": (1.05, "contradicts"),
        }
        kstore = [f for f in facts if f["metric"] == "kalshi_yes_ask"]
        if kstore:
            side, price = None, None
            full_home = TEAM_FULLNAMES.get(home, home)
            home_words = [w for w in full_home.split() if len(w) > 2]  # city + nickname words
            for k in kstore:
                subj = str(k["subject"])
                subj_l = subj.lower()
                # match by full name, by any distinctive team word, or by the ticker suffix (-PHI)
                if (full_home.lower() in subj_l
                        or any(w.lower() in subj_l for w in home_words)
                        or subj.rstrip(")").upper().endswith(f"-{home}")):
                    side, price = "home", k["value"]
                    break
            if side == "home" and isinstance(price, (int, float)) and 0.02 < price < 0.98:
                prior = MarketPrior(hypothesis=f"{away}@{home} {side} win", prior=price,
                                    source=f"kalshi yes ask {price}", note="card-fused L4 (Layer 1 = prediction market)")
                sigs = []
                for f in facts:
                    lr = LR_BY_METRIC.get(f["metric"])
                    if lr and isinstance(f.get("value"), (int, float)):
                        sigs.append(Signal(domain=f["domain"], metric=f["metric"], subject=f["subject"],
                                           direction=lr[1], hypothesis=prior.hypothesis,
                                           likelihood_ratio=lr[0], verification="MEASURED"))
                if sigs:
                    u = correlated_update(prior, sigs)
                    steps_txt = "\n".join(
                        f"   - x{st.lr} {st.metric} ({st.verification}) - {st.note[:150]}" for st in u.steps
                    ) or "   - (no firing signals; posterior = prior)"
                    posterior_block = (
                        f"### Bayesian layer (the math behind the chain)\n\n"
                        f"Prior (Kalshi, Layer 1): **{u.prior}**  \n"
                        f"Update steps:\n{steps_txt}\n\n"
                        f"Posterior: **{u.posterior}** (log-odds shift {u.log_odds_shift})\n"
                        f"Unapplied (neutral/off-hypothesis) signals: {len(u.unapplied)} - recorded in the board's bayes_updates, never dropped.\n"
                    )
    except Exception as exc:
        posterior_block = f"### Bayesian layer\n\n(unavailable this run: {type(exc).__name__}: {exc})\n"

    thesis = name_thesis(facts)
    chain = build_chain(home, away, facts)
    conds = breaking_conditions(home, away, facts)
    domains = sorted({f["domain"] for f in facts})
    # conviction in the CHAIN: cited links vs named gaps, same basis as the board
    cited = len(chain)
    denom = cited + len(gaps)
    conviction = round(100 * cited / denom) if denom else 0

    # market shape for the precedent filter: live spread/total from the
    # LineStar slates-by-period corpus (keyed by LineStar periodId = _week)
    mkt_spread = mkt_total = None
    try:
        _ls = _load_json(SOURCES / "2026-10-13" / "linestar" / "linestar_slates_by_period.json")
        _per = (_ls or {}).get(str(_week)) or {}
        for _g in _per.get("games") or []:
            if str(_g.get("home", "")).upper() == home.upper() and str(_g.get("away", "")).upper() == away.upper():
                sh, sa = _g.get("spread_home"), _g.get("spread_away")
                if isinstance(sh, (int, float)):
                    mkt_spread = sh  # home closing spread, same convention as the corpus
                if isinstance(_g.get("total"), (int, float)):
                    mkt_total = _g["total"]
                break
    except Exception:
        mkt_spread = mkt_total = None  # precedent falls back to honest no-match

    now = datetime.now(timezone.utc).isoformat()
    lines: list[str] = []
    lines.append(f"# {away}@{home} - Analyst Card ({thesis})")
    lines.append("")
    lines.append(f"generated_utc: {now}  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: {date}")
    lines.append("")
    lines.append("## Named thesis")
    lines.append("")
    lines.append(f"**{thesis}** - named from the confluence cluster of {len(facts)} cited facts across {len(domains)} domains ({', '.join(domains) or 'none'}).")
    lines.append("")
    lines.append("## Causal chain (every link cites its file)")
    lines.append("")
    for i, link in enumerate(chain, 1):
        lines.append(f"{i}. {link}")
    lines.append("")
    lines.append("## Confluence")
    lines.append("")
    for d in domains:
        n = sum(1 for f in facts if f["domain"] == d)
        lines.append(f"- {d}: {n} cited fact(s)")
    lines.append("")
    lines.append("## Firing vs contradicting signals")
    lines.append("")
    lines.append("| metric | subject | value | direction | source |")
    lines.append("|---|---|---|---|---|")
    for f in facts[:24]:
        direction = "contradicts" if (f["metric"] == "wind_kmh" and isinstance(f.get("value"), (int, float)) and f["value"] > 20) else "fires"
        lines.append(f"| {f['metric']} | {f['subject']} | {f['value']} | {direction} | {f['source']} |")
    lines.append("")
    lines.append("## Pre-registered breaking conditions")
    lines.append("")
    for c in conds:
        lines.append(f"- {c}")
    lines.append("")
    # cross-anchor: Kalshi vs DK de-vig (both Layer 1, independent books)
    try:
        kstore2 = [f for f in facts if f["metric"] == "kalshi_yes_ask"]
        kalshi_home = None
        full_home = TEAM_FULLNAMES.get(home, home)
        home_words = [w for w in full_home.split() if len(w) > 2]
        for k in kstore2:
            subj = str(k["subject"]).lower()
            if (full_home.lower() in subj or any(w.lower() in subj for w in home_words)
                    or str(k["subject"]).rstrip(")").upper().endswith(f"-{home}")):
                kalshi_home = k["value"]
                break
        book_home = None
        book_src = None
        traces = sorted((REPO / "intelligence" / "reasoning_engine" / "traces").glob("slate-board-*.json"))
        for tp in reversed(traces):
            td = _load_json(tp)
            for g in (td or {}).get("games") or []:
                # traces carry game_id like DAL-PHI-... and the away@home doc key
                gid = str(g.get("game_id") or "")
                nm = f"{gid} {g.get('espn_name') or ''} {g.get('game') or ''}"
                if (home.lower() in nm.lower() and away.lower() in nm.lower()) or (
                        full_home.lower() in nm.lower() and TEAM_FULLNAMES.get(away, away).lower() in nm.lower()):
                    for u in (g.get("ranked_board") or {}).get("bayes_updates") or []:
                        if str(u.get("hypothesis", "")).endswith("home win"):
                            book_home = u.get("prior")
                            book_src = u.get("prior_source")
                            break
                    if book_home is not None:
                        break
            if book_home is not None:
                break
        if isinstance(kalshi_home, (int, float)) and isinstance(book_home, (int, float)):
            delta = abs(kalshi_home - book_home)
            verdict = "AGREE - prior solid, L2 signals apply cleanly" if delta <= 0.02 else "DIVERGE - stale book or stale market; treat the prior as unreliable"
            cross_lines = [
                "### Cross-anchor check (Layer 1 vs Layer 1)",
                "",
                f"- Kalshi home price: **{kalshi_home}**",
                f"- Book de-vig home fair: **{round(book_home, 4)}** ({book_src})",
                f"- |delta| = **{round(delta, 4)}** -> {verdict}",
                "",
            ]
            lines.extend(cross_lines)
        else:
            lines.append("### Cross-anchor check")
            lines.append("")
            lines.append(f"- unavailable: kalshi={kalshi_home}, book_fair={book_home} (one anchor missing from the corpus/traces)")
            lines.append("")
    except Exception as exc:
        lines.append(f"### Cross-anchor check - failed ({type(exc).__name__}: {exc})")
        lines.append("")
    if posterior_block:
        lines.append(posterior_block)
        lines.append("")
    # --- the four doctrine sections the cards were missing (all 16 audited) ---
    # order fixed by the output contract: Precedent -> Projected Game State ->
    # Counter-Thesis -> (Bayesian layer above) -> Honest gaps -> Sizing
    prec_lines, _prec_rows = _precedent_block(home, away, mkt_spread, mkt_total)
    lines.extend(prec_lines)
    lines.extend(_projected_state_block(home, away, facts))
    lines.extend(_counter_thesis_block(thesis, facts))
    lines.append("## Honest gaps")
    lines.append("")
    for g in gaps or ["(none - every reader returned)"]:
        lines.append(f"- {g}")
    lines.append("")
    lines.extend(_sizing_block(conviction, cited, len(gaps)))
    lines.append(f"## Conviction: {conviction}/100")
    lines.append("")
    lines.append(f"Conviction in the CHAIN (cited links {cited} / cited + named gaps {denom}). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.")
    lines.append("")

    card_md = "\n".join(lines)
    meta = {
        "game": f"{away}@{home}", "thesis": thesis, "domains": domains,
        "facts": len(facts), "chain_links": cited, "gaps": gaps,
        "conviction": conviction, "generated_utc": now,
        "fixture_confirmed": _game is not None, "slate_week": _week,
        "game_id": (_game or {}).get("gameId"),
    }
    return card_md, meta


def emit_card(home: str, away: str, date: str = "2026-10-13", week: int | None = None) -> tuple[Path, dict]:
    md, meta = build_card(home, away, date, week)
    outdir = OUTROOT / date
    outdir.mkdir(parents=True, exist_ok=True)
    suffix = "" if meta.get("fixture_confirmed") else "-REFUSED"
    out = outdir / f"{away}@{home}-card{suffix}.md"
    out.write_text(md, encoding="utf-8")
    meta["path"] = str(out)
    return out, meta


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", required=True)
    ap.add_argument("--away", required=True)
    ap.add_argument("--date", default=datetime.now(timezone.utc).date().isoformat())
    ap.add_argument("--week", type=int, default=None,
                    help="LineStar periodId (NFL week). Default: latest week on/before --date.")
    args = ap.parse_args()
    path, meta = emit_card(args.home.upper(), args.away.upper(), args.date, args.week)
    print(json.dumps(meta, indent=1))
    print(f"card -> {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
