# Hermes overnight Wave 1 builder: arxiv-program gap ingestion -> trainer feed.
# Grounding: every verbatim_quote is extracted from a real repo source
# (prediction-engine module JSDoc header or MASTER-PAPER-INDEX.md row),
# then ASCII-transliterated and public-jargon-scrubbed per shift guardrails.
# Provenance (source_path + source_line) is preserved on every record.
import json, glob, re, os, sys, collections

WT = r"C:\Users\Garrett\Sports-worktrees\hermes-sunday-watch-2026-11-15"
os.chdir(WT)
sys.path.insert(0, WT)
from intelligence.foundry_bridge.sovereign_to_cognitive_router_wiring import (
    SITUATIONAL_FAMILIES, classify_text_to_family, compute_family_bit_index)

SCRATCH = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch"
chosen = json.load(open(os.path.join(SCRATCH, "wave1_chosen.json")))
modmap = json.load(open(os.path.join(SCRATCH, "wave1_modmap.json")))

# existing record_ids for dedupe
existing_ids = set()
OUT_REL = "brain/feeds/2026-11-15/hermes_arxiv_and_microstructure_wave1.jsonl"
for fp in glob.glob("brain/feeds/**/*.jsonl", recursive=True):
    if fp.replace("\\","/") == OUT_REL: continue  # never dedupe against our own output
    with open(fp, encoding="utf-8", errors="ignore") as f:
        for line in f:
            if not line.strip(): continue
            try: r = json.loads(line)
            except Exception: continue
            if r.get("record_id"): existing_ids.add(r["record_id"])

TRANS = {
    "\u2013":"-","\u2014":"-","\u2015":"-","\u2212":"-","\u2018":"'","\u2019":"'","\u201c":'"',"\u201d":'"',
    "\u2026":"...","\u00a0":" ","\u2192":"->","\u2190":"<-","\u2264":"<=","\u2265":">=","\u2260":"!=","\u2248":"~",
    "\u2208":" in ","\u2200":" for all ","\u2203":" exists ","\u00d7":"x","\u00f7":"/","\u221a":"sqrt",
    "\u221e":"inf","\u2211":"sum","\u220f":"prod","\u222b":"int","\u2202":"d","\u2207":"grad","\u2297":"(x)",
    "\u00b2":"^2","\u00b3":"^3","\u00bd":"1/2","\u00bc":"1/4","\u00be":"3/4","\u00b1":"+/-","\u00b7":"*",
    "\u03b1":"alpha","\u03b2":"beta","\u03b3":"gamma","\u03b4":"delta","\u03b5":"epsilon","\u03b6":"zeta",
    "\u03b7":"eta","\u03b8":"theta","\u03ba":"kappa","\u03bb":"lambda","\u03bc":"mu","\u03bd":"nu",
    "\u03be":"xi","\u03c0":"pi","\u03c1":"rho","\u03c3":"sigma","\u03c4":"tau","\u03c6":"phi","\u03c7":"chi",
    "\u03c8":"psi","\u03c9":"omega","\u0393":"Gamma","\u0394":"Delta","\u0398":"Theta","\u039b":"Lambda",
    "\u039e":"Xi","\u03a0":"Pi","\u03a3":"Sigma","\u03a6":"Phi","\u03a8":"Psi","\u03a9":"Omega",
    "\u2081":"_1","\u2082":"_2","\u2080":"_0","\u00e9":"e","\u00e8":"e","\u00e0":"a","\u00e7":"c","\u00f1":"n",
    "\u2010":"-","\u2011":"-","\u2012":"-","\u2032":"'","\u2033":"''","\u22c5":"*","\u2218":"o",
}
JARGON = [
    ("Sinkhorn-Knopp","entropic-transport solver"),("Sinkhorn","entropic-transport solver"),
    ("Cholesky","triangular factor"),("Optimal Transport","entropy-regularized transport"),
    ("optimal transport","entropy-regularized transport"),("tau_hat","tau-estimate"),
    ("Romano","researcher"),("JEV","simulation engine"),
    ("10,000 worlds","full-game simulation ensemble"),("1,750,000","large ensemble count"),
    ("22,750,000","large ensemble count"),("62-23-1","prior-record"),("31-11","prior-record"),
    ("14-6","prior-record"),("57.0%","57.0/100"),("66.0%","66.0/100"),("67.8%","67.8/100"),
]
def ascii_clean(s):
    for k,v in TRANS.items(): s = s.replace(k,v)
    s = s.encode("ascii","ignore").decode("ascii")
    return s
def scrub(s):
    for k,v in JARGON: s = s.replace(k,v)
    return s

INDEX = "docs/arxiv-program/research/MASTER-PAPER-INDEX.md"
index_lines = open(INDEX, encoding="utf-8", errors="ignore").read().splitlines()

def module_header(path):
    txt = open(path, encoding="utf-8", errors="ignore").read()
    lines = txt.splitlines()
    m = re.search(r"/\*\*(.*?)\*/", txt, re.S)
    doc = []
    if m:
        for ln in m.group(1).splitlines():
            ln = ln.strip()
            if ln.startswith("*"): ln = ln[1:].strip()
            if ln: doc.append(ln)
    else:
        for ln in lines[:15]:
            ln = ln.strip()
            if ln.startswith("//"): doc.append(ln[2:].strip())
            elif ln.startswith("#"): doc.append(ln[1:].strip())
    return txt, doc

records, skipped, stats = [], [], collections.Counter()
for aid, g in sorted(chosen.items()):
    topic = g["topic"]
    # corpus discipline: never ingest rows the index itself adjudicated REJECT/off-domain
    if g["status"] == "off-domain" or re.match(r"^REJECT\s*[-\u2014:]", g["summary"].strip()):
        skipped.append((aid,"index_reject_verdict")); continue
    rid = f"arxiv_gap:{aid}:{topic}"
    if rid in existing_ids:
        skipped.append((aid,"dupe_record_id")); continue
    mod = modmap.get(aid)
    title = g["title"][:200]  # clean paper title from the master index, not module banners
    if mod:
        raw, doc = module_header(mod)
        if not doc:
            skipped.append((aid,"empty_header")); continue
        quote = " ".join(doc[1:6])[:420] or " ".join(doc[:1])[:420]
        eq = ""
        for ln in doc:
            if "=" in ln and re.search(r"\\|P\(|E\[|log|exp|sum|\^|_", ln):
                eq = ln[:300]; break
        src_path, src_line = mod.replace("\\","/"), 1
        tag = "[DIRECT-PORT]"
        stats["module_grounded"] += 1
    else:
        raw = index_lines[g["line"]-1]
        title = g["title"][:200]
        quote = g["summary"][:420]
        eq = ""
        src_path, src_line = INDEX, g["line"]
        tag = "[INDEX-ABSTRACT]"
        stats["index_grounded"] += 1
    # grounding check: module quotes are extracted from the file's JSDoc lines
    # (join them for the containment check); index quotes must sit in the row.
    raw_for_check = " ".join(doc) if mod else raw
    raw_s = scrub(re.sub(r"\s+", " ", ascii_clean(raw_for_check)))
    quote_s = scrub(ascii_clean(quote))
    if quote_s and quote_s not in raw_s:
        first = quote_s.split(". ")[0]
        if first not in raw_s:
            skipped.append((aid,"quote_not_in_source")); continue
    fam = classify_text_to_family(f"{title} {g['summary']} {quote}", domain="other")
    bit = compute_family_bit_index(fam, f"arxiv:{aid}:{topic}")
    rec = {
        "schema": "gse.mind_trainer_feed.arxiv_sovereign.v1",
        "record_id": rid,
        "record_type": "arxiv_program_primitive",
        "book_id": f"arxiv:{aid}",
        "title": scrub(ascii_clean(title)),
        "track": "arxiv_and_preprints",
        "primary_domain": "other",
        "situational_family": fam,
        "router_bit_index": bit,
        "layer2_tag": tag,
        "primitive_name": scrub(ascii_clean(f"{aid} {title}"))[:160],
        "canonical_form": scrub(ascii_clean(eq)),
        "gse_mapping": scrub(ascii_clean(
            f"Wave-1 gap fill for {topic} coverage; master-index status '{g['status']}'"
            + (f"; equation port exists at {src_path} but had no trainer-feed record." if mod
               else "; abstract-level primitive from the master index row, no code module yet.")
            + f" Routed to {fam} bit {bit}.")),
        "verbatim_quote": quote_s,
        "source_page": 1,
        "source_path": src_path,
        "source_line": src_line,
        "arxiv_ids": [aid],
        "ingestion_wave": "hermes-overnight-2026-11-15-wave1",
        "ascii_transliterated": True,
        "topic_bucket": topic,
    }
    records.append(rec)

out = "brain/feeds/2026-11-15/hermes_arxiv_and_microstructure_wave1.jsonl"
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="ascii", newline="\n") as f:
    for r in records:
        f.write(json.dumps(r, ensure_ascii=True) + "\n")

# ---- validation pass ----
errs = []
seen = set()
banned = ["JEV","Sinkhorn","Cholesky","10,000 worlds","1,750,000","22,750,000","Romano",
          "tau_hat","Optimal Transport","62-23-1","31-11","14-6","57.0%","66.0%","67.8%"]
for i, line in enumerate(open(out, encoding="ascii"), 1):
    if any(ord(c) > 127 for c in line): errs.append((i,"non_ascii"))
    r = json.loads(line)
    if r["record_id"] in seen: errs.append((i,"dupe"))
    seen.add(r["record_id"])
    if r["record_id"] in existing_ids: errs.append((i,"dupe_vs_existing"))
    if r["situational_family"] not in SITUATIONAL_FAMILIES: errs.append((i,"bad_family"))
    if not (0 <= r["router_bit_index"] <= 287): errs.append((i,"bad_bit"))
    for b in banned:
        if b in line: errs.append((i,"banned:"+b))
print("records:", len(records), "skipped:", len(skipped), dict(stats))
print("topic counts:", dict(collections.Counter(r["topic_bucket"] for r in records)))
print("family counts:", dict(collections.Counter(r["situational_family"] for r in records)))
print("validation errors:", errs[:10], "total", len(errs))
print("skipped detail:", skipped[:10])
print("out:", os.path.abspath(out), os.path.getsize(out), "bytes")
json.dump({"records":len(records),"skipped":skipped,"stats":dict(stats),
           "topics":dict(collections.Counter(r["topic_bucket"] for r in records)),
           "families":dict(collections.Counter(r["situational_family"] for r in records)),
           "errors":errs}, open(os.path.join(SCRATCH,"wave1_build_report.json"),"w"), indent=1)