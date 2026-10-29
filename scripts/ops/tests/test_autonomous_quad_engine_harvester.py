"""
Tests for autonomous_quad_engine_harvester.py.
Verifies OMML parsing, DOCX archive extraction, and 5-engine master crosswalk aggregation.
"""

import io
import sys
import zipfile
import pytest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.autonomous_quad_engine_harvester import (
    extract_omml_from_xml_bytes,
    extract_docx_omml_equations,
    build_master_crosswalk_summary,
    _elem_to_latex,
    MATH_NS,
)


def test_extract_omml_from_xml_bytes_synthetic():
    sample_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                xmlns:m="{MATH_NS}">
      <w:body>
        <w:p>
          <m:oMath>
            <m:r><m:t>R</m:t></m:r>
            <m:sSup>
              <m:e><m:r><m:t>2</m:t></m:r></m:e>
              <m:sup><m:r><m:t>adj</m:t></m:r></m:sup>
            </m:sSup>
            <m:r><m:t> = 0.283</m:t></m:r>
          </m:oMath>
        </w:p>
        <w:p>
          <m:oMath>
            <m:f>
              <m:num><m:r><m:t>dv</m:t></m:r></m:num>
              <m:den><m:r><m:t>dt</m:t></m:r></m:den>
            </m:f>
            <m:r><m:t> = a</m:t></m:r>
          </m:oMath>
        </w:p>
      </w:body>
    </w:document>""".encode("utf-8")

    eqs = extract_omml_from_xml_bytes(sample_xml, source_name="test_doc")
    assert len(eqs) == 2

    eq1 = eqs[0]
    assert eq1["source"] == "test_doc"
    assert "0.283" in eq1["raw_text"]
    assert "^{adj}" in eq1["latex"]
    assert eq1["id"] == "test_doc_omml_001"

    eq2 = eqs[1]
    assert "\\frac{dv}{dt}" in eq2["latex"]
    assert eq2["id"] == "test_doc_omml_002"


def test_extract_omml_empty_and_fallback():
    assert extract_omml_from_xml_bytes(b"", source_name="empty") == []

    malformed = b"<m:oMath><span>x = y + 1</span></m:oMath>"
    res = extract_omml_from_xml_bytes(malformed, source_name="malformed")
    assert len(res) == 1
    assert "x = y + 1" in res[0]["raw_text"]


def test_extract_docx_omml_equations_mock_zip(tmp_path):
    docx_file = tmp_path / "mock_blueprint.docx"

    sample_doc_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                xmlns:m="{MATH_NS}">
      <w:body>
        <m:oMath>
          <m:r><m:t>E = mc</m:t></m:r>
          <m:sSup><m:e><m:r><m:t>2</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup>
        </m:oMath>
      </w:body>
    </w:document>"""

    with zipfile.ZipFile(docx_file, "w") as z:
        z.writestr("word/document.xml", sample_doc_xml)
        z.writestr("word/media/image1.png", b"fake-png-bytes-1")
        z.writestr("word/media/image2.png", b"fake-png-bytes-2")

    eqs = extract_docx_omml_equations([str(docx_file)])
    assert len(eqs) == 1
    assert eqs[0]["media_png_count"] == 2
    assert "E = mc" in eqs[0]["raw_text"]
    assert eqs[0]["docx_path"] == str(docx_file)


def test_extract_docx_belichick_live_if_present():
    belichick_docx = Path(r"C:\Users\Garrett\Downloads\Master Execution Report_ The Belichick.docx")
    if belichick_docx.exists():
        eqs = extract_docx_omml_equations([str(belichick_docx)])
        # Must extract exactly 277 equations from Master Execution Report_ The Belichick
        assert len(eqs) == 277
        assert eqs[0]["media_png_count"] == 7
        assert "0.283" in eqs[0]["raw_text"]


def test_build_master_crosswalk_summary_dry_run():
    res = build_master_crosswalk_summary(dry_run=True)
    assert res["status"] == "SUCCESS"
    assert res["dryRun"] is True
    assert res["totalNodes"] > 0

    counts = res["sourceCounts"]
    assert counts["ARXIV"] > 0
    assert counts["OPENALEX"] >= 700
    assert counts["KAGGLE"] > 50
    assert counts["HUGGINGFACE"] >= 50
    assert counts["DOCX_OMML"] > 0

    sample = res["sampleNode"]
    assert sample is not None
    assert "canonicalId" in sample
    assert "title" in sample
    assert "sources" in sample
    assert len(sample["sources"]) > 0
    assert "domain" in sample
    assert "stageAssignment" in sample
    assert "priorWeight" in sample
    assert "acceptanceGatePassed" in sample
    assert sample["acceptanceGatePassed"] is True
