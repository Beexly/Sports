#!/usr/bin/env python3
"""Download the woff2 files referenced by gf.css and rewrite to local paths."""
import re, os, subprocess, sys

BASE = "/var/minis/shared/gse-waiver-wire-week2/fonts"
css = open(os.path.join(BASE, "gf.css")).read()
urls = sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", css)))

mapping = {}
for i, u in enumerate(urls):
    fam = "inter" if "inter" in u else "barlowcondensed"
    name = f"{fam}-{i:02d}.woff2"
    dest = os.path.join(BASE, name)
    if not os.path.exists(dest) or os.path.getsize(dest) == 0:
        r = subprocess.run(["curl", "-s", "-f", "-o", dest, u])
        if r.returncode != 0:
            print("FAIL", u); continue
    mapping[u] = name

for u, name in mapping.items():
    css = css.replace(u, name)

open(os.path.join(BASE, "local-fonts.css"), "w").write(css)
ok = [f for f in mapping.values() if os.path.getsize(os.path.join(BASE, f)) > 1000]
print(f"downloaded {len(ok)}/{len(urls)} fonts")
for f in sorted(ok):
    print(" ", f, os.path.getsize(os.path.join(BASE, f)))