#!/usr/bin/env python3
"""Fix the xlsx extraction for workbooks that use INLINE strings.

Root cause of the blank dump: gse_research_analysis.xlsx has NO
xl/sharedStrings.xml. Every text cell is stored inline as
<c r="A1" t="inlineStr"><is><t>value</t></is></c>. The first extractor only
looked at <v> and the shared-string table, so it read 0 of 10,749 text cells
and emitted a structurally valid but empty sheet dump. Silent, plausible,
useless -- exactly the failure mode to guard against.

This version handles BOTH storage forms and asserts it actually found text.
"""
import re, sys, zipfile
from pathlib import Path

EXTS = (".xlsx",)


def xlsx_text(p, max_chars=400_000):
    with zipfile.ZipFile(p) as z:
        names = z.namelist()

        # shared strings (may be absent)
        shared = []
        if "xl/sharedStrings.xml" in names:
            s = z.read("xl/sharedStrings.xml").decode("utf-8", "ignore")
            for si in re.findall(r"<si>(.*?)</si>", s, re.S):
                txt = "".join(re.findall(r"<t[^>]*>(.*?)</t>", si, re.S))
                shared.append(_clean(txt))

        wb = z.read("xl/workbook.xml").decode("utf-8", "ignore")
        rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8", "ignore")
        # Targets in workbook.xml.rels are commonly "worksheets/sheet1.xml" (relative
        # to xl/). Normalise BOTH the bare form and the absolute "/xl/..." form, and
        # fall back to positional order if the rels map cannot be trusted.
        rid2target = {}
        for rid, tgt in re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels):
            t = tgt.lstrip("/")
            if not t.startswith("xl/"):
                t = "xl/" + t
            rid2target[rid] = t

        declared = re.findall(r'<sheet[^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"', wb)
        if not declared:
            declared = [(n, None) for n in re.findall(r'<sheet[^>]*name="([^"]+)"', wb)]

        sheets = []
        positional = sorted(n for n in names if re.match(r"xl/worksheets/sheet\d+\.xml$", n))
        for i, (name, rid) in enumerate(declared):
            tgt = rid2target.get(rid)
            if tgt is None or tgt not in names:
                # fall back to positional correspondence
                tgt = positional[i] if i < len(positional) else None
            sheets.append((_clean(name), tgt))

        out, n_text, n_num = [], 0, 0
        for name, tgt in sheets:
            if tgt not in names:
                continue
            body = z.read(tgt).decode("utf-8", "ignore")
            rows = re.findall(r"<row[^>]*>(.*?)</row>", body, re.S)
            out.append("=== SHEET %s  (%d rows) ===" % (name, len(rows)))
            for r in rows[:600]:
                vals = []
                # capture r=, t= and BOTH <v> and inline <is><t>
                for cm in re.finditer(
                    r'<c\b([^>]*?)(?:/>|>(.*?)</c>)', r, re.S):
                    attrs, inner = cm.group(1) or "", cm.group(2) or ""
                    ref = re.search(r'r="([A-Z]+\d+)"', attrs)
                    ref = ref.group(1) if ref else "?"
                    t = re.search(r't="(\w+)"', attrs)
                    t = t.group(1) if t else "n"
                    if t == "inlineStr" or "<is>" in inner:
                        txt = "".join(re.findall(r"<t[^>]*>(.*?)</t>", inner, re.S))
                        if _clean(txt):
                            n_text += 1
                            vals.append("%s=%s" % (ref, _clean(txt)[:400]))
                        continue
                    vm = re.search(r"<v>(.*?)</v>", inner, re.S)
                    if not vm:
                        continue
                    v = vm.group(1)
                    if t == "s" and v.isdigit() and int(v) < len(shared):
                        n_text += 1
                        vals.append("%s=%s" % (ref, shared[int(v)][:400]))
                    else:
                        n_num += 1
                        vals.append("%s=%s" % (ref, _clean(v)[:120]))
                if vals:
                    out.append(" | ".join(vals)[:2500])
        txt = "\n".join(out)[:max_chars]
        return txt, n_text, n_num, [s[0] for s in sheets]


def _clean(s):
    s = (s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
          .replace("&quot;", '"').replace("&apos;", "'").replace("&#10;", " ")
          .replace("&#9;", " "))
    return re.sub(r"\s+", " ", s).strip()


if __name__ == "__main__":
    import json
    tgt = Path(sys.argv[1] if len(sys.argv) > 1
               else r"C:/Users/Garrett/Downloads/gse_research_analysis.xlsx")
    txt, n_text, n_num, sheets = xlsx_text(tgt)
    print("file      :", tgt.name)
    print("sheets    :", sheets)
    print("text cells: %d   numeric cells: %d" % (n_text, n_num))
    print("chars     :", len(txt))
    if n_text == 0:
        print("!! ZERO TEXT CELLS -- refusing to write a plausible-looking empty dump")
        sys.exit(2)
    outp = tgt.with_suffix(".FIXED.txt")
    outp.write_text(txt, encoding="utf-8")
    print("written   :", outp)
    print()
    print("---- first 60 lines ----")
    for line in txt.splitlines()[:60]:
        print(line[:200])
