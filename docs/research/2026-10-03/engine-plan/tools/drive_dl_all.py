import json, subprocess, os, sys, time

DL = '/home/hatch/workspace/eng-mine/drive-inventory/dl'
os.makedirs(DL, exist_ok=True)
rows = [json.loads(l) for l in open('/home/hatch/workspace/eng-mine/drive-inventory/inventory.jsonl') if l.strip()]
idmap = {r['id']: r for r in rows if 'folder' not in r.get('mimeType','')}
plan = json.load(open('/home/hatch/workspace/eng-mine/drive-inventory/dedup_plan.json'))
pdf_new_ids = {x['drive_id'] for x in json.load(open('/home/hatch/workspace/eng-mine/drive-inventory/pdf_crosscheck2.json'))['new']}

jobs = json.load(open(sys.argv[1]))  # list of [drive_id, subdir]
ok, fail = 0, []
for did, sub in jobs:
    r = idmap[did]
    d = os.path.join(DL, sub); os.makedirs(d, exist_ok=True)
    # sanitize filename
    fn = r['name'].replace('/', '_')
    out = os.path.join(d, fn)
    if os.path.exists(out) and os.path.getsize(out) == int(r.get('size', 0) or 0):
        ok += 1; continue
    for attempt in range(3):
        p = subprocess.run(['hatch_gws_cli','drive','files','get','--params',
            json.dumps({"fileId": did, "alt": "media"}),'--output', out],
            capture_output=True, text=True, timeout=600)
        if p.returncode == 0 and os.path.exists(out): ok += 1; break
        time.sleep(2)
    else:
        fail.append((did, r['name'], p.stderr[-200:] if p.stderr else ''))
print(f"downloaded/verified: {ok}, failed: {len(fail)}")
for f in fail: print("FAIL:", f)
