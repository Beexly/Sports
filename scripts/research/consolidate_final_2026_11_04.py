
import json, io, os, collections
CORPUS = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus"
REPO = r"C:\c\wt-week8-forensic\data\research"
OUT = os.path.join(CORPUS,"merged_manifest_2026-11-04.jsonl")

def read_jsonl(p):
    rows=[]
    if not os.path.exists(p): return rows
    with io.open(p,encoding="utf-8",errors="replace") as f:
        for line in f:
            line=line.strip()
            if line:
                try: rows.append(json.loads(line))
                except: pass
    return rows

sources=[
 ("arxiv_sports",     REPO+r"\arxiv_sweep_2026-11-04.jsonl","arxiv",2),
 ("arxiv_broad",      REPO+r"\broad_sweep_2026-11-04.jsonl","arxiv",2),
 ("arxiv_gap",        REPO+r"\arxiv_gap_2026_11_04.jsonl","arxiv",2),
 ("arxiv_nfl",        REPO+r"\arxiv_nfl_2026_11_04.jsonl","arxiv",2),
 ("arxiv_targeted",   REPO+r"\arxiv_targeted_2026_11_04.jsonl","arxiv",1),
 ("arxiv_causal",     REPO+r"\arxiv_causal_2026_11_04.jsonl","arxiv",2),
 ("openalex_v2",      REPO+r"\overnight_sweep_v2_2026-11-04.jsonl","openalex",3),
 ("openalex_broad",   REPO+r"\openalex_broad_2026-11-04.jsonl","openalex",3),
 ("openalex_gap",     REPO+r"\openalex_gap_2026_11_04.jsonl","openalex",3),
 ("openalex_nfl",     REPO+r"\openalex_nfl_2026_11_04.jsonl","openalex",3),
 ("openalex_v1",      REPO+r"\overnight_sweep_2026-11-04.jsonl","openalex",9),
 ("hf_datasets",      REPO+r"\hf_datasets_2026-11-04.jsonl","huggingface_dataset",4),
 ("datasets_tooling", CORPUS+r"\datasets_tooling_2026_11_04.jsonl","tooling",1),
 ("base_manifest",    CORPUS+r"\manifest.jsonl","openalex",3),
]
print("=== sources ===")
all_rows=[]; counts={}
for name,path,src,prio in sources:
    rows=read_jsonl(path); counts[name]=len(rows)
    for r in rows:
        r=dict(r); r.setdefault("source",src)
        r["_merge_source"]=name; r["_merge_prio"]=prio
        all_rows.append(r)
    print("  %-20s %6d" % (name, len(rows)))

backfill=read_jsonl(CORPUS+r"\fulltext_backfill.jsonl")
text_by_id={}
for r in backfill:
    txt=r.get("full_text") or r.get("text") or ""
    if not txt: continue
    for k in ("source_id","arxiv_id","id","doi","url","pdf_url"):
        v=r.get(k)
        if v: text_by_id[str(v).strip()]=txt
print("  %-20s %6d (%d keys)" % ("fulltext_backfill", len(backfill), len(text_by_id)))

def attach(r):
    for k in ("source_id","arxiv_id","id","doi","url","pdf_url"):
        v=r.get(k)
        if v and str(v).strip() in text_by_id:
            r=dict(r); r["full_text"]=text_by_id[str(v).strip()]; return r
    return r

merged,seen=[],set(); skipped=collections.Counter()
for r in all_rows:
    r=attach(r)
    sid=str(r.get("source_id") or "").strip()
    doi=str(r.get("doi") or "").strip().lower()
    title=str(r.get("title") or "").strip().lower()
    key=("sid:"+sid) if sid else (("doi:"+doi) if doi else "title:"+title[:90])
    if key in seen: skipped[r["_merge_source"]]+=1; continue
    seen.add(key); merged.append(r)

ft=sum(1 for r in merged if r.get("full_text"))
print("\n=== merged ===")
print("  total:     %d" % len(merged))
print("  full_text: %d (%.1f%%)" % (ft, 100*ft/max(len(merged),1)))
print("  abstract:  %d" % sum(1 for r in merged if r.get("abstract")))
print("  by source: %s" % dict(collections.Counter(r.get("source") for r in merged)))
print("  skipped:   %s" % dict(skipped))

with io.open(OUT,"w",encoding="utf-8") as f:
    for r in merged: f.write(json.dumps(r,ensure_ascii=False)+"\n")
print("\nwrote %s (%d bytes)" % (OUT, os.path.getsize(OUT)))
