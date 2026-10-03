import json, os, re

ZX = '/home/hatch/workspace/eng-mine/drive-inventory/zx/eyi1003'
rows = [json.loads(l) for l in open('/home/hatch/workspace/eng-mine/drive-inventory/inventory.jsonl') if l.strip()]
idmap = {r['id']: r for r in rows if 'folder' not in r.get('mimeType','')}
zrec = None
for did, r in idmap.items():
    if r['name'] == 'EYI Package_10-03-2026_1791002691.zip': zrec = r; break
sp_base = f"gdrive/GSE. 10.2.26/ROOT/{zrec['name']}"

# sports/engine-relevant only; skip personal financial/medical
SKIP_PREFIXES = ('workspace/goals/fsa-reimbursement-sweep', 'workspace/goals/wells-fargo-financial-deep-dive',
                 'workspace/goals/rob-wiley-turner-construction-discrimination-case-follow-up')
SKIP_FILES = ('Billing___Payments_-_Vytalus_Medical_Group.pdf',)

out = []
skipped = []
for root, _, fs in os.walk(ZX):
    for f in sorted(fs):
        fp = os.path.join(root, f)
        rel = os.path.relpath(fp, ZX)
        if rel.startswith(SKIP_PREFIXES) or f in SKIP_FILES:
            skipped.append(rel); continue
        if f.endswith(('.mp4','.mp3','.wav','.jpg','.png','.zip','.docx')):
            skipped.append(rel + " [media/binary: noted, not fed]"); continue
        if not f.endswith(('.md','.txt','.pdf')):
            skipped.append(rel + " [non-text: skipped]"); continue
        try:
            if f.endswith('.pdf'):
                import subprocess
                txt = subprocess.run(['pdftotext','-layout',fp,'-'], capture_output=True, timeout=120).stdout.decode('utf-8', errors='replace')
            else:
                txt = open(fp, encoding='utf-8', errors='replace').read()
        except Exception as e:
            skipped.append(rel + f" [read error: {e}]"); continue
        if not txt.strip():
            skipped.append(rel + " [empty]"); continue
        if len(txt) > 60000:
            parts = re.split(r'(?m)^(?=#{1,3} )', txt)
            acc, pi = '', 1
            for p in parts:
                if len(acc) + len(p) > 60000 and acc.strip():
                    out.append({"source_path": f"{sp_base}!/{rel}", "host": "vm",
                        "bytes_read": len(acc.encode()), "coverage": "full", "row_type": "concept",
                        "title": f"EYI: {rel} (part {pi})", "body": acc, "equations": []}); pi += 1; acc = ''
                acc += p
            if acc.strip():
                out.append({"source_path": f"{sp_base}!/{rel}", "host": "vm",
                    "bytes_read": len(acc.encode()), "coverage": "full", "row_type": "concept",
                    "title": f"EYI: {rel} (part {pi})", "body": acc, "equations": []})
        else:
            out.append({"source_path": f"{sp_base}!/{rel}", "host": "vm",
                "bytes_read": len(txt.encode()), "coverage": "full", "row_type": "concept",
                "title": f"EYI: {rel}", "body": txt, "equations": []})

json.dump(out, open('/tmp/u12_eyi.json','w'))
json.dump(skipped, open('/tmp/u12_eyi_skipped.json','w'), indent=1)
print("eyi rows:", len(out), "skipped:", len(skipped))
for s in skipped[:20]: print("  SKIP:", s[:100])
