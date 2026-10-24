#!/usr/bin/env python3
"""Unified Academic & LaTeX MCP Bridge verifier for Wave 2026-10-21."""

from __future__ import annotations

import argparse
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
XML_PATH = ROOT / "docs" / "engine" / "research" / "2026-10-21" / "arxiv-id-fetch.xml"
DOSSIER_PATH = ROOT / "docs" / "arxiv-program" / "research" / "2026-10-21" / "ARXIV-OPENALEX-WAVE-2026-10-21-DOSSIER.md"

EXPECTED_ARXIV_IDS = (
    "2505.15918",
    "2602.18266",
    "2402.10835",
    "2402.18563",
    "2608.23885",
    "2610.16680",
    "2610.13909",
    "2609.06219",
    "2608.11690",
    "2605.27689",
    "2604.01913",
    "2311.16083",
    "2004.04147",
    "2609.31191",
    "2609.04014",
    "2608.19819",
    "2608.17248",
    "2608.05685",
)

EXPECTED_OPENALEX_IDS = (
    "W7223010684",
    "W7172513554",
    "W4416236279",
    "W7223035214",
    "W7223018467",
    "W7222995921",
    "W7222928081",
    "W6963246877",
    "W7140216328",
)


def verify_wave() -> int:
    if not XML_PATH.is_file():
        print(f"FAIL: missing {XML_PATH}")
        return 1
    if not DOSSIER_PATH.is_file():
        print(f"FAIL: missing {DOSSIER_PATH}")
        return 1
    tree = ET.parse(XML_PATH)
    ns = {"a": "http://www.w3.org/2005/Atom"}
    entries = tree.getroot().findall("a:entry", ns)
    if len(entries) < 18:
        print(f"FAIL: expected >=18 arXiv entries, got {len(entries)}")
        return 1
    text = DOSSIER_PATH.read_text(encoding="utf-8")
    missing_arxiv = [aid for aid in EXPECTED_ARXIV_IDS if aid not in text]
    missing_oa = [oid for oid in EXPECTED_OPENALEX_IDS if oid not in text]
    if missing_arxiv or missing_oa:
        print(f"FAIL: missing arxiv={missing_arxiv} openalex={missing_oa}")
        return 1
    print(f"VERIFY OK: {len(entries)} arXiv entries + {len(EXPECTED_OPENALEX_IDS)} OpenAlex works verified in {DOSSIER_PATH.name}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify-wave-2026-10-21", action="store_true")
    args = parser.parse_args()
    if args.verify_wave_2026_10_21:
        return verify_wave()
    return verify_wave()


if __name__ == "__main__":
    sys.exit(main())
