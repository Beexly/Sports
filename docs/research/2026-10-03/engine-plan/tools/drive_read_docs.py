import json, subprocess, os

def extract_text(doc):
    """Extract plain text from Google Docs API JSON, preserving structure."""
    parts = []
    def walk(el):
        if isinstance(el, dict):
            if 'textRun' in el and 'content' in el['textRun']:
                parts.append(el['textRun']['content'])
            elif 'table' in el:
                for row in el['table'].get('tableRows', []):
                    cells = []
                    for cell in row.get('tableCells', []):
                        cparts = []
                        for ce in cell.get('content', []):
                            for pe in ce.get('paragraph', {}).get('elements', []):
                                tr = pe.get('textRun', {})
                                if 'content' in tr: cparts.append(tr['content'])
                        cells.append(''.join(cparts).strip())
                    parts.append(' | '.join(cells) + '\n')
            for v in el.values(): walk(v)
        elif isinstance(el, list):
            for v in el: walk(v)
    body = doc.get('body', {}).get('content', [])
    walk(body)
    return ''.join(parts)

docs = json.load(open('/tmp/gdocs.json'))
out = {}
for d in docs:
    p = subprocess.run(['hatch_gws_cli','docs','documents','get','--params',
        json.dumps({"documentId": d['id']})], capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        print("FAIL:", d['name'], p.stderr[-200:]); continue
    try:
        doc = json.loads(p.stdout)
        text = extract_text(doc)
        out[d['id']] = {'name': d['name'], 'chars': len(text)}
        with open(f"/home/hatch/workspace/eng-mine/drive-inventory/dl/gdoc_{d['id']}.txt", 'w') as f:
            f.write(f"# {d['name']}\n\n{text}")
        print(f"OK {len(text):8d} chars  {d['name'][:60]}")
    except Exception as e:
        print("PARSE FAIL:", d['name'], str(e)[:100])
json.dump(out, open('/home/hatch/workspace/eng-mine/drive-inventory/gdocs_meta.json','w'), indent=1)
print(f"\ndone: {len(out)}/16")
