
"""Broad research sweep: non-sports clusters + Kaggle public datasets."""
import json, os, sys, time, urllib.request, urllib.parse
from datetime import datetime, timezone

sys.path.insert(0, r"C:\c\wt-week8-forensic\scripts\research")
OUT = r"C:\c\wt-week8-forensic\data\research\broad_sweep_2026-11-04.jsonl"

QUERIES = [
    "large language model robotics control",
    "vision language action model robot manipulation",
    "explainable AI safety language models",
    "interpretability LLM alignment",
    "multi-agent reinforcement learning coordination",
    "multi-agent LLM collaboration",
    "deep reinforcement learning scheduling",
    "reinforcement learning logistics optimization",
    "neural operator control theory",
    "sim to real transfer robot learning",
    "LLM agent tool use planning",
    "conformal prediction uncertainty quantification",
    "causal inference sports performance",
    "graph neural network player interaction",
    "transformer time series forecasting",
    "Bayesian hierarchical sports model",
    "counterfactual evaluation sports strategy",
    "optimal transport distribution shift",
    "temporal point process sports events",
    "knowledge graph retrieval augmented generation",
]

def arxiv_search(q, max_results=25):
    url = "http://export.arxiv.org/api/query?" + urllib.parse.urlencode({
        "search_query": "all:" + q,
        "start": 0,
        "max_results": max_results,
        "sortBy": "relevance",
    })
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-research/1.0"})
    raw = urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")
    # minimal atom parse without lxml
    import re
    entries = re.findall(r"<entry>(.*?)</entry>", raw, re.S)
    out = []
    for e in entries:
        def g(tag):
            m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", e, re.S)
            return re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else ""
        title = g("title").replace("\n", " ")
        summ = g("summary").replace("\n", " ")
        pub = g("published")
        aid = g("id")
        authors = re.findall(r"<name>(.*?)</name>", e)
        out.append({
            "source": "arxiv", "source_id": aid.split("/abs/")[-1] if "/abs/" in aid else aid,
            "doi": g("doi") or "", "title": title, "year": pub[:4] or None,
            "venue": "arXiv", "authors": authors[:6], "cited_by": 0,
            "url": aid, "pdf_url": aid.replace("/abs/", "/pdf/") if "/abs/" in aid else "",
            "abstract": summ, "topics": [], "query": q,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        })
    return out

total = 0
per_q = {}
t0 = time.time()
with open(OUT, "a", encoding="utf-8") as fh:
    for q in QUERIES:
        try:
            recs = arxiv_search(q, 25)
        except Exception as e:
            print(f"  ERR {q!r}: {type(e).__name__} {e}")
            per_q[q] = 0
            continue
        for r in recs:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        per_q[q] = len(recs)
        total += len(recs)
        print(f"  {len(recs):3d}  {q}")
        time.sleep(1.0)  # arXiv politeness
print()
print(f"TOTAL: {total} records in {time.time()-t0:.0f}s")
print("output:", OUT)
