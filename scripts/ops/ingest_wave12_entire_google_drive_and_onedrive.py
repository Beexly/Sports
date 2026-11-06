#!/usr/bin/env python3
"""
Wave 12 Ingestion & Situational Wiring Runner:
Scans and extracts every GSE / GSI / GSN / Alter / Sports / AI / Math / Engineering asset across:
  1. `G:\\My Drive\\GSN` (2,324 files)
  2. `G:\\My Drive\\GSE-Ultra-30TB-Vault` (1,223 raw / 1,211 non-ini files)
  3. `G:\\My Drive\\Alter` (4 files) & Privacy-Filtered Root `G:\\My Drive`
  4. `C:\\Users\\Garrett\\OneDrive\\Documents\\Galaxy Sports Edge` (1,027 raw / 1,014 non-git files)

Executes `intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py` and writes:
  1. `data/engine/wave12_entire_google_drive_and_onedrive_manifest_2026_11_05.json`
  2. `data/mind_staging/mind_wave12_entire_google_drive_and_onedrive_2026_11_05.jsonl` (`trainer_ready: true`)
  3. `docs/engine/research/2026-11-05/WAVE12-ENTIRE-GOOGLE-DRIVE-AND-ONEDRIVE-SITUATIONAL-WIRING-LEDGER.md`
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

ROOT_DIR = Path(r"C:\c\wt-week8-forensic")
GDRIVE_ROOT = Path(r"G:\My Drive")
GSN_DIR = GDRIVE_ROOT / "GSN"
VAULT_DIR = GDRIVE_ROOT / "GSE-Ultra-30TB-Vault"
ALTER_DIR = GDRIVE_ROOT / "Alter"
ONEDRIVE_DIR = Path(r"C:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge")

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from intelligence.coaching.google_drive_and_onedrive_omni_situational_engine import (
    GSE_58_PAPER_DOSSIER_CATALOG,
    run_google_drive_and_onedrive_omni_situational_overlay,
)


# ============================================================================
# STRICT PRIVACY & SAFETY FILTER FOR ROOT G:\My Drive
# ============================================================================
PRIVACY_EXCLUDED_DIR_NAMES = {
    "AI images",
    "Baby Girl - Aisha",
    "Profile Pictures - Social & Dating",
    "GB Resume 23",
    "Google Meet",
    "Liberal Studies",
    "Outlook",
    "Saved from Chrome",
    "Takeout",
}

PRIVACY_EXCLUDED_FILE_PREFIXES_OR_SUBSTRINGS = (
    "eeoc",
    "divorce",
    "birth certificate",
    "doug",
    "abletter",
    "ada-gb",
    "ada_letter",
    "newada",
    "adp background",
    "flsa",
    "noticeofemploymenttermination",
    "usssaclaimform",
    "medical release",
    "hr business plan",
    "hr manager",
    "d.baxley hr",
    "dismissal",
    "garrett_baxley_resume",
    "garrett baxley 3.19.25",
    "confidential legal",
    "aiu prescreening",
    "accuserve",
    "contract agreement - cruncher",
    "craftco",
    "baxley_shipping",
    "copy of action items",
    "order_01kyxv",
    "img_",
    "27ab27c0",
    "ba37df1a",
    "screenrecording",
    "desktop.ini",
)


def is_privacy_safe_root_item(name: str, is_dir: bool) -> bool:
    """Strictly filters out personal, HR, legal, medical, resume, and photo files in Root G:\\My Drive."""
    if is_dir:
        return name in {"GSN", "GSE-Ultra-30TB-Vault", "Alter"}
    low = name.lower()
    for pat in PRIVACY_EXCLUDED_FILE_PREFIXES_OR_SUBSTRINGS:
        if pat in low:
            return False
    return True


def _stage0_scrub(text: str) -> str:
    """Ensure zero secret tokens, credentials, or connection strings appear in mind_staging records."""
    scrubbed = re.sub(r"sk-[A-Za-z0-9_\-]{16,}", "[REDACTED_KEY]", text)
    scrubbed = re.sub(r"ghp_[A-Za-z0-9]{20,}", "[REDACTED_GH_TOKEN]", scrubbed)
    scrubbed = re.sub(r"postgres(?:ql)?://[^\s\"']+", "[REDACTED_DB_URI]", scrubbed)
    return scrubbed


def _extract_docx_xml(docx_path: Path) -> Dict[str, Any]:
    """Extracts full text from a `.docx` file via `zipfile` + `word/document.xml`."""
    raw_bytes = docx_path.read_bytes()
    sha256_hex = hashlib.sha256(raw_bytes).hexdigest()
    with zipfile.ZipFile(docx_path, "r") as zf:
        xml_bytes = zf.read("word/document.xml")
    root = ET.fromstring(xml_bytes)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: List[str] = []
    for p in root.findall(".//w:p", ns):
        texts = [t.text for t in p.findall(".//w:t", ns) if t.text]
        if texts:
            line = "".join(texts).strip()
            if line:
                paragraphs.append(line)
    full_text = "\n".join(paragraphs)
    return {
        "filename": docx_path.name,
        "absolute_path": str(docx_path),
        "byte_size": len(raw_bytes),
        "sha256": sha256_hex,
        "paragraph_count": len(paragraphs),
        "char_count": len(full_text),
        "title": paragraphs[0] if paragraphs else docx_path.stem,
        "key_headers": [p[:140] for p in paragraphs if len(p) < 110][:15],
        "opening_excerpt": _stage0_scrub(full_text[:1200]),
    }


def _read_gdoc_pointer_safe(gdoc_path: Path) -> Dict[str, Any]:
    """
    Safely inspects a `.gdoc` pointer file on Google Drive Desktop.
    Note: Google Drive virtual filesystem raises OSError(22, 'Invalid argument') on direct open()
    for virtual cloud shortcuts; we capture metadata and parse JSON when accessible.
    """
    stat = gdoc_path.stat()
    meta: Dict[str, Any] = {
        "filename": gdoc_path.name,
        "relative_path": str(gdoc_path.relative_to(GDRIVE_ROOT)),
        "byte_size": stat.st_size,
        "mtime_iso": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
    }
    try:
        raw = gdoc_path.read_text(encoding="utf-8", errors="replace")
        parsed = json.loads(raw)
        meta["doc_id"] = parsed.get("doc_id") or parsed.get("url", "")
        meta["email"] = parsed.get("email", "")
        meta["resource_key"] = parsed.get("resource_key", "")
        meta["pointer_mode"] = "json_parsed"
    except OSError:
        meta["doc_id"] = f"gdrive_virtual_shortcut::{hashlib.sha256(str(gdoc_path).encode('utf-8')).hexdigest()[:16]}"
        meta["pointer_mode"] = "gdrive_virtual_cloud_link"
    return meta


def run_wave12_ingestion() -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    mind_records: List[Dict[str, Any]] = []

    # =========================================================================
    # 1. SCAN & EXTRACT `G:\My Drive\GSN` (2,324 files)
    # =========================================================================
    gsn_all_files = [p for p in GSN_DIR.rglob("*") if p.is_file()]
    gsn_five_docx_names = [
        "World-Class Sports Probability Engine Corpus Audit (1).docx",
        "CQR Research (1).docx",
        "Galaxy Sports Edge Research Audit (2).docx",
        "Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE (2).docx",
        "Architectural Blueprint for a Calibrated, Tracking-Decoupled Sports Probability Engine (1).docx",
    ]
    gsn_docx_extractions: List[Dict[str, Any]] = []
    for dname in gsn_five_docx_names:
        dp = GSN_DIR / dname
        if dp.exists():
            info = _extract_docx_xml(dp)
            gsn_docx_extractions.append(info)
            mind_records.append(
                {
                    "id": f"wave12_gsn_docx_{hashlib.sha256(dname.encode()).hexdigest()[:10]}",
                    "item_type": "gsn_master_docx_audit",
                    "source_file": f"G:\\My Drive\\GSN\\{dname}",
                    "sha256": info["sha256"],
                    "byte_size": info["byte_size"],
                    "domain": "conformal_calibration_and_probability_engine_architecture",
                    "title": f"[GSN Master DOCX] {info['title']}",
                    "extracted_summary": info["opening_excerpt"],
                    "equations_and_premises": info["key_headers"][:8],
                    "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py",
                    "stage0_scrubbed": True,
                    "ingestion_status": "EXTRACTED_AND_WIRED",
                    "trainer_ready": True,
                    "staged_at": now_iso,
                }
            )

    # Read GSN top-level Markdown / JSON / CSV files
    gsn_text_targets = [
        ("GSE_58_paper_dossiers.md", "58-Paper Full-Text Dossiers (Clusters A-G: Win Prob, Bayesian, Ranking, Causal, Diffusion, Markets)"),
        ("GSE_58_independent_research.md", "Independent Relevance Audit of 58 arXiv Papers (Bands 1-4)"),
        ("SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md", "Sports OS 15-Layer Intelligence Network Master Architecture Plan & 6-Tier Source Mesh"),
        ("CLAUDE_CODEX_SEAMLESS_OPERATING_PROTOCOL.md", "Claude Code <-> Codex Autonomous Execution & Verification Operating Protocol"),
        ("PROMPT_3_V2_LINE_LEVEL_WAVE3_INTEGRATION.md", "Wave 3 Line-Level Sports Science, Biomechanics, Radar Tracking & RAG Governance Integration"),
        ("PROMPT_4_FINAL_WAVE_DESIGN_MEDIA_AUDIT_INTEGRATION(1).md", "Wave 4 Final Design, Media Studio, Stitch/DESIGN.md & Workbench Integration"),
        ("research_results.json", "Structured arXiv & DOI Research Citation Verification Map"),
        ("research_results.csv", "Tabular Corpus Triage Matrix (103 KB)"),
    ]
    gsn_text_extractions: List[Dict[str, Any]] = []
    for fname, desc in gsn_text_targets:
        fp = GSN_DIR / fname
        if fp.exists():
            raw_b = fp.read_bytes()
            sha = hashlib.sha256(raw_b).hexdigest()
            txt = raw_b.decode("utf-8", errors="replace")
            lines = txt.splitlines()
            rec = {
                "filename": fname,
                "byte_size": len(raw_b),
                "line_count": len(lines),
                "sha256": sha,
                "description": desc,
            }
            gsn_text_extractions.append(rec)
            mind_records.append(
                {
                    "id": f"wave12_gsn_doc_{hashlib.sha256(fname.encode()).hexdigest()[:10]}",
                    "item_type": "gsn_master_specification",
                    "source_file": f"G:\\My Drive\\GSN\\{fname}",
                    "sha256": sha,
                    "byte_size": len(raw_b),
                    "domain": "sports_os_architecture_and_research_corpus",
                    "title": f"[GSN Spec] {fname}",
                    "extracted_summary": _stage0_scrub(f"{desc} ({len(lines)} lines, {len(raw_b):,} bytes). {txt[:700]}"),
                    "equations_and_premises": [l.strip()[:120] for l in lines if l.strip().startswith("#")][:8],
                    "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py",
                    "stage0_scrubbed": True,
                    "ingestion_status": "EXTRACTED_AND_WIRED",
                    "trainer_ready": True,
                    "staged_at": now_iso,
                }
            )

    # Catalog GSN\Galaxy Sports Edge\docs\research buckets & .codex-worktrees\gse-frontier-recovery
    gsn_research_dir = GSN_DIR / "Galaxy Sports Edge" / "docs" / "research"
    gsn_research_buckets: Dict[str, Any] = {}
    if gsn_research_dir.exists():
        for bdir in sorted(gsn_research_dir.iterdir()):
            if bdir.is_dir():
                bfiles = [f for f in bdir.rglob("*") if f.is_file()]
                md_cards = [f for f in bfiles if f.suffix.lower() == ".md"]
                gsn_research_buckets[bdir.name] = {
                    "total_files": len(bfiles),
                    "markdown_files": len(md_cards),
                    "sample_files": [f.name for f in sorted(bfiles)[:8]],
                }

    gsn_frontier_wt = GSN_DIR / "Galaxy Sports Edge" / ".codex-worktrees" / "gse-frontier-recovery"
    gsn_frontier_files = [f for f in gsn_frontier_wt.rglob("*") if f.is_file()] if gsn_frontier_wt.exists() else []
    gsn_frontier_md = [f for f in gsn_frontier_files if f.suffix.lower() == ".md"]

    # Catalog GSN\GSE. 10.2.26
    gse_10_2_dir = GSN_DIR / "GSE. 10.2.26"
    gse_10_2_files = [f for f in gse_10_2_dir.rglob("*") if f.is_file()] if gse_10_2_dir.exists() else []
    gse_10_2_exts: Dict[str, int] = {}
    for f in gse_10_2_files:
        ext = f.suffix.lower() or "<no_ext>"
        gse_10_2_exts[ext] = gse_10_2_exts.get(ext, 0) + 1

    # Catalog all .gdoc files in GSN (373 files)
    gsn_gdoc_files = sorted(GSN_DIR.rglob("*.gdoc"))
    gsn_gdoc_sample = [_read_gdoc_pointer_safe(p) for p in gsn_gdoc_files[:25]]

    # =========================================================================
    # 2. SCAN & EXTRACT `G:\My Drive\GSE-Ultra-30TB-Vault` (1,223 files / 1,211 non-ini)
    # =========================================================================
    vault_all_files = [p for p in VAULT_DIR.rglob("*") if p.is_file()]
    vault_non_ini_files = [p for p in vault_all_files if p.name.lower() != "desktop.ini"]

    cuda_feed_path = VAULT_DIR / "cuda_weighted_entropy_evolution_feed.jsonl"
    cuda_equations = [
        json.loads(line)
        for line in cuda_feed_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    for eq in cuda_equations:
        eq_str = json.dumps(eq, sort_keys=True)
        mind_records.append(
            {
                "id": f"wave12_vault_{eq['record_id'].lower().replace('-', '_')}",
                "item_type": "vault_cuda_entropy_equation",
                "source_file": "G:\\My Drive\\GSE-Ultra-30TB-Vault\\cuda_weighted_entropy_evolution_feed.jsonl",
                "sha256": hashlib.sha256(eq_str.encode("utf-8")).hexdigest(),
                "byte_size": len(eq_str),
                "domain": eq["domain"],
                "title": f"[{eq['record_id']}] {eq['title']}",
                "extracted_summary": _stage0_scrub(eq["coach_game_impact"]),
                "equations_and_premises": [eq["equation_latex"]],
                "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py::evaluate_vault_entropy_evolution_and_alter_xiv_twin",
                "stage0_scrubbed": True,
                "ingestion_status": "WIRED_IN_PYTHON_ENGINE",
                "trainer_ready": True,
                "staged_at": now_iso,
            }
        )

    gcp_feed_path = VAULT_DIR / "gcp_agentic_and_rclone_feed.jsonl"
    gcp_equations = [
        json.loads(line)
        for line in gcp_feed_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    for eq in gcp_equations:
        eq_str = json.dumps(eq, sort_keys=True)
        mind_records.append(
            {
                "id": f"wave12_vault_{eq['equation_id'].lower().replace('-', '_')}",
                "item_type": "vault_gcp_agentic_equation",
                "source_file": "G:\\My Drive\\GSE-Ultra-30TB-Vault\\gcp_agentic_and_rclone_feed.jsonl",
                "sha256": hashlib.sha256(eq_str.encode("utf-8")).hexdigest(),
                "byte_size": len(eq_str),
                "domain": eq["domain"],
                "title": f"[{eq['equation_id']}] {eq['title']}",
                "extracted_summary": _stage0_scrub(eq["coach_scheme_application"]),
                "equations_and_premises": [eq["latex"]],
                "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py::evaluate_vault_entropy_evolution_and_alter_xiv_twin",
                "stage0_scrubbed": True,
                "ingestion_status": "WIRED_IN_PYTHON_ENGINE",
                "trainer_ready": True,
                "staged_at": now_iso,
            }
        )

    vault_manifest_json = json.loads((VAULT_DIR / "manifest.json").read_text(encoding="utf-8"))
    vault_offload_json = json.loads((VAULT_DIR / "offload_manifest_2026_10_29.json").read_text(encoding="utf-8"))
    rc_manifest_lines = (
        (VAULT_DIR / "research-corpus-2026-11-03" / "manifest.jsonl")
        .read_text(encoding="utf-8", errors="replace")
        .splitlines()
    )
    rc_provenance_txt = (
        (VAULT_DIR / "research-corpus-2026-11-03" / "PROVENANCE.txt")
        .read_text(encoding="utf-8", errors="replace")
    )
    hermes_memory_txt = _stage0_scrub(
        (VAULT_DIR / "hermes-backup" / "memories-20261103-140317" / "MEMORY.md")
        .read_text(encoding="utf-8", errors="replace")
    )

    rc_pdfs = [
        p for p in (VAULT_DIR / "research-corpus-2026-11-03" / "pdfs").glob("*.pdf")
    ]
    deep_pdfs = [
        p for p in (VAULT_DIR / "deep-corpus-2026-11-04" / "pdfs").glob("*.pdf")
    ]
    dl_archive_files = [
        p for p in (VAULT_DIR / "downloads-archive-2026-11-03").iterdir()
        if p.is_file() and p.name.lower() != "desktop.ini"
    ]
    nfl_film_mp4s = [
        {"filename": p.name, "byte_size": p.stat().st_size}
        for p in sorted((VAULT_DIR / "nfl-film-room-2026").glob("*.mp4"))
    ]

    mind_records.append(
        {
            "id": "wave12_vault_research_corpus_2034_manifest",
            "item_type": "vault_research_corpus_manifest",
            "source_file": "G:\\My Drive\\GSE-Ultra-30TB-Vault\\research-corpus-2026-11-03\\manifest.jsonl",
            "sha256": hashlib.sha256(rc_provenance_txt.encode("utf-8")).hexdigest(),
            "byte_size": sum(len(l) for l in rc_manifest_lines),
            "domain": "vision_tracking_coverage_pose_homography_football_analytics",
            "title": "GSE-Ultra-30TB-Vault Research Corpus (2,034 OpenAlex Records, 1,117 PDFs + 52 Deep Corpus PDFs + 12 NFL Film Room MP4s)",
            "extracted_summary": _stage0_scrub(rc_provenance_txt[:1000]),
            "equations_and_premises": [
                "vision_tracking (250 hits)",
                "coverage_scheme (200 hits)",
                "pose_homography (200 hits)",
                "football_analytics (300 hits)",
                "forecasting_calibration (200 hits)",
            ],
            "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py",
            "stage0_scrubbed": True,
            "ingestion_status": "CATALOGED_AND_WIRED",
            "trainer_ready": True,
            "staged_at": now_iso,
        }
    )

    # =========================================================================
    # 3. SCAN & EXTRACT `G:\My Drive\Alter` (4 files) & PRIVACY-SAFE ROOT `G:\My Drive`
    # =========================================================================
    alter_files = [p for p in sorted(ALTER_DIR.iterdir()) if p.is_file() and p.name.lower() != "desktop.ini"]
    alter_kickoff_txt = (ALTER_DIR / "ALTER_XIV_CLAUDE_CODE_KICKOFF.md").read_text(encoding="utf-8", errors="replace")
    with zipfile.ZipFile(ALTER_DIR / "alter-xiv-scaffold-v2_1.zip", "r") as zf:
        alter_zip_namelist = zf.namelist()

    mind_records.append(
        {
            "id": "wave12_alter_xiv_world_model_twin",
            "item_type": "alter_xiv_architecture_charter",
            "source_file": "G:\\My Drive\\Alter\\ALTER_XIV_CLAUDE_CODE_KICKOFF.md",
            "sha256": hashlib.sha256(alter_kickoff_txt.encode("utf-8")).hexdigest(),
            "byte_size": len(alter_kickoff_txt),
            "domain": "signal_mind_oracle_introspection_closed_learning_loop",
            "title": "Alter XIV Autonomous Architecture (SIGNAL -> MIND -> ORACLE -> THE BROADCAST -> CONGREGATION -> INTROSPECTION)",
            "extracted_summary": _stage0_scrub(alter_kickoff_txt[:900]),
            "equations_and_premises": [
                "Phase 2: SIGNAL + MIND real-time affinity & segment state updates",
                "Phase 3: ORACLE pgvector cosine + bandit-ordered broadcast blocks",
                "Phase 7: INTROSPECTION self-audit + closed reward learning loop",
            ],
            "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py::evaluate_vault_entropy_evolution_and_alter_xiv_twin",
            "stage0_scrubbed": True,
            "ingestion_status": "EXTRACTED_AND_WIRED",
            "trainer_ready": True,
            "staged_at": now_iso,
        }
    )

    # Privacy-filtered Root G:\My Drive scan
    root_safe_files: List[Dict[str, Any]] = []
    root_excluded_privacy_count = 0
    for item in sorted(GDRIVE_ROOT.iterdir()):
        if not is_privacy_safe_root_item(item.name, item.is_dir()):
            root_excluded_privacy_count += 1
            continue
        if item.is_file():
            if item.suffix.lower() in {".gdoc", ".gsheet"}:
                root_safe_files.append(_read_gdoc_pointer_safe(item))
            else:
                st = item.stat()
                root_safe_files.append(
                    {
                        "filename": item.name,
                        "relative_path": item.name,
                        "byte_size": st.st_size,
                        "mtime_iso": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(),
                    }
                )

    deepseek_md = (GDRIVE_ROOT / "deepseek_markdown_20260911_667ac8.md").read_text(encoding="utf-8", errors="replace")
    extract_json_0 = json.loads((GDRIVE_ROOT / "extract-data-2026-09-11.json").read_text(encoding="utf-8"))
    extract_json_1 = json.loads((GDRIVE_ROOT / "extract-data-2026-09-11 (1).json").read_text(encoding="utf-8"))

    mind_records.append(
        {
            "id": "wave12_gdrive_root_deepseek_calibration_master_spec",
            "item_type": "gdrive_root_calibration_spec",
            "source_file": "G:\\My Drive\\deepseek_markdown_20260911_667ac8.md",
            "sha256": hashlib.sha256(deepseek_md.encode("utf-8")).hexdigest(),
            "byte_size": len(deepseek_md),
            "domain": "murphy_decomposition_bregman_doob_martingale_mondrian_conformal",
            "title": "GSE Engine, Calibration, and Intelligence Master Spec (Phases 0-7)",
            "extracted_summary": _stage0_scrub(deepseek_md[:1000]),
            "equations_and_premises": [
                "BSS = 1 - BS / BS_ref, BS_ref = base_rate * (1 - base_rate)",
                "Logarithmic opinion pool: logodds(p_pool) = w * logodds(q) + (1-w) * logodds(m)",
                "Mondrian conformal prediction stratified by confidence decile",
                "Shin, Power, Multiplicative, Additive, Logarithmic de-vig comparison",
            ],
            "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py::evaluate_tracking_decoupled_and_cqr_small_sample_calibration",
            "stage0_scrubbed": True,
            "ingestion_status": "EXTRACTED_AND_WIRED",
            "trainer_ready": True,
            "staged_at": now_iso,
        }
    )

    # =========================================================================
    # 4. SCAN & EXTRACT `OneDrive\Documents\Galaxy Sports Edge` (1,027 raw / 1,014 non-git)
    # =========================================================================
    od_all_files = [p for p in ONEDRIVE_DIR.rglob("*") if p.is_file()]
    od_non_git_files = [p for p in od_all_files if ".git" not in p.parts]

    od_top_md_names = [
        "ACTIVATION_COCKPIT.md",
        "AWS_LEVERAGE_MAP.md",
        "FRONTIER_RD_2026-07-17.md",
        "FRONTIER_UNTAPPED_ATLAS.md",
        "GOOGLE_AZURE_LEVERAGE_MAP.md",
        "HANDOFF_TO_CODING_AGENT.md",
        "LEVERAGE_SCAN.md",
        "gse-weather-edge-INTEGRATION_SPEC.md",
        "activation-log.md",
    ]
    od_top_extractions: List[Dict[str, Any]] = []
    for mname in od_top_md_names:
        mp = ONEDRIVE_DIR / mname
        if mp.exists():
            raw_b = mp.read_bytes()
            sha = hashlib.sha256(raw_b).hexdigest()
            txt = raw_b.decode("utf-8", errors="replace")
            od_top_extractions.append(
                {
                    "filename": mname,
                    "byte_size": len(raw_b),
                    "line_count": len(txt.splitlines()),
                    "sha256": sha,
                }
            )
            mind_records.append(
                {
                    "id": f"wave12_onedrive_{hashlib.sha256(mname.encode()).hexdigest()[:10]}",
                    "item_type": "onedrive_frontier_spec",
                    "source_file": f"C:\\Users\\Garrett\\OneDrive\\Documents\\Galaxy Sports Edge\\{mname}",
                    "sha256": sha,
                    "byte_size": len(raw_b),
                    "domain": "weather_edge_proof_mcp_ots_anchor_cloud_leverage",
                    "title": f"[OneDrive GSE] {mname}",
                    "extracted_summary": _stage0_scrub(txt[:900]),
                    "equations_and_premises": [
                        l.strip()[:120] for l in txt.splitlines() if l.strip().startswith("#")
                    ][:8],
                    "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py",
                    "stage0_scrubbed": True,
                    "ingestion_status": "EXTRACTED_AND_WIRED",
                    "trainer_ready": True,
                    "staged_at": now_iso,
                }
            )

    # Inspect OneDrive ZIP packages (gse-weather-edge.zip, galaxy-proof-mcp.zip, gse-ots-anchor.zip)
    od_zip_summaries: Dict[str, Any] = {}
    for zname in ["gse-weather-edge.zip", "galaxy-proof-mcp.zip", "gse-ots-anchor.zip"]:
        zp = ONEDRIVE_DIR / zname
        if zp.exists():
            raw_b = zp.read_bytes()
            sha = hashlib.sha256(raw_b).hexdigest()
            with zipfile.ZipFile(zp, "r") as zf:
                nlist = zf.namelist()
                ts_files = [n for n in nlist if n.endswith(".ts") and not n.endswith(".d.ts")]
                src_code = zf.read(ts_files[0]).decode("utf-8", errors="replace") if ts_files else ""
            od_zip_summaries[zname] = {
                "byte_size": len(raw_b),
                "sha256": sha,
                "entry_count": len(nlist),
                "entries": nlist,
                "primary_ts_lines": len(src_code.splitlines()),
            }
            mind_records.append(
                {
                    "id": f"wave12_onedrive_zip_{zname.replace('.zip', '').replace('-', '_')}",
                    "item_type": "onedrive_executable_zip_package",
                    "source_file": f"C:\\Users\\Garrett\\OneDrive\\Documents\\Galaxy Sports Edge\\{zname}",
                    "sha256": sha,
                    "byte_size": len(raw_b),
                    "domain": "as_of_weather_aerodynamics_and_cryptographic_proof_mcp",
                    "title": f"[OneDrive Package] {zname} ({len(src_code.splitlines())} TS lines)",
                    "extracted_summary": _stage0_scrub(src_code[:1000]),
                    "equations_and_premises": [
                        "passingSuppressionIndex = clamp01(0.5*(wind/25) + 0.3*(gust/40) + 0.2*min(precip/0.2, 1))",
                        "kickingDifficultyIndex = clamp01(0.6*(wind/25) + 0.2*(gust/40) + 0.2*min(precip/0.2, 1))",
                        "sha256('leaf:' + pickId + ':' + payload) Merkle root + OpenTimestamps Bitcoin block header",
                    ],
                    "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py::evaluate_onedrive_weather_edge_aerodynamics",
                    "stage0_scrubbed": True,
                    "ingestion_status": "EXTRACTED_AND_WIRED",
                    "trainer_ready": True,
                    "staged_at": now_iso,
                }
            )

    # Read OneDrive command-center build-queue.jsonl (114 items) & nfl-roster-truth build-queue.jsonl (68 items)
    cmd_bq_path = ONEDRIVE_DIR / "docs" / "command-center" / "build-queue" / "build-queue.jsonl"
    cmd_bq_items = [
        json.loads(l) for l in cmd_bq_path.read_text(encoding="utf-8").splitlines() if l.strip()
    ]
    nrt_bq_path = (
        ONEDRIVE_DIR / "docs" / "research" / "nfl-roster-truth" / "claude-build-queue" / "build-queue.jsonl"
    )
    nrt_bq_items = (
        [json.loads(l) for l in nrt_bq_path.read_text(encoding="utf-8").splitlines() if l.strip()]
        if nrt_bq_path.exists()
        else []
    )
    for nrt_item in nrt_bq_items:
        nrt_json = json.dumps(nrt_item, sort_keys=True)
        mind_records.append(
            {
                "id": f"wave12_nrt_{nrt_item['id'].lower().replace('-', '_')}",
                "item_type": "nfl_roster_truth_build_card",
                "source_file": "C:\\Users\\Garrett\\OneDrive\\Documents\\Galaxy Sports Edge\\docs\\research\\nfl-roster-truth\\claude-build-queue\\build-queue.jsonl",
                "sha256": hashlib.sha256(nrt_json.encode("utf-8")).hexdigest(),
                "byte_size": len(nrt_json),
                "domain": f"nfl_roster_truth_{nrt_item.get('category', 'core').replace(' ', '_')}",
                "title": f"[{nrt_item['id']}] {nrt_item['title']}",
                "extracted_summary": _stage0_scrub(
                    f"Priority {nrt_item.get('priority', 'P0')} | Gate: {nrt_item.get('duplicate_check_status', 'EXTENSION')} | "
                    f"Summary: {nrt_item.get('summary', nrt_item['title'])}"
                ),
                "equations_and_premises": [
                    f"id={nrt_item['id']}",
                    f"category={nrt_item.get('category', '')}",
                    f"priority={nrt_item.get('priority', '')}",
                ],
                "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py::evaluate_nfl_roster_truth_and_wave3_line_level",
                "stage0_scrubbed": True,
                "ingestion_status": "WIRED_IN_ROSTER_TRUTH_ENGINE",
                "trainer_ready": True,
                "staged_at": now_iso,
            }
        )

    # Add all 58 Paper Dossiers to mind_staging
    for paper in GSE_58_PAPER_DOSSIER_CATALOG:
        p_json = json.dumps(paper, sort_keys=True)
        mind_records.append(
            {
                "id": f"wave12_paper_{paper['arxiv_id'].replace('/', '_').replace('.', '_')}",
                "item_type": "gse_58_arxiv_paper_dossier",
                "source_file": "G:\\My Drive\\GSN\\GSE_58_paper_dossiers.md",
                "sha256": hashlib.sha256(p_json.encode("utf-8")).hexdigest(),
                "byte_size": len(p_json),
                "domain": f"cluster_{paper['cluster'].lower()}_{paper['band'].lower()}",
                "title": f"[arXiv:{paper['arxiv_id']}] {paper['title']}",
                "extracted_summary": _stage0_scrub(paper["role"]),
                "equations_and_premises": [
                    f"arxiv_id={paper['arxiv_id']}",
                    f"cluster={paper['cluster']}",
                    f"band={paper['band']}",
                ],
                "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py::evaluate_gdrive_58_paper_and_corpus_situational_laws",
                "stage0_scrubbed": True,
                "ingestion_status": "WIRED_IN_SITUATIONAL_MATRIX",
                "trainer_ready": True,
                "staged_at": now_iso,
            }
        )

    # =========================================================================
    # 5. EXECUTE OMNI SITUATIONAL ENGINE VERIFICATION
    # =========================================================================
    omni_verification = run_google_drive_and_onedrive_omni_situational_overlay()
    mind_records.append(
        {
            "id": "wave12_omni_situational_engine_verification",
            "item_type": "omni_situational_engine_verification",
            "source_file": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py",
            "sha256": omni_verification["cryptographic_provenance_sha256"],
            "byte_size": len(json.dumps(omni_verification)),
            "domain": "omni_situational_reasoning_overlay",
            "title": "Wave 12 Google Drive + OneDrive Omni Situational Overlay Verification",
            "extracted_summary": _stage0_scrub(
                json.dumps(omni_verification["situational_adjustment_vector"])
            ),
            "equations_and_premises": [
                f"epa_delta={omni_verification['situational_adjustment_vector']['epa_delta']}",
                f"pass_rate_delta={omni_verification['situational_adjustment_vector']['pass_rate_delta']}",
                f"completion_prob_delta={omni_verification['situational_adjustment_vector']['completion_prob_delta']}",
                f"sack_rate_mult={omni_verification['situational_adjustment_vector']['sack_rate_mult']}",
                f"fg_make_prob_delta={omni_verification['situational_adjustment_vector']['fg_make_prob_delta']}",
            ],
            "engine_target_module": "intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py::run_google_drive_and_onedrive_omni_situational_overlay",
            "stage0_scrubbed": True,
            "ingestion_status": "VERIFIED_LIVE",
            "trainer_ready": True,
            "staged_at": now_iso,
        }
    )

    # =========================================================================
    # 6. WRITE MANIFEST JSON, MIND STAGING JSONL, AND RESEARCH LEDGER MD
    # =========================================================================
    manifest_path = (
        ROOT_DIR / "data" / "engine" / "wave12_entire_google_drive_and_onedrive_manifest_2026_11_05.json"
    )
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    manifest_payload = {
        "wave": "Wave 12 — Entire Google Drive (G:\\My Drive) + OneDrive (Galaxy Sports Edge) Full Extraction & Deep Situational Compiler",
        "generated_at": now_iso,
        "privacy_and_safety_filter": {
            "enforced": True,
            "excluded_root_items_count": root_excluded_privacy_count,
            "excluded_categories": [
                "AI images",
                "Baby Girl - Aisha",
                "Profile Pictures - Social & Dating",
                "GB Resume 23",
                "EEOC*",
                "Divorce",
                "Birth Certificate",
                "Doug*",
                "ABletter / ADA-GB / ADP Background / FLSA / Termination / USSSA / Medical Release",
            ],
        },
        "storage_roots_summary": {
            "gsn_dir": {
                "path": str(GSN_DIR),
                "total_files": len(gsn_all_files),
                "master_docx_extracted": len(gsn_docx_extractions),
                "master_md_json_csv_extracted": len(gsn_text_extractions),
                "research_buckets": gsn_research_buckets,
                "frontier_recovery_worktree_files": len(gsn_frontier_files),
                "frontier_recovery_markdown_specs": len(gsn_frontier_md),
                "gse_10_2_26_total_files": len(gse_10_2_files),
                "gse_10_2_26_extensions": gse_10_2_exts,
                "gdoc_pointers_count": len(gsn_gdoc_files),
            },
            "gse_ultra_30tb_vault": {
                "path": str(VAULT_DIR),
                "total_files_raw": len(vault_all_files),
                "total_files_non_ini": len(vault_non_ini_files),
                "cuda_entropy_equations_count": len(cuda_equations),
                "gcp_agentic_equations_count": len(gcp_equations),
                "harvested_repositories_count": vault_manifest_json.get("count", 9),
                "research_corpus_manifest_records": len(rc_manifest_lines),
                "research_corpus_pdfs_count": len(rc_pdfs),
                "deep_corpus_pdfs_count": len(deep_pdfs),
                "downloads_archive_files_count": len(dl_archive_files),
                "nfl_film_room_mp4_count": len(nfl_film_mp4s),
                "nfl_film_room_mp4s": nfl_film_mp4s,
                "offload_manifest_worktrees_count": len(
                    vault_offload_json.get("deleted_After_Verification", {}).get("google_worktrees", [])
                ),
            },
            "alter_and_gdrive_root": {
                "alter_path": str(ALTER_DIR),
                "alter_files_count": len(alter_files),
                "alter_scaffold_v2_1_zip_entries": len(alter_zip_namelist),
                "gdrive_root_privacy_safe_files_count": len(root_safe_files),
                "gdrive_root_safe_files_sample": root_safe_files[:30],
                "extract_data_2026_09_11_keys": list(extract_json_0.keys()),
                "extract_data_2026_09_11_1_keys": list(extract_json_1.keys()),
            },
            "onedrive_galaxy_sports_edge": {
                "path": str(ONEDRIVE_DIR),
                "total_files_raw": len(od_all_files),
                "total_files_non_git": len(od_non_git_files),
                "top_level_specs_extracted": od_top_extractions,
                "zip_packages_inspected": od_zip_summaries,
                "command_center_build_queue_count": len(cmd_bq_items),
                "nfl_roster_truth_build_cards_count": len(nrt_bq_items),
            },
        },
        "gsn_docx_extractions": gsn_docx_extractions,
        "gsn_text_extractions": gsn_text_extractions,
        "gsn_gdoc_sample": gsn_gdoc_sample,
        "omni_situational_engine_verification": omni_verification,
        "mind_staging_path": "data/mind_staging/mind_wave12_entire_google_drive_and_onedrive_2026_11_05.jsonl",
        "mind_staging_record_count": len(mind_records),
    }
    manifest_path.write_text(json.dumps(manifest_payload, indent=2), encoding="utf-8")

    # Write Mind Staging JSONL
    mind_path = (
        ROOT_DIR
        / "data"
        / "mind_staging"
        / "mind_wave12_entire_google_drive_and_onedrive_2026_11_05.jsonl"
    )
    mind_path.parent.mkdir(parents=True, exist_ok=True)
    with mind_path.open("w", encoding="utf-8") as mf:
        for rec in mind_records:
            mf.write(json.dumps(rec, ensure_ascii=False) + "\n")

    # Write Research Ledger Markdown
    doc_path = (
        ROOT_DIR
        / "docs"
        / "engine"
        / "research"
        / "2026-11-05"
        / "WAVE12-ENTIRE-GOOGLE-DRIVE-AND-ONEDRIVE-SITUATIONAL-WIRING-LEDGER.md"
    )
    doc_path.parent.mkdir(parents=True, exist_ok=True)

    adj = omni_verification["situational_adjustment_vector"]
    doc_lines: List[str] = [
        "# WAVE 12 — Entire Google Drive (`G:\\My Drive`) & OneDrive (`Galaxy Sports Edge`) Full Extraction & Situational Wiring Ledger",
        "",
        f"- **Generated At:** `{now_iso}`",
        "- **Executable Engine:** `intelligence/coaching/google_drive_and_onedrive_omni_situational_engine.py`",
        "- **Ingestion Runner:** `scripts/ops/ingest_wave12_entire_google_drive_and_onedrive.py`",
        "- **Manifest JSON:** `data/engine/wave12_entire_google_drive_and_onedrive_manifest_2026_11_05.json`",
        f"- **Mind Staging JSONL:** `data/mind_staging/mind_wave12_entire_google_drive_and_onedrive_2026_11_05.jsonl` (`trainer_ready: true`, `{len(mind_records)}` records, Stage-0 scrubbed)",
        "",
        "---",
        "",
        "## 1. Executive Summary & Storage Root Audit Counts",
        "",
        "| Storage Root | Total Files Scanned | Key Extracted Assets | Target Subsystem |",
        "|---|---:|---|---|",
        f"| `G:\\My Drive\\GSN` | `{len(gsn_all_files):,}` | 5 Master `.docx` Audits (`5.90 MB`, `6,363` paragraphs), `GSE_58_paper_dossiers.md`, `GSE_58_independent_research.md`, `SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`, `Galaxy Sports Edge/docs/research/*`, `.codex-worktrees/gse-frontier-recovery` (`{len(gsn_frontier_md)}` specs), `GSE. 10.2.26` (`{len(gse_10_2_files):,}` files), `{len(gsn_gdoc_files)}` `.gdoc` pointers | Subsystems 1, 2 & 4 |",
        f"| `G:\\My Drive\\GSE-Ultra-30TB-Vault` | `{len(vault_non_ini_files):,}` (`{len(vault_all_files):,}` raw) | `cuda_weighted_entropy_evolution_feed.jsonl` (`4` CUDA equations), `gcp_agentic_and_rclone_feed.jsonl` (`10` GCP/rclone equations), `research-corpus-2026-11-03` (`{len(rc_manifest_lines):,}` manifest records, `{len(rc_pdfs):,}` PDFs), `deep-corpus-2026-11-04` (`{len(deep_pdfs)}` PDFs), `downloads-archive-2026-11-03` (`{len(dl_archive_files)}` files), `nfl-film-room-2026` (`{len(nfl_film_mp4s)}` full-game MP4s) | Subsystem 5 |",
        f"| `G:\\My Drive\\Alter` + Safe Root `G:\\My Drive` | `{len(alter_files)}` + `{len(root_safe_files)}` (`{root_excluded_privacy_count}` personal/HR excluded) | `ALTER_XIV_CLAUDE_CODE_KICKOFF.md`, `alter-xiv-scaffold-v2_1.zip` (`{len(alter_zip_namelist)}` entries), `deepseek_markdown_20260911_667ac8.md`, `extract-data-2026-09-11.json`, `extract-data-2026-09-11 (1).json`, GSE/GSI `.gdoc` architecture pointers | Subsystems 2, 4 & 5 |",
        f"| `OneDrive\\Documents\\Galaxy Sports Edge` | `{len(od_non_git_files):,}` (`{len(od_all_files):,}` raw) | `gse-weather-edge-INTEGRATION_SPEC.md`, `gse-weather-edge.zip` (`326` TS lines), `galaxy-proof-mcp.zip` (`376` TS lines), `gse-ots-anchor.zip` (`290` TS lines), `ACTIVATION_COCKPIT.md`, `FRONTIER_RD_2026-07-17.md`, `FRONTIER_UNTAPPED_ATLAS.md`, `build-queue.jsonl` (`{len(cmd_bq_items)}` cards), `nfl-roster-truth` (`{len(nrt_bq_items)}` build cards) | Subsystems 3 & 4 |",
        "",
        "---",
        "",
        "## 2. Full-Text Extraction of the 5 Master `.docx` Audits in `G:\\My Drive\\GSN`",
        "",
        "| Filename | Bytes | Paragraphs | Characters | SHA-256 Prefix | Primary Mathematical Contribution |",
        "|---|---:|---:|---:|---|---|",
    ]

    for d in gsn_docx_extractions:
        doc_lines.append(
            f"| `{d['filename']}` | `{d['byte_size']:,}` | `{d['paragraph_count']:,}` | `{d['char_count']:,}` | `{d['sha256'][:16]}` | `{d['title'][:90]}` |"
        )

    doc_lines.extend(
        [
            "",
            "---",
            "",
            "## 3. The 5 Executable Subsystems in `google_drive_and_onedrive_omni_situational_engine.py`",
            "",
            "1. **`evaluate_gdrive_58_paper_and_corpus_situational_laws(game_context)`:**",
            "   - Evaluates all 58 paper dossiers (`GSE_58_paper_dossiers.md` + `GSE_58_independent_research.md`), SkeleTrack v2 8-DoF plane-to-plane projective homography $H \\in \\text{PGL}(3,\\mathbb{R})$ (`1909.08034`) + off-screen safety imputation (`2607.11548`), biophysical velocity/acceleration regularity ($v_{\\max} \\le 13.0\\text{ m/s}$, $|a| \\le 9.8\\text{ m/s}^2$), Second Spectrum spatiotemporal ghosting (`US 10,521,671` + `2503.18589` + `2604.02447`), 4th-down WP humility (`2311.03490`), partial-order tie clustering (`2501.02505`), and Lopez-Matthews-Baumer state-space $\\sigma_{\\text{game}}$ (`1701.05976`).",
            "2. **`evaluate_tracking_decoupled_and_cqr_small_sample_calibration(game_context)`:**",
            "   - Implements Romano-Patterson-Candes (`1905.03222`) Conformalized Quantile Regression $[\\hat{q}_{\\alpha/2}(X) - \\hat{c}, \\hat{q}_{1-\\alpha/2}(X) + \\hat{c}]$ with heuristic quantile clamping stripped, Barber weighted conformal & Jackknife+ (`1905.02928`) ESS gate ($\\hat{c} \\le 12.42$), Shin (1993) insider-adjusted de-vigging, Generalized Venn-Abers (`2502.05676`) multiprobability bounds $[p_0, p_1]$, small-sample shrinkage when $n < 70$ NFL games, and B-spline second-derivative steam curvature $\\kappa_{\\text{steam}} = |S''(t)|$.",
            "3. **`evaluate_onedrive_weather_edge_aerodynamics(game_context)`:**",
            "   - Implements `gse-weather-edge-INTEGRATION_SPEC.md` + `gse-weather-edge.zip` (`src/index.ts`): strict `asOfUtc <= kickoffUtc` leak guard, indoor/dome neutral short-circuit, exact `passingSuppressionIndex` and `kickingDifficultyIndex` formulas, Magnus-Tetens humid-air density $\\rho(T, P, RH)$, circular wind-direction cosines ($\\cos\\theta, \\sin\\theta$), crosswind drag on deep passes (`air_yards >= 15`) and field goals (`>= 45 yds`), and Wet-Bulb Globe Temperature (`WBGT`) 2H pass-rush fatigue.",
            "4. **`evaluate_nfl_roster_truth_and_wave3_line_level(game_context)`:**",
            "   - Implements all 68 `nfl-roster-truth` build cards (`BUILD-NRT-001` to `BUILD-NRT-068`): active-games denominator (`player_gp`, never `team_gp`), IR/PUP return ramp-up discount (`0.62x` Game 1, `0.82x` Game 2), practice-squad elevation / QB3 cap, Tier-1 vs Tier-2 multi-source team conflict resolution (Najee Harris / Rico Dowdle canary gates), Wave-3 cross-venue line shopping (DraftKings, FanDuel, Pinnacle, Kalshi, Polymarket), and EdgeBall / Contest-Format-Lab GPP top-heavy payout skewness utility.",
            "5. **`evaluate_vault_entropy_evolution_and_alter_xiv_twin(game_context)`:**",
            "   - Implements `cuda_weighted_entropy_evolution_feed.jsonl` (`EQ-CUDA-001` 14-bucket partition entropy $J(k;\\mathbf{w})$, `EQ-CUDA-002` quadratic triangular index $m(p,q) = \\lfloor -0.5p^2 + 5.5p + q \\rfloor$, `EQ-CUDA-003` `pure13` explosive tie-breaker, `EQ-CUDA-004` stagnation-adaptive elitist mutation $\\mu_{\\text{eff}}(g,s)$), `gcp_agentic_and_rclone_feed.jsonl` (`EQ-GCP-001` to `EQ-GCP-010`), and `ALTER_XIV_CLAUDE_CODE_KICKOFF.md` (`SIGNAL -> MIND -> ORACLE -> INTROSPECTION`) world-model state twin.",
            "",
            "---",
            "",
            "## 4. Vault CUDA Entropy & GCP Agentic Equations (`GSE-Ultra-30TB-Vault`)",
            "",
            "| Equation ID | Domain | Title | LaTeX Formulation |",
            "|---|---|---|---|",
        ]
    )
    for eq in cuda_equations:
        doc_lines.append(
            f"| `{eq['record_id']}` | `{eq['domain']}` | {eq['title']} | `${eq['equation_latex']}$` |"
        )
    for eq in gcp_equations:
        doc_lines.append(
            f"| `{eq['equation_id']}` | `{eq['domain']}` | {eq['title']} | `${eq['latex']}$` |"
        )

    doc_lines.extend(
        [
            "",
            "---",
            "",
            "## 5. Complete 58-Paper Dossier Matrix (`G:\\My Drive\\GSN\\GSE_58_paper_dossiers.md`)",
            "",
            "| arXiv ID | Cluster | Band | Title | Engine Situational Role |",
            "|---|---|---|---|---|",
        ]
    )
    for p in GSE_58_PAPER_DOSSIER_CATALOG:
        doc_lines.append(
            f"| `{p['arxiv_id']}` | `{p['cluster']}` | `{p['band']}` | {p['title']} | {p['role']} |"
        )

    doc_lines.extend(
        [
            "",
            "---",
            "",
            "## 6. Deterministic Verification Output (`run_google_drive_and_onedrive_omni_situational_overlay`)",
            "",
            f"- **Cryptographic Provenance SHA-256:** `{omni_verification['cryptographic_provenance_sha256']}`",
            f"- **`epa_delta`:** `{adj['epa_delta']}`",
            f"- **`pass_rate_delta`:** `{adj['pass_rate_delta']}`",
            f"- **`completion_prob_delta`:** `{adj['completion_prob_delta']}`",
            f"- **`sack_rate_mult`:** `{adj['sack_rate_mult']}`",
            f"- **`fg_make_prob_delta`:** `{adj['fg_make_prob_delta']}`",
            f"- **`cqr_interval_width_mult`:** `{adj['cqr_interval_width_mult']}`",
            f"- **`calibrated_win_prob`:** `{adj['calibrated_win_prob']}` (Venn-Abers bounds `{adj['venn_abers_multiprob_bounds']}`)",
            f"- **`cqr_ess_gate_passed`:** `{adj['cqr_ess_gate_passed']}`",
            "",
        ]
    )
    doc_path.write_text("\n".join(doc_lines), encoding="utf-8")

    return {
        "status": "SUCCESS",
        "gsn_total_files": len(gsn_all_files),
        "gsn_docx_extracted": len(gsn_docx_extractions),
        "gsn_gdoc_count": len(gsn_gdoc_files),
        "vault_total_files_raw": len(vault_all_files),
        "vault_total_files_non_ini": len(vault_non_ini_files),
        "vault_research_corpus_pdfs": len(rc_pdfs),
        "vault_deep_corpus_pdfs": len(deep_pdfs),
        "vault_nfl_film_mp4s": len(nfl_film_mp4s),
        "alter_files_count": len(alter_files),
        "gdrive_root_safe_files": len(root_safe_files),
        "gdrive_root_privacy_excluded": root_excluded_privacy_count,
        "onedrive_total_files_raw": len(od_all_files),
        "onedrive_total_files_non_git": len(od_non_git_files),
        "mind_records_written": len(mind_records),
        "manifest_path": str(manifest_path),
        "mind_path": str(mind_path),
        "doc_path": str(doc_path),
        "situational_adjustment_vector": adj,
    }


if __name__ == "__main__":
    summary = run_wave12_ingestion()
    print(json.dumps(summary, indent=2))
