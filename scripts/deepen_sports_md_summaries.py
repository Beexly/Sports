#!/usr/bin/env python3
"""deepen_sports_md_summaries.py -- Rebuild git-based status and deepen high-signal Sports Markdown summaries.

Produces:
  1. sports_md_status_from_git.csv (and copies in research/ and _gse_catalog/)
  2. sports_md_summaries_deepened.csv (and copies in research/ and _gse_catalog/)
  3. Resolves the 6 blank rows in sports_md_summaries.csv (extracting actual content where non-empty).
  4. Deepens the top 75 highest-signal Markdown files (400-600 chars each, capturing measured CRPS & n,
     filter definitions, location locks, refusal rules, and next steps/directives passively).
"""
import csv
import os
import re
import subprocess
from collections import Counter

REPO_WT = "C:/Users/Garrett/Sports-wt-wf-cvi"
REPO_MAIN = "C:/Users/Garrett/Sports"
INPUT_CSV = "C:/Users/Garrett/Downloads/sports_md_summaries.csv"

BULK_MTIME_DATES = {"2026-08-30", "2026-09-27", "2026-10-09", "2026-10-14"}
BULK_GIT_DATES = {"2026-08-19", "2026-09-27", "2026-10-02", "2026-10-03", "2026-10-06"}
RECENT_CUTOFF = "2026-10-08"
TOP_K_DEEPEN = 75


def clip_words(text, max_len):
    """Truncate `text` at a clean word boundary at or below `max_len` characters."""
    text = re.sub(r"\s+", " ", text).strip(" .;:,-*|")
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(" .;:,-*|([")


def resolve_file_path(rel_path):
    p1 = os.path.join(REPO_WT, rel_path)
    if os.path.exists(p1):
        return p1
    p2 = os.path.join(REPO_MAIN, rel_path)
    if os.path.exists(p2):
        return p2
    return None


def resolve_blank_summary(rel_path):
    """Resolve a blank SUMMARY row. If empty or binary, return 'TEXT: EMPTY (<path>)'.
    If non-empty text (e.g. '#' comment-prefixed sweep READMEs that the original parser skipped),
    return a clean opening-line extract."""
    fp = resolve_file_path(rel_path)
    if not fp or not os.path.exists(fp):
        return f"TEXT: EMPTY (missing at {rel_path})"
    sz = os.path.getsize(fp)
    if sz == 0:
        return f"TEXT: EMPTY ({rel_path}, 0 bytes)"
    raw = open(fp, "rb").read(4096)
    if b"\x00" in raw:
        return f"TEXT: EMPTY (binary file at {rel_path})"
    txt = open(fp, encoding="utf-8", errors="replace").read()
    if not txt.strip():
        return f"TEXT: EMPTY ({rel_path}, whitespace only)"
    lines = []
    for line in txt.splitlines():
        cleaned = line.lstrip("#").strip()
        if cleaned:
            lines.append(cleaned)
    joined = " | ".join(lines[:4])
    joined = re.sub(r"\s+", " ", joined).strip()
    return joined[:280]


def score_markdown_signal(txt):
    """Score a Markdown file for residual engine, CRPS, filter, PIT, conformal, BSTS, or gate content."""
    c_7154 = len(re.findall(r"(?<![0-9.])7\.1540(?:21)?\b", txt))
    c_7142 = len(re.findall(r"(?<![0-9.])7\.1426(?:22)?\b", txt))
    c_7099 = len(re.findall(r"(?<![0-9.])7\.099\b", txt))
    c_7109 = len(re.findall(r"(?<![0-9.])7\.109\b", txt))
    c_2462 = len(re.findall(r"(?<![0-9.])(?:2,462|2462)\b", txt))
    c_7500 = len(re.findall(r"(?<![0-9.])7\.500\b", txt))
    c_14251 = len(re.findall(r"(?<![0-9.])(?:14,251|14251)\b", txt))
    c_spread = len(re.findall(r"\bspread_line\b", txt))
    c_crps = len(re.findall(r"\bCRPS\b", txt))
    c_pit = len(re.findall(r"\bPIT\b|point-in-time", txt, re.I))
    c_conf = len(re.findall(r"\b(?:conformal|CQR|AgACI|DtACI)\b", txt, re.I))
    c_bsts = len(re.findall(r"\b(?:BSTS|state-space|local-level)\b", txt, re.I))
    c_wf = len(re.findall(r"\b(?:walk_forward|walk-forward)\b", txt, re.I))

    score = (
        c_7154 * 120
        + c_7142 * 120
        + c_7099 * 100
        + c_7109 * 80
        + c_2462 * 60
        + c_7500 * 40
        + c_14251 * 30
        + c_spread * 35
        + c_crps * 6
        + c_wf * 5
        + c_conf * 3
        + c_bsts * 4
        + c_pit * 2
    )
    return score


def build_deepened_extract(rel_path, txt, title):
    """Build a 400-600 character structured extract capturing:
    - measured CRPS numbers and their n
    - filter definitions
    - lock statements (mu = spread_line)
    - refusal rules
    - explicit next-step or blocked items (extracted passively)
    """
    nums = []
    if re.search(r"(?<![0-9.])7\.109\b", txt):
        nums.append("7.109 (market close CRPS benchmark)")
    if re.search(r"(?<![0-9.])7\.099\b", txt):
        nums.append("<=7.099 (hard emission gate)")
    if re.search(r"(?<![0-9.])7\.1540(?:21)?\b", txt):
        nums.append("7.154021 (Gaussian sigma=13.45 baseline)")
    if re.search(r"(?<![0-9.])7\.500\b", txt):
        nums.append("7.500 (DAVE k=8 CRPS on n=1,871)")
    if re.search(r"(?<![0-9.])7\.573\b", txt):
        nums.append("7.573 (pooled EPA)")
    if re.search(r"(?<![0-9.])7\.576\b", txt):
        nums.append("7.576 (core Elo)")
    if re.search(r"(?<![0-9.])6\.927\b", txt):
        nums.append("6.927 (2025 close CRPS, n=272)")
    if re.search(r"CRPS_widened_gauss\s*3\.86", txt):
        nums.append("3.86/6.22 (legacy n=832 diagnostic)")
    if re.search(r"0\.0092", txt):
        nums.append("DeltaCRPS=0.0092 (Mondrian-k killed)")
    if re.search(r"(?<![0-9.])8\.3314\b", txt):
        nums.append("8.3314 (CFB close CRPS, n=283)")
    if not nums:
        m_crps = re.findall(
            r"CRPS(?:(?![0-9]{4}\.[0-9]{4})[^.\n]){0,55}?(?<![0-9.])([0-9]{1,2}\.[0-9]{2,4})\b(?!v[0-9])",
            txt,
        )
        if m_crps:
            dedup = list(dict.fromkeys(m_crps))[:3]
            nums.append("domain/paper CRPS " + "/".join(dedup) + " (non-NFL benchmark)")
        else:
            nums.append("no NFL full-filter CRPS reported (method/spec only)")

    filters = []
    if re.search(r"(?<![0-9.])(?:14,251|14251)\b", txt):
        filters.append("14,251 decided NFL fixtures (1999-2025)")
    if re.search(r"(?<![0-9.])(?:1,871|1871)\b", txt):
        filters.append("n=1,871 walk-forward fold (2019-2025)")
    if re.search(r"(?<![0-9.])6,967\b", txt):
        filters.append("n=6,967 scored REG games (1999-2025)")
    if re.search(r"n\s*=\s*832\b", txt):
        filters.append("n=832 margins diagnostic")
    if re.search(r"n\s*(?:>=|≥)\s*150|150\s+settled|150\s+walk-forward", txt, re.I):
        filters.append("n>=150 OOS walk-forward graduation filter")
    if re.search(r"n\s*(?:>=|≥)\s*100\b", txt, re.I):
        filters.append("n>=100 settled predictions floor")
    if not filters:
        if "walk-forward" in txt.lower() or "walk_forward" in txt.lower():
            filters.append("expanding/rolling walk-forward OOS evaluation")
        else:
            filters.append("external paper benchmark / analytical specification")

    if "spread_line" in txt:
        lock_str = "mu anchored to nflverse spread_line (positive=home favored; no mean shift)"
    elif re.search(r"(?:μ|mu)\s*(?:=|stays|remains)\s*(?:the\s+)?(?:market\s+)?close", txt, re.I):
        lock_str = "mu locked to de-vigged market close (MODEL_VERSION v5.2.7)"
    elif re.search(r"conformal|CQR|Jackknife\+|Venn-Abers", txt, re.I):
        lock_str = "conformal UQ wraps intervals/abstention without shifting point forecast mu"
    else:
        lock_str = "point forecast mu stays locked unless OOS walk-forward CRPS gate clears"

    refusals = []
    if re.search(r"0\.01\b.*7\.109|7\.109.*0\.01|7\.099", txt):
        refusals.append("refuse promotion unless walk-forward CRPS beats 7.109 by >=0.01 (<=7.099) on n>=150")
    if re.search(r"ceil\(\(1\s*-\s*alpha\)\s*\*\s*\(n\s*\+\s*1\)\)|⌈\(n\s*\+\s*1\)\(1\s*[−-]\s*α\)⌉|n\s*<\s*9", txt):
        refusals.append("ban small-sample quantile clamp (fail closed when rank k>n, e.g. n<9 at alpha=0.10)")
    if re.search(r"0\.20\b.*Venn-Abers|Venn-Abers.*0\.20|Δp\s*>\s*0\.20|p1\s*-\s*p0\s*>\s*0\.20", txt, re.I):
        refusals.append("Venn-Abers width >0.20 or ECE >0.05 triggers fail-closed NO_BET")
    if not refusals:
        m_gate = re.search(
            r"(?:^|\n)\s*(?:[-*#]+\s*)?\*\*(?:Verdict|Acceptance\s*/\s*rejection\s+gate|Acceptance\s+gate|Kill\s+test|Operational\s+gate)[:\s\*]*([^\n]{20,120})",
            txt,
            re.I,
        )
        if m_gate:
            refusals.append(clip_words(m_gate.group(1).replace("**", ""), 95))
        else:
            refusals.append("fail-closed PIT discipline; refuse any candidate with OOS Delta CRPS >= 0")

    if re.search(r"NOT EVALUATED|unwired|ENABLED\s*=\s*false", txt):
        next_str = "modules staged with ENABLED=false / Gate status: NOT EVALUATED pending walk-forward run"
    elif re.search(r"DAVE.*auxiliary|Rung[- ]2", txt, re.I):
        next_str = "keep DAVE k=8 as Rung-2 auxiliary prior only; do not retune k=4 on single fold"
    else:
        clean_lines = [
            re.sub(r"\s+", " ", l.replace("**", "")).strip(" #*-|>_")
            for l in txt.splitlines()
            if len(l.strip()) > 35 and not l.strip().startswith("|--")
        ]
        snippet = clean_lines[1] if len(clean_lines) > 1 else (clean_lines[0] if clean_lines else title)
        next_str = clip_words(snippet, 95)

    short_title = clip_words(title, 42)
    s = (
        f"[DEEPENED] CRPS/Metrics: {'; '.join(nums[:3])}. "
        f"Filter/n: {'; '.join(filters[:2])}. "
        f"Lock: {lock_str}. "
        f"Refusal/Gate: {'; '.join(refusals[:2])}. "
        f"Next/Status ({short_title}): {next_str}."
    )
    s = re.sub(r"\s+", " ", s).strip()

    if len(s) < 415:
        clean_lines = [
            re.sub(r"\s+", " ", l.replace("**", "")).strip(" #*-|>_")
            for l in txt.splitlines()
            if len(l.strip()) > 30 and not l.strip().startswith("|--")
        ]
        extra = clip_words(" | ".join(clean_lines[:5]), 565 - len(s))
        s = f"{s} Scope: {extra}."
        s = re.sub(r"\s+", " ", s).strip()

    if len(s) > 590:
        s = clip_words(s, 585) + "."
    return s


def main():
    with open(INPUT_CSV, encoding="utf-8") as f:
        sm = list(csv.DictReader(f))

    sm_paths = {r["PATH"]: i for i, r in enumerate(sm)}

    # 1. Resolve blank summaries first so both output CSVs have 0 unintended blanks
    blank_resolutions = []
    for idx, r in enumerate(sm):
        if not (r.get("SUMMARY") or "").strip():
            resolved = resolve_blank_summary(r["PATH"])
            r["SUMMARY"] = resolved
            blank_resolutions.append((idx, r["PATH"], resolved))

    # 2. Rebuild git status from actual git commit dates
    out_full = subprocess.check_output(
        ["git", "-C", REPO_WT, "log", "HEAD", "--format=%H|%ad|%s", "--date=short", "--name-only"],
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    last_commit = {}
    commit_file_counts = Counter()
    cur = None
    for line in out_full.splitlines():
        if not line.strip():
            continue
        if "|" in line and len(line.split("|")[0]) == 40:
            cur = line.split("|", 2)
        elif cur:
            p = line.strip()
            commit_file_counts[cur[0]] += 1
            if p not in last_commit:
                last_commit[p] = cur

    out_all = subprocess.check_output(
        ["git", "-C", REPO_WT, "log", "--all", "--format=%H|%ad|%s", "--date=short", "--name-only"],
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    first_seen_branch = {}
    cur = None
    for line in out_all.splitlines():
        if not line.strip():
            continue
        if "|" in line and len(line.split("|")[0]) == 40:
            cur = line.split("|", 2)
        elif cur:
            p = line.strip()
            if p not in last_commit and p not in first_seen_branch:
                first_seen_branch[p] = cur

    status_rows = []
    status_counts = Counter()
    for r in sm:
        p = r["PATH"]
        old_status = r["STATUS"]
        mtime_mod = r["MODIFIED"]
        is_dup = (" (1)" in p) or (" (2)" in p) or (" (3)" in p) or ("__1" in p)
        if p in last_commit:
            sha, git_dt, subj = last_commit[p]
            c_files = commit_file_counts[sha]
            is_bulk_git = (
                (git_dt in BULK_GIT_DATES)
                or (c_files >= 100)
                or ("reorg: move" in subj)
                or ("sheriff(pass2)" in subj)
            )
            is_bulk_mtime = mtime_mod in BULK_MTIME_DATES
            if is_dup:
                new_status = "archive"
                why = f"duplicate/backup naming (last git commit {git_dt} {sha[:8]})"
            elif is_bulk_git:
                new_status = "bulk_sync"
                why = f"bulk-sync/mass commit on {git_dt} ({sha[:8]}, {c_files} files: {subj[:55]})"
            elif git_dt >= RECENT_CUTOFF:
                new_status = "now"
                why = f"true recent commit {git_dt} ({sha[:8]}, {c_files} files: {subj[:55]})"
            else:
                new_status = "future"
                why = f"older commit {git_dt} ({sha[:8]}, {c_files} files: {subj[:55]})"
        elif p in first_seen_branch:
            sha, git_dt, subj = first_seen_branch[p]
            c_files = 0
            is_bulk_git = False
            is_bulk_mtime = mtime_mod in BULK_MTIME_DATES
            new_status = "archive" if is_dup else ("now" if git_dt >= RECENT_CUTOFF else "future")
            why = f"other-branch commit {git_dt} ({sha[:8]}: {subj[:55]})"
        else:
            git_dt = "UNTRACKED"
            sha = ""
            c_files = 0
            is_bulk_git = True
            is_bulk_mtime = mtime_mod in BULK_MTIME_DATES
            new_status = "archive" if is_dup else "untracked_sync"
            why = f"untracked local bulk drop (filesystem mtime {mtime_mod})"

        status_counts[new_status] += 1
        status_rows.append(
            {
                "PATH": p,
                "FOLDER": r["FOLDER"],
                "STATUS": new_status,
                "OLD_STATUS": old_status,
                "MODIFIED": git_dt if git_dt != "UNTRACKED" else mtime_mod,
                "GIT_COMMIT_DATE": git_dt,
                "GIT_SHA": sha[:8] if sha else "",
                "COMMIT_FILE_COUNT": c_files,
                "MTIME_DATE": mtime_mod,
                "BULK_SYNC_FLAG": "true" if (is_bulk_git or is_bulk_mtime) else "false",
                "WHY": why,
                "TITLE": r["TITLE"],
                "SUMMARY": r["SUMMARY"],
            }
        )

    for dest in [
        os.path.join(REPO_WT, "sports_md_status_from_git.csv"),
        os.path.join(REPO_WT, "research", "sports_md_status_from_git.csv"),
        os.path.join(REPO_MAIN, "_gse_catalog", "sports_md_status_from_git.csv"),
    ]:
        with open(dest, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(status_rows[0].keys()))
            w.writeheader()
            w.writerows(status_rows)

    # 3. Identify top 75 high-signal Markdown files and deepen them
    out_grep = subprocess.check_output(
        [
            "git",
            "-C",
            REPO_WT,
            "grep",
            "-c",
            "-E",
            r"7\.1540|7\.1426|7\.099|7\.109|2,462|\b2462\b|spread_line|\bCRPS\b|7\.1296|7\.1379|7\.500|14,251|\bBSTS\b|hetero-Gaussian|walk_forward|conformal|\bPIT\b|point-in-time",
        ],
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    cand_paths = set()
    for line in out_grep.splitlines():
        if ":" in line:
            p, _ = line.rsplit(":", 1)
            if p in sm_paths:
                cand_paths.add(p)

    out_ls = subprocess.check_output(
        ["git", "-C", REPO_WT, "ls-files"], text=True, encoding="utf-8", errors="replace"
    )
    tracked_set = set(out_ls.splitlines())
    for p in sm_paths:
        if p not in tracked_set:
            cand_paths.add(p)

    scored = []
    for p in cand_paths:
        fp = resolve_file_path(p)
        if not fp:
            continue
        txt = open(fp, encoding="utf-8", errors="replace").read()
        sc = score_markdown_signal(txt)
        if sc > 0:
            scored.append((sc, sm_paths[p], p))

    scored.sort(reverse=True)
    top_selected = scored[:TOP_K_DEEPEN]
    deepened_indices = {idx: sc for sc, idx, _ in top_selected}

    deepened_rows = []
    lengths = []
    for idx, r in enumerate(sm):
        row_copy = dict(r)
        # Update STATUS and MODIFIED from git rebuild as well so deepened CSV has clean status
        row_copy["STATUS"] = status_rows[idx]["STATUS"]
        row_copy["MODIFIED"] = status_rows[idx]["MODIFIED"]
        if idx in deepened_indices:
            fp = resolve_file_path(r["PATH"])
            txt = open(fp, encoding="utf-8", errors="replace").read()
            ext = build_deepened_extract(r["PATH"], txt, r["TITLE"])
            row_copy["SUMMARY"] = ext
            lengths.append((idx, r["PATH"], len(ext)))
        deepened_rows.append(row_copy)

    for dest in [
        os.path.join(REPO_WT, "sports_md_summaries_deepened.csv"),
        os.path.join(REPO_WT, "research", "sports_md_summaries_deepened.csv"),
        os.path.join(REPO_MAIN, "_gse_catalog", "sports_md_summaries_deepened.csv"),
    ]:
        with open(dest, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(deepened_rows[0].keys()))
            w.writeheader()
            w.writerows(deepened_rows)

    print("Status counts:", status_counts)
    print("Blank rows resolved:", len(blank_resolutions))
    print(
        f"Deepened {len(lengths)} high-signal rows; min_len={min(x[2] for x in lengths)}, max_len={max(x[2] for x in lengths)}"
    )


if __name__ == "__main__":
    main()
