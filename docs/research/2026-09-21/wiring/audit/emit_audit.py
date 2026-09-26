#!/usr/bin/env python3
"""
Emit the audit CSV using ONLY evidence that survives scrutiny.

Bucket rule (mechanical, no vocabulary heuristic):
  TEMPLATE_STAMP  -- the module's code body is byte-identical (md5 of the
                      body with comments/blank lines/template literals/metadata
                      consts removed) to the body of a module filed under a
                      DIFFERENT arXiv id. Verified identical under both a
                      strict hash and a string-stripped hash, so the match is
                      not an artefact of embedded strings.
                   -- or a hand-read case where the file's own Improvement /
                      ACCEPTANCE_GATE and Mechanism fields describe different
                      methods.
  REAL_IMPLEMENTATION
                   -- ONLY for modules hand-read this run and confirmed to
                      implement what their header claims. Nothing is placed in
                      this bucket by an automated screen.
  BROKEN          -- no export / no code body.
  UNRESOLVED      -- unique body, paper attribution not yet verified.

Lexical screening (audit.py v1/v2) was abandoned: it failed its control set
three times with three different wrong counts. It feeds no bucket here.
"""
import os, re, csv, json, hashlib
from collections import defaultdict, Counter

REPO = "/tmp/wtp"
AUDIT = os.path.join(REPO, "audit")
os.makedirs(AUDIT, exist_ok=True)

HAND_NOTES = {
    "2107-06268-smoothed-boa-ensemble": ("REAL_IMPLEMENTATION",
        "Hand-read: body exports boaUpdate/ewaUpdate/simplexProject/smoothWeights, matching the "
        "Bernstein Online Aggregation method named in the header."),
    "2412-14730v1-synthetic-data": ("REAL_IMPLEMENTATION",
        "Hand-read: body exports mulberry32/gaussianSample/kAnonymityHolds/synthTabularRow, matching "
        "the seeded synthetic-tabular method the header names."),
    "2609-06005-price-dislocations-news-citations-and": ("REAL_IMPLEMENTATION",
        "Hand-read: body exports isDislocation/impactCoefficient/nextDayDirectionSignal, matching "
        "the price-dislocation subject in the title."),
    "2508-01285v2-biodisco-critic-stage": ("REAL_IMPLEMENTATION",
        "Hand-read: body exports criticScore/passesBioDiscoGate/bradleyTerryUpdate/spendBudget, "
        "matching the critic-stage subject in the header."),
    "2606-18686v1-simulated-world-benchmark": ("REAL_IMPLEMENTATION",
        "Hand-read: body exports rolloutGame/simBrier/simCRPS/calibrationSlope/slopeGateOk, "
        "consistent with a simulated-world calibration benchmark."),
    "2508-11711v2-data-infra": ("TEMPLATE_STAMP",
        "Hand-read: header names LLM/sentence-transformer/CNN malicious-query detection, the same "
        "field states 'no LLM or learned detector is on the decision path', and the body is a "
        "static allowlist + rate-limit gate. Documented divergence, but the paper's method is absent."),
    "2601-03099v1-tracklet-association": ("TEMPLATE_STAMP",
        "Hand-read: header/ACCEPTANCE_GATE describe Time-Aware Synthetic Control (placebo RMSE vs "
        "classical SC); Mechanism and body implement ReID cosine-distance tracklet association. "
        "First confirmed instance of the failure mode."),
}

DUPLICATE_COLLAPSED = {"2607.08725", "2503.04638"}

PRE = ("lopo-gate", "rank-fusion", "blown-lead-monitor", "swamp-dashboard", "katz-score",
       "zermelo-async", "hodge-diagnostic", "leaderboard-stability", "covariate-bt",
       "phantom-bt", "soft-target-bt", "tiered-margin-bt", "betaprime-shrinkage",
       "elo-scales", "oddsmaker-entropy-filter", "rookie-combine-prior", "teacher-calibration")


def split_hb(t):
    m = re.match(r"\s*/\*\**(.*?)\*/", t, re.S)
    return (m.group(1), t[m.end():]) if m else ("", t)


def grab(pat, h):
    m = re.search(pat, h, re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""


def code_body(body):
    out = []
    for l in body.split("\n"):
        s = l.strip()
        if not s or s.startswith("//") or s.startswith("*") or s.startswith("/*"):
            continue
        if "`" in s:
            continue
        if re.match(r"(export )?const (ACCEPTANCE_GATE|ARXIV_ID|LANE|VERDICT|ENABLED|DOCTRINE)\b", s):
            continue
        out.append(re.sub(r"\s+", " ", s))
    return "\n".join(out)


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
                    or b.startswith(PRE)):
                mods.append(os.path.join(root, f))
    mods.sort()

    rows, by_hash = [], defaultdict(list)
    for p in mods:
        t = open(p, encoding="utf-8", errors="replace").read()
        h, body = split_hb(t)
        base = os.path.basename(p)[:-3]
        m = re.search(r"arXiv:\s*([0-9]{4}\.[0-9]{4,5})", h) or re.search(r"([0-9]{4})[-.]?([0-9]{4,5})", base)
        pid = (m.group(1) + "." + m.group(2)) if (m and m.lastindex == 2) else (m.group(0) if m else "")
        code = code_body(body)
        sig = hashlib.md5(code.encode()).hexdigest()
        by_hash[sig].append(pid)
        rows.append(dict(slug=base, path=os.path.relpath(p, REPO), pid=pid, sig=sig,
                         code=code, body=body, header=h))

    for r in rows:
        peers = sorted({x for x in by_hash[r["sig"]] if x != r["pid"]})
        exports = sorted(set(re.findall(r"^export (?:function|const|interface) ([A-Za-z0-9_]+)", r["body"], re.M)))
        title = grab(r"^\s*\*\s*(.{4,160}?)\s*\n", r["header"])
        mech = grab(r"Mechanism\s*:?\s*(.{0,300}?)(?=Improvement|ACCEPTANCE|ADDITIVE|Live data|Pure|@|\Z)", r["header"])
        ev = ""
        if r["code"]:
            first = [l for l in r["code"].split("\n") if l.strip()][:3]
            ev = "code-body sha256=%s | first code lines: %s" % (
                hashlib.sha256(r["code"].encode()).hexdigest()[:16], " / ".join(x[:60] for x in first))
        if r["slug"] in HAND_NOTES:
            bucket, note = HAND_NOTES[r["slug"]]
        elif peers:
            bucket = "TEMPLATE_STAMP"
            note = ("code body byte-identical to %d other module(s) filed under different arXiv ids: %s"
                    % (len(peers), ", ".join(peers[:5]) + (" ..." if len(peers) > 5 else "")))
        elif not r["code"] or "export " not in r["body"]:
            bucket, note = "BROKEN", "no export and no code body"
        else:
            bucket = "UNRESOLVED"
            note = "unique code body; paper attribution NOT verified. Screen abandoned, so no claim either way."
        r.update(bucket=bucket, note=note, evidence=ev, title=title, mechanism=mech,
                 exports=exports, peers=peers)

    with open(os.path.join(AUDIT, "body-audit-2026-09-26.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["slug", "paper_id", "claimed_quantity", "grep_hit", "bucket",
                    "mismatch_note", "evidence_lines", "path", "mechanism", "exports",
                    "shared_with_n_papers", "shared_with_paper_ids"])
        for r in rows:
            w.writerow([r["slug"], r["pid"], (r["title"] or "")[:160],
                        "true" if r["exports"] else "false", r["bucket"], r["note"],
                        r["evidence"], r["path"], (r["mechanism"] or "")[:200],
                        ", ".join(r["exports"][:8]), len(r["peers"]), ", ".join(r["peers"][:8])])
        for d in sorted(DUPLICATE_COLLAPSED):
            w.writerow([d, d, "collapsed duplicate URL in the 29-link set", "false",
                        "DUPLICATE_COLLAPSED",
                        "Appeared twice in the 29-URL list; counted once. Not double-counted.",
                        "", "", "", "", 0, ""])

    c = Counter(r["bucket"] for r in rows)
    c["DUPLICATE_COLLAPSED"] = len(DUPLICATE_COLLAPSED)
    print("MODULES AUDITED:", len(rows))
    for k in ["REAL_IMPLEMENTATION", "TEMPLATE_STAMP", "BROKEN", "UNRESOLVED", "DUPLICATE_COLLAPSED"]:
        print("  %-21s %d" % (k, c.get(k, 0)))
    json.dump({"counts": dict(c), "audited": len(rows)}, open("/tmp/vlog/audit-final.json", "w"))


if __name__ == "__main__":
    main()
