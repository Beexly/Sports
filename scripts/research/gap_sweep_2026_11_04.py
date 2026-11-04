
"""Gap-targeted sweep: arXiv + OpenAlex on clusters absent from the corpus."""
import json, time, urllib.request, urllib.parse, os
from datetime import datetime, timezone

OUT_ARXIV = r"C:\c\wt-week8-forensic\data\research\arxiv_gap_2026_11_04.jsonl"
OUT_OA    = r"C:\c\wt-week8-forensic\data\research\openalex_gap_2026_11_04.jsonl"
MAILTO = "gse-research@example.com"

ARXIV_GAPS = [
    ("gnn", 'abs:"graph neural network" AND (abs:sports OR abs:athlete OR abs:team)'),
    ("causal", 'abs:"causal inference" AND (abs:sports OR abs:betting OR abs:performance)'),
    ("foundation_ts", 'abs:"time series foundation model" OR abs:"zero-shot forecasting"'),
    ("officiating", 'abs:referee AND (abs:bias OR abs:decision OR abs:review)'),
    ("sports_econ", 'abs:"salary cap" OR abs:"labor market" AND abs:sports'),
    ("mamba_ssm", 'abs:mamba OR abs:"state space model" AND abs:sequence'),
    ("diffusion_ts", 'abs:"diffusion model" AND abs:"time series"'),
    ("multimodal", 'abs:multimodal AND (abs:sports OR abs:video OR abs:broadcast)'),
    ("sbi", 'abs:"simulation-based inference" OR abs:"likelihood-free inference"'),
    ("uncertainty_dl", 'abs:"uncertainty quantification" AND abs:"deep learning"'),
    ("wearable", 'abs:wearable AND (abs:athlete OR abs:GPS OR abs:load)'),
    ("draft", 'abs:draft AND (abs:sports OR abs:athlete OR abs:prospect)'),
    ("action_recog", 'abs:"action recognition" AND abs:sports'),
    ("player_valuation", 'abs:"player valuation" OR abs:"transfer market" OR abs:"contract value"'),
    ("injury_mech", 'abs:"injury mechanism" OR abs:"injury prevention" AND abs:sport'),
    ("match_sim", 'abs:"match simulation" OR abs:"Monte Carlo" AND abs:sports'),
    ("rating", 'abs:"player rating" OR abs:"Elo" OR abs:"Bradley-Terry" AND abs:sports'),
    ("tracking_metrics", 'abs:"player tracking" AND (abs:metrics OR abs:load OR abs:distance)'),
    ("video_llm", 'abs:"video language model" OR abs:"video understanding"'),
    ("betting_strategy", 'abs:"betting strategy" OR abs:"value betting" OR abs:"arbitrage"'),
]

def arxiv(q, max_results=40):
    url = "http://export.arxiv.org/api/query?" + urllib.parse.urlencode({
        "search_query": q, "start": 0, "max_results": max_results,
        "sortBy": "relevance", "sortOrder": "descending"})
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-research/1.0"})
    import xml.etree.ElementTree as ET
    root = ET.fromstring(urllib.request.urlopen(req, timeout=60).read())
    ns = {"a": "http://www.w3.org/2005/Atom"}
    out = []
    for e in root.findall("a:entry", ns):
        title = " ".join((e.findtext("a:title", "", ns) or "").split())
        if not title: continue
        aid = (e.findtext("a:id", "", ns) or "").rsplit("/", 1)[-1]
        out.append({
            "source": "arxiv", "source_id": aid, "arxiv_id": aid,
            "title": title,
            "year": int((e.findtext("a:published", "", ns) or "2026")[:4]),
            "venue": "arXiv",
            "authors": [a.findtext("a:name", "", ns) for a in e.findall("a:author", ns)][:6],
            "cited_by": 0,
            "url": e.findtext("a:id", "", ns) or "",
            "pdf_url": "",
            "abstract": " ".join((e.findtext("a:summary", "", ns) or "").split())[:4000],
            "topics": [t.get("term","") for t in e.findall("a:category", ns)][:5],
            "query": q,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        })
    return out

def oa(q, per_page=50):
    url = "https://api.openalex.org/works?" + urllib.parse.urlencode({
        "search": q, "per-page": per_page, "sort": "relevance_score:desc", "mailto": MAILTO})
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-research/1.0"})
    d = json.load(urllib.request.urlopen(req, timeout=60))
    out = []
    for w in d.get("results", []):
        title = (w.get("title") or "").strip()
        if not title: continue
        inv = w.get("abstract_inverted_index"); ab = ""
        if inv:
            pos = []
            for word, idxs in inv.items():
                for i in idxs: pos.append((i, word))
            pos.sort(); ab = " ".join(wd for _, wd in pos)
        loc = w.get("primary_location") or {}
        out.append({
            "source": "openalex", "source_id": (w.get("id") or "").split("/")[-1],
            "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
            "title": title, "year": w.get("publication_year"),
            "venue": (loc.get("source") or {}).get("display_name", ""),
            "authors": [a.get("author",{}).get("display_name","") for a in w.get("authorships",[])][:6],
            "cited_by": w.get("cited_by_count",0), "url": w.get("doi") or w.get("id") or "",
            "pdf_url": loc.get("pdf_url") or "", "abstract": ab[:4000],
            "topics": [c.get("display_name","") for c in (w.get("concepts") or [])][:5],
            "query": q, "retrieved_at": datetime.now(timezone.utc).isoformat(),
        })
    return out

OA_GAPS = [
    "graph neural network sports analytics",
    "causal inference sports performance evaluation",
    "time series foundation model forecasting",
    "referee bias decision making sports",
    "sports labor economics salary determination",
    "state space model sequence modeling",
    "diffusion model time series generation",
    "multimodal learning sports video",
    "simulation based inference likelihood free",
    "uncertainty quantification deep learning calibration",
]

ax_total = 0
with open(OUT_ARXIV, "a", encoding="utf-8") as fh:
    for tag, q in ARXIV_GAPS:
        try: recs = arxiv(q)
        except Exception as e:
            print(f"  arXiv ERR {tag}: {type(e).__name__}"); continue
        for r in recs: r["cluster"] = tag; fh.write(json.dumps(r, ensure_ascii=False)+"\n")
        ax_total += len(recs); print(f"  arXiv {len(recs):3d}  {tag}")
        time.sleep(3.2)   # arXiv rate limit

oa_total = 0
with open(OUT_OA, "a", encoding="utf-8") as fh:
    for q in OA_GAPS:
        try: recs = oa(q)
        except Exception as e:
            print(f"  OA ERR {q[:40]}: {type(e).__name__}"); continue
        for r in recs: r["cluster"] = q.split()[0]; fh.write(json.dumps(r, ensure_ascii=False)+"\n")
        oa_total += len(recs); print(f"  OpenAlex {len(recs):3d}  {q[:60]}")
        time.sleep(1.0)

print(f"\nTOTAL arXiv={ax_total} OpenAlex={oa_total}")
