#!/usr/bin/env python3
"""arXiv Bayesian/state-space + props/fantasy + tracking cluster search."""
import json, re, time, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from pathlib import Path

BASE = Path.home() / "workspace" / "arxiv-sweep"
OUT = BASE / "phase2-candidates-bayes.jsonl"

# Load exclusions: base IDs (strip trailing vN)
excluded = set()
with open(BASE / "phase2-excluded-ids.txt") as f:
    for line in f:
        x = line.strip()
        if not x:
            continue
        excluded.add(re.sub(r"v\d+$", "", x))
print(f"Loaded {len(excluded)} excluded base IDs")

QUERIES = [
    "Gaussian process sports prediction team strength",
    "hierarchical Bayesian sports modeling player performance",
    "dynamic linear model regime switching sports",
    "state space model team ratings time-varying",
    "player performance prediction hierarchical shrinkage",
    "fantasy sports lineup optimization ownership projections",
    "contest theory DFS stacking",
    "trajectory prediction sports player tracking",
    "role formation detection sports tracking data",
    "spatial control pitch control models sports",
    "event detection tracking data sports",
    "matchup effects modeling sports",
    "Kalman filter player tracking sports analytics",
    "particle filter sports movement prediction",
    "Bayesian Elo TrueSkill rating systems",
    "expected value Poisson goals football prediction",
    "player prop prediction Bayesian sports betting",
    "sports betting market calibration uncertainty",
]

NS = {"a": "http://www.w3.org/2005/Atom"}

def fetch(q, start=0, max_results=200):
    params = urllib.parse.urlencode({
        "search_query": f"all:{q}",
        "start": start,
        "max_results": max_results,
        "sortBy": "relevance",
        "sortOrder": "descending",
    })
    url = f"http://export.arxiv.org/api/query?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "Motif-arXiv-sweep/1.0 (mailto:research@example.com)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def base_id(full):
    m = re.search(r"(\d{4}\.\d{4,5}|[a-z\-]+/\d+)$", full)
    if m:
        return re.sub(r"v\d+$", "", m.group(1))
    return full

def parse(data, query):
    root = ET.fromstring(data)
    out = []
    for e in root.findall("a:entry", NS):
        idurl = e.find("a:id", NS).text.strip()
        title = " ".join(e.find("a:title", NS).text.split())
        authors = [a.find("a:name", NS).text for a in e.findall("a:author", NS)]
        summary = " ".join(e.find("a:summary", NS).text.split())
        published = e.find("a:published", NS).text[:10]
        cats = [c.get("term") for c in e.findall("a:category", NS)]
        bid = base_id(idurl)
        out.append({
            "base_id": bid,
            "id": idurl.rsplit("/", 1)[-1],
            "title": title,
            "authors": authors,
            "abstract": summary,
            "published": published,
            "categories": ",".join(cats),
            "url": idurl.replace("http://", "https://"),
            "query": query,
        })
    return out

seen = set()
results = []
stats = {}
for q in QUERIES:
    time.sleep(3)
    try:
        data = fetch(q)
    except Exception as ex:
        print(f"QUERY FAIL {q!r}: {ex}")
        stats[q] = (0, 0)
        continue
    ents = parse(data, q)
    kept = 0
    for e in ents:
        if e["base_id"] in excluded or e["base_id"] in seen:
            continue
        seen.add(e["base_id"])
        kept += 1
        results.append(e)
    stats[q] = (len(ents), kept)
    print(f"{q[:50]:55s} raw={len(ents):3d} kept={kept:3d}")
    time.sleep(0.2)

with open(OUT, "w") as f:
    for r in results:
        rec = {k: r[k] for k in ("id", "title", "authors", "abstract", "published", "categories", "url", "query")}
        f.write(json.dumps(rec) + "\n")

print(f"\nTOTAL kept: {len(results)} -> {OUT}")
with open(BASE / "phase2-search-stats-bayes.json", "w") as f:
    json.dump({"queries": {q: {"raw": s[0], "kept": s[1]} for q, s in stats.items()},
               "total_kept": len(results)}, f, indent=2)
