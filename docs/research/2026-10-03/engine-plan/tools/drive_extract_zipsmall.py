import json, os, re

ZX = '/home/hatch/workspace/eng-mine/drive-inventory/zx'
rows = [json.loads(l) for l in open('/home/hatch/workspace/eng-mine/drive-inventory/inventory.jsonl') if l.strip()]
idmap = {r['id']: r for r in rows if 'folder' not in r.get('mimeType','')}
foldmap = {r['id']: r['name'] for r in rows if 'folder' in r.get('mimeType','')}
ziprec = {}
for did, r in idmap.items():
    if 'zip' in r.get('mimeType',''): ziprec[r['name']] = r
def src_path(r):
    ps = r.get('parents', [])
    folder = foldmap.get(ps[0], 'ROOT') if ps else 'ROOT'
    return f"gdrive/GSE. 10.2.26/{folder}/{r['name']}"
def row(sp, r, rt, title, body):
    return {"source_path": sp, "host": "vm", "bytes_read": len(body.encode('utf-8')),
            "coverage": "full", "row_type": rt, "title": title[:200], "body": body, "equations": []}

out = []
# ---- grok-workspace .md files (new content) ----
zname = "TzL96JxMOqA0GchR-grok-workspace.zip"
r = ziprec[zname]; sp_base = src_path(r)
for root, _, fs in os.walk(os.path.join(ZX, "TzL96JxMOqA0GchR-grok-workspace")):
    for f in sorted(fs):
        if not f.endswith('.md'): continue
        fp = os.path.join(root, f)
        body = open(fp, encoding='utf-8', errors='replace').read()
        rel = os.path.relpath(fp, os.path.join(ZX, "TzL96JxMOqA0GchR-grok-workspace"))
        out.append(row(f"{sp_base}!/{rel}", r, 'concept', f"grok-workspace: {rel}", body))
print("grok-workspace md rows:", len([x for x in out]))

# ---- corpus-intelligence 8 new JSONs ----
zname2 = "corpus-intelligence-2026-10-02.zip"
r2 = ziprec[zname2]; sp2 = src_path(r2)
new_jsons = ["author-xiaomi.json","datasets-odds.json","reasoning-glm.json","reasoning-mimo2.json",
             "reasoning-nemotron-ultra.json","reasoning-nemotron2.json","sports-betting.json","sports-odds.json"]
for root, _, fs in os.walk(os.path.join(ZX, "corpus-intelligence-2026-10-02")):
    for f in fs:
        if f in new_jsons:
            fp = os.path.join(root, f)
            body = open(fp, encoding='utf-8', errors='replace').read()
            rel = os.path.relpath(fp, os.path.join(ZX, "corpus-intelligence-2026-10-02"))
            out.append(row(f"{sp2}!/{rel}", r2, 'data_source', f"corpus-intel new: {f}", body[:60000]))
print("new json rows:", len(new_jsons))

# ---- dupe-note rows for fully-overlapping zips ----
for zname, note in [
    ("arxiv-sweep-2026-10-02.zip", "All 1,374 member files verified present in ~/workspace/agent-bus-corpus/research/arxiv-sweep/ by filename; Drive copy is a redundant snapshot."),
    ("gse-competitive-intel-main (1).zip", "All 3,192 member files verified present in ~/workspace/comp-intel/ by filename; Drive copy is a redundant snapshot of the comp-intel repo."),
    ("agent-bus-main (1).zip", "Snapshot of Beexly/agent-bus; inbox research outputs already fed to the mind via u_10 (GROK outputs) and wire-package docs; research/ subdir duplicates corpus-intelligence briefs already in the mind."),
    ("agent-bus-main (2).zip", "Snapshot of Beexly/agent-bus; 100 extra corpus-intelligence briefs vs (1) all verified present in the local corpus by filename. No new content."),
    ("corpus-intelligence-2026-10-02.zip", "3,288/3,296 member files duplicate the corpus-intelligence corpus already in the mind; 8 new JSON files extracted as separate rows."),
]:
    rr = ziprec[zname]
    out.append(row(src_path(rr), rr, 'data_source', f"[deduped snapshot] {zname}",
        f"Drive zip {zname} ({rr.get('size')} bytes) checked member-by-member. {note}"))

json.dump(out, open('/tmp/u12_zipsmall.json','w'))
print("total zip-small rows:", len(out))
