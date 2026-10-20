import json, os, collections

WT = r"C:/Users/Garrett/Sports-wt-audit-20261020"
CORPUS = os.path.join(WT, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl")
recs = [json.loads(l) for l in open(CORPUS, encoding="utf8")]

# Locate every source file the corpus cites.
srcs = collections.Counter(r.get("source_file") for r in recs)
paths = {}
for f in srcs:
    if not f:
        continue
    for root in ("docs", "packages/prediction-engine/data", "data", "research",
                 "reconciliation", "."):
        p = os.path.join(WT, root, f)
        if os.path.isfile(p):
            paths[f] = p
            break
    else:
        # recursive fallback: walk docs/ for the basename
        for base, _dirs, files in os.walk(os.path.join(WT, "docs")):
            if f in files:
                paths[f] = os.path.join(base, f)
                break
        else:
            for base, _dirs, files in os.walk(WT):
                if "node_modules" in base or "/.git" in base:
                    continue
                if f in files:
                    paths[f] = os.path.join(base, f)
                    break
print("source files located: %d of %d" % (len(paths), len(srcs)))
print()

# THE REAL L3 TEST: anchor the evidence quote in the ACTUAL source document
# at the character's claimed offsets. This is what "SAV character-offset
# anchoring" means, and it is the only test that can catch a quote that
# was never in a document at all.
stats = collections.Counter()
offset_ok = 0
offset_bad = 0
substring_ok = 0
substring_bad = 0
no_file = 0
examples_bad = []

for r in recs:
    f = r.get("source_file")
    q = (r.get("evidence_quote") or "").strip()
    if not f or not q:
        stats["no_source_or_quote"] += 1
        continue
    p = paths.get(f)
    if not p:
        no_file += 1
        continue
    try:
        text = open(p, encoding="utf8", errors="replace").read()
    except Exception:
        no_file += 1
        continue

    sp = r.get("evidence_span") or {}
    st = sp.get("start_char")
    en = sp.get("end_char")
    if isinstance(st, int) and isinstance(en, int) and 0 <= st < en <= len(text):
        window = text[st:en]
        if window.strip() == q.strip():
            offset_ok += 1
            stats["offset_exact"] += 1
        else:
            offset_bad += 1
            stats["offset_mismatch"] += 1
            if len(examples_bad) < 3:
                examples_bad.append(("offset", r.get("title"), q[:80], window[:80]))
    else:
        stats["offset_unusable"] += 1

    if q in text:
        substring_ok += 1
        stats["substring_present"] += 1
    else:
        substring_bad += 1
        stats["substring_absent"] += 1
        if len(examples_bad) < 6:
            examples_bad.append(("substring", r.get("title"), q[:80], ""))

print("=== L3, REAL: the quote anchored in the ACTUAL source document ===")
for k, v in stats.most_common():
    print("  %-22s %5d" % (k, v))
print()
print("  offset exact:     %d" % offset_ok)
print("  offset MISMATCH:  %d" % offset_bad)
print("  quote present in the file text:  %d" % substring_ok)
print("  quote ABSENT from the file text: %d" % substring_bad)
print("  source file not locatable:       %d" % no_file)
print()
if examples_bad:
    print("=== examples ===")
    for kind, title, q, win in examples_bad:
        print("  [%s] %s" % (kind, str(title)[:70]))
        print("      quote  : %s" % q)
        if win:
            print("      window : %s" % win)
