"""Unit Test Suite for Component 4:
1. Canonical 120-Program Funding & Credit Architecture (`data/ops/funding_inventory_2026_11_06.json`,
   `docs/ops/FUNDING-INVENTORY-2026-11-06.md`, `docs/ops/FAST-GRANTS-PACK-CORRECTED-2026-11-03.md`,
   `docs/ops/FUNDING_PARTNERSHIP_ALIGNMENT_MASTER.md`).
2. Pinecone (`2025-04` API) Hybrid Dense + Sparse + BM25+ + Cross-Encoder Rerank + Backups Layer
   (`intelligence/retrieval/pinecone_hybrid_corpus_index.py`, `data/engine/pinecone_hybrid_index_receipt_2026_11_06.json`)
   with full uncompressed 210 books, 372 URLs/repos, 30 Morning Sweep CSVs, 10 Innovation Kernels, and NGS/commercial intel.
3. PostHog `$50,000` Cloud Context Layer (`intelligence/telemetry/posthog_cloud_context_layer.py`:
   Project `516325`, `DuckgresHoglakeEngine` 512MB cap, `ContextMillCompactor`).
4. `elie222/inbox-zero` + `jev-mailbox` Grant & Operations Triage Engine
   (`intelligence/ops/inbox_zero_grant_and_ops_triage.py`).
5. NFL Big Data Bowl 2027 ($45,000 Open Track, Deadline Jan 6, 2027) Project Queue Scaffold
   (`research/nfl_big_data_bowl_2027/open_track_pre_snap_motion_and_coverage_disguise.py`).
6. Zero-Secret & Zero-Forbidden-Token Guard across all Component 4 tracked files.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))
sys.modules.pop("research", None)

from intelligence.ops.inbox_zero_grant_and_ops_triage import (
    InboxMessage,
    InboxZeroGrantOpsTriageEngine,
)
from intelligence.retrieval.pinecone_hybrid_corpus_index import (
    BM25PlusScorer,
    CorpusDocument,
    MongoDBDossierArchiveAdapter,
    PineconeBM25HybridCorpusRetriever,
    build_uncompressed_full_corpus_documents,
)
from intelligence.telemetry.posthog_cloud_context_layer import (
    POSTHOG_WAREHOUSE_TABLES,
    ContextMillCompactor,
    DuckgresHoglakeEngine,
    PostHogCloudContextClient,
    PostHogWarehouseSyncEngine,
)
from research.nfl_big_data_bowl_2027.open_track_pre_snap_motion_and_coverage_disguise import (
    PlayerTrackingFrame10Hz,
    build_sample_bdb2027_submission_summary,
    compute_braking_efficiency_brk_plus,
    compute_pre_snap_motion_impulse,
    compute_shell_disguise_kl_divergence,
    evaluate_bdb2027_play_frame,
)


def test_canonical_120_program_funding_inventory() -> None:
    json_path = REPO_ROOT / "data" / "ops" / "funding_inventory_2026_11_06.json"
    assert json_path.is_file(), "Missing data/ops/funding_inventory_2026_11_06.json"
    data = json.loads(json_path.read_text(encoding="utf-8"))

    totals = data["totals"]
    assert totals["approved_live_count"] == 10
    assert abs(float(totals["approved_live_face_value_usd"]) - 55656.31) < 1e-2
    assert totals["submitted_count"] == 24
    assert totals["parked_no_equity_count"] == 3
    assert totals["total_programs_inventoried"] == 121
    assert len(data["programs"]) == 121

    entity = data["entity"]
    assert entity["company_linkedin_url"] == "https://www.linkedin.com/company/galaxy-sports-edge"
    assert entity["legal_name"] == "GALAXY SPORTS NETWORK LLC"
    assert entity["nonprofit_arm"] == "Galaxy Sports Institute (GSI)"

    rules = data["founder_financing_rules"]
    assert rules["no_loans"] is True
    assert rules["no_equity_dilution"] is True
    assert "Techstars Spring 2027 (Sports / Anywhere)" in rules["parked_equity_programs"]
    assert "Comcast NBCUniversal SportsTech" in rules["parked_equity_programs"]
    assert "YC W27 (late application)" in rules["parked_equity_programs"]

    gsi_chain = data["gsi_501c3_dependency_chain"]
    assert gsi_chain["sequence"] == "EIN -> Form 1023 -> Determination Letter -> TechSoup FIRST"

    watch = data["decision_watch_schedule"]
    assert "2026-11-18" in watch["primary_sweep_timestamp_ct"]

    # Check markdown docs exist and are aligned
    md_inventory = (REPO_ROOT / "docs" / "ops" / "FUNDING-INVENTORY-2026-11-06.md").read_text(encoding="utf-8")
    assert "$55,656.31" in md_inventory
    assert "Pinecone Standard Trial" in md_inventory
    assert "https://www.linkedin.com/company/galaxy-sports-edge" in md_inventory

    fast_grants = (REPO_ROOT / "docs" / "ops" / "FAST-GRANTS-PACK-CORRECTED-2026-11-03.md").read_text(encoding="utf-8")
    assert "galaxy-conformal-ot" in fast_grants
    assert "38-13-1" in fast_grants

    master_md = (REPO_ROOT / "docs" / "ops" / "FUNDING_PARTNERSHIP_ALIGNMENT_MASTER.md").read_text(encoding="utf-8")
    assert "2026-11-06" in master_md
    assert "FUNDING-INVENTORY-2026-11-06.md" in master_md


def test_pinecone_bm25_plus_hybrid_corpus_retriever_and_uncompressed_corpus() -> None:
    all_docs = build_uncompressed_full_corpus_documents()
    books = [d for d in all_docs if d.category == "book"]
    repos = [d for d in all_docs if d.category == "repo"]
    csvs = [d for d in all_docs if d.category == "morning_sweep_csv"]
    kernels = [d for d in all_docs if d.category == "innovation_kernel"]
    ngs_intel = [d for d in all_docs if d.category == "ngs_commercial_intelligence"]

    assert len(books) == 210
    assert len(repos) == 372
    assert len(csvs) == 30
    assert len(kernels) == 10
    assert len(ngs_intel) >= 2
    assert len(all_docs) == 624

    retriever = PineconeBM25HybridCorpusRetriever(force_offline=True, alpha=0.65, k1=1.2, b=0.75, delta=1.0)
    indexed_count = retriever.index_local_corpus(all_docs)
    assert indexed_count == 624

    results = retriever.search(
        "Sinkhorn-Knopp optimal transport conformal prediction BM25+ lexical scoring",
        top_k=5,
        use_rerank=True,
    )
    assert len(results) == 5
    assert results[0].bm25_plus_score > 0.0
    assert results[0].hybrid_convex_score > 0.0
    assert results[0].rerank_score is not None

    # Verify MongoDB adapter fallback
    adapter = MongoDBDossierArchiveAdapter(mongodb_uri="")
    receipt = adapter.archive_document(all_docs[0])
    assert receipt["archived"] is True
    assert adapter.get_document(all_docs[0].doc_id) is not None

    # Verify live receipt file exists and has all 624 documents
    receipt_path = REPO_ROOT / "data" / "engine" / "pinecone_hybrid_index_receipt_2026_11_06.json"
    assert receipt_path.is_file()
    receipt_data = json.loads(receipt_path.read_text(encoding="utf-8"))
    assert receipt_data["index_name"] == "gse-200-book-hybrid-index"
    assert receipt_data["api_version"] == "2025-04"
    assert receipt_data["uncompressed_corpus_totals"]["books_count"] == 210
    assert receipt_data["uncompressed_corpus_totals"]["repos_and_urls_count"] == 372
    assert receipt_data["uncompressed_corpus_totals"]["morning_sweep_csvs_count"] == 30
    assert receipt_data["uncompressed_corpus_totals"]["innovation_kernels_count"] == 10
    assert sum(receipt_data["namespaces_upserted"].values()) == 624


def test_posthog_cloud_context_layer() -> None:
    client = PostHogCloudContextClient(offline_mode=True)
    assert client.project_id == "516325"

    gen_event = client.capture_ai_generation(
        distinct_id="founder-garrett",
        model="~typesafe/jev-latest",
        provider="jevkit",
        input_tokens=1420,
        output_tokens=310,
        latency_ms=385.4,
        game_id="NFL-2026-W9-JAX-BAL",
        send_live=False,
    )
    assert gen_event["event"] == "$ai_generation"
    assert gen_event["project_id"] == "516325"
    assert gen_event["properties"]["context_mill_counts"]["books"] == 210
    assert gen_event["properties"]["context_mill_counts"]["repos_and_urls"] == 372
    assert gen_event["properties"]["context_mill_counts"]["morning_sweep_csvs"] == 30
    assert gen_event["properties"]["context_mill_counts"]["innovation_kernels"] == 10

    trace_event = client.capture_ai_trace(
        distinct_id="founder-garrett",
        trace_id="trace-week9-001",
        workflow_stage="Stage-5-Conjunction-Gate",
        conformal_passed=True,
        send_live=False,
    )
    assert trace_event["event"] == "$ai_trace"
    assert trace_event["properties"]["conformal_passed"] is True

    rows = client.duckgres.execute_query("SELECT 210 AS books, 372 AS repos, 30 AS csvs, 10 AS kernels")
    assert len(rows) == 1
    if "books" in rows[0]:
        assert rows[0]["books"] == 210
        assert rows[0]["repos"] == 372


def test_posthog_warehouse_sync_engine() -> None:
    client = PostHogCloudContextClient(offline_mode=True)
    warehouse = PostHogWarehouseSyncEngine(client=client)
    schemas = warehouse.get_table_schemas()
    expected_tables = {
        "nfl_pre_projection_priors",
        "jev_snap_simulations_10k",
        "conformal_residuals_2026",
        "xai_5api_omniscience_catalog",
        "gsi_orthopedic_return_curves",
    }
    assert set(schemas.keys()) == expected_tables
    assert set(POSTHOG_WAREHOUSE_TABLES.keys()) == expected_tables

    bootstrap_summary = warehouse.bootstrap_default_pre_projection_warehouse(game_id="NFL-2026-W9-JAX-BAL")
    assert bootstrap_summary["tables_bootstrapped"] == 5
    assert set(bootstrap_summary["receipts"].keys()) == expected_tables

    readiness = warehouse.run_pre_projection_hogql_check(game_id="NFL-2026-W9-JAX-BAL")
    assert readiness["warehouse_ready"] is True
    assert set(readiness["verified_tables"]) == expected_tables
    assert readiness["jev_world_count"] == 10000
    assert readiness["conformal_gate_passed"] is True
    assert 0.5 < readiness["orthopedic_efficiency_multiplier"] < 1.0


def test_inbox_zero_grant_and_ops_triage() -> None:
    engine = InboxZeroGrantOpsTriageEngine(encrypt_secret="unit-test-ephemeral-secret-key-32b")
    assert len(engine.programs) == 121

    messages = [
        InboxMessage(
            message_id="msg-pinecone-01",
            sender="startups@pinecone.io",
            recipient="hq@galaxysportsedge.com",
            subject="Pinecone for Startups — Submission successful!",
            body="Your Pinecone for Startups application for GALAXY SPORTS NETWORK LLC has been received.",
        ),
        InboxMessage(
            message_id="msg-techstars-02",
            sender="admissions@techstars.com",
            recipient="hq@galaxysportsedge.com",
            subject="Techstars Spring 2027 — Complete your 5% equity + $200K SAFE application",
            body="Applications close November 18, 2026 for the 5% common equity deal.",
        ),
        InboxMessage(
            message_id="msg-loan-03",
            sender="loans@liftfund.com",
            recipient="hq@galaxysportsedge.com",
            subject="Small business loan APR and repayment terms",
            body="Complete your loan application today.",
        ),
        InboxMessage(
            message_id="msg-mixpanel-04",
            sender="startups@mixpanel.com",
            recipient="hq@galaxysportsedge.com",
            subject="Mixpanel for Startups — Sign up to claim your free year",
            body="Activate now and send events within 90 days.",
        ),
        InboxMessage(
            message_id="msg-lisc-05",
            sender="notifications@lisc.org",
            recipient="hq@galaxysportsedge.com",
            subject="Action required: Verizon Small Business Grant finalist verification",
            body="Please reply with your verification form.",
        ),
    ]

    decisions = engine.triage_batch(messages)
    assert len(decisions) == 5

    # 1. Pinecone matched to prog-010 or prog-003, bucket updates
    assert decisions[0].jev_bucket == "updates"
    assert decisions[0].addressed_to_founder is True
    assert "Pinecone" in (decisions[0].matched_program_name or "")
    assert engine.verify_triage_receipt(
        decisions[0].message_id,
        decisions[0].jev_bucket,
        decisions[0].matched_program_id,
        decisions[0].hmac_signature_hex,
    )

    # 2. Techstars triggers FOUNDER_NO_EQUITY_ORDER_2026_11_06
    assert decisions[1].policy_guard_triggered == "FOUNDER_NO_EQUITY_ORDER_2026_11_06"
    assert "DECLINE_OR_PARK" in decisions[1].action_required

    # 3. LiftFund triggers FOUNDER_NO_LOANS_ORDER_2026_11_03
    assert decisions[2].policy_guard_triggered == "FOUNDER_NO_LOANS_ORDER_2026_11_03"

    # 4. Mixpanel triggers CLOCK_PROTECTION_WAIT_FOR_INSTRUMENTATION
    assert decisions[3].policy_guard_triggered == "CLOCK_PROTECTION_WAIT_FOR_INSTRUMENTATION"

    # 5. Verizon LISC finalist email triggers needs_reply
    assert decisions[4].jev_bucket == "needs_reply"
    assert decisions[4].action_required == "NOTIFY_FOUNDER_IMMEDIATELY"


def test_nfl_big_data_bowl_2027_open_track_scaffold() -> None:
    summary = build_sample_bdb2027_submission_summary()
    assert summary["prize_pool_usd"] == 45000
    assert summary["submission_deadline"] == "2027-01-06"
    sample_eval = summary["sample_evaluation"]
    assert isinstance(sample_eval, dict)
    assert sample_eval["pre_snap_motion_impulse"] > 0.0
    assert sample_eval["shell_disguise_kl_nats"] > 0.45
    assert sample_eval["disguise_classification"] == "LATE_SAFETY_ROTATION_DISGUISE"
    assert sample_eval["conformal_lower_90"] < sample_eval["expected_epa_delta"] < sample_eval["conformal_upper_90"]

    brk_plus, ktd = compute_braking_efficiency_brk_plus(8.8, 4.9, 0.35, 1.48)
    assert brk_plus > 100.0
    assert 0.0 <= ktd <= 1.0


def test_zero_secrets_and_zero_etc_in_component4_files() -> None:
    component4_files = [
        REPO_ROOT / "docs" / "ops" / "FUNDING-INVENTORY-2026-11-06.md",
        REPO_ROOT / "docs" / "ops" / "FAST-GRANTS-PACK-CORRECTED-2026-11-03.md",
        REPO_ROOT / "docs" / "ops" / "FUNDING_PARTNERSHIP_ALIGNMENT_MASTER.md",
        REPO_ROOT / "data" / "ops" / "funding_inventory_2026_11_06.json",
        REPO_ROOT / "intelligence" / "retrieval" / "__init__.py",
        REPO_ROOT / "intelligence" / "retrieval" / "pinecone_hybrid_corpus_index.py",
        REPO_ROOT / "scripts" / "ops" / "pinecone_bulk_ingest_200_books.py",
        REPO_ROOT / "data" / "engine" / "pinecone_hybrid_index_receipt_2026_11_06.json",
        REPO_ROOT / "packages" / "prediction-engine" / "src" / "retrieval" / "pinecone-corpus-retriever.ts",
        REPO_ROOT / "intelligence" / "telemetry" / "__init__.py",
        REPO_ROOT / "intelligence" / "telemetry" / "posthog_cloud_context_layer.py",
        REPO_ROOT / "apps" / "web" / "lib" / "analytics" / "posthog-context-layer.ts",
        REPO_ROOT / "intelligence" / "ops" / "__init__.py",
        REPO_ROOT / "intelligence" / "ops" / "inbox_zero_grant_and_ops_triage.py",
        REPO_ROOT / "research" / "nfl_big_data_bowl_2027" / "open_track_pre_snap_motion_and_coverage_disguise.py",
        REPO_ROOT / "research" / "nfl_big_data_bowl_2027" / "README.md",
        REPO_ROOT / "scripts" / "ops" / "reverse_interleaved_8step_5api_xai_cascade.py",
        REPO_ROOT / "data" / "audits" / "reverse_interleaved_8step_5api_xai_omniscience_2026_11_06.json",
        REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "REVERSE_INTERLEAVED_8STEP_KAGGLE_XAI_ARXIV_OPENALEX_HF_BIBLE.md",
    ]
    etc_pattern = re.compile(r"\betc\.", re.IGNORECASE)
    secret_pattern = re.compile(r"(xai-[A-Za-z0-9]{20,}|pcsk_[A-Za-z0-9_]+|phx_[A-Za-z0-9_]+|phc_[A-Za-z0-9_]+|2Gs3eVvQZz8Tl4dOu905vrsMg3Qw5cFx83Y5eDEzfbE=)")

    for fpath in component4_files:
        assert fpath.is_file(), f"Missing Component 4 file: {fpath}"
        content = fpath.read_text(encoding="utf-8")
        assert not etc_pattern.search(content), f"Forbidden abbreviation found in {fpath}"
        assert not secret_pattern.search(content), f"Forbidden raw secret found in {fpath}"


def test_reverse_interleaved_8step_5api_xai_cascade_artifacts() -> None:
    json_path = REPO_ROOT / "data" / "audits" / "reverse_interleaved_8step_5api_xai_omniscience_2026_11_06.json"
    md_path = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "REVERSE_INTERLEAVED_8STEP_KAGGLE_XAI_ARXIV_OPENALEX_HF_BIBLE.md"
    assert json_path.is_file()
    assert md_path.is_file()

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    assert payload["xai_interrogation_summary"]["completed_waves"] == 4
    assert payload["step1_kaggle_seed"]["live_datasets_discovered"] >= 50
    assert payload["step3_arxiv_seed"]["live_preprints_discovered"] >= 20
    assert payload["step5_openalex_seed"]["live_clinical_works_discovered"] >= 20
    assert payload["step7_huggingface_seed"]["live_models_discovered"] >= 20
    assert payload["pinecone_upsert_receipt"]["namespace"] == "gse-xai-5api-omniscience"
    assert payload["pinecone_upsert_receipt"]["vectors_upserted"] == 20
    assert payload["posthog_warehouse_sync"]["tables_synced"] == 5
