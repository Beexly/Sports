
"""OpenAlex sweep on 5 non-sports clusters + HuggingFace dataset search."""
import json, os, time, urllib.request, urllib.parse
from datetime import datetime, timezone

OUT = r"C:\c\wt-week8-forensic\data\research\openalex_broad_2026-11-04.jsonl"
OA_MAILTO = "gse-research@example.com"

CLUSTERS = [
    # (label, search query, topic tag)
    ("llm_robotics", "large language model robot control manipulation", "llm_robotics"),
    ("xai_safety", "explainable AI safety alignment language models", "xai_safety"),
    ("multiagent", "multi-agent reinforcement learning coordination", "multiagent"),
    ("drl_scheduling", "deep reinforcement learning scheduling logistics", "drl_scheduling"),
    ("theory_ml", "conformal prediction optimal transport causal inference", "theory_ml"),
]

def oa_search(query, per_page=50):
    url = "https://api.openalex.org/works?" + urllib.parse.urlencode({
        "search": query, "per-page": per_page, "sort": "relevance_score:desc",
        "mailto": OA_MAILTO,
    })
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-research/1.0"})
    d = json.load(urllib.request.urlopen(req, timeout=40))
    out = []
    for w in d.get("results", []):
        title = (w.get("title") or "").strip()
        if not title:
            continue
        abstract = ""
        inv = w.get("abstract_inverted_index")
        if inv:
            pos = []
            for word, idxs in inv.items():
                for i in idxs:
                    pos.append((i, word))
            pos.sort()
            abstract = " ".join(wd for _, wd in pos)
        auths = [a.get("author", {}).get("display_name", "") for a in w.get("authorships", [])]
        loc = w.get("primary_location") or {}
        out.append({
            "source": "openalex",
            "source_id": (w.get("id") or "").split("/")[-1],
            "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
            "title": title,
            "year": w.get("publication_year"),
            "venue": (loc.get("source") or {}).get("display_name", ""),
            "authors": [a for a in auths if a][:6],
            "cited_by": w.get("cited_by_count", 0),
            "url": w.get("doi") or w.get("id") or "",
            "pdf_url": (loc.get("pdf_url") or ""),
            "abstract": abstract,
            "topics": [c.get("display_name", "") for c in (w.get("concepts") or [])][:5],
            "query": query,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        })
    return out

total = 0
with open(OUT, "a", encoding="utf-8") as fh:
    for label, q, tag in CLUSTERS:
        try:
            recs = oa_search(q, 50)
        except Exception as e:
            print(f"  ERR {label}: {e}")
            continue
        for r in recs:
            r["cluster"] = tag
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        total += len(recs)
        print(f"  {len(recs):3d}  {label}")
        time.sleep(1.0)
print(f"\nTOTAL OpenAlex: {total}")

print()
print("=== HuggingFace datasets ===")
HF_QUERIES = [
    "nfl", "soccer", "football tracking", "sports analytics",
    "basketball", "pose estimation sports", "player tracking",
    "reinforcement learning", "conformal prediction", "time series forecasting",
]
hf_out = r"C:\c\wt-week8-forensic\data\research\hf_datasets_2026-11-04.jsonl"
hf_total = 0
with open(hf_out, "a", encoding="utf-8") as fh:
    for q in HF_QUERIES:
        url = "https://huggingface.co/api/datasets?" + urllib.parse.urlencode({
            "search": q, "limit": 10, "sort": "downloads", "direction": -1
        })
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GSE-research/1.0"})
            d = json.load(urllib.request.urlopen(req, timeout=25))
            recs = d if isinstance(d, list) else d.get("datasets", [])
            for item in recs[:10]:
                fh.write(json.dumps({
                    "source": "huggingface_dataset",
                    "source_id": item.get("id", ""),
                    "title": item.get("id", ""),
                    "year": (item.get("lastModified") or "")[:4],
                    "venue": "HuggingFace",
                    "authors": [],
                    "cited_by": item.get("downloads", 0),
                    "url": "https://huggingface.co/datasets/" + item.get("id", ""),
                    "pdf_url": "",
                    "abstract": " ".join(item.get("tags", []) or []),
                    "topics": item.get("tags", [])[:8],
                    "query": q,
                    "retrieved_at": datetime.now(timezone.utc).isoformat(),
                }, ensure_ascii=False) + "\n")
                hf_total += 1
            print(f"  {len(recs):2d}  {q}")
        except Exception as e:
            print(f"  ERR {q}: {type(e).__name__} {e}")
        time.sleep(0.5)
print(f"TOTAL HF datasets: {hf_total}")
print("outputs:", OUT, "|", hf_out)
