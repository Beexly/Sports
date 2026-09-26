import json,sys,time,urllib.parse,urllib.request
MAIL="[EMAIL]"
def invert(idx):
    if not idx: return ""
    pos={}
    for w,ps in idx.items():
        for p in ps: pos[p]=w
    return " ".join(pos[k] for k in sorted(pos))
def search(q,per=5,yr=None):
    f="title_and_abstract.search:"+q
    if yr: f+=f",publication_year:>{yr}"
    url=("https://api.openalex.org/works?filter="+urllib.parse.quote(f)+f"&per_page={per}&mailto={MAIL}")
    req=urllib.request.Request(url,headers={"User-Agent":"grout-crew/1.0"})
    with urllib.request.urlopen(req,timeout=45) as r: return json.loads(r.read().decode())
for q in sys.argv[1:]:
    print("="*6,"Q:",q)
    try: d=search(q)
    except Exception as e:
        print("QUERY FAILED:",e); continue
    for w in d.get("results",[]):
        src=((w.get("primary_location") or {}).get("source") or {}).get("display_name")
        print(f"- {w.get('publication_year')} | c={w.get('cited_by_count')} | {w.get('title')}\n  {src} | {w.get('doi')}")
        ab=invert(w.get("abstract_inverted_index"))[:400]
        if ab: print("  ABS:",ab)
    if not d.get("results"): print("SEARCH_EMPTY")
    time.sleep(0.5)
