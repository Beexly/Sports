
"""Overnight research sweep v2: relevance-first.

v1 used OpenAlex search + sort=cited_by_count:desc and returned 11% sports-
relevant records (723/813 generic ML/stats noise). v2 fixes that:
  - filter=title_and_abstract.search: (phrase match in title+abstract only)
  - default relevance sort, not citation sort
  - a sports-domain relevance classifier rejects off-domain records at write
  - arXiv bridge added for preprints OpenAlex indexes late or not at all

Output: data/research/overnight_sweep_v2_2026-11-04.jsonl (separate file, so v1
stays intact for comparison).
"""
import json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

OUT = r"C:\c\wt-week8-forensic\data\research\overnight_sweep_v2_2026-11-04.jsonl"
MANIFEST = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus\manifest.jsonl"
UA = "GSE-research-sweep/1.0 (mailto:[EMAIL])"

SPORT = re.compile(
    r"\b(nfl|football|soccer|sport|athlet|player|team|game|match|coach|"
    r"quarterback|receiver|basketball|baseball|hockey|tennis|golf|betting|"
    r"odds|league|season|playoff|kick|punt|pass|rush|tackle|touchdown|"
    r"injur|concussion|biomechanic|workload|win probability|expected points|"
    r"play-by-play|play by play|draft prospect|combine)\b", re.I)

# Phrase queries (quoted) work with title_and_abstract.search as an AND of terms.
CLUSTERS = {
    "win_probability": [
        "NFL win probability calibration",
        "in-game win probability forecasting",
        "fourth down expected points decision",
        "clock management win probability",
    ],
    "player_tracking": [
        "player tracking pose estimation football",
        "multi-object tracking sports broadcast",
        "sports field registration homography",
        "3D pose estimation athletic motion",
    ],
    "injury_workload": [
        "athlete injury risk prediction",
        "acute chronic workload ratio injury",
        "soft tissue injury forecasting sport",
        "concussion risk biomechanics football",
    ],
    "conformal_uncertainty": [
        "conformal prediction sports",
        "distribution-free uncertainty quantification",
        "conformalized quantile regression",
        "calibration coverage prediction intervals",
    ],
    "bayesian_sports": [
        "Bayesian hierarchical model sports",
        "Bayesian rating team strength",
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
        "expected points added football",
        "play by play win probability NFL",
        "football play classification deep learning",
        "pass protection metrics offensive line",
    ],
    "route_coverage": [
        "wide receiver route running tracking",
        "defensive coverage classification football",
        "pass rush win rate pressure",
        "player separation metrics football",
    ],
    "draft_prospect": [
        "NFL draft prospect evaluation",
        "college football projection NFL",
        "athletic testing combine prediction",
        "player development curve sport",
    ],
    "scheduling_rest": [
        "NFL rest days performance",
        "travel fatigue sport performance",
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
        except Exception:
            pass
    return seen

def get_json(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)

def relevant(r):
    text = " ".join([
        str(r.get("title") or ""),
        str(r.get("abstract") or ""),
        " ".join(r.get("topics") or []),
    ])
    return bool(SPORT.search(text))

def openalex(query, per_page=25):
    # title_and_abstract.search is an AND over the query terms; default sort
    # is relevance. This keeps the result set on-topic instead of pulling the
    # most-cited paper that happens to contain one query word.
    url = ("https://api.openalex.org/works?filter=title_and_abstract.search:"
           + urllib.parse.quote(query)
           + f"&per-page={per_page}")
    d = get_json(url)
    out = []
    for w in d.get("results", []):
        doi = (w.get("doi") or "").replace("https://doi.org/", "")
        abstract = w.get("abstract_inverted_index")
        abstract_text = ""
        if isinstance(abstract, dict):
            # reconstruct from inverted index
            positions = []
            for word, idxs in abstract.items():
                for i in idxs:
                    positions.append((i, word))
            positions.sort()
            abstract_text = " ".join(w_ for _, w_ in positions)[:2000]
        rec = {
            "source": "openalex",
            "source_id": (w.get("id") or "").split("/")[-1],
            "doi": doi,
            "title": w.get("title") or w.get("display_name") or "",
            "year": w.get("publication_year"),
            "venue": ((w.get("primary_location") or {}).get("source") or {}).get("display_name", ""),
            "authors": [a.get("author", {}).get("display_name", "") for a in (w.get("authorships") or [])[:6]],
            "cited_by": w.get("cited_by_count", 0),
            "url": w.get("doi") or w.get("id") or "",
            "pdf_url": "",
            "abstract": abstract_text,
            "topics": [t.get("display_name", "") for t in (w.get("topics") or [])[:4]],
            "query": query,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "full_text": None,
        }
        if relevant(rec):
            out.append(rec)
    return out

def arxiv_search(query, max_results=20):
    try:
        sys.path.insert(0, r"C:\c\wt-week8-forensic\scripts\research")
        from arxiv_bridge import ArxivBridge
    except Exception as e:
        print("  arxiv bridge unavailable:", e)
        return []
    out = []
    try:
        with ArxivBridge() as ax:
            hits = ax.search(query, max_results=max_results)
        for h in hits or []:
            rec = {
                "source": "arxiv",
                "source_id": h.get("id") or h.get("arxiv_id") or "",
                "doi": "",
                "title": h.get("title", ""),
                "year": h.get("published", "")[:4] if h.get("published") else None,
                "venue": "arXiv",
                "authors": h.get("authors", [])[:6] if isinstance(h.get("authors"), list) else [],
                "cited_by": 0,
                "url": h.get("url") or "",
                "pdf_url": h.get("pdf_url") or "",
                "abstract": (h.get("summary") or "")[:2000],
                "topics": [],
                "query": query,
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "full_text": None,
            }
            if relevant(rec):
                out.append(rec)
    except Exception as e:
        print("  arxiv search error:", e)
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
                    print(f"  [{cluster}] openalex ERROR {q!r}: {e}")
                    rows = []
                for r in rows:
                    key = (r.get("doi") or r.get("source_id") or r.get("title") or "").lower().strip()
                    if not key or key in seen:
                        continue
                    seen.add(key)
                    fh.write(json.dumps(r, ensure_ascii=False) + "\n")
                    kept += 1
                time.sleep(0.35)
            stats[cluster] = kept
            total_new += kept
            print(f"[{cluster}] new={kept}")
    print()
    print("TOTAL NEW (openalex, relevance-filtered):", total_new)
    print("stats:", stats)

if __name__ == "__main__":
    main()
