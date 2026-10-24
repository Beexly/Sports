import os, sys, json, time

ROOTS = ["G:/My Drive", "G:/.shortcut-targets-by-id"]
OUT = r"C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\drive-full-census.jsonl"
TOP = r"C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\drive-top-files.txt"

def iter_dirs(root):
    for dp, dns, fs in os.walk(root, followlinks=False):
        # skip reparse points at the dir level (os.walk handles links, be safe)
        yield dp, fs

def fmt(n):
    for u in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or u == "TB":
            return f"{n:.1f}{u}"
        n /= 1024

start = time.time()
out = open(OUT, "w", encoding="utf-8")
top = []
total_bytes = 0
total_files = 0
ext_bytes = {}
dir_stats = {}
errors = []
for root in ROOTS:
    if not os.path.isdir(root):
        out.write(json.dumps({"error": f"root missing: {root}"}) + "\n")
        continue
    for dp, fs in iter_dirs(root):
        dsize = 0
        dcount = 0
        for f in fs:
            fp = os.path.join(dp, f)
            try:
                st = os.stat(fp, follow_symlinks=False)
            except OSError as e:
                errors.append(f"{fp}: {e}")
                continue
            sz = st.st_size
            dsize += sz
            dcount += 1
            total_bytes += sz
            total_files += 1
            ext = os.path.splitext(f)[1].lower() or "<none>"
            eb = ext_bytes.setdefault(ext, [0, 0])
            eb[0] += 1
            eb[1] += sz
            if sz > 50 * 1024 * 1024:
                top.append((sz, fp))
        rel = os.path.relpath(dp, "G:/")
        dir_stats[rel] = [dcount, dsize]
        out.write(json.dumps({"dir": rel, "files": dcount, "bytes": dsize}) + "\n")
        if int(time.time() - start) % 30 == 0 and dcount == 0:
            out.flush()

out.flush()
top.sort(reverse=True)
with open(TOP, "w", encoding="utf-8") as tf:
    tf.write(f"TOTAL: {total_files} files, {fmt(total_bytes)}\n\nTOP 80 FILES >50MB:\n")
    for sz, fp in top[:80]:
        tf.write(f"{fmt(sz):>10}  {fp}\n")
    tf.write("\nBY EXTENSION (count, size):\n")
    for ext, (cnt, sz) in sorted(ext_bytes.items(), key=lambda kv: -kv[1][1]):
        tf.write(f"{ext:<12} {cnt:>8}  {fmt(sz):>12}\n")
    tf.write("\nTOP 30 DIRS BY SIZE:\n")
    for d, (cnt, sz) in sorted(dir_stats.items(), key=lambda kv: -kv[1][1])[:30]:
        tf.write(f"{fmt(sz):>10}  {cnt:>7} files  {d}\n")
out.close()
print("TOTAL", total_files, "files", fmt(total_bytes))
print("dirs:", len(dir_stats), "errors:", len(errors))
print("top file:", fmt(top[0][0]), top[0][1] if top else "-")
