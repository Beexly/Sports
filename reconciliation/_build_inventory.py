#!/usr/bin/env python3
"""Build reconciliation/inventory.json for the GSE audit. Read-only over the repo."""
import os, re, json, collections, subprocess, sys

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(cmd, timeout=120):
    try:
        p = subprocess.run(cmd, shell=True, cwd=WT, capture_output=True, text=True, timeout=timeout)
        return p.stdout
    except Exception as e:  # noqa
        return ""


FAMS = [("engine-plan", "engine-plan"), ("intelligence", "intelligence"), ("motif", "motif"),
        ("hermes", "hermes"), ("research", "research"), ("jules", "jules"), ("claude", "claude"),
        ("grok", "grok"), ("feat/", "feature"), ("fix/", "fix"), ("wire/", "wire"), ("play-", "play"),
        ("q2", "expected-metric"), ("docs/", "docs"), ("extract", "extract"), ("formal", "formal"),
        ("dfs", "dfs"), ("ops", "ops"), ("paper", "papers"), ("papers", "papers"), ("agent", "agent"),
        ("intel", "intel"), ("vision", "vision"), ("odds", "odds"), ("conformal", "conformal"),
        ("walk", "walk-forward"), ("lining", "line-archiver"), ("prop", "props"), ("sgp", "sgp"),
        ("calib", "calibration"), ("census", "census"), ("bridge", "bridge"), ("spec", "spec"),
        ("freeze", "freeze"), ("gate", "gates"), ("ledger", "ledger"), ("copilot", "copilot")]


def fam(n):
    n = n.replace("origin/", "")
    for pre, t in FAMS:
        if n.startswith(pre):
            return t
    return "other"


branches = []
raw = open(os.path.join(WT, "reconciliation", "_branches.txt"), encoding="utf8", errors="replace").read()
for line in raw.split("\n"):
    p = line.split(" ", 3)
    if len(p) < 4:
        continue
    d, n, s, su = p
    if n.endswith("/HEAD") or "dependabot" in n:
        continue
    branches.append({"date": d, "branch": n.replace("origin/", ""), "sha": s,
                     "subject": su[:200], "family": fam(n)})
famcount = collections.Counter(b["family"] for b in branches)

# package tree counts
pkg = {}
for rel in ["packages/prediction-engine/src", "packages/ingestion-pipeline/src",
            "packages/feature-store/src", "packages/verifier/src", "packages/db/src",
            "apps/web/app", "apps/web/lib", "intelligence", "scripts"]:
    p = os.path.join(WT, rel)
    if not os.path.isdir(p):
        continue
    ts = py = nontest = 0
    for dp, dn, fn in os.walk(p):
        dn[:] = [x for x in dn if x not in ("node_modules", ".next", "dist", ".git")]
        for f in fn:
            if f.endswith(".ts"):
                ts += 1
                if not f.endswith(".test.ts"):
                    nontest += 1
            elif f.endswith(".py"):
                py += 1
    pkg[rel] = {"ts_files": ts, "ts_non_test": nontest, "py_files": py}

# research doc census
DOC_DIRS = ["docs/research", "docs/ops", "docs/engine", "docs/intelligence", "docs/reasoning",
            "docs/gse", "docs/predictions", "docs/edge", "docs/gates", "docs/formal",
            "docs/frontier", "docs/arxiv-program", "research", "intelligence", "docs/audit",
            "docs/math", "docs/models", "docs/architecture", "docs/brain", "docs/factors"]
census = {}
total_docs = 0
for d in DOC_DIRS:
    p = os.path.join(WT, d)
    if not os.path.isdir(p):
        continue
    n = 0
    for dp, dn, fn in os.walk(p):
        dn[:] = [x for x in dn if x not in ("node_modules", ".git")]
        for f in fn:
            if f.endswith(".md") or f.endswith(".json"):
                n += 1
    census[d] = n
    total_docs += n

inv = {
    "audit": "GSE research-to-code reconciliation",
    "generated_at_utc": run("date -u +%Y-%m-%dT%H:%M:%SZ").strip(),
    "repo": {
        "remote": "https://github.com/Beexly/Sports.git",
        "audited_ref": "origin/main",
        "audited_sha": "4fa5330f4",
        "audited_commit_subject": "analytics sweep: 2026-10-19 21:08 evening run (lane A addendum 3)",
        "worktree": WT,
        "audit_branch": "audit/reconciliation-2026-10-20",
        "note": ("Main working tree C:/Users/Garrett/Sports carried uncommitted changes "
                 "(packages/prediction-engine/src/game-context.ts, src/index.ts, scripts/sync_week6_db.py, "
                 "intelligence/*). Audit ran in an isolated git worktree so that work was untouched. "
                 "Findings describe origin/main @ 4fa5330f4."),
    },
    "branch_inventory": {
        "total_remote_non_dependabot": len(branches),
        "since_2026_10_01": sum(1 for b in branches if b["date"] >= "2026-10-01"),
        "date_range": [branches[-1]["date"], branches[0]["date"]] if branches else [],
        "by_family": dict(famcount.most_common()),
        "branches": branches,
    },
    "package_tree": pkg,
    "research_doc_census": {
        "counts_by_dir": census,
        "total_md_json_in_research_dirs": total_docs,
        "corpus_data_files": [
            {"path": "docs/arxiv-program/research/2026-09-21/arxiv-program/index/corpus-index.jsonl", "bytes": 1495834},
            {"path": "docs/arxiv-program/research/2026-10-17/ARXIV_OMNIBUS_SPORTS_AND_BETTING_CORPUS.json", "bytes": 578576},
            {"path": "docs/arxiv-program/research/2026-10-17/ALL_FOOTBALL_PAPERS_CATEGORIZED.json", "bytes": 230414},
            {"path": "docs/arxiv-program/research/2026-10-17/ALL_FOOTBALL_PAPERS_310_AUDIT.json", "bytes": 175277},
            {"path": "docs/arxiv-program/research/2026-10-17/ARXIV_NFL_CORPUS_EXTRACTION_2026-10-17.json", "bytes": 156265},
            {"path": "docs/arxiv-program/research/2026-10-17/OPENALEX_ACADEMIC_SPORTS_CORPUS.json", "bytes": 139394},
            {"path": "docs/arxiv-program/research/2026-10-17/MASTER_NFL_SPORTS_PAPERS_DATABASE.json", "bytes": 129553},
            {"path": "docs/arxiv-program/research/2026-10-17/OPENALEX_NFL_MASTER_CORPUS.json", "bytes": 123101},
            {"path": "docs/arxiv-program/research/2026-10-17/TRUE_NFL_FOOTBALL_PAPERS_COMPLETE.json", "bytes": 120958},
            {"path": "docs/arxiv-program/research/2026-10-17/STRICT_CURATED_NFL_SPORTS_PAPERS.json", "bytes": 76615},
            {"path": "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl", "bytes": 7999749, "records": 5148},
            {"path": "docs/engine/research/2026-10-17/MIND_CORPUS_3000.jsonl", "bytes": 7999749, "records": 5148},
            {"path": "data/gse-dataset/bridge-premises.jsonl", "bytes": 85924, "records": 285},
        ],
    },
}

out = os.path.join(WT, "reconciliation", "inventory.json")
with open(out, "w", encoding="utf8") as f:
    json.dump(inv, f, indent=1)
print("wrote", out, os.path.getsize(out))
print("branches:", len(branches))
print("docs:", total_docs)
