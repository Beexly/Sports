#!/usr/bin/env python3
"""pfr_pull.py — Pro-Football-Reference structured crawler (PC/agent lane).

iSH/browser POC verified 2026-10-10 (ENGINE_BLUEPRINTS.md PART 5). Shell curl gets
403 on some paths; run this with a real UA + polite delay; if a host still blocks,
mirror the browser in-page fetch recipe (same-origin fetch works 100%).

Politeness contract (Sports-Reference ToS-friendly): >=3s between requests,
single-threaded, cache raw HTML to disk, never re-fetch within a run.

Surfaces (verified column maps live in ENGINE_BLUEPRINTS.md PART 5):
  player   /players/{L}/{L}{First5}{NN}.htm      -> adv_rushing_and_receiving, defense, snap_counts, returns, scoring
  team     /teams/{tm}/{yr}.htm                  -> games (exp_pts_off/def/st!), team_stats, passing, rushing_and_receiving, defense
  week     /years/{yr}/week_{n}.htm              -> boxscore link list (crawl driver)
  boxscore /boxscores/{YYYYMMDD}{away}.htm       -> officials, stadium, weather, Over/Under (closing total), spread
  coach    /coaches/{Name}{NN}.htm               -> coaching_results (W/L, SRS off/def, chall_num/won)
  draft    /years/{yr}/draft.htm                 -> pick/age/college/career-AV
  cfb      https://www.sports-reference.com/cfb/... (same parsers, sibling site)

Usage:
  python3 pfr_pull.py player RobiBi01
  python3 pfr_pull.py boxscore 202610110jax
  python3 pfr_pull.py coach MorrRa0
  python3 pfr_pull.py team atl 2026
Tables are extracted by <table id=...> AND by comment-unwrapping (PFR wraps many
tables in <!-- ... --> for bandwidth — this tool unwraps and parses those too).
"""
import html as H
import os
import re
import sys
import time
import urllib.request

UA = {"User-Agent": "GSE-research/1.0 (contact: garrett@galaxysportsedge.com)"}
DELAY = 3.0
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots", "pfr_cache")
os.makedirs(CACHE, exist_ok=True)

def fetch(name, url):
    path = os.path.join(CACHE, name + ".html")
    if os.path.exists(path) and os.path.getsize(path) > 5000:
        return open(path, encoding="utf-8", errors="ignore").read()
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        t = r.read().decode("utf-8", "ignore")
    open(path, "w").write(t)
    time.sleep(DELAY)
    return t

def unwrap(html):
    """Return DOM + comment content merged (PFR hides tables in comments)."""
    comments = re.findall(r"<!--(.*?)-->", html, re.S)
    return html + "\n".join(comments)

def parse_table(doc, table_id):
    m = re.search(r'id="%s"' % re.escape(table_id), doc)
    if not m:
        return None
    seg = doc[m.start():]
    end = seg.find("</table>")
    seg = seg[:end if end > 0 else 4000]
    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", seg, re.S):
        cells = re.findall(r'<t[hd][^>]*data-stat="([^"]+)"[^>]*>(.*?)</t[hd]>', tr, re.S)
        if cells:
            rows.append({k: H.unescape(re.sub(r"<[^>]+>", "", v)).strip() for k, v in cells})
    return rows

TABLES = {
    "player": ["adv_rushing_and_receiving", "defense", "snap_counts", "returns", "scoring"],
    "boxscore": [],          # game_info block parsed textually (officials/weather/total)
    "coach": ["coaching_results"],
    "team": ["games", "team_stats"],
    "draft": ["drafts"],
}

BOXSCORE_KEYS = ["Vegas Line", "Over/Under", "Weather", "Surface", "Roof", "Attendance", "Officials"]

def boxscore_meta(doc):
    out = {}
    doc = unwrap(doc)
    flat = re.sub(r"<[^>]+>", " ", doc)
    flat = re.sub(r"\s+", " ", flat)
    for k in BOXSCORE_KEYS:
        i = flat.find(k)
        if i >= 0:
            out[k] = flat[i:i + 90].strip()
    return out

def run(kind, *args):
    if kind == "player":
        pid = args[0]
        url = f"https://www.pro-football-reference.com/players/{pid[0]}/{pid}.htm"
        doc = unwrap(fetch(pid, url))
        return {t: parse_table(doc, t) for t in TABLES["player"]}
    if kind == "coach":
        cid = args[0]
        url = f"https://www.pro-football-reference.com/coaches/{cid}.htm"
        doc = unwrap(fetch(cid, url))
        return {"coaching_results": parse_table(doc, "coaching_results")}
    if kind == "team":
        tm, yr = args
        url = f"https://www.pro-football-reference.com/teams/{tm}/{yr}.htm"
        doc = unwrap(fetch(f"{tm}{yr}", url))
        return {t: parse_table(doc, t) for t in TABLES["team"]}
    if kind == "boxscore":
        slug = args[0]
        url = f"https://www.pro-football-reference.com/boxscores/{slug}.htm"
        doc = unwrap(fetch(slug, url))
        return boxscore_meta(doc)
    raise SystemExit("unknown kind " + kind)

if __name__ == "__main__":
    kind = sys.argv[1]
    data = run(kind, *sys.argv[2:])
    import json
    name = "_".join(sys.argv[2:])
    path = os.path.join(CACHE, f"{kind}_{name}.parsed.json")
    with open(path, "w") as f:
        json.dump(data, f, indent=1)
    counts = {k: (len(v) if isinstance(v, list) else v) for k, v in data.items()} if isinstance(data, dict) else data
    print("PARSED ->", path)
    print(json.dumps(counts, indent=1, default=str)[:600])
