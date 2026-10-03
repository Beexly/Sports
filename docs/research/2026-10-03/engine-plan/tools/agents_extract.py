#!/usr/bin/env python3
"""AGENTS.md full-ingestion for GSE mind training.

Reads EVERY AGENTS.md found in the workspace (excluding venv/node_modules/.git),
emits one JSONL row per file with the COMPLETE body (no truncation), plus
section-level directive rows for the important rule/doctrine files.

Output: ~/workspace/eng-mine/shards-out/mind_knowledge_u_06_agents.jsonl
(split into _00/_01 at ~8MB if needed).
"""
import json, hashlib, os, re

OUTDIR = os.path.expanduser("~/workspace/eng-mine/shards-out")
SPLIT_AT = 8 * 1024 * 1024  # ~8MB

FILES = [
    # In-scope per task
    "/home/hatch/workspace/sports-docs/AGENTS.md",
    "/home/hatch/workspace/vendor/Sports/AGENTS.md",
    "/home/hatch/workspace/mimo-verl/AGENTS.md",
    "/home/hatch/AGENTS.md",
    # Additional AGENTS.md found by full workspace sweep (title says EVERY)
    "/home/hatch/workspace/_scratch/audit-fixwork/AGENTS.md",
    "/home/hatch/workspace/_scratch/audit-main/AGENTS.md",
    "/home/hatch/workspace/_scratch/build-repro/sports/AGENTS.md",
    "/home/hatch/workspace/_scratch/cv-eval/AGENTS.md",
    "/home/hatch/workspace/_scratch/cv-work/AGENTS.md",
    "/home/hatch/workspace/_scratch/perception/AGENTS.md",
    "/home/hatch/workspace/_scratch/stream-c/AGENTS.md",
    "/home/hatch/workspace/_scratch/watch-loop/wt/AGENTS.md",
    "/home/hatch/workspace/awesome-apps-gse/awesome-llm-apps/generative_ui_agents/ai-dashboard-canvas-agent/AGENTS.md",
    "/home/hatch/workspace/dojozero-teardown/AGENTS.md",
    "/home/hatch/workspace/jev-ultrafast/AGENTS.md",
    "/home/hatch/workspace/reorg/newfiles/AGENTS.md",
    "/home/hatch/workspace/research_notes/tax-writeoffs-funding-research-20260922-1822/AGENTS.md",
    "/home/hatch/workspace/sports-merge/AGENTS.md",
    "/home/hatch/workspace/tmp/sports-push/AGENTS.md",
    "/home/hatch/workspace/ts-spaces/dfs-process-system/AGENTS.md",
    "/home/hatch/workspace/ts-spaces/gse-dfs-process-system/AGENTS.md",
    "/home/hatch/workspace/ts-spaces/nfl-analytics-reverse-engineering/AGENTS.md",
    "/home/hatch/workspace/ts-spaces/tax-write-offs-and-funding-research/AGENTS.md",
    "/home/hatch/workspace/vendor/Clouds-bruh/AGENTS.md",
    "/home/hatch/workspace/vendor/ios-swiftui/AGENTS.md",
    "/home/hatch/workspace/vendor/meta-model-cookbook/03_use_cases/09_one-shot-game_dev/AGENTS.md",
    "/home/hatch/workspace/vendor/meta-model-cookbook/03_use_cases/11_github_repo_agent/AGENTS.md",
    "/home/hatch/workspace/vendor/omniroute/AGENTS.md",
    "/home/hatch/workspace/vendor/omniroute/open-sse/services/AGENTS.md",
    "/home/hatch/workspace/vendor/omniroute/src/lib/db/AGENTS.md",
]

def read_file(path):
    with open(path, "rb") as f:
        raw = f.read()
    try:
        text = raw.decode("utf-8")
        enc = "utf-8"
    except UnicodeDecodeError:
        text = raw.decode("utf-8", errors="replace")
        enc = "utf-8-with-replacements"
    return raw, text, enc

def row(source_path, bytes_read, row_type, title, body, coverage="full"):
    return {
        "source_path": source_path,
        "host": "vm",
        "bytes_read": bytes_read,
        "coverage": coverage,
        "row_type": row_type,
        "title": title,
        "body": body,
    }

def classify_sports_section(header):
    h = header.upper()
    if any(k in h for k in ("DOCS BUCKETS", "THE LOOP", "THE LAWS", "WORKING RULES",
                            "DECISION BUDGET", "CONTEXT HYGIENE", "THE STANDARD",
                            "POSTABLE BOARD", "FOUNDER PICKS LOG", "FOUNDER OVERRIDE",
                            "MOVE-37", "AGENTS.MD — AUTONOMOUS RUN CONTRACT")):
        return "doctrine"
    if "ENGINE BENCHMARK" in h or "BENCHMARK COMPLETENESS" in h or "INFRA BENCHMARK" in h:
        return "method"
    if any(k in h for k in ("ANALYTICS LANDSCAPE", "DEEP PASS", "GAP ANALYSIS")):
        return "concept"
    if "RANKINGS PROGRAM QUEUE" in h:
        return "action"
    return "finding"

def split_sections(text):
    """Split markdown on level-2 headers. Returns list of (header, body)."""
    parts = re.split(r"(?m)^(## .+)$", text)
    # parts[0] = preamble before first ## header
    out = []
    preamble = parts[0].strip("\n")
    if preamble.strip():
        # include the level-1 title line if present
        out.append(("(preamble)", preamble))
    for i in range(1, len(parts), 2):
        header = parts[i].strip()
        body = parts[i + 1] if i + 1 < len(parts) else ""
        out.append((header, (header + "\n" + body).strip("\n")))
    return out

def main():
    os.makedirs(OUTDIR, exist_ok=True)
    rows = []
    file_info = []  # (path, bytes, sha16) for report
    blobs = {}
    for path in FILES:
        if not os.path.exists(path):
            print(f"SKIP (missing): {path}")
            continue
        raw, text, enc = read_file(path)
        sha = hashlib.sha256(raw).hexdigest()
        blobs[path] = (raw, text)
        file_info.append((path, len(raw), sha[:16], enc))

    # Dedup: group by sha; canonical = first sorted path
    by_sha = {}
    for path, nbytes, sha16, enc in file_info:
        by_sha.setdefault(sha16, []).append((path, nbytes))
    canonical = {}
    for sha16, group in by_sha.items():
        group.sort()
        for i, (path, nbytes) in enumerate(group):
            canonical[path] = (group[0][0], i == 0)

    # Prefix check: large Sports-family files — is any a byte-prefix of a larger one?
    large = [p for p, _, _, _ in file_info if blobs[p][0].__len__() > 100000]
    prefix_of = {}
    for p in large:
        for q in large:
            if p == q:
                continue
            rp, rq = blobs[p][0], blobs[q][0]
            if len(rq) > len(rp) and rq.startswith(rp):
                prefix_of[p] = q

    def terminal(p):
        seen = set()
        while p in prefix_of and p not in seen:
            seen.add(p)
            p = prefix_of[p]
        return p

    print("=== FILE INVENTORY ===")
    for path, nbytes, sha16, enc in file_info:
        canon, is_canon = canonical[path]
        tag = "CANONICAL" if is_canon else f"DUP of {canon}"
        pfx = f" | PREFIX of {prefix_of[path]}" if path in prefix_of else ""
        print(f"{nbytes:>9}  {sha16}  {tag}{pfx}  [{enc}]  {path}")

    # --- Emit rows ---
    for path, nbytes, sha16, enc in file_info:
        canon, is_canon = canonical[path]
        raw, text = blobs[path]
        base_title = os.path.basename(os.path.dirname(path)) + "/AGENTS.md"

        if not is_canon:
            rows.append(row(path, nbytes, "finding",
                             f"Duplicate AGENTS.md: {base_title}",
                             f"Byte-identical copy (sha256 {sha16}...) of canonical file {canon}. "
                             f"No unique content; full body preserved in the canonical row."))
            continue
        if path in prefix_of:
            term = terminal(path)
            rows.append(row(path, nbytes, "finding",
                             f"Stale snapshot AGENTS.md: {base_title}",
                             f"Entire content is a byte-prefix of a newer file (this file: {nbytes} bytes; "
                             f"chain head: {term}, {len(blobs[term][0])} bytes). "
                             f"No unique content; every word is preserved in the full-body row of {term}. "
                             f"sha256 {sha16}..."))
            continue

        # Canonical file with unique content -> full-body row
        if path == "/home/hatch/AGENTS.md":
            rt = "doctrine"
            title = "Workspace operating manual (~/AGENTS.md) — full text"
        elif "sports-docs" in path:
            rt = "doctrine"
            title = "Sports repo AGENTS.md (fresh 2026-10-03) — full text"
        else:
            rt = "doctrine"
            title = f"AGENTS.md full text: {base_title}"
        rows.append(row(path, nbytes, rt, title, text))

        # Section-level directive rows for the important doctrine files
        if path == "/home/hatch/workspace/sports-docs/AGENTS.md":
            for header, body in split_sections(text):
                if header == "(preamble)":
                    rows.append(row(path, len(body.encode()), "doctrine",
                                    "Sports AGENTS.md preamble — autonomous run contract title",
                                    body))
                else:
                    clean = header.lstrip("# ").strip()
                    rows.append(row(path, len(body.encode()),
                                    classify_sports_section(header),
                                    f"Sports AGENTS.md section: {clean[:110]}",
                                    body))
        elif path == "/home/hatch/AGENTS.md":
            for header, body in split_sections(text):
                if header == "(preamble)":
                    continue
                clean = header.lstrip("# ").strip()
                rows.append(row(path, len(body.encode()), "doctrine",
                                f"Workspace doctrine: {clean[:110]}", body))
        elif path == "/home/hatch/workspace/mimo-verl/AGENTS.md":
            for header, body in split_sections(text):
                if header == "(preamble)":
                    continue
                clean = header.lstrip("# ").strip()
                rows.append(row(path, len(body.encode()), "doctrine",
                                f"verl agent instructions: {clean[:110]}", body))

    # --- Write shards ---
    out_main = os.path.join(OUTDIR, "mind_knowledge_u_06_agents.jsonl")
    for suffix in ("", "_00", "_01"):
        p = os.path.join(OUTDIR, f"mind_knowledge_u_06_agents{suffix}.jsonl")
        if os.path.exists(p):
            os.remove(p)
    current, cur_size, idx = [], 0, 0
    shard_paths = []
    def flush():
        nonlocal current, cur_size, idx
        if not current:
            return
        p = os.path.join(OUTDIR, f"mind_knowledge_u_06_agents_{idx:02d}.jsonl")
        with open(p, "w") as f:
            for r in current:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        shard_paths.append((p, cur_size, len(current)))
        idx += 1
        current, cur_size = [], 0
    for r in rows:
        line = json.dumps(r, ensure_ascii=False) + "\n"
        if cur_size + len(line.encode()) > SPLIT_AT and current:
            flush()
        current.append(r)
        cur_size += len(line.encode())
    flush()

    from collections import Counter
    counts = Counter(r["row_type"] for r in rows)
    print("\n=== SHARDS ===")
    for p, sz, n in shard_paths:
        print(f"{p}  {sz/1e6:.2f}MB  {n} rows")
    print("\n=== ROW COUNTS BY TYPE ===")
    for k, v in counts.most_common():
        print(f"{k}: {v}")
    print(f"\nTOTAL rows: {len(rows)}")

if __name__ == "__main__":
    main()
