import os, sys, json, hashlib

ROOT = r"C:\Users\Garrett\iCloudPhotos"
OUT = r"C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\icloud-dupes.jsonl"
LOG = r"C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\icloud-dupes-summary.txt"

def md5(fp, buf=1 << 20):
    h = hashlib.md5()
    with open(fp, "rb") as f:
        while True:
            b = f.read(buf)
            if not b:
                break
            h.update(b)
    return h.hexdigest()

# pass 1: group by size
by_size = {}
total = 0
for dp, _, fs in os.walk(ROOT, followlinks=False):
    for f in fs:
        fp = os.path.join(dp, f)
        try:
            sz = os.stat(fp, follow_symlinks=False).st_size
        except OSError:
            continue
        if sz == 0:
            continue
        by_size.setdefault(sz, []).append(fp)
        total += sz

# only sizes with >1 file can contain dupes
candidates = {s: v for s, v in by_size.items() if len(v) > 1}
print(f"total files bytes scanned: {len(by_size)} sizes, {sum(len(v) for v in by_size.values())} files, {total/1e9:.1f}GB")
print(f"candidate sizes (multi-file): {len(candidates)} groups, {sum(len(v) for v in candidates.values())} files, {sum(s*len(v) for s,v in candidates.items())/1e9:.1f}GB")

# pass 2: hash candidates
dups = {}  # hash -> [paths]
seen_bytes = 0
out = open(OUT, "w", encoding="utf-8")
for s, paths in sorted(candidates.items(), reverse=True):
    for fp in paths:
        try:
            h = md5(fp)
        except OSError:
            continue
        dups.setdefault(h, []).append(fp)
        seen_bytes += s
out.close()

# dupe sets: >1 path with same hash
sets = {h: v for h, v in dups.items() if len(v) > 1}
reclaimable = 0
with open(LOG, "w", encoding="utf-8") as f:
    f.write(f"files scanned: {sum(len(v) for v in by_size.values())}, bytes: {total/1e9:.2f}GB\n")
    f.write(f"hashed candidates: {sum(len(v) for v in candidates.values())} files, {seen_bytes/1e9:.2f}GB\n")
    f.write(f"dupe sets: {len(sets)}\n")
    keep = []
    for h, paths in sorted(sets.items(), key=lambda kv: -os.path.getsize(kv[1][0]) * (len(kv[1]) - 1)):
        sz = os.path.getsize(paths[0])
        reclaim = sz * (len(paths) - 1)
        reclaimable += reclaim
        keeper = sorted(paths)[0]
        keep.append(keeper)
        f.write(f"\n# {fmt(sz)} x{len(paths)} -> reclaim {fmt(reclaim)}\n")
        for p in paths:
            tag = "KEEP" if p == keeper else "DEL "
            f.write(f"{tag} {p}\n")
    f.write(f"\nRECLAIMABLE TOTAL: {reclaimable/1e9:.2f}GB from {sum(len(v)-1 for v in sets.values())} duplicate files\n")
    json.dump(keep, open(LOG.replace("summary.txt", "keepers.json"), "w"), indent=0)

def fmt(n):
    for u in ("B", "KB", "MB", "GB"):
        if n < 1024 or u == "GB":
            return f"{n:.1f}{u}"
        n /= 1024
print(f"dupe sets: {len(sets)}, reclaimable: {reclaimable/1e9:.2f}GB")
