"""Unit Test Suite for the 10-File Downloads Flagship Packs & Streaming Archive Harvester.

Verifies:
1. All 10 flagship files in `C:\\Users\\Garrett\\Downloads\\` are audited in
   `data/audits/downloads_10_flagship_packs_and_archives_audit_2026_11_06.json` and
   `docs/engine/research/2026-11-06/DOWNLOADS_10_FLAGSHIP_PACKS_AND_ARCHIVES_BIBLE.md`.
2. In-memory streaming audit of `175a7503-2ced-4d50-8494-b61b9c313b9d.zip` (1.47 GB, 2,426 entries,
   705,112,070-byte `prod-grok-backend.json` 8MB-chunk scan) and `EYI Package_11-06-2026_1793956103.zip`
   (789 MB, 1,514 entries) with strict credential firewall enforcement.
3. Recovery & sanitization of first-party specs (`GSE_V5_3_0_BUILD_SPEC_RECOVERED.md`,
   `OPEN_SOURCE_FOOTBALL_DISSECTION_RECOVERED.md`, `GSE_DEEP_NFL_METRICS_CATALOG_RECOVERED.md`)
   and all 11 modules in `intelligence/introspection_s0s1/`.
4. Pinecone (`2025-04` API) upsert of 25 hybrid vectors into `gse-200-book-hybrid-index`
   namespace `gse-downloads-10-flagship-packs`.
5. Zero raw credentials and zero literal forbidden abbreviations across all generated/recovered files.
"""

from __future__ import annotations

import importlib
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def test_downloads_10_flagship_packs_audit_json_and_bible() -> None:
    json_path = REPO_ROOT / "data" / "audits" / "downloads_10_flagship_packs_and_archives_audit_2026_11_06.json"
    md_path = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "DOWNLOADS_10_FLAGSHIP_PACKS_AND_ARCHIVES_BIBLE.md"
    assert json_path.is_file(), "Missing audit JSON"
    assert md_path.is_file(), "Missing audit Markdown Bible"

    data = json.loads(json_path.read_text(encoding="utf-8"))
    assert data["total_files_audited"] == 17
    assert data["original_10_flagship_files_count"] == 10
    assert data["additional_7_flagship_files_count"] == 7
    assert len(data["inventory_table"]) == 17

    # Verify DOCX & PDF structural metrics across original and expanded flagship files
    exec_docx = data["docx_files"]["GSE and GSI Execution Plan.docx"]
    assert exec_docx["size_bytes"] == 67707
    assert exec_docx["tables_count"] == 8

    oai_docx = data["docx_files"]["GSE + GSI + OpenAI.docx"]
    assert oai_docx["size_bytes"] == 256724
    assert oai_docx["tables_count"] == 2
    assert oai_docx["omml_equations_count"] == 130

    upt_docx = data["docx_files"]["Universal Phase-Transition Engine GSE Revenue & GSI Grant Blueprint.docx"]
    assert upt_docx["size_bytes"] == 5619480

    gsi_11_5_docx = data["docx_files"]["GSI & GSE 11_5 (1).docx"]
    assert gsi_11_5_docx["size_bytes"] == 5318437

    assert data["markdown_files"]["2026-11-04-MASTER-PULL (3).md"]["size_bytes"] == 2273888
    assert data["markdown_files"]["deepseek_text_20261106_bd5f66.txt"]["size_bytes"] == 60259
    assert "GSE-GSI-FULL-DRIVE-AND-MONOREPO-MANIFEST-2026-11-05.md" in data["markdown_files"]
    assert "navier-stokes-session-full (1).md" in data["markdown_files"]
    assert "GSE_Full_Session_2026-10-09_to_11-05 (1).md" in data["markdown_files"]

    sov_pdf = data["pdf_files"]["Sovereign GSE and GSI Execution Directive.pdf"]
    assert sov_pdf["size_bytes"] == 288098
    assert sov_pdf["page_count"] == 15

    # Verify 1.47 GB 175a zip streaming audit
    z175 = data["zip_archives"]["175a7503-2ced-4d50-8494-b61b9c313b9d.zip"]
    assert z175["size_bytes"] == 1473669424
    assert z175["total_zip_entries"] == 2426
    assert z175["prod_grok_backend_stream_scan"]["uncompressed_size_bytes"] == 705112070
    assert z175["prod_grok_backend_stream_scan"]["bytes_streamed_in_8mb_chunks"] == 705112070
    assert "prod-mc-auth-mgmt-api.json" in z175["skipped_credential_files"]

    # Verify 789 MB EYI Package zip streaming audit
    zeyi = data["zip_archives"]["EYI Package_11-06-2026_1793956103.zip"]
    assert zeyi["size_bytes"] == 789180617
    assert zeyi["total_zip_entries"] == 1514
    assert zeyi["skipped_credential_files_count"] >= 4
    assert len(zeyi["recovered_first_party_artifacts"]) == 14

    # Verify Pinecone upsert receipt
    p_rec = data["pinecone_upsert_receipt"]
    assert p_rec["index_name"] == "gse-200-book-hybrid-index"
    assert p_rec["namespace"] == "gse-downloads-10-flagship-packs"
    assert p_rec["vectors_upserted"] == 25


def test_recovered_first_party_specs_and_introspection_s0s1_modules() -> None:
    spec_paths = [
        REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "GSE_V5_3_0_BUILD_SPEC_RECOVERED.md",
        REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "OPEN_SOURCE_FOOTBALL_DISSECTION_RECOVERED.md",
        REPO_ROOT / "docs" / "data-sources" / "research" / "2026-11-06" / "GSE_DEEP_NFL_METRICS_CATALOG_RECOVERED.md",
    ]
    for sp in spec_paths:
        assert sp.is_file(), f"Missing recovered spec: {sp}"
        assert len(sp.read_text(encoding="utf-8")) > 10000

    s0s1_modules = [
        "__init__",
        "dossier",
        "importer",
        "lms",
        "manifest",
        "premise",
        "reference",
        "run_s1",
        "store",
        "t0_calendar",
        "verify_chain",
    ]
    for mod_name in s0s1_modules:
        mod_file = REPO_ROOT / "intelligence" / "introspection_s0s1" / f"{mod_name}.py"
        assert mod_file.is_file(), f"Missing recovered module: {mod_file}"
        imported = importlib.import_module(f"intelligence.introspection_s0s1.{mod_name}")
        assert imported is not None


def test_zero_secrets_and_zero_forbidden_abbreviations() -> None:
    etc_pattern = re.compile(r"\be" + r"tc\.", re.IGNORECASE)
    secret_pattern = re.compile(
        r"(sk-[A-Za-z0-9_-]{20,}|xai-[A-Za-z0-9]{20,}|pcsk_[A-Za-z0-9_]{20,}|phc_[A-Za-z0-9_]{20,}|phx_[A-Za-z0-9_]{20,}|hf_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})"
    )

    files_to_check = [
        REPO_ROOT / "scripts" / "ops" / "harvest_10_downloads_flagship_packs_and_archives.py",
        REPO_ROOT / "data" / "audits" / "downloads_10_flagship_packs_and_archives_audit_2026_11_06.json",
        REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "DOWNLOADS_10_FLAGSHIP_PACKS_AND_ARCHIVES_BIBLE.md",
        REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "GSE_V5_3_0_BUILD_SPEC_RECOVERED.md",
        REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "OPEN_SOURCE_FOOTBALL_DISSECTION_RECOVERED.md",
        REPO_ROOT / "docs" / "data-sources" / "research" / "2026-11-06" / "GSE_DEEP_NFL_METRICS_CATALOG_RECOVERED.md",
    ]
    for py_mod in (REPO_ROOT / "intelligence" / "introspection_s0s1").glob("*.py"):
        files_to_check.append(py_mod)

    for fpath in files_to_check:
        assert fpath.is_file(), f"Missing file: {fpath}"
        txt = fpath.read_text(encoding="utf-8")
        assert not etc_pattern.search(txt), f"Forbidden abbreviation found in {fpath}"
        assert not secret_pattern.search(txt), f"Raw secret pattern found in {fpath}"
