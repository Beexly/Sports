
"""arXiv focused sweep: causal inference in sports, Bayesian player eval, EP/win prob."""
import json, time, urllib.request, urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

OUT = r"C:\c\wt-week8-forensic\data\research\arxiv_causal_2026_11_04.jsonl"

QUERIES = [
 ("causal_sports", 'abs:"causal inference" AND (abs:sports OR abs:football OR abs:soccer OR abs:basketball)'),
 ("counterfactual_eval", 'abs:counterfactual AND (abs:"player evaluation" OR abs:sports)'),
 ("bayesian_player", 'abs:Bayesian AND (abs:"player evaluation" OR abs:"player tracking")'),
 ("expected_points", 'abs:"expected points" AND (abs:football OR abs:sports)'),
 ("win_probability", 'abs:"win probability" AND (abs:football OR abs:NFL OR abs:basketball)'),
 ("player_aging_curve", 'abs:aging AND abs:athlete AND abs:performance'),
 ("draft_value", 'abs:"draft pick" AND abs:value AND abs:football'),
 ("surplus_value", 'abs:"surplus value" AND (abs:player OR abs:contract)'),
 ("tracking_eval", 'abs:"tracking data" AND abs:evaluation AND abs:player'),
 ("play_valuation", 'abs:"play value" OR abs:"play valuation" OR abs:"expected threat"'),
 ("xg_model", 'abs:"expected goals" AND (abs:model OR abs:prediction)'),
 ("sports_forecasting_calib", 'abs:calibration AND abs:forecasting AND (abs:sports OR abs:betting)'),
 ("hierarchical_sports", 'abs:hierarchical AND (abs:sports OR abs:player) AND abs:model'),
 ("markov_sports", 'abs:"Markov" AND (abs:football OR abs:sports OR abs:play)'),
 ("sports_simulation", 'abs:simulation AND (abs:"game outcome" OR abs:match OR abs:season)'),
]

def arxiv(q, n=30):
    url = "http://export.arxiv.org/api/query?" + urllib.parse.urlencode({
        "search_query": q, "start": 0, "max_results": n,
        "sortBy": "relevance", "sortOrder": "descending"})
    req = urllib.request.Request(url, headers={"User-Agent":"GSE-research/1.0"})
    root = ET.fromstring(urllib.request.urlopen(req, timeout=60).read())
    ns={"a":"http://www.w3.org/2005/Atom"}; out=[]
    for e in root.findall("a:entry", ns):
        t=" ".join((e.findtext("a:title","",ns) or "").split())
        if not t: continue
        aid=(e.findtext("a:id","",ns) or "").rsplit("/",1)[-1]
        out.append({"source":"arxiv","source_id":aid,"arxiv_id":aid,"title":t,
          "year":int((e.findtext("a:published","",ns) or "2026")[:4]),"venue":"arXiv",
          "authors":[a.findtext("a:name","",ns) for a in e.findall("a:author",ns)][:6],
          "cited_by":0,"url":e.findtext("a:id","",ns) or "",
          "pdf_url":"https://arxiv.org/pdf/"+aid,
          "abstract":" ".join((e.findtext("a:summary","",ns) or "").split())[:5000],
          "topics":[x.get("term","") for x in e.findall("a:category",ns)][:5],
          "query":q,"cluster":aid,"retrieved_at":datetime.now(timezone.utc).isoformat()})
    return out

total=0
with open(OUT,"a",encoding="utf-8") as fh:
    for tag,q in QUERIES:
        try: recs=arxiv(q)
        except Exception as e:
            print("  ERR %-22s %s %s" % (tag, type(e).__name__, getattr(e,'code',''))); time.sleep(10); continue
        for r in recs: r["cluster"]=tag; fh.write(json.dumps(r,ensure_ascii=False)+"\n")
        total+=len(recs); print("  %-22s %3d" % (tag, len(recs)))
        time.sleep(4.0)
print("\nTOTAL arXiv: %d" % total)
