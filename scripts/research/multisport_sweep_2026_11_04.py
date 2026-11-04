
"""OpenAlex sweep: multi-sport analytics + causal ML methods. arXiv is 429-rate-limited."""
import json, time, urllib.request, urllib.parse, os
from datetime import datetime, timezone

OUT = r"C:\c\wt-week8-forensic\data\research\openalex_multisport_2026_11_04.jsonl"
MAILTO = "[EMAIL]"

QUERIES = [
 # multi-sport analytics
 ("soccer_analytics", "soccer analytics expected goals xG"),
 ("basketball_analytics", "basketball analytics player tracking sportVU"),
 ("baseball_analytics", "baseball sabermetrics statcast pitch modeling"),
 ("hockey_analytics", "ice hockey analytics expected goals"),
 ("tennis_analytics", "tennis analytics point probability serve"),
 ("golf_analytics", "golf analytics strokes gained"),
 ("esports_analytics", "esports analytics match prediction"),
 # causal ML methods
 ("causal_ml", "causal machine learning double machine learning"),
 ("tmle", "targeted maximum likelihood estimation"),
 ("synthetic_control", "synthetic control method causal inference"),
 ("did", "difference in differences causal inference"),
 ("iv", "instrumental variables causal inference"),
 ("rdd", "regression discontinuity design"),
 # modeling
 ("survival", "survival analysis time to event sports"),
 ("multistate", "multistate model transition sports"),
 ("spatiotemporal", "spatiotemporal modeling player movement"),
 ("graph_tracking", "graph neural network trajectory prediction"),
 ("transformer_tracking", "transformer player trajectory forecasting"),
 ("contrastive", "contrastive learning sports video"),
 ("self_supervised", "self-supervised learning sports video"),
]

def oa(q, n=40):
    url="https://api.openalex.org/works?"+urllib.parse.urlencode({
        "search":q,"per-page":n,"sort":"relevance_score:desc","mailto":MAILTO})
    req=urllib.request.Request(url,headers={"User-Agent":"GSE-research/1.0"})
    d=json.load(urllib.request.urlopen(req,timeout=60)); out=[]
    for w in d.get("results",[]):
        t=(w.get("title") or "").strip()
        if not t: continue
        inv=w.get("abstract_inverted_index"); ab=""
        if inv:
            pos=[]
            for wd,idxs in inv.items():
                for i in idxs: pos.append((i,wd))
            pos.sort(); ab=" ".join(x for _,x in pos)
        loc=w.get("primary_location") or {}
        out.append({"source":"openalex","source_id":(w.get("id") or "").split("/")[-1],
          "doi":(w.get("doi") or "").replace("https://doi.org/",""),"title":t,
          "year":w.get("publication_year"),"venue":(loc.get("source") or {}).get("display_name",""),
          "authors":[a.get("author",{}).get("display_name","") for a in w.get("authorships",[])][:6],
          "cited_by":w.get("cited_by_count",0),"url":w.get("doi") or w.get("id") or "",
          "pdf_url":loc.get("pdf_url") or "","abstract":ab[:4000],
          "topics":[c.get("display_name","") for c in (w.get("concepts") or [])][:5],
          "query":q,"retrieved_at":datetime.now(timezone.utc).isoformat()})
    return out

total=0
with open(OUT,"a",encoding="utf-8") as fh:
    for tag,q in QUERIES:
        try: recs=oa(q)
        except Exception as e: print("  ERR %-22s %s" % (tag, type(e).__name__)); continue
        for r in recs: r["cluster"]=tag; fh.write(json.dumps(r,ensure_ascii=False)+"\n")
        total+=len(recs); print("  %-22s %3d" % (tag, len(recs)))
        time.sleep(1.0)
print("\nTOTAL OpenAlex: %d" % total)
