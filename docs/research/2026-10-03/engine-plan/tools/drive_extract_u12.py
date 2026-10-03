import json, os, re, sys

DL = '/home/hatch/workspace/eng-mine/drive-inventory/dl'
OUT = '/home/hatch/workspace/eng-mine/shards-out'
os.makedirs(OUT, exist_ok=True)

rows = [json.loads(l) for l in open('/home/hatch/workspace/eng-mine/drive-inventory/inventory.jsonl') if l.strip()]
idmap = {r['id']: r for r in rows if 'folder' not in r.get('mimeType','')}
foldmap = {r['id']: r['name'] for r in rows if 'folder' in r.get('mimeType','')}
# map downloaded file -> drive record (by id prefix or exact name)
def drive_rec_for(fn):
    m = re.match(r'^([A-Za-z0-9_-]{8})_', fn)
    if m:
        for did, r in idmap.items():
            if did.startswith(m.group(1)): return r
    for did, r in idmap.items():
        if r['name'].replace('/','_') == fn: return r
    return None

def src_path(r):
    ps = r.get('parents', [])
    folder = foldmap.get(ps[0], 'ROOT') if ps else 'ROOT'
    return f"gdrive/GSE. 10.2.26/{folder}/{r['name']}"

def row(r, row_type, title, body, equations=None):
    return {"source_path": src_path(r), "host": "vm",
            "bytes_read": int(r.get('size', 0) or 0), "coverage": "full",
            "row_type": row_type, "title": title[:200], "body": body,
            "equations": equations or []}

out_rows = []
def emit(r): out_rows.append(r)

# ---- markdown files ----
for fn in sorted(os.listdir(os.path.join(DL, 'small'))):
    if not fn.endswith('.md'): continue
    r = drive_rec_for(fn)
    if not r: print("NOREC:", fn); continue
    body = open(os.path.join(DL,'small',fn), encoding='utf-8', errors='replace').read()
    if not body.strip():
        emit(row(r, 'data_source', f"[empty] {r['name']}", f"File {r['name']} downloaded empty (0 body chars)."))
        continue
    # split large files into complete sections rather than truncating
    if len(body) > 60000:
        parts = re.split(r'(?m)^(?=#{1,3} )', body)
        acc = ''
        for pi, p in enumerate(parts):
            if len(acc) + len(p) > 60000 and acc:
                emit(row(r, 'concept', f"{r['name']} (part {pi})", acc)); acc = ''
            acc += p
        if acc.strip(): emit(row(r, 'concept', f"{r['name']} (part {len(parts)})", acc))
    else:
        emit(row(r, 'concept', r['name'], body))

# ---- typescript files (mislabeled as video) ----
for fn in sorted(os.listdir(os.path.join(DL, 'small'))):
    if not fn.endswith('.ts'): continue
    r = drive_rec_for(fn)
    if not r: continue
    body = open(os.path.join(DL,'small',fn), encoding='utf-8', errors='replace').read()
    # extract header comment for title
    m = re.search(r'/\*\*(.*?)\*/', body, re.S)
    header = (m.group(1)[:500] if m else body[:300]).strip()
    emit(row(r, 'method', f"TS implementation: {r['name']}", f"HEADER:\n{header}\n\nFULL SOURCE:\n{body}"))

# ---- git/octet-stream files ----
for fn in sorted(os.listdir(os.path.join(DL, 'small'))):
    fp = os.path.join(DL,'small',fn)
    if fn.endswith(('.md','.ts','.png','.txt','.json')): continue
    r = drive_rec_for(fn)
    if not r: continue
    try:
        body = open(fp, encoding='utf-8', errors='replace').read()
        if len(body) > 20000: body = body[:20000] + "\n[truncated: binary git index, first 20k chars]"
    except Exception as e:
        body = f"[unreadable: {e}]"
    emit(row(r, 'data_source', f"git metadata: {r['name']}", f"Drive file {r['name']} ({r.get('mimeType')}, {r.get('size')} bytes) appears to be git internals. Content:\n{body}"))

# ---- txt / json ----
for fn in ['grok-bot-read-manifest-2026-10-02.txt', 'Sports-recovery-manifest-20260924.json']:
    fp = os.path.join(DL,'small',fn)
    if not os.path.exists(fp): print("MISSING:", fn); continue
    r = drive_rec_for(fn)
    body = open(fp, encoding='utf-8', errors='replace').read()
    emit(row(r, 'data_source', r['name'], body))

# ---- PNGs ----
png_desc = """Screenshot of the Galaxy Sports Edge website case-study page titled 'AWS-governed sports intelligence, built locally before it is allowed to run.'
The page presents AWS concepts as a governance vocabulary for sports intelligence: shadow control towers, Well-Architected pillar checks, abuse-response fixtures, source-rights gates, and no-cost local review workflows. It explicitly states this is a portfolio case study, NOT an AWS deployment claim.
Sections: THERMAL BOUNDARY ('Aggressive architecture, conservative claims' — Shadow only / No-cost lane / Evidence boundary cards); WELL-ARCHITECTED LENS ('Six pillars translated into GSE controls' — Operational excellence, Security, Reliability, Performance efficiency, Cost optimization, Sustainability, each with a GSE control description and a pull-quote); EVIDENCE PATH ('What the repo can show without touching AWS' — governance OS, six-pillar lens, abuse and review evidence with repo doc paths); LIVE-ACTION LOCKS ('What this page does not unlock' — cloud resources/paid resources/credentials/deployment/funding/release readiness all false). Footer lists GSE products (The NFL House, Today's Board, Galaxy Twin, CLV Tracker, Trend Lab, Decision Autopsy, Parlay MRI, Start-Sit Helper, Contests, The Beat, The Studio, The Academy), company links, data links (MLB/NHL/NFL stats), responsible-gambling links (Help: 1-800-GAMBLER), socials (X, Instagram, Threads, Facebook). Tagline: 'MATH YOU CAN READ. WE DETECT. YOU DECIDE.'"""
for fn in sorted(os.listdir(os.path.join(DL,'small'))):
    if not fn.endswith('.png'): continue
    r = drive_rec_for(fn)
    if not r: continue
    emit(row(r, 'finding', f"screenshot: {r['name']}", f"Drive PNG {r['name']} ({r.get('size')} bytes). It is a duplicate-variant of the same GSE website case-study screenshot. Content description:\n{png_desc}"))

# ---- Google Docs ----
gdocs = json.load(open('/tmp/gdocs.json'))
for d in gdocs:
    fp = os.path.join(DL, f"gdoc_{d['id']}.txt")
    if not os.path.exists(fp): print("GDOC MISSING:", d['name']); continue
    r = idmap[d['id']]
    body = open(fp, encoding='utf-8').read()
    emit(row(r, 'concept', f"Google Doc: {d['name']}", body))

# ---- write shards ----
def write_shards(rows, prefix):
    cur, ci, idx = [], 0, 0
    for r in rows:
        line = json.dumps(r, ensure_ascii=False) + '\n'
        if ci + len(line) > 8_000_000 and cur:
            with open(f"{OUT}/{prefix}_{idx:02d}.jsonl", 'w') as f: f.writelines(cur)
            print(f"wrote {prefix}_{idx:02d}.jsonl: {len(cur)} rows"); idx += 1; cur, ci = [], 0
        cur.append(line); ci += len(line)
    if cur:
        with open(f"{OUT}/{prefix}_{idx:02d}.jsonl", 'w') as f: f.writelines(cur)
        print(f"wrote {prefix}_{idx:02d}.jsonl: {len(cur)} rows")
    return idx + 1

n = write_shards(out_rows, 'mind_knowledge_u_12_drive')
from collections import Counter
print("rows:", len(out_rows), Counter(r['row_type'] for r in out_rows))
