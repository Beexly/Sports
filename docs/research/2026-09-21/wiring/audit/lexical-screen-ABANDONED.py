#!/usr/bin/env python3
"""
GSE ledger BODY audit v2, 2026-09-26.

v1 was wrong and is replaced. v1 classified on "paper-side claim vocabulary
absent from body", which produced false positives on modules that plainly
implement what they claim -- hand-checked 2501-08710v2-calibration (body
exports brierScore/logLoss/ReliabilityBin, matching its Mechanism field) and
2412-15832-weather-feature (airDensity/windTotalAdjustment) were both wrongly
flagged. Vocabulary mismatch is not evidence of a hollow body.

v2 measures two things decidable WITHOUT reading the paper, because both live
inside the file:

  AXIS 1 - body vs its own Mechanism field.
     Does the code implement the algorithm the Mechanism field describes?

  AXIS 2 - internal disagreement between the file's own paper-side fields and
     its code-side field. The ledger template carries BOTH: "Improvement
     (record)" and "ACCEPTANCE GATE" state the paper's contribution;
     "Mechanism" states what the code does. A file whose own two fields
     describe different methods is mis-attributed on its face. 2601-03099 is
     exactly this: gate says time-aware synthetic control, Mechanism and body
     say ReID tracklet association.

v2 CANNOT decide, and does not claim: whether the Mechanism field correctly
describes the cited arXiv paper. That needs the paper. Reported as unresolved.
"""
import os, re, json, csv
from collections import Counter

REPO = "/tmp/wtp"
OUT_CSV = "/tmp/wtp/audit/body-audit-2026-09-26.csv"

STOP = set("""a an the of for to in on and or with by from is are was were be been being as at
that this these those it its into over under more most less least than then so such no not
can could may might will would shall should do does did done each other another use used
using make makes made new old first second third best better good high low large small
gse module implements provides adds gains ledger arxiv accept adopts records record
mechanism improvement field engine pipeline ingest role verify validated validation
pure additive wiring paths path live returns return function functions""".split())


def terms(s, minlen=5):
    return {w for w in re.findall(r"[a-z][a-z\-]{%d,}" % (minlen - 1), s.lower()) if w not in STOP}


def split_header_body(text):
    m = re.match(r"\s*/\*\*(.*?)\*/", text, re.S)
    if not m:
        return "", text
    return m.group(1), text[m.end():]


def grab(pattern, header):
    m = re.search(pattern, header, re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""


def code_only(body_lines):
    out = []
    for i, line in enumerate(body_lines, start=1):
        s = line.strip()
        if not s or s.startswith("//") or s.startswith("*") or s.startswith("/*"):
            continue
        if "`" in s:
            continue
        if re.match(r"(export )?const (ACCEPTANCE_GATE|ARXIV_ID|LANE|VERDICT|ENABLED|DOCTRINE)\b", s):
            continue
        out.append((i, line))
    return out


def audit_file(path):
    rel = os.path.relpath(path, REPO)
    base = os.path.basename(path)[:-3] if path.endswith(".ts") else os.path.basename(path)
    try:
        text = open(path, encoding="utf-8", errors="replace").read()
    except Exception as e:
        return dict(slug=base, path=rel, paper_id="", claimed_quantity="", grep_hit="false",
                    bucket="BROKEN", mismatch_note="unreadable: %s" % e, evidence_lines="",
                    mechanism="", claim_hits=0, claim_terms=0, bigram_hits=0,
                    axis1="n/a", axis2="n/a", exports="")

    header, body = split_header_body(text)
    cl = code_only(body.split("\n"))

    arxiv = (grab(r"arXiv:\s*([0-9]{4}\.[0-9]{4,5})", header)
             or grab(r'ARXIV_ID\s*=\s*"([0-9]{4}\.[0-9]{4,5})', text))
    if not arxiv:
        m = re.search(r"([0-9]{4})[-.]?([0-9]{4,5})", base)
        arxiv = "%s.%s" % (m.group(1), m.group(2)) if m else ""

    paper_title = grab(r"^\s*\*\s*(.{4,160}?)\s*\n", header)
    improvement = grab(r"Improvement\s*\(record\)\s*:?\s*(.{0,700}?)(?=ACCEPTANCE GATE|ADDITIVE|Live data|Pure module|@|\Z)", header)
    gate = grab(r"ACCEPTANCE GATE\s*:?\s*(.{0,700}?)(?=ADDITIVE|Live data|Pure module|@|\Z)", header)
    mechanism = grab(r"Mechanism\s*:?\s*(.{0,700}?)(?=Improvement|ACCEPTANCE GATE|ADDITIVE|Live data|Pure module|@|\Z)", header)

    exports = ", ".join(sorted(set(re.findall(
        r"^export (?:function|const|interface) ([A-Za-z0-9_]+)", body, re.M)))[:6])

    mech_t = terms(mechanism)
    paper_t = terms(" ".join([paper_title, improvement, gate]))

    def find_ev(tset, limit=4):
        hits, ev = 0, []
        for t in sorted(tset):
            for i, line in cl:
                if re.search(r"\b" + re.escape(t) + r"\b", line, re.I):
                    hits += 1
                    if len(ev) < limit:
                        ev.append("%d:%s" % (i, line.strip()[:90]))
                    break
        return hits, ev

    if mechanism and mech_t:
        a1_hits, a1_ev = find_ev(mech_t)
        axis1 = "consistent" if a1_hits >= 2 else "hollow"
    else:
        a1_hits, a1_ev, axis1 = 0, [], "no-mechanism-field"

    if mechanism and paper_t and mech_t:
        inter = paper_t & mech_t
        a2_ratio = len(inter) / max(1, len(mech_t))
        axis2 = "disagree" if a2_ratio < 0.10 else "agree"
        a2_hits = len(inter)
    else:
        a2_ratio, a2_hits, axis2 = 0.0, 0, "n/a"

    if not cl or "export " not in body:
        bucket, note = "BROKEN", "body has no export and no code"
    elif axis1 == "hollow":
        bucket = "TEMPLATE_STAMP"
        note = ("body does not implement its own Mechanism field (%d/%d mechanism terms); "
                "metadata is hollow" % (a1_hits, len(mech_t)))
    elif axis2 == "disagree":
        bucket = "TEMPLATE_STAMP"
        note = ("file's own fields disagree: Improvement/ACCEPTANCE_GATE describe [%s] but "
                "Mechanism describes [%s]; paper-side/code-side overlap %.0f%%"
                % ((paper_title or arxiv)[:60], mechanism[:60], a2_ratio * 100))
    elif axis1 == "no-mechanism-field":
        bucket = "UNRESOLVED"
        note = "no Mechanism field; body/claim consistency and paper attribution both undecided"
    else:
        bucket = "REAL_IMPLEMENTATION"
        note = "body implements its own Mechanism field (%d/%d terms); fields agree" % (a1_hits, len(mech_t))

    return dict(slug=base, path=rel, paper_id=arxiv,
                claimed_quantity=(paper_title or improvement)[:160],
                grep_hit="true" if a1_hits else "false", bucket=bucket,
                mismatch_note=note, evidence_lines=" || ".join(a1_ev)[:900],
                mechanism=mechanism[:200], claim_hits=a1_hits, claim_terms=len(mech_t),
                bigram_hits=a2_hits, axis1=axis1, axis2=axis2, exports=exports)


PREFIXES = ("lopo-gate", "rank-fusion", "blown-lead-monitor", "swamp-dashboard",
            "katz-score", "zermelo-async", "hodge-diagnostic", "leaderboard-stability",
            "covariate-bt", "phantom-bt", "soft-target-bt", "tiered-margin-bt",
            "betaprime-shrinkage", "elo-scales", "oddsmaker-entropy-filter",
            "rookie-combine-prior", "teacher-calibration")


def main():
    mods = []
    for root, dirs, files in os.walk(REPO):
        if "node_modules" in root or "/.git" in root:
            continue
        for f in files:
            if not f.endswith(".ts") or f.endswith(".test.ts"):
                continue
            b = f[:-3]
            if (re.match(r"^\d{4}-\d{4,5}(v\d+)?-", b) or re.search(r"-\d{4}$", b)
                    or b.startswith(PREFIXES)):
                mods.append(os.path.join(root, f))

    rows = [audit_file(p) for p in sorted(mods)]
    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    with open(OUT_CSV, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["slug", "paper_id", "claimed_quantity", "grep_hit", "bucket",
                    "mismatch_note", "evidence_lines", "path", "mechanism",
                    "claim_hits", "claim_terms", "bigram_hits", "axis1", "axis2", "exports"])
        for r in rows:
            w.writerow([r["slug"], r["paper_id"], r["claimed_quantity"], r["grep_hit"],
                        r["bucket"], r["mismatch_note"], r["evidence_lines"], r["path"],
                        r["mechanism"], r["claim_hits"], r["claim_terms"], r["bigram_hits"],
                        r["axis1"], r["axis2"], r["exports"]])
    c = Counter(r["bucket"] for r in rows)
    print("modules scanned:", len(rows))
    for k, v in c.most_common():
        print("  %s: %d" % (k, v))
    json.dump(rows, open("/tmp/vlog/audit-rows.json", "w"))
    print("csv:", OUT_CSV)


if __name__ == "__main__":
    main()
