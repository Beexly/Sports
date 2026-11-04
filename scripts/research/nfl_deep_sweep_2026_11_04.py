
"""Deep NFL domain sweep + decision theory. arXiv + OpenAlex."""
import json, time, urllib.request, urllib.parse
from datetime import datetime, timezone
import xml.etree.ElementTree as ET

OUT_AX = r"C:\c\wt-week8-forensic\data\research\arxiv_nfl_2026_11_04.jsonl"
OUT_OA = r"C:\c\wt-week8-forensic\data\research\openalex_nfl_2026_11_04.jsonl"
MAILTO = "[EMAIL]"

AX = [
 ("coverage_shells", 'abs:"cover 2" OR abs:"cover 3" OR abs:"Tampa 2" OR abs:"quarters coverage" OR abs:"cover 1"'),
 ("route_concepts", 'abs:"route concept" OR abs:"route running" OR abs:"pass pattern" OR abs:"receiving route"'),
 ("pass_block", 'abs:"pass block" OR abs:"pass rush" OR abs:"offensive line" OR abs:"pressure rate"'),
 ("fourth_down", 'abs:"fourth down" OR abs:"punt decision" OR abs:"go for it" OR abs:"two point conversion"'),
 ("clock_mgmt", 'abs:"clock management" OR abs:"two minute drill" OR abs:"timeout" AND abs:football'),
 ("red_zone", 'abs:"red zone" AND abs:football'),
 ("special_teams", 'abs:punting OR abs:"field position" OR abs:"kick return"'),
 ("qb_epa", 'abs:"expected points" OR abs:EPA AND abs:quarterback'),
 ("play_action", 'abs:"play action" OR abs:"play-action" OR abs:"run pass option" OR abs:"RPO"'),
 ("defensive_scheme", 'abs:"defensive scheme" OR abs:"blitz" OR abs:"man coverage" OR abs:"zone coverage"'),
 ("salary_contract", 'abs:"salary cap" OR abs:"contract" AND abs:player AND abs:football'),
 ("travel_rest", 'abs:"travel" AND abs:athlete AND abs:performance OR abs:"jet lag" AND abs:sport'),
 ("weather", 'abs:weather AND abs:football AND abs:performance'),
 ("off_field", 'abs:"off-field" OR abs:"free agency" OR abs:"team chemistry"'),
 ("decision_theory", 'abs:"decision theory" AND (abs:sport OR abs:coaching OR abs:strategy)'),
 ("optimal_stopping", 'abs:"optimal stopping" AND (abs:sport OR abs:betting OR abs:trading)'),
 ("hidden_markov", 'abs:"hidden Markov" AND (abs:sport OR abs:football OR abs:player)'),
 ("gaussian_process", 'abs:"Gaussian process" AND (abs:sport OR abs:forecasting OR abs:trajectory)'),
 ("variational", 'abs:"variational inference" AND (abs:sport OR abs:forecasting)'),
 ("information_theory", 'abs:"information theory" AND (abs:sport OR abs:betting OR abs:market)'),
]

def arxiv(q, n=35):
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
          "cited_by":0,"url":e.findtext("a:id","",ns) or "","pdf_url":"",
          "abstract":" ".join((e.findtext("a:summary","",ns) or "").split())[:4000],
          "topics":[x.get("term","") for x in e.findall("a:category",ns)][:5],
          "query":q,"retrieved_at":datetime.now(timezone.utc).isoformat()})
    return out

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

t1=0
with open(OUT_AX,"a",encoding="utf-8") as fh:
    for tag,q in AX:
        try: recs=arxiv(q)
        except Exception as e: print(f"  AX ERR {tag}: {type(e).__name__}"); continue
        for r in recs: r["cluster"]=tag; fh.write(json.dumps(r,ensure_ascii=False)+"\n")
        t1+=len(recs); print(f"  arXiv {len(recs):3d}  {tag}")
        time.sleep(3.2)

OA=[("nfl_scheme","American football defensive scheme coverage"),
    ("nfl_clock","football clock management game theory"),
    ("nfl_draft","NFL draft pick value evaluation"),
    ("nfl_salary","NFL salary cap contract valuation"),
    ("nfl_injury","NFL injury risk workload"),
    ("sports_weather","weather effects outdoor sports performance"),
    ("sports_travel","travel fatigue athletic performance"),
    ("decision_uncertainty","decision making under uncertainty sports"),
    ("bayesian_hier","Bayesian hierarchical model sports"),
    ("player_aging","athlete aging performance decline curve")]
t2=0
with open(OUT_OA,"a",encoding="utf-8") as fh:
    for tag,q in OA:
        try: recs=oa(q)
        except Exception as e: print(f"  OA ERR {tag}: {type(e).__name__}"); continue
        for r in recs: r["cluster"]=tag; fh.write(json.dumps(r,ensure_ascii=False)+"\n")
        t2+=len(recs); print(f"  OpenAlex {len(recs):3d}  {tag}")
        time.sleep(1.0)
print(f"\nTOTAL arXiv={t1} OpenAlex={t2}")
