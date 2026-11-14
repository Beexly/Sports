"""Tests for intelligence.foundry_bridge.multi_lane_sovereign_extractor."""

import json
import sqlite3
from pathlib import Path
from types import SimpleNamespace
import re

from intelligence.foundry_bridge.multi_lane_sovereign_extractor import (
    build_book_rows_from_explicit_pdfs,
    build_candidate_quotes_by_page,
    compute_gatekeeper_sha256,
    extract_json_object,
    norm_text,
    normalize_and_repair_artifact,
    partition_page_windows,
    process_single_book,
    select_eligible_books_ro,
)


def _fake_gatekeeper():
    toy_math = [re.compile(r"y\s*=\s*mx\s*\+\s*b", re.I)]

    def validate(doc):
        errs = []
        if doc.get("source_status") in ("INSUFFICIENT_SOURCE_ACCESS", "INSUFFICIENT_OCR"):
            if not doc.get("refusal_reason"):
                errs.append("missing refusal_reason")
            return errs
        prims = doc.get("primitives") or []
        if len(prims) < 3:
            errs.append("need >=3")
        for p in prims:
            if len((p.get("verbatim_quote") or "").split()) < 8:
                errs.append("short quote")
            if p.get("latex") and not p.get("symbol_and_unit_ledger"):
                errs.append("missing ledger")
            l2 = p.get("layer2") or {}
            if l2.get("tag") not in ("[ISOMORPHISM]", "[DERIVED KERNEL]"):
                errs.append("bad tag")
        think_w = sum(len((t.get("think") or "").split()) for t in (doc.get("reasoning_traces") or []))
        if think_w < 850:
            errs.append("short think")
        for f in ("universal_lens", "gsi_mapping", "gse_mapping"):
            if len((doc.get(f) or "").split()) < 30:
                errs.append(f"short {f}")
        return errs

    return SimpleNamespace(DOMAINS={"football", "math", "psych", "cs", "other"}, TOY_MATH=toy_math, validate=validate)


def test_select_eligible_books_respects_zero_collision_partition(tmp_path: Path) -> None:
    db_path = tmp_path / "foundry.db"
    pdf_a = tmp_path / "a.pdf"
    pdf_b = tmp_path / "b.pdf"
    pdf_c = tmp_path / "c.pdf"
    for p in (pdf_a, pdf_b, pdf_c):
        p.write_bytes(b"%PDF-1.4")

    conn = sqlite3.connect(db_path)
    conn.execute(
        "CREATE TABLE corpus_queue (book_id TEXT, file_path TEXT, sha256 TEXT, file_name TEXT, title TEXT, year INT, primary_domain TEXT, tier TEXT, status TEXT, pages_total INT, file_size INT)"
    )
    conn.execute("INSERT INTO corpus_queue VALUES ('hermes_0', ?, '2aaa', 'h.pdf', 'H', 2020, 'math', 'A', 'PENDING', 10, 100)", (str(pdf_a),))
    conn.execute("INSERT INTO corpus_queue VALUES ('motif_4', ?, '5bbb', 'm.pdf', 'M', 2021, 'football', 'A', 'PENDING', 10, 100)", (str(pdf_b),))
    conn.execute("INSERT INTO corpus_queue VALUES ('gcp_9', ?, '9ccc', 'g.pdf', 'G', 2022, 'cs', 'A', 'PENDING', 10, 100)", (str(pdf_c),))
    conn.commit()
    conn.close()

    rows = select_eligible_books_ro(
        db_path=db_path,
        partition_prefixes=("4", "5", "6", "7"),
        include_ocr_classics=False,
        max_books=10,
        completed_dirs=(tmp_path / "empty_prims",),
    )
    assert [r["book_id"] for r in rows] == ["motif_4"]


def test_normalize_and_repair_artifact_passes_gatekeeper_and_snaps_quotes() -> None:
    pages = {
        2: (
            "A parametric bivariate Poisson model estimates scoring intensity from attacking and defensive strength parameters. "
            "Empirical adjustment for zero-zero and one-one low-scoring dependency corrects bookmaker odds bias cleanly. "
            "Time-weighted maximum likelihood estimation captures non-stationary team form dynamics across sequential seasons cleanly."
        )
    }
    cands = build_candidate_quotes_by_page(pages)
    assert len(cands) >= 3
    gk = _fake_gatekeeper()
    doc = normalize_and_repair_artifact(
        book_row={"book_id": "3d7cafefb6ffa2ae", "title": "Dixon & Coles 1997", "primary_domain": "football", "file_name": "dc.pdf", "sha256": "3d7c", "is_ocr_classic": True},
        raw_doc={"primitives": [{"primitive_id": "dc_poisson", "name": "Dixon-Coles Bivariate Poisson", "quote_idx": 1, "latex": r"\lambda_{ij} = \alpha_i \beta_j \gamma", "symbol_and_unit_ledger": "goals/match dimensionless multipliers"}]},
        pages=pages,
        pages_total=17,
        candidates=cands,
        gatekeeper_mod=gk,
        extractor_model="nvidia-nim-free:deepseek-v4.1-flash",
    )
    assert gk.validate(doc) == []
    for p in doc["primitives"]:
        assert norm_text(p["verbatim_quote"]) in norm_text(pages[p["page"]])


def test_extract_json_object_handles_chatter_extra_data_latex_and_trailing_commas() -> None:
    noisy = (
        "Reasoning about {alpha}:\n"
        "```json\n"
        '{"universal_lens": "ok", "primitives": [{"name": "op", "latex": "\\lambda_{ij} + \\sigma",}],}\n'
        "```\n"
        "Trailing note {done}."
    )
    parsed = extract_json_object(noisy)
    assert parsed["universal_lens"] == "ok"
    assert len(parsed["primitives"]) == 1
    assert "\\lambda" in parsed["primitives"][0]["latex"]


def test_build_book_rows_from_explicit_pdfs_infers_domain_and_hash(tmp_path: Path) -> None:
    pdf_math = tmp_path / "Analytic_Methods_in_Sports_3rd_Ed.pdf"
    pdf_psych = tmp_path / "Mind_Gym_Sports_Psych.pdf"
    pdf_fb = tmp_path / "ops-2026-NFL-Rulebook-FINAL.pdf"
    pdf_math.write_bytes(b"%PDF-math")
    pdf_psych.write_bytes(b"%PDF-psych")
    pdf_fb.write_bytes(b"%PDF-fb")

    rows = build_book_rows_from_explicit_pdfs([pdf_math, pdf_psych, pdf_fb, tmp_path / "missing.pdf"])
    assert len(rows) == 3
    by_name = {r["file_name"]: r for r in rows}
    assert by_name[pdf_math.name]["primary_domain"] == "math"
    assert by_name[pdf_psych.name]["primary_domain"] == "psych"
    assert by_name[pdf_fb.name]["primary_domain"] == "football"
    assert len(by_name[pdf_fb.name]["book_id"]) == 16


def test_process_single_book_emits_fail_closed_refusal_on_stub_pdf(monkeypatch, tmp_path: Path) -> None:
    stub = tmp_path / "(PDF)FULL DOWNLOAD Match Quarters.pdf"
    stub.write_bytes(b"%PDF-stub")
    rows = build_book_rows_from_explicit_pdfs([stub])
    assert len(rows) == 1
    row = rows[0]

    monkeypatch.setattr(
        "intelligence.foundry_bridge.multi_lane_sovereign_extractor.load_source_pages",
        lambda _row: (2, {1: "Split Field Coverages", 2: "COPY LINK IN DESCRIPTION FOR DOWNLOAD"}),
    )

    def _forbid_llm(*_a, **_kw):
        raise AssertionError("Stub PDF must fail-closed before calling LLM")

    monkeypatch.setattr(
        "intelligence.foundry_bridge.multi_lane_sovereign_extractor.call_llm_json",
        _forbid_llm,
    )

    out_dir = tmp_path / "prims"
    res = process_single_book(
        row,
        lane="free",
        max_cost_usd=0.0,
        output_dir=out_dir,
        gatekeeper_mod=_fake_gatekeeper(),
    )
    assert res["ok"] is True
    assert res["source_status"] == "INSUFFICIENT_SOURCE_ACCESS"
    assert res["primitives_count"] == 0
    saved = json.loads((out_dir / f"{row['book_id']}.json").read_text(encoding="utf-8"))
    assert saved["source_status"] == "INSUFFICIENT_SOURCE_ACCESS"
    assert saved["primitives"] == []
    assert "refusal_reason" in saved and "Download-bait" in saved["refusal_reason"]


def test_compute_gatekeeper_sha256_matches_size_plus_bytes_contract(tmp_path: Path) -> None:
    import hashlib

    sample = tmp_path / "rulebook.pdf"
    payload = b"%PDF-1.7 test content for official book_id hash parity"
    sample.write_bytes(payload)

    expected_h = hashlib.sha256()
    expected_h.update(str(len(payload)).encode())
    expected_h.update(payload)
    expected_digest = expected_h.hexdigest()

    assert compute_gatekeeper_sha256(sample) == expected_digest
    rows = build_book_rows_from_explicit_pdfs([sample])
    assert rows[0]["book_id"] == expected_digest[:16]
    assert rows[0]["sha256"] == expected_digest


def test_full_book_multi_window_extracts_all_pages_and_passes_gatekeeper(monkeypatch, tmp_path: Path) -> None:
    pdf_path = tmp_path / "ops-2026-NFL-Rulebook-FINAL.pdf"
    pdf_path.write_bytes(b"%PDF-1.7 rulebook")
    row = build_book_rows_from_explicit_pdfs([pdf_path])[0]

    pages = {}
    for p in range(1, 51):
        pages[p] = (
            f"Section {p} of Rule {((p - 1) // 3) + 1} specifies legal formation eligibility across the neutral zone and kickoff alignment. "
            f"Article {p} establishes replay official intervention thresholds and ten second runoff clock management under two minute warnings. "
            f"Paragraph {p} defines foul enforcement spot rules for offensive holding and defensive pass interference inside red zone boundaries."
        )

    assert len(partition_page_windows(sorted(pages.keys()))) == 5

    monkeypatch.setattr(
        "intelligence.foundry_bridge.multi_lane_sovereign_extractor.load_all_source_pages",
        lambda _row: (50, pages),
    )

    def _mock_llm(*, user_prompt: str, **_kw):
        req = json.loads(user_prompt)
        w_start, w_end = req["window_page_range"]
        cands = req["candidate_quotes"]
        prims = []
        for idx, cand in enumerate(cands[:3]):
            prims.append(
                {
                    "primitive_id": f"rule_{w_start}_{w_end}_{idx + 1}",
                    "name": f"Rulebook Window {w_start}-{w_end} Operator {idx + 1}",
                    "quote_idx": idx + 1,
                    "verbatim_quote": cand["verbatim_quote"],
                    "page": cand["page"],
                    "latex": None,
                    "symbol_and_unit_ledger": "rulebook state transition operator (yards and downs)",
                    "assumptions": "Official 2026 NFL regular season and postseason playing rules active.",
                    "breakdown_regime": "Superseded only by competition committee off-season bylaws or preseason experimental mechanics.",
                    "layer2": {
                        "tag": "[ISOMORPHISM]",
                        "mapping": f"Binds pages {w_start}-{w_end} enforcement mechanics to GSE pre-snap transition priors.",
                        "source_operator": f"rule_{w_start}_{w_end}_{idx + 1}",
                        "telemetry": "Play-by-play penalty and clock runoff state verification.",
                    },
                }
            )
        return (
            {
                "universal_lens": "Official playing rules constrain transition probabilities across field position, down-and-distance, kickoff touchbacks, and overtime possessions.",
                "gsi_mapping": "Maps exact rulebook penalty yardage and clock rules onto GSI state-space Bayesian outcome distributions cleanly.",
                "gse_mapping": "Activates Stage-2 situational adjustments when dynamic kickoff alignments, runoff rules, or replay interventions trigger.",
                "primitives": prims,
                "reasoning_traces": [
                    {
                        "trace_id": f"{row['book_id']}_t_{w_start}",
                        "think": " ".join([f"Analysis of rules {w_start} to {w_end} across NFL possessions."] * 45),
                        "retrocausal_genealogy": " ".join(["Derived from historical NFL Competition Committee rulebook evolutions since 1920."] * 7),
                        "theory_of_mind": " ".join(["Coaches optimize clock burn, challenged spots, and declared onside kicks against opponent awareness."] * 7),
                        "cross_layer_veto": " ".join(["Prevents duplicate penalty adjustments across overlapping special teams and fourth down transition models."] * 7),
                    }
                ],
            },
            {"provider": "alibaba-qwen-flash-char", "model": "qwen-flash-character", "cost_usd": 0.0},
        )

    monkeypatch.setattr(
        "intelligence.foundry_bridge.multi_lane_sovereign_extractor.call_llm_json",
        _mock_llm,
    )

    out_dir = tmp_path / "prims"
    gk = _fake_gatekeeper()
    res = process_single_book(
        row,
        lane="free",
        max_cost_usd=0.0,
        output_dir=out_dir,
        gatekeeper_mod=gk,
        full_book=True,
        overwrite=True,
    )
    assert res["ok"] is True
    assert res["pages_total"] == 50
    assert res["pages_read"] == 50
    assert res["primitives_count"] >= 15
    assert res["traces_count"] == 5
    saved = json.loads((out_dir / f"{row['book_id']}.json").read_text(encoding="utf-8"))
    assert saved["pages_read"] == 50
    assert saved["pages_total"] == 50
    assert saved["primary_domain"] == "football"
    assert gk.validate(saved) == []


def test_zero_byte_crawl_txt_fails_closed_without_pymupdf_crash(tmp_path: Path) -> None:
    empty_txt = tmp_path / "fantasy.nfl.com.txt"
    empty_txt.write_bytes(b"")
    row = {
        "book_id": "5feceb66ffc86f38",
        "file_path": str(empty_txt),
        "sha256": "5feceb66ffc86f38" + "0" * 48,
        "file_name": empty_txt.name,
        "title": "fantasy.nfl.com",
        "primary_domain": "football",
        "tier": "B",
        "status": "PENDING",
    }
    out_dir = tmp_path / "prims"
    gk = _fake_gatekeeper()
    res = process_single_book(
        row,
        lane="free",
        max_cost_usd=0.0,
        output_dir=out_dir,
        gatekeeper_mod=gk,
        full_book=True,
        overwrite=True,
    )
    assert res["ok"] is True
    assert res["source_status"] == "INSUFFICIENT_SOURCE_ACCESS"
    saved = json.loads((out_dir / "5feceb66ffc86f38.json").read_text(encoding="utf-8"))
    assert saved["source_status"] == "INSUFFICIENT_SOURCE_ACCESS"
    assert gk.validate(saved) == []


def test_pii_correspondence_eml_quarantined_before_reading_or_llm(monkeypatch, tmp_path: Path) -> None:
    eml_txt = tmp_path / "20250923_Proof_of_Credential_Personal_Correspondence.eml.txt"
    eml_txt.write_text("PRIVATE PERSONAL CORRESPONDENCE SHOULD NEVER BE READ OR QUOTED", encoding="utf-8")

    def _forbid_read(*_a, **_kw):
        raise AssertionError("PII/correspondence file must be quarantined prior to reading pages")

    def _forbid_llm(*_a, **_kw):
        raise AssertionError("PII/correspondence file must never call LLM")

    monkeypatch.setattr("intelligence.foundry_bridge.multi_lane_sovereign_extractor.load_all_source_pages", _forbid_read)
    monkeypatch.setattr("intelligence.foundry_bridge.multi_lane_sovereign_extractor.load_source_pages", _forbid_read)
    monkeypatch.setattr("intelligence.foundry_bridge.multi_lane_sovereign_extractor.call_llm_json", _forbid_llm)

    row = {
        "book_id": "5d37c580fba2cfcc",
        "file_path": str(eml_txt),
        "sha256": "5d37c580fba2cfcc" + "0" * 48,
        "file_name": eml_txt.name,
        "title": "Additional / Missing Credential Information - Personal.eml",
        "primary_domain": "other",
        "tier": "B",
        "status": "PENDING",
    }
    out_dir = tmp_path / "prims"
    gk = _fake_gatekeeper()
    res = process_single_book(
        row,
        lane="free",
        max_cost_usd=0.0,
        output_dir=out_dir,
        gatekeeper_mod=gk,
        full_book=True,
        overwrite=False,
    )
    assert res["ok"] is True
    assert res["quarantined_pii"] is True
    assert res["title"] == "QUARANTINED_NON_CORPUS_ITEM_5d37c580fba2cfcc"
    raw_saved = (out_dir / "5d37c580fba2cfcc.json").read_text(encoding="utf-8")
    assert "PRIVATE PERSONAL CORRESPONDENCE" not in raw_saved
    assert ".eml" not in raw_saved.lower()
    saved = json.loads(raw_saved)
    assert saved["source_status"] == "INSUFFICIENT_SOURCE_ACCESS"
    assert saved["primitives"] == []
    assert gk.validate(saved) == []


def test_cli_help_partition_parser_and_budget_guardrails(monkeypatch, tmp_path: Path) -> None:
    import pytest
    from intelligence.foundry_bridge.multi_lane_sovereign_extractor import (
        call_llm_json,
        parse_args,
        parse_partition_prefixes,
    )

    # 1. `--help` must not crash on unescaped `%` in argparse help strings
    with pytest.raises(SystemExit) as help_exc:
        parse_args(["--help"])
    assert help_exc.value.code == 0

    # 2. `--partition` parser and `--no-include-ocr-classics` BooleanOptionalAction
    assert parse_partition_prefixes("0-3") == ("0", "1", "2", "3")
    assert parse_partition_prefixes("4-7") == ("4", "5", "6", "7")
    assert parse_partition_prefixes("8-f") == ("8", "9", "a", "b", "c", "d", "e", "f")
    parsed_cli = parse_args(["--partition", "0-3", "--no-include-ocr-classics"])
    assert parsed_cli.partition == "0-3"
    assert parsed_cli.include_ocr_classics is False

    # 3. `max_cost_usd == 0` must fail closed if an endpoint reports non-zero `usage.cost`
    monkeypatch.setattr(
        "intelligence.foundry_bridge.multi_lane_sovereign_extractor._build_endpoints_for_lane",
        lambda **_kw: [("mock-endpoint", "https://example.invalid/v1/chat/completions", "k", "m", 0.0, False)],
    )

    class _FakeResp:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self) -> bytes:
            return json.dumps(
                {
                    "choices": [{"message": {"content": '{"primitives": [], "ok": true}'}}],
                    "usage": {"prompt_tokens": 100, "completion_tokens": 50, "cost": 0.0125},
                }
            ).encode("utf-8")

    monkeypatch.setattr(
        "intelligence.foundry_bridge.multi_lane_sovereign_extractor.urllib.request.urlopen",
        lambda *_a, **_kw: _FakeResp(),
    )
    with pytest.raises(RuntimeError, match="All inference providers failed|unexpected non-zero"):
        call_llm_json("sys", "usr", lane="free", max_cost_usd=0.0)


def test_select_eligible_books_includes_only_unmatched_delegated_gcp(tmp_path: Path) -> None:
    import json
    import sqlite3
    from intelligence.foundry_bridge.multi_lane_sovereign_extractor import select_eligible_books_ro

    prim_dir = tmp_path / "primitives"
    prim_dir.mkdir()
    (prim_dir / "8doneid000000001.json").write_text(
        json.dumps({"book_id": "8doneid000000001", "sha256": "8" + "f" * 63}),
        encoding="utf-8",
    )

    f_pending = tmp_path / "pending.tex"
    f_exact = tmp_path / "matched_exact.md"
    f_norm = tmp_path / "NFL-Coaching_Guide_2025.txt"
    f_unmatched = tmp_path / "truly_unmatched_book.tex"
    f_done_sha = tmp_path / "done_sha_copy.md"
    for p in (f_pending, f_exact, f_norm, f_unmatched, f_done_sha):
        p.write_text("sample content", encoding="utf-8")

    catalog_path = tmp_path / "shard_b_catalog.json"
    catalog_path.write_text(
        json.dumps(
            {
                "total_markdown_files": 500,
                "entries": [
                    {"doc_hash": "8aaaa00001", "source": "matched_exact.md"},
                    {"doc_hash": "8aaaa00002", "source": "nfl coaching guide 2025.pdf"},
                ],
            }
        ),
        encoding="utf-8",
    )

    db_path = tmp_path / "foundry.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        """
        CREATE TABLE corpus_queue (
            book_id TEXT PRIMARY KEY,
            file_path TEXT,
            sha256 TEXT,
            file_name TEXT,
            title TEXT,
            year INTEGER,
            primary_domain TEXT,
            tier TEXT,
            status TEXT,
            pages_total INTEGER,
            file_size INTEGER
        )
        """
    )
    rows = [
        ("9pend00000000001", str(f_pending), "9" + "a" * 63, f_pending.name, "Pend Tex", 2025, "math", "C", "PENDING", 10, 100),
        ("8exact0000000002", str(f_exact), "8" + "b" * 63, f_exact.name, "Exact Matched", 2025, "math", "C", "DELEGATED_GCP", 10, 100),
        ("8norm00000000003", str(f_norm), "8" + "c" * 63, f_norm.name, "Norm Matched", 2025, "football", "B", "DELEGATED_GCP", 10, 100),
        ("8unmatch00000004", str(f_unmatched), "8" + "d" * 63, f_unmatched.name, "Unmatched Tex", 2025, "football", "C", "DELEGATED_GCP", 10, 100),
        ("8shacopy00000005", str(f_done_sha), "8" + "f" * 63, f_done_sha.name, "SHA Done Copy", 2025, "math", "A", "DELEGATED_GCP", 10, 100),
    ]
    conn.executemany("INSERT INTO corpus_queue VALUES (?,?,?,?,?,?,?,?,?,?,?)", rows)
    conn.commit()
    conn.close()

    default_rows = select_eligible_books_ro(
        db_path=db_path,
        partition_prefixes=("8", "9"),
        tiers=("A", "B", "C"),
        include_ocr_classics=False,
        max_books=20,
        completed_dirs=(prim_dir,),
    )
    assert [r["book_id"] for r in default_rows] == ["9pend00000000001"]

    unmatched_rows = select_eligible_books_ro(
        db_path=db_path,
        partition_prefixes=("8", "9"),
        tiers=("A", "B", "C"),
        include_ocr_classics=False,
        max_books=20,
        completed_dirs=(prim_dir,),
        include_unmatched_delegated_gcp=True,
        shard_b_catalog_path=catalog_path,
    )
    assert [r["book_id"] for r in unmatched_rows] == ["9pend00000000001", "8unmatch00000004"]


def test_load_plain_text_virtual_pages_pretty_prints_minified_json(tmp_path: Path) -> None:
    import json
    import sys

    extractor_mod = sys.modules[select_eligible_books_ro.__module__]
    _load_plain_text_virtual_pages = extractor_mod._load_plain_text_virtual_pages
    build_candidate_quotes_by_page = extractor_mod.build_candidate_quotes_by_page

    minified_payload = json.dumps(
        {
            "teams": [
                {
                    "abbreviation": "KC",
                    "name": "Kansas City Chiefs",
                    "summary": "Offensive efficiency across early downs remains top tier against two high defensive shells in league play.",
                },
                {
                    "abbreviation": "BUF",
                    "name": "Buffalo Bills",
                    "summary": "Quarterback dropback passing rate over expected surges on third and medium against zone blitz fronts.",
                },
                {
                    "abbreviation": "BAL",
                    "name": "Baltimore Ravens",
                    "summary": "Heavy personnel rushing efficiency creates sustained red zone conversion leverage across divisional matchups.",
                },
            ]
        },
        separators=(",", ":"),
    )
    txt_file = tmp_path / "team_compare.txt"
    txt_file.write_text(minified_payload, encoding="utf-8")

    md_file = tmp_path / "teams.md"
    md_file.write_text(
        "# ESPN Teams Snapshot\n\n```json\n" + minified_payload + "\n```\n",
        encoding="utf-8",
    )

    for sample_file in (txt_file, md_file):
        total, pages = _load_plain_text_virtual_pages(sample_file)
        assert total >= 1
        assert pages
        candidates = build_candidate_quotes_by_page(pages, max_candidates=14)
        assert len(candidates) >= 3
        assert all(len(c["verbatim_quote"].split()) >= 10 for c in candidates[:3])

