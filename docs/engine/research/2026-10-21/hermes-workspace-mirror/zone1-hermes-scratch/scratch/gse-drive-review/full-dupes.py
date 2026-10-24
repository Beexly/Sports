import os, json, hashlib

ROOTS = [
    r"C:\Users\Garrett\Downloads",
    r"C:\Users\Garrett\Documents",
    r"C:\Users\Garrett\Desktop",
    r"C:\Users\Garrett\Videos",
    r"C:\Users\Garrett\Pictures",
    r"C:\Users\Garrett\OneDrive",
    r"C:\Users\Garrett\iCloudPhotos",
    r"G:\My Drive\PC-offload",
    r"G:\My Drive\GSE. 10.2.26",
    r"G:\My Drive\GSN",
]
SKIP_PARTS = {"node_modules", ".git"}
OUT = r"C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\full-dupes.jsonl"
SUMMARY = r"C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\full-dupes-summary.txt"
MIN = 1024 * 1024

def fmt(n):
    for u in ("B","KB","MB","GB","TB"):
        if n < 1024 or u == "TB":
            return f"{n:.1f}{u}"
        n /= 1024

def md5(fp):
    h = hashlib.md5()
    with open(fp, "rb") as f:
        while True:
            b = f.read(1 << 21)
            if not b:
                break
            h.update(b)
    return h.hexdigest()

by_size = {}
scanned = 0
scanned_bytes = 0
for root in ROOTS:
    if not os.path.isdir(root):
        continue
    for dp, dns, fs in os.walk(root, followlinks=False):
        dns[:] = [d for d in dns if d.lower() not in SKIP_PARTS]
        for f in fs:
            fp = os.path.join(dp, f)
            try:
                sz = os.stat(fp, follow_symlinks=False).st_size
            except OSError:
                continue
            scanned += 1
            scanned_bytes += sz
            if sz < MIN:
                continue
            by_size.setdefault(sz, []).append(fp)
    print(f"indexed {root}", flush=True)

cands = {s: v for s, v in by_size.items() if len(v) > 1}
cand_files = sum(len(v) for v in cands.values())
print(f"scanned {scanned} files {fmt(scanned_bytes)}; dupe-candidate files {cand_files} ({fmt(sum(s*len(v) for s,v in cands.items()))})", flush=True)

dups = {}
done = 0
for s, paths in sorted(cands.items(), reverse=True):
    for fp in paths:
        try:
            dups.setdefault(md5(fp), []).append(fp)
        except OSError:
            pass
    done += len(paths)
    if done % 25 == 0:
        print(f"hashed {done}/{cand_files}", flush=True)

sets = {h: v for h, v in dups.items() if len(v) > 1}
rows = []
reclaim = 0
for h, paths in sets.items():
    sz = os.path.getsize(paths[0])
    # keep priority: canonical repos > My Drive originals > Downloads
    def rank(p):
        p2 = p.replace("/", "\\").lower()
        if "downloads" in p2: return 3
        if "pc-offload" in p2: return 2
        return 1
    keeper = sorted(paths, key=rank)[0]
    dupes = [p for p in paths if p != keeper]
    rows.append({"hash": h, "size": sz, "keep": keeper, "dupes": dupes})
    reclaim += sz * len(dupes)
rows.sort(key=lambda r: -r["size"] * len(r["dupes"]))

with open(SUMMARY, "w", encoding="utf-8") as f:
    f.write(f"scanned {scanned} files {fmt(scanned_bytes)} across 10 roots\n")
    f.write(f"EXACT DUPLICATE SETS: {len(rows)}  |  RECLAIMABLE: {fmt(reclaim)} across {sum(len(r['dupes']) for r in rows)} files\n\n")
    for r in rows:
        f.write(f"\n# {fmt(r['size'])} x{1+len(r['dupes'])}\nKEEP {r['keep']}\n")
        for d in r["dupes"]:
            f.write(f"DEL  {d}\n")
json.dump(rows, open(OUT.replace(".jsonl", ".json"), "w"), indent=0)
print(f"DONE. sets={len(rows)} reclaim={fmt(reclaim)}", flush=True)
