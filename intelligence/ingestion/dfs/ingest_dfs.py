"""DFS signal ingestion — keyless, stdlib-only, provenance-first.

WHAT THIS DOES
  1. DraftKings DFS lobby (`GET /lobby/getcontests?sport=NFL`) — robots-ALLOWED,
     keyless. Yields contest shape, field size, entry fee, prize pool, per-user
     entry cap and start time for every live NFL contest. This is the source for
     the "tournament vs cash" and "payout structure effects" signals.
  2. Google News RSS — four sanctioned, keyless queries for the ownership /
     chalk / leverage / stack narrative. Titles + links + pubDate are parsed and
     classified; any explicit ownership percentage in a title is extracted with
     its surrounding evidence string.
  3. Repo-local DFS assets, re-used rather than re-derived:
       - data/gse-dataset/current/DKSalaries-*.csv  -> value-curve points,
         positional scarcity, punt plays (cash floor / GPP ceiling proxies).
       - docs/dfs/research/2026-10-13/slate_boards.json -> slate universe and
         game lists (DK census artifact, pulled keyless 2026-10-11).
       - apps/web/lib/fantasy/dfs-correlation.ts -> the shipped team/game load
         factor model; stack correlations are computed FROM those loadings.
       - docs/dfs/research/2026-10-01/full-tables/cmain7-tnf-ownership-*.csv ->
         ownership projection-vs-actual error calibration.

WHAT THIS DELIBERATELY DOES NOT DO
  `/lineup/getavailableplayers?draftGroupId=...` is DISALLOWED by
  https://www.draftkings.com/robots.txt (`Disallow: /lineup/`). The repo's own
  data-ingestion client pulls it; this pipeline does not. Live per-player salary
  for today's slate therefore comes from repo artifacts with an explicit as-of
  date, never from a disallowed path. See the spec in
  docs/ops/DFS-INGEST-2026-10-13.md for the licensed/session-lane alternative.

RATE DISCIPLINE
  One request at a time, >=1.1s apart, hard cap `MAX_REQUESTS`. Every request is
  logged with status, byte count and sha256. A source that fails is reported as
  failed; no field is ever invented to fill a gap.

Usage
-----
    python intelligence/ingestion/dfs/ingest_dfs.py
    python intelligence/ingestion/dfs/ingest_dfs.py --out-dir docs/data-sources/research/2026-10-13/dfs
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUT = REPO_ROOT / "docs" / "data-sources" / "research" / "2026-10-13" / "dfs"
SCRATCH = Path.home() / "AppData" / "Local" / "Temp" / "gse_dfs_ingest"

DK_BASE = "https://www.draftkings.com"
DK_ROBOTS = DK_BASE + "/robots.txt"
DK_LOBBY = DK_BASE + "/lobby/getcontests?sport=NFL"
ROBOTS_BLOCKED_DK_PATHS = ["/lineup/"]  # disclosed, not called

UA = (
    "GSE-DataIngestion/1.0 (+research; contact: repo owner) "
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
HEADERS = {"User-Agent": UA, "Accept": "application/json,text/html,application/xml,text/xml,*/*"}

NEWS_FEEDS = {
    "google_news_dfs_ownership": "https://news.google.com/rss/search?q=%22ownership%22+DFS+NFL&hl=en-US&gl=US&ceid=US:en",
    "google_news_dfs_chalk": "https://news.google.com/rss/search?q=NFL+DFS+chalk+plays&hl=en-US&gl=US&ceid=US:en",
    "google_news_dfs_leverage": "https://news.google.com/rss/search?q=NFL+DFS+leverage+contrarian&hl=en-US&gl=US&ceid=US:en",
    "google_news_dfs_stacks": "https://news.google.com/rss/search?q=NFL+DFS+stacks+bring-back&hl=en-US&gl=US&ceid=US:en",
}

MIN_INTERVAL_S = 1.1
MAX_REQUESTS = 25
_request_log: list[dict] = []


# --------------------------------------------------------------------------- #
# fetch layer
# --------------------------------------------------------------------------- #
def _throttle(last: list[float]) -> None:
    """Keep one clock in a list so callers can share it across calls."""
    now = time.monotonic()
    wait = MIN_INTERVAL_S - (now - last[-1]) if last else 0.0
    if wait > 0:
        time.sleep(wait)
    last.append(time.monotonic())


def fetch(url: str, last: list[float], label: str, timeout: int = 25) -> tuple[int, bytes] | None:
    """One GET. Returns (status, body) or None on failure. Never raises."""
    if len(_request_log) >= MAX_REQUESTS:
        _request_log.append({"label": label, "url": url, "status": None,
                             "error": f"request cap {MAX_REQUESTS} reached"})
        return None
    _throttle(last)
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            _request_log.append({"label": label, "url": url, "status": resp.status,
                                 "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()[:16]})
            return resp.status, body
    except urllib.error.HTTPError as exc:
        _request_log.append({"label": label, "url": url, "status": exc.code, "error": str(exc)})
        return None
    except Exception as exc:  # noqa: BLE001 - honesty: record, never invent
        _request_log.append({"label": label, "url": url, "status": None, "error": f"{type(exc).__name__}: {exc}"})
        return None


# --------------------------------------------------------------------------- #
# 1. DraftKings lobby -> contest shape + payout structure
# --------------------------------------------------------------------------- #
def _dk_robots_blocked_paths(body: bytes) -> set[str]:
    text = body.decode("utf-8", "ignore")
    blocked = set()
    for line in text.splitlines():
        line = line.strip()
        if line.lower().startswith("disallow:"):
            path = line.split(":", 1)[1].strip()
            if path:
                blocked.add(path)
    return blocked


def dk_lobby(last: list[float]) -> dict:
    out: dict = {"source": "draftkings_lobby", "url": DK_LOBBY, "ok": False}
    robots = fetch(DK_ROBOTS, last, "draftkings_robots")
    blocked: set[str] = set()
    if robots:
        blocked = _dk_robots_blocked_paths(robots[1])
        out["robots_checked"] = True
        out["robots_disallow_paths"] = sorted(blocked)[:40]
        out["lobby_path_allowed"] = not any(DK_LOBBY.replace(DK_BASE, "").startswith(p) for p in blocked)
        out["disallowed_paths_not_called"] = ROBOTS_BLOCKED_DK_PATHS
        out["disallowed_paths_present_in_robots"] = [p for p in ROBOTS_BLOCKED_DK_PATHS if p in blocked]
    else:
        out["robots_checked"] = False
        out["lobby_path_allowed"] = None  # unknown -> caller decides; we still GET only the lobby
    if out.get("lobby_path_allowed") is False:
        out["error"] = "lobby path appears in robots Disallow; refusing to fetch"
        return out

    got = fetch(DK_LOBBY, last, "draftkings_lobby_contests")
    if not got:
        out["error"] = "fetch failed"
        return out
    status, body = got
    out["http_status"] = status
    out["raw_bytes"] = len(body)
    out["raw_sha256"] = hashlib.sha256(body).hexdigest()
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        out["error"] = f"json decode: {exc}"
        return out

    contests = payload.get("Contests") or []
    out["contest_count"] = len(contests)
    groups = payload.get("DraftGroups") or []
    out["draft_group_count"] = len(groups)

    def num(v):
        return v if isinstance(v, (int, float)) else None

    # Field semantics of the raw keys, as observed and arithmetic-checked:
    #   po  = prize pool ($), a = entry fee ($), m = total field cap,
    #   mec = per-user entry cap, nt = entries registered at pull time,
    #   dg  = draft group id, sdstring/sd = start time, tmpl = template id.
    # "a" as cents would imply impossible field sizes for the big contests
    # (e.g. po 2,750,000 at "a"=20 -> 16M entries), so "a" is read as dollars.
    rows = []
    for c in contests:
        po, fee, field, mecup, entries = num(c.get("po")), num(c.get("a")), num(c.get("m")), num(c.get("mec")), num(c.get("nt"))
        if po is None or fee is None or field is None or field <= 0:
            continue
        gross_at_cap = fee * field
        rows.append({
            "contest_id": c.get("id"),
            "name": c.get("n"),
            "draft_group_id": c.get("dg"),
            "game_type": c.get("gameType"),
            "entry_fee_usd": fee,
            "field_cap": field,
            "max_entries_per_user": mecup,
            "entries_at_pull": entries,
            "prize_pool_usd": po,
            "top_prize_usd": _top_prize(c),
            "guaranteed": str((c.get("attr") or {}).get("IsGuaranteed", "")).lower() == "true",
            "start_est": c.get("sdstring"),
            "gross_entry_at_cap_usd": round(gross_at_cap, 2),
            "implied_rake_at_cap": round(1 - po / gross_at_cap, 4) if gross_at_cap > 0 else None,
            "fill_pct_at_pull": round(100.0 * entries / field, 2) if entries is not None and field else None,
        })
    out["parsed_contest_rows"] = len(rows)
    out["contest_rows"] = rows

    shapes = []
    for r in rows:
        shapes.append({
            "record_type": "contest_shape",
            "contest_id": r["contest_id"],
            "draft_group_id": r["draft_group_id"],
            "game_type": r["game_type"],
            "field_cap": r["field_cap"],
            "entry_fee_usd": r["entry_fee_usd"],
            "max_entries_per_user": r["max_entries_per_user"],
            "single_entry": r["max_entries_per_user"] == 1,
            "start_est": r["start_est"],
            "size_class": _size_class(r["field_cap"]),
            "mode_advice": _mode_advice(r["field_cap"], r["max_entries_per_user"]),
            "late_swap_eligible": _late_swap(r["game_type"], r["start_est"]),
            "basis": "draftkings_lobby_observed",
            "as_of_utc": None,  # filled by caller
        })
    out["contest_shapes"] = shapes

    payout = []
    for r in rows:
        if r["top_prize_usd"] is None or not r["prize_pool_usd"]:
            continue
        payout.append({
            "record_type": "payout_structure_point",
            "contest_id": r["contest_id"],
            "field_cap": r["field_cap"],
            "entry_fee_usd": r["entry_fee_usd"],
            "prize_pool_usd": r["prize_pool_usd"],
            "top_prize_usd": r["top_prize_usd"],
            "top_prize_share": round(r["top_prize_usd"] / r["prize_pool_usd"], 4),
            "implied_rake_at_cap": r["implied_rake_at_cap"],
            "top_heavy": (r["top_prize_usd"] / r["prize_pool_usd"]) >= 0.25,
            "basis": "draftkings_lobby_observed",
        })
    out["payout_points"] = payout
    out["ok"] = True
    return out


def _top_prize(c: dict) -> float | None:
    meta = c.get("payoutDescriptionMetadata")
    best = None
    if isinstance(meta, list):
        for row in meta:
            if not isinstance(row, dict):
                continue
            val = row.get("Value")
            if isinstance(val, (int, float)) and (best is None or val > best):
                best = float(val)
            desc = row.get("PayoutDescription")
            if isinstance(desc, str):
                m = re.search(r"\$([\d,]+)", desc)
                if m:
                    v = float(m.group(1).replace(",", ""))
                    if best is None or v > best:
                        best = v
    return best


def _size_class(field: int) -> str:
    if field <= 100:
        return "micro"
    if field <= 2_000:
        return "small"
    if field <= 25_000:
        return "medium"
    return "large"


def _mode_advice(field: int, mecup: int | None) -> str:
    if mecup == 1 and field <= 2_000:
        return "cash_or_small_gpp"
    if field >= 25_000:
        return "gpp_leverage"
    if field >= 2_000:
        return "gpp"
    return "cash"


def _late_swap(game_type: str | None, start_est: str | None) -> bool:
    gt = (game_type or "").lower()
    st = (start_est or "").lower()
    if "showdown" in gt or "captain" in gt:
        return True
    return any(k in st for k in ("sun 4", "sun 8", "sun 1:00", "mon", "thu", "sat", "pm"))


# --------------------------------------------------------------------------- #
# 2. Google News RSS -> ownership / chalk / leverage narrative
# --------------------------------------------------------------------------- #
_CHALK_WORDS = ("chalk", "popular", "most-owned", "most owned", "highly owned", "ownership anchor", "consensus")
_LEV_WORDS = ("leverage", "contrarian", "low-owned", "low owned", "under-owned", "underowned", "pivot", "differentiat")
_STACK_WORDS = ("stack", "bring-back", "bring back", "game stack", "correlat")
_PUNT_WORDS = ("punt", "value play", "cheap", "salary relief")
_SWAP_WORDS = ("late swap", "late-swap", "swap")

_PCT_RE = re.compile(r"(?P<num>\d{1,2}(?:\.\d)?)\s?%")

_SOURCE_TAG_RE = re.compile(r"[^a-z0-9]+")


def _slug(text: str) -> str:
    return _SOURCE_TAG_RE.sub("-", (text or "").lower()).strip("-")[:40]


def news_feeds(last: list[float], out_dir: Path) -> dict:
    out: dict = {"source": "google_news_rss", "ok": False, "feeds": {}}
    total_items = 0
    for key, url in NEWS_FEEDS.items():
        got = fetch(url, last, key)
        if not got:
            out["feeds"][key] = {"url": url, "ok": False, "error": "fetch failed"}
            continue
        status, body = got
        try:
            raw_path = out_dir / f"{key}.xml"
            raw_path.write_bytes(body)
        except OSError as exc:
            out["feeds"][key] = {"url": url, "ok": False, "error": f"write: {exc}"}
            continue
        items = _parse_rss(body)
        total_items += len(items)
        out["feeds"][key] = {
            "url": url, "ok": True, "http_status": status, "raw_bytes": len(body),
            "raw_file": raw_path.name, "item_count": len(items), "items": items,
        }
    out["ok"] = total_items > 0
    out["item_total"] = total_items
    return out


def _parse_rss(body: bytes) -> list[dict]:
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return []
    items = []
    for it in root.iter("item"):
        def txt(tag):
            el = it.find(tag)
            return (el.text or "").strip() if el is not None and el.text else ""
        items.append({
            "title": txt("title"),
            "link": txt("link"),
            "pub_date": txt("pubDate"),
            "source": txt("source"),
        })
    return items


def classify_news(news: dict, generated_utc: str, player_index: dict[str, str] | None = None) -> dict:
    """Turn headlines into typed narrative records. Numbers are quoted, not modelled.

    Player names are validated against the repo salary roster when available; a name
    that is only guessed from the headline is marked as such, never presented as ID'd.
    Records with the same headline across feeds are collapsed into one row.
    """
    recs: dict = {
        "ownership_projection": [], "chalk_flag": [], "leverage_spot": [],
        "narrative_mention": [],
    }
    for key, feed in news.get("feeds", {}).items():
        if not feed.get("ok"):
            continue
        for item in feed.get("items", []):
            title = item.get("title", "")
            low = title.lower()
            base = {
                "source": "google_news_rss", "feed": key, "source_url": item.get("link"),
                "headline": title, "publisher": item.get("source"),
                "published": item.get("pub_date"), "as_of_utc": generated_utc,
            }
            hit = False
            pcts = _PCT_RE.findall(title)
            player, match_method = _player_match(title, player_index)
            verified = match_method == "roster_match"
            if pcts:
                hit = True
                recs["ownership_projection"].append({
                    "record_type": "ownership_projection",
                    "player_hint": player,
                    "player_match_method": match_method,
                    "is_roster_player": verified,
                    "projected_ownership_pct": [float(p) for p in pcts],
                    "evidence": _pct_evidence(title),
                    "site_hint": "draftkings" if "draftkings" in low else ("fanduel" if "fanduel" in low else None),
                    "source_type": "public_article",
                    "confidence": "low_quote_in_headline",
                    **base,
                })
            if any(w in low for w in _CHALK_WORDS):
                hit = True
                recs["chalk_flag"].append({
                    "record_type": "chalk_flag",
                    "subject": player,
                    "player_match_method": match_method,
                    "is_roster_player": verified,
                    "flag": "chalk_anchor",
                    "ownership_pct": [float(p) for p in pcts] or None,
                    "basis": "public_narrative_keyword",
                    "source_type": "public_article",
                    **base,
                })
            if any(w in low for w in _LEV_WORDS):
                hit = True
                recs["leverage_spot"].append({
                    "record_type": "leverage_spot",
                    "subject": player,
                    "player_match_method": match_method,
                    "is_roster_player": verified,
                    "flag": "contrarian_candidate",
                    "ownership_pct": [float(p) for p in pcts] or None,
                    "basis": "public_narrative_keyword",
                    "source_type": "public_article",
                    **base,
                })
            if not hit:
                recs["narrative_mention"].append({
                    "record_type": "narrative_mention",
                    "tags": _tags(low),
                    "source_type": "public_article",
                    **base,
                })
    return {k: _dedupe_records(v) for k, v in recs.items()}


def _tags(low: str) -> list[str]:
    tags = []
    if any(w in low for w in _STACK_WORDS):
        tags.append("stack")
    if any(w in low for w in _PUNT_WORDS):
        tags.append("value")
    if any(w in low for w in _SWAP_WORDS):
        tags.append("late_swap")
    if any(w in low for w in _CHALK_WORDS):
        tags.append("chalk")
    if any(w in low for w in _LEV_WORDS):
        tags.append("leverage")
    return tags or ["general"]


_PLAYER_HINT_STOP = {
    "nfl", "dfs", "week", "draftkings", "fanduel", "ownership", "chalk", "leverage",
    "contrarian", "plays", "picks", "stacks", "stack", "value", "cash", "gpp",
    "tournament", "lineup", "lineups", "best", "top", "for", "the", "and", "vs",
    # publisher / column furniture that the heuristic otherwise reads as a name
    "first", "look", "early", "late", "values", "fantasy", "alarm", "stokastic",
    "rotowire", "rotoballer", "numberfire", "pff", "pro", "football", "focus",
    "action", "network", "sports", "illustrated", "athletic", "news", "report",
    "strategy", "advice", "tips", "sleeper", "sleepers", "breakout", "preview",
    "recap", "podcast", "video", "analysis", "projections", "optimizer", "picks",
    "contest", "contests", "millionaire", "milly", "maker", "showdown", "classic",
    "buy", "low", "sell", "high", "draft", "season", "playbook", "cheat", "sheet",
    "rankings", "tiers", "salaries", "salary", "cap", "lineup", "advice", "guys",
    "game", "theory", "behind", "wins", "winning", "big", "small", "field", "lineups",
    "anchor", "bring", "back", "bringback", "swap", "late", "swap", "punt", "puntplay",
    "post", "york", "new", "most", "popular", "players", "main", "slate", "how", "to",
    "win", "model", "player", "conference", "championships", "question", "notes",
    "fade", "fades", "gpps", "cpr", "build", "around", "det", "atl", "sea", "den",
    "kc", "buf", "phi", "dal", "sf", "lar", "nyg", "nyj", "pit", "bal", "cin", "cle",
    "ari", "gb", "min", "chi", "tb", "no", "car", "was", "hou", "ind", "jax", "ten",
}


def _player_hint(title: str) -> str | None:
    """Best-effort player-name hint from a headline. Null when nothing fits.

    Column furniture ("Main Slate", "New York Post", "Most Popular Players") is in
    the stop set, so a leftover single capitalised token in a two-word part is
    treated as a surname ("Kamara Question" -> "Kamara").
    """
    parts = re.split(r"[-–|:,(]", title)
    for part in parts:
        words = [w for w in re.findall(r"[A-Za-z'\.\-]+", part) if w]
        cap = [w for w in words if w[:1].isupper() and w.lower().strip(".") not in _PLAYER_HINT_STOP]
        if len(cap) >= 2:
            return " ".join(cap[:3])
        if len(cap) == 1 and len(words) == 2:
            return cap[0]
    return None


def _norm_name(name: str) -> str:
    """Normalise a name for roster matching: lowercase, strip punctuation/suffixes."""
    s = name.lower()
    s = re.sub(r"\b(jr|sr|ii|iii|iv|v)\.?\b", " ", s)
    s = re.sub(r"[^a-z ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def build_player_index(sal: dict) -> dict[str, str]:
    """Map normalised roster name -> canonical roster name, from the repo salary export.

    Used to *validate* headline name guesses against real players on the slate.
    A headline token that is not on the roster is a guess, not an identification.
    """
    index: dict[str, str] = {}
    if not sal.get("ok"):
        return index
    for row in sal.get("rows", []):
        name = row.get("name") or ""
        n = _norm_name(name)
        if n:
            index[n] = name
    return index


def _player_match(title: str, index: dict[str, str] | None = None) -> tuple[str | None, str]:
    """(player, match_method). 'roster_match' only when the name is on the real roster."""
    if index:
        norm = " " + _norm_name(title) + " "
        # longest roster names first so 'A.J. Brown' beats 'Brown' style fragments
        best = None
        for n, canonical in index.items():
            if f" {n} " in norm or norm.startswith(n + " "):
                if best is None or len(n) > len(best[0]):
                    best = (n, canonical)
        if best:
            return best[1], "roster_match"
    guess = _player_hint(title)
    return guess, "heuristic_headline_guess" if guess else "none"


def _dedupe_records(records: list[dict]) -> list[dict]:
    """Collapse one headline that surfaced in several feeds into a single record.

    The same article is returned by more than one Google News RSS query; counting it
    once keeps the feed honest. Feeds and URLs are merged into lists.
    """
    merged: dict[str, dict] = {}
    order: list[str] = []
    for rec in records:
        key = (rec.get("headline") or "").strip().lower()
        if key not in merged:
            keep = dict(rec)
            keep["feeds"] = [rec["feed"]] if rec.get("feed") else []
            keep["source_urls"] = [rec["source_url"]] if rec.get("source_url") else []
            merged[key] = keep
            order.append(key)
            continue
        keep = merged[key]
        if rec.get("feed") and rec["feed"] not in keep["feeds"]:
            keep["feeds"].append(rec["feed"])
        if rec.get("source_url") and rec["source_url"] not in keep["source_urls"]:
            keep["source_urls"].append(rec["source_url"])
    out: list[dict] = []
    for key in order:
        rec = merged[key]
        rec["feeds"] = sorted(f for f in rec["feeds"] if f)
        rec["feed"] = rec["feeds"][0] if rec["feeds"] else None
        rec["feed_count"] = len(rec["feeds"])
        rec["source_urls"] = sorted(u for u in rec["source_urls"] if u)
        rec["dedupe_key"] = "headline_lower"
        out.append(rec)
    return out


def _pct_evidence(title: str) -> str:
    m = _PCT_RE.search(title)
    if not m:
        return title
    start = max(0, m.start() - 45)
    end = min(len(title), m.end() + 25)
    return title[start:end].strip()


# --------------------------------------------------------------------------- #
# 3. Repo assets
# --------------------------------------------------------------------------- #
def repo_salary_csv() -> dict:
    """Newest DK salary export in data/gse-dataset/current/, parsed for the curve."""
    out: dict = {"source": "repo_salary_csv", "ok": False}
    cands = sorted((REPO_ROOT / "data" / "gse-dataset" / "current").glob("DKSalaries*.csv"))
    if not cands:
        out["error"] = "no DKSalaries*.csv in data/gse-dataset/current"
        return out
    path = cands[-1]
    rows = []
    try:
        text = path.read_text(encoding="utf-8-sig", errors="ignore")
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            try:
                salary = float(str(row.get("Salary", "")).replace(",", "").strip())
                ppg = float(str(row.get("AvgPointsPerGame", "")).strip())
            except (TypeError, ValueError):
                continue
            pos = (row.get("Roster Position") or row.get("Position") or "").strip()
            name = (row.get("Name") or "").strip()
            if not name or salary <= 0:
                continue
            rows.append({"name": name, "pos": pos.split("/")[0], "salary": salary,
                         "avg_points_per_game": ppg, "game_info": (row.get("Game Info") or "").strip(),
                         "team": (row.get("TeamAbbrev") or "").strip()})
    except OSError as exc:
        out["error"] = f"read: {exc}"
        return out
    if not rows:
        out["error"] = "parsed zero rows"
        return out
    out["ok"] = True
    out["path"] = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
    out["as_of"] = "repo artifact; filename date is the export week, NOT today"
    out["row_count"] = len(rows)
    out["rows"] = rows
    return out


def value_curve_and_scarcity(sal: dict, generated_utc: str) -> dict:
    """Value-curve points, positional scarcity and punt plays from the salary export."""
    out = {"value_curve_point": [], "positional_scarcity": [], "punt_play": []}
    if not sal.get("ok"):
        return out
    rows = sal["rows"]
    path = sal["path"]
    by_pos = defaultdict(list)
    for r in rows:
        by_pos[r["pos"]].append(r)

    for pos, prs in sorted(by_pos.items()):
        prs_sorted = sorted(prs, key=lambda x: -x["salary"])
        for r in prs_sorted[:8]:
            out["value_curve_point"].append({
                "record_type": "value_curve_point",
                "pos": pos,
                "player": r["name"],
                "team": r["team"],
                "salary": r["salary"],
                "avg_points_per_game": r["avg_points_per_game"],
                "points_per_1k_salary": round(r["avg_points_per_game"] / (r["salary"] / 1000.0), 3),
                "tier": "premium",
                "provenance": path,
                "as_of_utc": generated_utc,
                "note": "avg points per game is the export's own column; not a projection",
            })
        sal_vals = [p["salary"] for p in prs]
        pts = [p["avg_points_per_game"] for p in prs]
        med_sal = _median(sal_vals)
        med_pts = _median(pts)
        out["positional_scarcity"].append({
            "record_type": "positional_scarcity",
            "pos": pos,
            "players_in_pool": len(prs),
            "median_salary": med_sal,
            "median_avg_points_per_game": med_pts,
            "premium_share_salary_ge_7000": round(sum(1 for s in sal_vals if s >= 7000) / len(sal_vals), 4),
            "players_at_max_salary": sum(1 for s in sal_vals if s >= max(sal_vals)),
            "points_per_1k_at_median": round(med_pts / (med_sal / 1000.0), 3) if med_sal else None,
            "provenance": path,
            "as_of_utc": generated_utc,
        })
        # punt plays: cheapest quartile, ranked by points per $1k
        cheapest = sorted(prs, key=lambda x: x["salary"])[: max(3, len(prs) // 4)]
        for r in sorted(cheapest, key=lambda x: -(x["avg_points_per_game"] / (x["salary"] / 1000.0)))[:3]:
            out["punt_play"].append({
                "record_type": "punt_play",
                "pos": pos,
                "player": r["name"],
                "team": r["team"],
                "salary": r["salary"],
                "avg_points_per_game": r["avg_points_per_game"],
                "points_per_1k_salary": round(r["avg_points_per_game"] / (r["salary"] / 1000.0), 3),
                "basis": "cheapest_quartile_by_points_per_1k",
                "provenance": path,
                "as_of_utc": generated_utc,
                "note": "cash-floor style cheapness read; ownership unknown in this source",
            })
    return out


def _median(vals: list[float]) -> float | None:
    if not vals:
        return None
    s = sorted(vals)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else round((s[mid - 1] + s[mid]) / 2.0, 2)


def slate_boards() -> dict:
    """DK census artifact: slate universe + game lists, pulled keyless 2026-10-11."""
    out: dict = {"source": "repo_slate_boards", "ok": False}
    cands = sorted(REPO_ROOT.glob("docs/dfs/research/*/slate_boards.json"))
    if not cands:
        out["error"] = "no slate_boards.json under docs/dfs/research/"
        return out
    path = cands[-1]
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except (OSError, json.JSONDecodeError) as exc:
        out["error"] = f"read: {exc}"
        return out
    slates = []
    for key, val in data.items():
        if not isinstance(val, dict):
            continue
        games = val.get("games") or {}
        slates.append({
            "draft_group_id": key,
            "name": val.get("name"),
            "n_players": val.get("n_players"),
            "positions": val.get("pos"),
            "games": list(games)[:40] if isinstance(games, dict) else [],
            "game_count": len(games) if hasattr(games, "__len__") else None,
        })
    out["ok"] = bool(slates)
    out["path"] = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
    out["as_of"] = "2026-10-11 keyless pull"
    out["slate_count"] = len(slates)
    out["slates"] = slates
    return out


_CORR_LOAD_RE = re.compile(r"(\w+):\s*(0?\.\d+)")


def _parse_load_block(src: str, name: str) -> dict[str, float]:
    m = re.search(name + r"\s*[:=].*?\{([^}]*)\}", src, re.S)
    if not m:
        return {}
    return {k: float(v) for k, v in _CORR_LOAD_RE.findall(m.group(1))}


def stack_correlations(generated_utc: str) -> dict:
    """Stack correlations COMPUTED from the shipped load model in dfs-correlation.ts.

    The model is a one-factor-per-axis read: correlation between two legs is the
    dot product of their team-load and game-load vectors, negated across the
    opposing-DST axis. Loadings are parsed from the repo file; if the parse
    fails we report a gap rather than assume numbers.
    """
    out: dict = {"source": "repo_dfs_correlation_ts", "ok": False, "records": []}
    path = REPO_ROOT / "apps" / "web" / "lib" / "fantasy" / "dfs-correlation.ts"
    if not path.exists():
        out["error"] = "dfs-correlation.ts not found"
        return out
    try:
        src = path.read_text(encoding="utf-8", errors="ignore")
    except OSError as exc:
        out["error"] = f"read: {exc}"
        return out
    team = _parse_load_block(src, "TEAM_LOAD")
    game = _parse_load_block(src, "GAME_LOAD")
    dst_opp = _first_float(src, r"DST_OPP_LOAD")
    dst_game = _first_float(src, r"DST_GAME_LOAD")
    if not team or not game:
        out["error"] = "load blocks not parsed; refusing to assume loadings"
        return out
    out["loadings"] = {"TEAM_LOAD": team, "GAME_LOAD": game,
                       "DST_OPP_LOAD": dst_opp, "DST_GAME_LOAD": dst_game}
    out["path"] = str(path.relative_to(REPO_ROOT)).replace("\\", "/")

    def corr(pos_a: str, pos_b: str, same_team: bool) -> float | None:
        ta, tb = team.get(pos_a), team.get(pos_b)
        ga, gb = game.get(pos_a), game.get(pos_b)
        if None in (ta, tb, ga, gb):
            return None
        if same_team:
            return round(ta * tb + ga * gb, 4)
        return round(ga * gb, 4)

    skills = [p for p in ("QB", "RB", "WR", "TE") if p in team]
    for i, a in enumerate(skills):
        for b in skills[i:]:
            same = corr(a, b, True)
            cross = corr(a, b, False)
            if same is None:
                continue
            out["records"].append({
                "record_type": "stack_correlation",
                "leg_a": a, "leg_b": b,
                "relation": "same_team_stack" if a != b else "same_team_pair",
                "same_team": True,
                "loading": same,
                "loading_basis": "team_load dot team_load + game_load dot game_load",
                "provenance": out["path"],
                "as_of_utc": generated_utc,
                "note": "positive: legs score together; the number the correlation-aware builder needs",
            })
            if a != b:
                out["records"].append({
                    "record_type": "stack_correlation",
                    "leg_a": a, "leg_b": b,
                    "relation": "bring_back_cross_team",
                    "same_team": False,
                    "loading": cross,
                    "loading_basis": "game_load dot game_load only",
                    "provenance": out["path"],
                    "as_of_utc": generated_utc,
                    "note": "positive but smaller than same-team; both offenses in one game move together",
                })
    for a in skills:
        if dst_opp is None or dst_game is None:
            break
        ta, ga = team.get(a), game.get(a)
        if ta is None or ga is None:
            continue
        out["records"].append({
            "record_type": "stack_correlation",
            "leg_a": a, "leg_b": "DST",
            "relation": "offense_vs_opposing_dst",
            "same_team": False,
            "loading": round(-(dst_opp * ta + dst_game * ga), 4),
            "loading_basis": "negated DST_OPP_LOAD*team_load + DST_GAME_LOAD*game_load",
            "provenance": out["path"],
            "as_of_utc": generated_utc,
            "note": "negative: a bring-back against the DST you stacked against",
        })
    out["ok"] = bool(out["records"])
    return out


def _first_float(src: str, name: str) -> float | None:
    m = re.search(name + r"\s*[:=]\s*(-?\d*\.?\d+)", src)
    return float(m.group(1)) if m else None


def ownership_calibration() -> dict:
    """Ownership projection-vs-actual rows already in the repo (error calibration)."""
    out: dict = {"source": "repo_ownership_calibration", "ok": False, "rows": []}
    pats = [
        "docs/dfs/research/*/full-tables/*ownership*proj*vs*actual*.csv",
        "docs/dfs/research/*/full-tables/*ownership*.csv",
    ]
    cands: list[Path] = []
    for pat in pats:
        cands.extend(sorted(REPO_ROOT.glob(pat)))
    seen = set()
    for path in cands:
        if path in seen:
            continue
        seen.add(path)
        try:
            text = path.read_text(encoding="utf-8-sig", errors="ignore")
        except OSError:
            continue
        reader = csv.DictReader(io.StringIO(text))
        rows = [r for r in reader]
        if not rows:
            continue
        out["path"] = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
        out["columns"] = list(rows[0].keys())
        out["rows"] = rows[:40]
        out["row_count"] = len(rows)
        out["ok"] = True
        break
    if not out["ok"]:
        out["error"] = "no ownership projection-vs-actual csv found"
    return out


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def _derive_ownership_from_calibration(cal: dict, generated_utc: str) -> list[dict]:
    """Carry the repo's measured projection-vs-actual pairs forward as typed records."""
    recs = []
    for row in cal.get("rows", []):
        proj = _pick_num(row, ("proj", "projected", "model", "pred", "proj_own", "ownership_proj"))
        actual = _pick_num(row, ("actual", "observed", "real", "own", "actual_own", "ownership_actual"))
        name = _pick_str(row, ("player", "name", "player_name", "playername"))
        if proj is None or actual is None:
            continue
        recs.append({
            "record_type": "ownership_projection",
            "player_hint": name,
            "player_match_method": "roster_artifact_named_row" if name else "none",
            "is_roster_player": bool(name),
            "projected_ownership_pct": [proj],
            "realized_ownership_pct": actual,
            "abs_error_pct": round(abs(proj - actual), 3),
            "source_type": "repo_artifact_calibration",
            "source_url": None,
            "provenance": cal.get("path"),
            "as_of_utc": generated_utc,
            "confidence": "measured_pair_in_repo",
        })
    return recs


def _pick_num(row: dict, keys: tuple[str, ...]) -> float | None:
    low = {k.lower(): v for k, v in row.items() if isinstance(k, str)}
    for k in keys:
        for lk, lv in low.items():
            if k in lk:
                try:
                    return float(str(lv).replace("%", "").strip())
                except (TypeError, ValueError):
                    continue
    return None


def _pick_str(row: dict, keys: tuple[str, ...]) -> str | None:
    low = {k.lower(): v for k, v in row.items() if isinstance(k, str)}
    for k in keys:
        for lk, lv in low.items():
            if k in lk and isinstance(lv, str) and lv.strip():
                return lv.strip()
    return None


def build_digest(out_dir: Path, use_live: bool = True) -> dict:
    generated = datetime.now(timezone.utc).isoformat()
    last: list[float] = []

    dk = dk_lobby(last) if use_live else {"source": "draftkings_lobby", "ok": False, "error": "disabled"}
    news = news_feeds(last, out_dir) if use_live else {"source": "google_news_rss", "ok": False, "feeds": {}}

    sal = repo_salary_csv()
    player_index = build_player_index(sal)
    narrative = classify_news(news, generated, player_index)

    curve = value_curve_and_scarcity(sal, generated)
    boards = slate_boards()
    corr = stack_correlations(generated)
    cal = ownership_calibration()

    for rec in dk.get("contest_shapes", []) + dk.get("payout_points", []):
        rec["as_of_utc"] = generated

    # The full per-contest census lands in dk-contests-census.csv (thousands of
    # rows). The digest carries a bounded, signature-diverse sample so the
    # trainer feed stays readable; counts below are the true totals.
    shapes_sample = _bounded_shapes(dk.get("contest_shapes", []))
    payout_sample = _bounded_payouts(dk.get("payout_points", []))
    census_path = _write_census_csv(out_dir, dk.get("contest_rows", []))

    digest = {
        "generated_utc": generated,
        "domain": "dfs",
        "date_bucket": "2026-10-13",
        "method": "keyless public endpoints + repo-local DFS assets; no credentials",
        "requests": _request_log,
        "request_count": len(_request_log),
        "robots_policy": {
            "draftkings_robots": "https://www.draftkings.com/robots.txt",
            "fetched": bool(dk.get("robots_checked")),
            "lobby_path_allowed": dk.get("lobby_path_allowed"),
            "disallow_paths_present": dk.get("disallowed_paths_present_in_robots"),
            "disallowed_paths_not_called": dk.get("disallowed_paths_not_called"),
        },
        "sources": {
            "draftkings_lobby": {
                "ok": dk.get("ok", False),
                "url": DK_LOBBY,
                "http_status": dk.get("http_status"),
                "raw_bytes": dk.get("raw_bytes"),
                "raw_sha256": dk.get("raw_sha256"),
                "contest_count": dk.get("contest_count"),
                "parsed_contest_rows": dk.get("parsed_contest_rows"),
                "error": dk.get("error"),
            },
            "google_news_rss": {
                "ok": news.get("ok", False),
                "feeds_ok": [k for k, v in news.get("feeds", {}).items() if v.get("ok")],
                "feeds_failed": [k for k, v in news.get("feeds", {}).items() if not v.get("ok")],
                "item_total": news.get("item_total", 0),
            },
            "repo_salary_csv": {
                "ok": sal.get("ok", False), "path": sal.get("path"),
                "row_count": sal.get("row_count"), "as_of": sal.get("as_of"),
                "error": sal.get("error"),
            },
            "repo_slate_boards": {
                "ok": boards.get("ok", False), "path": boards.get("path"),
                "slate_count": boards.get("slate_count"), "as_of": boards.get("as_of"),
                "error": boards.get("error"),
            },
            "repo_dfs_correlation": {
                "ok": corr.get("ok", False), "path": corr.get("path"), "error": corr.get("error"),
            },
            "repo_ownership_calibration": {
                "ok": cal.get("ok", False), "path": cal.get("path"),
                "row_count": cal.get("row_count"), "columns": cal.get("columns"),
                "error": cal.get("error"),
            },
        },
        "record_counts": {},
        "ownership_projection": narrative["ownership_projection"] + _derive_ownership_from_calibration(cal, generated),
        "chalk_flag": narrative["chalk_flag"],
        "leverage_spot": narrative["leverage_spot"] + _leverage_from_curve(curve, sal),
        "stack_correlation": corr.get("records", []),
        "value_curve_point": curve["value_curve_point"],
        "positional_scarcity": curve["positional_scarcity"],
        "punt_play": curve["punt_play"],
        "contest_shape": shapes_sample,
        "payout_structure_point": payout_sample,
        "contest_census": {
            "csv": census_path,
            "contest_rows_total": len(dk.get("contest_rows", [])),
            "contest_shape_sample_size": len(shapes_sample),
            "payout_sample_size": len(payout_sample),
        },
        "narrative_mention": narrative["narrative_mention"],
        "late_swap": _late_swap_block(dk, boards),
        "gaps": _gaps(dk, news, sal, boards, corr, cal),
        "dk_loadings_used": corr.get("loadings"),
        "census_headline": _census_headline(dk, boards),
    }
    for key in ("ownership_projection", "chalk_flag", "leverage_spot", "stack_correlation",
                "value_curve_point", "positional_scarcity", "punt_play", "contest_shape",
                "payout_structure_point", "narrative_mention"):
        digest["record_counts"][key] = len(digest[key])
    digest["record_counts"]["total"] = sum(digest["record_counts"].values())
    return digest


def _bounded_shapes(shapes: list[dict], top_n: int = 60) -> list[dict]:
    """One row per distinct contest signature, plus the biggest fields by cap.

    Thousands of contests collapse onto a handful of shapes; the digest keeps the
    distinct ones so nothing about the contest landscape is lost, while the full
    list stays in the census CSV.
    """
    seen: dict[tuple, dict] = {}
    for s in shapes:
        key = (s.get("game_type"), s.get("size_class"), s.get("max_entries_per_user"), s.get("mode_advice"))
        seen.setdefault(key, s)
    picked = list(seen.values())
    picked_ids = {s.get("contest_id") for s in picked}
    for s in sorted(shapes, key=lambda x: -(x.get("field_cap") or 0)):
        if len(picked) >= top_n:
            break
        if s.get("contest_id") not in picked_ids:
            picked.append(s)
            picked_ids.add(s.get("contest_id"))
    return picked


def _bounded_payouts(points: list[dict], top_n: int = 60) -> list[dict]:
    """Top prize pools plus one example per implied-rake cluster."""
    seen: dict[float, dict] = {}
    for p in points:
        rake = p.get("implied_rake_at_cap")
        if rake is None:
            continue
        seen.setdefault(round(rake, 2), p)
    picked = list(seen.values())
    picked_ids = {p.get("contest_id") for p in picked}
    for p in sorted(points, key=lambda x: -(x.get("prize_pool_usd") or 0)):
        if len(picked) >= top_n:
            break
        if p.get("contest_id") not in picked_ids:
            picked.append(p)
            picked_ids.add(p.get("contest_id"))
    return picked


def _write_census_csv(out_dir: Path, rows: list[dict]) -> str:
    """Full per-contest census index. Empty when the lobby did not answer."""
    path = out_dir / "dk-contests-census.csv"
    if not rows:
        return ""
    fields = ["contest_id", "draft_group_id", "name", "game_type", "entry_fee_usd", "field_cap",
              "max_entries_per_user", "entries_at_pull", "fill_pct_at_pull", "prize_pool_usd",
              "top_prize_usd", "guaranteed", "start_est", "gross_entry_at_cap_usd", "implied_rake_at_cap"]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    return path.name


def _leverage_from_curve(curve: dict, sal: dict) -> list[dict]:
    """Leverage proxy from the salary export: mid-price players with real points-per-$1k.

    Ownership is unknown in this source, so the flag is a PROXY and says so. It
    ranks the value curve by points-per-$1k among players priced below the slate
    median, which is where contrarian points-per-dollar usually hides.
    """
    recs = []
    if not sal.get("ok"):
        return recs
    rows = sal["rows"]
    med = _median([r["salary"] for r in rows]) or 0
    by_pos = defaultdict(list)
    for r in rows:
        by_pos[r["pos"]].append(r)
    for pos, prs in sorted(by_pos.items()):
        pool = [p for p in prs if p["salary"] < med]
        for r in sorted(pool, key=lambda x: -(x["avg_points_per_game"] / (x["salary"] / 1000.0)))[:2]:
            recs.append({
                "record_type": "leverage_spot",
                "subject": r["name"],
                "pos": pos,
                "team": r["team"],
                "salary": r["salary"],
                "avg_points_per_game": r["avg_points_per_game"],
                "points_per_1k_salary": round(r["avg_points_per_game"] / (r["salary"] / 1000.0), 3),
                "flag": "contrarian_candidate_proxy",
                "ownership_pct": None,
                "basis": "below_slate_median_salary_ranked_by_points_per_1k",
                "confidence": "proxy_no_ownership_input",
                "source_type": "repo_artifact",
                "provenance": sal.get("path"),
                "note": "ownership unknown in the salary export; verify against a live ownership source before trusting",
            })
    return recs


def _late_swap_block(dk: dict, boards: dict) -> dict:
    shapes = dk.get("contest_shapes", [])
    elig = [s for s in shapes if s.get("late_swap_eligible")]
    return {
        "record_type": "late_swap",
        "eligible_contest_count": len(elig),
        "sample": [{"contest_id": s["contest_id"], "game_type": s["game_type"], "start_est": s["start_est"]}
                   for s in sorted(elig, key=lambda s: -(s.get("field_cap") or 0))[:10]],
        "basis": "contest start time + game type from the lobby; showdown and later windows",
        "slates_with_late_games": [s["name"] for s in boards.get("slates", []) if s.get("game_count")][:5],
        "confidence": "heuristic_from_start_time",
        "as_of_utc": None,
    }


def _census_headline(dk: dict, boards: dict) -> dict:
    rows = dk.get("contest_rows", [])
    if not rows:
        return {"ok": False, "error": "no lobby rows"}
    gts = Counter(r["game_type"] for r in rows)
    rakes = [r["implied_rake_at_cap"] for r in rows if r["implied_rake_at_cap"] is not None]
    top_heavy = [r for r in rows if r["top_prize_usd"] and r["prize_pool_usd"]]
    sizes = [r["field_cap"] for r in rows]
    return {
        "ok": True,
        "contest_rows": len(rows),
        "by_game_type": dict(gts.most_common(12)),
        "field_cap_median": _median(sizes),
        "field_cap_max": max(sizes),
        "largest_fields": sorted(rows, key=lambda r: -(r["field_cap"] or 0))[:5],
        "biggest_prize_pools": sorted(rows, key=lambda r: -(r["prize_pool_usd"] or 0))[:5],
        "implied_rake_at_cap_median": _median([round(x, 4) for x in rakes]),
        "implied_rake_at_cap_clusters": dict(Counter(round(x, 2) for x in rakes).most_common(8)),
        "top_prize_share_median": _median([round(t["top_prize_usd"] / t["prize_pool_usd"], 3) for t in top_heavy]) if top_heavy else None,
        "slates_seen": boards.get("slate_count"),
        "note": "field semantics read as po=prize pool $, a=entry fee $, m=field cap, mec=per-user cap, nt=entries at pull; arithmetic-checked, not documented by the vendor",
    }


def _gaps(dk: dict, news: dict, sal: dict, boards: dict, corr: dict, cal: dict) -> list[str]:
    gaps = []
    if not dk.get("ok"):
        gaps.append(f"draftkings_lobby: {dk.get('error')}")
    if not news.get("ok"):
        gaps.append("google_news_rss: no items parsed")
    if not sal.get("ok"):
        gaps.append(f"repo_salary_csv: {sal.get('error')}")
    if not boards.get("ok"):
        gaps.append(f"repo_slate_boards: {boards.get('error')}")
    if not corr.get("ok"):
        gaps.append(f"repo_dfs_correlation: {corr.get('error')}")
    if not cal.get("ok"):
        gaps.append(f"repo_ownership_calibration: {cal.get('error')}")
    gaps.append("live per-player salary/ownership for TODAY's slate: DK /lineup/ is robots-disallowed; "
                "salary comes from a repo artifact with an older as-of date, ownership only from public narrative")
    return gaps


# --------------------------------------------------------------------------- #
# markdown report
# --------------------------------------------------------------------------- #
def render_md(d: dict) -> str:
    src = d["sources"]
    cnt = d["record_counts"]
    lines = [
        f"# DFS signal digest — {d['date_bucket']}",
        "",
        f"Generated: `{d['generated_utc']}`  ",
        f"Method: {d['method']}  ",
        f"Requests made: {d['request_count']}",
        "",
        "## Source status",
        "",
        "| source | ok | detail |",
        "|---|---|---|",
        f"| DraftKings lobby (live) | {src['draftkings_lobby']['ok']} | HTTP {src['draftkings_lobby']['http_status']}, "
        f"{src['draftkings_lobby']['contest_count']} contests, {src['draftkings_lobby']['raw_bytes']} bytes |",
        f"| Google News RSS (live) | {src['google_news_rss']['ok']} | {len(src['google_news_rss']['feeds_ok'])}/4 feeds, "
        f"{src['google_news_rss']['item_total']} items |",
        f"| Repo salary export | {src['repo_salary_csv']['ok']} | `{src['repo_salary_csv']['path']}` "
        f"({src['repo_salary_csv']['row_count']} rows) |",
        f"| Repo slate census | {src['repo_slate_boards']['ok']} | `{src['repo_slate_boards']['path']}` "
        f"({src['repo_slate_boards']['slate_count']} slates) |",
        f"| Repo correlation model | {src['repo_dfs_correlation']['ok']} | `{src['repo_dfs_correlation']['path']}` |",
        f"| Repo ownership calibration | {src['repo_ownership_calibration']['ok']} | `{src['repo_ownership_calibration']['path']}` |",
        "",
        "## Robots posture",
        "",
        f"- DraftKings robots.txt fetched: **{d['robots_policy']['fetched']}**; lobby path allowed: **{d['robots_policy']['lobby_path_allowed']}**",
        f"- Disallow paths present: `{', '.join(d['robots_policy']['disallow_paths_present'] or [])}`",
        f"- Disallowed paths the pipeline does NOT call: `{', '.join(d['robots_policy']['disallowed_paths_not_called'] or [])}`",
        "",
        "## Record counts",
        "",
    ]
    for k, v in cnt.items():
        if k != "total":
            lines.append(f"- `{k}`: {v}")
    lines.append(f"- **total: {cnt['total']}**")
    lines += ["", "## Contest census headline", "", "```json",
              json.dumps(d["census_headline"], indent=1)[:4000], "```", "",
              "## Gaps / caveats", ""]
    for g in d["gaps"]:
        lines.append(f"- {g}")
    lines += ["", "## Sample records", "", "```json",
              json.dumps({k: d[k][:2] for k in ("ownership_projection", "chalk_flag", "leverage_spot",
                                                "stack_correlation", "value_curve_point", "contest_shape",
                                                "payout_structure_point")}, indent=1)[:6000],
              "```", "",
              "## Request log", "", "```json", json.dumps(d["requests"], indent=1)[:3000], "```", ""]
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="DFS signal ingestion (keyless, stdlib-only).")
    ap.add_argument("--out-dir", default=str(DEFAULT_OUT))
    ap.add_argument("--no-live", action="store_true", help="repo assets only; no network")
    args = ap.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    SCRATCH.mkdir(parents=True, exist_ok=True)

    digest = build_digest(out_dir, use_live=not args.no_live)
    digest["late_swap"]["as_of_utc"] = digest["generated_utc"]

    json_path = out_dir / "dfs-signals-digest.json"
    json_path.write_text(json.dumps(digest, indent=1), encoding="utf-8")
    md_path = out_dir / "dfs-signals-digest.md"
    md_path.write_text(render_md(digest), encoding="utf-8")

    meta_path = out_dir / "dk-lobby-raw-meta.json"
    meta_path.write_text(json.dumps({
        "url": DK_LOBBY,
        "fetched_utc": digest["generated_utc"],
        "raw_bytes": digest["sources"]["draftkings_lobby"]["raw_bytes"],
        "raw_sha256": digest["sources"]["draftkings_lobby"]["raw_sha256"],
        "contest_count": digest["sources"]["draftkings_lobby"]["contest_count"],
        "note": "full raw body not committed (multi-MB); sha256 above is the provenance handle. "
                "Contest rows are reproduced in dk-contests-census.csv and in the digest.",
        "robots": digest["robots_policy"],
    }, indent=1), encoding="utf-8")

    print(f"[ingest_dfs] wrote {json_path}")
    print(f"[ingest_dfs] records={digest['record_counts']['total']} requests={digest['request_count']}")
    for k, v in digest["record_counts"].items():
        print(f"  {k}: {v}")
    for g in digest["gaps"]:
        print(f"  ! {g}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
