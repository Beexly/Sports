#!/usr/bin/env python3
"""Convert the Google woff2 latin subsets to TTF and install for fontconfig."""
import re, os, subprocess
from fontTools.ttLib import TTFont

BASE = "/var/minis/shared/gse-waiver-wire-week2/fonts"
DEST = "/usr/share/fonts/gse"
os.makedirs(DEST, exist_ok=True)

css = open(os.path.join(BASE, "local-fonts.css")).read()
blocks = re.findall(r"@font-face\s*\{(.*?)\}", css, re.S)

installed = []
for b in blocks:
    fam = re.search(r"font-family:\s*'([^']+)'", b)
    wt = re.search(r"font-weight:\s*(\d+)", b)
    st = re.search(r"font-style:\s*(\w+)", b)
    src = re.search(r"url\(([^)]+)\)", b)
    ur = re.search(r"unicode-range:\s*([^;]+);", b)
    if not (fam and wt and src):
        continue
    if ur and "U+0000-00FF" not in ur.group(1):   # latin block only
        continue
    path = os.path.join(BASE, src.group(1))
    if not os.path.exists(path):
        continue
    style = st.group(1) if st else "normal"
    tag = f"{fam.group(1).replace(' ','')}-{wt.group(1)}-{style}"
    f = TTFont(path)
    out = os.path.join(DEST, tag + ".ttf")
    f.flavor = None
    f.save(out)
    installed.append(tag)

print("installed:", installed)
subprocess.run(["fc-cache", "-f"], check=False)
r = subprocess.run(["fc-list"], capture_output=True, text=True)
for line in r.stdout.splitlines():
    if "Inter" in line or "Barlow" in line:
        print("FC:", line)