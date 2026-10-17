import os, glob, json

output_feed = r'c:\Users\Garrett\Sports\brain\feeds\2026-10-11\trainer_feed.jsonl'
os.makedirs(os.path.dirname(output_feed), exist_ok=True)

docs_dirs = [
    r'c:\Users\Garrett\Sports\docs\engine\research\2026-10-11',
    r'c:\Users\Garrett\Sports\docs\dfs\research\2026-10-11',
    r'c:\Users\Garrett\Sports\docs\props\research\2026-10-11',
    r'c:\Users\Garrett\Sports\docs\predictions\research\2026-10-11',
    r'c:\Users\Garrett\Sports\docs\data-sources\research\2026-10-11'
]

entries = 0
with open(output_feed, 'w', encoding='utf-8') as out:
    for d in docs_dirs:
        for ext in ['*.md', '*.txt', '*.json', '*.csv', '*.html']:
            for fp in glob.glob(os.path.join(d, ext)):
                try:
                    with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    rec = {
                        'source': os.path.basename(fp),
                        'category': os.path.basename(os.path.dirname(os.path.dirname(fp))),
                        'path': fp,
                        'text': content
                    }
                    out.write(json.dumps(rec) + '\n')
                    entries += 1
                except Exception as e:
                    print(f'Error reading {fp}: {e}')

print(f'Synthesized {entries} trainer-ready mind feed documents into {output_feed}')
