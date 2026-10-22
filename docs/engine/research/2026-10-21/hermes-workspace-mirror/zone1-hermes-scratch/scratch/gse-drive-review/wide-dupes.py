import os, sys, json, hashlib

ROOTS = [
    r"C:\Users\Garrett\Downloads",
    r"C:\Users\Garrett\Turner_Case_AI",
    r"C:\Users\Garrett\Turner_Case_Media_PRESERVED_2026-08-02",
    r"C:\Users\Garrett\XXX_RECOVERY_CONTROL",
    r"C:\Users\Garrett\OneDrive",
    r"C:\Users\Garrett\Videos",
    r"C:\Users\Garrett\Claude",
    r"C:\Users\Garrett\Documents",
    r"C:\Users\Garrett\Desktop",
    r"C:\Users\Garrett\Pictures",
    r"C:\Users\Garrett\privacy-hardening",
    r"C:\Users\Garrett\iCloudPhotos",  # 125-file candidate set only, cheap
]
SKIP_PARTS = {"node_modules", ".git", "$recycle.bin"}
MIN_SIZE = 1024 * 1024  # ignore sub-1MB files for the cross-folder pass
OUT = r"C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\wide-dupes.json"
LOG = r"C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\wide-dupes-summary.txt"

def fmt(n):
    for u in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or u == "TB":
            return f"{n:.1f}{u}"
        n /= 1024

def md5(fp, buf=1 << 20):
    h = hashlib.md5()
    with open(fp, "rb") as f:
        while True:
            b = f.read(buf)
            if not b:
                break
            h.update(b)
    return h.hexdigest()

# pass 1: size index across all roots
by_size = {}
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
            if sz < MIN_SIZE:
                continue
            by_size.setdefault(sz, []).append(fp)

cands = {s: v for s, v in by_size.items() if len(v) > 1}
print(f"multi-size groups: {len(cands)}, candidate files: {sum(len(v) for v in cands.values())}, candidate bytes: {fmt(sum(s*len(v) for s,v in cands.items()))}")

# pass 2: hash
dups = {}
for s, paths in sorted(cands.items(), reverse=True):
    for fp in paths:
        try:
            dups.setdefault(md5(fp), []).append(fp)
        except OSError:
            pass

sets = {h: v for h, v in dups.items() if len(v) > 1}
reclaim = 0
rows = []
for h, paths in sets.items():
    sz = os.path.getsize(paths[0])
    keeper = sorted(paths, key=lambda p: (p.startswith("C:\\Users\\Garrett\\Downloads"), len(p), p))[0]
    rows.append({"hash": h, "size": sz, "keep": keeper, "dupes": [p for p in paths if p != keeper]})
    reclaim += sz * (len(paths) - 1)
rows.sort(key=lambda r: -r["size"] * len(r["dupes"]))
json.dump(rows, open(OUT, "w", encoding="utf-8"), indent=0)

with open(LOG, "w", encoding="utf-8") as f:
    f.write(f"dupe sets: {len(sets)}\nreclaimable: {fmt(reclaim)}\n\n")
    for r in rows[:120]:
        f.write(f"\n# {fmt(r['size'])} x{1+len(r['dupes'])}\nKEEP {r['keep']}\n")
        for d in r["dupes"]:
            f.write(f"DEL  {d}\n")
    f.write(f"\nTOTAL RECLAIMABLE: {fmt(reclaim)} across {sum(len(r['dupes']) for r in rows)} files\n")
print(f"dupe sets: {len(sets)} | reclaimable: {fmt(reclaim)}")
print("summary:", LOG)
