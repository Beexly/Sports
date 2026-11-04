
"""Full consolidation: all sweeps + gap sweep + backfill -> merged manifest -> index."""
import json, io, os, collections

CORPUS = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus"
REPO = r"C:\c\wt-week8-forensic\data\research"
OUT = os.path.join(CORPUS, "merged_manifest_2026-11-04.jsonl")

def read_jsonl(path):
    rows = []
    if not os.path.exists(path): return rows
    with io.open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if line:
                try: rows.append(json.loads(line))
                except json.JSONDecodeError: pass
    return rows

sources = [
    ("arxiv_sports",   os.path.join(REPO,"arxiv_sweep_2026-11-04.jsonl"),          "arxiv", 2),
    ("arxiv_broad",    os.path.join(REPO,"broad_sweep_2026-11-04.jsonl"),          "arxiv", 2),
    ("arxiv_gap",      os.path.join(REPO,"arxiv_gap_2026_11_04.jsonl"),            "arxiv", 2),
    ("openalex_v2",    os.path.join(REPO,"overnight_sweep_v2_2026-11-04.jsonl"),   "openalex", 3),
    ("openalex_broad", os.path.join(REPO,"openalex_broad_2026-11-04.jsonl"),       "openalex", 3),
    ("openalex_gap",   os.path.join(REPO,"openalex_gap_2026_11_04.jsonl"),         "openalex", 3),
    ("openalex_v1",    os.path.join(REPO,"overnight_sweep_2026-11-04.jsonl"),      "openalex", 9),
    ("hf_datasets",    os.path.join(REPO,"hf_datasets_2026-11-04.jsonl"),          "huggingface_dataset", 4),
    ("base_manifest",  os.path.join(CORPUS,"manifest.jsonl"),                      "openalex", 3),
]

print("=== sources ===")
all_rows = []
counts = {}
for name, path, src, prio in sources:
    rows = read_jsonl(path); counts[name] = len(rows)
    for r in rows:
        r = dict(r); r.setdefault("source", src)
        r["_merge_source"] = name; r["_merge_prio"] = prio
        all_rows.append(r)
    print(f"  {name:18s} {len(rows):6d}")

backfill = read_jsonl(os.path.join(CORPUS,"fulltext_backfill.jsonl"))
text_by_id = {}
for r in backfill:
    txt = r.get("full_text") or r.get("text") or ""
    if not txt: continue
    for k in ("source_id","arxiv_id","id","doi","url","pdf_url"):
        v = r.get(k)
        if v: text_by_id[str(v).strip()] = txt
print(f"  fulltext_backfill   {len(backfill):6d} ({len(text_by_id)} keys)")

def attach(r):
    for k in ("source_id","arxiv_id","id","doi","url","pdf_url"):
        v = r.get(k)
        if v and str(v).strip() in text_by_id:
            r = dict(r); r["full_text"] = text_by_id[str(v).strip()]; return r
    return r

merged, seen = [], set()
skipped = collections.Counter()
for r in all_rows:
    r = attach(r)
    sid = str(r.get("source_id") or "").strip()
    doi = str(r.get("doi") or "").strip().lower()
    title = str(r.get("title") or "").strip().lower()
    key = ("sid:"+sid) if sid else (("doi:"+doi) if doi else "title:"+title[:90])
    if key in seen: skipped[r["_merge_source"]] += 1; continue
    seen.add(key); merged.append(r)

ft = sum(1 for r in merged if r.get("full_text"))
print("\n=== merged ===")
print(f"  total:        {len(merged)}")
print(f"  full_text:    {ft} ({100*ft/max(len(merged),1):.1f}%)")
print(f"  abstract:     {sum(1 for r in merged if r.get('abstract'))}")
print(f"  retracted:    {sum(1 for r in merged if r.get('retracted'))}")
print(f"  skipped dups: {dict(skipped)}")
print(f"  by source:    {dict(collections.Counter(r.get('source') for r in merged))}")

with io.open(OUT,"w",encoding="utf-8") as f:
    for r in merged: f.write(json.dumps(r, ensure_ascii=False)+"\n")
print(f"\nwrote {OUT} ({os.path.getsize(OUT)} bytes)")
