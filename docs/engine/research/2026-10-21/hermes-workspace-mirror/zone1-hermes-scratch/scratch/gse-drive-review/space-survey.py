import os, json

def dir_size(root, maxdepth=4, skip=set()):
    total = 0
    count = 0
    base_depth = root.rstrip("/\\").count("\\/") + root.count("/")
    for dp, dns, fs in os.walk(root, followlinks=False):
        depth = dp.replace("/", "\\").count("\\")
        if depth - root.count("\\") >= maxdepth:
            dns[:] = []
        if skip & {d.lower() for d in dns}:
            dns[:] = [d for d in dns if d.lower() not in skip]
        for f in fs:
            try:
                total += os.stat(os.path.join(dp, f), follow_symlinks=False).st_size
                count += 1
            except OSError:
                pass
    return total, count

home = r"C:\Users\Garrett"
results = []
skip = {"node_modules", ".git", "cache", "recycle.bin", "$recycle.bin"}
for name in sorted(os.listdir(home)):
    p = os.path.join(home, name)
    if os.path.isdir(p) and not os.path.islink(p):
        try:
            sz, cnt = dir_size(p, maxdepth=3, skip=skip)
            results.append((sz, cnt, p))
        except Exception as e:
            results.append((-1, -1, f"{p} ERR {e}"))

results.sort(reverse=True)
print("TOP USER DIRS (excl node_modules/.git/cache from totals):")
for sz, cnt, p in results[:25]:
    if sz < 0:
        print("ERR ", p)
    else:
        print(f"{sz/1e9:8.2f}GB {cnt:>9}  {p}")

# quick wins: caches that are always safe
caches = [
    r"C:\Users\Garrett\AppData\Local\npm-cache",
    r"C:\Users\Garrett\AppData\Local\pip\cache",
    r"C:\Users\Garrett\AppData\Local\Temp",
    r"C:\Users\Garrett\AppData\Local\pnpm-cache",
    r"C:\Users\Garrett\AppData\Local\Microsoft\Playwright",
    r"C:\Users\Garrett\AppData\Roaming\npm-cache",
    r"C:\Users\Garrett\.uv",
    r"C:\Users\Garrett\.cache",
]
print("\nCACHE DIRS:")
for c in caches:
    if os.path.isdir(c):
        sz, cnt = dir_size(c, maxdepth=4)
        print(f"{sz/1e9:8.2f}GB {cnt:>9}  {c}")
