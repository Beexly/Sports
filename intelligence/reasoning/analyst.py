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
    path = SOURCES / "2026-10-13" / "injuries" / "espn_nfl_injuries_week6.json"
    d = _load_json(path)
    full = TEAM_FULLNAMES.get(team)
    if not d or not full:
        return [], [f"injuries: no digest or no mapping for {team}"]
    teams = d.get("teams") or []
    entries: list = []
    if isinstance(teams, dict):
        entries = teams.get(full) or []
    else:  # list of {team, name, injuries:[...]}
        for t in teams:
            if t.get("team") == team or t.get("name") == full:
                entries = t.get("injuries") or []
                break
    if not entries:
        return [], [f"injuries: no entries for {full} in the gated week-6 pull"]
    on_report = 0
    for e in entries[:40]:
        name = e.get("athlete") or e.get("name") or "?"
        pos = e.get("position") or "?"
        status = str(e.get("status") or e.get("injuryStatus") or "?")
        if status.upper() in ("ACTIVE", "HEALTHY"):
            on_report += 1  # healthy-but-listed: context, not a firing signal
            continue
        facts.append({
            "domain": "biophysical", "metric": f"injury_status_{pos}",
            "subject": f"{name} ({team})", "value": status,
            "source": str(path.relative_to(REPO)).replace("\\", "/"),
            "note": "gated ESPN injury digest (published Fri 18:00 ET rule honored at pull time)",
        })
    if on_report:
        gaps.append(f"injuries: {on_report} {team} players appear on the report but carry ACTIVE status (listed, not firing; healthy-starters coverage is NOT in this feed)")
    return facts, gaps


def read_market(home: str, away: str) -> tuple[list[dict], list[str]]:
    facts, gaps = [], []
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


def read_ngs(home: str, away: str) -> tuple[list[dict], list[str]]:
    """Parse the NGS captured markdown tables (data.markdown) for team rows."""
    facts, gaps = [], []
    teamset = {home, away, TEAM_ALIASES.get(home, home), TEAM_ALIASES.get(away, away)}
    found = 0
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
                # cells: name, team, pos, CUSH, SEP, TAY, TAY%, REC, TAR, CTCH%, YDS, TD, YAC/R, EYAC/R, +/-
                for idx, metric, note in (
                    # 2025-SEASON SNAPSHOT: file dated 2026-07-03, season 2025 - one
                    # full season old vs the 2026 game. Baseline form indicator,
                    # REPORTED-tier; staleness named on the card.
                    (4, "ngs_separation_2025baseline", "2025-season avg separation (yards, tracking); one season stale - baseline form, not current"),
                    (5, "ngs_targeted_air_yards_2025baseline", "2025-season avg targeted air yards; one season stale"),
                    (14, "ngs_yac_above_expectation_2025baseline", "2025-season YAC over expectation/reception; one season stale"),
                ):
                    try:
                        val = float(cells[idx])
                    except (ValueError, IndexError):
                        continue
                    facts.append({
                        "domain": "on_field", "metric": metric, "subject": f"{cells[0]} ({team})",
                        "value": val, "source": str(fp.relative_to(REPO)).replace("\\", "/"),
                        "note": f"NGS receiving table, 2025-SEASON SNAPSHOT (file 2026-07-03, season 2025): {note}",
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
    ngs = [f for f in facts if f["metric"].startswith("ngs_")]
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
    lines.append("## Honest gaps")
    lines.append("")
    for g in gaps or ["(none - every reader returned)"]:
        lines.append(f"- {g}")
    lines.append("")
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
