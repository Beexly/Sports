#!/usr/bin/env python3
"""demo --pack sales: zip NDA motion artifacts."""
from __future__ import annotations
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)


def build() -> Path:
    zpath = OUT / "CRC_SALES_PACK.zip"
    files = [
        ROOT / "docs" / "CRC_ONE_PAGER.md",
        ROOT / "docs" / "NDA_EXTRACT_PROTOCOL.md",
        ROOT / "docs" / "CURL_BUYER_PATHS.md",
        ROOT / "benchmarks" / "public_schema_extract" / "crm.csv",
        ROOT / "benchmarks" / "public_schema_extract" / "payments.csv",
        ROOT / "benchmarks" / "public_schema_extract" / "risk_sot.csv",
        ROOT / "benchmarks" / "public_schema_extract" / "CRC_REPORT.json",
        ROOT / "benchmarks" / "realism_kyc_crm_ledger.json",
        ROOT / "api" / "openapi.yaml",
        ROOT / "WHAT_THIS_IS.md",
    ]
    readme = (
        "CRC Sales Pack\n"
        "1. CRC_ONE_PAGER.md\n"
        "2. NDA_EXTRACT_PROTOCOL.md before real data\n"
        "3. Synthetic CSVs only\n"
        "4. No ROI claims. No sports.\n"
    )
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("README.txt", readme)
        for f in files:
            if f.exists():
                z.write(f, arcname=f.relative_to(ROOT).as_posix())
    return zpath


if __name__ == "__main__":
    p = build()
    print("wrote", p, "bytes", p.stat().st_size)
