"""Lock the corpus and write the manifest for the night loop. One-shot."""
import os, json

root = r'C:\Users\Garrett\Sports-wt-engineplan\docs\arxiv-program\research\2026-09-21\arxiv-deep'
files = []
for dp, dn, fn in os.walk(root):
    dn[:] = [d for d in dn if d not in {'.git', 'node_modules', '__pycache__'}]
    for f in fn:
        if os.path.splitext(f)[1].lower() in ('.md', '.txt', '.tex'):
            files.append(os.path.join(dp, f).replace(os.sep, '/'))
files.sort()
outdir = r'C:\Users\Garrett\onejev\inbox\mind-queue'
os.makedirs(outdir, exist_ok=True)
with open(os.path.join(outdir, 'corpus-manifest.json'), 'w') as fh:
    json.dump({'corpus': root.replace(os.sep, '/'), 'n': len(files), 'files': files}, fh)
print('corpus locked:', root.replace(os.sep, '/'))
print('docs:', len(files))
print('first 3:', files[:3])