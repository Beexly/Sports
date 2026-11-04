
"""Overnight research sweep: arXiv + OpenAlex across GSE-relevant term clusters.

Incremental and resumable. Writes one JSONL row per unique work to
C:/c/wt-week8-forensic/data/research/overnight_sweep_2026-11-04.jsonl
and skips anything whose DOI/arXiv id is already in the output or in the
existing 77MB manifest.

Kaggle is NOT used: no credentials in this environment.
"""
import json, os, re, sys, time, urllib.parse, urllib.request, hashlib
from datetime import datetime, timezone

OUT = r"C:\c\wt-week8-forensic\data\research\overnight_sweep_2026-11-04.jsonl"
MANIFEST = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus\manifest.jsonl"
UA = "GSE-research-sweep/1.0 (mailto:research@galaxysportsedge.com)"

# Term clusters chosen for a sports-prediction engine. Each is a list of
# arXiv/OpenAlex queries; a work is kept once per unique id even if it
# matches several clusters.
CLUSTERS = {
    "win_probability": [
        "NFL win probability model calibration",
        "in-game win probability sports forecasting",
        "fourth down decision expected points",
        "late game clock management win probability",
    ],
    "player_tracking": [
        "player tracking pose estimation football",
        "multi-object tracking sports broadcast",
        "sports field registration homography",
        "3D pose estimation athletic motion",
    ],
    "injury_workload": [
        "athlete injury risk prediction machine learning",
        "training load acute chronic workload ratio",
        "soft tissue injury forecasting sports",
        "concussion risk biomechanics football",
    ],
    "conformal_uncertainty": [
        "conformal prediction sports forecasting",
        "distribution-free uncertainty quantification",
        "calibration coverage prediction intervals",
        "conformalized quantile regression",
    ],
    "bayesian_sports": [
        "Bayesian hierarchical model sports prediction",
        "Bayesian rating system team strength",
        "state space model sports performance",
        "probabilistic graphical model football",
    ],
    "market_efficiency": [
        "sports betting market efficiency",
        "closing line value predictive",
        "bookmaker odds information efficiency",
        "prediction market sports forecasting",
    ],
    "epa_play_modeling": [
        "expected points added NFL play",
        "play by play win probability nfl",
        "football play classification deep learning",
        "offensive line pass protection metrics",
    ],
    "route_coverage": [
        "wide receiver route running tracking data",
        "defensive coverage scheme classification",
        "pass rush win rate pressure",
        "football player separation metrics",
    ],
    "draft_prospect": [
        "NFL draft prospect evaluation model",
        "college football projection to NFL",
        "athletic testing combine prediction",
        "player development curve sports",
    ],
    "scheduling_rest": [
        "NFL rest days performance effect",
        "travel fatigue sports performance",
        "short week Thursday night football",
        "circadian rhythm athletic performance",
    ],
}

def load_seen():
    seen = set()
    for path in (OUT, MANIFEST):
        if not os.path.exists(path):
            continue
        try:
            with open(path, encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        r = json.loads(line)
                    except Exception:
                        continue
                    for k in ("doi", "arxiv_id", "source_id", "url"):
                        v = r.get(k)
                        if v:
                            seen.add(str(v).lower().strip())
        except Exception as e:
            print("warn: could not read", path, e)
    return seen

def get_json(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)

def openalex(query, per_page=25):
    url = ("https://api.openalex.org/works?search=" + urllib.parse.quote(query)
           + f"&per-page={per_page}&sort=cited_by_count:desc")
    d = get_json(url)
    out = []
    for w in d.get("results", []):
        doi = (w.get("doi") or "").replace("https://doi.org/", "")
        out.append({
            "source": "openalex",
            "source_id": w.get("id", "").split("/")[-1],
            "doi": doi,
            "title": w.get("title") or w.get("display_name") or "",
            "year": w.get("publication_year"),
            "venue": ((w.get("primary_location") or {}).get("source") or {}).get("display_name", ""),
            "authors": [a.get("author", {}).get("display_name", "") for a in (w.get("authorships") or [])[:6]],
            "cited_by": w.get("cited_by_count", 0),
            "url": w.get("doi") or w.get("id") or "",
            "pdf_url": "",
            "abstract": "",
            "topics": [t.get("display_name", "") for t in (w.get("topics") or [])[:4]],
            "query": query,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "full_text": None,
        })
    return out

def main():
    seen = load_seen()
    print("already seen ids:", len(seen))
    total_new = 0
    stats = {}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "a", encoding="utf-8") as fh:
        for cluster, queries in CLUSTERS.items():
            kept = 0
            for q in queries:
                try:
                    rows = openalex(q)
                except Exception as e:
                    print(f"  [{cluster}] ERROR {q!r}: {e}")
                    continue
                for r in rows:
                    key = (r.get("doi") or r.get("source_id") or r.get("title") or "").lower().strip()
                    if not key or key in seen:
                        continue
                    seen.add(key)
                    fh.write(json.dumps(r, ensure_ascii=False) + "\n")
                    kept += 1
                time.sleep(0.4)
            stats[cluster] = kept
            total_new += kept
            print(f"[{cluster}] new={kept}")
    print()
    print("TOTAL NEW:", total_new)
    print("stats:", stats)

if __name__ == "__main__":
    main()
