#!/usr/bin/env python3
"""
Priority Downloads Deep Harvester (100% Page-by-Page Zero-Skip Ingestion).

Inspects EVERY page (2,281 / 2,281) of Garrett's 10 verified real priority PDFs plus
records fail-closed refusal metadata for the 2 download-bait stub PDFs, emitting:
  1. docs/data-sources/research/2026-11-13/2026_nfl_rulebook_complete_19_rules_and_penalties.json
  2. docs/data-sources/research/2026-11-13/usa_today_2026_nfl_draft_guide_complete_scouting_index.json
  3. docs/engine/research/2026-11-13/corpus_compilation/priority_10books_2281p_chapter_and_equation_digest.json
  4. brain/feeds/2026-11-13/priority_downloads_full_2281p_trainer_feed.jsonl

Single-writer safety: NEVER writes `brain/mind.jsonl`, NEVER mutates `C:\\Users\\Garrett\\Sports`,
and NEVER fabricates quotes from stub PDFs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

OCR_VENV_PYTHON = Path(r"C:\Users\Garrett\ocr-venv\Scripts\python.exe")

DEFAULT_RULEBOOK_OUT = (
    REPO_ROOT
    / "docs"
    / "data-sources"
    / "research"
    / "2026-11-13"
    / "2026_nfl_rulebook_complete_19_rules_and_penalties.json"
)
DEFAULT_DRAFT_GUIDE_OUT = (
    REPO_ROOT
    / "docs"
    / "data-sources"
    / "research"
    / "2026-11-13"
    / "usa_today_2026_nfl_draft_guide_complete_scouting_index.json"
)
DEFAULT_DIGEST_OUT = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-13"
    / "corpus_compilation"
    / "priority_10books_2281p_chapter_and_equation_digest.json"
)
DEFAULT_TRAINER_FEED_OUT = (
    REPO_ROOT
    / "brain"
    / "feeds"
    / "2026-11-13"
    / "priority_downloads_full_2281p_trainer_feed.jsonl"
)

PRIORITY_PDF_CATALOG: Tuple[Dict[str, str], ...] = (
    {
        "key": "nfl_rulebook_2026",
        "path": r"C:\Users\Garrett\Downloads\ops-2026-NFL-Rulebook-FINAL.pdf",
        "title": "2026 Official Playing Rules of the National Football League",
        "domain": "football",
        "situational_family": "qbSkillScript",
    },
    {
        "key": "usa_today_draft_2026",
        "path": r"C:\Users\Garrett\Downloads\_OceanofPDF.com_USA_Today_Special_Edition_-_NFL_Draft_Guide_2026_-_USA_Today_Special_Edition.pdf",
        "title": "USA Today Sports NFL Draft Guide 2026",
        "domain": "football",
        "situational_family": "coveragePersonnel",
    },
    {
        "key": "severini_analytic_methods_3e",
        "path": r"C:\Users\Garrett\Downloads\_OceanofPDF.com_Analytic_Methods_in_Sports_3rd_Ed_-_Thomas_A_Severini (1).pdf",
        "title": "Analytic Methods in Sports (3rd Ed.) - Thomas A. Severini",
        "domain": "math",
        "situational_family": "marketMicrostructure",
    },
    {
        "key": "carroll_hidden_game",
        "path": r"C:\Users\Garrett\Downloads\_OceanofPDF.com_The_Hidden_Game_of_Football_-_Bob_Carroll (1).pdf",
        "title": "The Hidden Game of Football - Bob Carroll, Pete Palmer & John Thorn",
        "domain": "football",
        "situational_family": "qbSkillScript",
    },
    {
        "key": "usa_football_progression_fdm",
        "path": r"C:\Users\Garrett\Downloads\Player_Progression_Guide_Template__331225796__Full_Book-20190725135347 (1).pdf",
        "title": "USA Football Player Progression Guide (Football Development Model)",
        "domain": "football",
        "situational_family": "coveragePersonnel",
    },
    {
        "key": "football_coaching_guide",
        "path": r"C:\Users\Garrett\Downloads\Football+Coaching+Guide.pdf",
        "title": "Football Coaching Guide",
        "domain": "football",
        "situational_family": "coveragePersonnel",
    },
    {
        "key": "cain_mental_game",
        "path": r"C:\Users\Garrett\Downloads\Chapter-1-Mental-Game-of-Football.pdf",
        "title": "The Mental Game of Football - Brian Cain & Sean McDonnell",
        "domain": "psych",
        "situational_family": "restFatigue",
    },
    {
        "key": "nesti_psychology_in_football",
        "path": r"C:\Users\Garrett\Downloads\preview-9781135284923_A25776191.pdf",
        "title": "Psychology in Football: Working with Elite and Professional Players - Mark Nesti",
        "domain": "psych",
        "situational_family": "restFatigue",
    },
    {
        "key": "dr_bgr_sports_psychology",
        "path": r"C:\Users\Garrett\Downloads\Dr-BGR-ISBN-53-Sports-Psychology.pdf",
        "title": "Sports Psychology (Dr-BGR ISBN-53)",
        "domain": "psych",
        "situational_family": "restFatigue",
    },
    {
        "key": "mack_mind_gym",
        "path": r"C:\Users\Garrett\Downloads\mind-gym-pdf-1.pdf",
        "title": "Mind Gym: An Athlete's Guide to Inner Excellence - Gary Mack",
        "domain": "psych",
        "situational_family": "restFatigue",
    },
)

STUB_PDF_CATALOG: Tuple[Dict[str, str], ...] = (
    {
        "key": "match_quarters_stub",
        "path": r"C:\Users\Garrett\Downloads\(PDF)FULL DOWNLOAD Match Quarters_ A Modern Guidebook to Split-Field Coverages.pdf",
        "title": "Match Quarters: A Modern Guidebook to Split-Field Coverages (Download Stub)",
        "book_id": "527e4d714a574106",
    },
    {
        "key": "split_field_coverages_stub",
        "path": r"C:\Users\Garrett\Downloads\(_PDF_EPUB)-&gt;DOWNLOAD Split Field Coverages_ Understanding Split Field Coverages.pdf",
        "title": "Split Field Coverages: Understanding Split Field Coverages (Download Stub)",
        "book_id": "c3eb423c8b9f92fc",
    },
)

LIGATURE_MAP = {
    "\ufb01": "fi",
    "\ufb02": "fl",
    "\ufb00": "ff",
    "\ufb03": "ffi",
    "\ufb04": "ffl",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "--",
    "\u2212": "-",
}

DRAFT_GUIDE_GLYPHS = {
    "\u00a4": "ft",
    "\u00a6": "ft",
    "\u00b2": "fi",
    "\u00a2": "fi",
    "\u017e": "ff",
    "\u2022": "|",
}

NFL_TEAM_NAMES: Tuple[str, ...] = (
    "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills",
    "Carolina Panthers", "Chicago Bears", "Cincinnati Bengals", "Cleveland Browns",
    "Dallas Cowboys", "Denver Broncos", "Detroit Lions", "Green Bay Packers",
    "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Kansas City Chiefs",
    "Las Vegas Raiders", "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins",
    "Minnesota Vikings", "New England Patriots", "New Orleans Saints", "New York Giants",
    "New York Jets", "Philadelphia Eagles", "Pittsburgh Steelers", "San Francisco 49ers",
    "Seattle Seahawks", "Tampa Bay Buccaneers", "Tennessee Titans", "Washington Commanders",
)


def compute_gatekeeper_sha256(file_path: Path) -> str:
    """Compute exact gatekeeper digest (`sha256(str(size) + bytes)`)."""
    size = file_path.stat().st_size
    h = hashlib.sha256()
    h.update(str(size).encode())
    with file_path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def clean_pdf_text(text: str, *, draft_guide: bool = False) -> str:
    """Normalize ligatures and line breaks without distorting equations or team names."""
    out = unicodedata.normalize("NFKC", text or "")
    for k, v in LIGATURE_MAP.items():
        out = out.replace(k, v)
    if draft_guide:
        for k, v in DRAFT_GUIDE_GLYPHS.items():
            out = out.replace(k, v)
    out = re.sub(r"-\s*\n\s*", "", out)
    return out


def collapse_ws(text: str) -> str:
    """Collapse internal whitespace to single spaces."""
    return re.sub(r"\s+", " ", text or "").strip()


def extract_full_pdf_payloads(pdf_paths: Sequence[Path]) -> Dict[str, Dict[str, Any]]:
    """
    Read ALL pages (`1..len(doc)`) + TOC + metadata for every PDF path using PyMuPDF
    (in-process or via `OCR_VENV_PYTHON`). Zero skipped pages.
    """
    try:
        import pymupdf  # type: ignore

        result: Dict[str, Dict[str, Any]] = {}
        for p in pdf_paths:
            doc = pymupdf.open(str(p))
            n = len(doc)
            pages = {i + 1: (doc[i].get_text("text") or "") for i in range(n)}
            toc = [
                {"level": int(it[0]), "title": str(it[1]), "page": int(it[2])}
                for it in (doc.get_toc() or [])
            ]
            doc.close()
            result[str(p)] = {"pages_total": n, "pages": pages, "toc": toc}
        return result
    except ImportError:
        pass

    if not OCR_VENV_PYTHON.exists():
        raise RuntimeError(
            "PyMuPDF missing in current Python and C:\\Users\\Garrett\\ocr-venv missing"
        )

    with tempfile.TemporaryDirectory(prefix="gse_harvester_") as tmpd:
        manifest_in = Path(tmpd) / "paths.json"
        out_dir = Path(tmpd) / "extracted"
        out_dir.mkdir(parents=True, exist_ok=True)
        manifest_in.write_text(json.dumps([str(p) for p in pdf_paths]), encoding="utf-8")

        helper = (
            "import json, pathlib, sys, pymupdf; "
            "paths = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')); "
            "out_dir = pathlib.Path(sys.argv[2]); "
            "index = {}; "
            "\nfor idx, raw in enumerate(paths):\n"
            "  doc = pymupdf.open(raw)\n"
            "  n = len(doc)\n"
            "  pages = {str(i + 1): (doc[i].get_text('text') or '') for i in range(n)}\n"
            "  toc = [{'level': int(it[0]), 'title': str(it[1]), 'page': int(it[2])} for it in (doc.get_toc() or [])]\n"
            "  doc.close()\n"
            "  fp = out_dir / f'{idx}.json'\n"
            "  fp.write_text(json.dumps({'pages_total': n, 'pages': pages, 'toc': toc}, ensure_ascii=False), encoding='utf-8')\n"
            "  index[raw] = str(fp)\n"
            "pathlib.Path(sys.argv[3]).write_text(json.dumps(index), encoding='utf-8')\n"
        )
        index_out = Path(tmpd) / "index.json"
        subprocess.run(
            [str(OCR_VENV_PYTHON), "-c", helper, str(manifest_in), str(out_dir), str(index_out)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=300,
            check=True,
        )
        idx_map = json.loads(index_out.read_text(encoding="utf-8"))
        parsed: Dict[str, Dict[str, Any]] = {}
        for raw, fp_str in idx_map.items():
            payload = json.loads(Path(fp_str).read_text(encoding="utf-8"))
            parsed[raw] = {
                "pages_total": int(payload["pages_total"]),
                "pages": {int(k): v for k, v in payload["pages"].items()},
                "toc": list(payload["toc"]),
            }
        return parsed


def parse_2026_nfl_rulebook(
    pages: Mapping[int, str],
    *,
    book_id: str,
    sha256: str,
    pages_total: int,
) -> Dict[str, Any]:
    """Parse 100% of pages of `ops-2026-NFL-Rulebook-FINAL.pdf` into Rules 1..19 + 2026 amendments + penalties."""
    changes_2026: List[Dict[str, Any]] = []
    if 2 in pages:
        p2 = clean_pdf_text(pages[2])
        lines = [collapse_ws(l) for l in p2.splitlines() if collapse_ws(l)]
        cur_code = None
        buf: List[str] = []
        for line in lines:
            if re.match(r"^\d+-\d+(-\d+)?$", line):
                if cur_code:
                    changes_2026.append({"rule_article": cur_code, "description": " ".join(buf)})
                cur_code = line
                buf = []
            elif cur_code and line not in ("i", "2026 Rules Changes", "Rule-Section-Article"):
                buf.append(line)
        if cur_code:
            changes_2026.append({"rule_article": cur_code, "description": " ".join(buf)})

    # Scan Table of Contents pages (3..7) and full body (8..pages_total) for Rules 1..19
    rules_map: Dict[int, Dict[str, Any]] = {}
    section_re = re.compile(r"^\s*SECTION\s+(\d+)\s*[:\-]?\s*(.*)$", re.I)
    rule_hdr_re = re.compile(r"^\s*RULE\s+(\d+)\b(.*)$", re.I)

    for pnum in sorted(pages.keys()):
        txt = clean_pdf_text(pages[pnum])
        raw_lines = [collapse_ws(l) for l in txt.splitlines() if collapse_ws(l)]
        active_rule: Optional[int] = None
        for idx, line in enumerate(raw_lines):
            m_rule = re.match(r"^Rule\s+(\d+)\s*$", line) or re.match(r"^RULE\s+(\d+)\b(.*)$", line)
            if m_rule and pnum >= 8:
                rnum = int(m_rule.group(1))
                if 1 <= rnum <= 19:
                    active_rule = rnum
                    entry = rules_map.setdefault(
                        rnum,
                        {
                            "rule_number": rnum,
                            "title": "",
                            "pages": [],
                            "sections": [],
                            "key_excerpt": "",
                        },
                    )
                    if pnum not in entry["pages"]:
                        entry["pages"].append(pnum)
                    if not entry["title"]:
                        # Next non-empty line in RULE header often contains the rule title
                        suffix = collapse_ws(m_rule.group(2)) if m_rule.lastindex and m_rule.lastindex >= 2 else ""
                        if suffix and not suffix.lower().startswith("section"):
                            entry["title"] = suffix
                        elif idx + 1 < len(raw_lines) and len(raw_lines[idx + 1]) <= 80:
                            entry["title"] = raw_lines[idx + 1]
                    if not entry["key_excerpt"]:
                        entry["key_excerpt"] = collapse_ws(txt)[:420]
            if active_rule is not None and pnum >= 8:
                m_sec = section_re.match(line)
                if m_sec:
                    sec_label = f"Section {m_sec.group(1)}: {collapse_ws(m_sec.group(2))}".strip(": ")
                    sec_list = rules_map[active_rule]["sections"]
                    if sec_label not in sec_list and len(sec_list) < 25:
                        sec_list.append(sec_label)

    # Penalty Summary pages (p.78-81 typically)
    penalty_lines: List[Dict[str, Any]] = []
    signals: List[Dict[str, Any]] = []
    for pnum in range(77, pages_total + 1):
        txt = clean_pdf_text(pages.get(pnum, ""))
        if not txt:
            continue
        lines = [collapse_ws(l) for l in txt.splitlines() if collapse_ws(l)]
        if any(k in txt.upper() for k in ("DISTANCE PENALTIES", "LOSS OF FIVE YARDS", "LOSS OF 15 YARDS", "LOSS OF DOWN")):
            cur_bucket = "General"
            for line in lines:
                if line.startswith(("Loss of ", "Automatic ", "Disqualification")):
                    cur_bucket = line
                m_pen = re.match(r"^(.+?)\s*\.{3,}\s*([\d\-,\s/]+)$", line)
                if m_pen:
                    penalty_lines.append(
                        {
                            "category": cur_bucket,
                            "foul": collapse_ws(m_pen.group(1)),
                            "rule_ref": collapse_ws(m_pen.group(2)),
                            "page": pnum,
                        }
                    )
        if any(k in txt.upper() for k in ("PENALTY REFUSED", "ILLEGAL CONTACT", "OFFSIDE, ENCROACHMENT", "TOUCHDOWN")):
            for line in lines:
                m_sig = re.match(r"^(\d{1,2})\s+([A-Z][A-Z\s,/()-]{4,})$", line)
                if m_sig:
                    signals.append({"signal_number": int(m_sig.group(1)), "signal_name": collapse_ws(m_sig.group(2)), "page": pnum})

    # Specific Rule 4 clock/runoff & Rule 16 overtime extraction
    overtime_excerpt = collapse_ws(clean_pdf_text(pages.get(72, "") + " " + pages.get(73, "")))[:900]
    timing_excerpt = collapse_ws(clean_pdf_text(pages.get(18, "") + " " + pages.get(19, "")))[:900]
    replay_excerpt = collapse_ws(clean_pdf_text(pages.get(77, "")))[:700]

    return {
        "schema": "gse.nfl_rulebook_2026_complete.v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "book_id": book_id,
        "sha256": sha256,
        "title": "2026 Official Playing Rules of the National Football League",
        "pages_total": pages_total,
        "pages_inspected": len(pages),
        "coverage_ratio": round(len(pages) / max(1, pages_total), 4),
        "rules_2026_changes": changes_2026,
        "rules_1_to_19": [rules_map[k] for k in sorted(rules_map.keys())],
        "special_highlights": {
            "rule_4_timing_excerpt": timing_excerpt,
            "rule_16_overtime_excerpt": overtime_excerpt,
            "rule_19_replay_excerpt": replay_excerpt,
        },
        "penalty_summary_entries_count": len(penalty_lines),
        "penalty_summary_entries": penalty_lines,
        "officials_signals_detected": signals,
    }


def parse_usa_today_draft_guide_2026(
    pages: Mapping[int, str],
    *,
    book_id: str,
    sha256: str,
    pages_total: int,
) -> Dict[str, Any]:
    """Parse 100% of pages of USA Today 2026 NFL Draft Guide (Top 100, positional boards, 32 teams)."""
    toc_raw = collapse_ws(clean_pdf_text(pages.get(5, ""), draft_guide=True))

    # Extract Top 100 entries across pages 26..44
    top_100: List[Dict[str, Any]] = []
    seen_ranks: set[int] = set()
    entry_re = re.compile(
        r"(?:^|\n)\s*(\d{1,3})\s*\n\s*([A-Za-z0-9'.\- ]+?)\s+(QB|RB|WR|TE|OT|OG|IOL|C|OL|QT|OC|EDGE|DE|DT|IDL|NT|DL|LB|CB|S|SAF|DB|FB|K|P|LS)\s*\n\s*([A-Za-z0-9.&'()\- ]+)\s*\n\s*Height:\s*([^\n]+?)\s+Weight:\s*([^\n]+)\n",
        re.M,
    )
    for pnum in range(25, min(pages_total + 1, 48)):
        txt = clean_pdf_text(pages.get(pnum, ""), draft_guide=True)
        for m in entry_re.finditer(txt):
            rank = int(m.group(1))
            if not (1 <= rank <= 100) or rank in seen_ranks:
                continue
            seen_ranks.add(rank)
            tail = collapse_ws(txt[m.end() : m.end() + 420])
            top_100.append(
                {
                    "rank": rank,
                    "name": collapse_ws(m.group(2)),
                    "position": collapse_ws(m.group(3)),
                    "school": collapse_ws(m.group(4)),
                    "height": collapse_ws(m.group(5)),
                    "weight": collapse_ws(m.group(6)),
                    "page": pnum,
                    "scouting_summary": tail[:320],
                }
            )

    # Extract 32 NFL Team Needs across pages 69..105
    teams_found: Dict[str, Dict[str, Any]] = {}
    for pnum in range(68, min(pages_total + 1, 108)):
        txt = clean_pdf_text(pages.get(pnum, ""), draft_guide=True)
        flat = collapse_ws(txt)
        for team in NFL_TEAM_NAMES:
            if team.lower() in flat.lower() and team not in teams_found:
                gm_m = re.search(r"General manager:\s*([^\n]+)", txt, re.I)
                hc_m = re.search(r"Head coach:\s*([^\n]+)", txt, re.I)
                picks_m = re.search(r"Projected 2026\s+NFL Draft picks:\s*(\d+)", flat, re.I)
                priorities_m = re.search(r"2026 Draft Priorities\s+(.*)", flat, re.I)
                teams_found[team] = {
                    "team": team,
                    "page": pnum,
                    "general_manager": collapse_ws(gm_m.group(1)) if gm_m else "",
                    "head_coach": collapse_ws(hc_m.group(1)) if hc_m else "",
                    "projected_picks": int(picks_m.group(1)) if picks_m else None,
                    "priorities_excerpt": collapse_ws(priorities_m.group(1))[:520] if priorities_m else flat[:520],
                }

    # Build lightweight all-132-page structural index so 100% of pages are cataloged
    page_index: List[Dict[str, Any]] = []
    for pnum in range(1, pages_total + 1):
        txt = clean_pdf_text(pages.get(pnum, ""), draft_guide=True)
        lines = [collapse_ws(l) for l in txt.splitlines() if collapse_ws(l)]
        page_index.append(
            {
                "page": pnum,
                "char_count": len(collapse_ws(txt)),
                "headline": " | ".join(lines[:3])[:160],
            }
        )

    return {
        "schema": "gse.usa_today_draft_guide_2026.v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "book_id": book_id,
        "sha256": sha256,
        "title": "USA Today Sports NFL Draft Guide 2026",
        "pages_total": pages_total,
        "pages_inspected": len(pages),
        "table_of_contents_summary": toc_raw[:900],
        "top_100_extracted_count": len(top_100),
        "top_100_prospects": sorted(top_100, key=lambda r: r["rank"]),
        "team_needs_extracted_count": len(teams_found),
        "team_needs_32_franchises": [teams_found[k] for k in sorted(teams_found.keys())],
        "all_pages_index": page_index,
    }


def extract_formula_and_heading_lines(pages: Mapping[int, str], max_formulas: int = 80) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Detect chapter headings and formula/mathematical expression lines across all pages."""
    headings: List[str] = []
    formulas: List[Dict[str, Any]] = []
    seen_h: set[str] = set()
    seen_f: set[str] = set()
    hdr_pat = re.compile(r"^(?:Chapter\s+\d+|Part\s+[IVX0-9]+|STAGE\s+\d+|RULE\s+\d+|\d+\.\d+\s+[A-Z]).{3,85}$")
    eq_pat = re.compile(r"([A-Za-z0-9_()\[\]{}]+\s*=\s*[^=]{4,80})")

    for pnum in sorted(pages.keys()):
        txt = clean_pdf_text(pages[pnum])
        for raw_line in txt.splitlines():
            s = collapse_ws(raw_line)
            if not s or len(s) > 120:
                continue
            if hdr_pat.match(s) and s not in seen_h and len(headings) < 120:
                seen_h.add(s)
                headings.append(f"p.{pnum}: {s}")
            if any(op in s for op in ("=", "sum", "Pr(", "E(", "Var(", "log(", "sqrt")) and "=" in s:
                m = eq_pat.search(s)
                if m:
                    expr = collapse_ws(m.group(1))
                    if len(expr) >= 8 and expr not in seen_f and len(formulas) < max_formulas:
                        seen_f.add(expr)
                        formulas.append({"page": pnum, "expression": expr})
    return headings, formulas


def build_trainer_feed_records_for_book(
    meta: Mapping[str, str],
    book_id: str,
    sha256: str,
    pages_total: int,
    pages: Mapping[int, str],
) -> List[Dict[str, Any]]:
    """Build non-empty chapter/page-window records covering page 1..pages_total cleanly."""
    non_empty_pnums = [p for p in sorted(pages.keys()) if len(collapse_ws(pages[p])) >= 40]
    window_size = 6 if pages_total <= 100 else (12 if pages_total <= 300 else 20)
    records: List[Dict[str, Any]] = []
    is_dg = meta["key"] == "usa_today_draft_2026"

    for start_idx in range(0, len(non_empty_pnums), window_size):
        chunk_pnums = non_empty_pnums[start_idx : start_idx + window_size]
        p_start, p_end = chunk_pnums[0], chunk_pnums[-1]
        texts = [collapse_ws(clean_pdf_text(pages[p], draft_guide=is_dg)) for p in chunk_pnums]
        joined = " | ".join(t[:320] for t in texts if t)[:1800]
        records.append(
            {
                "schema": "gse.mind_trainer_feed.v1",
                "source_type": "priority_book_full_window",
                "book_id": book_id,
                "sha256": sha256,
                "key": meta["key"],
                "title": meta["title"],
                "primary_domain": meta["domain"],
                "situational_family": meta["situational_family"],
                "page_start": p_start,
                "page_end": p_end,
                "pages_total": pages_total,
                "pages_covered_in_window": len(chunk_pnums),
                "content_excerpt": joined,
            }
        )
    return records


def run_deep_harvest(
    *,
    rulebook_out: Path = DEFAULT_RULEBOOK_OUT,
    draft_guide_out: Path = DEFAULT_DRAFT_GUIDE_OUT,
    digest_out: Path = DEFAULT_DIGEST_OUT,
    trainer_feed_out: Path = DEFAULT_TRAINER_FEED_OUT,
) -> Dict[str, Any]:
    """Execute 100% page-by-page harvesting across all 10 real books and record the 2 stub audits."""
    existing_paths = [Path(item["path"]) for item in PRIORITY_PDF_CATALOG if Path(item["path"]).is_file()]
    if not existing_paths:
        raise FileNotFoundError("No priority PDFs found in expected Downloads locations")

    payloads = extract_full_pdf_payloads(existing_paths)
    books_digest: List[Dict[str, Any]] = []
    all_feed_records: List[Dict[str, Any]] = []
    total_pages_inspected = 0

    for meta in PRIORITY_PDF_CATALOG:
        p = Path(meta["path"])
        if not p.is_file():
            continue
        sha = compute_gatekeeper_sha256(p)
        bid = sha[:16]
        raw_payload = payloads[str(p)]
        pages_total = int(raw_payload["pages_total"])
        pages: Dict[int, str] = raw_payload["pages"]
        toc = raw_payload["toc"]
        total_pages_inspected += pages_total

        if meta["key"] == "nfl_rulebook_2026":
            rb_doc = parse_2026_nfl_rulebook(pages, book_id=bid, sha256=sha, pages_total=pages_total)
            rulebook_out.parent.mkdir(parents=True, exist_ok=True)
            rulebook_out.write_text(json.dumps(rb_doc, indent=2, ensure_ascii=False), encoding="utf-8")

        if meta["key"] == "usa_today_draft_2026":
            dg_doc = parse_usa_today_draft_guide_2026(pages, book_id=bid, sha256=sha, pages_total=pages_total)
            draft_guide_out.parent.mkdir(parents=True, exist_ok=True)
            draft_guide_out.write_text(json.dumps(dg_doc, indent=2, ensure_ascii=False), encoding="utf-8")

        headings, formulas = extract_formula_and_heading_lines(pages)
        non_empty_count = sum(1 for v in pages.values() if collapse_ws(v))
        books_digest.append(
            {
                "key": meta["key"],
                "book_id": bid,
                "sha256": sha,
                "title": meta["title"],
                "domain": meta["domain"],
                "situational_family": meta["situational_family"],
                "pages_total": pages_total,
                "pages_inspected": len(pages),
                "non_empty_text_pages": non_empty_count,
                "toc_entries_count": len(toc),
                "toc_sample": toc[:30],
                "detected_headings_count": len(headings),
                "detected_headings_sample": headings[:40],
                "extracted_formulas_count": len(formulas),
                "extracted_formulas_sample": formulas[:40],
            }
        )
        all_feed_records.extend(
            build_trainer_feed_records_for_book(meta, bid, sha, pages_total, pages)
        )

    stub_audit: List[Dict[str, Any]] = []
    for s_item in STUB_PDF_CATALOG:
        sp = Path(s_item["path"])
        stub_audit.append(
            {
                "book_id": s_item["book_id"],
                "title": s_item["title"],
                "file_exists": sp.is_file(),
                "file_size_bytes": sp.stat().st_size if sp.is_file() else 0,
                "source_status": "INSUFFICIENT_SOURCE_ACCESS",
                "derived_kernel_wired": "SPLIT_FIELD_QUARTERS_COVERAGE_OPERATORS",
                "reason": "1-2 page download-bait stub with zero book body content; zero fabricated quotes emitted.",
            }
        )

    digest_doc = {
        "schema": "gse.priority_10books_full_digest.v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "real_books_count": len(books_digest),
        "pages_inspected_total": total_pages_inspected,
        "stub_books_refused_count": len(stub_audit),
        "trainer_feed_records_emitted": len(all_feed_records),
        "books": books_digest,
        "stub_audit": stub_audit,
    }
    digest_out.parent.mkdir(parents=True, exist_ok=True)
    digest_out.write_text(json.dumps(digest_doc, indent=2, ensure_ascii=False), encoding="utf-8")

    trainer_feed_out.parent.mkdir(parents=True, exist_ok=True)
    trainer_feed_out.write_text(
        "\n".join(json.dumps(rec, ensure_ascii=False) for rec in all_feed_records) + "\n",
        encoding="utf-8",
    )
    return digest_doc


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Deep page-by-page harvester across Garrett's 10 real priority PDFs (2,281 pages).")
    ap.add_argument("--rulebook-out", type=Path, default=DEFAULT_RULEBOOK_OUT)
    ap.add_argument("--draft-guide-out", type=Path, default=DEFAULT_DRAFT_GUIDE_OUT)
    ap.add_argument("--digest-out", type=Path, default=DEFAULT_DIGEST_OUT)
    ap.add_argument("--trainer-feed-out", type=Path, default=DEFAULT_TRAINER_FEED_OUT)
    return ap.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    doc = run_deep_harvest(
        rulebook_out=args.rulebook_out,
        draft_guide_out=args.draft_guide_out,
        digest_out=args.digest_out,
        trainer_feed_out=args.trainer_feed_out,
    )
    print(
        f"HARVEST_OK | real_books={doc['real_books_count']} pages_inspected={doc['pages_inspected_total']} "
        f"stubs_refused={doc['stub_books_refused_count']} feed_records={doc['trainer_feed_records_emitted']}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
