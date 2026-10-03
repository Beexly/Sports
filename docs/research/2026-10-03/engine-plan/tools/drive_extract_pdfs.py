import json, os, re

DL = '/home/hatch/workspace/eng-mine/drive-inventory/dl'
PT = '/home/hatch/workspace/eng-mine/drive-inventory/pdftext'
rows = [json.loads(l) for l in open('/home/hatch/workspace/eng-mine/drive-inventory/inventory.jsonl') if l.strip()]
idmap = {r['id']: r for r in rows if 'folder' not in r.get('mimeType','')}
foldmap = {r['id']: r['name'] for r in rows if 'folder' in r.get('mimeType','')}
def src_path(r):
    ps = r.get('parents', [])
    folder = foldmap.get(ps[0], 'ROOT') if ps else 'ROOT'
    return f"gdrive/GSE. 10.2.26/{folder}/{r['name']}"

xc = json.load(open('/home/hatch/workspace/eng-mine/drive-inventory/pdf_crosscheck2.json'))
new_ids = {x['drive_id']: x for x in xc['new']}
in_mind = xc['in_mind']

out = []
def emit(sp, r, rt, title, body, cov="full"):
    out.append({"source_path": sp, "host": "vm",
                "bytes_read": len(body.encode('utf-8')), "coverage": cov,
                "row_type": rt, "title": title[:200], "body": body, "equations": []})

# ---- 14 already-in-mind: one data_source row each ----
for x in in_mind:
    r = idmap[x['drive_id']]
    emit(src_path(r), r, 'data_source',
         f"[already in mind] {r['name']}",
         f"Drive PDF {r['name']} duplicates a paper already in the mind's raw corpus (corpus id match: {x['corpus_hit'][0]}). Drive copy noted; content not re-fed.",
         cov="deduped")

# ---- 91 new PDFs: full content ----
def get_title(text, fname):
    for line in text.split('\n')[:15]:
        s = line.strip()
        if len(s) > 20 and not s.startswith(('arXiv', 'http')):
            return s[:200]
    return fname

for drive_id, x in sorted(new_ids.items(), key=lambda kv: kv[1]['name']):
    r = idmap[drive_id]
    base = x['name'].replace('.pdf', '')
    tf = os.path.join(PT, base + '.txt')
    sp = src_path(r)
    if not os.path.exists(tf) or os.path.getsize(tf) == 0:
        emit(sp, r, 'data_source', f"[unreadable] {x['name']}",
             f"Drive PDF {x['name']} ({r.get('size')} bytes) could not be converted to text (scan or download incomplete). Reason: missing/empty pdftotext output.",
             cov="schema_only")
        continue
    text = open(tf, encoding='utf-8', errors='replace').read()
    # clean up layout artifacts: collapse 3+ newlines, strip page-number-only lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    title = get_title(text, x['name'])
    aid = x.get('aid', '')
    header = f"arXiv:{aid} | Drive: {x['name']}\n\n"
    if len(text) > 60000:
        # split on section headings
        parts = re.split(r'(?m)^(?=(?:\d+\s+)?[A-Z][A-Za-z ,\-:]{4,60}$)', text)
        acc, pi = '', 1
        for p in parts:
            if len(acc) + len(p) > 60000 and acc.strip():
                emit(sp, r, 'concept', f"{title} (part {pi})", header + acc); pi += 1; acc = ''
            acc += p
        if acc.strip(): emit(sp, r, 'concept', f"{title} (part {pi})", header + acc)
    else:
        emit(sp, r, 'concept', title, header + text)

json.dump(out, open('/tmp/u12_pdfs.json','w'))
from collections import Counter
print("pdf rows:", len(out), Counter(r['row_type'] for r in out), Counter(r['coverage'] for r in out))
