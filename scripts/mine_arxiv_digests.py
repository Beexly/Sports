#!/usr/bin/env python3
"""Mine the 1,557 arxiv-program paper digests for distributional-forecast methods.

The corpus is docs/arxiv-program/research/**/*.md -- one markdown digest per
paper. These are ALREADY-EXTRACTED summaries, not raw PDFs, so no pypdf needed.

Target: methods that reshape a PREDICTIVE DISTRIBUTION while holding the mean
fixed, since every sigma-only tweak on the frozen NFL filter plateaus at
7.13-7.15 and the gate needs 7.099.
"""
import os
import re
import json
import hashlib
from pathlib import Path

ROOT = Path(r"C:/Users/Garrett/Sports-wt-wf-cvi/docs/arxiv-program")
OUT = Path(os.environ.get("TMPDIR", ".")) / "arxiv_methods.json"

# Method signatures worth finding, weighted by direct applicability.
PATTERNS = {
    "heteroscedastic": (10, r"heteroscedastic|heteroskedastic|variance.{0,20}(function|model|predict)|scale.{0,15}(function|model)"),
    "crps": (12, r"\bCRPS\b|continuous ranked probability"),
    "quantile_regression": (10, r"quantile regression|pinball loss|simultaneous quantile"),
    "mixture": (8, r"mixture model|mixture density|two-?normal|Gaussian mixture|\bGMM\b"),
    "conformal": (9, r"conformal|jackknife\+|split conformal|Venn.?Abers|Mondrian"),
    "distributional": (10, r"distributional forecast|predictive distribution|forecast distribution"),
    "calibration": (7, r"calibrat\w+ (?:of|the|score|error)|isotonic|Platt scaling|temperature scaling"),
    "proper_scoring": (9, r"proper scoring rule|strictly proper|locally.?weighted CRPS|variogram"),
    "emkp": (12, r"ensemble model output statistics|EMOS|ensemble MOS"),
    "copula": (9, r"\bcopula\b"),
    "nrpd": (12, r"nonhomogeneous (?:Poisson|regression)|random.?effect|ordinal.{0,20}graphical"),
    "skew": (6, r"skewed|skew-?normal|skew-?t\b|asymmetric\w* (?:distribution|loss)"),
    "kde": (6, r"kernel density|bandwidth|KDE\b"),
    "bayesian": (5, r"Bayesian\w* (?:neural|regression|model)|posterior predictive|variational inference"),
    "hetero_ordinal": (11, r"ordinal\w* (?:model|regression|logistic)|proportional odds|ordered logit"),
    "gradient_boosting_quantile": (9, r"LightGBM|XGBoost|gradient boost\w*|quantile.{0,15}(forest|boosting)|NGBoost"),
    "energy_score": (8, r"energy score|kernel score|variogram score"),
    "lwk_crps": (11, r"locally.?weighted|CRPS.{0,20}(decompos|kernel|weighted)"),
}

files = sorted(ROOT.rglob("*.md"))
print("paper digests:", len(files))

hits = {}          # pattern -> list of (file, excerpt, score_context)
seen_paper = set()

for f in files:
    try:
        txt = f.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        continue
    if len(txt.strip()) < 120:
        continue
    for name, (weight, pat) in PATTERNS.items():
        for m in re.finditer(pat, txt, re.I):
            s = max(0, m.start() - 200)
            e = min(len(txt), m.end() + 260)
            seg = " ".join(txt[s:e].split())
            key = (f.name, name)
            if key in seen_paper:
                continue
            seen_paper.add(key)
            hits.setdefault(name, []).append({
                "file": str(f.relative_to(ROOT)),
                "weight": weight,
                "excerpt": seg[:520],
            })

print()
print("=== PATTERN HITS BY METHOD ===")
ranked = sorted(hits.items(), key=lambda kv: -len(kv[1]))
for name, lst in ranked:
    print("  %-26s %4d" % (name, len(lst)))

# Any explicit CRPS / score numbers at all in the corpus?
print()
num_pat = re.compile(r"\b(?:CRPS|Brier|score)\b[^.\n]{0,60}?(\d+\.\d{3,})", re.I)
numeric = []
for f in files:
    try:
        txt = f.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        continue
    for m in num_pat.finditer(txt):
        numeric.append((m.group(1), str(f.relative_to(ROOT)),
                        " ".join(txt[max(0, m.start()-90):m.end()+90].split())[:300]))
print("explicit score numbers found:", len(numeric))
if numeric:
    print("=== SCORE MENTIONS ===")
    seen = set()
    for val, fn, ctx in numeric[:40]:
        k = (val, fn)
        if k in seen:
            continue
        seen.add(k)
        print("  %-9s %s" % (val, fn[-58:]))
        print("      %s" % ctx[:230])

OUT.write_text(json.dumps({
    "files_scanned": len(files),
    "pattern_hits": {k: len(v) for k, v in ranked},
    "hits": {k: v for k, v in ranked},
    "numeric_mentions": [{"value": v, "file": f, "context": c} for v, f, c in numeric[:120]],
}, ensure_ascii=False, indent=1), encoding="utf-8")
print()
print("written", OUT)
