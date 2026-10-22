#!/usr/bin/env python3
"""Cognitive / behavioral signal ingestion for GSE (signal-universe domain 2.4).

Live, keyless ingest of coach/coordinator presser tone, coach-speak deltas,
depth-chart moves, practice-squad elevations, snap/target trend breaks,
scheme-change detection, tendency breaks, 4th-down aggressiveness, timeout
usage and trap-game / look-ahead / bye-week context.

Design rules
------------
* stdlib only (urllib, json, re, argparse, dataclasses, xml.etree).
* Keyless public endpoints only: no auth, no accounts, no HTML page crawling
  (RSS + the ESPN public site API only, so host robots.txt is untouched).
* No retries. Every request is counted and reported in the digest.
* Nothing is fabricated. A metric that cannot be sourced keyless (NFL snap
  counts, coach-challenge outcomes) is emitted as an explicit `unavailable`
  gap with a reason, never as an invented number.
* Signals are typed records matching docs/ops/COGNITIVE-INGEST-2026-10-13.md.

Usage
-----
    python intelligence/ingestion/cognitive/ingest_cognitive.py \
        --out-dir docs/data-sources/research/2026-10-13/cognitive

Flags: --week N (current NFL week), --news-limit N, --max-games N, --timeout S,
--no-raw (skip raw payload snapshots).
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

try:  # package context: python -m intelligence.ingestion.cognitive.ingest_cognitive
    from intelligence.ingestion.cognitive import derived_local as local_layer
except ImportError:  # script context: the module sits beside this file
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import derived_local as local_layer  # type: ignore
from xml.etree import ElementTree as ET

REPO_ROOT = Path(__file__).resolve().parents[3]
USER_AGENT = "GSE-ingest-pilot/1.0 (keyless ESPN public API; research)"

ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl"
ESPN_NEWS = f"{ESPN_SITE}/news"
ESPN_SCOREBOARD = f"{ESPN_SITE}/scoreboard"
ESPN_SUMMARY = f"{ESPN_SITE}/summary"
ESPN_INJURIES = f"{ESPN_SITE}/injuries"
GNW_PRS = "https://news.google.com/rss/search?q=%22press+conference%22+NFL&hl=en-US&gl=US&ceid=US:en"

GENERATED_UTC = datetime.now(timezone.utc).isoformat()

# Static NFL alias table (nickname/abbr/name -> abbr). Stable across seasons;
# avoids spending a request on the teams endpoint just to build aliases.
TEAM_ALIASES = {
    "arizona cardinals": "ARI", "cardinals": "ARI", "ari": "ARI",
    "atlanta falcons": "ATL", "falcons": "ATL", "atl": "ATL",
    "baltimore ravens": "BAL", "ravens": "BAL", "bal": "BAL",
    "buffalo bills": "BUF", "bills": "BUF", "buf": "BUF",
    "carolina panthers": "CAR", "panthers": "CAR", "car": "CAR",
    "chicago bears": "CHI", "bears": "CHI", "chi": "CHI",
    "cincinnati bengals": "CIN", "bengals": "CIN", "cin": "CIN",
    "cleveland browns": "CLE", "browns": "CLE", "cle": "CLE",
    "dallas cowboys": "DAL", "cowboys": "DAL", "dal": "DAL",
    "denver broncos": "DEN", "broncos": "DEN", "den": "DEN",
    "detroit lions": "DET", "lions": "DET", "det": "DET",
    "green bay packers": "GB", "packers": "GB",
    "houston texans": "HOU", "texans": "HOU", "hou": "HOU",
    "indianapolis colts": "IND", "colts": "IND", "ind": "IND",
    "jacksonville jaguars": "JAX", "jaguars": "JAX", "jax": "JAX",
    "kansas city chiefs": "KC", "chiefs": "KC",
    "las vegas raiders": "LV", "raiders": "LV",
    "los angeles chargers": "LAC", "chargers": "LAC",
    "los angeles rams": "LAR", "rams": "LAR",
    "miami dolphins": "MIA", "dolphins": "MIA", "mia": "MIA",
    "minnesota vikings": "MIN", "vikings": "MIN", "min": "MIN",
    "new england patriots": "NE", "patriots": "NE",
    "new orleans saints": "NO", "saints": "NO",
    "new york giants": "NYG", "giants": "NYG",
    "new york jets": "NYJ", "jets": "NYJ",
    "philadelphia eagles": "PHI", "eagles": "PHI", "phi": "PHI",
    "pittsburgh steelers": "PIT", "steelers": "PIT", "pit": "PIT",
    "san francisco 49ers": "SF", "49ers": "SF",
    "seattle seahawks": "SEA", "seahawks": "SEA", "sea": "SEA",
    "tampa bay buccaneers": "TB", "buccaneers": "TB", "bucs": "TB",
    "tennessee titans": "TEN", "titans": "TEN", "ten": "TEN",
    "washington commanders": "WAS", "commanders": "WAS", "was": "WAS",
}

# ---------------------------------------------------------------------------
# Lexicons (v1, hand-tuned for coach / coordinator speak)
# ---------------------------------------------------------------------------
POSITIVE_TERMS = [
    "confident", "ready", "sharp", "locked in", "clean", "excited", "encouraged",
    "improved", "improvement", "step forward", "great week", "full speed",
    "cleared", "returning", "returns", "back at practice", "full participant",
    "starting", "elevated", "promoted", "depth", "confident in", "sharpest",
    "trending up", "good to go", "no restrictions", "play fast",
]
NEGATIVE_TERMS = [
    "concern", "concerned", "worried", "struggle", "struggling", "frustrat",
    "sloppy", "mistake", "mistakes", "injur", "setback", "unlikely", "questionable",
    "doubtful", "disappoint", "undisciplined", "penalt", "missed assignment",
    "banged up", "not expected", "ruled out", "sore", "limited", "regression",
    "trouble", "problem", "issue", "crisis", "benched", "demoted",
]
HEDGE_TERMS = [
    "maybe", "probably", "we'll see", "we will see", "not sure", "undisclosed",
    "game-time", "game time decision", "monitor", "day-to-day", "day to day",
    "limited", "to be determined", "tbd", "if he can", "as of now",
]
COACH_SPEAK_FLAGS = {
    "trap_game_talk": ["trap game", "trap-game", "not overlook", "overlook"],
    "look_ahead_talk": ["look ahead", "look-ahead", "one game at a time", "short week"],
    "accountability_talk": ["clean it up", "fix it", "our fault", "we have to be better"],
    "scheme_talk": ["scheme", "formation", "personnel", "package", "tendency", "adjustment", "adjust"],
    "aggression_talk": ["fourth down", "go for it", "aggressive", "aggressiveness", "take the points"],
    "depth_talk": ["depth chart", "practice squad", "elevated", "promoted", "rotation",
                   "snap count", "snaps"],
}

MOVE_PATTERNS = [
    ("practice_squad_elevation",
     r"practice squad (?:elevation|promotion|call[- ]up)|elevated from the practice squad|"
     r"signed (?:him |them )?(?:from|off) the practice squad|promoted from the practice squad"),
    ("activation_return",
     r"activated (?:from|off) (?:injured reserve|ir)|returning (?:from|off) (?:injured reserve|ir)|"
     r"designated to return|back on the active roster"),
    ("promotion",
     r"promoted|elevated|named (?:the )?starter|will start|"
     r"taking over (?:as|the) (?:starting|first[- ]team)|first[- ]team reps|"
     r"signed to (?:the )?active roster"),
    ("demotion",
     r"demoted|benched|moved to (?:the )?second team|second[- ]team reps|"
     r"lost (?:his|the) starting job|replaced in the lineup|relegated"),
    ("release", r"waived|released|cut\b|let go"),
    ("signing", r"signs? (?:with|a)\b|agreed to (?:terms|a contract)|"
                r"acquired (?:via|in) (?:a )?trade|traded (?:to|for)"),
]
MOVE_TYPE_RE = [(name, re.compile(pat, re.I)) for name, pat in MOVE_PATTERNS]

PLAYER_NAME_RE = re.compile(r"\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-zA-Z'.\-]{2,}){1,2})\b")
POSITION_TOKENS = ["QB", "RB", "WR", "TE", "OT", "OG", "C", "G", "DE", "DT", "NT",
                   "ILB", "OLB", "LB", "CB", "FS", "SS", "DB", "EDGE", "K", "P", "LS"]
POS_RE = re.compile(r"\b(" + "|".join(POSITION_TOKENS) + r")\b")
STOP_NAMES = {"NFL", "ESPN", "USA", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
              "Saturday", "Sunday", "Head", "Coach", "The", "But", "And", "With", "For",
              "New", "York", "San", "Kansas", "Tampa", "Green", "Las", "Los", "Big"}


# ---------------------------------------------------------------------------
# Typed signal records
# ---------------------------------------------------------------------------
@dataclass
class Provenance:
    source_url: str
    source_kind: str          # espn_site_api | google_news_rss
    retrieved_utc: str
    method: str
    confidence: str           # high | medium | low
    unverified: bool = False
    unverified_reason: str = ""


@dataclass
class Signal:
    signal_id: str
    signal_type: str
    team: str = ""
    player: str = ""
    generated_utc: str = GENERATED_UTC
    provenance: dict = field(default_factory=dict)
    evidence_excerpt: str = ""


@dataclass
class PresserSentiment(Signal):
    coach: str = ""
    polarity: float = 0.0
    sentiment_label: str = "neutral"
    positive_hits: int = 0
    negative_hits: int = 0
    hedge_hits: int = 0
    hedge_rate: float = 0.0
    word_choice_flags: list = field(default_factory=list)
    doc_count: int = 0
    text_scope: str = "headline_description"
    published_utc: str = ""


@dataclass
class CoachSpeakDelta(Signal):
    metric: str = "polarity"
    current_value: float = 0.0
    baseline_value: float = 0.0
    delta: float = 0.0
    direction: str = "flat"
    baseline_date: str = ""
    doc_count: int = 0
    status: str = "ok"
    note: str = ""


@dataclass
class DepthChartMove(Signal):
    position: str = ""
    move_type: str = "unknown"
    corroborated_by: list = field(default_factory=list)
    corroborated: bool = False
    source_headline: str = ""
    source_published_utc: str = ""


@dataclass
class TrendBreak(Signal):
    metric: str = ""
    unit: str = ""
    series: list = field(default_factory=list)   # [{"week": int, "value": float}]
    baseline_mean: float = 0.0
    baseline_n: int = 0
    last_value: float = 0.0
    delta: float = 0.0
    z_score: float = 0.0
    direction: str = "flat"
    break_detected: bool = False
    status: str = "insufficient_history"
    note: str = ""


@dataclass
class GameContextFlag(Signal):
    week: int = 0
    opponent: str = ""
    opponent_win_pct: float = 0.0
    next_opponent: str = ""
    next_opponent_win_pct: float = 0.0
    team_win_pct: float = 0.0
    flags: list = field(default_factory=list)
    look_ahead_risk: bool = False
    trap_spot: bool = False
    on_bye_this_week: bool = False
    on_bye_next_week: bool = False
    pre_bye: bool = False
    post_bye: bool = False


# ---------------------------------------------------------------------------
# Fetch layer -- no retries, every request counted
# ---------------------------------------------------------------------------
class Fetcher:
    def __init__(self, timeout: int = 40):
        self.timeout = timeout
        self.status: list = []
        self.errors: list = []
        self.n_requests = 0

    def raw(self, url: str, label: str):
        self.n_requests += 1
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = resp.read()
            self.status.append({"label": label, "url": url, "ok": True,
                                "http_status": getattr(resp, "status", 200),
                                "bytes": len(body)})
            return body
        except Exception as exc:  # noqa: BLE001 -- report, never invent
            msg = f"{type(exc).__name__}: {exc}"
            self.status.append({"label": label, "url": url, "ok": False, "error": msg})
            self.errors.append({"label": label, "url": url, "error": msg})
            print(f"  ! FAIL {label}: {msg}", file=sys.stderr)
            return None

    def json(self, url: str, label: str):
        body = self.raw(url, label)
        if body is None:
            return None
        try:
            return json.loads(body)
        except json.JSONDecodeError as exc:
            msg = f"JSONDecodeError: {exc}"
            self.errors.append({"label": label, "url": url, "error": msg})
            print(f"  ! FAIL {label}: {msg}", file=sys.stderr)
            return None

    def rss(self, url: str, label: str):
        body = self.raw(url, label)
        if body is None:
            return []
        try:
            root = ET.fromstring(body)
        except ET.ParseError as exc:
            self.errors.append({"label": label, "url": url, "error": f"ParseError: {exc}"})
            return []
        items = []
        for it in root.iter("item"):
            src = it.find("source")
            items.append({
                "title": (it.findtext("title") or "").strip(),
                "description": re.sub(r"<[^>]+>", " ",
                                      html.unescape(it.findtext("description") or "")).strip(),
                "published": (it.findtext("pubDate") or "").strip(),
                "link": (it.findtext("link") or "").strip(),
                "source": ((src.text if src is not None else "") or "").strip(),
            })
        return items


# ---------------------------------------------------------------------------
# Text analytics
# ---------------------------------------------------------------------------
def count_terms(text: str, terms: list) -> tuple:
    low = text.lower()
    hits, found = 0, []
    for t in terms:
        n = low.count(t)
        if n:
            hits += n
            found.append(t)
    return hits, found


def sentiment(text: str) -> dict:
    pos, pos_found = count_terms(text, POSITIVE_TERMS)
    neg, neg_found = count_terms(text, NEGATIVE_TERMS)
    hed, hed_found = count_terms(text, HEDGE_TERMS)
    total = pos + neg
    polarity = round((pos - neg) / total, 4) if total else 0.0
    label = "neutral"
    if polarity >= 0.25:
        label = "positive"
    elif polarity <= -0.25:
        label = "negative"
    words = max(1, len(text.split()))
    return {"polarity": polarity, "sentiment_label": label, "positive_hits": pos,
            "negative_hits": neg, "hedge_hits": hed, "hedge_rate": round(hed / words, 4),
            "positive_terms": pos_found[:8], "negative_terms": neg_found[:8],
            "hedge_terms": hed_found[:6]}


def flags_for(text: str) -> list:
    low = text.lower()
    return sorted(flag for flag, terms in COACH_SPEAK_FLAGS.items() if any(t in low for t in terms))


def detect_teams(text: str) -> list:
    low = " " + text.lower() + " "
    hits = []
    for alias, abbr in TEAM_ALIASES.items():
        if re.search(r"\b" + re.escape(alias) + r"\b", low) and abbr not in hits:
            hits.append(abbr)
    return hits


def detect_coach(text: str) -> str:
    for pat in (r"\b(?:head coach|coach|HC|DC|OC)\s+([A-Z][a-z]+\s+[A-Z][a-zA-Z'\-]+)",
                r"\b([A-Z][a-z]+\s+[A-Z][a-zA-Z'\-]+)\s+(?:said|added|noted|told reporters)"):
        m = re.search(pat, text)
        if m:
            return m.group(1)
    return ""


def detect_move_type(text: str) -> str:
    for name, rx in MOVE_TYPE_RE:
        if rx.search(text):
            return name
    return ""


def detect_player(text: str) -> str:
    for m in PLAYER_NAME_RE.finditer(text):
        toks = m.group(1).split()
        if any(t in STOP_NAMES for t in toks):
            continue
        if all(t.lower() in TEAM_ALIASES for t in toks):
            continue
        return " ".join(toks)
    return ""


# ---------------------------------------------------------------------------
# Source parsing -> signal records
# ---------------------------------------------------------------------------
def presser_from_news(news, prov) -> tuple:
    pressers, moves, flagged = [], [], []
    for a in (news or {}).get("articles", []) or []:
        headline = a.get("headline") or ""
        text = f"{headline}. {a.get('description') or ''}".strip()
        cats = [c.get("description") for c in (a.get("categories") or []) if c.get("description")]
        teams = detect_teams(" ".join([text] + cats))
        st = sentiment(text)
        fl = flags_for(text)
        if st["hedge_hits"] or fl or abs(st["polarity"]) >= 0.25:
            for abbr in (teams or ["LEAGUE"]):
                pressers.append(asdict(PresserSentiment(
                    signal_id=f"ps-news-{abbr}-{len(pressers)}",
                    signal_type="presser_sentiment", team=abbr,
                    coach=detect_coach(text), published_utc=a.get("published") or "",
                    evidence_excerpt=text[:400], provenance=prov,
                    text_scope="headline_description", doc_count=1, word_choice_flags=fl,
                    **{k: st[k] for k in ("polarity", "sentiment_label", "positive_hits",
                                          "negative_hits", "hedge_hits", "hedge_rate")})))
        if fl:
            flagged.append({"team": teams, "flags": fl, "headline": headline,
                            "link": a.get("link"), "published": a.get("published")})
        mv = detect_move_type(text)
        if mv:
            for abbr in (teams or ["LEAGUE"]):
                pos = POS_RE.search(headline)
                moves.append(asdict(DepthChartMove(
                    signal_id=f"dcm-news-{abbr}-{len(moves)}",
                    signal_type="depth_chart_move", team=abbr,
                    player=detect_player(headline), position=pos.group(1) if pos else "",
                    move_type=mv, source_headline=headline,
                    source_published_utc=a.get("published") or "",
                    evidence_excerpt=text[:400], provenance=prov)))
    return pressers, moves, flagged


def presser_from_rss(items, prov) -> tuple:
    pressers, flagged = [], []
    for it in items:
        text = f"{it['title']}. {it['description']}".strip()
        teams = detect_teams(text)
        st = sentiment(text)
        fl = flags_for(text)
        for abbr in (teams or ["LEAGUE"]):
            pressers.append(asdict(PresserSentiment(
                signal_id=f"ps-rss-{abbr}-{len(pressers)}",
                signal_type="presser_sentiment", team=abbr,
                coach=detect_coach(text), published_utc=it["published"],
                evidence_excerpt=text[:400], provenance=prov,
                text_scope="headline_description", doc_count=1, word_choice_flags=fl,
                **{k: st[k] for k in ("polarity", "sentiment_label", "positive_hits",
                                      "negative_hits", "hedge_hits", "hedge_rate")})))
        if fl:
            flagged.append({"team": teams, "flags": fl, "headline": it["title"],
                            "link": it["link"], "published": it["published"]})
    return pressers, flagged


def win_pct(comp) -> tuple:
    abbr = (comp.get("team") or {}).get("abbreviation", "")
    for rec in comp.get("records") or []:
        if rec.get("type") in ("total", "overall"):
            m = re.match(r"(\d+)-(\d+)", rec.get("summary") or "")
            if m:
                w, l = int(m.group(1)), int(m.group(2))
                return abbr, round(w / (w + l), 4) if (w + l) else 0.0
    return abbr, 0.0


def parse_scoreboard(sb) -> tuple:
    byes, games = [], []
    if not sb:
        return byes, games
    for t in ((sb.get("week") or {}).get("teamsOnBye") or []):
        if t.get("abbreviation"):
            byes.append(t["abbreviation"])
    for e in sb.get("events", []) or []:
        comp = (e.get("competitions") or [{}])[0]
        rec = {"event_id": e.get("id"), "name": e.get("shortName"), "date": e.get("date"),
               "status": ((comp.get("status") or {}).get("type") or {}).get("name"), "teams": []}
        for c in comp.get("competitors", []) or []:
            abbr, wp = win_pct(c)
            rec["teams"].append({"abbr": abbr, "home_away": c.get("homeAway"),
                                 "win_pct": wp, "score": c.get("score")})
        games.append(rec)
    return byes, games


def team_game_index(games) -> dict:
    idx = {}
    for g in games:
        abbrs = [t["abbr"] for t in g["teams"]]
        for t in g["teams"]:
            opp = [a for a in abbrs if a != t["abbr"]]
            idx[t["abbr"]] = {
                "event_id": g["event_id"], "opponent": opp[0] if opp else "",
                "opp_win_pct": next((x["win_pct"] for x in g["teams"] if x["abbr"] != t["abbr"]), 0.0),
                "win_pct": t["win_pct"], "home_away": t.get("home_away"), "status": g.get("status")}
    return idx


def parse_summary_plays(summary) -> dict:
    """Per-team aggregates from a game's play-by-play."""
    out = {}
    for p in (summary or {}).get("plays") or []:
        poss = ((p.get("team") or {}).get("abbreviation")) or ""
        if not poss:
            continue
        d = out.setdefault(poss, {"plays": 0, "early_down_plays": 0, "early_down_pass": 0,
                                  "third_down_plays": 0, "third_down_pass": 0,
                                  "fourth_down_plays": 0, "fourth_down_go": 0,
                                  "timeout_mentions": 0})
        d["plays"] += 1
        down = p.get("down")
        txt = (((p.get("type") or {}).get("text") or "") + " " + (p.get("text") or "")).lower()
        is_pass = "pass" in txt
        if down in (1, 2):
            d["early_down_plays"] += 1
            d["early_down_pass"] += 1 if is_pass else 0
        elif down == 3:
            d["third_down_plays"] += 1
            d["third_down_pass"] += 1 if is_pass else 0
        elif down == 4:
            d["fourth_down_plays"] += 1
            if "punt" not in txt and "field goal" not in txt:
                d["fourth_down_go"] += 1
        if "timeout" in txt:
            d["timeout_mentions"] += 1
    return out


def parse_summary_targets(summary) -> dict:
    """Targets per player from the game boxscore receiving group."""
    out = {}
    for tb in ((summary or {}).get("boxscore") or {}).get("players", []) or []:
        team = (tb.get("team") or {}).get("abbreviation", "")
        for grp in tb.get("statistics", []) or []:
            labels = [l.upper() for l in grp.get("labels", []) or []]
            if "receiv" not in (grp.get("name") or "").lower() and "TGTS" not in labels:
                continue
            if "TGTS" not in labels:
                continue
            ti = labels.index("TGTS")
            for ath in grp.get("athletes", []) or []:
                nm = ((ath.get("athlete") or {}).get("displayName")) or ""
                stats = ath.get("stats") or []
                if not nm or ti >= len(stats):
                    continue
                try:
                    out.setdefault(team, []).append({"player": nm, "targets": float(stats[ti])})
                except (TypeError, ValueError):
                    continue
    return out


def trend_record(series, metric, team, unit, prov, signal_type, break_z=2.0, note="") -> dict:
    """Build a trend record; only calls a break with >=3 weekly points."""
    vals = [p["value"] for p in series]
    rec = asdict(TrendBreak(signal_id=f"tb-{team}-{metric}", signal_type=signal_type, team=team,
                            metric=metric, unit=unit, series=series, provenance=prov, note=note))
    if len(vals) >= 3:
        prior = vals[:-1]
        mean = sum(prior) / len(prior)
        var = sum((v - mean) ** 2 for v in prior) / max(1, len(prior) - 1)
        sd = var ** 0.5
        last = vals[-1]
        rec.update({"baseline_mean": round(mean, 4), "baseline_n": len(prior),
                    "last_value": round(last, 4), "delta": round(last - mean, 4),
                    "z_score": round((last - mean) / sd, 3) if sd else 0.0, "status": "ok",
                    "break_detected": bool(sd and abs((last - mean) / sd) >= break_z),
                    "direction": "up" if last > mean else ("down" if last < mean else "flat")})
        if not rec["break_detected"]:
            rec["status"] = "no_break"
    elif len(vals) == 2:
        rec.update({"baseline_mean": round(vals[0], 4), "baseline_n": 1,
                    "last_value": round(vals[1], 4), "delta": round(vals[1] - vals[0], 4),
                    "direction": "up" if vals[1] > vals[0] else "down",
                    "status": "insufficient_history"})
    else:
        rec.update({"last_value": round(vals[-1], 4) if vals else 0.0,
                    "status": "insufficient_history"})
    return rec


def load_baseline(path: Path) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_baseline(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=1), encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="Keyless cognitive/behavioral signal ingest (GSE 2.4).")
    ap.add_argument("--out-dir", default="docs/data-sources/research/2026-10-13/cognitive")
    ap.add_argument("--week", type=int, default=6, help="current NFL week")
    ap.add_argument("--news-limit", type=int, default=50)
    ap.add_argument("--max-games", type=int, default=2, help="completed games to analyse")
    ap.add_argument("--timeout", type=int, default=40)
    ap.add_argument("--save-raw", dest="save_raw", action="store_true", default=True)
    ap.add_argument("--no-raw", dest="save_raw", action="store_false")
    ap.add_argument("--local", dest="local", action="store_true", default=True,
                    help="also build locally-derived signals from in-repo nflverse artifacts "
                         "(zero network requests)")
    ap.add_argument("--no-local", dest="local", action="store_false")
    ap.add_argument("--max-moves-per-team", type=int, default=8,
                    help="cap on locally-derived records emitted per team")
    args = ap.parse_args()

    out_dir = Path(args.out_dir)
    if not out_dir.is_absolute():
        out_dir = REPO_ROOT / out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    raw_dir = out_dir / "_raw"
    if args.save_raw:
        raw_dir.mkdir(exist_ok=True)

    f = Fetcher(timeout=args.timeout)
    print(f"[cognitive] start {GENERATED_UTC} week={args.week} out={out_dir}")

    news = f.json(f"{ESPN_NEWS}?" + urllib.parse.urlencode({"limit": args.news_limit}), "espn_news")
    rss_items = f.rss(GNW_PRS, "gnews_presser")
    sb_cur = f.json(f"{ESPN_SCOREBOARD}?" + urllib.parse.urlencode(
        {"week": args.week, "seasontype": 2, "dates": 2026}), "scoreboard_week_cur")
    sb_next = f.json(f"{ESPN_SCOREBOARD}?" + urllib.parse.urlencode(
        {"week": args.week + 1, "seasontype": 2, "dates": 2026}), "scoreboard_week_next")
    sb_prev = f.json(f"{ESPN_SCOREBOARD}?" + urllib.parse.urlencode(
        {"week": args.week - 1, "seasontype": 2, "dates": 2026}), "scoreboard_week_prev")
    inj = f.json(ESPN_INJURIES, "injuries")

    byes_cur, games_cur = parse_scoreboard(sb_cur)
    byes_next, games_next = parse_scoreboard(sb_next)
    _, games_prev = parse_scoreboard(sb_prev)
    summaries = []
    for g in [x for x in games_prev if x.get("event_id")][: args.max_games]:
        s = f.json(f"{ESPN_SUMMARY}?" + urllib.parse.urlencode({"event": g["event_id"]}),
                   f"summary_{g['event_id']}")
        if s:
            summaries.append((g, s))

    if args.save_raw:
        for name, payload in (("espn_news", news), ("scoreboard_week_cur", sb_cur),
                              ("scoreboard_week_next", sb_next), ("scoreboard_week_prev", sb_prev),
                              ("injuries", inj)):
            if payload:
                (raw_dir / f"{name}.json").write_text(
                    json.dumps(payload)[:2_000_000], encoding="utf-8")
        if rss_items:
            (raw_dir / "gnews_presser.json").write_text(
                json.dumps(rss_items, indent=1), encoding="utf-8")

    # ---------------- signals ----------------
    prov_news = asdict(Provenance(
        source_url=ESPN_NEWS, source_kind="espn_site_api", retrieved_utc=GENERATED_UTC,
        method="headline_description_lexicon_v1", confidence="medium", unverified=True,
        unverified_reason="headline/description text only; no transcript or full-article text"))
    prov_rss = asdict(Provenance(
        source_url=GNW_PRS, source_kind="google_news_rss", retrieved_utc=GENERATED_UTC,
        method="headline_description_lexicon_v1", confidence="low", unverified=True,
        unverified_reason="headline/description text only; no transcript or full-article text"))
    prov_pbp = asdict(Provenance(
        source_url=ESPN_SUMMARY, source_kind="espn_site_api", retrieved_utc=GENERATED_UTC,
        method="play_by_play_aggregate_v1", confidence="medium", unverified=False))
    prov_sb = asdict(Provenance(
        source_url=ESPN_SCOREBOARD, source_kind="espn_site_api", retrieved_utc=GENERATED_UTC,
        method="schedule_win_pct_heuristic_v1", confidence="low", unverified=True,
        unverified_reason="win_pct thresholds are heuristics, not validated models"))

    pressers, moves, flagged = presser_from_news(news, prov_news)
    pressers_rss, flagged_rss = presser_from_rss(rss_items, prov_rss)

    # injuries corroboration for depth-chart moves
    inj_index = {}
    for blk in (inj or {}).get("injuries", []) or []:
        abbr = ((blk.get("team") or {}).get("abbreviation")) or ""
        for it in blk.get("injuries", []) or []:
            ath = ((it.get("athlete") or {}).get("displayName")) or ""
            if ath:
                inj_index[(abbr, ath)] = it.get("status") or ""
    for mv in moves:
        st = inj_index.get((mv["team"], mv["player"]))
        if st:
            mv["corroborated"] = True
            mv["corroborated_by"] = [f"espn_injuries:status={st}"]
    for (abbr, ath), st in list(inj_index.items())[:40]:
        if st:
            moves.append(asdict(DepthChartMove(
                signal_id=f"dcm-inj-{abbr}-{len(moves)}", signal_type="depth_chart_move", team=abbr,
                player=ath,
                move_type="injury_forced" if st in ("Out", "Doubtful", "Injured Reserve") else "role_watch",
                corroborated=True, corroborated_by=[f"espn_injuries:status={st}"],
                source_headline=f"ESPN injuries feed: {ath} ({abbr}) status={st}",
                evidence_excerpt=f"status={st}", provenance=prov_news)))

    # coach-speak deltas vs stored baseline
    baseline_path = out_dir / "_baseline_coach_speak.json"
    baseline = load_baseline(baseline_path)
    today = {}
    for p in pressers + pressers_rss:
        d = today.setdefault(p["team"] or "LEAGUE",
                             {"polarity_sum": 0.0, "hedge_sum": 0.0, "n": 0})
        d["polarity_sum"] += p["polarity"]
        d["hedge_sum"] += p["hedge_rate"]
        d["n"] += 1
    deltas = []
    for team, d in sorted(today.items()):
        cur = {"polarity": round(d["polarity_sum"] / d["n"], 4),
               "hedge_rate": round(d["hedge_sum"] / d["n"], 4)}
        for metric, value in cur.items():
            base = (baseline.get(metric + "_by_team") or {}).get(team)
            rec = asdict(CoachSpeakDelta(
                signal_id=f"csd-{team}-{metric}", signal_type="coach_speak_delta", team=team,
                metric=metric, current_value=value, baseline_value=base if base is not None else 0.0,
                delta=round(value - base, 4) if base is not None else 0.0,
                direction=("up" if base is not None and value > base else
                           "down" if base is not None and value < base else "flat"),
                baseline_date=baseline.get("baseline_date", ""), doc_count=d["n"],
                status="ok" if base is not None else "baseline_established",
                note="" if base is not None else "first observation; baseline stored for next run",
                provenance=prov_news))
            deltas.append(rec)
    save_baseline(baseline_path, {
        "baseline_date": GENERATED_UTC,
        "polarity_by_team": {t: round(v["polarity_sum"] / v["n"], 4) for t, v in today.items()},
        "hedge_rate_by_team": {t: round(v["hedge_sum"] / v["n"], 4) for t, v in today.items()},
        "docs_by_team": {t: v["n"] for t, v in today.items()},
        "note": "prior-run means; the next ingest diffs against these for coach_speak_delta",
    })

    # context flags
    context = []
    idx_cur = team_game_index(games_cur)
    idx_next = team_game_index(games_next)
    for abbr, cur in sorted(idx_cur.items()):
        nxt = idx_next.get(abbr, {})
        flags, look, trap = [], False, False
        if nxt:
            if nxt.get("opp_win_pct", 0) - cur.get("opp_win_pct", 0) >= 0.25:
                flags.append("look_ahead_risk")
                look = True
            if cur.get("opp_win_pct", 1) <= 0.35 and cur.get("win_pct", 0) >= 0.6:
                flags.append("trap_spot")
                trap = True
            if cur.get("home_away") == "away" and cur.get("opp_win_pct", 1) <= 0.35:
                flags.append("road_letdown_spot")
        if abbr in byes_next:
            flags.append("pre_bye")
        context.append(asdict(GameContextFlag(
            signal_id=f"ctx-{abbr}", signal_type="game_context_flag", team=abbr, week=args.week,
            opponent=cur.get("opponent", ""), opponent_win_pct=cur.get("opp_win_pct", 0.0),
            next_opponent=nxt.get("opponent", ""), next_opponent_win_pct=nxt.get("opp_win_pct", 0.0),
            team_win_pct=cur.get("win_pct", 0.0), flags=flags, look_ahead_risk=look, trap_spot=trap,
            on_bye_this_week=False, on_bye_next_week=abbr in byes_next, pre_bye=abbr in byes_next,
            provenance=prov_sb)))
    for abbr in byes_cur:
        context.append(asdict(GameContextFlag(
            signal_id=f"ctx-bye-{abbr}", signal_type="game_context_flag", team=abbr, week=args.week,
            flags=["on_bye", "post_bye_next_game"], on_bye_this_week=True, post_bye=True,
            provenance=prov_sb)))

    # per-game aggregates -> weekly series (persisted for later runs)
    tw_path = out_dir / "_baseline_team_week_metrics.json"
    tw = load_baseline(tw_path)
    pbp_rows = []
    for g, s in summaries:
        agg = parse_summary_plays(s)
        tgt = parse_summary_targets(s)
        for abbr, d in agg.items():
            row = {"team": abbr, "week": args.week - 1, "game_id": g["event_id"], "plays": d["plays"],
                   "early_down_plays": d["early_down_plays"], "early_down_pass": d["early_down_pass"],
                   "early_down_pass_rate": round(d["early_down_pass"] / d["early_down_plays"], 4)
                   if d["early_down_plays"] else 0.0,
                   "third_down_plays": d["third_down_plays"], "third_down_pass": d["third_down_pass"],
                   "third_down_pass_rate": round(d["third_down_pass"] / d["third_down_plays"], 4)
                   if d["third_down_plays"] else 0.0,
                   "fourth_down_plays": d["fourth_down_plays"], "fourth_down_go": d["fourth_down_go"],
                   "fourth_down_go_rate": round(d["fourth_down_go"] / d["fourth_down_plays"], 4)
                   if d["fourth_down_plays"] else 0.0,
                   "timeout_mentions_in_pbp": d["timeout_mentions"],
                   "targets": {t["player"]: t["targets"] for t in tgt.get(abbr, []) or []}}
            pbp_rows.append(row)
            blk = tw.setdefault(abbr, {})
            for metric in ("early_down_pass_rate", "third_down_pass_rate", "fourth_down_go_rate", "plays"):
                blk.setdefault(metric, {})[str(args.week - 1)] = row[metric]
            for pl, tv in row["targets"].items():
                blk.setdefault("targets", {}).setdefault(pl, {})[str(args.week - 1)] = tv
    save_baseline(tw_path, tw)

    scheme, tendency = [], []
    for row in pbp_rows:
        abbr = row["team"]
        blk = tw.get(abbr, {})
        for metric, stype in (("early_down_pass_rate", "scheme_shift"),
                              ("third_down_pass_rate", "tendency_break"),
                              ("fourth_down_go_rate", "tendency_break"),
                              ("plays", "tendency_break")):
            series = [{"week": int(k), "value": v}
                      for k, v in sorted((blk.get(metric) or {}).items(), key=lambda kv: int(kv[0]))]
            unit = "plays" if metric == "plays" else "rate"
            note = "play-volume trend" if metric == "plays" else ""
            if metric == "fourth_down_go_rate":
                note = "4th-down aggressiveness; needs >=3 weekly points to call a break"
            if metric == "early_down_pass_rate":
                note = "keyless proxy for scheme change (formation/personnel data unavailable)"
            rec = trend_record(series, metric, abbr, unit, prov_pbp, stype, note=note)
            (scheme if stype == "scheme_shift" else tendency).append(rec)
        for pl, wk in (blk.get("targets") or {}).items():
            series = [{"week": int(k), "value": v}
                      for k, v in sorted(wk.items(), key=lambda kv: int(kv[0]))]
            rec = trend_record(series, "targets_per_game", abbr, "targets", prov_pbp,
                               "tendency_break",
                               note="target trend; snap counts unavailable keyless")
            rec["player"] = pl
            rec["signal_id"] = f"tb-{abbr}-targets-{pl.replace(' ', '_')}"
            tendency.append(rec)

    gaps = [
        {"metric": "challenge_success_rate", "status": "unavailable",
         "reason": "ESPN keyless summary exposes no coach-challenge outcome field; only in-play review "
                   "text. Needs a review-flag feed."},
        {"metric": "timeout_usage_exact", "status": "partial",
         "reason": "Timeouts counted by scanning play-by-play text for 'timeout'; a lower bound "
                   "(some stoppages and booth timeouts are not attributed to a team)."},
        {"metric": "scheme_formation_frequency", "status": "partial",
         "reason": "Formation/personnel frequency needs charting or tracking data. Early-down and "
                   "third-down pass rate are used as keyless proxies and labelled as proxies."},
        {"metric": "coach_speak_delta", "status": "partial",
         "reason": "Sentiment is computed from headline/description text, not full presser transcripts; "
                   "first run establishes the baseline so deltas exist from the next run onward."},
        {"metric": "snap_count_trend_break",
         "status": "proxy",
         "reason": "No keyless per-player snap-count feed exists (ESPN exposes none; PFR /football/ is "
                   "robots-disallowed). SUBSTITUTE: nflverse play-by-play play-participation share "
                   "(passer/receiver/rusher appearances / team plays), emitted as snap_trend_break "
                   "records with proxy=true. True snap counts need the nflverse snap_counts release "
                   "or a licensed feed."},
    ]

    # ---------------- locally-derived layer (zero network requests) ----------------
    # Reads in-repo nflverse artifacts under intelligence/coaching/data/. Adds the
    # weekly scheme/tendency/target/depth-chart/timeout/fourth-down/bye families that
    # the keyless live layer cannot reach. Every record carries an artifact path + sha256.
    local = None
    if args.local:
        local = local_layer.build_local_signals(
            week=args.week, generated_utc=GENERATED_UTC,
            max_moves_per_team=args.max_moves_per_team,
            byes_current=byes_cur, byes_next=byes_next)
        gaps.extend(local["gaps"])

    # ---------------- digest ----------------
    counts = {
        "presser_sentiment": len(pressers) + len(pressers_rss),
        "coach_speak_delta": len(deltas),
        "depth_chart_move": len(moves),
        "scheme_shift": len(scheme),
        "tendency_break": len(tendency),
        "game_context_flag": len(context),
    }
    sigs = {
        "presser_sentiment": pressers + pressers_rss,
        "coach_speak_delta": deltas,
        "depth_chart_move": list(moves),
        "scheme_shift": list(scheme),
        "tendency_break": list(tendency),
        "game_context_flag": context,
    }
    if local is not None:
        for k, v in local["counts"].items():
            counts[k] = counts.get(k, 0) + v
        for k, v in local["signals"].items():
            sigs.setdefault(k, []).extend(v)
        # the local depth-chart diff corroborates headline-derived move candidates
        local_moves = local["signals"].get("depth_chart_move", [])
        for mv in sigs["depth_chart_move"]:
            if mv.get("corroborated"):
                continue
            hits = [lm for lm in local_moves
                    if lm.get("player") and mv.get("player")
                    and lm["player"].split()[-1].lower() == str(mv["player"]).split()[-1].lower()
                    and lm.get("team") == mv.get("team")]
            if hits:
                mv["corroborated"] = True
                mv["corroborated_by"] = [f"local_depth_chart:{hits[0]['move_type']}"
                                         f"@{hits[0]['snapshot_cur_utc']}"]

    digest = {
        "generated_utc": GENERATED_UTC,
        "domain": "2.4 cognitive/behavioral",
        "week": args.week,
        "spec": "docs/ops/COGNITIVE-INGEST-2026-10-13.md",
        "counts": counts,
        "sources": f.status,
        "requests_used": f.n_requests,
        "errors": f.errors,
        "unavailable_or_partial": gaps,
        "coach_speak_flagged_articles": (flagged + flagged_rss)[:40],
        "play_by_play_week_rows": pbp_rows,
        "local_derived_layer": {
            "enabled": local is not None,
            "zero_network_requests": True,
            "artifacts": (local or {}).get("artifacts", []),
            "counts": (local or {}).get("counts", {}),
            "adjustments_week_used": (local or {}).get("adjustments_week_used"),
            "note": ("local layer reads intelligence/coaching/data/ nflverse artifacts; "
                     "it issues no HTTP requests"),
        },
        "signals": sigs,
    }
    digest_path = out_dir / "cognitive_signals.json"
    digest_path.write_text(json.dumps(digest, indent=1), encoding="utf-8")

    md = ["# Cognitive / behavioral signal digest — 2026-10-13", "",
          f"- generated_utc: `{GENERATED_UTC}`",
          "- domain: 2.4 cognitive/behavioral (GSE signal universe)",
          f"- NFL week in view: {args.week}",
          f"- keyless requests issued by this run: {f.n_requests}",
          f"- errors: {len(f.errors)}", "", "## Counts", "",
          "| signal_type | records |", "|---|---|"]
    for k, v in digest["counts"].items():
        md.append(f"| {k} | {v} |")
    md += ["", "## Sources (keyless, public)", ""]
    for s in f.status:
        md.append(f"- {'OK' if s['ok'] else 'FAIL'} — {s['label']}: {s['url']}"
                  + (f" ({s.get('bytes')} bytes)" if s["ok"] else f" — {s.get('error')}"))
    md += ["", "## Presser / coach-speak sentiment records", ""]
    for p in (pressers + pressers_rss)[:20]:
        md.append(f"- **{p['team']}** polarity={p['polarity']} ({p['sentiment_label']}) "
                  f"hedge_rate={p['hedge_rate']} flags={p['word_choice_flags']} — "
                  f"{(p.get('evidence_excerpt') or '')[:170]}")
    md += ["", "## Depth-chart / roster move candidates", ""]
    for m in moves[:25]:
        md.append(f"- **{m['team']}** {m['player'] or '—'} move_type={m['move_type']} "
                  f"corroborated={m['corroborated']}{m['corroborated_by']} — "
                  f"{(m.get('source_headline') or '')[:130]}")
    md += ["", "## Context flags (trap / look-ahead / bye)", ""]
    for c in context:
        if c["flags"]:
            md.append(f"- **{c['team']}** wk{c['week']} vs {c['opponent'] or '—'} "
                      f"({c['opponent_win_pct']}) next {c['next_opponent'] or '—'} "
                      f"({c['next_opponent_win_pct']}) — {c['flags']}")
    md += ["", "## Scheme / tendency series", ""]
    for r in (scheme + tendency)[:40]:
        md.append(f"- **{r['team']}** {r['signal_type']}/{r['metric']} "
                  f"series={r['series']} status={r['status']} z={r.get('z_score')}")
    md += ["", "## Unavailable or partial metrics (honest gaps)", ""]
    for g in gaps:
        md.append(f"- **{g['metric']}** — {g['status']}: {g['reason']}")

    if local is not None:
        md += ["", "## Locally-derived layer (zero network requests)", "",
               "Reads in-repo nflverse artifacts under `intelligence/coaching/data/`. "
               "Each record carries `provenance.source_path` and "
               "`provenance.artifact_sha256`, so every number is re-derivable.", "",
               "| signal_type | records |", "|---|---|"]
        for k, v in sorted(local["counts"].items()):
            md.append(f"| {k} | {v} |")
        md += ["", "### Scheme shifts (weekly, prior-season pooled baseline)", ""]
        for r in local["signals"]["scheme_shift"]:
            if r["status"] in ("break", "break_candidate"):
                md.append(f"- **{r['team']}** {r['metric']} last={r.get('last_value')} "
                          f"base={r.get('baseline_mean')} delta={r.get('delta')} "
                          f"z={r.get('z_score')} ({r.get('status')}, n={r.get('baseline_n')})")
        md += ["", "### Tendency breaks (weekly, prior-week baseline)", ""]
        for r in local["signals"]["tendency_break"]:
            if r["status"] in ("break", "break_candidate"):
                md.append(f"- **{r['team']}** {r['metric']} "
                          f"{r.get('player') or ''} last={r.get('last_value')} "
                          f"base={r.get('baseline_mean')} delta={r.get('delta')} "
                          f"z={r.get('z_score')} ({r.get('status')}, n={r.get('baseline_n')})")
        md += ["", "### Snap-count trend breaks (play-participation share PROXY)", "",
               "True snap counts are not available keyless; this is the share of the team's "
               "plays a player appears on as passer/receiver/rusher.", ""]
        for r in local["signals"]["snap_trend_break"]:
            if r["status"] in ("break", "break_candidate"):
                md.append(f"- **{r['team']}** {r.get('player') or ''} "
                          f"last={r.get('last_value')} delta={r.get('delta')} "
                          f"z={r.get('z_score')} ({r.get('status')}, n={r.get('baseline_n')})")
        md += ["", "### Depth-chart moves (snapshot diff)", ""]
        for r in local["signals"]["depth_chart_move"][:20]:
            md.append(f"- **{r['team']}** {r.get('player') or '—'} {r.get('move_type')} "
                      f"rank {r.get('old_rank')} -> {r.get('new_rank')} "
                      f"(snapshots {r.get('snapshot_prev_utc')} .. {r.get('snapshot_cur_utc')})"
                      + (f" — {r['note']}" if r.get("move_type", "").endswith("note") else ""))
        md += ["", "### Fourth-down aggressiveness (weekly + season baseline)", ""]
        for r in local["signals"]["fourth_down_trend"][:20]:
            md.append(f"- **{r['team']}** go4th_rate last={r.get('last_value')} "
                      f"base={r.get('baseline_mean')} delta={r.get('delta')} "
                      f"dir={r.get('direction')} ({r.get('status')})")
        md += ["", "### Timeout usage", ""]
        for r in local["signals"]["timeout_usage"]:
            md.append(f"- **{r['team']}** timeouts_per_game={r.get('value')} "
                      f"n_games={r.get('n_games')}"
                      + (f" share_before_2mw={r['share_before_2mw']}" if "share_before_2mw" in r else ""))
        md += ["", "### Spot patterns (bye position)", ""]
        for r in local["signals"]["spot_pattern"]:
            if r["flags"]:
                md.append(f"- **{r['team']}** {r['flags']} (authoritative_bye={r['bye_authoritative']})")

    if f.errors:
        md += ["", "## Source errors this run", ""]
        for e in f.errors:
            md.append(f"- {e['label']}: {e['error']}")
    md_path = out_dir / "cognitive_signals.md"
    md_path.write_text("\n".join(md) + "\n", encoding="utf-8")

    print("[cognitive] counts: " + ", ".join(f"{k}={v}" for k, v in digest["counts"].items()))
    print(f"[cognitive] pbp_rows={len(pbp_rows)} summaries={len(summaries)} "
          f"byes_cur={byes_cur} byes_next={byes_next}")
    if local is not None:
        print("[cognitive] local: " + ", ".join(f"{k}={v}" for k, v in local["counts"].items()))
        print("[cognitive] local gaps: " +
              "; ".join(f"{g['metric']}={g['status']}" for g in local["gaps"]))
    print(f"[cognitive] requests={f.n_requests} errors={len(f.errors)} "
          f"(local layer: 0 requests)")
    print(f"[cognitive] wrote {digest_path} and {md_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
