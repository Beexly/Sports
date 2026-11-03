from __future__ import annotations

from pathlib import Path

import scripts.ingest.build_downloads_manifest as m
import scripts.ingest.import_nov02_feed as imp


def test_sensitive_never_hashed(tmp_path: Path):
    fake_sens = tmp_path / "Statement 10_26_26 (449K, PDF).pdf"
    fake_sens.write_bytes(b"secret")
    fake_retracted = tmp_path / "Computational and Mathematical Methods in Medicine - 2022 - Wang - Retracted  Sports Feedback System Based on Video Digital.pdf"
    fake_retracted.write_bytes(b"retracted-body")
    fake_ok = tmp_path / "PaulIbrahim (1).pdf"
    fake_ok.write_bytes(b"voronoi-pocket-survival")

    rows = m.scan(tmp_path)
    by_name = {r["rel_path"]: r for r in rows}

    assert by_name[fake_sens.name]["class"] == "sensitive-excluded"
    assert by_name[fake_sens.name]["sha256"] is None
    assert by_name[fake_sens.name]["size_bytes"] is None

    assert by_name[fake_retracted.name]["class"] == "rejected-retracted-paper"
    assert by_name[fake_retracted.name]["sha256"] is not None

    assert by_name[fake_ok.name]["class"] == "pdf"
    assert by_name[fake_ok.name]["sha256"] is not None


def test_feed_rows_never_mint_citable_and_retracted_is_rejected():
    rows = [
        {
            "id": "x1",
            "equation": "a+b",
            "verification_status": "HIGH_PRIORITY_PRODUCTION_TARGET",
            "domain": "nfl",
        },
        {
            "id": "DOC-NOV03-REJECTED-WANG2022",
            "equation": "NONE",
            "verification_status": "REJECTED_RETRACTED_PAPER",
            "domain": "sports_video",
        },
    ]
    plan = imp.plan_inserts(rows, manifest=None)
    assert plan[0]["record_class"] == "HONESTLY_UNCITED_PRIOR"
    assert plan[0]["citation"]["status"] == "MSVH_S0_UNCITED"
    assert plan[0]["citable"] is False

    assert plan[1]["record_class"] == "REJECTED_CORRUPT"
    assert plan[1]["status"] == "REJECTED"
    assert plan[1]["citable"] is False
