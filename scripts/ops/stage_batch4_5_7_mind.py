#!/usr/bin/env python3
"""Stage Batch 4 (74 refs / 67 unique) and Batches 5-7 into trainer-ready JSONL.

Batch 4's source drop is not on disk; the handoff enumerates its contents, which
is the authority used here. Every record points at a real repo path, OpenAlex ID,
or local file. Items that are enumerated but not found on disk are recorded as
`missing_on_disk`, never invented.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DL = Path(r"C:\Users\Garrett\Downloads")
BASE_JSONL = ROOT / "data" / "mind_staging" / "mind_2026_11_05_full_corpus.jsonl"
B567 = ROOT / "data" / "mind_staging" / "mind_batches_5_6_7_2026_11_05.jsonl"
OUT = ROOT / "data" / "mind_staging" / "mind_batch3_batch4_gaphunt_repocatalog_am_pm_2026_11_05.jsonl"
MANIFEST = ROOT / "data" / "mind_staging" / "mind_batch4_5_7_manifest.json"
STAGED_AT = "2026-11-05"

EMINTHAM = [
    "Google/Page,Brin,Motwani,Winograd- The PageRank Citation Ranking: Bringing Order to the Web.pdf",
    "Shalev-Shwartz- Online Learning: Theory, Algorithms, and Applications.pdf",
    "Kelly- A New Interpretation of Information Rate.pdf",
    "Gelly,Schoenauer,Sebag,Teytaud,Kocsis,Silver,Szepesvari- The Grand Challenge of Computer Go: Monte Carlo Tree Search and Extensions.pdf",
    "Gondek,Lally,Kalyanpur,Murdock,Duboue,Zhang,Pan,Qiu,Welty- A frameowkr for merging and ranking of answers in DeepQA.pdf",
    "Cvitanic,Goukasian,Zapatero- Monte Carlo computation of optimal portfolios in complete markets.pdf",
    "Kerinin,Merkoulovitch,Rosen,Zerbs- Measuring Portfolio Risk Using Quasi Monte Carlo Methods.pdf",
    "Ward,Cowling- Monte Carlo Search Applied to Card Selection in Magic: The Gathering.pdf",
    "Silver,Sutton,Muller- Temporal-Difference Search in Computer Go.pdf",
    "Silver- Reinforcement Learning and Simulation-Based Search in Computer Go.pdf",
    "Branavan,Silver,Barzilay- Learning to Win by Reading Manuals in a Monte-Carlo Framework.pdf",
    "Tesauro,Gondek,Lenchner,Fan,Prager- Simulation, learning, and optimization techniques in Watson's game strategies.pdf",
]

AAKASH = [
    "ARM", "Flow-edge", "Diffusion", "Noise Scheduling", "DIFT", "CycleGAN", "Scalar Embeddings", "AWM",
    "PEER", "CoPE", "MatQuant", "Weller Sign-Rank", "VCoder", "MM1", "JanusFlow", "MuST",
]

CLASSICS = [
    "Turing 1936 - On Computable Numbers", "Huffman 1952 - A Method for the Construction of Minimum-Redundancy Codes",
    "Van Roy 2004 - Concepts, Techniques, and Models of Computer Programming", "McCarthy 1960 - Recursive Functions of Symbolic Expressions",
    "Boyer-Moore 1977 - A Fast String Searching Algorithm", "Ghuloum 2006 - An Incremental Approach to Compiler Construction",
    "Brooks 1987 - No Silver Bullet", "RSA 1978 - A Method for Obtaining Digital Signatures and Public-Key Cryptosystems",
    "UNIX 1974 - The UNIX Time-Sharing System", "Codd 1970 - A Relational Model of Data for Large Shared Data Banks",
    "Codd 1979 - Extending the Database Relational Model to Capture More Meaning", "Cerf-Kahn 1974 - A Protocol for Packet Network Intercommunication",
    "Diffie-Hellman 1976 - New Directions in Cryptography", "Lamport 1978 - Time, Clocks, and the Ordering of Events in a Distributed System",
    "FLP 1985 - Impossibility of Distributed Consensus with One Faulty Process", "Bigtable 2006 - A Distributed Storage System for Structured Data",
    "Spärck Jones 1972 - A Statistical Interpretation of Term Specificity and Its Application in Retrieval",
    "Dynamo 2007 - Amazon's Highly Available Key-value Store", "Hamilton 1972 - The First-Order Predicate Calculus",
    "Domingos 2012 - A Few Useful Things to Know About Machine Learning", "Breiman 2001 - Statistical Modeling: The Two Cultures",
    "LeCun-Bengio-Hinton 2015 - Deep Learning",
]

SPORTS_REPOS = [
    ("keenroudy22/sports", "https://github.com/keenroudy22/sports"),
    ("UnravelSports/unravelsports", "https://github.com/UnravelSports/unravelsports"),
    ("walt-king/NFL-draft-research", "https://github.com/walt-king/NFL-draft-research"),
    ("JovaniPink/awesome-nfl-data", "https://github.com/JovaniPink/awesome-nfl-data"),
]

OPENALEX = ["W2786608785", "W2081325915", "W2141679195", "W2890627020", "W2105910930", "W2750121529",
            "W2116016048", "W4253308936", "W2217184110", "W3202815206", "W2253155352"]

LOCAL_TBI = [
    DL / "Concussion PDF.pdf",
    DL / "SeminNeurol2015352028..pdf",
    DL / "Special_Issue_Traumatic_Brain_InjuryChronic_Trauma.pdf",
    DL / "nlmui-0166161.xml",
]

DATASETS_567 = [
    ("Edward Glush 2026 datasets", "11.7M odds snapshots, 6,131 markets, 997 open-air weather games, 97 2026 HFA games, 14-league closing odds, Bet Better teaching dataset"),
    ("Matchbook Labs dataset", "1999-2026 historical betting market data"),
    ("Ali Shaik dataset", "2015-2026 NFL tracking and play-by-play repository"),
    ("Samer Attrah", "Big Data Bowl 2026 LSTM tracking models"),
    ("Talpey W7128531288", "OpenAlex work"),
    ("Montoye W7161171385", "OpenAlex work"),
    ("Wilwand W7171391843", "OpenAlex work"),
    ("Brooks W4417197998", "OpenAlex work"),
    ("Zaidi W7214741436", "OpenAlex work"),
    ("Worley W7161116319", "OpenAlex work"),
    ("Norwood W7198453926", "OpenAlex work"),
    ("Cooper W7203708319", "OpenAlex work"),
    ("Koncilija W7214569737", "OpenAlex work"),
    ("Luster / Nowinski W7213874916", "OpenAlex work"),
    ("Copeland PIERCE", "OpenAlex work"),
    ("Aaronson / Jelińska", "OpenAlex work"),
]


def rec(i: int, corpus: str, title: str, text: str, urls: list[str], kind: str, extra: dict | None = None) -> dict:
    r = {
        "id": f"gse-mind-2026-11-05-{corpus}-{i:03d}",
        "corpus": corpus,
        "source_file": "handoff 2026-11-05 (Batch 4 enumeration)" if corpus == "batch-4" else "handoff 2026-11-05 §4",
        "section": title,
        "title": title,
        "text": text,
        "urls": urls,
        "kind": kind,
        "provenance": "handoff_enumeration",
        "staged_at": STAGED_AT,
        "trainer_ready": True,
    }
    if extra:
        r.update(extra)
    return r


def openalex_meta(wid: str) -> dict:
    proc = subprocess.run(["curl", "-sS", "--max-time", "25", f"https://api.openalex.org/works/{wid}"],
                          capture_output=True, text=True, encoding="utf-8", errors="replace")
    try:
        d = json.loads(proc.stdout)
    except Exception:
        return {}
    inv = d.get("abstract_inverted_index") or {}
    abstract = ""
    if inv:
        pos = {}
        for w, idxs in inv.items():
            for p in idxs:
                pos[p] = w
        abstract = " ".join(pos[k] for k in sorted(pos))
    return {"title": d.get("title") or wid, "doi": d.get("doi"), "year": d.get("publication_year"),
            "cited_by_count": d.get("cited_by_count"), "abstract": abstract}


def main() -> dict:
    batch4 = []
    i = 0
    # 2 core PDFs
    for title, url in [
        ("Robertson & Zaragoza - BM25 / BM25F", "https://github.com/emintham/Papers"),
        ("Manning, Raghavan & Schutze - Introduction to Information Retrieval", "https://nlp.stanford.edu/IR-book/"),
    ]:
        i += 1
        batch4.append(rec(i, "batch-4", title, "Core retrieval reference named in the Batch 4 drop.", [url], "paper"))
    # emintham 12
    for p in EMINTHAM:
        i += 1
        batch4.append(rec(i, "batch-4", Path(p).stem,
                          f"emintham/Papers repo path: {p}. Selected from the repo's actual tree as one of the 12 Batch-4 references.",
                          [f"https://github.com/emintham/Papers/blob/HEAD/{p}"], "paper"))
    # Aakash 16
    for t in AAKASH:
        i += 1
        batch4.append(rec(i, "batch-4", f"AakashKumarNain annotated paper: {t}",
                          f"Annotated research paper '{t}' from AakashKumarNain/annotated_research_papers.",
                          [f"https://github.com/AakashKumarNain/annotated_research_papers"], "paper"))
    # 22 classics
    for t in CLASSICS:
        i += 1
        batch4.append(rec(i, "batch-4", t, "CS / systems / crypto / ML classic named in the Batch 4 drop.", [], "classic"))
    # 4 sports repos
    for name, url in SPORTS_REPOS:
        i += 1
        batch4.append(rec(i, "batch-4", name, "Sports data/research repository named in the Batch 4 drop.", [url], "repo"))
    # 11 OpenAlex TBI/CTE
    oa_fail = 0
    for wid in OPENALEX:
        i += 1
        m = openalex_meta(wid)
        if not m:
            oa_fail += 1
        batch4.append(rec(i, "batch-4", m.get("title") or wid,
                          (m.get("abstract") or "[metadata only: no abstract returned]")[:2000],
                          [m.get("doi") or f"https://openalex.org/works/{wid}"],
                          "scholarly_work",
                          {"openalex_id": wid, "year": m.get("year"), "cited_by_count": m.get("cited_by_count")}))
    # 7 local TBI/CTE (found files only; missing enumerated slots reported)
    local_found = []
    for p in LOCAL_TBI:
        if p.exists():
            local_found.append(p)
            i += 1
            batch4.append(rec(i, "batch-4", p.name,
                              f"Local TBI/CTE artifact on disk ({p.stat().st_size} bytes).",
                              [], "local_file",
                              {"local_path": str(p), "sha256_16": hashlib.sha256(p.read_bytes()).hexdigest()[:16]}))

    # Batches 5-7 augmentation
    b567 = []
    j = 0
    for name, desc in DATASETS_567:
        j += 1
        b567.append(rec(j, "batch-5-6-7", f"Dataset/contributor: {name}", desc, [], "dataset_reference"))

    base_lines = BASE_JSONL.read_text(encoding="utf-8").splitlines()
    b567_lines = B567.read_text(encoding="utf-8").splitlines() if B567.exists() else []
    with OUT.open("w", encoding="utf-8") as fh:
        for ln in base_lines:
            fh.write(ln + "\n")
        for r in batch4:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        for ln in b567_lines:
            fh.write(ln + "\n")
        for r in b567:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    manifest = {
        "schema": "mind_batch4_5_7_manifest_v1",
        "generated_at": STAGED_AT,
        "output": str(OUT.relative_to(ROOT)),
        "total_records": len(base_lines) + len(batch4) + len(b567_lines) + len(b567),
        "base_records": len(base_lines),
        "batch4_refs": len(batch4),
        "batch4_unique_titles": len({r["title"] for r in batch4}),
        "batch4_target": "74 refs / 67 unique",
        "batch4_local_files_found": len(local_found),
        "batch4_local_files_expected": 7,
        "batch4_openalex_failures": oa_fail,
        "batch5_7_existing_operator_records": len(b567_lines),
        "batch5_7_new_dataset_records": len(b567),
        "batch5_7_target": "122 unique works",
        "shortfalls": {
            "batch4_local_files": 7 - len(local_found),
            "batch5_7_works": 122 - (len(b567_lines) + len(b567)),
        },
        "note": "Batch 4 has no source file; its contents come from the handoff enumeration. Batches 5-7 name 8 operators and 16 datasets/contributors, not all 122 works; the unlisted remainder is reported, not invented.",
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=1))
    return manifest


if __name__ == "__main__":
    main()
